// lib/fc/common.mjs — frame-check ortak parçaları: sonuç biçimi, önem düzeyi, world varsayılanları, $ başvuruları,
// kare seçimi (frames/range/step/at), kare kaynağı (kare dizini | mp4 | master), "incelendi" kayıtları.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, OUT, FPS, WIDTH, HEIGHT, latestMp4 } from '../project.mjs';
import { CLASSES, resolveClass, readRaw, mp4FrameRGB } from '../img.mjs';

// ── önem düzeyleri (tip varsayılanı; bildirimde "severity" ile değişir) ──────
export const DEFAULT_SEVERITY = {
  luma: 'warn', black: 'error', temporal: 'error', ramp: 'warn', seam: 'error', identical: 'error', edgeDark: 'warn',
  accentLocation: 'error', accentColor: 'error', sharpness: 'warn', stroke: 'warn', motion: 'warn', overlapPx: 'error',
  framing: 'error', toolPath: 'error', overlap: 'error', camera: 'error', sync: 'error', loudness: 'error', glyph: 'error',
};
export const SEVERITIES = ['error', 'warn', 'info'];

// ── sonuç ──────────────────────────────────────────────────────────────────
// status: pass | fail | warn (ölçülemedi / incelendi) | skip
export function result(c, status, summary, metrics = {}, violations = [], extra = {}) {
  return Object.assign({ i: c.__i, type: c.type, name: c.name || c.type + '#' + c.__i, severity: c.severity || DEFAULT_SEVERITY[c.type] || 'error',
    status, summary, metrics, violations: violations.slice(0, c.maxViolations || 200), violationCount: violations.length }, extra);
}
export const pass = (c, summary, metrics, extra) => result(c, 'pass', summary, metrics, [], extra);
export const fail = (c, summary, metrics, violations, extra) => result(c, 'fail', summary, metrics, violations || [], extra);
// ölçülemedi: kanca / kare / mp4 yok → UYARI (hata değil; CONTRACT §5)
export const unmeasured = (c, why, metrics = {}) => result(c, 'warn', 'ölçülemedi: ' + why, metrics, [], { unmeasured: true });
// ihlaller "incelendi" kayıtlarıyla süzülür: hepsi kayıtlıysa warn (incelendi), değilse fail
export function verdict(c, ctx, summary, metrics, violations) {
  const { open, reviewed } = splitReviewed(c, ctx, violations);
  if (!violations.length) return pass(c, summary, metrics);
  if (!open.length) return result(c, 'warn', summary + ' · incelendi ' + reviewed.length, metrics, reviewed, { reviewed: reviewed.length });
  return result(c, 'fail', summary, metrics, open.concat(reviewed), { reviewed: reviewed.length });
}

// manifest review: { <anahtar>: [[a, b, gerekçe], …] } — anahtar: check.review ‖ tip adı
export function splitReviewed(c, ctx, violations) {
  const list = ((ctx.scene && ctx.scene.review) || {})[c.review || c.type] || [];
  const open = [], reviewed = [];
  for (const v of violations) {
    const f = v.f != null ? v.f : v.frame;
    const r = f != null && list.find((x) => f >= x[0] && f <= x[1]);
    if (r) reviewed.push(Object.assign({}, v, { reviewed: r[2] || true })); else open.push(v);
  }
  return { open, reviewed };
}

// ── world varsayılanları ─────────────────────────────────────────────────────
// World yoksa ölçü eşikleri A3 §7'deki kaynak değerlere düşer (görsel varsayılan değil; yalnız ölçü).
export function worldDefaults(W) {
  W = W || {};
  return {
    raw: W,
    band: W.band || null,
    classes: Object.assign({}, CLASSES, W.classes || {}),
    accent: W.accent || {},
    camera: Object.assign({ stepJump: 2.5, maxSteps: 0, k3: { minShare: null } }, W.camera || {}),
    motion: Object.assign({ toolMaxPx: 57, settlePx: 2 }, W.motion || {}),
    edgeDark: Object.assign({ maxFalloff: 0.2, maxDelta: 15 }, W.edgeDark || {}),
    supersample: Object.assign({}, W.supersample || {}),
  };
}

// "$world.a.b" → world değeri · "$scene.x" → sahne alanı · "$__kanca" → kanca adı (çağıran çözer) · diğerleri aynen
export function deref(v, ctx) {
  if (typeof v !== 'string' || !v.startsWith('$')) return v;
  const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  if (v.startsWith('$world.')) { const p = v.slice(7); const x = get(ctx.W, p); return x !== undefined ? x : get(ctx.W.raw, p); }
  if (v.startsWith('$scene.')) return get(ctx.scene, v.slice(7));
  return v;
}
export const hookName = (v) => (typeof v === 'string' && v.startsWith('$__') ? v.slice(1) : null);

// ── kare seçimi ──────────────────────────────────────────────────────────────
// frames: [..] (negatif = sondan) | range: [a, b] (dahil) + step | at: 'first'|'last'|'keys'|'all' (+ n) ; varsayılan: tümü
export function pickFrames(c, N, ctx) {
  const step = Math.max(1, c.step || 1);
  let fr = [];
  const norm = (f) => (f < 0 ? N + f : f);
  if (Array.isArray(c.frames)) fr = c.frames.map(Number).map(norm);
  else if (Array.isArray(c.range)) { const [a, b] = c.range.map(Number).map(norm); for (let f = a; f <= b; f += step) fr.push(f); }
  else if (c.at === 'last') { const n = c.n || c.window || 12; for (let f = Math.max(0, N - n); f < N; f += step) fr.push(f); }
  else if (c.at === 'first') { const n = c.n || c.window || 12; for (let f = 0; f < Math.min(N, n); f += step) fr.push(f); }
  else if (c.at === 'keys') fr = ((ctx.scene && ctx.scene.keys) || []).slice();
  else for (let f = 0; f < N; f += step) fr.push(f);
  return [...new Set(fr.filter((f) => Number.isInteger(f) && f >= 0))].sort((a, b) => a - b);
}

// ── kare kaynağı ─────────────────────────────────────────────────────────────
export const pad5 = (f) => String(f).padStart(5, '0');
// kare dizini: check.dir > --frames-dir > out/frames/<id>[_<tag>]; ref "tag:T" → out/frames/<id>_T
export function framesDirFor(id, ctx, c = {}) {
  if (c.dir) return path.resolve(ROOT, c.dir);
  if (id === ctx.scene.id && ctx.framesDir) return ctx.framesDir;
  return path.join(OUT, 'frames', id + (c.tag ? '_' + c.tag : ''));
}
export function resolveRefDir(ref, ctx) {
  if (!ref) return null;
  if (ref.startsWith('tag:')) return path.join(OUT, 'frames', ctx.scene.id + '_' + ref.slice(4));
  if (ref.startsWith('scene:')) return path.join(OUT, 'frames', ref.slice(6));
  return path.resolve(ROOT, ref);
}
export function mp4For(c, ctx, id = ctx.scene.id) {
  if (c.mp4) return path.resolve(ROOT, c.mp4);
  if (c.src === 'master') {
    if (c.master) return path.resolve(ROOT, c.master);
    const d = path.join(OUT, 'master');
    if (!fs.existsSync(d)) return null;
    const m = fs.readdirSync(d).filter((f) => /\.(mov|mp4)$/i.test(f)).map((f) => ({ f: path.join(d, f), t: fs.statSync(path.join(d, f)).mtimeMs })).sort((a, b) => b.t - a.t);
    return m.length ? m[0].f : null;
  }
  if (id === ctx.scene.id && ctx.mp4) return ctx.mp4;
  return latestMp4(id);
}

// kare okuyucu: { kind, label, has(f), file(f), read(f, scale, opts) }
export function frameSource(c, ctx, id = ctx.scene.id) {
  if (c.src === 'mp4' || c.src === 'master') {
    const mp4 = mp4For(c, ctx, id);
    if (!mp4 || !fs.existsSync(mp4)) return { kind: c.src, missing: (c.src === 'master' ? 'master' : 'mp4') + ' yok' + (mp4 ? ' (' + mp4 + ')' : '') };
    return { kind: c.src, mp4, label: path.basename(mp4), has: () => true, file: () => null,
      read: async (f, scale, o) => { const img = await mp4FrameRGB(mp4, f); return scale || (o && o.gray) ? readRaw(await toPng(img), scale, o) : img; } };
  }
  const dir = framesDirFor(id, ctx, c), mix = c.mix && c.mix.dir ? path.resolve(ROOT, c.mix.dir) : null;
  const inMix = (f) => mix && (c.mix.ranges || []).some((r) => f >= r[0] && f <= r[1]);
  const file = (f) => path.join(inMix(f) ? mix : dir, pad5(f) + '.png');
  if (!fs.existsSync(dir)) return { kind: 'frames', missing: 'kare dizini yok (' + path.relative(ROOT, dir).split(path.sep).join('/') + ')' };
  return { kind: 'frames', dir, label: path.relative(ROOT, dir).split(path.sep).join('/'), has: (f) => fs.existsSync(file(f)), file, read: (f, scale, o) => readRaw(file(f), scale, o) };
}
async function toPng(img) {
  const sharp = (await import('sharp')).default;
  return sharp(img.data, { raw: { width: img.W, height: img.H, channels: img.C } }).png().toBuffer();
}

// mevcut kareler (kaynakta olmayanlar ayrı listelenir)
export function available(src, frames) {
  const have = [], missing = [];
  for (const f of frames) (src.has(f) ? have : missing).push(f);
  return { have, missing };
}

// sınıf listesi (ad | satır içi tanım) → çözülmüş sınıflar
export function classesFor(list, ctx) { return (list || []).map((x) => resolveClass(x, ctx.W.classes)); }

// sayı biçimi
export const r2 = (x) => (x == null || !Number.isFinite(x) ? x : Math.round(x * 100) / 100);
export const r3 = (x) => (x == null || !Number.isFinite(x) ? x : Math.round(x * 1000) / 1000);
export const tsec = (f) => +(f / FPS).toFixed(3);
export { FPS, WIDTH, HEIGHT, ROOT, OUT };
