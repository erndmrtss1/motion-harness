// lib/fc/craft.mjs — zanaat kapısı (1.3): hareket kalitesinin KUSUR ölçüleri (kota değil; RULES §8.1 ZN-1…ZN-5).
//   pop       (piksel)  tek kare belirme/kaybolma: hareketle açıklanamayan değişimin olay bölümündeki payı ≥ maxShare (PN-99 "pop")
//   onset     (piksel)  görünür başlangıç: olay çapası (a0) ↔ öğenin ilk görünür pikselleri. A/B kipi (gizleme sözleşmesi: alet gizli ↔ öğe
//                       gizli, sayfa iki kez çizilir) kesin ölçüdür; piksel kipi kare dizininden ölçer, alet örtmesi olan olayı "belirsiz" sayar (PN-99 "onset")
//   velocity  (tasarım) C1 hız sürekliliği: kamera (__camSpeed) ve nesne (__tools uçları, __boxes merkezleri); ardışık |Δv| ≤ maxJump × hamle tepesi
//   entryExit (tasarım) giriş/çıkış süresi ≥ minSec: ilk görünür kare → tam görünür (ya da giriş evresi sonu) · tam görünürden → son görünür kare
//   moves     (tasarım) hamle/shot sayısı (UYARI): kamera hızının tabanı aştığı koşular, shot başına ≤ maxPerShot, isteğe bağlı süre tabanı
// "Açıklanamayan değişim": ardışık iki karede |ΔY| ≥ tY olan bileşen, ±R pikselde en iyi kaydırmayla (ileri + geri aynı vektör) hâlâ
// tutmuyorsa yeni içeriktir (belirme) ya da kaybolan içeriktir; hareket eden nesne ve kamera kaydırmayla açıklanır. Saf fonksiyonlar test için dışa açık.
import { lumaPlane, readRaw } from '../img.mjs';
import { withPage } from '../page.mjs';
import { verdict, result, unmeasured, hookName, pickFrames, frameSource, available, r2, r3, FPS, WIDTH, HEIGHT } from './common.mjs';
import { measure } from './design.mjs';

// ── piksel çekirdeği ─────────────────────────────────────────────────────────
// değişim maskesi: |cur − prev| ≥ tY; prev2/next verilirse öncesi ve sonrası kararlı (< tS) olmalı (basamak pikseli)
export function changeMask(prev, cur, W, H, { tY = 12, tS = null, prev2 = null, next = null, keep = null } = {}) {
  const m = new Uint8Array(W * H), ts = tS != null ? tS : tY / 2;
  for (let k = 0; k < m.length; k++) {
    if (keep && !keep[k]) continue;
    if (Math.abs(cur[k] - prev[k]) < tY) continue;
    if (prev2 && Math.abs(prev[k] - prev2[k]) >= ts) continue;
    if (next && Math.abs(next[k] - cur[k]) >= ts) continue;
    m[k] = 1;
  }
  return m;
}
// kare (Chebyshev) genişletme, ayrık kayan toplamla O(n)
export function dilate(m, W, H, r) {
  if (!(r > 0)) return m;
  const a = new Uint8Array(W * H), b = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const o = y * W; let c = 0;
    for (let x = 0; x < Math.min(W, r); x++) c += m[o + x];
    for (let x = 0; x < W; x++) { if (x + r < W) c += m[o + x + r]; if (x - r - 1 >= 0) c -= m[o + x - r - 1]; a[o + x] = c > 0 ? 1 : 0; }
  }
  for (let x = 0; x < W; x++) {
    let c = 0;
    for (let y = 0; y < Math.min(H, r); y++) c += a[y * W + x];
    for (let y = 0; y < H; y++) { if (y + r < H) c += a[(y + r) * W + x]; if (y - r - 1 >= 0) c -= a[(y - r - 1) * W + x]; b[y * W + x] = c > 0 ? 1 : 0; }
  }
  return b;
}
// bağlı bileşenler: genişletilmiş maskede 4-komşu; her bileşen asıl maske piksellerini taşır ({ n, box [x0,y0,x1,y1], pix })
export function components(mask, W, H, { grow = 2, minPx = 1 } = {}) {
  const dm = dilate(mask, W, H, grow), lab = new Int32Array(W * H), out = [];
  let id = 0;
  for (let k0 = 0; k0 < dm.length; k0++) {
    if (!dm[k0] || lab[k0]) continue;
    id++; const q = [k0], pix = []; lab[k0] = id; let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let h = 0; h < q.length; h++) {
      const j = q[h], x = j % W, y = (j / W) | 0;
      if (mask[j]) { pix.push(j); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x > 0 && dm[j - 1] && !lab[j - 1]) { lab[j - 1] = id; q.push(j - 1); }
      if (x < W - 1 && dm[j + 1] && !lab[j + 1]) { lab[j + 1] = id; q.push(j + 1); }
      if (y > 0 && dm[j - W] && !lab[j - W]) { lab[j - W] = id; q.push(j - W); }
      if (y < H - 1 && dm[j + W] && !lab[j + W]) { lab[j + W] = id; q.push(j + W); }
    }
    if (pix.length >= minPx) out.push({ n: pix.length, box: [x0, y0, x1, y1], pix: Int32Array.from(pix) });
  }
  return out;
}
// hareketle açıklama: d ∈ [−R, R]² (önce 2'lik adım, sonra ±1) için ileri cur(p) ↔ prev(p − d) ve geri prev(p) ↔ cur(p + d) tutmayan
// örnek sayısı en azlanır; en iyi d'de iki yönde de tutmayan piksel "açıklanamayan"dır. Kadraj dışı başvuru tutmayan sayılır (dışarıdan gelen içerik yenidir).
export function explainShift(prev, cur, W, H, pix, { R = 12, Rmax = null, tY = 12, sample = 2500, subpixel = false } = {}) {
  const n = pix.length, st = Math.max(1, Math.floor(n / sample)), S = [];
  for (let i = 0; i < n; i += st) S.push(pix[i]);
  const fwdBad = (k, dx, dy) => { const x = (k % W) - dx, y = ((k / W) | 0) - dy; return x < 0 || y < 0 || x >= W || y >= H || Math.abs(cur[k] - prev[y * W + x]) >= tY; };
  const bwdBad = (k, dx, dy) => { const x = (k % W) + dx, y = ((k / W) | 0) + dy; return x < 0 || y < 0 || x >= W || y >= H || Math.abs(prev[k] - cur[y * W + x]) >= tY; };
  const cost = (dx, dy) => { let b = 0; for (const k of S) { if (fwdBad(k, dx, dy)) b++; if (bwdBad(k, dx, dy)) b++; } return b; };
  let best = [0, 0], bc = cost(0, 0);
  // kaba ızgara + yerel incelt; yakın arama (R) yetmezse (pay > 0,3) geniş arama (Rmax, seyrek ızgara) — hızlı kayan sayfa/geçiş
  const search = (Rs, s) => {
    for (let dy = -Rs; dy <= Rs; dy += s) for (let dx = -Rs; dx <= Rs; dx += s) { const v = cost(dx, dy); if (v < bc) { bc = v; best = [dx, dy]; } }
    for (let h = s >> 1; h >= 1; h >>= 1) { const [cx, cy] = best; for (let dy = cy - h; dy <= cy + h; dy += h) for (let dx = cx - h; dx <= cx + h; dx += h) { if (Math.abs(dx) > Rs || Math.abs(dy) > Rs) continue; const v = cost(dx, dy); if (v < bc) { bc = v; best = [dx, dy]; } } }
  };
  search(R, 2);
  if (Rmax > R && S.length && bc / (2 * S.length) > 0.3) search(Rmax, Math.max(2, Math.round(Rmax / 12)));
  // son sınıflama alt piksel toleranslı: değer, karşı karenin d kaydırmalı 3×3 komşuluğunun [min − tY/2, max + tY/2] aralığındaysa açıklanmış sayılır
  // (yüksek kontrastlı kenarın kesirli kayması tamsayı kaydırmayla tutmaz; aralık testi bunu yutar)
  const h = tY / 2, inRange = (img, v, x, y) => {
    let lo = Infinity, hi = -Infinity, any = false;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const X = x + i, Y = y + j; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const q = img[Y * W + X]; any = true; if (q < lo) lo = q; if (q > hi) hi = q; }
    return any && v >= lo - h && v <= hi + h;
  };
  const un = [], [bx, by] = best;
  for (let i = 0; i < n; i++) {
    const k = pix[i], x = k % W, y = (k / W) | 0;
    if (!fwdBad(k, bx, by) || !bwdBad(k, bx, by)) continue;
    if (subpixel && (inRange(prev, cur[k], x - bx, y - by) || inRange(cur, prev[k], x + bx, y + by))) continue;
    un.push(k);
  }
  return { d: best, share: S.length ? bc / (2 * S.length) : 0, unexplained: un };
}
// 3×3 aşındırma (kenar dışı komşu yok sayılır)
function erode(m, W, H) {
  const o = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x; if (!m[k]) continue;
    let all = 1;
    for (let j = -1; j <= 1 && all; j++) for (let i = -1; i <= 1; i++) { const X = x + i, Y = y + j; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; if (!m[Y * W + X]) { all = 0; break; } }
    o[k] = all;
  }
  return o;
}
// bir kare çifti → açıklanamayan değişim bileşenleri (kutu, piksel, kaydırma). open > 0: açıklanamayan maskeye açma (aşındır + genişlet)
// uygulanır; ölçüm pikselinde 2·open kalınlığa kadar şeritler (katman kenarının alt piksel kayması, ince çizgi) sayılmaz.
export function unexplainedComponents(prev, cur, W, H, o = {}) {
  const m = changeMask(prev, cur, W, H, o), comps = components(m, W, H, { grow: o.grow != null ? o.grow : 2, minPx: o.minComp || 1 }), raw = [];
  for (const c of comps) { const e = explainShift(prev, cur, W, H, c.pix, o); if (e.unexplained.length) raw.push({ changed: c.n, d: e.d, pix: e.unexplained }); }
  let keep = null;
  if (o.open > 0 && raw.length) {
    let u = new Uint8Array(W * H); for (const r of raw) for (const k of r.pix) u[k] = 1;
    let e = u; for (let i = 0; i < o.open; i++) e = erode(e, W, H);
    keep = dilate(e, W, H, o.open);
  }
  const out = [];
  for (const r of raw) {
    const pix = keep ? r.pix.filter((k) => keep[k]) : r.pix; if (!pix.length) continue;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (const k of pix) { const x = k % W, y = (k / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    let dsum = 0; for (const k of pix) dsum += cur[k] - prev[k];   // yön: + açılan (koyu içerik gitti / açık içerik geldi), − koyulaşan
    out.push({ n: pix.length, changed: r.changed, box: [x0, y0, x1, y1], d: r.d, sgn: Math.sign(dsum), pix });
  }
  return out;
}

// olay bölümü payı: kare f'deki bileşenin kutusunda, f'yi içeren kesintisiz değişim bölümündeki (boşluk ≤ gap) toplam açıklanamayan piksele oranı
// sgn verilirse bölüme yalnız aynı yönlü (aynı işaretli ortalama ΔY) bileşenler katılır: kaybolan yazının üstünden hemen geçen sayfa ayrı olaydır
export function episodeShare(grid, f, box, { gap = 1, eps = 1, cut = new Set(), first = 0, last = Infinity, sgn = null, margin = 0 } = {}) {
  // bölüm kutusu üyeleriyle büyür (zincirleme): soldan sağa silinen öğenin şeritleri tek bölümdür; kendi kutusundaki pay ise sabit kutuyla ölçülür
  const hit = (c, B) => (sgn == null || c.sgn === sgn) && c.box[0] <= B[2] && c.box[2] >= B[0] && c.box[1] <= B[3] && c.box[3] >= B[1];
  const inBox = (g, B) => { const G = grid.get(g); let s = 0, u = null; if (!G) return { s, u };
    for (const c of G) if (hit(c, B)) { s += c.n; u = u ? [Math.min(u[0], c.box[0]), Math.min(u[1], c.box[1]), Math.max(u[2], c.box[2]), Math.max(u[3], c.box[3])] : c.box.slice(); } return { s, u }; };
  const grow = (U, u) => (u ? [Math.min(U[0], u[0] - margin), Math.min(U[1], u[1] - margin), Math.max(U[2], u[2] + margin), Math.max(U[3], u[3] + margin)] : U);
  const self = inBox(f, box).s; let sum = self, g0 = f, g1 = f;
  for (const dir of [-1, 1]) {
    let g = f, miss = 0, U = box.slice();
    for (;;) {
      g += dir;
      if (g < first || g > last || cut.has(g) || !grid.has(g)) break;
      const v = inBox(g, U);
      if (v.s >= eps) { sum += v.s; miss = 0; U = grow(U, v.u); if (dir < 0) g0 = g; else g1 = g; } else if (++miss > gap) break;
    }
  }
  return { self, sum, share: sum ? self / sum : 0, episode: [g0, g1] };
}

// ── tasarım çekirdeği ────────────────────────────────────────────────────────
// C1: hız (vektör ya da skaler) dizisinde hamle (hız > floor koşusu) başına tepe; ardışık |Δv| > max(minDv, maxJump × tepe) → sıçrama.
// samples: [{ f, v: [vx, vy] | s }] — f ardışık değilse dizi orada bölünür (shot sınırı, görünmez kare).
export function c1Scan(samples, { maxJump = 0.05, floor = 0.05, minDv = 0.05 } = {}) {
  const segs = []; let cur = [];
  for (const s of samples) { if (cur.length && s.f !== cur[cur.length - 1].f + 1) { segs.push(cur); cur = []; } cur.push(s); }
  if (cur.length) segs.push(cur);
  const vec = (s) => (Array.isArray(s.v) ? s.v : [s.s != null ? s.s : s.v, 0]), sp = (s) => Math.hypot(...vec(s));
  const moves = [], viol = [];
  for (const seg of segs) {
    let i = 0;
    while (i < seg.length) {
      if (sp(seg[i]) <= floor) { i++; continue; }
      let j = i; while (j + 1 < seg.length && sp(seg[j + 1]) > floor) j++;
      let peak = 0, pf = seg[i].f; for (let k = i; k <= j; k++) if (sp(seg[k]) > peak) { peak = sp(seg[k]); pf = seg[k].f; }
      const lim = Math.max(minDv, maxJump * peak), mv = { f0: seg[i].f, f1: seg[j].f, peak: r3(peak), peakAt: pf, maxDv: 0, maxDvAt: null };
      for (let k = Math.max(1, i); k <= Math.min(seg.length - 1, j + 1); k++) {
        const a = vec(seg[k - 1]), b = vec(seg[k]), dv = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (dv > mv.maxDv) { mv.maxDv = r3(dv); mv.maxDvAt = seg[k].f; }
        if (dv > lim) viol.push({ f: seg[k].f, dv: r3(dv), peak: r3(peak), share: r3(dv / Math.max(1e-9, peak)), max: r3(lim), dSpeed: r3(sp(seg[k]) - sp(seg[k - 1])) });
      }
      mv.share = r3(mv.maxDv / Math.max(1e-9, peak));
      moves.push(mv); i = j + 1;
    }
  }
  return { moves, viol };
}
// giriş/çıkış: iz satırları [f, x, y, kadraj (0 dışarıda | 1 kısmen | 2 tam içeride), vis 0..1, evre]; görünür = kadraj > 0 ve vis > 0.
// giriş = koşunun ilk görünür karesi → tam görünür (kadraj 2 ve vis ≥ 1) ilk kare; evre adları verilirse ve koşu giriş evresiyle başlıyorsa giriş evresinin sonu.
// çıkış simetrik. Koşu ölçüm aralığının ilk karesinde başlıyorsa giriş, son karesinde bitiyorsa çıkış ölçülmez (zaten görünür / hâlâ görünür).
export function entryExitScan(rows, { fps, minSec = 0.4, inPhases = [], outPhases = [], first = 0, last = Infinity, step = 1 } = {}) {
  const vis = (r) => r[3] > 0 && r[4] > 0, full = (r) => r[3] === 2 && r[4] >= 0.999;
  const ph = (r, L) => r[5] != null && L.some((p) => String(r[5]).split(/[\s/]+/).includes(p));
  const runs = []; let cur = null;
  for (const r of rows) {
    if (vis(r) && cur && r[0] === cur[cur.length - 1][0] + step) cur.push(r);
    else if (vis(r)) { if (cur) runs.push(cur); cur = [r]; }
    else if (cur) { runs.push(cur); cur = null; }
  }
  if (cur) runs.push(cur);
  const dur = (a, b) => r3((b - a) / fps), out = [], viol = [];
  for (const run of runs) {
    const s = run[0][0], e = run[run.length - 1][0], o = { f0: s, f1: e };
    if (s > first) {
      let k;
      if (inPhases.length && ph(run[0], inPhases)) { k = 0; while (k + 1 < run.length && ph(run[k + 1], inPhases)) k++; o.entry = dur(s, run[k][0] + step); o.entryBy = 'evre'; }
      else { k = run.findIndex(full); if (k >= 0) { o.entry = dur(s, run[k][0]); o.entryBy = 'görünürlük'; } }
      if (o.entry != null && o.entry < minSec) viol.push({ f: s, rule: 'giriş', sec: o.entry, min: minSec, by: o.entryBy });
    }
    if (e < last) {
      let k;
      if (outPhases.length && ph(run[run.length - 1], outPhases)) { k = run.length - 1; while (k > 0 && ph(run[k - 1], outPhases)) k--; o.exit = dur(run[k][0], e + step); o.exitBy = 'evre'; }
      else { k = -1; for (let i = run.length - 1; i >= 0; i--) if (full(run[i])) { k = i; break; } if (k >= 0) { o.exit = dur(run[k][0], e); o.exitBy = 'görünürlük'; } }
      if (o.exit != null && o.exit < minSec) viol.push({ f: e, rule: 'çıkış', sec: o.exit, min: minSec, by: o.exitBy });
    }
    out.push(o);
  }
  return { runs: out, viol };
}
// hamleler: shot içinde hız ≥ floor koşuları (aradaki < merge kare boşluk birleşir, < minRun kare koşu sayılmaz)
export function movesOf(v, shots, { floor, merge = 0, minRun = 1, fps = 60 } = {}) {
  return shots.map(([name, a, b]) => {
    const runs = []; let r0 = null;
    for (let f = a; f <= Math.min(b, v.length - 1) + 1; f++) {
      const on = f <= Math.min(b, v.length - 1) && v[f] >= floor;
      if (on && r0 == null) r0 = f;
      if (!on && r0 != null) { runs.push([r0, f - 1]); r0 = null; }
    }
    const m = [];
    for (const r of runs) { const l = m[m.length - 1]; if (l && r[0] - l[1] - 1 < merge) l[1] = r[1]; else m.push(r.slice()); }
    const moves = m.filter((r) => r[1] - r[0] + 1 >= minRun).map(([f0, f1]) => ({ f0, f1, sec: r3((f1 - f0 + 1) / fps), peak: r2(Math.max(...v.slice(f0, f1 + 1))) }));
    return { shot: name, frames: [a, b], moves };
  });
}

// ── yardımcılar ──────────────────────────────────────────────────────────────
const box1080 = (b, W, H) => [Math.round((b[0] * WIDTH) / W), Math.round((b[1] * HEIGHT) / H), Math.round(((b[2] + 1) * WIDTH) / W) - 1, Math.round(((b[3] + 1) * HEIGHT) / H) - 1];
const px1080 = (n, W, H) => Math.round((n * WIDTH * HEIGHT) / (W * H));
const toScale = (v, W) => (v * W) / WIDTH;   // 1080p px → ölçüm pikseli
async function lumaOf(src, f, scale) { const img = await src.read(f, scale); return { Y: lumaPlane(img), W: img.W, H: img.H }; }
function luminanceReader(src, scale) {
  const cache = new Map();
  return async (f) => { if (!cache.has(f)) { if (cache.size > 6) cache.delete(cache.keys().next().value); cache.set(f, src.has(f) ? lumaOf(src, f, scale) : Promise.resolve(null)); } return cache.get(f); };
}

// ── pop ──────────────────────────────────────────────────────────────────────
// muaf pencereler (exclude): [[a, b], …] kare (ölçülen dizinin numarasıyla) · kanca "$__<ad>": [[ad, f0, f1]] (shot → sınır kareleri ± excludePad)
// ya da [{t, son} | {t, dur} | {t0, t1}] (saniye → pencere). Tasarlanmış geçiş/kesme tek kare ölçüsü dışıdır (GÇ kurallarıyla ölçülür).
const excludeHook = (c) => [].concat(c.exclude || []).some((x) => typeof x === 'string' && x.startsWith('$__'));
async function popPrefetch(c, ctx, api) {
  const out = {};
  for (const x of [].concat(c.exclude || [])) {
    const h = hookName(x); if (!h) continue;
    const o = await measure(api, { kind: 'call', fn: h, args: [api.fps, '$N'] });
    out[h] = o.missing ? { missing: true } : o.value;
  }
  return out;
}
export function excludeFrames(spec, data, { fps, sceneFps, step = 1, pad = 1 } = {}) {
  const set = new Set(), add = (a, b) => { for (let f = Math.max(0, Math.floor(a)); f <= Math.ceil(b); f++) set.add(f); }, missing = [];
  for (const x of [].concat(spec || [])) {
    if (Array.isArray(x) && x.length === 2 && x.every(Number.isFinite)) { add(x[0], x[1]); continue; }
    const h = hookName(x); if (!h) continue;
    const v = data && data[h]; if (!v || v.missing) { missing.push(h); continue; }
    for (const e of v) {
      if (Array.isArray(e)) { if (+e[1] > 0) add(+e[1] / step - pad, +e[1] / step + pad); continue; }   // shot: başlangıç sınırı
      const a = e.t0 != null ? +e.t0 : +e.t, b = e.t1 != null ? +e.t1 : e.son != null ? +e.son : e.dur != null ? +e.t + +e.dur : +e.t;
      if (Number.isFinite(a) && Number.isFinite(b)) add(a * fps - pad, b * fps + pad);
    }
  }
  return { set, missing };
}
async function pop(c, ctx, data) {
  const src = frameSource(c, ctx); if (src.missing) return unmeasured(c, src.missing);
  const ex = excludeFrames(c.exclude, data, { fps: FPS, step: ctx.step || 1, pad: c.excludePad != null ? c.excludePad : 0 });
  if (ex.missing.length) return unmeasured(c, 'kanca yok (' + ex.missing.join(', ') + ')');
  const fr = pickFrames(c, ctx.frames, ctx), { have, missing } = available(src, fr);
  if (have.length < 2) return unmeasured(c, 'ardışık kare yok' + (missing.length ? ' · eksik ' + missing.length : ''));
  // pay eşiği film karesi içindir. --step N (N ≥ 2) animatikte bir kare N film karesini kapsar: film karesinde ≥ p olan pop animatikte ≥ p,
  // p altı kademeli olay ise ≤ N·p payı verir; ikisinin ortası p + (1 − p)/2 kullanılır (p 0,5 → 0,75)
  const step = ctx.step || 1, scale = c.scale || 'fast', tY = c.tY != null ? c.tY : 12, maxShare0 = c.maxShare != null ? c.maxShare : 0.5, maxShare = step > 1 ? maxShare0 + (1 - maxShare0) / 2 : maxShare0;
  const cutShare = c.cutShare != null ? c.cutShare : 0.25, boxShare = c.maxBoxShare != null ? c.maxBoxShare : 0.4;
  const gap = c.gap != null ? c.gap : Math.max(1, Math.round(0.05 * FPS)), declaredCuts = new Set((c.cuts || []).map(Number)), Yof = luminanceReader(src, scale);
  const grid = new Map(), cuts = new Set(), cand = [], wide = [];
  let W = 0, H = 0, minPx = 0, margin = 0, R = 0, Rmax = 0, grow = 0, thin = 0;
  for (const f of have) {
    const cur = await Yof(f), prev = await Yof(f - 1); if (!cur || !prev) continue;
    if (!W) {
      W = cur.W; H = cur.H; minPx = Math.max(2, ((c.minPx != null ? c.minPx : 900) * W * H) / (WIDTH * HEIGHT));
      margin = Math.max(2, Math.round(toScale(c.margin != null ? c.margin : 24, W))); R = Math.max(2, Math.round(toScale(c.search != null ? c.search : 48, W))); grow = Math.max(1, Math.round(toScale(c.grow != null ? c.grow : 12, W)));
      // geniş arama yalnız açıkça istenirse (searchMax): uzak kaydırma kaybolan koyu içeriği rastgele eşleşmeyle "açıklayabilir"
      Rmax = c.searchMax != null ? Math.max(R, Math.round(toScale(c.searchMax, W) * step)) : R;
    }
    const p2 = c.stable === false ? null : await Yof(f - 2), nx = c.stable === false ? null : await Yof(f + 1);
    const comps = unexplainedComponents(prev.Y, cur.Y, W, H, { tY, prev2: p2 && p2.Y, next: nx && nx.Y, grow, R, Rmax, minComp: Math.max(1, Math.round(minPx / 4)), open: c.open || 0, subpixel: !!c.subpixel })
      .map((x) => ({ n: x.n, box: x.box, d: x.d, sgn: x.sgn }));
    grid.set(f, comps);
    const tot = comps.reduce((s, x) => s + x.n, 0);
    // geçiş/kesme: karenin büyük kısmı açıklanamıyor (ölçek, sayfa çevirme, kesme) ya da muaf pencere → tek kare ölçüsü dışı, ayrı listelenir
    if (declaredCuts.has(f) || ex.set.has(f) || tot >= cutShare * W * H) { cuts.add(f); continue; }
    for (const x of comps) {
      if (x.n < minPx) continue;
      if ((x.box[2] - x.box[0] + 1) * (x.box[3] - x.box[1] + 1) >= boxShare * W * H) { wide.push(f); continue; }
      // ince şerit (katman kenarının alt piksel kayması, kesit kenarı): ortalama kalınlık = alan / uzun kenar < minThick px@1080 → aday değil
      if ((x.n / Math.max(x.box[2] - x.box[0] + 1, x.box[3] - x.box[1] + 1)) * (WIDTH / W) < (c.minThick != null ? c.minThick : 6)) { thin++; continue; }
      cand.push({ f, ...x });
    }
  }
  if (!W) return unmeasured(c, 'ardışık kare çifti yok');
  const viol = [], top = [];
  for (const x of cand) {
    const B = [x.box[0] - margin, x.box[1] - margin, x.box[2] + margin, x.box[3] + margin];
    const ep = episodeShare(grid, x.f, B, { gap, eps: Math.max(1, minPx / 4), cut: cuts, first: have[0], last: have[have.length - 1], sgn: c.polarity === false ? null : x.sgn, margin });
    const row = { f: x.f, T: r3(x.f / FPS), box: box1080(x.box, W, H), px: px1080(ep.self, W, H), share: r3(ep.share), episode: ep.episode, episodeSec: r3((ep.episode[1] - ep.episode[0] + 1) / FPS), d: x.d };
    top.push(row);
    if (ep.share >= maxShare) viol.push(Object.assign({ rule: 'tek kare' }, row));
  }
  // aynı bölümdeki yinelenen adaylar tek ihlal (en yüksek pay)
  const seen = new Map();
  for (const v of viol) { const k = v.episode.join('-') + '@' + v.box.map((q) => Math.round(q / 120)).join(','); if (!seen.has(k) || seen.get(k).share < v.share) seen.set(k, v); }
  const V = [...seen.values()].sort((a, b) => a.f - b.f);
  top.sort((a, b) => b.share - a.share || b.px - a.px);
  return verdict(c, ctx, 'tek kare belir/kaybol ' + V.length + (V.length ? ' (' + V.slice(0, 4).map((v) => 'f' + v.f + ' %' + Math.round(v.share * 100)).join(', ') + ')' : '') + ' · aday ' + cand.length + ' · geçiş/kesme ' + (cuts.size + new Set(wide).size) + ' kare · eşik pay ≥ ' + maxShare,
    { scale, tY, maxShare, maxShareFilm: maxShare0, step, minPx: c.minPx != null ? c.minPx : 900, gap, frames: have.length, excluded: ex.set.size, cuts: [...cuts].filter((f) => !ex.set.has(f)), wide: [...new Set(wide)], thin,
      candidates: cand.length, top: top.slice(0, 12), missing: missing.length || undefined }, V);
}

// görünür yeni içerik (onset): bölgede tek bir kaydırma (kamera) SAD ile kestirilir; |cur(p) − prev(p − d)| ≥ tY ve değer prev'in
// d kaydırmalı 3×3 komşuluk aralığının (± tY/2) dışındaysa p yeni içeriktir. Bileşen başına arama yok: ince yeni çizgi komşu koyu
// nesneye kaydırılarak "açıklanmasın" diye (pop'un yerel aramasından farkı).
export function newContent(prev, cur, W, H, keep, { tY = 40, R = 6 } = {}) {
  const idx = []; for (let k = 0; k < keep.length; k++) if (keep[k]) idx.push(k);
  if (!idx.length) return { n: 0, d: [0, 0], pix: [] };
  const st = Math.max(1, Math.floor(idx.length / 4000));
  const sad = (dx, dy) => { let s = 0; for (let i = 0; i < idx.length; i += st) { const k = idx[i], x = (k % W) - dx, y = ((k / W) | 0) - dy; s += x < 0 || y < 0 || x >= W || y >= H ? 255 : Math.abs(cur[k] - prev[y * W + x]); } return s; };
  let d = [0, 0], best = sad(0, 0);
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { if (!dx && !dy) continue; const v = sad(dx, dy); if (v < best) { best = v; d = [dx, dy]; } }
  const h = tY / 2, pix = [];
  for (const k of idx) {
    const x = (k % W) - d[0], y = ((k / W) | 0) - d[1];
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const v = cur[k]; if (Math.abs(v - prev[y * W + x]) < tY) continue;
    let lo = Infinity, hi = -Infinity;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const X = x + i, Y = y + j; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const q = prev[Y * W + X]; if (q < lo) lo = q; if (q > hi) hi = q; }
    if (v >= lo - h && v <= hi + h) continue;
    pix.push(k);
  }
  return { n: pix.length, d, pix };
}

// ── onset ────────────────────────────────────────────────────────────────────
// çokgen maskesi (1080p noktalar → ölçüm pikseli; çift-tek kuralı) + pad kadar genişletme
export function polyMask(polys, W, H, pad = 0) {
  if (!polys || !polys.length) return null;
  const m = new Uint8Array(W * H), sx = W / WIDTH, sy = H / HEIGHT;
  for (const P0 of polys) {
    if (!P0 || P0.length < 2) continue;
    const P = P0.map((q) => [q[0] * sx, q[1] * sy]);
    const x0 = Math.max(0, Math.floor(Math.min(...P.map((q) => q[0])))), x1 = Math.min(W - 1, Math.ceil(Math.max(...P.map((q) => q[0]))));
    const y0 = Math.max(0, Math.floor(Math.min(...P.map((q) => q[1])))), y1 = Math.min(H - 1, Math.ceil(Math.max(...P.map((q) => q[1]))));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5; let inside = false;
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > py) !== (b[1] > py) && px < ((b[0] - a[0]) * (py - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside; }
      if (inside) m[y * W + x] = 1;
    }
  }
  return pad > 0 ? dilate(m, W, H, pad) : m;
}
const isRef = (v) => typeof v === 'string' && /^(tool|box|kind|glyphs):/.test(v);
const isAB = (c) => c.hide != null || c.mode === 'ab';
const needsPage = (c) => isAB(c) || c.events == null || typeof c.events === 'string' || (c.mask || []).length > 0 || (Array.isArray(c.events) && c.events.some((e) => isRef(e.region)));
function eventWindow(e, c, N, fps = FPS) {
  const anchor = e.at != null ? +e.at : e.t != null ? +e.t : e.f != null ? +e.f / fps : null;
  if (anchor == null) return null;
  const ab = isAB(c), pre = c.pre != null ? c.pre : ab ? 0.1 : 0.5, post = c.post != null ? c.post : ab ? 0.5 : 1.0;
  return { anchor, g0: Math.max(1, Math.floor((anchor - pre) * fps)), g1: Math.min(N - 1, Math.ceil((anchor + post) * fps)) };
}
// birikimli görünürlük: kare başı "yeni" piksel kümesi biriktirilir; ≥ minPx piksel VE uzanım (dış kutunun uzun kenarı, px@1080) ≥ minExtent
// s = ölçüm pikseli / 1080p pikseli (tam kare ölçümde W/1920; 1080p kırpımda 1)
function accumulator(W, H, s = W / WIDTH) {
  const acc = new Uint8Array(W * H); let n = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  return {
    add(pix) { for (const k of pix) if (!acc[k]) { acc[k] = 1; n++; const x = k % W, y = (k / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } },
    get px() { return Math.round(n / (s * s)); },
    get ext() { return n ? Math.max(x1 - x0 + 1, y1 - y0 + 1) / s : 0; },
  };
}
// A/B kipi (gizleme anahtarı sözleşmesi, PN-99): A = sayfa c.base globalleriyle (ör. alet katmanı gizli), B = A + c.hide globaline olayın
// hide değeri (öğe çizilmez). Pencerenin her sahne karesi iki sayfadan çizilir; bölgede |Y_A − Y_B| ≥ tY pikselleri birikir → görünür başlangıç.
// Kare dizini gerekmez (tam çözünürlük, sahne fps'i); alet örtmesi sorunu yoktur (alet iki tarafta da gizli).
async function onsetAB(c, ctx, events) {
  const fps = FPS * (ctx.step || 1), tY = c.tY != null ? c.tY : 40, pad = c.regionPad != null ? c.regionPad : 12;
  const base = Object.assign({}, ctx.globals || {}, c.base || {}), plan = [], rows = [];
  for (const e of events) {
    const name = e.name || e.id || e.word || e.ev || 'olay', w = eventWindow(e, c, Math.round(ctx.frames * (ctx.step || 1)), fps);
    const region = Array.isArray(e.region) ? e.region : e.region === 'full' ? [0, 0, WIDTH, HEIGHT] : null, hide = e.hide != null ? e.hide : e.ev || e.id || e.name;
    if (e.skip || !w || !region || hide == null) { rows.push({ name, skip: e.skip || (!w ? 'çapa yok' : !region ? 'bölge yok' : 'hide yok'), boxes: e.names ? e.names.slice(0, 60) : undefined }); continue; }
    const box = [Math.max(0, Math.floor(region[0] - pad)), Math.max(0, Math.floor(region[1] - pad)), Math.min(WIDTH - 1, Math.ceil(region[0] + region[2] + pad)), Math.min(HEIGHT - 1, Math.ceil(region[1] + region[3] + pad))];
    plan.push({ name, w, box, hide, A: new Map() });
  }
  const crop = async (png, b) => { const img = await readRaw(png, null), Y = lumaPlane(img), w = b[2] - b[0] + 1, h = b[3] - b[1] + 1, o = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o[y * w + x] = Y[(b[1] + y) * img.W + b[0] + x]; return o; };
  if (plan.length) {
    await withPage(ctx.scene, { globals: base, browser: ctx.browser }, async (p, A) => { for (const ev of plan) for (let f = ev.w.g0; f <= ev.w.g1; f++) ev.A.set(f, await crop(await A.shot(f), ev.box)); });
    for (const ev of plan) {
      await withPage(ctx.scene, { globals: Object.assign({}, base, { [c.hide]: ev.hide }), browser: ctx.browser }, async (p, B) => {
        const bw = ev.box[2] - ev.box[0] + 1, bh = ev.box[3] - ev.box[1] + 1, acc = accumulator(bw, bh, 1);   // kırpım 1080p pikseli
        let found = null, first = null;
        for (let f = ev.w.g0; f <= ev.w.g1 && !found; f++) {
          const Yb = await crop(await B.shot(f), ev.box), Ya = ev.A.get(f), pix = [];
          for (let k = 0; k < Ya.length; k++) if (Math.abs(Ya[k] - Yb[k]) >= tY) pix.push(k);
          if (pix.length && first == null) first = f;
          acc.add(pix);
          if (acc.px >= (c.minPx != null ? c.minPx : 12) && acc.ext >= (c.minExtent != null ? c.minExtent : 0)) found = { f, px: acc.px, ext: Math.round(acc.ext) };
        }
        rows.push(found ? { name: ev.name, anchor: r3(ev.w.anchor), onset: found.f, onsetT: r3(found.f / fps), dFrames: r2(found.f - ev.w.anchor * fps), px: found.px, extent: found.ext, firstDiff: first }
          : { name: ev.name, anchor: r3(ev.w.anchor), window: [ev.w.g0, ev.w.g1], none: true, firstDiff: first });
      });
    }
  }
  return rows;
}
async function onsetPrefetch(c, ctx, api) {
  let events = Array.isArray(c.events) ? c.events : null;
  if (!events) {
    const o = await measure(api, { kind: 'call', fn: hookName(c.events) || '__events', args: [] });
    if (o.missing) return { missing: o.missing };
    events = (o.value || []).filter((e) => !c.kinds || c.kinds.includes(e.kind));
  }
  const refs = new Set(c.mask || []), out = [];
  events.forEach((e) => { if (isRef(e.region)) refs.add(e.region); (e.mask || []).forEach((m) => refs.add(m)); });
  for (const e of events) {
    const w = eventWindow(e, c, ctx.frames); if (!w) { out.push(Object.assign({}, e, { skip: 'çapa yok' })); continue; }
    const ownRefs = [...new Set([...(c.mask || []), ...(e.mask || [])])], Ts = [];
    for (let g = w.g0 - 1; g <= w.g1; g++) Ts.push(g / FPS);
    const regT = (e.regionAt != null ? +e.regionAt : w.anchor + (c.regionAt != null ? c.regionAt : c.post != null ? c.post : 1.0));
    const allRefs = [...ownRefs, ...(isRef(e.region) ? [e.region] : [])];
    let masks = {}, region = e.region, names, regions;
    const dyn = isRef(e.region) && (e.regionMode || c.regionMode || 'dynamic') === 'dynamic';
    if (allRefs.length) {
      const sh = await measure(api, { kind: 'shapes', refs: allRefs, Ts: Ts.concat([regT]), names: isRef(e.region) });
      if (sh.missing || sh.error) return { missing: sh.missing || sh.error };
      Ts.forEach((T, i) => { masks[Math.round(T * FPS)] = ownRefs.flatMap((r) => (sh.at[i][r] || []).map((s) => s.poly)); });
      // dinamik bölge: her karede öğenin o ana dek çizilmiş kendi çokgenleri (kod "çizildi" der; piksel görünür mü?)
      if (dyn) { regions = {}; Ts.forEach((T, i) => { regions[Math.round(T * FPS)] = (sh.at[i][e.region] || []).map((s) => s.poly); }); }
      if (isRef(e.region)) {
        const L = (sh.at[Ts.length][e.region] || []).map((s) => s.box);
        region = L.length ? [Math.min(...L.map((b) => b[0])), Math.min(...L.map((b) => b[1])), Math.max(...L.map((b) => b[2])), Math.max(...L.map((b) => b[3]))] : null;
        if (region) region = [region[0], region[1], region[2] - region[0], region[3] - region[1]]; else names = sh.at[Ts.length].$names;
      }
    }
    out.push(Object.assign({}, e, { region, masks, names, regions }));
  }
  if (isAB(c)) {
    if (!c.hide) return { missing: 'hide (B sayfası için gizleme global adı)' };
    try { return { ab: await onsetAB(c, ctx, out) }; } catch (e) { return { missing: 'A/B çizimi: ' + e.message.split('\n')[0] }; }
  }
  return { events: out };
}
// piksel kipinde alet çokgeni bölgeye değiyorsa (maskShare ≥ maskWarn) satır "belirsiz"dir: alet çizgiyi örtüp görünür başlangıcı geciktirebilir.
// Belirsiz ihlaller hata değil UYARI üretir ("A/B ile ölç"); kesin ölçü A/B kipidir (alet iki tarafta da gizli).
function onsetResult(c, ctx, rows, fps0, tol, meta) {
  const viol = [], maskWarn = c.maskWarn != null ? c.maskWarn : 0.05;
  for (const r of rows) {
    const unsure = meta.mode === 'piksel' && r.maskShare != null && r.maskShare >= maskWarn ? { uncertain: 'alet örtmesi %' + Math.round(r.maskShare * 100) + ' — A/B ile ölç' } : {};
    if (r.none) viol.push(Object.assign({ T: r.anchor, rule: 'görünür başlangıç yok', name: r.name, window: r.window }, unsure));
    else if (r.dFrames != null && (r.dFrames > tol[1] + 1e-6 || r.dFrames < -tol[0] - 1e-6)) viol.push(Object.assign({ f: r.onset, T: r.onsetT, rule: r.dFrames > 0 ? 'geç' : 'erken', name: r.name, dFrames: r.dFrames, tol: [-tol[0], tol[1]] }, unsure));
  }
  const ok = rows.filter((r) => r.dFrames != null);
  if (!ok.length && !rows.some((r) => r.none)) return unmeasured(c, 'ölçülecek olay yok (' + rows.map((r) => r.name + ': ' + r.skip).slice(0, 4).join(' · ') + ')', { rows });
  const sure = viol.filter((v) => !v.uncertain), head = meta.mode + ' · ' + ok.length + ' olay · en büyük Δ ' + (ok.length ? Math.max(...ok.map((r) => Math.abs(r.dFrames))) : '—') + ' kare @' + fps0 + ' (tolerans −' + tol[0] + '/+' + tol[1] + ')'
    + (rows.length > ok.length ? ' · ölçülemedi/yok ' + (rows.length - ok.length) : '');
  const metrics = Object.assign({}, meta, { fps: fps0, maskWarn: meta.mode === 'piksel' ? maskWarn : undefined, rows });
  if (viol.length && !sure.length) return result(c, 'warn', head + ' · belirsiz ' + viol.length + ' (alet örtmesi; A/B kipiyle ölç)', metrics, viol, { uncertain: viol.length });
  return verdict(c, ctx, head + (viol.length > sure.length ? ' · belirsiz ' + (viol.length - sure.length) : ''), metrics, sure.concat(viol.filter((v) => v.uncertain)));
}
async function onset(c, ctx, data) {
  if (needsPage(c) && (!data || data.missing)) return unmeasured(c, 'kanca yok (' + ((data && data.missing) || hookName(c.events) || '__events') + ')');
  const fps0 = FPS * (ctx.step || 1), tolEarly = c.earlyFrames != null ? c.earlyFrames : 0, tY = c.tY != null ? c.tY : 40, minPx = c.minPx != null ? c.minPx : 12;
  if (data && data.ab) return onsetResult(c, ctx, data.ab, fps0, [tolEarly, c.tolFrames != null ? c.tolFrames : 1], { mode: 'A/B', tY, minPx, minExtent: c.minExtent != null ? c.minExtent : 0, hide: c.hide, base: c.base });
  const events = data && data.events ? data.events : (c.events || []);
  const src = frameSource(c, ctx); if (src.missing) return unmeasured(c, src.missing);
  const scale = c.scale || 'half', pad = c.regionPad != null ? c.regionPad : 12, mpad = c.maskPad != null ? c.maskPad : 0;
  const tolLate = (c.tolFrames != null ? c.tolFrames : 1) + ((ctx.step || 1) - 1);
  const Yof = luminanceReader(src, scale), rows = [];
  for (const e of events) {
    const name = e.name || e.id || e.word || e.ev || 'olay';
    if (e.skip) { rows.push({ name, skip: e.skip }); continue; }
    const w = eventWindow(e, c, ctx.frames);
    const region = Array.isArray(e.region) ? e.region : e.region === 'full' ? [0, 0, WIDTH, HEIGHT] : null;
    if (!w || !region) { rows.push({ name, skip: !w ? 'çapa yok' : 'bölge yok', boxes: e.names ? e.names.slice(0, 60) : undefined }); continue; }
    // görünür = pencere başından beri biriken yeni içerik ≥ minPx piksel VE uzanımı (dış kutunun uzun kenarı) ≥ minExtent px (@1080):
    // tek mürekkep noktası ya da kenar kırıntısı başlangıç sayılmaz (PN-99: |ΔY| ≥ 40/255, ≥ 12 px)
    const minExt = c.minExtent != null ? c.minExtent : 12;
    let found = null, W = 0, H = 0, peak = 0, peakAt = null, acc = null, maskShare = null;
    for (let g = w.g0; g <= w.g1 && found == null; g++) {
      const cur = await Yof(g), prev = await Yof(g - 1); if (!cur || !prev) continue;
      W = cur.W; H = cur.H;
      const sx = W / WIDTH, sy = H / HEIGHT, X0 = Math.max(0, Math.floor((region[0] - pad) * sx)), Y0 = Math.max(0, Math.floor((region[1] - pad) * sy));
      const X1 = Math.min(W - 1, Math.ceil((region[0] + region[2] + pad) * sx)), Y1 = Math.min(H - 1, Math.ceil((region[1] + region[3] + pad) * sy));
      let keep = new Uint8Array(W * H);
      if (e.regions) keep = polyMask(e.regions[g] || [], W, H, Math.max(0, Math.round(pad * sx))) || keep;
      else for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) keep[y * W + x] = 1;
      const mk = polyMask([...((e.masks || {})[g] || []), ...((e.masks || {})[g - 1] || [])], W, H, Math.max(0, Math.round(mpad * sx)));
      let inR = 0, cov = 0;
      if (mk) for (let k = 0; k < keep.length; k++) if (keep[k]) { inR++; if (mk[k]) { keep[k] = 0; cov++; } }
      const nc = newContent(prev.Y, cur.Y, W, H, keep, { tY, R: Math.max(1, Math.round(toScale(c.search != null ? c.search : 12, W))) });
      if (!acc) acc = accumulator(W, H);
      acc.add(nc.pix);
      const n = acc.px, ext = acc.ext;
      if (n > peak) { peak = n; peakAt = g; }
      const ms = inR ? r3(cov / inR) : 0;   // maske payı: bölgenin alet çokgeniyle örtülen kısmı (yüksekse başlangıç alet altında gecikmiş olabilir)
      if (g <= Math.round(w.anchor * FPS) || maskShare == null) maskShare = ms;
      if (n >= minPx && ext >= minExt) found = { g, px: n, ext: Math.round(ext), maskShare: ms };
    }
    if (!found) { rows.push({ name, anchor: r3(w.anchor), window: [w.g0, w.g1], none: true, peakPx: peak, peakAt, maskShare }); continue; }
    rows.push({ name, anchor: r3(w.anchor), onset: found.g, onsetT: r3(found.g / FPS), dFrames: r2((found.g / FPS - w.anchor) * fps0), px: found.px, extent: found.ext, maskShare: found.maskShare });
  }
  return onsetResult(c, ctx, rows, fps0, [tolEarly, tolLate], { mode: 'piksel', scale, tY, minPx, step: ctx.step || 1 });
}

// ── tasarım tipleri ───────────────────────────────────────────────────────────
async function shotsOf(c, ctx, api, N) {
  if (Array.isArray(c.shots)) return c.shots;
  const sh = await measure(api, { kind: 'call', fn: hookName(c.shots) || '__shots', args: [api.fps] });
  if (sh.missing || !Array.isArray(sh.value) || !sh.value.length) return c.shots ? null : [['tüm', 0, N - 1]];
  return sh.value;
}
async function trackOf(c, api, boxes) {
  return measure(api, { kind: 'track', tools: c.of ? c.of.includes('tools') : true, boxes, only: c.tools || null, phaseBy: c.phaseBy, step: c.step || 1, n: c.n,
    from: c.range && c.range[0], to: c.range && c.range[1] });
}

// velocity: kamera (skaler hız, shot sınırında bölünür) + araç uçları + kutu merkezleri (vektör)
async function velocity(c, ctx, api) {
  const of = c.of || ['camera', 'tools'], opt = { maxJump: c.maxJump != null ? c.maxJump : 0.05, floor: c.floor != null ? c.floor : 0.05, minDv: c.minDv != null ? c.minDv : 0.05 };
  const viol = [], series = {}, missing = [];
  if (of.includes('camera')) {
    const o = await measure(api, { kind: 'call', fn: hookName(c.speed) || '__camSpeed', args: [api.fps, c.n != null ? c.n : '$N'] });
    if (o.missing) missing.push(o.missing);
    else {
      const v = (o.value || []).map(Number), shots = await shotsOf(c, ctx, api, v.length), start = new Set((shots || []).map((s) => s[1]));
      const S = []; v.forEach((s, f) => { if (start.has(f) && f > 0) S.push({ f: -1 }); S.push({ f, s }); });
      // shot başı: dizi orada bölünür; her parçanın ilk örneği atılır (kanca shot'un ilk karesinde önceki kare olmadığından 0 verir)
      const parts = []; let cur = [];
      for (const x of S) { if (x.f === -1) { parts.push(cur); cur = []; } else cur.push(x); }
      parts.push(cur);
      const res = parts.map((p) => c1Scan(p.slice(1), opt)), moves = res.flatMap((r) => r.moves);
      res.forEach((r) => r.viol.forEach((x) => viol.push(Object.assign({ src: 'kamera' }, x))));
      series.kamera = { frames: v.length, moves: moves.length, worstShare: r3(Math.max(0, ...moves.map((m) => m.share))), moveList: moves.slice(0, 40) };
    }
  }
  const boxes = of.filter((x) => typeof x === 'string' && /^(box|kind):/.test(x));
  if (of.includes('tools') || boxes.length) {
    const t = await trackOf(c, api, boxes);
    if (t.missing || t.error) missing.push(t.missing || t.error);
    else {
      const add = (label, rows) => {
        const S = []; for (let i = 0; i < rows.length; i++) { const a = rows[i - 1], b = rows[i]; if (a && b[0] === a[0] + (t.step || 1) && (c.visibleOnly === false || (a[3] > 0 && b[3] > 0))) S.push({ f: b[0], v: [b[1] - a[1], b[2] - a[2]] }); }
        const r = c1Scan(S.map((s) => ({ f: s.f / (t.step || 1), v: s.v, F: s.f })), opt);
        r.viol.forEach((x) => viol.push(Object.assign({ src: label }, x, { f: x.f * (t.step || 1) })));
        series[label] = { moves: r.moves.length, worstShare: r3(Math.max(0, ...r.moves.map((m) => m.share))) };
      };
      for (const [n, rows] of Object.entries(t.tools || {})) add('araç ' + n, rows);
      for (const [n, rows] of Object.entries(t.boxes || {})) add('kutu ' + n, rows);
    }
  }
  if (missing.length && !Object.keys(series).length) return unmeasured(c, 'kanca yok (' + missing.join(', ') + ')');
  viol.sort((a, b) => a.f - b.f);
  const worst = Object.entries(series).map(([k, s]) => k + ' ' + s.worstShare).join(' · ');
  return verdict(c, ctx, 'C1 sıçrama ' + viol.length + ' (≤ %' + Math.round(opt.maxJump * 100) + ' tepe) · en kötü pay ' + (worst || '—') + (missing.length ? ' · kanca yok: ' + missing.join(', ') : ''),
    Object.assign({}, opt, { series }), viol);
}

// entryExit: araçlar (evre ya da uç görünürlüğü) + seçilen kutular (görünürlük, vis)
async function entryExit(c, ctx, api) {
  const boxes = c.boxes || [], t = await trackOf(Object.assign({}, c, { of: c.of || ['tools'] }), api, boxes);
  if (t.missing || t.error) return unmeasured(c, 'kanca yok (' + (t.missing || t.error) + ')');
  const ph = Object.assign({ in: ['gir', 'giris', 'giriş', 'in', 'enter'], out: ['cik', 'cikis', 'çıkış', 'out', 'exit'] }, c.phases || {});
  const opt = { fps: api.fps, minSec: c.minSec != null ? c.minSec : 0.4, inPhases: ph.in, outPhases: ph.out, first: t.from, last: t.to, step: t.step || 1 };
  const viol = [], objs = {};
  const scan = (label, rows) => { const r = entryExitScan(rows, opt); objs[label] = r.runs.slice(0, 20); r.viol.forEach((v) => viol.push(Object.assign({ obj: label }, v))); };
  for (const [n, rows] of Object.entries(t.tools || {})) scan('araç ' + n, rows);
  for (const [n, rows] of Object.entries(t.boxes || {})) scan('kutu ' + n, rows.map((r) => [r[0], r[1], r[2], r[7], r[8], r[9]]));
  if (!Object.keys(objs).length) return unmeasured(c, 'izlenecek nesne yok (araç/kutu)');
  viol.sort((a, b) => a.f - b.f);
  const all = Object.values(objs).flat(), e = all.map((o) => o.entry).filter((x) => x != null), x = all.map((o) => o.exit).filter((v) => v != null);
  return verdict(c, ctx, Object.keys(objs).length + ' nesne · giriş en kısa ' + (e.length ? Math.min(...e) + ' s' : '—') + ' · çıkış en kısa ' + (x.length ? Math.min(...x) + ' s' : '—') + ' (≥ ' + opt.minSec + ' s) · ihlal ' + viol.length,
    { minSec: opt.minSec, phases: ph, objects: objs }, viol);
}

// moves: kamera hamlesi / shot (UYARI)
async function moves(c, ctx, api) {
  const o = await measure(api, { kind: 'call', fn: hookName(c.speed) || '__camSpeed', args: [api.fps, c.n != null ? c.n : '$N'] });
  if (o.missing) return unmeasured(c, 'kanca yok (' + o.missing + ')');
  const v = (o.value || []).map(Number), shots = await shotsOf(c, ctx, api, v.length);
  if (!shots) return unmeasured(c, 'kanca yok (' + (hookName(c.shots) || '__shots') + ')');
  const fps = api.fps, k3 = (ctx.W.camera.k3 || {}).v, floor = c.floor != null ? c.floor : k3 != null ? [].concat(k3)[0] : (WIDTH * 0.02) / fps;
  const per = movesOf(v, shots, { floor, merge: Math.round((c.mergeSec != null ? c.mergeSec : 0.25) * fps), minRun: Math.max(1, Math.round((c.minRunSec != null ? c.minRunSec : 0.1) * fps)), fps });
  const maxPer = c.maxPerShot != null ? c.maxPerShot : 2, minSec = c.minSec != null ? c.minSec : null, viol = [];
  for (const s of per) {
    if (maxPer != null && s.moves.length > maxPer) viol.push({ f: s.frames[0], rule: 'hamle/shot', shot: s.shot, moves: s.moves.length, max: maxPer });
    if (minSec != null) s.moves.forEach((m) => { if (m.sec < minSec) viol.push({ f: m.f0, rule: 'hamle süresi', shot: s.shot, sec: m.sec, min: minSec }); });
  }
  return verdict(c, ctx, 'hamle/shot ' + per.map((s) => s.shot + ' ' + s.moves.length).join(' · ') + ' (≤ ' + maxPer + (minSec != null ? ', hamle ≥ ' + minSec + ' s' : '') + ') · taban ' + r2(floor) + ' px/kare',
    { floor: r3(floor), maxPerShot: maxPer, minSec, shots: per }, viol);
}

export const TYPES = {
  pop: { layer: 'pixel', page: excludeHook, prefetch: popPrefetch, run: pop },
  onset: { layer: 'pixel', page: needsPage, prefetch: onsetPrefetch, run: onset },
  velocity: { layer: 'design', page: true, run: velocity },
  entryExit: { layer: 'design', page: true, run: entryExit },
  moves: { layer: 'design', page: true, run: moves },
};
