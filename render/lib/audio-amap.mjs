// lib/audio-amap.mjs — ses zaman eşlemi çözücüsü (kaynak hattın amap + amap3 araçlarından; tablolar koddan çıkarıldı → amap.config.json).
// Model: t = x + Δ(x) (x: tasarım zamanı τ ya da önceki ses zamanı, t: sayfa sesi). Δ, 10 ms ızgarada en az eğrilikli yumuşatma spline'ı:
//   E = Σ (Δ'')² h + Σ wᵢ (Δ(xᵢ) − Δᵢ)²; |hata| > hedef (tol − 5 ms) olan çapanın ağırlığı ×4 (≤ 80 yineleme, hepsi koridora girene dek).
//   Sert koşullar (ağırlık 1e9): birebir önek (v1), sınır noktaları (kare ızgarası), keep aralıkları (önceki eşleme eşit, v2).
//   Doğrusal sistem bant genişliği 2 → bant LDLᵀ. Sonuç 0.1 s düğümlere örneklenir (değer + eğim), sayfa Hermite ile değerlendirir (C1);
//   ters yön (sayfa sesi t → x) ikiye bölmeyle (v1 ±5 s / 60 adım · v2 ±6 s / 64 adım).
// İki çözücü biçimi kaynakla birebir: v1 (amap: 0'dan başlayan tek eşlem, birebir önek, uç eğimleri 0) · v2 (amap3: x0 aralığı, keep, tek yönlü uç eğimi).
import fs from 'node:fs';
import { lcs, normWord, keyFirstLast } from './audio-core.mjs';

export const HG = 0.01, HARD = 1e9, KS = 10;

// Bant LDLᵀ (bant genişliği 2): (d0 köşegen, d1 üst 1, d2 üst 2) x = rhs
function ldl(d0, d1, d2, rhs, NG) {
  const dd = new Float64Array(NG), l1 = new Float64Array(NG), l2 = new Float64Array(NG);
  for (let i = 0; i < NG; i++) {
    l2[i] = i >= 2 ? d2[i - 2] / dd[i - 2] : 0;
    l1[i] = i >= 1 ? (d1[i - 1] - (i >= 2 ? l2[i] * l1[i - 1] * dd[i - 2] : 0)) / dd[i - 1] : 0;
    dd[i] = d0[i] - (i >= 1 ? l1[i] * l1[i] * dd[i - 1] : 0) - (i >= 2 ? l2[i] * l2[i] * dd[i - 2] : 0);
  }
  const z = new Float64Array(NG), x = new Float64Array(NG);
  for (let i = 0; i < NG; i++) z[i] = rhs[i] - (i >= 1 ? l1[i] * z[i - 1] : 0) - (i >= 2 ? l2[i] * z[i - 2] : 0);
  for (let i = NG - 1; i >= 0; i--) x[i] = z[i] / dd[i] - (i + 1 < NG ? l1[i + 1] * x[i + 1] : 0) - (i + 2 < NG ? l2[i + 2] * x[i + 2] : 0);
  return x;
}

// En az eğrilikli Δ. pins [{x, c, w}] (w yerinde ×4 güncellenir) · hardPts [{x, c}] · hardRanges [[a, b, f(x)]] · identUntil (v1: [0, id0] Δ ≡ 0)
export function solve({ solver = 'v2', x0 = 0, x1, pins, hardPts = [], hardRanges = [], identUntil = null, hedef, maxIter = 80 }) {
  const NG = Math.round((x1 - x0) / HG) + 1, s3 = 1 / (HG * HG * HG), ki = (x) => Math.round((x - x0) / HG);
  const kid = identUntil != null ? Math.round(identUntil / HG) : -1;
  const ranges = identUntil != null ? [[0, identUntil, null], ...hardRanges] : hardRanges;
  let X = null, it = 0;
  for (; it < maxIter; it++) {
    const d0 = new Float64Array(NG), d1 = new Float64Array(NG), d2 = new Float64Array(NG), rhs = new Float64Array(NG);
    for (let k = 1; k < NG - 1; k++) { const v = [1, -2, 1]; for (let a = 0; a < 3; a++) for (let b = a; b < 3; b++) { const i = k - 1 + a, j = k - 1 + b, q = v[a] * v[b] * s3; if (j === i) d0[i] += q; else if (j === i + 1) d1[i] += q; else d2[i] += q; } }
    ranges.forEach(([a, b, f]) => { for (let k = Math.max(0, ki(a)); k <= Math.min(NG - 1, ki(b)); k++) { d0[k] += HARD; if (f) rhs[k] += HARD * f(x0 + k * HG); } });
    hardPts.forEach((p) => { const k = ki(p.x); d0[k] += HARD; rhs[k] += HARD * p.c; });
    pins.forEach((p) => { const k = ki(p.x); d0[k] += p.w; rhs[k] += p.w * p.c; });
    X = ldl(d0, d1, d2, rhs, NG);
    for (let k = 0; k <= kid; k++) X[k] = 0;   // v1: birebir aralık tam sıfır
    let viol = 0; pins.forEach((p) => { if (Math.abs(X[ki(p.x)] - p.c) > hedef) { p.w *= 4; viol++; } }); if (!viol) break;
  }
  // 0.1 s Hermite düğümleri
  const NK = Math.floor((NG - 1) / KS) + 1, d = [], m = [], kt = [];
  for (let j = 0; j < NK; j++) {
    const k = j * KS;
    if (solver === 'v1') { kt.push(+(x0 + k * HG).toFixed(2)); const ident = k <= kid; d.push(ident ? 0 : X[k]); m.push(ident || k === 0 || k >= NG - 1 ? 0 : (X[k + 1] - X[k - 1]) / (2 * HG)); }
    else { d.push(X[k]); m.push(k === 0 || k >= NG - 1 ? (k === 0 ? (X[1] - X[0]) / HG : (X[k] - X[k - 1]) / HG) : (X[k + 1] - X[k - 1]) / (2 * HG)); }
  }
  let D, Dd = null;
  if (solver === 'v1') {   // kaynak amap değerlendiricisi (düğüm zamanları 0.01'e yuvarlı, h = fark)
    const N = NK, h = []; for (let i = 0; i < N - 1; i++) h[i] = kt[i + 1] - kt[i];
    const seg = (x) => { if (x <= kt[0]) return 0; if (x >= kt[N - 1]) return N - 2; return Math.min(N - 2, Math.floor(x / 0.1 + 1e-9)); };
    D = (x) => { if (x <= kt[0]) return d[0]; if (x >= kt[N - 1]) return d[N - 1]; const i = seg(x), u = (x - kt[i]) / h[i], u2 = u * u, u3 = u2 * u; return (2 * u3 - 3 * u2 + 1) * d[i] + (u3 - 2 * u2 + u) * h[i] * m[i] + (-2 * u3 + 3 * u2) * d[i + 1] + (u3 - u2) * h[i] * m[i + 1]; };
    Dd = (x) => { if (x <= kt[0] || x >= kt[N - 1]) return 0; const i = seg(x), u = (x - kt[i]) / h[i], u2 = u * u; return ((6 * u2 - 6 * u) * d[i]) / h[i] + (3 * u2 - 4 * u + 1) * m[i] + ((-6 * u2 + 6 * u) * d[i + 1]) / h[i] + (3 * u2 - 2 * u) * m[i + 1]; };
  } else {
    D = (x) => { const u0 = (x - x0) / 0.1; if (u0 <= 0) return d[0]; if (u0 >= NK - 1) return d[NK - 1]; const i = Math.min(NK - 2, Math.floor(u0 + 1e-9)), u = u0 - i, u2 = u * u, u3 = u2 * u; return (2 * u3 - 3 * u2 + 1) * d[i] + (u3 - 2 * u2 + u) * 0.1 * m[i] + (-2 * u3 + 3 * u2) * d[i + 1] + (u3 - u2) * 0.1 * m[i + 1]; };
  }
  let herm = 0; for (let k = solver === 'v1' ? Math.max(0, kid) : 0; k < NG; k += 3) herm = Math.max(herm, Math.abs(D(x0 + k * HG) - X[k]));
  return { x0, NG, X, d, m, D, Dd, it, herm, kid };
}

// Önceki sayfa eşlemini (script/<ad>-amap.js) Node'da çalıştır: window nesnesine fonksiyonları yazar
export function loadPageMap(file) { const w = {}; Function('window', fs.readFileSync(file, 'utf8'))(w); return w; }

// --- çapalar (config.anchors) -------------------------------------------------------------------------------------------------
// ctx: { A (from words), B (to words), BA (from beats), BB (to beats), pair (A.i → B kelimesi), man (scenes.json), lang, drift (json) }
export function buildAnchors(spec, ctx) {
  const anc = [], drop = [], norm = (w) => normWord(w, ctx.lang);
  const { A, B, pair } = ctx;
  if (spec.cuts) {   // kesme: cümle kesme TC'leri (ilk|son kelime anahtarı + |Δt0| < maxDt)
    const c = spec.cuts === true ? {} : spec.cuts, maxDt = c.maxDt != null ? c.maxDt : 3, sk = (s) => keyFirstLast(s, ctx.lang);
    const list = c.sentences ? ctx.BA.sentences.slice(c.sentences[0], c.sentences[1]) : ctx.BA.sentences;
    list.forEach((s) => { if (s.cut == null) return; const s2 = ctx.BB.sentences.find((x) => sk(x) === sk(s) && Math.abs(x.t0 - s.t0) < maxDt); if (s2 && s2.cut != null) anc.push({ kind: 'kesme', label: 'C' + s.n, x: s.cut, t: s2.cut }); });
  }
  if (spec.lyrics) {   // lyric kelime başları (manifest sahnesinin shots[].lyric[].words dizinleri, from kelimeleri)
    const L = spec.lyrics, sc = (ctx.man.scenes || []).find((s) => s.id === L.scene);
    if (!sc) throw new Error('lyrics: sahne yok ' + L.scene);
    const shots = (sc.shots || []).filter((s) => L.time == null || s.time === L.time), first = L.word === 'first';
    const lyr = [];
    shots.forEach((sh) => (sh.lyric || []).forEach((l) => {
      if (!l.words || !l.words.length) return;
      const wi = first ? l.words[0] : l.words.find((k) => pair.has(k)); if (wi == null || !pair.has(wi)) return;
      lyr.push({ kind: L.kind === 'raw' ? l.kind : (l.kind === 'lyric' ? 'lyric' : 'etiket'), label: sh.id + ' ' + l.text, wi });
    }));
    lyr.forEach((l) => anc.push({ kind: l.kind, label: l.label, x: A[l.wi].t0, t: pair.get(l.wi).t0 }));
  }
  (spec.words || []).forEach(([wi, w]) => { if (!pair.has(wi) || norm(A[wi].w) !== norm(w)) return; anc.push({ kind: 'vuruş', label: w, x: A[wi].t0, t: pair.get(wi).t0 }); });
  (spec.events || []).forEach((e) => {   // olay: tasarım anı (x) ↔ hedef seste eşleşen kelimenin başı (after'dan sonra)
    const re = new RegExp(e.match), after = e.after != null ? e.after : -Infinity;
    const w = B.find((x) => re.test(norm(x.w)) && x.t0 > after); if (w) anc.push({ kind: e.kind || 'olay', label: e.label, x: e.x, t: w.t0 });
  });
  if (spec.drift) {   // audio-diff kayma tablosu (drift.json rows[].an[]): ta → tb; zarf çelişkisi > dropFitMs atılır (sınırlar akustik, atılmaz)
    const D = spec.drift, rows = ctx.drift.rows || [], idx = (id) => +String(id).replace(/^\D+/, ''), R = D.rows || {};
    rows.filter((r) => (R.min == null || idx(r.id) >= R.min) && (R.max == null || idx(r.id) <= R.max) && !(R.exclude || []).includes(r.id)).forEach((r) => (r.an || []).forEach((a) => {
      const ta = a.ta != null ? a.ta : a.t2, tb = a.tb !== undefined ? a.tb : a.t3, fit = a.uyum !== undefined ? a.uyum : a.fit;
      if (tb == null) return;
      if (a.kind !== 'sınır' && fit != null && Math.abs(fit) > (D.dropFitMs != null ? D.dropFitMs : 50)) { drop.push(r.id + ' ' + a.label + ' (Δ ' + a.d + ' / zarf ' + a.env + ')'); return; }
      if (anc.some((b) => Math.abs(b.x - ta) < (D.dedupe != null ? D.dedupe : 0.02))) return;
      anc.push({ kind: a.kind, label: r.id + ' ' + a.label, x: ta, t: tb });
    }));
  }
  (spec.list || []).forEach((a) => anc.push({ kind: a.kind || 'çapa', label: a.label || '', x: a.x, t: a.t }));
  return { anc, drop };
}

// Sınırlar: v1 sayı (τ → en yakın kesme çapasının kare ızgarası) · {x|xf, t|f} · [x, t]
export function parseBounds(list, anc, fps, solver) {
  return (list || []).map((e) => {
    if (typeof e === 'number') {
      if (e === 0) return { tau: 0, t: 0, f: 0 };
      const c = anc.find((a) => a.kind === 'kesme' && Math.abs(a.x - e) < 0.02); if (!c) throw new Error('sınır kesmesi yok: ' + e);
      const f = Math.round(c.t * fps); return { tau: e, t: f / fps, f, cut2: c.t, label: c.label };
    }
    const x = Array.isArray(e) ? e[0] : e.x != null ? e.x : e.xf / fps, t = Array.isArray(e) ? e[1] : e.t != null ? e.t : e.f / fps;
    return solver === 'v1' ? { tau: x, t, f: Math.round(t * fps) } : { tau: x, t };
  });
}

// Sayfa JS'i. v1 tek eşlem → kaynak amap biçimi (birebir); diğerleri → genel biçim (keep devri, x0, ek API).
export function pageJs(name, maps, cfg) {
  const head = '// script/' + name + '-amap.js — motion-render amap build üretir, elle düzenlenmez. Ses zaman eşlemi: sayfa sesi t → tasarım zamanı.\n';
  if (maps.length === 1 && maps[0].solver === 'v1' && !maps[0].keep) {
    const M = maps[0], a = M.api;
    return head + '// t = τ + Δ(τ); Δ en az eğrilikli çözümün 0.1 s Hermite düğümleri (C1). ' + a.a2d + '(t) = τ (ikiye bölme), ' + a.d2a + '(τ) = t, ' + a.pageT + '(i, fps) = [τ, kare süresi (tasarım)].\n' +
      'window.' + a.map + ' = ' + JSON.stringify({ step: 0.1, ident: M.identUntil, d: M.dOut, m: M.mOut, bounds: M.bounds.map((b) => [b.tau, b.t]) }) + ';\n' +
      '(function () { var A = window.' + a.map + ', st = A.step, y = A.d, m = A.m, N = y.length;\n' +
      '  function D(v) { if (v <= 0) return y[0]; if (v >= (N - 1) * st) return y[N - 1]; var i = Math.min(N - 2, Math.floor(v / st + 1e-9)), u = (v - i * st) / st, u2 = u * u, u3 = u2 * u;\n' +
      '    return (2 * u3 - 3 * u2 + 1) * y[i] + (u3 - 2 * u2 + u) * st * m[i] + (-2 * u3 + 3 * u2) * y[i + 1] + (u3 - u2) * st * m[i + 1]; }\n' +
      '  window.' + a.d2a + ' = function (tau) { return tau + D(tau); };\n' +
      '  window.' + a.a2d + ' = function (t) { if (t <= A.ident) return t;   // birebir aralık: T aynı → kare aynı (yeniden render yok)\n' +
      '    for (var b = 0; b < A.bounds.length; b++) if (Math.abs(t - A.bounds[b][1]) < 1e-9) return A.bounds[b][0];   // perde sınırı tam\n' +
      '    var lo = t - 5, hi = t + 5; for (var k = 0; k < 60; k++) { var mid = (lo + hi) / 2; if (mid + D(mid) < t) lo = mid; else hi = mid; } return Math.round((lo + hi) / 2 * 1e9) / 1e9; };\n' +
      '  window.' + a.pageT + ' = function (i, fps) { var t0 = +window.' + a.t0 + ' || 0, T = window.' + a.a2d + '(t0 + i / fps); return [T, T - window.' + a.a2d + '(t0 + (i - 1) / fps)]; };\n' +
      '})();\n';
  }
  const L = [head + '// Eşlemler: ' + maps.map((M) => M.id + ' (' + M.api.d2a + ' / ' + M.api.a2d + (M.keep ? ', keep → ' + M.keep.tag : '') + ')').join(' · ') + '. Sayfa önceki eşlemden SONRA yükler (keep devri).\n'];
  for (const M of maps) if (M.keep) { const p = M.keep.prevApi, tg = M.keep.tag; L.push('window.' + p.map + '_' + tg.toUpperCase() + ' = window.' + p.map + '; window.' + p.d2a + '_' + tg + ' = window.' + p.d2a + '; window.' + p.a2d + '_' + tg + ' = window.' + p.a2d + ';\n'); }
  for (const M of maps) {
    const o = {}; if (cfg.audioLabel) o.audio = cfg.audioLabel; o.step = 0.1; o.x0 = M.x0; if (M.solver === 'v1') o.ident = M.identUntil; o.d = M.dOut; o.m = M.mOut;
    if (M.keep) { o.keepT = M.keepT; o.keepTau = M.keepTau; }
    o.bounds = M.bounds.map((b) => [b.tau, b.t]);
    L.push('window.' + M.api.map + ' = ' + JSON.stringify(o) + ';\n');
  }
  L.push('(function () {\n' +
    '  function herm(A, v) { var st = A.step, y = A.d, m = A.m, N = y.length, u0 = (v - A.x0) / st; if (u0 <= 0) return y[0]; if (u0 >= N - 1) return y[N - 1]; var i = Math.min(N - 2, Math.floor(u0 + 1e-9)), u = u0 - i, u2 = u * u, u3 = u2 * u;\n' +
    '    return (2 * u3 - 3 * u2 + 1) * y[i] + (u3 - 2 * u2 + u) * st * m[i] + (-2 * u3 + 3 * u2) * y[i + 1] + (u3 - u2) * st * m[i + 1]; }\n' +
    '  function bis(f, t, r, n) { var lo = t - r, hi = t + r; for (var k = 0; k < n; k++) { var mid = (lo + hi) / 2; if (f(mid) < t) lo = mid; else hi = mid; } return Math.round((lo + hi) / 2 * 1e9) / 1e9; }\n');
  for (const M of maps) {
    const s = M.id.replace(/[^A-Za-z0-9_]/g, '_'), a = M.api, R = M.solver === 'v1' ? '5, 60' : '6, 64';
    L.push('  var M_' + s + ' = window.' + a.map + ';\n');
    if (M.keep) {
      const p = M.keep.prevApi, tg = M.keep.tag;
      L.push('  var o_' + s + ' = window.' + p.d2a + '_' + tg + ', a_' + s + ' = window.' + p.a2d + '_' + tg + ';\n' +
        '  function keepT_' + s + '(t) { var K = M_' + s + '.keepT; for (var k = 0; k < K.length; k++) if (t >= K[k][0] - 1e-9 && t < K[k][1] - 1e-9) return true; return false; }\n' +
        '  function keepTau_' + s + '(v) { var K = M_' + s + '.keepTau; for (var k = 0; k < K.length; k++) if (v >= K[k][0] - 1e-9 && v < K[k][1] - 1e-9) return true; return false; }\n');
    }
    L.push('  function f_' + s + '(v) { return v + herm(M_' + s + ', v); }\n');
    L.push('  window.' + a.d2a + ' = ' + (M.keep ? 'function (tau) { return keepTau_' + s + '(tau) && o_' + s + ' ? o_' + s + '(tau) : f_' + s + '(tau); }' : 'f_' + s) + ';\n');
    L.push('  window.' + a.a2d + ' = function (t) { ' + (M.solver === 'v1' ? 'if (t <= M_' + s + '.ident) return t; ' : '') + (M.keep ? 'if (keepT_' + s + '(t) && a_' + s + ') return a_' + s + '(t);   // keep: önceki eşlem (bit-aynı kare)\n    ' : '') +
      'for (var b = 0; b < M_' + s + '.bounds.length; b++) if (Math.abs(t - M_' + s + '.bounds[b][1]) < 1e-9) return M_' + s + '.bounds[b][0];\n    return bis(f_' + s + ', t, ' + R + '); };\n');
    if (a.pageT) L.push('  window.' + a.pageT + ' = function (i, fps) { var t0 = +window.' + a.t0 + ' || 0, T = window.' + a.a2d + '(t0 + i / fps); return [T, T - window.' + a.a2d + '(t0 + (i - 1) / fps)]; };\n');
    if (a.t0fn) L.push('  window.' + a.t0fn + ' = function () { return window.' + a.a2d + '(+window.' + a.t0 + ' || 0); };\n');
    if (a.nfn) L.push('  window.' + a.nfn + ' = function (T0, T1, fps) { return Math.round(f_' + s + '(T1) * fps) - Math.round(f_' + s + '(T0) * fps); };   // tasarım aralığının sayfa kare sayısı\n');
  }
  L.push('})();\n');
  return L.join('');
}

// Bisection (Node tarafı, rapor)
export const invert = (f, t, r, n) => { let lo = t - r, hi = t + r; for (let k = 0; k < n; k++) { const mid = (lo + hi) / 2; if (f(mid) < t) lo = mid; else hi = mid; } return (lo + hi) / 2; };
export { lcs };
