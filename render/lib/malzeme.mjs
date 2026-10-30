// lib/malzeme.mjs — üretken plaka kabulü "plaka = malzeme" (PN-44, PN-48, PN-50): plaka yalnız MALZEME olarak ölçülür; gölge, ışık yönü, renk payı,
// kompozisyon plaka ölçütü değildir (motor ve render karesinde ölçülür). Kabul kümesi makine-okurdur (istek `accept` alanı).
//   doku    bölge içinde 64×64 (@1080) blok luma std'lerinin medyanı ≥ stdMin
//   palet   bölge medyan rengi ↔ hedef (world palet adı ya da #hex) ΔE2000 ≤ dEMax — isteğe bağlı ton eşlemesi SONRASI (önce/sonra yazılır)
//   kimlik  eşleme yapıyı korur: bölgede kanal başına en iyi doğrusal uyum artığı p95 ≤ identityMax (/255)
//   göz     yazı/el/logo/grafik 0 yalnız gözle: `goz` notu yoksa sonuç "GÖZ BEKLİYOR" (geçti sayılmaz)
// Ton eşlemesi: none | gain (kazanç, `from` bölgesinin medyanını hedefe taşıyan kanal kazancı; tam kare, ofset 0).
import { deltaE2000, rgb2lab, hex2rgb } from './img.mjs';

export const DEFAULT_ACCEPT = { stdMin: 6, dEMax: 3, identityMax: 6, block: 64, map: 'none' };
const med = (a) => { const v = a.slice().sort((p, q) => p - q); return v.length ? v[v.length >> 1] : null; };
const pct = (a, q) => { const v = a.slice().sort((p, q2) => p - q2); return v.length ? v[Math.min(v.length - 1, Math.floor((v.length - 1) * q))] : null; };

export function regionMedian(img, r) {
  const { data, W, C } = img, ch = [[], [], []];
  for (let y = r[1]; y < r[3]; y += 2) for (let x = r[0]; x < r[2]; x += 2) for (let c = 0; c < 3; c++) ch[c].push(data[(y * W + x) * C + c]);
  return ch.map(med);
}
export function blockStd(img, r, block) {
  const { data, W, C } = img, out = [];
  for (let by = r[1]; by + block <= r[3]; by += block) for (let bx = r[0]; bx + block <= r[2]; bx += block) {
    let s = 0, s2 = 0, n = 0;
    for (let y = by; y < by + block; y++) for (let x = bx; x < bx + block; x++) { const i = (y * W + x) * C, v = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]; s += v; s2 += v * v; n++; }
    out.push(Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2)));
  }
  return out.length ? med(out) : null;
}
// kanal başına doğrusal uyum (y ≈ a·x + b) artığı p95 — eşleme yalnız ton değiştirdiyse ≈ 0
export function identityResidual(src, dst, r) {
  const { W, C } = src, worst = [];
  for (let c = 0; c < 3; c++) {
    const X = [], Y = []; for (let y = r[1]; y < r[3]; y += 2) for (let x = r[0]; x < r[2]; x += 2) { const i = (y * W + x) * C + c; X.push(src.data[i]); Y.push(dst.data[i]); }
    const n = X.length, mx = X.reduce((s, v) => s + v, 0) / n, my = Y.reduce((s, v) => s + v, 0) / n;
    let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (X[i] - mx) * (Y[i] - my); sxx += (X[i] - mx) ** 2; }
    const a = sxx ? sxy / sxx : 1, b = my - a * mx; worst.push(pct(X.map((x, i) => Math.abs(Y[i] - (a * x + b))), 0.95));
  }
  return Math.max(...worst);
}
export function applyGain(img, k) {
  const o = Buffer.from(img.data); for (let i = 0; i < o.length; i++) { const c = i % img.C; if (c < 3) o[i] = Math.max(0, Math.min(255, Math.round(img.data[i] * k[c]))); }
  return { data: o, W: img.W, H: img.H, C: img.C };
}
// regions: [{name, rect: [x0, y0, x1, y1] (görüntü pikseli), target?: '#hex', stdMin?}] · palette: {ad: '#hex'}
export function materialGate(img, accept = {}) {
  const A = Object.assign({}, DEFAULT_ACCEPT, accept), pal = A.palette || {}, regs = A.regions || [];
  const hexOf = (t) => (t == null ? null : String(t).startsWith('#') ? t : pal[t] || null);
  let mapped = img, gain = null;
  if (A.map === 'gain') {
    const r0 = regs.find((r) => r.name === (A.from || (regs[0] && regs[0].name))), t = r0 && hexOf(r0.target);
    if (!r0 || !t) throw new Error('gain eşlemesi: hedefli kaynak bölge yok (from)');
    const m = regionMedian(img, r0.rect), T = hex2rgb(t); gain = m.map((v, c) => (v ? T[c] / v : 1)); mapped = applyGain(img, gain);
  }
  const rows = regs.map((r) => {
    const t = hexOf(r.target), before = regionMedian(img, r.rect), after = regionMedian(mapped, r.rect), std = blockStd(mapped, r.rect, A.block);
    const row = { name: r.name, std: std != null ? +std.toFixed(2) : null, stdMin: r.stdMin != null ? r.stdMin : A.stdMin, before: before.map(Math.round), after: after.map(Math.round), target: t };
    if (t) { const L = rgb2lab(...hex2rgb(t)); row.dEBefore = +deltaE2000(rgb2lab(...before), L).toFixed(2); row.dE = +deltaE2000(rgb2lab(...after), L).toFixed(2); }
    if (gain) row.identity = +identityResidual(img, mapped, r.rect).toFixed(2);
    row.fails = [];
    if (row.std == null) row.fails.push('doku ölçülemedi (bölge < blok)'); else if (row.std < row.stdMin) row.fails.push('doku std ' + row.std + ' < ' + row.stdMin);
    if (row.dE != null && row.dE > (r.dEMax != null ? r.dEMax : A.dEMax)) row.fails.push('palet ΔE ' + row.dE + ' > ' + (r.dEMax != null ? r.dEMax : A.dEMax));
    if (row.identity != null && row.identity > A.identityMax) row.fails.push('kimlik artığı ' + row.identity + ' > ' + A.identityMax);
    return row;
  });
  const measured = rows.every((r) => !r.fails.length), goz = A.goz ? String(A.goz) : null;
  return { accept: { stdMin: A.stdMin, dEMax: A.dEMax, identityMax: A.identityMax, block: A.block, map: A.map }, gain: gain && gain.map((g) => +g.toFixed(4)), rows, mapped,
    verdict: !measured ? 'KALDI' : goz ? 'GEÇTİ' : 'GÖZ BEKLİYOR', goz };
}
