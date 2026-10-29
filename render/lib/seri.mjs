// lib/seri.mjs — pivot kilitli süreklilik serisi (OHLC benzeri zincir): o_i = c_(i−1) (boşluk 0), kilitli pivotlar (indeks → uç değeri,
// yerel uç), kısıtlı rastgele yürüyüş (mulberry32, tohumlu), ileri bakış ve üretimden ÖNCE çözülebilirlik denetimi (PN-69).
// Projeye özgü geometri (çizgi teması, kırılım …) `validate(series)` geri çağrısıyla eklenir; çekirdek yalnız zincir ve pivot kısıtını bilir.
//
// spec: { n, start (ilk açılış), pivots: [{i, uc: 'h'|'l', v}], body: [min, max] (gövde / mum aralığı oranı), minBody, minWick, margin (pivot komşusu
//         içeride en az), step (ardışık kapanış farkı üst sınırı), bounds: [lo, hi], targets?: [{i, c}] (kapanış hedefi ± noise) }
export function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const r4 = (x) => Math.round(x * 1e4) / 1e4;

// çözülebilirlik: ardışık iki pivot arasında yeterli adım var mı (kapanış adımı ≤ step) ve zıt uçlu bitişik pivotlarda arada ≥ minBetween mum
export function feasibility(spec) {
  const P = (spec.pivots || []).slice().sort((a, b) => a.i - b.i), issues = [], step = spec.step != null ? spec.step : Infinity, minBetween = spec.minBetween != null ? spec.minBetween : 2;
  for (const p of P) if (p.i < 0 || p.i >= spec.n) issues.push({ rule: 'pivot dışarıda', i: p.i });
  for (let k = 1; k < P.length; k++) {
    const a = P[k - 1], b = P[k], gapN = b.i - a.i;
    if (gapN <= 0) { issues.push({ rule: 'pivot sırası', i: [a.i, b.i] }); continue; }
    if (Math.abs(b.v - a.v) > step * gapN + 1e-9) issues.push({ rule: 'adım bütçesi', i: [a.i, b.i], need: r4(Math.abs(b.v - a.v) / gapN), step });
    // boşluk 0 + gövde kesişimi 0: zıt uçlu iki pivot (h → l ya da l → h) arasında tek mum varsa ara gövde iki kısıtı birlikte sağlayamaz
    if (a.uc !== b.uc && gapN - 1 < minBetween && gapN > 1) issues.push({ rule: 'pivotlar arası mum', i: [a.i, b.i], between: gapN - 1, min: minBetween });
  }
  return { ok: !issues.length, issues };
}

// tek aday üret: kapanış yürüyüşü pivotlara ileri bakışla çekilir; gövde/fitil oranları rastgele; pivot uçları kilitli
export function candidate(spec, rnd) {
  const n = spec.n, P = new Map((spec.pivots || []).map((p) => [p.i, p])), body = spec.body || [0.35, 0.75], minBody = spec.minBody || 0, minWick = spec.minWick || 0;
  const step = spec.step != null ? spec.step : Infinity, [lo, hi] = spec.bounds || [-Infinity, Infinity], noise = spec.noise != null ? spec.noise : 0.05;
  const T = new Map((spec.targets || []).map((t) => [t.i, t.c])), sorted = (spec.pivots || []).slice().sort((a, b) => a.i - b.i), out = [];
  let o = spec.start;
  for (let i = 0; i < n; i++) {
    const next = sorted.find((p) => p.i > i), piv = P.get(i);
    // kapanış hedefi: kilitli pivotsa uca yakın iç değer, değilse sonraki pivota doğru doğrusal ilerleme + gürültü (ileri bakış: kalan adımla ulaşılabilir kal)
    let c;
    if (T.has(i)) c = T.get(i) + (rnd() - 0.5) * 2 * noise;
    else if (next) { const k = next.i - i; c = o + (next.v - o) / (k + 1) + (rnd() - 0.5) * 2 * Math.min(step, Math.abs(next.v - o) / (k + 1) + noise); }
    else c = o + (rnd() - 0.5) * 2 * Math.min(step, noise * 4);
    if (piv) c = piv.uc === 'h' ? Math.min(c, piv.v - minWick) : Math.max(c, piv.v + minWick);
    if (next) { const k = next.i - i, reach = step * k; c = Math.max(next.v - reach, Math.min(next.v + reach, c)); }
    c = Math.max(lo, Math.min(hi, c));
    if (Math.abs(c - o) < minBody) c = o + (c >= o ? minBody : -minBody);
    const b0 = Math.min(o, c), b1 = Math.max(o, c), rng = Math.max(minBody, b1 - b0) / (body[0] + rnd() * (body[1] - body[0]));
    const wick = Math.max(0, rng - (b1 - b0)), up = wick * (0.25 + rnd() * 0.5);
    let h = b1 + Math.max(minWick, up), l = b0 - Math.max(minWick, wick - up);
    if (piv) { if (piv.uc === 'h') h = piv.v; else l = piv.v; }
    out.push({ o: r4(o), h: r4(h), l: r4(l), c: r4(c) });
    o = c;
  }
  return out;
}

// aday kuralları: boşluk 0, OHLC tutarlı, pivot ucu kilitli ve yerel uç (komşular ≥ margin içeride), ardışık aynı mum yok
export function check(series, spec) {
  const bad = [], m = spec.margin || 0;
  for (let i = 0; i < series.length; i++) {
    const s = series[i];
    if (i && Math.abs(s.o - series[i - 1].c) > 1e-6) bad.push({ rule: 'boşluk', i });
    if (!(s.h >= Math.max(s.o, s.c) - 1e-9 && s.l <= Math.min(s.o, s.c) + 1e-9)) bad.push({ rule: 'OHLC', i });
    if (i && s.o === series[i - 1].o && s.c === series[i - 1].c && s.h === series[i - 1].h && s.l === series[i - 1].l) bad.push({ rule: 'yinelenen mum', i });
  }
  for (const p of spec.pivots || []) {
    const s = series[p.i]; if (!s) continue;
    const v = p.uc === 'h' ? s.h : s.l; if (Math.abs(v - p.v) > 1e-6) bad.push({ rule: 'pivot kilidi', i: p.i });
    for (const j of [p.i - 1, p.i + 1]) { const q = series[j]; if (!q) continue; if (p.uc === 'h' ? q.h > p.v - m + 1e-9 : q.l < p.v + m - 1e-9) bad.push({ rule: 'pivot yerel uç', i: p.i, komsu: j }); }
  }
  return bad;
}

export function generate(spec, { seed = 1, maxTries = 20000, validate = null } = {}) {
  const f = feasibility(spec); if (!f.ok) return { ok: false, infeasible: f.issues };
  const reasons = {};
  for (let k = 0; k < maxTries; k++) {
    const s = seed + k, series = candidate(spec, mulberry32(s)), bad = check(series, spec).concat(validate ? validate(series) || [] : []);
    if (!bad.length) return { ok: true, seed: s, tries: k + 1, series, rejected: reasons };
    for (const b of bad) reasons[b.rule] = (reasons[b.rule] || 0) + 1;
  }
  return { ok: false, tries: maxTries, rejected: reasons };
}
