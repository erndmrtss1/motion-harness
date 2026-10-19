# focusfx-paper — world dersleri (kütüphane; eski adı fx-lab)

> Bu dosya kütüphane world'ü **focusfx-paper**'ın ders kaydıdır (FocusFX FX-01 üretim world'ü; 1.0–1.1'de `examples/fx-lab`). Paket bu world'ü
> hiçbir projeye kendiliğinden vermez; kullanıcı seçerse (`/motion:init --world focusfx-paper`) projenin kendi ölçümleriyle uyarlanarak kullanılır
> (`../../SKILL.md` §8). Kaynak: üretimin world belgesi, kodu ve inceleme turları. Müşteri malzemesi (ad, logo, marka rengi, kare, ses,
> transkript, sözlük içeriği, ekrandaki metin) çıkarıldı (HK-37).

## Kimlik

- **Tek cümle:** reklam değil, araştırma laboratuvarı.
- **Sahne:** grafit masada duran teknik çizim paftası, açık laboratuvar ışığında. Işık soğuk gri, yumuşak, tek yönlü; anahtar üst-soldan. Kâğıt tam aydınlık.
- **Malzeme:** pafta kâğıdı (yordamsal diş ya da üretken plaka), milimetrik ızgara (vektör), grafit ve mürekkep mavisi çizgi, ölçüm aleti (cetvel, kalibre, kadran, osiloskop, çizici), aydınger.
- **Hareket grameri:** "yazılır, çizilir, ölçülür, üstü çizilir". Pop yok, fade yok, doğrusal easing yok.
- **Kamera dili:** tek pafta, kesme yok; kamera bölgeden bölgeye monoton kübik eğriyle varır ve tutar. Vurgu kamerada değil nesnede.
- **Amber yok.** Sıcak lamba dili ve sıcak ışıma bu world'e ait değildir.

## world.json değerlerinin kaynağı

| alan | değer | kaynak | not |
|---|---|---|---|
| `band` | [40, 58] | ölçüldü | look-dev 3 still %44.0 / %54.3 / %47.6; storyboard 11 panel %43.7–54.4; ilk hedef %40–55, üretimde genel bakış planları için %58'e açıldı |
| `edgeDark.maxFalloff` | 0.20 | ölçüldü | gri kart düşümü %15.3 (tavan %20); spot vinyet yok |
| `k1` | ink · 0.35 / 0.55 | kural (proje) | çekirdek tabanı 0.30 / 0.50'nin sıkı profili; kahraman = mürekkep/nesne maskesi (kâğıt değil) |
| `accent` | tek kırmızı vuruş kuralı (renk projeden) · signal · 1 | kural | filmin tek kırmızısı: tek cetvel çizgisi; metin kırmızı değil |
| `camera.maxPxPerFrame` | 30 | ölçüldü | oda zinciri geçişlerinde tepe ≈ 20 px/kare @1080p60; 30 tavan |
| `camera.stepJump` / `accel` | 2.5 · 0.15 / 2 | kural (çekirdek) | basamak 0; ardışık kare hız farkı ≤ %15, < 2 px/kare ölçülmez |
| `motion.toolMaxPx` | 57 | ölçüldü | alet görünürken ≤ ≈ 57 px/kare @1080p60 |
| `motion.settlePx` | 2 | kural | oturma 2 px; tepe > 2 px için `fxSettle` genliği ≥ 4.6 |
| `motion.writeGlyphsPerSec` | 12 | varsayım | yazım hızı üst sınırı; projede ölçülerek güncellenir |
| `grade` | light + parametreler | kod | curves 0.990 beyaz, colorbalance bs .015 bh .008, nötr-soğuk siyah noktası 8/9/10, vinyet YOK, saf siyah 0.2 s |
| `supersample` | 0.5 / 6 / 6 / 1.5 / 1.9 | ölçüldü (Chromium) | k < 0.5 aralıkları 2×; k ≥ 1.5'te kahraman S× katmanda; kenar ≤ 1.9 px |
| `classes` | signal, redInner, redLoose, inkNavy, darkNeutral, metal, emptyBlack, visible | ölçüm araçları | aynı kırmızı için beş farklı tanım vardı; tek kayıt adlandırır |

## Ölçümler

- **Bant (look-dev):** v1 %34.4 (spot havuz) → v2 ortalama %48.6. Açık laboratuvar ışığı bandı ~14 puan yükseltti.
- **Işık düşümü:** gri kart (`MH_CARD=1`) %15.3; kenar etiketi düşüm bölgesinde 3.7:1 ölçüldü (bkz. W-01).
- **En düşük metin kontrastı:** 3.8 → 4.74 (≥ 4.5).
- **Kalem basınç dokusu:** feTurbulence 0.045 + yer değiştirme 1.8 (≤ 1 px), basınç 0.007 → dilate 0.8, diş 0.85. Canlı maliyet ≈ 1.1–1.2 s/kare; pişirmeyle (`FXPen` → `MHBakeSvg`) 7.3 → 2.3 s/kare.
- **Look-dev anı:** sahnede son yazılan öğenin yazım bitişi + 6 kare (kelime anı ≠ yazım anı).
- **İkincil hareket:** ışık nefesi pozlama ±%1.2 / 5.3 s, tepki itmesi 2 px / 0.35 s, uç titreşimi 1.5 px / 0.3 s; her shot'ta en az biri.
- **Drift:** k 0.35 + shot başına sabit eğim (rz ±0.8°).

## Tuzaklar

| # | tuzak | ders |
|---|---|---|
| W-01 | Kenar etiketi ışık düşümünde kalır (3.7:1) | koyu grafit 700; toz/doku notun altından alınır |
| W-02 | Antet başlığı hücreye sığmaz (160 px display ≈ 1350 px) | hücre 0.78 w, başlık 116 px; yerleşimden önce `fxTW` ile ölç |
| W-03 | Yazım anı ≠ kelime anı | kelime başında metin henüz yoktur; look-dev karesi yazım bitişi + 6 kare |
| W-04 | `mask-image` taşıyan kap izole grup kurar; içindeki multiply boş zemine uygulanır | karışım modu maskeli kabın KENDİSİNDE, içerik normal (`FXPlateBox`) |
| W-05 | Plakanın kendi ızgarası, maskeleme sonrası ince açık çizgiler bırakır | plakanın izleri silinip doldurulur (normalize evrişim); maske yok |
| W-06 | Restyle "fazla iz" ölçüsü ızgaraya kanar | eksene paralel ≥ 20 px koşular dışarıda; ölçü karar değil işaret |
| W-07 | Üretken model kâğıt dışı nesne (kalem, silgi, rakam) çizebilir | çizgi maskesi yalnız vektörün 6 px komşuluğunu açar; yabancı nesne bekçisi |
| W-08 | Plaka yoksa yordamsal kâğıt daha açık (bant %62–64) | kâğıt tonu (`paperTone`) + kadrajda masa payı; plakalı ve plakasız kâğıt tonu eşit |
| W-09 | Kesmeye çok yakın biten son vuruş | son vuruş kesmeden ≥ 0.25 s önce; ölü açılış ≤ 1.3 s; çizimler arası ≤ 0.6 s |
| W-10 | Koyu son kart world dışında çizilirse ışık nefesi ve gren kopar | son kart da `FXWorld` içinde (nefes + gren); siyah kart yok, son kare pozlamayla siyah |
| W-11 | Üretken klip gelene kadar siyah yer tutucu kahramanla yarışır | yer tutucu beklenen ton (`placeholder` #55595F), hareketsiz |
| W-12 | Türetilmiş plaka geometri değişince bayatlar (öksüz ok, çift çizgi) | her geometri yamasından sonra bayatlık denetimi; bayatsa yeniden üret |
| W-13 | Kâğıt kenarı ölçümü tam sınırda yapılırsa kenar kararması kaçar | kenardan ≥ 12 dünya px içeriden ölç; kahraman–kâğıt kenarı ≥ 50 dünya px |
| W-14 | Kaydedici kirişi / alet gövdesi komşu metni örter | kiriş bastığı hücrenin çizgileri içinde biter; izdüşüm denetiminde kiriş ∩ metin = 0 |
| W-15 | Tek noktalı görünürlük kapısı yönü bilmez; kenara itilen alet sonraki bölgede yeniden görünür | çıkış yönüne göre doğru ucu denetle; çıktıktan sonra zamanla kalıcı kilit |
| W-16 | 3B alet parçaları (kalem gövdesi ≈ 46 px) izdüşümde yukarı taşar | örtme denetimi kiriş değil gövde + yükseklikle yapılır |
| W-17 | Halka çizen kalemin gövdesi yazılmış glifleri örter | gövde açısı yol boyunca dinamik programlamayla; kare başı dönüş ≤ 10° |
| W-18 | Donmuş (önceki bölümden kalan) paftada `data-hero` yok → K1 ölçülemez | yalnız `MH_INKMASK` modunda seçiciyle görünür kıl; `k1.keys` ile ölç |
| W-19 | Masa malzemesi genel bakışta kâğıtla yarışır | masada −%40 kontrast + ≈ 2 px derinlik bulanıklığı |
| W-20 | Işık çekilişi havuz daralmasıyla başlarsa iris/spot dairesi oluşur | önce pozlama, havuz en son ve az (%35, düşüm ≤ 0.45): lamba kısılması |
| W-21 | Alet kadraj dışındayken gölgesi kadraja düşer | giriş/çıkış denetimi gölge ucunu da kapsar |
| W-22 | Tutuş anında kadrajda alet kalır | alet tutuştan önce çıkar |
| W-23 | Kimliksiz `FXPen` örnekleri aynı süzgeç kimliğini paylaşır, biri kırpılır | her `FXPen`'e tekil `bake` |
| W-24 | Pişirilmiş içeriğe eklenen boş koşullu çocuk imzayı değiştirir → canlı süzgeç, "bayat" kareler | yeni öğe ayrı `FXPen`; aralık dışı kareleri probe ↔ kayıtlı karşılaştır |
| W-25 | Işık nefesi × gradyan durağı 8-bit yuvarlanır; uzun tutuşta 1/255 basamak | uzun tutuşta (genel bakış) nefes genliği kamera ölçeğine bağlı 0 |
| W-26 | Tek aksan, aynı renkte büyük bir kütle yakındaysa sulanır | vuruşun ±2 s çevresinde başka kırmızı kütle küçük ya da kadraj dışında; konum taramasıyla doğrula |
| W-27 | İnce mono metin (17–22 px, 500) lacivert mürekkepte 3.4–3.8:1 | okunacak mono metin `ink` (mavi-siyah) 600 |
| W-28 | Genel bakışta bağ çizgisi incelir | ekranda ≥ 5–6 px (kalınlık ≈ 6.5 / k) |
| W-29 | Tepki itmesi kamera sürüklenmesine ters yönde verilirse ekran hızı tek karede ≈ 0 | itme yönü sürüklenmeye dik ya da aynı yönde; faz 0 (hız darbesi) |
| W-30 | Ön plan aleti ekran uzayında süzülürse ucuz durur | ön plan nesnesi masada yatar: temas gölgesi, kadraj kenarında yarısı dışarıda, ≤ 2 px bulanık, kahramanı örtmez; paralaks ±260 px |
| W-31 | "Her shot hareketli" sürekli kaymaya döner | kamera varır ve okutur; hedef hareketli pay ≈ 0.6 |
| W-32 | Oturma genliği 2 verilince tepe 2 px'in altında kalır | `fxSettle` genliği ≥ 4.6 (tepe > 2 px) |
| W-33 | Kalem dokusu metne uygulanırsa okunurluk düşer | doku yalnız diyagram çizgisine; metin, ızgara, alet, pencere dokusuz |
| W-34 | Aksan çizgisi kalem süzgecinden ve ışık çarpanından geçince rengi kayar: grade sonrası ΔE 5–6, QC aksan çekirdeğinin altına düşer, kenarları ikincil sınıf (bordo) sayılır | aksan süzgeç DIŞINDA çizilir; kaynak rengi ışık çarpanına göre telafili (`accentSrc` → ekranda ≈ `accent.color`; renk projeden); çizgi kalınlığı ≥ 9 px (1080p); doğrulama grade'li çıktıdan ΔE2000 ≤ 3 |

## Proje kararları (FocusFX §1–§28, damıtılmış)

> Kaynak: FocusFX faz kararları (§1–§28), tur retroları ve bağımsız reviewer kayıtları. Biçim: **kural** — kısa gerekçe · *faz*.
> Sayılar o üretimde ölçüldü; yeni projede yeniden ölçülür. Proje içeriği, film metni ve marka öğeleri çıkarıldı; logo varlığı projeye aittir.
> Aynı ders yukarıdaki tuzak tablosunda varsa kimliği (W-xx) yanında durur.

### Kimlik ve içerik

- **Film dili araştırma laboratuvarıdır, reklam değil; amber ışık ve markanın sıcak motifi girmez.** — Brief'in tonu ciddi, sakin, hassas bir mühendislik tanıtımı. *F0*
- **Finansal mekanik konudur, vaat yasaktır.** — Her çizim bir finansal mekanik nesnesidir (derinlik grafiği, emir defteri merdiveni, test tablosu, işlem aracı, seans profili, test grafiği, kural akışı); para birimi, getiri, kâr ekranı, lüks yok. *F4-B*
- **Anlatımla ilgisiz metafor yasak (makine parçası, kesit, burç, kumpas).** — Nesne cümlenin görseli olmalı; konuşulan kelime metaforu adıyla çağırırsa yalnız kullanıcının açık evetiyle. *F4-B · F5-B*
- **Fiyat-çubuğu grafiği klişesi yasak; tek çubuk nesne olarak serbest.** — Klişe kimliği tüketir; tek çubuk ölçülen bir nesne olarak iş görür. *F0 · F4-B*
- **Veri dili yalnız oran ve istatistiktir; sayılar sentetik, tohumlu, tutarlı.** — Gerçek kural sanılabilecek özgül sayı yok; eşikler sembolik kalır. *F5*
- **Shot başına nesne sözlüğü tasarımdan önce kullanıcı onayına gider.** — İçerik kararı tasarım turunu boşa harcatmasın; şablon `SOZLUK-SABLON.md`. *F4-B · F5*
- **Kaynaklı içerik kaynaktan aynen gelir; glif glif kaynak kırpımıyla doğrulanır.** — "Görünür ama okunmaz" ara çözümü kalktı; uydurma ve tamamlama yok. *F2-C → F6-B*
- **Aday ailesi eleme kuralı adaylar sunulmadan önce sorulur.** — Bilinen eleme kuralı sorulmadan sunulan aday listesi bütünüyle reddedildi. *F6-B*
- **Enstrüman gerçektir; "kelime + şekil" yasak.** — Osiloskop = gövde + ızgaralı ekran + iz + düğme; merdiven ≥ 16 seviye; gösterge gerçek eğri. *F3-ACİL (K5)*
- **Envanter tabandır, tavan değil.** — Envanterle yetinen ilk perde seyrek kaldı ve reddedildi; eksik bileşen yazılır. *F3-ACİL*

### Kamera

- **Tek pafta, kesme yok; kamera varır, okutur, devam eder.** — İlk animatikte kamera hiç durmadı (hareketli pay 0.97); okuma ve hiyerarşi bozuldu (W-31). *F3-ACİL*
- **Kamera eğrisi monoton kübiktir; Catmull-Rom anahtarı yok.** — Catmull-Rom aşma ve savrulma yaptı. *F3-ACİL*
- **K3 iki ölçüyle geçer: perde OURS ≥ 0.4 ve shot başına kamera hızı payı ≥ 0.4.** — Blok eşleme yavaş pan'ı sayamadı; pay mutlak eşikle (≥ %2 ekran genişliği/s) ölçülür. *F5-B*
- **Kamera ivmesi uyarıdır, kapı değil: ardışık hız farkı ≤ %15, taban 2 px/kare.** — Onaylı kamera dilinin kalkış ve varışları kuralla çakıştı; dil korundu. *F3-C · F4*
- **Basamak 0; vurgu kamerada değil nesnede.** — Damgaya eklenen 1 karelik kamera darbesi basamak sayıldı, kullanıcı reddetti. *F8*
- **Ara anahtarda bileşen yön değiştirmez; odalar kamera yönünde zincirlenir.** — Yön değişimi hız basamağı ve görünür duraksama yarattı. *F5*
- **Genel bakışa çekiliş tek ve sürekli; hız ≤ 30 px/kare.** — Bütün pafta tek hareketle okunur; basamak yok. *F7*
- **Kâğıt kenarına ≥ 50 dünya px kamera payı; kenar testi ≥ 12 px içeriden.** — Kenara 18 px tasarlanan düzen pay bırakmadı; tam sınırda ölçüm kararmayı kaçırdı (W-13). *F4-B*
- **Eğik kamerada konum, mesafe ve eğim birlikte ızgarada taranır.** — Tek değişkenle düzeltme iki kenar koşulunu birden tutturamadı. *F4-B*
- **Genel bakış geometrisi render öncesi aramayla sınanır.** — "Masa ≤ %25" hedefinin ulaşılamaz olduğu 1207 adayla gösterildi; sayıyla gerekçe yazıldı. *F7*
- **Hareket bulanıklığı shutter 180°: kare başı > 3 px'te 0.5 × yer değiştirme, yalnız kamera hareketinde.** — Saf dolly bulanıklaşmaz; 60 fps'te yarı; uzun izde (> 12 px) 9 örnek. *F3-C*
- **Bulanık sonuç kaynağın üstüne bindirilir.** — Ata kırpması kadraj dışını çizdirmedi, kenar karardı. *F3-C*
- **Hareket bulanıklığının eşikte yumuşak başlangıcı borçtur.** — Kalkışlarda kenar enerjisi sıçradı; düzeltmesi bütün perdeleri yeniden çizerdi. *F8 · F9*

### Hareket grameri

- **Yazılır, çizilir, ölçülür, üstü çizilir; pop ve fade yok.** — Kimlik okuması; fade yalnız sahne sonunda, ışıkla. *F0 · F2-B*
- **Damga yerine cetvel çizgisi; üstünü çizmek ayıklamaktır, karalamak değil.** — Darbe dili kimliğe aykırı; son karttaki damga sarsıntısız, kayıtlı istisna. *F0 · F8-B*
- **Doğrusal easing yasak: hareket power3 in/out, çizgi ease-in-out, varış power3 out.** — Doğrusal hareket "makine" değil "yazılım" okuttu. *F2-B*
- **Oturma 2 px'i aşar.** — Küçük oturma görünmedi; genlik ölçülerek seçilir (W-32). *F3-ACİL (K8)*
- **Hiçbir öğe aynı anda başlayıp bitmez; ofset ≥ 3 kare.** — Eşzamanlı başlangıç mekanik okundu. *F3-ACİL (K8)*
- **Hiçbir öğe tek karede değişmez; temsil değişimi sıralı rampadır.** — Bölme, çerçeve, gölge ve tarama aynı karede belirdi (SERT K8); sıra: çizgi → gölge kopar → ayrılma → çerçeve. *F9 · F9-B*
- **Her shot'ta en az bir ikincil hareket; tepki itmesi faz 0, sürüklenmeye ters değil.** — Ters itme kâğıdı tek karede durdurdu (W-29). *F2-B · F4-B*
- **Bileşen yoğunluğu: shot başına ≥ 4 motor bileşeni, 3 katman, sürekli kamera, 1 geçiş, 1 ışık olayı, ≥ 2 ikincil hareket.** — Altı "yerleştirme" sayıldı ve geri döndü. *F3-ACİL (K6)*
- **Ön plan nesnesi masada yatar; yalnız anlatımda işi varsa görünür.** — Ekran uzayında süzülen alet ucuz durdu; ölçüler W-30'da. *F3-B*
- **Kadrajda tek alet; tutuşta alet yok.** — İki alet odağı böldü; tutuşta kalan alet hata gibi okundu (W-22). *F8*
- **Nesne girişi fizikseldir: kablo serilir, uç taşınır; atılan nesne kelime üstünden geçmez.** — Atılan kıskaç ve kendi kendine uzayan kablo hata okuttu. *F3-B*
- **Kablo yoldur, kompozisyon öğesi değil: ≤ 6 px, kâğıt kenarından, metin üstünden geçmez.** — Örten kablo kaldırılır. *F3-B*
- **Çıkış yolu kamera hareketi eklenerek hesaplanır; çıkış yavaşlamadan biter.** — Pan sırasında yavaşlayan alet kadrajdan çıkamadı. *F4*
- **Görünürlük zaman eşiğine değil ilerlemeye ya da izdüşüme bağlanır.** — İlerleme kapısı öğeyi tek karede belirtti. *F4*
- **Kelime değişiminde çıkan bulanıklaşır, giren kısa gecikmeyle yazılır.** — Rack içinde tek karede değişen kelime K8 sayıldı. *F9-B*

### Yazım

- **Tipografi kahramandır: vurucu cümleler kelime zamanlı yazılır.** — Çekirdek varsayılanın ("konuşulan kelime yazılmaz") bilinçli tersi; vuruş listesi kullanıcı kararı, kalan konuşma yazılmaz. *F0*
- **Lyric display ≥ 160 px.** — Daha küçük vuruş kahraman olamadı. *F3-ACİL (K1)*
- **El yazısı zamanı yola orantılı; ≤ 12 glif/s; sığmazsa satır bölünür, kısaltma yok.** — Glif başına eşit zaman kalemi zıplattı. *F6-B*
- **Halka çizen kalemin gövde açısı yol boyunca seçilir.** — Gövde yazılmış glifleri örttü (W-17). *F6-B*
- **Etiket ve metin her zaman yazılarak gelir; çizgilerden ve aletin varışından sonra.** — İlerlemesiz beliren etiketler ve aletin örttüğü etiket hata okuttu. *F4 · F5-B*
- **Uzun basılı metin kaydedici kafayla tek geçişte basılır; lyric değildir, ≥ 4.5:1.** — Tanım satırı yazım değil baskı diliyle okunur. *F4-B*
- **Display tracking −0.02em; 3 seviye hiyerarşi; büyük harf doğrudan yazılır.** — `text-transform: uppercase` Türkçe glifi bozar. *F2-B*
- **Türkçe büyük harfte satır aralığı ≥ 1.2 × punto; kesik metin glif sınırıyla denetlenir.** — İ noktası cap kutusunda kaçtı, üst kenarda kesildi. *F4-B · F8*
- **Glif kapsamı ölçülür; matematik glifleri ayrı yüzden, alt/üst simgeler aynı aile adıyla ayrık aralıktan.** — Mono alt kümede ≥ ≤ ve alt simge yoktu; matematik yüzü alt/üst simge taşımıyordu. *F4-B · F5-B*

### Kılavuz çizgileri

- **Harf kılavuzu (büyük harf üstü + taban) yazımdan önce cetvelle çekilir.** — Yazım ölçülerek başlar; lyric kılavuzu yazımdan ≈ 0.4 s önce. *F2-B · F3*
- **Kılavuz ve yapım çizgileri yazımla aynı karede başlamaz (0.25–0.5 s ofset).** — K8 ofseti çizgi ailesine de uygulanır. *F3*
- **Kılavuz kâğıt kenarından ≥ 20 px içeride biter.** — Kenara taşan kılavuz hata gibi okundu (reviewer). *F4*
- **Kılavuz yalnız motor çizgisidir; plaka ya da doku katmanına girmez.** — Plakaya giren kılavuz çift kontur yaptı. *F2-B*
- **Tutuşta kılavuz ucu kadraj kenarında yarım kalmaz.** — Kenarda ≈ 15 px uç kaldı; kamera kaydırıldı. *F6*
- **Genel bakışta bağ çizgisi ekranda ≥ 5–6 px; hedef görünür olunca varır.** — İnce bağ genel bakışta kayboldu (W-28). *F7*

### Merdiven etiketleri

- **Seviye etiketleri göreli (taban ± adım), fiyat ya da tutar değil.** — Veri dili kuralı; etiket mono ve `data-doku`. *F4-B · F5*
- **≤ 20 px etiket doku sayılır, okunacak metin değil.** — Okunurluk tabanı (≥ 22 px) yalnız okunacak metne uygulanır. *F3-ACİL*
- **Etiket opaklıkla tek tek belirmez; yazım ya da hareketle gelir.** — Opaklık tek başına geçiş değildir (reviewer); ilk perdede kalan hâli teknik borç. *F9-B · F10-B*
- **Seviyeler anlatımdaki fiile kilitli dolar ve boşalır.** — Ölü tutuş sesle canlandı; dolum ve boşalma kelime anında. *F2-B · F5*
- **Kafa kirişi ve 3B gövde etiket satırını örtmez.** — Kafa gövdesi harf ayaklarını 12–15 px örttü; denetim gövde yüksekliğiyle (W-14, W-16). *F5*

### Taralı vurgu

- **Taralı vurgu bu world'ün imzasıdır: 45° vektör tarama, mürekkep mavisi; dolgu değil vurgu.** — Teknik çizimde vurgu renkle değil taramayla yapılır (`FXHatch`). *F4-B*
- **Tarama iki tonludur: grafit (nötr), mavi (vurgulanan).** — Merdivende üst yarı grafit tarama, alt yarı mürekkep yıkaması, vurgulanan seviye mavi tarama (`FXLadder`). *F3-ACİL · F5*
- **Koruma alanı grafit taramadır, kırmızı değil.** — Tek kırmızı vuruş kuralı (renk projeden) taramaya harcanmaz. *F4-B*
- **Tarama soldan açılır ve çizgiden sonra gelir; tek karede belirmez.** — Çubukta taramanın çerçeveyle aynı karede belirmesi K8 ihlaliydi. *F9-B*
- **Taralı yer tutucu render'a girmez.** — Yer tutucu kahramanla yarıştı; klip yoksa shot motorla çözülür (K4). *F2 · F3-ACİL*

### Kâğıt, ışık, grade

- **Açık laboratuvar ışığı: spot vinyet yok, tek yönlü yumuşak anahtar, kâğıt tam aydınlık.** — Spot havuzlu ilk sürümde bant %34.4'tü, kenar etiketleri karanlıkta kaldı. *F2-B*
- **"Kenar karanlığı ≤ %20" ışık düşümüdür (gri kartta), masa payı değil.** — Ölçü iki türlü okunabiliyordu; tanım yazıldı. *F2-B · F2-C*
- **Pafta her shot'ta zemindir; plaka zemini katman sayılmaz.** — Zemini katman saymak motor payını sıfırlıyordu. *F2-C*
- **Plakasız kâğıt plakalı kâğıtla aynı tondadır.** — Ton sıçraması ve düz kâğıt "malzemesiz" okundu; ton + yordamsal lif/benek (W-08). *F2-B*
- **Renk derinliği: kâğıt sıcaklığı, mürekkep çeşitleri, soğuk gölge rengi; kıyas sayfasıyla.** — Tek tonlu düzlük UCUZ işaretine yaklaştı. *F3-ACİL (K8)*
- **Genel bakışta masa malzemelidir (grafit, plaka, gren); −%40 kontrast, hafif bulanıklık.** — Düz koyu masa ucuz okundu (W-19). *F7*
- **Pozlama kamera ölçeğine bağlı açılır; genel bakışta nefes ve havuz dışı düşüm kalkar.** — Genel bakış bandın altına düştü; nefes uzun tutuşta 1/255 basamak verdi (W-25). *F7*
- **Kadrajı dolduran aydınlık kâğıt bandı sıçratır; pozlama telafi edilir.** — Pencere kalkınca bant %57.8'e çıktı. *F2-C*
- **Işık çekilişi lamba kısılmasıdır: önce pozlama, havuz en son ve az.** — Havuzla başlayan çekiliş iris/spot okuttu (W-20). *F8*
- **Siyaha iniş ve küçük pozlama değişimi post'ta, kayan noktada, dither'la.** — Sayfa örtüsü 8-bit alfaya yuvarlandı; küçük düşüşte duruk dikdörtgen dither, inişte TPDF. *F8 · F9*
- **Grade lab zinciri: vinyet yok, sıcak parlak yok; saf grade geçişi yalnız film sonunda, kare kare.** — Sahne sonu saf siyah penceresi inişte basamak üretti; perde kesitlerinde kapanış yok. *F2-C · F8 · F9*
- **Işık vuruşu ölçülmüş bir renk sınırını taşıyorsa önce probe edilir.** — Havuz %30 daralınca ton ΔE sınırını aştı; %20 kabul edildi. *F10 · F10-B*
- **Işık katmanının 8-bit yuvarlaması (≤ 0.35 Y) borçtur.** — Görünmez; bütün perdeleri yeniden çizmeye değmez. *F9-B*

### Bant ve K1

- **Bant %40–58; sayı görünüme uyar, tersi değil.** — İlk bant (%22–38) yalnız güçlü spotla tutuyordu; açık ışık %40–55'e, genel bakış %58'e açtı. *F2-B · F4*
- **Bant aşımı yerelde düzeltilir.** — Kısa bir aralıktaki %58.1–58.8 için yalnız o aralıkta −%1.5 pozlama, iki uçta rampa. *F9*
- **K1 kahramanı mürekkep/nesne maskesidir, kâğıt değil: alan ≥ %35 ya da yükseklik ≥ %55.** — Aydınlık kâğıt "en büyük parlak bileşen" olarak kahramanı yutuyordu. *F3-ACİL*
- **K1 maskenin bütünüyle ölçülür; maske kuralı world köküne kapsanır.** — Çizim yığını tek nesnedir; geniş seçici sahne sarmalayıcısını da gizledi. *F3-ACİL*
- **Donmuş paftada kahraman yalnız ölçüm modunda işaretlenir.** — Önceki perdeden kalan paftada `data-hero` yoktu (W-18). *F7*
- **Son kart K1'i yükseklik ölçütüyle geçer; kart ölçeği maskeyle ölçülerek seçilir.** — İnce öğeler maskeye girmedi; ilk kart %51'de kaldı. *F8-B · F11*

### 60 fps

- **Proje 60 fps; karar yan yana test render'ıyla verildi.** — 30/60 kesiti aynı kodla izlendi; savrulma kopyaları 60'ta eridi. *F3-C · F4*
- **fps tek kaynaktan; QC kare eşikleri saniyeden hesaplanır.** — Sabit kare eşikleri 60 fps'te süreleri yarıya indirdi. *F4*
- **Animatik 960×540 / 30 fps.** — 15 fps kasıyordu; perde başına ≈ 15 dk. *F4*
- **Üretken klip 60'a hareket kestirimli ara kareyle çıkar; tarama geçmezse kare tekrarı.** — Kredi 0; kabul taraması yeniden yapılır. *F4*
- **60 fps'te kare başı yer değiştirme yarıdır; bulanıklık ve ivme eşikleri buna göre.** — Eşik kareyle değil saniyeyle tanımlanır. *F4*

### Süper örnekleme ve keskinlik

- **Genel bakış (k < 0.5) aralıkları 2× + 2×2 indirme; yakın planlar 1×.** — Eğik küçük metin mipmap'siz küçültmede kare kare düştü. *F7 · F8*
- **2× / 1× sınırında iki çözünürlük karıştırılır.** — Sınırda kenar enerjisi +%37 sıçradı. *F8*
- **k ≥ 1.5'te kahraman kendi 3B katılımcısında S× çizilir.** — 3B büyütme düzlemi yumuşatır (kenar ≈ 1.65 px × k); DPR ve `will-change` düzeltmedi. *F10 · F10-B*
- **S öğe türüne göre ölçülür; aynı karttaki kahramanlar ±%10 eşit keskin, ≤ 1.9 px.** — Aynı S'de metin yoldan yumuşak rasterlendi (2 → 2.25–2.5). *F10-B · F11*
- **Keskinlik teşhisi düzeltmeden önce, sayıyla.** — Brief'in "pişirme/süzgeç" varsayımı ölçümle geçersiz çıktı. *F10*
- **S× kuralı geriye dönük uygulanmadı; eski yakın plan kahramanlar borçtur.** — Teslim edilmiş perdeleri yeniden çizmek kapsam dışıydı. *F10-B*
- **Büyük pafta katmanı genel bakışta karo bellek sınırına takılır.** — Pafta sessizce çizilmedi; sahne başı GPU bellek bayrağı. *F7*

### Kalem dokusu ve pişirme

- **Kalem basınç dokusu yalnız diyagram çizgisine; metin, ızgara, alet dokusuz.** — Üretken yeniden çizim durdu; doku motorda süzgeçle verilir (W-33). *F2-C*
- **Durağan süzgeçli içerik bir kez pişirilir; render hedefi ≤ 5 s/kare.** — Asıl maliyet süzgeç bölgesiydi (7.3 → 2.3 s/kare). *F3-B*
- **3B katman ≤ 12/kare; raster'a çevirme kararı ölçümle.** — Hedef tutunca kırışık süzgeci ve alan derinliği raster'a çevrilmedi. *F3-B · F3-C*
- **Her pişmiş kalem öğesinin kimliği tekildir.** — Kimliksiz öğeler süzgeç kimliğini paylaştı, görünmedi (W-23). *F5*
- **Pişmiş içeriğe yeni öğe eklenmez; ayrı öğe olur.** — Boş koşullu çocuk imzayı değiştirdi, kareler bayat göründü (W-24). *F9-B*
- **Aksan çizgisi süzgeç dışında çizilir.** — Süzgeçten geçen aksan grade sonrası ΔE 5–6 kaydı (W-34). *F7*
- **Paylaşılan bileşene eklenen parametrenin varsayılanı eski çıktıdır.** — Diğer perdeler imgdiff 0 kalmalı. *F9-B · F10-B*

### Son kart

- **Son kart world içinde, kâğıt üstündedir; siyah kart yok.** — Ayrı kart nefesi ve greni koparıyordu (W-10); sözlükteki "siyah zemin" ifadesi hataydı. *F2-C · F5*
- **Logo varlığı projeye aittir; world yalnız yerleşim, damga ve baskı dilini verir.** — Marka kararları world'e taşınmaz. *F11*
- **Marka bloğu damgayla gelir: sarsıntısız, ilk karede tam, mürekkep oturması 0.82 → 1 / 0.25 s, kenarda tohumlu ±0.3 px yayılma.** — Bulanıktan netleşen damga baskı gibi okunmadı. *F10*
- **İkinci satır kaydedici kafayla tek geçişte basılır; kiriş ∩ üst blok = 0.** — Kiriş üst bloğun tabanını ≈ 0.6 s örttü. *F8-B*
- **Damga anında ışık havuzu karta daralır; tutuşta gren −%30, nefes 0.** — Vuruş ışıkla verilir, kamerayla değil. *F10*
- **Sessiz kuyruk: konuşma sonu + 0.8 s tutuş + 1.0 s çekiliş + ≥ 4 kare siyah.** — Kelime içinde başlayan çekiliş kartı okunmadan söndürdü; kuyruk K3 dışı. *F8-B*
- **Tutuş aletsizdir; son kareler mp4'te Y 16 doğrulanır.** — Ham karede temiz iniş encode'da basamak verdi. *F8*
- **Kart kadraj ortasına yakın; önceki kutular tamamen dışarıda.** — Yarım kesik kutu ve yarım simge yanlış okundu. *F8*

### Ses ve vuruş kilidi

- **Ses yönetir: kesme ve vuruş cümle sınırına ya da durağa kilitli.** — Shot uzunluğu hedefi ses yapısıyla çelişirse ses kazanır. *F0*
- **Fiziksel olay (çentik, damga, çizgi) kelimeden ≤ 1 kare sonra gelir, anında tam.** — Öne düşen olay ses–görüntü kopukluğu yaptı. *F6*
- **Vuruş zamanı kelimenin akustik başlangıcına çapalanır.** — Transkripsiyon duraktan sonraki kelimeyi 0.1–0.25 s erken koydu; damga 9 kare önce kaldı (bilinen sapma). *F12*
- **Ses değişince önce hizalanır; tasarım zamanı korunur, eşlem çevirir.** — Yeni çekim kesik kopya değildi; kayma sürekli değişti. *F5-B · F11*
- **|Δ| ≤ 33 ms kayan shot aynen kalır; kalanlar eşlemle yeniden çizilir.** — Gereksiz yeniden render önlenir. *F5-B · F11*
- **Yeni perde doğrudan yeni ses zamanında tasarlanır.** — Eşlem yalnız önceden tasarlanmış perdeler içindir. *F6*

### Üretken katman dozu

- **Katmanlar: A üretken hareket ≤ %25, B üretken yüzey ≥ %40, C yalnız motor ≥ %30; pafta/gren zemini katman sayılmaz.** — İlk tanım C payını sıfırlıyordu. *F2-C*
- **Üretken klip cümleyi anlatmaz, tek başına kare olmaz; motor katmanı her zaman üstte.** — Klip doku ve penceredir; anlatan motordur. *F0*
- **Üretken içerik yalnız soyut/makro: malzeme, mekanizma, akışkan, optik, alet yüzeyi.** — İnsan, el, yazı, grafik ekranı yasak; model sahte yazı bastı. *F0 · F3-ACİL*
- **Üretken yeniden çizim (restyle) durdu; diyagram çizgisi motorundur.** — Geometriyi korudu, çizgiyi korumadı; dikiş ve bayatlık (FXW-04). *F2-C*
- **Pencere küçük, vektör önde; tek kahraman.** — Büyük koyu pencere kahramanla yarıştı; pencere ekranın ≤ %45'i. *F2-B · F5*
- **Yer tutucu render'a girmez; taslakta beklenen tonda ve hareketsiz.** — Siyah disk kahramanla yarıştı (W-11). *F2-B · F3-ACİL (K4)*
- **Anlatıma katkısı olmayan pencere kaldırılır; pay hedefinin altına düşmek kabuldür.** — Doz hedefi kalite için araçtır. *F6-B*
- **Üretken klip kabulü kare karedir, kontaktan değil.** — Kontaktan kabul edilen klipte geometri kırığı çıktı. *F2-B*

### Reviewer bulguları (world'e dair)

- **Kadraj kenarında kesik kelime ya da yarım simge kalmaz.** — Üst kenarda İ noktası kesildi; yarım simge başka simge okundu. *F4-B · F8*
- **Alet çıkışı kadraj dışı doğrulanana kadar görünürlük açık kalır.** — Pan sırasında alet kenarda durup geri kaydı. *F4*
- **3B alet gövdesi örtme hesabına girer.** — Kafa üst kapağı yazıyı örttü; hesap yalnız ucu alıyordu (W-16). *F5*
- **Kablo farklı düzlemleri gerçek 3B eğriyle bağlar.** — Ekran parçası 15–20 px paralaks kırığı ("raf") yaptı. *F3-C*
- **Düz aksan çizgisi arayüz çizgisi gibi okunur; ±0.5 px tohumlu kalınlık dalgası alır.** — Dalga düzlem raster ızgarasına göre ayarlandı, iki yöne simetrik. *F7 · F9*
- **Işıkla açılış tek karede kalkmaz; ilk 0.1 s yumuşak kalkış.** — Açılışta kare ortalaması birden sıçradı. *F9-B*
- **540p kontrol tam çözünürlük kararının yerine geçmez.** — Kontrast, ΔE ve küçük metin örtüşmesi ancak 1080p'de çıktı; bir perde iki kez render edildi. *F6 · F7*
- **Ön plan beş soruyla denetlenir: yerde mi, gölge, örtme, bulanıklık, hata görünümü.** — Biri bile "hayır" ise geçmez; K2 sayımı tek başına geçersiz. *F3-B*
- **Tek kırmızı vuruştan önce büyük marka öğesi kadraja girmez.** — İniş rotası vuruşu ±2 s içinde sulandırdı (W-26). *F7*

## Paketin LESSONS'ından world'e özgü dersler

> Kaynak: `../../../motion-core/references/LESSONS.md`. Kural ve ayrıntı orada; burada yalnız bu world'deki bağlam.
> İki grup: (a) §9'daki world sınıfı kayıtlar (world = fx-lab) ve bu dosyadaki karşılıkları; (b) bu world'ün ilkellerinde doğup dilden bağımsız çekirdeği core'a geçmiş L-xxx dersleri.

### (a) §9 world sınıfı kayıtlar

| kimlik | ders (tek satır) | bu dosyada |
|---|---|---|
| world-1 | Işık düşümündeki kenar etiketi koyu grafit 700; toz notun altından alınır | W-01 |
| world-2 | Antet başlığı hücreye sığmaz; yerleşimden önce ölçülür | W-02 |
| world-3 | Plaka ızgarası maske deliği bırakır; izler silinip doldurulur | W-05 |
| world-4 | "Fazla iz" ölçüsü ızgaraya kanar; eksene paralel koşular ayrı sayılır | W-06 |
| world-5 | Plakasız yüzey daha açık kalır (bant %62–64) | W-08 |
| world-6 | Son kart da world içinde (nefes + gren); siyah kart yok | W-10 |
| world-7 | Plakasız ve plakalı yüzey tonu eşit | W-08 |
| world-8 | Kenar ölçümü ≥ 12 dünya px içeriden; kahraman–kâğıt kenarı ≥ 50 | W-13 |
| world-9 | Kaydedici kafa kirişi metni örtmez; kiriş hücre çizgileri içinde | W-14 |
| world-10 | Alet görünürlüğü yönle ve zamanla kalıcı kilitle | W-15 |
| world-11 | 3B alet parçaları (≈ 46 px) örtme hesabına girer | W-16 |
| world-12 | Halka çizen kalemde gövde açısı dinamik programlamayla | W-17 |
| world-13 | Kaynaklı notasyon dizgisi için matematik alt küme; glif kapsamı ölçülür | Proje kararları · Yazım |
| world-14 | Donmuş yüzeyde `data-hero` yalnız ölçüm modunda görünür | W-18 |
| world-15 | Masa genel bakışta yüzeyle yarışır (−%40 kontrast + 2 px bulanıklık) | W-19 |
| world-16 | Işık çekilişi lamba kısılmasıdır, iris değil | W-20 |
| world-17 | Alet K8 denetimi gölge ucunu da kapsar | W-21 |
| world-18 | Tutuş anında kadrajda alet yok | W-22 |
| §9 retro | Bant yalnız güçlü spotla tuttu; sayı görünüme uyar | FXW-01 · Bant ve K1 |
| §9 retro | Kenar etiketleri ışık havuzu dışında okunmadı; metin havuza | W-01 |
| §9 retro | Pencere kalkınca bant sıçradı; pozlama telafisi | Kâğıt, ışık, grade |
| §9 retro | Nesne girişleri fiziksel (alet dili) | Hareket grameri |
| §9 retro | Alet görünürlüğü yön + kutu + kilit; 3B parçalar örtmede | W-15 · W-16 |
| §9 retro | Işık çekilişi önce pozlama, havuz en son; tutuş aletsiz | W-20 · W-22 |
| §9 retro | Yazıcı kafa kirişi komşu metne taşar; kiriş ∩ metin = 0 | W-14 |
| §9 kullanıcı | Ön plan kuralı: yerde, temas gölgesi, ≤ 2 px, örtme ≤ %5, metin 0 | W-30 · FXW-07 |
| §9 kullanıcı (proje) | Konu/vaat ilkesi; ilgisiz metafor yasak | Kimlik ve içerik |
| §9 kullanıcı (proje) | Kaynaklı içerikte aday ailesinin elenmesi | Kimlik ve içerik |

§9'daki marka değeri ve marka varlığı kayıtları projeye aittir; burada yer almaz.

### (b) Bu world'de doğan core dersler

| kimlik | bu world'deki bağlam (tek satır) |
|---|---|
| L-001 | Pişmiş kalem içeriğine eklenen boş koşullu çocuk bile imzayı değiştirir; yeni öğe ayrı pişer |
| L-002 | Pişirme oturmadan alınan tek kare probe ≈ 0.09/255 sahte fark verir; tekrarla doğrula |
| L-003 | Işık nefesi × gradyan durağı 8-bit'e yuvarlanır; uzun tutuşta nefes 0 |
| L-004 | Küçük pozlama değişimi sayfa örtüsüyle yapılmaz; post'ta kayan noktada |
| L-005 | Siyaha iniş 16-bit + TPDF dither; son kare tam siyah |
| L-006 | Sahne içi küçük kazançta duruk dikdörtgen dither (rampalı dither ölü bölge yaptı) |
| L-007 | 3B kamera büyütmesi kenarı ≈ 1.65 px × k yapar; kahraman S× katmanda |
| L-008 | S öğe türüne göre ölçülür (SVG yol ↔ HTML metin) |
| L-009 | Genel bakış 2× süper örnekleme; 2×/1× sınırında karışım |
| L-010 | Büyük pafta katmanı karo bellek sınırında sessizce çizilmez |
| L-012 | Pafta düzlemi ≈ 1 texel/birim rasterlenir; aksan dalgası adım adım probe edilir |
| L-017 | 3B katman ≤ 12/kare; kare süresi ölçümle bilinir |
| L-021 | Maskeli kap izole grup kurar; karışım modu kabın kendisinde (plaka) |
| L-022 | 1×1 SVG'de kalem süzgecinin bölgesi orijinden uzanır; render süresinin asıl kaynağı |
| L-023 | Süzgeçli kap `overflow: hidden`; canlı ve pişmiş içerik aynı taşar |
| L-024 | Hareket bulanıklığı sarmalayıcısı sabit yapıda; bulanık sonuç kaynağın üstüne |
| L-025 | `userSpaceOnUse` desen başvuranın uzayında örneklenir; çubuk tarama bandı kaydı |
| L-033 | Paylaşılan bileşene eklenen parametrenin varsayılanı eski çıktı |
| L-049 | Aksan sınıfı `world.json → classes`'ta tek kayıt |
| L-059 | K1 maskesi kahramanın bütünü; maske kuralı world köküne kapsanır |
| L-064 | Render öncesi izdüşüm denetimi: masa payı, kesik metin, alet hızı, basamak |
| L-065 | Eğik kamerada iki kenar koşulu ızgarada birlikte taranır |
| L-066 | Genel bakış geometrisi render öncesi aramayla sınanır |
| L-073 | Kamera varır ve okutur; hedef hareketli pay ≈ 0.6 |
| L-074 | Basamak 0; vurgu nesnede (ölçek, mürekkep oturması) |
| L-075 | Monoton kübikte ara anahtarın yön değişimi hızı sıfırlar |
| L-076 | Pafta tepki itmesi kamera sürüklenmesine ters verilmez |
| L-079 | Alet görünür kısımda ≤ ≈ 57 px/kare @1080p60 |
| L-080 | Alet çıkış yolu kamera hareketiyle kısaltılır |
| L-081 | Alet yolu ∩ etiket = 0; etiket aletin varışından sonra |
| L-082 | Son vuruş kesmeden ≥ 0.25 s önce; ölü açılış ≤ 1.3 s; çizimler arası ≤ 0.6 s |
| L-083 | Hiçbir öğe tek karede değişmez; sıralı rampa |
| L-084 | Gizlenen paftanın açıkta kalan şeridi hareketle çıkarılır |
| L-087 | Kablo yolu eşitsiz parçalarda centripetal spline |
| L-088 | Farklı z'deki düzlemleri gerçek 3B eğri bağlar |
| L-093 | Genel bakışta bağ çizgisi ekranda ≥ 5–6 px |
| L-094 | Bölge zinciri geçişi 1.25–1.5 s, tepe ≈ 20 px/kare |
| L-095 | Türkçe büyük harf satır aralığı ≥ 1.2 × punto |
| L-096 | Kesik metin glif sınırıyla; tepe payı ≥ 50 px |
| L-097 | Mono ve matematik alt kümesinde glif kapsamı ölçülür |
| L-098 | İnce mono metin ışık düşümünde okunmaz; okunacak metin koyu ve kalın |
| L-102 | Kadraj kenarında yarım simge başka simge okunur |
| L-104 | El yazısı zamanı yola orantılı; kalem gövdesi yazılmış satıra uzanmaz |
| L-105 | Look-dev karesi yazım bitişinden sonra, kelime başında değil |
| L-106 | Kaynaklı notasyon glif glif kaynak kırpımıyla doğrulanır |
| L-110 | Kadrajı dolduran aydınlık kâğıt bandı sıçratır |
| L-111 | Pozlama kamera ölçeğine bağlı açılır |
| L-117 | Tek aksan, vuruş çevresindeki büyük marka öğesiyle sulanır |
| L-118 | Marka öğesinin ekran tonu teslim edilmiş perdeden ölçülür |
| L-119 | Kalem süzgeci aksan rengini kaydırır; renk grade sonrası erken ölçülür |
| L-120 | Işık vuruşu ölçülmüş renk sınırını taşıyabilir; önce probe |
| L-121 | İnce aksan çizgisi QC'de mekânsal şartla köprülenir |
| L-126 | Encode saf siyah penceresi inişte basamak verir; kare kare geçiş |
| L-133 | Transkripsiyon duraktan sonraki kelimeyi erken koyar; vuruş akustikten |
| L-139 | Işık çekilişi kelime içinde başlamaz; sessiz kuyruk K3 dışı |
| L-140 | Fiziksel olay kelimeden ≤ 1 kare sonra, anında tam |
| L-147 | Referanslı yeniden çizim geometriyi korur, çizgiyi korumaz |
| L-149 | Türetilmiş plaka geometri değişince bayatlar; bayatlık bekçisi |
| L-157 | Üretken model kâğıt dışı nesne çizebilir; yabancı nesne bekçisi |
| L-159 | Yer tutucu render'a girmez; taslakta beklenen tonda |

## Varsayılan olmamalı

Pafta / milimetrik ızgara, grafit + mürekkep mavisi paleti, Oswald display, açık laboratuvar ışığı (bant %40–58), spot vinyetsizlik,
cetvel / kalibre / osiloskop / çizici alet dili, kalem basınç dokusu, power3 + 2 px oturma, drift 0.35, tek kırmızı = cetvel çizgisi,
K1 %35 / %55 eşikleri — hepsi bu world'e aittir. Yeni projede bunlardan biri "zaten vardı" diye gelmez; look-dev'de yeniden seçilir ve ölçülür.

## Paketlenirken çıkarılanlar

- Logo ve isim bileşenleri ile marka öğesine özgü uygulamalar; logo varlığı projeye aittir (ders olarak kaldı: aksan rengi grade'li çıktıdan ölçülür, ΔE2000 ≤ 3).
- Finans içerikli enstrüman ve diyagramlar (emir defteri, merdiven) ve onların sayı etiketleri.
- Durdurulan restyle bileşeni (araç ve ders olarak kaldı: W-05…W-07, W-12).
- Proje plaka kimlikleri (genel `plate-*` adlarına çevrildi), sahne / perde kodları, bütün proje kelimeleri.
