# RETRO — [ÖRNEK] film (seçki)

> **[ÖRNEK] Kaynak projenin RETRO'sundan anonimleştirilmiş seçki.** Yapı, sayılar ve kök neden zinciri gerçektir. Kelimeler, model adları, bileşen adları ve world adı genelleştirildi.
>
> Gösterdikleri:
> - bir **uzun form** girişi (kapıda zorlanan ilk perde);
> - perde akışı oturduktan sonra kullanılan **kısa form** girişleri.
>
> Her "kötü giden" maddesi bir kontrole bağlanır; hiçbirinin kök nedeni "dikkatsizlik" değildir.

## <tarih> · F3 — Perde 1 yeniden tasarım, world v4, animatik kapısı

**İstenen.**

- Perde 1 render'ı reddedildi; yeni K1–K8 SERT kuralları getirildi.
- Motor galerisi istendi; world, envanter bileşenleriyle yeniden kurulacak.
- 5 enstrüman × 3 varyant istendi; üretken klipler: biri geri, ikisi yeni, kazananlar 1080p.
- Perde 1 için × 3 varyant still istendi.
- 960×540 animatik + kontak + OURS → bağımsız reviewer → DUR (tam render yok).

**Çıkan.**

- Galeri 70 kart (62 var / 5 yok / 3 kullanılmaz).
- World v4: kamera düzeneği ve enstrüman bileşenleri.
- Perde 1: tek yüzey, kesme yok.
- Animatik r1 → bağımsız reviewer GEÇMEZ (§0.6 4/8) → r2 → … → r4 **koşullu geçer** (§0.6 7/8).
- Üretken: 4 video taslağı + 2 final (95 kredi); 5 plaka (0.6). Bakiye <önce> → <sonra> [ÖRNEK].

### Ters giden (kök neden)

1. **Benim hatam: kelime zamanı çakışması.** Manifestte aynı kelime iki shot'ta geçiyor; zaman tablosu sonuncuyu aldı ve iki kelime hiç yazılmadı.
   - **Ders:** kelime → zaman eşlemesi shot aralığıyla sınırlanır.
2. **Benim hatam: satır ortası yorum (ikinci kez).** Yama satır ortasına `// …` ekledi; satırın kalanı yoruma döndü, sayfa yüklenmedi.
   - **Ders:** yorum yalnız ayrı satırda ya da JSX `{/* */}` olarak; yamadan sonra yüklenebilirlik probe'u.
3. **Kabuk BOM yazdı.** Kabuk komutu UTF-8 dosyaya BOM ekledi; JSON okuyucu reddetti, sayfa eski karelerle render edildi.
   - **Ders:** BOM'suz yazım; okumada BOM'a toleranslı çözücü.
4. **Dosya sistemi büyük/küçük harf ayırmıyor.** Kontak dosyası bir karenin üstüne yazıldı (reviewer fark etti).
   - **Ders:** kontak adları `-sheet` sonekli.
5. **K1 maske modu sahne sarmalayıcısını da gizledi** (bomboş maske).
   - **Ders:** maske kuralı world köküne kapsanır.
6. **Varyantlar ilk turda neredeyse aynıydı.** Kilit an shot sonlarına denk geliyordu; orada ortak geçiş anahtarı baskındı.
   - **Ders:** varyant anahtarı kendi shot'unun içinde, kilit an shot ortasında.
7. **r1 animatik ritmi.** K3'ü tutturmak için kamera hiç durmadı (hareketli pay 0.97). Reviewer: varış/tutuş yok, hiyerarşi yok, ters yazı şeridi (UCUZ #9).
   - **Ders:** K3 tabanı ile okuma tutuşu birlikte tasarlanır; kamera eğrisi monoton kübik.
8. **Üretken klip temiz aralığı.** Talimattaki 0–4.5 s, 24 ve 30 fps kare dizinlerinin karışmasından geliyordu. Bağımsız ölçüm 0–2.83 s. Açık karar.
9. **Görüntü modeli plakaya iki kez sahte yazı bastı.** Durduruldu; önceki fazın kabul edilmiş plakası kullanıldı.
10. **3B sahne ağır.** Animatik 3.7 s/kare (960×540). Tam çözünürlük için render süresi riski rapora yazıldı.

### Kararlar ve sapmalar

- Bir klip canlı doku olarak reddedildi, durgun yüzey dokusu olarak koşullu kabul edildi. 1080p'si üretilmedi (17.5 kredi tasarruf). İlgili shot'un katmanı değişti.
- Varyant seçimi: yapan S01 b · S02 a · S03 a · S04 c · S05 c · S06 a; bağımsız reviewer S01 a · S02 b · S03 b · S04 b · S05 b · S06 a. **Reviewer seçimi alındı:** kadraj ve okunurluk gerekçeleri daha güçlüydü.
- K1 ölçümü "en büyük bileşen" yerine "kahraman maskesinin bütünü" ile yapıldı (çizim yığını tek nesne).

### Katkı

- World v4 (A/B yok, **deneme**): kamera düzeneği (orbit), monoton kübik eğri, derinlik katmanı, ışık havuzu, yüzey katlama, çizim mekanizmaları, enstrümanlar.
- Araçlar: K1 ölçer, K6 sayımı, animatik encode, kontak tablosu, OURS adım parametresi.
- **Sonuç (F3 kapanış):** animatik r4 bağımsız reviewer'dan **koşullu geçti** (§0.6 7/8). Koşul (çizim kafasının tek karede sıçraması) r4c'de düzeltildi.
  - Her tur ≈ 45 dk sürdü: render 28 dk + reviewer 10 dk.
  - **Ders:** kapı turları üretken krediye dokunmadan animatikte yapılır; her turun bulgusu künyeye tablo olarak yazılır.

### Sonraki tur için

- Animatik onayı (K7): tam render ancak kullanıcı onayıyla.
- Render süresi riski: tam çözünürlükte tahmini 10–15 s/kare → tam render öncesi süzgeç optimizasyonu.

---

## F7 · Perde 5 (S17–S19)

- **İyi giden:**
  - Render öncesi izdüşüm denetçileri kamera, logo boyutu, zemin payı ve bağ zamanlamasını sayıyla çözdü.
  - Reviewer'ın "≤ %25 zemin" isteğinin geometrik sınırı 1207 adayla gösterildi.
  - Aksan konum taraması (kutular dışında 0) ölçüm yapaylığını gerçek hatadan ayırdı.
- **Kötü giden:**
  1. 60 fps iki kez render edildi: ΔE ve küçük metin örtüşmesi animatikte (540p) görünmüyordu. Aksan rengi tek kare grade ile animatik aşamasında ölçülebilirdi.
  2. 2× render süresi ilk kareden tahmin edildi (4.3 s); genel bakış kareleri 7–8 s sürdü. Kullanıcıya verilen tahmin iyimser kaldı.
  3. Pozlama uyumu eşiği kadraj değişince geride kaldı (yakalandı).
- **Dersler (world/lessons.md "F7" · core aday):** büyük katmanda karo belleği; genel bakış geometrisini aramayla sına; pozlama uyumu kamera ölçeğine bağlı; eğik genel bakışta 2× süper örnekleme; **tek aksan rengini grade sonrası tek karede erken ölç** (core aday); **süre tahmini temsilci karelerden** (core aday).

## F8 · Perde 6 (S20–S22), film sonu

- **İyi giden:**
  - İzdüşüm denetçisi aletlerin K8 giriş/çıkışını (gölge dahil), hızlarını, tek alet ve tutuş kurallarını, yarım simge ve yüzey kenarını render öncesi yakaladı.
  - Animatik zorunlu düzeltmesiz geçti.
  - Siyaha iniş sorunu ölçüyle kapandı (pürüz 0.299 → 0.080).
- **Kötü giden:**
  1. Damga için kameraya darbe ekledim ve denetçinin bulduğu basamağı "kasıtlı" diye bıraktım. Kullanıcı haklı olarak reddetti: basamak 0 kuraldır, istisna önce sorulur.
  2. Havuz düşüm formülünde `max` hatası devir farkını 9.2/255 yaptı; devir ölçümü yakaladı.
  3. Satır ortası `//` tuzağı araç betiğinde tekrarlandı (**3. kez → core kural**).
  4. Logo tonunu filmdeki diğer logoyla tutarlılığı ölçmeden telafi ettim.
  5. Grade'in sahne sonu "saf siyah" penceresi inişte basamak üretti. İnişi ham karede ölçmüştüm, mp4'te ölçmemiştim; reviewer yakaladı.
- **Dersler (world/lessons.md "F8" · core aday):** **basamak 0 / kasıtlı ihlal yok** (core); logo tonunu teslim edilmiş birimin mp4'ünden ölç (core aday); siyaha iniş 16-bit + dither; ışık çekilişinde önce pozlama; 2× kuralı aralık bazlı; alet gölgesi de kadraj dışında; **sahne sonu inişini mp4'ten (Y düzlemi) de ölç** (core aday).

## F9 · cila + master

- **İyi giden:**
  - Her değişiklik bayatlık tanığıyla (sınır kareleri fark 0) yalnız etkilenen aralıkta yapıldı.
  - Bütün film QC tek sayfada koştu.
  - Master tek encode ile önizlemenin dikiş sıçramasını taşımadı.
- **Kötü giden:**
  1. Kenar dalgasını probe ile ölçmeden kurdum; düzlem raster ızgarası dalgayı yalnız dışa çevirdi (+0.33 px).
  2. Küçük pozlama düşüşünü sayfa örtüsüyle yaptım; 8-bit alfa basamağı oluştu (F8 iniş dersinin tekrarı).
  3. İlk dither (rampalanan TPDF) ölü bölge yaptı.
  4. **Önceki kareler yedeklenmeden silindi.**
  5. `sed` deseninde `\|` alternasyon oldu (taslak bozuldu, düzeltildi).
- **Dersler:** küçük pozlama değişimi sayfada yapılmaz, post'ta yapılır; perde mp4'lerini uç uca eklemek dikişte sıçrama bırakır → **master tek sürekli encode** (core); **değiştirilecek kareleri silmeden önce yedekle** (core: kısmi render protokolü adım 2); sed yerine dosyadan yama.

## F10 · son kart keskinlik + vuruş

- **İyi giden:** düzeltmeden önce ölçtüm. Brief'in varsayımı (pişirme/süzgeç) geçersizdi. Neden (3B büyütme) dört deneyle (k serisi, 2× DPR, `will-change`, `translateZ`) sayıyla bulundu. Çözüm (S× doku) probe ile kanıtlanıp uygulandı.
- **Kötü giden:** ışık vuruşunun logo tonuna etkisini render öncesi ölçmedim. −%30 ile ΔE 3.38 çıktı; ikinci render gerekti (≈ 1 saat).
- **Dersler:** **teşhis önce, sayıyla neden** (core); 3B kamera büyütmesi düzlemi yumuşatır (≈ 1.65 px × k) → kahraman öğe S× dokuda (world); ışık değişikliği ölçülen bir renk sınırını (ΔE) taşıyorsa önce probe.

## F11 · yeni ses + gerçek logolar → master v5

- **İyi giden:**
  - Kayma iki bağımsız yoldan (kelime + zarf) ölçüldü; transkripsiyon hataları klip doğrulamasıyla ayrıldı.
  - Kayması ≤ 33 ms olan shot'lar eski eşleme devredilerek bit-aynı kaldı.
  - Logodan bağımsız perdeler DUR sırasında render edildi (≈ 2.5 sa kazanç).
  - "SVG" dosyalarının raster kap olduğu ilk adımda yakalandı.
- **Kötü giden:**
  - Kendi logo ölçerimin üç kusuru (ölçek yuvarlaması, ½ px pencere, kaplama yanlılığı) ancak yerel ızgara ölçümüyle çelişince bulundu. Ölçer önce kontrol dosyasıyla (aynı içerik ≈ 0.995) doğrulanmalıydı.
  - Başlık bloğu donmuş world'de başka bir perdede de görünüyordu. Kamera izdüşümüyle tarayınca bulundu; brief listesinde yoktu.
- **Ders:** yeni varlık (ses ya da logo) geldiğinde etkilenen kareler tasarım listesinden değil, **ölçümle** bulunur (core); **ölçer kendi kontrolüyle kalibre edilir** (core).
