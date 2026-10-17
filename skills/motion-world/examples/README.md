# Örnek world'ler — ÖRNEK, varsayılan değil

Bu klasördeki world'ler önceki üretimlerden **süreci göstermek için** damıtılmış örneklerdir. Hiçbiri varsayılan değildir:

- Paket bir projeye world **vermez**. World seçilmedikçe hiçbir ilkel, renk, font, alet ya da geçiş kalıbı gelmez (`../SKILL.md` §2).
- Yeni projede world, look-dev fazında brief'ten **sıfırdan** kurulur (`../SKILL.md` §3). "Örnek world'ün bir versiyonu" geçerli bir yön değildir (UCUZ #11).
- Bir örnek yalnız kullanıcı **açıkça** isterse kullanılır (`motion-render init <dir> --world <ad>`) ve o zaman da projenin kendi kareleriyle
  yeniden ölçülerek uyarlanır (`../SKILL.md` §8). Okumak serbesttir; sessizce kopyalamak değil.

| örnek | kimlik (tek cümle) | içerik | bant | K1 maskesi | grade | demo |
|---|---|---|---|---|---|---|
| [`fx-lab`](fx-lab/) | reklam değil, araştırma laboratuvarı — grafit masada teknik çizim paftası, açık soğuk ışık | world.json · `fx-lab.jsx` `fx-rig.jsx` `fx-inst.jsx` · lessons · DECISIONS | %40–58 | ink | lab | `demo.dc.html` (4 s; kurulum smoke testi bunu çizer) |
| [`desk-paper`](desk-paper/) | lambalı karanlık masa, kâğıt ve mürekkep — "modelleme, ima et" | world.json · `desk-paper.jsx` · lessons (d-xx tuzakları) · DECISIONS | %15–30 | dom | dark | `demo.dc.html` (4 s) |
| [`screen-dark`](screen-dark/) | ekran dünyası, masa dünyasıyla aynı sıcak karanlıkta — fosfor yalnız veri | world.json · `screen-dark.jsx` · lessons · DECISIONS | %12–22 (tipografik %6–14) | dom | dark | `demo.dc.html` (4 s) |
| [`light-ui`](light-ui/) | düz, gölgesiz aydınlık arayüz vitrini | world.json · lessons (kod yok) | %30–55 (+ patlama ≤ %35) | dom | light | — |
| [`photo-plate`](photo-plate/) | gerçek görüntü atmosfer ve malzemedir, bilgi değil | world.json · lessons (kod yok) | %12–28 | alpha | dark | — |

**Durum:** hepsi `ÖRNEK, varsayılan değil`. `world.json` dosyaları `motion-render manifest validate` şemasından geçer; `origin` alanı `example:<ad>`.

**Demo sahneleri** yer tutucu kelimeler ("ÖRNEK", "BAŞLIK") kullanır, üretken varlık ve Google Fonts dışında font istemez. Sayfa biçimi
`render/CONTRACT.md` §4: `motion-runtime.js` + `shared/motion-stage.jsx` + `shared/motion-core.jsx` + `world/*.jsx` + `demo.jsx`. Tasarım uzayı
1920×1080'dir ve `MHDesignSpace` ile Stage'e (render'da `scenes.json` width×height) sığar.

**Her örnekte:** `world.json` (ölçülebilir sözleşme) · `lessons.md` (kimlik, değerlerin kaynağı — ölçüldü / türetildi / varsayım —, tuzaklar,
"varsayılan olmamalı" notu, paketlenirken çıkarılanlar) · tam örneklerde `DECISIONS.md` (world kararları) ve ilkel `*.jsx` dosyaları
(yalnız `motion-core.jsx` + React'e bağımlı; marka, logo, proje metni yok).
