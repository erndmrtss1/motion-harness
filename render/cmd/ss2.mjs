// motion-render ss2 — 2× kuralı: kamera k < 0.5 (genel bakış) olan kare aralıkları 2× süper örnekleme, yakın planlar 1×; render aralık bazlı.
//   motion-render ss2 <id> [--k 0.5] [--pad 6] [--blend 6] [--frames a-b] [--plan] [--no-merge] [-- <render argümanları>]
//   --frames a-b (kapsayıcı pencere): plan ve ağırlıklar bütün sahne için aynen hesaplanır (k bütün N kareden, ± pad, karışım W2); yalnız pencereyle
//   kesişen 2×/1× alt aralıklar render edilir ve yalnız a..b kareleri birleştirilir — pencere içindeki kareler tam koşuyla bayt bayt aynı (kısmi yeniden render).
//   1) sahne window.__camK(fps, n) → kare başı k (yoksa durur)   2) k < eşik (± pad kare) → 2× aralıklar, kalan 1×
//   3) render --range a-b --tag ss2 --scale 2 / --tag ss1 (--resume --progress --frame-log), sırayla
//   4) birleştir: out/frames/<id>/NNNNN.png ← 2× ise 2×2 kutu ortalaması (sRGB, tarayıcı karışımıyla aynı), 1× ise kopya (.part → rename)
//
//   motion-render ss2 down <dir> [eşzamanlı=4]
//   klasördeki 2× kareleri (2·genişlik × 2·yükseklik) yerinde 1×'e indir (aynı 2×2 kutu ortalaması `(a+b+c+d+2)>>2`; .part → rename); 1× kareler atlanır.
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { ROOT, FPS as FPS0, WIDTH, HEIGHT, sceneById } from '../lib/project.mjs';
import { harnessArgs, harnessEnv, parseEval } from '../lib/run.mjs';
const W1 = WIDTH, H1 = HEIGHT, W2x = 2 * WIDTH, H2x = 2 * HEIGHT;
// 2×2 kutu ortalaması: 2× ham RGB → 1× ham RGB
const down2 = (data) => { const o = Buffer.alloc(W1 * H1 * 3); for (let y = 0; y < H1; y++) for (let x = 0; x < W1; x++) { const i = ((2 * y) * W2x + 2 * x) * 3, j = i + W2x * 3; for (let c = 0; c < 3; c++) o[(y * W1 + x) * 3 + c] = (data[i + c] + data[i + 3 + c] + data[j + c] + data[j + 3 + c] + 2) >> 2; } return o; };

// ── ss2 down <dir> ─────────────────────────────────────────────────────────
if (process.argv[2] === 'down') {
  const [dirA, cs] = process.argv.slice(3);
  if (!dirA) { console.error('kullanım: motion-render ss2 down <kare-klasörü> [eşzamanlı=4]'); process.exit(2); }
  const dir = path.resolve(ROOT, dirA), C = +cs || 4, files = fs.readdirSync(dir).filter((f) => /^\d+\.png$/.test(f)).sort();
  let done = 0, skip = 0;
  const one = async (f) => {
    const p = path.join(dir, f), { data, info } = await sharp(p).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    if (info.width === W1) { skip++; return; }
    if (info.width !== W2x || info.height !== H2x) throw new Error('beklenmeyen boyut ' + f + ' ' + info.width + '×' + info.height);
    await sharp(down2(data), { raw: { width: W1, height: H1, channels: 3 } }).png().toFile(p + '.part'); fs.renameSync(p + '.part', p); done++;
  };
  for (let i = 0; i < files.length; i += C) await Promise.all(files.slice(i, i + C).map(one));
  console.log('✓ ' + dir + ' · indirilen ' + done + ' · zaten ' + W1 + '×' + H1 + ' ' + skip + ' · toplam ' + files.length);
  process.exit(0);
}

// '--' sonrası argümanlar render'lara geçer (ör. -- --set FX_EXPO_POST=1)
const dd = process.argv.indexOf('--'), args = process.argv.slice(2, dd > 0 ? dd : undefined), pass = dd > 0 ? process.argv.slice(dd + 1) : [], id = args[0], argOf = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
if (!id || id.startsWith('--')) { console.error('kullanım: motion-render ss2 <id> [--k 0.5] [--pad 6] [--blend 6] [--frames a-b] [--plan] [--no-merge] [-- <render argümanları>] · motion-render ss2 down <dir>'); process.exit(2); }
const KT = +argOf('--k', 0.5), PAD = +argOf('--pad', 6), BL = +argOf('--blend', 6);
let S; try { S = sceneById(id); } catch { console.error('manifestte yok: ' + id); process.exit(1); }
const N = S.frames, FPS = S.fps || FPS0;
// --frames a-b: render/birleştirme penceresi (plan bütün sahne için)
let WA = 0, WB = N - 1;
if (argOf('--frames') != null) { const m = /^(\d+)-(\d+)$/.exec(argOf('--frames')); if (!m || +m[2] < +m[1] || +m[2] > N - 1) { console.error('--frames a-b: 0 ≤ a ≤ b ≤ ' + (N - 1) + ' olmalı'); process.exit(2); } WA = +m[1]; WB = +m[2]; }
const WIN = WA > 0 || WB < N - 1;
// 1) kare başı k
const tmp = path.join(ROOT, 'out', 'probe', '_ss2-k.png');
const r = spawnSync(process.execPath, harnessArgs('probe', id, '--frame', '0', '--out', tmp, '--eval', 'JSON.stringify(window.__camK ? window.__camK(' + FPS + ', ' + N + ') : null)'), { cwd: ROOT, env: harnessEnv(), encoding: 'utf8', maxBuffer: 64 << 20 });
fs.rmSync(tmp, { force: true });
const ev = parseEval(r.stdout);
const K = ev != null ? JSON.parse(ev) : null;
if (!K || K.length !== N) { console.error('sahne window.__camK vermedi ya da kare sayısı tutmuyor (' + (K ? K.length : 'yok') + ' / ' + N + ')'); process.exit(1); }
// 2) aralıklar
const ss = K.map((k) => k < KT), dil = ss.map((_, f) => { for (let j = Math.max(0, f - PAD); j <= Math.min(N - 1, f + PAD); j++) if (ss[j]) return true; return false; });
// sınır karışımı — 2× ağırlığı = maskenin ± BL kutu ortalaması (sio); 0 < w < 1 kareler iki çözünürlükte çizilir
const W2 = dil.map((_, f) => { if (!BL) return dil[f] ? 1 : 0; let s = 0, c = 0; for (let j = f - BL; j < f + BL; j++) { s += dil[Math.max(0, Math.min(N - 1, j))] ? 1 : 0; c++; } const u = s / c; return 0.5 - 0.5 * Math.cos(Math.PI * u); });
const runs = (sel) => { const r = []; for (let f = 0; f < N; f++) if (sel(f)) { if (r.length && r[r.length - 1].b === f - 1) r[r.length - 1].b = f; else r.push({ a: f, b: f }); } return r; };
const ranges = runs((f) => W2[f] > 0).map((q) => Object.assign({ ss: true }, q)).concat(runs((f) => W2[f] < 1).map((q) => Object.assign({ ss: false }, q))).sort((x, y) => x.a - y.a);
const n2 = W2.filter((w) => w > 0).length, nb = W2.filter((w) => w > 0 && w < 1).length;
console.log(id + ' · ' + N + ' kare · k < ' + KT + ' (± ' + PAD + ') → 2× ' + n2 + ' kare, 1× ' + W2.filter((w) => w < 1).length + ' kare (karışım ' + nb + ' kare) · aralıklar: ' + ranges.map((q) => (q.ss ? '2×' : '1×') + ' ' + q.a + '–' + q.b).join(', '));
// pencereyle kesişen alt aralıklar (pencere yoksa aralıkların kendisi)
const todo = ranges.map((q) => ({ ss: q.ss, a: Math.max(q.a, WA), b: Math.min(q.b, WB) })).filter((q) => q.a <= q.b);
if (WIN) console.log('pencere ' + WA + '–' + WB + ' (' + (WB - WA + 1) + ' kare) · render: ' + todo.map((q) => (q.ss ? '2×' : '1×') + ' ' + q.a + '–' + q.b).join(', '));
if (args.includes('--plan')) process.exit(0);
// 3) render (sırayla)
for (const q of todo) {
  const tag = q.ss ? 'ss2' : 'ss1', a = ['--range', q.a + '-' + q.b, '--tag', tag, '--resume', '--progress', '--frame-log'].concat(q.ss ? ['--scale', '2'] : [], pass);
  console.log('==== ' + (q.ss ? '2×' : '1×') + ' ' + q.a + '–' + q.b + ' (' + new Date().toTimeString().slice(0, 8) + ')');
  const h = spawnSync(process.execPath, harnessArgs('render', id, a), { cwd: ROOT, env: harnessEnv(), stdio: 'inherit' });
  if (h.status !== 0) { console.error('render çıkış ' + h.status + ' (' + tag + ' ' + q.a + '–' + q.b + ')'); process.exit(h.status || 1); }
}
if (args.includes('--no-merge')) process.exit(0);
// 4) birleştir
const out = path.join(ROOT, 'out', 'frames', id); fs.mkdirSync(out, { recursive: true });
const rd = async (p) => { const { data, info } = await sharp(p).removeAlpha().raw().toBuffer({ resolveWithObject: true }); if (info.width === W1) return data; return down2(data); };
let d2 = 0, c1 = 0;
for (let f = WA; f <= WB; f++) {
  const nm = String(f).padStart(5, '0') + '.png', src = path.join(ROOT, 'out', 'frames', id + '_' + (W2[f] >= 1 ? 'ss2' : 'ss1'), nm), dst = path.join(out, nm);
  if (W2[f] > 0 && W2[f] < 1) {   // sınır karışımı (aynı içerik, iki örnekleme — opaklık geçişi değil)
    const A = await rd(path.join(ROOT, 'out', 'frames', id + '_ss2', nm)), B = await rd(path.join(ROOT, 'out', 'frames', id + '_ss1', nm)), w = W2[f], o = Buffer.alloc(A.length);
    for (let i = 0; i < A.length; i++) o[i] = Math.round(A[i] * w + B[i] * (1 - w));
    await sharp(o, { raw: { width: W1, height: H1, channels: 3 } }).png().toFile(dst + '.part'); fs.renameSync(dst + '.part', dst); d2++; continue;
  }
  if (!fs.existsSync(src)) { console.error('eksik kare: ' + src); process.exit(5); }
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width === W2x && info.height === H2x) {
    await sharp(down2(data), { raw: { width: W1, height: H1, channels: 3 } }).png().toFile(dst + '.part'); d2++;
  } else if (info.width === W1 && info.height === H1) { fs.copyFileSync(src, dst + '.part'); c1++; }
  else { console.error('beklenmeyen boyut ' + src + ' ' + info.width + '×' + info.height); process.exit(1); }
  fs.renameSync(dst + '.part', dst);
}
const lg = path.join(ROOT, 'out', 'logs', id + '-expo-post.json');
if (fs.existsSync(lg) && !WIN) { fs.rmSync(lg); console.log('not: kareler ham hâline döndü — expo-post kaydı silindi, motion-render expo-post ' + id + ' yeniden çalıştırılmalı'); }
else if (fs.existsSync(lg)) {   // pencere: yalnız yeniden yazılan karelerin kaydı silinir (pencere dışı kareler işlenmiş kalır, ikinci kez karartılmaz)
  const J = JSON.parse(fs.readFileSync(lg, 'utf8')); let k = 0;
  for (let f = WA; f <= WB; f++) { const nm = String(f).padStart(5, '0') + '.png'; if (nm in J) { delete J[nm]; k++; } }
  if (k) { fs.writeFileSync(lg + '.part', JSON.stringify(J)); fs.renameSync(lg + '.part', lg); console.log('not: pencerede ' + k + ' kare ham hâline döndü — expo-post kaydından çıkarıldı, motion-render expo-post ' + id + ' yeniden çalıştırılmalı'); }
}
console.log('✓ ' + out + ' · 2×/karışım ' + d2 + ' · 1× ' + c1 + ' · toplam ' + (WB - WA + 1) + (WIN ? ' (pencere ' + WA + '–' + WB + ' / ' + N + ')' : ''));
