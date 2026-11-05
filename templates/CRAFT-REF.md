# CRAFT-REF — <PROJE> zanaat referansı

> Hareket zanaatının tek kaynağı: referans klipler + ölçülmüş süreler, easing ve mekanik. **Kimlik değildir** (palet, iskelet, nesne dili
> world'dedir); zanaat kütüphane world'lerinden ve referans kliplerden serbestçe örnek alınır (RULES UCUZ-11). Director brief'inin parçasıdır
> (PLAYBOOK §3.1); reviewer kalibrasyonu `project.md` §3 "Kalite referansı" tablosundaki kliplerle yapılır (motion-reviewer SKILL §3.0).
> Sayılar ölçülür, uydurulmaz: `motion-render motion-test <ilkel|sahne> --ref <klip>` (hız profili, ivme, C1) ya da kaynak koddan.

## 1. Referans klipler

| klip | süre | neyin referansı | ölçüm (motion-test --ref) |
|---|---|---|---|
| <out/ref/….mp4> | <s> | <çizim · kart girişi · katlama · geçiş · kamera · yazı girişi> | <tepe px/kare @30 · C1 en kötü % · hareketli pay> |

## 2. Mekanik tablosu (ilkel başına)

| mekanik / ilkel | giriş (s) | iş (s) | çıkış (s) | easing | hız profili (tepe, rampa) | ikincil hareket | kaynak (klip · kod) |
|---|---|---|---|---|---|---|---|
| <kalem çizgisi> | <≥ 0,4> | <…> | <≥ 0,4> | <sine · out3 …> | <…> | <gölge gecikmesi n kare> | <REF-1 · world/….jsx> |

## 3. Kamera

| hamle | süre (≥) | easing | shot başına hamle | not |
|---|---|---|---|---|
| <push · pan · crane> | <s> | <…> | <≤ n> | <C1: ardışık |Δv| ≤ %5 tepe> |

## 4. Onaylı ilkeller (ilkel kütüphanesi kapısı, PLAYBOOK §4.4a)

| ilkel | dosya | motion-test çıktısı | onay (tarih, DUR-1) |
|---|---|---|---|
| <Bileşen> | <world/….jsx> | <out/motion-test/<ad>/> | <kullanıcı · YYYY-AA-GG> |

---

## 5. Genel referans (FocusFX ölçümü — varsayılan değil)

> **Statü: referans, varsayılan değil.** Bu bölümdeki her sayı başka bir filmin ölçümüdür: **referans ölçümü (FocusFX)** = kütüphane world'ü
> `focusfx-paper`'ın kaynağı olan film (kod sabitleri ve kare ölçümü) · **referans ölçümü (kaynak proje)** = paketin ilk üretim projesinde aynı
> mekaniklerin yeniden ölçümü. Proje bu sayıları kopyalamaz: kendi kliplerinden ölçer (`motion-render motion-test <ilkel> --ref <klip>`) ve
> sonucu §1–§3'e yazar. Kimlik (palet, iskelet, nesne dili) buradan alınmaz (RULES UCUZ-11); yalnız zaman, easing ve mekanik örnek alınır.
> Kod atıfları paketteki dosyalaradır: `kütüphane <dosya>:<satır>` = `skills/motion-world/library/focusfx-paper/<dosya>` · `MH.mek.*` =
> `render/runtime/motion-mek.jsx` (projede `shared/motion-mek.jsx`) · `MH.*` = `render/runtime/motion-core.jsx`. Satır numarası verilmeyen
> FocusFX atıfları kaynak filmin sahne koduna aittir (pakette yok).

### 5.1 Easing ailesi

Hız, ortalama hıza göre normalize (ortalama = 1). "İlk kare" = ilk kare yer değiştirmesi / tepe kare yer değiştirmesi (0,4 s hareket).

| ad | formül | v(0) · v(1) · tepe | ilk kare | rol (referans ölçümü, FocusFX) | pakette |
|---|---|---|---|---|---|
| sine in-out (sio) | 0,5 − 0,5·cos πu | 0 · 0 · 1,571 | %6,6 @60 · %13,2 @30 | çizgi, yazım, alet giriş/çıkış, ışık (165 çağrı) | `MH.ease.sine` · kütüphane `fx-lab.jsx:39–43` |
| power3 in-out (io3) | u < 0,5 ? 4u³ : 1 − (−2u + 2)³/2 | 0 · 0 · 3,0 | %0,3 @60 · %1,1 @30 | parça yolu, katlama, katman ayrışması, alet kalkışı | `MH.ease.inOut3` |
| power3 out (o3, varış) | 1 − (1 − u)³ | 3,0 · 0 · 3,0 | %100 (başta) | ibre, nokta/ok, "temas ilk karede görünür", kadraj dışından uç girişi | `MH.ease.out3` |
| power3 in (i3, kalkış) | u³ | 0 · 3,0 · 3,0 | sonda %100 | kadraj dışına çıkış (çıkış hızı kadraj dışında) | `MH.ease.in3` |
| yamuk (sine rampalı) | rampa payı r + sabit hız + rampa | 0 · 0 · 1/(1 − r) | π²/(12n²) (n rampa karesi) | kalem yolu (r 0,2), halka | `MH.mek.prof('yamuk', r)` · `'yamuk-kalkis'` · `'yamuk-inis'` |
| uç hızlı Hermite | (2t³ − 3t² + 1)x0 + (t³ − 2t² + t)v0 + (−2t³ + 3t²)x1 + (t³ − t²)v1 | elle | — | kaydedici kafası (girişte baskı hızına yavaşlar) | `MH.mek.arrive(f, m1)` |
| monoton kübik (fxMC) | Fritsch–Carlson Hermite: C1, aşma yok; tutuş anahtarında teğet 0 | anahtarda hız sürekli | — | bütün kamera kanalları | `MH.keys.monotone` · kütüphane `fx-rig.jsx:38` · iki anahtarlı tutuşlu hamle = `MH.mek.prof('hermite')` |
| Catmull-Rom (fxCR) | eşit olmayan zamanlı; hız sürekli, aşabilir | — | — | ışık havuzu, pozlama | `MH.keys.catmull` · kütüphane `fx-rig.jsx:37` |
| settle | amp·sin(πu)·(1 − u), 0,28 s; tepe 0,579·amp, varıştan 99 ms sonra | başta π·amp/0,28 s | — | varış sonrası tek aşma (amp 1–5 px) | `MH.settle` · `MH.mek.settleTail` · kütüphane `fx-lab.jsx:44` |
| adlı bezier'ler | enter (0.22, 1, 0.36, 1) · exit (0.4, 0, 1, 1) · pop (0.34, 1.4, 0.64, 1) · morph · gravity · collapse · smooth | — | — | perde kodunda yalnız ışık açılışı; pop/back/elastic 0 | `MH.ease.enter` … |

Tek kare ivme / tepe oranı (N kare hamle; frame-check `velocity` %5 sınırı için gereken en kısa hamle — matematik, ölçüm değil):

| profil | ivme/tepe | %5 için N ≥ | not |
|---|---|---|---|
| kübik Hermite (iki anahtarlı tutuşlu fxMC) | 4/N | 80 kare | uçlarda ivme en büyük (C1) |
| quintic (C2 tutuş, 6u⁵ − 15u⁴ + 10u³) | 3,08/N | 62 kare | uçlarda ivme 0; isteğe bağlı (`MH.mek.prof('quintic')`) |
| sine in-out · yamuk r 0,5 | π/N | 63 kare | yamuk r'de π/(2rN) |
| io3 | 4/N | 80 kare | ivme ortada en büyük ve işaret değiştirir (tepe 3 × ortalama) |

**Kurallar (referans ölçümü, FocusFX):** doğrusal easing yok (kalem ucunun sabit hızı istisna: 0,32–0,8 s) · hareket io3, çizgi/yazım sine, varış o3,
çıkış i3 (kütüphane `world.json:69`) · easing'in kendisinde aşma ve ters hareket yok; aşma yalnız varıştan sonra settle ile.

### 5.2 Giriş – iş – çıkış süreleri (ms, nesne sınıfına göre)

Referans ölçümü (FocusFX): sahne kodundaki 243 zaman çağrısı sınıflandı (min / medyan / max).

| sınıf | giriş | iş | çıkış | baskın easing |
|---|---|---|---|---|
| kalem / çizim (çizgi kendini çizer) | — (kalıcı) | 72 · 80 / 450 / 1350 | 1 · 400 | sine |
| kalem aleti (uç, kafa, kıskaç) | 8 · 150 / 300 / 1200 | 7 · 200 / 320 / 3170 | 13 · 250 / 600 / 1400 | giriş sine/o3 · çıkış i3 |
| kart / levha / parça | 6 · 70 / 475 / 700 | 3 · 500 / 1150 / 1250 | 1 · 700 | io3 (yol), sine (levha) |
| katlama (yarı saydam yaprak) | — | 1 · 1650 | — | io3 |
| ölçüm aleti / düz çizgi + kılavuz | 9 · 420 / 450 / 1250 | 12 · 60 / 300 / 420 | 9 · 300 / 480 / 1100 | sine |
| yazı — kahraman kelime | kılavuz 340 (yazımdan 420 önce) | 30 · 340 / 555 / 1120 | 4 · 250 / 425 / 850 | sine |
| yazı — etiket / formül | — | 17 · 160 / 300 / 600 | — | sine |
| logo | 2 · 400 / 440 / 480 (kırpma) | 2 · 70 / 160 / 250 (damga, ölçek 0,82 → 1, o3) | — | sine · o3 |
| ışık | 2 · 100 / 350 / 600 | 11 · 250 / 500 / 600 | 1 · 800 | sine |
| oturma · tepki · ibre · ok/nokta | — | 280 · 350 · 500 (o3) · 140 · 120 (o3) | — | settle · nudge · o3 |

Alet döngüsü örnekleri (giriş · iş · çıkış, ms; referans ölçümü, FocusFX): düz çizgi aleti 450 sio · 300 o3 · 450 sio — kalem 210 · 320 · 330 —
kalem 300 · 800 · 250 — çizici kafası 300 (iner) · 1350 + 200 + 900 · 300 kalkış + 600 kadraj dışı (io3).

### 5.3 Geçiş mekanikleri

Referans ölçümü (FocusFX): görünür kesme yok; shot sınırını kamera taşıması ya da kâğıt/ışık taşıması geçer.

| tür | süre (ms) · easing | açığa çıkan | ayrıntı | pakette |
|---|---|---|---|---|
| kamera taşıması | 12 hamle · 633 / 1892 / 5983 · fxMC | aynı dünyanın sonraki bölgesi | 43 hamlenin 12'si shot sınırını taşır | `MH.cam.at` · `MH.mek.travel` |
| kâğıt süpürme (K-07) | 620 · io3 (+ gölge 70 önce) | alttaki yaprak | 2500 px; yönlü bulanıklık min(14, \|v\|/90) px (v px/s; tepe 12 100 px/s); kalan şerit 420 ms i3 | `MH.mek.sweep` · kütüphane `fx-rig.jsx:138–141` (fxSlide) |
| ↳ referans ölçümü (kaynak proje) | 660 · yamuk-kalkış r 0,5 + kadraj dışında hız sürer | alttaki kart | io3 tepesinde alttaki kart tek karede %55,7 açığa çıkıyordu → yamuk kalkışla %25/kare; ön olay: 2 kare kalkış (6 px), gölge kopar; tepe 140 px/kare @30 | `MH.mek.sweep({kind:'out', profile:'yamuk-kalkis', r, carry})` |
| yaprak kalkışı / katlama | 1650 · io3 | altındaki kesit | üst kenar menteşe 0 → 96°; kıvrım ≤ 9 px; ışık a ≤ 0,16; alan derinliği ≤ 8,6 px | `MH.mek.fold` · kütüphane `fx-rig.jsx:122–136` (FXFold) |
| ↳ referans ölçümü (kaynak proje) | 1650 io3 + 3 kare ön olay (alt kenar 4 px kalkar) | alttaki kart | perspektif 2200 (1000'de alt kenar 2 karede kadrajı geçti); ön yüz göz düzleminde (θ ≈ 77°) kaybolur | `MH.mek.fold({leadLift, persp})` |
| patlama (parça ayrışması) | kalkış 400 io3 · yol 1250 io3 · oturma 280 | yeni nesneler | belirme 70 (kalkışla) · gölge kopması 80 | — |
| katman ayrışması | 1150 io3 + yapım çizgileri 700 sine | alt katmanlar | — | — |
| ön plan katmanı | giriş 700 · çıkış 700 · io3 | derinlik çerçevesi | kadraj dışından 900/500 px; bulanıklık 13 px; paralaks 0,6 | `MHLayer` |
| ↳ referans ölçümü (kaynak proje) | 800 / 800 io3 | — | sabit ofset eğrinin yarısını kadraj dışında harcıyordu (görünür giriş 0,30 s) → ofset = kadrajı tam terk eden en kısa uzunluk; görünür 0,60 s | — |
| kelime değişimi (rack, K-19) | 250–600 · sine | sonraki kelime | blur 0 → 5,5–8 px + opaklık 1 → 0 + ölçek −%2; giren 0,1 s sonra yazılır | — |
| ışık açılış / kapanış (K-24) | 100 + 500 havuz (lead 150) · 1000 sine + 400 | sahne · film sonu | pozlama ve havuz Catmull-Rom | kütüphane `fx-rig.jsx:34, 51–62` |
| perde devri | 0 (görünür geçiş yok) | — | sonraki perde önceki son hızıyla başlar; devir farkı ≤ 2/255 | — |

**Seyahat hamlesi** (referans kararı, kaynak proje; FocusFX'in "kamera yükselir, masa üstünde ilerler, yan yaprağa iner" hamlesinden):
crane-up (rx + z) → travel x/y → crane-down · görünür 1,5–2,5 s · tepe tavanı 25 px/kare @60 (FocusFX en büyük 32,6) · C1 · hareket bulanıklığı ·
varışta settle + tutuş · yükseklikte alan derinliği masayı yumuşatır, iniş kahramanı netleştirir. Pakette `MH.mek.travel` (tek sürekli C1 yol,
örtüşen kanal pencereleri, `peakMax`/`fit`, `dof(T)`); ölçü MEASURE M-SEYAHAT.

### 5.4 Kamera

Referans ölçümü (FocusFX): 115 anahtar, ≈ 118,7 s; kanallar fxMC ile 60 fps; ekran hızı kamera merkezi çevresinde 5 × 3 dünya noktasının izdüşümü
(`MH.cam.motion` ile aynı yöntem); hamle = hız > 0,6 px/kare kesintisiz aralık; drift hariç.

| ölçü | değer (referans ölçümü, FocusFX) |
|---|---|
| hamle süresi (n 43) | min 250 · p25 883 · **medyan 1267** · p75 2183 · max 5983 ms; ≥ 2,5 s: 10/43 · < 1 s: 12/43 |
| shot başına hamle (22 shot) | 1: 9 · 2: 7 · 3: 4 · 4: 2 shot (ortalama 1,95) |
| tepe ekran hızı | medyan 8,4 · max 32,6 px/kare @60; kütüphane tavanı `camera.maxPxPerFrame` 30, `stepJump` 2,5 (kütüphane `world.json:68`) |
| hareketli pay | %62 (hamle toplamı 73,8 s / 118,7 s) |
| eşik duyarlılığı | 0,3 px/kare: 35 hamle · 1,0 px/kare: 41 hamle (perde toplamı) |
| süreklilik | fxMC C1; tutuş anahtarı teğeti 0 (hamle 0'dan kalkar, basamak 0); perde dikişinde hız taşınır |
| eksenler | dolly `d`, tilt `rx` 2°–24°, orbit `ry` ±8°, roll `rz` ±4°, pan x/y; zoom ln k üzerinden (`MH.keys.log`) |
| drift | k 0,35: x 3,4 px · y 1,9 px · rz 0,105°, periyot 6,9–27,3 s (kütüphane `fx-rig.jsx:29–33`) |
| hareket bulanıklığı | 180° obtüratör, \|v\| > 3 px/kare (kütüphane `fx-lab.jsx:286` → `MHMoBlur`; tamsayı ötelemeli seçenek `MHMoBlurK`) |

Referans kararı (kaynak proje, "kural C"): hamle tepe hızı 8–14 px/kare @60 (hedef 9–12), görünür süre (%10–90) en az 1,0 s (medyan hedef 1,27 s),
her varışta settle 0,28 s, C1, hareket bulanıklığı, duruşta drift; "yavaş sürüklenme" (tepe < 5, > 2 s) ve "sert varış" (settle'sız, ivme > %5)
geçmez. Ölçü MEASURE M-C. İki anahtarlı tutuşlu hamlede tepe ≥ 8 ve C1 ≤ %5 birlikte en kısa yol ister: N ≥ 80 kare → yol ≥ 8·80/1,5 ≈ 430 px
(quintic ile N ≥ 62).

### 5.5 Yazı giriş / çıkış

| konu | değer (referans ölçümü, FocusFX) | tür | easing |
|---|---|---|---|
| kahraman kelime yazımı | n 30 · min 340 · p25 480 · **medyan 555** · p75 800 · max 1120 ms | blok: soldan sağa kırpma, eğik kesim boy·0,16, uçta 2 px kalem izi | sine |
| kılavuz (ön olay) | 340 ms, yazımdan 420 ms önce başlar | iki ince çizgi | sine |
| oturma (yazım sonu) | 280 ms · amp 4,6 → tepe 2,67 px, bitişten 99 ms sonra | satır yayı | settle |
| yazım içi oturma | 2·(1 − o3(p)) px: yazım boyunca 2 px yukarıdan iner (kütüphane `fx-lab.jsx:120`) | — | o3 |
| kahraman boyu | 176–280 px | — | — |
| formül / glif yazımı | 12 glif/s; her glifte yolculuk %30, yazım %70; satır başı 350 ms | harf | yamuk |
| daktilo | 170–200 ms / not | karakter adımı | adım |
| çıkış | 1 kamera bırakır (en sık) · 2 rack 250–600 ms (blur 5,5–8 px) · 3 taşınma 850 ms (ölçek 1 → 0,42) + oturma | blok | fxMC · sine · io3 |
| fade | 0 ("yazılır / çizilir / ışık") | — | — |

### 5.6 Zanaat göstergeleri

| gösterge | referans değeri (FocusFX, kod) | ölçü |
|---|---|---|
| giriş/çıkış süresi | 52 giriş+çıkış olayının 16'sı (%31) < 0,4 s: alet girişi 150–300 ms, alet çıkışı 250–330 ms, rack 250 ms; ölçüm aleti girişi 420–1250 | frame-check `entryExit` (RULES ZN-3) |
| tek kare belir/kaybol | fade yok; bilinçli tek kare olaylar yalnız kelimeye kilitli vuruş (çentik, ok başı); parça belirmesi 70 ms (kalkışla) | frame-check `pop` (ZN-1); tasarlanmış geçiş penceresi `exclude: ["$__<ad>"]` (`MH.mek.hooks.windows`) |
| hız sıçraması ≤ %5 tepe | io3 ilk kare %0,3 @60 · sine %6,6 @60 (%5 için ≥ 0,53 s) · o3 başta %100 (bilinçli) · i3 sonda %100 (kadraj dışı) · fxMC 0 | frame-check `velocity` (ZN-2) · `motion-test` tasarım profili |
| oturma taşması | easing'de aşma 0; settle tepe 0,579·amp (amp 2 / 4 / 4,6 / 5 → 1,16 / 2,32 / 2,67 / 2,90 px); yol payı %0,1–%5,8 | kütüphane `settlePx` 2 (`world.json:69`) |
| beklenti (ön olay) | ters hazırlık (back) 0; gölge 60–70 ms önce · parça kalkışı 70 ms önce · ışık 120–150 ms önce · kılavuz 420 ms önce | frame-check `onset` (ZN-5) |

### 5.7 Taşınabilir ilkel tablosu

Hareket zanaatı (easing, süre, mekanik) serbestçe örnek alınır; palet, iskelet ve nesne kimliği alınmaz (UCUZ-11).

| ilkel (FocusFX) | ne yapar | kimlik bağımlılığı | genel taşınabilir | pakette karşılığı |
|---|---|---|---|---|
| fxP / fxE / fxS / fxO | ilerleme + io3 / sine / o3 | yok | evet | `MH.p` · `MH.e` · `MH.ease` |
| fxSettle · fxNudge · fxVib | oturma, tepki itmesi, titreşim | yok | evet | `MH.settle` · `MH.nudge` · `MH.vib` |
| fxMC · fxCR | monoton kübik · Catmull-Rom | yok | evet | `MH.keys.monotone` · `MH.keys.catmull` |
| FXCam + fxCamAt + fxProj | perspektif dolly / tilt / orbit / roll | yok (sayılar world'den) | evet (matematik) | `MHCam` · `MH.cam.at` · `MH.cam.project` |
| camDrift | iki frekanslı drift | yok | evet | `MH.drift` (dalga world'den) |
| fxSlide (K-07) | kayış + gölge önce + yönlü bulanıklık | yok | evet | `MH.mek.sweep` + `MHSweep` |
| FXFold | menteşeli yaprak kalkışı (rotateX, kıvrım, ışık, DoF) | malzeme ve arka yüz rengi | mekanik evet, malzeme hayır | `MH.mek.fold` + `MHFold` (yüzler children) |
| seyahat hamlesi | crane-up → travel → crane-down | yok | evet | `MH.mek.travel` (+ `chain`) |
| FXStroke · fxPoly* | dashoffset çizimi, uç konumu | yok (renk parametre) | evet | `MH.poly.*` |
| p4Tz (yamuk) · p6Herm | sabit hızlı profil, uç hızlı Hermite | yok | evet | `MH.mek.prof('yamuk')` · `MH.mek.arrive` |
| FXWrite | kırpmayla yazım + eğik kesim + uç izi + yazım içi oturma | font ve renk | mekanik evet | — (world ilkeli) |
| FXGuide | yazımdan önce kılavuz çizgileri | nesne kimliği (kütüphane imzası) | görünüş hayır; ön olay zamanlaması evet | — |
| rack (K-19) | aynı yuvada blur + opaklık + ölçek değişimi | yok | evet | — (world ilkeli) |
| fxShadowAt | yükseklik → gölge kayması / bulanıklık / a | ışık yönü | formül evet, yön hayır | `MHSweep` / `MHFold` `shade.fn` (world verir) |
| fxDof | z → σ | yok | evet | `MH.cam.dof` · `MH.mek.travel().dof` |
| FXMoBlur | 180° obtüratör hareket bulanıklığı | yok | evet | `MHMoBlur` · `MHMoBlurK` |
| fxLamp / fxLight | ışık havuzu, ışık önce varır | iskelet (laboratuvar ışığı) | lead fikri evet | — |
| FXPen | kalem basınç dokusu süzgeci + pişirme | değerler kaynak kaleme ölçülü | kısmi | `MHBakeSvg` |
| ölçüm aletleri · çizici · kaydedici · enstrümanlar · pafta · antet | nesneler ve iskelet | nesne kimliği / iskelet + palet | hayır (yalnız süreler) | — |

### 5.8 Paketteki mekanik ilkeller ve ölçümleri

`MH.mek` varsayılanları **genel** değerlerdir (`MH.mek.DEF`); yukarıdaki referans ölçümleri değildir. Her ilkel `plan()` ile kendi tepe hızını,
C1 payını (frame-check `velocity` tanımı) ve hamle sayısını raporlar; `motion-render motion-test mek-supurme | mek-katlama | mek-seyahat
[--props '<json>'] [--ref <klip>]` hazır test sahnesiyle klibi, hız grafiğini (piksel + tasarım) ve kontağı üretir.

| ilkel | genel varsayılan | profil / C1 | ölçü |
|---|---|---|---|
| `MH.mek.sweep` | out/in 0,8 s (tam sine rampa, r 1) · through 1,2 s (yamuk r 0,5) · ön olay 0,06 s · kalkış 4 px · pay 40 px · bulanıklık yok | carry: kadraj dışında hız sürer; tam örtme penceresi + `swap(T)` set değişimi | `velocity` (`__boxes`: `boxEntry`), `pop` exclude (`window()` → `hooks.windows`) |
| `MH.mek.fold` | 180° · 1,8 s hermite · ön olay 0,1 s / 4 px · kalınlık 0 · persp ZORUNLU | yüz değişimi göz düzleminde (`thEye`); yay hızı C1 | `velocity` (serbest kenar `boxEntry` poly) |
| `MH.mek.travel` | 2,4 s hermite (ya da `visible`) · pencereler up [0, 0,5] · travel [0, 1] · down [0,5, 1] · persp ZORUNLU · settle / DoF / tavan yok | tek hamle; settle varış hızıyla C1 eklenir; `quintic` C2 seçeneği | `velocity` + `moves` (`hook()` → `__camSpeed`); M-C, M-SEYAHAT |
| `MHMoBlurK` | MHMoBlur arayüzü + eşikte 1 px rampa | tamsayı cihaz pikselinde örnek, kutu çekirdeği (L sürekli) | `velocity` piksel izi; MEASURE M-ZS |
