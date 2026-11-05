# PATTERNS — anlatım kalıbı kartları (K-01 … K-57)

> **Statü: ilham / uyarı — okunur, kopyalanmaz.**
> - Kalıp bir **karar kalıbıdır, şablon değildir**. Sahnede kullanılırken önce world'ün kuralları ve SERT kurallar gelir; "Kısıt" satırı uyarlamayı söyler.
> - Yeni bir projede kalıbı kullanmak, world'de **K-yeni** (RULES YR-7) olarak yeniden kurmak ve **kendi A/B'sini** yapmak demektir. Buradaki A/B sonuçları kaynak projenin dünyasında alındı; yeni dünyada kanıt sayılmaz, uyarı sayılır.
> - Yeni kalıp önce world'e (`world/lessons.md` / `world/world.json → motion.patterns`) **K-yeni** olarak girer. Core'a ancak `/motion:promote` ile, A/B kanıtıyla taşınır.
> - Önceki projenin görünüşünü taklit etmek UCUZ #11'dir.
>
> **Kaynak ve lisans:** 54 kalıp, lisanslı 13 referans videonun (yalnız öğrenme amaçlı) çözümlemesinden **karar ve ölçü** olarak çıkarıldı. Hiçbir kare, varlık ya da metin filme girmez; referans dosyaları pakette yoktur. Kaynak projenin sahne/marka eşlemeleri ("çeviri" satırları) ve bileşen adları çıkarıldı.

## Okuma

**A/B durumu** (kaynak projede, kullanıcı kararı):

| durum | anlam |
|---|---|
| **kabul** | A/B kanıtı kabul edildi, filme girdi (kartta koşulu var) |
| **revize** | A/B'de kısmen tuttu; kartın notuyla yeniden kuruldu |
| **ret** | denendi, kazanç ölçülemedi; kütüphanede durur, silinmez |
| **çıkarıldı** | hedef sahneden çıkarıldı (maliyet/getiri); başka hedefte yeniden denenebilir |
| **demo** | birim demosu var, A/B yok; kanıt değil |
| **kural** | kaynak projede kurala dönüştü (RULES'ta karşılığı var); A/B gerekmedi |
| **ilke** | yönetmen kararı (kompozisyon/ritim); kod ve A/B gerekmez |
| **A/B yok** | yalnız çözümleme; hiç denenmedi |

**Grup · sıklık:** kalıbın grubu ve görüldüğü video/shot sayısı (13 video içinde). Sıklık, kalıbın referanslarda ne kadar yerleşik olduğunu söyler; kalitesini söylemez.

**Sayılar** referansta ölçüldü (480p–1080p, 24–30 fps). Kare sayıları **saniyeye çevrilerek** kullanılır (D1-03: eşikler saniye + fps). "Varsayılan" etiketli sayılar kaynak projenin bileşen sabitleridir.

## A/B süreci (kalıbı sahneye sokmak)

1. **İddia tek cümle**dir ve ölçülecek kare bellidir. [ÖRNEK] "ışık önce gelir; boş siyah > %70 kare sayısı 33 → ≤ 3".
2. **Birim demo kanıt değildir.** Kanıt, gerçek sahne penceresinde **A/B çatalıdır**.
3. Çatal sahne dosyasına dokunmaz, **tek değişkeni** değiştirir. Her kimliğin `-A` ikizi vardır.
4. **Pencere dışı fark 0'dır** (`imgdiff`).
5. Rapor satırı: `kalıp | sahne · pencere | iddia | ölçüm A → B | yönetmen notu (+ / − / risk) | öneri (kabul / revize / ret)`.
6. Karar kullanıcınındır. **Ret** kütüphanede kalır, silinmez. **Revize** kartın notuyla yeniden A/B'ye gider.
7. Kalıp dünyaya göre **varyant** ister (ör. K-12). Kalıbın sayıları kartta (world'de `motion.patterns`) durur, sahne koduna gömülmez.
8. **Seçim:** yönetmen her vuruşta seçim tablosundan 2–3 kalıp görür ve birini gerekçeyle seçer. Kütüphane dışı fikir serbesttir; "kütüphane dışı" diye işaretlenir.
9. **Hangi kalıp önce kodlanır:** puan = sıklık (video) × uygulanabilirlik (1–3) × motorda eksik (yok 3 · kısmen 2 · var 1) × demo maliyeti (ucuz 3 · pahalı 1).

## Seçim tablosu (anlatım işi → kalıp)

| iş | kalıplar |
|---|---|
| açılış | K-24 ışıkla açılış (kabul) · K-01 varışta geri çekilme (ret) · K-14 noktadan açılan pencere |
| shot sınırı (kesmesiz) | K-57 seyahat hamlesi (kural) · K-55 kadrajı örten süpürme (kural) · K-56 kalın kâğıt katlama (demo) · K-06 hızda kesme |
| keşif | K-02 bağlamdan kanıta itiş · K-03 ucu takip et (revize) · K-27 bölge aydınlatma |
| düşüş / kayıp | K-29 fırlatılan nesne (revize) · K-28 ışıyan büyüme · K-51 olay sonrası iz tutuşu |
| ret | K-11 örten silme · K-19 kelime değişimi (rack) · K-49 kâğıt buruşturma |
| vurgu / vuruş | K-31 çarparak oturma (kabul) · K-08 ışık darbesiyle kesme (kabul) · K-43 işaret ve bağlantı çizgisi |
| nefes | K-51 iz tutuşu · K-37 büyük boşlukta küçük figür · K-54 sakin eylem döngüsü |
| kaos | K-52 sabit çapa, hızlı değişim (demo) · K-17 harf karıştırma · K-05 roll köprüsü |
| dönüş / çözüm | K-53 birikimle açığa çıkan şekil · K-24 ışığın geri dönüşü · K-45 geri çağırma |
| kapanış | K-45 geri çağırma (son = ilk) · K-22 uzayan etiket (kabul) · K-09 odak kaçırma çıkışı |

## Kaynak projenin A/B kararları (özet)

| kalıp | durum | koşul / uyarı |
|---|---|---|
| K-24 ışıkla açılış | kabul | filme girişte siyah ≤ 3 kare |
| K-22 uzayan etiket | kabul | r2: hap veri çizgisinin ucundan 16 px, çizgiler önde. Uyarı: r1'de hap veri çizgisini örttü |
| K-31 çarparak oturma | kabul | display ≥ 72 px; sarsıntı yalnız o katmanda 2.5 px, kadraj ≤ 1 px. Küçük etikette **revize**: 20 px etikette görünmez |
| K-08 ışık darbesiyle kesme | kabul | yalnız ADR'li tek geçiş; sızıntı rengi varış dünyasının ışığı. Uyarı: çıkan sahne kendi siyah kapanışını yaparsa flaş olur, kesme olmaz |
| K-29 fırlatılan nesne | revize | alçak yay, ağır, dönmesiz; uçuş 0.3 s. Uyarı: aynı sahnedeki başka düşüşlerle aynı dilde ayrı olay okunmaz; dönen büyük rakam 5 kare okunmaz |
| K-12 açan cephe | revize | world'e göre iki varyant (kâğıt: yırtık/yanık · ekran: tarama/şerit), çerçeveyle sınırlı, ≤ 2 geçiş. Uyarı: malzeme kenarı başka dünyaya ait değil; yüzeyi dondurmak kapanış nefesini öldürür; "sahne sonu siyah" kuralıyla çakışır → kurgu istisnası kaydı |
| K-03 ucu takip et | revize | itiş ×1.2 (×1.35 değil), perde başına tek durak. Uyarı: yüzey kadrajı doldurunca bant sıçrar (%32 → %46); genel resim kaybolur |
| K-01 varışta geri çekilme | ret | kazanç ölçülemedi; keskinlik 3 kare gecikti. Uyarı: "fade yok" düzeltmesi sanılabilir ama fade dedektörünü örter; kısa slotta okunma süresini yer |
| K-15 kelime sandviçi | çıkarıldı | luma matı yetmedi; elle mat ≈ 1.5–2 sa. Uyarı: ön nesne ayrı katman olmadan kahraman kontrastı 15–29 puan düşer; otomatik bölütleme dış model kuralına takılır |
| K-52 sabit çapa | demo | A/B yok; tipografik profil (bant %6–14, display ≥ 72 px) |

---

## Kamera

#### K-01 · Varışta geri çekilme
- **Grup · sıklık:** kamera · 3 video / 9 shot
- **Niyet:** "hikâye başlıyor": konu ilk karelerde netleşerek yerine oturur, göz ortada kilitlenir.
- **Mekanik:** sahne büyük ve bulanık gelir; ölçek ve bulanıklık birlikte iner (ease-out).
- **Sayılar:** ölçek 1.10–1.15 → 1, bulanıklık 6 → 0 px, 0.4–0.6 s. Ölçülen ölçek hızı −%14…−%29/s. Varsayılan: 0.5 s, ölçek 1.12, bulanıklık 6 px.
- **Kısıt:** opaklık yalnız ölçek/bulanıklığa eşlik eder (GÇ-1). Drift ardından sürer.
- **Risk:** her shot'ta kullanılırsa tik olur; sahne başına bir kez.
- **A/B durumu:** **ret**. Kazanç ölçülemedi, keskinlik 3 kare gecikti; fade dedektörünü örtme riski var.

#### K-02 · Bağlamdan kanıta itiş
- **Grup · sıklık:** kamera · 2 video / 2 shot
- **Niyet:** önce bağlam (manşet, harita), sonra kanıt (fotoğraf, satır). Okuma sırasını kamera kurar.
- **Mekanik:** geniş plan tutulur, sonra kamera tek hedefe iter; hedefte yavaş kayma sürer.
- **Sayılar:** bağlam 1.5–2 s + itiş ≈ 2 s, ease-in-out. Dünyadan bölgeye ≈ 4 s.
- **Kısıt:** itiş tek vurgudur; kadraj kısıtı en sonda uygulanır.
- **Risk:** tekrar şablonuna dönerse monotonlaşır.
- **A/B durumu:** A/B yok.

#### K-03 · Ucu takip et
- **Grup · sıklık:** kamera · 4 video / 7 shot
- **Niyet:** yolculuk ve bağlantı. Çizgi/ok/nesne önde, kamera arkada; geçilen yol iz olarak kalır.
- **Mekanik:** çizgi ucu ya da nesne ilerler, kamera ona gecikmeli kilitlenir; durakta vuruş.
- **Sayılar:** kamera gecikmesi 0.1–0.2 s; tepe ≈ 11 px/kare (480p); durak arası 0.6–1 s. Varsayılan: gecikme 0.15 s, parça 0.45 s, bekleme 0.2 s, tutuş 0.42 s.
- **Kısıt:** ışık/kamera çapası sıçramaz, 0.5–0.6 s'de süzülür. Önce mesafe bütçesi: yol ≤ hız × süre − rampa kayıpları.
- **Risk:** kamera hızı çizgiyi geçerse ölçek kayar. Yüzey kadrajı doldurursa bant sıçrar.
- **A/B durumu:** **revize**. İtiş yalnız durakta ×1.2, perde başına tek durak.

#### K-04 · 2.5D katman parallax'ı
- **Grup · sıklık:** kamera · 4 video / 5 shot
- **Niyet:** derinlik: ön plan nesnesi ya da fotoğraf katmanları farklı hızda kayar.
- **Mekanik:** bulanık ön plan hızlı, arka plan yavaş kayar. Fotoğrafta kalabalık katmanları ayrı z'dedir.
- **Sayılar:** ön/arka hız oranı 2–4×; ön plan bulanıklığı 4–8 px.
- **Kısıt:** drift ile toplanır. Kadraj kenarı açılmaz (kapsama ölçeği).
- **Risk:** ön plan kahramanı örterse okunurluk düşer. Ön plan örtmesi ≤ %5, metin üstünde 0 (ÖRT-1).
- **A/B durumu:** A/B yok.

#### K-05 · Roll köprüsü
- **Grup · sıklık:** kamera · 1 video / 2 shot
- **Niyet:** kaos ya da devrilme: kadraj döner, yeni sahne dönerek oturur.
- **Mekanik:** çıkan shot roll ile döner; giren aynı yönde overshoot'la oturur.
- **Sayılar:** 0.7 s; giren ease-out + overshoot.
- **Kısıt:** sakin kamera dilinin istisnasıdır; bölümde bir kez.
- **Risk:** film dilinde yabancı kalır.
- **A/B durumu:** A/B yok (istisna kalıbı).

## Geçiş

#### K-06 · Hızda kesme
- **Grup · sıklık:** geçiş · 3 video / 8 shot
- **Niyet:** kesmeyi görünmez yapmak: iki shot tek ivmeyle bağlanır.
- **Mekanik:** çıkan shot ease-in hızlanır, kesme hız tepesine düşer, giren aynı yönde ease-out yavaşlar.
- **Sayılar:** tepe 11–16 px/kare @480p ≈ 330–480 px/s; yön sürekliliği şart. Bir referansta 10 kesmenin 5'i.
- **Kısıt:** fade'siz geçişin ilk tercihi.
- **Risk:** yön sürekliliği bozulursa sıçrama okunur.
- **A/B durumu:** **kural** (geçiş repertuvarında).

#### K-07 · Taşıyıcı öğe
- **Grup · sıklık:** geçiş · 2 video / 4 shot
- **Niyet:** "tek nefes": geçişi süpüren öğe sonraki shot'ta kalır, iki sahneyi bağlar.
- **Mekanik:** bir öğe (kurdele, başlık, çizgi) geçişi taşır ve yeni sahnede yerini alır.
- **Sayılar:** süpürme 0.5–0.7 s; öğe en az 1 vuruş yeni sahnede kalır.
- **Kısıt:** öğe aksan renginde ise aksan kotasından sayılır (AK-3).
- **Risk:** her geçişte kullanılırsa iple bağlanmış slayt gösterisi gibi görünür.
- **A/B durumu:** **kural** (geçiş repertuvarında).

#### K-08 · Işık darbesiyle kesme
- **Grup · sıklık:** geçiş · 5 video / 10 shot
- **Niyet:** vuruş ve kesme aynı anda: ışık darbesi kesmeyi örter ya da darbeyi işaretler.
- **Mekanik:** 2–3 kare ışık sızıntısı/parlama ya da 1–2 kare darbe karesi; kesme tepe karede.
- **Sayılar:** sızıntı 6–10 kare, yatay kayar; darbe 1 kare + 1 kare ters. Varsayılan: 2 kare, tepe 0.6, eklemeli karışım, sıcak ışık.
- **Kısıt:** pozlama kırpışı %40 / 0.3 s, flicker 2 kare %60. Negatif kare yok. Manifest `cut: "light"` (ADR-021).
- **Risk:** sık kullanılırsa nabız gibi tekrarlar; sahne içinde kullanılmaz.
- **A/B durumu:** **kabul**. Yalnız ADR'li tek geçiş, sızıntı rengi varış dünyasının ışığı. Uyarı: çıkan sahne kendi siyahına inerse flaş olur.

#### K-09 · Odak kaçırma çıkışı
- **Grup · sıklık:** geçiş · 3 video / 9 shot
- **Niyet:** yumuşak devir: çıkan dağılır, giren netleşir.
- **Mekanik:** çıkan shot rack-blur ile dağılır; sonraki bulanıktan nete gelir; kesme bulanıklıkta.
- **Sayılar:** bulanıklık 0 → 6–8 px; giren 0.6–0.7 s'de netleşir.
- **Kısıt:** opaklık bulanıklığa eşlik eder.
- **Risk:** her geçişte rack uyuşukluk verir.
- **A/B durumu:** A/B yok (geçiş repertuvarında var).

#### K-10 · Çerçeveden geçiş
- **Grup · sıklık:** geçiş · 2 video / 6 shot
- **Niyet:** "içeri giriyoruz": kamera bir çerçevenin/katmanın içinden geçip yeni dekora çıkar.
- **Mekanik:** kamera çerçeveye (portre, perde aralığı, duman) iter; çerçeve kadrajı doldurur; altında kesme; yeni sahne çerçevenin içinden açılır.
- **Sayılar:** itiş 0.5–0.8 s ease-in; katman kadrajı doldurduğu an kesme; giren ease-out.
- **Kısıt:** yalnız perde/sahne geçişinde. Tam beyaz yok (≤ %40).
- **Risk:** dalış hızı yüksekse baş döndürür.
- **A/B durumu:** A/B yok.

#### K-11 · Örten silme (karalama)
- **Grup · sıklık:** geçiş · 1 video / 4 shot
- **Niyet:** ret ve öfke: anlatıcının eli kadrajı karalayıp kapatır.
- **Mekanik:** tebeşir/mürekkep karalaması 2–4 karede kadrajı örter, altında kesme olur. Hafif hâli: tek çizgiyle üstünü çizme.
- **Sayılar:** 2–4 kare; kuru fırça dokusu, kenar kırık. Tek çizgi ≈ 0.3 s, basınçlı.
- **Kısıt:** fiziksel silme, fade değil. Silen alet kadraj dışından gelir, işi bitince çıkar.
- **Risk:** çok sert olursa komik kaçar.
- **A/B durumu:** A/B yok. Kaynak projenin ikinci dünyasında A/B'siz kullanıldı; yeni projede A/B gerekir.

#### K-12 · Açan cephe (yırtık, yanık, fırça, şerit)
- **Grup · sıklık:** geçiş · 3 video / 8 shot
- **Niyet:** yeni yüzey malzemeyle açılır: geçişin kendisi bir olay.
- **Mekanik:** bir cephe (yırtık kenar, kor çizgisi, fırça darbesi, ortadan açılan şerit) kadrajı geçer; arkasında yeni içerik.
- **Sayılar:** 0.4–0.6 s, soldan sağa. Kor kenarda tek sıcak ışık parıltısı. Varsayılan: 0.5 s, kenar 26, girinti 14, adım 12.
- **Kısıt:** cephe hareket eden nesnedir; ton değişimi tek başına yetmez. Sahne başına ≤ 2.
- **Risk:** malzeme dünyaya uymazsa yapıştırılmış efekt gibi durur. "Sahne sonu siyah" kuralıyla çakışır → kurgu istisnası kaydı.
- **A/B durumu:** **revize**. Dünya başına varyant (kâğıt: yırtık/yanık · ekran: tarama/şerit), çerçeveyle sınırlı, ≤ 2 geçiş.

#### K-13 · Eşleşme kesmesi
- **Grup · sıklık:** geçiş · 1 video / 2 shot
- **Niyet:** ikilik ve karşıtlık sözsüz kurulur.
- **Mekanik:** aynı kompozisyon karşıt içerikle tekrar eder; kesme konumu korur.
- **Sayılar:** kompozisyon ve kamera birebir aynı; yalnız içerik değişir.
- **Kısıt:** birebirlik araçla doğrulanır (aynı bileşen, aynı kamera).
- **Risk:** izleyici eşleşmeyi görmezse boşa gider.
- **A/B durumu:** **ilke**.

#### K-14 · Noktadan açılan pencere
- **Grup · sıklık:** geçiş · 1 video / 1 shot
- **Niyet:** karanlıktan yeni bölüm: kendinden ışıklı küçük yüzeyler açılır.
- **Mekanik:** siyahta nokta → yatay çizgi → dikdörtgen; birden çok pencere.
- **Sayılar:** ≈ 0.4 s. Tüp ekran açılışı: çizgi 2 kare + açılış 3 kare + 1 kare %140 parlama.
- **Kısıt:** karanlık ≤ 0.5 s (KD-8).
- **Risk:** ekran dünyasına özgüdür; başka dünyada yabancı kalır.
- **A/B durumu:** A/B yok (world: screen-dark'ta bileşen olarak vardı).

## Tipografi

#### K-15 · Kelime sandviçi
- **Grup · sıklık:** tipografi · 4 video / 13 shot
- **Niyet:** kelime ile özne tek poster: kavram konunun arkasında durur.
- **Mekanik:** dev kelime zemin ile kesik konu arasındadır; kelime girer, konu önde kalır.
- **Sayılar:** kelime yüksekliği kadrajın %9–18'i; giriş ölçek + rack 0.3–0.5 s. Varsayılan: 0.45 s, ölçek 1.06, bulanıklık 6 px.
- **Kısıt:** ekrana yazılacak metin projenin metin kuralına tabidir. Kontrast ≥ 4.5:1.
- **Risk:** konu kelimeyi çok örterse okunmaz. Ön nesne ayrı katman (elle mat ya da ayrık plaka) gerektirir.
- **A/B durumu:** **çıkarıldı**. Luma matı yetmedi, elle mat ≈ 1.5–2 sa; kontrast 15–29 puan düştü.

#### K-16 · İki katlı başlık
- **Grup · sıklık:** tipografi · 3 video / 12 shot
- **Niyet:** hiyerarşi sesin yerine geçer: küçük etiket bağlam, dev kelime vurgu.
- **Mekanik:** geniş aralıklı küçük etiket + dev ağır kelime; sırayla, etiket önce.
- **Sayılar:** boy oranı 1:2 – 1:5; etiket tracking geniş; vuruş 0.2–0.6 s.
- **Kısıt:** metin kuralı (projede).
- **Risk:** —
- **A/B durumu:** A/B yok.

#### K-17 · Harf karıştırma
- **Grup · sıklık:** tipografi · 4 video / 9 shot
- **Niyet:** bilgi "çözülerek" gelir; haber/sinyal hissi.
- **Mekanik:** harfler rastgele sırayla, her harf kendi karesinde belirir; bazen yanlış karakter → doğru.
- **Sayılar:** kelime başına 0.3–0.5 s; harf aralığı 1–2 kare; sıra tohumlu `rnd` ile sabit.
- **Kısıt:** belirme pop sayılır; ölçek eşlik eder (K8: hiçbir öğe tek karede durum değiştirmez).
- **Risk:** glif tutarlılığı (Türkçe karakterler); QC glif kontrolü şart.
- **A/B durumu:** A/B yok.

#### K-18 · Yazılarak gelme (daktilo, kalem, terminal)
- **Grup · sıklık:** tipografi · 2 video / 7 shot
- **Niyet:** kayıt ve tanıklık: metin/değer izleyicinin önünde yazılır.
- **Mekanik:** harf harf (daktilo/terminal) ya da kalem ucu rakamı çizer; imleç/uç izler.
- **Sayılar:** daktilo 0.05–0.06 s/harf; kalem rakam başına ≈ 0.25 s. El yazısında zaman yola orantılıdır, glif başına eşit dilim değil. Yazım hızı ≤ 12 glif/s (KM-12).
- **Kısıt:** metin kuralı; kısaltma yok. Etiket satırları da yazılarak gelir.
- **Risk:** uzun metinde yavaş kalır; ≤ 2 satır.
- **A/B durumu:** A/B yok.

#### K-19 · Kelime değişimi (rack)
- **Grup · sıklık:** tipografi · 1 video / 1 shot
- **Niyet:** karşıtlık/dönüşüm: ilk kelime sabit, ikinci kelime yer değiştirir.
- **Mekanik:** ikinci kelime bulanıklaşır; yenisi aynı yerde netleşir; birinci kelime sabit kalır.
- **Sayılar:** 0.3–0.4 s; bulanıklık 0 → 6 → 0 px; ölçek 0.98 ↔ 1.
- **Kısıt:** opaklık bulanıklığa eşlik eder. İki kelime aynı kadrajda olmalı.
- **Risk:** —
- **A/B durumu:** A/B yok. Kaynak projenin ikinci dünyasında A/B'siz kullanıldı.

#### K-20 · Hayalet kabartma yazı
- **Grup · sıklık:** tipografi · 2 video / 2 shot
- **Niyet:** dönüm kelimesi ya da sayı arkada sessizce yankılanır.
- **Mekanik:** dev kontur (ya da kabartma) kelime düşük kontrastla arkadadır; önde küçük metin; yavaş yatay kayma.
- **Sayılar:** çevreyle kontrast ≤ 1.5:1; yükseklik kadrajın %25–40'ı; kayma 10–20 px/s.
- **Kısıt:** doku metni olarak işaretlenir (`data-doku`); okunacak metin sayılmaz.
- **Risk:** bant ve boş siyah ölçümünü etkiler.
- **A/B durumu:** A/B yok.

#### K-21 · Gölge düzleminde metin
- **Grup · sıklık:** tipografi · 1 video / 1 shot
- **Niyet:** metin sahnenin parçasıdır: ışığın attığı gölgeye yazılır.
- **Mekanik:** kelime nesne gölgesi doğrultusunda, zemin perspektifinde durur.
- **Sayılar:** perspektif açısı = gölge açısı.
- **Kısıt:** ışık mantığı tutarlı olmalı (tek anahtar ışık).
- **Risk:** okunurluk düşük, pahalı.
- **A/B durumu:** A/B yok.

#### K-22 · Uzayan etiket (hap, çizgili)
- **Grup · sıklık:** tipografi · 2 video / 4 shot
- **Niyet:** künye ve işaret: bilgi hedefe bağlı bir etiketle gelir.
- **Mekanik:**
  - Hap: kapsül noktadan yatay uzar, içine yazılır, kapanışta ters sırayla kapanır.
  - Çizgili: ince çizgi hedeften dışarı uzar, ucunda kutu açılır, metin yazılır.
- **Sayılar:** uzama ≈ 0.2–0.3 s ease-out; yazım 0.05 s/harf. Varsayılan: uzama 0.25 s, çizgi 0.2 s, kutu 0.15 s, 20 harf/s, kapanış 0.3 s.
- **Kısıt:** ince çizgi; metin kuralı; okunacak boy ≥ 22 px.
- **Risk:** hap veri çizgisini örtebilir (r1'de oldu).
- **A/B durumu:** **kabul**. Hap veri çizgisinin ucundan 16 px uzakta, çizgiler önde.

#### K-23 · Sarılan şerit
- **Grup · sıklık:** tipografi · 1 video / 1 shot
- **Niyet:** cümle bedene sarılır (etiketlenme, damgalanma).
- **Mekanik:** 3B şerit figürün önünden kıvrılarak akar, üstünde cümle.
- **Sayılar:** akış 0.8–1 s.
- **Kısıt:** yalnız künye/etiket metni.
- **Risk:** pahalı; dünya dışı görünebilir.
- **A/B durumu:** A/B yok.

## Işık

#### K-24 · Işıkla açılış
- **Grup · sıklık:** ışık · 4 video / 5 shot
- **Niyet:** "sahne bu": ışık önce gelir, nesne ve metin ışığın içinde belirir.
- **Mekanik:** karanlık kare; huzme/havuz açılır (ya da patlamadan oturur); nesne ışıkta belirir. Dönüş biçimi: ışık titreyerek geri yanar.
- **Sayılar:** açılış 2–6 kare (huzme) ya da 0.3 s patlama → oturma; titreme 2 kare %60. Varsayılan: açılış 5/30 s, havuz r0 0.4, öncü 0.12 s, taban 0.12, tepe 1.15, oturma 0.3 s.
- **Kısıt:**
  - Işık nesneden önce varır. Karanlık ≤ 0.5 s (KD-8).
  - **Şiddet ve havuz birlikte büyürse fade dedektörü fade sayar** → şiddet 2 karede, havuz merkezden genişler.
- **Risk:** karanlık uzarsa QC HATA verir.
- **A/B durumu:** **kabul**. Filme girişte siyah ≤ 3 kare.

#### K-25 · Lamba havuzu kadrajı
- **Grup · sıklık:** ışık · 3 video / 9 shot
- **Niyet:** sahneyi ışık çerçeveler; göz havuzdadır.
- **Mekanik:** oval havuz kompozisyonu çerçeveler, köşeler koyu kalır, kesmeler boyunca sabit.
- **Sayılar:** havuz kadrajın %50–70'i; köşe ≤ %20 luma.
- **Kısıt:** havuz görünür hedefe göre ölçülerek seçilir. Havuzlar büyük ve yumuşak olur; ortam ışığı ≥ %10. Kopuk havuzlar koridor okutmaz.
- **Risk:** dolly-out'ta havuz küçülür, kare karanlığa düşer → yarıçap büyütülür.
- **A/B durumu:** A/B yok (world: desk-paper'da temel dil).

#### K-26 · Pencere gölgesi (gobo)
- **Grup · sıklık:** ışık · 2 video / 7 shot
- **Niyet:** mekân ve zaman: aynı pencere gölgesi kesmeler boyunca sürer.
- **Mekanik:** anahtar ışık pencere çerçevesinden geçer; çapraz gölge deseni yüzeyde sabit kalır.
- **Sayılar:** 2–3 çapraz çubuk, yumuşak kenar; gölge %20–35 koyu.
- **Kısıt:** tek anahtar ışık korunur; desen ışığın parçasıdır.
- **Risk:** veri/metin üstüne düşerse okunurluk düşer.
- **A/B durumu:** A/B yok.

#### K-27 · Bölge aydınlatma
- **Grup · sıklık:** ışık · 1 video / 1 shot
- **Niyet:** dikkat: odak bölgesi ışır, geri kalan karanlıkta kalır.
- **Mekanik:** odak bölgesi kendinden ışır (sınır + iç doku); kamera bölgeye iter.
- **Sayılar:** bölge 1–1.5 s'de aydınlanır; çevre ≤ %40.
- **Kısıt:** ışık = dikkat. Kendinden ışıklı yüz ışık düşümünün **üstünde** çizilir, yoksa kararır.
- **Risk:** —
- **A/B durumu:** A/B yok.

#### K-28 · Işıyan büyüme
- **Grup · sıklık:** ışık · 1 video / 1 shot
- **Niyet:** görünmeyeni (kaygı, düşünce) görünür kılmak: karanlıkta ışık büyür.
- **Mekanik:** oda kararır; figürden kendinden ışıklı dallar/çizgiler büyür, titreşerek tutar.
- **Sayılar:** büyüme ≈ 1 s, tutuş 2–3 s; oda luma ≈ %12.
- **Kısıt:** ışık üst katmanda çizilir; karanlık kuralı (KD-8) geçerli.
- **Risk:** —
- **A/B durumu:** A/B yok.

## Hareket / easing

#### K-29 · Fırlatılan nesne girişi
- **Grup · sıklık:** hareket · 3 video / 10 shot
- **Niyet:** nesne fiziksel olarak gelir; ağırlık ve hız.
- **Mekanik:** nesne kadraj dışından hareket bulanıklığı + dönmeyle gelir, sekmeyle oturur; gölge önce.
- **Sayılar:** giriş ≈ 0.2 s, tepe ≈ 300 px/s; dönme 10–25°; 1 sekme (%8–10). Varsayılan: 0.22 s, dönme 18°, sekme 0.09, oturma 0.16 s.
- **Kısıt:** alma/düşme dili: önce gölge kopar, yerçekimi, tek sekme. Görünür nesne hızı ≤ world tavanı (KM-10).
- **Risk:** aynı sahnedeki başka düşüşlerle aynı dilde ise ayrı olay okunmaz. Dönen büyük rakam 5 kare okunmaz.
- **A/B durumu:** **revize**. Alçak yay, ağır, dönmesiz; uçuş 0.3 s; tek darbeyle oturma.

#### K-30 · Pop ve oturma
- **Grup · sıklık:** hareket · 2 video / 2 shot
- **Niyet:** veri/etiket belirir ve yerine yerleşir.
- **Mekanik:** öğe küçükten overshoot'la büyür, hafif dönmeyle oturur; parlaklık tepeden yerine iner.
- **Sayılar:** ölçek 0.6 → 1, 0.24 s; parlaklık oturması ≈ 0.5 s.
- **Kısıt:** opaklık ölçeğe eşlik eder. **Pop'un ilk karesi okunacak metin sayılır** → giriş boyunca `data-doku`.
- **Risk:** —
- **A/B durumu:** A/B yok.

#### K-31 · Çarparak oturma (manşet, damga)
- **Grup · sıklık:** hareket · 3 video / 4 shot
- **Niyet:** vurgu ve onay: başlık/damga yüzeye çarpar.
- **Mekanik:** öğe büyük ve bulanık girer, 3–4 karede ölçekle yüzeye oturur; çarpmada darbe.
- **Sayılar:** ölçek 1.6 → 1, 3–4 kare, hareket bulanıklığı. Varsayılan: 4 kare, bulanıklık 8 px, sarsıntı 2.5 px (yalnız o katman), mürekkep oturması 0.4.
- **Kısıt:**
  - **Basamak 0** (BAS-1): darbe kamerada değil, nesnede (ölçek, mürekkep oturması). Kadraj ≤ 1 px.
  - Aksan renkli damga aksan kotasından sayılır.
  - Fade yerine ölçek/bulanıklık kullanılır; opaklık rampası hatasını da kaldırır.
- **Risk:** küçük etikette görünmez (20 px).
- **A/B durumu:** **kabul**. Display ≥ 72 px; sarsıntı yalnız o katmanda, kadraj ≤ 1 px. Küçük etikette revize.

#### K-32 · Sönümlü sallanma
- **Grup · sıklık:** hareket · 2 video / 3 shot
- **Niyet:** asılı nesne yaşar; dekora fizik gelir.
- **Mekanik:** iple sarkan nesne iner ve sönümlü sallanır.
- **Sayılar:** iniş 0.3–0.5 s; 2–3 salınım, periyot 0.8–1.2 s, genlik 6–10° → 0.
- **Kısıt:** vuruşta başlar (kamera ve dekor sakinliği).
- **Risk:** sürekli sallanma dikkat dağıtır.
- **A/B durumu:** A/B yok.

#### K-33 · Maskeden yükselme
- **Grup · sıklık:** hareket · 1 video / 3 shot
- **Niyet:** "birini tanıtacağım": boş kart önce, içerik sonra.
- **Mekanik:** boş kart gölgesiyle gelir; içerik kartın içinde alttan yükselir (maske).
- **Sayılar:** kart 0.2 s; içerik 0.3 s overshoot; arada 0.1–0.2 s.
- **Kısıt:** maske izole grup kurar; karışım modu maskeli kabın kendisine verilir.
- **Risk:** —
- **A/B durumu:** A/B yok.

#### K-34 · Y-dönmeyle açılan yüzey (kart, kapak, sayfa)
- **Grup · sıklık:** hareket · 2 video / 3 shot
- **Niyet:** açılan yüzey yeni bilgidir; sayfa çevirme sayaç olur.
- **Mekanik:** düz yüzey Y ekseninde döner (kart açılır, kapak kalkar, sayfa çevrilir); sayaçta her sayfada değer artar.
- **Sayılar:** kart ≈ 3 kare; kapak ≈ 0.3 s; sayaç 3 karede bir sayfa; basamak aralığı 0.45 s; perspektif ≈ 2200.
- **Kısıt:** fade yerine dönme. Dönen kart düz katmanla aynı 3B bağlamdaysa kesişir → arka katman bağlam dışında.
- **Risk:** perspektif ölçek telafisi gerekir.
- **A/B durumu:** A/B yok.

#### K-35 · Basamaklı zaman
- **Grup · sıklık:** hareket · 2 video / 2 shot
- **Niyet:** el yapımı, tedirgin ya da rahat his.
- **Mekanik:** çizim katmanında pozlar 2–3 kare tutulur (10–12 fps); çizgi kaynar; kamera ve ışık sürekli kalır.
- **Sayılar:** katman zamanı 10–12 fps'e nicemlenir; kaynama 2 kare.
- **Kısıt:** görüntü `T`'nin saf fonksiyonu kalır; nicemleme `T` üzerinde yapılır.
- **Risk:** fade/K8 dedektörü basamakları değişim sayabilir → kayıtlı istisna.
- **A/B durumu:** A/B yok.

## Kompozisyon

#### K-36 · Gri dünya, tek aksan
- **Grup · sıklık:** kompozisyon · 1 video / 3 shot
- **Niyet:** tek veri: göz başka yere gidemez.
- **Mekanik:** dünya doygunluksuz; aksan rengi yalnız kahraman veride.
- **Sayılar:** aksan paletin ≈ %3'ü.
- **Kısıt:** aksan kotası (AK-3). Büyük bir logo tek aksanı sulandırır → vuruşun ±2 s çevresinde logo küçük ya da kadraj dışında.
- **Risk:** —
- **A/B durumu:** **kural** ("tek vurgu rengi").

#### K-37 · Büyük boşlukta küçük figür
- **Grup · sıklık:** kompozisyon · 1 video / 1 shot
- **Niyet:** yalnızlık, ölçek, sorunun büyüklüğü.
- **Mekanik:** figür kadraj yüksekliğinin ≈ %10'u; geniş karanlık alan; çok yavaş itiş.
- **Sayılar:** 3 s tutuş; itiş ≤ 2 px/kare.
- **Kısıt:** kahraman kuralının (K1) istisnasıdır → `review.kadraj` kaydı. Karanlık kuralı geçerli.
- **Risk:** QC kadraj uyarısı.
- **A/B durumu:** **ilke**.

#### K-38 · Kuşbakışı masa
- **Grup · sıklık:** kompozisyon · 2 video / 7 shot
- **Niyet:** masa sahnenin kendisidir; nesneler bırakılır.
- **Mekanik:** kuşbakışı düz yerleşim; nesneler masaya konur, kâğıtlar üst üste.
- **Sayılar:** —
- **Kısıt:** ön plan nesnesi yerde yatar, temas gölgesi var, kahraman/metni örtmez.
- **Risk:** —
- **A/B durumu:** A/B yok (world: desk-paper'da temel dil).

#### K-39 · Sabit sahneye giren el
- **Grup · sıklık:** kompozisyon · 3 video / 3 shot
- **Niyet:** sahne sabit, eylem gelir: kişi göstermeden karakter.
- **Mekanik:** sahne ve ışık havuzu sabit; el (ya da alet) kadraj dışından girer, işini yapar, çıkar.
- **Sayılar:** giriş ≈ 0.2–0.5 s; tekrar aralığı 1–1.3 s.
- **Kısıt:** gerçek kişi yok. Alet yalnız işi varken kadrajda; tutuşta kadrajda alet yok; görünür hız ≤ world tavanı.
- **Risk:** el çizimi pahalıdır. Gölge ucu kadraja düşebilir; denetim gölgeyi de kapsar.
- **A/B durumu:** A/B yok.

#### K-40 · Işınsal dizilim
- **Grup · sıklık:** kompozisyon · 1 video / 1 shot
- **Niyet:** hareketsiz patlama/öfke/vurgu.
- **Mekanik:** nesneler kahramanın çevresinde ışın gibi dizilir.
- **Sayılar:** 8–16 nesne, eşit açı.
- **Kısıt:** —
- **Risk:** —
- **A/B durumu:** A/B yok.

#### K-41 · Yüzsüz figür
- **Grup · sıklık:** kompozisyon · 2 video / 2 shot
- **Niyet:** "bu sen olabilirsin": kimliksiz kişi.
- **Mekanik:** figürün yüzü düz leke/siluetle silinir.
- **Sayılar:** —
- **Kısıt:** gerçek kişi yok kuralına uygundur.
- **Risk:** —
- **A/B durumu:** **ilke**.

#### K-42 · Senkron karşılaştırma ızgarası
- **Grup · sıklık:** kompozisyon · 1 video / 1 shot
- **Niyet:** fark görünür olur: aynı içerik yan yana farklı işlemle.
- **Mekanik:** ızgara pencerelerinde aynı içerik; kamera ve değişim senkron.
- **Sayılar:** 2×2 ya da 1×2; değişim ≈ 1 s.
- **Kısıt:** tek grade zinciri.
- **Risk:** —
- **A/B durumu:** A/B yok.

#### K-43 · İşaret ve bağlantı çizgisi (halka, ok, ip)
- **Grup · sıklık:** kompozisyon · 5 video / 8 shot
- **Niyet:** anlatıcının kalemi: "burası", "şu ona bağlı".
- **Mekanik:** halka / kıvrık ok / kesikli halka kendini çizer; ip/çizgi iki öğeyi bağlar.
- **Sayılar:** halka ≈ 0.4 s; kesikli halka ≈ 1.3 s saat yönü; ok ≈ 0.3–0.5 s.
- **Kısıt:**
  - Aksan renkli halka aksan kotasından sayılır.
  - Genel bakışta çizgi ekranda ≥ 5–6 px (kalınlık ≈ 6.5/k).
  - Çizgi kelimede başlar ama hedefi kadraja girdikten sonra varır.
  - Farklı z'deki iki düzlemi bağlayan çizgi gerçek 3B eğridir; düz ekran parçası "raf" kırığı yapar.
- **Risk:** —
- **A/B durumu:** A/B yok. Kaynak projenin ikinci dünyasında A/B'siz kullanıldı.

#### K-44 · Sayaç ufku
- **Grup · sıklık:** kompozisyon · 1 video / 1 shot
- **Niyet:** sayıya ağırlık: rakam ufukta, zeminde yansır.
- **Mekanik:** dev rakam ufuk çizgisinde, zemin yansımasıyla; adım adım sayar, sonda tutar.
- **Sayılar:** adım ≈ 4 kare; tutuş 0.4 s.
- **Kısıt:** —
- **Risk:** —
- **A/B durumu:** A/B yok.

#### K-45 · Geri çağırma (motif, ayraç, iç çerçeve)
- **Grup · sıklık:** kompozisyon · 2 video / 5 shot
- **Niyet:** anlam bağlanır: önceki görüntü/nesne geri döner.
- **Mekanik:** aynı motif farklı shot'ta; son kare ilk poz; önceki shot yeni nesnenin çerçevesinde.
- **Sayılar:** —
- **Kısıt:** tekrar eden nesne tek bileşendir; görünüş değişirse bütün kullanımları birlikte yeniden çizilir.
- **Risk:** —
- **A/B durumu:** **ilke**.

## Malzeme / efekt

#### K-46 · Mürekkep açılması
- **Grup · sıklık:** malzeme · 1 video / 2 shot
- **Niyet:** yazıya dönüş, leke, iz.
- **Mekanik:** mürekkep lekesi kâğıda emilerek yayılır ya da damga gibi basılır.
- **Sayılar:** yayılma 0.4–0.8 s.
- **Kısıt:** —
- **Risk:** organik yayılma motorda zordur; üretken eleman adayıdır (GENAI, katman A).
- **A/B durumu:** A/B yok.

#### K-47 · Doku katmanı (foto doku, el yazısı zemin)
- **Grup · sıklık:** malzeme · 2 video / 4 shot
- **Niyet:** zenginlik: çizime gerçek doku, zemine yazı izi.
- **Mekanik:** kumaş/deri/ahşap foto dokusu çizim grade'inde; soluk el yazısı sayfa zemini.
- **Sayılar:** zemin kontrastı ≤ %10.
- **Kısıt:** `data-doku` (okunacak metin sayılmaz).
- **Risk:** QC metin tespitini yanıltabilir. Doku plakası üretken varlık adayıdır (GENAI, katman B).
- **A/B durumu:** A/B yok.

#### K-48 · Kâğıt tiyatrosu
- **Grup · sıklık:** malzeme · 1 video / 1 shot
- **Niyet:** masal anlatımı.
- **Mekanik:** kâğıt kesik katmanlar (dalga, bulut) zıt yönde salınır; sopalı kesik yükselir.
- **Sayılar:** salınım periyodu ≈ 1 s.
- **Kısıt:** —
- **Risk:** pahalı; dünya dışı kalabilir.
- **A/B durumu:** A/B yok (world: kâğıt).

#### K-49 · Kâğıt buruşturma
- **Grup · sıklık:** malzeme · 1 video / 2 shot
- **Niyet:** ret: taslak atılır.
- **Mekanik:** kâğıt 3–4 pozda buruşur, top olur.
- **Sayılar:** 0.5 s.
- **Kısıt:** tek katman, maske süzgeçte. İki katmanla yerel buruşma hayalet yapar.
- **Risk:** —
- **A/B durumu:** A/B yok (world: desk-paper'da kaynak videodan kuruldu).

## Ritim

#### K-50 · Tekrar ve kırılma
- **Grup · sıklık:** ritim · 1 video / 1 shot
- **Niyet:** espri ya da şok: kural öğretilir, sonra bozulur.
- **Mekanik:** aynı eylem 3–5 kez aynı ritimle; son tekrar kuralı bozar.
- **Sayılar:** tekrar aralığı 1–1.3 s.
- **Kısıt:** —
- **Risk:** —
- **A/B durumu:** **ilke**.

#### K-51 · Olay sonrası iz tutuşu
- **Grup · sıklık:** ritim · 2 video / 2 shot
- **Niyet:** nefes: olay oturur, iz okunur.
- **Mekanik:** olaydan sonra iz/sonuç hareketsiz tutulur; drift sürer.
- **Sayılar:** 1.5–3 s.
- **Kısıt:** bilinçli hold (zevk listesi): mikro-hareketsiz uzun hold UCUZ #7'dir. Son vuruş kesmeden ≥ 0.25 s önce biter.
- **Risk:** —
- **A/B durumu:** **ilke**.

#### K-52 · Sabit çapa, hızlı değişim
- **Grup · sıklık:** ritim · 2 video / 2 shot
- **Niyet:** çokluk ve kaos: aynı şey her yerde.
- **Mekanik:** çapa (kelime ya da çerçeve) merkezde sabit; çevresindeki içerik 1–3 karede (ya da 0.3 s'de) bir değişir.
- **Sayılar:** kelime montajı 15–20 Hz, ≤ 1.5 s; çerçeve değişimi ≈ 0.3 s. Varsayılan: 2 karede bir, en çok 1.5 s.
- **Kısıt:** değişim sürerken öğeler `data-doku`. Okunurluk (KD-2) çapada aranır.
- **Risk:** ışığa duyarlı izleyici; ≤ 1.5 s.
- **A/B durumu:** **demo** (A/B yok; tipografik profil, bant %6–14, display ≥ 72 px).

#### K-53 · Birikimle açığa çıkan şekil
- **Grup · sıklık:** ritim · 1 video / 1 shot
- **Niyet:** küçük olaylar toplanınca büyük anlam.
- **Mekanik:** küçük olaylar tek tek eklenir; birikince büyük şekil kendiliğinden okunur.
- **Sayılar:** 6–10 olay, ≈ 0.3 s arayla.
- **Kısıt:** olaylar sese bağlanıyorsa olay ↔ kelime ≤ 1 kare (ÇEN-1).
- **Risk:** —
- **A/B durumu:** A/B yok.

#### K-54 · Sakin eylem döngüsü
- **Grup · sıklık:** ritim · 1 video / 1 shot
- **Niyet:** bekleme ve atmosfer.
- **Mekanik:** tek eylem 4 evrede döner; sabit kamera; dinlenme payı var.
- **Sayılar:** döngü 6–7 s; dinlenme ≈ %25–30.
- **Kısıt:** drift korunur.
- **Risk:** —
- **A/B durumu:** **ilke**.

## Mekanik (paket ilkelleri, 1.4)

> Bu üç kart referans videolardan değil, FocusFX (kütüphane `focusfx-paper`) ve paketin ilk üretim projesinin ("kaynak proje") ölçümlerinden
> gelir. Çalışma zamanı ilkeli pakettedir (`render/runtime/motion-mek.jsx` → projede `shared/motion-mek.jsx`, `MH.mek`); görünüş (malzeme,
> gölge rengi, ışık) world'dendir. Sayılar referans ölçümüdür, varsayılan değildir (`docs/CRAFT-REF.md` §5); proje kendi klibinden ölçer:
> `motion-render motion-test mek-supurme | mek-katlama | mek-seyahat [--props '<json>'] [--ref <klip>]`.

#### K-55 · Kadrajı örten süpürme (altta set değişimi)
- **Grup · sıklık:** geçiş · FocusFX 1 geçiş (kâğıt süpürme, K-07 ailesi) · kaynak projede shot sınırı geçişi.
- **Niyet:** kesmesiz shot sınırı: fiziksel bir yüzey kadrajı süpürür; altındaki ya da arkasından gelen yeni set açığa çıkar.
- **Mekanik:** ön olay (yüzey kalkar, gölgesi kopar ya da gölge önden gelir) → yönlü süpürme (yamuk hız profili, kadraj dışında hız sürer) + yönlü
  hareket bulanıklığı. `out`: yüzey kadrajı terk eder · `in`: gelir ve durur · `through`: girer, kadrajı **tam** örter, karşıdan çıkar — set
  değişimi yalnız tam örtme penceresinde (`swap(T)`).
- **Sayılar:** referans ölçümü (FocusFX) 620 ms io3, gölge 70 ms önce, yol 2500 px, bulanıklık min(14, |v|/90) px. Referans ölçümü (kaynak proje)
  660 ms yamuk-kalkış r 0,5 + kadraj dışında hız sürer; io3 tepesinde alttaki kart tek karede %55,7 açığa çıkıyordu → yamukla %25/kare.
- **Parametreler:** `MH.mek.sweep({box, dir, kind, t, lead, dur, profile, r, carry, lift, shadowLead, pad, blur:{max, div}, swapAt})` +
  `<MHSweep s T shade={{fn: z => {dx, dy, blur, a}, color}}>yüzey</MHSweep>`. Genel varsayılan: out/in 0,8 s (r 1), through 1,2 s (yamuk r 0,5).
- **Ölçüm:** frame-check `velocity` (sahne `MH.hooks.boxes` → `s.boxEntry(T)`; görünür ardışık karelerde C1 ≤ %5) · `entryExit` (evre
  `supurme giris|cikis`) · `pop`: süpürme penceresi tasarlanmış geçiştir → `MH.mek.hooks.windows('gecis', [s.window()])` ve check
  `exclude: ["$__gecis"]` (CONTRACT §5) · `s.plan()`: tepe, C1, tam örtme `cover {t0, t1}`, `tSwap`. Açığa çıkış hızı = kenar hızı ÷ alttaki
  nesnenin genişliği (tepe hızda tek kare %50'yi geçmesin).
- **Kısıt:** set değişimi tam örtme olmadan yapılırsa gizli kesmedir (`plan().warn`). Yüzey sözlükte / planda adlı fiziksel nesnedir.
- **Risk / tuzak:** io3 tepesi 3 × ortalama: alttaki içerik bir karede açığa çıkar (pop) — yamuk ya da daha uzun süre. Sine rampa C1 için
  N ≥ π/(2r·0,05) kare. Hızlı süpürmede `motion-test` piksel izi arama penceresini aşabilir (R 160 px @1080): tasarım profiline (`__mtSpeed`) bak.
- **A/B durumu:** **kural** (kaynak projede kesmesiz geçiş repertuvarı; mekanik onaylı).

#### K-56 · Kalın kâğıt katlama (menteşeli yaprak)
- **Grup · sıklık:** geçiş / hareket · FocusFX 1 geçiş (yarı saydam yaprak kalkışı) · kaynak projede mekanik demosu.
- **Niyet:** üstteki yaprak menteşesinden kalkıp katlanır; altındaki ya da arka yüzü yeni bilgidir (K-34'ün perspektifli, kalın kâğıt hâli).
- **Mekanik:** ön olay (serbest kenar birkaç px kalkar, gölge kopar) → menteşe ekseninde θ 0 → açı (CSS 3B perspektif); ön yüz göz düzleminde
  (`thEye`) kaybolur, arka yüz görünür; kalınlık şeritleri; zemin izi + yüksekliğe bağlı gölge kaydı. Kıvrım / ışık / alan derinliği zarfları
  world'ün (`lf` ile).
- **Sayılar:** referans ölçümü (FocusFX) 0 → 96°, 1650 ms io3, perspektif 2200, kıvrım ≤ 9 px, ışık a ≤ 0,16, DoF ≤ 8,6 px. Referans ölçümü
  (kaynak proje) aynı + 3 kare ön olay (alt kenar 4 px); perspektif 1000'de alt kenar 2 karede kadrajı geçti.
- **Parametreler:** `MH.mek.fold({box, hinge, angle, t, lead, leadLift, dur, profile, settle, persp, origin, thickness, shadowK})` +
  `<MHFold f T front back edge shade blur flat/>` (yüzler children / render prop). Genel varsayılan 180°, 1,8 s hermite; persp ZORUNLU.
- **Ölçüm:** `f.plan()` (yay hızı C1, izdüşüm tepesi) · frame-check `velocity` (`f.boxEntry(T)` poly) · `entryExit` · yüz değişimi karesi `thEye`.
- **Kısıt:** katlanan yaprak düz katmanla aynı 3B bağlamdaysa kesişir; yaprak kendi perspektif kabında (`flat` varsayılan) ya da kamera
  bağlamında (`flat={false}`) tek kalır.
- **Risk / tuzak:** serbest kenarın ekran izi perspektifte yön değiştirir (kameraya kalkarken dışa, sonra karşıya): izdüşüm hızı 0'a yaklaşır,
  kutu merkezinden ölçen `velocity` ayrı koşular görebilir — C1'i yay hızından (`plan().c1`) oku. Yüze `filter` verilirse yüz düzleşir; DoF
  bulanıklığı yüzlere ayrı verilir (bileşen `blur`). Kısa perspektif + uzun yaprak: kenar `persp`'e yaklaşınca ölçek patlar.
- **A/B durumu:** **demo** (mekanik onaylı; A/B yok).

#### K-57 · Seyahat hamlesi (crane-up → travel → crane-down)
- **Grup · sıklık:** kamera / geçiş · FocusFX shot sınırı kamera taşımaları (12/43 hamle) · kaynak projede geçiş omurgası kararı.
- **Niyet:** büyük tek dünyada bir bölgeden ötekine: kamera yükselir (masa yumuşar), üstünden ilerler, yeni bölgeye iner (kahraman netleşir).
- **Mekanik:** tek sürekli C1 yol: yükseklik (dolly `d` + tilt `rx`) yukarı ve aşağı pencerelerde, x/y travel penceresinde; pencereler
  örtüşür, hız evreler arasında 0'a düşmez (tek hamle). Varışta settle varış hızıyla eklenir (konum ve hız sürekli), sonra tutuş + drift.
  Alan derinliği yükseklikten (`dof(T)`); hareket bulanıklığı `MH.cam.motion` → `MHMoBlur` / `MHMoBlurK`.
- **Sayılar:** referans kararı (kaynak proje) görünür 1,5–2,5 s, tepe ≤ 25 px/kare @60 (FocusFX en büyük 32,6; medyan 8,4), settle 0,28 s;
  kural C: tepe 8–14, görünür ≥ 1,0 s. İki anahtarlı Hermite'de ivme/tepe 4/N (%5 için N ≥ 80 kare); quintic 3,08/N (N ≥ 62).
- **Parametreler:** `MH.mek.travel({from, to, t, dur | visible, profile, up:{d, rx}, windows, settle:{amp, dur}, peakMax, fit:'dur', persp,
  drift, dof:{k, max, focus}, raster})` → `at(T)` (`<MHCam c>`), `hook({dur})` (`__camSpeed`), `plan()`; art arda hamleler `MH.mek.chain`.
- **Ölçüm:** MEASURE M-C (kural C) ve M-SEYAHAT: frame-check `velocity` (`__camSpeed`, C1 ≤ %5 tepe) · `moves` (hamle/shot; taban W·0,02/fps)
  · `plan()` tepe, `visible` (%10–90), `c1` (ana hamle) ve `c1Fc` (bugünkü frame-check tanımı) · `motion-test mek-seyahat --fps 60` (piksel +
  tasarım hızı). Dinlenme basamağı M-ZS.
- **Kısıt:** gizli kamera hamlesi yok: konum/ölçek yalnız görünür hamleyle değişir (tam örten süpürme altındaki set değişimi hariç, K-55).
  Ardışık zıt yönlü hamleler arasında tutuş. Yol ve süre birlikte planlanır: tepe = 1,5·yol/N (hermite) → tavan aşılırsa `fit:'dur'` ya da yol kısalır.
- **Risk / tuzak:** (1) settle'ın dönüş yarısı tabanın (0,05 px/kare) altına inip ayrı "mikro hamle" sayılır → bugünkü `velocity` onu kendi
  küçük tepesine göre ölçer (%20–30) — `plan().c1Fc` ve uyarı; araç tanımı düzeltilene dek check'te `floor` settle tepesinin üstünde (PN-138).
  (2) Dinlenmede tamsayı öteleme / `rotate(0deg)`: kamera durduğu karede katman eksene hizalı raster yoluna geçer, tek karede keskinlik
  basamağı (PN-120, PN-137) → `raster: true` (rx/rz hiç tam 0 yazılmaz) ya da dinlenme konumu tamsayı değil. (3) `MHMoBlur` örnek ötelemesi
  `feOffset`'te tamsayıya yuvarlanır; L/2 = x,5'te örnekler asimetrik → tek karede ≈ 0,2 px kayma, C1 basamağı (PN-119) → `MHMoBlurK`
  (tamsayı cihaz pikseli + kutu çekirdeği + eşikte rampa). (4) Alan derinliği süzgeci (`filter: blur`) dinlenmede kalkarsa raster yolu
  değişir → hamle boyunca taban değer. (5) Yarı saydam kamera içeriğinde MoBlur "over" bileşimi kaplamayı iki katına çıkarır (karartma) —
  kamera katmanı opak zemin taşır. (6) Ara anahtarlı monoton kübikte hız çukuru oluşur (Fritsch–Carlson teğetleri sekantı aşmaz): seyahat tek
  hamledir, ara anahtar yok.
- **A/B durumu:** **kural** (kaynak projede geçiş omurgası kararı; A/B yok — ölçü sınıfı M-SEYAHAT).

---

## Özet sayım

| grup | kalıp | kabul | revize | ret | çıkarıldı | demo | kural | ilke | A/B yok |
|---|---|---|---|---|---|---|---|---|---|
| kamera | 5 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 3 |
| geçiş | 9 | 1 | 1 | 0 | 0 | 0 | 2 | 1 | 4 |
| tipografi | 9 | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 7 |
| ışık | 5 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 4 |
| hareket | 7 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 5 |
| kompozisyon | 10 | 0 | 0 | 0 | 0 | 0 | 1 | 3 | 6 |
| malzeme | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 |
| ritim | 5 | 0 | 0 | 0 | 0 | 1 | 0 | 3 | 1 |
| mekanik (1.4) | 3 | 0 | 0 | 0 | 0 | 1 | 2 | 0 | 0 |
| **toplam** | **57** | **4** | **3** | **1** | **1** | **2** | **5** | **7** | **34** |
