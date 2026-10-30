// motion-test saf parçaları: anahtar kare ara değeri (üretilen jsx), hareket vektörü / hız profili, grafik, kontak (node --test test/).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-test-'));
process.env.MOTION_PROJECT = TMP;
fs.writeFileSync(path.join(TMP, 'scenes.json'), JSON.stringify({ fps: 60, width: 1920, height: 1080, scenes: [] }));
const mt = await import('../lib/motion-test.mjs');

test('testJsx: anahtar kare ara değeri (MH.ease adıyla) ve sabit prop', () => {
  const src = mt.testJsx({ comp: 'Kutu', props: { x: [[0, 0], [1, 100, 'linear']], y: 5, o: { a: 1 } } });
  const m = /function mtVal[\s\S]*?\n}\n/.exec(src);
  assert.ok(m, 'mtVal üretildi');
  const MH = { ease: { get: (n) => (n === 'linear' ? (u) => u : (u) => 0.5 - 0.5 * Math.cos(Math.PI * u)) } };
  const mtVal = new Function('MH', m[0] + 'return mtVal;')(MH);
  assert.equal(mtVal([[0, 0], [1, 100, 'linear']], 0.25), 25);
  assert.ok(Math.abs(mtVal([[0, 0], [1, 100]], 0.5) - 50) < 1e-9, 'varsayılan sine yarıda 0,5');
  assert.equal(mtVal([[0, 0], [1, 100]], 2), 100);
  assert.equal(mtVal(5, 0.3), 5);
  assert.deepEqual(mtVal({ a: 1 }, 0.3), { a: 1 });
  assert.match(src, /Object\.assign\(window, \{ MOTION_TEST: MOTION_TEST \}\)/);
  const page = mt.testPage({ from: ['shared/motion-stage.jsx', 'x.jsx'], dur: 3 });
  assert.match(page, /"dur":3/); assert.match(page, /from="shared\/motion-stage\.jsx x\.jsx"/);
});

// dokulu kare: (ox, oy) kaydırılmış dokulu kare, düz gri zemin
function frameWith(W, H, ox, oy) {
  const b = new Uint8Array(W * H).fill(128);
  for (let y = 0; y < 80; y++) for (let x = 0; x < 120; x++) { const X = Math.round(ox) + x, Y = Math.round(oy) + y; if (X >= 0 && Y >= 0 && X < W && Y < H) b[Y * W + X] = 60 + ((((x * 73856093) ^ (y * 19349663)) >>> 0) % 90); }   // periyotsuz doku (periyodik doku sahte eşleşme verir)
  return b;
}
test('motionVector + profile: sabit hızla kayan kare 6 px/kare (960 ölçeği → 12 px @1080); duruşta 0', () => {
  const W = 960, H = 540, fr = [];
  for (let i = 0; i < 20; i++) fr.push(frameWith(W, H, 100 + (i < 15 ? 6 * i : 84), 200));
  const v = mt.motionVector(fr[3], fr[4], W, H, { R: 24 });
  assert.ok(Math.abs(v.d[0] - 6) < 0.3 && Math.abs(v.d[1]) < 0.3, JSON.stringify(v));
  const p = mt.profile(fr, W, H, { fps: 30, R: 48 });
  assert.ok(Math.abs(p.speed[5] - 12) < 0.6, 'hız ≈ 12 px/kare @1080: ' + p.speed[5]);
  assert.equal(p.speed[17], 0, 'duruş');
  assert.ok(p.c1.jumps >= 1, 'ani duruş C1 sıçramasıdır');
  assert.equal(p.accel.length, 20);
});

test('speedSvg + contactSheet: dosya üretir', async () => {
  const p = { fps: 30, speed: [0, 2, 4, 4, 2, 0], accel: [0, 2, 2, 0, -2, -2], peak: 4, maxAccel: 2, c1: { worstShare: 0.5 } };
  const svg = mt.speedSvg([{ label: 'test', color: '#1f5fbf', p }, { label: 'ref', color: '#d9822b', p }], { title: 'deneme' });
  assert.equal((svg.match(/<polyline/g) || []).length, 4, 'iki panel × iki seri');
  const png = path.join(TMP, 'h.png'); await mt.svgPng(svg, png); assert.ok(fs.statSync(png).size > 1000);
  const sharp = (await import('sharp')).default, small = await sharp({ create: { width: 64, height: 36, channels: 3, background: '#345' } }).png().toBuffer();
  const out = path.join(TMP, 'k.png');
  await mt.contactSheet([{ label: 'test', frames: [{ t: 0, png: small }, { t: 0.5, png: small }] }, { label: 'ref', frames: [{ t: 0, png: small }] }], out, { cell: 160, title: 'x' });
  const m = await sharp(out).metadata(); assert.equal(m.width, 320); assert.ok(m.height > 180);
});

test.after(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* yut */ } });
