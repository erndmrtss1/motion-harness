# fx-lab — world dersleri (ÖRNEK, varsayılan değil)

> Bu dosya bir **örnek** world'ün ders kaydıdır. Paket bu world'ü hiçbir projeye kendiliğinden vermez; yalnız kullanıcı açıkça isterse
> ve o zaman da projenin kendi look-dev ölçümleriyle uyarlanarak kullanılır (`../../SKILL.md` §8).
> Kaynak: bir önceki üretimin world belgesi, kodu ve inceleme turları. Proje içeriği, kelimeler ve marka öğeleri çıkarıldı.

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
| `accent` | #DB1D2E · signal · 1 | kural | filmin tek kırmızısı: tek cetvel çizgisi; metin kırmızı değil |
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
| W-34 | Aksan çizgisi kalem süzgecinden ve ışık çarpanından geçince rengi kayar: grade sonrası ΔE 5–6, QC aksan çekirdeğinin altına düşer, kenarları ikincil sınıf (bordo) sayılır | aksan süzgeç DIŞINDA çizilir; kaynak rengi ışık çarpanına göre telafili (`accentSrc` #FF2236 → ekranda ≈ `accent.color`); çizgi kalınlığı ≥ 9 px (1080p); doğrulama grade'li çıktıdan ΔE2000 ≤ 3 |

## Varsayılan olmamalı

Pafta / milimetrik ızgara, grafit + mürekkep mavisi paleti, Oswald display, açık laboratuvar ışığı (bant %40–58), spot vinyetsizlik,
cetvel / kalibre / osiloskop / çizici alet dili, kalem basınç dokusu, power3 + 2 px oturma, drift 0.35, tek kırmızı = cetvel çizgisi,
K1 %35 / %55 eşikleri — hepsi bu world'e aittir. Yeni projede bunlardan biri "zaten vardı" diye gelmez; look-dev'de yeniden seçilir ve ölçülür.

## Paketlenirken çıkarılanlar

- Logo ve isim bileşenleri, logotip yer tutucusu, logonun ışık telafisi uygulaması (ders olarak kaldı: aksan rengi grade'li çıktıdan ölçülür, ΔE2000 ≤ 3).
- Finans içerikli enstrüman ve diyagramlar (emir defteri, merdiven) ve onların sayı etiketleri.
- Durdurulan restyle bileşeni (araç ve ders olarak kaldı: W-05…W-07, W-12).
- Proje plaka kimlikleri (genel `plate-*` adlarına çevrildi), sahne / perde kodları, bütün proje kelimeleri.
