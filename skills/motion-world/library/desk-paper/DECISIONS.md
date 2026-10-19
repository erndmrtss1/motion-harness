# desk-paper — world kararları (ÖRNEK)

Biçim: kimlik · karar · gerekçe · sonuç. Bu kararlar world'ün kendi tarihidir; world'ü seçen proje bunları başlangıç olarak alır ve kendi DECISIONS'ına yazar, seçmeyen projeyi bağlamaz.

## DPW-01 · 2.5D "ima et"; 3B katı cisim ve WebGL masa terk
- **Karar:** derinlik örtüşen düz katman, yumuşak gölge, odak farkı ve doku + ışıktan gelir; nesneler gradyanlı geometriyle modellenmez.
- **Gerekçe:** gradyanlı 3B eşya eski oyun grafiği gibi okundu (t-11); pano + disk kapalı hacim vermedi (t-15); WebGL masa ve geniş lens dünyanın dilini bozdu (d-09).

## DPW-02 · Lamba = world ışığı; amber yalnız ışık
- **Karar:** lamba gövdesi çizilmez; havuz `DeskWorld` ışığıdır (light + fall + warm, çok kaynakta illum). Havada huzme yalnız ışıkla açılış vuruşunda (`DeskLampBeam`). Hiçbir nesne amber boyanmaz.

## DPW-03 · Işık = dikkat
- **Karar:** havuz kalemin çalıştığı yerde; kesin kutuya çizimden önce varır; çapa değişiminde 0.5–0.6 s kayar. Okunacak metin taşıyan kahramanda ışık çarpımsal.
- **Gerekçe:** kalem havuzun dışında çalışınca göz ışığa gitti, jest kayboldu; screen ışık mürekkebi açtı (W-34).

## DPW-04 · Dünya ölçeği dolly
- **Karar:** büyük dolly'de kamera okuma mesafesinde kalır, dünya odak etrafında ölçeklenir.
- **Gerekçe:** uzak kamera + dev katman raster belleğine takıldı (karo düşmesi, eksik harf).

## DPW-05 · Büyük katman yarım çözünürlük, box-shadow
- **Karar:** dev katmanlar yarım çözünürlükte + `scale(2)`; bulanık gölge yerine `box-shadow`; açık `translateZ`.
- **Sonuç:** raster belleği ~4× az.

## DPW-06 · Aynı nesne, tek bileşen
- **Karar:** birden çok sahnede görünen aynı nesne (ör. ekranlı cam nesne) tek bileşendir; görünüşü değişirse onu kullanan bütün sahneler birlikte render edilir ve önce/sonra kareleri birebir karşılaştırılır.

## DPW-07 · Sahne kendi world katmanını çizer
- **Karar:** bir masa sahnesi ortak bir sarmalayıcıya gömülürse çift vinyet / gren / drift oluşur; world katmanı tek kaynaktan gelir.

## DPW-08 · Organik deformasyon gerçek görüntü dizisinden
- **Karar:** kâğıt buruşturma gibi karmaşık organik deformasyon yordamsal süzgeçle değil, gerçek görüntü dizisinden (key + tint + kırpım + maskeli mürekkep) kurulur.
- **Not:** paket örneği bu diziyi taşımaz; yöntem dersi olarak kalır.

## DPW-09 · Paket sürümü (v2.0.0)
- **Karar:** world örnek olarak pakete girerken fotoğraf/video dokuları yordamsal dokuya çevrildi, proje medyası ve içerik çıkarıldı; ortak motor parçaları
  (easing, drift dalgası mekanizması, katman, ışık-açılış hesabı için çekirdek ilerleme yardımcıları) çekirdeğe (`motion-core.jsx`) taşındı. El yazısı hızı
  kare yerine px/s ile tutulur (fps'ten bağımsız).
