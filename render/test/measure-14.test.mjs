// 1.4 ölçüm düzeltmeleri — sharpness bölge kuralı · temporal tam liste · pop arama sınırı / auto · onset sınıf eşiği / göreli eşik / A/B kesilme ·
// plan-check (sınıf haritası, vuruş aralığı, öncülük, kare ızgarası, kural C fizibilitesi, çıktı adı) · frame-check --only çıktı adı (node --test test/).
// Geçici proje: scenes.json (60 fps, 1920×1080) + out/frames/<id>/NNNNN.png sentetik kareler. Modüller MOTION_PROJECT ile yüklenir.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RENDER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'measure14-'));
const W = 1920, H = 1080;
fs.writeFileSync(path.join(ROOT, 'scenes.json'), JSON.stringify({ fps: 60, width: W, height: H, scenes: [
  { id: 'M', file: 'M.dc.html', frames: 4, checks: [{ type: 'luma', band: null, report: 'mean' }] }] }));
fs.writeFileSync(path.join(ROOT, 'M.dc.html'), "<script>window.OM_SCENES = '[{\"name\":\"M\",\"dur\":0.0667}]';</script>");
process.env.MOTION_PROJECT = ROOT;

const sharp = (await import('sharp')).default;
const { TYPES } = await import('../lib/fc/index.mjs');
const { worldDefaults } = await import('../lib/fc/common.mjs');
const craft = await import('../lib/fc/craft.mjs');
const { planCheck, moveProfile, gridOf } = await import('../lib/plan-check.mjs');

// kâğıt dokusu (deterministik) + dikdörtgenler [{x0, y0, x1, y1, v, tex?}] ya da fn(x, y) → [r, g, b]
const paper = (x, y) => Math.round(200 + 18 * Math.sin(x / 7.3) * Math.cos(y / 5.1) + 10 * Math.sin((x + 3 * y) / 13));
async function frame(dir, f, rects = []) {
  const d = path.join(ROOT, 'out', 'frames', dir); fs.mkdirSync(d, { recursive: true });
  const buf = Buffer.alloc(W * H * 3);
  if (typeof rects === 'function') { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const p = rects(x, y), i = (y * W + x) * 3; buf[i] = p[0]; buf[i + 1] = p[1]; buf[i + 2] = p[2]; } }
  else for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = paper(x, y);
    for (const r of rects) if (x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1) v = r.tex ? Math.round(r.v + 25 * Math.sin((x - r.x0) / 4) * Math.cos((y - r.y0) / 3)) : r.v;
    const i = (y * W + x) * 3; buf[i] = buf[i + 1] = buf[i + 2] = Math.max(0, Math.min(255, v));
  }
  await sharp(buf, { raw: { width: W, height: H, channels: 3 } }).png({ compressionLevel: 1 }).toFile(path.join(d, String(f).padStart(5, '0') + '.png'));
}
const ctxFor = (id, frames, scene = {}) => ({ scene: Object.assign({ id, file: 'M.dc.html', frames }, scene), W: worldDefaults({}), fps: 60, frames, framesDir: path.join(ROOT, 'out', 'frames', id), mp4: null, step: 1 });
const run = (c, ctx, data) => TYPES[c.type].run(Object.assign({ __i: 0 }, c), ctx, data);

test('sharpness: aksan kotası 0 ya da red pikseli eşik altı → "bölge tanımı gerekli"; özet bölge sınıfı + kutusu', async () => {
  const pap = [240, 238, 230];
  // yalnız küçük sıcak leke (aksan değil) + koyu şerit
  await frame('SH', 0, (x, y) => (x >= 600 && x < 610 && y >= 300 && y < 310 ? [200, 60, 50] : x >= 560 && x < 1340 && y >= 470 && y < 640 && (x % 60) < 30 ? [30, 30, 30] : pap));
  const q0 = await run({ type: 'sharpness', frames: [0] }, ctxFor('SH', 1, { redQuota: 0 }));
  assert.equal(q0.status, 'warn'); assert.match(q0.summary, /bölge tanımı gerekli.*kotası 0/);
  const low = await run({ type: 'sharpness', frames: [0] }, ctxFor('SH', 1));
  assert.equal(low.status, 'warn'); assert.match(low.summary, /bölge tanımı gerekli \(red sınıfı < 200 px/);
  // açık bölge tanımı: sınıf + kutu özet satırında
  const own = await run({ type: 'sharpness', frames: [0], regions: { a: { cls: 'darkNeutral' }, b: { cls: 'darkNeutral' } } }, ctxFor('SH', 1, { redQuota: 0 }));
  assert.notEqual(own.status, 'warn', own.summary);
  assert.match(own.summary, /bölge a darkNeutral \[\d+,\d+,\d+,\d+\] · b darkNeutral/);
  assert.equal(own.metrics.regions.a, 'darkNeutral'); assert.equal(own.metrics.defaultPair, undefined);
});

test('temporal: penceredeki eşik üstü bütün kareler ihlal; özet "n kare > eşik"', async () => {
  const v = [100, 101, 102, 112, 113, 114, 115, 125, 126, 127, 128];   // f3 ve f7 sıçrar
  for (let f = 0; f < v.length; f++) await frame('TQ', f, () => [v[f], v[f], v[f]]);
  const r = await run({ type: 'temporal', range: [0, 10] }, ctxFor('TQ', 11));
  assert.equal(r.status, 'fail');
  assert.deepEqual(r.violations.map((x) => x.f), [3, 7]);
  assert.match(r.summary, /2 kare > eşik/);
  assert.equal(r.metrics.windows[0].over, 2);
});

test('pop: hareket arama penceresinden hızlı → "aday" (UYARI, ihlal değil); searchMax "auto" açıklar; gerçek tek kare belirme ihlal kalır', async () => {
  // dokulu kart tek karede 72 px kayar (fast ölçekte 18 px > arama 12): hareket, pop değil
  const card = (x0) => [{ x0, y0: 300, x1: x0 + 400, y1: 600, v: 120, tex: true }];
  for (let f = 0; f < 8; f++) await frame('FAST', f, card(f >= 4 ? 672 : 600));
  const r = await run({ type: 'pop' }, ctxFor('FAST', 8));
  assert.equal(r.status, 'warn', r.summary);
  assert.match(r.summary, /aday \(hız arama penceresini aşıyor\) \d+ \(f4/);
  assert.equal(r.violationCount, r.edge);
  assert.ok(r.metrics.edgeCandidates[0].probe.searchPx >= 96, JSON.stringify(r.metrics.edgeCandidates[0]));
  const a = await run({ type: 'pop', searchMax: 'auto' }, ctxFor('FAST', 8));
  assert.equal(a.status, 'pass', a.summary);
  assert.ok(a.metrics.searchUsed >= 72, 'auto pencere ≥ 72 px: ' + a.metrics.searchUsed);
  // gerçek pop: kart tek karede belirir → yoklama araması açıklayamaz, ihlal kalır
  for (let f = 0; f < 8; f++) await frame('POP2', f, f >= 4 ? [{ x0: 700, y0: 300, x1: 1100, y1: 600, v: 60 }] : []);
  const p = await run({ type: 'pop' }, ctxFor('POP2', 8));
  assert.equal(p.status, 'fail', p.summary); assert.equal(p.violations[0].f, 4); assert.equal(p.metrics.edgeCandidates, undefined);
  const pa = await run({ type: 'pop', searchMax: 'auto' }, ctxFor('POP2', 8));
  assert.equal(pa.status, 'fail', 'auto gerçek pop\'u açıklamaz: ' + pa.summary);
});

test('explainShift: sınır bayrağı ve yoklama (saf)', () => {
  // yumuşak, dönemsiz doku (x'te eğim): yanlış kaydırmada maliyet gerçek kaymaya doğru azalır → en iyi d pencere sınırına dayanır
  const w = 120, h = 60, tex = (x, y) => 3 * x + 40 * Math.sin(y / 5);
  const prev = new Float32Array(w * h), cur = new Float32Array(w * h), pix = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { prev[y * w + x] = tex(x, y); cur[y * w + x] = tex(x - 14, y); }   // 14 px kayma > R 8
  for (let y = 10; y < 50; y++) for (let x = 40; x < 80; x++) pix.push(y * w + x);
  const e = craft.explainShift(prev, cur, w, h, Int32Array.from(pix), { R: 8, edgeProbe: true });
  assert.equal(e.edge, true); assert.ok(e.edgeExplained && Math.abs(e.edgeExplained.d[0] - 14) <= 2 && e.edgeExplained.share < 0.05, JSON.stringify(e.edgeExplained));
  assert.ok(e.unexplained.length > 0, 'yoklama sonucu benimsenmez');
  const au = craft.explainShift(prev, cur, w, h, Int32Array.from(pix), { R: 8, auto: true, cap: 32 });
  assert.ok(Math.abs(au.d[0] - 14) <= 2 && au.d[1] === 0, JSON.stringify(au.d)); assert.equal(au.R, 16); assert.ok(au.share < 0.05 && au.unexplained.length === 0);
  const d0 = craft.explainShift(prev, cur, w, h, Int32Array.from(pix), { R: 8 });
  assert.equal(d0.edgeExplained, null, 'yoklama istenmezse önceki davranış');
});

test('onset: tY sınıf haritası ve göreli eşik (yumuşak öncü); tek eşik eski davranış; A/B kesilme ≠ kanca yok', async () => {
  assert.deepEqual(craft.thresholdFor({}), { tY: 40, cls: 'tek' });
  assert.deepEqual(craft.thresholdFor({ tY: 25 }), { tY: 25, cls: 'tek' });
  assert.deepEqual(craft.thresholdFor({ tY: { default: 40, golge: { rel: 0.3 } } }, { class: 'golge' }), { rel: 0.3, min: 2, floor: 2, cls: 'golge' });
  assert.deepEqual(craft.thresholdFor({ tY: { default: 35, isik: 12 } }, { kind: 'kart' }), { tY: 35, cls: 'default' });
  assert.equal(craft.relThreshold([0, 1, 30, 40, 50], { rel: 0.5 }).tY, 20);
  assert.equal(craft.relThreshold([0, 1], { rel: 0.5 }), null);
  // düz zemin üstünde gölge rampası: f6'dan başlayıp kare başı 8/255 koyulaşır (40/255 tek eşiği hiç geçmez)
  for (let f = 0; f < 14; f++) await frame('SOFT', f, [{ x0: 800, y0: 400, x1: 1100, y1: 600, v: 200 }, ...(f >= 6 ? [{ x0: 900, y0: 480, x1: 1000, y1: 520, v: 200 - 8 * (f - 5) }] : [])]);
  const ev = [{ name: 'gölge', f: 6, class: 'golge', region: [880, 460, 140, 80] }];
  const one = await run({ type: 'onset', events: ev, pre: 0.05, post: 0.1 }, ctxFor('SOFT', 14));
  assert.equal(one.status, 'fail'); assert.equal(one.violations[0].rule, 'görünür başlangıç yok');
  assert.doesNotMatch(one.summary, /eşik sınıfı/, 'tek eşikte özet önceki biçimde');
  const cls = await run({ type: 'onset', events: ev, pre: 0.05, post: 0.1, tY: { default: 40, golge: { rel: 0.1 } } }, ctxFor('SOFT', 14));
  assert.equal(cls.status, 'pass', cls.summary);
  assert.equal(cls.metrics.rows[0].onset, 6); assert.equal(cls.metrics.rows[0].tYClass, 'golge'); assert.ok(cls.metrics.rows[0].tY < 8, 'eşik ' + cls.metrics.rows[0].tY);
  assert.match(cls.summary, /eşik sınıfı golge/);
  // A/B çizimi kesildi: "kanca yok" değil, kaçıncı olayda kalındığıyla
  const cut = await run({ type: 'onset', hide: 'X', events: ev }, ctxFor('SOFT', 14), { abError: 'page.screenshot: Target crashed', phase: 'B', done: 3, total: 64 });
  assert.equal(cut.status, 'warn'); assert.match(cut.summary, /A\/B çizimi kesildi \(olay 3\/64\).*zaman aşımı ya da dış kesme/); assert.doesNotMatch(cut.summary, /kanca yok/);
});

test('plan-check: sınıf haritası (entry), vuruş aralığı + öncü, muafiyet; blok yoksa eski sonuç', () => {
  const tool = (name, t0, inDur, work, outDur, cls) => ({ name, class: cls, in: { t: t0, dur: inDur }, work: { t: t0 + inDur, dur: work }, out: { t: t0 + inDur + work, dur: outDur } });
  const plan = { fps: 60, dur: 6, events: [
    { id: 'k', t: 1.0, tool: tool('kalem', 0.8, 0.2, 0.5, 0.3, 'kalem') },        // minEntryS 0,4 ile giriş/çıkış kusuru; sınıf haritasıyla geçer
    { id: 'c', t: 2.0, class: 'kart', in: { dur: 0.25 } },                          // kart girişi 0,25 < 0,3
    { id: 'g', t: 1.935, of: 'c', class: 'golge' },                                  // öncü (65 ms önce) — vuruş başlangıcı sayılmaz
    { id: 'd', t: 2.0 },                                                             // c ile aynı an
    { id: 'e', t: 2.1 },                                                             // 100 ms sonra
    { id: 'x', t: 2.15, exempt: true },                                              // muaf
  ] };
  const base = planCheck(plan, {});
  assert.deepEqual(base.errors.map((x) => x.rule), ['giriş', 'çıkış'], 'blok yok: yalnız alet minEntryS');
  assert.equal(base.beats, undefined); assert.equal(base.moves, undefined); assert.equal(base.grid, undefined);
  const r = planCheck(plan, { entry: { kalem: { in: 0.15, out: 0.25 }, kart: { in: 0.3, out: 0.7 } }, beats: { maxConcurrent: 1, minGapMs: 120 }, leads: { golge: [60, 70] } });
  const rules = r.errors.map((x) => x.rule);
  assert.ok(!rules.includes('çıkış') && !r.errors.some((x) => x.rule === 'giriş' && x.id === 'k'), 'kalem sınıf eşiğiyle geçer');
  assert.ok(r.errors.some((x) => x.rule === 'giriş' && x.id === 'c' && x.cls === 'kart'));
  assert.ok(r.errors.some((x) => x.rule === 'eşzamanlı vuruş' && x.ids.join() === 'c,d'));
  assert.ok(r.errors.some((x) => x.rule === 'vuruş aralığı' && x.ids.join() === 'c,e' && x.ms === 100));
  assert.ok(!rules.includes('öncülük'), '65 ms bant içinde');
  assert.equal(r.beats.pre, 1); assert.deepEqual(r.beats.exempt, ['x']); assert.equal(r.beats.starts, 4);
});

test('plan-check --fps: kare ızgarası (ilk görünür kare, eşik yuvarlama yönü, boş bant)', () => {
  const G = gridOf({ fps: 60 });
  assert.equal(G.minF(0.12, 'a'), 8); assert.equal(G.minF(0.34, 'b'), 21); assert.equal(G.maxF(0.07, 'c'), 4); assert.equal(G.fr(1.0), 60); assert.equal(G.fr(1.004), 61);
  const plan = { fps: 60, events: [{ id: 'a', t: 1.004 }, { id: 'b', t: 1.125 }, { id: 'p', t: 1.06, of: 'b', class: 'golge' }, { id: 'q', t: 1.06, of: 'b', class: 'dar' }] };
  const rules = { beats: { minGapMs: 120 }, leads: { golge: [60, 70], dar: [60, 62] } };
  const s = planCheck(plan, rules);
  assert.ok(!s.errors.some((x) => x.rule === 'vuruş aralığı'), 'saniyede 121 ms ≥ 120');
  const g = planCheck(plan, rules, { grid: { fps: 60 } });
  const gap = g.errors.find((x) => x.rule === 'vuruş aralığı');
  assert.ok(gap && gap.frames === 7 && gap.minFrames === 8, JSON.stringify(g.errors));
  assert.ok(g.errors.some((x) => x.rule === 'öncülük bandı' && x.cls === 'dar'), 'bant [60, 62] ms @60 boş');
  assert.ok(!g.errors.some((x) => x.rule === 'öncülük' && x.cls === 'golge'), 'gölge 4 kare önde: ' + JSON.stringify(g.errors));
  assert.ok(g.grid.thresholds.some((x) => x.name === 'vuruş aralığı' && x.frames === 8));
  assert.equal(g.grid.round, 'ceil');
  const fl = planCheck(plan, rules, { grid: { fps: 60, round: 'floor' } });
  assert.equal(fl.grid.round, 'floor');
  assert.throws(() => planCheck(plan, rules, { grid: { fps: 60, round: 'yukarı' } }));
});

test('plan-check moves: kural C fizibilitesi (kübik 4/N, beşinci derece 3,08/N; seyahat sınıfı)', () => {
  const c = moveProfile(1, 100, 'cubic'), q = moveProfile(1, 100, 'quintic');
  assert.ok(Math.abs(c.peak * 100 - 1.5) < 0.01 && Math.abs(c.c1 * 100 - 4) < 0.2, JSON.stringify(c));
  assert.ok(Math.abs(q.c1 * 100 - 3.08) < 0.05, JSON.stringify(q));
  const plan = { fps: 60, events: [], camera: { moves: [
    { id: 'H1', t0: 1, dur: 80 / 60, path: 427 },                                       // tepe 8,0 · C1 ≈ 0,049 · görünür 0,81 s
    { id: 'T1', t0: 4, dur: 3.0, from: [0, 0], to: [1500, 0], class: 'travel' },         // tepe 12,5 ≤ 25 · görünür 1,83 s
    { id: 'T2', t0: 8, dur: 1.0, path: 1500, class: 'travel' },                         // tepe 22,5 · C1 0,067 · görünür 0,61 s
  ] } };
  const rules = { moves: { peak: [8, 14], visibleS: [1.0, null], maxJump: 0.05, classes: { travel: { peak: [null, 25], visibleS: [1.5, 2.5] } } } };
  const r = planCheck(plan, rules);
  const by = Object.fromEntries(r.moves.map((m) => [m.id, m]));
  assert.equal(by.H1.ok, false); assert.ok(r.errors.some((x) => x.rule === 'kural C görünür süre' && x.id === 'H1'));
  assert.ok(by.H1.need.frames >= 98 && by.H1.need.pathPx > 520, JSON.stringify(by.H1.need));
  assert.equal(by.T1.ok, true, JSON.stringify(by.T1));
  assert.ok(r.errors.some((x) => x.rule === 'kural C C1' && x.id === 'T2' && x.cls === 'travel'));
  assert.equal(planCheck(plan, {}).moves, undefined, 'moves bloğu yoksa atlanır');
});

test('CLI: plan-check çıktı adı olay dosyasından; frame-check --only tam kaydın üstüne yazmaz', async () => {
  const ev = path.join(ROOT, 'olay-v7.json');
  fs.writeFileSync(ev, JSON.stringify({ fps: 60, dur: 2, events: [{ id: 'a', t: 0.5 }, { id: 'b', t: 1.5 }] }));
  const env = Object.assign({}, process.env, { MOTION_PROJECT: ROOT });
  const p = spawnSync(process.execPath, [path.join(RENDER, 'cmd', 'plan-check.mjs'), ev, '--fps', '60'], { env, encoding: 'utf8' });
  assert.equal(p.status, 0, p.stderr + p.stdout);
  assert.ok(fs.existsSync(path.join(ROOT, 'out', 'probe', 'plan-check-olay-v7.json')) && fs.existsSync(path.join(ROOT, 'out', 'probe', 'plan-check-olay-v7.md')));
  for (let f = 0; f < 4; f++) await frame('M', f, () => [120, 120, 120]);
  const full = path.join(ROOT, 'out', 'probe', 'M-fc.json');
  fs.writeFileSync(full, '{"tam":true}');
  const fc = spawnSync(process.execPath, [path.join(RENDER, 'cmd', 'frame-check.mjs'), 'M', '--only', 'luma'], { env, encoding: 'utf8' });
  assert.equal(fc.status, 0, fc.stderr + fc.stdout);
  assert.equal(fs.readFileSync(full, 'utf8'), '{"tam":true}', 'tam kayıt yerinde');
  const only = JSON.parse(fs.readFileSync(path.join(ROOT, 'out', 'probe', 'M-fc-only-luma.json'), 'utf8'));
  assert.deepEqual(only.only, ['luma']); assert.equal(only.checks.length, 1);
});

test.after(() => { try { fs.rmSync(ROOT, { recursive: true, force: true }); } catch { /* yut */ } });
