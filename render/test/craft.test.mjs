// zanaat kapısı (1.3) — pop · onset (piksel) · velocity / entryExit / moves çekirdekleri · PAGE shapes/track (node --test test/).
// Geçici proje: scenes.json (60 fps, 1920×1080) + out/frames/<id>/NNNNN.png sentetik kareler. Modüller MOTION_PROJECT ile yüklenir.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'craft-test-'));
const W = 1920, H = 1080;
fs.writeFileSync(path.join(ROOT, 'scenes.json'), JSON.stringify({ fps: 60, width: W, height: H, scenes: [{ id: 'P', file: 'P.dc.html', frames: 12 }] }));
fs.writeFileSync(path.join(ROOT, 'P.dc.html'), "<script>window.OM_SCENES = '[{\"name\":\"P\",\"dur\":0.2}]';</script>");
process.env.MOTION_PROJECT = ROOT;

const sharp = (await import('sharp')).default;
const { TYPES } = await import('../lib/fc/index.mjs');
const { worldDefaults } = await import('../lib/fc/common.mjs');
const craft = await import('../lib/fc/craft.mjs');

// kâğıt dokusu (deterministik) + isteğe bağlı dikdörtgenler: [{x0, y0, x1, y1, v}]
const paper = (x, y) => Math.round(200 + 18 * Math.sin(x / 7.3) * Math.cos(y / 5.1) + 10 * Math.sin((x + 3 * y) / 13));
async function frame(dir, f, rects = [], shift = 0) {
  const d = path.join(ROOT, 'out', 'frames', dir); fs.mkdirSync(d, { recursive: true });
  const buf = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = paper(x + shift, y);
    for (const r of rects) if (x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1) v = r.tex ? Math.round(r.v + 25 * Math.sin((x - r.x0) / 4) * Math.cos((y - r.y0) / 3)) : r.v;
    const i = (y * W + x) * 3; buf[i] = buf[i + 1] = buf[i + 2] = Math.max(0, Math.min(255, v));
  }
  await sharp(buf, { raw: { width: W, height: H, channels: 3 } }).png({ compressionLevel: 1 }).toFile(path.join(d, String(f).padStart(5, '0') + '.png'));
}
const ctxFor = (id, frames) => ({ scene: { id, file: 'P.dc.html', frames }, W: worldDefaults({}), fps: 60, frames, framesDir: path.join(ROOT, 'out', 'frames', id), mp4: null, step: 1 });
const run = (c, ctx, data) => TYPES[c.type].run(Object.assign({ __i: 0 }, c), ctx, data);

test('pop: tek karede beliren kart yakalanır; 4 karede silinerek gelen ve kayan kart geçer', async () => {
  const card = { x0: 700, y0: 300, x1: 1100, y1: 600, v: 60 };
  for (let f = 0; f < 8; f++) await frame('POP', f, f >= 4 ? [card] : []);
  const r = await run({ type: 'pop' }, ctxFor('POP', 8));
  assert.equal(r.status, 'fail', r.summary);
  assert.equal(r.violations[0].f, 4);
  // kartın alt/sağ şeridi en iyi kaydırmanın geri yönünde kâğıtla eşleşir (iki yönde de tutmayan piksel sayılır): alan kartın > %75'i
  assert.ok(r.violations[0].share > 0.95 && r.violations[0].px > 90000, JSON.stringify(r.violations[0]));
  // silme (wipe): her kare çeyrek, dokulu yüzey (düz renkte ilk şerit kenar kaydırmasıyla kısmen açıklanır, payı büyür — MEASURE notu)
  for (let f = 0; f < 10; f++) await frame('WIPE', f, f >= 3 ? [Object.assign({}, card, { x1: card.x0 + Math.min(4, f - 2) * 100, v: 90, tex: true })] : []);
  const w = await run({ type: 'pop' }, ctxFor('WIPE', 10));
  assert.equal(w.status, 'pass', w.summary + ' ' + JSON.stringify(w.metrics.top.slice(0, 2)));
  // dokulu kart kadraj içinde 6 px/kare kayar (hareketle açıklanır)
  for (let f = 0; f < 8; f++) await frame('SLIDE', f, [{ x0: 600 + 6 * f, y0: 300, x1: 1000 + 6 * f, y1: 600, v: 120, tex: true }]);
  const s = await run({ type: 'pop' }, ctxFor('SLIDE', 8));
  assert.equal(s.status, 'pass', s.summary);
});

test('pop: muaf pencere (exclude) ve geçiş payı; excludeFrames biçimleri', async () => {
  const r = await run({ type: 'pop', exclude: [[4, 4]] }, ctxFor('POP', 8));
  assert.equal(r.status, 'pass', r.summary);
  assert.equal(r.metrics.excluded, 1);
  const ex = craft.excludeFrames(['$__gecis', [10, 11], '$__shots'], { __gecis: [{ t: 0.5, son: 0.6 }], __shots: [['A', 0, 59], ['B', 60, 119]] }, { fps: 60, step: 1, pad: 1 });
  assert.ok(ex.set.has(30) && ex.set.has(36) && ex.set.has(10) && ex.set.has(59) && ex.set.has(61) && !ex.set.has(0) && !ex.set.has(40));
  assert.deepEqual(craft.excludeFrames(['$__yok'], {}, { fps: 60 }).missing, ['__yok']);
});

test('onset (piksel): bölgede görünür başlangıç ↔ çapa; geç olay ihlal', async () => {
  const line = { x0: 900, y0: 500, x1: 960, y1: 506, v: 25 };
  for (let f = 0; f < 10; f++) await frame('ON', f, f >= 6 ? [line] : []);
  const c = { type: 'onset', events: [{ name: 'çizgi', f: 6, region: [880, 480, 100, 40] }, { name: 'geç', f: 3, region: [880, 480, 100, 40] }], pre: 0.05, post: 0.1 };
  const r = await run(c, ctxFor('ON', 10));
  const [a, b] = r.metrics.rows;
  assert.equal(a.onset, 6); assert.equal(a.dFrames, 0);
  assert.equal(b.dFrames, 3);
  assert.equal(r.status, 'fail');
  assert.deepEqual(r.violations.map((v) => v.name), ['geç']);
  // alet çokgeni bölgeyi örtüyorsa ihlal belirsiz → UYARI
  const masked = await run({ type: 'onset', pre: 0.05, post: 0.1 }, ctxFor('ON', 10), { events: [{ name: 'geç', f: 3, region: [880, 480, 100, 40], masks: { 6: [[[880, 470], [905, 470], [905, 530], [880, 530]]] } }] });
  assert.equal(masked.status, 'warn', masked.summary);
  assert.ok(masked.violations[0].uncertain);
});

test('c1Scan: doğrusal kalkış sıçrar, uzun yumuşak rampa geçer, shot sınırı bölünür', () => {
  const lin = Array.from({ length: 40 }, (_, f) => ({ f, s: f < 10 ? 0 : 4 }));
  assert.ok(craft.c1Scan(lin).viol.some((v) => v.f === 10));
  const N = 90, ease = Array.from({ length: N }, (_, f) => ({ f, s: 6 * Math.sin((Math.PI * f) / (N - 1)) }));   // inOutSine hız profili
  const e = craft.c1Scan(ease, { maxJump: 0.05 });
  assert.equal(e.viol.length, 0, JSON.stringify(e.viol.slice(0, 2)));
  assert.equal(e.moves.length, 1);
  const vec = [{ f: 0, v: [3, 0] }, { f: 1, v: [3, 0] }, { f: 2, v: [0, 3] }];   // köşe: hız sabit, yön 90°
  assert.ok(craft.c1Scan(vec).viol.some((v) => v.f === 2 && v.dSpeed === 0));
  const gap = [{ f: 0, s: 3 }, { f: 1, s: 3 }, { f: 5, s: 3 }];
  assert.equal(craft.c1Scan(gap).viol.length, 0, 'ardışık olmayan kare dizisi böler');
});

test('entryExitScan: anlık beliriş 0 s, kenardan giriş süresi, evre adları', () => {
  const rows = [];
  for (let f = 0; f < 10; f++) rows.push([f, 0, 0, 0, 0, null]);
  for (let f = 10; f < 40; f++) rows.push([f, 0, 0, 2, 1, null]);   // f10 tam görünür (anlık)
  for (let f = 40; f < 50; f++) rows.push([f, 0, 0, 0, 0, null]);
  const r = craft.entryExitScan(rows, { fps: 60, first: 0, last: 49 });
  assert.equal(r.runs[0].entry, 0); assert.equal(r.runs[0].exit, 0);
  assert.equal(r.viol.length, 2);
  const edge = [[0, 0, 0, 0, 0, null]];
  for (let f = 1; f <= 30; f++) edge.push([f, 0, 0, 1, 1, null]);   // kenardan giriyor (kısmen)
  for (let f = 31; f <= 80; f++) edge.push([f, 0, 0, 2, 1, null]);
  const g = craft.entryExitScan(edge, { fps: 60, first: 0, last: 80 });
  assert.equal(g.runs[0].entry, 0.5); assert.equal(g.viol.length, 0);
  const tool = [];
  for (let f = 5; f < 20; f++) tool.push([f, 0, 0, 2, 1, 'S01-kalem gir']);
  for (let f = 20; f < 60; f++) tool.push([f, 0, 0, 2, 1, 'S01-kalem is']);
  for (let f = 60; f < 66; f++) tool.push([f, 0, 0, 2, 1, 'S01-kalem cik']);
  const t = craft.entryExitScan(tool, { fps: 60, inPhases: ['gir'], outPhases: ['cik'], first: 0, last: 100 });
  assert.equal(t.runs[0].entry, 0.25); assert.equal(t.runs[0].entryBy, 'evre'); assert.equal(t.runs[0].exit, 0.1);
  assert.deepEqual(t.viol.map((v) => v.rule), ['giriş', 'çıkış']);
});

test('movesOf: shot başına hamle (taban, birleştirme, kısa koşu)', () => {
  const v = new Array(200).fill(0);
  for (let f = 10; f < 40; f++) v[f] = 2; for (let f = 42; f < 60; f++) v[f] = 2;   // 2 kare boşluk → birleşir
  for (let f = 80; f < 82; f++) v[f] = 2;                                         // kısa koşu (2 kare) sayılmaz
  for (let f = 120; f < 160; f++) v[f] = 3;
  const s = craft.movesOf(v, [['A', 0, 99], ['B', 100, 199]], { floor: 0.64, merge: 5, minRun: 6, fps: 60 });
  assert.equal(s[0].moves.length, 1); assert.equal(s[0].moves[0].f0, 10); assert.equal(s[0].moves[0].f1, 59);
  assert.equal(s[1].moves.length, 1); assert.equal(s[1].moves[0].sec, 0.667);
});

test('PAGE: shapes (çokgen + kutu, önek eşleşmesi) ve track (araç/kutu izi, kadraj, evre)', async () => {
  const { PAGE } = await import('../lib/fc/design.mjs');
  const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  globalThis.window = {
    __frameN: () => 10, __frameT: (i) => i / 10,
    __boxes: (T) => [{ name: 'halka#0.0', kind: 'cizim', poly: rect(100, 100, 20, 10) }, { name: 'halka#0.1', kind: 'cizim', poly: rect(120, 100, 20, 10) },
      { name: 'kart', kind: 'kart', poly: rect(-210 + 300 * T, 50, 200, 100), vis: T < 0.3 ? 0.5 : 1 }],
    __tools: (T) => (T >= 0.2 ? { kalem: { tip: [500 + 100 * T, 400], phase: T < 0.5 ? 'gir' : 'is' } } : {}),
  };
  try {
    const sh = PAGE({ kind: 'shapes', W: 1920, H: 1080, fps: 10, refs: ['box:halka*', 'kind:kart'], Ts: [0.5] });
    assert.equal(sh.at[0]['box:halka*'].length, 2);
    assert.deepEqual(sh.at[0]['box:halka*'][0].box, [100, 100, 120, 110]);
    assert.equal(sh.at[0]['kind:kart'][0].poly.length, 4);
    const tr = PAGE({ kind: 'track', W: 1920, H: 1080, fps: 10, boxes: ['kind:kart'], step: 1 });
    assert.equal(tr.tools.kalem.length, 8); assert.equal(tr.tools.kalem[0][5], 'gir');
    const k = tr.boxes.kart;
    assert.equal(k[0][7], 0, 'f0 kadraj dışında'); assert.equal(k[1][7], 1, 'f1 kısmen'); assert.equal(k[9][7], 2, 'f9 tam içeride'); assert.equal(k[1][8], 0.5);
  } finally { delete globalThis.window; }
});

test.after(() => { try { fs.rmSync(ROOT, { recursive: true, force: true }); } catch { /* yut */ } });
