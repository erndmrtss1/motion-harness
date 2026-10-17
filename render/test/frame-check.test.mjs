// frame-check piksel tipleri — sentetik PNG'lerle birim sınamaları (node --test test/).
// Geçici proje: scenes.json (60 fps, 1920×1080, iki sahne T → U) + out/frames/<id>/NNNNN.png. Modüller MOTION_PROJECT ile yüklenir.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-test-'));
const W = 1920, H = 1080;
fs.writeFileSync(path.join(ROOT, 'scenes.json'), JSON.stringify({ fps: 60, width: W, height: H, scenes: [
  { id: 'T', file: 'T.dc.html', frames: 12 }, { id: 'U', file: 'U.dc.html', frames: 12 }] }));
for (const id of ['T', 'U']) fs.writeFileSync(path.join(ROOT, id + '.dc.html'), "<script>window.OM_SCENES = '[{\"name\":\"" + id + "\",\"dur\":0.2}]';</script>");
process.env.MOTION_PROJECT = ROOT;

const sharp = (await import('sharp')).default;
const { TYPES } = await import('../lib/fc/index.mjs');
const { worldDefaults } = await import('../lib/fc/common.mjs');
const img = await import('../lib/img.mjs');

// kare yazıcı: fn(x, y) → [r, g, b]
async function frame(dir, f, fn) {
  const d = path.join(ROOT, 'out', 'frames', dir); fs.mkdirSync(d, { recursive: true });
  const buf = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const p = fn(x, y), i = (y * W + x) * 3; buf[i] = p[0]; buf[i + 1] = p[1]; buf[i + 2] = p[2]; }
  await sharp(buf, { raw: { width: W, height: H, channels: 3 } }).png({ compressionLevel: 1 }).toFile(path.join(d, String(f).padStart(5, '0') + '.png'));
}
const gray = (v) => () => [v, v, v];
function ctxFor(id = 'T', frames = 12, extra = {}) {
  return Object.assign({ scene: { id, file: id + '.dc.html', frames }, W: worldDefaults({ band: [40, 58] }), fps: 60, frames, framesDir: path.join(ROOT, 'out', 'frames', id), mp4: null,
    probeDir: path.join(ROOT, 'out', 'probe') }, extra);
}
const run = (c, ctx, data) => TYPES[c.type].run(Object.assign({ __i: 0 }, c), ctx, data);

test('img: ΔE2000 (Sharma 2005 çifti 1) ve Rec.709 luma', () => {
  assert.ok(Math.abs(img.deltaE2000([50, 2.6772, -79.7751], [50, 0, -82.7485]) - 2.0425) < 1e-3);
  assert.equal(img.luma(255, 255, 255).toFixed(3), '255.000');
  const t = img.classTest(img.CLASSES.signal); assert.equal(t(224, 32, 47), true); assert.equal(t(150, 32, 47), false);
});

test('luma: bant dışı kare (qc ölçü yolu)', async () => {
  await frame('L', 0, gray(128)); await frame('L', 1, gray(200)); await frame('L', 2, gray(110));
  const r = await run({ type: 'luma', range: [0, 2] }, ctxFor('L', 3));
  assert.equal(r.status, 'fail');
  assert.deepEqual(r.violations.map((v) => v.f), [1]);
  assert.ok(Math.abs(r.metrics.peak.v - (200 / 2.55)) < 0.2, 'tepe ≈ %78.4');
  const r2 = await run({ type: 'luma', range: [0, 2], band: null, report: 'mean' }, ctxFor('L', 3));
  assert.equal(r2.status, 'pass');
});

test('black: boş siyah koşusu > runMax', async () => {
  for (let f = 0; f < 6; f++) await frame('B', f, gray(f < 5 ? 0 : 120));
  const r = await run({ type: 'black', runMax: 3, last: false }, ctxFor('B', 6));
  assert.equal(r.status, 'fail');
  assert.ok(r.violations.some((v) => v.rule === 'boş siyah' && v.run[0] === 0 && v.run[1] === 4));
  const ok = await run({ type: 'black', runMax: 10, last: false, dark: false }, ctxFor('B', 6));
  assert.notEqual(ok.status, 'fail');
});

test('temporal: sıçrama oranı (mad) ve meanY', async () => {
  const v = [100, 102, 104, 106, 108, 120, 122, 124, 126, 128];
  for (let f = 0; f < v.length; f++) await frame('Q', f, gray(v[f]));
  const r = await run({ type: 'temporal', range: [0, 9] }, ctxFor('Q', 10));
  assert.equal(r.status, 'fail');
  assert.equal(r.violations[0].f, 5);
  assert.ok(r.violations[0].v > 5.5 && r.violations[0].v < 6.5, 'oran ≈ 6');
  const ok = await run({ type: 'temporal', range: [0, 4] }, ctxFor('Q', 10));
  assert.equal(ok.status, 'pass');
  const y = await run({ type: 'temporal', metric: 'meanY', range: [0, 9], detect: ['jump'] }, ctxFor('Q', 10));
  assert.equal(y.status, 'fail');
  assert.ok(y.violations.some((x) => x.rule === 'sıçrama' && x.f === 5));
});

test('ramp: siyaha tekdüze iniş, son kare 0', async () => {
  for (let f = 0; f < 6; f++) await frame('R', f, gray(Math.round(100 - 20 * f)));
  const r = await run({ type: 'ramp', range: [0, 5], monotone: true, lastMax: 0, maxRelDev: 0.5 }, ctxFor('R', 6));
  assert.equal(r.status, 'pass', r.summary);
  await frame('R2', 0, gray(100)); await frame('R2', 1, gray(60)); await frame('R2', 2, gray(80)); await frame('R2', 3, gray(5));
  const b = await run({ type: 'ramp', range: [0, 3], monotone: true, lastMax: 0 }, ctxFor('R2', 4));
  assert.equal(b.status, 'fail');
  assert.ok(b.violations.some((x) => x.rule === 'tekdüze değil' && x.f === 2));
  assert.ok(b.violations.some((x) => x.rule === 'son kare maks'));
});

test('seam: perde devri ≤ max(1.1 × komşu, 2)', async () => {
  for (let f = 0; f < 12; f++) await frame('T', f, gray(100));
  for (let f = 0; f < 2; f++) await frame('U', f, gray(101));
  const ok = await run({ type: 'seam', next: 'U' }, ctxFor('T', 12));
  assert.equal(ok.status, 'pass', ok.summary);
  assert.equal(ok.metrics.seam.mean, 1);
  for (let f = 0; f < 2; f++) await frame('U', f, gray(110));
  const bad = await run({ type: 'seam', next: 'U' }, ctxFor('T', 12));
  assert.equal(bad.status, 'fail');
});

test('identical: bayatlık tanığı (aynı / farklı)', async () => {
  for (let f = 0; f < 3; f++) { await frame('I', f, gray(50 + f)); await frame('I_ref', f, gray(50 + f)); }
  const ok = await run({ type: 'identical', ref: 'out/frames/I_ref', range: [0, 2], expect: 'same' }, ctxFor('I', 3));
  assert.equal(ok.status, 'pass', ok.summary);
  await frame('I_ref', 1, (x, y) => (x < 10 && y < 10 ? [0, 0, 0] : [51, 51, 51]));
  const bad = await run({ type: 'identical', ref: 'out/frames/I_ref', range: [0, 2], expect: 'same' }, ctxFor('I', 3));
  assert.equal(bad.status, 'fail');
  assert.deepEqual(bad.violations.map((v) => v.f), [1]);
});

test('edgeDark: kenar kararması (band) ve köşe düşümü (corners)', async () => {
  await frame('E', 0, (x, y) => (x < 8 || y < 8 || x >= W - 8 || y >= H - 8 ? [20, 20, 20] : [200, 200, 200]));
  await frame('E', 1, gray(200));
  const r = await run({ type: 'edgeDark', range: [0, 1] }, ctxFor('E', 2));
  assert.equal(r.status, 'fail');
  assert.deepEqual(r.violations.map((v) => v.f), [0]);
  await frame('V', 0, (x, y) => { const d = Math.hypot(x - W / 2, y - H / 2) / Math.hypot(W / 2, H / 2), v = Math.round(220 * (1 - 0.5 * d * d)); return [v, v, v]; });
  const c = await run({ type: 'edgeDark', mode: 'corners', frames: [0] }, ctxFor('V', 1));
  assert.equal(c.status, 'fail');
  assert.ok(c.violations[0].v > 0.3);
});

test('accentLocation: aksan yalnız izinli kutuda', async () => {
  const red = (x0, y0, x1, y1) => (x, y) => (x >= x0 && x <= x1 && y >= y0 && y <= y1 ? [224, 32, 47] : [240, 238, 230]);
  await frame('A', 0, red(100, 100, 200, 200));
  await frame('A', 1, red(1000, 600, 1100, 700));
  const r = await run({ type: 'accentLocation', classes: ['signal'], allow: [[90, 90, 210, 210]], range: [0, 1] }, ctxFor('A', 2));
  assert.equal(r.status, 'fail');
  assert.deepEqual(r.violations.map((v) => v.f), [1]);
  assert.ok(r.metrics.totals.signal.kutu > 0);
});

test('accentColor: iç piksel medyanı ΔE2000 (hedef + çift)', async () => {
  const blk = (rgb) => (x, y) => (x >= 400 && x < 700 && y >= 300 && y < 500 ? rgb : [242, 241, 236]);
  await frame('C', 0, blk([0xdb, 0x1d, 0x2e]));
  await frame('C', 1, blk([0xb5, 0x20, 0x30]));
  const r = await run({ type: 'accentColor', target: '#DB1D2E', frames: [0, 1], maxDeltaE: 3 }, ctxFor('C', 2));
  assert.equal(r.metrics.rows[0].dE, 0);
  assert.equal(r.metrics.rows[0].median, '#DB1D2E');
  assert.equal(r.status, 'fail');
  assert.deepEqual(r.violations.map((v) => v.f), [1]);
  const p = await run({ type: 'accentColor', pairs: [[0, 1]], maxPairDeltaE: 20 }, ctxFor('C', 2));
  assert.equal(p.status, 'pass', p.summary);
  assert.ok(p.metrics.pairs[0].dE > 3);
});

test('sharpness: keskin kırmızı ↔ bulanık koyu bölge kenar genişliği oranı', async () => {
  const paper = [240, 238, 230];
  await frame('S', 0, (x, y) => {
    if (x >= 600 && x < 1300 && y >= 300 && y < 400) return Math.floor((x - 600) / 30) % 2 ? paper : [220, 30, 40];   // keskin kırmızı şeritler
    if (x >= 560 && x < 1340 && y >= 470 && y < 640) {   // koyu şeritler, 8 px doğrusal kenar rampası
      const p = (x - 560) % 60, t = Math.max(0, Math.min(1, (15 - Math.abs(p - 30)) / 8 + 0.5)), v = Math.round(240 - t * 210);
      return [v, v, Math.round(230 - t * 200)];
    }
    return paper;
  });
  const r = await run({ type: 'sharpness', frames: [0], ratio: [0, 0.6] }, ctxFor('S', 1));
  assert.equal(r.status, 'pass', r.summary);
  assert.ok(r.metrics.rows[0].ratio < 0.6 && r.metrics.rows[0].a.edge1090 < 1.5, JSON.stringify(r.metrics.rows[0]));
  const bad = await run({ type: 'sharpness', frames: [0], ratio: [0.9, 1.1] }, ctxFor('S', 1));
  assert.equal(bad.status, 'fail');
});

test('stroke: çizgi kalınlığı ve ref farkı', async () => {
  const line = (y0, th) => (x, y) => (x >= 100 && x <= 900 && y >= y0 && y < y0 + th ? [220, 30, 40] : [240, 238, 230]);
  await frame('K', 0, line(500, 4)); await frame('K_ref', 0, line(500, 6));
  const r = await run({ type: 'stroke', box: [200, 480, 800, 530], frames: [0], ref: 'out/frames/K_ref' }, ctxFor('K', 1));
  assert.ok(Math.abs(r.metrics.rows[0].thickness - 4) < 0.6, 'kalınlık ≈ 4: ' + r.metrics.rows[0].thickness);
  assert.equal(r.status, 'fail');
  assert.ok(r.violations.some((v) => v.rule === 'çizgi thickness'));
});

test('motion: küresel kayma 8 px/kare (SAD + alt piksel)', async () => {
  const tex = (sh) => (x, y) => { const X = x + sh, v = Math.round(128 + 60 * Math.sin(X / 23) * Math.cos(y / 17) + 40 * Math.sin((X + 2 * y) / 41)); return [v, v, v]; };
  for (let f = 0; f < 4; f++) await frame('M', f, tex(8 * f));
  const r = await run({ type: 'motion', range: [0, 3] }, ctxFor('M', 4));
  assert.ok(Math.abs(r.metrics.peak - 8) < 0.8, 'tepe ≈ 8: ' + r.metrics.peak);
  assert.equal(r.metrics.steps.length, 0);
});

test('overlapPx: referansta koyu glif pikseli hedefte açık (örtülme)', async () => {
  const glyph = (cover) => (x, y) => { if (cover && x >= 600 && x < 650 && y >= 60 && y < 160) return [230, 230, 230]; return x >= 560 && x < 700 && y >= 80 && y < 140 ? [20, 20, 20] : [240, 240, 240]; };
  await frame('O', 0, glyph(false)); await frame('O', 1, glyph(false)); await frame('O', 2, glyph(true));
  const r = await run({ type: 'overlapPx', ref: 0, band: [500, 760], rows: [40, 170], align: false, range: [1, 2] }, ctxFor('O', 3));
  assert.equal(r.status, 'fail');
  assert.deepEqual(r.violations.map((v) => v.f), [2]);
  assert.equal(r.metrics.rows[0].hidden, 0);
  assert.equal(r.violations[0].v, 50 * 60);
});

test('tasarım zamanı: PAGE (framing / tools / overlap) sahte kancalarla + kamera özeti', async () => {
  const { PAGE, cameraStats } = await import('../lib/fc/design.mjs');
  const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  globalThis.window = {
    __frameN: () => 10, __frameT: (i) => i / 10,
    __boxes: (T) => [{ name: 'kutu', kind: 'obj', poly: rect(T > 0.45 ? 1915 : 100, 100, 200, 100) }, { name: 'lyric', kind: 'lyric', poly: rect(300, 300, 400, 200), px: 150 }],
    __tools: (T) => (T >= 0.2 && T <= 0.6 ? { kalem: { tip: [-50 + 400 * (T - 0.2) * 10, 500], poly: rect(-50 + 400 * (T - 0.2) * 10, 500, 20, 20), phase: T < 0.4 ? 'a' : 'b' } } : {}),
    __holds: () => [[0.5, 0.55]],
  };
  try {
    const fr = PAGE({ kind: 'framing', W: 1920, H: 1080, fps: 10, kinds: { obj: { pad: 12 }, lyric: { pad: 50, minPx: 160 } }, step: 1 });
    assert.equal(fr.frames, 10);
    assert.equal(fr.bad, 10, 'lyric 150 px < 160 her karede');
    assert.equal(fr.rules.pay, 5, 'kutu f5–f9 kesik');
    const tl = PAGE({ kind: 'tools', W: 1920, H: 1080, fps: 10, k8: true, single: true, holds: '__holds', step: 1 });
    assert.equal(tl.peaks.kalem.abs, 400);
    assert.ok(tl.peaks['kalem/a'] && tl.peaks['kalem/b']);
    assert.ok(tl.viol.some((v) => v.rule === 'tutuşta alet'));
    assert.ok(tl.viol.some((v) => v.rule === 'K8 çıkış'), 'son karede görünür');
    const ov = PAGE({ kind: 'overlap', W: 1920, H: 1080, fps: 10, a: 'tool:kalem', b: 'box:lyric', shape: 'sat', step: 1 });
    assert.ok(ov.hitCount >= 1);
  } finally { delete globalThis.window; }
  const s = cameraStats([0, 1, 1, 1, 5, 5, 5, 0.2, 0.2], { stepJump: 2.5, shots: [['A', 1, 8]], k3v: [0.64] });
  assert.equal(s.peak, 5); assert.deepEqual(s.steps, [4, 7]); assert.equal(s.k3[0]['≥0.64'], 0.75);
});

test('ölçülemedi: kare dizini yoksa UYARI', async () => {
  const r = await run({ type: 'luma' }, ctxFor('YOK', 3));
  assert.equal(r.status, 'warn');
  assert.match(r.summary, /ölçülemedi/);
});

test.after(() => { try { fs.rmSync(ROOT, { recursive: true, force: true }); } catch { /* yut */ } });
