// world/screen-dark.jsx — ÖRNEK world "screen-dark": ekran dünyası, sıcak karanlıkta (ÖRNEK, varsayılan değil — skills/motion-world/SKILL.md).
// Kimlik: ekranlar, kartlar, gösterge grafikleri, terminal ve sayaç masa dünyasıyla aynı karanlıkta ve aynı (amber) anahtar ışıkta.
//   "Soğukluk anlatıdan gelir, renk sıcaklığından değil." Soğuk fosfor yüzey + arduvaz + yeşil ızgara her ekran grafiğine benzer; bu world onu reddeder.
// Bağımlılık: React + shared/motion-core.jsx (MH, MHModeStyles). Yükleme: motion-stage → motion-core → screen-dark → sahne.
// Kurallar: fosfor YALNIZ veridir (rakam, eksen, imleç, sparkline) — panel, ızgara, çerçeve, zemin ışığı fosfor değildir · kayıp rengi tek rolde
//   (çizgi/sayı/etikette, yüzeyde değil) · ışıyan veri düşümün ÜSTÜNDE (ScreenWorld.over) · fade yok (CRT, sert yenileme, tarama silmesi, itiş) ·
//   flicker kare-kesin · okunacak fosfor zemin ≤ ~%18'de · ikon ≥ 20 px.
// Doku: zemin "bulutsu" dokusu yordamsal (feTurbulence). Gerçek bir görüntü kullanılacaksa MHAssetTexture ile, aynı %6 / screen / 9 px bulanıklıkla.

var SCR = {
  base: '#0A0908', glass: '#0F0E0C', glassTop: '#14120F', glassBottom: '#0B0A08',
  key: '217,174,82', warm: '255,217,163',                    // anahtar ışık rengi (amber) · havuz sıcaklığı
  ph: '#8FA89A', phDark: '#5E7468', phLight: '#C4D6CB', ph3: '143,168,154', secondary: '#6E8A6A',   // fosfor ailesi (yalnız veri)
  fog: '#9BA3AD', ash: '#5A6068', grid: 'rgba(90,96,104,0.18)', edge: 'rgba(155,163,173,0.20)',
  loss: '#8E1D24', lossInk: '#C8434B', lossReadable: '#D78187',   // kayıp rengi: tek rol
  displayTop: '#F2F4F7', displayBottom: '#B8BEC6', labelText: '#C9CED4', labelBg: 'rgba(15,14,12,0.94)', faceLabel: '#4A504D',
  nebula: 0.06, blink: 0.6, icon: 20, crtRate: 30,          // doku %6 · imleç döngüsü 0.6 s · ikon 20 px · CRT adımları 30 Hz ızgarasında
  fall: 0.3, vignette: 0.35, grain: 0.04, drift: 0.4, open: 0.4, exitBefore: 0.3,
};
var SCR_FONT = { display: '"Saira Condensed", sans-serif', body: 'Inter, system-ui, sans-serif', mono: '"JetBrains Mono", ui-monospace, monospace' };
var SCR_DRIFT = {   // drift dalgası (ekran px, k = 1)
  x: [11.5, [[0.55, 0.37, 0], [0.3, 0.91, 1.3]]],
  y: [6.5, [[0.55, 0.29, 0.7], [0.3, 0.83, 2.1]]],
  rz: [1, [[0.2, 0.23, 0.4], [0.1, 0.71, 1.9]]],
};
var SCR_LABEL = { grow: 0.25, line: 0.2, box: 0.15, cps: 20, close: 0.3 };   // uzayan etiket (K-22) sayıları

function scrTextW(font, text) { return MH.measureText(font, text); }   // her karede (önbellek yok, font yüklenince değişir)
function scrScale(hex, k) { return MH.scaleColor(hex, k); }
function scrBlink(T, phase) { var u = ((T - (phase || 0)) % SCR.blink + SCR.blink) % SCR.blink; return u < SCR.blink / 2 ? 1 : 0.12; }   // sert: açık / sönük

// ── world katmanı ─────────
function ScreenGrain(p) {   // gren: feTurbulence 0.9 / 2 oktav, overlay; tohum 30 Hz ızgarasında
  var cv = MH.canvas(), seed = MH.grainSeed(p.T || 0, 30, 1e-6);
  return (
    <svg width={cv.w} height={cv.h} style={{ position: 'absolute', left: 0, top: 0, mixBlendMode: 'overlay', opacity: p.o, pointerEvents: 'none' }}>
      <filter id="scr-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} /><feColorMatrix type="saturate" values="0" /><feComponentTransfer><feFuncA type="table" tableValues="1 1" /></feComponentTransfer></filter>
      <rect width={cv.w} height={cv.h} filter="url(#scr-grain)" />
    </svg>
  );
}
// Katmanlar (alttan üste): zemin → drift (ekran uzayı; overscan 1 + 0.02k) → düşüm (multiply radyal) → ışıma (screen, anahtar rengi × a) → over (ışıyan veri) →
// vinyet (elips %72, %52'den) → pozlama (açılış: ışık `open` s'de gelir; kapanış `exit` → son kare tam siyah) → gren.
// props: T (sahne zamanı), dur (süre), light {x, y, r, a}, rgb (havuz sıcaklığı), fall, vignette, grain, drift, driftRot, overscan, open, exit, bg, over
function ScreenWorld(props) {
  var cv = MH.canvas(), t = props.T || 0, last = props.dur - 1 / MH.fps(), cx = cv.w / 2, cy = cv.h / 2;
  var light = props.light || { x: cx, y: cy * 0.78, r: cv.w * 0.57, a: 0.06 }, rgb = props.rgb || SCR.warm;
  var fall = props.fall == null ? SCR.fall : props.fall, vig = props.vignette == null ? SCR.vignette : props.vignette, grain = props.grain == null ? SCR.grain : props.grain;
  var k = props.drift == null ? SCR.drift : props.drift, d = MH.drift(t, k, SCR_DRIFT), ov = props.overscan ? 1 + 0.02 * k : 1, rz = d.rz * (props.driftRot == null ? 1 : props.driftRot);
  var open = props.open == null ? SCR.open : props.open, lightOn = open > 0 ? MH.ease.enter(MH.pAB(t, 0, open)) : 1;
  var ex = props.exit == null ? last - SCR.exitBefore : props.exit, expo = t >= last - 1e-4 ? 0 : 1 - MH.ease.exit(MH.pAB(t, ex, last));
  var full = { position: 'absolute', inset: 0, pointerEvents: 'none' };
  var fstop = function (q, pos) { var v = Math.round(255 * (1 - fall * q)); return 'rgb(' + v + ',' + v + ',' + v + ') ' + pos + '%'; };
  var fallGrad = [fstop(0, 0), fstop(0.06, 30), fstop(0.3, 55), fstop(0.62, 75), fstop(0.88, 90), fstop(1, 100)].join(', '), a = light.a * lightOn;
  var body = MH.mode.card() ? <div data-fx="gri-kart" style={{ position: 'absolute', inset: 0, background: '#FFFFFF' }} /> : props.children;
  return (
    <div data-fx="screen-world" style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: props.bg || SCR.base }}>
      <MHModeStyles root="[data-fx=screen-world]" />
      <div style={{ position: 'absolute', inset: 0, transformOrigin: cx + 'px ' + cy + 'px', transform: 'translate(' + d.dx.toFixed(2) + 'px,' + d.dy.toFixed(2) + 'px) rotate(' + rz.toFixed(3) + 'deg)' + (ov !== 1 ? ' scale(' + ov.toFixed(4) + ')' : '') }}>{body}</div>
      {fall > 0.001 && <div style={Object.assign({}, full, { mixBlendMode: 'multiply', background: 'radial-gradient(circle ' + Math.round(light.r * 1.05) + 'px at ' + light.x + 'px ' + light.y + 'px, ' + fallGrad + ')' })} />}
      {a > 0.001 && <div style={Object.assign({}, full, { mixBlendMode: 'screen', background: 'radial-gradient(circle ' + light.r + 'px at ' + light.x + 'px ' + light.y + 'px, rgba(' + rgb + ',' + a.toFixed(4) + ') 0%, rgba(' + rgb + ',0) 100%)' })} />}
      {props.over && <div style={{ position: 'absolute', inset: 0, transformOrigin: cx + 'px ' + cy + 'px', transform: 'translate(' + d.dx.toFixed(2) + 'px,' + d.dy.toFixed(2) + 'px) rotate(' + rz.toFixed(3) + 'deg)' + (ov !== 1 ? ' scale(' + ov.toFixed(4) + ')' : '') }}>{props.over}</div>}
      {vig > 0.001 && <div style={Object.assign({}, full, { background: 'radial-gradient(ellipse 72% 72% at 50% 50%, rgba(0,0,0,0) 52%, rgba(0,0,0,' + vig + ') 100%)' })} />}
      {expo < 1 && <div style={Object.assign({}, full, { background: '#000', opacity: (1 - expo).toFixed(4) })} />}
      {grain > 0 && !MH.mode.prof('grain') && <ScreenGrain T={t} o={grain} />}
    </div>
  );
}
// zemin: sıcak siyah + yordamsal bulutsu doku %6 (screen, 9 px bulanık); ışık katmanlarının ALTINDA (anahtar ışık onu da aydınlatır)
function ScreenGround(p) {
  var cv = MH.canvas(), o = p.nebula == null ? SCR.nebula : p.nebula, W = cv.w + 240, H = cv.h + 240;
  return (
    <React.Fragment>
      <div style={{ position: 'absolute', left: -80, top: -80, right: -80, bottom: -80, background: SCR.base }} />
      {o > 0 && <svg width={W} height={H} style={{ position: 'absolute', left: -120, top: -120, filter: 'blur(9px)', mixBlendMode: 'screen', opacity: o }}>
        <filter id="scr-nebula" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.0028 0.0042" numOctaves="4" seed={p.seed || 17} /><feColorMatrix type="matrix" values="0 0 0 0.9 0  0 0 0 0.78 0  0 0 0 0.62 0  0 0 0 0 1" /></filter>
        <rect width={W} height={H} filter="url(#scr-nebula)" />
      </svg>}
    </React.Fragment>
  );
}
// cam ekran gövdesi: koyu sıcak cam, 1 px kenar (fog %20), hafif yansıma şeridi; gölgesi ışığın tersine (sx, sy); hero → data-hero
function ScreenGlass(p) {
  var r = p.r == null ? 18 : p.r, sx = p.sx == null ? 26 : p.sx, sy = p.sy == null ? 34 : p.sy;
  return (
    <React.Fragment>
      {p.shadow !== false && <div style={{ position: 'absolute', left: p.x + sx, top: p.y + sy, width: p.w, height: p.h, borderRadius: r, background: 'rgba(0,0,0,0.7)', filter: 'blur(40px)' }} />}
      <div data-hero={p.hero ? '1' : undefined} style={{ position: 'absolute', left: p.x, top: p.y, width: p.w, height: p.h, borderRadius: r, overflow: 'hidden',
        background: 'linear-gradient(165deg, ' + SCR.glassTop + ' 0%, ' + SCR.glass + ' 55%, ' + SCR.glassBottom + ' 100%)', boxShadow: 'inset 0 0 0 1px ' + SCR.edge }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg, rgba(255,240,220,0) 30%, rgba(255,240,220,0.035) 38%, rgba(255,240,220,0) 46%)' }} />
        {p.children}
      </div>
    </React.Fragment>
  );
}
function ScreenGrid(p) {   // ızgara: düzenin işareti, ışık değil (ash %18, 1 px); nx × ny hücre
  var w = p.w, h = p.h, nx = p.nx || 10, ny = p.ny || 6, out = [];
  for (var i = 1; i < nx; i++) out.push(<line key={'x' + i} x1={i * w / nx} y1={0} x2={i * w / nx} y2={h} stroke={SCR.grid} strokeWidth={1} />);
  for (var j = 1; j < ny; j++) out.push(<line key={'y' + j} x1={0} y1={j * h / ny} x2={w} y2={j * h / ny} stroke={SCR.grid} strokeWidth={1} />);
  return <svg width={w} height={h} style={{ position: 'absolute', left: p.x || 0, top: p.y || 0, pointerEvents: 'none' }}>{out}</svg>;
}
// imleç glifi (anonim): taban merkezi (x, y) çizginin üstünde, w × h gövde, fosfor + ışıma. on: yanıp sönme (scrBlink) · lie 0..1: gövde tabanı
// etrafında 90° döner ve çizgiye yatar → cevap "—" (ayrı tire yazılmaz) · s: ölçek (büyük ölçekte terminal yazım imleci)
function ScreenCursor(p) {
  var s = p.s || 1, lie = p.lie || 0, on = p.on == null ? 1 : p.on, w = p.w || 6, h = p.h || 22;
  var col = 'rgba(' + SCR.ph3 + ',' + (0.95 * on).toFixed(3) + ')', glow = on > 0.5 ? '0 0 ' + (8 * s).toFixed(1) + 'px rgba(' + SCR.ph3 + ',0.55)' : undefined;
  return (
    <div style={{ position: 'absolute', left: p.x, top: p.y, width: 0, height: 0, transform: 'rotate(' + (90 * MH.ease.smooth(lie)).toFixed(2) + 'deg) scale(' + s + ')', transformOrigin: '0 0' }}>
      <div style={{ position: 'absolute', left: -w / 2, top: -h, width: w, height: h, borderRadius: 1, background: col, boxShadow: glow }} />
    </div>
  );
}
function ScreenIcon(p) {   // ikon: 12 birimlik yol, size px'e ölçeklenir (ekranda ≥ 20 px; 12 px okunmadı), fosfor
  var z = p.size || SCR.icon;
  return <svg width={z} height={z} viewBox="0 0 12 12" style={{ position: 'absolute', left: p.x, top: p.y, overflow: 'visible' }}><path d={p.d || 'M2 2 H10 V10 H2 Z'} fill={p.color || SCR.ph} /></svg>;
}
// Display malzemesi (ışık alan harf): Saira Condensed 700, dikey gradyan + 1 px sıcak üst ışık + alta gölge; lit: aldığı ışık (0..1)
function ScreenDisplay(p) {
  var lit = p.lit == null ? 1 : p.lit, size = p.size, top = p.top || SCR.displayTop, bot = p.bot || SCR.displayBottom;
  var base = { position: 'absolute', left: 0, top: 0, font: '700 ' + size + 'px/1 ' + SCR_FONT.display, letterSpacing: p.ls || '0.01em', whiteSpace: 'pre' };
  var clip = { WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' };
  return (
    <div style={{ position: 'absolute', left: p.x, top: p.y, filter: 'drop-shadow(0 ' + Math.round(size * 0.2) + 'px ' + Math.round(size * 0.28) + 'px rgba(0,0,0,' + (0.62 * lit).toFixed(3) + '))' }}>
      <div aria-hidden="true" data-doku="1" style={Object.assign({}, base, { color: 'rgba(255,244,228,' + ((p.hi == null ? 0.8 : p.hi) * lit).toFixed(3) + ')', transform: 'translateY(-1px)' })}>{p.text}</div>
      <div data-hero={p.hero ? '1' : undefined} data-doku={p.doku ? '1' : undefined} data-fx="display" style={Object.assign({}, base, clip, { backgroundImage: 'linear-gradient(180deg, ' + scrScale(top, lit) + ' 14%, ' + scrScale(bot, lit) + ' 86%)' })}>{p.text}</div>
    </div>
  );
}
// uzayan etiket (K-22): kind 'pill' (kapsül noktadan uzar, içine yazılır) | 'leader' (çizgi hedeften uzar, ucunda kutu açılır, yazılır); t1: kapanış (ters sıra)
function scrLabel(T, p) {
  p = Object.assign({}, SCR_LABEL, p);
  var cl = p.t1 != null ? MH.ease.smooth(MH.pAB(T, p.t1, p.t1 + p.close)) : 0;
  var L = p.kind === 'leader' ? MH.ease.enter(MH.pAB(T, p.t0, p.t0 + p.line)) : 1;
  var b0 = p.kind === 'leader' ? p.t0 + p.line * 0.8 : p.t0, B = MH.ease.enter(MH.pAB(T, b0, b0 + (p.kind === 'leader' ? p.box : p.grow)));
  var n = p.text.length, ty0 = b0 + (p.kind === 'leader' ? p.box : p.grow) * 0.7, typed = Math.max(0, Math.min(n, Math.floor((T - ty0) * p.cps + 1e-6)));
  if (cl > 0) { typed = Math.round(n * Math.max(0, 1 - cl * 2)); B = Math.min(B, 1 - Math.max(0, cl * 2 - 0.6) / 0.4); L = Math.min(L, 1 - Math.max(0, cl * 2 - 1)); }
  return { L: Math.max(0, L), B: Math.max(0, B), typed: typed, on: T >= p.t0 && (p.t1 == null || cl < 1) };
}
// görünüm: sıcak koyu cam kutu, kenar fog %20, çizgi fog (ad, veri değil) — fosfor yok. Hap veri çizgisinin ucundan ≥ 16 px; çizgiler önde.
function ScreenLabel(p) {
  var s = scrLabel(p.T, p), cv = MH.canvas();
  if (!s.on) return null;
  var font = p.font || '600 30px ' + SCR_FONT.display, h = p.h || 46, pad = p.pad || 16, tw = scrTextW(font, p.text), W = tw + pad * 2 + (p.kind === 'pill' ? h * 0.3 : 0);
  var ex = p.x + (p.dx || 0), ey = p.y + (p.dy || 0), left = p.kind === 'leader' ? ((p.dx || 0) >= 0 ? ex : ex - W * s.B) : p.x, line = p.lineColor || 'rgba(155,163,173,0.8)';
  return (
    <React.Fragment>
      {p.kind === 'leader' && <svg width={cv.w} height={cv.h} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        <circle cx={p.x} cy={p.y} r={p.dot || 4} fill={line} opacity={s.L > 0 ? 1 : 0} />
        <path d={'M' + p.x + ' ' + p.y + ' L' + ex + ' ' + ey} stroke={line} strokeWidth={p.lineW || 1.5} fill="none" pathLength="1" strokeDasharray="1" strokeDashoffset={(1 - s.L).toFixed(4)} />
      </svg>}
      {s.B > 0.001 && <div data-fx="label" style={{ position: 'absolute', left: left, top: (p.kind === 'leader' ? ey : p.y) - h / 2, width: Math.max(p.kind === 'pill' ? h : 2, W * s.B), height: h,
        borderRadius: p.kind === 'pill' ? h / 2 : (p.radius || 3), background: p.bg || SCR.labelBg, boxShadow: 'inset 0 0 0 1px ' + SCR.edge, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: pad + (p.kind === 'pill' ? h * 0.15 : 0), top: 0, height: h, display: 'flex', alignItems: 'center', whiteSpace: 'pre', font: font, color: p.color || SCR.labelText, letterSpacing: p.ls || '0.03em' }}>{p.text.slice(0, s.typed)}</div>
      </div>}
    </React.Fragment>
  );
}
// veri çizgisi (sparkline): fosfor, kendi ışımasıyla; p 0..1 soldan çizilir. pts [[x, y], …] yerel; loss → kayıp rengi (tek rol)
function ScreenSpark(p) {
  var pr = MH.clamp(p.p == null ? 1 : p.p, 0, 1); if (pr <= 0) return null;
  var pts = MH.poly.upTo(p.pts, pr), d = MH.poly.d(pts), col = p.loss ? SCR.lossInk : (p.color || SCR.ph), glow = p.loss ? '200,67,75' : SCR.ph3, id = 'scr-spark-' + (p.id || 0);
  return (
    <svg width={p.w} height={p.h} style={{ position: 'absolute', left: p.x || 0, top: p.y || 0, overflow: 'visible', pointerEvents: 'none' }}>
      <defs><filter id={id} x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation={4} /></filter></defs>
      <path d={d} fill="none" stroke={'rgba(' + glow + ',0.5)'} strokeWidth={6} filter={'url(#' + id + ')'} />
      <path d={d} fill="none" stroke={col} strokeWidth={p.w0 || 2.4} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── CRT ekranlı cam nesne (gövde + ışıyan yüz) ─────────
// Gövde sahnede (anahtar ışığını alır); ışıyan yüz ScreenWorld.over'da (düşüm onu karartmaz). Ölçek: varsayılan 270×96; w verilirse her şey s = w/270.
// scrCRT(T, tOff, tOn): kare-kesin durum {k: dikey ölçek, b: parlaklık, on}. Açılış: 2 adım yatay çizgi → 3 adımda dikey açılış → 1 adım %140 → değer.
// Kapanış: 1 adım %140 → 3 adımda çöküş (0.42 → 0.11 → 0.02) → 2 adım parlak çizgi → söner. Adımlar SCR.crtRate ızgarasında (30 Hz; 60 fps'te adım = 2 kare).
function scrCRT(T, tOff, tOn) {
  var R = SCR.crtRate, f = MH.frame(T, R), o = tOff == null ? Infinity : MH.frame(tOff, R), on = tOn == null ? null : MH.frame(tOn, R);
  if (on != null && f < on + 6) {
    if (f < on) return { k: 0, b: 0, on: 0 };
    if (f < on + 2) return { k: 0.02, b: f === on ? 1.1 : 1.2, on: 1 };
    if (f < on + 5) return { k: [0.11, 0.42, 1][f - on - 2], b: 1.25, on: 1 };
    return { k: 1, b: 1.4, on: 1 };
  }
  return f < o ? { k: 1, b: 1, on: 1 } : f === o ? { k: 1, b: 1.4, on: 1 } : f <= o + 3 ? { k: [0.42, 0.11, 0.02][f - o - 1], b: 1.25, on: 1 } : f <= o + 5 ? { k: 0.02, b: f === o + 4 ? 1.2 : 1.1, on: 1 } : { k: 0, b: 0, on: 0 };
}
function ScreenBody(p) {   // gövde: gölge (sx/sy: itişte önce hareket eder; shadow={false}: sahne çizer) + koyu sıcak cam + 1 px kenar + yansıma şeridi
  var W = p.w || 270, H = p.h || 96, s = W / 270;
  return (
    <React.Fragment>
      {p.shadow !== false && <div style={{ position: 'absolute', left: (p.sx == null ? p.x : p.sx) + 10 * s, top: (p.sy == null ? p.y : p.sy) + 16 * s, width: W, height: H, borderRadius: 7 * s, background: 'rgba(0,0,0,0.7)', filter: 'blur(' + 17 * s + 'px)' }} />}
      <div style={{ position: 'absolute', left: p.x, top: p.y, width: W, height: H, borderRadius: 7 * s, overflow: 'hidden', background: 'linear-gradient(165deg, ' + SCR.glassTop + ' 0%, ' + SCR.glass + ' 60%, ' + SCR.glassBottom + ' 100%)', boxShadow: 'inset 0 0 0 1px ' + SCR.edge, filter: p.blur > 0.05 ? 'blur(' + p.blur.toFixed(2) + 'px)' : undefined }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.06) 38%, rgba(255,255,255,0) 46%)' }} />
      </div>
    </React.Fragment>
  );
}
// ışıyan yüz (x, y, w × h): etiket, mono rakam (fosfor), CRT parlaması, çöküş çizgisi. c: scrCRT() · glow: rakam ışıması. Yansıma CRT'nin DIŞINDA (gövdede).
function ScreenFace(p) {
  var c = p.c, W = p.w || 270, H = p.h || 96, s = W / 270;
  if (!c.on) return null;
  var box = { position: 'absolute', left: p.x, top: p.y, width: W, height: H };
  if (c.k <= 0.05) return (   // çöküş / açılış çizgisi: ölçeklenmez (ışıması ezilmesin), ışıma ayrı
    <div style={box}><div style={{ position: 'absolute', left: (c.b > 1.15 ? 10 : 26) * s, right: (c.b > 1.15 ? 10 : 26) * s, top: H / 2 - 1.5 * s, height: 3 * s, borderRadius: 2 * s,
      background: 'linear-gradient(90deg, rgba(200,236,214,0) 0%, rgba(236,252,242,0.95) 14%, #FFFFFF 50%, rgba(236,252,242,0.95) 86%, rgba(200,236,214,0) 100%)',
      boxShadow: '0 0 ' + 6 * s + 'px ' + 1 * s + 'px rgba(255,255,255,0.85), 0 0 ' + 22 * s + 'px ' + 6 * s + 'px rgba(160,214,186,0.6)' }} /></div>
  );
  return (
    <div style={box}><div style={{ position: 'absolute', inset: 0, transform: 'scaleY(' + c.k + ')', transformOrigin: '50% 50%', filter: c.b !== 1 ? 'brightness(' + c.b + ')' : undefined }}>
      {c.k > 0.5 && p.label && <div data-doku="1" style={{ position: 'absolute', left: 18 * s, top: 12 * s, font: '500 ' + (p.labelSize || 11 * s) + 'px ' + SCR_FONT.mono, letterSpacing: '0.22em', color: p.labelColor || SCR.faceLabel }}>{p.label}</div>}
      <div data-fx="face-value" style={{ position: 'absolute', right: 18 * s, top: 28 * s, font: '500 ' + 44 * s + 'px/1 ' + SCR_FONT.mono, color: p.color || SCR.ph, fontVariantNumeric: 'tabular-nums', textShadow: '0 0 ' + 8 * s + 'px rgba(' + SCR.ph3 + ',' + (p.glow == null ? '0.67' : p.glow.toFixed(3)) + ')' }}>{p.value}</div>
      {c.b > 1.05 && <div style={{ position: 'absolute', inset: 0, background: 'rgba(170,204,186,' + (0.5 * (c.b - 1)).toFixed(3) + ')' }} />}
    </div></div>
  );
}

Object.assign(window, {
  SCR: SCR, SCR_FONT: SCR_FONT, SCR_DRIFT: SCR_DRIFT, SCR_LABEL: SCR_LABEL, scrTextW: scrTextW, scrScale: scrScale, scrBlink: scrBlink,
  ScreenGrain: ScreenGrain, ScreenWorld: ScreenWorld, ScreenGround: ScreenGround, ScreenGlass: ScreenGlass, ScreenGrid: ScreenGrid, ScreenCursor: ScreenCursor,
  ScreenIcon: ScreenIcon, ScreenDisplay: ScreenDisplay, scrLabel: scrLabel, ScreenLabel: ScreenLabel, ScreenSpark: ScreenSpark, scrCRT: scrCRT,
  ScreenBody: ScreenBody, ScreenFace: ScreenFace,
});
