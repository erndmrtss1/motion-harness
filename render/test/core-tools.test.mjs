// madde 6 çekirdek araçları: plan-check · seri-uret (pivot kilitli süreklilik) · parite (kalite paritesi) · ingest-kapi (malzeme) (node --test test/).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'core-tools-'));
process.env.MOTION_PROJECT = TMP;
fs.writeFileSync(path.join(TMP, 'scenes.json'), JSON.stringify({ fps: 60, width: 1920, height: 1080, scenes: [] }));
const { planCheck } = await import('../lib/plan-check.mjs');
const seri = await import('../lib/seri.mjs');
const { measureImage, parity } = await import('../lib/parite.mjs');
const { materialGate } = await import('../lib/malzeme.mjs');

test('plan-check: kusur (senkron, tek alet, giriş/çıkış, alet hızı, kanca) ve kota (UYARI) ayrı', () => {
  const tool = (name, t0, inDur, work, outDur, from = [-200, 500], to = [400, 500]) => ({ name, in: { t: t0, dur: inDur, from, to }, work: { t: t0 + inDur, dur: work }, out: { t: t0 + inDur + work, dur: outDur, from: to, to: [2200, 500] } });
  const plan = { fps: 60, dur: 10, events: [
    { id: 'e1', t: 1.0, a0: 1.0, word: 'bir' },
    { id: 'e2', t: 2.05, a0: 2.0, word: 'iki' },                                  // 3 kare geç → senkron kusuru
    { id: 'e3', t: 3.0, tool: tool('kalem', 2.5, 0.5, 1.0, 0.6) },                 // 2,5–4,6 s
    { id: 'e4', t: 4.2, tool: tool('cetvel', 4.0, 0.25, 0.5, 0.5) },               // örtüşür + giriş 0,25 s
  ], sentences: [{ n: 1, t0: 0.5, t1: 1.5 }, { n: 2, t0: 7, t1: 9 }], shots: [{ id: 'A', t0: 0, t1: 5 }, { id: 'B', t0: 5, t1: 10 }] };
  const r = planCheck(plan, { toolMaxPx: 12 }, { refs: ['e1', 'e99'] });
  const rules = r.errors.map((x) => x.rule);
  assert.ok(rules.includes('senkron')); assert.ok(rules.includes('tek alet')); assert.ok(rules.includes('giriş'));
  assert.ok(rules.includes('alet hızı'), 'cetvel 600 px / 15 kare = 40 px/kare > 12');
  assert.ok(r.errors.some((x) => x.rule === 'kanca' && x.id === 'e99'));
  assert.ok(!r.errors.some((x) => x.rule === 'senkron' && x.id === 'e1'));
  const w = r.warnings.map((x) => x.rule);
  assert.ok(w.includes('boş pencere') && w.includes('cümle kapsamı') && w.includes('sınır vuruşu'));
  const ok = planCheck({ fps: 60, dur: 4, events: [{ id: 'a', t: 0.5 }, { id: 'b', t: 1.5 }, { id: 'c', t: 2.5 }, { id: 'd', t: 3.5 }] });
  assert.equal(ok.errors.length, 0); assert.equal(ok.warnings.length, 0);
});

test('seri: çözülebilirlik (zıt uçlu bitişik pivotlar arasında tek mum), üretim kısıtları, determinizm', () => {
  const bad = seri.feasibility({ n: 10, pivots: [{ i: 2, uc: 'l', v: 0.2 }, { i: 4, uc: 'h', v: 0.8 }], minBetween: 2 });
  assert.equal(bad.ok, false); assert.equal(bad.issues[0].rule, 'pivotlar arası mum');
  const step = seri.feasibility({ n: 10, step: 0.05, pivots: [{ i: 1, uc: 'l', v: 0.1 }, { i: 5, uc: 'h', v: 0.9 }] });
  assert.ok(step.issues.some((x) => x.rule === 'adım bütçesi'));
  const spec = { n: 12, start: 0.5, pivots: [{ i: 3, uc: 'h', v: 0.8 }, { i: 7, uc: 'l', v: 0.3 }, { i: 11, uc: 'h', v: 0.9 }], body: [0.35, 0.75], minBody: 0.02, minWick: 0.006, margin: 0.02, step: 0.2, bounds: [0, 1] };
  const g = seri.generate(spec, { seed: 7 });
  assert.ok(g.ok, JSON.stringify(g.rejected));
  assert.equal(seri.check(g.series, spec).length, 0);
  for (let i = 1; i < g.series.length; i++) assert.equal(g.series[i].o, g.series[i - 1].c, 'boşluk 0');
  assert.equal(g.series[3].h, 0.8); assert.equal(g.series[7].l, 0.3);
  assert.deepEqual(seri.generate(spec, { seed: 7 }).series, g.series, 'aynı tohum aynı seri');
  const v = seri.generate(spec, { seed: 7, maxTries: 50, validate: () => [{ rule: 'proje kuralı' }] });
  assert.equal(v.ok, false); assert.equal(v.rejected['proje kuralı'], 50);
});

// sentetik kâğıt + n koyu blok (gruplar ayrık)
function page(W, H, blocks) {
  const d = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 225 + ((x * 7 + y * 3) % 5); for (const b of blocks) if (x >= b[0] && x < b[2] && y >= b[1] && y < b[3]) v = 30; const i = (y * W + x) * 3; d[i] = d[i + 1] = d[i + 2] = v; }
  return { data: d, W, H, C: 3 };
}
test('parite: grup sayısı, ink, negatif alan, kahraman oranı; medyan sapması ve tek yönlü sınır', () => {
  const W = 960, H = 540, a = measureImage(page(W, H, [[100, 100, 300, 300], [500, 100, 560, 160], [700, 400, 760, 460]]));
  assert.equal(a.groups, 3);
  assert.ok(Math.abs(a.ink - (100 * (200 * 200 + 2 * 60 * 60)) / (W * H)) < 0.5, 'ink ≈ ' + a.ink);
  assert.ok(a.heroRatio > 3 && a.negative > 50, JSON.stringify(a));
  const band = measureImage(page(W, H, [[100, 100, 300, 300], [500, 100, 560, 160], [0, 470, W, 540]]));   // tam en koyu zemin bandı
  assert.equal(band.surfaces, 1); assert.ok(band.heroRatio > 3, 'bant kahraman olamaz'); assert.ok(band.ink > band.inkContent + 10, 'bant inkIcerik dışı');
  const b = measureImage(page(W, H, [[100, 100, 300, 300]]));
  assert.equal(b.groups, 1);
  const p = parity([a], [b], { tol: 0.2, metrics: ['groups', 'ink'] });
  assert.equal(p.pass, false);
  assert.ok(p.rows.find((r) => r.metric === 'groups').dev > 1);
  const q = parity([b], [a], { tol: 0.2, sides: { groups: 'ust', ink: 'ust' }, metrics: ['groups', 'ink'] });
  assert.equal(q.pass, true, 'sadelik serbest: proje referanstan az grup/ink taşıyabilir');
});

test('ingest-kapi (malzeme): doku std, palet ΔE (kazanç eşlemesi sonrası), kimlik artığı, göz notu', () => {
  const W = 1920, H = 1080, d = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const n = ((x * 73856093) ^ (y * 19349663)) >>> 0, v = 150 + (n % 24); const i = (y * W + x) * 3; d[i] = v; d[i + 1] = v - 10; d[i + 2] = v - 30; }
  const img = { data: d, W, H, C: 3 }, regions = [{ name: 'zemin', rect: [0, 0, 960, 540], target: 'krem' }];
  const r0 = materialGate(img, { regions, palette: { krem: '#E8DCC0' } });
  assert.equal(r0.verdict, 'KALDI'); assert.ok(r0.rows[0].dE > 3, 'eşlemesiz renk uzak');
  const r1 = materialGate(img, { regions, palette: { krem: '#E8DCC0' }, map: 'gain' });
  assert.ok(r1.rows[0].dE <= 3, JSON.stringify(r1.rows[0])); assert.ok(r1.rows[0].identity <= 6); assert.ok(r1.rows[0].std >= 6);
  assert.equal(r1.verdict, 'GÖZ BEKLİYOR');
  assert.equal(materialGate(img, { regions, palette: { krem: '#E8DCC0' }, map: 'gain', goz: 'yazı/el/logo yok' }).verdict, 'GEÇTİ');
  const flat = { data: Buffer.alloc(W * H * 3, 200), W, H, C: 3 };
  assert.ok(materialGate(flat, { regions: [{ name: 'düz', rect: [0, 0, 960, 540] }] }).rows[0].fails[0].startsWith('doku std'));
});

test.after(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* yut */ } });
