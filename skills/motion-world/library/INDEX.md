# World kütüphanesi

Paket süreci ve bu kütüphaneyi taşır (HK-36). Bir proje ya buradan bir world **seçer** ya da look-dev'de yeni world **kurar**:

- **Seçim:** `/motion:init --world <ad>` (argümansız `/motion:init` bu listeyi sorar; headless'ta brief ön bilgisi `world: <ad>`). `motion-render init`
  world dosyalarını projenin `world/` klasörüne kopyalar, `world.json` `origin: "library:<ad>"` olur. Seçim `project.md` §6'ya yazılır.
- **Seçilince:** look-dev'in üç yönü o world'ün içinde kalır, yapısal eksenlerde ayrışır (`../SKILL.md` §2 madde 7). `band`, `edgeDark`, `k1`,
  aksan ve hareket sayıları projenin karelerinde yeniden ölçülür. **Aksan rengi projeden gelir**: kütüphanedeki `#D8301A` yer tutucudur.
- **Seçilmezse:** world'ler okunabilir, kopyalanmaz. Yeni world kurulurken bunlardan birinin sürümü olan yön UCUZ #11'dir. Seçilmiş world'e
  benzerlik ise özelliktir (reviewer SKILL §4.1).
- **Geri yazma:** proje bitince `/motion:promote --library <ad>` world'ü ve derslerini buraya yazar, müşteri malzemesini ayıklar ve bu tabloyu
  günceller (HK-39). Müşteri adı, logo, marka rengi, kare, ses, transkript, sözlük içeriği ve seslendirme metni kütüphaneye girmez (HK-37).

| world | kimlik (tek cümle) | içerik | bant | K1 maskesi | grade | demo | kaynak · durum |
|---|---|---|---|---|---|---|---|
| [`focusfx-paper`](focusfx-paper/) | reklam değil, araştırma laboratuvarı: gri teknik çizim paftası, lacivert dar kalın yazı, mavi taralı vurgu, merdiven etiketleri, cetvel dili | world.json · `fx-lab.jsx` `fx-rig.jsx` `fx-inst.jsx` · lessons · DECISIONS · `SOZLUK-SABLON.md` | %40–58 | ink | lab | `demo.dc.html` (3 s; smoke testi bunu çizer) | FocusFX FX-01 (2026-10) · **üretim world'ü**; eski adı `fx-lab` |
| [`desk-paper`](desk-paper/) | lambalı karanlık masa, kâğıt ve mürekkep: "modelleme, ima et" | world.json · `desk-paper.jsx` · lessons (d-xx tuzakları) · DECISIONS | %15–30 | dom | dark | `demo.dc.html` (4 s) | önceki masa üretimleri · örnek (damıtılmış) |
| [`screen-dark`](screen-dark/) | ekran dünyası, masa dünyasıyla aynı sıcak karanlıkta: fosfor yalnız veri | world.json · `screen-dark.jsx` · lessons · DECISIONS | %12–22 (tipografik %6–14) | dom | dark | `demo.dc.html` (4 s) | önceki ekran üretimleri · örnek (damıtılmış) |
| [`light-ui`](light-ui/) | düz, gölgesiz aydınlık arayüz vitrini | world.json · lessons (kod yok) | %30–55 (+ patlama ≤ %35) | dom | light | — | örnek (yalnız sözleşme) |
| [`photo-plate`](photo-plate/) | gerçek görüntü atmosfer ve malzemedir, bilgi değil | world.json · lessons (kod yok) | %12–28 | alpha | dark | — | örnek (yalnız sözleşme) |

`world.json` dosyaları `motion-render manifest validate` şemasından geçer. Demo sahneleri yer tutucu kelimeler ("ÖRNEK", "BAŞLIK") kullanır;
üretken varlık ve Google Fonts dışında font istemez (fontlar `motion-render vendor` ile lisans metniyle iner). Sayfa biçimi `render/CONTRACT.md` §4:
`motion-runtime.js` + `shared/motion-stage.jsx` + `shared/motion-core.jsx` + `world/*.jsx` + `demo.jsx`. Tasarım uzayı 1920×1080'dir ve
`MHDesignSpace` ile Stage'e (render'da `scenes.json` width×height) sığar.

**Her world'de:** `world.json` (ölçülebilir sözleşme) · `lessons.md` (kimlik, değerlerin kaynağı: ölçüldü / türetildi / varsayım, tuzaklar,
paketlenirken çıkarılanlar) · tam world'lerde `DECISIONS.md` ve ilkel `*.jsx` dosyaları (yalnız `motion-core.jsx` + React'e bağımlı; müşteri
adı, logo, proje metni yok).
