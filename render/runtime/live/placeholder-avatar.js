/* YER TUTUCU avatar — look-dev'de değiştirilir.
 *
 * Bu dosya yalnız adaptör sözleşmesinin ÖRNEĞİDİR: bilerek nötr gri geometri (daire, dikdörtgen, çizgi), sistem yazısı.
 * Renk, font, malzeme, ışık ya da kompozisyon önerisi taşımaz; hiçbir proje bu görünümle teslim edilmez.
 * Projenin avatarı look-dev'de (3 gerçekten farklı yön) tasarlanır ve aynı API ile takılır:
 *   MOTION_LIVE.registerAvatar({ name, kind: 'canvas' | 'dom', init?(ctx|root, info), draw(ctx|root, state, t), dispose?() })
 * draw saf kalır: yalnız state ve t okunur; zamanlayıcı, rAF, rastgelelik yok (aynı girdi → aynı kare).
 */
(() => {
  'use strict';
  const G = { body: '#6e6e6e', head: '#8c8c8c', line: '#a6a6a6', eye: '#d4d4d4', ink: '#2b2b2b', label: '#c8c8c8', dim: '#9a9a9a' };
  const rad = (d) => (d * Math.PI) / 180;
  function rrect(c, x, y, w, h, r) {
    c.beginPath();
    if (c.roundRect) c.roundRect(x, y, w, h, r);
    else c.rect(x, y, w, h);
  }

  window.MOTION_LIVE.registerAvatar({
    name: 'yer-tutucu',
    kind: 'canvas',
    draw(c, s) {
      const cx = s.W / 2, hd = s.head;
      // gövde: baştan gecikmeli izleyen ikincil kayma + nefes
      c.save();
      c.translate(cx + s.secondary.x * 0.6, 0);
      c.fillStyle = G.body;
      c.beginPath();
      c.moveTo(-250, 1080); c.lineTo(-300 + s.breath * 4, 1080); c.lineTo(-230, 790 - s.breath * 5); c.lineTo(230, 790 - s.breath * 5); c.lineTo(300 - s.breath * 4, 1080);
      c.closePath(); c.fill();
      c.fillRect(-55, 690, 110, 120);   // boyun
      c.restore();

      // baş: eğme (roll), sallama (pitch → dikey kayma + basıklık), yön (yaw → yüz kayması), ölçek
      c.save();
      c.translate(cx + hd.x, 500 + hd.y + hd.pitch * 2.2);
      c.rotate(rad(hd.roll));
      c.scale(hd.scale, hd.scale * Math.cos(rad(hd.pitch)));
      // anten: ikincil hareket (başın açısını gecikmeyle izler)
      c.save();
      c.translate(0, -196);
      c.rotate(rad(s.secondary.angle));
      c.strokeStyle = G.line; c.lineWidth = 8; c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -110); c.stroke();
      c.fillStyle = G.line; c.beginPath(); c.arc(0, -118, 16, 0, Math.PI * 2); c.fill();
      c.restore();
      c.fillStyle = G.head;
      c.beginPath(); c.arc(0, 0, 200, 0, Math.PI * 2); c.fill();
      const fx = hd.yaw * 2.2;
      // gözler: kırpma (blink) + şaşkınlık (eyes) + bakış (gaze)
      const open = Math.max(0.06, (1 - s.blink) * (1 + 0.35 * s.eyes));
      for (const sx of [-1, 1]) {
        c.save();
        c.translate(fx + sx * 72, -40);
        c.scale(1, open);
        c.fillStyle = G.eye; c.beginPath(); c.arc(0, 0, 34, 0, Math.PI * 2); c.fill();
        c.fillStyle = G.ink; c.beginPath(); c.arc(s.gaze.x * 12, s.gaze.y * 8, 14, 0, Math.PI * 2); c.fill();
        c.restore();
      }
      // ağız: açıklık zarftan (mouth 0..1), yuvarlaklık açıklıkla artar
      const mw = 150 * (1 - 0.3 * s.mouthRound), mh = 10 + 120 * s.mouth;
      c.fillStyle = G.ink;
      rrect(c, fx - mw / 2, 75 - mh / 2 + 20, mw, mh, Math.min(mh / 2, 40));
      c.fill();
      c.restore();

      // etiket: bu bir yer tutucudur
      c.fillStyle = G.label; c.font = '600 30px system-ui, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      c.fillText("YER TUTUCU — look-dev'de değiştirilir", 48, 72);
      c.fillStyle = G.dim; c.font = '22px system-ui, sans-serif';
      c.fillText('durum: ' + s.label + (s.flags.listen ? ' · dinle sabit' : '') + (s.flags.mute ? ' · sessiz' : ''), 48, 110);
    },
  });
})();
