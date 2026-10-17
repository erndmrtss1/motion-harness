// lib/gen-clipscan.mjs — `motion-render ingest scan <id>`: üretken klip kabulü kare kare — 1 s aralıkla TAM ÇÖZÜNÜRLÜK kare + hareketli bölge haritası + hareket eğrisi.
//   → out/probe/clipscan/<id>/tNNN.png (kaynak çözünürlüğü) · motion.png (ardışık kare |fark| birikimi, orta kareye bindirilmiş; artefakt çoğunlukla hareketli bölgede)
//     · strip.png (1 s şerit, 5 sütun) · scan.json (saniye başına hareket, en hareketli bölge kutusu = birikimin %40 üstü)
// Kaynak: manifest files.source (özgün). Tarama gözle yapılır (yazı, el, nesne, geometri kırığı); bu araç kanıtı üretir, ardından bağımsız reviewer.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { ROOT } from './project.mjs';
import { ffmpeg as FF } from './ffmpeg.mjs';

export async function clipScan(man, id, STEP = 1) {
  const it = man.items.find((x) => x.id === id) || man.items.filter((x) => (x.sourceName || '').replace(/\.[^.]+$/, '') === id && !x.supersededBy).pop();
  if (!it) { console.error('manifestte yok: ' + id); process.exit(1); }
  if (!/\.(mp4|mov|webm|mkv)$/i.test(it.files.source || '')) { console.error('video değil: ' + it.files.source); process.exit(2); }
  const src = path.join(ROOT, it.files.source), OUT = path.join(ROOT, 'out', 'probe', 'clipscan', it.id), tmp = path.join(OUT, '_all');
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
  const r = spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-i', src, '-vf', 'scale=480:-2,format=gray', path.join(tmp, '%05d.png')], { encoding: 'utf8' });
  if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
  const files = fs.readdirSync(tmp).sort(), n = files.length, dur = it.conform.duration || n / (it.conform.srcFps || 24), fps = n / dur;
  // hareket: ardışık kare |fark| birikimi + saniye başına ortalama
  let acc = null, W = 0, H = 0, prev = null; const perSec = new Array(Math.ceil(dur)).fill(0), cnt = new Array(Math.ceil(dur)).fill(0);
  for (let i = 0; i < n; i++) { const { data, info } = await sharp(path.join(tmp, files[i])).extractChannel(0).raw().toBuffer({ resolveWithObject: true }); W = info.width; H = info.height;   // gri PNG sharp'ta 3 kanal gelir: tek kanal
    if (!acc) acc = new Float32Array(W * H);
    if (prev) { let s = 0; for (let k = 0; k < data.length; k++) { const d = Math.abs(data[k] - prev[k]); acc[k] += d; s += d; } const sec = Math.min(perSec.length - 1, Math.floor(i / fps)); perSec[sec] += s / data.length; cnt[sec]++; }
    prev = data; }
  let mx = 0; for (const v of acc) mx = Math.max(mx, v);
  let bx0 = W, by0 = H, bx1 = 0, by1 = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (acc[y * W + x] > 0.4 * mx) { bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y); }
  const times = []; for (let t = 0; t < dur - 0.02; t += STEP) times.push(+t.toFixed(2)); if (dur - times[times.length - 1] > 0.5) times.push(+(dur - 0.05).toFixed(2));
  for (const t of times) spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-ss', String(t), '-i', src, '-frames:v', '1', path.join(OUT, 't' + String(Math.round(t * 10)).padStart(3, '0') + '.png')]);
  const mid = path.join(tmp, files[Math.floor(n / 2)]), base = await sharp(mid).extractChannel(0).raw().toBuffer(), hm = Buffer.alloc(W * H * 3);
  for (let k = 0; k < W * H; k++) { const a = Math.min(1, acc[k] / (0.6 * mx)), g = base[k] * 0.55; hm[3 * k] = Math.round(g * (1 - a)); hm[3 * k + 1] = Math.round(g * (1 - a) + 200 * a); hm[3 * k + 2] = Math.round(g * (1 - a) + 230 * a); }
  const sx = 1280 / W; const hmImg = sharp(hm, { raw: { width: W, height: H, channels: 3 } }).resize(1280, Math.round(H * sx));
  const box = Buffer.from('<svg width="1280" height="' + Math.round(H * sx) + '"><rect x="' + bx0 * sx + '" y="' + by0 * sx + '" width="' + (bx1 - bx0) * sx + '" height="' + (by1 - by0) * sx + '" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="8 6"/></svg>');
  fs.writeFileSync(path.join(OUT, 'motion.png'), await hmImg.composite([{ input: box }]).png().toBuffer());
  const TW = 384, TH = 216, LB = 20, cols = 5, rows = Math.ceil(times.length / cols), comps = [];
  for (let i = 0; i < times.length; i++) { const f = path.join(OUT, 't' + String(Math.round(times[i] * 10)).padStart(3, '0') + '.png'); if (!fs.existsSync(f)) continue;
    comps.push({ input: await sharp(f).resize(TW, TH).toBuffer(), left: (i % cols) * TW, top: Math.floor(i / cols) * (TH + LB) });
    comps.push({ input: Buffer.from('<svg width="' + TW + '" height="' + LB + '"><rect width="100%" height="100%" fill="#000"/><text x="5" y="15" fill="#fc6" font-size="13" font-family="Consolas, monospace">' + times[i].toFixed(1) + ' s · hareket ' + (perSec[Math.min(perSec.length - 1, Math.floor(times[i]))] / Math.max(1, cnt[Math.min(cnt.length - 1, Math.floor(times[i]))])).toFixed(2) + '</text></svg>'), left: (i % cols) * TW, top: Math.floor(i / cols) * (TH + LB) + TH }); }
  await sharp({ create: { width: cols * TW, height: rows * (TH + LB), channels: 3, background: '#000' } }).composite(comps).png().toFile(path.join(OUT, 'strip.png'));
  fs.rmSync(tmp, { recursive: true, force: true });
  const J = { id: it.id, model: it.model, src: it.files.source, frames: n, dur: +dur.toFixed(2), fps: +fps.toFixed(2), times, motionPerSec: perSec.map((v, i) => +(v / Math.max(1, cnt[i])).toFixed(3)), motionBox: [bx0, by0, bx1, by1].map((v) => Math.round(v * (it.conform.srcW || 1280) / W)) };
  fs.writeFileSync(path.join(OUT, 'scan.json'), JSON.stringify(J, null, 1));
  console.log('✓ ' + path.relative(ROOT, OUT).split(path.sep).join('/') + ' · ' + times.length + ' tam kare · hareket/sn ' + J.motionPerSec.join(' ') + ' · hareketli bölge ' + J.motionBox.join(','));
  return J;
}
