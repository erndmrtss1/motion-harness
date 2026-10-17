// motion-render world — world yardımcıları (projenin world'ü üzerinde).
//   motion-render world <ad> bake-noise [--out assets/fx] [--force]
//       Kalem dokusu gürültüleri (feTurbulence yerine) bir kez pişirilir → <out>/<ad>.png (deterministik: sabit tohumlu LCG, 4 örnek toplamı ≈ gauss,
//       sharp bulanıklığı + normalize). Tanım: world.json bake.noise [{name, w, h, sigma, seed}] (+ bake.out); fx-lab için tanım yoksa kaynak hattın üç gürültüsü.
//       Neden (kaynak ölçümü): en ağır karede kalem dokusu açık 7.2 s, kapalı 2.7 s — feTurbulence her karede, her süzgeçli öğede yeniden hesaplanıyordu.
//       Görüntü alanı (fx-lab): kullanıcı uzayında x −1500 … 6500, y −1500 … 4500 (8000 × 6000).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { ROOT, loadWorld } from '../lib/project.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; }, has = (k) => args.includes('--' + k);
const pos = args.filter((a, i) => !a.startsWith('--') && !['--out'].includes(args[i - 1]));
const [NAME, JOB] = pos;
if (!NAME || JOB !== 'bake-noise') { console.error('kullanım: motion-render world <ad> bake-noise [--out assets/fx] [--force]'); process.exit(2); }
const W = loadWorld();
if (!W) { console.error('world yok: world/world.json (scenes.json "world")'); process.exit(1); }
if (W.name !== NAME && !has('force')) { console.error('proje world\'ü "' + W.name + '", istenen "' + NAME + '" (yine de: --force)'); process.exit(2); }
const FXLAB = [   // kaynak hattın fx-lab gürültüleri
  { name: 'noise-wob', w: 2048, h: 1536, sigma: 2.4, seed: 7 },     // ≈ 0.045 frekansı (öğe ölçeğinde ~22 px)
  { name: 'noise-press', w: 512, h: 384, sigma: 3.5, seed: 11 },    // ≈ 0.007 (geniş basınç alanları)
  { name: 'noise-tooth', w: 4096, h: 3072, sigma: 0.6, seed: 3 },   // ≈ grafit dişi (~2 px)
];
const B = W.bake || {}, SPEC = B.noise || (NAME === 'fx-lab' ? FXLAB : null);
if (!SPEC || !SPEC.length) { console.error('world.json bake.noise tanımı yok ([{name, w, h, sigma, seed}])'); process.exit(2); }
const OUT = path.resolve(ROOT, opt('out', B.out || 'assets/fx'));
fs.mkdirSync(OUT, { recursive: true });
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
async function bake({ name, w, h, sigma, seed, amp = 90 }) {   // 3 bağımsız kanal: R, G (yer değiştirme), B (yedek); 128 ortalı
  const r = rng(seed), buf = Buffer.alloc(w * h * 3);
  for (let i = 0; i < buf.length; i++) { const u = r() + r() + r() + r() - 2; buf[i] = Math.max(0, Math.min(255, Math.round(128 + u * amp))); }
  let img = sharp(buf, { raw: { width: w, height: h, channels: 3 } }); if (sigma > 0.3) img = img.blur(sigma);
  const dst = path.join(OUT, name + '.png'); await img.normalise().png({ compressionLevel: 9 }).toFile(dst + '.part.png'); fs.renameSync(dst + '.part.png', dst);
  const sha = crypto.createHash('sha256').update(fs.readFileSync(dst)).digest('hex').slice(0, 16);
  console.log('✓ ' + path.relative(ROOT, dst).split(path.sep).join('/') + ' · ' + w + '×' + h + ' · σ ' + sigma + ' · tohum ' + seed + ' · sha ' + sha);
}
for (const s of SPEC) await bake(s);
