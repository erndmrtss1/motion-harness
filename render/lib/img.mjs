// lib/img.mjs — frame-check görüntü yardımcıları (ölçü yolları, luma, fark, renk sınıfları, Lab/ΔE2000, mp4 kare çekme, kanıt sayfası).
//
// Ölçü yolları (A3 §3.1):
//   qc      blur 0.8 → 960×540 cubic        qc/contact/lumraw/blackcount/qcsig ile birebir
//   fast    480×270 (sharp varsayılanı)      MAD / sıçrama / koyu pay (dup, spikes, lumsplit)
//   half    960×540 cubic (bulanıklıksız)    pairdiff, f9b-series
//   nearest 960×540 en yakın komşu            aksan konumu (redscan, redloc)
//   edge    960×540 (sharp varsayılanı)       kenar kararması / kenar enerjisi (edgeall, edgeE)
//   full    tam çözünürlük                     ΔE, keskinlik, çizgi profili, dikiş, iniş
// Luma: Rec.709 katsayıları 8-bit gamma uzayında (kaynak araçlarla aynı); değerler 0–255, yüzde için /2.55.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { ffmpeg } from './ffmpeg.mjs';

export const SCALES = {
  qc: { w: 960, h: 540, blur: 0.8, kernel: 'cubic' },
  fast: { w: 480, h: 270 },
  half: { w: 960, h: 540, kernel: 'cubic' },
  nearest: { w: 960, h: 540, kernel: 'nearest' },
  edge: { w: 960, h: 540 },
  full: null,
};

// Ölçek tanımı: ad | {w,h,kernel,blur} | null (tam)
export function scaleSpec(s) {
  if (s == null || s === 'full') return null;
  if (typeof s === 'string') { if (!(s in SCALES)) throw new Error('bilinmeyen ölçek: ' + s); return SCALES[s]; }
  return s;
}

// PNG/JPG (dosya ya da Buffer) → { data, W, H, C } ham; gray → tek kanal (sharp greyscale), aksi 3 kanal RGB
export async function readRaw(input, scale = null, { gray = false } = {}) {
  const sp = scaleSpec(scale);
  let p = sharp(input);
  if (sp && sp.blur) p = p.blur(sp.blur);
  if (sp) p = p.resize(sp.w, sp.h, sp.kernel ? { kernel: sp.kernel } : undefined);
  p = p.removeAlpha();
  if (gray) p = p.greyscale();
  const { data, info } = await p.raw().toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height, C: info.channels };
}

// 2× kare (3840×2160) → 1080p 2×2 kutu ortalaması (ss2/sledge yolu: (a+b+c+d+2)>>2)
export function down2(img) {
  const { data, W, H, C } = img, w = W >> 1, h = H >> 1, o = Buffer.alloc(w * h * C);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = ((2 * y) * W + 2 * x) * C, j = i + W * C;
    for (let c = 0; c < C; c++) o[(y * w + x) * C + c] = (data[i + c] + data[i + C + c] + data[j + c] + data[j + C + c] + 2) >> 2;
  }
  return { data: o, W: w, H: h, C };
}

export const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// RGB ham → Float32Array luma (0–255)
export function lumaPlane(img) {
  const { data, W, H, C } = img, y = new Float32Array(W * H);
  if (C === 1) { for (let k = 0; k < y.length; k++) y[k] = data[k]; return y; }
  for (let i = 0, k = 0; k < y.length; i += C, k++) y[k] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  return y;
}
export function meanOf(a) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return a.length ? s / a.length : 0; }
// ortalama luma % (kaynak toplama sırası: piksel başı 709 toplamı)
export function meanLumaPct(img) {
  const { data, C } = img; let s = 0;
  if (C === 1) { for (let k = 0; k < data.length; k++) s += data[k]; return (100 * s) / data.length / 255; }
  for (let k = 0; k < data.length; k += C) s += 0.2126 * data[k] + 0.7152 * data[k + 1] + 0.0722 * data[k + 2];
  return (100 * s) / (data.length / C) / 255;
}
export function percentile(arr, p) { const v = Array.from(arr).sort((a, b) => a - b); return v.length ? v[Math.min(v.length - 1, Math.floor(v.length * p))] : null; }
export function median(arr) { const v = Array.from(arr).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : null; }

// ortalama mutlak fark (bayt başı, 0–255 düzeyi) ve en büyük kanal farkı
export function diffStats(a, b) {
  const n = Math.min(a.length, b.length); let s = 0, m = 0;
  for (let i = 0; i < n; i++) { const d = Math.abs(a[i] - b[i]); s += d; if (d > m) m = d; }
  return { mean: n ? s / n : 0, max: m };
}
export const mad = (a, b) => diffStats(a, b).mean;
export function maxChannel(data) { let m = 0; for (let i = 0; i < data.length; i++) if (data[i] > m) m = data[i]; return m; }

// Yüksek geçiren std (texstat/meas): v − (2r+1)² kutu ortalaması, gri düzlemde
export function highpassSd(y, W, H, r = 4, box = null) {
  const [x0, y0, x1, y1] = box || [r, r, W - r, H - r];
  let s = 0, s2 = 0, n = 0;
  for (let j = Math.max(r, y0); j < Math.min(H - r, y1); j++) for (let i = Math.max(r, x0); i < Math.min(W - r, x1); i++) {
    let a = 0, c = 0; for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { a += y[(j + dj) * W + i + di]; c++; }
    const v = y[j * W + i] - a / c; s += v; s2 += v * v; n++;
  }
  const m = n ? s / n : 0; return n ? Math.sqrt(Math.max(0, s2 / n - m * m)) : 0;
}

// ── renk sınıfları ─────────────────────────────────────────────────────────
// Varsayılan sınıf kaydı (A3 §3.1). world.classes aynı adla üzerine yazar. Anahtarlar:
//   rMin rMax gMin gMax bMin bMax · rgMin rgMax (r−g) · rbMin rbMax (r−b) · gbMin gbMax (g−b) · grMin grMax (g/r) · brMin brMax (b/r)
//   gr:[lo,hi] br:[lo,hi] (eski yazım) · lMin lMax (luma 0–255) · bMinusR (b − r >) · rgAbsMax (|r−g| <) · rbAbsMax (|b−r| <)
//   satMax (max−min kanal <) · inner: 3 (3×3 komşuluğun tamamı sınıfta)
export const CLASSES = {
  signal: { rMin: 190, gMax: 60, bMax: 75, rgMin: 150 },
  bordo: { rMin: 110, rgMin: 70, grMin: 0.27, grMax: 0.45, brMin: 0.27, brMax: 0.5 },
  signalWide: { rMin: 150, rgMin: 90, rbMin: 80 },
  bordoWide: { rMin: 110, rgMin: 60, rbMin: 45, rMax: 209 },
  redInner: { rMin: 140, rgMin: 100, rbMin: 90, inner: 3 },
  redPair: { rMin: 120, rgMin: 90, rbMin: 80, inner: 3 },
  red: { rgMin: 61, rMin: 91 },
  redLoose: { rgMin: 46, rbMin: 36 },
  inkNavy: { lMax: 69.999, bMinusR: 8 },
  darkNeutral: { lMax: 89.999, rgAbsMax: 30 },
  metal: { lMin: 195.001, satMax: 25 },
  emptyBlack: { lMax: 15.2999 },
  visible: { lMin: 77.001 },
  desk: { lMax: 44.999, rbAbsMax: 25 },
};

const NUM = (v, k) => { const x = Number(v); if (!Number.isFinite(x)) throw new Error('renk sınıfı: ' + k + ' sayı değil'); return x; };
// sınıf tanımı → (r, g, b) => bool (yalnız sayılardan kurulur; kod enjekte edilemez)
export function classTest(spec) {
  if (!spec || typeof spec !== 'object') throw new Error('renk sınıfı tanımı yok');
  const p = [];
  const T = { rMin: 'r >= ', rMax: 'r <= ', gMin: 'g >= ', gMax: 'g <= ', bMin: 'b >= ', bMax: 'b <= ', rgMin: 'r - g >= ', rgMax: 'r - g <= ',
    rbMin: 'r - b >= ', rbMax: 'r - b <= ', gbMin: 'g - b >= ', gbMax: 'g - b <= ', grMin: 'g / r >= ', grMax: 'g / r <= ', brMin: 'b / r >= ', brMax: 'b / r <= ',
    lMin: '(0.2126 * r + 0.7152 * g + 0.0722 * b) >= ', lMax: '(0.2126 * r + 0.7152 * g + 0.0722 * b) <= ', bMinusR: 'b - r > ',
    rgAbsMax: 'Math.abs(r - g) < ', rbAbsMax: 'Math.abs(b - r) < ', satMax: '(Math.max(r, g, b) - Math.min(r, g, b)) < ' };
  for (const k of Object.keys(T)) if (spec[k] != null) p.push(T[k] + NUM(spec[k], k));
  if (Array.isArray(spec.gr)) p.push('g / r >= ' + NUM(spec.gr[0], 'gr') + ' && g / r <= ' + NUM(spec.gr[1], 'gr'));
  if (Array.isArray(spec.br)) p.push('b / r >= ' + NUM(spec.br[0], 'br') + ' && b / r <= ' + NUM(spec.br[1], 'br'));
  if (!p.length) throw new Error('renk sınıfı boş');
  return new Function('r', 'g', 'b', 'return ' + p.join(' && ') + ';');
}
// ad ya da satır içi tanım → { name, spec, test, inner }
export function resolveClass(c, classes = CLASSES) {
  const spec = typeof c === 'string' ? classes[c] : c;
  if (!spec) throw new Error('renk sınıfı tanımlı değil: ' + c + ' (world.classes)');
  return { name: typeof c === 'string' ? c : spec.name || 'sınıf', spec, test: classTest(spec), inner: +spec.inner || 0 };
}
// sınıf maskesi (Uint8Array W×H); inner > 0 → (inner×inner) komşuluk tamamen sınıfta olan pikseller
export function classMask(img, cls, box = null) {
  const { data, W, H, C } = img, m = new Uint8Array(W * H), [bx0, by0, bx1, by1] = box || [0, 0, W - 1, H - 1];
  for (let y = Math.max(0, by0); y <= Math.min(H - 1, by1); y++) for (let x = Math.max(0, bx0); x <= Math.min(W - 1, bx1); x++) {
    const i = (y * W + x) * C; if (cls.test(data[i], data[i + 1], data[i + 2])) m[y * W + x] = 1;
  }
  if (!cls.inner) return m;
  const r = cls.inner >> 1, o = new Uint8Array(W * H);
  for (let y = r; y < H - r; y++) for (let x = r; x < W - r; x++) {
    if (!m[y * W + x]) continue; let all = true;
    for (let dy = -r; dy <= r && all; dy++) for (let dx = -r; dx <= r; dx++) if (!m[(y + dy) * W + x + dx]) { all = false; break; }
    if (all) o[y * W + x] = 1;
  }
  return o;
}
export function maskBox(m, W, H) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1, n = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m[y * W + x]) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return n ? { x0, y0, x1, y1, n } : null;
}

// ── renk: sRGB → Lab (D65) → CIEDE2000 (deltae.mjs/de2.mjs ile aynı formül) ───────────────
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
export function rgb2lab(r, g, b) {
  const R = lin(r), G = lin(g), B = lin(b);
  let x = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047, y = 0.2126 * R + 0.7152 * G + 0.0722 * B, z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116); x = f(x); y = f(y); z = f(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
export function deltaE2000(A, B) {
  const [L1, a1, b1] = A, [L2, a2, b2] = B, C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cm, 7) / (Math.pow(Cm, 7) + Math.pow(25, 7)))), a1p = (1 + G) * a1, a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2), h = (x, y) => { const v = (Math.atan2(y, x) * 180) / Math.PI; return v < 0 ? v + 360 : v; };
  const h1 = h(a1p, b1), h2 = h(a2p, b2), dL = L2 - L1, dC = C2p - C1p;
  let dh = h2 - h1; if (C1p * C2p === 0) dh = 0; else if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin((dh * Math.PI) / 360), Lm = (L1 + L2) / 2, Cmp = (C1p + C2p) / 2;
  let hm = h1 + h2; if (C1p * C2p !== 0) { if (Math.abs(h1 - h2) > 180) hm += h1 + h2 < 360 ? 360 : -360; hm /= 2; }
  const T = 1 - 0.17 * Math.cos(((hm - 30) * Math.PI) / 180) + 0.24 * Math.cos((2 * hm * Math.PI) / 180) + 0.32 * Math.cos(((3 * hm + 6) * Math.PI) / 180) - 0.2 * Math.cos(((4 * hm - 63) * Math.PI) / 180);
  const dT = 30 * Math.exp(-Math.pow((hm - 275) / 25, 2)), RC = 2 * Math.sqrt(Math.pow(Cmp, 7) / (Math.pow(Cmp, 7) + Math.pow(25, 7)));
  const SL = 1 + (0.015 * Math.pow(Lm - 50, 2)) / Math.sqrt(20 + Math.pow(Lm - 50, 2)), SC = 1 + 0.045 * Cmp, SH = 1 + 0.015 * Cmp * T, RT = -Math.sin((2 * dT * Math.PI) / 180) * RC;
  return Math.sqrt(Math.pow(dL / SL, 2) + Math.pow(dC / SC, 2) + Math.pow(dH / SH, 2) + RT * (dC / SC) * (dH / SH));
}
export const hex2rgb = (h) => { const s = String(h).replace('#', ''); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
export const rgb2hex = (m) => '#' + m.map((v) => Math.round(v).toString(16).padStart(2, '0').toUpperCase()).join('');

// ── mp4 ────────────────────────────────────────────────────────────────────
// [a, b] kare aralığı → gri ham kareler (seam12: scale W:H flags=area; yplane: varsayılan çekirdek)
export function mp4Gray(file, a, b, { w = 960, h = 540, flags = 'area' } = {}) {
  const vf = "select='between(n," + a + ',' + b + ")',scale=" + w + ':' + h + (flags ? ':flags=' + flags : '') + ',format=gray';
  const r = spawnSync(ffmpeg, ['-v', 'error', '-i', file, '-vf', vf, '-vsync', '0', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error('ffmpeg mp4 gri: ' + String(r.stderr || '').slice(-400));
  const fsz = w * h, out = []; for (let i = 0; (i + 1) * fsz <= r.stdout.length; i++) out.push(r.stdout.subarray(i * fsz, (i + 1) * fsz));
  return out;
}
// tek kare → RGB ham (tam çözünürlük; qc son kare ile aynı seçim)
export function mp4FrameRGB(file, n) {
  const r = spawnSync(ffmpeg, ['-v', 'error', '-i', file, '-vf', "select='eq(n," + n + ")'", '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], { maxBuffer: 1 << 30 });
  if (r.status !== 0 || !r.stdout.length) throw new Error('ffmpeg mp4 kare ' + n + ': ' + String(r.stderr || '').slice(-300));
  return readRaw(r.stdout);
}
// 16-bit RGB (rgb48le) karşılaştırması için ham bayt (master bit eşliği)
export function rgb48Frame(file, n) {
  const r = spawnSync(ffmpeg, ['-v', 'error', '-i', file, '-vf', "select='eq(n," + n + ")'", '-frames:v', '1', '-pix_fmt', 'rgb48le', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error('ffmpeg rgb48 kare ' + n + ': ' + String(r.stderr || '').slice(-300));
  return r.stdout;
}

// ── yazma ve kanıt sayfası ──────────────────────────────────────────────────
export async function writePng(img, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp(img.data, { raw: { width: img.W, height: img.H, channels: img.C } }).png().toFile(file);
  return file;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Kanıt sayfası (crop / strip / grid): items = [{ input (dosya|Buffer), crop:[x,y,w,h]?, label }]
//   cell: hücre genişliği (px); küçük kırpım en yakın komşuyla büyütülür (zoom ≥ 1 tam sayı), büyük olan küçültülür.
//   layout: 'grid' (cols) | 'strip' (tek satır) | 'column'
export async function sheet(items, out, { cols = 4, cell = 480, layout = 'grid', title = '' } = {}) {
  if (!items.length) return null;
  const cells = [];
  for (const it of items) {
    let p = sharp(it.input).removeAlpha();
    const meta = await sharp(it.input).metadata();
    let w = meta.width, h = meta.height;
    if (it.crop) {
      const [x, y, cw, ch] = it.crop.map(Math.round), X = Math.max(0, Math.min(w - 1, x)), Y = Math.max(0, Math.min(h - 1, y));
      const CW = Math.max(1, Math.min(w - X, cw)), CH = Math.max(1, Math.min(h - Y, ch));
      p = p.extract({ left: X, top: Y, width: CW, height: CH }); w = CW; h = CH;
    }
    const zoom = w < cell ? Math.max(1, Math.floor(cell / w)) : 0, tw = zoom ? w * zoom : cell, th = zoom ? h * zoom : Math.round((h * cell) / w);
    const buf = await sharp(await p.png().toBuffer()).resize(tw, th, { kernel: zoom ? 'nearest' : 'lanczos3' }).png().toBuffer();
    cells.push({ buf, w: tw, h: th, label: it.label || '' });
  }
  const C = layout === 'strip' ? cells.length : layout === 'column' ? 1 : Math.min(cols, cells.length), R = Math.ceil(cells.length / C);
  const LH = 22, gap = 6, top = title ? 26 : 0, cw = Math.max(...cells.map((c) => c.w)), ch = Math.max(...cells.map((c) => c.h)) + LH;
  const W = C * cw + (C + 1) * gap, H = top + R * ch + (R + 1) * gap, comp = [];
  let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '">';
  if (title) svg += '<text x="' + gap + '" y="18" font-family="monospace" font-size="15" fill="#fff">' + esc(title) + '</text>';
  cells.forEach((c, i) => {
    const x = gap + (i % C) * (cw + gap), y = top + gap + Math.floor(i / C) * (ch + gap);
    comp.push({ input: c.buf, left: x, top: y });
    svg += '<text x="' + (x + 2) + '" y="' + (y + c.h + 16) + '" font-family="monospace" font-size="14" fill="#ddd">' + esc(c.label) + '</text>';
  });
  svg += '</svg>';
  comp.push({ input: Buffer.from(svg), left: 0, top: 0 });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp({ create: { width: W, height: H, channels: 3, background: '#111' } }).composite(comp).png().toFile(out);
  return out;
}

// Fark haritası (en büyük kanal farkı × amp, gri) — identical report:"diffMap"
export function diffMap(a, b, amp = 4) {
  const n = a.W * a.H, o = Buffer.alloc(n);
  for (let k = 0; k < n; k++) { let m = 0; for (let c = 0; c < Math.min(a.C, 3); c++) { const d = Math.abs(a.data[k * a.C + c] - b.data[k * b.C + c]); if (d > m) m = d; } o[k] = Math.min(255, m * amp); }
  return { data: o, W: a.W, H: a.H, C: 1 };
}
