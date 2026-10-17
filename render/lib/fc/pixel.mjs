// lib/fc/pixel.mjs — Katman A: piksel / zaman tipleri (render sonrası; kare dizini ya da mp4). Yöntemler A3 §2'deki kaynak
// betiklerle aynı (ölçü yolu, eşik, oran tanımı); dosya:satır göndermeleri yorumlarda.
//   luma · black · temporal · ramp · seam · identical · edgeDark · accentLocation · accentColor · sharpness · stroke · motion · overlapPx
import fs from 'node:fs';
import path from 'node:path';
import { OUT, SCENES, sceneById, readTimeline } from '../project.mjs';
import {
  readRaw, lumaPlane, meanLumaPct, diffStats, maxChannel, highpassSd, percentile, median, classMask, maskBox, resolveClass,
  rgb2lab, deltaE2000, hex2rgb, rgb2hex, mp4Gray, mp4FrameRGB, rgb48Frame, down2, diffMap, writePng,
} from '../img.mjs';
import {
  verdict, unmeasured, pass, deref, hookName, pickFrames, frameSource, available, framesDirFor, resolveRefDir, mp4For, classesFor,
  r2, r3, FPS, WIDTH, HEIGHT, ROOT, pad5,
} from './common.mjs';
import { PAGE } from './design.mjs';

const KF = FPS / 30;
const sec2f = (s) => Math.round(s * FPS);
async function frameSet(c, ctx, { src: srcOpt } = {}) {
  const src = srcOpt || frameSource(c, ctx);
  if (src.missing) return { error: src.missing };
  const frames = pickFrames(c, ctx.frames, ctx), { have, missing } = available(src, frames);
  if (!have.length) return { error: 'ölçülecek kare yok (' + (src.label || src.kind) + (missing.length ? ', eksik ' + missing.length : '') + ')' };
  return { src, have, missing };
}
// bölge [x, y, w, h] (1080p) → ölçek koordinatı [x0, y0, x1, y1] (dahil)
function regionAt(region, img) {
  if (!region) return [0, 0, img.W - 1, img.H - 1];
  const sx = img.W / WIDTH, sy = img.H / HEIGHT, [x, y, w, h] = region;
  return [Math.max(0, Math.floor(x * sx)), Math.max(0, Math.floor(y * sy)), Math.min(img.W - 1, Math.ceil((x + w) * sx) - 1), Math.min(img.H - 1, Math.ceil((y + h) * sy) - 1)];
}
const series = (fr, v, max = 600) => (fr.length <= max ? Object.fromEntries(fr.map((f, i) => [f, r2(v[i])])) : undefined);
const missNote = (m) => (m && m.length ? ' · eksik kare ' + m.length : '');

// ── 1 luma ── lumraw.mjs:7 (qc ölçü yolu), lumsplit.mjs:6-8 (koyu pay, 480×270), review-anim2/luma.cjs (ızgara), texstat/meas (hp)
async function luma(c, ctx) {
  const S = await frameSet(c, ctx); if (S.error) return unmeasured(c, S.error);
  // bant penceresi qc ile aynı: açılış (blackStart) ve çıkış (layer.exit) dışarıda; window:"all" hepsini ölçer
  if (c.window !== 'all') {
    const sc = ctx.scene, openF = sc.blackStart ? Math.round(15 * KF) : 0, ex = sc.layer && sc.layer.exit, exitF = ex != null && ex * FPS < ctx.frames ? Math.round(ex * FPS) : ctx.frames;
    const inW = S.have.filter((f) => f >= openF && f < exitF); if (inW.length) S.have = inW;
  }
  const band = c.band !== undefined ? deref(c.band, ctx) : ctx.W.band, stat = c.stat || 'mean', scale = c.scale || (c.darkShare ? 'fast' : 'qc');
  const vals = [], dark = [], grids = [], viol = [];
  for (const f of S.have) {
    const img = await S.src.read(f, scale), Y = lumaPlane(img), [x0, y0, x1, y1] = regionAt(c.region, img);
    const pick = (X0, Y0, X1, Y1) => { const a = []; for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) a.push(Y[y * img.W + x]); return a; };
    const st = (X0, Y0, X1, Y1) => {
      if (stat === 'hp') return highpassSd(Y, img.W, img.H, c.hpRadius || 4, [X0, Y0, X1 + 1, Y1 + 1]);
      if (stat === 'p90') return (percentile(pick(X0, Y0, X1, Y1), 0.9) / 255) * 100;
      if (!c.region && stat === 'mean') return meanLumaPct(img);
      let s = 0, n = 0; for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) { s += Y[y * img.W + x]; n++; } return (100 * s) / n / 255;
    };
    const v = st(x0, y0, x1, y1); vals.push(v);
    if (c.darkShare) { const below = (c.darkShare.below != null ? c.darkShare.below : 35) * 2.55; let d = 0, n = 0; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { n++; if (Y[y * img.W + x] < below) d++; } dark.push(d / n); }
    if (c.grid) {
      const [gc, gr] = c.grid, cells = [];
      for (let j = 0; j < gr; j++) for (let i = 0; i < gc; i++) cells.push(st(x0 + Math.floor(((x1 - x0 + 1) * i) / gc), y0 + Math.floor(((y1 - y0 + 1) * j) / gr), x0 + Math.floor(((x1 - x0 + 1) * (i + 1)) / gc) - 1, y0 + Math.floor(((y1 - y0 + 1) * (j + 1)) / gr) - 1));
      grids.push({ f, min: r2(Math.min(...cells)), max: r2(Math.max(...cells)), ratio: r3(Math.max(...cells) / Math.max(1e-9, Math.min(...cells))) });
    }
  }
  const lo = band ? band[0] : c.min != null ? c.min : null, hi = c.max != null ? c.max : band ? band[1] : null, report = c.report || (band || c.max != null || c.min != null ? 'overFrames' : 'mean');
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  let pk = 0; vals.forEach((v, i) => { if (v > vals[pk]) pk = i; });
  if (report === 'mean') { if ((lo != null && mean < lo) || (hi != null && mean > hi)) viol.push({ rule: 'ortalama', v: r2(mean), band: [lo, hi] }); }
  else S.have.forEach((f, i) => { if ((lo != null && vals[i] < lo) || (hi != null && vals[i] > hi)) viol.push({ f, v: r2(vals[i]), band: [lo, hi] }); });
  if (c.darkShare && c.darkShare.max != null) S.have.forEach((f, i) => { if (dark[i] > c.darkShare.max) viol.push({ f, rule: 'koyu pay', v: r3(dark[i]), max: c.darkShare.max }); });
  if (c.gridMaxRatio != null) grids.forEach((g) => { if (g.ratio > c.gridMaxRatio) viol.push({ f: g.f, rule: 'ızgara oranı', v: g.ratio, max: c.gridMaxRatio }); });
  return verdict(c, ctx, stat + ' ort %' + r2(mean) + ' · tepe %' + r2(vals[pk]) + ' @f' + S.have[pk] + (hi != null || lo != null ? ' · [' + lo + ', ' + hi + '] dışı ' + viol.length + ' kare' : '') + missNote(S.missing),
    { scale, stat, frames: S.have.length, mean: r2(mean), peak: { v: r2(vals[pk]), f: S.have[pk] }, min: r2(Math.min(...vals)), band: [lo, hi], series: series(S.have, vals),
      darkShare: dark.length ? series(S.have, dark.map(r3)) : undefined, grid: grids.length ? grids : undefined, sampled: S.have, missing: S.missing.length || undefined }, viol);
}

// ── 2 black ── qc.mjs:87,141-147,152-158,198-206 (boş siyah > %70, kesintisiz > 30·KF; son kare ham ≤ 2, mp4 0); son N kare Y (f10-chain.sh:37)
async function black(c, ctx) {
  const S = await frameSet(Object.assign({ step: 1 }, c), ctx); if (S.error) return unmeasured(c, S.error);
  const sc = ctx.scene, N = ctx.frames, emptyMax = c.emptyMax != null ? c.emptyMax : 0.7, runMax = c.runMax != null ? c.runMax : sec2f(1.0);
  const openF = sc.blackStart ? Math.round(15 * KF) : 0, ex = sc.layer && sc.layer.exit, exitF = ex != null && ex * FPS < N ? Math.round(ex * FPS) : N;
  const empty = new Map(), lum = new Map(), bright = new Map();
  for (const f of S.have) {
    const img = await S.src.read(f, 'qc'), Y = lumaPlane(img); let e = 0, b = 0, s = 0;
    for (let k = 0; k < Y.length; k++) { const v = Y[k]; s += v; if (v < 15.3) e++; if (v > 77) b++; }
    empty.set(f, e / Y.length); lum.set(f, (100 * s) / Y.length / 255); bright.set(f, b / Y.length);
  }
  const viol = [], runs = [], dark = [];
  const runScan = (pred, minLen, out) => { let r0 = null, prev = null; for (const f of [...S.have, Infinity]) { const on = f !== Infinity && pred(f); if (on && r0 == null) r0 = f; if (r0 != null && (!on || (prev != null && f !== prev + 1))) { if (prev - r0 + 1 > minLen) out.push([r0, prev]); r0 = on ? f : null; } prev = f; } };
  runScan((f) => f >= openF && f < exitF && empty.get(f) > emptyMax, runMax, runs);
  runs.forEach((r) => viol.push({ f: r[0], rule: 'boş siyah', run: r, frames: r[1] - r[0] + 1 }));
  if (c.dark !== false) { runScan((f) => f >= openF && f < exitF && lum.get(f) < 8 && bright.get(f) < 0.0005, Math.round(15 * KF), dark); dark.forEach((r) => viol.push({ f: r[0], rule: 'karanlık', run: r })); }
  const cells = S.have.filter((f) => f % 12 === 0 && f >= openF && f < exitF && empty.get(f) > emptyMax);
  const last = {}, L = c.last === false ? null : Object.assign({ rawMax: 2, mp4Max: 0, n: 8 }, c.last || {});
  if (L && !sc.slice) {
    const fsrc = frameSource({ src: 'frames' }, ctx);
    if (!fsrc.missing && fsrc.has(N - 1)) { last.rawMax = maxChannel((await readRaw(fsrc.file(N - 1))).data); if (last.rawMax > L.rawMax) viol.push({ f: N - 1, rule: 'son kare ham', v: last.rawMax, max: L.rawMax }); }
    const mp4 = mp4For({}, ctx);
    if (mp4 && fs.existsSync(mp4)) {
      last.mp4Max = maxChannel((await mp4FrameRGB(mp4, N - 1)).data); if (last.mp4Max > L.mp4Max) viol.push({ f: N - 1, rule: 'son kare mp4', v: last.mp4Max, max: L.mp4Max });
      const ys = mp4Gray(mp4, Math.max(0, N - L.n), N - 1, { w: 480, h: 270, flags: null }).map((b) => { let s = 0; for (let i = 0; i < b.length; i++) s += b[i]; return s / b.length; });
      last.yLast = ys.map(r2); if (L.yMax != null && Math.max(...ys) > L.yMax) viol.push({ f: N - 1, rule: 'son kareler Y', v: r2(Math.max(...ys)), max: L.yMax });
    }
  }
  const mx = Math.max(0, ...S.have.filter((f) => f >= openF && f < exitF).map((f) => empty.get(f)));
  const res = verdict(c, ctx, 'boş siyah en çok %' + Math.round(mx * 100) + ' · koşu ' + runs.length + ' · karanlık ' + dark.length + (last.rawMax != null ? ' · son kare ham ' + last.rawMax : '') + (last.mp4Max != null ? ' / mp4 ' + last.mp4Max : '') + missNote(S.missing),
    { frames: S.have.length, emptyMax, runMax, maxEmpty: r3(mx), runs, darkRuns: dark, cells, last, sampled: S.have }, viol);
  if (res.status === 'pass' && cells.length) return Object.assign(res, { status: 'warn', summary: res.summary + ' · kontak hücresinde > %' + Math.round(emptyMax * 100) + ': ' + cells.length });
  return res;
}

// ── 3 temporal ── seam12.mjs:8-14 (mp4 Y 960×540 area, oran d_i/max(komşu, 0.02) ≤ 1.5), yplane.mjs:5-9 (meanY, taban 0.05),
//    edgeE.mjs:6-12 (kenar enerjisi), pairdiff.mjs:6-12 (küresel pozlama), dup.js:7-12, spikes.js:6, a3review/analyze.mjs:35-36
async function grayFrames(c, ctx, frames, src, metric) {
  if (src.kind !== 'frames') {
    const w = c.w || (metric === 'meanY' ? 480 : 960), h = c.h || (metric === 'meanY' ? 270 : 540), flags = c.flags !== undefined ? c.flags : metric === 'meanY' ? null : 'area';
    const a = frames[0], b = frames[frames.length - 1], all = mp4Gray(src.mp4, a, b, { w, h, flags });
    return frames.map((f) => ({ data: all[f - a], W: w, H: h, C: 1 }));
  }
  const scale = c.scale || (metric === 'edgeEnergy' ? 'edge' : metric === 'globalExposure' ? 'half' : 'fast'), out = [];
  for (const f of frames) {
    if (metric === 'globalExposure' || c.channels === 'luma') { const img = await src.read(f, scale); out.push({ data: lumaPlane(img), W: img.W, H: img.H, C: 1 }); }
    else out.push(await src.read(f, scale, { gray: c.channels !== 'rgb' }));
  }
  return out;
}
function ratioScan(d, floor) {
  let worst = 0, at = null; const q = d.map((v, i) => (i && i < d.length - 1 ? v / Math.max(d[i - 1], d[i + 1], floor) : null));
  q.forEach((v, i) => { if (v != null && v > worst) { worst = v; at = i; } });
  return { q, worst, at };
}
async function temporalSeries(c, ctx, frames, src, metric, camSpeed) {
  const F = await grayFrames(c, ctx, frames, src, metric), out = { frames };
  if (metric === 'edgeEnergy') {
    const E = F.map((g) => { let s = 0; for (let y = 1; y < g.H; y++) for (let x = 1; x < g.W; x++) { const i = y * g.W + x; s += Math.abs(g.data[i] - g.data[i - 1]) + Math.abs(g.data[i] - g.data[i - g.W]); } return s / (g.W * g.H); });
    const R = E.slice(1).map((v, i) => v / E[i]); let j = 0; R.forEach((r, i) => { if (Math.abs(r - 1) > Math.abs(R[j] - 1)) j = i; });
    return Object.assign(out, { E: E.map(r3), R: R.map(r3), maxJump: R.length ? Math.abs(R[j] - 1) : 0, at: frames[j + 1] });
  }
  if (metric === 'globalExposure') {
    const P = [];
    for (let i = 1; i < F.length; i++) {
      const a = F[i - 1], b = F[i], W = b.W, H = b.H; let sd = 0, md = 0, x0 = W, y0 = H, x1 = -1, y1 = -1, n8 = 0;
      for (let k = 0; k < b.data.length; k++) { const d = b.data[k] - a.data[k]; sd += d; md += Math.abs(d); if (Math.abs(d) > 8) { n8++; const x = k % W, y = (k / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
      let so = 0, no = 0; const pd = c.outsideBoxPad != null ? c.outsideBoxPad : 8;
      for (let k = 0; k < b.data.length; k++) { const x = k % W, y = (k / W) | 0; if (n8 && x >= x0 - pd && x <= x1 + pd && y >= y0 - pd && y <= y1 + pd) continue; so += b.data[k] - a.data[k]; no++; }
      P.push({ f: frames[i], dY: r3(sd / b.data.length), mad: r3(md / b.data.length), n8, box: n8 ? [x0, y0, x1, y1] : null, outsideDY: no ? r3(so / no) : null });
    }
    return Object.assign(out, { pairs: P });
  }
  const isY = metric === 'meanY';
  const Y = isY ? F.map((g) => { let s = 0; for (let i = 0; i < g.data.length; i++) s += g.data[i]; return s / g.data.length; }) : null;
  const d = isY ? Y.slice(1).map((v, i) => Math.abs(v - Y[i])) : F.slice(1).map((g, i) => diffStats(F[i].data, g.data).mean);
  const floor = c.floor != null ? c.floor : isY ? 0.05 : 0.02, rs = ratioScan(d, floor), srt = d.slice().sort((a, b) => a - b), med = srt[srt.length >> 1] || 0;
  Object.assign(out, { d: d.map(r3), Y: Y ? Y.map(r2) : undefined, worst: rs.worst, at: rs.at != null ? frames[rs.at + 1] : null, maxMedian: d.length ? Math.max(...d) / Math.max(med, floor) : 0, q: rs.q });
  // dedektörler (d_i = f_{i-1} → f_i farkı; kare = frames[i+1])
  const det = new Set(c.detect || []), hits = [];
  const sp = Object.assign({ k: 1.6, abs: 0.8 }, c.spike || {});
  for (let i = 0; i < d.length; i++) {
    const f = frames[i + 1], m = i && i < d.length - 1 ? (d[i - 1] + d[i + 1]) / 2 : null;
    if (det.has('dup') && camSpeed && d[i] < 0.15 && camSpeed[f] > 1.0) hits.push({ f, rule: 'kopya kare', d: r3(d[i]), cam: camSpeed[f] });
    if (det.has('stutter') && m != null && m > 0.6 && d[i] < 0.35 * m) hits.push({ f, rule: 'takılma', d: r3(d[i]), m: r3(m) });
    if (det.has('jump') && m != null && d[i] > 2.5 * m && d[i] > 3) hits.push({ f, rule: 'sıçrama', d: r3(d[i]), m: r3(m) });
    if (det.has('freeze') && d[i] < (c.freeze != null ? c.freeze : 0.05)) hits.push({ f, rule: 'donma', d: r3(d[i]) });
    if (det.has('spike') && i >= 2 && i < d.length - 2) { const nb = (d[i - 2] + d[i - 1] + d[i + 1] + d[i + 2]) / 4; if (d[i] > nb * sp.k && d[i] - nb > sp.abs) hits.push({ f, rule: 'sıçrama adayı', d: r3(d[i]), nb: r3(nb) }); }
  }
  return Object.assign(out, { hits });
}
// film perde sınırları: parent === id olan sahne kesitleri (range[0] sırasıyla)
function actBoundaries(ctx) {
  const parts = SCENES.filter((s) => s.parent === ctx.scene.id && Array.isArray(s.range) && !s.animatic).sort((a, b) => a.range[0] - b.range[0]);
  return parts.slice(1).map((p, k) => ({ name: parts[k].id + '→' + p.id, b: p.range[0] }));
}
async function temporal(c, ctx, data) {
  const metric = c.metric || 'mad', src = frameSource(c, ctx); if (src.missing) return unmeasured(c, src.missing);
  const camSpeed = data && data.value ? data.value : null;
  if ((c.detect || []).includes('dup') && !camSpeed) return unmeasured(c, 'kopya kare için kamera hızı kancası yok (__camSpeed)');
  const maxRatio = c.maxRatio != null ? c.maxRatio : 1.5, viol = [];
  const windows = [];
  if (c.at === 'actBoundaries') {
    const n = c.window || 12, N = ctx.frames;
    windows.push({ name: 'başlangıç', frames: Array.from({ length: n + 1 }, (_, i) => i) });
    for (const B of actBoundaries(ctx)) windows.push({ name: B.name, seam: B.b, frames: Array.from({ length: 2 * n }, (_, i) => B.b - n + i) });
    windows.push({ name: 'son', frames: Array.from({ length: n + 1 }, (_, i) => N - 1 - n + i) });
  } else {
    const fr = pickFrames(c, ctx.frames, ctx), { have, missing } = available(src, fr);
    if (have.length < 2) return unmeasured(c, 'ardışık kare yok' + missNote(missing));
    windows.push({ name: 'aralık', frames: have, missing });
  }
  const out = [];
  for (const w of windows) {
    const s = await temporalSeries(c, ctx, w.frames.filter((f) => f >= 0 && f < ctx.frames), src, metric, camSpeed);
    const o = { name: w.name, frames: [w.frames[0], w.frames[w.frames.length - 1]] };
    if (metric === 'edgeEnergy') { Object.assign(o, { maxJump: r3(s.maxJump), at: s.at, R: s.R }); if (c.maxJump != null && s.maxJump > c.maxJump) viol.push({ f: s.at, rule: 'kenar enerjisi', v: r3(s.maxJump), max: c.maxJump }); }
    else if (metric === 'globalExposure') { const P = s.pairs, wo = P.reduce((m, p) => (p.outsideDY != null && Math.abs(p.outsideDY) > Math.abs(m.outsideDY || 0) ? p : m), {}); Object.assign(o, { worstOutsideDY: wo.outsideDY, at: wo.f, pairs: P.length <= 120 ? P : undefined }); if (c.maxOutside != null && Math.abs(wo.outsideDY || 0) > c.maxOutside) viol.push({ f: wo.f, rule: 'küresel pozlama', v: wo.outsideDY, max: c.maxOutside }); }
    else {
      Object.assign(o, { worstRatio: r2(s.worst), at: s.at, maxMedian: r2(s.maxMedian), d: s.d.length <= 600 ? s.d : undefined, Y: s.Y && s.Y.length <= 600 ? s.Y : undefined });
      if (w.seam != null) { const k = w.seam - w.frames[0] - 1; o.seam = { d: s.d[k], ratio: s.q[k] != null ? r2(s.q[k]) : null }; }
      if (s.worst > maxRatio) viol.push({ f: s.at, rule: 'sıçrama oranı', window: w.name, v: r2(s.worst), max: maxRatio });
      s.hits.forEach((h) => viol.push(h));
    }
    out.push(o);
  }
  const head = metric === 'edgeEnergy' ? 'en büyük |r−1| ' + Math.max(...out.map((o) => o.maxJump)) : metric === 'globalExposure' ? 'kutu dışı ΔY en kötü ' + out.map((o) => o.worstOutsideDY).join(' / ')
    : 'en kötü oran ' + Math.max(...out.map((o) => o.worstRatio)) + ' (≤ ' + maxRatio + ')';
  return verdict(c, ctx, metric + ' · ' + src.kind + ' · ' + head + (windows.length > 1 ? ' · ' + windows.length + ' pencere' : ''),
    { metric, src: src.kind, windows: out, sampled: windows.length === 1 ? windows[0].frames : undefined }, viol);
}

// ── 4 ramp ── fadeuni.mjs:8-16 (tam çözünürlük luma, ardışık fark, pürüz, göreli sapma dev/max(0.05, D)), rvw19/dip.js (ref oranı)
async function ramp(c, ctx) {
  const S = await frameSet(c, ctx); if (S.error) return unmeasured(c, S.error);
  const L = [], MX = [], D = []; let prev = null;
  for (const f of S.have) {
    const img = await S.src.read(f, null), d = img.data, C = img.C, n = d.length / C; let s = 0, mx = 0, dd = 0;
    for (let i = 0; i < d.length; i += C) { const y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; s += y; if (d[i] > mx) mx = d[i]; if (d[i + 1] > mx) mx = d[i + 1]; if (d[i + 2] > mx) mx = d[i + 2];
      if (prev) dd += Math.abs(y - (0.2126 * prev[i] + 0.7152 * prev[i + 1] + 0.0722 * prev[i + 2])); }
    L.push(s / n); MX.push(mx); if (prev) D.push(dd / n); prev = d;
  }
  let rough = 0, worst = 0, wAt = null;
  for (let i = 1; i < D.length - 1; i++) { const dev = Math.abs(D[i] - (D[i - 1] + D[i + 1]) / 2); rough += dev; const rel = dev / Math.max(0.05, D[i]); if (rel > worst) { worst = rel; wAt = S.have[i + 1]; } }
  rough = D.length > 2 ? rough / (D.length - 2) : 0;
  const viol = [], dir = Math.sign(L[L.length - 1] - L[0]) || -1, tol = c.tol != null ? c.tol : 0.05;
  if (c.monotone) for (let i = 1; i < L.length; i++) if ((L[i] - L[i - 1]) * dir < -tol) viol.push({ f: S.have[i], rule: 'tekdüze değil', dL: r3(L[i] - L[i - 1]) });
  if (c.maxRelDev != null && worst > c.maxRelDev) viol.push({ f: wAt, rule: 'göreli sapma', v: r3(worst), max: c.maxRelDev });
  if (c.lastMax != null && MX[MX.length - 1] > c.lastMax) viol.push({ f: S.have[S.have.length - 1], rule: 'son kare maks', v: MX[MX.length - 1], max: c.lastMax });
  let refRatio;
  if (c.ref) {
    const dir2 = resolveRefDir(c.ref, ctx); refRatio = [];
    for (let i = 0; i < S.have.length; i++) { const p = path.join(dir2, pad5(S.have[i]) + '.png'); if (!fs.existsSync(p)) continue; const m = meanLumaPct(await readRaw(p)); refRatio.push([S.have[i], r3((L[i] / 2.55) / Math.max(1e-9, m))]); }
  }
  return verdict(c, ctx, 'luma ' + r2(L[0] / 2.55) + ' → ' + r2(L[L.length - 1] / 2.55) + '% · pürüz ' + r3(rough) + ' · en kötü göreli sapma %' + Math.round(worst * 100) + (wAt != null ? ' @f' + wAt : '') + ' · son kare maks ' + MX[MX.length - 1],
    { frames: S.have.length, L: series(S.have, L.map((v) => v / 2.55)), D: D.map(r3), roughness: r3(rough), worstRel: r3(worst), worstAt: wAt, lastMax: MX[MX.length - 1], last3: MX.slice(-3), refRatio, sampled: S.have }, viol);
}

// ── 5 seam ── seams.mjs:7-12: ham kare, (son−1 → son), (son → ilk), (ilk → ilk+1); ölçüt ≤ max(1.1 × büyük komşu, 2) (/255 düzeyi)
async function seam(c, ctx) {
  const otherId = c.next || c.prev; if (!otherId) return unmeasured(c, 'next/prev yok');
  let other; try { other = sceneById(otherId); } catch (e) { return unmeasured(c, e.message); }
  const [A, B] = c.next ? [ctx.scene, other] : [other, ctx.scene];
  const nA = A.id === ctx.scene.id ? ctx.frames : A.frames || readTimeline(A.file).frames;
  const srcA = frameSource(c, ctx, A.id), srcB = frameSource(c, ctx, B.id);
  if (srcA.missing || srcB.missing) return unmeasured(c, (srcA.missing ? A.id + ': ' + srcA.missing : '') + (srcB.missing ? ' ' + B.id + ': ' + srcB.missing : ''));
  const need = [[srcA, nA - 2], [srcA, nA - 1], [srcB, 0], [srcB, 1]];
  if (need.some(([s, f]) => !s.has(f))) return unmeasured(c, 'dikiş kareleri eksik (' + A.id + ' ' + (nA - 2) + '–' + (nA - 1) + ', ' + B.id + ' 0–1)');
  const [a1, a2, b0, b1] = await Promise.all(need.map(([s, f]) => s.read(f, null)));
  const p = diffStats(a1.data, a2.data), s = diffStats(a2.data, b0.data), n = diffStats(b0.data, b1.data);
  const K = c.neighborK != null ? c.neighborK : 1.1, st = c.staticMax != null ? c.staticMax : 2, lim = Math.max(K * Math.max(p.mean, n.mean), st);
  const m = { pair: A.id + ' → ' + B.id, prev: { mean: r3(p.mean), max: p.max }, seam: { mean: r3(s.mean), max: s.max }, next: { mean: r3(n.mean), max: n.max }, limit: r2(lim), neighborK: K, staticMax: st };
  return verdict(c, ctx, m.pair + ' · komşu ' + m.prev.mean + ' · dikiş ' + m.seam.mean + ' · komşu ' + m.next.mean + ' · ölçüt ≤ ' + m.limit, m,
    s.mean > lim ? [{ f: c.next ? nA - 1 : 0, rule: 'dikiş', v: r3(s.mean), max: r2(lim) }] : []);
}

// ── 6 identical ── imgcmp.mjs:6 + zincir tanık döngüleri (bayatlık 0/255), master cmp rgb48le (f10-chain.sh:36), domsig.js (FNV)
async function identical(c, ctx, data) {
  const expect = c.expect || 'same', tol = c.tol != null ? c.tol : 0, viol = [], rows = [];
  let frames = [];
  if (Array.isArray(c.ranges)) for (const [a, b] of c.ranges) for (let f = a; f <= b; f += c.step || 1) frames.push(f); else frames = pickFrames(c, ctx.frames, ctx);
  if (c.mode === 'dom') {
    if (!data || data.missing) return unmeasured(c, 'DOM imzası alınamadı');
    const refF = path.resolve(ctx.probeDir, ctx.scene.id + '-dom-' + String(c.ref || 'taban').replace(/[^\w.-]+/g, '_') + '.json');
    if (!fs.existsSync(refF)) { fs.mkdirSync(path.dirname(refF), { recursive: true }); fs.writeFileSync(refF, JSON.stringify(data.sig)); return Object.assign(unmeasured(c, 'taban yoktu — yazıldı: ' + path.basename(refF)), { metrics: { sig: data.sig } }); }
    const ref = JSON.parse(fs.readFileSync(refF, 'utf8'));
    for (const [f, h] of Object.entries(data.sig)) { const same = ref[f] === h; rows.push({ f: +f, same }); if ((expect === 'same') !== same) viol.push({ f: +f, rule: expect === 'same' ? 'DOM değişti' : 'DOM aynı', h, ref: ref[f] }); }
    return verdict(c, ctx, 'DOM imzası · ' + rows.filter((r) => r.same).length + '/' + rows.length + ' aynı (beklenen ' + expect + ')', { mode: 'dom', rows }, viol);
  }
  const refSpec = String(c.ref || '');
  if (c.mode === 'rgb48' || refSpec.startsWith('master:') || refSpec.startsWith('mp4:')) {
    const A = mp4For(Object.assign({ src: c.src || 'master' }, c), ctx), Bf = path.resolve(ROOT, refSpec.replace(/^(master|mp4):/, ''));
    if (!A || !fs.existsSync(A)) return unmeasured(c, 'kaynak video yok'); if (!fs.existsSync(Bf)) return unmeasured(c, 'ref video yok (' + refSpec + ')');
    for (const f of frames) { const a = c.mode === 'rgb48' ? rgb48Frame(A, f) : (await mp4FrameRGB(A, f)).data, b = c.mode === 'rgb48' ? rgb48Frame(Bf, f) : (await mp4FrameRGB(Bf, f)).data;
      const same = c.mode === 'rgb48' ? a.equals(b) : diffStats(a, b).max <= tol; rows.push({ f, same }); if ((expect === 'same') !== same) viol.push({ f, rule: expect === 'same' ? 'farklı' : 'aynı' }); }
    return verdict(c, ctx, (c.mode || 'video') + ' · ' + rows.filter((r) => r.same).length + '/' + rows.length + ' aynı (beklenen ' + expect + ')', { mode: c.mode || 'video', rows }, viol);
  }
  const src = frameSource(c, ctx); if (src.missing) return unmeasured(c, src.missing);
  const refDir = resolveRefDir(refSpec || null, ctx); if (!refDir || !fs.existsSync(refDir)) return unmeasured(c, 'ref dizini yok (' + refSpec + ')');
  let maps = 0;
  for (const f of frames) {
    const rf = path.join(refDir, pad5(f + (c.offset || 0)) + '.png');
    if (!src.has(f) || !fs.existsSync(rf)) { rows.push({ f, missing: true }); continue; }
    const a = await src.read(f, null), b = await readRaw(rf), d = diffStats(a.data, b.data), same = d.max <= tol;
    rows.push({ f, mean: r3(d.mean), max: d.max, same });
    if ((expect === 'same') !== same) {
      viol.push({ f, rule: expect === 'same' ? 'farklı' : 'aynı', mean: r3(d.mean), max: d.max });
      if (c.report === 'diffMap' && maps < 6) { maps++; await writePng(diffMap(a, b, c.amp || 4), path.join(OUT, 'probe', 'fc', ctx.scene.id + '-diff-' + pad5(f) + '.png')); }
    }
  }
  const miss = rows.filter((r) => r.missing).length;
  if (miss === rows.length) return unmeasured(c, 'karşılaştırılacak kare yok');
  return verdict(c, ctx, 'piksel · ' + rows.filter((r) => r.same).length + '/' + (rows.length - miss) + ' aynı (beklenen ' + expect + ', tol ' + tol + ')' + (miss ? ' · eksik ' + miss : ''),
    { mode: 'pixel', ref: refSpec, rows: rows.length <= 400 ? rows : undefined, sampled: frames }, viol);
}

// ── 7 edgeDark ── edgeall.js:3-10 (960×540; kenar 1–3 ile 12–15 sütun/satır farkı > 15), meas.js:7-9 (köşe düşümü ≤ %20), rvw/desk.js:8-9
async function edgeDark(c, ctx) {
  const S = await frameSet(c, ctx); if (S.error) return unmeasured(c, S.error);
  const mode = c.mode || 'band', viol = [], vals = [];
  const maxDelta = c.maxDelta != null ? c.maxDelta : ctx.W.edgeDark.maxDelta, maxFall = c.maxFalloff != null ? c.maxFalloff : ctx.W.edgeDark.maxFalloff;
  const band = c.band || [1, 3], ref = c.ref || [12, 15];
  for (const f of S.have) {
    if (mode === 'corners') {
      const g = await S.src.read(f, null, { gray: true }), P = c.patch || 60, W = g.W, H = g.H;
      const st = (x, y) => { let s = 0, n = 0; for (let j = y; j < y + P; j++) for (let i = x; i < x + P; i++) { s += g.data[j * W + i]; n++; } return s / n; };
      const cs = [st(0, 0), st(W - P, 0), st(0, H - P), st(W - P, H - P), st((W >> 1) - (P >> 1), (H >> 1) - (P >> 1))], fall = 1 - Math.min(...cs) / Math.max(...cs);
      vals.push(fall); if (fall > maxFall) viol.push({ f, rule: 'köşe düşümü', v: r3(fall), max: maxFall, patches: cs.map(r2) });
    } else if (mode === 'desk') {
      const img = await S.src.read(f, null), cls = resolveClass(c.cls || 'desk', ctx.W.classes); let n = 0;
      for (let i = 0; i < img.data.length; i += img.C) if (cls.test(img.data[i], img.data[i + 1], img.data[i + 2])) n++;
      vals.push(n); if (n > (c.maxPx != null ? c.maxPx : 200)) viol.push({ f, rule: 'masa görünür', v: n, max: c.maxPx != null ? c.maxPx : 200 });
    } else {
      const img = await S.src.read(f, c.scale || 'edge'), W = img.W, H = img.H, Y = lumaPlane(img);
      const col = (x) => { let s = 0, n = 0; for (let y = 60; y < H - 60; y += 3) { s += Y[y * W + x]; n++; } return s / n; }, row = (y) => { let s = 0, n = 0; for (let x = 60; x < W - 60; x += 3) { s += Y[y * W + x]; n++; } return s / n; };
      const dl = (col(ref[0]) + col(ref[1])) / 2 - (col(band[0]) + col(band[1])) / 2, dr = (col(W - 1 - ref[0]) + col(W - 1 - ref[1])) / 2 - (col(W - 1 - band[0]) + col(W - 1 - band[1])) / 2;
      const dt = (row(ref[0]) + row(ref[1])) / 2 - (row(band[0]) + row(band[1])) / 2, db = (row(H - 1 - ref[0]) + row(H - 1 - ref[1])) / 2 - (row(H - 1 - band[0]) + row(H - 1 - band[1])) / 2;
      const v = Math.max(dl, dr, dt, db); vals.push(v);
      if (v > maxDelta) viol.push({ f, rule: 'kenar kararması', v: r2(v), max: maxDelta, sides: { l: r2(dl), r: r2(dr), t: r2(dt), b: r2(db) } });
    }
  }
  const mx = Math.max(...vals);
  return verdict(c, ctx, mode + ' · en kötü ' + r3(mx) + ' (' + (mode === 'corners' ? '≤ ' + maxFall : mode === 'desk' ? 'px' : '≤ ' + maxDelta) + ') · ihlal ' + viol.length + ' / ' + S.have.length + ' kare',
    { mode, frames: S.have.length, worst: r3(mx), series: series(S.have, vals), sampled: S.have }, viol);
}

// ── 8 accentLocation ── redscan.mjs:15-21, f7-redloc.mjs:10-17 (960×540 en yakın; sınıf sırası: ilk eşleşen; izinli kutular kanca/sabit)
const needsAllowHook = (c) => (c.allow || []).some((a) => typeof a === 'string' && a.startsWith('$__'));
async function accentPrefetch(c, ctx, api) {
  const out = {};
  for (const a of c.allow || []) {
    const h = hookName(a); if (!h) continue;
    const o = await api.eval(PAGE, { kind: 'call', fn: h, args: [api.fps, ctx.frames], W: WIDTH, H: HEIGHT, fps: api.fps, frames: api.frames, n: ctx.frames });
    out[h] = o.missing ? { missing: true } : o.value;
  }
  return out;
}
async function accentLocation(c, ctx, data) {
  const S = await frameSet(c, ctx); if (S.error) return unmeasured(c, S.error);
  const names = c.classes || [(ctx.W.accent && ctx.W.accent.class) || 'signal', 'bordo'], cls = classesFor(names, ctx);
  const allow = [];
  for (const a of c.allow || []) {
    const h = hookName(a);
    if (h) { const v = data && data[h]; if (!v || v.missing) return unmeasured(c, 'kanca yok (' + h + ')'); allow.push({ name: h, at: (f) => v[f] || [] }); }
    else if (Array.isArray(a)) allow.push({ name: 'kutu', at: () => [a] });
    else if (a && Array.isArray(a.box)) allow.push({ name: a.name || 'kutu', at: () => [a.box] });
  }
  const maxOut = c.maxOutsidePx != null ? c.maxOutsidePx : 0, scale = c.scale || 'nearest', tot = cls.map(() => allow.map(() => 0).concat([0]));
  const viol = [], hasAcc = [];
  for (const f of S.have) {
    const img = await S.src.read(f, scale), sx = WIDTH / img.W, sy = HEIGHT / img.H, boxes = allow.map((a) => a.at(f)), cnt = cls.map(() => allow.map(() => 0).concat([0]));
    for (let k = 0, n = img.W * img.H; k < n; k++) {
      const i = k * img.C, r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
      const ci = cls.findIndex((q) => q.test(r, g, b)); if (ci < 0) continue;
      const x = (k % img.W) * sx, y = Math.floor(k / img.W) * sy;
      let w = boxes.findIndex((L) => L.some((bb) => bb && x >= bb[0] && x <= bb[2] && y >= bb[1] && y <= bb[3])); if (w < 0) w = allow.length;
      cnt[ci][w]++; tot[ci][w]++;
    }
    const outside = cnt.reduce((s, row) => s + row[allow.length], 0), any = cnt.reduce((s, row) => s + row.reduce((a, b) => a + b, 0), 0);
    if (any) hasAcc.push(f);
    if (outside > maxOut) viol.push({ f, rule: 'izinli kutu dışında', px: Object.fromEntries(cls.map((q, i) => [q.name, cnt[i][allow.length]])) });
  }
  // kota: sınıf[0] pikselli kare koşuları (köprü: boşluk ≤ bridge kare), sayısı ≤ quota
  let runs;
  if (c.quota !== false && (c.quota != null || ctx.scene.redQuota != null)) {
    const q = c.quota != null ? c.quota : ctx.scene.redQuota, bridge = c.bridge != null ? c.bridge : Math.round(2 * KF);
    runs = []; for (const f of hasAcc) { const l = runs[runs.length - 1]; if (l && f - l[1] <= bridge + (c.step || 1)) l[1] = f; else runs.push([f, f]); }
    if (q != null && runs.length > q) viol.push({ f: runs[q][0], rule: 'kota', runs: runs.length, quota: q });
  }
  const totals = Object.fromEntries(cls.map((q, i) => [q.name, Object.fromEntries(allow.map((a, j) => [a.name, tot[i][j]]).concat([['dışarı', tot[i][allow.length]]]))]));
  return verdict(c, ctx, cls.map((q) => q.name).join('+') + ' · aksanlı kare ' + hasAcc.length + ' · dışarıda pikselli kare ' + viol.filter((v) => v.rule !== 'kota').length + (runs ? ' · aralık ' + runs.length : ''),
    { frames: S.have.length, scale, classes: names, totals, framesWithAccent: hasAcc.length, runs, sampled: S.have }, viol);
}

// ── 9 accentColor ── deltae.mjs:10-14 (iç kırmızı 3×3, kanal medyanı → ΔE2000 hedef), de2.mjs:10-17 (çift ΔE, kutu)
async function innerMedian(img, cls, box) {
  const m = classMask(img, cls, box), px = [[], [], []];
  for (let k = 0; k < m.length; k++) if (m[k]) for (let c2 = 0; c2 < 3; c2++) px[c2].push(img.data[k * img.C + c2]);
  if (!px[0].length) return null;
  return { n: px[0].length, med: px.map((v) => { v.sort((a, b) => a - b); return v[v.length >> 1]; }) };
}
async function sideImage(spec, c, ctx) {
  if (typeof spec === 'number') { const src = frameSource(c, ctx); if (src.missing) throw new Error(src.missing); if (!src.has(spec)) throw new Error('kare yok ' + spec); return { img: await src.read(spec, null), label: ctx.scene.id + ' f' + spec }; }
  const sid = spec.id || ctx.scene.id, src = frameSource({ src: spec.src || c.src, mp4: spec.mp4, dir: spec.dir }, ctx, sid);
  if (src.missing) throw new Error(sid + ': ' + src.missing); if (!src.has(spec.frame)) throw new Error(sid + ' kare yok ' + spec.frame);
  return { img: await src.read(spec.frame, null), label: sid + ' f' + spec.frame, box: spec.box };
}
async function accentColor(c, ctx) {
  const target = c.target || (ctx.W.accent && ctx.W.accent.color) || null, viol = [], rows = [], pairs = [];
  const cls = resolveClass(c.classifier || (c.pairs && !c.frames ? 'redPair' : 'redInner'), ctx.W.classes);
  const tl = target ? rgb2lab(...hex2rgb(target)) : null, maxDE = c.maxDeltaE != null ? c.maxDeltaE : 5;
  const frames = c.frames ? pickFrames(c, ctx.frames, ctx) : [];
  for (const f of frames) {
    let s; try { s = await sideImage(f, c, ctx); } catch (e) { rows.push({ f, error: e.message }); continue; }
    const m = await innerMedian(s.img, cls, c.box || null);
    if (!m) { rows.push({ f, inner: 0 }); continue; }
    const de = tl ? deltaE2000(rgb2lab(...m.med), tl) : null; rows.push({ f, inner: m.n, median: rgb2hex(m.med), dE: r2(de) });
    if (de != null && de > maxDE) viol.push({ f, rule: 'ΔE2000', v: r2(de), max: maxDE, median: rgb2hex(m.med) });
  }
  for (const [a, b] of c.pairs || []) {
    try {
      const A = await sideImage(a, c, ctx), B = await sideImage(b, c, ctx), ma = await innerMedian(A.img, cls, A.box || c.box || null), mb = await innerMedian(B.img, cls, B.box || c.boxB || null);
      if (!ma || !mb) { pairs.push({ a: A.label, b: B.label, error: 'iç piksel yok' }); continue; }
      const de = deltaE2000(rgb2lab(...ma.med), rgb2lab(...mb.med)), row = { a: A.label, b: B.label, A: rgb2hex(ma.med), B: rgb2hex(mb.med), dE: r2(de) };
      if (tl) { row.aT = r2(deltaE2000(rgb2lab(...ma.med), tl)); row.bT = r2(deltaE2000(rgb2lab(...mb.med), tl)); }
      pairs.push(row);
      if (c.maxPairDeltaE != null && de > c.maxPairDeltaE) viol.push({ rule: 'çift ΔE2000', a: A.label, b: B.label, v: r2(de), max: c.maxPairDeltaE });
    } catch (e) { pairs.push({ error: e.message }); }
  }
  const ok = rows.filter((r) => r.dE != null);
  if (!ok.length && !pairs.some((p) => p.dE != null)) return unmeasured(c, 'iç aksan pikseli bulunamadı', { rows, pairs });
  return verdict(c, ctx, (ok.length ? 'ΔE2000 ' + ok.map((r) => r.dE).join(' / ') + (target ? ' (' + target + ', ≤ ' + maxDE + ')' : '') : '') + (pairs.length ? ' · çift ' + pairs.map((p) => p.dE).join(' / ') : ''),
    { classifier: cls.name, target, rows, pairs, sampled: frames }, viol);
}

// ── 10 sharpness ── sharp.mjs:11-35 (yeşil kanal; %10–90 kenar genişliği medyanı, Laplace varyansı / kontrast²), sharp2.mjs:14-17 (bantlar)
function sharpMeasure(img, b) {
  const { data, W, H, C } = img, G = (x, y) => data[(y * W + x) * C + 1];
  const pad = 4, X0 = Math.max(1, b.x0 - pad), X1 = Math.min(W - 2, b.x1 + pad), Y0 = Math.max(1, b.y0 - pad), Y1 = Math.min(H - 2, b.y1 + pad);
  const g = []; for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) g.push(G(x, y)); g.sort((a, c2) => a - c2);
  const ink = g[Math.floor(g.length * 0.03)], paper = g[Math.floor(g.length * 0.97)], Cn = paper - ink;
  let s = 0, s2 = 0, n = 0; for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) { const L = 4 * G(x, y) - G(x - 1, y) - G(x + 1, y) - G(x, y - 1) - G(x, y + 1); s += L; s2 += L * L; n++; }
  const lv = s2 / n - (s / n) ** 2, widths = [];
  const scan = (get, len, fixedN) => { for (let f = 0; f < fixedN; f++) { const v = []; for (let i = 0; i < len; i++) v.push(get(f, i));
    for (let i = 7; i < len - 8; i++) { const d = v[i + 1] - v[i]; if (Math.abs(d) < 0.12 * Cn) continue; if (Math.abs(d) < Math.abs(v[i] - v[i - 1]) || Math.abs(d) < Math.abs(v[i + 2] - v[i + 1])) continue;
      const win = v.slice(i - 6, i + 8), lo = Math.min(...win), hi = Math.max(...win); if (hi - lo < 0.7 * Cn) continue;
      const a = lo + 0.1 * (hi - lo), z = lo + 0.9 * (hi - lo), cross = (l2) => { for (let k = i - 6; k < i + 7; k++) { const p = v[k], q = v[k + 1]; if ((p - l2) * (q - l2) <= 0 && p !== q) return k + (l2 - p) / (q - p); } return null; };
      const ca = cross(a), cz = cross(z); if (ca != null && cz != null) widths.push(Math.abs(cz - ca)); } } };
  scan((f, i) => G(X0 + i, Y0 + f), X1 - X0 + 1, Y1 - Y0 + 1);
  scan((f, i) => G(X0 + f, Y0 + i), Y1 - Y0 + 1, X1 - X0 + 1);
  widths.sort((a, c2) => a - c2);
  return { region: [b.x0, b.y0, b.x1, b.y1], paperG: paper, inkG: ink, contrast: Cn, edge1090: widths.length ? r3(widths[Math.floor(widths.length / 2)]) : null, edges: widths.length, lapVar: r2(lv), lapVarNorm: Cn ? +(lv / (Cn * Cn)).toFixed(4) : null };
}
function regionFor(img, spec, ref, classes) {
  const cls = resolveClass(spec.cls || spec, classes), { data, W, H, C } = img;
  const lim = spec.box || [0, 0, W - 1, H - 1];
  const ok = (x, y) => { if (ref && spec.below) { if (!(y > ref.y1 + 4 && x > ref.x0 - 80 && x < ref.x1 + 80)) return false; } const i = (y * W + x) * C; return cls.test(data[i], data[i + 1], data[i + 2]); };
  if (spec.band != null && ref) {   // sharp2: logonun altındaki koyu satırları bantlara ayır (c > 3, boşluk > 6, bant > 8)
    const rows = []; for (let y = ref.y1 + 2; y < H; y++) { let n = 0; for (let x = Math.max(0, ref.x0 - 80); x < Math.min(W, ref.x1 + 80); x++) if (ok(x, y)) n++; rows.push([y, n]); }
    const bands = []; let cur = null; rows.forEach(([y, n]) => { if (n > 3) { if (!cur || y - cur[1] > 6) { cur = [y, y]; bands.push(cur); } else cur[1] = y; } });
    const big = bands.filter((b) => b[1] - b[0] > 8), bd = big[spec.band]; if (!bd) return null;
    let x0 = W, y0 = H, x1 = -1, y1 = -1, n = 0; for (let y = bd[0]; y <= bd[1]; y++) for (let x = 0; x < W; x++) if (ok(x, y)) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return n ? { x0, y0, x1, y1, n } : null;
  }
  let x0 = W, y0 = H, x1 = -1, y1 = -1, n = 0;
  for (let y = Math.max(0, lim[1]); y <= Math.min(H - 1, lim[3]); y++) for (let x = Math.max(0, lim[0]); x <= Math.min(W - 1, lim[2]); x++) if (ok(x, y)) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return n ? { x0, y0, x1, y1, n } : null;
}
async function sharpness(c, ctx) {
  const S = await frameSet(c, ctx); if (S.error) return unmeasured(c, S.error);
  const regs = c.regions || { a: { cls: 'red' }, b: { cls: 'darkNeutral', below: 'a' } }, metric = [].concat(c.metric || 'edge1090')[0], rows = [], viol = [];
  for (const f of S.have) {
    const img = await S.src.read(f, null), got = {};
    for (const [k, spec] of Object.entries(regs)) { const ref = spec.below ? got[spec.below] && got[spec.below].box : null; const b = regionFor(img, spec, ref, ctx.W.classes); got[k] = b ? Object.assign({ box: b }, sharpMeasure(img, b)) : null; }
    const keys = Object.keys(regs), A = got[keys[0]], B = got[keys[1]], row = { f };
    keys.forEach((k) => { row[k] = got[k] ? { region: got[k].region, edge1090: got[k].edge1090, lapVarNorm: got[k].lapVarNorm, contrast: got[k].contrast, edges: got[k].edges } : null; });
    if (A && B && A[metric] != null && B[metric] != null) { row.ratio = r3(A[metric] / B[metric]); if (c.ratio && (row.ratio < c.ratio[0] || row.ratio > c.ratio[1])) viol.push({ f, rule: 'keskinlik oranı', metric, v: row.ratio, range: c.ratio }); }
    rows.push(row);
  }
  const rat = rows.filter((r) => r.ratio != null);
  if (!rat.length) return unmeasured(c, 'bölgeler bulunamadı', { rows });
  return verdict(c, ctx, metric + ' oranı ' + rat.map((r) => r.ratio).join(' / ') + (c.ratio ? ' ([' + c.ratio.join(', ') + '])' : ''), { metric, rows, sampled: S.have }, viol);
}

// ── 11 stroke ── sledge.mjs:4-12 (sütun başı %50 kaplama üst/alt, 2× → 1080p kutu), colf.js (FWHM), caph.js (mürekkep satırları), trace.js (süreklilik kırığı)
function strokeMeasure(img, c) {
  if (img.W === 2 * WIDTH) img = down2(img);
  const { data, W, C } = img, [x0, y0, x1, y1] = c.box, metrics = [].concat(c.metric || ['top', 'bottom', 'thickness']), o = {};
  const val = c.channel === 'dark' ? (x, y) => { const i = (y * W + x) * C; return 255 - (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]); } : (x, y) => { const i = (y * W + x) * C; return data[i] - data[i + 1]; };
  const L = (x, y) => { const i = (y * W + x) * C; return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]; };
  if (metrics.some((m) => ['top', 'bottom', 'thickness', 'area'].includes(m))) {
    let st = 0, sb = 0, sa = 0, n = 0;
    for (let x = x0; x <= x1; x++) {
      const ys = []; for (let y = y0; y <= y1; y++) ys.push(val(x, y));
      const bg = (ys[0] + ys[ys.length - 1]) / 2, full = Math.max(...ys); if (full - bg <= 0) continue;
      const cv = ys.map((v) => (v - bg) / (full - bg)); let top = null, bot = null;
      for (let i = 1; i < cv.length; i++) { if (top == null && cv[i - 1] < 0.5 && cv[i] >= 0.5) top = y0 + i - 1 + (0.5 - cv[i - 1]) / (cv[i] - cv[i - 1]); if (cv[i - 1] >= 0.5 && cv[i] < 0.5) bot = y0 + i - 1 + (cv[i - 1] - 0.5) / (cv[i - 1] - cv[i]); }
      if (top == null || bot == null) continue; st += top; sb += bot; sa += cv.reduce((p, q) => p + q, 0); n++;
    }
    if (n) Object.assign(o, { columns: n, top: r3(st / n), bottom: r3(sb / n), thickness: r3((sb - st) / n), area: r3(sa / n) });
  }
  if (metrics.includes('fwhm')) {
    const w = []; for (let x = Math.max(3, x0); x <= Math.min(W - 4, x1); x += c.colStep || 1) {
      const prof = []; for (let y = y0; y <= y1; y++) { let s = 0; for (let dx = -3; dx <= 3; dx++) s += L(x + dx, y); prof.push(s / 7); }
      const bg = (prof[0] + prof[prof.length - 1]) / 2, mn = Math.min(...prof), half = (bg + mn) / 2; w.push(prof.filter((v) => v < half).length);
    }
    o.fwhm = median(w);
  }
  if (metrics.includes('inkExtent')) { let top = null, bot = null; for (let y = y0; y <= y1; y++) { let n = 0; for (let x = x0; x <= x1; x++) if (L(x, y) < (c.inkMax || 55)) n++; if (n > 3) { if (top == null) top = y; bot = y; } } o.inkExtent = top == null ? 0 : bot - top + 1; o.inkTop = top; }
  if (metrics.includes('continuity')) {
    const ys = new Array(W).fill(null);
    for (let x = x0; x <= x1; x++) { let best = null, bl = 1e9; for (let y = y0 + 8; y < y1 - 8; y++) { const l = L(x, y); if (l < bl) { const up = L(x, y - 7), dn = L(x, y + 7); if (up - l > 35 && dn - l > 35) { bl = l; best = y; } } }
      if (best != null) { let s = 0, ww = 0; for (let d = -3; d <= 3; d++) { const v = Math.max(0, 200 - L(x, best + d)); s += v * (best + d); ww += v; } ys[x] = ww ? s / ww : best; } }
    const kinks = []; for (let x = x0 + 7; x < x1 - 7; x++) { if (ys[x] == null || ys[x + 1] == null || ys[x - 6] == null || ys[x + 7] == null) continue; const d = ys[x + 1] - ys[x], sl = (ys[x] - ys[x - 6]) / 6, sr = (ys[x + 7] - ys[x + 1]) / 6; if (Math.abs(d - (sl + sr) / 2) > (c.maxKink || 1.2)) kinks.push([x, r2(d)]); }
    o.kinks = kinks.length; o.kinkAt = kinks.slice(0, 10); o.traced = ys.filter((v) => v != null).length;
  }
  return o;
}
async function stroke(c, ctx) {
  if (!Array.isArray(c.box)) return unmeasured(c, 'box [x0, y0, x1, y1] yok');
  const S = await frameSet(c, ctx); if (S.error) return unmeasured(c, S.error);
  const refDir = c.ref ? resolveRefDir(c.ref, ctx) : null, rows = [], viol = [], maxD = c.maxDelta != null ? c.maxDelta : 0.5;
  for (const f of S.have) {
    const m = strokeMeasure(await S.src.read(f, null), c), row = { f, ...m };
    if (refDir) { const rf = path.join(refDir, pad5(f) + '.png'); if (fs.existsSync(rf)) { const r = strokeMeasure(await readRaw(rf), c); row.ref = r;
      for (const k of ['top', 'bottom', 'thickness', 'fwhm', 'inkExtent']) if (m[k] != null && r[k] != null && Math.abs(m[k] - r[k]) > maxD) viol.push({ f, rule: 'çizgi ' + k, v: m[k], ref: r[k], maxDelta: maxD }); } }
    if (m.kinks) viol.push({ f, rule: 'süreklilik kırığı', kinks: m.kinks, at: m.kinkAt });
    if (c.maxThickness != null && m.thickness > c.maxThickness) viol.push({ f, rule: 'kalınlık', v: m.thickness, max: c.maxThickness });
    rows.push(row);
  }
  return verdict(c, ctx, rows.slice(0, 4).map((r) => 'f' + r.f + ' ' + ['top', 'bottom', 'thickness', 'fwhm', 'inkExtent', 'kinks'].filter((k) => r[k] != null).map((k) => k + ' ' + r[k]).join(' ')).join(' · '),
    { rows, sampled: S.have }, viol);
}

// ── 12 motion ── shift.js:6-10 (SAD), vel.js:4-6 (SSE + parabol alt piksel), p1cila.js:13 (±6@480); track: beam.js, navy.js … (sınıf + kutu)
function sadShift(A, B, W, H, reg, R, sse) {
  const [x0, y0, x1, y1] = reg, cost = (dx, dy) => { let s = 0; for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) { const yy = y + dy, xx = x + dx; if (yy < 0 || yy >= H || xx < 0 || xx >= W) { s += sse ? 2500 : 50; continue; } const d = A[y * W + x] - B[yy * W + xx]; s += sse ? d * d : Math.abs(d); } return s; };
  const cache = new Map(), C = (dx, dy) => { const k = dx + ',' + dy; if (!cache.has(k)) cache.set(k, cost(dx, dy)); return cache.get(k); };
  let best = [0, 0], bv = Infinity; for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const v = C(dx, dy); if (v < bv) { bv = v; best = [dx, dy]; } }
  const px = (l, c2, r) => { const d = l - 2 * c2 + r; return d > 0 ? (0.5 * (l - r)) / d : 0; }, [bx, by] = best;
  return [bx + (Math.abs(bx) < R ? px(C(bx - 1, by), bv, C(bx + 1, by)) : 0), by + (Math.abs(by) < R ? px(C(bx, by - 1), bv, C(bx, by + 1)) : 0)];
}
async function motion(c, ctx) {
  const S = await frameSet(c, ctx); if (S.error) return unmeasured(c, S.error);
  const viol = [];
  if ((c.mode || 'global') === 'track') {
    const cls = resolveClass(c.classifier || c.cls, ctx.W.classes), rows = []; let prev = null, peak = 0, peakAt = null, first = null, last = null;
    for (const f of S.have) {
      const img = await S.src.read(f, c.scale || 'half'), sx = WIDTH / img.W, m = classMask(img, cls, c.region ? regionAt(c.region, img) : null), b = maskBox(m, img.W, img.H);
      const vis = b && b.n >= (c.minPx || 20);
      let cx = null, cy = null; if (vis) { let sxx = 0, syy = 0; for (let k = 0; k < m.length; k++) if (m[k]) { sxx += k % img.W; syy += (k / img.W) | 0; } cx = (sxx / b.n) * sx; cy = (syy / b.n) * sx; if (first == null) first = f; last = f; }
      const touch = vis && (b.x0 <= 0 || b.y0 <= 0 || b.x1 >= img.W - 1 || b.y1 >= img.H - 1);
      if (vis && prev) { const v = Math.hypot(cx - prev[0], cy - prev[1]); if (v > peak) { peak = v; peakAt = f; } }
      prev = vis ? [cx, cy] : null; rows.push({ f, vis: !!vis, cx: r2(cx), cy: r2(cy), touch });
      if (touch && c.edgeTouch === false) viol.push({ f, rule: 'kadraj kenarına değiyor' });
    }
    if (c.maxPx != null && peak > c.maxPx) viol.push({ f: peakAt, rule: 'hız', v: r2(peak), max: c.maxPx });
    return verdict(c, ctx, 'iz · ilk ' + first + ' · son ' + last + ' · tepe ' + r2(peak) + ' px/kare @' + peakAt, { mode: 'track', firstVisible: first, lastVisible: last, peakPx: r2(peak), peakAt, rows: rows.length <= 400 ? rows : undefined, sampled: S.have }, viol);
  }
  const scale = c.scale || 'fast', R = c.search || 6, v = [], vec = [];
  let prevG = null, prevF = null;
  for (const f of S.have) {
    const g = await S.src.read(f, scale, { gray: true }), k = WIDTH / g.W;
    if (prevG && f === prevF + 1) {
      const reg = c.region ? regionAt(c.region, g) : [Math.round(g.W * 0.2), Math.round(g.H * 0.2), Math.round(g.W * 0.8), Math.round(g.H * 0.8)];
      const [dx, dy] = sadShift(prevG.data, g.data, g.W, g.H, reg, R, c.method === 'sse');
      vec.push([f, r2(dx * k), r2(dy * k)]); v.push(Math.hypot(dx, dy) * k);
    }
    prevG = g; prevF = f;
  }
  if (!v.length) return unmeasured(c, 'ardışık kare yok');
  const stepJump = c.stepJump != null ? c.stepJump : ctx.W.camera.stepJump, steps = [], stalls = [];
  let peak = 0, pa = 0; v.forEach((x, i) => { if (x > peak) { peak = x; pa = i; } if (i && Math.abs(x - v[i - 1]) > stepJump) steps.push(vec[i][0]); });
  const stallMax = c.stallMax != null ? c.stallMax : 0.5;
  for (let i = 1; i < v.length - 1; i++) if (v[i] < stallMax && v[i - 1] > 2 && v[i + 1] > 2) stalls.push(vec[i][0]);
  const accel = v.slice(1).reduce((m, x, i) => Math.max(m, Math.abs(x - v[i])), 0), srt = v.slice().sort((a, b) => a - b);
  if (c.maxPx != null && peak > c.maxPx) viol.push({ f: vec[pa][0], rule: 'tepe', v: r2(peak), max: c.maxPx });
  if (c.maxSteps != null && steps.length > c.maxSteps) steps.forEach((f) => viol.push({ f, rule: 'basamak' }));
  if (c.stalls === false) stalls.forEach((f) => viol.push({ f, rule: 'duraksama' }));
  return verdict(c, ctx, 'küresel kayma · tepe ' + r2(peak) + ' px/kare @f' + vec[pa][0] + ' · p95 ' + r2(srt[Math.floor(srt.length * 0.95)]) + ' · basamak ' + steps.length + ' · duraksama ' + stalls.length,
    { mode: 'global', scale, search: R, peak: r2(peak), peakAt: vec[pa][0], p95: r2(srt[Math.floor(srt.length * 0.95)]), accel: r2(accel), steps, stalls, vectors: vec.length <= 600 ? vec : undefined, sampled: S.have }, viol);
}

// ── 13 overlapPx ── rvw3/occl.js:5-8 (referans kare SAD hizası, ref koyu < 70 glif pikseli hedefte > 110), rvw5/gap.js (sınıf açıklığı)
async function overlapPx(c, ctx) {
  const S = await frameSet(c, ctx); if (S.error) return unmeasured(c, S.error);
  const viol = [], rows = [];
  if (c.mode === 'clearance') {
    const A = resolveClass(c.a, ctx.W.classes), B = resolveClass(c.b, ctx.W.classes), gap = c.minGap || 4;
    for (const f of S.have) {
      const img = await S.src.read(f, c.scale || null), W = img.W, H = img.H, ma = classMask(img, A), mb = classMask(img, B);
      const dist = new Int16Array(W * H).fill(-1), q = []; for (let k = 0; k < ma.length; k++) if (ma[k]) { dist[k] = 0; q.push(k); }
      for (let h = 0; h < q.length; h++) { const k = q[h], d = dist[k]; if (d >= gap) continue; const x = k % W, y = (k / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X; if (dist[j] < 0) { dist[j] = d + 1; q.push(j); } } }
      let n = 0, minD = Infinity; for (let k = 0; k < mb.length; k++) if (mb[k] && dist[k] >= 0) { n++; if (dist[k] < minD) minD = dist[k]; }
      rows.push({ f, close: n, minGap: n ? minD : null }); if (n > (c.maxClose || 0)) viol.push({ f, rule: 'açıklık', px: n, minGap: minD, need: gap });
    }
    return verdict(c, ctx, 'açıklık ' + c.a + ' ↔ ' + c.b + ' < ' + gap + ' px · ihlal ' + viol.length + ' kare', { mode: 'clearance', rows, sampled: S.have }, viol);
  }
  if (c.ref == null || !Array.isArray(c.band)) return unmeasured(c, 'ref (kare) ve band [x0, x1] gerekir');
  const refImg = await (c.refDir ? readRaw(path.join(resolveRefDir(c.refDir, ctx), pad5(c.ref) + '.png'), null, { gray: true }) : S.src.read(c.ref, null, { gray: true }));
  const rows2 = c.rows || [40, 170], dark = c.dark || 70, light = c.light || 110, al = c.align === false ? null : Object.assign({ dx: 60, dy: 20, region: null }, c.align || {});
  for (const f of S.have) {
    const t = await S.src.read(f, null, { gray: true }), W = t.W, H = t.H; let best = [0, 0];
    if (al) {
      const reg = al.region ? [al.region[0], al.region[1], al.region[0] + al.region[2], al.region[1] + al.region[3]] : [150, 10, Math.max(160, c.band[0] - 10), 120];
      let bv = Infinity;
      for (let dy = -al.dy; dy <= al.dy; dy++) for (let dx = -al.dx; dx <= al.dx; dx++) { let s = 0; for (let y = reg[1]; y < reg[3]; y += 2) for (let x = reg[0]; x < reg[2]; x += 2) { const yy = y + dy, xx = x + dx; if (yy < 0 || yy >= H || xx < 0 || xx >= W) { s += 50; continue; } s += Math.abs(t.data[y * W + x] - refImg.data[yy * W + xx]); } if (s < bv) { bv = s; best = [dx, dy]; } }
    }
    let glyph = 0, hidden = 0;
    for (let y = rows2[0]; y < rows2[1]; y++) for (let x = c.band[0]; x < c.band[1]; x++) { const yy = y + best[1], xx = x + best[0]; if (yy < 0 || yy >= H || xx < 0 || xx >= W) continue; if (refImg.data[yy * W + xx] < dark) { glyph++; if (t.data[y * W + x] > light) hidden++; } }
    rows.push({ f, shift: best, glyph, hidden });
    if (hidden > (c.maxHidden || 0)) viol.push({ f, rule: 'örtülen glif pikseli', v: hidden, max: c.maxHidden || 0 });
  }
  return verdict(c, ctx, 'örtülen glif pikseli en çok ' + Math.max(...rows.map((r) => r.hidden)) + ' (≤ ' + (c.maxHidden || 0) + ')', { mode: 'hidden', ref: c.ref, rows, sampled: S.have }, viol);
}

// sayfa verisi gereken piksel tipleri (prefetch): accentLocation kancalı izinli kutular · temporal kopya kare (kamera hızı) · identical DOM
async function camPrefetch(c, ctx, api) { return api.eval(PAGE, { kind: 'call', fn: hookName(c.camSpeed) || '__camSpeed', args: [api.fps, '$N'], W: WIDTH, H: HEIGHT, fps: api.fps, frames: api.frames }); }
async function domPrefetch(c, ctx, api) {
  const fr = Array.isArray(c.ranges) ? c.ranges.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i)) : pickFrames(c, ctx.frames, ctx), sig = {};
  for (const f of fr.slice(0, c.maxFrames || 200)) {
    await api.seek(f / api.fps);
    sig[f] = await api.eval((sel) => { let h = 0x811c9dc5; const s = [...document.querySelectorAll(sel)].map((e) => e.outerHTML).join('\n'); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); }, c.selector || '[data-fx]');
  }
  return { sig };
}

export const TYPES = {
  luma: { layer: 'pixel', run: luma },
  black: { layer: 'pixel', run: black },
  temporal: { layer: 'pixel', page: (c) => (c.detect || []).includes('dup'), prefetch: camPrefetch, run: temporal },
  ramp: { layer: 'pixel', run: ramp },
  seam: { layer: 'pixel', run: seam },
  identical: { layer: 'pixel', page: (c) => c.mode === 'dom', prefetch: domPrefetch, run: identical },
  edgeDark: { layer: 'pixel', run: edgeDark },
  accentLocation: { layer: 'pixel', page: needsAllowHook, prefetch: accentPrefetch, run: accentLocation },
  accentColor: { layer: 'pixel', run: accentColor },
  sharpness: { layer: 'pixel', run: sharpness },
  stroke: { layer: 'pixel', run: stroke },
  motion: { layer: 'pixel', run: motion },
  overlapPx: { layer: 'pixel', run: overlapPx },
};
// testler için iç ölçüler
export const _internal = { temporalSeries, sharpMeasure, strokeMeasure, sadShift, innerMedian, actBoundaries, framesDirFor, pass };
