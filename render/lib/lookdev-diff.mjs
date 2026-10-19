// lib/lookdev-diff.mjs — look-dev yönleri arası ayrışma ölçümü (RULES YR-3, reviewer §12; HK-24, evidence/1.1/DUR-K1.md).
// İki eksen; ağırlıklar tasarımla sabit (tarama yok; yalnız iskelet eşiği kalibre edilir):
//   iskelet (UYARI) — DOM'dan okunan üst düzey öğe kutuları (kahraman, metin blokları, bant, kenar öğeleri) → rol başına 6×4 kaba bölge
//                    doluluk haritası, IoU, sabit rol ağırlıkları, kareler arası ortalama (HK-28, HK-33; öğe sayısı girmez). Doku/ışık/gren
//                    katmanları ([data-doku], tam kare ≥ %75 katmanlar) iskelete girmez.
//   palet (UYARI)  — pikselden: zemin ΔE2000 ve ağırlıklı baskın renkler (yarı yarıya); gren yalnız bilgi olarak raporlanır.
// Skor 0–10 (10 = aynı). Bindirme kipi (canlı) 1.1.0 kapsamı dışında (HK-23); yükleyicide korunur, kapıda kullanılmaz.
import fs from 'node:fs';
import sharp from 'sharp';

export const VERSION = '1.1';
const FULL = { w: 320, h: 180 };
const OVER = { w: 128, h: 128 };

// ── renk ──────────────────────────────────────────────────────────────────
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const LIN = new Float64Array(256).map((_, i) => lin(i));
export function rgb2lab(r, g, b) {
  const R = LIN[r], G = LIN[g], B = LIN[b];
  const x = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
  const y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750;
  const z = (R * 0.0193339 + G * 0.1191920 + B * 0.9503041) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
export function dE00([L1, a1, b1], [L2, a2, b2]) {
  const rad = Math.PI / 180, C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2, C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const h = (a, b) => { if (a === 0 && b === 0) return 0; const v = Math.atan2(b, a) / rad; return v < 0 ? v + 360 : v; };
  const h1p = h(a1p, b1), h2p = h(a2p, b2), dLp = L2 - L1, dCp = C2p - C1p;
  let dhp = 0; if (C1p * C2p !== 0) { dhp = h2p - h1p; if (dhp > 180) dhp -= 360; else if (dhp < -180) dhp += 360; }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp * rad / 2), Lmp = (L1 + L2) / 2, Cmp = (C1p + C2p) / 2;
  let hmp = h1p + h2p; if (C1p * C2p !== 0) { if (Math.abs(h1p - h2p) > 180) hmp += h1p + h2p < 360 ? 360 : -360; hmp /= 2; }
  const T = 1 - 0.17 * Math.cos((hmp - 30) * rad) + 0.24 * Math.cos(2 * hmp * rad) + 0.32 * Math.cos((3 * hmp + 6) * rad) - 0.2 * Math.cos((4 * hmp - 63) * rad);
  const dTh = 30 * Math.exp(-(((hmp - 275) / 25) ** 2)), Rc = 2 * Math.sqrt(Cmp ** 7 / (Cmp ** 7 + 25 ** 7));
  const Sl = 1 + 0.015 * (Lmp - 50) ** 2 / Math.sqrt(20 + (Lmp - 50) ** 2), Sc = 1 + 0.045 * Cmp, Sh = 1 + 0.015 * Cmp * T, Rt = -Math.sin(2 * dTh * rad) * Rc;
  return Math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh));
}
const e76 = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// ── yükleme (palet için) ──────────────────────────────────────────────────
// file: yol ya da PNG Buffer · region: {left, top, width, height} (kontak sayfası hücresi) · overlay: bindirme kipi (1.2)
export async function loadImage(file, { overlay = false, region = null } = {}) {
  let im = sharp(file); if (region) im = im.extract(region);
  const meta = await sharp(file).metadata();
  const W0 = 480, H0 = Math.max(1, Math.round(W0 * (region ? region.height / region.width : meta.height / meta.width)));
  const { data } = await im.ensureAlpha().resize(W0, H0, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  let transparent = 0; for (let i = 3; i < data.length; i += 4) if (data[i] < 128) transparent++;
  const hasAlpha = transparent / (W0 * H0) > 0.2;
  if (!overlay) return toWork(await sharp(data, { raw: { width: W0, height: H0, channels: 4 } }).flatten({ background: '#808080' }).resize(FULL.w, FULL.h, { fit: 'fill' }).ensureAlpha().raw().toBuffer(), FULL, false);
  if (!hasAlpha) {   // düz sunum zemini (kenar bandının baskın rengi, ΔE76 < 6) saydam sayılır
    const cnt = new Map(); let best = null;
    for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) {
      if (x > W0 * 0.06 && x < W0 * 0.94 && y > H0 * 0.06 && y < H0 * 0.94) continue;
      const i = (y * W0 + x) * 4, k = (data[i] >> 3) + ',' + (data[i + 1] >> 3) + ',' + (data[i + 2] >> 3);
      const n = (cnt.get(k) || 0) + 1; cnt.set(k, n); if (!best || n > cnt.get(best)) best = k;
    }
    const [r, g, b] = best.split(',').map((v) => (+v << 3) + 4), mat = rgb2lab(r, g, b);
    for (let i = 0; i < data.length; i += 4) if (e76(rgb2lab(data[i], data[i + 1], data[i + 2]), mat) < 6) data[i + 3] = 0;
  }
  let x0 = W0, y0 = H0, x1 = -1, y1 = -1;
  for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) if (data[(y * W0 + x) * 4 + 3] >= 128) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (x1 < 0) return toWork(Buffer.alloc(OVER.w * OVER.h * 4), OVER, true);
  const m = Math.round(0.04 * Math.max(x1 - x0, y1 - y0)); x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(W0 - 1, x1 + m); y1 = Math.min(H0 - 1, y1 + m);
  const crop = await sharp(data, { raw: { width: W0, height: H0, channels: 4 } }).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
    .resize(OVER.w, OVER.h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).raw().toBuffer();
  return toWork(crop, OVER, true);
}
function toWork(buf, G, overlay) {
  const n = G.w * G.h, L = new Float32Array(n), A = new Float32Array(n), B = new Float32Array(n), op = new Uint8Array(n);
  for (let p = 0; p < n; p++) { const i = p * 4; const lab = rgb2lab(buf[i], buf[i + 1], buf[i + 2]); L[p] = lab[0]; A[p] = lab[1]; B[p] = lab[2]; op[p] = buf[i + 3] >= 128 ? 1 : 0; }
  return { w: G.w, h: G.h, L, A, B, op, overlay };
}

// ── palet öznitelikleri (piksel) ──────────────────────────────────────────
export function features(img) {
  const { w, h, L, A, B, op, overlay } = img, n = w * h, lab = (p) => [L[p], A[p], B[p]];
  const opq = []; for (let p = 0; p < n; p++) if (op[p]) opq.push(p);
  const binOf = (p, sl, sa) => Math.round(L[p] / sl) + ',' + Math.round(A[p] / sa) + ',' + Math.round(B[p] / sa);
  let bg = null, bgCov = 0;
  if (!overlay) {   // zemin: en sık renk kutusu, kenar bandı 2 kat ağırlıklı
    const cnt = new Map(), sum = new Map();
    for (const p of opq) {
      const x = p % w, y = (p / w) | 0, edge = x < w * 0.08 || x > w * 0.92 || y < h * 0.08 || y > h * 0.92;
      const k = binOf(p, 6, 8); cnt.set(k, (cnt.get(k) || 0) + (edge ? 2 : 1));
      const s = sum.get(k) || [0, 0, 0, 0]; s[0] += L[p]; s[1] += A[p]; s[2] += B[p]; s[3]++; sum.set(k, s);
    }
    let bk = null; for (const [k, v] of cnt) if (!bk || v > cnt.get(bk)) bk = k;
    const s = sum.get(bk); bg = [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
    let near = 0; for (const p of opq) if (e76(lab(p), bg) < 10) near++; bgCov = near / Math.max(1, opq.length);
  }
  const pc = new Map();   // palet: kaba kutular, %95'i kapsayan en çok 12 renk
  for (const p of opq) { const k = binOf(p, 10, 12); const s = pc.get(k) || [0, 0, 0, 0]; s[0] += L[p]; s[1] += A[p]; s[2] += B[p]; s[3]++; pc.set(k, s); }
  const bins = [...pc.values()].sort((a, b) => b[3] - a[3]), tot = opq.length || 1, palette = [];
  let acc = 0; for (const s of bins) { if (acc >= 0.95 || palette.length >= 12) break; palette.push({ lab: [s[0] / s[3], s[1] / s[3], s[2] / s[3]], w: s[3] / tot }); acc += s[3] / tot; }
  const pw = palette.reduce((a, c) => a + c.w, 0) || 1; for (const c of palette) c.w /= pw;
  let s1 = 0, s2 = 0, k = 0;   // gren: zemin benzeri piksellerde L − 3×3 ortalama std (bilgi)
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const p = y * w + x; if (!op[p] || (bg && e76(lab(p), bg) >= 8)) continue;
    let m = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) m += L[p + dy * w + dx]; const d = L[p] - m / 9;
    s1 += d; s2 += d * d; k++;
  }
  const grain = k > 20 ? Math.sqrt(Math.max(0, s2 / k - (s1 / k) ** 2)) : null;
  let bright = 0, neon = 0; for (const p of opq) { if (L[p] > 70) bright++; if (Math.hypot(A[p], B[p]) > 45 && L[p] > 45) neon++; }
  const f = { overlay, bg, bgCov, palette, grain, bright: bright / tot, neon: neon / tot };
  f.attractors = attractors(f);
  return f;
}

// ── varsayılan çekiciler (motion-world §2): terminal · defter · SaaS · sentez → 0–1 (UYARI) ──────────
function attractors(f) {
  const out = { terminal: 0, defter: 0, saas: 0, sentez: 0 };
  if (f.overlay || !f.bg) return out;
  const [L, a, b] = f.bg, C = Math.hypot(a, b), hue = (Math.atan2(b, a) * 180 / Math.PI + 360) % 360;
  if (L < 45 && C < 18 && (b <= 1 || (hue > 180 && hue < 300))) out.terminal = clamp01(0.45 + (45 - L) / 60 + (f.bright < 0.12 ? 0.15 : 0));
  if (L > 72 && L < 96 && b > 4 && b < 26 && a > -4 && a < 12) out.defter = clamp01(0.5 + (f.bgCov > 0.4 ? 0.15 : 0) + ((f.grain || 0) > 0.8 ? 0.2 : 0));
  if (C > 12 && hue > 255 && hue < 330 && L > 15) out.saas = clamp01(0.5 + C / 80);
  if (L < 30 && f.neon > 0.01) out.sentez = clamp01(0.45 + f.neon * 8);
  return out;
}
export const attractorLevel = (v) => (v >= 0.7 ? 'düşer' : v >= 0.45 ? 'kısmi' : 'yok');

function palDist(P, Q) {
  const one = (X, Y) => X.reduce((s, c) => s + c.w * Math.min(...Y.map((d) => dE00(c.lab, d.lab))), 0);
  return (one(P, Q) + one(Q, P)) / 2;
}
// Palet skoru (tasarım sabitleri): zemin ΔE ≤ 2 → 1, ≥ 16 → 0; palet ΔE ≤ 3 → 1, ≥ 20 → 0; skor = 10 × (½ zemin + ½ palet)
export const PALET = { bgFull: 2, bgZero: 16, palFull: 3, palZero: 20, uyari: 3.5 };
export function paletCompare(fa, fb) {
  const dEbg = fa.bg && fb.bg ? dE00(fa.bg, fb.bg) : null, pd = palDist(fa.palette, fb.palette);
  const sBg = dEbg == null ? null : clamp01(1 - (dEbg - PALET.bgFull) / (PALET.bgZero - PALET.bgFull));
  const sPal = clamp01(1 - (pd - PALET.palFull) / (PALET.palZero - PALET.palFull));
  return { score: 10 * (sBg == null ? sPal : 0.5 * sBg + 0.5 * sPal), dEbg, palDE: pd, grain: [fa.grain, fb.grain] };
}
// Çok kare palet: kare sayıları eşitse sıra eşlemesi, değilse bütün çiftler; ortalama
export function paletSets(FA, FB) {
  const pairs = FA.length === FB.length ? FA.map((a, i) => [a, FB[i]]) : FA.flatMap((a) => FB.map((b) => [a, b]));
  const rs = pairs.map(([a, b]) => paletCompare(a, b)), mean = (k) => rs.reduce((s, r) => s + r[k], 0) / rs.length;
  const g = (F) => { const v = F.map((f) => f.grain).filter((x) => x != null); return v.length ? +(v.reduce((s, x) => s + x, 0) / v.length).toFixed(2) : null; };
  return { score: +mean('score').toFixed(1), dEbg: rs[0].dEbg == null ? null : +mean('dEbg').toFixed(1), palDE: +mean('palDE').toFixed(1), grain: [g(FA), g(FB)] };
}

// ── iskelet (DOM) ─────────────────────────────────────────────────────────
// Sayfa içinde çalışır (page.evaluate; kendi kendine yeterli): önce __boxes(T), yoksa DOM yürüyüşü. Kutular 1920×1080 tabanında.
export function pageBoxes(arg) {
  const stage = document.querySelector(arg.stage); if (!stage) return { src: 'yok', boxes: [] };
  const S = stage.getBoundingClientRect(), sx = arg.W / S.width, sy = arg.H / S.height;
  const norm = (r) => { const x0 = Math.max(0, (r.left - S.left) * sx), y0 = Math.max(0, (r.top - S.top) * sy), x1 = Math.min(arg.W, (r.right - S.left) * sx), y1 = Math.min(arg.H, (r.bottom - S.top) * sy); return x1 > x0 && y1 > y0 ? [x0, y0, x1 - x0, y1 - y0] : null; };
  if (typeof window.__boxes === 'function') {
    try {
      const R = { obj: 'paint', text: 'text', label: 'text', lyric: 'text', cut: 'paint', rr: 'paint' }, out = [];
      for (const b of window.__boxes(arg.t) || []) {
        if (!R[b.kind] || !Array.isArray(b.rect)) continue;
        out.push({ rect: b.rect.slice(0, 4), role: R[b.kind], hero: b.name === 'hero' || b.hero ? 1 : 0 });
      }
      if (out.length) return { src: '__boxes', boxes: out };
    } catch (e) { /* DOM yürüyüşüne düş */ }
  }
  const prims = [], SHAPES = /^(circle|ellipse|rect|line|path|polygon|polyline|image|use|text)$/i;
  const alpha = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return c && c !== 'transparent' && c !== 'none' ? 1 : 0; const v = m[1].split(',').map((x) => parseFloat(x)); return v.length > 3 ? v[3] : 1; };
  const effOpacity = (el) => { let o = 1; for (let e = el; e && e !== stage; e = e.parentElement) { const cs = getComputedStyle(e); o *= +cs.opacity; if (cs.display === 'none' || cs.visibility === 'hidden') return 0; } return o; };
  const walk = (el) => {
    for (const c of el.children) {
      if (c.matches('[data-doku]')) continue;   // [data-fx] paket sayfalarında öğe gruplarını da (kahraman dahil) etiketler → atlanmaz; doku katmanları tam kare kuralıyla düşer
      const tag = c.tagName.toLowerCase(), cs = getComputedStyle(c);
      if (cs.display === 'none' || cs.visibility === 'hidden' || tag === 'style' || tag === 'script' || tag === 'defs') continue;
      const r = norm(c.getBoundingClientRect());
      if (r) {
        let painted;
        if (/^(img|canvas|video)$/.test(tag)) painted = true;
        else if (SHAPES.test(tag)) painted = tag === 'image' || tag === 'text' || alpha(cs.fill) > 0.05 || (alpha(cs.stroke) > 0.05 && parseFloat(cs.strokeWidth) > 0);
        else painted = alpha(cs.backgroundColor) > 0.05 || (cs.backgroundImage && cs.backgroundImage !== 'none')
          || ['Top', 'Right', 'Bottom', 'Left'].some((s) => parseFloat(cs['border' + s + 'Width']) > 0 && alpha(cs['border' + s + 'Color']) > 0.05 && cs['border' + s + 'Style'] !== 'none');
        // ışık/vinyet katmanı: yalnız gradyanla boyalı (zemin rengi ve çerçeve yok), saydam duraklı, bir boyutta kadrajın ≥ %90'ı → iskelete girmez
        if (painted && !/^(img|canvas|video)$/.test(tag) && !SHAPES.test(tag) && alpha(cs.backgroundColor) <= 0.05 && /gradient/.test(cs.backgroundImage)
          && /rgba\([^)]*,\s*0(\.0+)?\)|transparent/.test(cs.backgroundImage) && (r[2] >= 0.9 * arg.W || r[3] >= 0.9 * arg.H)
          && !['Top', 'Right', 'Bottom', 'Left'].some((s) => parseFloat(cs['border' + s + 'Width']) > 0)) painted = false;
        const own = [...c.childNodes].filter((t) => t.nodeType === 3 && t.textContent.trim());
        const op = (own.length || painted) ? effOpacity(c) : 0;
        if (own.length && op > 0.15) {
          const rg = document.createRange(); let tr = null;
          for (const t of own) { rg.selectNodeContents(t); const q = norm(rg.getBoundingClientRect()); if (q) tr = tr ? [Math.min(tr[0], q[0]), Math.min(tr[1], q[1]), Math.max(tr[0] + tr[2], q[0] + q[2]) - Math.min(tr[0], q[0]), Math.max(tr[1] + tr[3], q[1] + q[3]) - Math.min(tr[1], q[1])] : q; }
          if (tr) prims.push({ rect: tr, role: 'text', hero: c.closest('[data-hero]') ? 1 : 0, e: c });
        }
        const isHero = c.hasAttribute('data-hero') && c.getAttribute('data-hero') !== 'false';   // [data-hero] kabı boyasız da kahramandır
        if ((painted || isHero) && (op || effOpacity(c)) > 0.15) prims.push({ rect: r, role: 'paint', hero: isHero ? 1 : 0, e: c });
      }
      walk(c);
    }
  };
  walk(stage);
  // Üst düzey öğeler = bileşenler: tek çocuklu sarmalayıcılar boyunca inilir; kökün alt öğeleri bileşendir, kutusu içindeki görünür
  // boyalı/metin öğelerinin birleşimi (CSS kutusu değil; tam kare kapsayıcılar böylece küçülür). Birleşimi kadrajın ≥ %60'ı olan bileşen
  // tek öğe sayılmaz, bir kat aşağı inilir. Tam kare katmanlar (≥ %75; [data-hero] hariç) önceden atılır.
  // Tam kare (≥ %75) öğeler kutu olarak atılır — [data-hero] kabı dahil; kahramanlık içerik birleşimine taşınır (HK-27 okuma kuralı).
  const FA = arg.W * arg.H, P = prims.filter((p) => p.rect[2] * p.rect[3] < 0.75 * FA);
  const uni = (ps) => { const x0 = Math.min(...ps.map((p) => p.rect[0])), y0 = Math.min(...ps.map((p) => p.rect[1])); return [x0, y0, Math.max(...ps.map((p) => p.rect[0] + p.rect[2])) - x0, Math.max(...ps.map((p) => p.rect[1] + p.rect[3])) - y0]; };
  const heroEl = (k) => k.hasAttribute('data-hero') && k.getAttribute('data-hero') !== 'false';
  let root = stage;
  for (;;) { const kids = [...root.children].filter((k) => P.some((p) => k.contains(p.e))); if (kids.length === 1 && !heroEl(kids[0])) root = kids[0]; else break; }
  const comps = [];
  const take = (el, depth, inHero) => {
    for (const k of el.children) {
      const ps = P.filter((p) => k.contains(p.e)); if (!ps.length) continue;
      const r = uni(ps), hero = !inHero && (heroEl(k) || ps.some((p) => p.hero && p.e === k));
      if (r[2] * r[3] >= 0.6 * FA && depth < 3 && k.children.length) {
        // kadrajı kaplayan kap: kahramansa kahraman kutusu = görünür içeriğin birleşimi; ayrıca içine inilir (metin/bant/kenar rolleri için)
        if (hero) comps.push({ rect: r, role: 'paint', hero: 1, n: ps.length });
        take(k, depth + 1, inHero || hero); continue;
      }
      comps.push({ rect: r, role: ps.every((p) => p.role === 'text') ? 'text' : 'paint', hero: hero || (!inHero && ps.some((p) => p.hero)) ? 1 : 0, n: ps.length });
    }
  };
  take(root, 0, false);
  return { src: 'dom', boxes: comps, prims: P.length };
}
// Ham kutular → üst düzey öğeler: tam kare katmanlar (≥ %75; [data-hero] hariç) ve kırıntılar (< %0,02) atılır; boyalı bir kutunun
// içindeki boyalı kutular (iç yapı) atılır; metin parçaları satır ve bloklara birleştirilir; roller: hero · text · band · edge · obj.
export function topBoxes(raw, W = 1920, H = 1080) {
  const FA = W * H, area = (r) => r[2] * r[3], inside = (a, b) => a[0] >= b[0] - 2 && a[1] >= b[1] - 2 && a[0] + a[2] <= b[0] + b[2] + 2 && a[1] + a[3] <= b[1] + b[3] + 2;
  const P = raw.filter((b) => area(b.rect) / FA >= 0.0002 && (area(b.rect) / FA < 0.75 || b.hero));
  const paints = P.filter((b) => b.role === 'paint').sort((a, b) => area(b.rect) - area(a.rect)), keep = [];
  for (const b of paints) if (!keep.some((k) => inside(b.rect, k.rect)) || b.hero) keep.push(b);
  let T = P.filter((b) => b.role === 'text').map((b) => ({ ...b, rect: b.rect.slice() }));
  const merge = (a, b) => { const x0 = Math.min(a[0], b[0]), y0 = Math.min(a[1], b[1]); return [x0, y0, Math.max(a[0] + a[2], b[0] + b[2]) - x0, Math.max(a[1] + a[3], b[1] + b[3]) - y0]; };
  for (let changed = true; changed;) {
    changed = false;
    outer: for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) {
      const a = T[i].rect, b = T[j].rect, hgt = Math.max(Math.min(a[3], b[3]), 1);
      const vOver = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]), hGap = Math.max(a[0], b[0]) - Math.min(a[0] + a[2], b[0] + b[2]);
      const vGap = Math.max(a[1], b[1]) - Math.min(a[1] + a[3], b[1] + b[3]), hOver = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]);
      const sameLine = vOver > 0.5 * hgt && hGap < 1.5 * hgt, nextLine = vGap >= -2 && vGap < 1.2 * hgt && (Math.abs(a[0] - b[0]) < 2 * hgt || hOver > 0.5 * Math.min(a[2], b[2]));
      if (sameLine || nextLine) { T[i] = { ...T[i], rect: merge(a, b), hero: T[i].hero || T[j].hero }; T.splice(j, 1); changed = true; break outer; }
    }
  }
  // boyalı kutu içinde kalan metin, kutunun kendi metni sayılır ama ayrı öğedir (etiket konumu iskelettir); yalnız tamamen örtüşen kopya atılır
  T = T.filter((t) => !keep.some((k) => Math.abs(k.rect[0] - t.rect[0]) < 3 && Math.abs(k.rect[1] - t.rect[1]) < 3 && Math.abs(k.rect[2] - t.rect[2]) < 3 && Math.abs(k.rect[3] - t.rect[3]) < 3));
  const geo = (b) => { const [x, y, w, h] = b.rect, fw = w / W, fh = h / H;
    if (b.role === 'text') return 'text';
    if (fw >= 0.6 && fh <= 0.15) return 'band';
    if (x < 0.03 * W || y < 0.03 * H || x + w > 0.97 * W || y + h > 0.97 * H) return 'edge';
    return 'obj'; };
  const out = [...keep, ...T].map((b) => ({ rect: b.rect.map((v) => Math.round(v)), role: b.hero && b.role !== 'text' ? 'hero' : geo(b) }));
  // tek kahraman: birden çok [data-hero] → en büyüğü kahraman, kalanlar geometrik rollerine döner; hiç yoksa en büyük nesne kahramandır
  const heroes = out.filter((b) => b.role === 'hero').sort((a, b) => area(b.rect) - area(a.rect));
  for (const h of heroes.slice(1)) h.role = geo({ ...h, role: 'paint' });
  if (!heroes.length) { const objs = out.filter((b) => b.role === 'obj'); if (objs.length) objs.sort((a, b) => area(b.rect) - area(a.rect))[0].role = 'hero'; }
  return out.sort((a, b) => area(b.rect) - area(a.rect)).slice(0, 24);
}
// İskelet benzerliği (HK-28, tasarımla sabit): kadraj 6×4 ızgara; her rol (kahraman, bant, metin, kenar öğesi) için hücre doluluk
// haritası (rol kutularının hücreyle kesişim oranı, en çok 1); rol başına benzerlik = haritaların IoU'su (Σmin/Σmax); ağırlıklar
// kahraman 0,4 · bant 0,2 · metin 0,2 · kenar 0,2; rol iki yönde de yoksa atlanır, ağırlık kalanlara dağılır. Öğe sayısı maliyete girmez.
// 'obj' (kahraman/bant/kenar dışı nesne) betimleyiciye girmez.
export const BOLGE = { gx: 6, gy: 4, w: { hero: 0.4, band: 0.2, text: 0.2, edge: 0.2 } };
function occupancy(boxes, role, W, H) {
  const { gx, gy } = BOLGE, cw = W / gx, ch = H / gy, g = new Float64Array(gx * gy);
  for (const b of boxes) {
    if (b.role !== role) continue;
    const [x, y, w, h] = b.rect;
    for (let cy = 0; cy < gy; cy++) for (let cx = 0; cx < gx; cx++) {
      const ix = Math.max(0, Math.min(x + w, (cx + 1) * cw) - Math.max(x, cx * cw)), iy = Math.max(0, Math.min(y + h, (cy + 1) * ch) - Math.max(y, cy * ch));
      if (ix > 0 && iy > 0) g[cy * gx + cx] = Math.min(1, g[cy * gx + cx] + ix * iy / (cw * ch));
    }
  }
  return g;
}
const iou = (a, b) => { let mn = 0, mx = 0; for (let i = 0; i < a.length; i++) { mn += Math.min(a[i], b[i]); mx += Math.max(a[i], b[i]); } return mx > 0 ? mn / mx : 0; };
export function regionFrame(A, B, W = 1920, H = 1080) {
  let s = 0, ws = 0; const parts = {};
  for (const [role, wt] of Object.entries(BOLGE.w)) {
    const a = occupancy(A, role, W, H), b = occupancy(B, role, W, H);
    if (!a.some((v) => v > 0) && !b.some((v) => v > 0)) continue;
    const v = iou(a, b); parts[role] = v; s += wt * v; ws += wt;
  }
  return { sim: ws ? s / ws : null, parts, roles: Object.keys(parts).length };
}
// Kare birleştirme (HK-28, HK-33): kare sayıları eşitse sıra eşlemesi (aynı kilit an), değilse bütün çiftler; ORTALAMA, 0–10; kare başına
// değerler raporda. Boş küme → ölçülemedi (null). tekRol (bilgi): ölçülen her karede skor tek rolden geliyorsa.
// Önsel (şans düzeltmesi, HK-31) ve kareler arası maks (HK-32) denendi, geri alındı: ortadaki kahraman önseli gerçek iskelet ortaklığını da
// söndürdü (LESSONS L-226).
export function skelSets(FA, FB) {
  const pairs = (FA.length === FB.length ? FA.map((a, i) => [a, FB[i]]) : FA.flatMap((a) => FB.map((b) => [a, b]))).filter(([a, b]) => a.length && b.length);
  const rs = pairs.map(([a, b]) => regionFrame(a, b)).filter((r) => r.sim != null);
  if (!rs.length) return { score: null, frames: [], parts: {}, tekRol: false };
  const parts = {}; for (const r of rs) for (const [k, v] of Object.entries(r.parts)) (parts[k] = parts[k] || []).push(v);
  return { score: +(10 * rs.reduce((t, r) => t + r.sim, 0) / rs.length).toFixed(1), frames: rs.map((r) => +(10 * r.sim).toFixed(1)),
    parts: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, +(v.reduce((t, x) => t + x, 0) / v.length).toFixed(2)])), tekRol: rs.every((r) => r.roles === 1) };
}
// İskelet eşiği ve kapı türü: kalibre edilen tek sayı (evidence/1.1/K-1.1b.md). Proje eşiği yalnız düşürebilir (sıkılaştırır).
// K1a (HK-33): yön içi POZ en düşük 2,3 · NEG (n=4) en yüksek 2,1 → eşik aralığı [2,1, 2,3], orta 2,2; marj 0,2 SERT için yetersiz →
// iskelet UYARI ekseni (reviewer gerekçesi zorunlu). SERT için gösterim 1.2'de.
export const ISKELET_ESIK = 2.2;
export const ISKELET_MOD = 'UYARI';   // 'SERT' (eşik üstü yön içi çift → GEÇMEZ) | 'UYARI' (KARAR'a skor, reviewer gerekçesi zorunlu)

export async function refCells(file, grid = [1, 1], strip = 0) {
  const m = await sharp(file).metadata(), [c, r] = grid, cw = Math.floor(m.width / c), ch = Math.floor(m.height / r), out = [];
  for (let y = 0; y < r; y++) for (let x = 0; x < c; x++) out.push({ left: x * cw, top: y * ch, width: cw, height: Math.max(8, ch - strip) });
  return out;
}
export const exists = (f) => fs.existsSync(f);
