// motion-render arsiv — perde arşivi: kare dizini → FFV1 kayıpsız (.mkv, bgr0, bit-exact; framemd5 doğrulaması),
//   perde mp4'leri (grade'li + sesli) ve künyeler → out/archive/<film>_<tag>/ + ARSIV.json (dosya, boyut, kare, doğrulama).
//   Kaynak kare dizinleri SİLİNMEZ (tutma kuralı; temizlik kullanıcı kararı).
//   motion-render arsiv [--tag v1] [--film <id>] [--ids P1,…] [--skip-frames] [--link-from v1]
//     --link-from: --ids dışındaki perdeler önceki sürümün FFV1'inden sabit bağ (aynı birim gerekir); framemd5 kaydı taşınır.
//   Film ve perdeler manifestten (lib/film.mjs). Künye belgeleri: scenes.json `archive.docs` (proje köküne göre yol listesi);
//   yoksa docs/ altında adı KUNYE ya da TESLIM içeren .md dosyaları (ad sırası).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { ffmpeg } from '../lib/ffmpeg.mjs';
import { ROOT, MAN, FPS } from '../lib/project.mjs';
import { filmParts } from '../lib/film.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
if (args.includes('--help') || args.includes('-h')) { console.log('kullanım: motion-render arsiv [--tag v1] [--film id] [--ids a,b,…] [--skip-frames] [--link-from vN]'); process.exit(0); }
let FILM, ALL;
try { ({ film: FILM, ids: ALL } = filmParts(opt('film'))); } catch (e) { console.error(e.message); process.exit(1); }
const TAG = opt('tag', 'v1'), IDS = opt('ids', ALL.join(',')).split(',').filter(Boolean), FROM = opt('link-from', null);
if (!IDS.length) { console.error('perde yok (manifestte `parent` alanlı sahne ya da --ids)'); process.exit(1); }
const A = path.join(ROOT, 'out', 'archive', FILM + '_' + TAG), K = path.join(A, 'kareler'), SC = path.join(A, 'sahneler'), KN = path.join(A, 'kunye');
for (const d of [K, SC, KN]) fs.mkdirSync(d, { recursive: true });
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');
const ff = (a) => { const r = spawnSync(ffmpeg, ['-hide_banner', '-y', '-loglevel', 'error', ...a], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 30 }); if (r.status !== 0) { console.error((r.stderr || '').slice(-2000)); process.exit(1); } return r.stdout || ''; };
const md5s = (inp, extra = []) => ff([...extra, '-i', inp, '-map', '0:v:0', '-pix_fmt', 'rgb24', '-f', 'framemd5', '-']).split('\n').filter((l) => l && l[0] !== '#').map((l) => l.split(',').pop().trim());
const copy = (src, dst) => { fs.copyFileSync(src, dst + '.part'); fs.renameSync(dst + '.part', dst); return dst; };
const J = fs.existsSync(path.join(A, 'ARSIV.json')) ? JSON.parse(fs.readFileSync(path.join(A, 'ARSIV.json'), 'utf8')) : { tag: TAG, kareler: {}, sahneler: {}, kunye: [] };
J.not = 'Kare dizinleri FFV1 kayıpsız (level 3, bgr0, dilim CRC) — çözülünce PNG RGB ile bit-exact (framemd5 kare kare). Kaynak dizinler out/frames/<id> yerinde kalır (§16).';   // metin kaynakla aynı (ARSIV.json paritesi)
if (!args.includes('--skip-frames')) for (const id of IDS) {
  const dir = path.join(ROOT, 'out', 'frames', id);
  if (!fs.existsSync(dir)) { console.error('kare dizini yok: ' + rel(dir)); process.exit(1); }
  const files = fs.readdirSync(dir).filter((f) => /^\d{5}\.png$/.test(f)).sort(), n = files.length, t0 = Date.now();
  const pngB = files.reduce((s, f) => s + fs.statSync(path.join(dir, f)).size, 0), mkv = path.join(K, id + '.mkv');
  ff(['-framerate', String(FPS), '-i', path.join(dir, '%05d.png'), '-c:v', 'ffv1', '-level', '3', '-g', '1', '-slices', '16', '-slicecrc', '1', '-context', '1', '-pix_fmt', 'bgr0', '-f', 'matroska', mkv + '.part']);
  fs.renameSync(mkv + '.part', mkv);
  const a = md5s(path.join(dir, '%05d.png'), ['-framerate', String(FPS)]), b = md5s(mkv), same = a.length === n && b.length === n && a.every((v, i) => v === b[i]);
  const h = crypto.createHash('md5').update(a.join('\n')).digest('hex');
  J.kareler[id] = { dosya: rel(mkv), kare: n, pngMB: +(pngB / 1048576).toFixed(1), ffv1MB: +(fs.statSync(mkv).size / 1048576).toFixed(1), oran: +(fs.statSync(mkv).size / pngB).toFixed(3), bitExact: same, framemd5Ozet: h, sure_s: Math.round((Date.now() - t0) / 1000) };
  console.log((same ? '✓ ' : '✗ ') + id + ' · ' + n + ' kare · PNG ' + J.kareler[id].pngMB + ' MB → FFV1 ' + J.kareler[id].ffv1MB + ' MB (' + J.kareler[id].oran + ') · bit-exact ' + same);
  if (!same) process.exitCode = 1;
  fs.writeFileSync(path.join(A, 'ARSIV.json'), JSON.stringify(J, null, 1));
}
if (FROM) { const A0 = path.join(ROOT, 'out', 'archive', FILM + '_' + FROM), J0 = JSON.parse(fs.readFileSync(path.join(A0, 'ARSIV.json'), 'utf8'));
  for (const id of ALL.filter((x) => !IDS.includes(x))) { const src = path.join(A0, 'kareler', id + '.mkv'), dst = path.join(K, id + '.mkv'); if (!fs.existsSync(dst)) fs.linkSync(src, dst); J.kareler[id] = Object.assign({}, J0.kareler[id], { dosya: rel(dst), kaynak: 'sabit bağ ← ' + FILM + '_' + FROM + ' (kareler değişmedi)' }); console.log('↪ ' + id + ' ← ' + FROM); }
  fs.writeFileSync(path.join(A, 'ARSIV.json'), JSON.stringify(J, null, 1)); }
for (const id of ALL) for (const suf of ['', '-ses']) { const src = path.join(ROOT, 'out', 'scenes', id + suf + '.mp4'); if (fs.existsSync(src)) { const d = copy(src, path.join(SC, id + suf + '.mp4')); J.sahneler[id + suf] = { dosya: rel(d), MB: +(fs.statSync(d).size / 1048576).toFixed(1) }; } }
// künye belgeleri: manifest listesi, yoksa docs/*KUNYE*|*TESLIM* (.md)
const docsDir = path.join(ROOT, 'docs');
const KUNYE = MAN.archive && Array.isArray(MAN.archive.docs) ? MAN.archive.docs
  : fs.existsSync(docsDir) ? fs.readdirSync(docsDir).filter((f) => /\.md$/i.test(f) && /KUNYE|TESLIM/i.test(f)).sort().map((f) => 'docs/' + f) : [];
J.kunye = KUNYE.filter((f) => fs.existsSync(path.join(ROOT, f))).map((f) => rel(copy(path.join(ROOT, f), path.join(KN, path.basename(f)))));
fs.writeFileSync(path.join(A, 'ARSIV.json'), JSON.stringify(J, null, 1));
console.log('✓ ' + rel(A) + ' · kareler ' + Object.keys(J.kareler).length + ' · sahneler ' + Object.keys(J.sahneler).length + ' · künye ' + J.kunye.length);
