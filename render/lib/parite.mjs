// lib/parite.mjs — kalite paritesi (PN-67, PN-50): proje kareleri ↔ kalite referansı kareleri (kütüphane world demosu ya da onaylı kareler).
// Referans = KALİTE, kimlik değil (UCUZ #11). Ölçüler kare başına + medyan; proje medyanı ↔ referans medyanı ± tol (iki yönlü ya da tek yönlü).
// Tanımlar (960×540 çalışma çözünürlüğü; px eşikleri @1080 verilip ölçeklenir):
//   ink      CIELAB L* < inkL (35) piksel payı % · inkContent: yalnız yüzey dışı grupların ink'i (yüzey = dış kutu ≥ %90 en/boy; kahraman olamaz)
//   eleman E (3×3 kutu bulanık luma) Sobel/8 ≥ edge (16) ∪ ink; 8 yerine 4-bağlı bileşen, alanı < minElem (240 px² @1080) olan atılır (lif, toz)
//   grup     E'nin grow (24 px @1080) genişletmesinin bağlı bileşenleri = görsel grup sayısı
//   içerik   genişletilmiş E (D) payı · negatif = D tümleyeninin karenin ≥ %2'si olan bölgelerinin toplam payı (+ en büyük tek bölge)
//   kahraman ink kütlesi en büyük grup; oran = kahraman dış kutu alanı / en büyük ikincil grup dış kutu alanı (ikincil yoksa null)
//   luma     Rec.709 Y' ortalaması %  ·  aksan  isteğe bağlı HSL ton aralığı [h0, h1] ve S ≥ sMin piksel payı %
import { readRaw } from './img.mjs';
import { components, dilate } from './fc/craft.mjs';

export const DEFAULTS = { w: 960, h: 540, inkL: 35, edge: 16, minElem: 240, grow: 24, negMin: 0.02, tol: 0.2, accent: null };
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const Lstar = (r, g, b) => { const Y = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); return Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y; };
function hsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1)); let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; return [h, s, l]; }

export function measureImage(img, o = {}) {
  const P = Object.assign({}, DEFAULTS, o), { data, W, H, C } = img, n = W * H, k = W / 1920, Y = new Float32Array(n), ink = new Uint8Array(n);
  let ys = 0, inkN = 0, acc = 0;
  for (let i = 0; i < n; i++) {
    const r = data[i * C], g = data[i * C + 1], b = data[i * C + 2]; Y[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b; ys += Y[i];
    if (Lstar(r, g, b) < P.inkL) { ink[i] = 1; inkN++; }
    if (P.accent) { const [h, s] = hsl(r, g, b); if (h >= P.accent[0] && h <= P.accent[1] && s >= (P.accent[2] != null ? P.accent[2] : 0.15)) acc++; }
  }
  const B = new Float32Array(n);   // 3×3 kutu bulanıklığı
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { let s = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) s += Y[(y + j) * W + x + i]; B[y * W + x] = s / 9; }
  const E = new Uint8Array(n);
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const p = (dx, dy) => B[(y + dy) * W + x + dx], gx = p(1, -1) + 2 * p(1, 0) + p(1, 1) - p(-1, -1) - 2 * p(-1, 0) - p(-1, 1), gy = p(-1, 1) + 2 * p(0, 1) + p(1, 1) - p(-1, -1) - 2 * p(0, -1) - p(1, -1);
    if (Math.hypot(gx, gy) / 8 >= P.edge || ink[y * W + x]) E[y * W + x] = 1;
  }
  const minE = Math.max(1, Math.round(P.minElem * k * k)), el = components(E, W, H, { grow: 0, minPx: minE }), Ef = new Uint8Array(n);
  for (const c of el) for (const q of c.pix) Ef[q] = 1;
  const g = Math.max(1, Math.round(P.grow * k)), groups = components(Ef, W, H, { grow: g, minPx: 1 }), D = dilate(Ef, W, H, g);
  let dN = 0; const notD = new Uint8Array(n); for (let i = 0; i < n; i++) { if (D[i]) dN++; else notD[i] = 1; }
  const neg = components(notD, W, H, { grow: 0, minPx: Math.round(P.negMin * n) });
  // yüzey grubu: dış kutusu kare eninin ya da boyunun ≥ %90'ı (çerçeve, tam en şerit, dokulu zemin bandı) — grup sayılır, kahraman/ikincil olamaz,
  // inkIcerik'e girmez (koyu zemin ink sayılmasın)
  const gi = groups.map((c) => { let m = 0; for (const q of c.pix) m += ink[q]; const bw = c.box[2] - c.box[0] + 1, bh = c.box[3] - c.box[1] + 1;
    return { inkMass: m, n: c.n, area: bw * bh, surface: bw >= 0.9 * W || bh >= 0.9 * H }; });
  const obj = gi.filter((g) => !g.surface).sort((a, b) => b.inkMass - a.inkMass || b.n - a.n), hero = obj[0], sec = obj.slice(1).sort((a, b) => b.area - a.area)[0];
  return { groups: groups.length, surfaces: gi.length - obj.length, ink: (100 * inkN) / n, inkContent: (100 * obj.reduce((s, g) => s + g.inkMass, 0)) / n, content: (100 * dN) / n,
    negative: (100 * neg.reduce((s, c) => s + c.n, 0)) / n, negativeMax: neg.length ? (100 * Math.max(...neg.map((c) => c.n))) / n : 0,
    heroRatio: hero && sec ? hero.area / Math.max(1, sec.area) : null, luma: (100 * ys) / n / 255, accent: P.accent ? (100 * acc) / n : null };
}
export async function measureFile(file, o = {}) { const P = Object.assign({}, DEFAULTS, o); return measureImage(await readRaw(file, { w: P.w, h: P.h }), P); }

const med = (a) => { const v = a.filter((x) => x != null && Number.isFinite(x)).sort((p, q) => p - q); return v.length ? v[v.length >> 1] : null; };
// parite: metrik başına medyan, sapma = (proje − ref) / ref; iki yönlü |sapma| ≤ tol, tek yönlü 'ust' (proje ≤ ref·(1+tol)) / 'alt' (≥ ref·(1−tol))
export function parity(ours, ref, { tol = 0.2, sides = {}, metrics = ['groups', 'inkContent', 'content', 'negative', 'heroRatio', 'luma', 'accent'] } = {}) {
  const rows = [];
  for (const m of metrics) {
    const a = med(ours.map((x) => x[m])), b = med(ref.map((x) => x[m]));
    if (a == null || b == null) { rows.push({ metric: m, ours: a, ref: b, skip: true }); continue; }
    const dev = b ? (a - b) / Math.abs(b) : a ? Infinity : 0, side = sides[m] || 'iki';
    const ok = side === 'ust' ? dev <= tol + 1e-9 : side === 'alt' ? dev >= -tol - 1e-9 : Math.abs(dev) <= tol + 1e-9;
    rows.push({ metric: m, ours: +a.toFixed(3), ref: +b.toFixed(3), dev: Number.isFinite(dev) ? +dev.toFixed(3) : null, side, ok });
  }
  return { tol, rows, pass: rows.filter((r) => !r.skip).every((r) => r.ok) };
}
