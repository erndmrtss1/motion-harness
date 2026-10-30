// lib/fc/design.mjs — Katman B: tasarım zamanı izdüşüm denetimi (render yok; sayfa kancalarıyla).
//   framing  · __boxes(T)            kadraj payı, kesik, lyric/metin boyu, tam içeride-ya-da-dışarıda, masa payı
//   toolPath · __tools(T, Tprev)     alet hızı (mutlak/göreli, evre başına), K8 giriş/çıkış, tek alet, tutuşta alet (__holds)
//   overlap  · __tools/__boxes/__glyphs  geometrik örtme (kutu ya da SAT), evre başına örten kare
//   camera   · __camSpeed(fps, n)    tepe, p95, basamak (|Δv| > stepJump), K3 hareketli pay (__shots ya da shots)
// Zaman tabanı (isteğe bağlı kancalar): __frameN(fps) → kare sayısı · __frameT(i, fps) → T (ya da [T, dt]); yoksa T = i / fps.
// Kancalar ekran px'i döndürür; dünya → ekran izdüşümü sahnenin işidir (frame-check projeye özgü geometri bilmez).
import { verdict, result, unmeasured, hookName, deref, r2, r3, WIDTH, HEIGHT } from './common.mjs';

// ── sayfa içi ölçüm (tek fonksiyon; Playwright kaynak metniyle taşır — dış kapsam kullanmaz) ──────────
export function PAGE(a) {
  var W = a.W, H = a.H, fps = a.fps;
  var hasF = function (n) { return typeof window[n] === 'function'; };
  var N = a.n != null ? a.n : hasF('__frameN') ? window.__frameN(fps) : a.frames;
  var TT = function (i) { if (hasF('__frameT')) { var r = window.__frameT(i, fps); return Array.isArray(r) ? r[0] : r; } return i / fps; };
  var P = function (p) { return Array.isArray(p) ? [+p[0], +p[1]] : [+p.x, +p.y]; };
  var pts = function (o) {
    if (!o) return null;
    if (o.rect) { var r = o.rect; return [[r[0], r[1]], [r[0] + r[2], r[1]], [r[0] + r[2], r[1] + r[3]], [r[0], r[1] + r[3]]]; }
    if (o.poly) return o.poly.map(P);
    if (Array.isArray(o) && o.length && typeof o[0] === 'object') return o.map(P);
    if (o.tip) return [P(o.tip)];
    return null;
  };
  var bb = function (Q) { var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; Q.forEach(function (q) { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }); return [x0, y0, x1, y1]; };
  var R = function (b) { return b.map(function (v) { return Math.round(v); }); };
  var inConvex = function (Q, x, y) { var pos = 0, neg = 0; for (var e = 0; e < Q.length; e++) { var A = Q[e], B = Q[(e + 1) % Q.length], c = (B[0] - A[0]) * (y - A[1]) - (B[1] - A[1]) * (x - A[0]); if (c > 0) pos++; else if (c < 0) neg++; } return !(pos && neg); };
  var f0 = a.from || 0, f1 = Math.min(N, a.to != null ? a.to + 1 : N), step = a.step || 1;
  var get = function (o, path) { return path.split('.').reduce(function (x, k) { return x == null ? x : x[k]; }, o); };
  // başvuru → şekiller: tool:<ad>[.<parça>] · box:<ad> (sonda * = önek) · kind:<tür> · glyphs[:<ad>] (overlap, shapes, track ortak)
  var hk = { tool: '__tools', box: '__boxes', kind: '__boxes', glyphs: '__glyphs' };
  var shapes = function (ref, T, Tp, cache) {
    var s = ref.split(':'), kind = s[0], arg = s.slice(1).join(':'), out = [], meta = null, names = [];
    var nameOk = function (n) { return arg.slice(-1) === '*' ? String(n).indexOf(arg.slice(0, -1)) === 0 : n === arg; };
    if (kind === 'tool') {
      var tl = cache.t || (cache.t = window.__tools(T, Tp) || {}), nm = arg.split('.')[0], part = arg.split('.')[1], t = tl[nm];
      if (t) { meta = t; var g = part ? t.parts && t.parts[part] : t.poly || (t.tip ? [t.tip] : null); if (g) { out.push(pts(Array.isArray(g) ? g : g)); names.push(nm); } }
    } else if (kind === 'box' || kind === 'kind') {
      var bx = cache.b || (cache.b = window.__boxes(T) || []);
      bx.forEach(function (b) { if (kind === 'box' ? nameOk(b.name) : b.kind === arg) { var Q = pts(b); if (Q) { out.push(Q); names.push(b.name); } } });
    } else if (kind === 'glyphs') {
      (window.__glyphs(T, arg || null) || []).forEach(function (g) { var Q = pts(g); if (Q) { out.push(Q); names.push(arg || 'glif'); } });
    }
    return { list: out.filter(Boolean), meta: meta, names: names };
  };
  var refsOk = function (refs) { for (var q = 0; q < refs.length; q++) { var k = refs[q].split(':')[0]; if (!hk[k]) return { error: 'bilinmeyen başvuru: ' + k }; if (!hasF(hk[k])) return { missing: hk[k] }; } return null; };

  if (a.kind === 'call') {   // kanca çağrısı (kamera hızı, tutuşlar, olaylar, aksan kutuları …)
    if (!hasF(a.fn)) return { missing: a.fn };
    var args = (a.args || []).map(function (x) { return x === '$N' ? N : x; });
    return { N: N, value: window[a.fn].apply(null, args) };
  }

  if (a.kind === 'shapes') {   // verilen T anlarında başvuru şekilleri (onset: bölge = dış kutu, maske = çokgen); a.names: kutu adları da döner
    var bad0 = refsOk(a.refs || []); if (bad0) return bad0;
    return { N: N, at: (a.Ts || []).map(function (T) {
      var cache = {}, Tp = T - 1 / fps, o = {};
      (a.refs || []).forEach(function (ref) { var S = shapes(ref, T, Tp, cache); o[ref] = S.list.map(function (Q) { return { box: R(bb(Q)), poly: Q.map(function (q) { return [Math.round(q[0]), Math.round(q[1])]; }) }; }); });
      if (a.names) o.$names = (cache.b || (hasF('__boxes') ? window.__boxes(T) || [] : [])).map(function (b) { return b.name + ' · ' + b.kind; });
      return o;
    }) };
  }

  if (a.kind === 'track') {   // kare başı iz (velocity, entryExit): araçlar [f, x, y, kadraj, vis, evre] · kutular [f, cx, cy, x0, y0, x1, y1, kadraj, vis, evre]
    var tr = { tools: {}, boxes: {} }, useT = a.tools !== false && hasF('__tools'), bref = a.boxes || [];
    var bad1 = refsOk(bref); if (bad1) return bad1;
    var inF = function (r) { return r[2] < 0 || r[0] > W || r[3] < 0 || r[1] > H ? 0 : r[0] >= 0 && r[2] <= W && r[1] >= 0 && r[3] <= H ? 2 : 1; };
    for (var f4 = f0; f4 < f1; f4 += step) {
      var T4 = TT(f4), Tp4 = f4 > 0 ? TT(f4 - 1) : T4 - 1 / fps, cache4 = {};
      if (useT) {
        var tl4 = cache4.t = window.__tools(T4, Tp4) || {};
        Object.keys(tl4).forEach(function (n) {
          var t = tl4[n]; if (!t || (a.only && a.only.indexOf(n) < 0)) return;
          var Q = pts(t.poly ? { poly: t.poly } : t), tip = t.tip ? P(t.tip) : Q && Q[0]; if (!tip) return;
          var r = Q && Q.length > 1 ? bb(Q) : [tip[0], tip[1], tip[0], tip[1]], k = t.visible != null ? (t.visible ? Math.max(1, inF(r)) : 0) : inF(r);
          (tr.tools[n] = tr.tools[n] || []).push([f4, +tip[0].toFixed(2), +tip[1].toFixed(2), k, t.vis != null ? +t.vis : 1, t.phase != null ? String(get(t, a.phaseBy || 'phase')) : null]);
        });
      }
      bref.forEach(function (ref) {
        var S = shapes(ref, T4, Tp4, cache4), by = {};
        S.list.forEach(function (Q, i) { var n = S.names[i], r = bb(Q); by[n] = by[n] ? [Math.min(by[n][0], r[0]), Math.min(by[n][1], r[1]), Math.max(by[n][2], r[2]), Math.max(by[n][3], r[3])] : r; });
        var raw = cache4.b || [];
        Object.keys(by).forEach(function (n) {
          var r = by[n], src = raw.filter(function (b) { return b.name === n; })[0] || {};
          (tr.boxes[n] = tr.boxes[n] || []).push([f4, +((r[0] + r[2]) / 2).toFixed(2), +((r[1] + r[3]) / 2).toFixed(2), Math.round(r[0]), Math.round(r[1]), Math.round(r[2]), Math.round(r[3]), inF(r),
            src.vis != null ? +src.vis : 1, src.phase != null ? String(src.phase) : null]);
        });
      });
    }
    return { N: N, from: f0, to: f1 - 1, step: step, tools: tr.tools, boxes: tr.boxes };
  }

  if (a.kind === 'framing') {
    if (!hasF('__boxes')) return { missing: '__boxes' };
    var K = a.kinds || {}, fails = [], nF = 0, nBad = 0, deskMax = 0, deskAt = null, minPx = {}, rules = {};
    for (var f = f0; f < f1; f += step) {
      var T = TT(f), Bx = window.__boxes(T) || [], bad = [];
      nF++;
      if (a.desk) {
        var Qs = Bx.filter(function (b) { return b.kind === 'paper'; }).map(pts);
        if (Qs.length) {
          var inq = 0, tot = 0;
          for (var gy = 5; gy < H; gy += 24) for (var gx = 5; gx < W; gx += 24) { tot++; if (Qs.some(function (Q) { return inConvex(Q, gx, gy); })) inq++; }
          var desk = 1 - inq / tot;
          if (desk > deskMax) { deskMax = desk; deskAt = f; }
          if (desk > a.desk.max) bad.push({ name: 'masa', rule: 'desk', v: +desk.toFixed(4) });
        }
      }
      Bx.forEach(function (b) {
        if (b.kind === 'paper' || b.kind === 'ref') return;
        var k = K[b.kind] || {}, Q = pts(b), pad = b.pad != null ? b.pad : k.pad, mp = b.minPx != null ? b.minPx : k.minPx, test = b.test || k.test || 'bbox';
        if (b.px != null && (!minPx[b.name] || b.px < minPx[b.name][0])) minPx[b.name] = [+(+b.px).toFixed(1), f];
        if (mp != null && b.px != null && b.px < mp) bad.push({ name: b.name, rule: 'minPx', v: Math.round(b.px), min: mp });
        if (!Q) return;
        var r = bb(Q), nin = Q.filter(function (q) { return q[0] >= 0 && q[0] <= W && q[1] >= 0 && q[1] <= H; }).length;
        if (k.allOrNothing || b.allOrNothing) {
          var partial = test === 'points' ? nin > 0 && nin < Q.length
            : !(r[0] > W || r[2] < 0 || r[1] > H || r[3] < 0) && !(r[0] >= 0 && r[2] <= W && r[1] >= 0 && r[3] <= H);
          if (partial) bad.push({ name: b.name, rule: 'kesik', bbox: R(r) });
        } else if (k.fullyOutside || b.fullyOutside) {
          var seen = test === 'points' ? nin > 0 : r[2] > 0 && r[0] < W && r[3] > 0 && r[1] < H;
          if (seen) bad.push({ name: b.name, rule: 'görünür', bbox: R(r) });
        } else if (pad != null) {
          var pl = b.padLeft != null ? b.padLeft : k.padLeft != null ? k.padLeft : pad;
          if (r[0] < pl || r[2] > W - pad || r[1] < pad || r[3] > H - pad) bad.push({ name: b.name, rule: 'pay', pad: pad, bbox: R(r) });
        }
      });
      bad.forEach(function (x) { rules[x.rule] = (rules[x.rule] || 0) + 1; });
      if (bad.length) { nBad++; if (fails.length < (a.keep || 60)) fails.push({ f: f, T: +T.toFixed(3), bad: bad }); }
    }
    var meas = (a.measure || []).map(function (m) {   // adlandırılmış kutunun T anındaki ekran ölçüsü (rapor)
      var b = (window.__boxes(m.T) || []).filter(function (x) { return x.name === m.box; })[0], Q = b && pts(b);
      if (!Q) return { box: m.box, T: m.T, missing: true };
      var r = bb(Q); return { box: m.box, T: m.T, w: Math.round(r[2] - r[0]), h: Math.round(r[3] - r[1]), cx: Math.round((r[0] + r[2]) / 2), cy: Math.round((r[1] + r[3]) / 2), px: b.px != null ? Math.round(b.px) : undefined };
    });
    return { N: N, frames: nF, bad: nBad, rules: rules, fails: fails, deskMax: +deskMax.toFixed(4), deskAt: deskAt, minPx: minPx, measure: meas };
  }

  if (a.kind === 'tools') {
    if (!hasF('__tools')) return { missing: '__tools' };
    var holds = a.holds ? (hasF(a.holds) ? window[a.holds]() || [] : null) : [];
    if (holds === null) return { missing: a.holds };
    var only = a.only || null, reset = a.resetHidden, m = a.visMargin || 0, by = a.phaseBy || 'phase';
    var prev = {}, pres = {}, peaks = {}, first = {}, last = {}, viol = [], nF2 = 0;
    var isReset = function (n) { return reset === true || (Array.isArray(reset) && reset.indexOf(n) >= 0); };
    var upd = function (key, abs, rel, T) { var o = peaks[key] || (peaks[key] = { abs: 0, absT: null, rel: null, relT: null, n: 0 }); o.n++; if (abs > o.abs) { o.abs = abs; o.absT = +T.toFixed(3); } if (rel != null && (o.rel == null || rel > o.rel)) { o.rel = rel; o.relT = +T.toFixed(3); } };
    for (var f2 = f0; f2 < f1; f2 += step) {
      var T2 = TT(f2), Tp = f2 > 0 ? TT(f2 - 1) : T2 - 1 / fps, tools = window.__tools(T2, Tp) || {}, vis = [];
      nF2++;
      Object.keys(tools).forEach(function (n) {
        if (only && only.indexOf(n) < 0) return;
        var t = tools[n]; if (!t) return;
        var Q = pts(t.poly ? { poly: t.poly } : t), tip = t.tip ? P(t.tip) : Q[0], r = bb(Q);
        var v = t.visible != null ? !!t.visible : r[2] > -m && r[0] < W + m && r[3] > -m && r[1] < H + m;
        if (a.k8 && !pres[n] && v) viol.push({ f: f2, T: +T2.toFixed(3), rule: 'K8 giriş', tool: n });
        pres[n] = { v: v };
        if (v) { vis.push(n); if (first[n] == null) first[n] = +T2.toFixed(3); last[n] = +T2.toFixed(3); }
        var pv = prev[n];
        if (pv && v) {
          var abs = 0;
          if (a.metric === 'poly' && Q.length === pv.Q.length) Q.forEach(function (q, i) { var d = Math.hypot(q[0] - pv.Q[i][0], q[1] - pv.Q[i][1]); if (d > abs) abs = d; });
          else abs = Math.hypot(tip[0] - pv.tip[0], tip[1] - pv.tip[1]);
          var rel = t.ref ? Math.hypot(tip[0] - P(t.ref)[0], tip[1] - P(t.ref)[1]) : null, ph = get(t, by);
          upd(n, abs, rel, T2); if (ph != null) upd(n + '/' + ph, abs, rel, T2);
        }
        prev[n] = isReset(n) && !v ? null : { Q: Q, tip: tip };
      });
      Object.keys(pres).forEach(function (n) {
        if (pres[n] && !tools[n]) { if (a.k8 && pres[n].v) viol.push({ f: f2, T: +T2.toFixed(3), rule: 'K8 çıkış', tool: n }); pres[n] = null; prev[n] = null; }
      });
      if (a.single && vis.length > 1) viol.push({ f: f2, T: +T2.toFixed(3), rule: 'tek alet', tools: vis.slice() });
      if (holds.length && vis.length && holds.some(function (h) { return T2 >= h[0] && T2 <= h[1]; })) viol.push({ f: f2, T: +T2.toFixed(3), rule: 'tutuşta alet', tools: vis.slice() });
    }
    Object.keys(peaks).forEach(function (k) { var o = peaks[k]; o.abs = +o.abs.toFixed(2); if (o.rel != null) o.rel = +o.rel.toFixed(2); });
    return { N: N, frames: nF2, peaks: peaks, first: first, last: last, viol: viol.slice(0, a.keep || 200), violCount: viol.length, holds: holds };
  }

  if (a.kind === 'overlap') {
    var bad2 = refsOk([a.a, a.b]); if (bad2) return bad2;
    var pad = a.pad || 0, pd = Array.isArray(pad) ? pad : [pad, pad, pad, pad];
    var hitBox = function (A, B) { var ra = bb(A), rb = bb(B); rb = [rb[0] - pd[0], rb[1] - pd[1], rb[2] + pd[2], rb[3] + pd[3]]; return ra[0] < rb[2] && ra[2] > rb[0] && ra[1] < rb[3] && ra[3] > rb[1]; };
    var hitSat = function (A, B) {
      var g = typeof pad === 'number' ? pad : 0, axes = [];
      [A, B].forEach(function (Q) { for (var i = 0; i < Q.length; i++) { var p0 = Q[i], p1 = Q[(i + 1) % Q.length], dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy); if (l > 1e-9) axes.push([-dy / l, dx / l]); } });
      if (!axes.length) axes.push([1, 0], [0, 1]);
      for (var k2 = 0; k2 < axes.length; k2++) {
        var ax = axes[k2], pr = function (Q) { var lo = Infinity, hi = -Infinity; Q.forEach(function (p) { var d = p[0] * ax[0] + p[1] * ax[1]; if (d < lo) lo = d; if (d > hi) hi = d; }); return [lo, hi]; };
        var u = pr(A), w = pr(B); if (u[1] < w[0] - g || w[1] < u[0] - g) return false;
      }
      return true;
    };
    var hit = a.shape === 'sat' ? hitSat : hitBox, per = {}, hitsF = [], nA = 0, by2 = a.phaseBy || 'phase';
    for (var f3 = f0; f3 < f1; f3 += step) {
      var T3 = TT(f3), Tp3 = f3 > 0 ? TT(f3 - 1) : T3 - 1 / fps, cache = {}, A3 = shapes(a.a, T3, Tp3, cache);
      if (!A3.list.length) continue;
      var B3 = shapes(a.b, T3, Tp3, cache), ph3 = a.perPhase && A3.meta ? get(A3.meta, by2) : null, key = ph3 != null ? String(ph3) : '*';
      nA++;
      var o3 = per[key] || (per[key] = { n: 0, hit: 0, t0: null, t1: null });
      o3.n++;
      if (A3.list.some(function (x) { return B3.list.some(function (y) { return hit(x, y); }); })) { o3.hit++; if (o3.t0 == null) o3.t0 = +T3.toFixed(3); o3.t1 = +T3.toFixed(3); if (hitsF.length < (a.keep || 200)) hitsF.push({ f: f3, T: +T3.toFixed(3), phase: ph3 }); }
    }
    return { N: N, frames: nA, perPhase: per, hits: hitsF, hitCount: Object.keys(per).reduce(function (s, k) { return s + per[k].hit; }, 0) };
  }
  return { error: 'bilinmeyen ölçüm: ' + a.kind };
}

// sayfada PAGE çağrısı (ortak alanlar eklenir)
export const measure = (api, args) => api.eval(PAGE, Object.assign({ W: WIDTH, H: HEIGHT, fps: api.fps, frames: api.frames }, args));

// ── framing ──────────────────────────────────────────────────────────────────
const KIND_DEFAULTS = { obj: { pad: 12 }, lyric: { pad: 50, minPx: 160 }, label: { pad: 50 }, text: { minPx: 22 }, cut: { allOrNothing: true }, out: { fullyOutside: true }, rr: { pad: 12, padLeft: 60 } };
async function framing(c, ctx, api) {
  const kinds = JSON.parse(JSON.stringify(KIND_DEFAULTS));
  for (const [k, v] of Object.entries(c.kinds || {})) kinds[k] = Object.assign(kinds[k] || {}, v);
  const desk = c.desk ? (typeof c.desk === 'number' ? { max: c.desk } : c.desk) : null;
  const o = await measure(api, { kind: 'framing', step: c.step || 1, from: c.range && c.range[0], to: c.range && c.range[1], kinds, desk, measure: c.measure, n: c.n });
  if (o.missing) return unmeasured(c, 'kanca yok (' + o.missing + ')');
  const viol = o.fails.map((x) => ({ f: x.f, T: x.T, bad: x.bad }));
  const metrics = { frames: o.frames, step: c.step || 1, N: o.N, badFrames: o.bad, rules: o.rules, deskMax: o.deskMax, deskAt: o.deskAt, minPx: o.minPx };
  if (o.measure && o.measure.length) metrics.measure = o.measure;
  const r = verdict(c, ctx, 'hata ' + o.bad + ' / ' + o.frames + ' kare' + (desk ? ' · masa en çok %' + r2(o.deskMax * 100) : ''), metrics, o.bad ? viol : []);
  r.violationCount = o.bad;
  return r;
}

// ── toolPath ─────────────────────────────────────────────────────────────────
async function toolPath(c, ctx, api) {
  const holds = c.holds ? hookName(c.holds) || '__holds' : null;
  const o = await measure(api, { kind: 'tools', only: c.only || c.tools && Array.isArray(c.tools) && c.tools || null, metric: c.metric || 'tip', resetHidden: c.resetHidden || false,
    visMargin: c.visMargin || 0, phaseBy: c.phaseBy, k8: !!c.k8, single: !!c.single, holds, step: c.step || 1, n: c.n,
    from: c.range && c.range[0], to: c.range && c.range[1] });
  if (o.missing) return unmeasured(c, 'kanca yok (' + o.missing + ')');
  // maxPx: sayı (her alet) | { default, <alet>, "<alet>/<evre>" } — evre sınırı yalnız açıkça verilirse uygulanır
  const mp = c.maxPx != null ? deref(c.maxPx, ctx) : ctx.W.motion.toolMaxPx;
  const lim = (k) => (typeof mp === 'number' ? (k.includes('/') ? null : mp)
    : mp && typeof mp === 'object' ? (mp[k] != null ? mp[k] : k.includes('/') ? null : mp.default != null ? mp.default : null) : null);
  const viol = o.viol.map((v) => Object.assign({}, v));
  for (const [k, p] of Object.entries(o.peaks)) {
    const L = lim(k); if (L == null) continue;
    const val = c.relative ? Math.max(p.abs, p.rel || 0) : p.abs;
    if (val > L) viol.push({ T: p.abs >= (p.rel || 0) ? p.absT : p.relT, rule: 'hız', tool: k, v: r2(val), max: L });
  }
  const tools = Object.keys(o.peaks).filter((k) => !k.includes('/'));
  const summ = tools.map((k) => k + ' ' + o.peaks[k].abs + (o.peaks[k].rel != null ? '/' + o.peaks[k].rel : '')).join(' · ');
  return verdict(c, ctx, (summ || 'alet yok') + ' px/kare' + (viol.length ? ' · ihlal ' + viol.length : ''),
    { frames: o.frames, N: o.N, peaks: o.peaks, firstVisible: o.first, lastVisible: o.last, holds: o.holds, maxPx: mp }, viol);
}

// ── overlap ──────────────────────────────────────────────────────────────────
async function overlap(c, ctx, api) {
  if (!c.a || !c.b) return unmeasured(c, 'a/b başvurusu yok');
  const o = await measure(api, { kind: 'overlap', a: c.a, b: c.b, pad: c.pad || 0, shape: c.shape || 'bbox', perPhase: !!c.perPhase, phaseBy: c.phaseBy, step: c.step || 1, n: c.n,
    from: c.range && c.range[0], to: c.range && c.range[1] });
  if (o.missing) return unmeasured(c, 'kanca yok (' + o.missing + ')');
  if (o.error) return unmeasured(c, o.error);
  const max = c.max != null ? c.max : 0, viol = o.hitCount > max ? o.hits.map((h) => Object.assign({ rule: 'örtme' }, h)) : [];
  const per = Object.entries(o.perPhase).map(([k, v]) => (k === '*' ? '' : k + ' ') + v.hit + '/' + v.n).join(' · ');
  const r = verdict(c, ctx, c.a + ' ∩ ' + c.b + ': ' + o.hitCount + ' kare (' + per + ')', { frames: o.frames, N: o.N, hitFrames: o.hitCount, perPhase: o.perPhase, max }, viol);
  return r;
}

// ── camera ───────────────────────────────────────────────────────────────────
export function cameraStats(v, { stepJump = 2.5, shots = [], k3v = [], fromJ = 2 } = {}) {
  let pk = 0, pkAt = 0; const steps = [];
  for (let j = fromJ; j < v.length; j++) { if (Math.abs(v[j] - v[j - 1]) > stepJump) steps.push(j); if (v[j] > pk) { pk = v[j]; pkAt = j; } }
  const srt = v.slice().sort((a, b) => a - b), p95 = srt[Math.floor(srt.length * 0.95)];
  const k3 = shots.map(([name, a, b]) => {
    const seg = v.slice(a, b + 1), o = { shot: name, frames: [a, b], n: seg.length, peak: r2(Math.max(0, ...seg)) };
    for (const t of k3v) o['≥' + t] = r3(seg.filter((x) => x >= t).length / Math.max(1, seg.length));
    return o;
  });
  return { peak: r2(pk), peakAt: pkAt, p95: r2(p95), steps, k3 };
}
async function camera(c, ctx, api) {
  const fn = hookName(c.speed) || '__camSpeed', fps = api.fps;
  const o = await measure(api, { kind: 'call', fn, args: [fps, c.n != null ? c.n : '$N'] });
  if (o.missing) return unmeasured(c, 'kanca yok (' + o.missing + ')');
  const v = (o.value || []).map(Number);
  let shots = c.shots || [];
  if (typeof shots === 'string') {
    const sh = await measure(api, { kind: 'call', fn: hookName(shots) || '__shots', args: [fps] });
    shots = sh.missing ? null : sh.value;
    if (!shots) return unmeasured(c, 'kanca yok (' + (hookName(c.shots) || '__shots') + ')');
  }
  const cam = ctx.W.camera, stepJump = c.stepJump != null ? c.stepJump : cam.stepJump, maxSteps = c.maxSteps != null ? c.maxSteps : cam.maxSteps;
  const k3 = Object.assign({}, cam.k3 || {}, c.k3 || {}), k3v = [].concat(k3.v != null ? k3.v : (WIDTH * 0.02) / fps).map(Number);
  const s = cameraStats(v, { stepJump, shots, k3v });
  const viol = [];
  if (maxSteps != null && s.steps.length > maxSteps) s.steps.forEach((j) => viol.push({ f: j, rule: 'basamak', dv: r2(v[j] - v[j - 1]), v: v[j] }));
  const maxPeak = c.maxPxPerFrame != null ? c.maxPxPerFrame : cam.maxPxPerFrame;
  if (maxPeak != null && s.peak > maxPeak) viol.push({ f: s.peakAt, rule: 'tepe', v: s.peak, max: maxPeak });
  // K3 payı kotadır (RULES §0.8 KO-1): tek başına kalırsa kontrol UYARI verir, kusur (basamak, tepe) varsa yine ihlaldir
  const quota = [];
  if (k3.minShare != null) s.k3.forEach((x) => { const sh = x['≥' + k3v[0]]; if (sh < k3.minShare) quota.push({ rule: 'K3', quota: true, shot: x.shot, share: sh, min: k3.minShare }); });
  const k3s = s.k3.map((x) => x.shot + ' ' + x['≥' + k3v[0]]).join(' / ');
  const head = 'tepe ' + s.peak + ' @' + s.peakAt + ' · p95 ' + s.p95 + ' · basamak ' + s.steps.length + (k3s ? ' · K3 ' + k3s : ''), metrics = { N: o.N, frames: v.length, stepJump, maxSteps, k3v, ...s, speed: c.keepSeries ? v : undefined };
  if (!viol.length && quota.length && c.k3Gate !== true) return result(c, 'warn', head + ' · K3 kota altı ' + quota.length + ' shot (UYARI, §0.8)', metrics, quota, { quota: quota.length });
  return verdict(c, ctx, head, metrics, viol.concat(quota));
}

export const TYPES = {
  framing: { layer: 'design', page: true, run: framing },
  toolPath: { layer: 'design', page: true, run: toolPath },
  overlap: { layer: 'design', page: true, run: overlap },
  camera: { layer: 'design', page: true, run: camera },
};
