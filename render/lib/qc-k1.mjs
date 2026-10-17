// lib/qc-k1.mjs — K1 kahraman ölçüsü (world.k1.mask = ink | dom | alpha) + lyric display boyu.
//
//   ink   : sayfa maske kipinde (window.FX_INKMASK = MOTION_INKMASK = true) yalnız kahraman alt ağaçlarını ([data-hero]) açık zeminde çizer;
//           480×270'te luma < 200 → maske; 3×3 kapanış ×3 (harf/çizgi boşlukları); < 60 px leke atılır; kahraman = kalan maskenin
//           bütünü: delikleri doldurulmuş alan + dikey yayılım (en büyük bileşen bilgi olarak).
//   alpha : aynı maske kipi, zemin rengi serbest: maske = |luma − zemin luması| > 55 (zemin = kenar halkasının medyanı; açık zeminde
//           ink ile aynı eşik 255 − 200). Koyu zeminde açık kahraman için.
//   dom   : sayfada kahraman seçicisinin (world.k1.selector, varsayılan [data-hero]) ekran kutuları 192×108 ızgarada (10 px); alan +
//           dikey yayılım. Render gerekmez.
//   Eşik: alan ≥ areaMin YA DA yükseklik ≥ heightMin (sahne k1 > world.k1 > 0.35 / 0.55). Lyric: [data-fx=write] ekran px ≥ lyricMin (160).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ROOT, OUT, rel } from './project.mjs';
import { probe, probeEval, PROBE_DIR } from './qc-common.mjs';
import { morph3, jsHeroGrid } from './qc-img.mjs';

const W = 480, H = 270;
export const MASK_GLOBALS = ['FX_INKMASK', 'MOTION_INKMASK'];   // sayfa maske kipi bayrağı (eski ad + paket adı)

export async function maskMetrics(png, mode = 'ink') {
  const g = await sharp(png).removeAlpha().resize(W, H, { kernel: 'cubic' }).greyscale().raw().toBuffer();
  let m = new Uint8Array(W * H);
  if (mode === 'alpha') {
    const ring = []; for (let x = 0; x < W; x++) { ring.push(g[x], g[(H - 1) * W + x]); } for (let y = 1; y < H - 1; y++) { ring.push(g[y * W], g[y * W + W - 1]); }
    ring.sort((a, b) => a - b); const bg = ring[Math.floor(ring.length / 2)];
    for (let i = 0; i < W * H; i++) m[i] = Math.abs(g[i] - bg) > 55 ? 1 : 0;
  } else for (let i = 0; i < W * H; i++) m[i] = g[i] < 200 ? 1 : 0;
  const ink = m.reduce((a, b) => a + b, 0) / (W * H);
  for (let k = 0; k < 3; k++) m = morph3(m, W, H, true); for (let k = 0; k < 3; k++) m = morph3(m, W, H, false);   // kapanış (yarıçap 3)
  // bileşenler: < 60 px (480p) leke atılır; kahraman = kalan maskenin BÜTÜNÜ (çizim yığını tek nesne sayılır) — en büyük bileşen bilgi olarak
  const seen = new Int32Array(W * H), st = [], comps = []; let cid = 0;
  for (let i = 0; i < W * H; i++) { if (!m[i] || seen[i]) continue; cid++; let n = 0, y0 = H, y1 = 0; seen[i] = cid; st.push(i);
    while (st.length) { const p = st.pop(), px = p % W, py = (p - px) / W; n++; if (py < y0) y0 = py; if (py > y1) y1 = py;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = px + dx, Y = py + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const q = Y * W + X; if (m[q] && !seen[q]) { seen[q] = cid; st.push(q); } } }
    comps.push({ id: cid, n, y0, y1 }); }
  const keep = new Set(comps.filter((c) => c.n >= 60).map((c) => c.id)); if (!keep.size) return { ink: +ink.toFixed(3), area: 0, height: 0, largest: 0 };
  const big = comps.filter((c) => keep.has(c.id)).sort((x, y) => y.n - x.n)[0];
  let y0 = H, y1 = -1; comps.forEach((c) => { if (keep.has(c.id)) { y0 = Math.min(y0, c.y0); y1 = Math.max(y1, c.y1); } });
  // delik doldurma: kenardan maskeye değmeden ulaşılamayan boşluklar maskeye katılır
  const ext = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) { const x = i % W, y = (i - x) / W; if (!(x === 0 || y === 0 || x === W - 1 || y === H - 1) || ext[i] || keep.has(seen[i])) continue; ext[i] = 1; st.push(i);
    while (st.length) { const q0 = st.pop(), px = q0 % W, py = (q0 - px) / W; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = px + dx, Y = py + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const q = Y * W + X; if (!ext[q] && !keep.has(seen[q])) { ext[q] = 1; st.push(q); } } } }
  let filled = 0; for (let i = 0; i < W * H; i++) if (!ext[i]) filled++;
  return { ink: +ink.toFixed(3), area: +(filled / (W * H)).toFixed(3), height: +((y1 - y0 + 1) / H).toFixed(3), largest: +(big.n / (W * H)).toFixed(3), largestHeight: +((big.y1 - big.y0 + 1) / H).toFixed(3) };
}

// ink / alpha: maske kipinde kareleri tek probe oturumunda çek (--frame ilk, --frames kalanı), ölç
export async function maskHero(id, frames, opt = {}) {
  const D = opt.dir || path.join(PROBE_DIR, 'ink', id); fs.mkdirSync(D, { recursive: true });
  const out = path.join(D, 'k.png'), sets = MASK_GLOBALS.flatMap((g) => ['--set', g + '=true']);
  const r = probe(id, ['--frame', String(frames[0]), '--frames', frames.slice(1).join(',') || String(frames[0]), '--out', out, ...sets]);
  if (r.status !== 0) throw new Error('k1 probe: ' + ((r.stdout || '') + (r.stderr || '')).trim().split('\n').pop());
  const res = [], aMin = opt.areaMin != null ? opt.areaMin : 0.35, hMin = opt.heightMin != null ? opt.heightMin : 0.55;
  for (let i = 0; i < frames.length; i++) { const f = i === 0 ? out : out.replace(/\.png$/, '-f' + String(frames[i]).padStart(4, '0') + '.png'); if (!fs.existsSync(f)) continue;
    const mm = await maskMetrics(f, opt.mode || 'ink'); res.push(Object.assign({ f: frames[i], png: rel(f) }, mm, { ok: mm.area >= aMin || mm.height >= hMin })); }
  return res;
}

// dom: kahraman seçicisinin ekran ızgarası (192×108) — alan + dikey yayılım
export function domHero(id, frames, opt = {}) {
  const FPS = opt.fps;
  const js = '(async function(){var F=' + JSON.stringify(frames.map((f) => f / FPS)) + ',o=[];for(var i=0;i<F.length;i++){window.__seek(F[i]);await new Promise(function(r){requestAnimationFrame(function(){requestAnimationFrame(r)})});'
    + jsHeroGrid(opt.selector) + 'var hn=0;for(var q=0;q<hg.length;q++)hn+=hg[q];o.push([+(hn/hg.length).toFixed(3),+(hy1>=hy0?(hy1-hy0+1)/108:0).toFixed(3)]);}return JSON.stringify(o);})()';
  const r = probeEval(id, frames[0], js, '_k1-dom.png');
  if (!r.found) throw new Error('k1 dom: ölçülemedi (' + r.tail + ')');
  const aMin = opt.areaMin != null ? opt.areaMin : 0.35, hMin = opt.heightMin != null ? opt.heightMin : 0.55;
  return r.value.map((q, i) => ({ f: frames[i], dom: true, area: q[0], height: q[1], ok: q[0] >= aMin || q[1] >= hMin }));
}

// K1 tek giriş: k = k1For(S, W) → [{f, area, height, ok, …}]
export async function k1Measure(id, frames, k, fps) {
  if (k.mask === 'dom') return domHero(id, frames, { fps, selector: k.selector, areaMin: k.areaMin, heightMin: k.heightMin });
  if (k.mask === 'ink' || k.mask === 'alpha') return maskHero(id, frames, { mode: k.mask, areaMin: k.areaMin, heightMin: k.heightMin });
  throw new Error('k1.mask bilinmiyor: ' + k.mask + ' (ink | dom | alpha)');
}

// lyric display boyu: items [[metin, t (s)]] → ekran px (seçicideki metni tam eşleşen öğe; font × ekran ölçeği)
export function lyricSizes(id, items, frame0, opt = {}) {
  const sel = opt.selector || '[data-fx=write]', min = opt.min != null ? opt.min : 160;
  const js = '(async function(){var L=' + JSON.stringify(items) + ',o=[];for(var i=0;i<L.length;i++){window.__seek(L[i][1]);await new Promise(function(r){requestAnimationFrame(function(){requestAnimationFrame(r)})});'
    + 'var best=0;document.querySelectorAll(' + JSON.stringify(sel) + ').forEach(function(e){if((e.textContent||"").trim()!==L[i][0])return;var r=e.getBoundingClientRect();if(r.width<1)return;var sc=e.offsetHeight>0?r.height/e.offsetHeight:1;var px=parseFloat(getComputedStyle(e).fontSize)*sc;if(px>best)best=px;});o.push([L[i][0],L[i][1],+best.toFixed(1)]);}return JSON.stringify(o);})()';
  const r = probeEval(id, frame0 || 0, js, '_k1-lyric.png');
  if (!r.found) return null;
  return r.value.map((q) => ({ text: q[0], t: q[1], px: q[2], ok: q[2] >= min }));
}

export const K1_OUT = (id) => path.join(OUT, 'probe', id + '-k1.json');
export { ROOT };
