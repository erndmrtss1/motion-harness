// motion-render amap — ses zaman eşlemi: tasarım zamanı (sahne kodu ve sabitleri) ↔ proje sesi. Sahne kodu tasarım zamanında kalır; sayfa sesi t → x = W(t).
//   motion-render amap build --anchors amap.config.json [--tol 0.033] [--fps 60] [--dry]   → script/<name>-amap.js (sayfalar yükler) · script/<name>.amap.json · özet
//   motion-render amap example                                                         → örnek yapılandırma (stdout)
// Kurallar (kaynak hat): (1) v1: baştaki |Δ| ≤ tol çapalar 0 sayılır (o aralık birebir — kareler değişmez); (2) sınırlar kare ızgarasına oturur, sert;
//   (3) keep (v2): kalan aralıklarda önceki eşleme sert eşit → sayfa o aralıklarda önceki fonksiyona devreder (kareler bit-aynı);
//   (4) her çapanın hatası |t̂ − t| ≤ tol denetlenir (aşan çapa ✗ listelenir). Çözücü: lib/audio-amap.mjs.
// Çapa kaynakları (config.maps[].anchors): cuts (cümle kesmeleri), lyrics (manifest shots lyric kelime başları), words ([dizin, kelime] ses vuruşları),
//   events (tasarım anı ↔ kelime deseni), drift (motion-render audio-diff drift.json; zarfla > dropFitMs çelişen kelime çapası atılır), list (elle).
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, MAN, FPS as FPS0 } from '../lib/project.mjs';
import { readJson, put, lcs } from '../lib/audio-core.mjs';
import { solve, buildAnchors, parseBounds, pageJs, loadPageMap, invert } from '../lib/audio-amap.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; }, has = (k) => args.includes('--' + k);
const P = (f) => path.resolve(ROOT, f);
const EXAMPLE = {
  name: 'ses2', tol: 0.033, fps: 60, lang: 'tr', audio: 'materials/ses2.wav',
  maps: [{
    id: 'A', solver: 'v1', xKey: 'tau',
    from: { words: 'script/ses1.words.json', beats: 'script/beats.json' },
    to: { words: 'script/ses2.words.json', beats: 'script/beats2.json', name: 'SES2' },
    api: { map: 'MOTION_AMAP', d2a: 'motionD2A', a2d: 'motionA2D', pageT: 'motionPageT', t0: 'MOTION_T0' },
    anchors: { cuts: { maxDt: 3 }, lyrics: { scene: 'FILM-01', word: 'firstPaired', kind: 'map' }, words: [[12, 'örnek']], events: [], list: [] },
    ident: true, bounds: [0, 30.3, 41.51], sections: ['FILM-01-P1', 'FILM-01-P2'],
  }, {
    id: 'B', solver: 'v2', xKey: 't2', x0: { f: 3845, offset: -0.2 }, x1: 117.5,
    from: { words: 'script/ses2.words.json' }, to: { words: 'script/ses3.words.json' },
    api: { map: 'MOTION_AMAP2', d2a: 'motionS2A', a2d: 'motionA2S', pageT: 'motionSesT', t0: 'MOTION_T0', t0fn: 'motionSesT0', nfn: 'motionSesN' },
    anchors: { drift: { file: 'out/probe/audio-diff/ses2--ses3/drift.json', rows: { min: 13, exclude: [] }, dropFitMs: 50, dedupe: 0.02 } },
    bounds: [{ xf: 3845, f: 3825 }, { x: 113.87, t: 112.96 }], pins: { excludeBounds: true, max: 113.7 },
    keep: null, sections: [{ id: 'FILM-01-P4', xf: [3845, 4970], f: [3825, 4923] }],
  }],
};

if (args[0] === 'example') { console.log(JSON.stringify(EXAMPLE, null, 1)); process.exit(0); }
if (args[0] !== 'build' || !opt('anchors', null)) { console.error('kullanım: motion-render amap build --anchors amap.config.json [--tol 0.033] [--fps 60] [--dry] · amap example'); process.exit(2); }
const CFG = readJson(P(opt('anchors')));
const TOL = +opt('tol', CFG.tol != null ? CFG.tol : 0.033), FPS = +opt('fps', CFG.fps || FPS0), HEDEF = TOL - 0.005, LANG = CFG.lang || 'tr', NAME = CFG.name;
if (!NAME || !Array.isArray(CFG.maps) || !CFG.maps.length) { console.error('yapılandırma: "name" ve "maps" gerekli (motion-render amap example)'); process.exit(2); }
const DEF_API = { map: 'MOTION_AMAP', d2a: 'motionD2A', a2d: 'motionA2D', pageT: 'motionPageT', t0: 'MOTION_T0' };
const r7 = (v) => +v.toFixed(7), r6 = (v) => +v.toFixed(6);
const out = [];
for (const [mi, S] of CFG.maps.entries()) {
  const solver = S.solver || 'v2', id = S.id || String.fromCharCode(65 + mi), xKey = S.xKey || 'tau';
  const A = readJson(P(S.from.words)).words, B = readJson(P(S.to.words)).words;
  const BA = S.from.beats ? readJson(P(S.from.beats)) : { sentences: [] }, BB = S.to.beats ? readJson(P(S.to.beats)) : { sentences: [] };
  const { pair, diff } = lcs(A, B, LANG);
  const drift = S.anchors && S.anchors.drift ? readJson(P(S.anchors.drift.file)) : null;
  const { anc, drop } = buildAnchors(S.anchors || {}, { A, B, BA, BB, pair, man: MAN, lang: LANG, drift });
  if (!anc.length) { console.error('eşlem ' + id + ': çapa yok'); process.exit(1); }
  anc.forEach((a) => { a.d = a.t - a.x; });
  if (solver === 'v1') anc.sort((x, y) => x.x - y.x);
  const bounds = parseBounds(S.bounds, anc, FPS, solver);
  const x0 = S.x0 == null ? 0 : typeof S.x0 === 'number' ? S.x0 : S.x0.f / FPS + (S.x0.offset || 0);
  const hardB = bounds.filter((b) => b.tau > x0), nearB = (x) => hardB.some((b) => Math.abs(b.tau - x) < 0.02);
  // birebir önek (v1): sınırdan önce ve |Δ| ≤ tol olan baştaki çapalar → 0.1 s ızgaraya aşağı yuvarlanır
  let identUntil = null;
  if (solver === 'v1' && S.ident !== false) { let id0 = 0; for (const a of anc) { if (nearB(a.x) || Math.abs(a.d) > TOL) break; id0 = a.x; } identUntil = Math.floor(id0 * 10 + 1e-9) / 10; }
  // keep (v2): kalan aralıklarda önceki eşlem (sayfa t → x devri)
  let keep = null, prev = null, keepT = null, keepTau = null, inKeep = () => false;
  if (S.keep) {
    const K = S.keep, pa = Object.assign({}, S.api || DEF_API, K.prevApi || {});
    prev = loadPageMap(P(K.prev));
    if (typeof prev[pa.a2d] !== 'function' || typeof prev[pa.d2a] !== 'function') { console.error('keep: önceki eşlem işlevleri yok (' + pa.a2d + ', ' + pa.d2a + ') ' + K.prev); process.exit(1); }
    keepT = K.t || (K.f || []).map(([a, b]) => [a / FPS, b / FPS]);
    keepTau = keepT.map(([a, b]) => [prev[pa.a2d](a), prev[pa.a2d](b)]);
    inKeep = (x) => keepTau.some(([a, b]) => x >= a - 1e-9 && x < b + 1e-9);
    keep = { tag: K.tag || 'prev', prevApi: { map: pa.map, d2a: pa.d2a, a2d: pa.a2d }, d2a: prev[pa.d2a] };
  }
  const PIN = S.pins || {}, exB = PIN.excludeBounds != null ? PIN.excludeBounds : solver === 'v2', exK = PIN.excludeKeep != null ? PIN.excludeKeep : !!keep;
  anc.forEach((a) => { if (keep) a.keep = inKeep(a.x) || nearB(a.x); else if (solver === 'v2') a.bound = nearB(a.x); });
  const pins = anc.filter((a) => !((exK && inKeep(a.x)) || (exB && nearB(a.x))) && (PIN.max == null || a.x < PIN.max)).map((a) => ({ x: a.x, c: a.d, w: 1, a }));
  const x1 = S.x1 != null ? S.x1 : solver === 'v1' ? Math.max(anc[anc.length - 1].x + 5, 120) : Math.max(...anc.map((a) => a.x)) + 5;
  const sol = solve({ solver, x0, x1, pins, hardPts: hardB.map((b) => ({ x: b.tau, c: b.t - b.tau })), hardRanges: keep ? keepTau.map(([a, b]) => [a, b, (x) => keep.d2a(x) - x]) : [], identUntil, hedef: HEDEF });
  const f = (x) => x + sol.D(x), fPage = (x) => (keep && inKeep(x) ? keep.d2a(x) : f(x));
  const R = solver === 'v1' ? [5, 60] : [6, 64];
  const inv = (t) => { for (const b of bounds) if (Math.abs(t - b.t) < 1e-9) return b.tau; return invert(f, t, R[0], R[1]); };
  anc.forEach((a) => { a.err = fPage(a.x) - a.t; });
  const bad = anc.filter((a) => Math.abs(a.err) > TOL + 1e-9);
  // bölüm (perde) hızları: v1 analitik (dτ/dt = 1/(1+Δ'), sınır aralıkları) · v2 sayısal (sayfa fonksiyonu, açık aralıklar)
  let sections = [];
  if (solver === 'v1' && sol.Dd && Array.isArray(S.sections) && bounds.length > 1) {
    const wSpeed = (t0, t1) => { let mn = 9, mx = 0; for (let t = t0; t < t1; t += 1 / FPS) { const v = 1 / (1 + sol.Dd(inv(t))); mn = Math.min(mn, v); mx = Math.max(mx, v); } return [+mn.toFixed(3), +mx.toFixed(3)]; };
    sections = bounds.slice(0, -1).map((b, k) => ({ id: S.sections[k] || 'P' + (k + 1), tau: [b.tau, bounds[k + 1].tau], t: [b.t, bounds[k + 1].t], f: [b.f, bounds[k + 1].f - 1], frames: bounds[k + 1].f - b.f, speed: wSpeed(b.t, bounds[k + 1].t) }));
  } else if (Array.isArray(S.sections)) {
    const speed = (fn, a0, a1) => { let mn = 9, mx = 0; for (let t = a0 + 0.02; t < a1 - 0.02; t += 1 / FPS) { const tt = invert(fn, t, 6, 64), v = 1 / ((fn(tt + 1e-3) - fn(tt - 1e-3)) / 2e-3); mn = Math.min(mn, v); mx = Math.max(mx, v); } return [+mn.toFixed(3), +mx.toFixed(3)]; };
    sections = S.sections.filter((s) => typeof s === 'object').map((s) => { const o = { id: s.id }; const xr = s.x || (s.xf ? s.xf.map((v) => v / FPS) : null); if (xr) o[xKey] = xr; o.f = s.f; o.speed = speed(fPage, s.f[0] / FPS, (s.f[1] + 1) / FPS); if (s.old) o.old = s.old; return o; });
  }
  const words = solver === 'v1' ? A.filter((a) => pair.has(a.i)).map((a) => { const b = pair.get(a.i); return { i: a.i, w: a.w, tau: a.t0, t: b.t0, d: Math.round((b.t0 - a.t0) * 1000), fit: Math.round((f(a.t0) - b.t0) * 1000) }; }) : null;
  const toName = S.to.name || 'B';
  out.push({ id, solver, xKey, x0, api: Object.assign({}, DEF_API, S.api || {}), keep, keepT, keepTau, identUntil, bounds, anc, drop, bad, sol, sections, words,
    diff: diff.map((d) => ({ op: toName + '\'de ' + d.op, w: d.w, t: d.t })), dOut: sol.d.map(r7), mOut: sol.m.map(r6) });
}

// ---- çıktılar
const anchorsOut = (M) => M.anc.map((a) => { const o = { kind: a.kind, label: a.label, [M.xKey]: a.x, t: a.t, d: Math.round(a.d * 1000), err: Math.round(a.err * 1000) }; if (a.keep !== undefined) o.keep = a.keep; if (a.bound !== undefined) o.bound = a.bound; return o; });
const audio = CFG.audio || MAN.audio || null;
let J;
if (out.length === 1 && out[0].solver === 'v1') {
  const M = out[0];
  J = { doc: 'motion-render amap build üretir. t = τ + Δ(τ) (τ: tasarım zamanı, t: proje sesi); Δ en az eğrilikli (yumuşatma spline, 10 ms), 0.1 s Hermite düğümleri d/m.', audio, tol: TOL, hedef: HEDEF, fps: FPS, identUntil: M.identUntil, iter: M.sol.it, hermErrMs: +(M.sol.herm * 1000).toFixed(4),
    knots: { step: 0.1, d: M.dOut, m: M.mOut }, bounds: M.bounds, perde: M.sections, anchors: anchorsOut(M), bad: M.bad.length, diff: M.diff, words: M.words };
} else {
  J = { doc: 'motion-render amap build üretir. ' + out.map((M) => M.id + ': ' + M.xKey + ' → t').join(' · ') + '. Sayfa: script/' + NAME + '-amap.js.', audio, tol: TOL, hedef: HEDEF };
  for (const M of out) {
    const o = { x0: M.x0, it: M.sol.it, hermErrMs: +(M.sol.herm * 1000).toFixed(4) };
    if (M.keep) { o.keepT = M.keepT; o.keepTau = M.keepTau; }
    if (M.solver === 'v1') o.identUntil = M.identUntil;
    o.bounds = M.solver === 'v1' ? M.bounds : M.bounds.filter((b) => b.tau > M.x0).map((b) => [b.tau, b.t]);   // sert sınırlar (sayfa listesi x0 noktasını da taşır)
    if (M.drop.length) o.drop = M.drop;
    o.anchors = anchorsOut(M);
    J[M.id] = o;
  }
  J.perde = out.flatMap((M) => M.sections);
  J.bad = out.reduce((s, M) => s + M.bad.length, 0);
}
const JS = pageJs(NAME, out, CFG);
if (!has('dry')) { put(P('script/' + NAME + '.amap.json'), JSON.stringify(J, null, 1) + '\n'); put(P('script/' + NAME + '-amap.js'), JS); }
console.log((has('dry') ? '(dry) ' : '✓ ') + 'script/' + NAME + '-amap.js · script/' + NAME + '.amap.json');
for (const M of out) {
  const mx = Math.max(...M.anc.map((a) => Math.abs(a.err)));
  console.log('  ' + M.id + ' (' + M.solver + ') düğüm ' + M.dOut.length + ' · çapa ' + M.anc.length + (M.keep ? ' (keep/sınır ' + M.anc.filter((a) => a.keep).length + ')' : '') + ' · yineleme ' + M.sol.it + ' · hata > ' + Math.round(TOL * 1000) + ' ms: ' + M.bad.length + ' (en büyük ' + Math.round(mx * 1000) + ' ms)' +
    (M.identUntil != null ? ' · birebir 0–' + M.identUntil.toFixed(2) + ' s' : '') + ' · Hermite sapması ' + (M.sol.herm * 1000).toFixed(3) + ' ms');
  if (M.drop.length) console.log('  ' + M.id + ' atılan çapa (zarf çelişkisi): ' + M.drop.join(' · '));
  M.sections.forEach((p) => console.log('  ' + p.id + ' kare ' + p.f.join('–') + ' · hız (tasarım/ses) ' + p.speed.join('–') + (p.old && p.old[0] !== 1 ? ' (önce ' + p.old.join('–') + ')' : '')));
  M.bad.forEach((a) => console.log('  ✗ ' + M.id + ' ' + a.kind + ' ' + a.label + ' ' + M.xKey + ' ' + a.x + ' t ' + a.t + ' hata ' + Math.round(a.err * 1000) + ' ms'));
  if (M.solver === 'v1' && M.diff.length) console.log('  kelime farkı: ' + M.diff.map((d) => d.op + ' "' + d.w + '"@' + d.t).join(' · '));
}
// çıkış 0 (kaynakla aynı): tolerans dışı çapa ✗ satırıyla raporlanır; karar kayma tablosu ve reviewer'da
