# desk-paper — world dersleri (ÖRNEK, varsayılan değil)

> Bu dosya bir **örnek** world'ün ders kaydıdır. Paket bu world'ü hiçbir projeye kendiliğinden vermez; yalnız kullanıcı açıkça isterse
> ve o zaman da projenin kendi look-dev ölçümleriyle uyarlanarak kullanılır (`../../SKILL.md` §8).
> Kaynak: önceki üretimlerin masa dünyası belgesi, ortak bileşen kodu, tuzak arşivi (`d-xx`, ilgili `t-xx`). Proje içeriği, sahne künyeleri,
> fotoğraf/video dokuları ve marka öğeleri çıkarıldı; dokular yordamsal.

## Kimlik

- **Tek cümle:** lambalı karanlık masa, kâğıt ve mürekkep.
- **İlke — modelleme, ima et.** Derinlik dört şeyden gelir: örtüşen düz katmanlar, yumuşak gölge, odak farkı, doku + ışık. Hiçbir nesne
  gradyanlı geometriyle modellenmez; eşya ya doku ile ya da odak dışı silüet/gölge olarak vardır ("orada bir kupa var" yeter).
  Kahraman (kâğıt, damga) ayrıntılı; ikincil eşya 2–3 px bulanık ve kısmen kadraj dışı.
- **Işık:** lamba = world ışığıdır, lamba gövdesi çizilmez. Amber YALNIZ ışıktır; hiçbir nesne amber boyanmaz.
- **Işık = dikkat:** havuz kalemin çalıştığı yerdedir; kesin kutuya çizimden ÖNCE varır (beklenti). Gitmemesi de anlam taşır.
- **Kamera dünyası tek:** aynı masa, aynı tepeden açı; okuma açısı 11–13°.

## world.json değerlerinin kaynağı

| alan | değer | kaynak | not |
|---|---|---|---|
| `band` | [15, 30] | ölçüldü | masa sahneleri; havuz içinde masa luması ~23–33, uzak köşe ~7 |
| `edgeDark.maxFalloff` | 0.65 | türetildi | vinyet 0.35 × düşüm 0.45 → 1 − 0.65 · 0.55 ≈ 0.64; projede gri kartla (`MH_CARD=1`) ölçülerek düzeltilir |
| `k1` | dom · 0.30 / 0.50 | kural (çekirdek tabanı) | kahraman kâğıt / nesne DOM kutusu (`data-hero`) |
| `accent` | #E0202F · signal · 0 | kural | her kullanım sayılır ve raporlanır; kaynak görseldeki kırmızı da sayılır; kota sahne manifestinden |
| `camera.maxPxPerFrame` | 7 | ölçüldü | sakin kayışta tepe hız tavanı 420 masa px/s (≈ 7 px/kare @60) |
| `camera.tiltRead` / `pushZ` / `glancePx` | 11–13° · 80 · 40 | kural | okuma açısı · push/pull tek vurgu Z ±80 · bakış x ±40 px (0.8 s git, 1.2 s tut) |
| `camera.craneScaleMin` | 0.10 | ölçüldü | vinç hareketinde ölçek değişimi < %10 okunmuyor |
| `motion.handPxPerSec` | 720 / 1080–1440 / 1080 | ölçüldü | el yazısı: sakin / öfkeli / okunması gereken ilk karalama (kaynakta 24 / 36–48 / 36 px/kare @30) |
| `motion.toolMaxPx` | 24 | türetildi | öfkeli yazımın kalem ucu hızı @60 |
| `motion.writeGlyphsPerSec` | 30 | türetildi | 720 px/s ÷ ~24 px glif (Caveat ~50 px) — projede ölçülür |
| `motion.settlePx` | 2 | ölçüldü | yazıcı beslemesinde 2 px aşma + 0.05 s oturma |
| `motion.shake` | 0.2 / 0.35 / 2–3 / ≤ 1 | kural | sarsıntı 3 Hz + 0.45 · 7 Hz: el · manik · darbe (1 kare, yalnız darbe alan katman) · bütün kadraj |
| `grade` | dark | kod | curves hafif S, colorbalance bs .04 rh .03 bh −.04, vinyet 0.72 siyah noktasından ÖNCE, siyah 10/9/8, saf kuyruk 0.4 s |

## Ölçümler ve sayılar

- **Masa ışığı:** havuz yarıçapı `R · (0.7 + 0.3 · L)`, parlaklık `b = 0.22 + 0.78 · L` (L lamba düzeyi); ortam ≥ %10; havuz içi/dışı ≥ 1.6.
- **Derinlik denetimi:** ikili kesişim > 400 px²; kenar bulanıklığı kenardan 120 px içeri 1.5 px → 0; net/çevre ≥ 2; okunacak nesnede raf bulanıklığı ≤ 0.5 px.
- **Kâğıt:** gren multiply %45, lif overlay %6, 135° ışık gradyanı (sağ-alt %12 koyu), 1 px açık kenar, gölge `18px 30px 80px` .65; kıvrım 0–20.
- **El yazısı:** Caveat 600; basınç 0..1 → renk `inkLow → inkHigh`, glif kalınlığı `size · 0.012 · basınç`; harf tabanı ±1.5 px, açı ±1.4°, satır eğimi ±2°;
  ıslak mürekkep son 0.3 s (açık mavi parlaklık maskesi %42), sonra kurur. Alt çizgi / ünlem kelimeden 80 ms sonra, ayrı vuruş.
- **Fiziksel olaylar:** fiş düşüşü 0.38 s yerçekimi + 22 px sekme 0.16 s; buruşturma 11 kare/döngü; itiş 400 px / 0.5 s inOut, gölge 0.08 s önce.
- **Işık geçişleri:** 0.8–1.2 s inOut; flicker kare-kesin (2 kare, %60); pozlama göz kırpması yalnız bölüm geçişinde (%40, 0.3 s); çapa değişiminde
  0.5–0.6 s kayma (sıçrama yok).
- **Sayfa metni (doku):** 15 px gövde, 6–8 cümle — okunacak metin değildir (`data-doku`); okunacak metin ≥ 22 px.

## Kamera hareketleri

| hareket | kullanım | uygulama |
|---|---|---|
| Vinç | açılış, yüksekten masaya iniş | tilt + Z birlikte; ölçek değişimi ≥ %10 yoksa okunmaz |
| Dolly | sürekli ileri/geri | ölçek log-enterpolasyon (`MH.keys.log`), odak doğrusal |
| Push / pull | tek vurgu | Z ±80 + hedefi ekran merkezine kısmen taşıma; kadrajda kalacak öğe kısıt olarak en sonda |
| Bakış | nesneye kısa bakış | x ±40 px, 0.8 s git, 1.2 s tut; netlik nesneye |
| Eğilme | izleyicinin eğilmesi | içerik 30 px yukarı + tilt +2° |
| Tilt | bölüm geçişi | masa tilt +62°, dy +700 |
| Sakin kayış | kâğıt dizisi üzerinden geçiş | masa düzleminde tek eksen; tepe hız tavanı; istasyonda %35'e iner (rampa 0.6–0.8 s); z / tilt / roll yasak |
| Dünya ölçeği dolly | çok büyük dolly | kamera okuma mesafesinde, dünya odak etrafında ölçeklenir |
| Drift | daima altta | `deskDrift(T, k)`; büyük ölçekte ekran pikselinde |

Her bölümün kamerası tek fonksiyondur; hareketler toplanır, kısıtlar en sonda. Ekran hesabı izdüşümle yapılır, tahminle değil.
İtişte ışık çapası sabit: kamera hedefi çapaya taşır, çapa kameranın peşinden koşmaz.

## Geçişler (fade yok)

Rack focus (çıkan 0 → 6–8 px, giren son 0.6–0.7 s netleşir) · fiziksel süpürme (±1400 px + −6/−8°, 0.55–0.6 s, yönlü bulanıklık 8–10 px, gölge önce) ·
alma / düşme (önce gölge kopar) · dikey hareket bulanıklığıyla silinme (giren 0.3 s çakışır) · çizgi köprüsü (çizgi gerçek ekran konumundan yeni yerine) ·
itiş · beklenti ışığı (sonraki havuz %45 → %100, 0.6 s) · masaya serilme (gölge önde, hızlanan stagger) · mürekkep → toz · baskı kafası (belirmez, basılır) ·
kafa takılması (kare-kesin: 1 kare aynı yer + 2 px sarsıntı) · koparma · baskıyı izleme (makine ritmi, inOut yok) · bas-besle-bekle (baskı 0.25 s → besleme
108 px 0.12 s + 2 px aşma + 0.05 s oturma → bekleme; kamera sabit). Opaklık yalnız harekete ya da bulanıklığa eşlik eder.

## Tuzaklar

| # | tuzak | ders | kapsam |
|---|---|---|---|
| d-01 | Her x-import dosyası kendi kapsamında çalışır; başka dosyadaki yardımcıya erişilemez | paylaşılan bileşen `window`'a yazılır; yükleme sırası önemli | çekirdek |
| d-02 | Gizli kâğıt şeridi 3B sıralamada üste çıktı (yazıcı gövdesinin altındaki uç gövdenin üstünde çizildi) | örtüye güvenme, dudak hattından kırp | çekirdek / world |
| d-03 | İkinci ışık parlak havuzda kaybolur (`screen` ile toplanan ışıklardan biri doyunca öbürü görünmez) | iki ışığı birlikte ölç; buluşma havuz kenarında | ilham |
| d-04 | Kare-kesin olay metnin dışına düşer (kafa 81 px/kare) | olayı kare hesabıyla metnin içine koy | çekirdek |
| d-05 | Yerel buruşmada iki katman maske kenarında hayalet yapar | tek katman, maske süzgeçte (`D = 0.5 + (n − 0.5) · m`) | world |
| d-06 | El yazısı fontunda büyük L kelime sonunda "C" okunur; kesme işareti çok küçük | o harfleri el vuruşuyla çiz | world (font) |
| d-07 | Ada ışık: kopuk havuzlar koridor okutmaz | havuzlar büyük ve yumuşak, ortam ≥ %10 | ilham |
| d-08 | Koyu tema ekran görüntüsü multiply ile kâğıda basılınca kâğıdı siyaha boyar | negatif + gri baskı (invert + grayscale + mürekkep tonu screen, kâğıda multiply) | world |
| d-09 | Denendi, terk: masa boyunca bakış + geniş lens, WebGL masa, dik 3B eşya | dünya dilini bozan 3B mekân kurulmaz | world |
| d-10 | Yeni nesneler önceki bölümün son karesinde belirir | kadraj sınırını izdüşümle ölç; yeni kâğıt altta ya da kayışla girer | çekirdek |
| d-11 | Bölüm devrinde öğe kaybolur | ya örtülü ya yeni bölümün kendi öğesi | çekirdek |
| d-12 | Süzgeç yalnız bir bölümün tanım bloğunda tanımlı (kalem ucu) | kullanılan her bölümde tanımla (`DeskDefs` world katmanında) | çekirdek |
| d-13 | Ayna sahnesi (aynı baskının iki yerde görünmesi) elle kopyalanınca kayar | yapı gereği aynı bileşen; araçla doğrula | ilham |
| d-14 | Çıplak masa karanlık eşiğinin altına düşer (%7) | kâğıt kalkınca havuzu güçlendir, sayfa gelince geri al | world |
| d-15 | Örtüşen sayfa ızgarasında çentik | tek adım, sınırlı düzensizlik, iç boşluk 0 (ölçerek) | world |
| d-16 | Eğik masada kadrajın üst kenarındaki metin ~%15 küçük (25 → 20.7 px) | okunurluk için en üstteki okunacak satırı ölç | çekirdek |
| d-17 | Masaya yakın döndürülmüş katman Chromium 3B sıralamasında masanın arkasına düşer | ≥ 6 px yukarı (`translateZ`); kopya tam boy kalsın, yalnız kırpılsın | çekirdek |
| d-18 | Saydam zeminli yalıtılmış grupta `overlay` kendi rengini çizer (masayı karartmak yerine gri boyar) | grubun içine koyu taban koy | çekirdek |
| d-19 | Raf bulanıklığı (1 px) okunacak etiketi düşürür (6.4 → 3.4:1) | okunacak nesneye ≤ 0.5 px | çekirdek |
| t-11 | Gradyanlı 3B eşya 90'lar oyun grafiği gibi okunur | ima et: silüet + doku + gölge + odak | world (ilke çekirdek) |
| t-15 | Pano + disk kapalı hacim vermez | görünmeyen diski koyma | world |
| W-30 | Koyu tema ekran görüntüsü kâğıda basılırsa negatif + gri | bkz. d-08 | world |
| W-31 | Masada görünen havuz: çarpımsal ışık koyu masayı aydınlatmaz | masa düzleminde ayrı havuz katmanı (kendi koyu tabanı + sıcak radyal + doku overlay) | world |
| W-32 | Bütün kâğıdı eğmek izleme bandı hesabını kaydırır | ayrı kıvrık uç (aynı kâğıt iki kırpımla) | world |
| W-33 | Kısa kopya `Paper` ışık gradyanını değiştirir (dikişte ton basamağı) | kopya tam boy, yalnız kırpılır | world |
| W-34 | Screen ışık mürekkebin siyahını kaldırır (okunacak metin 2.4:1'e düştü) | okunacak metin taşıyan kahramanda ışık çarpımsal (`DeskLit` / `MHLit`) | çekirdek |
| W-35 | Kâğıt kadrajı dolduran itiş ortalamayı yükseltir; çıkış sahnenin en parlak anını geçer | havuz itişin ilk karelerinde daralır (≥ 6 karede, r ivmesi < 40 px/kare²), kahraman ışığı itişle çekilir | çekirdek |
| W-36 | Dolly out'ta havuz dünyayla küçülür, kare karanlığa düşer | yarıçapı büyüt; gelecek öğenin ineceği yeri önceden aydınlat | ilham |
| W-37 | Işık "kırığı" hızlı süzülmeyi de yakaladı | kırık = görünür ışıkta ivme sıçraması (> 25 px/kare², r > 40) ya da şiddet basamağı (> 0.03) | çekirdek |

## Varsayılan olmamalı

Koyu masa + amber lamba + el yazısı (Caveat) + tükenmez mavisi + kâğıt dokusu + vinyet 0.35 + koyu grade zinciri bu world'e aittir. Çekirdek
kuralların bir kısmı (ışık arkı, kare-kesin flicker, pozlama kırpması) bu dünyada doğdu ama sayıları yeni projede look-dev'de yeniden ölçülür.

## Paketlenirken çıkarılanlar

- Fotoğraf ve video kökenli masa / kâğıt / yaşlanma dokuları (yerine yordamsal `desk-surface`, `desk-grain`, `desk-fiber`).
- Mühür, bayrak, sertifika plakaları ve gömülü medya; buruşma video dizisi (yöntem ders olarak kaldı: key + tint + kırpım + maskeli mürekkep).
- Ekranlı cam nesnesinin metin etiketi (nesnenin kendisi `screen-dark` örneğinde, ekran nesnesi olarak).
- Sahne / perde motorları, vuruş tabloları, proje kelimeleri ve kırmızı kullanım listesi.
