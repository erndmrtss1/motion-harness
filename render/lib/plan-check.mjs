// lib/plan-check.mjs — olay planı denetimi (render yok, kare yok): sözlük/olay listesinden storyboard'dan ÖNCE sayım (PN-80, PN-81, PN-84).
// Kusur (error) ile kota (warn) ayrıdır (RULES §0.8): kapı yalnız kusurla kilitlenir.
//
// Girdi şeması (events.json):
//   { fps?, dur?, events: [ { id, t, a0?, word?, sentence?, shot?, dur?, kind?, class?, of?, pre?, exempt?, in?: {t?, dur}, out?: {t?, dur},
//       tool?: { name, class?, in: {t, dur, from?:[x,y], to?:[x,y]}, work?: {t, dur}, out: {t, dur, from?, to?} } } ],
//     sentences?: [{n, t0, t1}], shots?: [{id, t0, t1}],
//     camera?: { moves: [{ id, t0, dur, path? | from:[x,y], to:[x,y], class?, profile? }] } }   (moves üst düzeyde de olabilir)
// Ölçütler (rules ile değişir):
//   kusur  şema (id tekil, t sayı, alet evreleri sıralı) · senkron (a0'lı olay: 0 ≤ t − a0 ≤ syncFrames/fps; ÇEN-1) · tek alet (alet pencereleri
//          örtüşmez; ardışık iki alet arası ≥ toolGapS) · giriş/çıkış ≥ minEntryS (ZN-3) · alet ekran hızı ≤ toolMaxPx (from→to mesafesi / evre karesi)
//          · kanca kimlikleri (refs) olay listesinde var (PN-84)
//   kota   en uzun boş pencere ≤ maxGapS · olay yoğunluğu ≥ 1 / densityS · cümle kapsamı (her cümlede ≥ 1 olay) · sınır vuruşu (her shot sınırının
//          ± boundaryS içinde olay)
// 1.4 — isteğe bağlı kural blokları (world.json `plan` ‖ --rules; blok yoksa denetim ATLANIR, eski çıktı aynen):
//   entry  { <sınıf>: {in: s, out: s}, default? }   sınıf başına giriş/çıkış (PN-105). Alet: tool.class ‖ tool.name ‖ class ‖ kind; eşleşme yoksa minEntryS.
//          Aletsiz olay yalnız `in`/`out` evresi ve sınıf eşleşmesi (ya da default) varsa denetlenir.
//   beats  { maxConcurrent?: n, minGapMs?: ms, exempt?: [id…] }   vuruş aralığı (PN-127): vuruş başlangıcı = öncü olmayan (of/pre yok), muaf olmayan olay t'si;
//          aynı an (ızgarada aynı kare) ≤ maxConcurrent · ardışık başlangıçlar arası ≥ minGapMs. Öncü (of: <vuruş id>) ayrı vuruş değildir.
//   leads  { <sınıf>: [minMs, maxMs] }   öncülük bandı: t(vuruş) − t(öncü), öncü sınıfı class ‖ kind.
//   moves  { peak?: [min, max] px/kare, visibleS?: [min, max], maxJump?: 0,05, profile?: "cubic"|"quintic", classes?: { <sınıf>: {peak, visibleS, maxJump} } }
//          kural C fizibilitesi (PN-117): uçları tutuşlu tek hamle profili kare kare örneklenir → tepe, C1 = en büyük ardışık |Δv| / tepe, görünür süre
//          (yolun %10 → %90'ı); kübik Hermite'de C1 ≈ 4/N, beşinci derecede ≈ 3,08/N (N = hamle karesi). Aşma/settle hesaba girmez.
// Kare ızgarası (PN-135, opts.grid = {fps, round}): olay anı → ilk görünür kare (round: ceil (varsayılan) · round · floor); alt sınır eşiği yukarı
//   (ceil), üst sınır aşağı (floor) kareye çevrilir; senkron, giriş/çıkış, alet arası, vuruş aralığı, öncülük ve hamle karesi kare farkından ölçülür.
//   Kota (boş pencere, yoğunluk, kapsam, sınır) saniyede kalır. Çevrimler raporda (`grid.thresholds`).
export const DEFAULT_RULES = { syncFrames: 1, minEntryS: 0.4, toolGapS: 0, toolMaxPx: null, maxGapS: 3, densityS: 2.5, boundaryS: 0.5 };
const r3 = (x) => Math.round(x * 1000) / 1000;
const EPS = 1e-6;

export function toolWindow(tl) {
  const ph = ['in', 'work', 'out'].map((k) => tl[k]).filter(Boolean);
  return [Math.min(...ph.map((p) => +p.t)), Math.max(...ph.map((p) => +p.t + +(p.dur || 0)))];
}
export function eventWindow(e) { return e.tool ? toolWindow(e.tool) : [+e.t, +e.t + +(e.dur || 0)]; }

// kare ızgarası: null → saniye kipi (önceki davranış)
export function gridOf(g) {
  if (!g || !(+g.fps > 0)) return null;
  const fps = +g.fps, round = g.round || 'ceil';
  if (!['ceil', 'round', 'floor'].includes(round)) throw new Error('plan-check: round ceil|round|floor olmalı (' + round + ')');
  const fr = round === 'ceil' ? (t) => Math.ceil(t * fps - EPS) : round === 'floor' ? (t) => Math.floor(t * fps + EPS) : (t) => Math.round(t * fps);
  const thresholds = [], seen = new Set();
  const note = (name, s, frames, dir) => { const k = name + '|' + s; if (!seen.has(k)) { seen.add(k); thresholds.push({ name, s: r3(s), frames, dir }); } return frames; };
  return {
    fps, round, fr, thresholds,
    minF: (s, name) => note(name, s, Math.ceil(s * fps - EPS), 'alt sınır → yukarı'),
    maxF: (s, name) => note(name, s, Math.floor(s * fps + EPS), 'üst sınır → aşağı'),
  };
}

// hamle profili (uçlar tutuş, u ∈ [0, 1] → yol payı)
const PROFILES = {
  cubic: (u) => u * u * (3 - 2 * u),
  quintic: (u) => u * u * u * (10 + u * (-15 + 6 * u)),
};
// N kare hamlesi, L px yol: kare kare konum → hız; C1 = en büyük ardışık |Δv| (dinlenmeden kalkış ve varış dahil) / tepe; görünür süre %10 → %90 (kare, ara değerli)
export function moveProfile(L, N, profile = 'cubic') {
  const x = PROFILES[profile]; if (!x) throw new Error('plan-check: bilinmeyen hamle profili ' + profile);
  N = Math.max(1, Math.round(N));
  const p = []; for (let i = 0; i <= N; i++) p.push(L * x(i / N));
  const v = [0]; for (let i = 1; i <= N; i++) v.push(p[i] - p[i - 1]); v.push(0);
  let peak = 0, dv = 0; for (let i = 1; i < v.length; i++) { if (v[i] > peak) peak = v[i]; dv = Math.max(dv, Math.abs(v[i] - v[i - 1])); }
  const at = (q) => { for (let i = 1; i <= N; i++) if (p[i] >= q * L - EPS) return i - 1 + (q * L - p[i - 1]) / Math.max(EPS, p[i] - p[i - 1]); return N; };
  return { N, peak, c1: peak > 0 ? dv / peak : 0, visibleFrames: at(0.9) - at(0.1) };
}

export function planCheck(plan, rulesIn = {}, { refs = [], grid = null } = {}) {
  const R = Object.assign({}, DEFAULT_RULES, rulesIn), fps = +plan.fps || 60, E = plan.events || [], err = [], warn = [], G = gridOf(grid);
  const dur = plan.dur != null ? +plan.dur : Math.max(0, ...E.map((e) => eventWindow(e)[1]));
  const span = (t0, d) => (G ? G.fr(+t0 + +d) - G.fr(+t0) : null);   // evre karesi (ızgara kipinde)
  // şema
  const seen = new Set(), byId = new Map();
  for (const e of E) {
    if (e.id == null) err.push({ rule: 'şema', msg: 'id yok', t: e.t }); else if (seen.has(e.id)) err.push({ rule: 'şema', id: e.id, msg: 'id tekil değil' }); else { seen.add(e.id); byId.set(e.id, e); }
    if (!Number.isFinite(+e.t)) err.push({ rule: 'şema', id: e.id, msg: 't sayı değil' });
    if (e.tool) {
      const { in: a, work: w, out: o } = e.tool;
      if (!a || !o) err.push({ rule: 'şema', id: e.id, msg: 'alet in/out evresi yok' });
      else {
        const seq = [a, w, o].filter(Boolean);
        for (let i = 1; i < seq.length; i++) if (+seq[i].t + 1e-9 < +seq[i - 1].t + +(seq[i - 1].dur || 0)) err.push({ rule: 'şema', id: e.id, msg: 'alet evreleri sıralı değil' });
      }
    }
  }
  // senkron (ÇEN-1): plan zamanı kelime çapasından sonra ve ≤ syncFrames kare içinde (ızgarada: ilk görünür kare farkı)
  for (const e of E) if (e.a0 != null && Number.isFinite(+e.t)) {
    if (G) {
      const d = G.fr(+e.t) - G.fr(+e.a0);
      if (d < 0 || d > R.syncFrames) err.push({ rule: 'senkron', id: e.id, word: e.word, dFrames: d, tol: [0, R.syncFrames], grid: G.fps });
      continue;
    }
    const d = (+e.t - +e.a0) * fps;
    if (d < -1e-6 || d > R.syncFrames + 1e-6) err.push({ rule: 'senkron', id: e.id, word: e.word, dFrames: r3(d), tol: [0, R.syncFrames] });
  }
  // giriş/çıkış eşiği: sınıf haritası (entry) → alet/olay sınıfı; yoksa minEntryS
  const entryFor = (keys, k) => {
    const M = R.entry; if (!M) return null;
    for (const c of keys) if (c != null && M[c] && M[c][k] != null) return { s: +M[c][k], cls: String(c) };
    return M.default && M.default[k] != null ? { s: +M.default[k], cls: 'default' } : null;
  };
  const entryCheck = (e, p, lab, k, keys, extra) => {
    const m = entryFor(keys, k), min = m ? m.s : extra.fallback;
    if (min == null) return;
    const base = Object.assign({ rule: lab, id: e.id }, extra.tool ? { tool: extra.tool } : {}, m ? { cls: m.cls } : {});
    if (G) { const f = span(p.t != null ? p.t : e.t, p.dur), need = G.minF(min, lab + (m ? ' ' + m.cls : '')); if (f < need) err.push(Object.assign(base, { frames: f, minFrames: need, sec: r3(+p.dur), min })); }
    else if (+p.dur + 1e-9 < min) err.push(Object.assign(base, { sec: r3(+p.dur), min }));
  };
  // aletler: giriş/çıkış süresi, ekran hızı, tek alet, ardışık boşluk
  const tools = E.filter((e) => e.tool && e.tool.in && e.tool.out).map((e) => ({ e, w: toolWindow(e.tool) })).sort((a, b) => a.w[0] - b.w[0]);
  for (const { e } of tools) {
    for (const [k, lab] of [['in', 'giriş'], ['out', 'çıkış']]) {
      const p = e.tool[k];
      entryCheck(e, p, lab, k, [e.tool.class, e.tool.name, e.class, e.kind], { tool: e.tool.name, fallback: R.minEntryS });
      if (R.toolMaxPx != null && p.from && p.to && +p.dur > 0) {
        const v = Math.hypot(p.to[0] - p.from[0], p.to[1] - p.from[1]) / (+p.dur * fps);
        if (v > R.toolMaxPx + 1e-9) err.push({ rule: 'alet hızı', id: e.id, tool: e.tool.name, phase: lab, pxPerFrame: r3(v), max: R.toolMaxPx, needS: r3(Math.hypot(p.to[0] - p.from[0], p.to[1] - p.from[1]) / (R.toolMaxPx * fps)) });
      }
    }
  }
  // aletsiz olayın giriş/çıkış evresi (yalnız entry bloğu ve sınıf eşleşmesi varsa)
  if (R.entry) for (const e of E) if (!e.tool) for (const [k, lab] of [['in', 'giriş'], ['out', 'çıkış']]) if (e[k] && e[k].dur != null) entryCheck(e, e[k], lab, k, [e.class, e.kind], { fallback: null });
  for (let i = 1; i < tools.length; i++) {
    const a = tools[i - 1], b = tools[i], gap = b.w[0] - a.w[1];
    if (G) {
      const g = G.fr(b.w[0]) - G.fr(a.w[1]), need = R.toolGapS > 0 ? G.minF(R.toolGapS, 'alet arası') : 0;
      if (g < need) err.push({ rule: g < 0 ? 'tek alet' : 'alet arası', ids: [a.e.id, b.e.id], gapFrames: g, minFrames: need, overlapS: r3(-gap), minGapS: R.toolGapS });
      continue;
    }
    if (gap < R.toolGapS - 1e-9) err.push({ rule: gap < 0 ? 'tek alet' : 'alet arası', ids: [a.e.id, b.e.id], overlapS: r3(-gap), minGapS: R.toolGapS });
  }
  // kanca kimlikleri
  for (const id of refs) if (!seen.has(id)) err.push({ rule: 'kanca', id, msg: 'kanca/sahne kimliği olay listesinde yok' });
  // vuruş aralığı (beats) + öncülük (leads)
  const isPre = (e) => e.of != null || e.pre === true;
  let beatInfo = null;
  if (R.beats) {
    const B = R.beats, ex = new Set(B.exempt || []), starts = E.filter((e) => Number.isFinite(+e.t) && !isPre(e) && !e.exempt && !ex.has(e.id)).map((e) => ({ id: e.id, t: +e.t, f: G ? G.fr(+e.t) : null })).sort((a, b) => a.t - b.t);
    const key = (s) => (G ? s.f : Math.round(s.t / EPS)), groups = [];
    for (const s of starts) { const l = groups[groups.length - 1]; if (l && key(l[0]) === key(s)) l.push(s); else groups.push([s]); }
    if (B.maxConcurrent != null) for (const g of groups) if (g.length > B.maxConcurrent) err.push(Object.assign({ rule: 'eşzamanlı vuruş', ids: g.map((s) => s.id), n: g.length, max: B.maxConcurrent }, G ? { f: g[0].f } : { t: r3(g[0].t) }));
    let minSeen = null;
    if (B.minGapMs != null) {
      const need = G ? G.minF(B.minGapMs / 1000, 'vuruş aralığı') : null;
      for (let i = 1; i < groups.length; i++) {
        const a = groups[i - 1][0], b = groups[i][0], d = G ? b.f - a.f : (b.t - a.t) * 1000;
        if (minSeen == null || d < minSeen) minSeen = d;
        if (G ? d < need : d < B.minGapMs - 1e-6) err.push(Object.assign({ rule: 'vuruş aralığı', ids: [a.id, b.id] }, G ? { frames: d, minFrames: need, minMs: B.minGapMs } : { ms: r3(d), minMs: B.minGapMs }));
      }
    }
    beatInfo = { starts: starts.length, exempt: E.filter((e) => e.exempt || ex.has(e.id)).map((e) => e.id), pre: E.filter(isPre).length, minGap: minSeen != null ? (G ? minSeen + ' kare' : r3(minSeen) + ' ms') : null };
  }
  if (R.leads) {
    const emptyBand = new Set();
    for (const p of E.filter((e) => e.of != null)) {
      const cls = p.class != null ? p.class : p.kind, band = cls != null ? R.leads[cls] : null; if (!band) continue;
      const b = byId.get(p.of);
      if (!b) { err.push({ rule: 'öncü', id: p.id, of: p.of, msg: 'öncülük edilen vuruş olay listesinde yok' }); continue; }
      const [lo, hi] = band;
      if (G) {
        const d = G.fr(+b.t) - G.fr(+p.t), fLo = lo != null ? G.minF(lo / 1000, 'öncülük ' + cls) : -Infinity, fHi = hi != null ? G.maxF(hi / 1000, 'öncülük ' + cls) : Infinity;
        if (fLo > fHi) { if (!emptyBand.has(cls)) { emptyBand.add(cls); err.push({ rule: 'öncülük bandı', cls, band, msg: 'bant kare ızgarasında boş', frames: [fLo, fHi], grid: G.fps }); } continue; }
        if (d < fLo || d > fHi) err.push({ rule: 'öncülük', id: p.id, of: p.of, cls, frames: d, band: [fLo, fHi], bandMs: band });
      } else {
        const d = (+b.t - +p.t) * 1000;
        if ((lo != null && d < lo - 1e-6) || (hi != null && d > hi + 1e-6)) err.push({ rule: 'öncülük', id: p.id, of: p.of, cls, ms: r3(d), bandMs: band });
      }
    }
  }
  // kural C fizibilitesi (moves)
  let moveRows = null;
  if (R.moves) {
    const M = R.moves, list = (plan.camera && plan.camera.moves) || plan.moves || [], mfps = G ? G.fps : fps;
    moveRows = [];
    for (const m of list) {
      const C = Object.assign({ maxJump: 0.05, profile: 'cubic' }, M, (M.classes && m.class != null && M.classes[m.class]) || {});
      const L = m.path != null ? +m.path : m.from && m.to ? Math.hypot(m.to[0] - m.from[0], m.to[1] - m.from[1]) : null, prof = m.profile || C.profile;
      if (!(L > 0) || !(+m.dur > 0)) { err.push({ rule: 'şema', id: m.id, msg: 'hamle: path (ya da from/to) ve dur gerekli' }); continue; }
      const N = G ? span(m.t0 != null ? m.t0 : m.t || 0, m.dur) : Math.round(+m.dur * mfps), P = moveProfile(L, N, prof), vis = P.visibleFrames / mfps;
      const row = { id: m.id, class: m.class, profile: prof, pathPx: r3(L), frames: P.N, peak: r3(P.peak), c1: r3(P.c1), visibleS: r3(vis), ok: true };
      const fail = (rule, o) => { row.ok = false; err.push(Object.assign({ rule, id: m.id }, m.class != null ? { cls: m.class } : {}, o)); };
      const pk = C.peak || [], vs = C.visibleS || [];
      if (pk[0] != null && P.peak < pk[0] - 1e-9) fail('kural C tepe', { peak: row.peak, band: pk });
      if (pk[1] != null && P.peak > pk[1] + 1e-9) fail('kural C tepe', { peak: row.peak, band: pk });
      if (vs[0] != null && vis < vs[0] - 1e-9) fail('kural C görünür süre', { visibleS: row.visibleS, band: vs });
      if (vs[1] != null && vis > vs[1] + 1e-9) fail('kural C görünür süre', { visibleS: row.visibleS, band: vs });
      if (C.maxJump != null && P.c1 > C.maxJump + 1e-9) fail('kural C C1', { c1: row.c1, max: C.maxJump });
      if (!row.ok) {   // en kısa uygun hamle: C1 ve görünür süre alt sınırı → N; tepe alt sınırı → yol
        let n = P.N; for (; n < 6000; n++) { const q = moveProfile(L, n, prof); if ((C.maxJump == null || q.c1 <= C.maxJump + 1e-9) && (vs[0] == null || q.visibleFrames / mfps >= vs[0] - 1e-9)) break; }
        const q = moveProfile(1, n, prof);
        row.need = { frames: n, s: r3(n / mfps), pathPx: pk[0] != null ? r3(pk[0] / q.peak) : null };
      }
      moveRows.push(row);
    }
  }
  // kota (UYARI)
  const ts = E.filter((e) => Number.isFinite(+e.t)).map((e) => +e.t).sort((a, b) => a - b), cov = [0, ...ts, dur];
  let gapMax = 0, gapAt = null; for (let i = 1; i < cov.length; i++) if (cov[i] - cov[i - 1] > gapMax) { gapMax = cov[i] - cov[i - 1]; gapAt = r3(cov[i - 1]); }
  if (gapMax > R.maxGapS + 1e-9) warn.push({ rule: 'boş pencere', at: gapAt, sec: r3(gapMax), max: R.maxGapS });
  const density = dur > 0 ? ts.length / (dur / R.densityS) : null;
  if (density != null && density < 1) warn.push({ rule: 'olay yoğunluğu', perWindow: r3(density), windowS: R.densityS });
  for (const s of plan.sentences || []) if (!E.some((e) => { const [a, b] = eventWindow(e); return a <= +s.t1 && b >= +s.t0; })) warn.push({ rule: 'cümle kapsamı', sentence: s.n, window: [s.t0, s.t1] });
  const shots = (plan.shots || []).slice().sort((a, b) => a.t0 - b.t0);
  for (let i = 1; i < shots.length; i++) { const b = +shots[i].t0; if (!ts.some((t) => Math.abs(t - b) <= R.boundaryS)) warn.push({ rule: 'sınır vuruşu', boundary: shots[i - 1].id + '|' + shots[i].id, t: b, tolS: R.boundaryS }); }
  const out = { rules: R, fps, dur: r3(dur), events: E.length, tools: tools.length, errors: err, warnings: warn,
    quota: { gapMaxS: r3(gapMax), densityPerWindow: density != null ? r3(density) : null, sentences: (plan.sentences || []).length, boundaries: Math.max(0, shots.length - 1) } };
  if (G) out.grid = { fps: G.fps, round: G.round, thresholds: G.thresholds };
  if (beatInfo) out.beats = beatInfo;
  if (moveRows) out.moves = moveRows;
  return out;
}

export function planMarkdown(r, title = 'plan-check') {
  const L = [`# ${title}`, '', `olay ${r.events} · alet ${r.tools} · süre ${r.dur} s @${r.fps} · **kusur ${r.errors.length}** · kota (UYARI) ${r.warnings.length}`, ''];
  if (r.grid) L.push('kare ızgarası: @' + r.grid.fps + ' · olay anı ' + r.grid.round + ' (ilk görünür kare) · eşikler: ' + (r.grid.thresholds.map((x) => x.name + ' ' + x.s + ' s → ' + x.frames + ' kare (' + x.dir + ')').join(' · ') || '—'), '');
  if (r.errors.length) { L.push('## Kusur (kapı)', '', '| kural | ayrıntı |', '|---|---|'); for (const x of r.errors) L.push('| ' + x.rule + ' | ' + JSON.stringify(Object.fromEntries(Object.entries(x).filter(([k]) => k !== 'rule'))) + ' |'); L.push(''); }
  if (r.warnings.length) { L.push('## Kota (UYARI, RULES §0.8)', '', '| kural | ayrıntı |', '|---|---|'); for (const x of r.warnings) L.push('| ' + x.rule + ' | ' + JSON.stringify(Object.fromEntries(Object.entries(x).filter(([k]) => k !== 'rule'))) + ' |'); L.push(''); }
  if (r.moves && r.moves.length) {
    L.push('## Hamleler (kural C fizibilitesi)', '', '| hamle | sınıf | profil | yol px | kare | tepe px/kare | C1 | görünür s | durum |', '|---|---|---|---:|---:|---:|---:|---:|---|');
    for (const m of r.moves) L.push('| ' + [m.id, m.class || '—', m.profile, m.pathPx, m.frames, m.peak, m.c1, m.visibleS, m.ok ? '✓' : '✗' + (m.need ? ' (gerek: ≥ ' + m.need.frames + ' kare' + (m.need.pathPx != null ? ', yol ≥ ' + m.need.pathPx + ' px' : '') + ')' : '')].join(' | ') + ' |');
    L.push('');
  }
  if (r.beats) L.push('vuruş: başlangıç ' + r.beats.starts + ' · öncü ' + r.beats.pre + ' · muaf ' + (r.beats.exempt.length ? r.beats.exempt.join(', ') : 'yok') + ' · en kısa aralık ' + (r.beats.minGap || '—'), '');
  L.push('kota (bilgi): boş pencere en uzun ' + r.quota.gapMaxS + ' s · olay/' + r.rules.densityS + ' s ' + r.quota.densityPerWindow + ' · cümle ' + r.quota.sentences + ' · sınır ' + r.quota.boundaries);
  return L.join('\n') + '\n';
}
