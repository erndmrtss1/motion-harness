// motion-core.jsx — @motion/harness stilden bağımsız çekirdek yardımcılar (sözleşme: render/CONTRACT.md §4–§5). Sürüm 1.0.0.
//
// Yükleme: motion-runtime.js her modülü SIRAYLA `new Function('React','module','exports','require', kod)` ile çalıştırır
// (Babel standalone: presets react + typescript, klasik JSX → React.createElement). Sıra:
//   shared/motion-stage.jsx → shared/motion-core.jsx → world/*.jsx → sahne.jsx
// Her dosya kendi kapsamında çalışır; paylaşılan her şey window'a yazılır (tuzak d-01). Bu dosya yalnız window.MH ad alanını
// ve "MH" önekli birkaç bileşeni açar; başka global yazmaz (ad çakışması C29).
//
// İLKE: bu dosya RENK, FONT, MALZEME, MARKA ya da "görünüş varsayılanı" TAŞIMAZ. Genlik, süre, perspektif, deklanşör açısı,
// drift dalgası, gren hızı gibi her görünüş sayısı world'den (world.json + world/*.jsx) gelir. Verilmezse çağrı 0 döner
// (hareket yok) ya da açık hata atar — sessiz bir "ev stili" yoktur. fps ve tuval boyutu PARAMETREDİR (sabit 30 / 1920×1080 yok).
// Her şey T'nin (saniye) saf fonksiyonudur; çizim useEffect/rAF'e bağlanmaz (tek istisna MHBakeSvg'nin pişirme kuyruğu,
// harness __fxBakeSettle ile bekler ve kareyi aynı T'de yeniden çizer).
//
// ── DIŞA AÇILANLAR ───────────────────────────────────────────────────────────────────────────────────────────────
// Bağlam / tuval
//   MH.version                         '1.0.0'
//   MH.DEFAULT_FPS                     60 — CONTRACT D1-03; yalnız FX_FPS / MH_FPS / setStage hiçbiri yoksa
//   MH.key(ad)                         sayfa anahtarı: window['MH_'+ad] → window['MOTION_'+ad] (araçların yazdığı ad) → window['FX_'+ad] (geriye uyum)
//   MH.fps()                           kare hızı: window.FX_FPS (harness yazar) → MH_FPS → setStage(…, fps) → DEFAULT_FPS
//   MH.setStage(w, h, fps?)            CompositionStage'e verilen tuval (kök bileşen çağırır)
//   MH.stage(props?)                   {w, h}: setStage → props.width/height → window.MH_STAGE → görüntü alanı (innerWidth/Height).
//                                      Render'da harness görüntü alanını scenes.json width×height yapar ve Stage kutusunun bununla
//                                      birebir olmasını ister; bu yüzden kök bileşen genelde MH.stage() değerini Stage'e verir.
//   MH.setCanvas(w, h) · MH.canvas()   tasarım uzayı (world koordinatı); verilmezse stage(). MHDesignSpace bunu kurar.
//   MH.design() → {s, x, y}            tasarım uzayından Stage pikseline ölçek/ofset (MHDesignSpace yazar; yoksa 1/0/0)
//   MH.toStage(o)                      kanca geometrisini (rect [x,y,w,h] | poly | tip | size) tasarım px'inden Stage px'ine çevirir
//   MH.frame(T, fps?)                  kare dizini floor(T·fps + 1e-6)
//   MH.grainSeed(T, rate?, eps?)       gren tohumu floor(T·rate + eps) % 997 + 1 (rate: world'ün gren yenileme hızı, yoksa fps)
//
// Matematik / renk
//   MH.clamp(v, a, b) · MH.mix(a, b, t) · MH.smoothstep(a, b, x)
//   MH.rgb(c) → [r,g,b] (#rgb, #rrggbb, rgb()/rgba()) · MH.rgba(c, a) → 'rgba(…)' · MH.mixColor(a, b, t) (uçlarda a/b aynen döner)
//   MH.scaleColor(c, k) → 'rgb(…)' kanal × k
//   MH.rng(seed) deterministik üreteç (LCG) · MH.rngSpaced(k) aralıklı tohum 811+131k, ilk 2 çekiliş atılır (tuzak t-31)
//
// Easing (tek set; üç kopyanın yerine: power ailesi fx-lab FXE ile, adlı eğriler kit EASE/bez ile SAYISAL OLARAK AYNI)
//   MH.ease.linear · bezier(x1,y1,x2,y2) (Newton 8 adım) · in2/out2/inOut2 · in3/out3/inOut3 · in4/out4/inOut4 ·
//   inSine/outSine/sine (= inOutSine, 0.5−0.5·cos πu) · inExpo/outExpo · outBack(s)
//   adlı kübik bezier'ler: enter, exit, pop, morph, gravity, collapse, smooth (yalnız kütüphane; hiçbiri varsayılan değil)
//   kısa adlar: io3 = inOut3, o3 = out3, i3 = in3, sio = sine
//   MH.ease.get(ad | 'bezier(a,b,c,d)' | fonksiyon) → fonksiyon (world.json motion.easing adlarını çözmek için)
//
// İlerleme / anahtarlar
//   MH.p(T, t0, dur)                   ham yerel ilerleme 0..1 (animasyona doğrudan verilmez; doğrusal)
//   MH.pAB(T, a, b)                    a..b aralığında ilerleme (b ≤ a → basamak)
//   MH.e(ease, T, t0, dur)             eased ilerleme (ease fonksiyon ya da ad)
//   MH.tween(T, base, startMs, durMs, from, to, ease)   cue'ya göre ms ofsetli ara değer (ease ZORUNLU)
//   MH.keys.linear(T, keys, ease?)     [[t, v], …] parça parça (kaynak track) · MH.keys.catmull(T, keys) hız sürekli Hermite
//   MH.keys.monotone(T, keys)          Fritsch–Carlson monoton kübik: aşma yok, düz anahtar çiftinde hız 0 (kamera için önerilir)
//   MH.keys.log(T, keys, interp?)      değerin ln'i üzerinden (ölçek/zoom: büyük oranda düzgün hız)
//   MH.typed(text, T, t0, cps)         daktilo: T anında görünen alt dizi (kendi saati yok)
//   MH.osc(T, scale, terms)            (Σ sin(T·f + φ)·w)·scale — terms [[w, f(rad/s), φ], …]
//
// Zaman haritası (tahtaların temeli: bir sahne bileşeni, çok tahta)
//   MH.time.resolve(Tc, fps?, pure?)   sayfa zamanı → {T (tasarım), Tc, dt, frame, fps, mode: 'page'|'tmap'|'amap'}
//        MH_TMAP=[t0,t1,…]: kare k → an (look / storyboard / karşılaştırma) · MH_TMAP_AUDIO=1: TMAP değerleri ses zamanında
//        MH_VARS=[{t, v:{shot:'b'}, l}]: kare başı varyant (window.MH_VAR yazılır; MH_TMAP yoksa t'ler zaman haritası olur)
//        MH_T0: sayfa ofseti (perde sayfası) · ses eşlemi kuruluysa T = a2d(Tc + T0), dt eşlem hızıyla
//        pure=false iken window.MH_DT (ve geriye uyum FX_DT) = kare başı tasarım süresi (hareket bulanıklığı)
//   MH.time.pageT(i, fps?)             sayfa karesi i → [T, dt] (kancalar için; yan etkisiz)
//   MH.time.toPage(T)                  tasarım anı → sayfa anı (ses eşlemi ve T0 hesaba katılır)
//   MH.time.continuous(T, offset)      perde sınırında kopmayan sürekli saat (drift, ışık nefesi, gren)
//   MH.useT()                          React kancası: useComposition() + resolve → {T, Tc, dt, frame, fps, mode, time, duration, cc}
//
// Ses ↔ tasarım zamanı eşlemi (üretici: motion-render amap build)
//   MH.audio.build(A)                  A = {step, x0?, d:[Δ…], m?:[eğim…], bounds?:[[τ, t]…], ident?} → {a2d(t), d2a(τ), pageT(i, fps)}
//                                      d2a(τ) = τ + Δ(τ) (C¹ Hermite), a2d ikiye bölme; t ≤ ident → birebir (bit-aynı kare)
//   MH.audio.install(A) · MH.audio.current()   kurulu eşlem. Öncelik: install() → sayfadaki üretilmiş eşlem işlevleri
//                                      (motion-render amap build: window.motionA2D / motionD2A, MOTION_T0) → window.MH_AMAP ‖ MOTION_AMAP verisi
//
// İkincil hareket (ölçülebilir mikro hareket; sayılar world'den)
//   MH.settle(T, tLand, amp, dur)      oturma aşması amp·sin(πu)(1−u)
//   MH.nudge(T, hits, amp, o)          darbe itmesi; hits [t | [t, açı°]]; o = {win, decay, period} → {dx, dy} (faz 0 = hız darbesi)
//   MH.vib(T, tLand, amp, o)           sönümlü titreşim; o = {win, decay, period}
//   MH.breath(T, amp, period, phase)   ışık nefesi çarpanı 1 + amp·sin(2πT/period + φ)
//   MH.drift(T, k, spec)               kamera drift'i {dx, dy, rz}; spec = {x:[ölçek, terms], y:[…], rz:[…]} (world dalgası)
//
// Kamera
//   MH.cam.at(T, keys, o)              keys [[t, {x,y,d,rx,ry,rz}], …] → c; o = {interp:'monotone'|'catmull'|'linear', drift:{k, spec}, persp}
//   MH.cam.project(c, wx, wy, wz, o?)  dünya noktası → ekran {x, y, k}; MHCam ile aynı matematik (o.persp ‖ c.persp ZORUNLU)
//   MH.cam.layerScale(z, persp) · MH.cam.layerPt(L, wx, wy, persp) · MH.cam.dof(z, f, k, max)
//   MH.cam.dollyFromScale(k, persp)    ölçek k için dolly d = persp·(1 − 1/k)
//   MH.cam.motion(camAt, T, dt, o?)    kare başı ekran hareketi {vx, vy, m}: 5×3 dünya noktası (tuvalin 19/96 × 5/18 aralığı)
//   <MHCam c persp w? h? name?>        CSS 3B kamera: perspektif + dolly d + tilt rx + orbit ry + roll rz; dünya (c.x, c.y) kare merkezinde
//   <MHLayer z persp o? keepSize? blur? name? digits?>   sabit çapalı derinlik katmanı (ölçek telafisi (persp−z)/persp)
//
// Çizgi / metin ölçümü
//   MH.poly.len(pts) · d(pts) · at(pts, u) · upTo(pts, frac)
//   MH.measureText(font, text)         canvas genişliği (önbelleksiz: font yüklenince değişir, tuzak t-04)
//   MH.textWidth(text, size, family, weight, trackEm)   izli genişlik (aile/ağırlık ZORUNLU)
//   MH.capMetrics(size, family, weight, fallback?)      satır yüksekliği 1 kutusunda [büyük harf üstü, taban] (ölçülemezse fallback oranı)
//
// Modlar (tahta / ölçüm anahtarları)
//   MH.mode.key() MH_KEY · card() MH_CARD · inkMask() MH_INKMASK · hide() MH_HIDE seçicisi · prof(ad) MH_PROF içerir mi ·
//   noBake() MH_NOBAKE · expoPost() MH_EXPO_POST
//   MH.variant(table, shot, pick)      varyant okuma: window.MH_VAR[shot] → pick[shot] → 'a'
//   <MHModeStyles root>                MH_INKMASK (yalnız [data-hero] beyaz zeminde) ve MH_HIDE stil kuralları, root seçicisi altında
//
// Varlık kaydı (üretken / plaka; sahne yalnız id bilir)
//   MH.asset(id) (window.GEN_ASSETS) · MH.assetSrc(a, k?) (GEN_BASE, kare dizisi %05d) · MH.assetMissing(id) (window.__genMissing)
//   <MHAssetTexture id frame? size? pos? blend? opacity? filter? placeholder?>   placeholder = CSS background dizgesi (world verir)
//
// Pişirme (ağır SVG süzgecini durağan içerikte bir kez PNG'ye basma)
//   MH.bake.sig(node) · hash(str) · state · settle()  — window.__fxBakeSettle = MH.bake.settle (CONTRACT §5)
//   <MHBakeSvg bake prims width height style? clip? dc? dfx? off?>   prims: süzgeç ilkelleri (world) · bake: örnek başına tekil kimlik
//
// Sarmalayıcılar
//   <MHMoBlur v={vx,vy} shutter minPx id? pad? off?>   kamera hareket bulanıklığı (shutter° / 360 · |v|, |v| > minPx)
//   <MHDirBlur id x y>                 yönlü bulanıklık süzgeci tanımı · <MHLit kb>  çarpımsal ışık (brightness)
//   <MHDesignSpace w h>                tasarım uzayını (w×h) Stage'e sığdırır ve MH.setCanvas(w, h) yapar
//
// Kancalar (CONTRACT §5; kanca yoksa ölçüm "ölçülemedi" UYARI'sına düşer). Bütün geometri STAGE pikselinde döner (ekran px;
// sahne tasarım uzayında çiziyorsa MH.toStage ile çevrilir) — araçlar kareyi scenes.json width×height'ta ölçer.
//   MH.hooks.camSpeed(camAt, o)        window.__camSpeed(fps, n): kare başı kamera ekran hızı (px/kare)
//   MH.hooks.camK(kFn, o)              window.__camK(fps, n): kare başı kamera ölçeği k
//   MH.hooks.boxes(fn)                 window.__boxes(t) → fn(T tasarım, t sayfa): [{name, rect:[x,y,w,h]|poly, z, kind, px}]  (px = metnin ekran yüksekliği; frame-check framing okur)
//   MH.hooks.tools(fn) · glyphs(fn)    window.__tools(t) / __glyphs(t) (aynı zaman dönüşümüyle)
//   MH.hooks.holds(list|fn) · events(list|fn)   window.__holds() / __events(): tasarım anları sayfa zamanına çevrilir
//   MH.hooks.accentExclude(fn, o)      window.__redExclude(fps, n): kare başı izinli aksan kutuları [[x0, y0, x1, y1], …] (fn tasarım px döner)
//   MH.hooks.probeInfo(fn) · MH.hooks.set(ad, fn) · MH.hooks.list()
// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────

var MH = {};
MH.version = '1.0.0';
MH.DEFAULT_FPS = 60;

var MH_S = { stage: null, canvas: null, design: null, fps: 0, warned: {} };

function mhNum(v) { var n = +v; return isFinite(n) && n > 0 ? n : 0; }
function mhWarn(key, msg) { if (MH_S.warned[key]) return; MH_S.warned[key] = 1; console.warn('[MH] ' + msg); }

// ── bağlam ─────────────────────────────────────────────────────────────────────────────────────────────────────
var MH_PFX = ['MH_', 'MOTION_', 'FX_'];
MH.key = function (name) { for (var i = 0; i < MH_PFX.length; i++) { var v = window[MH_PFX[i] + name]; if (v !== undefined) return v; } return undefined; };
MH.fps = function () { return mhNum(window.FX_FPS) || mhNum(window.MH_FPS) || MH_S.fps || MH.DEFAULT_FPS; };
MH.setStage = function (w, h, fps) { MH_S.stage = { w: +w, h: +h }; if (mhNum(fps)) MH_S.fps = +fps; return MH_S.stage; };
MH.stage = function (props) {
  if (MH_S.stage) return MH_S.stage;
  if (props && mhNum(props.width) && mhNum(props.height)) return { w: +props.width, h: +props.height };
  var s = window.MH_STAGE; if (s && mhNum(s.w) && mhNum(s.h)) return { w: +s.w, h: +s.h };
  return { w: window.innerWidth || 0, h: window.innerHeight || 0 };
};
MH.setCanvas = function (w, h) { MH_S.canvas = { w: +w, h: +h }; return MH_S.canvas; };
MH.canvas = function () { return MH_S.canvas || MH.stage(); };
MH.design = function () { return MH_S.design || { s: 1, x: 0, y: 0 }; };
var MH_GEO = { rect: 'rect', box: 'rect', poly: 'poly', pts: 'poly', tip: 'pt', size: 'len' };
MH.toStage = function toStage(o) {
  var d = MH.design(), pt = function (q) { return [q[0] * d.s + d.x, q[1] * d.s + d.y]; };
  if (d.s === 1 && !d.x && !d.y) return o;
  if (Array.isArray(o)) return o.map(toStage);
  if (!o || typeof o !== 'object') return o;
  var out = {};
  for (var k in o) {
    var v = o[k], g = MH_GEO[k];
    if (g === 'rect' && Array.isArray(v) && Array.isArray(v[0])) out[k] = v.map(pt);
    else if (g === 'rect' && Array.isArray(v) && v.length === 4) out[k] = [v[0] * d.s + d.x, v[1] * d.s + d.y, v[2] * d.s, v[3] * d.s];
    else if (g === 'poly' && Array.isArray(v)) out[k] = v.map(pt);
    else if (g === 'pt' && Array.isArray(v)) out[k] = pt(v);
    else if (g === 'len' && typeof v === 'number') out[k] = v * d.s;
    else out[k] = v && typeof v === 'object' ? toStage(v) : v;
  }
  return out;
};
MH.frame = function (T, fps) { return Math.floor(T * (fps || MH.fps()) + 1e-6); };
MH.grainSeed = function (T, rate, eps) { return Math.floor(T * (rate || MH.fps()) + (eps || 0)) % 997 + 1; };

// ── matematik / renk ───────────────────────────────────────────────────────────────────────────────────────────
MH.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
MH.mix = function (a, b, t) { return a + (b - a) * t; };
MH.smoothstep = function (a, b, x) { var u = MH.clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
MH.rgb = function (c) {
  c = String(c).trim();
  if (c[0] === '#') { var h = c.slice(1); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; var n = parseInt(h.slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  var m = c.match(/[\d.]+/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2]];
};
MH.rgba = function (c, a) { var q = MH.rgb(c); return 'rgba(' + q[0] + ',' + q[1] + ',' + q[2] + ',' + a + ')'; };
MH.mixColor = function (a, b, t) {
  if (t <= 0) return a; if (t >= 1) return b;
  var A = MH.rgb(a), B = MH.rgb(b);
  return 'rgb(' + Math.round(MH.mix(A[0], B[0], t)) + ',' + Math.round(MH.mix(A[1], B[1], t)) + ',' + Math.round(MH.mix(A[2], B[2], t)) + ')';
};
MH.scaleColor = function (c, k) { return 'rgb(' + MH.rgb(c).map(function (v) { return Math.round(v * k); }).join(',') + ')'; };
MH.rng = function (seed) {   // kaynak kit rnd ile aynı LCG
  var s = (seed * 2654435761) % 4294967296;
  return function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
};
MH.rngSpaced = function (k) { var r = MH.rng(811 + 131 * k); r(); r(); return r; };   // t-31: ardışık tohumlar korelasyonlu

// ── easing ─────────────────────────────────────────────────────────────────────────────────────────────────────
function mhBezier(x1, y1, x2, y2) {   // kübik bezier zaman eğrisi (Newton, 8 adım) — kaynak bez() ile sayısal olarak aynı
  function A(a, b) { return 1 - 3 * b + 3 * a; }
  function B(a, b) { return 3 * b - 6 * a; }
  function C(a) { return 3 * a; }
  function calc(t, a, b) { return ((A(a, b) * t + B(a, b)) * t + C(a)) * t; }
  function slope(t, a, b) { return 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a); }
  return function (x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var t = x;
    for (var i = 0; i < 8; i++) {
      var s = slope(t, x1, x2);
      if (Math.abs(s) < 1e-6) break;
      t -= (calc(t, x1, x2) - x) / s;
      if (t < 0) t = 0; else if (t > 1) t = 1;
    }
    return calc(t, y1, y2);
  };
}
function mhC01(u) { return Math.max(0, Math.min(1, u)); }
MH.ease = {
  linear: function (x) { return x; },
  bezier: mhBezier,
  in2: function (u) { u = mhC01(u); return u * u; },
  out2: function (u) { u = mhC01(u); return 1 - (1 - u) * (1 - u); },
  inOut2: function (u) { u = mhC01(u); return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; },
  in3: function (u) { u = mhC01(u); return u * u * u; },
  out3: function (u) { u = mhC01(u); return 1 - Math.pow(1 - u, 3); },
  inOut3: function (u) { u = mhC01(u); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; },
  in4: function (u) { u = mhC01(u); return u * u * u * u; },
  out4: function (u) { u = mhC01(u); return 1 - Math.pow(1 - u, 4); },
  inOut4: function (u) { u = mhC01(u); return u < 0.5 ? 8 * u * u * u * u : 1 - Math.pow(-2 * u + 2, 4) / 2; },
  inSine: function (u) { u = mhC01(u); return 1 - Math.cos(Math.PI * u / 2); },
  outSine: function (u) { u = mhC01(u); return Math.sin(Math.PI * u / 2); },
  sine: function (u) { u = mhC01(u); return 0.5 - 0.5 * Math.cos(Math.PI * u); },
  inExpo: function (u) { u = mhC01(u); return u === 0 ? 0 : Math.pow(2, 10 * u - 10); },
  outExpo: function (u) { u = mhC01(u); return u === 1 ? 1 : 1 - Math.pow(2, -10 * u); },
  outBack: function (s) { s = s == null ? 1.70158 : s; return function (u) { u = mhC01(u); var c3 = s + 1; return 1 + c3 * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2); }; },
  // adlı eğriler (kütüphane): rolü addan okunur; hangisinin kullanılacağına world karar verir
  enter: mhBezier(0.22, 1, 0.36, 1),
  exit: mhBezier(0.4, 0, 1, 1),
  pop: mhBezier(0.34, 1.4, 0.64, 1),
  morph: mhBezier(0.4, 0, 0.2, 1),
  gravity: mhBezier(0.5, 0, 0.9, 0.4),
  collapse: mhBezier(0.7, 0, 0.3, 1),
  smooth: mhBezier(0.4, 0, 0.6, 1),
};
MH.ease.inOutSine = MH.ease.sine;
MH.ease.io3 = MH.ease.inOut3; MH.ease.o3 = MH.ease.out3; MH.ease.i3 = MH.ease.in3; MH.ease.sio = MH.ease.sine;
MH.ease.get = function (e) {
  if (typeof e === 'function') return e;
  var s = String(e || '').trim(), m = s.match(/^bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)$/);
  if (m) return mhBezier(+m[1], +m[2], +m[3], +m[4]);
  var f = MH.ease[s];
  if (typeof f !== 'function' || s === 'get' || s === 'bezier' || s === 'outBack') throw new Error('[MH] ease.get: bilinmeyen eğri "' + s + '"');
  return f;
};

// ── ilerleme / anahtarlar ──────────────────────────────────────────────────────────────────────────────────────
MH.p = function (T, t0, dur) { return MH.clamp((T - t0) / dur, 0, 1); };
MH.pAB = function (T, a, b) { return b <= a ? (T >= b ? 1 : 0) : MH.clamp((T - a) / (b - a), 0, 1); };
MH.e = function (ease, T, t0, dur) { return MH.ease.get(ease)(MH.p(T, t0, dur)); };
MH.tween = function (T, base, startMs, durMs, from, to, ease) {
  if (!ease) mhWarn('tween', 'tween: ease verilmedi (doğrusal kullanıldı) — eğriyi world seçer');
  var s = (base || 0) + startMs / 1000, e = s + durMs / 1000;
  if (!(T > s)) return from;
  if (T >= e) return to;
  return from + (to - from) * (ease ? MH.ease.get(ease) : MH.ease.linear)((T - s) / (e - s));
};
MH.keys = {
  linear: function (T, keys, ease) {   // kaynak track(): duraksama için aynı değeri iki kez yaz
    if (T <= keys[0][0]) return keys[0][1];
    for (var i = 1; i < keys.length; i++) {
      if (T <= keys[i][0]) {
        var a = keys[i - 1], b = keys[i];
        if (b[0] <= a[0]) return b[1];
        return a[1] + (b[1] - a[1]) * (ease ? MH.ease.get(ease) : MH.ease.linear)((T - a[0]) / (b[0] - a[0]));
      }
    }
    return keys[keys.length - 1][1];
  },
  catmull: function (T, keys) {   // eşit olmayan zamanlı Hermite, sonlu fark eğimleri: hız sürekli (aşabilir)
    var n = keys.length; if (n === 1 || T <= keys[0][0]) return keys[0][1]; if (T >= keys[n - 1][0]) return keys[n - 1][1];
    var i = 0; while (i < n - 2 && T > keys[i + 1][0]) i++;
    var t0 = keys[i][0], t1 = keys[i + 1][0], v0 = keys[i][1], v1 = keys[i + 1][1], h = t1 - t0, u = (T - t0) / h;
    var m = function (k) { var a = keys[Math.max(0, k - 1)], b = keys[Math.min(n - 1, k + 1)]; return (b[1] - a[1]) / (b[0] - a[0]); };
    var m0 = m(i), m1 = m(i + 1), u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * h * m0 + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * h * m1;
  },
  monotone: function (T, keys) {   // Fritsch–Carlson: aşma yok; ara anahtarda yön değişirse o bileşenin hızı 0 olur (C49)
    var n = keys.length; if (n === 1 || T <= keys[0][0]) return keys[0][1]; if (T >= keys[n - 1][0]) return keys[n - 1][1];
    var h = [], d = [], m = [], k;
    for (k = 0; k < n - 1; k++) { h.push(keys[k + 1][0] - keys[k][0]); d.push((keys[k + 1][1] - keys[k][1]) / h[k]); }
    m.push(d[0]);
    for (k = 1; k < n - 1; k++) m.push(d[k - 1] * d[k] <= 0 ? 0 : (3 * (h[k - 1] + h[k])) / ((2 * h[k] + h[k - 1]) / d[k - 1] + (h[k] + 2 * h[k - 1]) / d[k]));
    m.push(d[n - 2]);
    var i = 0; while (i < n - 2 && T > keys[i + 1][0]) i++;
    var u = (T - keys[i][0]) / h[i], u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * keys[i][1] + (u3 - 2 * u2 + u) * h[i] * m[i] + (-2 * u3 + 3 * u2) * keys[i + 1][1] + (u3 - u2) * h[i] * m[i + 1];
  },
  log: function (T, keys, interp) {   // ölçek anahtarları: ln k üzerinden; kamera için d = dollyFromScale(k, persp)
    var f = MH.keys[interp || 'monotone'];
    return Math.exp(f(T, keys.map(function (q) { return [q[0], Math.log(q[1])]; })));
  },
};
MH.typed = function (text, T, t0, cps) {
  if (!(cps > 0)) throw new Error('[MH] typed: cps (harf/s) gerekli');
  var n = Math.floor((T - t0) * cps + 1e-6);
  return n <= 0 ? '' : text.slice(0, Math.min(text.length, n));
};
MH.osc = function (T, scale, terms) {
  var s = 0; for (var i = 0; i < terms.length; i++) { var q = terms[i]; s += Math.sin(T * q[1] + (q[2] || 0)) * q[0]; }
  return s * scale;
};

// ── zaman haritası / ses eşlemi ────────────────────────────────────────────────────────────────────────────────
MH.audio = {
  _cur: null, _src: null,
  build: function (A) {
    if (!A || !A.d || !(A.step > 0)) throw new Error('[MH] audio.build: {step, d[]} gerekli');
    var st = A.step, y = A.d, N = y.length, x0 = A.x0 || 0, m = A.m, maxAbs = 0, i;
    if (!m || m.length !== N) {   // eğim yoksa merkezi fark (uçlarda tek yönlü)
      m = []; for (i = 0; i < N; i++) m.push(N < 2 ? 0 : i === 0 ? (y[1] - y[0]) / st : i === N - 1 ? (y[N - 1] - y[N - 2]) / st : (y[i + 1] - y[i - 1]) / (2 * st));
    }
    for (i = 0; i < N; i++) maxAbs = Math.max(maxAbs, Math.abs(y[i]));
    var D = function (v) {
      v -= x0;
      if (v <= 0) return y[0];
      if (v >= (N - 1) * st) return y[N - 1];
      var k = Math.min(N - 2, Math.floor(v / st + 1e-9)), u = (v - k * st) / st, u2 = u * u, u3 = u2 * u;
      return (2 * u3 - 3 * u2 + 1) * y[k] + (u3 - 2 * u2 + u) * st * m[k] + (-2 * u3 + 3 * u2) * y[k + 1] + (u3 - u2) * st * m[k + 1];
    };
    var d2a = function (tau) { return tau + D(tau); };
    var a2d = function (t) {
      if (A.ident != null && t <= A.ident) return t;   // birebir aralık: 1e-9 yuvarlaması bile kareyi değiştirir (C70)
      var b = A.bounds || [];
      for (var j = 0; j < b.length; j++) if (Math.abs(t - b[j][1]) < 1e-9) return b[j][0];   // sınır anı tam
      var R = maxAbs + 1, lo = t - R, hi = t + R;
      for (var k = 0; k < 60; k++) { var mid = (lo + hi) / 2; if (d2a(mid) < t) lo = mid; else hi = mid; }
      return Math.round((lo + hi) / 2 * 1e9) / 1e9;
    };
    var pageT = function (i, fps) { var t0 = +MH.key('T0') || 0, T = a2d(t0 + i / fps); return [T, T - a2d(t0 + (i - 1) / fps)]; };
    return { a2d: a2d, d2a: d2a, pageT: pageT, src: A };
  },
  _manual: false, _ext: null,
  install: function (A, manual) { MH.audio._cur = A ? MH.audio.build(A) : null; MH.audio._src = A || null; if (manual !== false) MH.audio._manual = !!A; return MH.audio._cur; },
  current: function () {
    if (MH.audio._manual) return MH.audio._cur;
    var fa = window.motionA2D, fd = window.motionD2A;
    if (typeof fa === 'function' && typeof fd === 'function') {   // üretilmiş eşlem (keep / sınır kuralları dahil) yetkilidir
      if (!MH.audio._ext || MH.audio._ext.a2d !== fa || MH.audio._ext.d2a !== fd) MH.audio._ext = { a2d: fa, d2a: fd, pageT: function (i, fps) { var t0 = +MH.key('T0') || 0, T = fa(t0 + i / fps); return [T, T - fa(t0 + (i - 1) / fps)]; }, src: 'page' };
      return MH.audio._ext;
    }
    var A = window.MH_AMAP || window.MOTION_AMAP;
    if (A && A !== MH.audio._src) MH.audio.install(A, false);
    return A ? MH.audio._cur : null;
  },
};

MH.time = {
  resolve: function (Tc, fps, pure) {
    fps = fps || MH.fps();
    var k = MH.frame(Tc, fps), map = MH.key('TMAP'), vars = MH.key('VARS'), T, dt = 1 / fps, mode = 'page', A = MH.audio.current();
    if (!(Array.isArray(map) && map.length) && Array.isArray(vars) && vars.length && vars[0] && vars[0].t != null) map = vars.map(function (q) { return q.t; });
    if (Array.isArray(map) && map.length) {
      T = +map[Math.min(map.length - 1, Math.max(0, k))]; mode = 'tmap';
      if (MH.key('TMAP_AUDIO') && A) T = A.a2d(T);
    } else {
      var tA = Tc + (+MH.key('T0') || 0);
      if (A) { T = A.a2d(tA); dt = T - A.a2d(tA - 1 / fps); mode = 'amap'; } else T = tA;
    }
    if (!pure) {
      if (Array.isArray(vars) && vars.length) { var vk = vars[Math.min(vars.length - 1, Math.max(0, k))]; window.MH_VAR = (vk && vk.v) || {}; }
      window.MH_DT = dt; window.FX_DT = dt;
    }
    return { T: T, Tc: Tc, dt: dt, frame: k, fps: fps, mode: mode };
  },
  pageT: function (i, fps) { fps = fps || MH.fps(); var r = MH.time.resolve(i / fps, fps, true); return [r.T, r.dt]; },
  toPage: function (T) { var A = MH.audio.current(), t = A ? A.d2a(T) : T; return t - (+MH.key('T0') || 0); },
  continuous: function (T, offset) { return T + (offset || 0); },
};
MH.useT = function () {
  if (typeof window.useComposition !== 'function') throw new Error('[MH] useT: useComposition yok (motion-stage.jsx motion-core.jsx\'ten önce yüklenmeli)');
  var cc = window.useComposition(), r = MH.time.resolve(cc.T);
  r.time = cc.time; r.duration = cc.duration; r.cc = cc;
  return r;
};

// ── ikincil hareket ────────────────────────────────────────────────────────────────────────────────────────────
MH.settle = function (T, tLand, amp, dur) {
  if (!amp || !(dur > 0) || tLand == null) return 0;
  var u = (T - tLand) / dur; if (u <= 0 || u >= 1) return 0;
  return amp * Math.sin(Math.PI * u) * (1 - u);
};
MH.nudge = function (T, hits, amp, o) {
  var dx = 0, dy = 0; o = o || {};
  if (!amp || !(o.win > 0) || !(o.decay > 0) || !(o.period > 0)) return { dx: 0, dy: 0 };
  (hits || []).forEach(function (h) {
    var t = h.length ? h[0] : h, a = (h.length ? h[1] : 90) * Math.PI / 180, u = T - t;
    if (u <= 0 || u > o.win) return;
    var k = amp * Math.exp(-u / o.decay) * Math.sin(2 * Math.PI * u / o.period);
    dx += Math.cos(a) * k; dy += Math.sin(a) * k;
  });
  return { dx: dx, dy: dy };
};
MH.vib = function (T, tLand, amp, o) {
  o = o || {}; var u = T - tLand;
  if (!amp || tLand == null || !(o.win > 0) || u <= 0 || u > o.win) return 0;
  return amp * Math.exp(-u / o.decay) * Math.sin(2 * Math.PI * u / o.period);
};
MH.breath = function (T, amp, period, phase) { return amp && period > 0 ? 1 + amp * Math.sin(T * 2 * Math.PI / period + (phase || 0)) : 1; };
MH.drift = function (T, k, spec) {
  if (!spec || !k) return { dx: 0, dy: 0, rz: 0 };
  var f = function (ch) { return ch ? MH.osc(T, ch[0], ch[1]) * k : 0; };
  return { dx: f(spec.x), dy: f(spec.y), rz: f(spec.rz) };
};

// ── kamera ─────────────────────────────────────────────────────────────────────────────────────────────────────
var MH_CH = ['x', 'y', 'd', 'rx', 'ry', 'rz'];
function mhPersp(c, o) { var p = (o && o.persp) || (c && c.persp); if (!(p > 0)) throw new Error('[MH] kamera: persp (perspektif px) gerekli — world verir'); return p; }
MH.cam = {
  at: function (T, keys, o) {
    o = o || {}; var f = MH.keys[o.interp || 'monotone'], c = {};
    MH_CH.forEach(function (ch) { c[ch] = f(T, keys.map(function (q) { return [q[0], q[1][ch] || 0]; })); });
    if (o.drift && o.drift.spec) { var dr = MH.drift(T, o.drift.k == null ? 1 : o.drift.k, o.drift.spec); c.x -= dr.dx; c.y -= dr.dy; c.rz += dr.rz; }
    if (o.persp) c.persp = o.persp;
    return c;
  },
  project: function (c, wx, wy, wz, o) {
    var PR = mhPersp(c, o), cv = (o && o.w) ? { w: o.w, h: o.h } : MH.canvas();
    var x = wx - c.x, y = wy - c.y, z = wz || 0, R = Math.PI / 180;
    var a = (c.rz || 0) * R, x1 = x * Math.cos(a) - y * Math.sin(a), y1 = x * Math.sin(a) + y * Math.cos(a);
    var b = (c.ry || 0) * R, x2 = x1 * Math.cos(b) + z * Math.sin(b), z2 = -x1 * Math.sin(b) + z * Math.cos(b);
    var g = (c.rx || 0) * R, y3 = y1 * Math.cos(g) - z2 * Math.sin(g), z3 = y1 * Math.sin(g) + z2 * Math.cos(g);
    var k = PR / (PR - (z3 + (c.d || 0)));
    return { x: cv.w / 2 + x2 * k, y: cv.h / 2 + y3 * k, k: k };
  },
  layerScale: function (z, persp) { return (persp - (z || 0)) / persp; },
  layerPt: function (L, wx, wy, persp) {
    var cv = MH.canvas(), z = L.z || 0, s = (persp - z) / persp, o = L.o || [cv.w / 2, cv.h / 2];
    return [o[0] + (wx - o[0]) * s, o[1] + (wy - o[1]) * s, z];
  },
  dof: function (z, f, k, max) { return Math.min(max, Math.abs(z - (f || 0)) * k); },
  dollyFromScale: function (k, persp) { return persp * (1 - 1 / k); },
  motion: function (camAt, T, dt, o) {
    o = o || {}; var cv = MH.canvas(), c0 = camAt(T - dt), c1 = camAt(T), sx = 0, sy = 0, sm = 0, n = 0, z = o.z || 0;
    var nx = o.nx || 5, ny = o.ny || 3, gx0 = (nx - 1) / 2, gy0 = (ny - 1) / 2;
    for (var i = 0; i < nx; i++) for (var j = 0; j < ny; j++) {
      var wx = c0.x + (i - gx0) * cv.w * 19 / 96, wy = c0.y + (j - gy0) * cv.h * 5 / 18;
      var a = MH.cam.project(c0, wx, wy, z, o), b = MH.cam.project(c1, wx, wy, z, o);
      sx += b.x - a.x; sy += b.y - a.y; sm += Math.hypot(b.x - a.x, b.y - a.y); n++;
    }
    return { vx: sx / n, vy: sy / n, m: sm / n };
  },
};
function MHCam(p) {
  var c = p.c, cv = MH.canvas(), w = p.w || cv.w, h = p.h || cv.h, persp = mhPersp(c, p), cx = w / 2, cy = h / 2;
  return (
    <div data-fx={p.name || 'cam'} style={{ position: 'absolute', inset: 0, perspective: persp + 'px', perspectiveOrigin: cx + 'px ' + cy + 'px', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transformStyle: 'preserve-3d', transformOrigin: cx + 'px ' + cy + 'px',
        transform: 'translate3d(0px,0px,' + (c.d || 0).toFixed(2) + 'px) rotateX(' + (c.rx || 0).toFixed(3) + 'deg) rotateY(' + (c.ry || 0).toFixed(3) + 'deg) rotateZ(' + (c.rz || 0).toFixed(3) + 'deg) translate3d(' + (cx - c.x).toFixed(2) + 'px,' + (cy - c.y).toFixed(2) + 'px,0px)' }}>
        {p.children}
      </div>
    </div>
  );
}
function MHLayer(p) {
  var cv = MH.canvas(), w = p.w || cv.w, h = p.h || cv.h, persp = p.persp;
  if (!(persp > 0)) throw new Error('[MH] MHLayer: persp gerekli');
  var z = p.z || 0, s = p.keepSize === false ? 1 : (persp - z) / persp, o = p.o || [w / 2, h / 2], b = p.blur || 0;
  return <div data-fx={p.name || 'layer'} data-z={z} style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transformStyle: b > 0.05 ? 'flat' : 'preserve-3d', transformOrigin: o[0] + 'px ' + o[1] + 'px',
    transform: 'translateZ(' + z + 'px) scale(' + s.toFixed(p.digits || 5) + ')', filter: b > 0.05 ? 'blur(' + b.toFixed(2) + 'px)' : undefined, pointerEvents: 'none' }}>{p.children}</div>;
}

// ── çizgi / metin ölçümü ───────────────────────────────────────────────────────────────────────────────────────
MH.poly = {
  len: function (pts) { var L = 0; for (var i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; },
  d: function (pts) { return pts.map(function (q, i) { return (i ? 'L ' : 'M ') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' '); },
  at: function (pts, u) {
    var L = MH.poly.len(pts) * MH.clamp(u, 0, 1), a = 0;
    for (var i = 1; i < pts.length; i++) { var s = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (a + s >= L) { var k = s ? (L - a) / s : 0; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]; } a += s; }
    return pts[pts.length - 1];
  },
  upTo: function (pts, frac) {
    var L = MH.poly.len(pts) * frac, out = [pts[0]], acc = 0;
    for (var i = 1; i < pts.length; i++) {
      var d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc + d >= L) { var k = d ? (L - acc) / d : 0; out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]); return out; }
      acc += d; out.push(pts[i]);
    }
    return out;
  },
};
var MH_CV = null;
function mhCtx() { return MH_CV || (MH_CV = document.createElement('canvas').getContext('2d')); }
MH.measureText = function (font, text) { var c = mhCtx(); c.font = font; return c.measureText(text).width; };
MH.textWidth = function (text, size, family, weight, trackEm) {
  if (!family || weight == null) throw new Error('[MH] textWidth: family ve weight gerekli');
  return MH.measureText(weight + ' ' + size + 'px ' + family, text) + (trackEm || 0) * size * Math.max(0, text.length - 1);
};
MH.capMetrics = function (size, family, weight, fallback) {
  var c = mhCtx(); c.font = weight + ' ' + size + 'px ' + family;
  var m = c.measureText('H'), fa = m.fontBoundingBoxAscent, fd = m.fontBoundingBoxDescent;
  if (!(fa > 0)) return fallback ? [size * fallback[0], size * fallback[1]] : null;
  var base = (size - (fa + fd)) / 2 + fa; return [base - m.actualBoundingBoxAscent, base];
};

// ── modlar ─────────────────────────────────────────────────────────────────────────────────────────────────────
MH.mode = {
  key: function () { return !!MH.key('KEY'); },
  card: function () { return !!MH.key('CARD'); },
  inkMask: function () { return !!MH.key('INKMASK'); },
  hide: function () { return MH.key('HIDE') || ''; },
  prof: function (name) { return String(MH.key('PROF') || '').indexOf(name) >= 0; },
  noBake: function () { return !!MH.key('NOBAKE'); },
  expoPost: function () { return !!MH.key('EXPO_POST'); },
};
MH.variant = function (table, shot, pick) {
  var o = window.MH_VAR || {}, v = o[shot] || (pick && pick[shot]) || 'a', row = table[shot] || {};
  return row[v] || row.a;
};
function MHModeStyles(p) {
  var r = p.root, out = [];
  if (!r) throw new Error('[MH] MHModeStyles: root seçicisi gerekli');
  if (MH.mode.inkMask()) out.push(<style key="k1">{r + '{background:#fff !important} ' + r + ' *{visibility:hidden !important} ' + r + ' [data-hero],' + r + ' [data-hero] *{visibility:visible !important}'}</style>);
  if (MH.mode.hide()) out.push(<style key="hide">{MH.mode.hide() + '{display:none !important}'}</style>);
  return out.length ? out : null;
}

// ── varlık kaydı ───────────────────────────────────────────────────────────────────────────────────────────────
MH.asset = function (id) { return (window.GEN_ASSETS || {})[id] || null; };
MH.assetSrc = function (a, k) {
  if (!a) return null;
  var base = window.GEN_BASE || '';
  if (k != null && a.frames) { var i = Math.max(1, Math.min(a.n || 1, Math.floor(k) + 1)); return base + a.frames.replace('%05d', String(i).padStart(5, '0')); }
  return base + a.src;
};
MH.assetMissing = function (id) { (window.__genMissing = window.__genMissing || {})[id] = 1; };
function MHAssetTexture(p) {
  var a = MH.asset(p.id), src = MH.assetSrc(a, p.frame), o = p.opacity == null ? 1 : p.opacity;
  if (!src) {
    MH.assetMissing(p.id);
    return typeof p.placeholder === 'string' ? <div data-doku="1" style={{ position: 'absolute', inset: 0, opacity: o, mixBlendMode: p.blend || 'normal', background: p.placeholder }} /> : null;
  }
  return <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(' + src + ')', backgroundSize: p.size || 'cover', backgroundPosition: p.pos || '50% 50%',
    backgroundRepeat: 'no-repeat', mixBlendMode: p.blend || 'normal', opacity: o, filter: p.filter }} />;
}

// ── pişirme ────────────────────────────────────────────────────────────────────────────────────────────────────
// İçerik imzası (React ağacı → sig → hash) iki ardışık çizimde aynıysa (durağan) içerik + süzgeç bir kez SVG görseli → tuval → PNG
// olur; sonraki karelerde <img data-bake> çizilir (süzgeç yeniden hesaplanmaz). Canlanan içerik canlı kalır. Tuzak C1: imzalı içeriğe
// eklenen BOŞ koşullu çocuk (false) bile imzayı değiştirir — yeni öğeyi ayrı MHBakeSvg olarak ekle.
var MH_BAKE = { m: {}, last: {}, q: [], n: 0, hit: 0, live: 0, scale: +MH.key('BAKE_SCALE') || 1.5 };
MH.bake = {
  state: MH_BAKE,
  sig: function sig(n) {
    if (n == null || n === false || n === true) return '';
    if (typeof n === 'string' || typeof n === 'number') return String(n);
    if (Array.isArray(n)) return n.map(sig).filter(Boolean).join('|');
    if (n.props) {
      var t = typeof n.type === 'string' ? n.type : (n.type && (n.type.name || 'F')), s = '<' + t, pr = n.props;
      for (var k in pr) { if (k === 'children') continue; var v = pr[k]; s += ' ' + k + '=' + (v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v)); }
      return s + '>' + sig(pr.children) + '</>';
    }
    return '';
  },
  hash: function (str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < str.length; i++) { var c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36) + '.' + str.length;
  },
  settle: async function () {   // harness: bekleyen pişirmeler + <img data-bake> çözümü; true → kare aynı T'de yeniden çizilmeli
    var q = MH_BAKE.q.splice(0); if (q.length) await Promise.all(q);
    var im = [].slice.call(document.querySelectorAll('img[data-bake]')).filter(function (i) { return !i.complete || !i.naturalWidth; });
    if (im.length) await Promise.all(im.map(function (i) { return i.decode().catch(function () {}); }));
    return q.length > 0;
  },
};
var MH_DATAURL = {};
function mhDataUrl(u) {
  if (!MH_DATAURL[u]) MH_DATAURL[u] = fetch(u).then(function (r) { return r.blob(); }).then(function (b) { return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.readAsDataURL(b); }); });
  return MH_DATAURL[u];
}
async function mhBakeInline(s) {   // SVG görseli dış kaynak yüklemez: dış href'ler data URL olur
  var m = s.match(/(?:xlink:)?href="(?!#|data:|blob:)[^"]+"/g) || [], u = [];
  m.forEach(function (a) { var x = a.replace(/^(?:xlink:)?href="/, '').slice(0, -1); if (u.indexOf(x) < 0) u.push(x); });
  for (var i = 0; i < u.length; i++) { var d = await mhDataUrl(u[i].replace(/&amp;/g, '&')); s = s.split('"' + u[i] + '"').join('"' + d + '"'); }
  return s;
}
function mhBakeDefs(html, skip) {   // içerikte tanımlı olmayan url(#id) / href="#id" başvuruları belgeden alınır (desen, kırpma, süzgeç)
  var seen = {}, out = '', todo = [html]; seen[skip] = 1;
  while (todo.length) {
    var h = todo.pop(), re = /url\(#([^)"']+)\)|href="#([^"]+)"/g, m;
    while ((m = re.exec(h))) { var id = m[1] || m[2]; if (seen[id] || html.indexOf('id="' + id + '"') >= 0) continue; seen[id] = 1; var el = document.getElementById(id); if (!el) continue; var oh = el.outerHTML; todo.push(oh); out += oh; }
  }
  return out;
}
async function mhBakeRun(sig, el, fid, x, y, w, h, s) {
  try {
    var f = el.querySelector('filter'), fh = f ? f.outerHTML.replace(/<filter([^>]*)>/, function (m0, a) { return '<filter' + a.replace(/\s(x|y|width|height|filterUnits)="[^"]*"/g, '') + ' filterUnits="userSpaceOnUse" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '">'; }) : '';
    var body = el.innerHTML.replace(new RegExp('^<defs><filter id="' + fid + '"[\\s\\S]*?<\\/filter><\\/defs>'), '');
    var W = Math.max(1, Math.round(w * s)), H = Math.max(1, Math.round(h * s));
    var src = await mhBakeInline('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + W + '" height="' + H + '" viewBox="' + x + ' ' + y + ' ' + w + ' ' + h + '" preserveAspectRatio="none"><defs>' + fh + mhBakeDefs(body, fid) + '</defs><g filter="url(#' + fid + ')">' + body + '</g></svg>');
    var u0 = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' })), im = new Image(); im.src = u0; await im.decode();
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.getContext('2d').drawImage(im, 0, 0, W, H); URL.revokeObjectURL(u0);
    var blob = await new Promise(function (r) { cv.toBlob(r, 'image/png'); }), url = URL.createObjectURL(blob), im2 = new Image(); im2.src = url; await im2.decode();
    MH_BAKE.m[sig] = { url: url, x: x, y: y, w: w, h: h, s: s }; MH_BAKE.n++;
  } catch (e) { MH_BAKE.m[sig] = { no: String((e && e.message) || e) }; }
}
function mhBakeQueue(sig, el, fid, box) {
  if (MH_BAKE.m[sig]) return; MH_BAKE.m[sig] = { pending: 1 };
  var bb = box; if (!bb) { try { var g = el.getBBox(); bb = [g.x, g.y, g.width, g.height]; } catch (e) { bb = null; } }
  if (!bb || !(bb[2] > 0) || !(bb[3] > 0)) { MH_BAKE.m[sig] = { no: 'bbox' }; return; }
  var pad = box ? 0 : 14, x = Math.floor(bb[0] - pad), y = Math.floor(bb[1] - pad), w = Math.ceil(bb[2] + 2 * pad), h = Math.ceil(bb[3] + 2 * pad), s = Math.min(MH_BAKE.scale, Math.sqrt(40e6 / (w * h)));
  MH_BAKE.q.push(mhBakeRun(sig, el, fid, x, y, w, h, s));
}
function mhFilterRegion(el, fid) {   // canlı süzgeç bölgesi = içerik sınır kutusu + 16 (1×1 SVG'de bölge orijinden uzanır, tuzak C33)
  try {
    var b = el.getBBox(), f = el.querySelector('#' + fid), pd = 16; if (!f) return;
    f.setAttribute('x', (b.x - pd).toFixed(1)); f.setAttribute('y', (b.y - pd).toFixed(1)); f.setAttribute('width', (b.width + 2 * pd).toFixed(1)); f.setAttribute('height', (b.height + 2 * pd).toFixed(1));
  } catch (e) {}
}
function MHBakeSvg(p) {
  var st = Object.assign({ position: 'absolute', left: 0, top: 0, overflow: 'visible' }, p.style || {}), id = p.bake, wv = p.width || 1, hv = p.height || 1, cs = MH.bake.sig(p.children);
  if (!cs) return null;   // boş içerik: süzgeç bölgesi boşuna hesaplanmasın
  var prims = typeof p.prims === 'function' ? p.prims() : p.prims, pen = !!prims && !p.off;
  var on = !!id && pen && !MH.mode.noBake() && !MH.mode.key(), sig = on ? id + '#' + MH.bake.hash(cs + '|' + wv + 'x' + hv + '|' + st.overflow) : null, b = sig ? MH_BAKE.m[sig] : null;
  var poly = function (dx, dy) { return p.clip ? 'polygon(' + p.clip.map(function (q) { return (q[0] - dx).toFixed(1) + 'px ' + (q[1] - dy).toFixed(1) + 'px'; }).join(', ') + ')' : undefined; };
  if (b && b.url) { MH_BAKE.hit++; return <img data-bake={id} data-c={p.dc} data-fx={p.dfx} src={b.url} alt="" style={{ position: 'absolute', display: 'block', left: (st.left || 0) + b.x, top: (st.top || 0) + b.y, width: b.w, height: b.h, maxWidth: 'none', clipPath: poly(b.x, b.y) }} />; }
  var want = !!sig && !b && MH_BAKE.last[id] === sig; if (sig) MH_BAKE.last[id] = sig; MH_BAKE.live++;
  if (pen && !id) mhWarn('bake-id', 'MHBakeSvg: bake kimliği yok — kimliksiz örnekler aynı süzgeç kimliğini paylaşır ve kırpılır (her örneğe tekil bake)');
  var fid = (p.fidPrefix || 'mhp-') + String(id || 'x').replace(/[^A-Za-z0-9_-]/g, '_');
  return (
    <svg data-c={p.dc} data-fx={p.dfx} width={wv} height={hv} style={Object.assign({}, st, { filter: pen ? 'url(#' + fid + ')' : 'none', clipPath: poly(0, 0) })}
      ref={function (el) { if (!el) return; if (pen) mhFilterRegion(el, fid); if (want) mhBakeQueue(sig, el, fid, st.overflow === 'visible' ? null : [0, 0, wv, hv]); }}>
      {pen && <defs><filter id={fid} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">{prims}</filter></defs>}{p.children}
    </svg>
  );
}

// ── sarmalayıcılar ─────────────────────────────────────────────────────────────────────────────────────────────
function MHMoBlur(p) {   // yapı her karede aynı (açık/kapalı geçişinde alt ağaç yeniden kurulmaz); örnekler kaynağın ÜSTÜNE (kenar kararması yok, C37)
  var v = p.v || {}, vx = v.vx || 0, vy = v.vy || 0, d = Math.hypot(vx, vy), sh = +p.shutter || 0, min = +p.minPx || 0;
  var on = sh > 0 && d > min && !p.off && !MH.mode.key() && !MH.mode.prof('mblur');
  var L = on ? sh / 360 * d : 0, ux = d ? vx / d : 0, uy = d ? vy / d : 0, nT = L > 12 ? 9 : 5, sg = L / (2 * (nT - 1)), f = function (x) { return x.toFixed(2); };
  var cv = MH.canvas(), pad = p.pad == null ? 80 : p.pad, id = p.id || 'mhmb';
  return [
    <svg key="d" width="0" height="0" style={{ position: 'absolute', left: 0, top: 0 }} aria-hidden="true">{on && <defs><filter id={id} filterUnits="userSpaceOnUse" x={-pad} y={-pad} width={cv.w + 2 * pad} height={cv.h + 2 * pad} colorInterpolationFilters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation={f(sg * Math.abs(ux) + 0.01) + ' ' + f(sg * Math.abs(uy) + 0.01)} result="g" />
      {Array.from({ length: nT }).map(function (_, i) { var o = i / (nT - 1) - 0.5; return <feOffset key={'o' + i} in="g" dx={f(o * L * ux)} dy={f(o * L * uy)} result={'o' + i} />; })}
      {Array.from({ length: nT - 1 }).map(function (_, i) { var k = i + 2; return <feComposite key={'a' + k} in={i ? 'a' + (k - 1) : 'o0'} in2={'o' + (k - 1)} operator="arithmetic" k2={f((k - 1) / k)} k3={f(1 / k)} result={'a' + k} />; })}
      <feComposite in={'a' + nT} in2="SourceGraphic" operator="over" />
    </filter></defs>}</svg>,
    <div key="w" data-fx="mblur" data-mb={f(L)} style={{ position: 'absolute', inset: 0, filter: on ? 'url(#' + id + ')' : undefined }}>{p.children}</div>,
  ];
}
function MHDirBlur(p) {
  return <svg width="0" height="0" style={{ position: 'absolute' }}><filter id={p.id} x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation={(p.x || 0).toFixed(2) + ' ' + (p.y || 0).toFixed(2)} /></filter></svg>;
}
function MHLit(p) {   // okunacak metin taşıyan kahramanda ışık çarpımsal: screen ışık mürekkebin siyahını kaldırır (C86)
  return Math.abs(p.kb - 1) > 0.001 ? <div style={{ position: 'absolute', inset: 0, filter: 'brightness(' + p.kb.toFixed(4) + ')' }}>{p.children}</div> : p.children;
}
function MHDesignSpace(p) {
  var w = +p.w, h = +p.h; if (!(w > 0 && h > 0)) throw new Error('[MH] MHDesignSpace: w ve h gerekli');
  MH.setCanvas(w, h);
  var st = MH.stage(), s = Math.min(st.w / w, st.h / h) || 1, x = (st.w - w * s) / 2, y = (st.h - h * s) / 2, id = s === 1 && !x && !y;
  MH_S.design = { s: s, x: x, y: y };
  return <div data-mh="design" style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, overflow: 'hidden', transformOrigin: '0 0',
    transform: id ? undefined : 'translate(' + x.toFixed(3) + 'px,' + y.toFixed(3) + 'px) scale(' + s.toFixed(6) + ')' }}>{p.children}</div>;
}

// ── kancalar ───────────────────────────────────────────────────────────────────────────────────────────────────
var MH_HOOKS = {};
MH.hooks = {
  set: function (name, fn) { window[name] = fn; MH_HOOKS[name] = 1; return fn; },
  list: function () { return Object.keys(MH_HOOKS); },
  camSpeed: function (camAt, o) {   // o = {dur | frames, nx?, ny?, z?, persp?}
    o = o || {};
    return MH.hooks.set('__camSpeed', function (fps, n) {
      fps = +fps || MH.fps(); var N = +n || o.frames || Math.round((o.dur || 0) * fps), out = [];
      for (var i = 0; i < N; i++) { var q = MH.time.pageT(i, fps); out.push(i ? +(MH.cam.motion(camAt, q[0], q[1], o).m * MH.design().s).toFixed(3) : 0); }
      return out;
    });
  },
  camK: function (kFn, o) {
    o = o || {};
    return MH.hooks.set('__camK', function (fps, n) {
      fps = +fps || MH.fps(); var N = +n || o.frames || Math.round((o.dur || 0) * fps), out = [];
      for (var i = 0; i < N; i++) out.push(+(+kFn(MH.time.pageT(i, fps)[0])).toFixed(4));
      return out;
    });
  },
  boxes: function (fn) { return MH.hooks.set('__boxes', function (t) { return MH.toStage(fn(MH.time.resolve(+t || 0, null, true).T, t)); }); },
  tools: function (fn) { return MH.hooks.set('__tools', function (t) { return MH.toStage(fn(MH.time.resolve(+t || 0, null, true).T, t)); }); },
  glyphs: function (fn) { return MH.hooks.set('__glyphs', function (t) { return MH.toStage(fn(MH.time.resolve(+t || 0, null, true).T, t)); }); },
  holds: function (list) {
    return MH.hooks.set('__holds', function () {
      var L = typeof list === 'function' ? list() : list || [];
      return L.map(function (h) { return [MH.time.toPage(h[0]), MH.time.toPage(h[1])]; });
    });
  },
  events: function (list) {
    return MH.hooks.set('__events', function () {
      var L = typeof list === 'function' ? list() : list || [];
      return L.map(function (e) { return Object.assign({}, e, { t: MH.time.toPage(e.t) }); });
    });
  },
  accentExclude: function (fn, o) {
    o = o || {};
    return MH.hooks.set('__redExclude', function (fps, n) {
      fps = +fps || MH.fps(); var N = +n || o.frames || Math.round((o.dur || 0) * fps), out = [];
      var d = MH.design(), cv = function (b) { return [b[0] * d.s + d.x, b[1] * d.s + d.y, b[2] * d.s + d.x, b[3] * d.s + d.y]; };
      for (var i = 0; i < N; i++) out.push((fn(MH.time.pageT(i, fps)[0]) || []).map(cv));
      return out;
    });
  },
  probeInfo: function (fn) { return MH.hooks.set('__probeInfo', fn); },
};
window.__fxBakeSettle = MH.bake.settle;

Object.assign(window, {
  MH: MH, MHCam: MHCam, MHLayer: MHLayer, MHMoBlur: MHMoBlur, MHBakeSvg: MHBakeSvg, MHAssetTexture: MHAssetTexture,
  MHLit: MHLit, MHDirBlur: MHDirBlur, MHModeStyles: MHModeStyles, MHDesignSpace: MHDesignSpace,
});
