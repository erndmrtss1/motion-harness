// world/fx-rig.jsx — kütüphane world "focusfx-paper" (eski adı fx-lab) v4: kamera düzeneği, derinlik katmanları, lamba havuzu, kâğıt, aydınger, taşıma, çizici.
// Bağımlılık: React + shared/motion-core.jsx (MH, MHCam, MHLayer, MHAssetTexture) + world/fx-lab.jsx (FXT, FXF, FXE, fxP, FXGrid, FX_PEN).
// Yükleme: fx-lab.jsx'ten SONRA. Kurallar: amber yok (ışık soğuk) · fade yok (ışık / hareket / bulanıklık) · doğrusal easing yok ·
//   oturma > 2 px · gölge rengi soğuk lacivert-gri (siyah değil) · kamera monoton kübik (varır ve tutar, aşma yok) · basamak 0 (vurgu nesnede).

var FX4 = MH.key('PAL') === 'v3' ? {   // karşılaştırma tahtası: PAL='v3' → önceki palet (tek değişken)
  pal: 'v3', paper: '#F1F0EB', paperShade: '#E2E1DB', paperCool: '#E2E1DB', tracing: 'rgba(241,240,235,0.62)',
  inkBlack: '#2B2E33', ink: '#1F3B70', inkLine: '#1F3B70', inkWash: '#4C6797',
  gSoft: '#2B2E33', gHB: '#585C63', gHard: '#989CA3', shadow: '0,0,0',
  steel: '#8E9298', steelDark: '#5D6167', steelLight: '#C9CCD1', anod: '#2B2E33', anodHi: '#585C63', knob: '#2B2E33',
  glass: '#0B0C0E', phos: '#FFFFFF', phosGlow: '255,255,255', grease: '#F1F0EB', desk: '#17191C',
} : {
  pal: 'v4',
  paper: '#F8F3E7',      // kâğıt: ılık fildişi (ışık soğuk → derinlik farkı); amber DEĞİL
  paperShade: '#E4E0D6', paperCool: '#DCE0E6',   // ışıktan dönen yüz soğuk
  tracing: 'rgba(232,238,244,0.58)',             // aydınger: soğuk yarı saydam
  inkBlack: '#151C2E',   // kahraman mürekkebi: mavi-siyah, kâğıtta ≥ 12:1
  ink: '#1F3B70',        // teknik mavi: ölçü / etiket çizgisi
  inkLine: '#2B4C86',    // ince çizgi mavisi
  inkWash: '#7F95BE',    // sulandırılmış mürekkep: dolgu (multiply)
  gSoft: '#2A2C31', gHB: '#4F535A', gHard: '#9A9EA6',   // grafit 2B / HB / 2H
  shadow: '20,28,44',    // gölge: soğuk lacivert-gri
  steel: '#A9AFB7', steelDark: '#5E646C', steelLight: '#DDE1E6',
  anod: '#1E2127', anodHi: '#3A3F48', knob: '#26292F',   // eloksal siyah gövde · düğme
  glass: '#0B1015', phos: '#EAF3FB', phosGlow: '160,196,234',   // fosfor: soğuk beyaz, neon değil
  grease: '#E9EDF1', desk: '#16181B',
};
var FX_PR = 2200;   // perspektif (px) — kamera, katman ve izdüşüm aynı değeri kullanır
var FX_DRIFT = {    // kamera drift dalgası (ekran px): x ±11.5k, y ±6.5k, rz ±0.3k° — iki frekans
  x: [11.5, [[0.55, 0.37, 0], [0.3, 0.91, 1.3]]],
  y: [6.5, [[0.55, 0.29, 0.7], [0.3, 0.83, 2.1]]],
  rz: [1, [[0.2, 0.23, 0.4], [0.1, 0.71, 1.9]]],
};
var FX_LIGHT_OPEN = { open: 5 / 30, rise: null, r0: 0.4, lead: 0.12, floor: 0.12, peak: 1.15, settle: 0.3, dip: 0.6 };   // K-24 ışıkla açılış sayıları

// ── süreklilik: anahtar eğrileri (çekirdekten) ─────────
function fxCR(T, keys) { return MH.keys.catmull(T, keys); }   // hız sürekli (aşabilir)
function fxMC(T, keys) { return MH.keys.monotone(T, keys); }  // monoton kübik: aşma yok, düz anahtar çiftinde hız 0
function fxCamAt(T, keys, drift) {   // keys: [[t, {x, y, d, rx, ry, rz}], …] → kamera durumu (+ drift, k varsayılan 0.35)
  return MH.cam.at(T, keys, { interp: 'monotone', drift: { k: drift == null ? 0.35 : drift, spec: FX_DRIFT }, persp: FX_PR });
}
// kamera: perspektif + dolly (d: kameraya doğru, büyütür) + tilt (rx) + orbit (ry, bakılan nokta etrafında) + roll (rz). Dünya (c.x, c.y) kare merkezinde.
function FXCam(p) { return <MHCam c={p.c} persp={FX_PR} name="cam">{p.children}</MHCam>; }
// derinlik katmanı (sabit çapa o): z > 0 kameraya yakın; ölçek telafisi çapada tasarım boyu; blur: alan derinliği (px)
function FXLayer(p) { return <MHLayer z={p.z} o={p.o} keepSize={p.keepSize} blur={p.blur} name={p.name} persp={FX_PR}>{p.children}</MHLayer>; }
function fxLayerPt(L, wx, wy) { return MH.cam.layerPt(L, wx, wy, FX_PR); }
function fxProj(c, wx, wy, wz) { return MH.cam.project(c, wx, wy, wz, { persp: FX_PR }); }   // dünya → ekran {x, y, k}
function fxDof(z, f, k) { return MH.cam.dof(z, f || 0, k == null ? 0.012 : k, 14); }       // alan derinliği: |z − f|·0.012, en çok 14 px

// ── ışık: K-24 ışıkla açılış + lamba havuzu (dikkat). Havuz dünyada; ekrana fxProj ile düşer. Işık nesneden ÖNCE varır (lead).
function fxLabLight(T, p) {   // → { k: ışık düzeyi, r: havuz yarıçap oranı (r0 → 1), o: nesnenin ışıkta okunma ilerlemesi, on }
  p = Object.assign({}, FX_LIGHT_OPEN, p || {});
  var u = MH.pAB(T, p.t0, p.t0 + p.open), uk = MH.pAB(T, p.t0, p.t0 + (p.rise || p.open)), k;
  if (p.mode === 'burst') k = T < p.t0 + p.open ? MH.mix(p.floor, p.peak, MH.ease.enter(u)) : MH.mix(p.peak, 1, MH.ease.smooth(MH.pAB(T, p.t0 + p.open, p.t0 + p.open + p.settle)));
  else k = MH.mix(p.floor, 1, MH.ease.enter(uk));
  if (p.flick) { var rel = MH.frame(T) - MH.frame(p.t0); if (p.flick.indexOf(rel) >= 0) k *= p.dip; }   // titreme: kare-kesin (render fps'inde)
  return { k: k, r: MH.mix(p.r0, 1, MH.ease.enter(u)), o: MH.ease.smooth(MH.pAB(T, p.t0 + p.lead, p.t0 + p.lead + 0.3)), on: T >= p.t0 };
}
function fxLamp(T, open, c, at, r, a) {   // open: fxLabLight p · at: [wx, wy] havuz merkezi (dünya) · r: dünya yarıçapı · a: havuz dışı düşüm (≤ 0.12)
  var L = fxLabLight(T, open), q = fxProj(c, at[0], at[1], 0);
  return { k: L.k, o: L.o, pool: { x: q.x, y: q.y, r: r * q.k * (0.55 + 0.45 * L.r), a: a == null ? 0.1 : a } };
}

// ── kâğıt: renk, soğuk gölge, kıvrım, kalkık köşe, plaka, mm ızgara ─────────
function FXPaperDefs(p) {   // kâğıt süzgeçleri (sahnede bir kez): kıvrım [{id: 'fx-wr-<seed>', seed, amount, freq?}] + köşe gölgesi bulanıklığı
  return (
    <svg width="0" height="0" style={{ position: 'absolute', left: 0, top: 0 }} aria-hidden="true">
      <defs>
        <filter id="fx-blur12" filterUnits="userSpaceOnUse" x="-600" y="-600" width="3200" height="2400"><feGaussianBlur stdDeviation="12" /></filter>
        {(p.wrinkles || []).map(function (w) {
          var freq = w.freq || '0.0065 0.0095';
          return (
            <React.Fragment key={w.id}>
              <filter id={w.id + '-d'} x="-3%" y="-3%" width="106%" height="106%"><feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves="3" seed={w.seed} result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale={w.amount} xChannelSelector="R" yChannelSelector="G" /></filter>
              <filter id={w.id + '-l'} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
                <feTurbulence type="turbulence" baseFrequency={w.ridgeFreq || freq} numOctaves="2" seed={w.seed} result="n" />
                <feDiffuseLighting in="n" surfaceScale={w.amount * 0.5} diffuseConstant="1.1" lightingColor="#ffffff" result="lit"><feDistantLight azimuth="225" elevation="48" /></feDiffuseLighting>
                <feComposite in="lit" in2="SourceGraphic" operator="in" />
              </filter>
            </React.Fragment>
          );
        })}
      </defs>
    </svg>
  );
}
function FXPaperCorner(p) {   // kalkık köşe: katlama çizgisi (w−c,h)–(w,h−c); köşe yüzeyi ışığa döner
  var w = p.w, h = p.h, c = p.c, gid = 'fx-lift-' + (p.seed || 1);
  return (
    <svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0 }}>
      <defs><linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={w - c / 2} y1={h - c / 2} x2={w} y2={h}>
        <stop offset="0" stopColor="#000" stopOpacity="0.16" /><stop offset="0.35" stopColor="#fff" stopOpacity="0.05" /><stop offset="1" stopColor="#fff" stopOpacity="0.3" />
      </linearGradient></defs>
      <polygon points={(w - c) + ',' + h + ' ' + w + ',' + (h - c) + ' ' + w + ',' + h} fill={'url(#' + gid + ')'} />
      <path d={'M' + (w - c) + ' ' + h + ' L' + w + ' ' + (h - c)} stroke="rgba(0,0,0,0.28)" strokeWidth={2.2} transform="translate(-1,-1)" />
      <path d={'M' + (w - c) + ' ' + h + ' L' + w + ' ' + (h - c)} stroke="rgba(255,255,255,0.55)" strokeWidth={1} />
    </svg>
  );
}
function FXPaper(p) {   // pafta: w, h, x, y, rot, z, color, wrinkle (0–20; FXPaperDefs'te 'fx-wr-<seed>'), seed, lift (köşe px), shadow, blur, filter, plate, grid
  var w = p.w, h = p.h, wr = p.wrinkle || 0, fid = 'fx-wr-' + (p.seed || 1), c = p.lift || 0, col = p.color || FX4.paper;
  var sh = p.shadow || ('14px 24px 64px rgba(' + FX4.shadow + ',0.48), 2px 3px 6px rgba(' + FX4.shadow + ',0.30)');
  return (
    <div style={{ position: 'absolute', left: p.x, top: p.y, width: w, height: h, transformStyle: 'preserve-3d', transform: 'rotate(' + (p.rot || 0) + 'deg)' + (p.z ? ' translateZ(' + p.z + 'px)' : '') }}>
      <div style={{ position: 'absolute', inset: 0, boxShadow: sh }} />
      {c > 0 && <svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        <polygon points={(w - c) + ',' + h + ' ' + w + ',' + (h - c) + ' ' + (w + c * 0.32) + ',' + (h + c * 0.36)} fill={'rgba(' + FX4.shadow + ',.6)'} filter="url(#fx-blur12)" />
      </svg>}
      <div style={{ position: 'absolute', inset: 0, background: col, overflow: 'hidden', filter: ((p.filter ? p.filter + ' ' : '') + (wr > 0 ? 'url(#' + fid + '-d) ' : '') + (p.blur > 0.05 ? 'blur(' + p.blur.toFixed(2) + 'px)' : '')) || undefined }}>
        {p.plate !== null && !MH.mode.prof('plate') && <MHAssetTexture id={p.plate || 'plate-paper-1'} size="cover" blend="multiply" opacity={p.plateOpacity == null ? (FX4.pal === 'v3' ? 0.85 : 0.5) : p.plateOpacity} filter="grayscale(0.7)" />}
        {p.grid !== false && <FXGrid w={w} h={h} id={'fx4g' + (p.seed || 1)} ox={p.gox || 0} oy={p.goy || 0} minor={p.minor} major={p.major} />}
        <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }}>{p.children}</div>
        {wr > 0 && <svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0, mixBlendMode: 'multiply', opacity: Math.min(0.8, 0.2 + wr * 0.025) }}><rect width={w} height={h} fill="#fff" filter={'url(#' + fid + '-l)'} /></svg>}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,250,240,0.10) 0%, rgba(255,255,255,0) 42%, rgba(0,0,0,0.12) 100%)' }} />
        {c > 0 && <FXPaperCorner w={w} h={h} c={c} seed={p.seed} />}
        <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.55), inset -1px -1px 0 rgba(0,0,0,0.10)' }} />
      </div>
    </div>
  );
}
// aydınger: üst kenardan menteşeli; lift 0..1 → 0 → 96° (alt kenar kameraya kalkar). Kalkarken kıvrım + alan derinliği + ışık yakalar.
function FXFold(p) {
  var lf = p.lift || 0, ang = 96 * lf, wr = p.wrinkle == null ? 9 * Math.sin(Math.PI * Math.min(1, lf * 1.4)) : p.wrinkle, b = MH.mode.prof('dof') ? 0 : p.blur || 0;
  var lit = 0.16 * Math.sin(Math.PI * Math.min(1, lf * 1.2));   // ışığı yakalayan yüz (soğuk beyaz, screen)
  return (
    <div data-fx="aydinger" style={{ position: 'absolute', left: p.x, top: p.y, width: p.w, height: p.h, transformStyle: 'preserve-3d', transformOrigin: '50% 0%', transform: 'translateZ(' + (p.z || 3) + 'px) rotateX(' + ang.toFixed(3) + 'deg)' }}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: FX4.tracing, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
        boxShadow: lf > 0.01 ? '0 ' + (18 * lf).toFixed(1) + 'px ' + (40 * lf).toFixed(1) + 'px rgba(' + FX4.shadow + ',' + (0.25 * lf).toFixed(3) + ')' : 'inset 0 0 0 1px rgba(' + FX4.shadow + ',0.10)',
        filter: ((wr > 0.2 ? 'url(#fx-wr-' + (p.seed || 31) + '-d) ' : '') + (b > 0.05 ? 'blur(' + b.toFixed(2) + 'px)' : '')) || undefined }}>{/* overflow hidden: kıvrım süzgecinin referans kutusu içerikten bağımsız (canlı/pişmiş aynı) */}
        {p.children}
        {lit > 0.003 && <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen', background: 'linear-gradient(180deg, rgba(235,242,250,' + lit.toFixed(3) + ') 0%, rgba(235,242,250,0) 70%)' }} />}
      </div>
      <div style={{ position: 'absolute', inset: 0, transform: 'rotateX(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', background: 'linear-gradient(180deg, rgba(226,232,238,0.9), rgba(204,212,220,0.9))', filter: b > 0.05 ? 'blur(' + b.toFixed(2) + 'px)' : undefined }} />{/* arka yüz yazısız */}
    </div>
  );
}
// kâğıt taşıma: io3 kayış, hız → yönlü hareket bulanıklığı (MHDirBlur), gölge önce (lead 0.06 s). v: px/s
function fxSlide(T, t0, dur, dist, lead) {
  var dt = 1 / MH.fps(), e = FXE.io3(fxP(T, t0, dur)), e1 = FXE.io3(fxP(T - dt, t0, dur)), v = (e - e1) * dist / dt, es = FXE.io3(fxP(T, t0 - (lead == null ? 0.06 : lead), dur));
  return { dx: e * dist, sdx: es * dist, v: v, blur: Math.min(14, Math.abs(v) / 90) };
}
// yükseklik gölgesi: h px yüksekteki nesnenin kâğıda düşen gölgesi (anahtar 124° → sağ-alta), soğuk
function fxShadowAt(h) { return { dx: 6 + 0.55 * h, dy: 9 + 0.8 * h, blur: 6 + 0.3 * h, a: Math.max(0.12, 0.42 - 0.0016 * h) }; }

// ── çizgi çizimi: yol uzunluğu bilinen SVG yolu kalemle çizilir (dashoffset; ease-in-out çağıranda) ─────────
function FXStroke(p) {   // d, len, p (0..1), color, w, dash ('22 6 3 6' eksen), cap
  var pr = fxClamp(p.p == null ? 1 : p.p, 0, 1); if (pr <= 0) return null;
  return <path d={p.d} fill="none" stroke={p.color || FX4.ink} strokeWidth={p.w || 1.6} strokeLinecap={p.cap || 'round'} strokeLinejoin="round" strokeDasharray={p.dash ? undefined : p.len} strokeDashoffset={p.dash ? undefined : (p.len * (1 - pr)).toFixed(2)} opacity={p.o} style={p.dash ? { clipPath: 'inset(0 ' + ((1 - pr) * 100).toFixed(2) + '% 0 0)' } : undefined} />;
}
var fxPolyLen = MH.poly.len, fxPolyD = MH.poly.d, fxPolyAt = MH.poly.at;

// ── çizici (plotter): köprü kiriş (çelik) + taşıyıcı (eloksal) + rapido kalem; kafanın yazım yarığı ışığı ─────────
function FXPrintHead(p) {   // yazım yarığı: parlak dikey şerit + soğuk-beyaz ışıma + arkasında ince koyu iz (SVG içinde)
  var x = p.x, y = p.y || 0, h = p.h;
  return (
    <g opacity={p.o == null ? 1 : p.o}>
      <rect x={x - 26} y={y} width={30} height={h} fill="rgba(240,246,252,0.35)" filter="url(#fx-blur12)" />
      <rect x={x - 2} y={y - 6} width={4} height={h + 12} fill="#FBFDFF" opacity={0.95} />
      <rect x={x - 9} y={y} width={7} height={h} fill={'rgba(' + FX4.shadow + ',0.10)'} />
    </g>
  );
}
// kalem ucu (px, py) dünya; up: kalem kalkık (0..1, gölge uzar). Kiriş yatay, y = py − arm. Elle değil mekanizmayla çizilir (insan yok).
function FXPlotter(p) {
  var px = p.px, py = p.py, up = p.up || 0, x0 = p.x0, x1 = p.x1, arm = p.arm || 150, by = py - arm, hz = 70 + 26 * up, sh = fxShadowAt(hz), T = p.T || 0;
  var jit = 0.6 * Math.sin(T * 41) * (1 - up);   // taşıyıcı titreşimi (ikincil hareket)
  var steel = 'linear-gradient(180deg, ' + FX4.steelLight + ' 0%, ' + FX4.steel + ' 46%, ' + FX4.steelDark + ' 100%)';
  return (
    <div data-fx="plotter" data-c="FXPlotter" style={{ position: 'absolute', left: 0, top: 0, width: 1, height: 1, transformStyle: 'preserve-3d' }}>
      <div style={{ position: 'absolute', left: x0 + sh.dx, top: by - 22 + sh.dy, width: x1 - x0, height: 44, background: 'rgba(' + FX4.shadow + ',' + (sh.a * 0.8).toFixed(3) + ')', filter: 'blur(' + sh.blur.toFixed(1) + 'px)' }} />
      <div style={{ position: 'absolute', left: px - 60 + sh.dx, top: by - 50 + sh.dy, width: 120, height: arm + 40, borderRadius: 10, background: 'rgba(' + FX4.shadow + ',' + sh.a.toFixed(3) + ')', filter: 'blur(' + (sh.blur + 4).toFixed(1) + 'px)' }} />
      <div style={{ position: 'absolute', left: x0, top: by - 22, width: x1 - x0, height: 44, transform: 'translateZ(' + hz + 'px)', background: steel, borderRadius: 3, overflow: 'hidden', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -2px 0 rgba(0,0,0,0.25)' }}>
        <MHAssetTexture id="plate-metal-1" size="cover" blend="multiply" opacity={0.55} filter="grayscale(1)" />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 19, height: 6, background: 'rgba(0,0,0,0.28)' }} />
      </div>
      <div style={{ position: 'absolute', left: px - 58, top: by - 40 + jit, width: 116, height: 80, transform: 'translateZ(' + (hz + 18) + 'px)', borderRadius: 8, background: 'linear-gradient(160deg, ' + FX4.anodHi + ' 0%, ' + FX4.anod + ' 60%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)' }}>
        {[[14, 14], [102, 14], [14, 66], [102, 66]].map(function (q, i) { return <div key={i} style={{ position: 'absolute', left: q[0] - 4, top: q[1] - 4, width: 8, height: 8, borderRadius: 4, background: FX4.steel, boxShadow: 'inset -1px -1px 0 rgba(0,0,0,0.4)' }} />; })}
      </div>
      <svg width={1} height={1} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', transform: 'translateZ(' + (hz * 0.5) + 'px)' }}>
        <path d={'M ' + (px - 9) + ' ' + (by + 36) + ' L ' + (px + 9) + ' ' + (by + 36) + ' L ' + (px + 4) + ' ' + (py - 18 - 30 * up) + ' L ' + (px - 4) + ' ' + (py - 18 - 30 * up) + ' Z'} fill={FX4.anod} />
        <rect x={px - 1.4} y={py - 18 - 30 * up} width={2.8} height={18} fill={FX4.steel} />
        <FXPrintHead x={px} y={by - 20} h={40} o={0.55} />
      </svg>
    </div>
  );
}
// çok kalemli kayıt cihazı (çizicinin düşey kiriş biçimi): kiriş x'te, pens: [y, …] kalem uçları; kiriş y0..y1. Kiriş komşu metni örtmez (ders W9).
function FXRecorder(p) {
  var x = p.x, y0 = p.y0, y1 = p.y1, hz = p.hz || 80, sh = fxShadowAt(hz), T = p.T || 0, jit = 0.8 * Math.sin(T * 37 + 1.1);
  var steel = 'linear-gradient(90deg, ' + FX4.steelLight + ' 0%, ' + FX4.steel + ' 46%, ' + FX4.steelDark + ' 100%)';
  return (
    <div data-fx="kaydedici" data-c="FXRecorder" style={{ position: 'absolute', left: 0, top: 0, width: 1, height: 1, transformStyle: 'preserve-3d' }}>
      <div style={{ position: 'absolute', left: x - 30 + sh.dx, top: y0 - 60 + sh.dy, width: 60, height: y1 - y0 + 120, background: 'rgba(' + FX4.shadow + ',' + (sh.a * 0.85).toFixed(3) + ')', filter: 'blur(' + sh.blur.toFixed(1) + 'px)' }} />
      <div style={{ position: 'absolute', left: x - 26 + jit * 0.3, top: y0 - 60, width: 52, height: y1 - y0 + 120, transform: 'translateZ(' + hz + 'px)', background: steel, borderRadius: 4, overflow: 'hidden', boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.6), inset -2px 0 0 rgba(0,0,0,0.25)' }}>
        <MHAssetTexture id="plate-metal-1" size="cover" blend="multiply" opacity={0.5} filter="grayscale(1)" />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 23, width: 6, background: 'rgba(0,0,0,0.26)' }} />
      </div>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1, height: 1, transform: 'translateZ(' + (hz + 6) + 'px)' }}>{(p.pens || []).map(function (py, i) { return <div key={i} style={{ position: 'absolute', left: x - 40 + jit, top: py - 50, width: 18, height: 26, borderRadius: 3, background: 'linear-gradient(90deg, ' + FX4.steelDark + ', ' + FX4.steelLight + ' 45%, ' + FX4.steel + ')' }} />; })}</div>
      <svg width={1} height={1} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', transform: 'translateZ(2px)' }}>
        {(p.pens || []).map(function (py, i) { var tx = x + (p.tip || 0), bx = tx + 30, by = py - 46; return <g key={i}>
          <line x1={bx + 6} y1={by + 8} x2={tx + 6} y2={py + 6} stroke={'rgba(' + FX4.shadow + ',0.28)'} strokeWidth={14} strokeLinecap="round" />
          <path d={'M ' + (bx - 7) + ' ' + (by - 4) + ' L ' + (bx + 7) + ' ' + (by + 4) + ' L ' + (tx + 2.5) + ' ' + (py - 1) + ' L ' + (tx - 2.5) + ' ' + (py - 3) + ' Z'} fill={FX4.anod} />
          <line x1={bx - 4} y1={by + 4} x2={bx + 5} y2={by + 9} stroke={FX4.steelLight} strokeWidth={3} />
          <circle cx={tx} cy={py} r={3.2} fill={FX4.inkBlack} /></g>; })}
        <FXPrintHead x={x} y={y0 - 40} h={y1 - y0 + 80} o={0.35} />
      </svg>
    </div>
  );
}
// toz: ışık havuzunda süzülen grafit tozu (ikincil hareket, deterministik)
function FXDust(p) {
  var r = MH.rng(p.seed || 3), n = p.n || 40, T = p.T || 0, out = [];
  for (var i = 0; i < n; i++) { var x0 = r() * p.w, y0 = r() * p.h, sp = 6 + r() * 14, ph = r() * 6.28, sz = 0.8 + r() * 1.6;
    var x = (x0 + T * sp * 0.6 + 14 * Math.sin(T * 0.4 + ph)) % p.w, y = (y0 - T * sp * 0.35 + 9 * Math.sin(T * 0.53 + ph * 1.3) + p.h * 4) % p.h;
    out.push(<circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={sz.toFixed(2)} fill={FX4.gHB} opacity={0.25 + 0.3 * r()} />); }
  return <svg width={p.w} height={p.h} style={{ position: 'absolute', left: p.x, top: p.y, overflow: 'visible', pointerEvents: 'none' }}>{out}</svg>;
}

Object.assign(window, {
  FX4: FX4, FX_PR: FX_PR, FX_DRIFT: FX_DRIFT, FX_LIGHT_OPEN: FX_LIGHT_OPEN, fxCR: fxCR, fxMC: fxMC, fxCamAt: fxCamAt, FXCam: FXCam, FXLayer: FXLayer,
  fxLayerPt: fxLayerPt, fxProj: fxProj, fxDof: fxDof, fxLabLight: fxLabLight, fxLamp: fxLamp, FXPaperDefs: FXPaperDefs, FXPaperCorner: FXPaperCorner,
  FXPaper: FXPaper, FXFold: FXFold, fxSlide: fxSlide, fxShadowAt: fxShadowAt, FXStroke: FXStroke, fxPolyLen: fxPolyLen, fxPolyD: fxPolyD, fxPolyAt: fxPolyAt,
  FXPrintHead: FXPrintHead, FXPlotter: FXPlotter, FXRecorder: FXRecorder, FXDust: FXDust,
});
