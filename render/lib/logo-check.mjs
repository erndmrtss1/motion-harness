// lib/logo-check.mjs — logo varlığı doğrulaması (DUR koşulu): `motion-render logo check <logo.svg> --ref <referans.jpg> [--px 330] [--ss 2] [--band 0.86] [--map ox,oy] [--rmin 25] [--out D]`
// Ölçer: (1) dosya: gerçek SVG mi (magic), <image>/base64 raster, <text> (yola çevrilmemiş yazı), filtre/maske/gölge katmanı, şekil sayısı, viewBox, dolgu renkleri;
//   (2) glif kutusu (viewBox biriminde, kaplama ≥ 0.5); (3) referans raster ile IoU (kutular hizalanır; referans mürekkep maskesi = kırmızı ya da koyu, gri gölge hariç);
//   (4) delik sayısı (bileşenler soldan sağa, her birinin iç boşluk sayısı) SVG ↔ referans; (5) kenar dalgası: glif yüksekliği --px (1080p ekran) × --ss dokuda
//   rasterlenir, kaplama 0.5 eş-eğrisinin satır/sütun kesişimleri zincirlenir, ±6 px yerel ikinci derece uyum artığı (ekran px) → p99 / en büyük;
//   --map ox,oy: vektörün viewBox birimi = referans pikseli, kaynak kaydırması (ox, oy) biliniyorsa tam eşleme (motion-render logo build çıktıları);
//   verilmezse glif kutusu eşlemi + alt piksel hizalama araması (kayma ±1 px, eksen ölçeği ±%0.4). --rmin 25: eğrilik yarıçapı < 25 ekran px olan pencereler
//   (köşe, serif bağı) dalgaya sayılmaz. --band: alt satır glif kutusunun bu oranından aşağısı ayrıca raporlanır. Eşikler: IoU ≥ 0.98, delik birebir, dalga ≤ 0.3 px.
// Bağımsız denetçi ön koşulu: ölçer kendi yöntemiyle (farklı rasterleyici/zemin) ölçer; ölçer de kontrol dosyasıyla kalibre edilir.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export async function logoCheck(ROOT, SRC, o = {}) {
const MAP = o.map ? String(o.map).split(',').map(Number) : null, RMIN = +(o.rmin ?? 25), REF = o.ref || null, PX = +(o.px ?? 330), SS = +(o.ss ?? 2), BAND = o.band != null ? +o.band : null;
const OUT = o.out || path.join('out/probe/logo-check', path.basename(SRC).replace(/\.[^.]+$/, '').replace(/\s+/g, '-'));
fs.mkdirSync(path.resolve(ROOT, OUT), { recursive: true });
const buf = fs.readFileSync(path.resolve(ROOT, SRC)), head = buf.subarray(0, 16);
const R = { file: SRC, bytes: buf.length, gecer: true, neden: [] };
const fail = (m) => { R.gecer = false; R.neden.push(m); };
// (1) dosya
R.magic = head[0] === 0xff && head[1] === 0xd8 ? 'JPEG' : head.subarray(0, 4).toString('hex') === '89504e47' ? 'PNG' : /<svg|<\?xml/i.test(buf.subarray(0, 512).toString('utf8')) ? 'SVG' : '?';
if (R.magic !== 'SVG') { fail('dosya SVG değil (içerik ' + R.magic + ', uzantı ' + path.extname(SRC) + ')'); }
const txt = R.magic === 'SVG' ? buf.toString('utf8') : '';
const count = (re) => (txt.match(re) || []).length;
R.etiket = { image: count(/<image\b/g), base64: count(/base64,/g), text: count(/<text\b/g), filter: count(/<filter\b/g), mask: count(/<mask\b/g), clipPath: count(/<clipPath\b/g), gradient: count(/<(linear|radial)Gradient\b/g),
  path: count(/<path\b/g), rect: count(/<rect\b/g), circle: count(/<circle\b/g), ellipse: count(/<ellipse\b/g), polygon: count(/<polygon\b/g), polyline: count(/<polyline\b/g), line: count(/<line\b/g), use: count(/<use\b/g) };
R.viewBox = (/viewBox="([^"]+)"/.exec(txt) || [])[1] || null;
R.dolgu = [...new Set([...txt.matchAll(/fill(?:="|:\s*)(#[0-9a-fA-F]{3,8}|rgb\([^)]*\)|[a-z]+)/g)].map((m) => m[1].toLowerCase()))].filter((c) => c !== 'none');
if (R.etiket.image || R.etiket.base64) fail('raster gömülü: <image> ' + R.etiket.image + ' · base64 ' + R.etiket.base64 + ' (vektör değil)');
if (R.etiket.text) fail('<text> var: yazı yola çevrilmemiş (' + R.etiket.text + ')');
if (R.magic === 'SVG' && !R.etiket.image) { const geo = txt.replace(/<clipPath[\s\S]*?<\/clipPath>/g, '').replace(/<mask[\s\S]*?<\/mask>/g, ''), shapes = (geo.match(/<(path|rect|circle|ellipse|polygon|polyline)\b/g) || []).length; R.sekil = shapes; if (!shapes) fail('glif şekli yok'); }
if (R.etiket.filter || R.etiket.mask) R.not = 'filtre/maske katmanı var (gölge/efekt) — filmde kaldırılır, logo düz basılır';

async function cov(input, opts, ink) {   // kaplama 0..1: saydamsa alfa; opaksa (ya da ink: true → beyaza bindirilmiş) mürekkep (kırmızı ya da koyu; açık gri gölge hariç)
  const img = ink ? sharp(input, opts).flatten({ background: '#ffffff' }).ensureAlpha() : sharp(input, opts).ensureAlpha(), { data, info } = await img.raw().toBuffer({ resolveWithObject: true }), W = info.width, H = info.height, c = new Float32Array(W * H);
  let opaque = 0; for (let i = 0; i < W * H; i++) if (data[i * 4 + 3] > 250) opaque++;
  const useA = !ink && opaque / (W * H) < 0.97;
  for (let i = 0; i < W * H; i++) { const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], a = data[i * 4 + 3] / 255;
    if (useA) { c[i] = a; continue; }
    const red = Math.max(0, Math.min(1, (r - g) / 185)), lum = 0.2126 * r + 0.7152 * g + 0.0722 * b, dark = Math.max(0, Math.min(1, (190 - lum) / 162)) * (1 - red); c[i] = a * Math.max(red, dark); }   // doğrusal kırmızı (R−G mürekkep ≈ 185) · koyu: gölge dizi (L > 190) dışarıda; iki taraf aynı işlevle   // saydam piksel (rgb 0) koyu sayılmaz
  return { c, W, H, useA };
}
const bbox = (C, th = 0.5) => { let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (let y = 0; y < C.H; y++) for (let x = 0; x < C.W; x++) if (C.c[y * C.W + x] >= th) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return x1 < 0 ? null : [x0, y0, x1 + 1, y1 + 1]; };
function comps(C, th = 0.5) {   // ön plan bileşenleri (8-komşu) + her birinin delik sayısı (arka plan 4-komşu, kenara değmeyen)
  const W = C.W, H = C.H, fg = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) fg[i] = C.c[i] >= th ? 1 : 0;
  const lab = new Int32Array(W * H).fill(-1), out = []; let n = 0;
  for (let s = 0; s < W * H; s++) { if (!fg[s] || lab[s] >= 0) continue; const st = [s]; lab[s] = n; let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, area = 0;
    while (st.length) { const p = st.pop(), x = p % W, y = (p - x) / W; area++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const q = yy * W + xx; if (fg[q] && lab[q] < 0) { lab[q] = n; st.push(q); } } }
    out.push({ id: n, x0, x1, y0, y1, area }); n++; }
  const bl = new Int32Array(W * H).fill(-1); let hb = 0;   // arka plan bölgeleri
  for (let s = 0; s < W * H; s++) { if (fg[s] || bl[s] >= 0) continue; const st = [s]; bl[s] = hb; let edge = false, owner = -1, area = 0;
    while (st.length) { const p = st.pop(), x = p % W, y = (p - x) / W; area++; if (x === 0 || y === 0 || x === W - 1 || y === H - 1) edge = true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const q = yy * W + xx; if (fg[q]) { if (owner < 0) owner = lab[q]; } else if (bl[q] < 0) { bl[q] = hb; st.push(q); } } }
    if (!edge && owner >= 0 && area >= 4) out[owner].holes = (out[owner].holes || 0) + 1; hb++; }
  const big = out.filter((o) => o.area >= 0.0005 * W * H).sort((a, b) => a.x0 - b.x0 || a.y0 - b.y0);
  return big.map((o) => ({ x: o.x0, y: o.y0, w: o.x1 - o.x0 + 1, h: o.y1 - o.y0 + 1, holes: o.holes || 0 }));
}
function polyAt(P, k, hw, deg) {   // P[k ± hw] noktalarına deg dereceli en küçük kareler; u = 0'daki değer
  const n = deg + 1, A = Array.from({ length: n }, () => new Float64Array(n + 1));
  for (let j = -hw; j <= hw; j++) { const u = j / hw, y = P[k + j][1], pw = [1]; for (let d = 1; d < 2 * n; d++) pw.push(pw[d - 1] * u); for (let r = 0; r < n; r++) { for (let c = 0; c < n; c++) A[r][c] += pw[r + c]; A[r][n] += pw[r] * y; } }
  for (let c = 0; c < n; c++) { let m = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[m][c])) m = r; [A[c], A[m]] = [A[m], A[c]]; for (let r = 0; r < n; r++) { if (r === c) continue; const f = A[r][c] / A[c][c]; for (let k2 = c; k2 <= n; k2++) A[r][k2] -= f * A[c][k2]; } }
  const c = A.map((row, r) => row[n] / row[r]); polyAt.c = c; return c[0];   // c: katsayılar (u = j / hw)
}
function wave(C, scaleToScreen, band) {   // kaplama 0.5 eş-eğrisinin satır (dikeye yakın kenar) ve sütun (yataya yakın) kesişimleri → zincir → yerel polinom uyum artığı (ekran px)
  const W = C.W, H = C.H, v = (x, y) => C.c[y * W + x];
  const WIN = [['kisa', Math.max(4, Math.round(6 / scaleToScreen)), 2], ['uzun', Math.max(8, Math.round(15 / scaleToScreen)), 3]];
  const res = {}; WIN.forEach(([k]) => { res[k] = { ust: [], alt: [] }; });
  const chainsOf = (N, M, at) => { let prev = []; const chains = [];
    for (let i = 0; i < N; i++) { const cur = []; for (let j = 0; j < M - 1; j++) { const a = at(i, j), b = at(i, j + 1); if ((a - 0.5) * (b - 0.5) < 0) cur.push({ p: j + (0.5 - a) / (b - a), up: b > a, ch: null }); }
      cur.forEach((c) => { let best = null, bd = 1.5; prev.forEach((q) => { const d = Math.abs(q.p - c.p); if (q.up === c.up && d < bd && !q.taken) { bd = d; best = q; } }); if (best) { best.taken = true; c.ch = best.ch; c.ch.pts.push([i, c.p]); } else { c.ch = { pts: [[i, c.p]] }; chains.push(c.ch); } });
      prev = cur; }
    return chains; };
  const rows = chainsOf(H, W, (i, j) => v(j, i)).map((ch) => ({ ch, yOf: (pt) => pt[0] })), cols = chainsOf(W, H, (i, j) => v(i, j)).map((ch) => ({ ch, yOf: (pt) => pt[1] }));
  [...rows, ...cols].forEach(({ ch, yOf }) => { const P = ch.pts.slice(3, -3);
    WIN.forEach(([key, hw, deg]) => { if (P.length < 2 * hw + 1) return; for (let k = hw; k < P.length - hw; k++) { const fit = polyAt(P, k, hw, deg), c = polyAt.c, y2 = Math.max(Math.abs(2 * (c[2] || 0) - 6 * (c[3] || 0)), Math.abs(2 * (c[2] || 0) + 6 * (c[3] || 0))) / (hw * hw), Rk = y2 > 0 ? (1 / y2) * scaleToScreen : 1e9; if (Rk < RMIN) continue;   /* köşe / serif bağı (eğrilik yarıçapı < RMIN ekran px): dalga değil, biçim */ const r = Math.abs(P[k][1] - fit) * scaleToScreen; (band != null && yOf(P[k]) >= band ? res[key].alt : res[key].ust).push(r); } }); });
  const st = (a) => { if (!a.length) return null; const s2 = [...a].sort((x, y) => x - y); return { n: s2.length, p99: +s2[Math.floor(s2.length * 0.99)].toFixed(3), max: +s2[s2.length - 1].toFixed(3) }; };
  const out = {}; WIN.forEach(([key, hw, deg]) => { out[key] = { pencere_px: +(hw * scaleToScreen).toFixed(1), derece: deg, ust: st(res[key].ust), alt: st(res[key].alt) }; });
  out.p99 = Math.max(...WIN.flatMap(([key]) => [res[key].ust, res[key].alt].map((a) => (st(a) || { p99: 0 }).p99)));
  return out;
}
  let C = null;
  if (R.magic === 'SVG' || R.magic === 'JPEG' || R.magic === 'PNG') {
    // glif kutusu ve dalga: glif yüksekliği PX·SS olacak şekilde rasterle
    const probe = await cov(buf, R.magic === 'SVG' ? { density: 72 } : undefined), bb0 = bbox(probe);
    if (!bb0) fail('boş görüntü'); else {
      const k = (PX * SS) / (bb0[3] - bb0[1]), dens = R.magic === 'SVG' ? 72 * k : null;
      R._dens = dens; C = R.magic === 'SVG' ? await cov(buf, { density: Math.min(2400, dens) }) : await cov(await sharp(buf).resize(Math.round(probe.W * k)).toBuffer());
      const bb = bbox(C), sx = R.viewBox ? R.viewBox.split(/[\s,]+/).map(Number) : null;
      R.glif_px = bb; if (sx) { const u = sx[2] / C.W; R.glif_viewBox = bb.map((v, i) => +((i % 2 ? sx[1] : sx[0]) + v * u).toFixed(2)); }
      R.olcek = { glif_yukseklik_ekran_px: PX, ss: SS, raster: C.W + '×' + C.H, kaplama: C.useA ? 'alfa' : 'mürekkep (opak zemin)' };
      const yb = BAND != null ? bb[1] + BAND * (bb[3] - bb[1]) : null;
      R.dalga = wave(C, 1 / SS, yb);
      const wp = R.dalga.p99;
      if (wp > 0.3) fail('kenar dalgası p99 ' + wp + ' px > 0.3 (1080p, S' + SS + ')');
      const crop = await sharp(Buffer.from(C.c.map((x) => 255 - Math.round(255 * Math.min(1, x)))), { raw: { width: C.W, height: C.H, channels: 1 } }).png().toBuffer();
      fs.writeFileSync(path.resolve(ROOT, OUT, 'kaplama.png'), crop);
    }
  }
  if (REF && C) {   // IoU + delik: iki maske glif kutusuna hizalanır, ortak ızgara (referans çözünürlüğü)
    const Rf = await cov(path.resolve(ROOT, REF), undefined, true), rb = bbox(Rf);
    // IoU için vektör de beyaza bindirilip aynı mürekkep işleviyle ölçülür (alfa ↔ mürekkep yanlılığı yok)
    const Ci = R.magic === 'SVG' ? await cov(buf, { density: Math.min(2400, R._dens || 72) }, true) : C; const sb = bbox(Ci);
    const Wr = rb[2] - rb[0], Hr = rb[3] - rb[1], A = new Uint8Array(Wr * Hr), B = new Uint8Array(Wr * Hr); let fx = (sb[2] - sb[0]) / Wr, fy = (sb[3] - sb[1]) / Hr, cxs = (sb[0] + sb[2]) / 2, cys = (sb[1] + sb[3]) / 2, mr = [(rb[0] + rb[2]) / 2, (rb[1] + rb[3]) / 2];
    for (let y = 0; y < Hr; y++) for (let x = 0; x < Wr; x++) A[y * Wr + x] = Rf.c[(rb[1] + y) * Rf.W + rb[0] + x] >= 0.5 ? 1 : 0;
    // hizalama: glif kutusu eşlemi + alt piksel arama (kayma ±1 px, eksen ölçeği ±%0.4; seyrek ızgara, en yakın örnek) → en iyi parametrede alan ortalamalı kaplama
    const mapX = (x, P) => cxs + (rb[0] + x + 0.5 - mr[0] + P[0]) * fx * (1 + P[2]), mapY = (y, P) => cys + (rb[1] + y + 0.5 - mr[1] + P[1]) * fy * (1 + P[3]);
    const quick = (P) => { let I = 0, U = 0; for (let y = 0; y < Hr; y += 2) for (let x = 0; x < Wr; x += 2) { const X = Math.min(Ci.W - 1, Math.max(0, Math.floor(mapX(x, P)))), Y = Math.min(Ci.H - 1, Math.max(0, Math.floor(mapY(y, P)))), a = A[y * Wr + x], b = Ci.c[Y * Ci.W + X] >= 0.5 ? 1 : 0; I += a & b; U += a | b; } return U ? I / U : 0; };
    let best = [0, 0, 0, 0], bv = quick(best);
    if (MAP) { const vb = R.viewBox.split(/[\s,]+/).map(Number), kx = Ci.W / vb[2], ky = Ci.H / vb[3]; fx = kx; fy = ky; cxs = (mr[0] - MAP[0]) * kx; cys = (mr[1] - MAP[1]) * ky;   /* ölçek gerçek render boyutundan (sharp tam sayıya yuvarlar; yoğunluktan değil) */ bv = 2; R.hizalama_kaynak = "tam eşleme (--map " + MAP.join(",") + ": viewBox birimi = referans pikseli)"; if (process.env.LC_DEBUG) console.log("DBG", JSON.stringify({ kx, ky, CiW: Ci.W, CiH: Ci.H, rb, mr, cxs, cys, dens: R._dens, sb })); }   // bilinen eşleme: arama yok
    // hata #2 düzeltmesi: alt piksel hizalama araması kaynakta yorumun içinde kalmıştı (hiç çalışmıyordu, best = [0,0,0,0]) — artık --map yokken çalışır
    if (!MAP) for (const d0 of [-1, -0.5, 0, 0.5, 1]) for (const d1 of [-1, -0.5, 0, 0.5, 1]) for (const s0 of [-0.004, 0, 0.004]) for (const s1 of [-0.004, 0, 0.004]) { const P0 = [d0, d1, s0, s1], v = quick(P0); if (v > bv) { bv = v; best = P0; } }
    if (!MAP) R.hizalama_kaynak = 'glif kutusu eşlemi + alt piksel arama (±1 px, ±%0.4; seyrek IoU ' + bv.toFixed(4) + ')';
    const ov = (a0, a1, j) => Math.max(0, Math.min(a1, j + 1) - Math.max(a0, j));   // kısmi piksel örtüşmesi
    for (let y = 0; y < Hr; y++) for (let x = 0; x < Wr; x++) { const X0 = mapX(x - 0.5, best), X1 = mapX(x + 0.5, best), Y0 = mapY(y - 0.5, best), Y1 = mapY(y + 0.5, best); let acc = 0, wsum = 0;   // alan ortalaması: pencere sınırları kesirli (tam sayıya yuvarlama ½ px kaydırıyordu)
      for (let Y = Math.max(0, Math.floor(Y0)); Y < Math.min(Ci.H, Math.ceil(Y1)); Y++) { const wy = ov(Y0, Y1, Y); if (!wy) continue; for (let X = Math.max(0, Math.floor(X0)); X < Math.min(Ci.W, Math.ceil(X1)); X++) { const w = wy * ov(X0, X1, X); acc += w * Ci.c[Y * Ci.W + X]; wsum += w; } }
      B[y * Wr + x] = wsum && acc / wsum >= 0.5 ? 1 : 0; }
    R.hizalama = { kayma_px: best.slice(0, 2), olcek: best.slice(2) };
    let I = 0, U = 0; for (let i = 0; i < A.length; i++) { I += A[i] & B[i]; U += A[i] | B[i]; }
    R.iou = +(I / U).toFixed(4); R.oran_fark = +(((sb[2] - sb[0]) / (sb[3] - sb[1])) / (Wr / Hr) - 1).toFixed(4); if (R.iou < 0.98) fail('IoU ' + R.iou + ' < 0.98');
    const ca = comps({ c: Float32Array.from(A), W: Wr, H: Hr }), cb = comps({ c: Float32Array.from(B), W: Wr, H: Hr });
    R.delik = { ref: ca.map((o) => o.holes), svg: cb.map((o) => o.holes), bilesen: [ca.length, cb.length] };
    const bad = []; for (let i = 0; i < Math.max(ca.length, cb.length); i++) if (!ca[i] || !cb[i] || ca[i].holes !== cb[i].holes) bad.push({ sira: i + 1, x: ca[i] ? ca[i].x : cb[i].x, ref: ca[i] ? ca[i].holes : null, svg: cb[i] ? cb[i].holes : null });
    if (bad.length) fail('delik sayısı farklı: bileşen ' + bad.map((b) => '#' + b.sira + ' (x≈' + b.x + ' px) ref ' + b.ref + ' / svg ' + b.svg).join(', '));
    R.delik.fark = bad;
  }
  delete R._dens; const outJ = path.resolve(ROOT, OUT, 'olcum.json'); R.out = OUT; fs.writeFileSync(outJ + '.part', JSON.stringify(R, null, 1)); fs.renameSync(outJ + '.part', outJ);
  console.log((R.gecer ? '✓ GEÇER' : '✗ GEÇMEZ') + ' · ' + SRC + ' · ' + JSON.stringify({ magic: R.magic, etiket: R.etiket, viewBox: R.viewBox, glif: R.glif_viewBox, iou: R.iou, delik: R.delik && [R.delik.ref.join(''), R.delik.svg.join('')], dalga: R.dalga, dolgu: R.dolgu }));
  R.neden.forEach((n) => console.log('  ✗ ' + n)); if (R.not) console.log('  ! ' + R.not);
  return R;
}
