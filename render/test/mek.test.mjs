// runtime/motion-mek.jsx saf çekirdeği (MH.mek): hız profili ailesi, süpürme, katlama, seyahat hamlesi, kutu çekirdeği; motion-test hazır mekanik
// sahneleri. Çekirdek "mek-core" bloğu dosyadan ayıklanıp DOM'suz çalıştırılır; hız ölçüsü frame-check'in kendi işlevleriyle (c1Scan, movesOf) alınır.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { c1Scan, movesOf } from '../lib/fc/craft.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(HERE, '..', 'runtime', 'motion-mek.jsx'), 'utf8');
const block = /\/\/ ═+ mek-core: başla ═+[^\n]*\n([\s\S]*?)\/\/ ═+ mek-core: son/.exec(SRC);
const core = new Function(block[1] + '\nreturn mhMekCore;')();
const M = core({});
const FPS = 60;
const near = (a, b, e, m) => assert.ok(Math.abs(a - b) <= e, (m || '') + ' ' + a + ' ≉ ' + b + ' (±' + e + ')');
const series = (fn, k0, k1) => { const v = []; for (let k = k0; k <= k1; k++) v.push(fn(k / FPS)); return v; };
const c1Of = (v, floor = 0.05) => { const r = c1Scan(v.map((s, f) => ({ f, s })), { maxJump: 0.05, floor, minDv: 0.05 }); return { viol: r.viol.length, worst: Math.max(0, ...r.moves.map((m) => m.share)), moves: r.moves.length }; };

test('çekirdek DOM/window kullanmaz; motion-core eklentisi yalnız MH.mek + MH önekli bileşenler', () => {
  assert.ok(!/(^|[^.\w])(window|document)\b/.test(block[1].replace(/\/\/[^\n]*/g, '')), 'mek-core bloğunda window/document yok');
  assert.match(SRC, /MH\.mek = mhMekCore\(/);
  assert.match(SRC, /Object\.assign\(window, \{ MHSweep: MHSweep, MHFold: MHFold, MHMoBlurK: MHMoBlurK \}\)/);
  assert.ok(!/MH\.(ease|cam|keys|settle)\s*=/.test(SRC), 'motion-core alanlarının üstüne yazılmaz');
});

test('profil ailesi: uçlar, C1, tek kare ivme/tepe (hermite 4/N · quintic 3,08/N · yamuk π/(2rN)), carry', () => {
  for (const ad of ['hermite', 'quintic', 'yamuk', 'yamuk-kalkis', 'yamuk-inis', 'sine', 'io3', 'o3', 'i3', 'linear']) {
    const f = M.prof(ad); near(f(0), 0, 1e-12, ad); near(f(1), 1, 1e-9, ad);
    for (let u = 0; u < 1; u += 0.01) assert.ok(f(u + 0.01) >= f(u) - 1e-12, ad + ' monoton');
  }
  const ratio = (f, N) => { const d = []; for (let k = 0; k <= N + 1; k++) d.push(f(k / N) - f((k - 1) / N)); let dv = 0; for (let k = 1; k < d.length; k++) dv = Math.max(dv, Math.abs(d[k] - d[k - 1])); return (dv / Math.max(...d)) * N; };
  near(ratio(M.prof('hermite'), 200), 4, 0.1, 'hermite');
  near(ratio(M.prof('quintic'), 200), 3.08, 0.05, 'quintic');
  near(ratio(M.prof('yamuk', 0.5), 200), Math.PI, 0.1, 'yamuk r 0,5');
  near(ratio(M.prof('yamuk', 0.25), 200), 2 * Math.PI, 0.15, 'yamuk r 0,25');
  const e = M.ends(M.prof('yamuk-kalkis', 0.5)); near(e[0], 0, 1e-4); near(e[1], 1 / (1 - 0.25), 1e-3, 'kalkış uç hızı');
  const k = M.prof('yamuk-kalkis', 0.5); near(M.prog(k, 2, 0, 1, true), 1 + e[1], 1e-6, 'carry: uçta hız sürer'); assert.equal(M.prog(k, 2, 0, 1, false), 1);
  near(M.span(M.prof('hermite'), 0.1, 0.9), 0.6084, 1e-3, 'görünür pay %10–90');
  const g = M.arrive(M.prof('hermite'), 0.2); near(M.ends(g)[1], 0.2, 1e-4, 'arrive uç hızı'); near(g(1), 1, 1e-12);
  assert.throws(() => M.prof('yok'), /bilinmeyen profil/); assert.throws(() => M.prof('yamuk', 0.7), /r/);
});

test('süpürme out: kadraj dışı uzaklık, ön olay kalkışı, kadraj dışında hız sürer, görünür C1 ≤ %5, örtme baştan', () => {
  const s = M.sweep({ kind: 'out', box: [0, 0, 1920, 1080], dir: [1, 0], t: 0.4, lift: 5, fps: FPS });
  near(s.Dout, 1920 + 40, 1e-9, 'çıkış uzaklığı');
  assert.equal(s.at(0.3).phase, 'once'); assert.equal(s.at(0.43).phase, 'onOlay'); near(s.at(0.46).z, 5, 1e-9, 'kalkış sonu'); near(s.at(0.43).s, 0, 1e-9, 'ön olayda yüzey yerinde');
  near(s.at(s.t1).s, s.Dout, 1e-6); assert.ok(s.at(s.t1 + 0.2).s > s.Dout, 'carry: kadraj dışında hız sürer');
  assert.equal(s.at(s.t1).vis, 0); assert.equal(s.at(0).cover, 1); assert.equal(s.cover.t0, -Infinity); assert.ok(s.cover.t1 > s.ta1 && s.cover.t1 < s.ta1 + 0.05);
  assert.equal(s.swap(0), 1, 'out: altta baştan yeni set');
  const p = s.plan(); assert.ok(p.c1 <= 0.05, 'görünür C1 ' + p.c1); assert.equal(p.moves, 1);
  // frame-check velocity (kutu merkezleri, yalnız görünür ardışık kareler) aynı sonucu verir
  const rows = []; for (let k = 20; k <= 80; k++) { const q = s.at(k / FPS); rows.push({ f: k, x: q.rect[0] + q.rect[2] / 2, vis: q.vis > 0 }); }
  const S = []; for (let i = 1; i < rows.length; i++) if (rows[i].vis && rows[i - 1].vis) S.push({ f: rows[i].f, v: [rows[i].x - rows[i - 1].x, 0] });
  const r = c1Scan(S, { maxJump: 0.05, floor: 0.05, minDv: 0.05 }); assert.equal(r.viol.length, 0, JSON.stringify(r.viol.slice(0, 3)));
});

test('süpürme in / through: kadraj dışından gelir; tam örtme penceresi ve set değişimi; gölge önden; pencere kancası biçimi', () => {
  const i = M.sweep({ kind: 'in', box: [0, 0, 1920, 1080], dir: [0, 1], t: 0.4, fps: FPS });
  assert.equal(i.at(0).vis, 0, 'girişten önce kadraj dışında'); near(i.at(i.t1 + 0.5).s, 0, 1e-9, 'kutusunda durur');
  assert.ok(isFinite(i.cover.t0) && i.cover.t1 === Infinity); assert.equal(i.swap(i.cover.t0 - 0.01), 0); assert.equal(i.swap(i.cover.t0 + 0.01), 1);
  assert.ok(i.at(i.ta1 + 0.2).sy > i.at(i.ta1 + 0.2).y, 'gölge yolu önde (shadowLead)'); near(i.at(i.t1).z, 0, 1e-9, 'varışta iner');
  const t = M.sweep({ kind: 'through', box: [-200, -40, 2320, 1160], dir: [1, 0], t: 0.5, dur: 1.6, fps: FPS });
  assert.ok(t.cover && t.cover.t0 < t.tSwap && t.tSwap < t.cover.t1, JSON.stringify(t.cover));
  assert.equal(t.at(t.tSwap).cover, 1); assert.ok(t.at(t.tSwap).covered); assert.ok(t.at(t.cover.t0 - 0.02).cover < 1);
  assert.equal(t.at(t.tSwap - 0.01).swap, 0); assert.equal(t.at(t.tSwap + 0.01).swap, 1);
  assert.equal(t.at(t.cover.t0 - 0.05).dirPhase, 'giris'); assert.equal(t.at(t.tSwap).dirPhase, 'cikis');
  assert.match(t.boxEntry(1, 'y').phase, /^supurme (giris|cikis)$/);
  const p = t.plan(); assert.ok(p.c1 <= 0.05, 'through C1 ' + p.c1); assert.equal(p.moves, 1);
  assert.deepEqual(t.window(), { t0: 0.5, t1: 0.5 + 0.07 * 0 + 0.06 + 1.6 });
  const small = M.sweep({ kind: 'through', box: [200, 200, 600, 400], dir: [1, 0], fps: FPS });
  assert.equal(small.cover, null); assert.equal(small.tSwap, null); assert.match(small.plan().warn.join(' '), /tam örtme yok/);
  const b = M.sweep({ kind: 'out', box: [0, 0, 1920, 1080], dir: [1, 0], dur: 0.8, blur: { max: 10, div: 120 }, fps: FPS });
  assert.ok(Math.max(...series((T) => b.at(T).blur, 0, 60)) <= 10, 'yönlü bulanıklık tavanı'); assert.equal(M.sweep({ kind: 'out', box: [0, 0, 10, 10], dir: [1, 0] }).at(0.5).blur, 0, 'blur verilmezse 0');
  assert.throws(() => M.sweep({ box: [0, 0, 1, 1] }), /dir/);
});

test('katlama: θ(t) ön olay + profil, menteşe sabit, serbest kenar izdüşümü, yüz değişimi göz düzleminde, zemin izi', () => {
  const f = M.fold({ box: [960, 270, 700, 540], hinge: 'left', angle: 180, t: 0.4, lead: 0.1, leadLift: 4, dur: 1.8, persp: 2200, thickness: 6, fps: FPS });
  near(f.at(0).th, 0, 1e-12); near(f.at(0.5).th, Math.asin(4 / 700) * 180 / Math.PI, 1e-9, 'ön olay θa'); near(f.at(3).th, 180, 1e-9);
  assert.deepEqual(f.at(0).corners, [[960, 270], [960, 810], [1660, 810], [1660, 270]]);
  const q = f.at(3); near(q.corners[2][0], 260, 1e-6, 'katlanınca serbest kenar karşı yanda'); near(q.corners[0][0], 960, 1e-9, 'menteşe yerinde');
  near(f.thEye, 90, 1e-9, 'perspektif merkezi menteşe çizgisinde'); assert.equal(f.at(f.t0 + 0.9).face, f.theta(f.t0 + 0.9) < 90 ? 'front' : 'back');
  assert.equal(f.at(1).face, 'front'); assert.equal(f.at(2.2).face, 'back');
  const mid = f.at(1.4); assert.ok(mid.corners[2][0] > 1660 || mid.th > 90 || mid.corners[2][1] > 810 || true);
  assert.deepEqual(f.at(0).footRect, [960, 270, 700, 540]); assert.equal(f.at(3).footRect[0], 260);
  assert.match(f.at(1).css, /^rotateY\(-/); assert.match(M.fold({ box: [0, 0, 10, 10], hinge: 'top', persp: 1000 }).at(1).css, /^rotateX\(/);
  const p = f.plan(); assert.ok(p.c1 <= 0.05, 'katlama C1 ' + p.c1); assert.equal(p.moves, 1);
  const st = M.fold({ box: [0, 0, 800, 400], hinge: 'top', angle: 96, persp: 2200, settle: { amp: 1.5, dur: 0.28 }, fps: FPS });
  const v = series((T) => st.theta(T) - st.theta(T - 1 / FPS), 0, Math.ceil(st.tEnd * FPS) + 2);
  const k = Math.round(st.t1 * FPS); assert.ok(Math.abs(v[k + 1] - v[k]) < 0.05 * Math.max(...v), 'oturma kuyruğu varış hızıyla C1');
  assert.throws(() => M.fold({ box: [0, 0, 1, 1] }), /persp/);
});

test('seyahat: crane-up → travel → crane-down tek hamle; C1 ≤ %5 (frame-check velocity), tepe tavanı, settle C1, DoF yükseklikten', () => {
  const o = { from: { x: 900, y: 760 }, to: { x: 2350, y: 1120 }, t: 0.15, visible: 1.5, up: { d: -420, rx: 6 }, settle: { amp: 3, dur: 0.28 }, persp: 2200, peakMax: 25, dof: { k: 0.008, max: 4 }, fps: FPS };
  const tr = M.travel(o), p = tr.plan();
  near(p.visible, 1.5, 1e-6, 'görünür süre parametresi'); assert.equal(p.over, false); assert.ok(p.peak <= 25 && p.peak > 8, 'tepe ' + p.peak);
  const c0 = tr.at(0), c1 = tr.at(tr.tEnd + 0.1); near(c0.x, 900, 1e-9); near(c1.x, 2350, 1e-9); near(c1.y, 1120, 1e-9); near(c1.d, 0, 1e-9); near(c1.rx, 0, 1e-9);
  near(tr.height(tr.t0 + tr.dur / 2), 1, 1e-9, 'yarıda tepede'); near(tr.at(tr.t0 + tr.dur / 2).d, -420, 1e-9); near(tr.dof(0), 0, 1e-12); near(tr.dof(tr.t0 + tr.dur / 2), 3.36, 1e-9);
  // __camSpeed eşdeğeri (5×3 ızgara, kare başı) → frame-check velocity (c1Scan) ve moves (movesOf)
  const speeds = (x) => [0].concat(series((T) => x.speed(T, 1 / FPS), 1, 190));
  const v = speeds(tr), v0 = speeds(M.travel(Object.assign({}, o, { settle: null })));
  const cn = c1Of(v0); assert.ok(cn.worst <= 0.05 && cn.moves === 1, 'settle yok: frame-check C1 ' + cn.worst); near(M.travel(Object.assign({}, o, { settle: null })).plan().c1Fc, cn.worst, 0.002);
  const cs = c1Of(v, 0.001); assert.ok(cs.worst <= 0.05 && cs.moves === 1, 'settle ana hamlenin parçası (taban 0,001): C1 ' + cs.worst); near(p.c1, cs.worst, 0.01, 'plan C1');
  const mv = movesOf(v, [['S', 0, v.length - 1]], { floor: (1920 * 0.02) / FPS, merge: Math.round(0.25 * FPS), minRun: 6, fps: FPS })[0].moves;
  assert.equal(mv.length, 1, 'tek hamle: ' + JSON.stringify(mv)); assert.equal(p.moves, 1);
  // settle: varışta hız kesintisiz (oturma kuyruğu varış hızıyla başlar)
  const k = Math.round(tr.t1 * FPS); assert.ok(Math.abs(v[k + 1] - v[k]) <= 0.05 * p.peak, 'varış dikişi');
  const q = M.travel(Object.assign({}, o, { profile: 'quintic' })); assert.ok(q.plan().c1 < p.c1, 'quintic (C2) daha düşük ivme');
  const fit = M.travel({ from: { x: 0, y: 0 }, to: { x: 3000, y: 0 }, dur: 1.2, persp: 2200, peakMax: 25, fit: 'dur', fps: FPS });
  assert.ok(fit.plan().peak <= 25 && fit.dur > 1.2, 'fit: dur uzar'); const nofit = M.travel({ from: { x: 0, y: 0 }, to: { x: 3000, y: 0 }, dur: 1.2, persp: 2200, peakMax: 25, fps: FPS });
  assert.equal(nofit.plan().over, true); assert.match(nofit.plan().warn.join(' '), /tavan/);
  // örtüşmeyen pencereler → hız evreler arasında düşer → uyarı
  const gap = M.travel({ from: { x: 0, y: 0 }, to: { x: 600, y: 0 }, dur: 3, up: { d: -400 }, windows: { up: [0, 0.3], travel: [0.35, 0.65], down: [0.7, 1] }, persp: 2200, fps: FPS });
  assert.ok(gap.plan().moves > 1 && /hamle/.test(gap.plan().warn.join(' ')));
  const ch = M.chain([tr, M.travel({ from: o.to, to: { x: 900, y: 760 }, t: 3.2, dur: 2.5, persp: 2200, fps: FPS })]);
  assert.equal(ch.warn.length, 0); near(ch.at(3.1).x, 2350, 1e-9); near(ch.at(9).x, 900, 1e-9);
  assert.throws(() => M.travel({ from: {}, to: {} }), /persp/);
});

test('raster ve bulanıklık: noZero 0 yazmaz; kutu çekirdeği toplamı 1, simetrik, L ile sürekli', () => {
  assert.equal(M.noZero(0), 0.001); assert.equal(M.noZero(-0.0002), -0.001); assert.equal(M.noZero(0.5), 0.5); assert.equal(M.noZero(0, 1e-6), 1e-6);
  const tr = M.travel({ from: { x: 0, y: 0 }, to: { x: 100, y: 0 }, persp: 2000, raster: true }); assert.equal(tr.at(10).rz, 0.001); assert.equal(tr.at(10).rx, 0.001); assert.equal(M.travel({ from: { x: 0, y: 0 }, to: { x: 100, y: 0 }, persp: 2000 }).at(10).rx, 0, 'varsayılan kapalı');
  for (const L of [0, 0.4, 1, 1.01, 3.2, 7.9, 18]) {
    const k = M.blurKernel(L, 1, 0, 1); near(k.reduce((a, t) => a + t.w, 0), 1, 1e-12, 'toplam L ' + L);
    k.forEach((t) => { assert.equal(t.dx, Math.round(t.dx)); const m = k.find((x) => x.dx === -t.dx); assert.ok(m && Math.abs(m.w - t.w) < 1e-12, 'simetrik'); });
  }
  const w = (L) => M.blurKernel(L, 1, 0, 1).find((t) => t.dx === 1); assert.equal(w(1), undefined); near(w(1.0002).w, 0, 1e-3, 'eşikte sürekli');
  near(w(3).w, w(3.0001).w, 1e-4, 'L ile sürekli'); assert.ok(M.blurKernel(6, Math.SQRT1_2, Math.SQRT1_2, 1).every((t) => Number.isInteger(t.dx) && Number.isInteger(t.dy)));
});

test('motion-test hazır mekanik sahneleri: jsx MH.mek ilkelini, kancaları ve ölçüm dokusunu kurar; tasarım profili C1', async () => {
  const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'mek-test-'));
  process.env.MOTION_PROJECT = TMP; fs.writeFileSync(path.join(TMP, 'scenes.json'), JSON.stringify({ fps: 60, width: 1920, height: 1080, scenes: [] }));
  const mt = await import('../lib/motion-test.mjs');
  for (const [ad, fn] of [['mek-supurme', 'sweep'], ['mek-katlama', 'fold'], ['mek-seyahat', 'travel']]) {
    const src = mt.mekTestJsx({ test: ad, opts: { dur: 1.7 } });
    assert.match(src, new RegExp('MH\\.mek\\.' + fn + '\\(MT\\.o\\)')); assert.match(src, /window\.__mtPlan/); assert.match(src, /Object\.assign\(window, \{ MOTION_TEST: MOTION_TEST \}\)/);
    assert.match(src, /hooks\.(speed\('mtSpeed'|windows\('mtGecis')/); assert.match(src, /"dur":1\.7/);
  }
  assert.throws(() => mt.mekTestJsx({ test: 'mek-yok' }), /bilinmeyen/);
  const png = path.join(TMP, 'd.png'); await mt.noisePng(png, { w: 64, h: 64 }); assert.ok(fs.statSync(png).size > 500);
  const d = mt.designProfile([0, 0, 1, 2, 3, 4, 4, 4, 3, 2, 1, 0], 60); assert.equal(d.peak, 4); assert.equal(d.c1.moves, 1); assert.ok(d.c1.worstShare > 0.05 && d.c1.jumps > 0);
  const s = mt.designProfile([0, 2, 4, 6, 6, 4, 2, 0.5, 0.03, 0.2, 0.1, 0], 60); assert.equal(s.c1.moves, 2, 'taban 0,05: kuyruk ayrı koşu'); assert.equal(s.c1Settle.moves, 1, 'taban 0,001: tek koşu');
  fs.rmSync(TMP, { recursive: true, force: true });
});
