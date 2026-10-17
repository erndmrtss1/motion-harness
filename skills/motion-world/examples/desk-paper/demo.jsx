// demo.jsx — ÖRNEK world "desk-paper" gösterimi (~4 s, yer tutucu kelimeler). Üretken varlık yok; fontlar world.json'daki Google Fonts.
// Akış: ışıkla açılış (K-24: havuz merkezden açılır, huzme havada) → kâğıt sağdan itilir (gölge 0.08 s önce) → "ÖRNEK" tükenmez kalemle yazılır
//   (ıslak mürekkep kurur) → 80 ms sonra alt çizgi → havuz etikete kayar (ışık = dikkat, 0.55 s) → "BAŞLIK" + kurşun kalemle kutu → tutuş →
//   pozlama kapanışı (son kare siyah). Kamera: masa tepeden 11° okuma açısı, push z −380 → −300 (tek vurgu, Z ±80), drift k 1.
// Tasarım uzayı 1920×1080 (MHDesignSpace). Kancalar: __events, __holds.

var DPDEMO = {
  dur: 4,
  paper: { w: 1240, h: 880 },
  word: { id: 'w1', text: 'ÖRNEK', x: 120, y: 330, size: 150, speed: 1080, pr: 0.7, t0: 0.85, seed: 7 },
  label: { id: 'w2', text: 'BAŞLIK', x: 150, y: 560, size: 84, speed: 800, pr: 0.6, t0: 2.05, seed: 11 },   // okunacak metin: mürekkep (kurşun kalem ≈ 2.5:1 kalır)
  t: { push: 0.15, pushDur: 0.5, pool: 1.55, poolDur: 0.55, box: 2.75, close: 3.45 },
  pool: { word: [700, 410], label: [680, 600], r: 600 },
};
function dpUnderline() {   // kelimeden 80 ms sonra, hızlı
  var w = DPDEMO.word, W = deskHandW(w), t0 = deskHandEnd(w) + 0.08;
  return { id: 'u1', t0: t0, dur: 0.22, pts: deskLinePts(w.x - 8, w.y + 24, w.x + W + 14, w.y + 20, 3, 1.2, 12), pr: 0.75, w: 3.4 };
}
function dpBox() { var l = DPDEMO.label; return { id: 'b1', t0: DPDEMO.t.box, dur: 0.35, pts: deskBoxPts(l.x - 74, l.y - 46, 44, 5), pr: 0.5, pencil: true, w: 2.4 }; }

function DeskPaperDemoPiece() {
  var t = MH.useT(), T = t.T, D = DPDEMO, tt = D.t, last = t.duration - 1 / t.fps;
  var L = deskLightOpen(T, { t0: 0.02, rise: 2 / t.fps }), u = deskE(MH.p(T, tt.pool, tt.poolDur));   // şiddet 2 karede, havuz merkezden açılır (fade sayılmaz)
  var px = MH.mix(D.pool.word[0], D.pool.label[0], u), py = MH.mix(D.pool.word[1], D.pool.label[1], u), pr = D.pool.r * (0.55 + 0.45 * L.r);
  var close = T >= last - 1e-4 ? 0 : 1 - MH.ease.inOut3(MH.p(T, tt.close, last - tt.close));   // açılışta pozlama rampası YOK: karanlık, küçük havuz + düşümden (eşit oranlı parlama fade sayılır)
  var push = 400 * (1 - deskE(MH.p(T, tt.push, tt.pushDur))), pushS = 400 * (1 - deskE(MH.p(T, tt.push + 0.08, tt.pushDur))) - push;   // gölge önce
  var cvx = 1700 - D.paper.w / 2, cvy = 1100 - D.paper.h / 2, ul = dpUnderline(), bx = dpBox();
  var lit = function (x, y) { return Math.max(0, 1 - Math.hypot(x - px, y - py) / pr); };
  var beam = <DeskLampBeam x={250} y={-140} tx={px} ty={py} r={pr * 0.8} k={L.k} a={0.06} />;
  return (
    <DeskWorld T={T} light={{ x: px, y: py, r: pr, a: +(0.1 * L.k).toFixed(4) }} fall={0.5} warm={0.55} exposure={close}
      over={<React.Fragment>{beam}<DeskDust T={T} n={36} lit={lit} /></React.Fragment>}>
      <DeskCamera T={T} drift={1} z={MH.mix(-380, -300, deskE(MH.p(T, 0, D.dur)))}>
        <DeskPlane tilt={11}>
          <DeskPaper x={cvx + push} y={cvy} w={D.paper.w} h={D.paper.h} rot={-2} seed={4} lift={16} shadowShift={[pushS, 0]} hero>
            <svg width={D.paper.w} height={D.paper.h} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
              <DeskInk stroke color={DESK.ballpoint}>
                <path d={'M 60 150 Q 620 153 1180 149'} strokeWidth={1.6} />{/* cetvelle çekilmiş satır çizgisi (0.6 px sehim: sıfır yükseklikli kutuyu süzgeç yutar) */}
              </DeskInk>
              <g filter="url(#desk-ink)"><DeskHand h={D.word} T={T} /><DeskStroke s={ul} T={T} /><DeskHand h={D.label} T={T} /></g>
              <g filter="url(#desk-pencil)"><DeskStroke s={bx} T={T} /></g>
              <DeskHand h={D.word} T={T} part="tip" k={lit(px, py) > 0 ? 1 : 0.4} /><DeskStroke s={ul} T={T} part="tip" />
              <DeskHand h={D.label} T={T} part="tip" /><DeskStroke s={bx} T={T} part="tip" />
            </svg>
          </DeskPaper>
        </DeskPlane>
      </DeskCamera>
    </DeskWorld>
  );
}

MH.hooks.events(function () {
  return [
    { t: DPDEMO.word.t0, word: DPDEMO.word.text, kind: 'write' },
    { t: dpUnderline().t0, word: 'alt çizgi', kind: 'stroke' },
    { t: DPDEMO.label.t0, word: DPDEMO.label.text, kind: 'write' },
    { t: DPDEMO.t.box, word: 'kutu', kind: 'stroke' },
  ];
});
MH.hooks.holds([[3.1, DPDEMO.t.close]]);

function DeskPaperDemo(props) {   // kök: Stage = görüntü alanı (render'da scenes.json width×height), içerik 1920×1080 tasarım uzayında
  var st = MH.stage(props); MH.setStage(st.w, st.h);
  return (
    <CompositionStage width={st.w} height={st.h} bg="#000" scenes={window.OM_SCENES} playback={window.OM_PLAYBACK}>
      <MHDesignSpace w={1920} h={1080}><DeskPaperDemoPiece /></MHDesignSpace>
    </CompositionStage>
  );
}

Object.assign(window, { DPDEMO: DPDEMO, DeskPaperDemoPiece: DeskPaperDemoPiece, DeskPaperDemo: DeskPaperDemo });
