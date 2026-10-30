// lib/plan-check.mjs — olay planı denetimi (render yok, kare yok): sözlük/olay listesinden storyboard'dan ÖNCE sayım (PN-80, PN-81, PN-84).
// Kusur (error) ile kota (warn) ayrıdır (RULES §0.8): kapı yalnız kusurla kilitlenir.
//
// Girdi şeması (events.json):
//   { fps?, dur?, events: [ { id, t, a0?, word?, sentence?, shot?, dur?, kind?,
//       tool?: { name, in: {t, dur, from?:[x,y], to?:[x,y]}, work?: {t, dur}, out: {t, dur, from?, to?} } } ],
//     sentences?: [{n, t0, t1}], shots?: [{id, t0, t1}] }
// Ölçütler (rules ile değişir):
//   kusur  şema (id tekil, t sayı, alet evreleri sıralı) · senkron (a0'lı olay: 0 ≤ t − a0 ≤ syncFrames/fps; ÇEN-1) · tek alet (alet pencereleri
//          örtüşmez; ardışık iki alet arası ≥ toolGapS) · giriş/çıkış ≥ minEntryS (ZN-3) · alet ekran hızı ≤ toolMaxPx (from→to mesafesi / evre karesi)
//          · kanca kimlikleri (refs) olay listesinde var (PN-84)
//   kota   en uzun boş pencere ≤ maxGapS · olay yoğunluğu ≥ 1 / densityS · cümle kapsamı (her cümlede ≥ 1 olay) · sınır vuruşu (her shot sınırının
//          ± boundaryS içinde olay)
export const DEFAULT_RULES = { syncFrames: 1, minEntryS: 0.4, toolGapS: 0, toolMaxPx: null, maxGapS: 3, densityS: 2.5, boundaryS: 0.5 };
const r3 = (x) => Math.round(x * 1000) / 1000;

export function toolWindow(tl) {
  const ph = ['in', 'work', 'out'].map((k) => tl[k]).filter(Boolean);
  return [Math.min(...ph.map((p) => +p.t)), Math.max(...ph.map((p) => +p.t + +(p.dur || 0)))];
}
export function eventWindow(e) { return e.tool ? toolWindow(e.tool) : [+e.t, +e.t + +(e.dur || 0)]; }

export function planCheck(plan, rulesIn = {}, { refs = [] } = {}) {
  const R = Object.assign({}, DEFAULT_RULES, rulesIn), fps = +plan.fps || 60, E = plan.events || [], err = [], warn = [];
  const dur = plan.dur != null ? +plan.dur : Math.max(0, ...E.map((e) => eventWindow(e)[1]));
  // şema
  const seen = new Set();
  for (const e of E) {
    if (e.id == null) err.push({ rule: 'şema', msg: 'id yok', t: e.t }); else if (seen.has(e.id)) err.push({ rule: 'şema', id: e.id, msg: 'id tekil değil' }); else seen.add(e.id);
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
  // senkron (ÇEN-1): plan zamanı kelime çapasından sonra ve ≤ syncFrames kare içinde
  for (const e of E) if (e.a0 != null && Number.isFinite(+e.t)) {
    const d = (+e.t - +e.a0) * fps;
    if (d < -1e-6 || d > R.syncFrames + 1e-6) err.push({ rule: 'senkron', id: e.id, word: e.word, dFrames: r3(d), tol: [0, R.syncFrames] });
  }
  // aletler: giriş/çıkış süresi, ekran hızı, tek alet, ardışık boşluk
  const tools = E.filter((e) => e.tool && e.tool.in && e.tool.out).map((e) => ({ e, w: toolWindow(e.tool) })).sort((a, b) => a.w[0] - b.w[0]);
  for (const { e } of tools) {
    for (const [k, lab] of [['in', 'giriş'], ['out', 'çıkış']]) {
      const p = e.tool[k];
      if (+p.dur + 1e-9 < R.minEntryS) err.push({ rule: lab, id: e.id, tool: e.tool.name, sec: r3(+p.dur), min: R.minEntryS });
      if (R.toolMaxPx != null && p.from && p.to && +p.dur > 0) {
        const v = Math.hypot(p.to[0] - p.from[0], p.to[1] - p.from[1]) / (+p.dur * fps);
        if (v > R.toolMaxPx + 1e-9) err.push({ rule: 'alet hızı', id: e.id, tool: e.tool.name, phase: lab, pxPerFrame: r3(v), max: R.toolMaxPx, needS: r3(Math.hypot(p.to[0] - p.from[0], p.to[1] - p.from[1]) / (R.toolMaxPx * fps)) });
      }
    }
  }
  for (let i = 1; i < tools.length; i++) {
    const a = tools[i - 1], b = tools[i], gap = b.w[0] - a.w[1];
    if (gap < R.toolGapS - 1e-9) err.push({ rule: gap < 0 ? 'tek alet' : 'alet arası', ids: [a.e.id, b.e.id], overlapS: r3(-gap), minGapS: R.toolGapS });
  }
  // kanca kimlikleri
  for (const id of refs) if (!seen.has(id)) err.push({ rule: 'kanca', id, msg: 'kanca/sahne kimliği olay listesinde yok' });
  // kota (UYARI)
  const ts = E.filter((e) => Number.isFinite(+e.t)).map((e) => +e.t).sort((a, b) => a - b), cov = [0, ...ts, dur];
  let gapMax = 0, gapAt = null; for (let i = 1; i < cov.length; i++) if (cov[i] - cov[i - 1] > gapMax) { gapMax = cov[i] - cov[i - 1]; gapAt = r3(cov[i - 1]); }
  if (gapMax > R.maxGapS + 1e-9) warn.push({ rule: 'boş pencere', at: gapAt, sec: r3(gapMax), max: R.maxGapS });
  const density = dur > 0 ? ts.length / (dur / R.densityS) : null;
  if (density != null && density < 1) warn.push({ rule: 'olay yoğunluğu', perWindow: r3(density), windowS: R.densityS });
  for (const s of plan.sentences || []) if (!E.some((e) => { const [a, b] = eventWindow(e); return a <= +s.t1 && b >= +s.t0; })) warn.push({ rule: 'cümle kapsamı', sentence: s.n, window: [s.t0, s.t1] });
  const shots = (plan.shots || []).slice().sort((a, b) => a.t0 - b.t0);
  for (let i = 1; i < shots.length; i++) { const b = +shots[i].t0; if (!ts.some((t) => Math.abs(t - b) <= R.boundaryS)) warn.push({ rule: 'sınır vuruşu', boundary: shots[i - 1].id + '|' + shots[i].id, t: b, tolS: R.boundaryS }); }
  return { rules: R, fps, dur: r3(dur), events: E.length, tools: tools.length, errors: err, warnings: warn,
    quota: { gapMaxS: r3(gapMax), densityPerWindow: density != null ? r3(density) : null, sentences: (plan.sentences || []).length, boundaries: Math.max(0, shots.length - 1) } };
}

export function planMarkdown(r, title = 'plan-check') {
  const L = [`# ${title}`, '', `olay ${r.events} · alet ${r.tools} · süre ${r.dur} s @${r.fps} · **kusur ${r.errors.length}** · kota (UYARI) ${r.warnings.length}`, ''];
  if (r.errors.length) { L.push('## Kusur (kapı)', '', '| kural | ayrıntı |', '|---|---|'); for (const x of r.errors) L.push('| ' + x.rule + ' | ' + JSON.stringify(Object.fromEntries(Object.entries(x).filter(([k]) => k !== 'rule'))) + ' |'); L.push(''); }
  if (r.warnings.length) { L.push('## Kota (UYARI, RULES §0.8)', '', '| kural | ayrıntı |', '|---|---|'); for (const x of r.warnings) L.push('| ' + x.rule + ' | ' + JSON.stringify(Object.fromEntries(Object.entries(x).filter(([k]) => k !== 'rule'))) + ' |'); L.push(''); }
  L.push('kota (bilgi): boş pencere en uzun ' + r.quota.gapMaxS + ' s · olay/' + r.rules.densityS + ' s ' + r.quota.densityPerWindow + ' · cümle ' + r.quota.sentences + ' · sınır ' + r.quota.boundaries);
  return L.join('\n') + '\n';
}
