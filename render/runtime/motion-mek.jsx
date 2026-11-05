// motion-mek.jsx — @motion/harness stilden bağımsız MEKANİK ilkeller: süpürme · katlama · seyahat kamera hamlesi (sözleşme: render/CONTRACT.md §4–§5). Sürüm 1.0.0.
//
// Yükleme: motion-core.jsx'ten SONRA, world/*.jsx'ten ÖNCE (motion-runtime.js modülleri `from` sırasıyla çalıştırır):
//   shared/motion-stage.jsx → shared/motion-core.jsx → shared/motion-mek.jsx → world/*.jsx → sahne.jsx
// `motion-render init` paketteki render/runtime/motion-mek.jsx'i shared/motion-mek.jsx olarak kopyalar; sahne sayfası x-import `from` listesine
// motion-core'dan hemen sonra ekler. motion-core.jsx DEĞİŞMEZ (parite: bu dosyayı yüklemeyen sahnenin çıktısı bit aynı); bu dosya window.MH'ye
// yalnız MH.mek ad alanını ekler ve MH önekli üç bileşen açar (MHSweep, MHFold, MHMoBlurK). Başka global yazmaz (ad çakışması C29).
//
// İLKE (motion-core ile aynı): RENK, FONT, MALZEME, GÖLGE RENGİ, IŞIK yok. Geometri (kutu, yön, menteşe), zaman (t, ön olay, süre), hız profili,
// gölge kaydı (z → {dx, dy, blur, a} işlevi, world verir) ve perspektif PARAMETREDİR; yüzeyin görünüşü children / render prop ile dışarıdan gelir.
// MH.mek.DEF varsayılanları makul GENEL değerlerdir, referans ölçümü değildir (FocusFX / kaynak proje ölçümleri docs/CRAFT-REF.md "Genel referans"
// bölümünde etiketlidir); world kendi sayısını verir ve kendi klibinden ölçer (motion-render motion-test mek-supurme|mek-katlama|mek-seyahat --ref).
// Her durum T'nin (tasarım saniyesi) saf işlevidir. Saf çekirdek (mhMekCore) DOM'suzdur: node testi "mek-core" bloğunu ayıklayıp çalıştırır.
//
// ── DIŞA AÇILANLAR (MH.mek) ──────────────────────────────────────────────────────────────────────────────────────
// Hız profili ailesi (u 0..1 → ilerleme 0..1; tek kare ivme/tepe oranı N kare hamlede, PN-117)
//   prof(ad | işlev, r?) → f(u)
//     'hermite'      kübik, uçlar tutuş (C1) — iki anahtarlı tutuşlu MH.keys.monotone (fxMC) hamlesiyle aynı eğri · ivme/tepe 4/N (%5 için N ≥ 80)
//     'quintic'      C2 tutuş (6u⁵ − 15u⁴ + 10u³): ivme uçlarda 0 · ivme/tepe 3,08/N (%5 için N ≥ 62) — isteğe bağlı, varsayılan değil
//     'yamuk'        sine rampalı yamuk (rampa payı r ∈ (0, 0,5], varsayılan 0,3; C2) · ivme/tepe π/(2rN) · sabit hız 1/(1 − r) × ortalama
//     'yamuk-kalkis' 0 → sine hızlanma (pay r ∈ (0, 1], varsayılan 0,5) → sabit hız 1/(1 − r/2) × ortalama (çıkış hızı kadraj dışında sürer) ·
//     'yamuk-inis'   sabit hız → sine yavaşlama → 0 (giriş hızı kadraj dışından gelir) · ikisi de ivme/tepe π/(2rN)
//     'sine' · 'io3' · 'o3' · 'i3' · 'linear' (MH.ease ile aynı formüller; inOut3/out3/in3/sio takma adları) · başka ad → MH.ease.get
//   ends(f) → [v0, v1] uç hızları · inv(f, y) · span(f, a, b) (ilerleme a → b'nin u payı; görünür süre %10–90)
//   prog(f, T, t0, dur, carry) — carry: true|'both'|'in'|'out' → uçta hız sürer (kadraj dışında doğrusal; dinlenmeye varış kadrajda yok)
//   arrive(f, m1) — uç hızı m1 olan profil (oturma kuyruğu C1 eklensin) · settleTail(τ, amp, dur) = amp·sin(πτ/dur)·(1 − τ/dur) (MH.settle biçimi)
// Ölçü (frame-check ile aynı tanımlar; plan'lar kendini bununla raporlar)
//   project(c, wx, wy, wz, persp, w, h) · camMotion(at, T, dt, {persp, frame}) — MH.cam.project / MH.cam.motion ile aynı matematik (5 × 3 ızgara)
//   c1(v, {floor, merge}) — hamle başına tepe ve en büyük |Δv| / tepe (frame-check velocity c1Scan tanımı)
// Süpürme  sweep({box, dir, kind:'out'|'in'|'through', t, lead, dur, profile, r, carry, lift, shadowLead, pad, blur:{max, div}, swapAt, frame, fps})
//   → {at(T), boxEntry(T, ad) (__boxes girdisi), speed(T, dt), window(), plan(), box, dir, cover, tSwap, swap(T) …}. at(T): {s, x, y, rect, z, v (px/s), blur, sx, sy (gölge yolu),
//   cover (kadraj örtme payı), vis (yüzeyin görünür payı), covered, swap (0|1: altta hangi set), phase 'once'|'onOlay'|'supurme'|'sonra', dirPhase}
//   Tam örtme penceresi cover {t0, t1}; set değişimi swap(T) → tSwap'ta 0 → 1 (through: pencere ortası · in: tam örtme anı · out: baştan yeni set).
// Katlama  fold({box, hinge:'top'|'bottom'|'left'|'right', angle, t, lead, leadLift, dur, profile, r, settle:{amp°, dur}, persp, origin, thickness,
//   shadowK, frame, fps}) → {at(T), boxEntry(T, ad) (poly + rect), speed(T, dt), window(), plan(), theta(T) …}. at(T): {th (°), lf, sn, cs, hFree (serbest kenar yüksekliği), foot,
//   footRect (zemin izi), face 'front'|'back', corners (izdüşüm 4 köşe: menteşe0, menteşe1, serbest1, serbest0), css, phase}
// Seyahat  travel({from, to ({x, y, d?, rx?, ry?, rz?}), t, dur | visible, profile, r, up:{d, rx} (tepedeki dolly/tilt farkı), windows:{up, travel, down},
//   upProfile, settle:{amp px, dur}, peakMax, fit:'dur', persp, drift:{k, spec}, dof:{k, max, focus}, raster: true | {rx, rz, d}, frame, fps})
//   crane-up (rx + z) → travel (x/y) → crane-down: tek sürekli C1 yol (kanallar örtüşen pencerelerde, her biri C1; hız evreler arasında 0'a düşmez)
//   → {at(T) (MHCam c), height(T) 0..1, z(T) px, dof(T) px, speed(T, dt), plan() {peak, c1, moves, visible, over …}, window(), t0, tEnd, hook(o)}
//   chain([hamle…]) → {at(T), hook(o)} — art arda hamleler (her biri dinlenmeden dinlenmeye; sonraki from = önceki to)
// Raster / bulanıklık (isteğe bağlı; varsayılan kapalı)
//   noZero(v, eps) — dönme tam 0 yazılmaz (|v| ≥ eps; PN-137 raster yolu basamağı) · DEF.raster 0,001° (MHCam toFixed(3)'ten geçen en küçük)
//   travel raster: true | {rx, rz, d} → bu kanallar hiç tam 0 yazılmaz (PN-137: rotate dizesi tam 0deg'e inince Chromium eksene hizalı raster
//   yoluna geçer, tek karede keskinlik/gren basamağı; PN-120: dinlenmede tamsayı öteleme). Varsayılan kapalı (motion-core çıktısı aynı kalır).
//   blurKernel(L, ux, uy, step) → [{dx, dy, w}] tamsayı ötelemeli kutu çekirdeği (L sürekli → ağırlık sürekli; PN-119)
// Sayfa (yalnız tarayıcı)
//   hooks.windows(ad, liste | işlev) → window.__<ad>(): [{t0, t1}] sayfa saniyesi (frame-check pop `exclude: ["$__<ad>"]`; CONTRACT §5 geçiş penceresi)
//   hooks.speed(ad, fn(T, dt), {dur}) → window.__<ad>(fps, n): kare başı hız (stage px) · travel/chain .hook({dur}) → __camSpeed (MH.hooks.camSpeed)
//   <MHSweep s T shade? id? name?>{yüzey | q => yüzey}</MHSweep> · <MHFold f T front back edge shade? blur? flat?/> ·
//   <MHMoBlurK v shutter minPx ramp? id? pad? off?> (MHMoBlur ile aynı arayüz; tamsayı ötelemeli kutu çekirdeği + eşikte rampa)
// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────

// ═══ mek-core: başla ═══ (saf çekirdek: DOM / window yok — render/test/mek.test.mjs bu bloğu ayıklayıp node'da çalıştırır)
function mhMekCore(env) {
  env = env || {};
  var M = { version: '1.0.0' };
  // genel varsayılanlar (referans ölçümü DEĞİL; world kendi değerini verir)
  //   süpürme r: out/in tam sine rampa (r 1: tek kare ivme/tepe π/(2N) — 60 fps 0,8 s'de %3,3), through yamuk r 0,5 (π/N — 1,2 s'de %4,4)
  M.DEF = {
    yamukR: 0.3,
    sweep: { dur: { out: 0.8, in: 0.8, through: 1.2 }, r: { out: 1, in: 1, through: 0.5 }, lead: 0.06, lift: 4, pad: 40 },
    fold: { angle: 180, dur: 1.8, lead: 0.1, leadLift: 4, profile: 'hermite', shadowK: 0.5 },
    travel: { dur: 2.4, profile: 'hermite', upProfile: 'hermite', up: [0, 0.5], travel: [0, 1], down: [0.5, 1] },
    raster: { rx: 0.001, rz: 0.001 },
  };
  function c01(u) { return u < 0 ? 0 : u > 1 ? 1 : u; }
  function num(v, d) { return v == null || v === '' || !isFinite(+v) ? d : +v; }
  function err(m) { return new Error('[MH.mek] ' + m); }
  M.c01 = c01;
  M.fps = function (o) { return num(o && o.fps, 0) || (env.fps ? env.fps() : 60); };
  M.frame = function (o) {   // kadraj [x, y, w, h] (tasarım px): o.frame → env.canvas() → 1920 × 1080
    var f = o && o.frame; if (Array.isArray(f) && f.length === 4) return f.map(Number);
    var c = env.canvas ? env.canvas() : null; return [0, 0, (c && c.w) || 1920, (c && c.h) || 1080];
  };

  // ── hız profili ailesi ─────────────────────────────────────────────────────────────────────────────────────
  function yamuk(u, r) { u = c01(u); var V = 1 / (1 - r); if (u > 1 - r) return 1 - yamuk(1 - u, r); if (u < r) return V / 2 * (u - r / Math.PI * Math.sin(Math.PI * u / r)); return V * r / 2 + V * (u - r); }
  function inis(u, r) { u = c01(u); var V = 1 / (1 - r / 2); if (u <= 1 - r) return V * u; var w = u - (1 - r); return V * (1 - r) + V / 2 * (w + r / Math.PI * Math.sin(Math.PI * w / r)); }
  function kalkis(u, r) { return 1 - inis(1 - c01(u), r); }
  var BASE = {
    linear: function (u) { return c01(u); },
    sine: function (u) { u = c01(u); return 0.5 - 0.5 * Math.cos(Math.PI * u); },
    io3: function (u) { u = c01(u); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; },
    o3: function (u) { u = c01(u); return 1 - Math.pow(1 - u, 3); },
    i3: function (u) { u = c01(u); return u * u * u; },
    hermite: function (u) { u = c01(u); return u * u * (3 - 2 * u); },
    quintic: function (u) { u = c01(u); return u * u * u * (u * (u * 6 - 15) + 10); },
  };
  var ALIAS = { inOut3: 'io3', out3: 'o3', in3: 'i3', sio: 'sine', inOutSine: 'sine', smoothstep: 'hermite', smootherstep: 'quintic' };
  M.prof = function (ad, r) {
    if (typeof ad === 'function') return ad;
    var s = ALIAS[ad] || ad;
    if (BASE[s]) return BASE[s];
    if (s === 'yamuk' || s === 'yamuk-kalkis' || s === 'yamuk-inis') {
      var y = s === 'yamuk', rr = num(r, y ? M.DEF.yamukR : 0.5);
      if (!(rr > 0 && rr <= (y ? 0.5 : 1))) throw err('prof ' + s + ': r ' + (y ? '(0, 0,5]' : '(0, 1]') + ' olmalı (' + r + ')');
      return y ? function (u) { return yamuk(u, rr); } : s === 'yamuk-kalkis' ? function (u) { return kalkis(u, rr); } : function (u) { return inis(u, rr); };
    }
    if (env.ease) return env.ease(ad);
    throw err('prof: bilinmeyen profil "' + ad + '" (hermite | quintic | yamuk | yamuk-kalkis | yamuk-inis | sine | io3 | o3 | i3 | linear)');
  };
  var EPS = 1e-6;
  M.ends = function (f) { return [(f(EPS) - f(0)) / EPS, (f(1) - f(1 - EPS)) / EPS]; };
  M.inv = function (f, y) { var lo = 0, hi = 1; for (var i = 0; i < 60; i++) { var m = (lo + hi) / 2; if (f(m) < y) lo = m; else hi = m; } return (lo + hi) / 2; };
  M.span = function (f, a, b) { return M.inv(f, b) - M.inv(f, a); };
  function carryOn(c, side) { return c === true || c === 'both' || c === side; }
  M.prog = function (f, T, t0, dur, carry) {
    var u = dur > 0 ? (T - t0) / dur : (T >= t0 ? 1 : 0);
    if (u < 0) return carryOn(carry, 'in') ? M.ends(f)[0] * u : 0;
    if (u > 1) return carryOn(carry, 'out') ? 1 + M.ends(f)[1] * (u - 1) : 1;
    return f(u);
  };
  // uç hızı m1 (ilerleme / u) olan profil: f + m1·(u³ − u²) — f'nin uç hızı 0 ise varışta hız m1 olur, oturma kuyruğu aynı hızla başlar (C1)
  M.arrive = function (f, m1) { if (!m1) return f; return function (u) { u = c01(u); return f(u) + m1 * (u * u * u - u * u); }; };
  M.settleTail = function (tau, amp, dur) { if (!amp || !(dur > 0) || tau <= 0 || tau >= dur) return 0; var u = tau / dur; return amp * Math.sin(Math.PI * u) * (1 - u); };
  M.noZero = function (v, eps) { eps = num(eps, M.DEF.raster.rz); v = +v || 0; return Math.abs(v) >= eps ? v : (v < 0 ? -eps : eps); };
  M.osc = function (T, scale, terms) { var s = 0; for (var i = 0; i < terms.length; i++) { var q = terms[i]; s += Math.sin(T * q[1] + (q[2] || 0)) * q[0]; } return s * scale; };   // MH.osc ile aynı

  // ── ölçü (frame-check / MH.cam ile aynı tanımlar) ───────────────────────────────────────────────────────────
  M.project = function (c, wx, wy, wz, persp, cw, ch) {   // MH.cam.project ile aynı matematik
    var x = wx - c.x, y = wy - c.y, z = wz || 0, R = Math.PI / 180;
    var a = (c.rz || 0) * R, x1 = x * Math.cos(a) - y * Math.sin(a), y1 = x * Math.sin(a) + y * Math.cos(a);
    var b = (c.ry || 0) * R, x2 = x1 * Math.cos(b) + z * Math.sin(b), z2 = -x1 * Math.sin(b) + z * Math.cos(b);
    var g = (c.rx || 0) * R, y3 = y1 * Math.cos(g) - z2 * Math.sin(g), z3 = y1 * Math.sin(g) + z2 * Math.cos(g);
    var k = persp / (persp - (z3 + (c.d || 0)));
    return { x: cw / 2 + x2 * k, y: ch / 2 + y3 * k, k: k };
  };
  M.camMotion = function (at, T, dt, o) {   // MH.cam.motion ile aynı ızgara: 5 × 3 dünya noktası (tuvalin 19/96 × 5/18 aralığı)
    o = o || {}; var F = M.frame(o), cw = F[2], ch = F[3], P = o.persp, c0 = at(T - dt), c1 = at(T), sx = 0, sy = 0, sm = 0, n = 0, z = o.z || 0;
    if (!(P > 0)) P = c0.persp; if (!(P > 0)) throw err('camMotion: persp gerekli');
    for (var i = 0; i < 5; i++) for (var j = 0; j < 3; j++) {
      var wx = c0.x + (i - 2) * cw * 19 / 96, wy = c0.y + (j - 1) * ch * 5 / 18;
      var a = M.project(c0, wx, wy, z, P, cw, ch), b = M.project(c1, wx, wy, z, P, cw, ch);
      sx += b.x - a.x; sy += b.y - a.y; sm += Math.hypot(b.x - a.x, b.y - a.y); n++;
    }
    return { vx: sx / n, vy: sy / n, m: sm / n };
  };
  M.c1 = function (v, o) {   // v: kare başı hız; hamle = v > floor koşusu (merge kareden kısa boşluk birleşir); pay = en büyük |Δv| / hamle tepesi
    o = o || {}; var floor = num(o.floor, 0.05), merge = num(o.merge, 0), runs = [], r0 = null, i;
    for (i = 0; i <= v.length; i++) { var on = i < v.length && v[i] > floor; if (on && r0 == null) r0 = i; if (!on && r0 != null) { runs.push([r0, i - 1]); r0 = null; } }
    var m = []; runs.forEach(function (r) { var l = m[m.length - 1]; if (l && r[0] - l[1] - 1 < merge) l[1] = r[1]; else m.push(r.slice()); });
    return m.map(function (r) {
      var pk = 0, pa = r[0], dv = 0, da = null, k;
      for (k = r[0]; k <= r[1]; k++) if (v[k] > pk) { pk = v[k]; pa = k; }
      for (k = Math.max(1, r[0]); k <= Math.min(v.length - 1, r[1] + 1); k++) { var d = Math.abs(v[k] - v[k - 1]); if (d > dv) { dv = d; da = k; } }
      return { f0: r[0], f1: r[1], peak: pk, peakAt: pa, maxDv: dv, maxDvAt: da, share: dv / Math.max(1e-9, pk) };
    });
  };
  function worst(mv) { return mv.reduce(function (a, x) { return Math.max(a, x.share); }, 0); }
  function r3(x) { return Math.round(x * 1000) / 1000; }
  function inter(r, F) { var x0 = Math.max(r[0], F[0]), y0 = Math.max(r[1], F[1]), x1 = Math.min(r[0] + r[2], F[0] + F[2]), y1 = Math.min(r[1] + r[3], F[1] + F[3]); return x1 > x0 && y1 > y0 ? (x1 - x0) * (y1 - y0) : 0; }
  // görünür ardışık kare koşularında C1 (frame-check velocity visibleOnly ile aynı: görünmez kare diziyi böler)
  function c1Visible(v, vis, floor) { var segs = [], cur = []; v.forEach(function (x, i) { if (vis[i]) cur.push(x); else if (cur.length) { segs.push(cur); cur = []; } }); if (cur.length) segs.push(cur); return [].concat.apply([], segs.map(function (s) { return M.c1(s, { floor: floor }); })); }

  // ── süpürme: kadrajı örten / açan yönlü yüzey ──────────────────────────────────────────────────────────────
  //   kind 'out': yüzey kutusunda başlar, dir yönünde kadrajı terk eder (altındaki açığa çıkar) · 'in': kadraj dışından gelir, kutusunda durur ·
  //   'through': dışarıdan girer, kadrajı (kutu ⊇ kadraj ise) tam örter, karşı yandan çıkar — örtme penceresinde altta set değişir (gizli kesme değil).
  //   t = ön olay başı: out → yüzey kalkar (z 0 → lift, gölge kopar) · in/through → gölge yolu shadowLead önden gelir. Süpürme [t + lead, t + lead + dur].
  M.sweep = function (o) {
    o = o || {}; var D = M.DEF.sweep;
    if (!Array.isArray(o.box) || o.box.length !== 4) throw err('sweep: box [x, y, w, h] gerekli');
    if (!Array.isArray(o.dir) || o.dir.length !== 2) throw err('sweep: dir [ux, uy] gerekli');
    var kind = o.kind || 'out'; if (['out', 'in', 'through'].indexOf(kind) < 0) throw err('sweep: kind out | in | through (' + kind + ')');
    var l = Math.hypot(o.dir[0], o.dir[1]); if (!(l > 0)) throw err('sweep: dir sıfır');
    var u = [o.dir[0] / l, o.dir[1] / l], b = o.box.map(Number), F = M.frame(o), pad = num(o.pad, D.pad), fps = M.fps(o);
    var t = num(o.t, 0), lead = Math.max(0, num(o.lead, D.lead)), dur = num(o.dur, D.dur[kind]); if (!(dur > 0)) throw err('sweep: dur > 0 olmalı');
    var pn = o.profile || (kind === 'out' ? 'yamuk-kalkis' : kind === 'in' ? 'yamuk-inis' : 'yamuk'), f = M.prof(pn, o.r != null ? o.r : o.profile ? undefined : D.r[kind]), carry = o.carry == null ? true : o.carry;
    var away = function (sg) {   // yön boyunca kadraj dışı uzaklık: kutu (+ pay) kadrajla kesişmez. sg +1 ileri (çıkış), −1 geri (giriş)
      var need = [], ux = u[0] * sg, uy = u[1] * sg;
      if (ux > 1e-9) need.push((F[0] + F[2] - b[0]) / ux); if (ux < -1e-9) need.push((b[0] + b[2] - F[0]) / -ux);
      if (uy > 1e-9) need.push((F[1] + F[3] - b[1]) / uy); if (uy < -1e-9) need.push((b[1] + b[3] - F[1]) / -uy);
      return Math.max(0, Math.min.apply(null, need)) + pad;
    };
    var Dout = kind === 'in' ? 0 : away(1), Din = kind === 'out' ? 0 : away(-1), s0 = -Din, s1 = Dout;
    var ta0 = t, ta1 = t + lead, tx1 = ta1 + dur, lift = num(o.lift, D.lift), sLead = num(o.shadowLead, kind === 'out' ? 0 : lead);
    var off = function (T) { return s0 + (s1 - s0) * M.prog(f, T, ta1, dur, carry); };
    var zAt = function (T) {
      if (kind === 'out') return lift * BASE.sine(lead > 0 ? (T - ta0) / lead : (T >= ta0 ? 1 : 0));
      if (kind === 'in') return lift * (1 - BASE.sine(lead > 0 ? (T - (tx1 - lead)) / lead : (T >= tx1 ? 1 : 0)));
      return lift;
    };
    // tam örtme: kutu ⊇ kadraj ⇔ ötelenme s ∈ [lo, hi]
    var lo = -Infinity, hi = Infinity, ok = true;
    [[0, 2], [1, 3]].forEach(function (ax) {
      var i = ax[0], w = ax[1], uu = u[i], A = F[i] - b[i], B = F[i] + F[w] - b[i] - b[w];   // b + s·u ≤ F0 · b + bw + s·u ≥ F0 + Fw
      if (Math.abs(uu) < 1e-9) { if (!(A >= 0 && B <= 0)) ok = false; return; }
      if (uu > 0) { hi = Math.min(hi, A / uu); lo = Math.max(lo, B / uu); } else { lo = Math.max(lo, A / uu); hi = Math.min(hi, B / uu); }
    });
    var cover = null;
    if (ok && lo <= hi && !(s0 > hi || s1 < lo)) {   // off(T) azalmaz: ilk off ≥ lo anı → son off ≤ hi anı (süpürme aralığında ikiye bölme; dışında ±∞)
      var firstGE = function (sv) { if (off(ta1) >= sv) return -Infinity; var a = ta1, c = tx1; for (var k = 0; k < 60; k++) { var m = (a + c) / 2; if (off(m) < sv) a = m; else c = m; } return c; };
      var lastLE = function (sv) { if (off(tx1) <= sv) return Infinity; var a = ta1, c = tx1; for (var k = 0; k < 60; k++) { var m = (a + c) / 2; if (off(m) <= sv) a = m; else c = m; } return a; };
      cover = { t0: firstGE(lo), t1: lastLE(hi), sLo: lo, sHi: hi };
    }
    var tSwap = o.swapAt != null ? +o.swapAt : !cover ? null : kind === 'out' ? cover.t0 : kind === 'in' ? cover.t0 : (isFinite(cover.t0) && isFinite(cover.t1) ? (cover.t0 + cover.t1) / 2 : cover.t0);
    var warn = []; if (kind !== 'out' && !cover) warn.push('tam örtme yok: altta set değişimi görünür olur (gizli kesme) — kutu kadrajı örtmeli');
    var vAt = function (T) { var dt = 1 / fps; return (off(T) - off(T - dt)) / dt; };   // px/s, kare başı fark (MoBlur ile aynı)
    var bl = o.blur && o.blur.max > 0 && o.blur.div > 0 ? o.blur : null;
    var phaseOf = function (T) { return T < ta0 ? 'once' : T < ta1 ? 'onOlay' : T < tx1 ? 'supurme' : 'sonra'; };
    var at = function (T) {
      var s = off(T), x = u[0] * s, y = u[1] * s, r = [b[0] + x, b[1] + y, b[2], b[3]], A = inter(r, F), v = vAt(T), ss = off(T + sLead);
      var dp = kind === 'in' ? 'giris' : kind === 'out' ? 'cikis' : (cover && T >= cover.t0 ? 'cikis' : 'giris');
      return { s: s, x: x, y: y, rect: r, z: zAt(T), v: v, blur: bl ? Math.min(bl.max, Math.abs(v) / bl.div) : 0, sx: u[0] * ss, sy: u[1] * ss,
        cover: A / (F[2] * F[3]), vis: A / (b[2] * b[3]), covered: !!cover && s >= cover.sLo - 1e-6 && s <= cover.sHi + 1e-6,
        swap: tSwap != null && T >= tSwap ? 1 : 0, phase: phaseOf(T), dirPhase: dp };
    };
    var S = { kind: kind, box: b, dir: u, frame: F, t0: ta0, ta1: ta1, t1: tx1, dur: dur, lead: lead, Din: Din, Dout: Dout, cover: cover, tSwap: tSwap, profile: pn, warn: warn, at: at, off: off };
    S.swap = function (T) { return tSwap != null && T >= tSwap ? 1 : 0; };
    S.speed = function (T, dt) { dt = dt || 1 / fps; return Math.abs(off(T) - off(T - dt)); };   // tasarım px / dt
    S.boxEntry = function (T, name) { var q = at(T); return { name: name || 'supurme', rect: q.rect, kind: 'obj', vis: 1, phase: q.phase === 'supurme' ? 'supurme ' + q.dirPhase : q.phase }; };
    S.window = function () { return { t0: ta0, t1: tx1 }; };   // tasarlanmış geçiş penceresi (pop exclude)
    var plan = null;
    S.plan = function () {
      if (plan) return plan;
      var v = [], vis = [], k0 = Math.max(0, Math.floor(ta0 * fps) - 1), k1 = Math.ceil(tx1 * fps) + 1;
      for (var k = k0; k <= k1; k++) { var T = k / fps; v.push(Math.abs(off(T) - off(T - 1 / fps))); vis.push(at(T).vis > 0 || at(T - 1 / fps).vis > 0); }
      var mv = c1Visible(v, vis, 0.05), pk = Math.max.apply(null, v.filter(function (x, i) { return vis[i]; }).concat([0]));
      plan = { kind: kind, fps: fps, dist: r3(Din + Dout), Din: r3(Din), Dout: r3(Dout), t0: ta0, ta1: ta1, t1: tx1, cover: cover, tSwap: tSwap, profile: pn, carry: carry,
        peak: r3(pk), c1: r3(worst(mv)), moves: mv.length, frames: [k0, k1], warn: warn };
      return plan;
    };
    return S;
  };

  // ── katlama: kalın kâğıt / kart menteşe ekseninde döner (CSS 3B; perspektif ve menteşe parametre) ───────────
  //   t = ön olay başı: serbest kenar leadLift px kalkar (θa = asin(leadLift / L), sine, lead s) → θa → angle (profil, dur). settle {amp°, dur} isteğe bağlı.
  var HINGE = {
    top: function (b) { return { h0: [b[0], b[1]], e: [1, 0], n: [0, 1], La: b[2], L: b[3], ax: 'X', sg: 1, org: '50% 0%' }; },
    bottom: function (b) { return { h0: [b[0], b[1] + b[3]], e: [1, 0], n: [0, -1], La: b[2], L: b[3], ax: 'X', sg: -1, org: '50% 100%' }; },
    left: function (b) { return { h0: [b[0], b[1]], e: [0, 1], n: [1, 0], La: b[3], L: b[2], ax: 'Y', sg: -1, org: '0% 50%' }; },
    right: function (b) { return { h0: [b[0] + b[2], b[1]], e: [0, 1], n: [-1, 0], La: b[3], L: b[2], ax: 'Y', sg: 1, org: '100% 50%' }; },
  };
  M.fold = function (o) {
    o = o || {}; var D = M.DEF.fold;
    if (!Array.isArray(o.box) || o.box.length !== 4) throw err('fold: box [x, y, w, h] gerekli');
    var P = +o.persp; if (!(P > 0)) throw err('fold: persp (perspektif px) gerekli — world verir');
    var hinge = o.hinge || 'top'; if (!HINGE[hinge]) throw err('fold: hinge top | bottom | left | right (' + hinge + ')');
    var b = o.box.map(Number), F = M.frame(o), H = HINGE[hinge](b), fps = M.fps(o), po = Array.isArray(o.origin) ? o.origin : [F[0] + F[2] / 2, F[1] + F[3] / 2];
    var angle = num(o.angle, D.angle), t = num(o.t, 0), lead = Math.max(0, num(o.lead, D.lead)), dur = num(o.dur, D.dur), f = M.prof(o.profile || D.profile, o.r);
    if (!(dur > 0)) throw err('fold: dur > 0 olmalı');
    var tha = lead > 0 ? Math.asin(Math.min(1, Math.max(0, num(o.leadLift, D.leadLift)) / H.L)) * 180 / Math.PI : 0;
    var ta0 = t, ta1 = t + lead, tk1 = ta1 + dur, st = o.settle && o.settle.amp && o.settle.dur > 0 ? o.settle : null;
    var span = angle - tha, fa = st && span ? M.arrive(f, (st.amp * Math.PI / st.dur) * dur / span) : f, tEnd = tk1 + (st ? st.dur : 0);
    var thAt = function (T) {
      if (T < ta1) return tha * BASE.sine(lead > 0 ? (T - ta0) / lead : 1);
      if (T <= tk1) return tha + span * fa((T - ta1) / dur);
      return angle + (st ? M.settleTail(T - tk1, st.amp, st.dur) : 0);
    };
    var dn = (po[0] - H.h0[0]) * H.n[0] + (po[1] - H.h0[1]) * H.n[1];   // perspektif merkezinin menteşeden serbest kenar yönündeki uzaklığı
    var pt = function (a, l, th) {   // yaprak yereli (a menteşe boyunca, l menteşeden serbest kenara) → ekran (CSS perspective + rotate ile aynı)
      var r = th * Math.PI / 180, x = H.h0[0] + H.e[0] * a + H.n[0] * l * Math.cos(r), y = H.h0[1] + H.e[1] * a + H.n[1] * l * Math.cos(r), z = l * Math.sin(r), s = P / Math.max(1, P - z);
      return [po[0] + (x - po[0]) * s, po[1] + (y - po[1]) * s];
    };
    var phaseOf = function (T) { return T < ta0 ? 'once' : T < ta1 ? 'onOlay' : T < tk1 ? 'katlama' : T < tEnd ? 'oturma' : 'sonra'; };
    var at = function (T) {
      var th = thAt(T), r = th * Math.PI / 180, sn = Math.sin(r), cs = Math.cos(r), a1 = H.L * cs;
      var q0 = [H.h0[0] + H.n[0] * Math.min(0, a1), H.h0[1] + H.n[1] * Math.min(0, a1)], q1 = [H.h0[0] + H.n[0] * Math.max(0, a1) + H.e[0] * H.La, H.h0[1] + H.n[1] * Math.max(0, a1) + H.e[1] * H.La];
      return { th: th, lf: angle ? th / angle : 0, sn: sn, cs: cs, hFree: H.L * sn, foot: a1, footRect: [Math.min(q0[0], q1[0]), Math.min(q0[1], q1[1]), Math.abs(q1[0] - q0[0]), Math.abs(q1[1] - q0[1])],
        face: -dn * sn + P * cs > 0 ? 'front' : 'back', corners: [pt(0, 0, th), pt(H.La, 0, th), pt(H.La, H.L, th), pt(0, H.L, th)],
        css: 'rotate' + H.ax + '(' + (H.sg * th).toFixed(4) + 'deg)', phase: phaseOf(T) };
    };
    var edge = function (T) { return pt(H.La / 2, H.L, thAt(T)); };
    var Fd = { box: b, hinge: hinge, geo: H, persp: P, origin: po, angle: angle, t0: ta0, ta1: ta1, t1: tk1, tEnd: tEnd, thLead: tha, thEye: Math.atan2(P, dn) * 180 / Math.PI,
      thick: Math.max(0, num(o.thickness, 0)), shadowK: num(o.shadowK, D.shadowK), at: at, theta: thAt };
    Fd.speed = function (T, dt) { dt = dt || 1 / fps; var a = edge(T - dt), c = edge(T); return Math.hypot(c[0] - a[0], c[1] - a[1]); };   // serbest kenar ortası izdüşümü (ekran px / dt)
    Fd.arcSpeed = function (T, dt) { dt = dt || 1 / fps; return H.L * Math.abs(thAt(T) - thAt(T - dt)) * Math.PI / 180; };   // serbest kenarın yay hızı (px / dt; profilin kendisi)
    Fd.boxEntry = function (T, name) { var q = at(T), xs = q.corners.map(function (c) { return c[0]; }), ys = q.corners.map(function (c) { return c[1]; }); return { name: name || 'katlama', poly: q.corners, rect: [Math.min.apply(null, xs), Math.min.apply(null, ys), Math.max.apply(null, xs) - Math.min.apply(null, xs), Math.max.apply(null, ys) - Math.min.apply(null, ys)], kind: 'obj', vis: 1, phase: q.phase }; };
    Fd.window = function () { return { t0: ta0, t1: tEnd }; };
    var plan = null;
    Fd.plan = function () {
      if (plan) return plan;
      //   c1: yay hızı (profilin kendisi; ön olay + oturma ana hamlenin parçası) · c1Proj: serbest kenar izdüşümü, aynı birleştirme ·
      //   c1Fc: izdüşüm, frame-check tanımı (taban 0,05, birleştirme yok). Perspektifte serbest kenarın ekran izi yön değiştirir (kameraya kalkarken dışa,
      //   sonra karşıya): izdüşüm hızı 0'a yaklaşan çukurlar verir; kutu merkezinden ölçen frame-check bunları ayrı koşu sayabilir (PN-138 tanımı).
      var v = [], a = [], k0 = Math.max(0, Math.floor(ta0 * fps) - 1), k1 = Math.ceil(tEnd * fps) + 1, mg = Math.round(((st ? st.dur : 0) + 0.1) * fps);
      for (var k = k0; k <= k1; k++) { v.push(Fd.speed(k / fps, 1 / fps)); a.push(Fd.arcSpeed(k / fps, 1 / fps)); }
      var ma = M.c1(a, { floor: 1e-3, merge: mg }), mv = M.c1(v, { floor: 0.05, merge: mg }), mf = M.c1(v, { floor: 0.05 });
      plan = { fps: fps, hinge: hinge, angle: angle, thLead: r3(tha), thEye: r3(Fd.thEye), t0: ta0, ta1: ta1, t1: tk1, tEnd: tEnd, peak: r3(Math.max.apply(null, v)), peakArc: r3(Math.max.apply(null, a)),
        c1: r3(worst(ma)), c1Proj: r3(worst(mv)), c1Fc: r3(worst(mf)), runsFc: mf.length, moves: ma.length, frames: [k0, k1] };
      return plan;
    };
    return Fd;
  };

  // ── seyahat kamera hamlesi: crane-up (rx + z) → travel (x/y) → crane-down ────────────────────────────────────
  //   Kanallar örtüşen pencerelerde (dur'un payı): yükseklik H = yukarı(up penceresi) − aşağı(down penceresi), travel x/y (travel penceresi).
  //   Her kanal uçlarda hız 0 olan C1 profil; pencereler örtüştükçe toplam ekran hızı evreler arasında 0'a düşmez (tek hamle; frame-check moves 1).
  //   settle {amp px, dur}: travel varışı amp·π/dur hızıyla (arrive) — oturma kuyruğu aynı hızla başlar, konum ve hız sürekli (C1).
  M.travel = function (o) {
    o = o || {}; var D = M.DEF.travel;
    if (!o.from || !o.to) throw err('travel: from ve to ({x, y, d?, rx?, ry?, rz?}) gerekli');
    var P = +o.persp; if (!(P > 0)) throw err('travel: persp (perspektif px) gerekli — world verir');
    var F = M.frame(o), fps = M.fps(o), t0 = num(o.t, 0), pn = o.profile || D.profile, f = M.prof(pn, o.r), fu = M.prof(o.upProfile || D.upProfile, o.upR);
    var W = o.windows || {}, wUp = W.up || D.up, wTr = W.travel || D.travel, wDn = W.down || D.down;
    var A = o.from, B = o.to, up = o.up || {}, upD = num(up.d, 0), upRx = num(up.rx, 0), dx = num(B.x, 0) - num(A.x, 0), dy = num(B.y, 0) - num(A.y, 0), dist = Math.hypot(dx, dy);
    var st = o.settle && o.settle.amp > 0 && o.settle.dur > 0 && dist > 0 ? o.settle : null, dr = o.drift && o.drift.spec ? o.drift : null, dof = o.dof || null;
    var trFrac = wTr[1] - wTr[0]; if (!(trFrac > 0)) throw err('travel: windows.travel [a, b] (a < b)');
    var dur = o.visible > 0 ? o.visible / (M.span(f, 0.1, 0.9) * trFrac) : num(o.dur, D.dur); if (!(dur > 0)) throw err('travel: dur ya da visible > 0 olmalı');
    var peakMax = num(o.peakMax, 0), warn = [];
    function build(dur) {
      var tr0 = t0 + wTr[0] * dur, trD = trFrac * dur, tTr1 = tr0 + trD, tEnd = Math.max(t0 + dur, tTr1 + (st ? st.dur : 0));
      var g = st ? M.arrive(f, (st.amp * Math.PI / st.dur) * trD / dist) : f;
      var win = function (u, w) { return w[1] > w[0] ? c01((u - w[0]) / (w[1] - w[0])) : (u >= w[0] ? 1 : 0); };
      var Hf = function (T) { var u = (T - t0) / dur; return fu(win(u, wUp)) - fu(win(u, wDn)); };
      var at = function (T) {
        var e = T <= tr0 ? 0 : T >= tTr1 ? 1 : (T - tr0) / trD, p = g(e), pb = f(e), s = st && T > tTr1 ? M.settleTail(T - tTr1, st.amp, st.dur) : 0, h = Hf(T), c = {};
        c.x = num(A.x, 0) + dx * p + (dist ? dx / dist * s : 0); c.y = num(A.y, 0) + dy * p + (dist ? dy / dist * s : 0);
        ['d', 'rx', 'ry', 'rz'].forEach(function (ch) { c[ch] = num(A[ch], 0) + (num(B[ch], 0) - num(A[ch], 0)) * pb; });
        c.d += upD * h; c.rx += upRx * h;
        if (dr) { var k = dr.k == null ? 1 : dr.k, sp = dr.spec, q = function (chn) { return chn ? M.osc(T, chn[0], chn[1]) * k : 0; }; c.x -= q(sp.x); c.y -= q(sp.y); c.rz += q(sp.rz); }   // MH.cam.at drift'iyle aynı
        if (o.raster) { var rs = o.raster === true ? M.DEF.raster : o.raster; if (rs.rx != null) c.rx = M.noZero(c.rx, rs.rx); if (rs.rz != null) c.rz = M.noZero(c.rz, rs.rz); if (rs.d != null) c.d = M.noZero(c.d, rs.d); }   // tek raster yolu (PN-137)
        c.persp = P;
        return c;
      };
      return { dur: dur, tr0: tr0, trD: trD, tTr1: tTr1, tEnd: tEnd, at: at, Hf: Hf };
    }
    function measure(Bd) {
      var v = [], k0 = Math.max(0, Math.floor(t0 * fps) - 1), k1 = Math.ceil(Bd.tEnd * fps) + 1;
      for (var k = k0; k <= k1; k++) v.push(M.camMotion(Bd.at, k / fps, 1 / fps, { persp: P, frame: F }).m);
      //   c1: ana hamlenin tepesine göre (oturma kuyruğu hamlenin parçası) · c1Fc: frame-check velocity bugünkü tanımı (taban 0,05, birleştirme yok) —
      //   oturmanın dönüş yarısı tabanın altına inip ayrı "mikro hamle" sayılırsa kendi küçük tepesine göre büyük pay verir (PN-138; araç tanımı)
      var pk = Math.max.apply(null, v), mv = M.c1(v, { floor: 0.05, merge: Math.round(((st ? st.dur : 0) + 0.1) * fps) }), mf = M.c1(v, { floor: 0.05 }), mo = M.c1(v, { floor: F[2] * 0.02 / fps, merge: Math.round(0.25 * fps) });
      return { v: v, k0: k0, k1: k1, peak: pk, peakAt: k0 + v.indexOf(pk), c1: worst(mv), c1Fc: worst(mf), runsFc: mf.length, moves: mo.length };
    }
    var Bd = build(dur), Ms = null;
    if (o.fit === 'dur' && peakMax > 0) {
      for (var it = 0; it < 8; it++) { Ms = measure(Bd); if (Ms.peak <= peakMax) break; Bd = build(Bd.dur * Ms.peak / peakMax * 1.01); }
    }
    var Tr = { from: A, to: B, persp: P, frame: F, t0: t0, dur: Bd.dur, t1: Bd.tTr1, tEnd: Bd.tEnd, profile: pn, windows: { up: wUp, travel: wTr, down: wDn }, at: Bd.at, warn: warn };
    Tr.height = function (T) { return Bd.Hf(T); };
    Tr.z = function (T) { return -upD * Bd.Hf(T); };   // kamera yüksekliği (px; dolly d'nin ters işareti)
    Tr.dof = function (T) { if (!dof || !(dof.k > 0)) return 0; return Math.min(num(dof.max, Infinity), Math.abs(Math.abs(upD) * Bd.Hf(T) - num(dof.focus, 0)) * dof.k); };
    Tr.speed = function (T, dt) { return M.camMotion(Bd.at, T, dt || 1 / fps, { persp: P, frame: F }).m; };   // tasarım px / dt (__camSpeed ile aynı ölçü)
    Tr.window = function () { return { t0: t0, t1: Bd.tEnd }; };
    var plan = null;
    Tr.plan = function () {
      if (plan) return plan;
      var m = Ms || measure(Bd), vis = M.span(f, 0.1, 0.9) * Bd.trD;
      if (peakMax > 0 && m.peak > peakMax) warn.push('tepe ' + r3(m.peak) + ' px/kare > tavan ' + peakMax + ' (fit:"dur" ya da yol/süre)');
      if (m.moves > 1) warn.push('hız evreler arasında tabanın altına iniyor: ' + m.moves + ' hamle (pencereleri örtüştür)');
      plan = { fps: fps, t0: t0, dur: r3(Bd.dur), t1: r3(Bd.tTr1), tEnd: r3(Bd.tEnd), visible: r3(vis), dist: r3(dist), profile: pn, peak: r3(m.peak), peakAt: m.peakAt, peakMax: peakMax || null,
        over: peakMax > 0 && m.peak > peakMax, c1: r3(m.c1), c1Fc: r3(m.c1Fc), runsFc: m.runsFc, moves: m.moves, frames: [m.k0, m.k1], warn: warn };
      if (m.runsFc > 1 && m.c1Fc > 0.05) warn.push('frame-check velocity (taban 0,05) oturma dönüşünü ayrı koşu sayar: C1 ' + r3(m.c1Fc) + ' (ana hamle ' + r3(m.c1) + '; bilinen ölçer sınırı, MEASURE fc:velocity)');
      return plan;
    };
    return Tr;
  };
  M.chain = function (list) {   // art arda hamleler: T'de başlamış son hamle geçerli (önceki to = sonraki from olmalı)
    var L = (list || []).slice().sort(function (a, b) { return a.t0 - b.t0; }), warn = [];
    if (!L.length) throw err('chain: en az bir hamle');
    for (var i = 1; i < L.length; i++) { var a = L[i - 1].at(L[i].t0), c = L[i].at(L[i].t0); if (Math.hypot(a.x - c.x, a.y - c.y) > 0.5 || Math.abs((a.d || 0) - (c.d || 0)) > 0.5) warn.push('hamle ' + i + ': başlangıç önceki hamlenin bitişiyle aynı değil (' + r3(a.x) + ',' + r3(a.y) + ' → ' + r3(c.x) + ',' + r3(c.y) + ')'); }
    return { list: L, warn: warn, persp: L[0].persp, at: function (T) { var cur = L[0]; for (var k = 1; k < L.length; k++) if (T >= L[k].t0) cur = L[k]; return cur.at(T); } };
  };

  // ── kutu çekirdeği (MHMoBlurK): tamsayı ötelemeli örnekler, ağırlık = [k − ½, k + ½] ∩ [−L/2, L/2] (L sürekli → çekirdek sürekli) ──
  M.blurKernel = function (L, ux, uy, step) {
    step = step > 0 ? step : 1; var h = Math.max(0, +L || 0) / 2 / step;
    if (!(h > 0.5)) return [{ dx: 0, dy: 0, w: 1 }];
    var K = Math.ceil(h + 0.5), taps = {}, keys = [], sum = 0;
    for (var k = -K; k <= K; k++) {
      var w = Math.min(k + 0.5, h) - Math.max(k - 0.5, -h); if (!(w > 0)) continue;
      var dx = Math.round(k * (ux || 0)) * step, dy = Math.round(k * (uy || 0)) * step, key = dx + ',' + dy;
      if (!taps[key]) { taps[key] = { dx: dx, dy: dy, w: 0 }; keys.push(key); }
      taps[key].w += w; sum += w;
    }
    return keys.map(function (q) { return { dx: taps[q].dx, dy: taps[q].dy, w: taps[q].w / sum }; });
  };
  return M;
}
// ═══ mek-core: son ═══

if (typeof window.MH !== 'object' || !window.MH || !window.MH.ease) throw new Error('[MH.mek] motion-core.jsx yüklenmemiş: shared/motion-mek.jsx motion-core.jsx\'ten SONRA yüklenmeli');
MH.mek = mhMekCore({ ease: function (n) { return MH.ease.get(n); }, fps: function () { return MH.fps(); }, canvas: function () { return MH.canvas(); } });

// ── sayfa kancaları ───────────────────────────────────────────────────────────────────────────────────────────
MH.mek.hooks = {
  windows: function (name, list) {   // geçiş penceresi kancası: window.__<ad>() → [{t0, t1}] sayfa saniyesi (frame-check pop exclude "$__<ad>")
    return MH.hooks.set('__' + name, function () {
      var L = typeof list === 'function' ? list() : list || [];
      return L.filter(function (w) { return w && isFinite(w.t0) && isFinite(w.t1); }).map(function (w) { return { t0: +MH.time.toPage(w.t0).toFixed(5), t1: +MH.time.toPage(w.t1).toFixed(5) }; });
    });
  },
  speed: function (name, fn, o) {   // kare başı hız kancası: window.__<ad>(fps, n) → stage px/kare (ilk kare 0; MH.hooks.camSpeed ile aynı zaman tabanı)
    o = o || {};
    return MH.hooks.set('__' + name, function (fps, n) {
      fps = +fps || MH.fps(); var N = +n || o.frames || Math.round((o.dur || 0) * fps), out = [];
      for (var i = 0; i < N; i++) { var q = MH.time.pageT(i, fps); out.push(i ? +(fn(q[0], q[1]) * MH.design().s).toFixed(3) : 0); }
      return out;
    });
  },
};
(function () {   // travel / chain → __camSpeed (MH.hooks.camSpeed: MH.cam.motion, çekirdek camMotion ile aynı ızgara)
  var tr = MH.mek.travel, ch = MH.mek.chain;
  var hook = function (x) { x.hook = function (o) { return MH.hooks.camSpeed(x.at, Object.assign({ persp: x.persp }, o || {})); }; return x; };
  MH.mek.travel = function (o) { return hook(tr(o)); };
  MH.mek.chain = function (l) { return hook(ch(l)); };
})();

// ── bileşenler (görünüş dışarıdan: children / render prop; bu dosya renk vermez) ─────────────────────────────────
function mhMekF(x) { return +(+x).toFixed(3); }
function MHSweep(p) {   // p {s: MH.mek.sweep(…), T, children (yüzey, kutu yereli w×h; ya da q => düğüm), shade?: {fn(z) → {dx, dy, blur, a}, color}, id?, name?}
  var s = p.s, q = s.at(p.T), b = s.box, u = s.dir, sh = p.shade && p.shade.fn ? p.shade : null, id = 'mhsw-' + String(p.id || 's').replace(/[^A-Za-z0-9_-]/g, '_');
  if (s.kind !== 'in' && q.phase === 'sonra' && q.vis <= 0) return null;   // çıkan yüzey kadrajı terk etti
  var bx = q.blur * Math.abs(u[0]), by = q.blur * Math.abs(u[1]), on = q.blur > 0.05, pad = Math.ceil(3 * Math.max(bx, by)) + 2, g = sh ? sh.fn(q.z) : null;
  return (
    <div data-fx={p.name || 'mek-supurme'} data-faz={q.phase} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <svg width="0" height="0" style={{ position: 'absolute', left: 0, top: 0 }} aria-hidden="true">{on && <defs><filter id={id} filterUnits="userSpaceOnUse" x={-pad} y={-pad} width={b[2] + 2 * pad} height={b[3] + 2 * pad} colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation={bx.toFixed(2) + ' ' + by.toFixed(2)} /></filter></defs>}</svg>
      {g && <div data-c="supurme golge" style={{ position: 'absolute', left: 0, top: 0, width: b[2], height: b[3], background: sh.color, opacity: mhMekF(g.a),
        transform: 'translate(' + mhMekF(b[0] + q.sx + g.dx) + 'px,' + mhMekF(b[1] + q.sy + g.dy) + 'px)', filter: 'blur(' + (g.blur + (bx + by) / 3).toFixed(2) + 'px)' }} />}
      <div data-c="supurme yuzey" style={{ position: 'absolute', left: 0, top: 0, width: b[2], height: b[3], overflow: 'hidden',
        transform: 'translate(' + mhMekF(b[0] + q.x) + 'px,' + mhMekF(b[1] + q.y) + 'px)', filter: on ? 'url(#' + id + ')' : undefined }}>{typeof p.children === 'function' ? p.children(q) : p.children}</div>
    </div>
  );
}
function mhMekStrip(key, hor, at, w, h, th, fill) {   // kalınlık şeridi: yatay çizgi (y = at) ya da düşey çizgi (x = at) boyunca z 0 → −th
  var st = hor ? { left: 0, top: at, width: w, height: th, transformOrigin: '50% 0%', transform: 'rotateX(-90deg)' } : { left: at, top: 0, width: th, height: h, transformOrigin: '0% 50%', transform: 'rotateY(90deg)' };
  return <div key={key} data-c="katlama kenar" style={Object.assign({ position: 'absolute', overflow: 'hidden', background: typeof fill === 'string' ? fill : undefined }, st)}>{typeof fill === 'string' ? null : fill}</div>;
}
function MHFold(p) {   // p {f: MH.mek.fold(…), T, front, back (düğüm ya da q => düğüm), edge (CSS arka plan dizgesi ya da düğüm; kalınlık > 0), shade?: {fn(z), color}, blur? (px), flat? (false → üst 3B bağlamın perspektifi), name?}
  var f = p.f, q = f.at(p.T), b = f.box, G = f.geo, th = f.thick, w = b[2], h = b[3];
  var face = function (x) { return typeof x === 'function' ? x(q) : x; }, bl = p.blur > 0.05 ? 'blur(' + (+p.blur).toFixed(2) + 'px)' : undefined;
  var faceSt = { position: 'absolute', inset: 0, overflow: 'hidden', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', filter: bl };
  var g = p.shade && p.shade.fn ? p.shade.fn(q.hFree * f.shadowK) : null, fr = q.footRect, strips = [];
  if (th >= 0.5) {
    var hor = G.ax === 'X', free = { top: h, bottom: 0, left: w, right: 0 }[f.hinge];
    strips.push(mhMekStrip('serbest', hor, free, w, h, th, p.edge));
    strips.push(mhMekStrip('yan0', !hor, 0, w, h, th, p.edge), mhMekStrip('yan1', !hor, hor ? w : h, w, h, th, p.edge));
  }
  return (
    <div data-fx={p.name || 'mek-katlama'} data-faz={q.phase} data-yuz={q.face} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', transformStyle: 'preserve-3d',
      perspective: p.flat === false ? undefined : f.persp + 'px', perspectiveOrigin: p.flat === false ? undefined : f.origin[0] + 'px ' + f.origin[1] + 'px' }}>
      {g && <div data-c="katlama golge" style={{ position: 'absolute', left: 0, top: 0, width: mhMekF(fr[2]), height: mhMekF(fr[3]), background: p.shade.color, opacity: mhMekF(g.a),
        transform: 'translate(' + mhMekF(fr[0] + g.dx) + 'px,' + mhMekF(fr[1] + g.dy) + 'px)', filter: 'blur(' + (+g.blur).toFixed(2) + 'px)' }} />}
      <div data-c="katlama yaprak" style={{ position: 'absolute', left: b[0], top: b[1], width: w, height: h, transformStyle: 'preserve-3d', transformOrigin: G.org, transform: q.css }}>
        <div data-c="katlama on" style={faceSt}>{face(p.front)}</div>
        <div data-c="katlama arka" style={Object.assign({}, faceSt, { transform: (th > 0 ? 'translateZ(' + (-th).toFixed(2) + 'px) ' : '') + (G.ax === 'X' ? 'rotateX(180deg)' : 'rotateY(180deg)') })}>{face(p.back)}</div>
        {strips}
      </div>
    </div>
  );
}
function MHMoBlurK(p) {   // MHMoBlur arayüzü (v tasarım px/kare, shutter°, minPx); örnekler tamsayı CİHAZ pikselinde (feOffset yuvarlaması yok, PN-119), ağırlık kutu çekirdeği, minPx'te ramp px rampa
  var v = p.v || {}, vx = v.vx || 0, vy = v.vy || 0, d = Math.hypot(vx, vy), sh = +p.shutter || 0, min = +p.minPx || 0, rp = p.ramp == null ? 1 : +p.ramp;
  var gate = d <= min ? 0 : rp > 0 ? Math.min(1, (d - min) / rp) : 1, s = MH.design().s || 1;
  var on0 = sh > 0 && gate > 0 && !p.off && !MH.mode.key() && !MH.mode.prof('mblur');
  var taps = on0 ? MH.mek.blurKernel(sh / 360 * d * gate * s, d ? vx / d : 0, d ? vy / d : 0, 1) : [], on = taps.length > 1;
  var cv = MH.canvas(), pad = p.pad == null ? 80 : p.pad, id = p.id || 'mhmbk', f5 = function (x) { return (+x).toFixed(5); }, n = taps.length, prims = [];
  if (on) {
    taps.forEach(function (t, i) { prims.push(<feOffset key={'o' + i} in="SourceGraphic" dx={f5(t.dx / s)} dy={f5(t.dy / s)} result={'o' + i} />); });
    taps.forEach(function (t, i) { prims.push(i ? <feComposite key={'a' + i} in={'a' + (i - 1)} in2={'o' + i} operator="arithmetic" k1="0" k2="1" k3={f5(t.w)} k4="0" result={'a' + i} />
      : <feComposite key="a0" in="o0" in2="o0" operator="arithmetic" k1="0" k2={f5(t.w)} k3="0" k4="0" result="a0" />); });
    prims.push(<feComposite key="ov" in={'a' + (n - 1)} in2="SourceGraphic" operator="over" />);
  }
  return [
    <svg key="d" width="0" height="0" style={{ position: 'absolute', left: 0, top: 0 }} aria-hidden="true">{on && <defs><filter id={id} filterUnits="userSpaceOnUse" x={-pad} y={-pad} width={cv.w + 2 * pad} height={cv.h + 2 * pad} colorInterpolationFilters="sRGB">{prims}</filter></defs>}</svg>,
    <div key="w" data-fx="mblur" data-mb={n} style={{ position: 'absolute', inset: 0, filter: on ? 'url(#' + id + ')' : undefined }}>{p.children}</div>,
  ];
}

Object.assign(window, { MHSweep: MHSweep, MHFold: MHFold, MHMoBlurK: MHMoBlurK });
