// motion-render contact — kontak sayfaları
//
//   motion-render contact <id> [--step N] [--cols 8] [--dir out/frames/<id>] [--fstep N] [--out P]     → out/probe/<id>-contact.png
//       sahne kontak sayfası: her N. kare (varsayılan 0.4 s = round(12·FPS/30)), 8 sütun, üst etiket fN · t s, alt etiket ortalama parlaklık %
//       + doluluk % (100 − boş siyah; luma < %6 piksel oranı). Dolu < %30 (boş siyah > %70) etiketi turuncu. Animatik (manifest animatic.step) etiketleri sayfa zamanında.
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
import { ROOT, FPS, sceneById, demoManifest } from '../lib/project.mjs';
import { harnessArgs, harnessEnv } from '../lib/run.mjs';

const argv = process.argv.slice(2), SUB = ['sheet', 'storyboard', 'clips', 'seq'].includes(argv[0]) ? argv[0] : null;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

if (!SUB) {
  // ── sahne kontak sayfası ───────────────────────────────────────────────
  const args = argv, argOf = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const id = args[0];
  if (!id || id.startsWith('--')) { console.error('kullanım: motion-render contact <id> [--step N] [--cols 8] [--dir D] [--fstep N] [--out P] · contact sheet|storyboard|clips|seq …'); process.exit(2); }
  const AN = (() => { try { const s = sceneById(id); return s && s.animatic; } catch (e) { return null; } })();   // animatik (step 2) etiketleri sayfa zamanında
  const FST = +(argOf('--fstep') || (AN && AN.step) || 1), STEP = +(argOf('--step') || Math.round(12 * FPS / 30)),   /* hücre = 0.4 s */ COLS = +(argOf('--cols') || 8), W = 240, H = 135, LAB = 16;
  const DIR = argOf('--dir') ? path.resolve(ROOT, argOf('--dir')) : path.join(ROOT, 'out', 'frames', id);
  const frames = fs.readdirSync(DIR).filter((f) => /^\d{5}\.png$/.test(f)).map((f) => +f.slice(0, 5)).sort((a, b) => a - b);
  const pick = frames.filter((f, i) => i % STEP === 0); if (pick[pick.length - 1] !== frames[frames.length - 1]) pick.push(frames[frames.length - 1]);
  const comp = [], CH = LAB + H + LAB;
  for (let i = 0; i < pick.length; i++) {
    const f = pick[i], file = path.join(DIR, String(f).padStart(5, '0') + '.png'), x = (i % COLS) * W, y = Math.floor(i / COLS) * CH;
    const px = await sharp(file).blur(0.8).resize(960, 540, { kernel: 'cubic' }).removeAlpha().raw().toBuffer();   // qc ile aynı ölçüm yolu
    let sum = 0, eb = 0;
    for (let k = 0; k < px.length; k += 3) { const v = 0.2126 * px[k] + 0.7152 * px[k + 1] + 0.0722 * px[k + 2]; sum += v; if (v < 15.3) eb++; }   // dolu = luma ≥ %6
    const b = sum / (px.length / 3) / 255 * 100, full = 100 - eb / (px.length / 3) * 100;
    comp.push({ input: Buffer.from('<svg width="' + W + '" height="' + LAB + '"><text x="4" y="12" font-family="monospace" font-size="11" fill="#cfcfcf">f' + f * FST + ' · ' + (f * FST / FPS).toFixed(2) + ' s</text></svg>'), left: x, top: y });
    comp.push({ input: await sharp(file).resize(W, H).png().toBuffer(), left: x, top: y + LAB });
    comp.push({ input: Buffer.from('<svg width="' + W + '" height="' + LAB + '"><text x="4" y="12" font-family="monospace" font-size="11" fill="' + (full < 30 ? '#e0a060' : '#9fd39f') + '">Ø ' + b.toFixed(1) + '% · dolu ' + Math.round(full) + '%</text></svg>'), left: x, top: y + LAB + H });
  }
  const out = argOf('--out') ? path.resolve(ROOT, argOf('--out')) : path.join(ROOT, 'out', 'probe', id + '-contact.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp({ create: { width: COLS * W, height: Math.ceil(pick.length / COLS) * CH, channels: 3, background: '#111' } }).composite(comp).png().toFile(out + '.part.png');
  fs.renameSync(out + '.part.png', out);
  console.log('✓ ' + path.relative(ROOT, out) + ' · ' + pick.length + ' kare (her ' + STEP + '.)');
} else if (SUB === 'sheet') {
  // ── genel PNG ızgarası ─────────────────────────────────────────────────
  const args = argv.slice(1), out = args[0], opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
  if (!out || out.startsWith('--')) { console.error('kullanım: motion-render contact sheet <çıktı.png> [--cols 3] [--w 640] [--title "…"] a.png[=etiket] …'); process.exit(2); }
  const skip = new Set(); ['cols', 'w', 'title'].forEach((k) => { const i = args.indexOf('--' + k); if (i >= 0) { skip.add(i); skip.add(i + 1); } });
  const items = args.slice(1).filter((a, i) => !skip.has(i + 1)).map((a) => { const [f, ...l] = a.split('='); return { f, label: l.join('=') || path.basename(f, '.png') }; });
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
}
