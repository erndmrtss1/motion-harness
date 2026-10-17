// motion-render live — canlı profil sayfası: OBS için yerel sunum ya da ölçüm (QC) / deterministik yakalama.
//
//   motion-render live [<sayfa.html>] [--port 4317]                       → yerel sunucu + OBS/panel URL'leri (Ctrl+C ile durur)
//   motion-render live [<sayfa.html>] --qc [--seconds 20] [--wav t.wav] [--fps 60] [--warmup 1] [--headful] [--channel msedge|chrome] [--bg transparent]
//   motion-render live [<sayfa.html>] --capture [det|rt] [--seconds 8] [--wav t.wav] [--fps 60] [--scale 1]
//   ortak: [--avatar world/avatar-a.js] [--settings live/ayarlar.json] [--gpu hw|sw] (look-dev yönlerini aynı mekanizmayla sınamak için)
//
// Sayfa verilmezse paketin şablonu (render/runtime/live/live.html) kullanılır.
// --qc: test WAV'ı (yoksa üretilir: bilinen anlarda hece patlamaları + tıklar) Chromium'un sahte mikrofonuna verilir
//   (--use-fake-device-for-media-stream --use-file-for-fake-audio-capture), sayfa N saniye gerçek zamanlı koşar.
//   Ölçüm sayfanın kendi kancasından (window.__live.metrics) alınır:
//     · fps: ortalama ve 1 s kayan pencerelerin p5'i · kare aralığı p50/p95/p99/max
//     · düşen kare: aralık > 1,5 × (1000/fps) ms
//     · gecikme (olay başına): ilk tepki karesi (ağız ≥ 0,05 ya da konuşuyor durumu) − (akış başı + dosyadaki olay anı) + 1 kare sunum payı
//       akış başı = MediaStreamTrack.stats ile yakalama saati (t − totalFramesDuration − latency; en erken tahmin → temkinli)
//     · tetik gecikmesi: tuş olayı zaman damgası → tepkinin uygulandığı kare + sunum payı
//   Ölçüt: fps ≥ hedef (ortalama ve p5; %0,5 tolerans) · gecikme p95 ≤ 100 ms (geçersiz örnek 0) · düşen kare 0 · tetik p95 ≤ 100 ms.
//   Çıktı: out/probe/live-qc.json + out/probe/live-qc.md. Çıkış: 0 geçti · 3 kaldı · 1 ölçülemedi · 2 kullanım.
// --capture det: aynı WAV'dan kare başı seviye izi (Node'da) → sayfa elle sürülür (?drive=manual, dt = 1/fps) →
//   kare kare ekran görüntüsü → out/live/capture.mp4 (ses dahil). Aynı WAV → aynı kareler (canlı profilin "animatiği").
// --capture rt: Playwright video kaydı (gerçek zamanlı, ≈25 fps, sessiz) → out/live/capture-rt.mp4 (yalnız ön izleme).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { ROOT, OUT, rel, FPS as MAN_FPS } from '../lib/project.mjs';
import { ff, X264_ARGS, TO709 } from '../lib/ffmpeg.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.resolve(HERE, '..', 'runtime', 'live', 'live.html');
const args = process.argv.slice(2);
const has = (k) => args.includes(k);
const argOf = (k, d) => { const i = args.indexOf(k); return i >= 0 && args[i + 1] != null && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const VALUED = new Set(['--seconds', '--wav', '--fps', '--port', '--warmup', '--channel', '--bg', '--scale', '--capture', '--out', '--gpu', '--avatar', '--settings']);
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && VALUED.has(args[i - 1])));

const QC = has('--qc');
const CAPTURE = has('--capture') ? (argOf('--capture', 'det') === 'rt' ? 'rt' : 'det') : null;
const SECONDS = +argOf('--seconds', QC ? 20 : 8);
const FPS = +argOf('--fps', Math.max(60, MAN_FPS));   // varsayılan: scenes.json fps, en az 60 (PR-3 tabanı)
const WARMUP = +argOf('--warmup', 1);
const HEADFUL = has('--headful');
const CHANNEL = argOf('--channel', null);
const BG = argOf('--bg', null);
const SCALE = +argOf('--scale', 1);
const PORT = +argOf('--port', 4317);
// GPU: hw (varsayılan) = donanım hızlandırmalı çizim (OBS tarayıcı kaynağı da donanım hızlandırmayla koşar) · sw = yazılım (SwiftShader; en kötü durum)
const GPU = argOf('--gpu', 'hw') === 'sw' ? 'sw' : 'hw';
const GPU_ARGS = GPU === 'sw' ? [] : ['--enable-gpu', '--ignore-gpu-blocklist', ...(process.platform === 'win32' ? ['--use-angle=d3d11'] : process.platform === 'darwin' ? ['--use-angle=metal'] : [])];
const TOL = 0.005;           // fps toleransı (59,94 Hz ekranlar ve saat titreşimi)
const LAT_MAX = 100;         // ms
if (!(SECONDS >= 4) || !(FPS > 0) || !(SCALE > 0)) { console.error('kullanım: motion-render live [<sayfa.html>] [--qc] [--seconds ≥4] [--wav t.wav] [--fps 60] [--capture det|rt]'); process.exit(2); }

// --- sayfa ve sunum kökü ---
function resolvePage() {
  const a = positional[0];
  if (!a || a === 'template' || a === 'sablon') return TEMPLATE;
  for (const c of [path.resolve(a), path.resolve(ROOT, a)]) if (fs.existsSync(c)) return fs.statSync(c).isDirectory() ? path.join(c, 'index.html') : c;
  return null;
}
const PAGE = resolvePage();
if (!PAGE || !fs.existsSync(PAGE)) { console.error('live: sayfa bulunamadı: ' + (positional[0] || '?')); process.exit(2); }
const inside = (root, f) => { const r = path.relative(root, f); return r && !r.startsWith('..') && !path.isAbsolute(r); };
const SERVE_ROOT = inside(ROOT, PAGE) ? ROOT : path.dirname(PAGE);
const PAGE_URL_PATH = '/' + path.relative(SERVE_ROOT, PAGE).split(path.sep).map(encodeURIComponent).join('/');
// --avatar / --settings: sunum kökü içindeki dosya → sayfaya kök-göreli URL yolu (?avatar=/… · ?settings=/…)
function urlParamFile(flag) {
  const v = argOf(flag, null);
  if (!v) return null;
  const f = [path.resolve(v), path.resolve(ROOT, v)].find((c) => fs.existsSync(c));
  if (!f || !inside(SERVE_ROOT, f)) { console.error('live: ' + flag + ' dosyası yok ya da sunum kökü dışında: ' + v); process.exit(2); }
  return '/' + path.relative(SERVE_ROOT, f).split(path.sep).join('/');
}
const AVATAR_URL = urlParamFile('--avatar'), SETTINGS_URL = urlParamFile('--settings');
const shown = (f) => (inside(ROOT, f) ? rel(f) : f === TEMPLATE ? 'render/runtime/live/live.html (şablon)' : path.basename(f));

// --- yerel statik sunucu + veri yolu aktarıcısı (/__bus: SSE + POST) ---
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.jsx': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.gif': 'image/gif', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.txt': 'text/plain; charset=utf-8', '.wasm': 'application/wasm' };
function startServer(root, port) {
  const clients = new Set();
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    if (u.pathname === '/__bus') {
      if (req.method === 'GET' && u.searchParams.has('ping')) { res.writeHead(204, { 'cache-control': 'no-store' }); return res.end(); }
      if (req.method === 'GET') {
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
        res.write(': motion-live\n\n');
        clients.add(res); req.on('close', () => clients.delete(res));
        return;
      }
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (c) => { body += c; if (body.length > 4e6) req.destroy(); });
        req.on('end', () => { const line = 'data: ' + body.replace(/\r?\n/g, ' ') + '\n\n'; for (const c of clients) c.write(line); res.writeHead(204); res.end(); });
        return;
      }
      res.writeHead(405); return res.end();
    }
    let f;
    try { f = path.resolve(root, '.' + decodeURIComponent(u.pathname)); } catch { res.writeHead(400); return res.end(); }
    if (f !== root && !inside(root, f)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f)) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('yok: ' + u.pathname); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(f).pipe(res);
  });
  const ping = setInterval(() => { for (const c of clients) c.write(': p\n\n'); }, 15000);
  srv.on('close', () => clearInterval(ping));
  return new Promise((resolve, reject) => {
    srv.once('error', reject);
    srv.listen(port, '127.0.0.1', () => resolve({ srv, port: srv.address().port, close: () => { for (const c of clients) c.end(); srv.close(); } }));
  });
}

// --- WAV: yazma, okuma, test sinyali, olay bulma, seviye izi ---
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function writeWav(file, x, sr) {
  const n = x.length, hdr = Buffer.alloc(44), data = Buffer.alloc(n * 2);
  hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + n * 2, 4); hdr.write('WAVE', 8); hdr.write('fmt ', 12); hdr.writeUInt32LE(16, 16);
  hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22); hdr.writeUInt32LE(sr, 24); hdr.writeUInt32LE(sr * 2, 28); hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34);
  hdr.write('data', 36); hdr.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(x[i] * 32767))), i * 2);
  fs.writeFileSync(file, Buffer.concat([hdr, data]));
}
function readWav(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error('WAV değil (RIFF/WAVE): ' + file);
  let off = 12, fmt = null, data = null;
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4), size = b.readUInt32LE(off + 4), body = off + 8;
    if (id === 'fmt ') {
      let format = b.readUInt16LE(body);
      if (format === 0xfffe && size >= 26) format = b.readUInt16LE(body + 24);   // WAVE_FORMAT_EXTENSIBLE alt biçimi
      fmt = { format, ch: b.readUInt16LE(body + 2), sr: b.readUInt32LE(body + 4), bits: b.readUInt16LE(body + 14) };
    } else if (id === 'data') data = { off: body, size: Math.min(size, b.length - body) };
    off = body + size + (size & 1);
  }
  if (!fmt || !data) throw new Error('WAV: fmt/data bölümü yok');
  const { format, ch, sr, bits } = fmt, bps = bits / 8, frames = Math.floor(data.size / (bps * ch)), x = new Float32Array(frames);
  const rd = format === 3 && bits === 32 ? (o) => b.readFloatLE(o)
    : format === 1 && bits === 16 ? (o) => b.readInt16LE(o) / 32768
    : format === 1 && bits === 24 ? (o) => b.readIntLE(o, 3) / 8388608
    : format === 1 && bits === 32 ? (o) => b.readInt32LE(o) / 2147483648
    : null;
  if (!rd) throw new Error(`WAV biçimi desteklenmiyor (format ${format}, ${bits} bit) — 16/24/32 bit PCM ya da 32 bit float`);
  for (let i = 0; i < frames; i++) { let s = 0; for (let c = 0; c < ch; c++) s += rd(data.off + (i * ch + c) * bps); x[i] = s / ch; }
  return { x, sr, ch, bits, format };
}
// Test sinyali: zemin gürültüsü (kapı altında) + bilinen anlarda hece dizileri, tıklar, uzun ünlü; her olaydan önce ≥ 0,8 s sessizlik.
function makeTestSignal(seconds, sr = 48000, seed = 20261017) {
  const rnd = mulberry32(seed), len = Math.ceil((seconds + 3) * sr), x = new Float32Array(len);
  const floorAmp = Math.pow(10, -62 / 20) * Math.sqrt(3);
  for (let i = 0; i < len; i++) x[i] = (rnd() * 2 - 1) * floorAmp;
  const formant = (f, F, bw) => Math.exp(-0.5 * ((f - F) / bw) ** 2);
  function voiced(s0, n, peak, f0, F1, F2, sylMin, sylMax) {
    let s = s0, first = true, ph = 0;
    const end = s0 + n;
    while (s < end - 0.04 * sr) {
      const syl = Math.min(end - s, Math.round((sylMin + rnd() * (sylMax - sylMin)) * sr));
      const amp = peak * (first ? 1 : 0.55 + rnd() * 0.45), a = Math.round(0.008 * sr), r = Math.round(0.025 * sr);
      const ws = []; let norm = 0;
      for (let h = 1; h <= 14; h++) { const w = formant(h * f0, F1, 140) + 0.6 * formant(h * f0, F2, 200) + 0.04; ws.push(w); norm += w; }
      for (let i = 0; i < syl; i++) {
        const e = Math.min(1, i / a) * Math.min(1, (syl - i) / r) * (1 - (0.3 * i) / syl);
        ph += (2 * Math.PI * f0 * (1 + 0.03 * Math.sin((2 * Math.PI * 5 * i) / sr))) / sr;
        let v = 0;
        for (let h = 0; h < 14; h++) v += ws[h] * Math.sin((h + 1) * ph);
        x[s + i] += amp * e * (0.88 * (v / norm) * 2.2 + 0.12 * (rnd() * 2 - 1));
      }
      s += syl + Math.round((0.02 + rnd() * 0.05) * sr);
      first = false;
    }
  }
  function click(s0, peak) { const n = Math.round(0.025 * sr); for (let i = 0; i < n; i++) x[s0 + i] += peak * Math.exp(-i / (0.004 * sr)) * (rnd() * 2 - 1); }
  const kinds = ['hece', 'tik', 'hece', 'uzun', 'hece', 'tik', 'hece', 'hece'];
  const events = [];
  let t = 1.25, k = 0, longGap = false;
  while (true) {
    if (seconds >= 16 && !longGap && t > seconds * 0.45) { t += 5.2; longGap = true; }   // dinliyor → boşta geçişini sınamak için uzun sessizlik
    const kind = kinds[k++ % kinds.length];
    const dur = kind === 'tik' ? 0.025 : kind === 'uzun' ? 1.6 : 0.45 + rnd() * 0.9;
    if (t + dur > seconds - 0.7) break;
    const s0 = Math.round(t * sr), peakDb = kind === 'tik' ? -8 : -12 - rnd() * 9, peak = Math.pow(10, peakDb / 20);
    if (kind === 'tik') click(s0, peak);
    else if (kind === 'uzun') voiced(s0, Math.round(dur * sr), peak, 120 + rnd() * 60, 650, 1200, 1.55, 1.6);
    else voiced(s0, Math.round(dur * sr), peak, 110 + rnd() * 90, 450 + rnd() * 350, 1100 + rnd() * 900, 0.11, 0.23);
    events.push({ t: +(s0 / sr).toFixed(5), dur: +dur.toFixed(4), kind, peakDb: +peakDb.toFixed(1) });
    t = s0 / sr + dur + 0.85 + rnd() * 0.55;
  }
  return { x, sr, events };
}
// Kullanıcı WAV'ında olay başları: 10 ms RMS (5 ms adım); eşik = max(zemin p10 + 15 dB, −50 dBFS); ≥ 0,5 s sessizlikten sonra ilk aşım.
function detectEvents(x, sr) {
  const hop = Math.round(0.005 * sr), win = Math.round(0.01 * sr), db = [];
  for (let i = 0; i + win <= x.length; i += hop) { let s = 0; for (let j = i; j < i + win; j++) s += x[j] * x[j]; db.push(10 * Math.log10(s / win + 1e-12)); }
  const sorted = [...db].sort((a, b) => a - b), floor = sorted[Math.floor(sorted.length * 0.1)] ?? -120, thr = Math.max(floor + 15, -50);
  const amp = Math.pow(10, thr / 20), quiet = Math.round(0.5 / 0.005), endQuiet = Math.round(0.3 / 0.005);
  const events = [];
  let below = quiet;
  for (let k = 0; k < db.length; k++) {
    if (db[k] >= thr && below >= quiet) {
      let s = k * hop; const lim = Math.min(x.length, k * hop + win);
      while (s < lim && Math.abs(x[s]) < amp) s++;
      let e = k, q = 0;
      for (let j = k; j < db.length; j++) { if (db[j] >= thr - 6) { e = j; q = 0; } else if (++q >= endQuiet) break; }
      events.push({ t: +(s / sr).toFixed(5), dur: +(((e - k + 2) * hop) / sr).toFixed(4), kind: 'olay' });
      k = e; below = 0;
    } else below = db[k] < thr - 6 ? below + 1 : 0;
  }
  return { events, thresholdDb: +thr.toFixed(1), floorDb: +floor.toFixed(1) };
}
// Elle sürüş için kare başı seviye izi — sayfadaki readDb ile aynı yöntem: son kare aralığı + bir pencere boyunca
// 512 örneklik (@48 kHz; başka örnekleme hızında süreyle ölçeklenir) pencerelerin, yarım pencere adımla, en yüksek RMS'i.
function dbTrack(x, sr, fps, frames) {
  const win = Math.max(16, Math.round((512 * sr) / 48000)), half = win >> 1, db = [];
  for (let k = 0; k < frames; k++) {
    const end = Math.min(x.length, Math.round(((k + 1) / fps) * sr)), span = Math.round(sr / fps) + win;
    let best = 0, prev = -1;
    for (let e1 = end; e1 - half >= Math.max(0, end - span); e1 -= half) {
      let e = 0; for (let i = e1 - half; i < e1; i++) e += x[i] * x[i];
      if (prev >= 0 && e + prev > best) best = e + prev;
      prev = e;
    }
    const ms = best / win;
    db.push(ms > 1e-12 ? +(10 * Math.log10(ms)).toFixed(2) : -120);
  }
  return db;
}

// --- yardımcılar ---
// makine CPU meşguliyeti (tüm çekirdekler): ölçüm penceresinde ortam yükünü kayda geçirmek için
const cpuTimes = () => os.cpus().reduce((a, c) => { const t = c.times; a.idle += t.idle; a.total += t.user + t.nice + t.sys + t.idle + t.irq; return a; }, { idle: 0, total: 0 });
const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
const mkdir = (d) => fs.mkdirSync(d, { recursive: true });
const n1 = (x, d = 1) => (x == null || !isFinite(x) ? '—' : (+x).toFixed(d));

function prepareWav() {
  const dir = path.join(OUT, 'live');
  mkdir(dir);
  const user = argOf('--wav', null);
  if (user) {
    const f = path.resolve(user);
    if (!fs.existsSync(f)) { console.error('live: WAV yok: ' + user); process.exit(2); }
    const w = readWav(f), d = detectEvents(w.x, w.sr);
    return { file: f, generated: false, ...w, events: d.events, detect: d };
  }
  const sig = makeTestSignal(SECONDS);
  const file = path.join(dir, 'qc-test.wav');
  writeWav(file, sig.x, sig.sr);
  fs.writeFileSync(path.join(dir, 'qc-test.events.json'), JSON.stringify({ sr: sig.sr, seconds: SECONDS, events: sig.events }, null, 1));
  return { file, generated: true, x: sig.x, sr: sig.sr, events: sig.events };
}
function query(extra) {
  const p = new URLSearchParams({ fps: String(FPS), ...extra });
  if (BG) p.set('bg', BG);
  if (AVATAR_URL) p.set('avatar', AVATAR_URL);
  if (SETTINGS_URL) p.set('settings', SETTINGS_URL);
  return '?' + p.toString();
}
async function launch(extraArgs, headless = !HEADFUL) {
  const opts = { headless, args: ['--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', ...GPU_ARGS, ...extraArgs,
    ...(process.env.MOTION_CHROMIUM_ARGS || '').split(' ').filter(Boolean)] };
  if (CHANNEL) opts.channel = CHANNEL;
  return chromium.launch(opts);
}
const fakeAudioArgs = (wav) => ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-audio-capture=' + wav];

// =================================================================================================
// 1) Sunum kipi (OBS)
// =================================================================================================
if (!QC && !CAPTURE) {
  const s = await startServer(SERVE_ROOT, PORT).catch((e) => { console.error('live: sunucu açılamadı (' + e.code + ') — --port ile başka port dene'); process.exit(1); });
  const base = 'http://127.0.0.1:' + s.port, dir = PAGE_URL_PATH.slice(0, PAGE_URL_PATH.lastIndexOf('/') + 1);
  const extra = (AVATAR_URL ? '&avatar=' + encodeURIComponent(AVATAR_URL) : '') + (SETTINGS_URL ? '&settings=' + encodeURIComponent(SETTINGS_URL) : '');
  console.log('motion live · ' + shown(PAGE));
  console.log('  OBS tarayıcı kaynağı : ' + base + PAGE_URL_PATH + '?bg=transparent' + extra + '   (genişlik 1920 · yükseklik 1080)');
  console.log('  ayar paneli (dock)   : ' + base + dir + 'panel.html');
  console.log('  masaüstü deneme      : ' + base + PAGE_URL_PATH + '?panel=1&meter=1' + extra);
  console.log('  OBS: Video FPS 60 · "görünür değilken kapat" KAPALI · donanım hızlandırma AÇIK · ayrıntı: motion-live SKILL');
  if (PAGE === TEMPLATE) console.log('  not: paketin şablonu sunuluyor (yer tutucu avatar). Projede live/ klasörüne kopyala, avatarı look-dev ile değiştir.');
  console.log('  durdurmak için Ctrl+C');
  const stop = () => { s.close(); process.exit(0); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  await new Promise(() => {});
}

// =================================================================================================
// 2) QC: gerçek zamanlı ölçüm
// =================================================================================================
let exitCode = 0;
const wav = prepareWav();
const server = await startServer(SERVE_ROOT, 0);
const origin = 'http://127.0.0.1:' + server.port;

async function runQc() {
  const VW = 1920, VH = 1080;
  let browser;
  try { browser = await launch(fakeAudioArgs(wav.file)); }
  catch (e) { return { fatal: 'Chromium açılamadı: ' + String(e.message || e).split('\n')[0] }; }
  const context = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
  await context.grantPermissions(['microphone'], { origin }).catch(() => {});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  try {
    await page.goto(origin + PAGE_URL_PATH + query({ qc: '1' }), { waitUntil: 'load', timeout: 20000 });
    await page.waitForFunction(() => window.__live && typeof window.__live.ready === 'function', null, { timeout: 15000 });
  } catch (e) { await browser.close(); return { fatal: 'sayfa __live kancasını açmadı (live.js yüklü mü?): ' + String(e.message || e).split('\n')[0], errors }; }
  const info = await page.evaluate(() => window.__live.ready());
  if (!info || !info.running) { await browser.close(); return { fatal: 'sahte ses girişi açılamadı: ' + ((info && info.error) || 'bilinmiyor'), errors, audio: info }; }
  // akış çapası: track.stats örnekleri gelsin (≤ 3 s)
  let a = info;
  for (let i = 0; i < 30; i++) { a = await page.evaluate(() => window.__live.audio()); if (a.anchor === 'track.stats' && a.statsSamples >= 2) break; await sleep(100); }
  const t0 = a.streamStart, endAt = t0 + SECONDS * 1000, from = t0 + WARMUP * 1000;
  const nowPage = await page.evaluate(() => performance.now()), wall0 = Date.now();
  const pageNow = () => nowPage + (Date.now() - wall0);
  // tetikler: pencere içinde üç tuş (ağzı etkilemeyen tepkiler: onay, vurgu, merak)
  const keys = [['1', 0.3], ['5', 0.55], ['6', 0.8]].map(([k, f]) => ({ key: k, at: from + f * (endAt - from - 500) }));
  await sleep(from - pageNow());
  const cpuA = cpuTimes();
  for (const k of keys) { await sleep(k.at - pageNow()); await page.keyboard.press(k.key); }
  await sleep(endAt - pageNow());
  const cpuB = cpuTimes();
  await sleep(200);
  const m = await page.evaluate((o) => window.__live.metrics(o), { from, to: endAt, events: wav.events, fps: FPS, presentMs: 1000 / FPS });
  const env = await page.evaluate(() => {
    let webgl = null, vendor = null;
    try {
      const gl = document.createElement('canvas').getContext('webgl');
      if (gl) { const e = gl.getExtension('WEBGL_debug_renderer_info'); webgl = e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); vendor = e ? gl.getParameter(e.UNMASKED_VENDOR_WEBGL) : null; }
    } catch { /* yok */ }
    return { userAgent: navigator.userAgent, dpr: devicePixelRatio, viewport: [innerWidth, innerHeight], hardwareConcurrency: navigator.hardwareConcurrency, webglRenderer: webgl, webglVendor: vendor, avatar: window.__live.avatar() };
  });
  env.browser = browser.version();
  if (!(m.input && m.input.levelMax > 0)) { await browser.close(); return { fatal: 'sahte ses girişi pencere boyunca sessiz (WAV okunamadı ya da kapı/kazanç yanlış): seviye en çok 0', errors, audio: m.audio }; }
  env.machineCpuBusyPct = +(100 * (1 - (cpuB.idle - cpuA.idle) / Math.max(1, cpuB.total - cpuA.total))).toFixed(1);
  await browser.close();
  return { m, env, errors, keys: keys.map((k) => k.key) };
}

let qc = null;
if (QC) {
  qc = await runQc();
  const outDir = path.join(OUT, 'probe');
  mkdir(outDir);
  const base = {
    tool: 'motion-render live --qc', date: new Date().toISOString(), page: shown(PAGE),
    run: { seconds: SECONDS, warmupS: WARMUP, fps: FPS, headless: !HEADFUL, gpu: GPU, chromiumArgs: [...GPU_ARGS, ...(process.env.MOTION_CHROMIUM_ARGS || '').split(' ').filter(Boolean)], channel: CHANNEL || 'playwright-chromium', viewport: [1920, 1080], bg: BG || 'varsayılan',
      wav: inside(ROOT, wav.file) ? rel(wav.file) : path.basename(wav.file), wavGenerated: wav.generated, wavSampleRate: wav.sr, events: wav.events.length, detect: wav.detect || null },
    environment: { os: os.platform() + ' ' + os.release(), arch: os.arch(), cpu: (os.cpus()[0] || {}).model || null, cores: os.cpus().length, node: process.version, headless: !HEADFUL },
  };
  if (qc.fatal) {
    const r = { ...base, verdict: 'ÖLÇÜLEMEDİ', pass: false, reason: qc.fatal, errors: qc.errors || [], audio: qc.audio || null };
    fs.writeFileSync(path.join(outDir, 'live-qc.json'), JSON.stringify(r, null, 1));
    console.error('live --qc: ölçülemedi — ' + qc.fatal);
    console.error('  (sahte ses girişi için Chromium bayrakları: --use-fake-device-for-media-stream --use-file-for-fake-audio-capture)');
    exitCode = 1;
  } else {
    const { m, env } = qc, L = m.latency || { first: {}, samples: [], valid: 0, invalid: 0 };
    const trig = m.triggers.stats || {};
    const checks = [
      { id: 'fps-ort', ad: 'ortalama fps', deger: m.fps.avg, olcut: '≥ ' + FPS, gecti: m.fps.avg != null && m.fps.avg >= FPS * (1 - TOL) },
      { id: 'fps-p5', ad: 'fps p5 (1 s kayan pencere)', deger: m.fps.p5, olcut: '≥ ' + FPS, gecti: m.fps.p5 != null && m.fps.p5 >= FPS * (1 - TOL) },
      { id: 'dusen-kare', ad: `düşen kare (aralık > ${m.dropped.limitMs} ms)`, deger: m.dropped.count, olcut: '= 0', gecti: m.dropped.count === 0 },
      { id: 'gecikme-p95', ad: 'gecikme p95 (ses olayı → ilk tepki karesi + sunum)', deger: L.first.p95 ?? null, olcut: '≤ ' + LAT_MAX + ' ms', gecti: L.valid > 0 && L.invalid === 0 && L.first.p95 <= LAT_MAX },
      { id: 'tetik-p95', ad: 'tetik gecikmesi p95 (tuş → tepki karesi + sunum)', deger: trig.p95 ?? null, olcut: '≤ ' + LAT_MAX + ' ms', gecti: trig.n > 0 && trig.p95 <= LAT_MAX },
    ];
    const warnings = [];
    if (L.anchor !== 'track.stats') warnings.push('akış başı çapası yaklaşık (' + L.anchor + '): MediaStreamTrack.stats yok; gecikme ± birkaç on ms belirsiz');
    if (L.gateLeakFrames > 0) warnings.push('gürültü kapısı: olaylar arası sessizlikte ağız eşiği ' + L.gateLeakFrames + ' karede aşıldı');
    if (qc.errors.length) warnings.push('sayfa konsol hatası: ' + qc.errors.length + ' (ilk: ' + qc.errors[0].slice(0, 160) + ')');
    if (GPU === 'hw' && /SwiftShader|llvmpipe|software/i.test(env.webglRenderer || '')) warnings.push("donanım GPU'su açılamadı, yazılım çizimi (" + env.webglRenderer + '): sonuç en kötü durumdur');
    if (env.machineCpuBusyPct > 70) warnings.push('makine yükü yüksek (ölçüm penceresinde CPU %' + env.machineCpuBusyPct + '): düşen kareler ortam kaynaklı olabilir; yük boşken yinele');
    if (FPS < 60) warnings.push('--fps ' + FPS + ' < 60: PR-3 ölçütü ≥ 60 fps; bu koşu yalnız deneme sayılır');
    if (!HEADFUL) warnings.push('başsız (headless) koşu: kare zamanlaması tarayıcının iç saatiyle sürülür; gerçek OBS makinesinde --headful ya da OBS içi ölçüm ile doğrula');
    const pass = checks.every((c) => c.gecti);
    const modes = new Set(m.transitions.map((x) => x.to));
    const report = {
      ...base, verdict: pass ? 'GEÇTİ' : 'KALDI', pass,
      criteria: { fps: FPS, fpsTolerance: TOL, latencyMaxMs: LAT_MAX, droppedMax: 0, droppedRule: '> 1,5 × 1000/fps ms', latencyPercentile: 95,
        latencyDefinition: 'ilk tepki karesi (ağız ≥ ' + (L.reactThr ?? 0.05) + ' ya da konuşuyor) − (akış başı + olay anı) + 1 kare sunum payı', fpsP5Definition: '1 s kayan pencerelerin fps dağılımında 5. yüzdelik' },
      checks, warnings,
      summary: { cpuBusyPct: env.machineCpuBusyPct, workP99: m.work.p99, workMax: m.work.max, fpsAvg: m.fps.avg, fpsP5: m.fps.p5, fpsMin: m.fps.min, intervalP50: m.intervals.p50, intervalP99: m.intervals.p99, intervalMax: m.intervals.max, dropped: m.dropped.count,
        latencyP50: L.first.p50 ?? null, latencyP95: L.first.p95 ?? null, latencyMax: L.first.max ?? null, latencyValid: L.valid, latencyInvalid: L.invalid,
        mouthLatencyP95: L.mouth ? L.mouth.p95 : null, stateLatencyP95: L.state ? L.state.p95 : null, triggerP95: trig.p95 ?? null, transitions: m.transitions.length, modesSeen: [...modes] },
      environment: { ...base.environment, ...env },
      metrics: m,
    };
    fs.writeFileSync(path.join(outDir, 'live-qc.json'), JSON.stringify(report, null, 1));
    fs.writeFileSync(path.join(outDir, 'live-qc.md'), markdown(report));
    console.log(`live --qc · ${shown(PAGE)} · ${SECONDS} s · ${HEADFUL ? 'headful' : 'headless'} · ${env.browser}`);
    for (const c of checks) console.log(`  ${c.gecti ? '✓' : '✗'} ${c.ad}: ${c.deger == null ? '—' : c.deger} (${c.olcut})`);
    console.log(`  sayfa işi p50/p99/max ${n1(m.work.p50, 2)}/${n1(m.work.p99, 2)}/${n1(m.work.max, 2)} ms · makine CPU %${n1(env.machineCpuBusyPct)} · GPU ${env.webglRenderer || '—'}`);
    console.log(`  gecikme p50/p95/max ${n1(L.first.p50)}/${n1(L.first.p95)}/${n1(L.first.max)} ms · geçerli ${L.valid}/${L.samples.length} · kare aralığı p50/p99/max ${n1(m.intervals.p50, 2)}/${n1(m.intervals.p99, 2)}/${n1(m.intervals.max, 2)} ms · geçiş ${m.transitions.length}`);
    for (const w of warnings) console.log('  ! ' + w);
    console.log('  → ' + rel(path.join(outDir, 'live-qc.json')) + ' · ' + rel(path.join(outDir, 'live-qc.md')) + ' · ' + (pass ? 'GEÇTİ' : 'KALDI'));
    exitCode = pass ? 0 : 3;
  }
}

function markdown(r) {
  const s = r.summary, L = r.metrics.latency || { samples: [] };
  const lines = [
    `# Canlı QC — ${r.page}`, '',
    `**${r.verdict}** · ${r.date.slice(0, 19).replace('T', ' ')} · ${r.run.seconds} s (ısınma ${r.run.warmupS} s hariç) · hedef ${r.run.fps} fps · ${r.run.headless ? 'headless' : 'headful'} · ${r.environment.browser}`, '',
    '| kontrol | değer | ölçüt | sonuç |', '|---|---|---|---|',
    ...r.checks.map((c) => `| ${c.ad} | ${c.deger == null ? '—' : c.deger} | ${c.olcut} | ${c.gecti ? 'geçti' : 'kaldı'} |`), '',
    `- sayfa işi (JS) kare başı p50/p99/max: ${n1(r.metrics.work.p50, 2)} / ${n1(r.metrics.work.p99, 2)} / ${n1(r.metrics.work.max, 2)} ms (bütçe ${n1(r.metrics.work.budgetMs, 2)} ms) · makine CPU meşguliyeti %${n1(r.environment.machineCpuBusyPct)}`,
    `- kare aralığı p50/p95/p99/max: ${n1(r.metrics.intervals.p50, 2)} / ${n1(r.metrics.intervals.p95, 2)} / ${n1(r.metrics.intervals.p99, 2)} / ${n1(r.metrics.intervals.max, 2)} ms · kare ${r.metrics.frames}`,
    `- fps ortalama / p5 / en düşük pencere: ${n1(s.fpsAvg, 2)} / ${n1(s.fpsP5, 2)} / ${n1(s.fpsMin, 2)}`,
    `- gecikme p50/p95/max: ${n1(s.latencyP50)} / ${n1(s.latencyP95)} / ${n1(s.latencyMax)} ms (geçerli ${s.latencyValid}, geçersiz ${s.latencyInvalid}) · ağız p95 ${n1(s.mouthLatencyP95)} · durum p95 ${n1(s.stateLatencyP95)} · tetik p95 ${n1(s.triggerP95)}`,
    `- akış başı çapası: ${L.anchor || '—'} · sunum payı ${n1(L.presentMs)} ms · ses penceresi ${n1(r.metrics.audio && r.metrics.audio.windowMs)} ms · giriş gecikmesi (track.stats) ${n1(r.metrics.audio && r.metrics.audio.inputLatencyMs, 2)} ms`,
    `- durum geçişleri: ${s.transitions} · görülen durumlar: ${s.modesSeen.join(', ') || '—'}`,
    `- test sesi: ${r.run.wav} (${r.run.wavGenerated ? 'üretildi' : 'verildi'}, ${r.run.events} olay)`, '',
    '| olay (s) | tür | ağız ms | durum ms | ilk tepki ms | geçerli |', '|---|---|---|---|---|---|',
    ...L.samples.map((x) => `| ${n1(x.t, 3)} | ${x.kind || '—'} | ${n1(x.mouthMs)} | ${n1(x.stateMs)} | ${n1(x.ms)} | ${x.ok ? 'evet' : 'hayır — ' + (x.why || '')} |`), '',
    '## Ortam', '',
    `- ${r.environment.os} · ${r.environment.arch} · ${r.environment.cpu || '—'} (${r.environment.cores} çekirdek) · node ${r.environment.node}`,
    `- tarayıcı ${r.environment.browser} · ${r.run.channel} · ${r.run.headless ? 'headless' : 'headful'} · WebGL: ${r.environment.webglRenderer || '—'}`, '',
    '## Uyarılar', '', ...(r.warnings.length ? r.warnings.map((w) => '- ' + w) : ['- yok']), '',
    'Yöntem: `motion-render live --qc` (skills/motion-live/SKILL.md §Ölçüm). Bu dosya yapanın QC\'sidir; reviewer ve measure kendi koşusuyla ölçer.', '',
  ];
  return lines.join('\n');
}

// =================================================================================================
// 3) Yakalama: deterministik (elle sürüş) ya da gerçek zamanlı video
// =================================================================================================
if (CAPTURE && exitCode !== 1) {
  const dir = path.join(OUT, 'live');
  mkdir(dir);
  const VW = Math.round(1920 * SCALE), VH = Math.round(1080 * SCALE);
  if (CAPTURE === 'det') {
    const frames = Math.round(SECONDS * FPS), db = dbTrack(wav.x, wav.sr, FPS, frames);
    const fdir = path.join(dir, 'capture-frames');
    mkdir(fdir);
    for (const f of fs.readdirSync(fdir)) if (/^\d{5}\.png$/.test(f)) fs.unlinkSync(path.join(fdir, f));
    fs.writeFileSync(path.join(dir, 'capture-track.json'), JSON.stringify({ version: '1.0.0', kind: 'motion-live-zarf', fps: FPS, db }));
    const browser = await launch([], true);
    const page = await (await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 })).newPage();
    await page.goto(origin + PAGE_URL_PATH + query({ qc: '1', drive: 'manual', mic: '0' }), { waitUntil: 'load' });
    await page.waitForFunction(() => window.__live && window.__live.loadTrack);
    await page.evaluate((tr) => window.__live.loadTrack(tr), { fps: FPS, db });
    const t1 = Date.now();
    for (let k = 0; k < frames; k++) {
      await page.evaluate(() => window.__live.advance(1));
      await page.screenshot({ path: path.join(fdir, String(k).padStart(5, '0') + '.png') });
      if (k % (FPS * 2) === 0) process.stdout.write(`\r  yakalama ${k}/${frames}`);
    }
    const transitions = await page.evaluate(() => window.__live.transitions());
    await browser.close();
    const mp4 = path.join(dir, 'capture.mp4');
    ff(['-framerate', String(FPS), '-i', path.join(fdir, '%05d.png'), '-i', wav.file, '-map', '0:v', '-map', '1:a', '-t', String(SECONDS),
      '-vf', TO709, ...X264_ARGS, '-c:a', 'aac', '-b:a', '192k', mp4]);
    fs.writeFileSync(path.join(dir, 'capture.json'), JSON.stringify({ mode: 'deterministik (elle sürüş, dt = 1/fps)', fps: FPS, frames, size: [VW, VH], seconds: SECONDS,
      wav: inside(ROOT, wav.file) ? rel(wav.file) : path.basename(wav.file), transitions, ms: Date.now() - t1 }, null, 1));
    console.log(`\r  yakalama ${frames}/${frames} kare → ${rel(mp4)} · kareler ${rel(fdir)}/ · ${((Date.now() - t1) / 1000).toFixed(0)} s`);
  } else {
    const vdir = path.join(dir, 'rt');
    mkdir(vdir);
    const browser = await launch(fakeAudioArgs(wav.file));
    const context = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1, recordVideo: { dir: vdir, size: { width: VW, height: VH } } });
    await context.grantPermissions(['microphone'], { origin }).catch(() => {});
    const page = await context.newPage();
    await page.goto(origin + PAGE_URL_PATH + query({ qc: '1' }), { waitUntil: 'load' });
    await page.waitForFunction(() => window.__live && window.__live.ready).then(() => page.evaluate(() => window.__live.ready()));
    await sleep(SECONDS * 1000);
    const video = page.video();
    await context.close();
    const webm = await video.path();
    await browser.close();
    const mp4 = path.join(dir, 'capture-rt.mp4');
    ff(['-i', webm, '-vf', TO709, ...X264_ARGS, mp4]);
    console.log('  gerçek zamanlı kayıt → ' + rel(mp4) + ' (≈25 fps ön izleme; zamanlama kanıtı değildir)');
  }
}

server.close();
process.exit(exitCode);
