// demo.jsx — ÖRNEK world "screen-dark" gösterimi (~4 s, yer tutucu kelimeler). Üretken varlık yok; fontlar world.json'daki Google Fonts.
// Akış: ışık açılışı (0.4 s, amber anahtar üst-sol) → cam panel; veri çizgisi (fosfor) soldan çizilir → "ÖRNEK" terminalde harf harf yazılır (50 ms,
//   imleç izler) → etiket çizgisi veri ucundan uzar, kutu açılır, "BAŞLIK" yazılır (K-22) → köşede cam sayaç CRT ile açılır, sert yenileme →
//   CRT kapanışı → pozlama kapanışı (son kare siyah). Kamera yok; drift 0.4 world katmanında.
// Tasarım uzayı 1920×1080 (MHDesignSpace). Kancalar: __boxes, __events, __holds.

var SDDEMO = {
  dur: 4,
  panel: { x: 240, y: 150, w: 1440, h: 660 },
  word: { text: 'ÖRNEK', x: 90, y: 70, size: 170, t0: 1.0, cps: 20 },
  label: 'BAŞLIK',
  spark: { x: 90, y: 330, w: 1100, h: 250, t0: 0.5, dur: 1.1 },
  face: { x: 1380, y: 860, w: 360, h: 128 },
  t: { label: 1.95, crtOn: 0.35, refresh: 2.6, crtOff: 3.15 },
};
function sdSparkPts() {   // deterministik veri: yükselen eğilim + gürültü (yerel px)
  var S = SDDEMO.spark, r = MH.rng(9), pts = [], n = 44;
  for (var i = 0; i <= n; i++) { var u = i / n; pts.push([u * S.w, S.h * (0.85 - 0.6 * MH.ease.inOut2(u)) + (i && i < n ? (r() - 0.5) * 46 : 0)]); }
  return pts;
}
function ScreenDarkDemoPiece() {
  var t = MH.useT(), T = t.T, D = SDDEMO, P = D.panel, W = D.word, S = D.spark, F = D.face, tt = D.t;
  var typed = MH.typed(W.text, T, W.t0, W.cps), font = '700 ' + W.size + 'px ' + SCR_FONT.display, tw = scrTextW(font, typed);
  var pts = sdSparkPts(), sp = MH.ease.sine(MH.p(T, S.t0, S.dur)), end = pts[pts.length - 1];
  var lx = P.x + S.x + end[0], ly = P.y + S.y + end[1];
  var c = scrCRT(T, tt.crtOff, tt.crtOn), value = T < tt.refresh ? '041' : '042', hard = MH.frame(T, SCR.crtRate) === MH.frame(tt.refresh, SCR.crtRate);   // sert yenileme: 1 adım boş + yeni değer
  var face = <ScreenFace x={F.x} y={F.y} w={F.w} h={F.h} c={hard ? { k: 1, b: 1, on: 0 } : c} value={value} label="SAYAÇ" glow={0.67} />;
  return (
    <ScreenWorld T={T} dur={t.duration} light={{ x: 640, y: 320, r: 1300, a: 0.16 }} over={face}>
      <ScreenGround />
      <ScreenGlass x={P.x} y={P.y} w={P.w} h={P.h} hero>
        <ScreenGrid w={P.w} h={P.h} nx={12} ny={6} />
        <ScreenSpark x={S.x} y={S.y} w={S.w} h={S.h} pts={pts} p={sp} id={1} />
        <ScreenDisplay x={W.x} y={W.y} size={W.size} text={typed} doku={typed.length < W.text.length} />
        {T >= W.t0 && <ScreenCursor x={W.x + tw + 14} y={W.y + W.size * 0.86} s={2.2} on={typed.length < W.text.length ? 1 : scrBlink(T, W.t0)} />}
      </ScreenGlass>
      <ScreenLabel T={T} kind="leader" x={lx} y={ly} dx={60} dy={-80} t0={tt.label} text={D.label} />
      <ScreenBody x={F.x} y={F.y} w={F.w} h={F.h} />
    </ScreenWorld>
  );
}

MH.hooks.boxes(function (T) {
  var D = SDDEMO, P = D.panel, W = D.word, out = [{ name: 'panel', rect: [P.x, P.y, P.w, P.h], z: 0, kind: 'obj' }];
  var typed = MH.typed(W.text, T, W.t0, W.cps);
  if (typed) out.push({ name: W.text, rect: [P.x + W.x, P.y + W.y, scrTextW('700 ' + W.size + 'px ' + SCR_FONT.display, typed), W.size], z: 0, kind: 'lyric', size: W.size });
  return out;
});
MH.hooks.events([
  { t: SDDEMO.word.t0, word: SDDEMO.word.text, kind: 'type' },
  { t: SDDEMO.t.label, word: SDDEMO.label, kind: 'label' },
  { t: SDDEMO.t.refresh, word: 'yenileme', kind: 'refresh' },
]);
MH.hooks.holds([[2.8, 3.15]]);

function ScreenDarkDemo(props) {   // kök: Stage = görüntü alanı (render'da scenes.json width×height), içerik 1920×1080 tasarım uzayında
  var st = MH.stage(props); MH.setStage(st.w, st.h);
  return (
    <CompositionStage width={st.w} height={st.h} bg="#000" scenes={window.OM_SCENES} playback={window.OM_PLAYBACK}>
      <MHDesignSpace w={1920} h={1080}><ScreenDarkDemoPiece /></MHDesignSpace>
    </CompositionStage>
  );
}

Object.assign(window, { SDDEMO: SDDEMO, ScreenDarkDemoPiece: ScreenDarkDemoPiece, ScreenDarkDemo: ScreenDarkDemo });
