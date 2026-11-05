// lib/motion-test.mjs — motion-test çekirdeği (saf parçalar test edilir): test sayfası üretimi, klip → gri kareler, hareket vektörü / hız / ivme
// profili, hız grafiği (SVG → PNG), yan yana kontak.
// Hız ölçüsü iki klipte AYNI yöntemle alınır (test ↔ referans kıyası adil olsun): ardışık karede |ΔY| ≥ 8 olan piksellerin destek kümesinde
// kaydırma vektörü d, SAD en azı (piramit: ¼ ölçekte kaba arama, tam ölçekte ±3 incelt, parabolle alt piksel). Hız = |d| px/kare (@1080, klip fps'inde),
// ivme = ardışık hız farkı. Değişen piksel yoksa hız 0 (tutuş).
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { ffmpeg } from './ffmpeg.mjs';
import { c1Scan } from './fc/craft.mjs';

// ── test sayfası ──────────────────────────────────────────────────────────────
// prop değeri sabit ya da anahtar kare listesi [[t, değer, easing?], …] (easing MH.ease adı; yoksa 'sine'); iç içe nesneler aynen geçer
export function testJsx({ comp, props = {}, bg = '#808080', name = 'MOTION_TEST' }) {
  return `// motion-test tarafından üretildi (elle düzenlenmez): ${comp} ilkelinin hareket testi
var MT = ${JSON.stringify({ comp, bg, props })};
function mtVal(v, T) {
  if (!Array.isArray(v) || !v.length || !Array.isArray(v[0]) || typeof v[0][0] !== 'number') return v;
  if (T <= v[0][0]) return v[0][1];
  for (var i = 1; i < v.length; i++) { var a = v[i - 1], b = v[i]; if (T <= b[0]) { var u = (T - a[0]) / Math.max(1e-9, b[0] - a[0]), e = MH.ease.get(b[2] || 'sine'); return a[1] + (b[1] - a[1]) * e(u); } }
  return v[v.length - 1][1];
}
function MotionTestPiece() {
  var T = MH.useT().T, P = {}, C = window[MT.comp];
  Object.keys(MT.props).forEach(function (k) { P[k] = mtVal(MT.props[k], T); });
  if (typeof C !== 'function') throw new Error('[motion-test] bileşen yok: ' + MT.comp);
  return <div style={{ position: 'absolute', inset: 0, background: MT.bg }}>{React.createElement(C, P)}</div>;
}
function ${name}(props) {
  var st = MH.stage(props); MH.setStage(st.w, st.h);
  return (<CompositionStage width={st.w} height={st.h} bg={MT.bg} scenes={window.OM_SCENES} playback={window.OM_PLAYBACK}>
    <MHDesignSpace w={1920} h={1080}><MotionTestPiece /></MHDesignSpace></CompositionStage>);
}
Object.assign(window, { ${name}: ${name} });
`;
}
export function testPage({ from, dur, fonts = [], name = 'MOTION_TEST' }) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script src="motion-runtime.js"></script>
</head>
<body>
<x-dc>
<helmet>
${fonts.join('\n')}
<style>
html, body { margin: 0; background: #000; }
</style>
<script>window.OM_SCENES = '[{"name":"${name}","dur":${dur},"desc":"motion-test"}]';</script>
<script>window.OM_PLAYBACK = '{"mode":"loop"}';</script>
<script>window.__waitRaf = 2; window.__waitMs = 0;</script>
</helmet>
<x-import component-from-global-scope="${name}" from="${from.join(' ')}" style="position:absolute;inset:0"></x-import>
</x-dc>
</body>
</html>
`;
}

// ── hazır mekanik test sahneleri (runtime/motion-mek.jsx, MH.mek) ──────────────
// motion-render motion-test mek-supurme | mek-katlama | mek-seyahat [--props '<json>']: --props ilkelin seçeneklerine yazılır (ör. {"kind":"out"},
// {"hinge":"top","angle":96}, {"profile":"quintic"}). Sahne nötr gri + ölçüm dokusu (periyotsuz gürültü PNG'si, SAD izleme için); görünüş değildir.
// Sayfa tasarım hızını __mtSpeed (süpürme: yüzey · katlama: serbest kenar ortası) ya da __camSpeed (seyahat) ile, planı __mtPlan ile verir;
// geçiş penceresi __mtGecis (frame-check pop exclude biçimi). Hız tasarım px/kare (@1080, istenen fps).
export const MEK_TESTS = { 'mek-supurme': 'sweep', 'mek-katlama': 'fold', 'mek-seyahat': 'travel' };
const MEK_DEF = {
  sweep: { kind: 'through', box: [-200, -40, 2320, 1160], dir: [1, 0], t: 0.5, lead: 0.07, dur: 1.6, lift: 6, blur: { max: 10, div: 120 } },
  fold: { box: [960, 270, 700, 540], hinge: 'left', angle: 180, t: 0.45, lead: 0.1, leadLift: 4, dur: 1.8, persp: 2200, thickness: 6 },
  travel: { from: { x: 900, y: 760 }, to: { x: 2350, y: 1120 }, t: 0.15, visible: 1.5, up: { d: -420, rx: 6 }, settle: { amp: 3, dur: 0.28 }, persp: 2200, peakMax: 25, dof: { k: 0.008, max: 4 }, mb: 'k' },
};
// tex: dokunun SAYFA KÖKÜNE göre yolu (harness sayfayı kökte açar: göreli url kök dizinden çözülür)
export function mekTestJsx({ test, opts = {}, bg = '#808080', tex = 'mt-doku.png', name = 'MOTION_TEST' }) {
  const kind = MEK_TESTS[test]; if (!kind) throw new Error('bilinmeyen mekanik testi: ' + test + ' (' + Object.keys(MEK_TESTS).join(' | ') + ')');
  const o = Object.assign({}, MEK_DEF[kind], opts, { frame: [0, 0, 1920, 1080] });
  const piece = {
    sweep: `var MT_X = MH.mek.sweep(MT.o);
MH.mek.hooks.speed('mtSpeed', function (T, dt) { return MT_X.speed(T, dt); });
MH.mek.hooks.windows('mtGecis', [MT_X.window()]);
MH.hooks.boxes(function (T) { return [MT_X.boxEntry(T, 'yuzey')]; });
function MotionTestPiece() {
  var T = MH.useT().T, q = MT_X.at(T);
  return <div style={{ position: 'absolute', inset: 0, background: MT.bg }}>
    {q.swap ? mtSurf({ w: 1920, h: 1080, bx: 431, by: 207, tone: 'rgba(255,255,255,0.22)', marks: 'b' }) : mtSurf({ w: 1920, h: 1080, tone: 'rgba(0,0,0,0.22)', marks: 'a' })}
    <MHSweep s={MT_X} T={T} shade={{ fn: mtShade, color: '#000' }}>{mtSurf({ w: MT_X.box[2], h: MT_X.box[3], bx: 613, by: 389, tone: 'rgba(255,255,255,0.08)', frame: 10 })}</MHSweep>
  </div>;
}`,
    fold: `var MT_X = MH.mek.fold(MT.o);
MH.mek.hooks.speed('mtSpeed', function (T, dt) { return MT_X.speed(T, dt); });
MH.mek.hooks.windows('mtGecis', [MT_X.window()]);
MH.hooks.boxes(function (T) { return [MT_X.boxEntry(T, 'yaprak')]; });
function MotionTestPiece() {
  var T = MH.useT().T, b = MT_X.box;
  return <div style={{ position: 'absolute', inset: 0, background: MT.bg }}>
    {mtSurf({ w: 1920, h: 1080, tone: 'rgba(0,0,0,0.18)', marks: 'a' })}
    <MHFold f={MT_X} T={T} shade={{ fn: mtShade, color: '#000' }} edge="rgb(72,72,72)"
      front={mtSurf({ w: b[2], h: b[3], bx: 251, by: 97, tone: 'rgba(255,255,255,0.30)', frame: 8 })}
      back={mtSurf({ w: b[2], h: b[3], bx: 777, by: 512, tone: 'rgba(0,0,0,0.30)', frame: 8 })} />
  </div>;
}`,
    travel: `var MT_X = MH.mek.travel(MT.o);
MT_X.hook({});
MH.mek.hooks.speed('mtSpeed', function (T, dt) { return MT_X.speed(T, dt); });
MH.mek.hooks.windows('mtGecis', [MT_X.window()]);
function mtTable() {   // dünya düzlemi (dokulu masa) + iki kart (çıkış ve varış)
  var A = MT.o.from, B = MT.o.to;
  return <div style={{ position: 'absolute', left: 0, top: 0, width: 3600, height: 2200 }}>
    {mtSurf({ w: 3600, h: 2200, tone: 'rgba(0,0,0,0.12)', marks: 'w' })}
    {mtSurf({ x: A.x - 280, y: A.y - 180, w: 560, h: 360, bx: 300, by: 120, tone: 'rgba(255,255,255,0.30)', frame: 8 })}
    {mtSurf({ x: B.x - 280, y: B.y - 180, w: 560, h: 360, bx: 640, by: 470, tone: 'rgba(255,255,255,0.30)', frame: 8 })}
  </div>;
}
function MotionTestPiece() {
  // DoF süzgeci hamle boyunca hiç kalkmaz (taban dofFloor px): süzgecin dinlenmede kalkması raster yolunu değiştirir → tek karede keskinlik basamağı
  var r = MH.useT(), T = r.T, c = MT_X.at(T), v = MH.cam.motion(MT_X.at, T, r.dt, { persp: MT.o.persp }), dof = Math.max(MT_X.dof(T), MT.o.dofFloor == null ? 0.1 : MT.o.dofFloor), mb = MT.o.mb;
  var cam = <MHCam c={c} persp={MT.o.persp}><div style={{ position: 'absolute', left: 0, top: 0, width: 3600, height: 2200, filter: dof > 0 ? 'blur(' + dof.toFixed(2) + 'px)' : undefined }}>{mtTable()}</div></MHCam>;
  return <div style={{ position: 'absolute', inset: 0, background: MT.bg }}>
    {mb === 'off' ? cam : mb === 'core' ? <MHMoBlur v={v} shutter={180} minPx={3} id="mtmb">{cam}</MHMoBlur> : <MHMoBlurK v={v} shutter={180} minPx={3} id="mtmb">{cam}</MHMoBlurK>}
  </div>;
}`,
  }[kind];
  return `// motion-test tarafından üretildi (elle düzenlenmez): ${test} — MH.mek.${kind} hazır test sahnesi (nötr gri + ölçüm dokusu; görünüş değil)
var MT = ${JSON.stringify({ test, kind, bg, tex, o })};
var MT_MARKS = { a: [[180, 160], [760, 620], [1340, 260], [1500, 760]], b: [[320, 700], [900, 240], [1600, 520]], w: [[400, 300], [1500, 500], [2600, 300], [700, 1500], [1900, 1700], [3000, 1300]] };
function mtSurf(p) {   // dokulu yüzey (opak): gürültü dokusu + ton + isteğe bağlı çerçeve + koyu işaretler (ölçüm için; renk/malzeme değil)
  return <div style={{ position: 'absolute', left: p.x || 0, top: p.y || 0, width: p.w, height: p.h, overflow: 'hidden', backgroundColor: MT.bg, backgroundImage: 'url(' + MT.tex + ')', backgroundSize: '1024px 1024px', backgroundPosition: (p.bx || 0) + 'px ' + (p.by || 0) + 'px' }}>
    <div style={{ position: 'absolute', inset: 0, background: p.tone || 'transparent' }} />
    {(MT_MARKS[p.marks] || []).map(function (q, i) { return <div key={i} style={{ position: 'absolute', left: q[0], top: q[1], width: 140, height: 90, background: 'rgba(20,20,20,0.55)' }} />; })}
    {p.frame ? <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 ' + p.frame + 'px rgba(20,20,20,0.8)' }} /> : null}
  </div>;
}
function mtShade(z) { return { dx: 3 + 0.6 * z, dy: 4 + 0.9 * z, blur: 6 + 0.4 * z, a: 0.35 }; }   // test sahnesi gölgesi (world değeri değil)
// doku ilk kareden önce çözülsün: harness her karede __fxBakeSettle'ı bekler; ilk çağrı dokuyu bekleyip true döner (kare aynı T'de yeniden çizilir)
var MT_IMG = new Image(); MT_IMG.src = MT.tex; var MT_DEC = MT_IMG.decode().catch(function () {}), MT_OK = false, MT_BAKE = window.__fxBakeSettle;
window.__fxBakeSettle = async function () { var first = !MT_OK; await MT_DEC; MT_OK = true; var b = MT_BAKE ? await MT_BAKE() : false; return b || first; };
${piece}
window.__mtPlan = function () { var p = MT_X.plan(); return JSON.parse(JSON.stringify(p, function (k, v) { return typeof v === 'number' && !isFinite(v) ? (v > 0 ? 'inf' : '-inf') : v; })); };
function ${name}(props) {
  var st = MH.stage(props); MH.setStage(st.w, st.h);
  return (<CompositionStage width={st.w} height={st.h} bg={MT.bg} scenes={window.OM_SCENES} playback={window.OM_PLAYBACK}>
    <MHDesignSpace w={1920} h={1080}><MotionTestPiece /></MHDesignSpace></CompositionStage>);
}
Object.assign(window, { ${name}: ${name} });
`;
}
// ölçüm dokusu: periyotsuz gri gürültü (deterministik LCG, yumuşatma) — sahnede 1024 px'e büyütülür; döşeme aralığı SAD aramasından büyük (sahte eşleşme yok)
export async function noisePng(file, { w = 512, h = 512, seed = 7 } = {}) {
  const b = Buffer.alloc(w * h); let s = (seed * 2654435761) % 4294967296;
  for (let i = 0; i < b.length; i++) { s = (s * 1664525 + 1013904223) % 4294967296; b[i] = 70 + Math.floor((s / 4294967296) * 120); }
  await sharp(b, { raw: { width: w, height: h, channels: 1 } }).blur(1.2).png().toFile(file);
}
// tasarım hızı dizisi (kanca: px/kare) → pixel profiliyle aynı biçim (grafik serisi) + frame-check velocity tanımıyla C1 (taban 0,05, tepeye göre %5).
// c1Settle: aynı tarama taban 0,001 ile — oturmanın dönüş yarısı (hız 0'dan geçer) ana hamlenin parçası sayılır (PN-138 önerisi; bilgi)
export function designProfile(speed, fps) {
  const v = speed.map((x) => +x || 0), accel = v.map((x, i) => (i ? x - v[i - 1] : 0)), peak = Math.max(0, ...v), S = v.map((s, f) => ({ f, s }));
  const sum = (c) => ({ jumps: c.viol.length, worstShare: +Math.max(0, ...c.moves.map((m) => m.share)).toFixed(3), moves: c.moves.length });
  const c1 = c1Scan(S, { maxJump: 0.05, floor: 0.05, minDv: 0.05 }), c1s = c1Scan(S, { maxJump: 0.05, floor: 0.001, minDv: 0.05 }), moving = v.filter((x) => x > 0.2).length;
  return { fps, frames: v.length, speed: v.map((x) => +x.toFixed(2)), accel: accel.map((x) => +x.toFixed(2)), peak: +peak.toFixed(2), peakAt: v.indexOf(peak),
    maxAccel: +Math.max(0, ...accel.map(Math.abs)).toFixed(2), movingShare: +(moving / Math.max(1, v.length)).toFixed(3), c1: sum(c1), c1Settle: sum(c1s) };
}

// ── klip → gri kareler ────────────────────────────────────────────────────────
export function clipGray(file, { start = 0, dur = 3, fps = 30, w = 960, h = 540 } = {}) {
  const r = spawnSync(ffmpeg, ['-v', 'error', '-ss', String(start), '-t', String(dur), '-i', file, '-vf', 'fps=' + fps + ',scale=' + w + ':' + h + ':flags=area,format=gray', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error('ffmpeg klip: ' + String(r.stderr || '').slice(-400));
  const n = w * h, out = [];
  for (let i = 0; (i + 1) * n <= r.stdout.length; i++) out.push(r.stdout.subarray(i * n, (i + 1) * n));
  return out;
}

// ── hareket vektörü ───────────────────────────────────────────────────────────
function down(Y, W, H, k) {
  const w = Math.floor(W / k), h = Math.floor(H / k), o = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0; for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) s += Y[(y * k + j) * W + x * k + i]; o[y * w + x] = s / (k * k); }
  return { Y: o, W: w, H: h };
}
// destek pikselleri (k ölçeğinde) üzerinde SAD; kadraj dışı = 64
function sad(prev, cur, W, H, S, dx, dy) {
  let s = 0;
  for (const k of S) { const x = (k % W) - dx, y = ((k / W) | 0) - dy; s += x < 0 || y < 0 || x >= W || y >= H ? 64 : Math.abs(cur[k] - prev[y * W + x]); }
  return s / Math.max(1, S.length);
}
export function motionVector(prev, cur, W, H, { thr = 8, R = 48, minPx = 20 } = {}) {
  const S = [];
  for (let k = 0; k < cur.length; k++) if (Math.abs(cur[k] - prev[k]) >= thr) S.push(k);
  if (S.length < minPx) return { d: [0, 0], n: S.length, still: true };
  const K = 4, P = down(prev, W, H, K), C = down(cur, W, H, K), SS = [...new Set(S.map((k) => Math.floor(((k / W) | 0) / K) * P.W + Math.floor((k % W) / K)))].filter((k) => k < P.Y.length);
  const st = Math.max(1, Math.floor(SS.length / 3000)), sub = SS.filter((_, i) => i % st === 0), r = Math.ceil(R / K);
  let best = [0, 0], bv = sad(P.Y, C.Y, P.W, P.H, sub, 0, 0);
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const v = sad(P.Y, C.Y, P.W, P.H, sub, dx, dy); if (v < bv) { bv = v; best = [dx, dy]; } }
  const st2 = Math.max(1, Math.floor(S.length / 6000)), sub2 = S.filter((_, i) => i % st2 === 0), cost = new Map();
  const at = (dx, dy) => { const key = dx + ',' + dy; if (!cost.has(key)) cost.set(key, sad(prev, cur, W, H, sub2, dx, dy)); return cost.get(key); };
  let fb = [best[0] * K, best[1] * K], fv = at(fb[0], fb[1]);
  for (let dy = fb[1] - 3; dy <= fb[1] + 3; dy++) for (let dx = fb[0] - 3; dx <= fb[0] + 3; dx++) { const v = at(dx, dy); if (v < fv) { fv = v; fb = [dx, dy]; } }
  // parabol alt pikseli yalnız gerçek yerel en azda ve ±0,5 içinde (düz SAD vadisinde bölme patlamasın)
  const par = (l, c, rr) => { const q = l - 2 * c + rr; return q > 1e-6 && c <= l && c <= rr ? Math.max(-0.5, Math.min(0.5, (0.5 * (l - rr)) / q)) : 0; };
  return { d: [fb[0] + par(at(fb[0] - 1, fb[1]), fv, at(fb[0] + 1, fb[1])), fb[1] + par(at(fb[0], fb[1] - 1), fv, at(fb[0], fb[1] + 1))], n: S.length, sad: +fv.toFixed(3) };
}
// gri kare dizisi → profil (px/kare @1080, klip fps'inde)
export function profile(frames, W, H, { fps = 30, R = 160 } = {}) {
  // kesme (karenin > %50'si değişti ve en iyi kaydırma artığı yüksek): hız ölçülmez, tepe ve C1 dışı (referans klipte sahne değişimi)
  const s = 1080 / H, v = [[0, 0]], speed = [0], still = [true], cuts = [];
  for (let i = 1; i < frames.length; i++) {
    const m = motionVector(frames[i - 1], frames[i], W, H, { R: Math.round((R * H) / 1080) });
    if (m.n > 0.5 * W * H && m.sad > 10) { cuts.push(i); v.push([0, 0]); speed.push(0); still.push(false); continue; }
    v.push([m.d[0] * s, m.d[1] * s]); speed.push(Math.hypot(m.d[0], m.d[1]) * s); still.push(!!m.still);
  }
  const cut = new Set(cuts), accel = speed.map((x, i) => (i && !cut.has(i) && !cut.has(i - 1) ? x - speed[i - 1] : 0)), peak = Math.max(0, ...speed);
  const c1 = c1Scan(v.map((d, f) => ({ f, v: d })).filter((x) => !cut.has(x.f)), { maxJump: 0.05, floor: 0.2, minDv: 0.2 });
  const moving = speed.filter((x) => x > 0.2).length;
  return { fps, frames: frames.length, speed: speed.map((x) => +x.toFixed(2)), accel: accel.map((x) => +x.toFixed(2)), vec: v.map((d) => d.map((x) => +x.toFixed(2))),
    peak: +peak.toFixed(2), peakAt: speed.indexOf(Math.max(...speed)), cuts, maxAccel: +Math.max(0, ...accel.map(Math.abs)).toFixed(2), movingShare: +(moving / Math.max(1, speed.length)).toFixed(3),
    c1: { jumps: c1.viol.length, worstShare: +Math.max(0, ...c1.moves.map((m) => m.share)).toFixed(3), moves: c1.moves.length } };
}

// ── grafik ───────────────────────────────────────────────────────────────────
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
export function speedSvg(series, { title = '', w = 1600, h = 900 } = {}) {
  const pad = { l: 90, r: 30, t: 70, b: 60 }, gap = 70, ph = (h - pad.t - pad.b - gap) / 2, pw = w - pad.l - pad.r;
  const n = Math.max(...series.map((s) => s.p.speed.length)), fps = series[0].p.fps, dur = (n - 1) / fps;
  const vmax = Math.max(1, ...series.map((s) => s.p.peak)) * 1.1, amax = Math.max(0.5, ...series.map((s) => s.p.maxAccel)) * 1.1;
  const X = (i) => pad.l + (pw * i) / fps / Math.max(1e-9, dur);
  const panel = (y0, lo, hi, key, label) => {
    const Y = (v) => y0 + ph - (ph * (v - lo)) / (hi - lo); let g = `<rect x="${pad.l}" y="${y0}" width="${pw}" height="${ph}" fill="#fafafa" stroke="#bbb"/>`;
    for (let t = 0; t <= dur + 1e-9; t += 0.5) g += `<line x1="${X(t * fps)}" y1="${y0}" x2="${X(t * fps)}" y2="${y0 + ph}" stroke="#e2e2e2"/><text x="${X(t * fps)}" y="${y0 + ph + 22}" font-size="16" text-anchor="middle" fill="#555">${t.toFixed(1)} s</text>`;
    for (const v of [lo, (lo + hi) / 2, hi]) g += `<text x="${pad.l - 10}" y="${Y(v) + 5}" font-size="16" text-anchor="end" fill="#555">${v.toFixed(1)}</text>`;
    if (lo < 0) g += `<line x1="${pad.l}" y1="${Y(0)}" x2="${pad.l + pw}" y2="${Y(0)}" stroke="#999"/>`;
    g += `<text x="${pad.l}" y="${y0 - 10}" font-size="18" fill="#222">${esc(label)}</text>`;
    for (const s of series) g += `<polyline fill="none" stroke="${s.color}" stroke-width="2.5" points="${s.p[key].map((v, i) => X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')}"/>`;
    return g;
  };
  let body = panel(pad.t, 0, vmax, 'speed', 'hız (px/kare @1080, ' + fps + ' fps)') + panel(pad.t + ph + gap, -amax, amax, 'accel', 'ivme (Δ hız, px/kare²)');
  series.forEach((s, i) => { body += `<rect x="${pad.l + 10 + i * 420}" y="${h - 28}" width="22" height="6" fill="${s.color}"/><text x="${pad.l + 40 + i * 420}" y="${h - 20}" font-size="16" fill="#222">${esc(s.label)} · tepe ${s.p.peak} · C1 en kötü %${Math.round(s.p.c1.worstShare * 100)}</text>`; });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" font-family="Arial, sans-serif"><rect width="100%" height="100%" fill="#fff"/><text x="${pad.l}" y="36" font-size="22" font-weight="bold" fill="#111">${esc(title)}</text>${body}</svg>`;
}
export async function svgPng(svg, file) { await sharp(Buffer.from(svg)).png().toFile(file); }

// ── yan yana kontak: satır başına bir klip, sütun başına bir an ─────────────────
export async function contactSheet(rows, file, { cell = 384, title = '' } = {}) {
  const ch = Math.round((cell * 9) / 16), lab = 26, top = title ? 40 : 0, cols = Math.max(...rows.map((r) => r.frames.length)), comp = [];
  for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].frames.length; c++) {
    const it = rows[r].frames[c];
    comp.push({ input: await sharp(it.png).resize(cell, ch).png().toBuffer(), left: c * cell, top: top + r * (ch + lab) + lab });
    comp.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cell}" height="${lab}"><rect width="100%" height="100%" fill="#111"/><text x="6" y="18" font-size="15" font-family="Arial" fill="#eee">${esc(rows[r].label + ' · ' + it.t.toFixed(2) + ' s')}</text></svg>`), left: c * cell, top: top + r * (ch + lab) });
  }
  if (title) comp.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cell}" height="${top}"><rect width="100%" height="100%" fill="#000"/><text x="8" y="27" font-size="20" font-family="Arial" fill="#fff">${esc(title)}</text></svg>`), left: 0, top: 0 });
  await sharp({ create: { width: cols * cell, height: top + rows.length * (ch + lab), channels: 3, background: '#000' } }).composite(comp).png().toFile(file);
}
