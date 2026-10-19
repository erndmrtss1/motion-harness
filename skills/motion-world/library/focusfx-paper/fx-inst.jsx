// world/fx-inst.jsx — kütüphane world "focusfx-paper" (eski adı fx-lab) v5 ENSTRÜMANLAR: "enstrüman gerçektir; kelime + şekil değil". Her biri 3 varyant (v: 'a' | 'b' | 'c').
//   FXScope  osiloskop: gövde (eloksal / çelik) + çerçeve + ızgaralı ekran (10×8 bölme) + fosfor iz (çekirdek + ışıma + kalıcılık) + düğmeler + BNC
//   FXDial   kadran: a 270° basınç göstergesi · b 180° aynalı skala · c açıölçer
//   FXRule   cetvel: a akrilik · b çelik · c üçgen ölçek   ·   FXCal kalibre: a verniyeli · b saatli · c mikrometre
//   FXHatch  taralı vurgu (45°, mürekkep mavisi)   ·   FXLadder merdiven (seviye etiketli; üst tarama, alt yıkama, hl vurgusu)
// Varyant seçimi bileşen varyant tahtasında yapılır (kare k = varyant k); seçim sahnede tek satır.
// Bağımlılık: world/fx-lab.jsx (FXT, FXF, FXE, fxClamp, FX_PEN), world/fx-rig.jsx (FX4, fxShadowAt), motion-core (MHAssetTexture).
// Metin: panel etiketleri yalnız doku (data-doku, < 22 px); okunacak metin sahnede. Plakalar (varsa): plate-bezel-1, plate-phosphor-1, plate-metal-2.

function fxKnurl(cx, cy, r, a, n, col) {   // tırtıllı düğme kenarı
  var out = []; for (var i = 0; i < n; i++) { var t = (i / n) * 2 * Math.PI + a; out.push(<line key={i} x1={cx + Math.cos(t) * r * 0.86} y1={cy + Math.sin(t) * r * 0.86} x2={cx + Math.cos(t) * r} y2={cy + Math.sin(t) * r} stroke={col} strokeWidth={1.1} />); }
  return out;
}
function FXKnob(p) {   // düğme (SVG grubu): gölge + tırtıl + kapak gradyanı + işaret çizgisi; a: dönüş (°)
  var r = p.r, a = (p.a || 0) * Math.PI / 180, id = 'kn' + p.id;
  return (
    <g data-c="FXKnob">
      <defs><radialGradient id={id} cx="35%" cy="30%" r="80%"><stop offset="0" stopColor={FX4.anodHi} /><stop offset="0.7" stopColor={FX4.knob} /><stop offset="1" stopColor="#101216" /></radialGradient></defs>
      <circle cx={p.x + r * 0.28} cy={p.y + r * 0.4} r={r * 1.02} fill={'rgba(' + FX4.shadow + ',0.45)'} style={{ filter: 'blur(' + (r * 0.18).toFixed(1) + 'px)' }} />
      <circle cx={p.x} cy={p.y} r={r} fill={'url(#' + id + ')'} />
      {fxKnurl(p.x, p.y, r, a, Math.max(18, Math.round(r * 1.6)), 'rgba(255,255,255,0.10)')}
      <circle cx={p.x} cy={p.y} r={r * 0.62} fill={FX4.knob} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
      <line x1={p.x + Math.cos(a - Math.PI / 2) * r * 0.2} y1={p.y + Math.sin(a - Math.PI / 2) * r * 0.2} x2={p.x + Math.cos(a - Math.PI / 2) * r * 0.58} y2={p.y + Math.sin(a - Math.PI / 2) * r * 0.58} stroke={FX4.steelLight} strokeWidth={Math.max(1.5, r * 0.08)} strokeLinecap="round" />
    </g>
  );
}
// iz örnekleri: temiz sinüs (+ harmonik) → gürültü (sinyal içinde) · u 0..1 ekran genişliği. Gürültü indeksi T·210 ile kayar (sabit hız, fps'ten bağımsız).
function fxTrace(u, s, T) {
  var ph = (s.phase || 0) + T * (s.speed == null ? 1.6 : s.speed), f = s.freq || 2.2, A = s.amp == null ? 0.3 : s.amp, nz = s.noise || 0;
  var y = A * Math.sin(2 * Math.PI * (f * u) + ph) + 0.08 * A * Math.sin(2 * Math.PI * (3 * f * u) + 2 * ph);
  if (nz > 0) { var k = Math.floor(u * 260 + T * 210), r1 = Math.sin(k * 12.9898 + 78.233) * 43758.5453, r2 = Math.sin(k * 4.1414 + T * 3.7) * 9631.17;
    y += nz * (0.55 * ((r1 - Math.floor(r1)) - 0.5) + 0.3 * Math.sin(2 * Math.PI * 17 * u + T * 9) * Math.sin(2 * Math.PI * 1.3 * u + T) + 0.25 * ((r2 - Math.floor(r2)) - 0.5)); }
  return y;
}
// ekran: ızgara + iz + klip (screen) + cam — w × h yerel; round: dairesel maske; sig {freq, amp, speed, phase, noise, clipTop}
function FXScreen(p) {
  var w = p.w, h = p.h, T = p.T || 0, s = p.sig || {}, on = p.on == null ? 1 : p.on, N = 220, pts = [], ghost = [], id = 'sc' + (p.id || 0);
  var yc = function (y) { return s.clipTop ? Math.max(s.clipTop * h, y) : y; };   // üst bant kırpması (sinyal ekranı aşar, düz kesilir)
  for (var i = 0; i <= N; i++) { var u = i / N; pts.push((u * w).toFixed(1) + ',' + yc(h / 2 - fxTrace(u, s, T) * h).toFixed(1)); ghost.push((u * w).toFixed(1) + ',' + yc(h / 2 - fxTrace(u, s, T - 0.09) * h).toFixed(1)); }
  var grid = [], dx = w / 10, dy = h / 8, gc = 'rgba(' + FX4.phosGlow + ',0.38)';
  for (var gx = 1; gx < 10; gx++) grid.push(<line key={'x' + gx} x1={gx * dx} y1={0} x2={gx * dx} y2={h} stroke={gc} strokeWidth={gx === 5 ? 1.4 : 0.9} strokeDasharray={gx === 5 ? undefined : '2 5'} />);
  for (var gy = 1; gy < 8; gy++) grid.push(<line key={'y' + gy} x1={0} y1={gy * dy} x2={w} y2={gy * dy} stroke={gc} strokeWidth={gy === 4 ? 1.4 : 0.9} strokeDasharray={gy === 4 ? undefined : '2 5'} />);
  for (var t = 0; t <= 50; t++) { grid.push(<line key={'tx' + t} x1={t * dx / 5} y1={h / 2 - 6} x2={t * dx / 5} y2={h / 2 + 6} stroke={gc} strokeWidth={1} />); if (t <= 40) grid.push(<line key={'ty' + t} x1={w / 2 - 6} y1={t * dy / 5} x2={w / 2 + 6} y2={t * dy / 5} stroke={gc} strokeWidth={1} />); }
  var pl = pts.join(' '), clip = p.clip, bl = p.blur > 0.05 ? 'blur(' + p.blur.toFixed(2) + 'px)' : undefined;
  return (
    <div data-c="FXScreen" style={{ position: 'absolute', left: p.x, top: p.y, width: w, height: h, borderRadius: p.round ? '50%' : (p.radius == null ? 18 : p.radius), overflow: 'hidden', background: 'radial-gradient(ellipse 70% 70% at 50% 50%, #142028 0%, ' + FX4.glass + ' 100%)' }}>
      <div style={{ position: 'absolute', inset: 0, filter: bl }}>
        {clip && on > 0 && <div style={{ position: 'absolute', inset: 0, opacity: (clip.o == null ? 0.55 : clip.o) * on, mixBlendMode: 'screen' }}><MHAssetTexture id={clip.id} frame={clip.frame} size={clip.size || 'cover'} pos={clip.pos} filter="grayscale(1) contrast(1.1)" /></div>}
        <svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0 }}>
          <defs><filter id={id + 'g'} x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation={p.glowR || 7} /></filter><filter id={id + 'h'} x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation={2.2} /></filter></defs>
          <g opacity={0.9}>{grid}</g>
          {on > 0 && <g opacity={on}>
            <polyline points={ghost.join(' ')} fill="none" stroke={'rgba(' + FX4.phosGlow + ',0.18)'} strokeWidth={3} />
            <polyline points={pl} fill="none" stroke={'rgba(' + FX4.phosGlow + ',0.55)'} strokeWidth={10} filter={'url(#' + id + 'g)'} />
            <polyline points={pl} fill="none" stroke={'rgba(' + FX4.phosGlow + ',0.8)'} strokeWidth={4} filter={'url(#' + id + 'h)'} />
            <polyline points={pl} fill="none" stroke={FX4.phos} strokeWidth={1.8} />
          </g>}
        </svg>
        <MHAssetTexture id="plate-phosphor-1" size="cover" blend="screen" opacity={0.22} filter="grayscale(1)" />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(128deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 32%, rgba(255,255,255,0) 52%)' }} />
        {p.children}
      </div>
      <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 ' + Math.round(w * 0.06) + 'px rgba(0,0,0,0.85)' }} />
    </div>
  );
}
function FXScope(p) {   // x, y (sol-üst, dünya), w (gövde), v, T, sig, clip, on, knobA (düğme açısı), hz (yükseklik), children, scr (ekran çocukları)
  var v = p.v || 'a', w = p.w, T = p.T || 0, ka = p.knobA || 0, sh = fxShadowAt(p.hz || 90);
  var G = v === 'b' ? { h: 0.6, sx: 0.05, sy: 0.08, sw: 0.66, sr: 0.625, body: 'steel' } : v === 'c' ? { h: 0.78, sx: 0.08, sy: 0.07, sw: 0.56, sr: 1, body: 'anod', round: true } : { h: 0.68, sx: 0.05, sy: 0.075, sw: 0.62, sr: 0.8, body: 'anod' };
  var h = w * G.h, sx = w * G.sx, sy = w * G.sy, sw = w * G.sw, shh = sw * G.sr, px0 = sx + sw + w * 0.05, pw = w - px0 - w * 0.04;
  var bodyBg = G.body === 'steel' ? 'linear-gradient(170deg, ' + FX4.steelLight + ' 0%, ' + FX4.steel + ' 55%, ' + FX4.steelDark + ' 100%)' : 'linear-gradient(165deg, ' + FX4.anodHi + ' 0%, ' + FX4.anod + ' 45%, #15171B 100%)';
  var knobs = [];
  if (v === 'b') { for (var i = 0; i < 6; i++) knobs.push([sx + sw * (0.08 + i * 0.17), sy + shh + (h - sy - shh) * 0.5, i % 2 ? w * 0.03 : w * 0.042]); }
  else if (v === 'c') { for (var j = 0; j < 8; j++) knobs.push([w * (0.12 + (j % 4) * 0.25), sy + shh + (h - sy - shh) * (j < 4 ? 0.32 : 0.72), j % 3 === 0 ? w * 0.045 : w * 0.032]); }
  else { [[0.28, 0.16, 0.06], [0.72, 0.16, 0.045], [0.28, 0.42, 0.045], [0.72, 0.42, 0.06], [0.28, 0.64, 0.035], [0.72, 0.64, 0.035]].forEach(function (q) { knobs.push([px0 + pw * q[0], h * q[1] + w * 0.02, w * q[2]]); }); }
  var bnc = v === 'b' ? [[w * 0.86, h * 0.84], [w * 0.93, h * 0.84]] : v === 'c' ? [[w * 0.9, h * 0.9]] : [[px0 + pw * 0.28, h * 0.86], [px0 + pw * 0.72, h * 0.86]];
  var btns = []; if (v !== 'c') for (var k = 0; k < (v === 'b' ? 7 : 6); k++) btns.push(v === 'b' ? [sx + sw + w * 0.012, sy + k * shh / 7 + 8, w * 0.03, shh / 7 - 16] : [sx + k * sw / 6 + 10, sy + shh + w * 0.035, sw / 6 - 20, w * 0.022]);
  var lab = { font: '500 13px/1 ' + FXF.mono, letterSpacing: '0.08em', color: 'rgba(226,232,238,0.62)', textAlign: 'center', position: 'absolute' };
  return (
    <div data-c="FXScope" data-fx="osiloskop" data-hero={p.hero ? '1' : undefined} style={{ position: 'absolute', left: p.x, top: p.y, width: w, height: h, transformStyle: 'preserve-3d' }}>
      <div style={{ position: 'absolute', left: sh.dx, top: sh.dy, width: w, height: h, borderRadius: v === 'c' ? 40 : 22, background: 'rgba(' + FX4.shadow + ',' + (sh.a + 0.1).toFixed(3) + ')', filter: 'blur(' + (sh.blur + 10).toFixed(1) + 'px)' }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: v === 'c' ? 40 : 22, background: bodyBg, overflow: 'hidden', transform: 'translateZ(' + (p.hz || 90) + 'px)', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.16), inset 0 -3px 0 rgba(0,0,0,0.35)' }}>
        <MHAssetTexture id="plate-bezel-1" size="cover" blend={G.body === 'steel' ? 'multiply' : 'screen'} opacity={0.35} filter="grayscale(1)" />
        <div style={{ position: 'absolute', left: sx - w * 0.018, top: sy - w * 0.018, width: sw + w * 0.036, height: shh + w * 0.036, borderRadius: G.round ? '50%' : 26, background: 'linear-gradient(160deg, #0E1013 0%, #24272D 100%)', boxShadow: 'inset 6px 8px 18px rgba(0,0,0,0.75), 0 1px 0 rgba(255,255,255,0.12)' }} />
        <FXScreen x={sx} y={sy} w={sw} h={shh} T={T} sig={p.sig} clip={p.clip} on={p.on} round={G.round} id={p.id || 1} blur={p.scrBlur}>{p.scr}</FXScreen>
        <svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
          {btns.map(function (b, i) { return <rect key={'b' + i} x={b[0]} y={b[1]} width={b[2]} height={b[3]} rx={4} fill={G.body === 'steel' ? FX4.steelDark : '#2C3038'} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />; })}
          {knobs.map(function (q, i) { return <g key={'k' + i}>{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (t) { var an = (-135 + t * 27) * Math.PI / 180 - Math.PI / 2, R1 = q[2] * 1.22, R2 = q[2] * (t % 5 === 0 ? 1.42 : 1.32); return <line key={t} x1={q[0] + Math.cos(an) * R1} y1={q[1] + Math.sin(an) * R1} x2={q[0] + Math.cos(an) * R2} y2={q[1] + Math.sin(an) * R2} stroke={G.body === 'steel' ? FX4.anod : 'rgba(230,236,242,0.45)'} strokeWidth={1.2} />; })}
            <FXKnob x={q[0]} y={q[1]} r={q[2]} a={-60 + i * 37 + (i === 1 ? ka : i === 3 ? -0.6 * ka : 0)} id={(p.id || 1) + '-' + i} /></g>; })}
          {bnc.map(function (q, i) { return <g key={'n' + i}><circle cx={q[0]} cy={q[1]} r={w * 0.026} fill={FX4.steel} stroke={FX4.steelDark} strokeWidth={2} /><circle cx={q[0]} cy={q[1]} r={w * 0.012} fill="#14161A" /><circle cx={q[0]} cy={q[1]} r={w * 0.004} fill={FX4.steelLight} /></g>; })}
          <line x1={w * 0.02} y1={h - 10} x2={w * 0.98} y2={h - 10} stroke="rgba(255,255,255,0.08)" strokeWidth={2} />
          {p.cable && bnc[0] && <g>{p.cable !== 'plug' && <path d={'M ' + bnc[0][0] + ' ' + bnc[0][1] + ' C ' + bnc[0][0] + ' ' + (bnc[0][1] + 60) + ', ' + (bnc[0][0] - 24) + ' ' + (h - 50) + ', ' + (bnc[0][0] - 30) + ' ' + h} fill="none" stroke="#7C8590" strokeWidth={4.8} strokeLinecap="round" />}<circle cx={bnc[0][0]} cy={bnc[0][1]} r={w * 0.018} fill={FX4.steelDark} /></g>}
        </svg>
      </div>
      {v === 'a' && <div style={{ position: 'absolute', left: 0, top: 0, width: 1, height: 1, transform: 'translateZ(' + (p.hz || 90) + 'px)' }}>{/* panel etiketleri tek 3B düzlemde (katman sayısı ≤ 12/kare) */}
        {['VOLTS/DIV', 'TIME/DIV', 'POSITION', 'TRIGGER', 'INTENS', 'ASTIG'].map(function (t, i) { var q = knobs[i]; return q ? <div key={'lb' + i} data-doku="1" style={Object.assign({ left: q[0] - 60, top: q[1] + q[2] * 1.5, width: 120 }, lab)}>{t}</div> : null; })}
        {bnc.map(function (q, i) { return <div key={'bl' + i} data-doku="1" style={Object.assign({ left: q[0] - 40, top: q[1] - w * 0.05, width: 80 }, lab)}>{['CH 1', 'EXT'][i]}</div>; })}</div>}
      {p.children}
    </div>
  );
}
// kadran: v a 270° · b 180° (aynalı skala) · c açıölçer; val 0..1 ibre, p çizim, bare: yalnız yüz
function FXDial(p) {
  var v = p.v || 'a', r = p.r, val = fxClamp(p.val == null ? 0.5 : p.val, 0, 1), pr = p.p == null ? 1 : p.p, id = 'dl' + (p.id || 0), T = p.T || 0;
  var a0 = v === 'b' ? -180 : v === 'c' ? -90 : -225, span = v === 'b' ? 180 : v === 'c' ? 360 : 270, ticks = [], nT = v === 'c' ? 72 : 50;
  var cy = v === 'b' ? r * 0.25 : 0, q = FXE.sio(fxClamp(pr / 0.6, 0, 1));
  for (var i = 0; i <= nT; i++) { if (v === 'c' && i === nT) break; var a = (a0 + span * i / nT * q) * Math.PI / 180, big = i % (v === 'c' ? 9 : 5) === 0, R1 = r * (big ? 0.74 : 0.8), R2 = r * 0.88;
    ticks.push(<line key={i} x1={Math.cos(a) * R1} y1={cy + Math.sin(a) * R1} x2={Math.cos(a) * R2} y2={cy + Math.sin(a) * R2} stroke={FX4.gSoft} strokeWidth={big ? 2.2 : 1} />); }
  var na = (a0 + span * val) * Math.PI / 180 + (v !== 'c' ? 0.012 * Math.sin(T * 7.3) : 0), nl = r * (v === 'c' ? 0.92 : 0.8), hq = FXE.sio(fxClamp((pr - 0.5) / 0.5, 0, 1));   // ibre titreşimi (ikincil hareket)
  var band = v === 'a' ? (function () { var b0 = (a0 + span * 0.7) * Math.PI / 180, b1 = (a0 + span) * Math.PI / 180, R = r * 0.9; return 'M ' + Math.cos(b0) * R + ' ' + Math.sin(b0) * R + ' A ' + R + ' ' + R + ' 0 0 1 ' + Math.cos(b1) * R + ' ' + Math.sin(b1) * R; })() : null;
  var sh = fxShadowAt(p.hz || 40);
  return (
    <div data-c="FXDial" data-fx="kadran" data-hero={p.hero ? '1' : undefined} style={{ position: 'absolute', left: p.x - r * 1.15, top: p.y - r * 1.15, width: r * 2.3, height: r * 2.3 }}>
      <svg width={r * 2.3} height={r * 2.3} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        <defs><radialGradient id={id + 'f'} cx="40%" cy="35%" r="75%"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor={FX4.paperShade} /></radialGradient>
          <linearGradient id={id + 'r'} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={FX4.steelLight} /><stop offset="0.5" stopColor={FX4.steel} /><stop offset="1" stopColor={FX4.steelDark} /></linearGradient></defs>
        <g transform={'translate(' + r * 1.15 + ',' + r * 1.15 + ')'}>
          {p.bare ? null : v === 'b' ? <g><rect x={-r * 1.08 + sh.dx * 0.5} y={-r * 0.92 + sh.dy * 0.5} width={r * 2.16} height={r * 1.5} rx={14} fill={'rgba(' + FX4.shadow + ',0.35)'} style={{ filter: 'blur(' + sh.blur + 'px)' }} />
              <rect x={-r * 1.08} y={-r * 0.92} width={r * 2.16} height={r * 1.5} rx={14} fill={'url(#' + id + 'r)'} /><rect x={-r * 0.98} y={-r * 0.82} width={r * 1.96} height={r * 1.3} rx={8} fill={'url(#' + id + 'f)'} />
              <path d={'M ' + (-r * 0.8) + ' ' + cy + ' A ' + r * 0.8 + ' ' + r * 0.8 + ' 0 0 1 ' + r * 0.8 + ' ' + cy} fill="none" stroke={FX4.steel} strokeWidth={5} opacity={0.6} /></g>
            : <g><circle cx={sh.dx * 0.5} cy={sh.dy * 0.5} r={r * 1.06} fill={'rgba(' + FX4.shadow + ',0.35)'} style={{ filter: 'blur(' + sh.blur + 'px)' }} /><circle r={r * 1.06} fill={'url(#' + id + 'r)'} /><circle r={r * 0.95} fill={'url(#' + id + 'f)'} /></g>}
          {band && <path d={band} fill="none" stroke={FX4.inkWash} strokeWidth={r * 0.07} opacity={0.75} />}
          <g style={{ filter: FX_PEN }}>{ticks}</g>
          {v === 'c' && [0, 1, 2, 3].map(function (k) { var aa = k * Math.PI / 2; return <line key={k} x1={Math.cos(aa) * r * 0.2} y1={Math.sin(aa) * r * 0.2} x2={Math.cos(aa) * r * 0.66} y2={Math.sin(aa) * r * 0.66} stroke={FX4.gHard} strokeWidth={1} />; })}
          {hq > 0 && <g>
            <line x1={-Math.cos(na) * r * 0.16} y1={cy - Math.sin(na) * r * 0.16} x2={Math.cos(na) * nl * hq} y2={cy + Math.sin(na) * nl * hq} stroke={v === 'c' ? FX4.ink : FX4.inkBlack} strokeWidth={v === 'c' ? 3 : 4.5} strokeLinecap="round" />
            <circle cx={0} cy={cy} r={r * 0.07} fill={FX4.anod} /><circle cx={-r * 0.015} cy={cy - r * 0.02} r={r * 0.025} fill={FX4.steelLight} /></g>}
          <path d={'M ' + (-r * 0.7) + ' ' + (-r * 0.55) + ' A ' + r * 0.92 + ' ' + r * 0.92 + ' 0 0 1 ' + r * 0.5 + ' ' + (-r * 0.78)} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={r * 0.05} strokeLinecap="round" opacity={0.5} />{/* cam yansıması */}
        </g>
      </svg>
      {p.children}
    </div>
  );
}
// cetvel: a akrilik (glass: metnin üstünden geçen saydam; clear: daha açık) · b çelik · c üçgen ölçek (2.5D prizma)
function FXRule(p) {
  var v = p.v || 'b', len = p.len, mm = FXT.mm, n = Math.floor(len / mm), H = v === 'c' ? 70 : v === 'b' ? 52 : 46, ticks = [], sh = fxShadowAt(p.hz || 26), y0 = v === 'c' ? 26 : 0;
  for (var i = 0; i <= n; i++) { var l = i % 10 === 0 ? 18 : i % 5 === 0 ? 12 : 7; ticks.push(<line key={i} x1={i * mm + 12} y1={y0} x2={i * mm + 12} y2={y0 + l} stroke={v === 'b' ? '#1E2126' : FX4.gSoft} strokeWidth={i % 10 === 0 ? 1.4 : 0.9} />);
    if (i % 10 === 0 && i > 0) ticks.push(<text key={'t' + i} x={i * mm + 12} y={y0 + 33} fontFamily={FXF.mono} fontSize={12} fill={v === 'b' ? '#1E2126' : FX4.gHB} textAnchor="middle" data-doku="1">{i / 10}</text>); }
  var body = v === 'a' ? { background: p.glass ? 'linear-gradient(180deg, rgba(236,243,248,0.08), rgba(206,218,228,0.05))' : p.clear ? 'linear-gradient(180deg, rgba(236,243,248,0.26), rgba(206,218,228,0.18))' : 'linear-gradient(180deg, rgba(228,236,242,0.55), rgba(200,212,222,0.42))', border: '1px solid rgba(80,90,100,' + (p.glass ? '0.4' : '0.45') + ')' }
    : v === 'b' ? { background: 'linear-gradient(180deg, ' + FX4.steelLight + ' 0%, ' + FX4.steel + ' 60%, ' + FX4.steelDark + ' 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)' }
    : { background: 'linear-gradient(180deg, #EEF0F2 0%, #EEF0F2 36%, #C8CCD2 37%, #DCDFE3 100%)', clipPath: 'polygon(0 30%, 100% 30%, 100% 100%, 0 100%)' };
  return (
    <div data-c="FXRule" data-fx="cetvel" style={{ position: 'absolute', left: p.x, top: p.y, width: len + 24, height: H, transform: 'rotate(' + (p.angle || 0) + 'deg)', transformOrigin: '0 0' }}>
      <div style={{ position: 'absolute', left: sh.dx * 0.6, top: sh.dy * 0.6, width: len + 24, height: H, background: 'rgba(' + FX4.shadow + ',' + (v === 'a' ? (p.glass ? 0.05 : 0.12) : sh.a * 0.7).toFixed(3) + ')', filter: 'blur(' + sh.blur + 'px)' }} />
      {v === 'c' && <div style={{ position: 'absolute', left: 0, top: 0, width: len + 24, height: H * 0.34, background: 'linear-gradient(180deg, #F7F8F9, #D9DCE0)', transform: 'skewX(-20deg)', transformOrigin: '0 100%' }} />}
      <div style={Object.assign({ position: 'absolute', left: 0, top: 0, width: len + 24, height: H, borderRadius: 2, overflow: 'hidden' }, body)}>{v === 'b' && <MHAssetTexture id="plate-metal-2" size="cover" blend="multiply" opacity={0.6} filter="grayscale(1)" />}</div>
      <svg width={len + 24} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>{ticks}</svg>
    </div>
  );
}
// kalibre: a verniyeli · b saatli (kadranlı sürgü) · c mikrometre (C gövde, kovan, tambur); open: çene açıklığı (px, a/b) ya da mil ilerlemesi (c)
function FXCal(p) {
  var v = p.v || 'a', s = p.scale || 1, open = p.open == null ? 300 : p.open, sh = fxShadowAt(p.hz || 34), metal = 'linear-gradient(180deg, ' + FX4.steelLight + ' 0%, ' + FX4.steel + ' 45%, ' + FX4.steelDark + ' 100%)';
  var wrap = function (W, H, kids) { return <div data-c="FXCal" data-fx="kalibre" style={{ position: 'absolute', left: p.x, top: p.y, width: W, height: H, transform: 'scale(' + s + ') rotate(' + (p.angle || 0) + 'deg)', transformOrigin: '0 0', filter: 'drop-shadow(' + sh.dx + 'px ' + sh.dy + 'px ' + sh.blur + 'px rgba(' + FX4.shadow + ',' + sh.a.toFixed(3) + '))' }}>{kids}</div>; };
  if (v === 'c') {
    var tb = 340 + open * 0.4;
    return wrap(980, 360, [
      <svg key="f" width={980} height={360} style={{ position: 'absolute', left: 0, top: 0 }}><defs><linearGradient id="mcF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={FX4.anodHi} /><stop offset="1" stopColor={FX4.anod} /></linearGradient>
        <linearGradient id="mcS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={FX4.steelLight} /><stop offset="0.5" stopColor={FX4.steel} /><stop offset="1" stopColor={FX4.steelDark} /></linearGradient></defs>
        <path d="M 60 70 L 120 70 L 120 250 Q 120 320 200 320 L 330 320 Q 410 320 410 250 L 410 190 L 360 190 L 360 250 Q 360 270 330 270 L 200 270 Q 170 270 170 250 L 170 120 L 60 120 Z" fill="url(#mcF)" />
        <rect x={40} y={78} width={30} height={34} fill="url(#mcS)" /><rect x={120 + open * 0.3} y={82} width={tb - 120 - open * 0.3} height={26} fill="url(#mcS)" />
      </svg>,
      <div key="s" style={{ position: 'absolute', left: 410, top: 166, width: 240, height: 48, background: metal, borderRadius: 3 }}><MHAssetTexture id="plate-metal-2" size="cover" blend="multiply" opacity={0.5} filter="grayscale(1)" />
        <svg width={240} height={48} style={{ position: 'absolute', left: 0, top: 0 }}><line x1={0} y1={24} x2={240} y2={24} stroke="#22252A" strokeWidth={1} />{Array.from({ length: 48 }).map(function (_, i) { return <line key={i} x1={i * 5} y1={i % 2 ? 24 : 12} x2={i * 5} y2={i % 2 ? 36 : 24} stroke="#22252A" strokeWidth={0.8} />; })}</svg></div>,
      <div key="t" style={{ position: 'absolute', left: 650 - open * 0.15, top: 146, width: 220, height: 88, background: 'repeating-linear-gradient(90deg, ' + FX4.steelDark + ' 0 3px, ' + FX4.steel + ' 3px 7px)', borderRadius: 6, boxShadow: 'inset 0 6px 10px rgba(255,255,255,0.25), inset 0 -8px 12px rgba(0,0,0,0.3)' }} />,
    ]);
  }
  var L = 1100, ticks = []; for (var i = 0; i <= 120; i++) { var l = i % 10 === 0 ? 16 : i % 5 === 0 ? 11 : 6; ticks.push(<line key={i} x1={140 + i * 8} y1={58} x2={140 + i * 8} y2={58 + l} stroke={FXT.engrave} strokeWidth={i % 10 === 0 ? 1.3 : 0.8} />); }
  return wrap(L, 270, [
    <div key="beam" style={{ position: 'absolute', left: 120, top: 40, width: 980, height: 52, background: metal, borderRadius: 3, overflow: 'hidden' }}><MHAssetTexture id="plate-metal-2" size="cover" blend="multiply" opacity={0.8} filter="grayscale(1)" /></div>,
    <svg key="sc" width={L} height={140} style={{ position: 'absolute', left: 0, top: 0 }}>{ticks}</svg>,
    <div key="j0" style={{ position: 'absolute', left: 120, top: 40, width: 36, height: 210, background: metal, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 30% 100%, 0 60%)' }} />,
    <div key="sl" style={{ position: 'absolute', left: 156 + open, top: 30, width: 150, height: v === 'b' ? 150 : 72, background: metal, borderRadius: 3, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.25)' }}>
      {v === 'b' ? <svg width={150} height={150} style={{ position: 'absolute', left: 0, top: 0 }}><circle cx={75} cy={92} r={50} fill="#F4F5F6" stroke={FX4.steelDark} strokeWidth={3} />{Array.from({ length: 40 }).map(function (_, i) { var a = i / 40 * 2 * Math.PI; return <line key={i} x1={75 + Math.cos(a) * 40} y1={92 + Math.sin(a) * 40} x2={75 + Math.cos(a) * (i % 5 ? 45 : 48)} y2={92 + Math.sin(a) * (i % 5 ? 45 : 48)} stroke="#26292E" strokeWidth={i % 5 ? 0.8 : 1.4} />; })}
          <line x1={75} y1={92} x2={75 + Math.cos(open / 40) * 38} y2={92 + Math.sin(open / 40) * 38} stroke={FX4.inkBlack} strokeWidth={2.5} strokeLinecap="round" /><circle cx={75} cy={92} r={5} fill={FX4.anod} /></svg>
        : <svg width={150} height={72} style={{ position: 'absolute', left: 0, top: 0 }}>{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (i) { return <line key={i} x1={10 + i * 12.6} y1={44} x2={10 + i * 12.6} y2={44 + (i % 5 === 0 ? 14 : 8)} stroke={FXT.engrave} strokeWidth={0.8} />; })}</svg>}
    </div>,
    <div key="j1" style={{ position: 'absolute', left: 156 + open, top: 40, width: 36, height: 210, background: metal, clipPath: 'polygon(0 0, 100% 0, 100% 60%, 70% 100%, 0 100%)' }} />,
  ]);
}

// taralı vurgu (FocusFX imzası): 45° vektör tarama, mürekkep mavisi; dolgu değil vurgu. x, y, w, h · p (0..1 tarama soldan açılır) · col · gap (px) · edge (çerçeve)
function FXHatch(p) {
  var w = p.w, h = p.h, gap = p.gap || 9, col = p.col || FX4.ink, pr = p.p == null ? 1 : fxClamp(p.p, 0, 1), id = 'fxh-' + (p.id || (Math.round(p.x) + '-' + Math.round(p.y))), L = [];
  for (var i = -h; i < w; i += gap) { var x1 = i, y1 = h, x2 = i + h, y2 = 0; if ((i + h / 2) / w <= pr) L.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth={p.sw || 1.2} />); }
  return (
    <svg data-c="FXHatch" data-hero={p.hero ? '1' : undefined} width={w} height={h} style={{ position: p.inline ? 'static' : 'absolute', left: p.x, top: p.y, overflow: 'visible' }}>
      <defs><clipPath id={id}><rect x={0} y={0} width={w} height={h} /></clipPath></defs>
      <g clipPath={'url(#' + id + ')'}>{L}</g>
      {p.edge !== false && <rect x={0} y={0} width={w} height={h} fill="none" stroke={col} strokeWidth={p.ew || 1.4} />}
    </svg>
  );
}

// merdiven (FocusFX imzası; seviye etiketli dikey basamaklar): x, y (sol-üst), w, h, n (≥ 8), p (kurulum 0..1), T (yavaş nefes), seed,
//   labels: dizi | false (varsayılan göreli "p_0 +k / p_0 −k" — rakam/fiyat değil), hl: vurgulanan seviyeler (mavi taralı), hlp: vurgu çizimi 0..1, hero
//   üst yarı tarama (grafit), alt yarı mürekkep yıkaması; seviye çizgisi + orta çizgi (kesik-nokta); etiketler mono, doku (data-doku)
function fxLadderData(n, seed, T) {   // deterministik derinlik (+ T ile yavaş nefes: ikincil hareket)
  var r = MH.rng(seed || 7), d = []; for (var i = 0; i < n; i++) { var c = Math.abs(i - (n - 1) / 2), base = 0.25 + 0.75 * r(), wall = (i === 2 || i === n - 4) ? 1.35 : 1;
    d.push(Math.min(1, base * (0.55 + 0.45 * Math.min(1, c / (n / 2))) * wall * (1 + 0.06 * Math.sin((T || 0) * 1.3 + i * 1.7)))); }
  return d;
}
function FXLadder(p) {
  var n = Math.max(8, p.n || 16), w = p.w, h = p.h, step = h / n, pr = p.p == null ? 1 : p.p, D = fxLadderData(n, p.seed, p.T || 0), mid = n / 2, hl = p.hl || [], hlp = p.hlp == null ? 1 : fxClamp(p.hlp, 0, 1), rows = [];
  var u = function (i) { return FXE.o3(fxClamp(pr * 1.5 - Math.abs(i - mid + 0.5) / n * 0.9, 0, 1)); };
  var lab = function (i) { if (Array.isArray(p.labels)) return p.labels[i] || ''; var k = i < mid ? mid - i : -(i - mid + 1); return 'p_0 ' + (k > 0 ? '+' + k : '−' + -k); };
  var cx = w * 0.5, half = w * 0.04, room = cx - half - 12;   // iki yan simetrik; çubuk kutudan taşmaz (etiketler kutunun solunda)
  for (var j = 0; j < n; j++) {
    var up = j < mid, yj = j * step, Lj = D[j] * room * u(j), x0 = up ? cx + half : cx - half - Lj, hy = yj + step * 0.14, hh = step * 0.72;
    rows.push(<line key={'s' + j} x1={0} y1={yj} x2={w} y2={yj} stroke={FX4.gHard} strokeWidth={0.7} opacity={0.6} />);
    if (Lj > 1) rows.push(up ? <FXHatch key={'h' + j} x={x0} y={hy} w={Lj} h={hh} col={FX4.gHB} gap={9} sw={0.9} ew={1.2} id={'lad' + (p.seed || 7) + '-' + j} />
      : <div key={'b' + j} style={{ position: 'absolute', left: x0, top: hy, width: Lj, height: hh, background: FX4.inkWash, boxShadow: 'inset 0 0 0 1.3px ' + FX4.ink }} />);
    if (Lj > 1 && hl.indexOf(j) >= 0 && hlp > 0)   // vurgu: mavi tarama çubuğun üstüne soldan çizilir (hlp 0..1), çerçeve kalın
      rows.push(<FXHatch key={'v' + j} x={x0 - 4} y={hy - 4} w={Lj + 8} h={hh + 8} col={FX4.ink} gap={6} sw={1.6} ew={2.2} p={hlp} id={'ladv' + (p.seed || 7) + '-' + j} />);
  }
  var L0 = 2 * (w + h), q0 = FXE.sio(fxClamp(pr / 0.5, 0, 1));
  return (
    <div data-c="FXLadder" data-hero={p.hero ? '1' : undefined} style={{ position: 'absolute', left: p.x, top: p.y, width: w, height: h }}>
      <svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        <rect x={0} y={0} width={w} height={h} fill="none" stroke={FX4.gSoft} strokeWidth={2.4} strokeDasharray={L0} strokeDashoffset={(L0 * (1 - q0)).toFixed(1)} />
        <line x1={-24} y1={mid * step} x2={w + 24} y2={mid * step} stroke={FX4.ink} strokeWidth={1.6} strokeDasharray="22 6 3 6" />
      </svg>
      {rows}
      {p.labels !== false && Array.from({ length: n }).map(function (_, i) { return <div key={'l' + i} data-doku="1" style={{ position: 'absolute', left: -132, top: i * step + step / 2 - 9, width: 112, textAlign: 'right', font: '500 ' + Math.min(18, step * 0.5).toFixed(0) + 'px/1 ' + FXF.mono, color: i < mid ? FX4.gHB : FX4.ink, clipPath: 'inset(0 ' + (100 - 100 * fxClamp((u(i) - 0.02) / 0.45, 0, 1)).toFixed(1) + '% 0 0)', letterSpacing: '0.02em' }}>{lab(i)}</div>; })}{/* etiket yazılır: soldan açılır (pop yok) */}
      {p.children}
    </div>
  );
}

Object.assign(window, { fxKnurl: fxKnurl, FXKnob: FXKnob, fxTrace: fxTrace, FXScreen: FXScreen, FXScope: FXScope, FXDial: FXDial, FXRule: FXRule, FXCal: FXCal, FXHatch: FXHatch, fxLadderData: fxLadderData, FXLadder: FXLadder });
