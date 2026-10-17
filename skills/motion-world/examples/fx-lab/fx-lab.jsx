// world/fx-lab.jsx — ÖRNEK world "fx-lab": teknik çizim laboratuvarı (ÖRNEK, varsayılan değil — skills/motion-world/SKILL.md).
// Kimlik: "reklam değil, araştırma laboratuvarı" — grafit masada teknik çizim paftası, açık laboratuvar ışığı (soğuk, tek yönlü, yumuşak).
// Bağımlılık: React + shared/motion-core.jsx (window.MH). Yükleme: motion-stage → motion-core → fx-lab → fx-rig → fx-inst → sahne.
// Ölçü sözleşmesi world.json'da (bant, K1, sınıflar, grade); bu dosyadaki sayılar onu yansıtır. Dersler lessons.md, kararlar DECISIONS.md.
// Kurallar: amber yok (ışık soğuk gri) · aksan (kırmızı) yalnız tek çizgi vuruşu, metin kırmızı değil · fade yok (yazılır / çizilir / ışık) ·
//   doğrusal easing yok (power3 in/out; çizgi ease-in-out; oturma 2 px) · okunacak metin ≥ 22 px, altı data-doku.
// Tahta anahtarları (MH.key): PAL='v3' karşılaştırma paleti · DISPLAY / DISPLAY_W font adayı · KEY anahtar kare · CARD gri kart ·
//   INKMASK K1 ölçümü · PROF=pen|grain|mblur|plate|dof katman kapatma · HIDE=<seçici> · NOBAKE pişirme kapalı · PEN_IMG pişmiş gürültü.

var FXT = {   // fx-lab paleti (v2/v3 bileşenleri; ölçüm lessons.md)
  paper: '#F1F0EB', paperShade: '#E2E1DB', paperTone: '#CFCEC9', desk: '#17191C', deskEdge: '#0E0F11', deskLit: '#26292E',
  graphite: '#2B2E33', graphite2: '#585C63', graphite3: '#989CA3',
  ink: '#1F3B70', inkText: '#16294F', graphiteText: '#202226', inkLight: '#4C6797',
  metal: '#8E9298', metalDark: '#5D6167', metalLight: '#C9CCD1', engrave: '#2A2D31',
  red: '#DB1D2E',   // aksan: tek vuruş (world.json accent, ekranda ölçülen hedef)
  redSrc: '#FF2236',   // aksanın çizim rengi: ışık çarpanı (≈ 0.88) telafili kaynak — ekranda red'e oturur (ders W-34)
  placeholder: '#55595F', glassDark: '#0B0C0E',
  mm: 8,   // 1 mm = 8 px (tasarım uzayı 1920 px ≈ 240 mm pafta)
};
var FXF = {   // tipografi: 3 seviye (display · ikincil · etiket)
  display: function () { return (MH.key('DISPLAY') || 'Oswald') + ', "Barlow Condensed", sans-serif'; },
  displayW: function () { return MH.key('DISPLAY_W') || 500; },
  second: '"Barlow Condensed", "Oswald", sans-serif',
  mono: '"JetBrains Mono", monospace',
  trackDisplay: '-0.02em', trackSecond: '0.06em', trackMono: '0.04em',
};
var FX_LIGHT = { dir: 124, edge: 0.16, edgeMax: 0.20, expo: 0.88, breath: 0.012, breathPeriod: 5.3, breathPhase: 0.8 };
var FX_GRAIN = { opacity: 0.04, rate: 30 };   // gren: overlay %4, 30 Hz yenileme (kaynak ölçüsü; render fps'inden bağımsız)
var FX_PEN = MH.mode.prof('pen') ? 'none' : 'url(#fxpencil)';   // kalem basınç dokusu (diyagram SVG'lerine); metne uygulanmaz
var FX_PLATES = ['plate-graphite-1', 'plate-graphite-2', 'plate-metal-1', 'plate-metal-2', 'plate-grain-1', 'plate-glass-1'];   // şekil dolgusu deseni olan B plakaları (varsa)
var FX_CAP = [0.215, 0.905];   // font ölçülemezse büyük harf üstü / taban oranı

function fxClamp(v, a, b) { return MH.clamp(v, a, b); }
function fxKey() { return MH.mode.key(); }   // anahtar kare: metin yok, ışık yok, kamera yok
function fxTW(text, size, fam, wt, trackEm) { return MH.textWidth(text, size, fam || FXF.display(), wt || FXF.displayW(), trackEm == null ? -0.02 : trackEm); }
function fxCap(size, fam, wt) { return MH.capMetrics(size, fam || FXF.display(), wt || FXF.displayW(), FX_CAP); }

// ── easing ve ikincil hareket (çekirdekten; sayılar bu world'ün) ─────────
var FXE = { io3: MH.ease.inOut3, o3: MH.ease.out3, i3: MH.ease.in3, sio: MH.ease.sine };
function fxP(T, t0, dur) { return MH.p(T, t0, dur); }        // HAM ilerleme: animasyona doğrudan verilmez
function fxE(T, t0, dur) { return FXE.io3(fxP(T, t0, dur)); }   // hareket: power3 in/out
function fxS(T, t0, dur) { return FXE.sio(fxP(T, t0, dur)); }   // çizgi / yazım: ease-in-out
function fxO(T, t0, dur) { return FXE.o3(fxP(T, t0, dur)); }    // varış: power3 out
function fxSettle(T, tLand, amp) { return MH.settle(T, tLand, amp == null ? 2 : amp, 0.28); }   // oturma: 2 px aşma, 0.28 s
function fxNudge(T, hits, amp) { return MH.nudge(T, hits, amp == null ? 2 : amp, { win: 0.35, decay: 0.09, period: 0.24 }); }   // pafta tepki itmesi
function fxVib(T, tLand, amp) { return MH.vib(T, tLand, amp == null ? 1.5 : amp, { win: 0.3, decay: 0.08, period: 0.075 }); }  // uç çentiği titreşimi

// ── zemin ─────────────────────────────────────────────
function FXGrain(p) {   // gren: feTurbulence 0.9 / 2 oktav, overlay; tohum 30 Hz ızgarasında (T'den, deterministik)
  var cv = MH.canvas(), seed = MH.grainSeed(p.T || 0, FX_GRAIN.rate, 0), o = p.amp == null ? FX_GRAIN.opacity : +(FX_GRAIN.opacity * p.amp).toFixed(5);
  return (
    <svg width={cv.w} height={cv.h} style={{ position: 'absolute', left: 0, top: 0, mixBlendMode: 'overlay', opacity: o, pointerEvents: 'none' }}>
      <filter id="fxgrain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer><feFuncA type="table" tableValues="1 1" /></feComponentTransfer>
      </filter>
      <rect width={cv.w} height={cv.h} filter="url(#fxgrain)" />
    </svg>
  );
}
function FXGrid(p) {   // milimetrik ızgara: ince 1 mm, kalın 10 mm; mürekkep mavisi %6 / %10 (vektör)
  var cv = MH.canvas(), mm = p.mm || FXT.mm, a1 = p.minor == null ? 0.06 : p.minor, a2 = p.major == null ? 0.10 : p.major, id = p.id || 'fxgrid';
  var w = p.w || cv.w, h = p.h || cv.h, ox = ((p.ox || 0) % (10 * mm) + 10 * mm) % (10 * mm), oy = ((p.oy || 0) % (10 * mm) + 10 * mm) % (10 * mm);
  return (
    <svg width={w} height={h} style={{ position: 'absolute', left: p.x || 0, top: p.y || 0, pointerEvents: 'none' }}>
      <defs>
        <pattern id={id + '-a'} width={mm} height={mm} patternUnits="userSpaceOnUse" x={ox} y={oy}><path d={'M ' + mm + ' 0 L 0 0 0 ' + mm} fill="none" stroke={FXT.ink} strokeWidth="0.6" strokeOpacity={a1} /></pattern>
        <pattern id={id + '-b'} width={10 * mm} height={10 * mm} patternUnits="userSpaceOnUse" x={ox} y={oy}><path d={'M ' + 10 * mm + ' 0 L 0 0 0 ' + 10 * mm} fill="none" stroke={FXT.ink} strokeWidth="1.1" strokeOpacity={a2} /></pattern>
      </defs>
      <rect width={w} height={h} fill={'url(#' + id + '-a)'} /><rect width={w} height={h} fill={'url(#' + id + '-b)'} />
    </svg>
  );
}
function FXSheet(p) {   // pafta: kâğıt + (plaka ya da yordamsal lif) + diş + ızgara + kenar gölgesi. plate={null} → yalnız motor (üretken yok)
  var w = p.w, h = p.h, key = fxKey(), cb = key ? 0 : p.clipB || 0, sd = p.seed || 1;
  var sh = key ? undefined : p.softShadow ? '8px 12px 46px rgba(0,0,0,0.26), 1px 2px 4px rgba(0,0,0,0.16)' : '12px 18px 50px rgba(0,0,0,0.45), 2px 3px 5px rgba(0,0,0,0.3)';
  var sheet = (   // clipB: alt kenardan kırpma (plakanın koyu kenarı görünmesin; gölge ayrı katmanda)
    <div style={{ position: 'absolute', left: p.x, top: p.y, width: w, height: h, background: FXT.paper, boxShadow: cb ? undefined : sh, overflow: 'hidden', clipPath: cb ? 'inset(0 0 ' + cb + 'px 0)' : undefined }}>
      {!key && p.plate === null && <div style={{ position: 'absolute', inset: 0, background: FXT.paperTone, mixBlendMode: 'multiply' }} />}
      {!key && p.plate === null && <svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0, mixBlendMode: 'multiply', opacity: 0.55 }}><filter id={'fxfib-' + sd}><feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves="3" seed={sd + 40} /><feColorMatrix type="matrix" values="0 0 0 0 0.9  0 0 0 0 0.9  0 0 0 0 0.89  0 0 0 -0.9 0.75" /></filter><rect width={w} height={h} filter={'url(#fxfib-' + sd + ')'} /></svg>}
      {!key && p.plate !== null && <MHAssetTexture id={p.plate || 'plate-paper-1'} size="cover" blend="multiply" opacity={p.plateOpacity == null ? 0.85 : p.plateOpacity} filter="grayscale(0.6)" />}
      {!key && <svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0, mixBlendMode: 'multiply', opacity: 0.3 }}>
        <filter id={'fxtooth-' + sd}><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed={sd} /><feColorMatrix type="matrix" values="0 0 0 0 0.86  0 0 0 0 0.86  0 0 0 0 0.85  0 0 0 -1.1 1.05" /></filter>
        <rect width={w} height={h} filter={'url(#fxtooth-' + sd + ')'} />
      </svg>}
      <FXGrid w={w} h={h} id={'fxg' + sd} ox={p.gox || 0} oy={p.goy || 0} minor={p.minor} major={p.major} />
      {p.children}
    </div>
  );
  return cb ? <div style={{ position: 'absolute', left: 0, top: 0 }}><div style={{ position: 'absolute', left: p.x, top: p.y, width: w, height: h - cb, boxShadow: sh }} />{sheet}</div> : sheet;
}
function FXWorld(p) {   // dünya katmanı — açık laboratuvar: masa + içerik + tek yönlü yumuşak anahtar (multiply lineer düşüm) + havuz + pozlama + gren. Spot vinyet YOK.
  var full = { position: 'absolute', inset: 0, pointerEvents: 'none' }, L = Object.assign({}, FX_LIGHT, p.light || {}), T = p.T || 0;
  if (fxKey()) return <div style={{ position: 'absolute', inset: 0, background: FXT.paper, overflow: 'hidden' }}>{p.children}</div>;   // anahtar kare: düz, ışıksız
  var br = MH.breath(T, L.breath, L.breathPeriod, L.breathPhase), edge = Math.min(L.edgeMax, L.edge);   // ışık nefesi (ikincil hareket) · kenar düşümü tavanı
  var k1 = Math.min(1, L.expo * br), k0 = k1 * (1 - edge), c = function (k) { var v = Math.round(255 * k); return 'rgb(' + v + ',' + Math.min(255, v + 1) + ',' + Math.min(255, v + 3) + ')'; };   // soğuk: mavi kanal biraz yüksek
  var grad = 'linear-gradient(' + L.dir + 'deg, ' + c(k1) + ' 0%, ' + c(k1) + ' 22%, ' + c(k1 * (1 - edge * 0.45)) + ' 62%, ' + c(k0) + ' 100%)';   // yumuşak duraklar
  var body = MH.mode.card() ? <div data-fx="gri-kart" style={{ position: 'absolute', inset: 0, background: '#FFFFFF' }} /> : p.children;   // gri kart: beyaz yüzey + dünya ışığı (düşüm ölçümü)
  return (
    <div data-fx="world" style={{ position: 'absolute', inset: 0, background: FXT.desk, overflow: 'hidden' }}>
      <MHModeStyles root="[data-fx=world]" />
      <FXDefs />
      <div style={Object.assign({}, full, { background: 'linear-gradient(' + L.dir + 'deg, ' + FXT.deskLit + ' 0%, ' + FXT.desk + ' 55%, ' + FXT.deskEdge + ' 100%)' })} />
      {body}
      <div style={Object.assign({}, full, { mixBlendMode: 'multiply', background: grad })} />
      {p.pool && p.pool.a > 0.002 && <div data-fx="lamba-havuzu" style={Object.assign({}, full, { mixBlendMode: 'multiply', background: 'radial-gradient(circle ' + Math.round(p.pool.r) + 'px at ' + p.pool.x.toFixed(1) + 'px ' + p.pool.y.toFixed(1) + 'px, #FFFFFF 0%, #FFFFFF 38%, ' + c(1 - p.pool.a * 0.55) + ' 70%, ' + c(1 - p.pool.a) + ' 100%)' })} />}
      {p.over}
      {p.exposure != null && p.exposure < 1 && <div style={Object.assign({}, full, { background: '#000', opacity: (1 - p.exposure).toFixed(4) })} />}
      {!MH.mode.prof('grain') && <FXGrain T={T} amp={p.grain} />}
    </div>
  );
}

// ── yazı ve çizgi ─────────────────────────────────────
function FXWrite(p) {   // yazılır: soldan sağa açılır (p.p 0..1, çağıran ease-in-out verir), ucunda grafit kalem izi; 2 px oturma; opaklık yok
  if (fxKey()) return null;
  var pr = fxClamp(p.p == null ? 1 : p.p, 0, 1), fam = p.family || FXF.display(), wt = p.weight || FXF.displayW();
  if (pr <= 0) return null;
  var ss = p.ss || 1, sy = pr < 1 ? 2 * ss * (1 - FXE.o3(pr)) : 0;   // ss: S× katmanında px sabitleri × ss
  var st = { position: 'absolute', left: p.x, top: p.y, font: wt + ' ' + p.size + 'px/1 ' + fam, letterSpacing: p.tracking || FXF.trackDisplay, color: p.color || FXT.graphite, whiteSpace: 'nowrap',
    clipPath: pr < 1 ? (p.slant ? 'polygon(-2% -20%, calc(' + (pr * 100).toFixed(2) + '% + ' + p.slant.toFixed(1) + 'px) -20%, calc(' + (pr * 100).toFixed(2) + '% - ' + (p.slant * 0.4).toFixed(1) + 'px) 120%, -2% 120%)' : 'inset(-20% ' + ((1 - pr) * 100).toFixed(2) + '% -20% -2%)') : undefined,
    transform: (p.rot ? 'rotate(' + p.rot + 'deg) ' : '') + (sy ? 'translateY(' + sy.toFixed(2) + 'px)' : '') || undefined, transformOrigin: '0 50%' };
  return <div data-fx="write" data-hero={p.hero ? '1' : undefined} data-doku={p.doku ? '1' : undefined} style={st}>{p.text}{pr < 1 && pr > 0.02 && <span style={{ position: 'absolute', left: (pr * 100).toFixed(2) + '%', top: '-8%', width: 2 * ss, height: '116%', background: FXT.graphite2, opacity: 0.7 }} />}</div>;
}
function FXLeader(p) {   // etiket / ölçü çizgisi: çapada nokta, çizgi kendini çizer (ease-in-out), uçta çentik (varışta titrer, p.vib px) ve etiket yazılır
  var cv = MH.canvas(), pr = fxClamp(p.p == null ? 1 : p.p, 0, 1), ax = p.ax, ay = p.ay, bx = p.bx, by = p.by, ex = p.ex == null ? bx : p.ex, ey = p.ey == null ? by : p.ey;
  var seg1 = Math.hypot(bx - ax, by - ay), seg2 = Math.hypot(ex - bx, ey - by), L = seg1 + seg2, d = 'M ' + ax + ' ' + ay + ' L ' + bx + ' ' + by + (seg2 > 0 ? ' L ' + ex + ' ' + ey : '');
  var lp = FXE.sio(fxClamp(pr / 0.7, 0, 1)), tp = FXE.sio(fxClamp((pr - 0.6) / 0.4, 0, 1)), col = p.color || FXT.ink, v = p.vib || 0;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <FXPen bake={p.bake || 'ld' + ax + ',' + ay} width={cv.w} height={cv.h}>
        {lp > 0 && <circle cx={ax} cy={ay} r={p.dot || 4.5} fill={col} />}
        {lp > 0 && <path d={d} fill="none" stroke={col} strokeWidth={p.width || 1.6} strokeDasharray={L} strokeDashoffset={(L * (1 - lp)).toFixed(2)} />}
        {lp >= 1 && seg2 > 0 && <line x1={ex + v} y1={ey - 7} x2={ex - v} y2={ey + 7} stroke={col} strokeWidth={1.6} />}
      </FXPen>
      {p.label && <FXWrite text={p.label} x={ex + (p.lx == null ? 14 : p.lx)} y={ey + (p.ly == null ? -(p.size || 26) * 0.55 : p.ly)} size={p.size || 26} p={tp} family={p.family || FXF.mono} weight={p.weight || 500} tracking={p.tracking || FXF.trackMono} color={p.labelColor || (col === FXT.ink ? FXT.inkText : col)} hero={p.hero} />}
    </div>
  );
}
function FXStrike(p) {   // cetvelle çizgi: düz, basınçlı (ortası kalın), 0.3 s; karalama değil. p.red → aksan vuruşu (world'ün tek kırmızısı)
  var pr = fxClamp(p.p == null ? 1 : p.p, 0, 1); if (pr <= 0 || fxKey()) return null;   // anahtar kareye girmez
  var w = p.w, h0 = p.weight || (p.red ? 9 : 5), n = 24, top = [], bot = [], col = p.red ? FXT.redSrc : (p.color || FXT.graphite);
  for (var i = 0; i <= n; i++) { var s = i / n * pr, x = s * w, hw = h0 * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, s))) / 2; top.push(x.toFixed(1) + ',' + (-hw).toFixed(2)); bot.unshift(x.toFixed(1) + ',' + hw.toFixed(2)); }
  var g = <g transform={'translate(10,30) rotate(' + (p.angle == null ? -1.2 : p.angle) + ')'}><polygon points={top.concat(bot).join(' ')} fill={col} opacity={p.red ? 1 : 0.92} /></g>;
  if (p.red) return <svg data-fx="accent-rule" width={w + 20} height={60} style={{ position: 'absolute', left: p.x - 10, top: p.y - 30, overflow: 'visible', pointerEvents: 'none' }}>{g}</svg>;   // aksan kalem süzgecinden GEÇMEZ (süzgeç rengi değiştirir, ders W-34)
  return <FXPen bake={p.bake || 'st' + p.x + ',' + p.y} dfx="strike" width={w + 20} height={60} style={{ left: p.x - 10, top: p.y - 30, pointerEvents: 'none' }}>{g}</FXPen>;
}
function FXGuide(p) {   // harf kılavuz çizgileri: yazımdan önce iki ince çizgi (büyük harf üstü, taban) cetvelle çekilir; p.p 0..1 (ham)
  var cv = MH.canvas(), pr = FXE.sio(fxClamp(p.p == null ? 1 : p.p, 0, 1)); if (pr <= 0) return null;
  var cp = fxCap(p.size, p.family, p.weight), pad = p.pad == null ? 24 : p.pad, y0 = p.y + cp[0], y1 = p.y + cp[1], x0 = p.x - pad, w = (p.w + 2 * pad) * pr;
  return (
    <FXPen bake={p.bake || 'gd' + p.x + ',' + p.y} width={cv.w} height={cv.h} style={{ pointerEvents: 'none' }}>
      <line x1={x0} y1={y0} x2={x0 + w} y2={y0} stroke={FXT.inkLight} strokeWidth={0.9} strokeOpacity={0.55} />
      <line x1={x0} y1={y1} x2={x0 + w} y2={y1} stroke={FXT.inkLight} strokeWidth={0.9} strokeOpacity={0.55} />
    </FXPen>
  );
}

// ── ölçüm aletleri (vektör; B metal plakası varsa malzeme) ─────────
function FXRuler(p) {   // cetvel: şeffaf akrilik gövde, mm çentik, 5/10 mm uzun, sayı mono (doku)
  if (fxKey()) return null;   // alet nesnesi anahtar kareye girmez
  var mm = FXT.mm, len = p.len, n = Math.floor(len / mm), ticks = [];
  for (var i = 0; i <= n; i++) { var l = i % 10 === 0 ? 18 : i % 5 === 0 ? 12 : 7; ticks.push(<line key={i} x1={i * mm + 10} y1={0} x2={i * mm + 10} y2={l} stroke={FXT.graphite} strokeWidth={i % 10 === 0 ? 1.4 : 0.9} />); if (i % 10 === 0 && i > 0) ticks.push(<text key={'t' + i} x={i * mm + 10} y={33} fontFamily={FXF.mono} fontSize={12} fill={FXT.graphite2} textAnchor="middle" data-doku="1">{i / 10}</text>); }
  return (
    <div style={{ position: 'absolute', left: p.x, top: p.y, width: len + 20, height: 46, transform: 'rotate(' + (p.angle || 0) + 'deg)', transformOrigin: '0 0' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(230,236,240,0.55), rgba(205,214,222,0.42))', border: '1px solid rgba(80,90,100,0.45)', borderRadius: 2, boxShadow: '5px 7px 14px rgba(0,0,0,0.18)' }}>{p.plate && <MHAssetTexture id={p.plate} size="cover" blend="multiply" opacity={0.35} />}</div>
      <svg width={len + 20} height={46} style={{ position: 'absolute', left: 0, top: 0 }}>{ticks}</svg>
    </div>
  );
}
function FXCaliper(p) {   // kalibre (verniyeli): sabit çene + kayan çene (open px), ana cetvel ölçeği
  if (fxKey()) return null;
  var s = p.scale || 1, open = p.open == null ? 300 : p.open, L = 1100, ticks = [];
  for (var i = 0; i <= 120; i++) { var l = i % 10 === 0 ? 16 : i % 5 === 0 ? 11 : 6; ticks.push(<line key={i} x1={140 + i * 8} y1={58} x2={140 + i * 8} y2={58 + l} stroke={FXT.engrave} strokeWidth={i % 10 === 0 ? 1.3 : 0.8} />); }
  var metal = 'linear-gradient(180deg, ' + FXT.metalLight + ' 0%, ' + FXT.metal + ' 45%, ' + FXT.metalDark + ' 100%)';
  return (
    <div style={{ position: 'absolute', left: p.x, top: p.y, width: L, height: 260, transform: 'scale(' + s + ') rotate(' + (p.angle || 0) + 'deg)', transformOrigin: '0 0', filter: 'drop-shadow(10px 14px 18px rgba(0,0,0,0.35))' }}>
      <div style={{ position: 'absolute', left: 120, top: 40, width: 980, height: 52, background: metal, borderRadius: 3, overflow: 'hidden' }}>{p.plate && <MHAssetTexture id={p.plate} size="cover" blend="multiply" opacity={0.8} />}</div>
      <svg width={L} height={140} style={{ position: 'absolute', left: 0, top: 0 }}>{ticks}</svg>
      <div style={{ position: 'absolute', left: 120, top: 40, width: 36, height: 210, background: metal, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 30% 100%, 0 60%)' }} />
      <div style={{ position: 'absolute', left: 156 + open, top: 30, width: 150, height: 72, background: metal, borderRadius: 3, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.25)' }}>
        <svg width="150" height="72" style={{ position: 'absolute', left: 0, top: 0 }}>{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (i) { return <line key={i} x1={10 + i * 12.6} y1={44} x2={10 + i * 12.6} y2={44 + (i % 5 === 0 ? 14 : 8)} stroke={FXT.engrave} strokeWidth={0.8} />; })}</svg>
      </div>
      <div style={{ position: 'absolute', left: 156 + open, top: 40, width: 36, height: 210, background: metal, clipPath: 'polygon(0 0, 100% 0, 100% 60%, 70% 100%, 0 100%)' }} />
    </div>
  );
}
function FXTitleBlock(p) {   // antet: çift çerçeve, hücreler çizilerek kurulur (ease-in-out), satırlar mono; etiketler 16 px doku
  var w = p.w, h = p.h, pr = p.p == null ? 1 : p.p, col = FXT.graphite, key = fxKey();
  var lines = [[0, 0.62, 1, 0.62], [0.62, 0.62, 0.62, 1], [0.81, 0.62, 0.81, 1], [0.78, 0, 0.78, 0.62]];
  var q0 = FXE.sio(fxClamp(pr / 0.4, 0, 1)), q1 = FXE.sio(fxClamp((pr - 0.2) / 0.3, 0, 1));
  return (
    <div style={{ position: 'absolute', left: p.x, top: p.y, width: w, height: h }}>
      <svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', filter: FX_PEN }}>
        <rect x={0} y={0} width={w} height={h} fill="none" stroke={col} strokeWidth={2.4} strokeDasharray={2 * (w + h)} strokeDashoffset={(2 * (w + h) * (1 - q0)).toFixed(1)} />
        <rect x={7} y={7} width={w - 14} height={h - 14} fill="none" stroke={col} strokeWidth={0.9} strokeDasharray={2 * (w + h - 28)} strokeDashoffset={(2 * (w + h - 28) * (1 - q1)).toFixed(1)} />
        {lines.map(function (l, i) { var q = FXE.sio(fxClamp((pr - 0.3 - i * 0.05) / 0.25, 0, 1)); return <line key={i} x1={l[0] * w} y1={l[1] * h} x2={(l[0] + (l[2] - l[0]) * q) * w} y2={(l[1] + (l[3] - l[1]) * q) * h} stroke={col} strokeWidth={1.1} />; })}
      </svg>
      {!key && (p.rows || []).map(function (r, i) { var q = FXE.sio(fxClamp((pr - 0.55 - i * 0.06) / 0.25, 0, 1)), cx = [0.02, 0.64, 0.83][i] * w; return <div key={i} style={{ position: 'absolute', left: cx, top: 0.665 * h, width: ([0.6, 0.17, 0.16][i]) * w }}>
        <FXWrite text={r[0]} x={0} y={0} size={16} p={FXE.sio(fxClamp((pr - 0.5 - i * 0.06) / 0.1, 0, 1))} family={FXF.mono} weight={500} tracking="0.08em" color={FXT.graphite2} doku />
        <FXWrite text={r[1]} x={0} y={22} size={p.rowSize || 24} p={q} family={FXF.mono} weight={500} tracking={FXF.trackMono} color={FXT.graphite} /></div>; })}
      {p.children}
    </div>
  );
}

// ── diyagram parçaları ─────────────────────────────────
function FXBar(p) {   // tek çubuk, teknik çizim: gövde + 45° tarama + yalnız gövde içinde merkez çizgisi + ölçü çizgileri; hero → data-hero
  var cv = MH.canvas(), x = p.x, y = p.y, w = p.w, h = p.h, pr = p.p == null ? 1 : p.p, hatch = [];
  for (var i = -h; i < w; i += 14) hatch.push(<line key={i} x1={Math.max(0, i)} y1={Math.max(0, -i)} x2={Math.min(w, i + h)} y2={Math.min(h, h - (i + h - Math.min(w, i + h)))} stroke={FXT.graphite2} strokeWidth={0.9} />);
  var L = 2 * (w + h), q = FXE.sio(fxClamp(pr / 0.6, 0, 1)), hq = FXE.sio(fxClamp((pr - 0.5) / 0.5, 0, 1));
  return (
    <svg data-hero={p.hero ? '1' : undefined} width={cv.w} height={cv.h} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none', filter: FX_PEN }}>
      {p.plate && hq > 0 && <rect x={x} y={y} width={w} height={h * hq} fill={fxFill(p.plate)} style={{ mixBlendMode: 'multiply' }} opacity={0.8} />}
      <line x1={x + w / 2} y1={y - (p.ext || 0) * q} x2={x + w / 2} y2={y + (h + (p.ext || 0)) * q} stroke={FXT.ink} strokeWidth={1.2} strokeDasharray="22 6 3 6" />{/* merkez çizgisi: ext 0 → yalnız gövde içinde */}
      <g transform={'translate(' + x + ',' + y + ')'}>
        <clipPath id={'fxbar-' + (p.id || 0)}><rect x={0} y={0} width={w} height={h * hq} /></clipPath>
        <g clipPath={'url(#fxbar-' + (p.id || 0) + ')'}>{hatch}</g>
        <rect x={0} y={0} width={w} height={h} fill="none" stroke={FXT.graphite} strokeWidth={2.6} strokeDasharray={L} strokeDashoffset={(L * (1 - q)).toFixed(1)} />
      </g>
      {p.dims !== false && hq > 0 && <g>
        <line x1={x + w + 40} y1={y} x2={x + w + 40} y2={y + h * hq} stroke={FXT.ink} strokeWidth={1.1} />
        <line x1={x + w + 30} y1={y} x2={x + w + 50} y2={y} stroke={FXT.ink} strokeWidth={1.1} />{hq >= 1 && <line x1={x + w + 30} y1={y + h} x2={x + w + 50} y2={y + h} stroke={FXT.ink} strokeWidth={1.1} />}
      </g>}
    </svg>
  );
}
function FXFlow(p) {   // sütun + ok: sütun ease-in-out yükselir (ya da iner), uçta ok; p.dir 'up' | 'down'
  var cv = MH.canvas(), x = p.x, y = p.y, h = p.h || 260, up = p.dir === 'up', col = p.color || (up ? FXT.ink : FXT.graphite), pr = p.p == null ? 1 : p.p, hh = h * FXE.sio(pr);
  return (
    <svg width={cv.w} height={cv.h} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none', filter: FX_PEN }}>
      {p.plate && hh > 1 && <rect x={x - 26} y={up ? y + h - hh : y} width={52} height={hh} fill={fxFill(p.plate)} style={{ mixBlendMode: 'multiply' }} opacity={0.7} />}
      <rect x={x - 26} y={up ? y + h - hh : y} width={52} height={hh} fill="none" stroke={col} strokeWidth={2.2} />
      {[0.25, 0.5, 0.75].map(function (f, i) { return f * h < hh ? <line key={i} x1={x - 26} y1={up ? y + h - f * h : y + f * h} x2={x + 26} y2={up ? y + h - f * h : y + f * h} stroke={col} strokeWidth={0.8} opacity={0.6} /> : null; })}
      {pr > 0.6 && <path d={up ? ('M ' + (x - 18) + ' ' + (y - 6) + ' L ' + x + ' ' + (y - 34) + ' L ' + (x + 18) + ' ' + (y - 6)) : ('M ' + (x - 18) + ' ' + (y + h + 6) + ' L ' + x + ' ' + (y + h + 34) + ' L ' + (x + 18) + ' ' + (y + h + 6))} fill="none" stroke={col} strokeWidth={2.4} />}
    </svg>
  );
}
function FXWindow(p) {   // inceleme penceresi (A katmanı): üretken klip yalnız bu dairede; motor çerçevesi üstte. Donma ve ileri-geri YASAK (__genFreeze kaydı).
  if (fxKey()) return null;
  var r = p.r || 260, ids = [].concat(p.id), a = null, k = 0;
  for (; k < ids.length && !a; k++) a = MH.asset(ids[k]);
  if (!a) MH.assetMissing(ids[0]);
  var fi = p.frame || 0; if (a && a.n && fi > a.n - 1) (window.__genFreeze = window.__genFreeze || {})[a.id] = Math.max((window.__genFreeze || {})[a.id] || 0, Math.round(fi - a.n + 1));
  var src = MH.assetSrc(a, a && a.n ? Math.min(a.n - 1, Math.max(0, fi)) : fi), ring = src ? 7 * Math.sin((p.T || 0) * 0.45) : 0, ticks = [];
  for (var i = 0; i < 48; i++) { var d = (i * 7.5 + ring) * Math.PI / 180, l = i % 6 === 0 ? 14 : 7; ticks.push(<line key={i} x1={r + Math.cos(d) * (r + 12)} y1={r + Math.sin(d) * (r + 12)} x2={r + Math.cos(d) * (r + 12 + l)} y2={r + Math.sin(d) * (r + 12 + l)} stroke={FXT.graphite2} strokeWidth={i % 6 === 0 ? 1.3 : 0.8} />); }
  return (
    <div style={{ position: 'absolute', left: p.x - r, top: p.y - r, width: 2 * r, height: 2 * r }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', background: src ? FXT.glassDark : FXT.placeholder, boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8), 12px 18px 40px rgba(0,0,0,0.45)' }}>
        {src ? <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(' + src + ')', backgroundSize: p.crop ? p.crop.size : 'cover', backgroundPosition: p.crop ? p.crop.pos : '50% 50%', backgroundRepeat: 'no-repeat', filter: 'grayscale(0.6) brightness(1.08) contrast(1.05)' }} />
          : <div data-fx="a-yer-tutucu" style={{ position: 'absolute', inset: 0, background: FXT.placeholder }} />}
        <MHAssetTexture id="plate-glass-1" size="cover" blend="screen" opacity={0.3} filter="grayscale(1)" />
      </div>
      <svg width={2 * r} height={2 * r} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        <circle cx={r} cy={r} r={r} fill="none" stroke={FXT.graphite} strokeWidth={3} /><circle cx={r} cy={r} r={r + 10} fill="none" stroke={FXT.graphite3} strokeWidth={1} />{ticks}
        {[0, 90, 180, 270].map(function (dd, i) { var c = Math.cos(dd * Math.PI / 180), s = Math.sin(dd * Math.PI / 180); return <line key={i} x1={r + c * (r - 16)} y1={r + s * (r - 16)} x2={r + c * (r + 30)} y2={r + s * (r + 30)} stroke={FXT.graphite} strokeWidth={1.4} />; })}
      </svg>
    </div>
  );
}
function FXPlateBox(p) {   // B plakası bir bölgede (malzeme lekesi): yumuşak kenarlı statik maske, karışım KAPTA (maske izole grup kurar)
  if (fxKey()) return null;
  var soft = p.soft == null ? 0.35 : p.soft, m = soft > 0 ? 'radial-gradient(ellipse 50% 50% at 50% 50%, #000 ' + Math.round(100 * (1 - soft) - 10) + '%, rgba(0,0,0,0) 100%)' : undefined;
  return <div style={{ position: 'absolute', left: p.x, top: p.y, width: p.w, height: p.h, overflow: 'hidden', WebkitMaskImage: m, maskImage: m, mixBlendMode: p.blend || 'multiply', opacity: p.o == null ? 0.6 : p.o }}><MHAssetTexture id={p.id} size="cover" filter="grayscale(0.8)" /></div>;
}

// ── kalem basınç dokusu + pişirme (çekirdek MHBakeSvg; süzgeç ilkelleri bu world'ün) ─────────
function fxPenPrims() {   // titreşim (≤ 1 px) + basınca göre kalınlaşma + grafit dişi
  return [
    <feTurbulence key="a" type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7" result="wob" />,
    <feDisplacementMap key="b" in="SourceGraphic" in2="wob" scale="1.8" xChannelSelector="R" yChannelSelector="G" result="disp" />,
    <feTurbulence key="c" type="fractalNoise" baseFrequency="0.007" numOctaves="1" seed="11" result="press" />,
    <feColorMatrix key="d" in="press" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.6 0 0 0 -1.05" result="pressA" />,
    <feMorphology key="e" in="disp" operator="dilate" radius="0.8" result="thick" />,
    <feComposite key="f" in="thick" in2="pressA" operator="in" result="thickP" />,
    <feMerge key="g" result="body"><feMergeNode in="disp" /><feMergeNode in="thickP" /></feMerge>,
    <feTurbulence key="h" type="fractalNoise" baseFrequency="0.85" numOctaves="1" seed="3" result="tooth" />,
    <feColorMatrix key="i" in="tooth" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.3 0 0 0 1.5" result="toothA" />,
    <feComposite key="j" in="body" in2="toothA" operator="in" />,
  ];
}
function FXPen(p) {   // <svg style={{filter: FX_PEN}}> yerine: bake = örnek başına TEKİL kimlik · width/height · style · clip yerel çokgen
  return <MHBakeSvg bake={p.bake} prims={fxPenPrims} off={FX_PEN === 'none'} fidPrefix="fxp-" width={p.width} height={p.height} style={p.style} clip={p.clip} dc={p.dc} dfx={p.dfx}>{p.children}</MHBakeSvg>;
}
function FXMoBlur(p) { return <MHMoBlur v={p.v} shutter={180} minPx={3} id="fxmb">{p.children}</MHMoBlur>; }   // 180° obtüratör, |v| > 3 px/kare
function FXDefs() {   // tek sefer: kalem süzgeci #fxpencil (statik SVG'ler), yağlı kalem #fxgrease, B plakası desenleri (fxFill)
  var base = window.GEN_BASE || '', cv = MH.canvas();
  return (
    <svg width="0" height="0" style={{ position: 'absolute', left: 0, top: 0 }} aria-hidden="true">
      <defs>
        {!MH.key('PEN_IMG') ? <filter id="fxpencil" x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">{fxPenPrims()}</filter>
          : <filter id="fxpencil" x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">{/* pişmiş gürültü (motion-render world fx-lab bake-noise) — ölçümde DAHA YAVAŞ, yalnız PEN_IMG ile */}
          <feImage href={base + 'assets/fx/noise-wob.png'} x="-1500" y="-1500" width="8000" height="6000" preserveAspectRatio="none" result="wob" />
          <feDisplacementMap in="SourceGraphic" in2="wob" scale="1.8" xChannelSelector="R" yChannelSelector="G" result="disp" />
          <feImage href={base + 'assets/fx/noise-press.png'} x="-1500" y="-1500" width="8000" height="6000" preserveAspectRatio="none" result="press" />
          <feColorMatrix in="press" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.6 0 0 0 -1.05" result="pressA" />
          <feMorphology in="disp" operator="dilate" radius="0.8" result="thick" />
          <feComposite in="thick" in2="pressA" operator="in" result="thickP" />
          <feMerge result="body"><feMergeNode in="disp" /><feMergeNode in="thickP" /></feMerge>
          <feImage href={base + 'assets/fx/noise-tooth.png'} x="-1500" y="-1500" width="8000" height="6000" preserveAspectRatio="none" result="tooth" />
          <feColorMatrix in="tooth" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.3 0 0 0 1.5" result="toothA" />
          <feComposite in="body" in2="toothA" operator="in" />
        </filter>}
        <filter id="fxdesat"><feColorMatrix type="saturate" values="0.15" /></filter>
        <filter id="fxgrease" x="-3%" y="-10%" width="106%" height="120%" colorInterpolationFilters="sRGB">{/* cam üstü yağlı kalem: kenar titreşimi + kalem dişi boşlukları */}
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="9" result="w" /><feDisplacementMap in="SourceGraphic" in2="w" scale="3.2" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="4" result="t" /><feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.4 0 0 0 2.0" result="tm" /><feComposite in="d" in2="tm" operator="in" />
        </filter>
        {FX_PLATES.map(function (id) { var a = MH.asset(id); if (!a) return null; return <pattern key={id} id={'fxpl-' + id} patternUnits="userSpaceOnUse" x="0" y="0" width={cv.w} height={cv.h}><image href={base + a.src} width={cv.w} height={cv.h} preserveAspectRatio="xMidYMid slice" filter="url(#fxdesat)" /></pattern>; })}
      </defs>
    </svg>
  );
}
function fxFill(id) { if (!MH.asset(id)) { MH.assetMissing(id); return 'none'; } return 'url(#fxpl-' + id + ')'; }   // B plakası şekil dolgusu (yoksa dolgu yok + kayıt)

Object.assign(window, {
  FXT: FXT, FXF: FXF, FXE: FXE, FX_LIGHT: FX_LIGHT, FX_GRAIN: FX_GRAIN, FX_PEN: FX_PEN, FX_CAP: FX_CAP, FX_PLATES: FX_PLATES,
  fxClamp: fxClamp, fxKey: fxKey, fxTW: fxTW, fxCap: fxCap, fxP: fxP, fxE: fxE, fxS: fxS, fxO: fxO, fxSettle: fxSettle, fxNudge: fxNudge, fxVib: fxVib,
  FXGrain: FXGrain, FXGrid: FXGrid, FXSheet: FXSheet, FXWorld: FXWorld, FXWrite: FXWrite, FXLeader: FXLeader, FXStrike: FXStrike, FXGuide: FXGuide,
  FXRuler: FXRuler, FXCaliper: FXCaliper, FXTitleBlock: FXTitleBlock, FXBar: FXBar, FXFlow: FXFlow, FXWindow: FXWindow, FXPlateBox: FXPlateBox,
  fxPenPrims: fxPenPrims, FXPen: FXPen, FXMoBlur: FXMoBlur, FXDefs: FXDefs, fxFill: fxFill,
});
