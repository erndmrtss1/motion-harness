// motion-render expo-post — sahne sonu pozlama inişi 16-bit ara değerle + dither (tarayıcıda 8-bit yuvarlama basamağı yerine).
//   Sahne FX_EXPO_POST=1 ile pozlamasız render edilir; bu araç manifest S.expoPost = { t0, dur } (sayfa-yerel s) eğrisini (sio, sahnedeki sio ile aynı)
//   kare başı kayan noktada uygular: v' = v · g + TPDF dither (±1 LSB, genlik min(1, 4g) → son karede 0) → 8-bit. Son kare tam 0 (g = 0).
//   + S.expoPost.dip = { t0, r, t1, d } (sayfa-yerel s): kazanç 1 − d · sio((T − t0)/r) · (1 − sio((T − t1)/r)) — sahne içi pozlama düşüşü;
//   dither DURUK dikdörtgen ±0.5 LSB (kareden kareye aynı desen → zamansal gürültü yok; beklenen değer tam v·g → sapmasız; g = 1'de hiçbir piksel değişmez → açılış/kapanış
//   basamaksız; her piksel kendi eşiğinde tek basamak atar). Genliği rampalanan TPDF küçük düşüşte yuvarlamayı "değişmez"e çekiyordu. İniş (t0/dur) kareleri eskisi gibi.
//   motion-render expo-post <id> [--dir out/frames/<id>] [--step N] [--dry]
//   İşlenen kareler out/logs/<klasör>-expo-post.json'da kayıtlı (aynı kare iki kez karartılmaz; farklı kazançla ikinci kez → çıkış 3).
import fs from 'node:fs'; import path from 'node:path';
import sharp from 'sharp';
import { ROOT, FPS as FPS0, sceneById } from '../lib/project.mjs';
const args = process.argv.slice(2), id = args[0], argOf = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
if (!id || id.startsWith('--')) { console.error('kullanım: motion-render expo-post <id> [--dir out/frames/<id>] [--step N] [--dry]'); process.exit(2); }
let S = null; try { S = sceneById(id); } catch { /* aşağıda */ }
if (!S || !S.expoPost) { console.error('manifestte ' + id + ' / expoPost yok'); process.exit(1); }
const dir = path.resolve(ROOT, argOf('--dir', path.join('out', 'frames', id))), step = +argOf('--step', (S.animatic && S.animatic.step) || 1), FPS = S.fps || FPS0, N = S.frames, E = S.expoPost;
const files = fs.readdirSync(dir).filter((f) => /^\d+\.png$/.test(f)).sort(), n = files.length, logF = path.join(ROOT, 'out', 'logs', path.basename(dir) + '-expo-post.json');   // kayıt kare klasörünün dışında (QC dosya sayar)
const done = fs.existsSync(logF) ? JSON.parse(fs.readFileSync(logF, 'utf8')) : {};
const sio = (u) => { u = Math.max(0, Math.min(1, u)); return 0.5 - 0.5 * Math.cos(Math.PI * u); };
const hash = (x, y, f, s) => { let h = (x * 73856093) ^ (y * 19349663) ^ (f * 83492791) ^ (s * 2654435761); h = Math.imul(h ^ (h >>> 16), 0x45d9f3b); h = Math.imul(h ^ (h >>> 16), 0x45d9f3b); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
let proc = 0, skip = 0;
for (let k = 0; k < n; k++) {
  const fn = files[k], idx = +fn.slice(0, -4), fi = step > 1 ? (k === n - 1 ? N - 1 : idx * step) : idx, T = fi / FPS, u = (T - E.t0) / E.dur;
  const D = E.dip, dp = D ? D.d * sio((T - D.t0) / D.r) * (1 - sio((T - D.t1) / D.r)) : 0, fade = u > 0;   // sahne içi düşüş
  if (!fade && dp <= 1e-7) continue;
  const g = (fade ? 1 - sio(u) : 1) * (1 - dp);
  if (done[fn] != null) { if (Math.abs(done[fn] - g) > 1e-9) { console.error('kare ' + fn + ' başka kazançla işlenmiş (' + done[fn] + ' ≠ ' + g + ') — yeniden render gerekir'); process.exit(3); } skip++; continue; }
  if (args.includes('--dry')) { console.log(fn + ' sayfa karesi ' + fi + ' · T ' + T.toFixed(4) + ' · g ' + g.toFixed(5)); continue; }
  const p = path.join(dir, fn), { data, info } = await sharp(p).removeAlpha().raw().toBuffer({ resolveWithObject: true }), W = info.width, o = Buffer.alloc(data.length), amp = Math.min(1, 4 * g);   // düşüşte duruk dikdörtgen dither
  for (let i = 0, px = 0; i < data.length; i += 3, px++) { const x = px % W, y = (px - x) / W, d = fade ? amp * (hash(x, y, fi, 1) + hash(x, y, fi, 2) - 1) : hash(x, y, 0, 3) - 0.5;
    for (let c = 0; c < 3; c++) { const v = data[i + c] * g + d; o[i + c] = v <= 0 ? 0 : v >= 255 ? 255 : Math.round(v); } }
  await sharp(o, { raw: { width: W, height: info.height, channels: 3 } }).png().toFile(p + '.part'); fs.renameSync(p + '.part', p);
  done[fn] = g; proc++;
}
if (!args.includes('--dry')) { fs.mkdirSync(path.dirname(logF), { recursive: true }); fs.writeFileSync(logF + '.part', JSON.stringify(done)); fs.renameSync(logF + '.part', logF); }
console.log('✓ expo-post ' + id + ' · ' + dir + ' · işlenen ' + proc + ' · önceden işlenmiş ' + skip + ' · eğri sio t0 ' + E.t0 + ' s, ' + E.dur + ' s (adım ' + step + ')');
