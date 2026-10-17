// demo.jsx — ÖRNEK world "fx-lab" gösterimi (~4 s, yer tutucu kelimeler). Kurulum smoke testi bu sahneden 12 kare (960×540) çizer:
// üretken varlık yok, font yalnız world.json'daki Google Fonts. Tasarım uzayı 1920×1080, Stage'e MHDesignSpace ile sığar.
// Akış: ışıkla açılış (K-24, pozlama 0.35 → 1) → kılavuz çizgileri → "ÖRNEK" yazılır → çelik cetvel kayarak gelir, oturur →
//   cetvelle aksan çizgisi (world'ün tek kırmızısı; pafta 2 px tepki itmesi) → etiket çizgisi + "BAŞLIK" → tutuş → pozlama kapanışı (son kare siyah).
// Kamera: monoton kübik push + hafif orbit + drift 0.35. Kahraman (K1 mürekkep maskesi): yazı + etiket + çubuk + kadran (çizim yığını tek nesne).
// Kancalar: __camSpeed, __boxes, __tools, __events, __holds.

var FXDEMO = {
  dur: 4,
  sheet: { x: 110, y: 70, w: 1700, h: 940 },   // kâğıt kadrajın ~%75'i: bant (%40–58) kâğıt payıyla tutulur
  word: { text: 'ÖRNEK', x: 150, y: 190, size: 210 },
  label: 'BAŞLIK',
  keys: [
    [0, { x: 960, y: 560, d: -160, rx: 5, ry: 0, rz: -0.5 }],
    [2.2, { x: 950, y: 548, d: 0, rx: 2, ry: -2.5, rz: 0 }],
    [4, { x: 945, y: 542, d: 60, rx: 1.5, ry: -3.2, rz: 0.2 }],
  ],
  t: { guide: 0.35, write: 0.8, writeDur: 0.9, rule: 0.9, ruleDur: 1.1, strike: 2.15, leader: 2.5, close: 3.45 },
};
function fxDemoCam(T) { return fxCamAt(T, FXDEMO.keys, 0.35); }
function fxDemoWordW() { var w = FXDEMO.word; return fxTW(w.text, w.size); }
function fxDemoRuleX(T) {   // cetvel dünya x'i: kadraj dışından sio ile (görünürken ≤ 57 px/kare), varışta oturma
  var S = FXDEMO.sheet, t = FXDEMO.t, x1 = S.x + FXDEMO.word.x - 20, x0 = 1960;
  return x0 + (x1 - x0) * fxS(T, t.rule, t.ruleDur) - fxSettle(T, t.rule + t.ruleDur, 4.6);
}
function fxDemoBox(c, x, y, w, h, z) {   // dünya dikdörtgeni → ekran sınır kutusu [x, y, w, h]
  var q = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(function (p) { return fxProj(c, p[0], p[1], z || 0); });
  var xs = q.map(function (p) { return p.x; }), ys = q.map(function (p) { return p.y; }), x0 = Math.min.apply(null, xs), y0 = Math.min.apply(null, ys);
  return { rect: [x0, y0, Math.max.apply(null, xs) - x0, Math.max.apply(null, ys) - y0], k: q[0].k, poly: q.map(function (p) { return [p.x, p.y]; }) };
}

function FXLabDemoPiece() {
  var t = MH.useT(), T = t.T, D = FXDEMO, S = D.sheet, W = D.word, tt = D.t, last = t.duration - 1 / t.fps;
  var c = fxDemoCam(T), tw = fxDemoWordW();
  var lamp = fxLamp(T, { t0: 0.05 }, c, [S.x + W.x + tw / 2, S.y + W.y + W.size * 0.5], 700, 0.1);
  var open = 0.35 + 0.65 * fxO(T, 0, 0.8), close = T >= last - 1e-4 ? 0 : 1 - fxE(T, tt.close, last - tt.close);
  var mv = MH.cam.motion(fxDemoCam, T, t.dt), nd = fxNudge(T, [[tt.strike, 90]]);
  var rx = fxDemoRuleX(T), lx = W.x + tw + 20, ly = W.y + 25;
  return (
    <FXWorld T={T} pool={lamp.pool} exposure={Math.min(open, close)}>
      <FXMoBlur v={mv}>
        <FXCam c={c}>
          <FXLayer z={0} name="pafta">
            <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transform: 'translate(' + nd.dx.toFixed(2) + 'px,' + nd.dy.toFixed(2) + 'px)' }}>
              <FXSheet x={S.x} y={S.y} w={S.w} h={S.h} seed={3} plate={null}>
                <FXGuide x={W.x} y={W.y} size={W.size} w={tw} p={fxP(T, tt.guide, 0.45)} bake="demo-guide" />
                <FXWrite text={W.text} x={W.x} y={W.y} size={W.size} p={fxS(T, tt.write, tt.writeDur)} color={FX4.inkBlack} hero />
                <FXStrike x={W.x} y={W.y + W.size + 24} w={tw} p={fxP(T, tt.strike, 0.3)} red bake="demo-strike" />
                <FXLeader ax={lx} ay={ly} bx={lx + 80} by={ly - 90} ex={lx + 220} ey={ly - 90} p={fxP(T, tt.leader, 0.9)} vib={fxVib(T, tt.leader + 0.63)} label={D.label} size={30} bake="demo-leader" hero />
                <FXBar x={1300} y={160} w={150} h={360} p={fxP(T, 1.2, 1.4)} id={1} hero />
                <FXDial x={1500} y={720} r={100} v="a" val={0.62} p={fxP(T, 1.6, 1.0)} T={T} id={1} hero />
              </FXSheet>
            </div>
          </FXLayer>
          <FXLayer z={30} name="alet">
            <FXRule v="b" x={rx} y={S.y + W.y + W.size + 34} len={820} hz={26} />
          </FXLayer>
          <FXLayer z={60} name="toz">
            <FXDust x={S.x + 220} y={S.y + 60} w={1100} h={700} n={18} T={T} seed={5} />
          </FXLayer>
        </FXCam>
      </FXMoBlur>
    </FXWorld>
  );
}

// ── kancalar (CONTRACT §5): kamera hızı, kutular, alet, olaylar, tutuş ─────────
MH.hooks.camSpeed(fxDemoCam, { dur: FXDEMO.dur });
MH.hooks.boxes(function (T) {
  var c = fxDemoCam(T), S = FXDEMO.sheet, W = FXDEMO.word, tw = fxDemoWordW(), out = [];
  if (T >= FXDEMO.t.write) { var b = fxDemoBox(c, S.x + W.x, S.y + W.y, tw * MH.clamp((T - FXDEMO.t.write) / FXDEMO.t.writeDur, 0, 1), W.size); out.push({ name: W.text, rect: b.rect, z: 0, kind: 'lyric', size: W.size * b.k }); }
  if (T >= FXDEMO.t.leader + 0.54) { var lx = S.x + W.x + tw + 20 + 234, ly = S.y + W.y + 25 - 90 - 16; var l = fxDemoBox(c, lx, ly, fxTW(FXDEMO.label, 30, FXF.mono, 500, 0.04), 30); out.push({ name: FXDEMO.label, rect: l.rect, z: 0, kind: 'label', size: 30 * l.k }); }
  return out;
});
MH.hooks.tools(function (T) {
  var c = fxDemoCam(T), S = FXDEMO.sheet, W = FXDEMO.word, rx = fxDemoRuleX(T), y = S.y + W.y + W.size + 34, b = fxDemoBox(c, rx, y, 844, 52, 30), cv = MH.canvas();
  var vis = b.rect[0] < cv.w && b.rect[0] + b.rect[2] > 0 && b.rect[1] < cv.h && b.rect[1] + b.rect[3] > 0;
  return { cetvel: { poly: b.poly, tip: b.poly[0], visible: vis } };
});
MH.hooks.events([
  { t: FXDEMO.t.write, word: FXDEMO.word.text, kind: 'write' },
  { t: FXDEMO.t.strike, word: 'aksan', kind: 'strike' },
  { t: FXDEMO.t.leader, word: FXDEMO.label, kind: 'label' },
]);
MH.hooks.holds([[3.15, FXDEMO.t.close]]);

function FXLabDemo(props) {   // kök: Stage = görüntü alanı (render'da scenes.json width×height), içerik 1920×1080 tasarım uzayında
  var st = MH.stage(props); MH.setStage(st.w, st.h);
  return (
    <CompositionStage width={st.w} height={st.h} bg="#000" scenes={window.OM_SCENES} playback={window.OM_PLAYBACK}>
      <MHDesignSpace w={1920} h={1080}><FXLabDemoPiece /></MHDesignSpace>
    </CompositionStage>
  );
}

Object.assign(window, { FXDEMO: FXDEMO, fxDemoCam: fxDemoCam, FXLabDemoPiece: FXLabDemoPiece, FXLabDemo: FXLabDemo });
