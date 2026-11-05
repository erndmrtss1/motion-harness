// motion-render contact — kontak sayfaları (sahne · sheet · storyboard · clips · seq · motion = hareket kontağı)
//
//   motion-render contact <id> [--step N] [--cols 8] [--dir out/frames/<id>] [--page-step N] [--out P]     → out/probe/<id>-contact.png
//       sahne kontak sayfası: 8 sütun, üst etiket fN · t s, alt etiket ortalama parlaklık % + doluluk % (100 − boş siyah; luma < %6 piksel oranı).
//       Dolu < %30 (boş siyah > %70) etiketi turuncu.
//       --step N       HÜCRE ARALIĞI: her N. DİSK karesi bir hücre (varsayılan round(12·FPS/30) = tam hızda 0,4 s)
//       --page-step N  DİSK→SAYFA ORANI: disk karesi başına sayfa karesi (render --step N ile üretilmiş kareler; animatikte manifest animatic.step'ten
//                      otomatik). ≠ 1 iken etiket "k<disk> · f<sayfa> · t s". Koruma: en büyük disk karesi × page-step sahne kare sayısını (+1) aşarsa
//                      çıkış 2 (hücre aralığını --page-step'e vermek etiketleri ×N yanlış yazardı). --fstep: eski ad (takma ad + kullanımdan kalkma uyarısı).
//   motion-render contact motion <id> [--moves auto|<plan.json>] [--ref <klip.mp4>] [--ref-start s] [--pad 0.5] [--dir out/frames/<id>] [--page-step N]
//                                     [--floor px] [--out out/probe/<id>-hareket.mp4]
//       hareket kontağı (tam render öncesi "DUR — hareket" için): hamle pencereleri ± pad kare dizininden kesilip tek mp4'te art arda (sahne fps / page-step).
//       --moves auto: sahne kancası __camSpeed (+ __shots) ile frame-check `moves` koşu tanımı (taban world camera.k3.v ‖ W·0,02/fps; birleşme 0,25 s,
//       en kısa 0,1 s) · plan dosyası: camera.moves [{id, a, b, ref?: [a, b]}] (saniye; ref = referans klipteki pencere).
//       --ref: yan yana (sol sahne, sağ referans; 1920 × sahne oranında yarım yükseklik, 16:9 → 1920×540); referans penceresi hamlenin ref'i ya da --ref-start'tan
//       pencere süresi kadar (kısa klip son karede tutulur). --ref yoksa 1920 × sahne oranı (16:9 → 1920×1080).
//       Hamle etiketi: id · süre · tepe px/kare @1080 (proje fps'inde) · görünür süre (yol %10 → %90) · C1 en kötü % (motion-test hız yöntemi, çekirdek [a, b]).
//       Alt şerit (turuncu) çekirdek pencerede görünür. Çıktı: <out>.mp4 + <out>.json (özet) + <out>-kontak.png (her hamlenin baş / orta / son karesi;
//       --ref ile referans satırı). Çıkış 0 · 1 hata (hamle yok, ffmpeg) · 2 kullanım (kare dizini yok, plan bozuk, page-step koruması).
//   motion-render contact sheet <çıktı.png> [--cols 3] [--w 640] [--title "…"] a.png[=etiket] b.png[=etiket] …
//       genel kontak tablosu: PNG listesi → tek sayfa (sütun, hücre genişliği 16:9, alt etiket). Yollar cwd'ye göre.
//   motion-render contact storyboard <SB-id>
//       storyboard kapısı: panel başına bir durağan anahtar an (sayfada kare k = panel k) + künye → out/boards/<SB-id>-pK.png + <SB-id>.png (3 sütun)
//       kayıt: boards/sb.json ya da diğer demo manifestleri (lib/project demoManifest), `panels: [{ f, t, beat, move, light|plate, pattern }]`
//   motion-render contact clips <id,id,…> [--t 0,2,4,6,8,9.9] [--fps 30] [--out out/probe/clips/CLIPS.png] [--title T]
//       üretken klipler yan yana (aynı anlar): assets/gen/manifest.json kayıtlarının conform kareleri (frames/NNNNN.jpg, kare = t·fps + 1); + .json özet
//   motion-render contact seq <id> --from A --to B [--step 3] [--cols 4] [--tag T] [--name seq] [--dir D]
//       sekans sayfası: kare aralığını sabit adımla ızgaraya dizer (hücre 480×270, üstte kare no · t) → out/probe/<id>[-<T>]-<ad>.png
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { ROOT, FPS, WIDTH, HEIGHT, sceneById, demoManifest, readTimeline, loadWorld, rel } from '../lib/project.mjs';
import { harnessArgs, harnessEnv } from '../lib/run.mjs';
import { frameLabel, pageFrame, pageStepGuard, pageStepOf, diskFrames } from '../lib/motion-contact.mjs';

const argv = process.argv.slice(2), SUB = ['sheet', 'storyboard', 'clips', 'seq', 'motion'].includes(argv[0]) ? argv[0] : null;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
// sahne kaydı + kare sayısı: frames = sayfanın OM_SCENES'i (render --step eşlemesiyle aynı) ‖ manifest `frames`; koruma ikisinin büyüğüyle
// (bayat manifest alanı yanlış alarm vermesin; hedef ×N hatası). Sahne yoksa null (koruma atlanır).
const sceneInfo = (id) => {
  let s = null; try { s = sceneById(id); } catch { return { scene: null, frames: null, guard: null }; }
  const M = Number.isFinite(+s.frames) && +s.frames > 0 ? +s.frames : null; let T = null;
  if (s.file) { try { T = readTimeline(s.file).frames; } catch { /* sayfa okunamadı */ } }
  return { scene: s, frames: T || M, guard: Math.max(T || 0, M || 0) || null };
};
const stepOrExit = (args, an) => { try { const r = pageStepOf(args, an); if (r.warn) console.error(r.warn); return r; } catch (e) { console.error('✗ contact: ' + e.message); process.exit(2); } };

if (!SUB) {
  // ── sahne kontak sayfası ───────────────────────────────────────────────
  const args = argv, argOf = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const id = args[0];
  if (!id || id.startsWith('--')) { console.error('kullanım: motion-render contact <id> [--step N (hücre aralığı)] [--cols 8] [--dir D] [--page-step N (disk→sayfa)] [--out P] · contact sheet|storyboard|clips|seq|motion …'); process.exit(2); }
  const SI = sceneInfo(id), AN = SI.scene && SI.scene.animatic;   // animatik sayfası (animatic.step) etiketleri sayfa zamanında
  const PS = stepOrExit(args, AN), FST = PS.pageStep, STEP = +(argOf('--step') || Math.round(12 * FPS / 30)),   /* hücre = 0.4 s */ COLS = +(argOf('--cols') || 8), W = 240, H = 135, LAB = 16;
  const DIR = argOf('--dir') ? path.resolve(ROOT, argOf('--dir')) : path.join(ROOT, 'out', 'frames', id);
  const frames = diskFrames(DIR);
  if (!frames.length) { console.error('✗ contact: kare yok: ' + path.relative(ROOT, DIR)); process.exit(2); }
  const G = pageStepGuard(frames[frames.length - 1], { pageStep: FST, sceneFrames: SI.guard });
  if (!G.ok) { console.error('✗ contact ' + id + ': ' + G.msg); process.exit(2); }
  if (FST === 1 && SI.frames > 0 && frames.length > 1 && frames.length * 1.5 < SI.frames) console.log('bilgi: ' + frames.length + ' disk karesi, sahne ' + SI.frames + ' kare (≈ 1/' + Math.round(SI.frames / frames.length) + '): render --step ile üretildiyse --page-step ' + Math.round(SI.frames / frames.length));
  const pick = frames.filter((f, i) => i % STEP === 0); if (pick[pick.length - 1] !== frames[frames.length - 1]) pick.push(frames[frames.length - 1]);
  const comp = [], CH = LAB + H + LAB;
  for (let i = 0; i < pick.length; i++) {
    const f = pick[i], file = path.join(DIR, String(f).padStart(5, '0') + '.png'), x = (i % COLS) * W, y = Math.floor(i / COLS) * CH;
    const px = await sharp(file).blur(0.8).resize(960, 540, { kernel: 'cubic' }).removeAlpha().raw().toBuffer();   // qc ile aynı ölçüm yolu
    let sum = 0, eb = 0;
    for (let k = 0; k < px.length; k += 3) { const v = 0.2126 * px[k] + 0.7152 * px[k + 1] + 0.0722 * px[k + 2]; sum += v; if (v < 15.3) eb++; }   // dolu = luma ≥ %6
    const b = sum / (px.length / 3) / 255 * 100, full = 100 - eb / (px.length / 3) * 100;
    comp.push({ input: Buffer.from('<svg width="' + W + '" height="' + LAB + '"><text x="4" y="12" font-family="monospace" font-size="11" fill="#cfcfcf">' + esc(frameLabel(f, { pageStep: FST, sceneFrames: SI.frames, fps: FPS })) + '</text></svg>'), left: x, top: y });
    comp.push({ input: await sharp(file).resize(W, H).png().toBuffer(), left: x, top: y + LAB });
    comp.push({ input: Buffer.from('<svg width="' + W + '" height="' + LAB + '"><text x="4" y="12" font-family="monospace" font-size="11" fill="' + (full < 30 ? '#e0a060' : '#9fd39f') + '">Ø ' + b.toFixed(1) + '% · dolu ' + Math.round(full) + '%</text></svg>'), left: x, top: y + LAB + H });
  }
  const out = argOf('--out') ? path.resolve(ROOT, argOf('--out')) : path.join(ROOT, 'out', 'probe', id + '-contact.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp({ create: { width: COLS * W, height: Math.ceil(pick.length / COLS) * CH, channels: 3, background: '#111' } }).composite(comp).png().toFile(out + '.part.png');
  fs.renameSync(out + '.part.png', out);
  console.log('✓ ' + path.relative(ROOT, out) + ' · ' + pick.length + ' kare (her ' + STEP + '. disk karesi' + (FST !== 1 ? '; page-step ' + FST + ' (' + PS.source + '), son f' + pageFrame(frames[frames.length - 1], { pageStep: FST, sceneFrames: SI.frames }) : '') + ')');
} else if (SUB === 'sheet') {
  // ── genel PNG ızgarası ─────────────────────────────────────────────────
  const args = argv.slice(1), out = args[0], opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
  if (!out || out.startsWith('--')) { console.error('kullanım: motion-render contact sheet <çıktı.png> [--cols 3] [--w 640] [--title "…"] a.png[=etiket] …'); process.exit(2); }
  const skip = new Set(); ['cols', 'w', 'title'].forEach((k) => { const i = args.indexOf('--' + k); if (i >= 0) { skip.add(i); skip.add(i + 1); } });
  const items = args.slice(1).filter((a, i) => !skip.has(i + 1)).map((a) => { const [f, ...l] = a.split('='); return { f, label: l.join('=') || path.basename(f, '.png') }; });
  const bad = items.filter((it) => !fs.existsSync(path.resolve(it.f)) || fs.statSync(path.resolve(it.f)).isDirectory());
  if (!items.length || bad.length) { console.error('contact sheet: ' + (items.length ? 'PNG dosyası değil / yok: ' + bad.map((b) => b.f).join(', ') : 'görüntü listesi boş') + '\nkullanım: motion-render contact sheet <çıktı.png> [--cols 3] [--w 640] [--title "…"] a.png[=etiket] …'); process.exit(2); }
  const C = +opt('cols', 3), W = +opt('w', 640), H = Math.round(W * 9 / 16), LB = 30, TT = opt('title', '') ? 46 : 0, rows = Math.ceil(items.length / C);
  const comp = [];
  for (let i = 0; i < items.length; i++) {
    const x = (i % C) * W, y = TT + Math.floor(i / C) * (H + LB);
    comp.push({ input: await sharp(items[i].f).resize(W, H).png().toBuffer(), left: x, top: y });
    comp.push({ input: Buffer.from('<svg width="' + W + '" height="' + LB + '"><rect width="100%" height="100%" fill="#111"/><text x="8" y="21" font-family="Consolas, monospace" font-size="16" fill="#ddd">' + esc(items[i].label) + '</text></svg>'), left: x, top: y + H });
  }
  if (TT) comp.push({ input: Buffer.from('<svg width="' + C * W + '" height="' + TT + '"><rect width="100%" height="100%" fill="#000"/><text x="10" y="31" font-family="Consolas, monospace" font-size="22" fill="#fff">' + esc(opt('title')) + '</text></svg>'), left: 0, top: 0 });
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  await sharp({ create: { width: C * W, height: TT + rows * (H + LB), channels: 3, background: '#000' } }).composite(comp).png().toFile(out + '.part.png');
  fs.renameSync(out + '.part.png', out); console.log('✓ ' + out + ' · ' + items.length + ' hücre');
} else if (SUB === 'storyboard') {
  // ── storyboard kapısı (render değil: her kare durağan anahtar an) ──────
  const id = argv[1];
  if (!id) { console.error('kullanım: motion-render contact storyboard <SB-id>'); process.exit(2); }
  const SB = demoManifest().scenes.find((s) => s.id === id && Array.isArray(s.panels));
  if (!SB) { console.error('storyboard kaydı yok (boards/sb.json ya da demo manifestleri): ' + id); process.exit(1); }
  const OUT = path.join(ROOT, 'out', 'boards'); fs.mkdirSync(OUT, { recursive: true });
  const n = SB.panels.length, frames = Array.from({ length: n }, (_, k) => k);
  const r = spawnSync(process.execPath, harnessArgs('probe', id, '--frame', '0', '--frames', frames.join(','), '--out', path.join('out', 'boards', id + '.png')), { cwd: ROOT, env: harnessEnv(), encoding: 'utf8' });
  if (r.status !== 0) { console.error((r.stdout || '').slice(-600) + (r.stderr || '').slice(-600)); process.exit(1); }
  const wrap = (s, max) => { const w = String(s).split(' '), L = []; let cur = ''; for (const x of w) { if ((cur + ' ' + x).trim().length > max) { L.push(cur.trim()); cur = x; } else cur += ' ' + x; } if (cur.trim()) L.push(cur.trim()); return L; };
  const PW = 960, PH = 540, CAP = 150, COLS = 3, TOP = 64, comps = [];
  for (let k = 0; k < n; k++) {
    const src = path.join(OUT, id + '-f' + String(k).padStart(4, '0') + '.png'), dst = path.join(OUT, id + '-p' + (k + 1) + '.png');
    fs.renameSync(src, dst);
    const x = (k % COLS) * PW, y = TOP + Math.floor(k / COLS) * (PH + CAP), P = SB.panels[k];
    comps.push({ input: await sharp(dst).resize(PW, PH).toBuffer(), left: x, top: y });
    const lines = [['#FFCC66', (k + 1) + ' · f' + P.f + ' · ' + P.t + ' · ' + P.beat], ...wrap('hareket: ' + P.move, 112).map((l) => ['#E8E2D6', l]), ...(P.plate ? wrap('plaka: ' + P.plate, 112).map((l) => ['#9FD3E6', l]) : wrap('ışık: ' + P.light, 112).map((l) => ['#C9C2B4', l])), ['#9FC48A', 'kalıp: ' + P.pattern]];
    const svg = '<svg width="' + PW + '" height="' + CAP + '"><rect width="100%" height="100%" fill="#14110E"/>' + lines.slice(0, 6).map((l, i) => '<text x="12" y="' + (24 + i * 22) + '" fill="' + l[0] + '" font-size="' + (i ? 15 : 18) + '" font-family="Consolas, monospace">' + esc(l[1]) + '</text>').join('') + '</svg>';
    comps.push({ input: Buffer.from(svg), left: x, top: y + PH });
  }
  const W = COLS * PW, H = TOP + Math.ceil(n / COLS) * (PH + CAP);
  comps.push({ input: Buffer.from('<svg width="' + W + '" height="' + TOP + '"><rect width="100%" height="100%" fill="#0A0908"/><text x="14" y="40" fill="#F2F4F7" font-size="26" font-family="Segoe UI, sans-serif">' +
    esc(SB.title || (SB.scene + ' · storyboard (' + n + ' panel, render değil) · world ' + SB.world + ' · onay olmadan render yok')) + '</text></svg>'), left: 0, top: 0 });
  const out = path.join(OUT, id + '.png');
  await sharp({ create: { width: W, height: H, channels: 3, background: '#0A0908' } }).composite(comps).png().toFile(out + '.part.png');
  fs.renameSync(out + '.part.png', out);
  console.log('✓ ' + path.relative(ROOT, out) + ' · ' + n + ' panel');
} else if (SUB === 'clips') {
  // ── üretken klipler yan yana: her klip bir satır, aynı anlar ───────────
  // Satır etiketi: model · çözünürlük (kaynak) · kredi (manifest) · ortalama luma · 1 s aralık ortalama fark (hareket miktarı; "yavaş" ölçütü).
  // Klip manifestte yoksa satır "bekleniyor" (kullanıcı üretimi). Artefakt ve "stok görünümü" kararı gözle; bu sayfa kanıt.
  const args = argv.slice(1), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
  const idArg = args[0] && !args[0].startsWith('--') ? args[0] : opt('ids');
  if (!idArg) { console.error('kullanım: motion-render contact clips <id,id,…> [--t 0,2,4,6,8,9.9] [--fps 30] [--out P] [--title T]'); process.exit(2); }
  const IDS = idArg.split(','), OUT = path.resolve(ROOT, opt('out', 'out/probe/clips/CLIPS.png')), CFPS = +opt('fps', 30);   // conform kare hızı (alım varsayılanı 30)
  const T = (opt('t', '0,2,4,6,8,9.9')).split(',').map(Number), TW = 384, TH = 216, LB = 26, HEAD = 40, W = T.length * TW, comps = [];   // klip kısaysa son anlar boş hücre
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'gen', 'manifest.json'), 'utf8'));
  const bar = (t, w, c, bg) => Buffer.from('<svg width="' + w + '" height="' + LB + '"><rect width="100%" height="100%" fill="' + (bg || '#000') + '"/><text x="6" y="18" fill="' + (c || '#fc6') + '" font-size="14" font-family="Consolas, monospace">' + esc(t) + '</text></svg>');
  const rows = [];
  for (let r = 0; r < IDS.length; r++) {
    const base = IDS[r], it = man.items.filter((x) => (x.sourceName || x.id).replace(/\.[^.]+$/, '') === base && !x.supersededBy).pop(), y = HEAD + r * (TH + LB);
    if (!it) { comps.push({ input: bar(base + ' · bekleniyor (kullanıcı üretimi, uygulama)', W, '#9aa3af', '#111'), left: 0, top: y + TH }); rows.push({ id: base, status: 'bekleniyor' }); continue; }
    const dir = path.join(ROOT, path.dirname(it.files.conform)), fdir = path.join(dir, 'frames'), n = fs.existsSync(fdir) ? fs.readdirSync(fdir).length : 0;
    let prev = null; const mot = [], lum = [];
    for (let k = 0; k < T.length; k++) {
      const fi = Math.max(1, Math.round(T[k] * CFPS) + 1), f = path.join(fdir, String(fi).padStart(5, '0') + '.jpg'); if (fi > n || !fs.existsSync(f)) continue;   // klip bittiyse hücre boş (donma gösterilmez)
      const g = await sharp(f).greyscale().resize(240, 135).raw().toBuffer(); let s = 0; for (const v of g) s += v; lum.push(s / g.length / 2.55);
      if (prev) { let d = 0; for (let i = 0; i < g.length; i++) d += Math.abs(g[i] - prev[i]); mot.push(d / g.length); } prev = g;
      comps.push({ input: await sharp(f).resize(TW, TH, { fit: 'cover' }).toBuffer(), left: k * TW, top: y });
      comps.push({ input: Buffer.from('<svg width="70" height="22"><rect width="100%" height="100%" fill="#000" opacity="0.6"/><text x="6" y="16" fill="#fff" font-size="13" font-family="Consolas">' + T[k].toFixed(1) + ' s</text></svg>'), left: k * TW + 4, top: y + 4 });
    }
    const c = it.conform || {}, mean = (a) => a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '—';
    const L = it.model + ' · kaynak ' + (c.srcW || '?') + '×' + (c.srcH || '?') + ' · ' + (c.duration || '?') + ' s · kredi ' + it.credits + ' · luma %' + mean(lum) + ' · 1 s aralık fark ' + mean(mot) + '/255';
    comps.push({ input: bar(L, W), left: 0, top: y + TH }); rows.push({ id: it.id, model: it.model, src: [c.srcW, c.srcH], credits: it.credits, luma: +mean(lum), motion: +mean(mot) });
  }
  // başlık: kimliklerin ortak öneki (son '-'ye kadar) atılır
  let pre = IDS.length > 1 ? IDS.reduce((p, s) => { let i = 0; while (i < p.length && p[i] === s[i]) i++; return p.slice(0, i); }) : '';
  pre = pre.slice(0, pre.lastIndexOf('-') + 1);
  comps.push({ input: Buffer.from('<svg width="' + W + '" height="' + HEAD + '"><rect width="100%" height="100%" fill="#0A0908"/><text x="8" y="26" fill="#F2F4F7" font-size="17" font-family="Segoe UI, sans-serif">' + esc(opt('title', 'KLİPLER')) + ' · ' + esc(IDS.map((x) => x.slice(pre.length)).join(' · ')) + ' · artefakt ve stok görünümü: gözle + kare kare (ingest scan)</text></svg>'), left: 0, top: 0 });
  const H = HEAD + IDS.length * (TH + LB);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await sharp({ create: { width: W, height: H, channels: 3, background: '#0A0908' } }).composite(comps).png().toFile(OUT + '.part.png'); fs.renameSync(OUT + '.part.png', OUT);
  fs.writeFileSync(OUT.replace(/\.png$/, '.json'), JSON.stringify(rows, null, 1));
  console.log('✓ ' + path.relative(ROOT, OUT) + ' · ' + rows.map((r) => r.id + (r.status ? ' (' + r.status + ')' : ' fark ' + r.motion)).join(' · '));
} else if (SUB === 'seq') {
  // ── sekans sayfası (mühür sekansı, hareket incelemesi) ─────────────────
  const args = argv.slice(1), argOf = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; }, id = args[0];
  if (!id || id.startsWith('--') || argOf('--from') == null || argOf('--to') == null) { console.error('kullanım: motion-render contact seq <id> --from A --to B [--step 3] [--cols 4] [--tag T] [--name seq] [--dir D]'); process.exit(2); }
  const TAG = argOf('--tag', null), A = +argOf('--from'), B = +argOf('--to'), STEP = +argOf('--step', 3), COLS = +argOf('--cols', 4), NAME = argOf('--name', 'seq');
  const W = 480, H = 270, LAB = 20, DIR = argOf('--dir') ? path.resolve(ROOT, argOf('--dir')) : path.join(ROOT, 'out', 'frames', id + (TAG ? '_' + TAG : ''));
  const frames = []; for (let f = A; f <= B; f += STEP) frames.push(f);
  const comp = [];
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i], x = (i % COLS) * W, y = Math.floor(i / COLS) * (H + LAB), src = path.join(DIR, String(f).padStart(5, '0') + '.png');
    comp.push({ input: Buffer.from('<svg width="' + W + '" height="' + LAB + '"><text x="6" y="15" font-family="monospace" font-size="14" fill="#ddd">f' + f + ' · ' + (f / FPS).toFixed(2) + ' s</text></svg>'), left: x, top: y });
    if (fs.existsSync(src)) comp.push({ input: await sharp(src).resize(W, H).png().toBuffer(), left: x, top: y + LAB });
  }
  const out = path.join(ROOT, 'out', 'probe', id + (TAG ? '-' + TAG : '') + '-' + NAME + '.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp({ create: { width: COLS * W, height: Math.ceil(frames.length / COLS) * (H + LAB), channels: 3, background: '#111' } }).composite(comp).png().toFile(out + '.part.png');
  fs.renameSync(out + '.part.png', out);
  console.log('✓ ' + path.relative(ROOT, out) + ' · ' + frames.length + ' kare (f' + A + '–f' + B + ', her ' + STEP + '.)');
} else if (SUB === 'motion') {
  // ── hareket kontağı: hamle pencereleri ± pad → tek mp4 + özet json + kontak PNG ──
  const MC = await import('../lib/motion-contact.mjs');
  const args = argv.slice(1), VAL = new Set(['--moves', '--ref', '--ref-start', '--pad', '--dir', '--out', '--page-step', '--fstep', '--floor']);
  const argOf = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
  const pos = args.filter((a, i) => !a.startsWith('--') && !VAL.has(args[i - 1])), id = pos[0];
  const usage = 'kullanım: motion-render contact motion <id> [--moves auto|<plan.json>] [--ref <klip.mp4>] [--ref-start s] [--pad 0.5] [--dir out/frames/<id>] [--page-step N] [--floor px] [--out out/probe/<id>-hareket.mp4]';
  const die = (m, c = 2) => { console.error('✗ contact motion: ' + m + (c === 2 ? '\n' + usage : '')); process.exit(c); };
  if (!id || pos.length > 1) die(pos.length > 1 ? 'fazla konum argümanı: ' + pos.slice(1).join(' ') : 'sahne kimliği yok');
  const SI = sceneInfo(id), PS = stepOrExit(args, SI.scene && SI.scene.animatic), ps = PS.pageStep, dfps = FPS / ps;
  const DIR = path.resolve(ROOT, argOf('--dir', path.join('out', 'frames', id))), frames = MC.diskFrames(DIR);
  if (!frames.length) die('kare yok: ' + rel(DIR) + ' (önce render; animatik kareleri --dir out/frames/<id>_animatic --page-step N)');
  const G = pageStepGuard(frames[frames.length - 1], { pageStep: ps, sceneFrames: SI.guard }); if (!G.ok) die(G.msg);
  const PAD = +argOf('--pad', 0.5), REF = argOf('--ref') ? path.resolve(argOf('--ref')) : null, REF0 = +argOf('--ref-start', 0) || 0, MV = argOf('--moves', 'auto');
  if (!(PAD >= 0)) die('--pad ≥ 0 saniye olmalı');
  if (REF && !fs.existsSync(REF)) die('referans klip yok: ' + argOf('--ref'));
  const OUT = path.resolve(ROOT, argOf('--out', path.join('out', 'probe', id + '-hareket.mp4'))), BASE = OUT.replace(/\.mp4$/i, '');
  // hamleler
  let moves, kaynak, design = null;
  if (MV === 'auto') {
    if (!SI.scene) die('auto: sahne manifestte yok (' + id + '); plan dosyası verin (--moves plan.json)');
    const { withPage } = await import('../lib/page.mjs');
    let v = null, shots = null, log = [];
    try {
      await withPage(SI.scene, {}, async (_page, api) => {
        log = api.log;
        if (await api.has('__camSpeed')) v = await api.eval(([f, n]) => window.__camSpeed(f, n), [FPS, api.frames]);
        if (await api.has('__shots')) shots = await api.eval((f) => window.__shots(f), FPS);
      });
    } catch (e) { die('sayfa: ' + e.message.split('\n')[0], 1); }
    if (log.some((l) => /PAGEERROR|x-import: FAILED/.test(l))) die('sayfa hatası: ' + log.filter((l) => /PAGEERROR|FAILED/.test(l)).slice(0, 2).join(' | '), 1);
    if (!Array.isArray(v) || !v.length) die('auto: sahnede __camSpeed kancası yok (CONTRACT §5); plan dosyası verin (--moves plan.json)', 1);
    v = v.map(Number); if (!Array.isArray(shots) || !shots.length) shots = [['tüm', 0, v.length - 1]];
    const W0 = loadWorld() || {}, k3 = ((W0.camera || {}).k3 || {}).v, floor = argOf('--floor') != null ? +argOf('--floor') : k3 != null ? +[].concat(k3)[0] : (WIDTH * 0.02) / FPS;
    moves = MC.movesFromSpeed(v, shots, { fps: FPS, floor }); kaynak = 'auto (__camSpeed' + (shots[0][0] === 'tüm' ? '' : ' + __shots') + ')'; design = { floor: +floor.toFixed(3), shots: shots.length };
  } else {
    const pf = path.resolve(ROOT, MV);
    if (!fs.existsSync(pf)) die('plan dosyası yok: ' + MV);
    try { moves = MC.movesFromPlan(JSON.parse(fs.readFileSync(pf, 'utf8'))); } catch (e) { die('plan: ' + e.message); }
    kaynak = 'plan ' + rel(pf);
  }
  if (!moves.length) die('hamle yok (' + kaynak + (design ? '; taban ' + design.floor + ' px/kare' : '') + ')', 1);
  // çıktı boyutu: --ref → 2 × 960 yan yana (sahne oranında); yoksa 1920 × sahne oranı (çift piksel)
  const even = (x) => Math.max(2, Math.round(x / 2) * 2), PW = REF ? 960 : 1920, PH = even((PW * HEIGHT) / WIDTH), OW = REF ? 2 * PW : PW, OH = PH;
  const PARTS = BASE + '.parts'; fs.rmSync(PARTS, { recursive: true, force: true }); fs.mkdirSync(PARTS, { recursive: true });
  const t0 = Date.now(), rows = [], segs = [], sheet = [];
  for (let i = 0; i < moves.length; i++) {
    const m = moves[i], w = MC.windowOf(m, { pad: PAD, fps: FPS, pageStep: ps, sceneFrames: SI.frames, frames });
    if (w.nCore < 2) { rows.push(Object.assign({}, m, { skipped: 'çekirdek pencerede < 2 disk karesi (kare dizini kapsamıyor)' })); continue; }
    if (!w.contiguous) die('kare dizininde boşluk: k' + w.k0 + '–k' + w.k1 + ' (' + m.id + ')', 1);
    const coreKs = frames.filter((k) => k >= w.c0 && k <= w.c1);
    const met = MC.moveMetrics(await MC.grayOf(DIR, coreKs), 960, 540, { diskFps: dfps, pageStep: ps });
    const pf = (k) => pageFrame(k, { pageStep: ps, sceneFrames: SI.frames }), sec = +((pf(w.c1) - pf(w.c0) + ps) / FPS).toFixed(2), D = w.n / dfps;
    let ref = null;
    if (REF) {
      const ra = m.ref ? m.ref[0] : REF0, rd = m.ref ? Math.min(m.ref[1] - m.ref[0], D) : D;
      ref = { file: REF, start: ra, dur: +rd.toFixed(3), metrics: MC.refMetrics(REF, ra, rd, { diskFps: dfps, pageStep: ps }) };
    }
    const lab = path.join(PARTS, 'lab-' + i + '.png'), core = path.join(PARTS, 'core-' + i + '.png'), seg = path.join(PARTS, 'seg-' + String(i).padStart(3, '0') + '.mp4');
    const left = m.id + ' · ' + sec + ' s · f' + pf(w.c0) + '–f' + pf(w.c1) + ' · tepe ' + met.peak + ' px/kare @' + FPS + ' · görünür ' + (met.visible != null ? met.visible + ' s' : '—') + ' · C1 en kötü %' + Math.round(met.c1Worst * 100);
    const right = ref ? 'ref ' + path.basename(REF) + ' ' + ref.start.toFixed(2) + '–' + (ref.start + ref.dur).toFixed(2) + ' s' + (ref.metrics ? ' · tepe ' + ref.metrics.peak + ' · görünür ' + (ref.metrics.visible != null ? ref.metrics.visible + ' s' : '—') + ' · C1 %' + Math.round(ref.metrics.c1Worst * 100) : '') : null;
    await MC.labelPng(lab, { OW, OH, PW, left, right });
    await sharp({ create: { width: PW, height: 8, channels: 4, background: '#ff9a1f' } }).png().toFile(core);
    try {
      MC.encodeSegment({ dir: DIR, k0: w.k0, n: w.n, dfps, OW, OH, PW, PH, label: lab, coreBar: { file: core, t0: (w.c0 - w.k0) / dfps, t1: (w.c1 - w.k0 + 1) / dfps }, ref: ref && { file: REF, start: ref.start, dur: ref.dur }, out: seg });
    } catch (e) { die('encode (' + m.id + '): ' + e.message.split('\n').slice(-3).join(' '), 1); }
    segs.push(seg);
    const at = (t) => +t.toFixed(2), mid = coreKs[Math.floor(coreKs.length / 2)], cells = [w.c0, mid, w.c1].map((k) => ({ t: at(pf(k) / FPS), png: path.join(DIR, MC.pad5(k) + '.png') }));
    sheet.push({ label: m.id, frames: cells });
    if (ref) { const rc = [0, ref.dur / 2, Math.max(0, ref.dur - 1 / dfps)].map((t) => ({ t: at(ref.start + t), png: MC.refFramePng(REF, ref.start + t) })).filter((c) => c.png); if (rc.length) sheet.push({ label: m.id + ' ref', frames: rc }); }
    rows.push({ id: m.id, a: m.a, b: m.b, shot: m.shot, sec, pageFrames: [pf(w.c0), pf(w.c1)], disk: { window: [w.k0, w.k1], core: [w.c0, w.c1] }, nFrames: w.n, window: [at(pf(w.k0) / FPS), at(pf(w.k1) / FPS)],
      peak: met.peak, peakAt: pf(coreKs[met.peakAtDisk] != null ? coreKs[met.peakAtDisk] : w.c0), visible: met.visible, c1Worst: met.c1Worst, c1Jumps: met.c1Jumps, movingShare: met.movingShare, cuts: met.cuts,
      designPeak: m.designPeak != null ? m.designPeak : null, ref: ref ? { start: ref.start, dur: ref.dur, metrics: ref.metrics } : null });
  }
  if (!segs.length) die('hiçbir hamle penceresi kare dizininde yok (' + rel(DIR) + ')', 1);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  try { MC.concatMp4(segs, OUT); } catch (e) { die('birleştirme: ' + e.message.split('\n').slice(-2).join(' '), 1); }
  const PNG = BASE + '-kontak.png', JS = BASE + '.json';
  await MC.motionSheet(sheet, PNG, 'hareket kontağı · ' + id + ' · ' + segs.length + ' hamle (baş / orta / son)' + (REF ? ' ↔ ' + path.basename(REF) : ''));
  const total = +(rows.filter((r) => !r.skipped).reduce((a, r) => a + r.nFrames, 0) / dfps).toFixed(2);
  const J = { tool: 'contact motion', scene: id, at: new Date().toISOString(), seconds: +((Date.now() - t0) / 1000).toFixed(1), source: kaynak, design, fps: FPS, pageStep: ps, pageStepSource: PS.source, diskFps: dfps, pad: PAD,
    size: [OW, OH], ref: REF ? { file: path.basename(REF), start: REF0 } : null, method: 'motion-test profile (SAD kaydırma, 960×540, px/kare @1080 → sayfa karesi başına); görünür = yol %10 → %90; C1 = c1Scan en kötü pay',
    moves: rows, count: rows.filter((r) => !r.skipped).length, totalSec: total, files: { mp4: rel(OUT), json: rel(JS), png: rel(PNG) } };
  fs.writeFileSync(JS + '.part', JSON.stringify(J, null, 1)); fs.renameSync(JS + '.part', JS);
  fs.rmSync(PARTS, { recursive: true, force: true });
  for (const r of rows) console.log('  ' + r.id + (r.skipped ? ' · atlandı: ' + r.skipped : ' · ' + r.sec + ' s · tepe ' + r.peak + ' px/kare @' + FPS + ' · görünür ' + (r.visible != null ? r.visible + ' s' : '—') + ' · C1 en kötü %' + Math.round(r.c1Worst * 100)));
  console.log('✓ contact motion ' + id + ' · ' + J.count + ' hamle · ' + total + ' s @' + dfps + ' (' + OW + '×' + OH + ', ' + kaynak + ') → ' + rel(OUT) + ' + ' + path.basename(JS) + ' + ' + path.basename(PNG));
}
