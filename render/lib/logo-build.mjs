// lib/logo-build.mjs — logo vektörünü raster kaynaktan (JPG/PNG) kurar: `motion-render logo up | trace | build` (+ fit, assets, check ayrı modüllerde).
// Logo tablosu koddan çıktı → assets/logo/logos.json (lib/logo-config.mjs). Algoritma ve parametreler kaynak hatla aynı.
//   up      (a) büyütme kabulü: üretken büyütme (logos.json up.<yöntem>.file) ↔ yerel Lanczos 4× — kaynak boyutuna indirilip orijinal maskeyle
//           satır IoU ≥ 0.99, delik birebir, kenar p90 ≤ 0.5 px → <probe>/<anahtar>-up-<yöntem>.png + up.json
//   trace   YOL 2: kabul edilen büyütmeden (srcUp katman başına) potrace + yol temizliği (köşeden bölme, doğru / Schneider kübik, ±angTol° hizalama)
//           → <probe>/<anahtar>-yol2.svg/.json
//   build   son SVG (yalnız path, şeffaf, kutuya kırpılmış viewBox) → logos.json out + <probe>/logo-dogrulama.png + logo-olcum.json
// Ölçü ızgarası: kaynak pikseli. Mürekkep kaplaması: kirmizi = (R−G)/(R−G)ink; siyah = (190 − L)/(190 − Link) × (1 − kirmizi) (açık gri gölge < 0.5 → dışarıda).
// Katman adları (layers) bu iki mürekkep sınıfıdır: "kirmizi" (doygun kırmızı mürekkep) ve "siyah" (koyu mürekkep).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import sharp from 'sharp';
let potrace = null;
export function needPotrace() {   // isteğe bağlı bağımlılık: yalnız trace/build
  if (potrace) return potrace;
  try { potrace = createRequire(import.meta.url)('potrace'); } catch { throw new Error('potrace kurulu değil (isteğe bağlı bağımlılık): render/ içinde `npm i potrace@2.1.8` — logo trace/build için gerekli'); }
  return potrace;
}
let ROOT = process.cwd(), OUT = 'out/probe/logo';
const P = (f) => path.join(ROOT, f);
export let LOGOS = {}, LETTERS = {}, SRC_UP = {}, YOL2_PRM = {};
export function configure(root, cfg) {   // cfg = assets/logo/logos.json
  ROOT = root; OUT = cfg.probe || 'out/probe/logo'; LOGOS = cfg.logos; LETTERS = {}; SRC_UP = {}; YOL2_PRM = {};
  for (const [k, L] of Object.entries(cfg.logos)) { LETTERS[k] = L.letters || {}; SRC_UP[k] = L.srcUp || Object.fromEntries(L.layers.map((ly) => [ly, 'lanczos'])); YOL2_PRM[k] = L.trace || {}; L.up = L.up || {}; }
  fs.mkdirSync(P(OUT), { recursive: true });
}
// ---------- görüntü ve kaplama
export async function rgba(input, opts) { const { data, info } = await sharp(input, opts).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { d: data, W: info.width, H: info.height }; }
export function inkColors(img) {   // mürekkep renkleri (iç pikseller medyanı): kırmızı R−G > 140; koyu L < 60 ve R−G < 30
  const R = [], K = []; for (let i = 0; i < img.W * img.H; i++) { const r = img.d[i * 4], g = img.d[i * 4 + 1], b = img.d[i * 4 + 2], L = 0.2126 * r + 0.7152 * g + 0.0722 * b; if (r - g > 140) R.push([r, g, b]); else if (L < 60 && r - g < 30) K.push([r, g, b]); }
  const med = (A) => { if (!A.length) return null; return [0, 1, 2].map((c) => { const s = A.map((x) => x[c]).sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; }); };
  return { kirmizi: med(R), siyah: med(K), n: [R.length, K.length] };
}
export function coverage(img, ink) {   // { kirmizi: F32, siyah: F32 }
  const n = img.W * img.H, red = new Float32Array(n), blk = new Float32Array(n), rk = ink.kirmizi ? ink.kirmizi[0] - ink.kirmizi[1] : 180, Lk = ink.siyah ? 0.2126 * ink.siyah[0] + 0.7152 * ink.siyah[1] + 0.0722 * ink.siyah[2] : 25;
  for (let i = 0; i < n; i++) { const a = img.d[i * 4 + 3] / 255, r = img.d[i * 4] * a + 255 * (1 - a), g = img.d[i * 4 + 1] * a + 255 * (1 - a), b = img.d[i * 4 + 2] * a + 255 * (1 - a), L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const cr = Math.max(0, Math.min(1, (r - g) / rk)); red[i] = cr; blk[i] = Math.max(0, Math.min(1, (190 - L) / (190 - Lk))) * (1 - cr); }
  return { kirmizi: red, siyah: blk, W: img.W, H: img.H };
}
// ---------- bileşenler (harfler) ve delikler
export function comps(c, W, H, th = 0.5, minArea = 30) {
  const fg = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) fg[i] = c[i] >= th ? 1 : 0;
  const lab = new Int32Array(W * H).fill(-1), out = []; let n = 0;
  for (let s = 0; s < W * H; s++) { if (!fg[s] || lab[s] >= 0) continue; const st = [s]; lab[s] = n; let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, area = 0;
    while (st.length) { const p = st.pop(), x = p % W, y = (p - x) / W; area++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const q = yy * W + xx; if (fg[q] && lab[q] < 0) { lab[q] = n; st.push(q); } } }
    out.push({ id: n, x0, x1: x1 + 1, y0, y1: y1 + 1, area, holes: 0 }); n++; }
  const bl = new Int32Array(W * H).fill(-1);
  for (let s = 0; s < W * H; s++) { if (fg[s] || bl[s] >= 0) continue; const st = [s]; bl[s] = 1; let edge = false, owner = -1, area = 0;
    while (st.length) { const p = st.pop(), x = p % W, y = (p - x) / W; area++; if (x === 0 || y === 0 || x === W - 1 || y === H - 1) edge = true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const q = yy * W + xx; if (fg[q]) { if (owner < 0) owner = lab[q]; } else if (bl[q] < 0) { bl[q] = 1; st.push(q); } } }
    if (!edge && owner >= 0 && area >= 4) out[owner].holes++; }
  return out.filter((o) => o.area >= minArea).sort((a, b) => a.x0 - b.x0);
}
// ---------- karşılaştırma: IoU ve kenar konumu (satır/sütun 0.5 kesişimleri, aynı yön, en yakın eş; eşsiz = 3 px)
export function iou(A, B, W, box) { let I = 0, U = 0; const [x0, y0, x1, y1] = box; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const a = A[y * W + x] >= 0.5, b = B[y * W + x] >= 0.5; if (a && b) I++; if (a || b) U++; } return U ? I / U : 1; }
export function edgeDiffs(A, B, W, H, box) {
  const [x0, y0, x1, y1] = box, out = [];
  const cross = (get, n) => { const c = []; for (let j = 0; j < n - 1; j++) { const a = get(j), b = get(j + 1); if ((a - 0.5) * (b - 0.5) < 0) c.push({ p: j + (0.5 - a) / (b - a), up: b > a }); } return c; };
  const match = (ca, cb) => { ca.forEach((a) => { let bd = 3; cb.forEach((b) => { if (b.up === a.up) bd = Math.min(bd, Math.abs(a.p - b.p)); }); out.push(bd); }); };
  for (let y = y0; y < y1; y++) { const ga = (j) => A[y * W + x0 + j], gb = (j) => B[y * W + x0 + j]; const ca = cross(ga, x1 - x0), cb = cross(gb, x1 - x0); match(ca, cb); match(cb, ca); }
  for (let x = x0; x < x1; x++) { const ga = (j) => A[(y0 + j) * W + x], gb = (j) => B[(y0 + j) * W + x]; const ca = cross(ga, y1 - y0), cb = cross(gb, y1 - y0); match(ca, cb); match(cb, ca); }
  return out;
}
export const pct = (a, q) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const pad = (b, k, W, H) => [Math.max(0, b[0] - k), Math.max(0, b[1] - k), Math.min(W, b[2] + k), Math.min(H, b[3] + k)];
// harf etiketleri (soldan sağa, katman başına): logos.json letters

export async function refOf(key) {   // orijinal JPG: renk, kaplama, harf bileşenleri
  const L = LOGOS[key], img = await rgba(P(L.jpg)), ink = inkColors(img), cov = coverage(img, ink), letters = {};
  for (const ly of L.layers) letters[ly] = mergeLetters(comps(cov[ly], img.W, img.H), (LETTERS[key] || {})[ly] || []);
  return { img, ink, cov, letters, W: img.W, H: img.H };
}
function mergeLetters(cs, names) {   // ":" iki nokta, ".|" nokta + fitil → bileşenleri harfe birleştir (x örtüşmesi)
  const out = []; cs.forEach((c) => { const last = out[out.length - 1]; if (last && c.x0 < last.x1 - 2 && Math.min(c.x1, last.x1) - Math.max(c.x0, last.x0) > 0.5 * Math.min(c.x1 - c.x0, last.x1 - last.x0)) { last.x0 = Math.min(last.x0, c.x0); last.x1 = Math.max(last.x1, c.x1); last.y0 = Math.min(last.y0, c.y0); last.y1 = Math.max(last.y1, c.y1); last.holes += c.holes; last.parts++; } else out.push({ ...c, parts: 1 }); });
  out.forEach((o, i) => { o.ch = names[i] || '?'; o.box = [o.x0, o.y0, o.x1, o.y1]; }); return out;
}
export function compareLayer(ref, test, ly, W, H) {   // harf başına IoU, kenar p90, delik
  return ref.letters[ly].map((l) => { const box = pad(l.box, 3, W, H), d = edgeDiffs(ref.cov[ly], test[ly], W, H, box); const tc = comps(test[ly].slice ? test[ly] : test[ly], W, H).filter((c) => c.x0 < l.x1 && c.x1 > l.x0 && c.y0 < l.y1 && c.y1 > l.y0);
    return { ch: l.ch, iou: +iou(ref.cov[ly], test[ly], W, box).toFixed(4), p90: +pct(d, 0.9).toFixed(3), holes: [l.holes, tc.reduce((s, c) => s + c.holes, 0)] }; });
}
export function lineIoU(ref, test, ly, W, H) { const b = ref.letters[ly].reduce((a, l) => [Math.min(a[0], l.x0), Math.min(a[1], l.y0), Math.max(a[2], l.x1), Math.max(a[3], l.y1)], [1e9, 1e9, -1, -1]); return +iou(ref.cov[ly], test[ly], W, pad(b, 3, W, H)).toFixed(4); }

// ---------- (a) büyütme kabulü
function inkBox(c, W, H, th = 0.5) {   // alt piksel kutu: kenar sütun/satırların kaplama toplamı (sol/sağ/üst/alt kesirli)
  const colS = new Float64Array(W), rowS = new Float64Array(H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = c[y * W + x]; if (v > 0.02) { colS[x] += v; rowS[y] += v; } }
  const lo = (S) => { const mx = Math.max(...S), t = th * mx * 0 + 1e-9; let i = 0; while (i < S.length && S[i] <= 0.5) i++; return i; }, hi = (S) => { let i = S.length - 1; while (i >= 0 && S[i] <= 0.5) i--; return i + 1; };
  return [lo(colS), lo(rowS), hi(colS), hi(rowS)];
}
async function register(up, ref) {   // büyütmeyi kaynak çerçevesine: iki eksende ayrı doğrusal eşleme (kırmızı + koyu mürekkep kutusu), sonra kaynak en-boyunda ×k
  const u = await rgba(up), uc = coverage(u, ref.ink), comb = (C, n) => { const o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = Math.max(C.kirmizi[i], C.siyah[i]); return o; };
  const ub = inkBox(comb(uc, u.W * u.H), u.W, u.H), rb = inkBox(comb(ref.cov, ref.W * ref.H), ref.W, ref.H);
  const ax = (ub[2] - ub[0]) / (rb[2] - rb[0]), ay = (ub[3] - ub[1]) / (rb[3] - rb[1]), bx = ub[0] - ax * rb[0], by = ub[1] - ay * rb[1], k = (ax + ay) / 2;
  const W2 = Math.round(ref.W * k), H2 = Math.round(ref.H * k);   // hedef: kaynak çerçevesi × k (eksen ölçek farkı yeniden örneklemeyle giderilir)
  const sx = Math.round(ref.W * ax), sy = Math.round(ref.H * ay), l = Math.round(bx), t = Math.round(by);
  const ext = { left: Math.max(0, -l), top: Math.max(0, -t), right: Math.max(0, l + sx - u.W), bottom: Math.max(0, t + sy - u.H) };
  let img = sharp(up).extend({ ...ext, background: '#ffffff' }); const buf = await img.png().toBuffer();
  const out = await sharp(buf).extract({ left: l + ext.left, top: t + ext.top, width: sx, height: sy }).resize(W2, H2, { kernel: 'lanczos3', fit: 'fill' }).png().toBuffer();
  console.log('  çakıştırma: ölçek x ' + ax.toFixed(4) + ' y ' + ay.toFixed(4) + ' (fark ' + ((ax / ay - 1) * 100).toFixed(2) + '%) · kayma ' + bx.toFixed(1) + ', ' + by.toFixed(1) + ' → ' + W2 + '×' + H2);
  return out;
}
export async function stageUp() {
  const rep = {};
  for (const key of Object.keys(LOGOS)) { const L = LOGOS[key], ref = await refOf(key); rep[key] = { ink: ref.ink, harfler: Object.fromEntries(Object.entries(ref.letters).map(([k, v]) => [k, v.map((l) => l.ch + ':' + l.holes).join(' ')])), yontem: {} };
    const meth = { ...L.up, lanczos: { file: null } };
    for (const [m, u] of Object.entries(meth)) {
      let up;
      if (m === 'lanczos') { up = await sharp(P(L.jpg)).resize(ref.W * 4, ref.H * 4, { kernel: 'lanczos3' }).png().toBuffer(); }
      else { const md = await sharp(P(u.file)).metadata(); const k = md.height / (u.padH || ref.H); up = u.pad ? await sharp(P(u.file)).extract({ left: 0, top: Math.round(u.pad[0] * k), width: md.width, height: Math.round(ref.H * k) }).png().toBuffer() : await sharp(P(u.file)).png().toBuffer(); }
      const umd = await sharp(up).metadata(); fs.writeFileSync(P(OUT + '/' + key + '-up-' + m + '.png'), up);
      const down = await rgba(await sharp(up).resize(ref.W, ref.H, { kernel: 'lanczos3', fit: 'fill' }).png().toBuffer())   /* fill: büyütme en-boyu kaynakla aynı değil (ör. 5734×2160 → 4.778 / 4.747); cover kırpardı */, dc = coverage(down, ref.ink);
      const lay = {}; let ok = true;
      for (const ly of L.layers) { const per = compareLayer(ref, dc, ly, ref.W, ref.H), li = lineIoU(ref, dc, ly, ref.W, ref.H), all = per.flatMap((p) => [p.p90]), hOK = per.every((p) => p.holes[0] === p.holes[1]);
        lay[ly] = { satirIoU: li, p90max: Math.max(...all), delik: hOK, harf: per }; if (li < 0.99 || Math.max(...all) > 0.5 || !hOK) ok = false; }
      rep[key].yontem[m] = { boyut: umd.width + '×' + umd.height, olcek: +(umd.width / ref.W).toFixed(3), kabul: ok, katman: lay, kredi: u.credits || 0 };
      console.log(key + ' ' + m + ' ' + umd.width + '×' + umd.height + ' · ' + (ok ? 'KABUL' : 'RET') + ' · ' + Object.entries(lay).map(([ly, v]) => ly + ' IoU ' + v.satirIoU + ' p90max ' + v.p90max.toFixed(3) + ' delik ' + (v.delik ? 'birebir' : 'FARKLI')).join(' · '));
    } }
  fs.writeFileSync(P(OUT + '/up.json'), JSON.stringify(rep, null, 1));
}
// ---------- YOL 2: izleme + temizlik
export function parseD(d) {   // potrace (mutlak M/C/L/Z) → alt yollar [{ start, segs: [{ t, c1, c2, p }] }]
  const tok = d.match(/[MLCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi), subs = []; let i = 0, cur = null, cmd = null, pt = null;
  const num = () => +tok[i++];
  while (i < tok.length) { const t = tok[i]; if (/^[MLCZ]$/i.test(t)) { cmd = t.toUpperCase(); i++; if (cmd === 'Z') { if (cur) subs.push(cur); cur = null; continue; } }
    if (cmd === 'M') { if (cur && cur.segs.length) subs.push(cur); pt = [num(), num()]; cur = { start: pt, segs: [] }; cmd = 'L'; }   // potrace (npm) alt yolları Z'siz, yeni M ile başlatır
    else if (cmd === 'L') { const p = [num(), num()]; cur.segs.push({ t: 'L', p }); pt = p; }
    else if (cmd === 'C') { const c1 = [num(), num()], c2 = [num(), num()], p = [num(), num()]; cur.segs.push({ t: 'C', c1, c2, p }); pt = p; } }
  if (cur) subs.push(cur); return subs;
}
export function cleanSub(sub, tolLine, angTol) {   // eğri→doğru (kontroller kirişe ≤ tolLine), yatay/dikey yakın doğruları hizala (±angTol°), ardışık eş-doğrultulu doğruları birleştir
  let pts = [sub.start], segs = sub.segs.map((s) => ({ ...s }));
  const dl = (q, a, b) => { const vx = b[0] - a[0], vy = b[1] - a[1], L = Math.hypot(vx, vy) || 1; return Math.abs((q[0] - a[0]) * vy - (q[1] - a[1]) * vx) / L; };
  let prev = sub.start; segs.forEach((s) => { if (tolLine > 0 && s.t === 'C' && Math.hypot(s.p[0] - prev[0], s.p[1] - prev[1]) > 1e-6 && dl(s.c1, prev, s.p) <= tolLine && dl(s.c2, prev, s.p) <= tolLine) {   /* kiriş sıfırsa (kapalı tek eğri) dönüştürme */ s.t = 'L'; delete s.c1; delete s.c2; } prev = s.p; });
  // tepe noktaları dizisi: v[0] = start, v[k] = segs[k-1].p (kapalı: son = start)
  const V = [sub.start, ...segs.map((s) => s.p)], n = segs.length;
  for (let k = 0; k < n; k++) { const s = segs[k]; if (s.t !== 'L') continue; const a = V[k], b = V[k + 1], ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI, len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 2) continue;
    const near = (x) => Math.abs(((ang - x) % 180 + 540) % 180 - 180) <= angTol || Math.abs(((ang - x) % 180 + 180) % 180) <= angTol;
    if (near(0)) { const y = (a[1] + b[1]) / 2, da = y - a[1], db = y - b[1]; a[1] = y; b[1] = y; shiftCtl(segs, k - 1, 'c2', 0, da); shiftCtl(segs, k + 1, 'c1', 0, db); }
    else if (near(90)) { const x = (a[0] + b[0]) / 2, da = x - a[0], db = x - b[0]; a[0] = x; b[0] = x; shiftCtl(segs, k - 1, 'c2', da, 0); shiftCtl(segs, k + 1, 'c1', db, 0); } }
  // birleştir: ardışık L'ler aynı doğrultuda (≤ angTol)
  const out = []; let start = V[0];
  for (let k = 0; k < n; k++) { const s = segs[k], p = V[k + 1]; const last = out[out.length - 1];
    if (s.t === 'L' && last && last.t === 'L') { const a0 = out.length > 1 ? out[out.length - 2].p : start, d1 = Math.atan2(last.p[1] - a0[1], last.p[0] - a0[0]), d2 = Math.atan2(p[1] - last.p[1], p[0] - last.p[0]); if (Math.abs(((d2 - d1) * 180 / Math.PI + 540) % 360 - 180) <= angTol) { last.p = p; continue; } }
    out.push(s.t === 'L' ? { t: 'L', p } : { t: 'C', c1: s.c1, c2: s.c2, p }); }
  return { start, segs: out };
}
function shiftCtl(segs, k, which, dx, dy) { const s = segs[(k + segs.length) % segs.length]; if (s && s.t === 'C' && s[which]) { s[which] = [s[which][0] + dx, s[which][1] + dy]; } }
export const fmt = (v) => (Math.round(v * 1000) / 1000).toString();
export function subD(sub, sc, ox = 0, oy = 0) { const q = (p) => fmt(p[0] * sc - ox) + ' ' + fmt(p[1] * sc - oy); return 'M ' + q(sub.start) + ' ' + sub.segs.map((s) => s.t === 'L' ? 'L ' + q(s.p) : 'C ' + q(s.c1) + ' ' + q(s.c2) + ' ' + q(s.p)).join(' ') + ' Z'; }
export function subBox(sub) { const P0 = [sub.start, ...sub.segs.flatMap((s) => s.t === 'C' ? [s.c1, s.c2, s.p] : [s.p])]; return [Math.min(...P0.map((p) => p[0])), Math.min(...P0.map((p) => p[1])), Math.max(...P0.map((p) => p[0])), Math.max(...P0.map((p) => p[1]))]; }
async function traceLayer(buf, opts) { return new Promise((res, rej) => needPotrace().trace(buf, opts, (e, s) => (e ? rej(e) : res(s)))); }
// büyütme kaynağı (a kabulüne göre katman başına): logos.json srcUp
export async function yol2(key, method = null, params = {}) {
  const L = LOGOS[key], ref = await refOf(key), res = {}, used = {}; let k = 0;
  const prm = Object.assign({ blur: 0.6, alphaMax: 0.85, optTolerance: 0.35, turd: 40, tolLine: 0.12, tolFit: 0.15, corner: 40, span: 1.0, angTol: 0.5 }, params);   // tol: JPG pikseli (1200 ölçeği)
  const prmL = {};
  for (const ly of L.layers) {
    const prm0 = prm, pr = prmL[ly] = Object.assign({}, prm0, (prm0.layer || {})[ly] || {});
    const m = (method && (method[ly] || method)) || SRC_UP[key][ly]; used[ly] = m; const uimg = await rgba(fs.readFileSync(P(OUT + '/' + key + '-up-' + m + '.png'))), uc = coverage(uimg, ref.ink), kx = uimg.W / ref.W, ky = uimg.H / ref.H; k = (kx + ky) / 2;   // üretken büyütmede kx ≠ ky olabilir (ör. 4.778 / 4.747)
    const g = Buffer.alloc(uimg.W * uimg.H); for (let i = 0; i < g.length; i++) g[i] = Math.round(255 * (1 - Math.min(1, uc[ly][i])));
    let png = sharp(g, { raw: { width: uimg.W, height: uimg.H, channels: 1 } }); if (pr.blur) png = png.blur(pr.blur * k / 4 + 0.3); const pb = await png.png().toBuffer();
    const pt = needPotrace(), svg = await traceLayer(pb, { threshold: 128, turdSize: pr.turd * k * k / 16, alphaMax: pr.alphaMax, optCurve: true, optTolerance: pr.optTolerance, turnPolicy: pt.Potrace.TURNPOLICY_MINORITY });
    const d = (/ d="([^"]+)"/.exec(svg) || [])[1] || ''; const sc = (q) => [q[0] / kx, q[1] / ky], subs = parseD(d).map((s) => ({ start: sc(s.start), segs: s.segs.map((q) => ({ t: q.t, p: sc(q.p), ...(q.t === 'C' ? { c1: sc(q.c1), c2: sc(q.c2) } : {}) })) }));
    res[ly] = subs.map((s) => refit(s, pr));
  }
  return { ref, subs: res, k, prm: prmL, used };
}

// ---------- yol temizliği: köşelerden böl, her parça doğru (kirişe ≤ tolLine) ya da Schneider kübik (hata ≤ tolFit); yatay/dikey doğrular ±angTol° hizalanır
const V2 = { add: (a, b) => [a[0] + b[0], a[1] + b[1]], sub: (a, b) => [a[0] - b[0], a[1] - b[1]], mul: (a, k) => [a[0] * k, a[1] * k], dot: (a, b) => a[0] * b[0] + a[1] * b[1], len: (a) => Math.hypot(a[0], a[1]), norm: (a) => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; } };
function bez(c, t) { const m = 1 - t; return [m * m * m * c[0][0] + 3 * m * m * t * c[1][0] + 3 * m * t * t * c[2][0] + t * t * t * c[3][0], m * m * m * c[0][1] + 3 * m * m * t * c[1][1] + 3 * m * t * t * c[2][1] + t * t * t * c[3][1]]; }
function sampleSub(sub) {   // yoğun örnek (≈ 0.05 birim)
  const pts = [sub.start]; let prev = sub.start;
  sub.segs.forEach((q) => { if (q.t === 'L') { const n = Math.max(1, Math.ceil(V2.len(V2.sub(q.p, prev)) / 0.05)); for (let i = 1; i <= n; i++) pts.push(V2.add(prev, V2.mul(V2.sub(q.p, prev), i / n))); }
    else { const c = [prev, q.c1, q.c2, q.p], L = V2.len(V2.sub(q.c1, prev)) + V2.len(V2.sub(q.c2, q.c1)) + V2.len(V2.sub(q.p, q.c2)), n = Math.max(4, Math.ceil(L / 0.05)); for (let i = 1; i <= n; i++) pts.push(bez(c, i / n)); }
    prev = q.p; });
  if (V2.len(V2.sub(pts[pts.length - 1], pts[0])) < 1e-6) pts.pop(); return pts;
}
function corners(pts, deg, span) {   // köşe: ±span (birim) uzaklıktaki noktalara yön farkı > deg; yerel en büyük
  const n = pts.length, cum = [0]; for (let i = 1; i <= n; i++) cum.push(cum[i - 1] + V2.len(V2.sub(pts[i % n], pts[i - 1])));
  const per = cum[n], at = (i, d) => { let j = i, acc = 0; const st = d > 0 ? 1 : -1; while (acc < Math.abs(d)) { const a = pts[((j % n) + n) % n], b = pts[(((j + st) % n) + n) % n]; acc += V2.len(V2.sub(b, a)); j += st; if (Math.abs(j - i) > n) break; } return pts[((j % n) + n) % n]; };
  const ang = pts.map((p, i) => { const a = V2.norm(V2.sub(p, at(i, -span))), b = V2.norm(V2.sub(at(i, span), p)); return Math.acos(Math.max(-1, Math.min(1, V2.dot(a, b)))) * 180 / Math.PI; });
  const out = []; const w = Math.max(2, Math.round(span / 0.05)); for (let i = 0; i < n; i++) { if (ang[i] < deg) continue; let mx = true; for (let j = -w; j <= w; j++) if (j && ang[((i + j) % n + n) % n] > ang[i]) { mx = false; break; } if (mx && (!out.length || i - out[out.length - 1] > w)) out.push(i); }
  return out;
}
function chordParam(P) { const u = [0]; for (let i = 1; i < P.length; i++) u.push(u[i - 1] + V2.len(V2.sub(P[i], P[i - 1]))); const L = u[u.length - 1] || 1; return u.map((v) => v / L); }
function genBez(P, u, t1, t2) {
  const A = u.map((t) => [V2.mul(t1, 3 * t * (1 - t) * (1 - t)), V2.mul(t2, 3 * t * t * (1 - t))]), first = P[0], last = P[P.length - 1];
  let C00 = 0, C01 = 0, C11 = 0, X0 = 0, X1 = 0;
  u.forEach((t, i) => { const m = 1 - t, b0 = m * m * m, b1 = 3 * t * m * m, b2 = 3 * t * t * m, b3 = t * t * t; C00 += V2.dot(A[i][0], A[i][0]); C01 += V2.dot(A[i][0], A[i][1]); C11 += V2.dot(A[i][1], A[i][1]);
    const tmp = V2.sub(P[i], V2.add(V2.mul(first, b0 + b1), V2.mul(last, b2 + b3))); X0 += V2.dot(A[i][0], tmp); X1 += V2.dot(A[i][1], tmp); });
  const det = C00 * C11 - C01 * C01, seg = V2.len(V2.sub(last, first)); let a1 = det ? (X0 * C11 - X1 * C01) / det : 0, a2 = det ? (C00 * X1 - C01 * X0) / det : 0;
  if (a1 < 1e-6 * seg || a2 < 1e-6 * seg) { a1 = a2 = seg / 3; }
  return [first, V2.add(first, V2.mul(t1, a1)), V2.add(last, V2.mul(t2, a2)), last];
}
function maxErr(P, c, u) { let mx = 0, at = 0; for (let i = 1; i < P.length - 1; i++) { const d = V2.len(V2.sub(bez(c, u[i]), P[i])); if (d > mx) { mx = d; at = i; } } return [mx, at]; }
function newton(c, P, t) { const m = 1 - t, q = bez(c, t), q1 = [3 * (m * m * (c[1][0] - c[0][0]) + 2 * m * t * (c[2][0] - c[1][0]) + t * t * (c[3][0] - c[2][0])), 3 * (m * m * (c[1][1] - c[0][1]) + 2 * m * t * (c[2][1] - c[1][1]) + t * t * (c[3][1] - c[2][1]))], q2 = [6 * (m * (c[2][0] - 2 * c[1][0] + c[0][0]) + t * (c[3][0] - 2 * c[2][0] + c[1][0])), 6 * (m * (c[2][1] - 2 * c[1][1] + c[0][1]) + t * (c[3][1] - 2 * c[2][1] + c[1][1]))];
  const d = V2.sub(q, P), num = V2.dot(d, q1), den = V2.dot(q1, q1) + V2.dot(d, q2); return den ? Math.max(0, Math.min(1, t - num / den)) : t; }
function fitCubic(P, t1, t2, tol, depth = 0) {
  if (P.length === 2) { const dd = V2.len(V2.sub(P[1], P[0])) / 3; return [[P[0], V2.add(P[0], V2.mul(t1, dd)), V2.add(P[1], V2.mul(t2, dd)), P[1]]]; }
  let u = chordParam(P), c = genBez(P, u, t1, t2), [e, sp] = maxErr(P, c, u);
  if (e <= tol) return [c];
  if (e <= tol * 4) for (let it = 0; it < 8; it++) { u = u.map((t, i) => newton(c, P[i], t)); c = genBez(P, u, t1, t2); [e, sp] = maxErr(P, c, u); if (e <= tol) return [c]; }
  if (depth > 12 || P.length < 6) return [c];
  sp = Math.max(2, Math.min(P.length - 3, sp)); const tc = V2.norm(V2.sub(P[sp - 1], P[sp + 1]));
  return [...fitCubic(P.slice(0, sp + 1), t1, tc, tol, depth + 1), ...fitCubic(P.slice(sp), V2.mul(tc, -1), t2, tol, depth + 1)];
}
function lineDev(P) { const a = P[0], b = P[P.length - 1], L = V2.len(V2.sub(b, a)); if (L < 1e-6) return Infinity;   /* kapalı döngü: doğru değil */ let mx = 0; P.forEach((q) => { mx = Math.max(mx, Math.abs((q[0] - a[0]) * (b[1] - a[1]) - (q[1] - a[1]) * (b[0] - a[0])) / L); }); return mx; }
export function refit(sub, prm) {
  const pts = sampleSub(sub), n = pts.length; if (n < 8) return sub;
  let cs = corners(pts, prm.corner, prm.span || 1.0);
  if (!cs.length) { let bi = 0, bd = -1; pts.forEach((p, i) => { if (p[0] > bd) { bd = p[0]; bi = i; } }); cs = [bi]; }   // köşesiz kapalı eğri: en sağ noktadan aç
  const runs = []; for (let k = 0; k < cs.length; k++) { const a = cs[k], b = cs[(k + 1) % cs.length], R = []; let i = a; do { R.push(pts[i]); i = (i + 1) % n; } while (i !== b); R.push(pts[b]); runs.push(R); }
  const segs = [], start = pts[cs[0]], smooth = cs.length === 1;
  runs.forEach((R) => {
    if (R.length < 3 || lineDev(R) <= prm.tolLine) { segs.push({ t: 'L', p: R[R.length - 1] }); return; }
    const k = Math.min(R.length - 1, 6), t1 = V2.norm(V2.sub(R[k], R[0])), t2 = V2.norm(V2.sub(R[R.length - 1 - k], R[R.length - 1]));
    const tt1 = smooth ? V2.norm(V2.sub(R[k], R[R.length - 1 - k])) : t1, tt2 = smooth ? V2.mul(tt1, -1) : t2;   // kapalı düz eğride başlangıç teğeti iki ucta aynı
    fitCubic(R, tt1, tt2, prm.tolFit).forEach((c) => segs.push({ t: 'C', c1: c[1], c2: c[2], p: c[3] })); });
  return cleanSub({ start, segs }, 0, prm.angTol);   // yatay/dikey hizalama + eş doğrultulu doğruları birleştir
}
// harfe göre alt yolları ayır (alt yol kutusunun merkezi harf kutusunda)
export function byLetter(ref, ly, subs) { const L = ref.letters[ly]; return L.map((l) => ({ ch: l.ch, box: l.box, subs: subs.filter((s) => { const b = subBox(s), cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2; return cx >= l.x0 - 2 && cx <= l.x1 + 2 && cy >= l.y0 - 2 && cy <= l.y1 + 2; }) })); }
export function svgOf(layers, W, H, colors) { return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' + Object.entries(layers).map(([ly, subs]) => '<path fill-rule="evenodd" fill="' + colors[ly] + '" d="' + subs.map((s) => subD(s, 1)).join(' ') + '"/>').join('') + '</svg>'; }
export const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
export async function evalSVG(svg, ref, key) {   // SVG'yi JPG ızgarasında rasterle → harf başına IoU/p90/delik + satır IoU + düğüm
  const img = await rgba(Buffer.from(svg)), c = coverage(img, ref.ink), rows = {};
  for (const ly of LOGOS[key].layers) rows[ly] = { satirIoU: lineIoU(ref, c, ly, ref.W, ref.H), harf: compareLayer(ref, c, ly, ref.W, ref.H) };
  return rows;
}
// YOL 2 parametreleri (düğüm ≤ 40/harf için taranarak seçilir): logos.json trace.layer.<katman>
export async function stageTrace(keys) {
  for (const key of keys) { const r = await yol2(key, null, YOL2_PRM[key] || {}), colors = Object.fromEntries(LOGOS[key].layers.map((ly) => [ly, hex(r.ref.ink[ly])])), svg = svgOf(r.subs, r.ref.W, r.ref.H, colors);
    fs.writeFileSync(P(OUT + '/' + key + '-yol2.svg'), svg); const ev = await evalSVG(svg, r.ref, key);
    for (const ly of LOGOS[key].layers) { const bl = byLetter(r.ref, ly, r.subs[ly]); ev[ly].harf.forEach((h, i) => { h.dugum = bl[i].subs.reduce((s, x) => s + x.segs.length, 0); }); }
    fs.writeFileSync(P(OUT + '/' + key + '-yol2.json'), JSON.stringify({ prm: r.prm, kaynak: r.used, renk: colors, olcum: ev }, null, 1));
    for (const ly of LOGOS[key].layers) console.log(key + ' YOL2 ' + ly + ' satır IoU ' + ev[ly].satirIoU + ' · ' + ev[ly].harf.map((h) => h.ch + ' ' + h.iou + '/' + h.p90 + '/' + h.holes.join('=') + '/' + h.dugum).join(' · '));
  }
}

// ---------- build: son SVG (yalnız path, şeffaf, kutuya kırpılmış viewBox) + doğrulama kırpımı + ölçü tablosu
export async function stageBuild() {
  const DOG = OUT + '/dogrulama', rows = []; fs.mkdirSync(P(DOG), { recursive: true });
  const y1of = (key) => (fs.existsSync(P(OUT + '/' + key + '-yol1.json')) ? JSON.parse(fs.readFileSync(P(OUT + '/' + key + '-yol1.json'), 'utf8')) : null);   // YOL 1 (logo fit) sonucu varsa
  const tiles = [];
  for (const key of Object.keys(LOGOS)) {
    const L = LOGOS[key], y1 = y1of(key), r = await yol2(key, null, YOL2_PRM[key] || {}), ref = r.ref, colors = Object.fromEntries(L.layers.map((ly) => [ly, hex(ref.ink[ly])]));
    const all = Object.values(r.subs).flat().map(subBox), bb = [Math.floor(Math.min(...all.map((b) => b[0])) - 1), Math.floor(Math.min(...all.map((b) => b[1])) - 1), Math.ceil(Math.max(...all.map((b) => b[2])) + 1), Math.ceil(Math.max(...all.map((b) => b[3])) + 1)];
    const vw = bb[2] - bb[0], vh = bb[3] - bb[1];
    const body = L.layers.map((ly) => '  <path fill-rule="evenodd" fill="' + colors[ly] + '" d="' + r.subs[ly].map((sb) => subD(sb, 1, bb[0], bb[1])).join(' ') + '"/>').join('\n');
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + vw + ' ' + vh + '" width="' + vw + '" height="' + vh + '">\n  <!-- ' + L.name + ' · YOL 2 (motion-render logo build): kaynak ' + L.jpg + ' · ' + Object.entries(r.used).map(([ly, m]) => ly + ' ← ' + m).join(', ') + ' · gölge yok, düz dolgu, şeffaf · birim = JPG pikseli (kaynakta ' + bb[0] + ', ' + bb[1] + ' kaydırılmış) -->\n' + body + '\n</svg>\n';
    fs.mkdirSync(path.dirname(P(L.out)), { recursive: true }); fs.writeFileSync(P(L.out) + '.part', svg); fs.renameSync(P(L.out) + '.part', P(L.out));
    const full = svgOf(r.subs, ref.W, ref.H, colors), ev = await evalSVG(full, ref, key);
    for (const ly of L.layers) { const bl = byLetter(ref, ly, r.subs[ly]); ev[ly].harf.forEach((h, i) => { h.dugum = bl[i].subs.reduce((a, x) => a + x.segs.length, 0); const f = y1 ? y1.harf.find((q) => q.ly === ly && q.i === i) : null; h.yol1 = f ? { yuz: f.best.fam + ' ' + f.best.wgt, iou: f.best.iou } : null; }); }
    rows.push({ key, ad: L.name, dosya: L.out, viewBox: [0, 0, vw, vh], kaynakKutu: bb, renk: colors, kaynak: r.used, prm: r.prm, olcum: ev, bayt: Buffer.byteLength(svg) });
    // doğrulama: JPG 4× (Lanczos) ↔ SVG 4× ↔ fark (kırmızı)
    const k4 = 4, jpg4 = await rgba(await sharp(P(L.jpg)).resize(ref.W * k4, ref.H * k4, { kernel: 'lanczos3' }).png().toBuffer()), svg4 = await rgba(Buffer.from(full), { density: 72 * k4 });
    const cj = coverage(jpg4, ref.ink), cs = coverage(svg4, ref.ink), W4 = jpg4.W;
    for (const ly of L.layers) ref.letters[ly].forEach((l, i) => {
      const m = 3, x0 = Math.max(0, (l.x0 - m) * k4), y0 = Math.max(0, (l.y0 - m) * k4), x1 = Math.min(W4, (l.x1 + m) * k4), y1 = Math.min(jpg4.H, (l.y1 + m) * k4), w = x1 - x0, h = y1 - y0;
      const pj = Buffer.alloc(w * h * 3), ps = Buffer.alloc(w * h * 3), pd = Buffer.alloc(w * h * 3); let bad = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const gi = (y0 + y) * W4 + x0 + x, o = (y * w + x) * 3;
        for (let c = 0; c < 3; c++) { pj[o + c] = jpg4.d[gi * 4 + c]; const a = svg4.d[gi * 4 + 3] / 255; ps[o + c] = Math.round(svg4.d[gi * 4 + c] * a + 255 * (1 - a)); }
        const a = cj[ly][gi] >= 0.5, b = cs[ly][gi] >= 0.5; if (a !== b) bad++; const col = a !== b ? [224, 32, 47] : a ? [200, 200, 200] : [255, 255, 255]; pd[o] = col[0]; pd[o + 1] = col[1]; pd[o + 2] = col[2]; }
      tiles.push({ key, ly, i, ch: l.ch, w, h, pj, ps, pd, bad: bad / (w * h) });
    });
  }
  // kırpım sayfası: harf başına satır (JPG 4× | SVG 4× | fark), satır yüksekliği 260 px'e ölçeklenir; tam 4× kareler logo-dogrulama/ altında
  const RH = 260, G = 10, rowsImg = [];
  for (const t of tiles) { const nm = t.key + '-' + t.ly + '-' + String(t.i + 1).padStart(2, '0') + '-' + t.ch.replace(/[^A-Za-z]/g, 'x');
    const strip = await sharp({ create: { width: t.w * 3 + 2 * G, height: t.h, channels: 3, background: '#ffffff' } }).composite([{ input: await sharp(t.pj, { raw: { width: t.w, height: t.h, channels: 3 } }).png().toBuffer(), left: 0, top: 0 }, { input: await sharp(t.ps, { raw: { width: t.w, height: t.h, channels: 3 } }).png().toBuffer(), left: t.w + G, top: 0 }, { input: await sharp(t.pd, { raw: { width: t.w, height: t.h, channels: 3 } }).png().toBuffer(), left: 2 * (t.w + G), top: 0 }]).png().toBuffer();
    fs.writeFileSync(P(DOG + '/' + nm + '.png'), strip);
    const sc = RH / t.h, sw = Math.round((t.w * 3 + 2 * G) * sc); rowsImg.push({ buf: await sharp(strip).resize(sw, RH).png().toBuffer(), w: sw, lab: LOGOS[t.key].name + ' ' + (t.ly === 'kirmizi' ? 'kırmızı ' : 'siyah ') + t.ch + ' · fark %' + (100 * t.bad).toFixed(2) + ' · ölçek ' + (4 * sc).toFixed(2) + '×' }); }
  const COLS = 3, LW = Math.max(...rowsImg.map((r) => r.w)), CW = LW + 40, nR = Math.ceil(rowsImg.length / COLS), SW = COLS * CW + 40, SH = 120 + nR * (RH + 54);
  const comp = rowsImg.map((r, k) => ({ input: r.buf, left: 40 + (k % COLS) * CW, top: 120 + Math.floor(k / COLS) * (RH + 54) + 30 }));
  const esc = (x) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const labels = '<svg xmlns="http://www.w3.org/2000/svg" width="' + SW + '" height="' + SH + '"><style>text{font-family:Arial,sans-serif}</style><text x="40" y="52" font-size="34" font-weight="700">logo doğrulama — her satır: kaynak 4× (Lanczos) | SVG 4× | fark (kırmızı = maske farkı)</text><text x="40" y="92" font-size="22" fill="#555">' + esc(Object.values(LOGOS).map((L) => L.out).join(' · ')) + ' · YOL 2 (izleme + yol temizliği) · tam 4× kareler ' + esc(DOG) + '/</text>' +
    rowsImg.map((r, k) => '<text x="' + (40 + (k % COLS) * CW) + '" y="' + (120 + Math.floor(k / COLS) * (RH + 54) + 22) + '" font-size="22">' + esc(r.lab) + '</text>').join('') + '</svg>';
  await sharp({ create: { width: SW, height: SH, channels: 3, background: '#f4f4f2' } }).composite([{ input: Buffer.from(labels), left: 0, top: 0 }, ...comp]).png().toFile(P(OUT + '/logo-dogrulama.png'));
  fs.writeFileSync(P(OUT + '/logo-olcum.json'), JSON.stringify(rows, null, 1));
  for (const R of rows) for (const ly of LOGOS[R.key].layers) console.log(R.key + ' ' + ly + ' satır IoU ' + R.olcum[ly].satirIoU + ' · ' + R.olcum[ly].harf.map((h) => h.ch + ' ' + h.iou + '/' + h.p90 + '/' + (h.holes[0] === h.holes[1] ? 'd' + h.holes[0] : 'D' + h.holes.join('≠')) + '/' + h.dugum).join(' · '));
  console.log('✓ ' + rows.map((r) => r.dosya + ' (' + r.bayt + ' B, viewBox ' + r.viewBox.slice(2).join('×') + ', ' + JSON.stringify(r.renk) + ')').join(' · ') + ' · ' + OUT + '/logo-dogrulama.png');
}
