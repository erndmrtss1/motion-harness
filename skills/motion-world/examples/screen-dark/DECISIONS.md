# screen-dark — world kararları (ÖRNEK)

Biçim: kimlik · karar · gerekçe · sonuç. Bu kararlar örnek world'ün kendi tarihidir; yeni projeyi bağlamaz.

## SDW-01 · Soğuk ekran kimliksiz → ekran dünyası masa dünyasının karanlığında
- **Bağlam:** ilk ekran dili (soğuk fosfor yüzey, arduvaz, yeşil ızgara) her ekran grafiğine benzedi; inceleme "kimliksiz" dedi.
- **Karar:** zemin sıcak siyah, cam koyu sıcak, anahtar amber (masa dünyasıyla aynı); fosfor yalnız veri. Soğukluk anlatıdan gelir.
- **Ders (çekirdek ilhamı):** jenerik dünya dili kimliksiz çıktı verir; world kimliği projenin kendi ışığından türetilir.

## SDW-02 · Gösterge paleti fosfor ailesi
- **Karar:** veri paleti fosfor + açık + koyu + fog + gri-yeşil; altın / mavi / mor yok. Ayrım ton değil, çizgi tipi / kalınlık / opaklık.

## SDW-03 · Kayıp rengi tek rol
- **Karar:** kayıp rengi çizgi, sayı ve etikette; yüzeyde değil (en çok hafif ısınma). Okunacak kayıp metni ayrı okunur ton. İstisna sahne kaydında.

## SDW-04 · Cam = gövde + ışıyan yüz
- **Karar:** gövde ışık katmanlarının altında; ışıyan yüz `ScreenWorld.over`'da (düşüm karartmaz); yansıma gövdede, CRT'nin dışında.
- **Sonuç:** aynı cam nesne bütün sahnelerde tek bileşen (görünüş değişirse bütün kullanan sahneler yeniden render + karşılaştırma).

## SDW-05 · Geçiş dili: CRT, sert yenileme, tarama silmesi
- **Karar:** ekranlı nesnede fade yerine CRT açılış/kapanış (adımlar 30 Hz ızgarasında), sert yenileme (1 adım boş), durum değişiminde tarama silmesi.
- **Gerekçe:** ekran rengi yerinde değişince fade dedektörü fade saydı.

## SDW-06 · Uzayan etiket (K-22) bu world'ün etiket dili
- **Karar:** 15 px daktilo dokusu yerine 24+ px hap/çizgili etiket; hap veri çizgisinin ucundan 16 px, çizgiler önde; görünüm sıcak koyu cam, fosfor yok.
- **Kanıt:** A/B'de etiket okunur oldu; ilk sürümde hap veri çizgisini örtmüştü (r2 düzeltmesi).

## SDW-07 · Paket sürümü (v2.0.0)
- **Karar:** world örnek olarak pakete girerken marka motifli imleç ve ikon anonimleştirildi (çubuk imleç; genel ikon), müşteri zemin görseli yordamsal
  dokuya çevrildi, bölüm adına bağlı kural genelleştirildi. Ortak motor parçaları (drift, easing, ilerleme, daktilo, kare ızgarası) çekirdeğe taşındı;
  CRT kare adımları kare hızından bağımsız bir ızgaraya (`crtRate`) bağlandı.
