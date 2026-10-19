// world/desk-paper.jsx — ÖRNEK world "desk-paper": lambalı karanlık masa, kâğıt, mürekkep, kalem (ÖRNEK, varsayılan değil — skills/motion-world/SKILL.md).
// Kimlik: koyu masa, kâğıt, mürekkep, kalem, lamba; tepeden tek kamera dünyası. İlke: "modelleme, ima et" — derinlik örtüşen düz katman,
//   yumuşak gölge, odak farkı ve doku + ışıktan gelir; hiçbir nesne gradyanlı katı geometriyle modellenmez.
// Bağımlılık: React + shared/motion-core.jsx (MH, MHLayer, MHLit, MHModeStyles). Yükleme: motion-stage → motion-core → desk-paper → sahne.
// Kurallar: amber YALNIZ ışıktır (lamba, havuz, ışıma; nesne amber boyanmaz) · lamba gövdesi çizilmez, ışığı görülür (World ışığı) ·
//   ışık = dikkat (havuz kalemin çalıştığı yerde, kesin kutuya çizimden önce varır) · aksan (kırmızı) her kullanımda sayılır ·
//   fade yok (opaklık yalnız harekete / bulanıklığa eşlik eder) · konuşulan kelime sayfaya yazılmaz (proje kuralı olarak önerilir).
// Doku: kâğıt greni, lifi ve masa yüzeyi yordamsal (feTurbulence); fotoğraf / üretken doku kullanılırsa MHAssetTexture ile eklenir.

var DESK = {
  base: '#0A0908', desk: '#0C0B0A', lamp: '217,174,82', warmPool: '#FFD9A3',
  ink: '#0E0C0A', ballpoint: '#1C2340', inkLow: '#2E3966', inkHigh: '#10162E', wetInk: '#7385CC',
  graphite: '#3A3B3D', pencilText: '#26272B', paperWhite: '#EEEBE4', paperAged: '#E6DCC3', offPaper: '#F2F4F7',
  fog: '#9BA3AD', ash: '#5A6068', signal: '#D8301A', dust: '255,226,180', beam: '255,226,180', printLight: '255,250,236',
  persp: 2200, vignette: 0.35, grain: 0.04, grainRate: 30, fall: 0.45, fallR: 1.05,
  plane: { w: 3400, h: 2200 },   // masa düzlemi (tasarım px); merkezi tuval merkezinde
};
var DESK_FONT = { hand: 'Caveat, "Segoe Script", cursive', display: '"Saira Condensed", sans-serif', mono: '"JetBrains Mono", monospace', body: 'Inter, system-ui, sans-serif' };
var DESK_DRIFT = {   // kamera drift dalgası (ekran px, k = 1): x ±11.5, y ±6.5, rz ±0.3° — iki frekans
  x: [11.5, [[0.55, 0.37, 0], [0.3, 0.91, 1.3]]],
  y: [6.5, [[0.55, 0.29, 0.7], [0.3, 0.83, 2.1]]],
  rz: [1, [[0.2, 0.23, 0.4], [0.1, 0.71, 1.9]]],
};
var DESK_SHAKE = {   // sarsıntı dalgası (3 Hz + 0.45 · 7 Hz); genlik: el 0.2 · manik 0.35 · teslimiyet 0 · darbe 1 kare 2–3 px (yalnız darbe alan katman)
  x: [1, [[1, 2 * Math.PI * 3, 0], [0.45, 2 * Math.PI * 7, 1.1]]],
  y: [1, [[1, 2 * Math.PI * 3, 0.7], [0.45, 2 * Math.PI * 7, 2.3]]],
};
var DESK_LIGHT_OPEN = { open: 5 / 30, rise: null, r0: 0.4, lead: 0.12, floor: 0.12, peak: 1.15, settle: 0.3, dip: 0.6 };   // K-24 ışıkla açılış sayıları

// ── zaman yardımcıları (çekirdekten) ─────────
var deskE = MH.ease.smooth;   // geçiş: ease-in-out (bezier .4,0,.6,1)
function deskDrift(T, k) { return MH.drift(T, k == null ? 1 : k, DESK_DRIFT); }
function deskShake(T, amp) { var s = MH.drift(T, amp || 0, DESK_SHAKE); return { dx: s.dx, dy: s.dy }; }
function deskLightOpen(T, p) {   // → { k: ışık düzeyi, r: havuz yarıçap oranı, o: nesnenin ışıkta okunma ilerlemesi, on }
  p = Object.assign({}, DESK_LIGHT_OPEN, p || {});
  var u = MH.pAB(T, p.t0, p.t0 + p.open), uk = MH.pAB(T, p.t0, p.t0 + (p.rise || p.open)), k;
  if (p.mode === 'burst') k = T < p.t0 + p.open ? MH.mix(p.floor, p.peak, MH.ease.enter(u)) : MH.mix(p.peak, 1, MH.ease.smooth(MH.pAB(T, p.t0 + p.open, p.t0 + p.open + p.settle)));
  else k = MH.mix(p.floor, 1, MH.ease.enter(uk));
  if (p.flick) { var rel = MH.frame(T) - MH.frame(p.t0); if (p.flick.indexOf(rel) >= 0) k *= p.dip; }
  return { k: k, r: MH.mix(p.r0, 1, MH.ease.enter(u)), o: MH.ease.smooth(MH.pAB(T, p.t0 + p.lead, p.t0 + p.lead + 0.3)), on: T >= p.t0 };
}

// ── süzgeç tanımları (sahnede bir kez) ─────────
function DeskWrinkle(p) {   // kırışık kâğıt: aynı gürültüden yer değiştirme (-d) ve ışıklı kıvrım (-l)
  var freq = p.freq || '0.0065 0.0095';
  return (
    <React.Fragment>
      <filter id={p.id + '-d'} x="-3%" y="-3%" width="106%" height="106%"><feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves="3" seed={p.seed} result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale={p.amount} xChannelSelector="R" yChannelSelector="G" /></filter>
      <filter id={p.id + '-l'} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="turbulence" baseFrequency={p.ridgeFreq || freq} numOctaves="2" seed={p.seed} result="n" />
        <feDiffuseLighting in="n" surfaceScale={p.amount * 0.5} diffuseConstant="1.1" lightingColor="#ffffff" result="lit"><feDistantLight azimuth="225" elevation="48" /></feDiffuseLighting>
        <feComposite in="lit" in2="SourceGraphic" operator="in" />
      </filter>
    </React.Fragment>
  );
}
function DeskDefs(p) {
  var UB = { filterUnits: 'userSpaceOnUse', x: -600, y: -600, width: 3200, height: 2400 };   // geniş bölge (ışıma kopyaları)
  return (
    <svg width="0" height="0" style={{ position: 'absolute', left: 0, top: 0 }} aria-hidden="true">
      <defs>
        <filter id="desk-ink" x="-10%" y="-10%" width="120%" height="120%">{/* mürekkep taşması: dilate .4 + blur .6, çekirdeğin üstüne */}
          <feMorphology operator="dilate" radius="0.4" in="SourceGraphic" result="d" /><feGaussianBlur in="d" stdDeviation="0.6" result="b" /><feComposite in="SourceGraphic" in2="b" operator="over" />
        </filter>
        <filter id="desk-pencil" x="-10%" y="-20%" width="120%" height="140%">{/* kurşun kalem: granüler kenar */}
          <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="1" seed="3" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feComponentTransfer in="n" result="na"><feFuncA type="linear" slope="1.6" intercept="-0.3" /></feComponentTransfer><feComposite in="d" in2="na" operator="in" />
        </filter>
        <filter id="desk-stamp" x="-10%" y="-10%" width="120%" height="120%">{/* damga: düzensiz kenar (~1 px) + eşit olmayan mürekkep */}
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="8" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="1" seed="9" result="m" /><feComponentTransfer in="m" result="ma"><feFuncA type="linear" slope="2.2" intercept="-0.2" /></feComponentTransfer><feComposite in="d" in2="ma" operator="in" />
        </filter>
        <filter id="desk-glow18" {...UB}><feGaussianBlur stdDeviation="18" /></filter>
        <filter id="desk-glow60" {...UB}><feGaussianBlur stdDeviation="60" /></filter>
        <filter id="desk-blur12" {...UB}><feGaussianBlur stdDeviation="12" /></filter>
        <filter id="desk-tip" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="0.7" /></filter>
        <filter id="desk-grain" x="0" y="0" width="100%" height="100%">{/* kâğıt greni (multiply) */}
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="21" /><feColorMatrix type="matrix" values="0 0 0 0 0.84  0 0 0 0 0.82  0 0 0 0 0.79  0 0 0 -1.2 1.1" />
        </filter>
        <filter id="desk-fiber" x="0" y="0" width="100%" height="100%">{/* kâğıt lifi (overlay) */}
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.06" numOctaves="3" seed="33" /><feColorMatrix type="saturate" values="0" />
        </filter>
        <filter id="desk-surface" x="0" y="0" width="100%" height="100%">{/* masa yüzeyi: yönlü, kısık doku (screen) */}
          <feTurbulence type="fractalNoise" baseFrequency="0.004 0.03" numOctaves="4" seed="5" /><feColorMatrix type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.47  0 0 0 0 0.38  0 0 0 0.9 -0.25" />
        </filter>
        {(p.wrinkles || []).map(function (w) { return <DeskWrinkle key={w.id} {...w} />; })}
      </defs>
    </svg>
  );
}
function DeskGrain(p) {   // gren: feTurbulence 0.9 / 2 oktav, overlay %4; tohum 30 Hz ızgarasında (T'den)
  var cv = MH.canvas(), seed = MH.grainSeed(p.T || 0, DESK.grainRate, 0), o = p.amp == null ? DESK.grain : +(DESK.grain * p.amp).toFixed(5);
  return (
    <svg width={cv.w} height={cv.h} style={{ position: 'absolute', left: 0, top: 0, mixBlendMode: 'overlay', opacity: o, pointerEvents: 'none' }}>
      <filter id="desk-grainT" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} /><feColorMatrix type="saturate" values="0" /><feComponentTransfer><feFuncA type="table" tableValues="1 1" /></feComponentTransfer></filter>
      <rect width={cv.w} height={cv.h} filter="url(#desk-grainT)" />
    </svg>
  );
}

// ── dünya ışığı (her karede tek) ─────────
// light {x, y, r, a}: amber anahtar ışıma (screen, ekran px) · fall: ışıktan uzak multiply düşüm (yumuşak duraklar) · warm: havuzda sıcak multiply ·
// extraLights [{x, y, r, ry?, a, rgb}] · illum {bg, color, w}: tek multiply ışık katmanı (çok kaynak) · over: düşümün ÜSTÜNDE çizilen (kendinden ışıklı) ·
// exposure: siyah örtü · lift: gölge +4 · post: sahne içi CSS süzgeci · base: zemin
function DeskWorld(props) {
  var L = props.light, full = { position: 'absolute', inset: 0, pointerEvents: 'none' }, fall = props.fall == null ? DESK.fall : props.fall;
  var fstop = function (k, pos) { var v = Math.round(255 * (1 - fall * k)); return 'rgb(' + v + ',' + v + ',' + v + ') ' + pos + '%'; };
  var fallGrad = [fstop(0, 0), fstop(0.06, 30), fstop(0.3, 55), fstop(0.62, 75), fstop(0.88, 90), fstop(1, 100)].join(', ');
  var body = MH.mode.card() ? <div data-fx="gri-kart" style={{ position: 'absolute', inset: 0, background: '#FFFFFF' }} /> : props.children;
  return (
    <div data-fx="desk-world" style={{ position: 'absolute', inset: 0, background: props.base || DESK.base, overflow: 'hidden', filter: props.post || undefined }}>
      <MHModeStyles root="[data-fx=desk-world]" />
      <DeskDefs wrinkles={props.wrinkles} />
      {body}
      {props.illum && props.illum.w > 0.001 && <div style={Object.assign({}, full, { mixBlendMode: 'multiply', opacity: props.illum.w.toFixed(4), backgroundImage: props.illum.bg, backgroundColor: props.illum.color, backgroundBlendMode: 'screen, screen' })} />}
      {props.dist && props.dist.w > 0.001 && <div style={Object.assign({}, full, { mixBlendMode: 'multiply', opacity: props.dist.w.toFixed(4), background: props.dist.bg, backgroundBlendMode: 'screen' })} />}
      {fall > 0.001 && <div style={Object.assign({}, full, { mixBlendMode: 'multiply', background: 'radial-gradient(circle ' + Math.round(L.r * (props.fallR || DESK.fallR)) + 'px at ' + L.x + 'px ' + L.y + 'px, ' + fallGrad + ')' })} />}
      {props.warm > 0 && <div style={Object.assign({}, full, { mixBlendMode: 'multiply', background: 'radial-gradient(circle ' + L.r + 'px at ' + L.x + 'px ' + L.y + 'px, ' + MH.mixColor('#FFFFFF', DESK.warmPool, props.warm) + ' 0%, #FFFFFF 100%)' })} />}
      <div style={Object.assign({}, full, { mixBlendMode: 'screen', background: 'radial-gradient(circle ' + L.r + 'px at ' + L.x + 'px ' + L.y + 'px, rgba(' + DESK.lamp + ',' + L.a + ') 0%, rgba(' + DESK.lamp + ',0) 100%)' })} />
      {(props.extraLights || []).map(function (e, i) {
        return <div key={i} style={Object.assign({}, full, { mixBlendMode: 'screen', background: 'radial-gradient(' + (e.ry ? 'ellipse ' + e.r + 'px ' + e.ry + 'px' : 'circle ' + e.r + 'px') + ' at ' + e.x + 'px ' + e.y + 'px, rgba(' + e.rgb + ',' + e.a + ') 0%, rgba(' + e.rgb + ',0) 100%)' })} />;
      })}
      {props.over}
      {props.lift > 0.001 && <div style={Object.assign({}, full, { background: 'rgb(4,4,4)', mixBlendMode: 'screen', opacity: props.lift.toFixed(3) })} />}
      <div style={Object.assign({}, full, { background: 'radial-gradient(ellipse 72% 72% at 50% 50%, rgba(0,0,0,0) 52%, rgba(0,0,0,' + DESK.vignette + ') 100%)' })} />
      {props.exposure != null && props.exposure < 1 && <div style={Object.assign({}, full, { background: '#000', opacity: (1 - props.exposure).toFixed(4) })} />}
      {!MH.mode.prof('grain') && <DeskGrain T={props.T} amp={props.grain} />}
    </div>
  );
}

// ── kamera ve katman ─────────
// perspektif + sürekli drift (iki frekans) + roll; dr: açık drift {dx, dy, rz}; tx/ty: px (perspektiften önce); z: translateZ (ölçek persp/(persp−z)); rx: rotateX
function DeskCamera(props) {
  var d = props.dr || deskDrift(props.T, props.drift == null ? 1 : props.drift), rz = d.rz + (props.roll || 0), cv = MH.canvas(), o = props.origin || [cv.w / 2, cv.h / 2];
  return (
    <div data-fx="desk-cam" style={{ position: 'absolute', inset: 0, perspective: (props.persp || DESK.persp) + 'px', perspectiveOrigin: o[0] + 'px ' + o[1] + 'px' }}>
      <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transformOrigin: o[0] + 'px ' + o[1] + 'px',
        transform: 'translate3d(' + (d.dx + (props.tx || 0)).toFixed(2) + 'px,' + (d.dy + (props.ty || 0)).toFixed(2) + 'px,' + (props.z || 0).toFixed(2) + 'px) rotateZ(' + rz.toFixed(3) + 'deg)' + (props.rx ? ' rotateX(' + props.rx.toFixed(3) + 'deg)' : '') }}>
        {props.children}
      </div>
    </div>
  );
}
function DeskZLayer(props) { return <MHLayer z={props.z} o={props.origin} keepSize={props.keepSize} blur={props.blur} name={props.name || 'zlayer'} persp={props.persp || DESK.persp} digits={4}>{props.children}</MHLayer>; }
// masa düzlemi: koyu yüzey + kısık doku; tilt (rotateX, 0 = tam tepeden, 11–13 okuma açısı, 62+ tilt geçişi), dy, dolly (düzlemde kayış), ext (aşağı uzama), bare (yalnız taşıyıcı)
function DeskPlane(props) {
  var cv = MH.canvas(), W = DESK.plane.w, H = DESK.plane.h + (props.ext || 0), left = cv.w / 2 - DESK.plane.w / 2, top = cv.h / 2 - DESK.plane.h / 2;
  return (
    <div data-fx="desk-plane" style={{ position: 'absolute', left: left, top: top, width: W, height: H, transformStyle: 'preserve-3d', transformOrigin: DESK.plane.w / 2 + 'px ' + DESK.plane.h / 2 + 'px',
      transform: (props.dy ? 'translateY(' + props.dy.toFixed(1) + 'px) ' : '') + 'rotateX(' + (props.tilt || 0) + 'deg)' + (props.dolly ? ' translateY(' + props.dolly.toFixed(2) + 'px)' : ''), background: props.bare ? undefined : DESK.desk }}>
      {!props.bare && props.texture !== false && <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, mixBlendMode: 'screen', opacity: props.texture == null ? 0.1 : props.texture }}><rect width={W} height={H} filter="url(#desk-surface)" /></svg>}
      {props.children}
    </div>
  );
}
// masa düzlemi koordinatı (sol-üst köşeden) ↔ tuval: düzlem merkezi tuval merkezinde
function deskPlaneOrigin() { var cv = MH.canvas(); return [cv.w / 2 - DESK.plane.w / 2, cv.h / 2 - DESK.plane.h / 2]; }

// ── malzemeler ─────────
function DeskPaperCorner(p) {   // kalkık köşe: katlama çizgisi (w−c,h)–(w,h−c); köşe yüzeyi ışığa döner
  var w = p.w, h = p.h, c = p.c, gid = 'desk-lift-' + (p.seed || 1);
  return (
    <svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0 }}>
      <defs><linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={w - c / 2} y1={h - c / 2} x2={w} y2={h}><stop offset="0" stopColor="#000" stopOpacity="0.16" /><stop offset="0.35" stopColor="#fff" stopOpacity="0.05" /><stop offset="1" stopColor="#fff" stopOpacity="0.3" /></linearGradient></defs>
      <polygon points={(w - c) + ',' + h + ' ' + w + ',' + (h - c) + ' ' + w + ',' + h} fill={'url(#' + gid + ')'} />
      <path d={'M' + (w - c) + ' ' + h + ' L' + w + ' ' + (h - c)} stroke="rgba(0,0,0,0.28)" strokeWidth={2.2} transform="translate(-1,-1)" />
      <path d={'M' + (w - c) + ' ' + h + ' L' + w + ' ' + (h - c)} stroke="rgba(255,255,255,0.55)" strokeWidth={1} />
    </svg>
  );
}
// kâğıt: gren (multiply %45) + lif (overlay %6) + 135° ışık gradyanı (üst-sol açık, sağ-alt %12 koyu) + masaya gölge + 1 px açık kenar;
// wrinkle 0–20 (DeskWorld wrinkles: 'desk-wr-<seed>'), tint 0 beyaz → 1 sararmış, lift sağ-alt köşe kalkık, shadowShift [dx, dy] (itişte gölge önce), hero → data-hero
function DeskPaper(props) {
  var w = props.w, h = props.h, tint = props.tint || 0, wr = props.wrinkle || 0, c = props.lift || 0, ss = props.shadowShift || [0, 0];
  var col = props.color || MH.mixColor(DESK.paperWhite, DESK.paperAged, tint), fid = 'desk-wr-' + (props.seed || 1);
  return (
    <div data-hero={props.hero ? '1' : undefined} style={{ position: 'absolute', left: props.x, top: props.y, width: w, height: h, transformStyle: 'preserve-3d', transform: 'rotate(' + (props.rot || 0) + 'deg)' + (props.z ? ' translateZ(' + props.z + 'px)' : ''), WebkitMaskImage: props.mask, maskImage: props.mask }}>
      {props.shadow !== 'none' && <div style={{ position: 'absolute', inset: 0, transform: ss[0] || ss[1] ? 'translate(' + ss[0].toFixed(1) + 'px,' + ss[1].toFixed(1) + 'px)' : undefined, boxShadow: props.shadow || '18px 30px 80px rgba(0,0,0,.65)' }} />}
      {c > 0 && <svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}><polygon points={(w - c) + ',' + h + ' ' + w + ',' + (h - c) + ' ' + (w + c * 0.32) + ',' + (h + c * 0.36)} fill="rgba(0,0,0,.6)" filter="url(#desk-blur12)" /></svg>}
      <div style={{ position: 'absolute', inset: 0, background: col, overflow: 'hidden', filter: ((props.filter ? props.filter + ' ' : '') + (wr > 0 ? 'url(#' + fid + '-d) ' : '') + (props.blur > 0.05 ? 'blur(' + props.blur.toFixed(2) + 'px)' : '')) || undefined }}>
        {props.grain !== 0 && <svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0, mixBlendMode: 'multiply', opacity: props.grain == null ? 0.45 : props.grain }}><rect width={w} height={h} filter="url(#desk-grain)" /></svg>}
        <svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0, mixBlendMode: 'overlay', opacity: 0.06 }}><rect width={w} height={h} filter="url(#desk-fiber)" /></svg>
        {props.children}
        {wr > 0 && <svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0, mixBlendMode: 'multiply', opacity: Math.min(0.8, 0.2 + wr * 0.025) }}><rect width={w} height={h} fill="#fff" filter={'url(#' + fid + '-l)'} /></svg>}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,250,240,0.10) 0%, rgba(255,255,255,0) 42%, rgba(0,0,0,0.12) 100%)' }} />
        {c > 0 && <DeskPaperCorner w={w} h={h} c={c} seed={props.seed} />}
        <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.55), inset -1px -1px 0 rgba(0,0,0,0.10)' }} />
      </div>
    </div>
  );
}
// mürekkep grubu (SVG): kâğıt üstünde koyu, kâğıt dışında açık; stroke → dolgusuz çizgi. Süzgeç GRUPTA (öğe başı süzgeç küçük kutuları kırpar)
function DeskInk(props) {
  var col = props.color || (props.onPaper === false ? DESK.offPaper : DESK.ink);
  return <g filter="url(#desk-ink)" fill={props.stroke ? 'none' : col} stroke={props.stroke ? col : 'none'} opacity={props.opacity == null ? 1 : props.opacity}>{props.children}</g>;
}
function DeskPencil(props) {   // kurşun kalem çizgisi: grafit + 1 px açık parlama, granüler kenar; p basınç (genişlik × p)
  var w = (props.w || 1.8) * (props.p || 1);
  return (
    <g filter="url(#desk-pencil)" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={props.d} stroke={DESK.graphite} strokeWidth={w} opacity={0.88} />
      <path d={props.d} stroke="rgba(214,216,222,0.45)" strokeWidth={0.8} transform="translate(0,-0.7)" />
    </g>
  );
}
function DeskGlow(props) {   // ışıma: blur 60 (.2) + blur 18 (.5) kopyalar altta, net şekil üstte — yalnız aksan (sinyal) öğelerinde
  return <g><g filter="url(#desk-glow60)" opacity={0.2}>{props.children}</g><g filter="url(#desk-glow18)" opacity={0.5}>{props.children}</g>{props.children}</g>;
}
function DeskPenTip(p) {   // kalem ucu: 3 px specular + 1 px koyu basınç gölgesi (el gösterilmez); mürekkep süzgecinin DIŞINDA, en üstte
  return <g><circle cx={p.x + 0.9} cy={p.y + 1} r={1.15} fill="rgba(8,10,18,0.55)" /><circle cx={p.x} cy={p.y} r={1.5} fill="#ffffff" opacity={0.92 * (p.k == null ? 1 : p.k)} filter="url(#desk-tip)" /></g>;
}

// ── el yazısı (koşu) ve vuruş ─────────
// koşu h = {id, text, x, y, size, rot, ox, oy, speed (px/s), pr (basınç 0..1), t0, seed, w (ağırlık), col, pencil}
// hız: sakin ≈ 720 px/s · öfkeli 1080–1440 px/s · okunması gereken ilk karalama ≈ 1080 px/s (yol uzunluğuna orantılı zaman; glif başına eşit dilim değil)
function deskInkCol(pr) { return MH.mixColor(DESK.inkLow, DESK.inkHigh, pr); }   // basınç: düşük açık, yüksek koyu
function deskHandFont(h) { return (h.w || 600) + ' ' + h.size + 'px ' + DESK_FONT.hand; }
function deskHandW(h) { return MH.measureText(deskHandFont(h), h.text); }
function deskHandEnd(h) { return h.t0 + deskHandW(h) / h.speed; }
function deskHandRight(h, gap) { return h.x + deskHandW(h) + (gap == null ? 0 : gap + h.size * 0.08); }
function DeskHand(p) {   // soldan sağa kırpma, harf tabanı ±1.5 px / ±1.4° titreşim, ıslak mürekkep (son 0.3 s), basınç; part='tip' → yalnız kalem ucu
  var h = p.h, T = p.T;
  if (T < h.t0) return null;
  var W = deskHandW(h), v = h.speed, rv = Math.min(W, (T - h.t0) * v), t1 = h.t0 + W / v, writing = T < t1, rotT = 'rotate(' + (h.rot || 0) + ' ' + (h.ox == null ? h.x : h.ox) + ' ' + (h.oy == null ? h.y : h.oy) + ')';
  if (p.part === 'tip') { if (rv >= W) return null; return <g transform={rotT}><DeskPenTip x={h.x + rv} y={h.y - h.size * (0.32 + 0.16 * Math.sin(rv * 0.31))} k={p.k} /></g>; }
  var text = h.text, n = text.length, rj = MH.rng(h.seed || 7), dy = [], rot = [], prev = 0;
  for (var i = 0; i < n; i++) { var j = (rj() - 0.5) * 3; dy.push((j - prev).toFixed(2)); prev = j; rot.push(((rj() - 0.5) * 2.8).toFixed(1)); }
  var pr = h.pr == null ? 0.6 : h.pr, col = h.col || (h.pencil ? DESK.pencilText : deskInkCol(pr)), sw = h.size * 0.012 * pr, id = 'deskhw-' + h.id, x = h.x, y = h.y;
  var xDry = Math.max(0, (T - 0.3 - h.t0) * v), wet = h.pencil ? 0 : writing ? 1 : Math.max(0, 1 - (T - t1) / 0.3);
  var tp = { x: x, y: y, fontFamily: DESK_FONT.hand, fontWeight: h.w || 600, fontSize: h.size, dy: dy.join(' '), rotate: rot.join(' ') };
  return (
    <g transform={rotT} data-fx="hand">
      <clipPath id={id + '-c'}><rect x={x - 6} y={y - h.size * 1.3} width={writing ? rv + 6 : W + h.size} height={h.size * 1.9} /></clipPath>
      <g clipPath={'url(#' + id + '-c)'}>
        <text {...tp} fill={col} stroke={col} strokeWidth={sw} paintOrder="stroke" opacity={h.pencil ? 0.88 : 0.94}>{text}</text>
        {wet > 0 && <React.Fragment>
          <linearGradient id={id + '-g'} gradientUnits="userSpaceOnUse" x1={x + xDry} x2={x + rv + 0.01} y1={0} y2={0}><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#fff" stopOpacity={wet} /></linearGradient>
          <mask id={id + '-m'} maskUnits="userSpaceOnUse"><rect x={x + xDry - 1} y={y - h.size * 1.3} width={rv - xDry + 2} height={h.size * 1.9} fill={'url(#' + id + '-g)'} /></mask>
          <text {...tp} fill={DESK.wetInk} opacity={0.42} mask={'url(#' + id + '-m)'}>{text}</text>
        </React.Fragment>}
      </g>
    </g>
  );
}
// vuruş s = {id, t0, dur, pts, pr, w, rot, ox, oy, dash, pencil, col}: nokta dizisi kısmen çizilir; part='tip' → uçta kalem ucu
function DeskStroke(p) {
  var s = p.s, T = p.T;
  if (T < s.t0) return null;
  var fr = Math.min(1, (T - s.t0) / s.dur), pp = MH.poly.upTo(s.pts, fr), hd = pp[pp.length - 1], rotT = s.rot ? 'rotate(' + s.rot + ' ' + s.ox + ' ' + s.oy + ')' : undefined;
  if (p.part === 'tip') return fr < 1 ? <g transform={rotT}><DeskPenTip x={hd[0]} y={hd[1]} k={p.k} /></g> : null;
  var pr = s.pr == null ? 0.6 : s.pr, w = s.w || (1.3 + 1.7 * pr);
  return <g transform={rotT}><path d={'M' + pp.map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' L')} fill="none" stroke={s.col || (s.pencil ? DESK.graphite : deskInkCol(pr))} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={s.dash} opacity={s.pencil ? 0.85 : 0.94} /></g>;
}
function deskLinePts(x0, y0, x1, y1, seed, amp, n) {   // titrek doğru
  var r = MH.rng(seed), out = []; n = n || 10;
  for (var k = 0; k <= n; k++) { var t = k / n, j = k === 0 || k === n ? 0 : (r() - 0.5) * 2 * (amp == null ? 1 : amp); out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + j]); }
  return out;
}
function deskEllipsePts(cx, cy, rx, ry, rot, seed) {   // başını geçen el elipsi
  var r = MH.rng(seed), out = [], n = 40, a0 = -2.2, sw = Math.PI * 2 + 0.55, c = Math.cos(rot * Math.PI / 180), s = Math.sin(rot * Math.PI / 180);
  for (var k = 0; k <= n; k++) { var a = a0 + sw * k / n, j = 1 + (r() - 0.5) * 0.06 + (k / n) * 0.09, x = Math.cos(a) * rx * j, y = Math.sin(a) * ry * j; out.push([cx + x * c - y * s, cy + x * s + y * c]); }
  return out;
}
function deskBoxPts(x, y, s, seed) { var r = MH.rng(seed), j = function () { return (r() - 0.5) * 2.4; }; return [[x + 1, y + j()], [x + s + j(), y + j()], [x + s + j(), y + s + j()], [x + j(), y + s + j()], [x + j(), y - 2]]; }   // ☐
function deskBezPts(p0, p1, p2, seed, amp) { var r = MH.rng(seed), out = []; for (var k = 0; k <= 24; k++) { var t = k / 24, u = 1 - t; out.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1] + (k && k < 24 ? (r() - 0.5) * 2 * amp : 0)]); } return out; }

// ── ışık nesneleri ve makine ─────────
// baskı kafası (SVG içinde): 4 px parlak dikey şerit + 30 px sıcak ışıma + arkasında ince koyu iz — masaya yeni basılan öğe belirmez, basılır
function DeskPrintHead(p) {
  var x = p.x, y = p.y || 0, h = p.h;
  return <g opacity={p.o == null ? 1 : p.o}><rect x={x - 26} y={y} width={30} height={h} fill={'rgba(' + DESK.printLight + ',0.35)'} filter="url(#desk-blur12)" /><rect x={x - 2} y={y - 6} width={4} height={h + 12} fill="#FFFDF6" opacity={0.95} /><rect x={x - 9} y={y} width={7} height={h} fill="rgba(20,16,10,0.10)" /></g>;
}
// havada görünen sıcak koni: lamba başından (x, y) masa havuzuna (tx, ty, r). Kendinden ışıklı → DeskWorld.over. k: ışık düzeyi (deskLightOpen().k). Lamba gövdesi çizilmez.
function DeskLampBeam(p) {
  var k = Math.max(0, p.k == null ? 1 : p.k), rgb = p.rgb || DESK.beam, a = (p.a == null ? 0.1 : p.a) * k, cv = MH.canvas();
  if (a < 0.002) return null;
  var w0 = p.w0 || 70, w1 = (p.r || 520) * 0.95, ang = Math.atan2(p.ty - p.y, p.tx - p.x), nx = -Math.sin(ang), ny = Math.cos(ang);
  var pts = [[p.x + nx * w0 / 2, p.y + ny * w0 / 2], [p.tx + nx * w1, p.ty + ny * w1], [p.tx - nx * w1, p.ty - ny * w1], [p.x - nx * w0 / 2, p.y - ny * w0 / 2]], gid = 'deskbeam-' + (p.id || 0);
  var UB = { filterUnits: 'userSpaceOnUse', x: -600, y: -600, width: cv.w + 1280, height: cv.h + 1320 };
  return (
    <svg width={cv.w} height={cv.h} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', mixBlendMode: 'screen', pointerEvents: 'none' }}>
      <defs><linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={p.x} y1={p.y} x2={p.tx} y2={p.ty}>
        <stop offset="0" stopColor={'rgb(' + rgb + ')'} stopOpacity={Math.min(1, a * 2.2).toFixed(3)} /><stop offset="0.55" stopColor={'rgb(' + rgb + ')'} stopOpacity={a.toFixed(3)} /><stop offset="1" stopColor={'rgb(' + rgb + ')'} stopOpacity={(a * 0.25).toFixed(3)} />
      </linearGradient>
        <filter id={gid + '-s'} {...UB}><feGaussianBlur stdDeviation={p.soft || 34} /></filter><filter id={gid + '-h'} {...UB}><feGaussianBlur stdDeviation={14} /></filter></defs>
      <polygon points={pts.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ')} fill={'url(#' + gid + ')'} filter={'url(#' + gid + '-s)'} />
      <circle cx={p.x} cy={p.y} r={w0 * 0.45} fill={'rgb(' + rgb + ')'} opacity={Math.min(1, a * 6).toFixed(3)} filter={'url(#' + gid + '-h)'} />
    </svg>
  );
}
// toz: parçacıklar yavaş yükselir, ışık havuzunda parlar (lit(x, y) → 0..1)
function DeskDust(props) {
  var cv = MH.canvas(), r = MH.rng(props.seed || 5), T = props.T, dots = [], n = props.n || 50;
  for (var i = 0; i < n; i++) {
    var x0 = r() * cv.w, y0 = r() * cv.h, sz = 2 + r() * 2, a0 = 0.1 + r() * 0.3, sp = 6 + r() * 14, ph = r() * 6.28;
    var y = ((y0 - T * sp) % cv.h + cv.h) % cv.h, x = x0 + Math.sin(T * 0.4 + ph) * 12, lit = props.lit ? props.lit(x, y) : 0;
    dots.push(<circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={(sz / 2).toFixed(2)} fill={'rgba(' + DESK.dust + ',' + Math.min(0.85, a0 + lit * 0.45).toFixed(3) + ')'} />);
  }
  return <svg width={cv.w} height={cv.h} style={{ position: 'absolute', left: 0, top: 0, filter: 'blur(0.6px)', pointerEvents: 'none' }}>{dots}</svg>;
}
var DeskLit = MHLit;   // okunacak metin taşıyan kahramanda ışık çarpımsal (screen ışık mürekkebin siyahını kaldırır)

Object.assign(window, {
  DESK: DESK, DESK_FONT: DESK_FONT, DESK_DRIFT: DESK_DRIFT, DESK_SHAKE: DESK_SHAKE, DESK_LIGHT_OPEN: DESK_LIGHT_OPEN,
  deskE: deskE, deskDrift: deskDrift, deskShake: deskShake, deskLightOpen: deskLightOpen,
  DeskWrinkle: DeskWrinkle, DeskDefs: DeskDefs, DeskGrain: DeskGrain, DeskWorld: DeskWorld, DeskCamera: DeskCamera, DeskZLayer: DeskZLayer,
  DeskPlane: DeskPlane, deskPlaneOrigin: deskPlaneOrigin, DeskPaperCorner: DeskPaperCorner, DeskPaper: DeskPaper, DeskInk: DeskInk, DeskPencil: DeskPencil,
  DeskGlow: DeskGlow, DeskPenTip: DeskPenTip, deskInkCol: deskInkCol, deskHandFont: deskHandFont, deskHandW: deskHandW, deskHandEnd: deskHandEnd,
  deskHandRight: deskHandRight, DeskHand: DeskHand, DeskStroke: DeskStroke, deskLinePts: deskLinePts, deskEllipsePts: deskEllipsePts,
  deskBoxPts: deskBoxPts, deskBezPts: deskBezPts, DeskPrintHead: DeskPrintHead, DeskLampBeam: DeskLampBeam, DeskDust: DeskDust, DeskLit: DeskLit,
});
