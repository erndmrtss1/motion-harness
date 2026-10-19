# focusfx-paper — world kararları (kütüphane; eski adı fx-lab)

Biçim: kimlik · karar · gerekçe · sonuç. Bu kararlar world'ün kendi tarihidir; world'ü seçen proje bunları başlangıç olarak alır ve kendi DECISIONS'ına yazar, seçmeyen projeyi bağlamaz.

## FXW-01 · Açık laboratuvar ışığı, spot vinyet yok
- **Karar:** tek yönlü yumuşak anahtar (multiply lineer gradyan, yön 124°, duraklar %0/22/62/100), kenar düşümü 0.16 (tavan 0.20), pozlama 0.88, ışık nefesi ±%1.2 / 5.3 s. Elips havuz ve vinyet kaldırıldı.
- **Gerekçe:** spot havuzlu ilk sürümde bant %34.4 ve kenar etiketleri karanlıktaydı; kimlik ("laboratuvar") tam aydınlık kâğıt istiyor.
- **Sonuç:** bant %44–54, gri kart düşümü %15.3.

## FXW-02 · Doğrusal easing yasak
- **Karar:** hareket power3 in/out (`fxE`), çizgi ve yazım ease-in-out (`fxS`), varış power3 out (`fxO`); `fxP` yalnız ham ilerleme.
- **Gerekçe:** doğrusal hareket "makine" değil "yazılım" okutuyordu; kalem hızlanır ve yavaşlar.

## FXW-03 · Yazılır, çizilir, ölçülür — fade yok
- **Karar:** metin soldan sağa açılır (kırpma + kalem izi + 2 px oturma), çizgi kendini çizer, alet kayarak gelir; opaklık rampası yok.
- **Sonuç:** her shot'ta en az bir ikincil hareket (nefes, itme, titreşim, halka).

## FXW-04 · Restyle durdu; diyagram çizgisi yalnız motor + kalem basınç dokusu
- **Karar:** üretken "yeniden çizim" plakası sahneden çıkarıldı; çizgiler motorda kalır, kalem dokusu süzgeçle (`FX_PEN`) verilir.
- **Gerekçe:** plaka ızgarasını silip doldurmak damalı leke bıraktı; geniş paftada dikiş yaptı; geometri değişince plaka bayatladı.

## FXW-05 · Tek aksan
- **Karar:** tek kırmızı vuruş kuralı (renk projeden): kırmızı yalnız bir cetvel çizgisinde; metin kırmızı değil; vuruşun ±2 s çevresinde başka kırmızı kütle küçük ya da dışarıda.
- **Sonuç:** `accent.quotaDefault` 1; QC `signal` sınıfı ve konum taraması.

## FXW-06 · Kamera: tek pafta, monoton kübik, basamak 0
- **Karar:** kesme yok; kamera bölgeden bölgeye monoton kübik (aşma yok, varır ve tutar), drift 0.35 altta. Kamera darbesi yok — vurgu nesnede (ölçek, mürekkep oturması).
- **Gerekçe:** Catmull-Rom anahtarlar aşma ve "savrulma" yaptı; damga anında kameraya verilen 1 karelik darbe basamak sayıldı.

## FXW-07 · Ön plan nesnesi masada yatar
- **Karar:** ön plan aleti ekran uzayında süzülmez; masada/kâğıtta yatar, temas gölgesi var, kadraj kenarında yarısı dışarıda, ≤ 2 px bulanık, kahramanı ve metni örtmez, yalnız anlatımda işi varsa.

## FXW-08 · Kalem dokusu pişirilir
- **Karar:** durağan diyagram içeriği süzgeçle birlikte bir kez PNG'ye basılır (`FXPen` → çekirdek `MHBakeSvg`); harness `__fxBakeSettle` bekler.
- **Sonuç:** 7.3 → 2.3 s/kare; tuzaklar W-23, W-24.

## FXW-09 · Yakın planda kahraman S× katmanda
- **Karar:** kamera ölçeği k ≥ 1.5 olan karede kahraman öğe kendi 3B katılımcısında S× yerleşim + `scale(1/S)` ile çizilir (S öğe türüne göre ölçülerek: SVG yol 2, HTML metin 2.25–2.5).
- **Gerekçe:** 3B kamera büyütmesi düzlemi yerel CSS px'te tarayıp k kat büyütür (kenar ≈ 1.65 px × k); DPR / will-change düzeltmez.
- **Sonuç:** `supersample.sxK` 1.5, `edgeMaxPx` 1.9.

## FXW-10 · Paket sürümü (v4.0.0)
- **Karar:** world örnek olarak pakete girerken palet v4'te sabitlendi (`MH_PAL='v3'` yalnız karşılaştırma tahtası için); marka, logo, finans içerikli bileşenler ve proje kelimeleri çıkarıldı; ortak motor parçaları (easing, drift, kamera, izdüşüm, pişirme, hareket bulanıklığı) çekirdeğe (`motion-core.jsx`) taşındı.

## FocusFX üretiminden world kararları

Kaynak: FocusFX faz kararları (§1–§28) ve tur retroları. Yalnız world'e dair kararlar; proje içeriği, film metni ve marka öğeleri çıkarıldı. Logo varlığı projeye aittir.
Ayrıntı ve gerekçe ölçüleri `lessons.md` "Proje kararları" bölümündedir.

| karar | gerekçe | faz |
|---|---|---|
| Film dili araştırma laboratuvarı; amber ışık ve markanın sıcak motifi yok | brief tonu ciddi, sakin, hassas; vaat değil anlama | F0 |
| Tipografi kahraman: vurucu cümleler kelime zamanlı yazılır (çekirdek varsayılanın tersi) | ses yönetir; vuruş listesi kullanıcı kararı | F0 |
| Damga yerine cetvel çizgisi; üstünü çizmek ayıklamaktır | darbe dili kimliğe aykırı | F0 |
| Tek kırmızı vuruş kuralı (renk projeden): film boyunca tek çizgi; metin kırmızı değil | aksan ancak tek kalırsa anlam taşır | F0 · F2-B · F5 |
| Ses yönetir: kesme ve vuruş cümle sınırına ya da durağa kilitli | shot uzunluğu hedefi sesle çelişirse ses kazanır | F0 |
| Üretken klip yalnız soyut/makro doku; cümleyi anlatmaz, tek başına kare olmaz | insan, el, yazı, grafik ekranı kimliği bozar | F0 |
| Açık laboratuvar ışığı; spot vinyet kalktı | spot havuzu bandı %34.4'e düşürdü, kenar etiketleri karanlıkta kaldı | F2-B |
| Display, ikincil ve etiket yüzleri ölçümle seçildi; display tracking −0.02em | harf dili uzaklığı ölçüldü; varsayılan yüz yok | F2-B |
| Doğrusal easing yasak; drift 0.35; her shot'ta ≥ 1 ikincil hareket | doğrusal hareket "yazılım" okuttu | F2-B |
| Look-dev anı = yazım bitişi + 6 kare | kelime başında metin henüz yok | F2-B |
| Üretken yeniden çizim durdu; kalem basınç dokusu motorda, yalnız diyagram çizgisine | dikiş, bayatlık ve çift kontur | F2-C |
| Katmanlar: A ≤ %25, B ≥ %40, C ≥ %30; pafta/gren zemini katman sayılmaz | eski tanım motor payını sıfırlıyordu | F2-C |
| Kenar karanlığı = ışık düşümü (gri kartta ≤ %20), masa payı değil | ölçü iki türlü okunuyordu | F2-C |
| Son kart world içinde, kâğıt üstünde; siyah kart yok, son kare pozlamayla siyah | world bütünlüğü (nefes + gren) | F2-C |
| Kapı turunda belgeler reviewer'dan önce güncellenir | eski okuma bulguları kirletti | F2-C |
| K1–K8 SERT kuralları ve animatik kapısı | ilk perde reddedildi: yer tutucu, ölçek, yoğunluk, hareketsizlik | F3-ACİL |
| Envanter tabandır; enstrüman gerçektir ("kelime + şekil" yasak) | seyrek yerleştirme ucuz okundu | F3-ACİL |
| World v4: kamera düzeneği, derinlik, lamba havuzu, kâğıt/aydınger, çizici, kaydedici, enstrümanlar | tek pafta dilini taşıyacak ilkel seti | F3-ACİL |
| Kamera monoton kübik; varır, okutur, devam eder | Catmull-Rom aştı; durmayan kamera okutmadı | F3-ACİL |
| Ön plan nesnesi masada yatar; yalnız anlatımda işi varsa | süzülen alet ucuz ve hata gibi | F3-B |
| Durağan süzgeçli içerik pişirilir; hedef ≤ 5 s/kare; 3B katman ≤ 12 | render süresi ölçümle çözüldü | F3-B |
| Kamera hareket bulanıklığı shutter 180° (> 3 px/kare) | hızlı kamera geçişleri sertti | F3-C |
| Kamera ivmesi kuralı uyarıdır, kapı değil; onaylı kamera dili donduruldu | dil korunur, sayı uyarı verir | F3-B · F4 |
| Proje 60 fps; animatik 960×540 / 30 fps | yan yana test render'ı; 15 fps kasıyordu | F4 |
| Bant %40–58 | görünüm onaylı; sayı görünüme uyar | F4 |
| Finansal mekanik konu, vaat yasak; ilgisiz metafor yasak | kimlik mühendislik tanıtımı | F4-B |
| Shot başına nesne sözlüğü tasarımdan önce onaya gider (`SOZLUK-SABLON.md`) | içerik kararı tasarım turunu boşa harcatmasın | F4-B · F5 |
| Taralı vurgu (45° vektör tarama) vurgu dilidir; koruma alanı grafit tarama | tek kırmızı taramaya harcanmaz | F4-B |
| K3 iki ölçüyle: perde OURS + shot başına kamera hızı payı | blok eşleme yavaş pan'ı sayamadı | F5-B |
| Ses değişince eşlem: tasarım zamanı korunur; kayması ≤ 33 ms olan shot aynen | yeni çekim kesik kopya değildi | F5-B · F11 |
| Fiziksel olay kelimeden ≤ 1 kare sonra, anında tam | öne düşen olay kopukluk yaptı | F6 |
| Kaynaklı içerik aynen; el yazısı ≤ 12 glif/s, kısaltma yok | "görünür ama okunmaz" kalktı; doğruluk | F6-B |
| Genel bakış (k < 0.5) 2× süper örnekleme, yakın plan 1×, sınırda karışım | küçük eğik metin kare kare düştü | F7 · F8 |
| Aksan süzgeç dışında; rengi grade sonrası tek karede erken ölçülür | süzgeç rengi ΔE 5–6 kaydırdı | F7 |
| QC aksan köprüsü yalnız mekânsal örtüşmeyle | tek vuruş iki aralık sayılıyordu | F7 · F8 |
| Hareketli devir ölçütü: fark ≤ 1.1 × komşu kare farkı; durağan devirde ≤ 2/255 | durağan ölçüt hareketli dikişe uymuyordu | F8 |
| Basamak 0; damgada kamera darbesi yok | kullanıcı kasıtlı basamağı reddetti | F8 |
| Siyaha iniş 16-bit + dither; ışık çekilişi önce pozlama, havuz en son | 8-bit pürüz ve iris görünümü | F8 |
| Sessiz kuyruk: tutuş 0.8 s + çekiliş 1.0 s + ≥ 4 kare siyah; K3 dışı | kart okunmadan sönüyordu | F8-B |
| Aksan çizgisine ±0.5 px tohumlu kalınlık dalgası | düz çizgi arayüz çizgisi gibi okundu | F9 |
| Küçük pozlama düzeltmesi post'ta, duruk dikdörtgen dither | sayfa örtüsü 8-bit basamak verdi | F9 |
| Merdiven etiketlerinin opaklıkla belirişi ve ışık katmanı 8-bit yuvarlaması teknik borç | görünmez ya da kapsam dışı | F9-B · F10-B |
| k ≥ 1.5'te kahraman S× katmanda; geriye dönük değil | 3B büyütme yumuşatıyor (≈ 1.65 px × k) | F10-B |
| Vuruş ışığında havuz %20 daralır (%30 değil) | ton sınırı ve tek kırmızı kuralı bağlayıcı | F10-B |
| Vuruş zamanı akustik başlangıca çapalanır | transkripsiyon vuruşu erken koydu | F12 |
| Logo varlığı ve marka kararları world'e girmez | world örnek olarak paylaşılır; marka projeye aittir | paketleme |
