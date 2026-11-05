# LESSONS — çekirdek dersler

> **Ne:** kaynak projede (ve öncülünde) pahalıya öğrenilmiş, **görsel dilden bağımsız** dersler: tekilleştirilmiş, anonim.
> - Bir ders kurala dönüştüyse kuralın kendisi RULES.md'dedir; burada kuralın **neden** var olduğu durur.
> - Statü **ilham / uyarı**: okunur, kopyalanmaz. Sayılar kaynak projede ölçüldü (**[ÖRNEK]**); yeni projede yeniden ölçülür.
>
> **Biçim:** `L-xxx · başlık` — ders (1–3 satır) · *kaynak türü* · *ilgili kural*
>
> **Kaynak türü:**
> - `retro`: tur retrosu, yapanın uygulama notu, değişiklik kaydı ya da envanter çözümlemesi;
> - `traps`: tuzak arşivi;
> - `world`: bir world dosyasında bulunmuş ama dilden bağımsız (Chromium, ölçüm, süreç);
> - `kullanıcı`: kullanıcı düzeltmesi ya da kalıcı bellek kaydı.
>
> **İlgili kural:**
> - RULES.md kimlikleri (ör. `MT-6`, `SS-2`, `ÇK-09`, `DUR-8`);
> - ölçüm kodları MEASURE.md (`M-…`, `fc:<tip>`);
> - karar kimlikleri DECISIONS.md (`ADR-…`);
> - kimliksiz prosedür maddeleri `GENAI §n` / `AUDIO §n`;
> - `—` = kural yok, yalnız teknik bilgi.
>
> **Tekilleştirme:** ham ≈ 340 kayıt → **219 core ders** (+ eval, 1.1 ve 1.2 dersleri L-220…L-227 = 227; + 1.4 dersleri L-228…L-250 = 250, §1.5, §2.5 ve §8.5) + §9'da world sınıfı liste. Ham kaynaklar:
> - tuzak arşivi 71 (63 core);
> - skill / world / ADR / değişiklik kaydı / bellek dersleri 144 (105 core);
> - kaynak proje retrosu 72;
> - öncül proje retrosundan seçki 20;
> - kullanıcı düzeltmesi 29 + yapanın süreç dersi 4;
> - envanter çözümlemesi.
>
> **Yeni ders:** önce `docs/RETRO.md` ve world `lessons.md`'ye yazılır. Üç sahnede/projede tekrar ederse ölçülebilir kurala dönüşür ve `/motion:promote` ile core'a önerilir (SK-4).

---

## 1. Chromium / render motoru ve sahne kodu

### 1.1 Pişirme, 8-bit ışık, iniş

- **L-001 · Pişirme imzası** — Önbellek imzalı (pişirilmiş) içerikte **boş** bir koşullu çocuk (`{x && <el/>}` → `false`) bile imzayı değiştirir. Kayıtlı görüntü yerine canlı süzgeç çizilir, kareler "bayat" görünür. Yeni öğe var olan pişirmenin dışına ayrı eklenir. Düzeltmeden önce aralık dışı kareler probe ↔ kayıtlı karşılaştırılır (imgdiff 0); şüphede eski kodla probe edilerek neden ayrılır. · *world, retro* · *MT-6*
- **L-002 · Tek kare probe pişirme gürültüsü** — Pişirme oturmadan alınan tek kare probe nadiren ≈ 0.09/255 sahte fark verir. Bayatlık şüphesinde probe tekrarlanır ya da 2 karelik dizi alınır; tek ölçüme karar bağlanmaz. · *world* · *RH-6, M-SELF*
- **L-003 · 8-bit ışık: gradyan nefesi** — Gradyan durakları 8-bit'e yuvarlanır. ±%1.2 ışık nefesi uzun tutuşta bir durağı tek karede 247 → 248 geçirir; geniş bölgede 1/255 basamak çıkar, QC fade sayar. Uzun tutuşta nefes genliği 0. · *world, retro* · *IŞ-9, BAS-3*
- **L-004 · 8-bit ışık: küçük pozlama sayfada yapılmaz** — Sayfadaki siyah örtünün opaklığı 8-bit alfaya yuvarlanır; %1.5'lik rampa 4 küresel basamakla iner (ΔY ≈ 0.9, komşu fark oranı 12). Sahne içi küçük pozlama değişimi post'ta kayan noktada uygulanır (`expo-post`, manifest `expoPost.dip`); sahne örtüsüz çizilir. · *world, retro* · *IŞ-9*
- **L-005 · Siyaha iniş 16-bit + TPDF dither** — Tarayıcıda pozlama örtüsü + gradyan yuvarlaması inişte ardışık kare farkını zikzaklatır (pürüz 0.30). Sahne pozlamasız çizilir; `expo-post` eğriyi kayan noktada uygular + TPDF dither (genlik kazançla 0'a): pürüz 0.08, son kare tam 0. İşlenen kareler kaydedilir; iki kez karartma olmaz. · *world, retro, kullanıcı* · *SN-5*
- **L-006 · Rampalı dither ölü bölge** — Kazanç ≈ 0.998'de küçülen TPDF genliği yuvarlamayı "değişmez"e çeker, sonra birden yakalar → basamak. Sahne içi küçük kazançta **duruk** dikdörtgen dither (±0.5 LSB, kareden kareye aynı desen). Doğrulama: kare başı ortalama oranı = beklenen kazanç (5 ondalık). · *world* · *IŞ-9*

### 1.2 Rasterleme, ölçek, bellek

- **L-007 · Kenar ≈ 1.65 px × k** — 3B kamera düzlemi perspektifle yaklaştırınca preserve-3d katılımcıları kendi yerel CSS px ölçeğinde dokuya çizilip k kat büyütülür; kenar %10–90 ≈ 1.65 px × k olur. 2× DPR, `will-change`, `translateZ` düzeltmez. Çözüm: kahraman öğe kendi 3B katılımcısında S× yerleşim + `scale(1/S)` (S=2: 3.2 → 1.73 px). Ölçüm yeşil kanal %10–90, Laplacian kenar yoğunluğuyla birlikte. · *world, retro* · *SS-2, M-SX*
- **L-008 · S öğe türüne göre ölçülerek seçilir** — Aynı S'de metin glifi logodan yumuşak rasterlenir; "aynı yöntem = aynı sayı" varsayılmaz. [ÖRNEK] SVG yol S=2 → 1.73 px; HTML metin S=2.25–2.5 → 1.73 px. Aynı karttaki kahramanlar ±%10 eşit. · *world, retro* · *SS-3*
- **L-009 · 2× kuralı** — Genel bakışta (k < 0.5) Chromium mipmap'siz küçültür; küçük eğik metin kare kare titrer/düşer. k < 0.5 (±0.1 s) aralıkları 2× + 2×2 ortalama (`ss2`), kalanı 1× çizilir. 2×/1× sınırında kenar enerjisi +%37 sıçrar → sınırın iki yanı iki çözünürlükte çizilip karıştırılır (`--blend`). · *world, retro* · *SS-1, M-2X*
- **L-010 · Karo belleği** — Çok büyük katman (ör. 3020×5200 + feTurbulence) geniş planda Chromium karo bellek sınırına takılıp **sessizce çizilmez**. Belirti: "yakın planda var, uzakta yok"; başka katman kapatılınca başkası düşer. Çözümler:
  - sahne başı `chromiumArgs: ["--force-gpu-mem-available-mb=4096"]`;
  - büyük dünya katmanı küçük div + `scale(n)`;
  - büyük yüzey yarım çözünürlük + `scale(2)`;
  - filtre gölgesi yerine box-shadow;
  - uzak kamera yerine dünya ölçeği dolly.

  · *world, traps* · *SS-4, ADR-006, ADR-007*
- **L-011 · Dev eğik düzlem çizilmez** — Eğilip dönen dev CSS 3B düzlem bazı karelerde boş çıkar. Böyle düzlemden kaçınılır; gerekiyorsa parçalanır. · *traps* · *SS-4*
- **L-012 · Düzlem raster ızgarası** — 3B kamera altındaki büyük düzlem ekran ölçeğinde değil, ≈ 1 texel/dünya birimi ve dikeyde 4 örnekle rasterlenir. Kenar 0.25 birim adımla nicemlenir; alt-birim kenar dalgası tek yöne çevrilir. Alt-birim efektten önce kalınlık adım adım probe edilir, taban kenarı iki örnek satırının ortasına konur. Ölçüm %50 kaplama geçişinden yapılır (eşikli kaplama yanıltır). · *world, retro* · *M-SX*
- **L-013 · Büyük kamera ölçeğinde raster şişer** — ×5–×32 kamera ölçeğinde rasterlenmiş metin bulanıklaşır → yakın metin ekran uzayında, aynı matrisle vektör olarak çizilir. · *traps* · *SS-2*
- **L-014 · Raster SVG tuzağı** — "SVG" uzantılı dosya çoğu kez `<image>` içinde base64 JPEG/PNG kabıdır: glif yolu yoktur, bazen uzantısı .svg olan bir JPEG'dir. Önce dosya taraması (magic, `<image>`/base64/`<text>`/filtre), sonra IoU + delik + kenar dalgası. Raster ise DUR ve vektör iste. · *world, retro, kullanıcı* · *ML-2, DUR-8, M-LOGO*
- **L-015 · PNG renk etiketi dönüşür** — Renk etiketli PNG sayfada 13/255'e varan fark verdi → tarayıcıda çizilecek PNG'ler etiketsiz yazılır. · *traps* · *MT-10*
- **L-016 · Yalnız sabit Chromium, ön-derleme yok** — Farklı tarayıcı ya da Babel ön-derlemesi farklı kare üretir → yalnız paketin sabitlediği Playwright Chromium'u; JSX runtime'da çevrilir. · *kullanıcı* · *ÇK-12*
- **L-017 · Performans: katman ve önbellek** — 3B katman ≤ 12/kare; aynı z'deki öğeler tek kapta. `will-change` önbelleği ölçümde yavaş/farklı kaldı (ölçüm modunda kapalı). Kare süresi tahminle değil `--bench` / `--frame-log` ile bilinir. · *world, retro* · *KM-13, RH-3*

### 1.3 3B bağlam, süzgeç, maske

- **L-018 · 3B bağlamı düzleştirenler** — CSS `filter` 3B bağlamı düzleştirir: perspektif kamerada, filtre dış sarmalayıcıda olur. `mix-blend-mode` preserve-3d kabını düzleştirir: karışımlı öğe düz bir katmanın içine konur. · *traps* · *—*
- **L-019 · 3B sıralama** — preserve-3d'de sıra Z'dir, DOM değil; ama eş düzlemde DOM sırası belirler ve tutmayabilir → `translateZ(1px)`. Filtreli sarmalayıcı z 0'a iner → üstteki kardeşe açık translateZ. Aynı düzlemdeki içerik tek düz kapta, 2.5D nesneler kardeş + translateZ. Yerel efekt için DOM sırası değiştirilmez. · *traps, world, retro* · *—*
- **L-020 · 3B kesişim (BSP) tuzakları** — Aynı 3B bağlamdaki düz katman dönen kartı keser → arka katman bağlamın dışına alınır. Yüzeye yakın döndürülmüş katman BSP'de arkaya düşer → ≥ 6 px yukarı. Gizli şerit sıralamada üste çıkabilir → örtüye güvenilmez, kırpılır. · *traps* · *—*
- **L-021 · Yalıtılmış grup ve maske** — Saydam zeminli yalıtılmış grupta overlay/multiply kendi rengini çizer → grubun içine koyu taban konur. `mask-image` de izole grup kurar: kabın içindeki multiply boş zemine uygulanır → karışım modu maskeli kabın kendisine verilir. Izgaralı plaka maskede çizgi bırakır. · *traps, world, retro* · *—*
- **L-022 · SVG süzgeç bölgesi** — 1×1 SVG + `overflow: visible`'da süzgeç bölgesi orijinden içeriğe uzanır (≈ 3870×2590 px/kare maliyet; render süresinin asıl kaynağı buydu). Bölge = içerik kutusu + 16; boş içerikte süzgeç çizilmez; süzgeç kimliği tekildir (paylaşılan kimlik yanlış pişirme verdi). · *world, retro* · *KM-13*
- **L-023 · objectBoundingBox süzgeci** — Süzgeç içerik **taşma** kutusuna göre ölçeklenir → süzgeçli kap `overflow: hidden`. · *world, retro* · *—*
- **L-024 · Hareket bulanıklığı sarmalayıcısı** — Sarmalayıcının yapısı her karede aynı kalır (koşullu sarma pişirmeyi kırar). Süzgeç bölgesi kadraj dışına taşar. Bulanık sonuç kaynağın üstüne bindirilir (`feComposite over`); ata kırpması bulanık kenarı karartır. · *world, retro* · *KM-7, KD-11*
- **L-025 · userSpaceOnUse desen** — Desen, başvuran öğenin kullanıcı uzayında örneklenir. Parça bütünün yerel ofsetiyle yerleştirilmezse desen parçalar arasında kayar. · *world, retro* · *—*
- **L-026 · Süzgeç kenar durumları** — CSS filtreli HTML'de bazı yapılar sessizce bozulur:
  - `feImage href="#id"` boş çıkar → data-URL SVG; sabit PNG gizli `<image>` ile önceden yüklenir;
  - sıfır yükseklikli çizginin filtre kutusu boştur → 0.6 px sehim;
  - `clip-path` blur'dan sonra uygulanır → biçim SVG çokgen, blur sarmalayıcıda;
  - yalnız bir sayfada tanımlı süzgeç diğerinde yoktur → kullanıldığı her sayfada tanımlanır.

  · *traps* · *—*
- **L-027 · Kısmi netlik** — Tek öğede kısmi netlik için iki kez çizilir: bulanık + maskeli net kopya. · *traps* · *—*
- **L-028 · Kare başı CSS görüntüsü** — Kare başı değişen (asenkron) CSS görüntüsü tek kare probe ile sıralı render arasında farklı çıktı → kare-kesin dizin + `__waitMs`; render'dan hemen sonra bayatlık kontrolü. · *traps* · *RH-10*

### 1.4 Sahne kodu, yükleme, runtime

- **L-029 · JSX yorum tuzakları** — Satır ortasına `//` yorum satırın kalanını ve sonraki kodu yuttu; kaynak projede 6+ kez, araç betiklerinde de oldu (en sık tekrar eden tuzak). Diğerleri:
  - dizi/öznitelik içinde `{/* */}`;
  - satır sonu `/* */` metin düğümü oldu;
  - üçlü ifadede JSX yorumu derlenmedi.

  Yorum yalnız ayrı satıra yazılır. Her yamadan sonra tek kare yüklenebilirlik probe'u + DOM metin taraması + `node --check`. · *retro, traps, world* · *MT-7, ÇK-08*
- **L-030 · Modül yüklenemezse sessiz geri dönüş yok** — Yüklenemeyen modül sessizce eski/boş bileşene düşmez. Hata stdout'a yazılır (`[dc-runtime] x-import: FAILED`); sahne açılmıyorsa render yok. · *retro* · *ÇK-08, DUR-6*
- **L-031 · Modül kapsamı ve yükleme sırası** — Her modül kendi kapsamında çalışır. Paylaşılan bileşen `window`'a verilir; yükleme sırası önemlidir; yol sunucu kökünden yazılır (alt klasörde de). Başka projeye gömülü yardımcılara erişilemez → ortak bileşen sahneye gömülmez. · *traps, world* · *DUR-6*
- **L-032 · Ad çakışması** — Eklenen ad sahne değişkeniyle çakıştı → önekli / dosya içi adlar; probe günlüğü okunur. Manifest kimlikleri (lyric adları) tekrar edebilir → zaman aralığıyla ayrılır. · *traps, world* · *MT-7*
- **L-033 · Paylaşılan bileşene parametre: varsayılan = eski çıktı** — Paylaşılan bileşenin "her zaman tam" çizilen bir parçası yeni sahnede tek karede belirdi. Parametre eklenir, varsayılanı eski davranışı verir; diğer kullanımlar ve aralık dışı kareler imgdiff 0. Değişiklikten önce/sonra probe karşılaştırması yapılır. · *world, retro, kullanıcı* · *MT-5*
- **L-034 · `undefined` prop varsayılanı ezer** — Yayılan props içindeki `undefined` anahtar bileşen varsayılanını ezer → undefined anahtarlar ayıklanır. · *traps* · *MT-10*
- **L-035 · Renk yardımcısı tek biçim** — Renk karıştırıcı yalnız hex kabul ediyordu; başka biçim sessizce yanlış renk verdi → tek renk karıştırma işlevi, girdi biçimi doğrulanır. · *traps* · *—*
- **L-036 · Sahne listesi tek tırnaklı dizge** — `window.OM_SCENES='[…]'` tek tırnaklı dizgedir; içerikteki düz kesme işareti dizgeyi kırar → içerikte tipografik ’. · *traps* · *—*
- **L-037 · Çıkış tween'i son karede biter** — Çıkış `süre`'de biterse son karede %13–28 kalıntı kalır → çıkış `(n−1)/fps`'te biter. · *traps* · *SN-1*
- **L-038 · Kare 0 siyah değil** — Şablonun kare 0'ı koyu boşluk rengidir, saf siyah değil → `blackStart` yalnız ham kare 0 gerçekten 0 ise. · *traps* · *SN-3*
- **L-039 · Tohumlu rastgelelik korelasyonu** — Ardışık tohumlar korelasyonlu çekiliş verir → aralıklı tohum (ör. 811 + 131·k), ilk 2 çekiliş atılır. · *traps, retro* · *MT-2*
- **L-040 · Dünya katmanı sarmalayıcıyla, tek kaynaktan** — Evrensel dünya katmanı (gren, vinyet, ışık, drift) sahnenin kök bileşenini sarar; ölçümle konumlanan yazı sarmalayıcının dışında kalır. Katman tek kaynaktan gelir; iki kaynak çift vinyet/gren/drift verir. · *traps, retro* · *ADR-011*
- **L-041 · Storyboard, look-dev ve render aynı koddan** — Tahta ve look-dev sayfaları sahne kodunu kare → an eşlemiyle çağırır. Ayrı çizilen storyboard render'la tutmadı. · *retro* · *MT-9*
- **L-042 · Font yüklenmeden ölçüm** — Font yüklenmeden ölçülen düzen kalıcı yanlış kalır. `file://` font CORS'a takılır, yedek font çizilir, ölçüm boş döner. Sayfa http kökünden sunulur; ölçüm önbelleği yalnız `document.fonts.check` doğruyken tutulur. · *traps, retro* · *MT-4*

### 1.5 Alt piksel, raster yolu ve süzgeç yüzeyi (1.4)

Hepsi tek karede görünen sıçrama üretir (`fc:pop`, `fc:temporal` yakalar); kod T'nin saf fonksiyonu olsa da Chromium'un raster kararları kare kareye değişir.

- **L-228 · Kesirli SVG metin y'si tam piksele oturur** — SVG `<text>` y'si kare başı kesirli değişince (yazımda "yukarıdan iner" oturması) Chromium glifleri düşeyde tam piksele oturtur: taban yarım pikseli geçtiği karede büyük harflerin bütün kenarı 1 px sıçrar ([ÖRNEK] kenarda 102/255, `pop` "tek kare belir/kaybol"). Oturma kesirli y ile değil **bileşik katman ötelemesiyle** yapılır (raster bir kez, bileşikte kayar) ya da yazımın ilk birkaç pikseline sığacak kadar kısa tutulur. · *1.4* · *K8, ZN-1*
- **L-229 · Kök ölçek ≠ 1 parıltısı** — Kök katman ölçeği 1'e çok yakın ama 1 değilken (ör. 1,0012 → 1 oturma) büyük harf kenarlarında kare atlamalı parıltı çıkar; ölçek tam 1'de yoktur. Ölçek oturması \|ln k\| küçük bir eşiğin altına inince ([ÖRNEK] < 2·10⁻⁴) tam 1'e yazılır. · *1.4* · *K8*
- **L-230 · Tek parlaklık süzgeci nefesi 8 bit basamağı** — Kök `filter: brightness()` ile verilen küçük ışık nefesi (ör. ±%1,2 / 5 s) 8 bit yuvarlamada **bütün kareyi aynı karede** bir düzey atlatır (`temporal` oran ≈ 2). Nefes uzamsal (havuz maskeli, bölgeye göre faz) ve titreşimli (dither) olur; tek küresel parlaklık süzgeci kullanılmaz. · *1.4* · *IŞ-9, BAS-3*
- **L-231 · `feOffset` tamsayıya yuvarlanır** — Örnek ötelemeli hareket bulanıklığı (`feOffset dx = o·L·u`) Chromium'da tamsayı piksele yuvarlanır (x,50 yukarı); ötelemeler tam ±x,50'ye düştüğü karede örnekler asimetrik olur, bütün katman hamle yönünde ≈ 0,2 px kayar → piksel izlemede o karede hız basamağı (C1 > %5; bulanıklık kapalıyken basamak yok). Ayrıca çekirdek genişliği L ile basamaklı değişir ve hız eşiğinde açılıp kapanır. Örnekler simetrik tamsayı ötelemede, ağırlıklar L boyunda kutu çekirdeğinin örtüşmesinden kurulur (L sürekli → çekirdek sürekli); eşikte sert aç/kapa yerine rampa. · *1.4* · *ZN-2, ZN-6*
- **L-232 · Dinlenmeye inerken tamsayı netleşme** — Kamera yumuşak oturmayla tam 0 ötelemeye inerken Chromium katmanı alt piksel konumunu basamaklı (≈ 1/16 px) örnekler; kesir sıfıra düştüğü karede katman **tamsayıya oturur** ve bütün kare bir anda netleşir ([ÖRNEK] sabit kâğıtta yüksek geçiren std 3,07 → 3,26/255). Yavaş kuyrukta komşu farklar küçük olduğundan `temporal` sıçrama sayar. Aynı nedenle dönme/öteleme kalan duruş kareleri dinlenme karesinden yumuşaktır. Duruşa inen hamlenin son karelerine başka sürekli hareket (yüzer drift) biner ya da dinlenme konumu tamsayı yazılmaz. · *1.4* · *BAS-3, MT-11*
- **L-233 · Seek'te raster yeniden kullanımı → taze ağaç** — Seek render'ında karenin çıktısı önceki karelere bağlı olabildi: hareket sırasında (süzgeç açık) çizilmiş bir kare, sonraki durgun karelerde kalıcı düğümün rasterini değiştirdi; ortadan başlayan render tam render'dan farklı çıktı ([ÖRNEK] ort. 0,008–0,031/255). Görüntüyü gösterim boyutunda çizmek farkı yalnız azalttı; küçük sabit dönme + görünmez boya geçersizlemesi de sıfırlamadı. İçerik ağacının React anahtarı kare başı değişince (her karede yeniden kurulum) fark **0**, taze çıktı aynı, süre ≈ %1 arttı. Tek kare probe geçmişsiz olduğu için bunu göstermez (M-PROBE). · *1.4* · *MT-11, M-ZS*
- **L-234 · `feGaussianBlur` eksen σ < 0,8 bırakılır** — Bir eksenin σ'sı ≈ 0,8'in altına inince Chromium o eksende bulanıklığı **uygulamaz**; eğik hamlede σ eşiğin altına düştüğü karede kâğıt greni tek karede sertleşir ([ÖRNEK] +%32). Ayrıca 3σ tamsayıyı geçerken çekirdek yarıçapı basamaklı değişir ([ÖRNEK] +%15). Hareket bulanıklığı eksen başına ayrı geçişle, eksen başı taban + karışımla (ya da çekirdek örnek ağırlıklarıyla açık) kurulur. · *1.4* · *ZN-1, KM-7*
- **L-235 · `rotate()` tam 0deg eksen hizalı raster yoluna geçer** — Katman dönüşümündeki dönme dizesi tam `0deg`'e inince (drift dönmesi hamle sonunda söner; settle tamsayı dinlenmeye varır; duruşta dönme 0'dan kalkar) Chromium eksene hizalı raster yoluna geçer → tek karede gren/keskinlik basamağı ([ÖRNEK] MAD 0,44–1,37, keskinlik +%6,5). `rotate(2e-6deg)` → `rotate(0deg)` geçişi tek başına yeter. Dönme hiç tam 0 yazılmaz: \|rz\| ≥ 10⁻⁶ alt sınırı (geometri etkisi ≈ 10⁻⁵ px). Sabit hızlı hamlede görünmez, dinlenmeye yakın karelerde görünür. · *1.4* · *BAS-3, MT-11*
- **L-236 · Büyük CSS ölçekte ardışık render raster düşer** — Büyük CSS ölçekli (ör. ×4 mercek) katmanda ölçek 1'e dönerken **ardışık** render yalnız siyah karo değil, dolguları da düşürdü (gövde saydam/koyu); siyah kare ayıklaması kaçırdı, `pop` yakaladı. Kare başı taze sayfa (probe) her karede doluydu. Büyük ölçekli katmanda ardışık render ↔ taze probe tanığı alınır; düşen kareler taze sayfayla yeniden çizilir. · *1.4* · *SS-4, MT-11*
- **L-237 · İki set aynı sayfada → SVG id çakışması** — Aynı bileşen kütüphanesinden iki set aynı karede çizilince SVG `id`'leri çakıştı ([ÖRNEK] kare başına 272 kopya kimlik); `url(#…)` belgedeki **ilk** tanıma gider (çıkan setin ışığı/konumu) → süpürme bitince öğe altları tek karede değişti. Bileşen kimlikleri önekli üretilir (set/örnek öneki, varsayılan boş = eski çıktı); kare başı yinelenen `id` sayısı 0 olmalı. · *1.4* · *MT-7, MT-5*
- **L-238 · Süzgeçli katmanda taşan içerik süzgeç yüzeyini küçültür** — Süzgeçli katmanın (kare başı süzgeç yolu) içinde kadraj/plaka dışına taşan büyük içerik (`overflow: visible` SVG, yüksek z'deki kartın büyük gölgesi) Chromium'un süzgeç çizim yüzeyini küçültür → zemin **tek karede** yumuşar ([ÖRNEK] keskinlik −%20). Süzgeç bölgesini daraltmak etkisiz; taşan içeriği sınırda kırpmak (`overflow: hidden`) çözer, öteki kareler bayt aynı kalır. · *1.4* · *ZN-1, MT-5*

- **L-247 · MoBlur "over" bileşimi yarı saydam kamera içeriğinde kaplamayı ikiler (1.4)** — Yönlü bulanıklık örnekleri "over" ile birleşince yarı saydam katman kendi üstüne biner (ölçülen: luma 115 → 105, std 15 → 23). Bulanıklık uygulanan kamera katmanı opak zemin taşır. · *mekanik testi* · *PATTERNS K-57*
- **L-248 · DoF süzgeci dinlenmede kalkarsa raster yolu değişir (1.4)** — Hamle bitince odak süzgeci tamamen kaldırılırsa (σ → 0, süzgeç yok) Chromium başka raster yoluna geçer ve dinlenme karesinde keskinlik basamağı çıkar; hamle boyunca ve dinlenmede küçük taban değer verilir (L-235 ile aynı aile). · *mekanik testi* · *PATTERNS K-57*

## 2. Ölçüm

### 2.1 Ölçerin kendisi

- **L-043 · Ölçer önce kalibre edilir** — Kendi ölçerinin üç kusuru geç bulundu:
  - boyut yuvarlaması (~%0.07 ölçek sapması);
  - tam sayıya yuvarlanan pencere (½ px kayma);
  - iki tarafta farklı kaplama işlevi (alfa ↔ mürekkep).

  Ölçer önce kontrol dosyasıyla doğrulanır: aynı içerik ≈ 0.995 vermeli. · *world, retro* · *RV-3, M-SELF*
- **L-044 · Tutarsızlıkta önce araçtan şüphelen** — Ölçü animatik ↔ tam render arasında tutarsızsa önce ölçer incelenir. [ÖRNEK] `--step N` örnekleme bütün kareleri böldü: OURS 0.753 ↔ doğrusu 0.614. · *retro* · *M-SELF*
- **L-045 · Ölçü tanımı yazılı ve kaynağından** — "Kenar karanlığı ≤ %20" iki türlü okunabildi. Bir raporda göreli/mutlak eşik karıştı, var olan font "yok" yazıldı. Ölçü tanımı yazılır (nerede, neyle, hangi eşik, kim) ve kaynağından alınır; iddia ölçümle verilir. · *retro* · *ÇK-16*
- **L-046 · Karar ölçüsü tek ve tanımlı** — Ölçü ızgaraya kandı (eksene paralel uzun koşular "fazla çizgi" sayıldı) → eksene paralel koşular ayrı sayılır. Karar ölçüsü tek ve tanımlıdır (ör. p90); p95 küçük değişikliği kaçırabilir. · *retro* · *M-SELF*
- **L-047 · Eşik kenarındaki ölçü tek yoldan** — Eşiğe yakın ölçü iki araçta aynı yöntemle (aynı maske, aynı kare kümesi) alınır; farklı yollar farklı karar verdi. Önce/sonra aynı ölçüm yoluyla. · *retro* · *RP-8*
- **L-048 · Ayna ve tekrar eden nesne tek bileşen** — Simetrik/tekrar eden nesne aynı bileşenden gelir; birebirlik araçla doğrulanır. Görünüş değişirse bütün kullanımları birlikte yeniden çizilir. · *traps, retro* · *—*
- **L-049 · Aynı kavramın tek tanımı** — Aksan rengi ölçüm betiklerinde beş ayrı eşik tanımıyla ölçülmüştü; sonuçlar ayrıştı → renk sınıfı `world.json → classes`'ta tek kayıt, bütün araçlar oradan okur. · *retro* · *AK-9*

### 2.2 Çözünürlük, örnekleme, kontrast

- **L-050 · Küçük önizleme yanıltır** — Kontak etiket şeridi ve küçük kare yanıltır; kesin karar tam çözünürlükte verilir.
  - Animatik QC kontrastı güvenilmez: DOM 60 fps sayfa, görüntü 30 fps yarım çözünürlük → sahte 1.05:1.
  - 540p QC tam render'daki kontrast sorununu, ΔE'yi ve küçük metin örtüşmesini göstermedi.

  Final QC ayrıca, tam çözünürlükte koşar. · *traps, world, retro* · *KD-12, YG-1*
- **L-051 · Kontrast ölçüm yöntemi** —
  - Öğe kutusu değil metnin satır kutusu (Range) ölçülür; glif öğe kutusunun %6'sı olabilir.
  - Metin pikseli = medyandan uca yolun yarısını aşan mürekkep piksellerinin %90'lık dilimi. Seyrek glifte %95 dilim kenara düştü.
  - Kontrast yönü sezgiden değil DOM renginden alınır; sezgi 6.9'u 1.87'ye ters çevirdi.

  · *traps* · *KD-5, M-KONT*
- **L-052 · Örtülme testi** — Yalnız opak öğe ya da başka metin örter; saydam kap örtücü sayılmaz; dolgu alfası × fill-opacity hesaba girer (rgba < 0.85 örtmez). "Okunmuyor" bulgusu kareyle çelişirse önce ölçerin örtülme kararına bakılır. · *traps* · *KD-5, ÖRT-1*
- **L-053 · Boş örnek listesi = kontrol yok** — Yazılarak gelen metin glif örneklemesini kaçırdı → anahtar kareler de örneklenir. Örnek listesi boşsa kontrol yapılmamıştır, "geçti" değildir. · *traps, retro* · *KD-17*
- **L-054 · QC geçti ama okunmuyor** — Boyut ve doluluk ölçen QC ışığı ve kontrastı ölçmez. Kontrast render edilmiş pikselden ölçülür (DOM rengi ışık, bulanıklık ve örtülmeyi bilmez): kahraman − çevre ≥ 25/255, metin ≥ 4.5:1, world bandı. · *retro* · *KD-4, KD-5, ADR-019*
- **L-055 · Karanlık iki koşullu** — Boşluk üstü tipografide ortalama %4 olur ama kare boş değildir. Karanlık = ortalama < %8 **ve** parlak piksel payı (%30 üstü) < %0.05. Eski eşik (%40 / %0.1) güncel değil. · *traps* · *KD-8*
- **L-056 · Fade dedektörünün sınırı** — Dedektör 2–3 karelik, küçük ya da hareketli fade'i kaçırır. Ölçek/bulanıklık fade'i örter; ışığın gelişi fade değildir. Fade envanteri koddan da çıkarılır; dedektör doğrulama örnekleriyle sınanır. · *traps, retro* · *GÇ-3, M-FADE*
- **L-057 · Bant zaman ağırlıklı** — Seyrek örneklerin düz ortalaması yanıltır → bant trapez (zaman ağırlıklı) ortalamayla, grade sonrası ölçülür. · *retro* · *KD-6*
- **L-058 · Eşikler saniye + fps'ten** — Kare eşikleri sabit kodlanınca 60 fps'te süreler yarıya indi; sahne sonu muafiyeti animatik indeksinde tutmadı. Fps tek kaynaktan (manifest) bütün araçlara yayıldıktan sonra gerileme olmadı. Eşik saniyeyle yazılır, kare = saniye × fps. · *retro, world* · *MT-3, ÇK-12*

### 2.3 Kahraman ve kadraj

- **L-059 · K1 maskesi kahramanın bütünü** — K1 "en büyük parlak bileşen" değil, kahraman maskesinin bütünüdür. Maske modu CSS kuralı sahne sarmalayıcısını da gizledi → kural world köküne kapsanır. İnce ayrıntı (ince sap, ince çizgi) maskeye girmeyebilir; eşik buna göre okunur. · *retro, world* · *K1, M-K1*
- **L-060 · Kahraman kutusu mürekkep kutusunda** — Tek glifin satır kutusu kahramanı sulandırır → `data-hero` mürekkep kutusunda. Mürekkep kutusu drift'li kareden ölçülürse kayar → tasarım koordinatı = ölçülen − drift. · *world* · *K1*
- **L-061 · Koyu kahraman boşlukta** — Koyu kahraman boşlukta durursa temas gölgesi görünmez, kare boş siyah sayılır → aydınlatılmış yüzey + `hero: "dom"` (DOM alanıyla ölçüm). · *world* · *KD-1, KD-9*
- **L-062 · Harf başına span ölçülmez** — Harf başına `span`'a bölünen metin QC'de ölçülemez → metin tek düğümde tutulur. · *world* · *KD-2*
- **L-063 · Görünürlük izdüşümle** — Görünürlük, kadraj ve "ilk okunur kare" zaman eşiğinden ya da tasarım listesinden değil, kamera izdüşümünden (kare başı ekran kutusu) ölçülür. · *world, retro* · *KM-2*
- **L-064 · Render öncesi izdüşüm denetimi** — Kadraj denetimi render'sız, tasarım zamanında sayfada koşar (her 2–3 kare). Denetlenenler:
  - yüzey dışı alan %, kahraman kutuları, kesik metin, tepe payı;
  - alet görünürlüğü/hızı, örtme;
  - kamera basamağı.

  Animatik ancak denetim temizse yapılır. Bu denetçiler + paralel kaynak taraması bir fazı tek turda bitirdi. · *world, retro* · *VR-3, KM-2, fc:framing*
- **L-065 · Eğik kamerada çok değişkenli tarama** — Eğik kamerada iki koşul (üst glif payı, alt köşe payı) tek değişkenle değil ızgarada birlikte taranır; kenar testleri içeriden payla. · *world, retro* · *KD-14*
- **L-066 · Hedef geometri önce aramayla** — Genel bakış geometrisi (ör. yüzey payı ≤ %25) render öncesi izdüşüm aramasıyla (yaw/roll dahil) sınanır. Ulaşılamıyorsa sayıyla gerekçe yazılır. · *world, retro* · *KD-14*
- **L-067 · Kesit render'da son kare kuralı yok** — Perde kesiti (`slice: true`) bütün filmin parçasıdır; son kare siyah kuralı yalnız film sonunda uygulanır. · *retro* · *SN-2*

### 2.4 Zaman, devir, süre

- **L-068 · Durağan ve hareketli devir ayrı ölçülür** — Durağan dikiş ≤ 2/255; hareketli dikiş ≤ 1.1 × komşu kare farkı. Devir ölçümü bir formül hatasını (yanlış `max` birleşimi) yakaladı. · *world, retro* · *DV-1, DV-2*
- **L-069 · Kısmi animatikte de perde ölçüsü** — Kısmi animatikte perde OURS'u ölçülmedi, sorun tam render'da çıktı → perde toplamı kısmi animatikte de tahmin edilir. · *retro* · *K3, M-OURS*
- **L-070 · Yeni world özelliği tam render öncesi ölçülür** — Yeni ışık/doku özelliği ilk tam render'da kusur verdi → hareketli karelerde kenar/içeri luma oranı tam render öncesi ölçülür. · *retro* · *KD-11*
- **L-071 · Render süresi ölçümle** — Render süresi riski tahminle değil ölçümle yönetilir (kare süresi profili + `--frame-log` + imgdiff); asıl maliyet beklenmedik yerdeydi. 2× süre tahmini ilk kareden iyimser çıktı → temsilci karelerden tahmin. · *retro* · *RH-3, M-BENCH*
- **L-072 · Elle incelenen aralık kaydı** — Yönetmence incelenen QC uyarısı manifestte `review.<tür>: [[f0, f1, "not"]]` olarak durur. QC uyarıyı "incelendi"ye çevirir; hata gizlenmez. · *retro* · *SK-2*

### 2.5 Ölçerin sınırları (1.4)

- **L-239 · Varsayılan bölge içerikten bağımsız sonuç verir** — Keskinlik ölçüsünün varsayılan bölge çifti (aksan ↔ koyu nötr) aksansız klipte aksan olmayan sıcak bir zemini eşleyip "geçti", ışık değişince "bölgeler bulunamadı" verdi; hangi bölgenin ölçüldüğü yalnız satır içinde görünüyordu. Varsayılan bölge yalnız aksan olabilecek sahnede ölçülür; özet ölçülen bölgenin sınıfını ve kutusunu yazar; kapıda bölgeler açık tanımlanır. · *1.4* · *fc:sharpness, SS-2*
- **L-240 · Arama penceresinden hızlı hareket pop sanılır** — Hızlı düşüp büyüyen kartta en iyi öteleme arama sınırına dayandı, hareket açıklanamadı ve kare "tek kare belirme" sayıldı; aynı kartın bir sonraki karesindeki pop ise gerçekti (bulanıklık hız eşiğinde tek karede kapandı). Sınırdaki en iyi öteleme ayrı işarettir: geniş pencere hareketi açıklıyorsa "aday", açıklamıyorsa ihlal. · *1.4* · *fc:pop, ZN-1*
- **L-241 · Tek pencere sayısı düzeltme turunu yanıltır** — Zamansal ölçü pencere başına yalnız en kötü oranı yazınca bildirilen 3 kareye karşı aynı tanımla tam tarama 25 tasarlanmamış sıçrama buldu; kök nedenler ayrıydı (raster yolu, kimlik çakışması, süzgeç yüzeyi). Eşik üstü bütün kareler listelenir; düzeltme turu kare listesiyle açılır. · *1.4* · *fc:temporal, RP-4*
- **L-242 · Tek mutlak eşik yumuşak öncüyü geç sayar** — Mürekkep için kurulmuş görünürlük eşiği (40/255) gölge rampasını ana vuruşla aynı karede ya da hiç "görünür" saydı: gölge 10/255'te çapada başlıyordu. Öncü sınıfına göreli eşik (öğenin tam farkının oranı), referans klipten kalibre. · *1.4* · *ZN-7, M-ONCU*
- **L-243 · Plan saniyede, render kare ızgarasında** — Plan eşikleri saniyede geçti ama 60 fps ızgarada kısaldı (120 ms → 7 kare = 116,7 ms); yuvarlama yönüne göre bant dışı öncü sayısı birkaç kat değişti. Plan denetimi render ızgarasında, yuvarlama yönü yazılı yapılır. · *1.4* · *M-IZGARA*
- **L-244 · Hız ölçerleri ayrışınca kapı sayısı tek yöntem** — Aynı hamlede kanca hızı, blok büyüklüğü medyanı ve piksel izleme farklı C1 verdi: medyan paralakslı sahnede iki derinlik kümesi arasında geçip basamak üretti, kanca settle'ı ayrı mikro hamle sayıp küçük tepeye böldü. Kapı sayısı tek tanımdan (piksel izleme, baskın küme ya da LK; settle ana hamlede), diğerleri beklenti. · *1.4* · *ZN-6, M-C*
- **L-245 · Uzun A/B ölçüsü ilerleme ve kesilme nedeni ister** — Görünür başlangıç A/B kipi uzun animatikte saatler sürdü; ilerleme satırı yoktu ve dış süre kesmesi "kanca yok" diye raporlandı; koşu üç kez "bitmiyor, kök neden yok" diye bırakıldı. Uzun ölçü süresi önceden hesaplanır (olay × pencere × s/kare), arka planda üst sınırla beklenir; kesilme ayrı iletidir. · *1.4* · *ÇK-09, fc:onset*

- **L-249 · Yavaş kuyrukta SAD hız izi gürültülüdür (1.4)** — `motion-test` piksel izi 1 px/kare altındaki hızda gürültülü; settle kuyruğunda sıçrama gibi görünen değer ölçer gürültüsüdür. Yavaş kuyruk tasarım profilinden (`-hiz.json` `design`) ya da LK alt piksel izlemeden (M-C) okunur. · *mekanik testi* · *MEASURE M-C*
- **L-250 · Katlamada C1 yay hızından okunur (1.4)** — Katlanan yaprağın serbest kenarının ekran izdüşümü dönüş boyunca yön değiştirir (90°'de geri döner); izdüşüm hızından C1 hesaplamak sahte sıçrama verir. C1 menteşe açısının yay hızından ölçülür (`MH.mek.fold(…).plan()`). · *mekanik testi* · *PATTERNS K-56*

## 3. Kamera / hareket

- **L-073 · Kamera sürekli ve okutur** — "Her shot hareketli" kuralı yüzünden kamera hiç durmadı, okuma bozuldu. Hareket tabanı ile okuma tutuşu birlikte tasarlanır ("kamera varır, okutur, devam eder"); hedef hareketli pay ≈ 0.6; eğri monoton. · *retro, world* · *İL-5, K3*
- **L-074 · Basamak 0 — vurgu nesnede** — Damgada kameraya eklenen "darbe" (1 kare 2 px) basamak sayıldı ve kullanıcı reddetti. Vurgu kamerada değil nesnede (ölçek 1.05 → 1, mürekkep oturması). Darbe gerekiyorsa yalnız darbe alan katmanda, kadraj ≤ 1 px. · *world, kullanıcı, retro* · *BAS-1, BAS-2*
- **L-075 · Ara anahtarda yön değişimi hızı sıfırlar** — Monoton kübik kamera eğrisinde ara anahtar yön değiştirirse hız sıfırlanır (görünür duraksama) → bileşen bazında monoton tasarım; ardışık hız sıçraması > 2.5 px/kare @60 sayısı 0. · *world, retro* · *KM-6, BAS-1*
- **L-076 · İkincil darbe yönü** — İkincil darbe (`nudge`) kamera sürüklenmesine ters verilirse ekran hızı ≈ 0 olur (duraksama) → dik ya da aynı yön; faz 0 (hız darbesi). · *world* · *KM-9*
- **L-077 · Önce mesafe bütçesi** — Hız tavanı ile kompozisyon çakışınca önce mesafe bütçesi hesaplanır: yol ≤ hız × (t2 − t1) − rampa/bekleme kayıpları. Çelişkide açık sayılar korunur; süre, bekleme ya da boyut esner. · *traps* · *KM-3*
- **L-078 · Zaman iskeleti yerleşimi belirler** — Kullanıcının zaman iskeleti alet yolculuğuna yer bırakmıyorsa yerleşim buna göre kurulur (yol kısalır); hız tavanı aşılmaz. · *world* · *KM-3*
- **L-079 · Görünür hız sınırı** — Nesne/alet hızı görünür kısımda (uç ya da gövde kadrajda) ölçülür: [ÖRNEK] ≤ ≈ 57 px/kare @1080p60, mutlak + göreli. Uzun yollu ease-in-out girişte görünür kısım 100–200 px/kare'ye çıkar → yamuk hız profili. · *world, retro* · *KM-10*
- **L-080 · Çıkış yolu kamerayla kısaltılır** — Çıkan nesnenin yolu kameranın hareket yönüyle kısaltılır (kamera inerken nesne yukarı çıkar); çıkış yavaşlamadan biter. · *world, retro* · *KM-11*
- **L-081 · Alet yolu ∩ etiket = 0** — Alet yolu ile etiket kutusunun kesişimi izdüşümle denetlenir; etiket aletin varışından sonra yazılır. Gövde/kiriş ∩ komşu metin = 0 denetçiye baştan verilir. · *world* · *KM-11, ÖRT-1*
- **L-082 · Bilinçli hold ve ölü açılış** — Hold kesmeye göre ölçülür: son vuruş kesmeden ≥ 0.25 s önce biter; açılış hareketsizliği ≤ 1.3 s; çizim arası ≤ 0.6 s. · *world* · *KM-14*
- **L-083 · Hiçbir öğe tek karede değişmez** — Düz → 2.5D gibi temsil değişimi tek karede olursa basamak okunur; etiket satırı birden belirirse K8 ihlalidir. Çözüm sıralı rampalardır (çizilir → kalkar → gölge kopar → çerçeve → iz silinir). Her başlangıç/bitiş ≥ 0.1 s ofsetli; ardışık fark oranı ≤ 1.5. Tutuşta gren/ışık oranı 2–3 verir; eski karelerle kıyaslanır. · *world, retro* · *K8, fc:temporal*
- **L-084 · Gizlenen katmanın şeridi** — Gizlenen alt katmanın açıkta kalan şeridi tek karede boşluğa döner → yalnız şerit tutulur ve hareketle çıkarılır. · *world* · *K8*
- **L-085 · Perde devri** — Yeni nesne önceki perdenin son karesinde belirmez (kadraj sınırı izdüşümle ölçülür). Devirde öğe kaybolmaz: ya örtülüdür ya yeni perdenin öğesidir. · *traps* · *DV-5*
- **L-086 · Kare-kesin olay metnin dışına düşer** — Yüksek hızda (81 px/kare) kare-kesin olay metnin dışına düştü → olayın konumu kare hesabıyla metnin içine konur. · *traps* · *ÇEN-2*
- **L-087 · Eşitsiz parçalarda spline taşar** — Catmull-Rom eşitsiz parça boylarında taşar → parçalanır + centripetal (α 0.5). · *world, retro* · *—*
- **L-088 · Farklı z'deki düzlemleri bağlamak** — İki düzlemi bağlayan çizgi/kablo gerçek 3B eğri + her karede izdüşümdür; düz ekran parçası "raf" kırığı yapar (hata gibi görünür). · *world, retro* · *HAT*
- **L-089 · Eğik kamera + geniş lens** — Eğik kamera ve geniş lens dikeyleri yatırır (34°/1100 → ~20°) → kaydırmalı lens `oy = ufuk + P·cot(tilt)`. · *traps* · *—*
- **L-090 · Kamera arkası ters izdüşer** — Yaw'da kameranın arkasındaki nokta ters izdüşer → izdüşüm noktası gözün önünde seçilir. · *traps* · *KM-2*
- **L-091 · Kadraj payı** — Bir itiş lyric'i kadraj dışına taşıdı, kaydırmada yüzey kenarı göründü → kadraj payları (ör. okunacak metin tepe ≥ 50 px, yüzey kenarı içeriden ≥ 12 dünya px) izdüşümle doğrulanır. · *retro* · *KD-14*
- **L-092 · Varyant anahtarı kendi shot'unda** — Üç varyant aynı çıktıyı verdi → varyant anahtarı kendi shot'unda, kilit an shot ortasında seçilir. · *retro* · *VR-1*
- **L-093 · Genel bakışta ince çizgi kaybolur** — Genel bakışta bağ çizgisi ekranda ≥ 5–6 px olmalı (kalınlık ≈ 6.5/k). Çizgi kelimede başlar ama hedefi kadraja girdikten sonra varır. · *world* · *—*
- **L-094 · Kamera geçiş ritmi** — [ÖRNEK] Bölge zinciri kamera yönünde geçiş 1.25–1.5 s, tepe ≈ 20 px/kare. Sınırdaki shot'ta varışı 0.1 s geciktirmek K3 payını kurtardı. · *world* · *K3*

## 4. Tipografi

- **L-095 · Türkçe büyük harf satır aralığı** — İ noktaları üst satırın altına düşer → satır aralığı ≥ 1.2 × punto; `text-transform: uppercase` yerine doğrudan büyük harf. · *world, retro* · *KD-15*
- **L-096 · Kesik metin glif sınırıyla** — Kesik metin kutusu Türkçe aksan/noktayı (İ, Ş, Ç) kapsamaz → glif sınırı = satır kutusu üstü − pay; tam çözünürlük probe; okunacak metin tepe payı ≥ 50 px; metin kutusu ölçümüne iniş/çengel payı +%20. · *world, retro* · *KD-13*
- **L-097 · Glif kapsamı ölçülür** — Font alt kümesinde glif eksikti (≥ ≤, alt simge) → genişletilmiş alt küme. Matematik fontu alt/üst simge taşımaz → aynı aile adı, ayrık `unicode-range` ile başka yüzden. Kapsam cmap ile ölçülür, tarayıcıda genişlik karşılaştırmasıyla doğrulanır; alt küme kalıbı da sınanır. · *world, retro* · *KD-17, fc:glyph*
- **L-098 · Okunacak metin koyu ve kalın** — İnce mono metin ışık düşümünde 3.4–4.0:1'de kaldı → okunacak metin koyu ve kalın; ince/soluk metin `data-doku`. · *world* · *KD-5*
- **L-099 · Pop'un ilk karesi** — Belirme animasyonunun ilk karesi küçük boyuyla okunacak metin sayıldı → giriş boyunca `data-doku`. · *world* · *KD-2*
- **L-100 · Eğik yüzeyde en üst satır** — Eğik yüzeyde kadraj üstü küçülür (25 → 20.7 px) → en üstteki okunacak satır ölçülür. · *traps* · *KD-2*
- **L-101 · Derinlik bulanıklığı ≤ 0.5 px** — 1 px raf bulanıklığı okunacak etiketi düşürdü; fazlası ancak `data-doku`. · *traps* · *KD-16*
- **L-102 · Kenarda yarım simge** — Kadraj kenarında yarım kalan simge yanlış okundu ("?" → "!") → simge tam içeride ya da tam dışarıda. · *world* · *HAT, KD-13*
- **L-103 · Rack'te iki kelime aynı kadrajda** — Kelime değişimi (rack) iki kelime aynı kadrajdayken okunur. · *world* · *—*
- **L-104 · El yazısı zamanı yola orantılı** — Glif başına eşit zaman dilimi zıplama yapar → zaman yola orantılı. Kalem gövdesi yazılmış satır bandına uzanmaz; yazım hızı sınırlı, kısaltma yok. · *world, retro* · *KM-12*
- **L-105 · Yazım anı ≠ kelime anı** — Look-dev ve kontrol karesi = son okunacak öğenin yazım bitişi + 0.1 s; kelime başı değil. · *world* · *VR-5*
- **L-106 · Kaynaklı metin glif glif doğrulanır** — Kaynaktan alınan içerik (formül, alıntı) kaynak kırpımı ↔ render glif glif karşılaştırılır; uydurma ya da tamamlama yok. · *retro, kullanıcı* · *—*

## 5. Işık / renk / grade / encode

- **L-107 · Kendinden ışıklı yüz düşümün üstünde** — Işık düşümü kendinden ışıklı nesneyi de karartır (×0.14) → ışıyan yüz üst katmanda. Gölge de ışıyan yüzü karartır → gölgeler ayrı geçişte, altta. · *traps, world* · *IŞ-4*
- **L-108 · Screen ışık siyahı kaldırır** — Screen karışımlı ışık mürekkebi +50 düzey açtı → okunacak metinli kahramanda çarpımsal ışık. · *world, retro* · *KD-5*
- **L-109 · Işık içerikle seyrelir** — Işık hedefi içerikle seyrelir → görünür hedef ölçülerek seçilir. Yansıma/bant ışığı verinin/metnin arkasına düşmez, veri olmayan tarafta toplanır. · *world* · *IŞ-2*
- **L-110 · Kadrajı dolduran yüzey bandı sıçratır** — İtiş kadrajı aydınlık yüzeyle doldurunca ortalama yükseldi, bant sıçradı (%32 → %46) → havuz erken daralır ya da pozlama telafi edilir; bant etkisi ölçülür. · *world, retro* · *IŞ-10*
- **L-111 · Pozlama kamera ölçeğine bağlı** — Genel bakışta yüzey payı büyüdükçe ortalama bandın altına düştü → pozlama k'ya bağlı açılır, hareketle sürekli (fade değil); devir karesi birebir kalır. · *world, retro* · *IŞ-10*
- **L-112 · Işıkla açılış fade sayılabilir** — Şiddet ve havuz birlikte büyüyünce fade dedektörü fade saydı → şiddet kısa sürede (2 kare), havuz merkezden. · *retro* · *GÇ-6*
- **L-113 · Işık çapası kayar, sıçramaz** — Işık çapası perde içinde 35 px sıçradı → dal değişiminde çapa 0.5–0.6 s ease-in-out kaydırılır. · *traps* · *IŞ-6*
- **L-114 · Işık arkı "kırık" tanımı** — İlk kural hızlı süzülmeyi de kırık saydı → kırık = görünür ışıkta ivme sıçraması ya da şiddet basamağı (> 0.03); kesintisiz hızlı süzülme kırık değil. · *traps* · *IŞ-5, M-ARC*
- **L-115 · Geri çekilmede havuz küçülür** — Dolly-out'ta havuz küçüldü, kare karanlığa düştü (%6.9) → yarıçap büyütülür, beklenti ışığı. · *traps* · *KD-8*
- **L-116 · İki ışık birlikte ölçülür** — İkinci ışık parlak havuzda (screen) kayboldu → iki ışık birlikte ölçülür, buluşma havuz kenarında. Kopuk "ada" havuzlar koridor okutmaz → havuzlar büyük ve yumuşak, ortam ≥ %10. · *traps* · *KD-10*
- **L-117 · Tek aksan büyük logoyla sulanır** — Vuruşun ±2 s çevresindeki büyük logo tek aksanı sulandırdı → logo küçük ya da kadraj dışında; konum taramasıyla doğrulanır (izinli kutular dışında aksan 0). · *world* · *AK-7, AK-4*
- **L-118 · Marka rengi teslim edilmiş dosyadan ölçülür** — Aynı logo farklı ışıkta farklı düşer → teslim edilmiş grade'li mp4'ten (iç piksel medyanı) ölçülür; yeni sahnede kaynak renk ona uydurulur (ΔE2000 ≤ 3). Tutarlılık yeni perdeden önce ölçülür. · *world, kullanıcı, retro* · *AK-5, M-DE*
- **L-119 · Süzgeç rengi değiştirir** — Aksan çizgisi doku süzgecinden geçince grade sonrası ΔE 5.1–6.0 çıktı; süzgeçten çıkarılınca 2.2–2.5 → tek aksan rengi grade sonrası tek karede **erken** ölçülür. · *retro* · *AK-5*
- **L-120 · Işık değişikliği renk sınırını taşıyabilir** — Işık vuruşu ölçülmüş bir renk sınırını (ΔE) etkiliyorsa değişiklikten önce probe edilir. · *retro* · *AK-5, ÇK-05*
- **L-121 · QC aksan köprüsü** — İnce aksan alt-piksel evresine göre eşiğin altına düşüp tek vuruşu iki aralık saydırdı → < 0.067 s boşluk köprülenir, mekânsal örtüşme şartıyla (8 px). · *retro* · *AK-3*
- **L-122 · Aksan ↔ ikincil renk oranla ayrılır** — Yakın iki renk sınıfı (ör. kırmızı/bordo) eşikle karıştı → kanal oranıyla ayrılır, kenar karışımı düşülür; değerler world'de. · *traps* · *AK-9*
- **L-123 · Renk yerinde değişirse fade olur** — Ekran rengi yerinde değişince fade sayıldı → durum değişimi tarama silmesiyle. · *world* · *GÇ-5*
- **L-124 · Jenerik dünya dili kimliksiz** — Jenerik "ekran grafiği" dili her filme benzedi → dünyanın ışığı ve rengi projenin kimliğinden türetilir; soğukluk anlatıdan gelir, renk sıcaklığından değil. · *retro* · *YR-2*
- **L-125 · Master tek sürekli encode** — Perde mp4'leri uç uca eklenince dikişte IDR sıçraması çıktı (ardışık fark 0.79 ↔ komşu 0.10–0.17) → master tek sürekli encode (concat süzgeci, `setsar=1`); uç uca ekleme yalnız ön izleme. · *world, retro, kullanıcı* · *MS-3, DV-4*
- **L-126 · Encode saf siyah penceresi** — Grade sahne sonunda renk dengesini ve siyah noktasını birden kapatınca inişli sonda tek karede basamak çıktı (Y −8) → `grade.fadeOut [n0, n1]` (tam ↔ saf grade kare kare). Doğrulama ham karede değil mp4 Y düzleminde. · *world, retro* · *SN-4*

## 6. Ses

- **L-127 · Önce sesi hizala** — Yeni ses "aynı çekim, bir kelime kesik" sanıldı. Zarf korelasyonu (10 ms RMS, kayan 1.5 s pencere) kaymanın sürekli değiştiğini gösterdi (+200 → −1370 ms): yeni çekim, kare kopyası değil yeniden çizim. · *world, retro* · *SES-3, fc:sync*
- **L-128 · Kayma iki bağımsız yoldan** — Kelime çapaları ve zarf ayrı ölçülür, biri öbürünü sağlar. Ses karakteri değişen bölgede (fısıltı → normal) zarf kullanılmaz; çapalar doğrudan akustikten. · *retro* · *SES-3, AUDIO §5*
- **L-129 · Tasarım zamanı korunur** — Sahne sabitleri eski ses zamanında kalır, eşlem çevirir.
  - En az eğrilikli yumuşatma spline'ı kullanılır: monoton kübik ara düğümde hızı 1.4×'e çıkardı, spline 1.17× verdi.
  - Perde sınırları kare ızgarasında sert.
  - Birebir aralıkta tam kimlik; 1e-9 yuvarlaması bile kareyi değiştirir.

  · *world, retro* · *SES-3, AUDIO §7*
- **L-130 · Eşlemin yan etkileri** — Eşlem kare başı tasarım süresini değiştirir:
  - hareket bulanıklığı tasarım kare süresiyle hesaplanır;
  - kamera hız kancaları sayfa kareleriyle çalışır;
  - perde başlangıcı eşlenmiş sınırla algılanır;
  - manifestte perde aralıkları ses zamanında, shot zamanları tasarım + ses alanlarıyla.

  · *world* · *AUDIO §7*
- **L-131 · Silinen kelime çapasız** — Silinen kelime için çapa uydurulmaz; süresi komşu çapalara yayılır (0.58 s → hız ≤ 1.31×). · *world* · *AUDIO §6.2*
- **L-132 · Whisper halüsinasyonu** — Uzun geçişte sıfır süreli tekrar, sıfır süreli uydurma kelime ve kelime bölme görüldü. Kelime farkı kararından önce şüpheli bölge kısa kliple, önceki metne koşulsuz (beam 5/10) yeniden çözülür; ham çıktı ayrı saklanır. Doğrulamasız "fark var → DUR" yanlış tetiklenir. · *world, retro* · *SES-4*
- **L-133 · Whisper duraktan sonraki kelimeyi kaydırır** — Duraktan sonraki ilk/kısa kelime sessizliğe kaydı (−0.24 s) → iki seste aynı akustik çapa yöntemi; zarfla > 50 ms çelişen çapalar atılır; konuşma sonu akustik ölçülür. · *world, retro* · *SES-3*
- **L-134 · Kelime sınırı sessizliğe taşar** — Whisper kelime sınırı sessizliğe ±0.2–0.5 s taştı → kesme TC = ±0.6 s pencerede ölçülen en uzun sessizliğin ortası. · *retro* · *SES-5, AUDIO §4*
- **L-135 · Kelime → zaman shot aralığıyla** — Aynı kelime iki shot'ta geçti, eşleme yanlış kelimeye bağlandı → kelime → zaman eşlemesi shot aralığıyla sınırlanır. · *retro* · *AUDIO §5*
- **L-136 · Saklı kare bayatlığı** — "Birebir aralık, kareler kalır" kararından önce saklı kare güncel kodla probe edilir. Eski bir doku kalıntısı (0.56/255) tutulsaydı yeni karelerle sıçrama yapardı. · *world, retro* · *RH-6*
- **L-137 · Yeni perde yeni ses zamanında** — Eşlem yalnız önceden tasarlanmış perdeler içindir; yeni perdeler doğrudan yeni ses zamanında tasarlanır. · *kullanıcı, retro* · *AUDIO §7*
- **L-138 · Yeni ses kuralı |Δ| ≤ 33 ms** — Kayması ≤ 33 ms olan shot'un kareleri aynen kalır; diğerleri eşlemle yeniden çizilir. Plan (kayma tablosu + yeniden çizim + süre tahmini) kullanıcıya DUR 1 olarak gider. · *kullanıcı* · *SES-2*
- **L-139 · Işık çekilişi kelime içinde başlamaz** — Son kart okunmadan sönüyordu → sessiz kuyruk (tutuş + çekiliş + siyah, sese düz sessizlik); kuyruk K3'e dahil değildir (kural, istisna değil). · *kullanıcı, world* · *SN-7*
- **L-140 · Olay ↔ kelime ≤ 1 kare** — Fiziksel olay kelimenin ses başından ≤ 1 kare sonra ve olay anında tam gelir; öne düşen olay ses–görüntü kopukluğu yaptı. · *kullanıcı* · *ÇEN-1, ÇEN-2*
- **L-141 · Metin farkı beklenmeyen yerde → DUR** — Yeni seste metin farkı yalnız beklenen yerlerde olmalı; klip doğrulamasından sonra başka fark kalırsa DUR. · *kullanıcı* · *SES-4, DUR-8*
- **L-142 · Ses çözümü ffmpeg ile** — Transkripsiyon kütüphanesinin kendi ses çözücüsü kurulu sürümle uyumsuzdu → ses ffmpeg ile 16 kHz mono f32'ye çözülür, dizi doğrudan modele verilir. · *retro* · *AUDIO §0*
- **L-143 · Master ses kuyruk dahil** — Loudness kuyruk dahil ölçülür; doğrusal kazanç, sınırlayıcı yok. Hedeften küçük kodlama sapması (AAC VBR ~245k ↔ 320k) kayıtlı kabul olarak yazılır. · *kullanıcı, retro* · *MS-2, M-LOUD*

## 7. Üretken varlık

- **L-144 · Kabul kare kare** — Kontaktan kabul edilen klipte sonradan geometri kırığı bulundu → kabul 1 s aralık, tam çözünürlük + hareketli bölge haritası + bağımsız reviewer. · *retro, kullanıcı* · *GENAI §9.3, UCUZ-9*
- **L-145 · Plaka normalize görüntüde** — Küçük kontakta silik yazı görünmedi → plaka kabulü kontrast gerilmiş görüntüde. · *retro, world* · *GENAI §9.4*
- **L-146 · Olumsuz istem izlenmez** — Model "yazı yok / parmak yok" istemini izlemedi; pahalı model tek denemede tuttu → istem güvence değil, tarama şart; ucuz modelde ısrar edilmez, gerekçeyle geçilir. · *retro* · *GEN-7*
- **L-147 · Referanslı üretim geometriyi korur, çizgiyi korumaz** — Anahtar kareden üretilen plaka geometriyi korudu ama çift çizgi ve eklenmiş nesne verdi → iki yönlü kabul ölçüsü. · *retro* · *GENAI §9.4*
- **L-148 · Kabul ölçüsü iki yönlü** — Tek yönlü ölçü (vektör → plaka p90) fazla çizgiyi kaçırdı → ters yön ("bant içi fazla") da ölçülür. · *retro* · *GENAI §9.4*
- **L-149 · Türetilmiş varlık bayatlar** — Kaynak geometri değişince anahtar kareden üretilen plaka bayatladı; p95 küçük değişikliği kaçırdı → bayatlık bekçisi, "değişen pay" ölçüsü. · *retro, world* · *GENAI §9.4*
- **L-150 · Varyant adı sürüm sonekiyle çakışır** — `-v1` adlı varyant ingest sürüm sonekiyle karıştı → harita anahtarı istek kimliğinden; sürüm deseni `^<id>(-v\d+)?$`; kimlik eşleşmesi tam kalıpla. · *retro* · *GEN-2*
- **L-151 · Reddedilen varlık haritaya girmez** — Ret notlu varlık sahneye giriyordu → ingest `ret` ve `supersededBy` olanı haritaya koymaz. · *retro* · *GENAI §9.1*
- **L-152 · Klip karesi shot başından** — Pencere karesi yanlış başlangıçtan sayıldı → klip karesi shot başından sayılır. · *retro* · *GEN-5*
- **L-153 · Kural kapsamı açık yazılır** — "Onaysız 3. varyant yok" kuralının A klibini mi B plakasını mı kapsadığı belirsizdi → kapsam politikada açıkça yazılır. · *retro* · *GEN-6*
- **L-154 · fps karışması** — 24 ↔ 30 fps kare dizileri karıştı, talimattaki "temiz aralık" bozuldu → aralık bağımsız ölçülür. · *retro* · *GENAI §9.2*
- **L-155 · Kapı turları krediye dokunmaz** — Storyboard, animatik ve reviewer turları motorla yapılır; üretken final kapıdan sonra gelir; her tur bulgusu künyeye tablo olarak yazılır. · *retro* · *K7, GEN-6*
- **L-156 · Taslak önce yalnız video** — Taslak görüntü üretmek para kaybıydı → taslak yalnız videoda (480p/720p); görüntü doğrudan hedef çözünürlükte; final yeni sürümdür. · *retro* · *GEN-6*
- **L-157 · Yabancı nesne bekçisi** — Model yüzey dışı nesne çizebilir → kabul taramasında yabancı nesne aranır. · *world* · *GEN-7*
- **L-158 · Plaka kendi koyu kenarını taşır** — Üretken plakanın kendi koyu kenar bandı (7 px → 34 birim) göründü → görünür kenarda kırpılır. · *world* · *GENAI §9.4*
- **L-159 · Yer tutucu** — Yer tutucu render'a girmez. Taslakta kullanılacaksa siyah değil, beklenen kütle ve tonda olur (siyah disk kahramanla yarıştı). · *world, kullanıcı* · *K4*
- **L-160 · Harici varsayılanlar bekçiyle çelişir** — Servisin kendi skill'leri başka model ve "tahmin yapma" önerdi → tek kapı, bekçi kodda, harici varsayılanlar geçersiz. · *retro* · *GEN-8, ADR-024*
- **L-161 · Katalog id ≠ CLI job; uygulama fiyatı ≠ CLI fiyatı** — CLI'da bir katalog id'si başka (pahalı) bir modelin takma adı çıktı. CLI uygulamadaki indirimi uygulamadı (liste fiyatı) → eşleme tablosu tutulur; fiyat bakiye farkıyla ölçülür. · *retro* · *GENAI §3*
- **L-162 · "nsfw" yanlış pozitif** — Servis soyut doku istemini "nsfw" ile reddetti (0 kredi) → istem nötr "doku çalışması" diliyle yeniden yazılır. · *retro* · *GENAI §14*
- **L-163 · Çıktısız iş kredi keser** — Bir iş HTTP 503 döndü: çıktı yok, kredi kesildi; açıklama ledger'ın serbest metninde kaldı → yapılandırılmış `lost[]` + iade durumu (`account transactions`). · *retro* · *GEN-3, GENAI §10*
- **L-164 · Seed yoksa üretim tekrarlanamaz** — Bazı modellerde seed yok → varlık hash'le saklanır; "yeniden üret" yoktur, değişiklik yeni sürümdür. · *retro* · *GEN-2*
- **L-165 · Logo vektörünü raster'dan kurmak** — Özel çizim logo yerel yüzlerle harf harf bindirilemedi (IoU ≈ 0.91). Yol: katman başına seçilen büyütme → potrace → köşe bölme + doğru/kübik → kabul ölçüleri; bağımsız denetçi ölçmeden render yok. · *world, retro* · *ML-2, M-LOGO*
- **L-166 · Logo izlemede sürekli kaplama** — İkili maske kenar yumuşatmasını attı, izde basamak yaptı → sürekli kaplama maskesi. · *retro* · *ML-2, M-SELF*
- **L-167 · Vektör değilse DUR ve iste** — Raster logodan izleme kenar dalgası verir → logo SVG/AI/PDF değilse DUR ve vektör istenir; kendimiz kurmak kullanıcı kararıdır. · *kullanıcı* · *DUR-8, ML-2*
- **L-168 · İndirilmiş içerikte filigran ve lisans** — Sosyal medyadan indirilen kaynakta filigran vardı, lisans belirsizdi → temiz bölüm seçilir, lisans rapora; lisansı bilinmeyen ya da kişi içeren görsel kullanılmaz, motorla yeniden çizilir. · *traps, retro* · *GEN-9, ML-1*

## 8. Süreç / orkestrasyon

### 8.1 Reviewer ve kapılar

- **L-169 · Kalıcı reviewer bağlamı şişer** — Aynı reviewer ajanı faz faz devam ettirildi:
  - bağlam ≈ 111 MB'a çıktı;
  - önceki bulguları hatırladı ama "işi görmemiş" niteliği aşındı;
  - yapanın puanı ve iddiaları da verilir oldu;
  - sonunda dosya yazmaya başladı.

  Çözüm: **her kapıda taze reviewer**. Hafıza `docs/REVIEWER.md` kaydıdır; tek düzeltme turunda önceki karar girdi olarak verilir. · *retro* · *RV-1, TUR-2, ÇK-14*
- **L-170 · Reviewer kendi yöntemiyle ölçer** — Reviewer yapanın aracını ve sayılarını referans almaz; kendi küçük betiğiyle (farklı rasterleyici, farklı ölçü) ölçer. Yapanın gerekçesini görmez, düzeltme yapmaz, künyedeki iddiaları karelerden doğrular. Bağımsız ölçüm yapanın aracındaki hatayı buldu. · *kullanıcı, retro* · *RV-2, RV-3, M-REV*
- **L-171 · Ajan tanımı yüklenmezse** — Proje klasöründeki ajan tanımı oturum başka dizindeyken yüklenmedi ("agent type not found"). Rol istemle üstlendirildi, model ataması uygulanmadı → ajanlar plugin `agents/` altında. · *retro* · *—*
- **L-172 · Belgeler reviewer'dan önce** — Kapı turunda belgeler (künye, faz kararları, manifest) güncellenmeden reviewer çağrılınca bulgular "eski okuma" ile kirlendi → belgeler reviewer'dan ÖNCE güncellenir. · *retro, kullanıcı* · *ÇK-06*
- **L-173 · Tek düzeltme turu** — Reviewer GEÇMEZ → tek düzeltme turu → yine GEÇMEZ ise DUR (kontak + nedenler, render yok); 3. tur yok. · *kullanıcı, retro* · *TUR-1, DUR-9*
- **L-174 · Animatik kapısı** — Bir perde render'ı yer tutucu, küçük ölçek, düşük yoğunluk ve hareketsizlik yüzünden reddedildi; saatler boşa gitti → tam render öncesi animatik + kontak + ölçüm → reviewer → kullanıcı; onaysız tam render yok. · *kullanıcı* · *K7, DUR-1*
- **L-175 · Envanter tabandır, tavan değil** — Mevcut bileşen envanteriyle yetinen tasarım seyrek kaldı ve reddedildi → envanter başlangıçtır; eksik bileşen yazılır. · *kullanıcı* · *K6*
- **L-176 · Sözlük tasarımdan önce onaylanır** — Shot başına nesne/görsel sözlüğü tasarımdan önce kullanıcı onayına gider. · *kullanıcı* · *DUR-1*
- **L-177 · Hata gibi görünen öğe** — Reviewer şunları kare numarasıyla arar: kesik kelime, havada nesne, tek karede beliren/kaybolan öğe, anlamsız alet, kırpık ok. Ön plan nesnesi için beş soru sorulur: yerde mi · temas gölgesi · örtme · bulanıklık · hata görünümü. · *kullanıcı* · *HAT, RV-6*
- **L-178 · FİNAL reviewer kaydıyla** — Teslim belgesi reviewer kaydı "bekliyor"ken FİNAL yazıldı → reviewer GEÇER kaydı olmadan FİNAL/TESLİM yazılmaz. · *retro* · *RV-7*
- **L-179 · Yönetmen geçişi zorunlu** — Render sonrası kontak + anahtar kareler tam çözünürlükte incelenir; kare numaraları bağlayıcıdır; sapma gerekçesiyle yazılır. · *kullanıcı* · *YG-1*

### 8.2 Karar, kural ve rapor disiplini

- **L-180 · Kapalı karar tekrar sorulmaz** — Kullanıcının "kapalı" ilan ettiği karar birkaç rapor boyunca tekrar soruldu → kayıtta "KAPALI KARAR"; rapordan önce aranır; açık karar listesi önceki rapordan kopyalanmaz. · *kullanıcı* · *ÇK-03, RP-2*
- **L-181 · Kasıtlı ihlal yok** — Denetçinin bulduğu SERT ihlal (kamera basamağı) "muhtemelen kasıtlı" diye bırakıldı, kullanıcı reddetti → yeri ve sebebi bulunur; ya düzeltilir (animatikten önce) ya da önce sorulur ve kayıtlı istisna olur. · *kullanıcı, retro* · *ÇK-04, DUR-10*
- **L-182 · Teşhis önce, sayıyla neden** — Brief'in varsayımı ölçünce geçersiz çıktı; neden dört deneyle sayıyla bulundu. Probe ölçmeden kurulan efekt yeni sorun getirdi → teşhis düzeltmeden önce, raporda, sayıyla. · *retro, kullanıcı* · *ÇK-05*
- **L-183 · "Giderildi" kare numarasıyla** — Düzeltme yeni hata getirdi; künye "giderildi"yi doğrulamadan yazmıştı → her "giderildi" kare numarası ve ölçümle kanıtlanır. · *retro* · *ÇK-16*
- **L-184 · Bağlayıcı tablodan sapma önce sorulur** — Pencere/sahne tablosu bağlayıcıdır; sapma gerekiyorsa durulur ve sorulur, kendi başına değiştirilmez. Bunun dışında soru sorulmaz: eksik işaretlenir, açık karar olur, iş sürer. · *kullanıcı* · *ÇK-01, ÇK-02, DUR-3*
- **L-185 · Bilinen kısıtı önceden sor** — Kullanıcının bilinen bir eleme kuralı sorulmadan aday sunuldu; adaylar boşa gitti → bilinen kısıt seçimden önce sorulur. · *retro* · *ÇK-02*
- **L-186 · SERT ↔ VARSAYILAN, Katkı zorunlu** — Varsayılanlar kural gibi korununca sahneler şablon kompozisyonda kaldı. SERT = QC ölçer, değişmez; VARSAYILAN = gerekçe + kaynak + geri alma yoluyla aşılır. Her raporda `## Katkı` (1–3; A/B'siz "deneme"). · *kullanıcı, retro* · *SK-1, SK-3, KT-1, ADR-022*
- **L-187 · Üç kez aynı bulgu → kural** — Aynı bulgu üç sahnede ayrı ayrı elle düzeltildi → ölçülebilir kurala ve QC kontrolüne dönüşür. · *retro* · *SK-4, ADR-018*
- **L-188 · Kalıp ancak A/B kanıtıyla** — Birim demo kanıt değildir; kalıp gerçek pencerede A/B kabulüyle sahneye girer. A/B'siz kullanım kural kapsamını bulandırdı. · *retro* · *KT-5, YR-7*
- **L-189 · Kapsam dışı = borç** — YAP/YAPMA listesi tutulur; kapsam dışı iş teknik borç tablosuna yazılır; açık karar borca devredilebilir ("açık karar değil, borç"). · *kullanıcı* · *RP-6*
- **L-190 · Her tur retro; kök neden "dikkatsizlik" olamaz** — Hangi kontrolün neden yakalamadığı yazılır ve kontrol düzeltilir. · *kullanıcı* · *RP-4*
- **L-191 · Damıtarak yaz, kural icat etme** — Kural metni damıtılır; yeni kural icat edilmez, var olan kodlanır ya da yeniden düzenlenir; uzun anlatı ders arşivine. · *kullanıcı* · *RP-4*
- **L-192 · İstenen tam metin özetlenmez** — Kullanıcı bir belgenin tam metnini isterse özet verilmez. · *kullanıcı* · *—*
- **L-193 · Aynı değer tek kaynaktan** — Aynı eşik iki belgede yazılınca ayrıştı (ajan metni ↔ politika); kod yorumu koddan ayrıştı; manifestte okunmayan alan bayatladı → değer tek kaynakta, diğerleri atıf; `doctor` okunmayan alanı uyarır. · *retro* · *—*
- **L-194 · Uydurma yok, kaynaktan aynen** — Atıf yapılan içerik (formül, alıntı) kaynaktan aynen alınır; bulunamazsa "yok / doğrulanamadı" diye işaretlenir. · *kullanıcı, retro* · *—*
- **L-195 · fps sorusu test render'ıyla** — Kare hızı tartışması yan yana test render'ıyla çözüldü, görüşle değil. · *kullanıcı* · *—*
- **L-196 · Eski değerler arşivde** — Manifest kaydına gömülen faz damgalı eski değerler kaydı şişirdi → eski manifest sürüm arşivine kopyalanır, kayıt güncel tutulur. · *retro* · *—*

### 8.3 Kısmi render, bayatlık, disk

- **L-197 · Kısmi render bayat kare bırakır** — Kısmi yeniden render komşu aralığı eski değerle bıraktı; ışık QC'si değeri koddan okuduğu için görmedi; alt-piksel kayması bütün perdeyi bozdu. Çözüm:
  - etki aralığı formülden hesaplanır;
  - birleştirmeden önce bir kare yeniden çizilir, fark > 0 ise perde yeniden;
  - ortalama fark > 0.01 = bayat.

  · *traps, retro* · *RH-6, ADR-008*
- **L-198 · Silmeden önce yedek** — Değiştirilecek kareler yedeklenmeden silindi. Sıra: yedek → aralığı sil → yeniden üret → tanık kareler aynı mı → kopya (`.part` → rename). · *retro* · *RH-5*
- **L-199 · Yalnız etkilenen aralık; tanık kareler** — Başka kare değişmez (imgdiff 0); tanık kareler denetlenir; yalnız etkilenen aralık `--resume`. · *kullanıcı, retro* · *RH-5, fc:identical*
- **L-200 · Etkilenen kareler ölçümle bulunur** — Yeni varlık/ses geldiğinde etkilenen kareler tasarım listesinden değil ölçümle bulunur (kamera izdüşümü kare kare, "değişen ilk kare" hesabı). Donmuş dünyada eski öğe başka perdelerde de görünür; brief listesinde olmayan bir aralık böyle bulundu. · *world, retro* · *RH-4, KM-2*
- **L-201 · Disk ve kare dizini hijyeni** — 60 fps kare dizinleri diski hızla doldurur (≈ 2 MB/kare) → tam render öncesi ≥ 40 GB boş. Animatik tur dizinleri GEÇER'den sonra silinebilir; teslim edilen son sürüm + bir öncekinin kareleri tutulur. · *kullanıcı* · *RH-1, RH-9*

### 8.4 Akış, bekleme, bağlam

- **L-202 · Bekleme üst sınırlı** — Render beklenirken sınırsız `until … sleep` döngüsü 3 saat döndü (render 196 s'de bitmişti). Nedenleri: yanlış dosya, sıfırlanan log, kabukta "A veya B ve C" öncelik hatası. Çözüm:
  - arka plan bildirimi ya da `motion-render wait`;
  - üst sınır = beklenen × 2;
  - bitiş işareti aracın gerçekten yazdığı sonuç dosyası;
  - watchdog kare 45 s / süreç 120 s.

  · *kullanıcı, traps* · *ÇK-09, RH-2*
- **L-203 · Toplu işte tek hata** — Bir sahne başarısız olursa toplu iş durmaz: loglanır, sonrakine geçilir, sonda uyarı/atlanan sayısı verilir. · *kullanıcı* · *RH-2*
- **L-204 · Çökmeden devam** — Çıktılar `.part` → rename; `--resume` yarım kalan işi projeyi bozmadan sürdürür. · *kullanıcı* · *ÇK-10*
- **L-205 · DUR sırasında bağımsız işler sürer** — Kullanıcı kararı beklenirken karardan bağımsız işler (tanık doğrulaması, etkilenmeyen perdeler) yürütülür. Uzun işler arka planda; beklerken belge yazılır. · *retro* · *—*
- **L-206 · Büyük iş yeni oturumda** — Bağlam büyüyünce yeni büyük iş aynı oturumda açılmaz; yeni oturum devir belgeleriyle başlar. · *kullanıcı* · *ÇK-14*
- **L-207 · Init çalışan minimum kümeyi kopyalar** — Motor bağımlılıkları ilk kurulum listesinde yoktu → init "çalışan minimum küme"yi kopyalar, smoke ile denetlenir. · *retro* · *—*
- **L-208 · Ölçüm betikleri proje aracı olmalı** — Ölçüm bilgisinin asıl gövdesi (izdüşüm denetimi, dikiş, aksan konumu, ΔE, keskinlik) oturumun geçici betiklerinde kaldı, resmî araçlara erimedi; her zincir aynı özet satırını yeniden yazdı → bildirimli tek denetçi (`frame-check`, manifest `checks[]`); özet aracın kendi çıktısıdır. · *retro* · *ÇK-16*

### 8.5 Ortam ve kabuk

- **L-209 · Metin ve yama her zaman dosyadan** — Kabuk heredoc'u ters bölüyü yedi. Boş heredoc / `python -` stdin bekletti. `node -e "…"` içinde backtick komut ikamesi çalıştı. Paylaşılan modüle heredoc yaması toplu render'ı kırdı. → Yama Write/Edit ile dosyaya, betik dosyadan; sonra yükleme testi. · *traps, retro* · *ÇK-07*
- **L-210 · Her yamadan sonra doğrula** — Bir yama tırnak düşürdü → `node --check` + tek kare probe (`PAGEERROR` / x-import FAILED yok). · *retro* · *ÇK-08*
- **L-211 · sed yerine dosyadan yama** — `sed` alternasyon hatası dosyayı bozdu → sed değil, dosyadan yama; silmeden önce yedek. · *retro* · *ÇK-07*
- **L-212 · CRLF ve sıra assert'i** — CRLF kaynakta ayraç araması −1 döndü, dosya ikilendi → LF'ye normalleştirilir; yamada sıra assert'i. · *retro* · *—*
- **L-213 · Bağlantı klasörü** — Bağlantı (junction) klasörü hedef silinmeden önce kaldırılır; malzeme klasörü bağlantıysa silme/taşıma yapılmaz; malzeme sonra doğrulanır. · *retro* · *ÇK-11*
- **L-214 · PowerShell BOM yazar** — `Set-Content -Encoding utf8` BOM yazar → BOM'suz yazım (ya da okuyucu `utf-8-sig`). · *retro* · *—*
- **L-215 · NTFS büyük/küçük harf ayırmaz** — `VAR.png` = `var.png` → çıktı adları çakışmasız (ör. `-sheet` soneki). · *retro, world* · *—*
- **L-216 · sharp gri PNG** — sharp gri PNG'yi 3 kanal döndürür → `extractChannel(0)`. · *retro* · *—*
- **L-217 · `String.replace` dolar desenleri** — Yerine konan metindeki `$'`, `$&`, `$1` desen olarak işlenir → `s.replace(a, () => b)`. · *traps* · *MT-8*
- **L-218 · Kilitli mp4** — Oynatıcıda açık mp4'ün üzerine yazılamadı (EPERM) → zaman damgalı ad + "en son" çözümleyici; kullanıcının uygulaması kapatılmaz. · *traps* · *ÇK-10*
- **L-219 · Konsol kodlaması** — Windows konsolu ✓ gibi karakterleri basamadı → araç stdout'u UTF-8'e zorlanır; dosyalar UTF-8. · *retro* · *—*
- **L-220 · Headless oturumda arka plan ajanı** — `claude -p` turu bitince süreç kapanır; arka planda başlatılan ajan ve iş de ölür. Etkileşimsiz oturumda ajan ve uzun iş ön planda çalıştırılır, bütün adımlar bitmeden son mesaj yazılmaz. · *eval* · *—*
- **L-221 · Paylaşılan tarayıcı önbelleği** — Playwright tarayıcıları kullanıcı çapında paylaşılan önbellektedir (`ms-playwright`); makinedeki başka bir Playwright kurulumu kendi temizliğinde paketin sabitlediği Chromium revizyonunu silebilir. Belirti: `Executable doesn't exist`. `motion-render doctor` bunu yakalar. Çevrimiçi oturumda onar: paket klasöründen `npx playwright install chromium`. Çevrimdışı/eval kipinde (`MOTION_OFFLINE=1`) indirme yapılmaz → DUR, kullanıcı onarır. · *eval* · *—*
- **L-222 · Eksik araç için betik yazmadan önce** — Ad-hoc betik yazmadan önce `motion-render <komut> --help` ve skill tariflerine bakılır. Eval'de iki boşluk böyle çıktı: ses süresini filme tamamlama (`tts --pad-to`) ve canlı look-dev yönlerini ayrı yakalama/ölçme (`live --avatar … --out out/lookdev/<yön>`). · *eval* · *—*
- **L-223 · Masaüstü uygulamasının terminali `%LOCALAPPDATA%`'yı sanallaştırır** — Claude masaüstü uygulaması (Windows, paketli) Terminal panelinden başlatılan süreçlere `%LOCALAPPDATA%`'nın ayrı bir görünümünü verir: önbellekler (`motion-harness\cache`, olası `ms-playwright`) orada boş ya da farklı görünür. Kurulumu, uzun koşuları ve eval koşucusunu normal bir PowerShell/terminal penceresinden başlat; Claude Code oturumunun kendi Bash aracı gerçek görünümü kullanır. `vendor` artık önbellek görünmezse npm'e döner. · *eval* · *—*
- **L-224 · Piksel iskeleti dokuya batar** — Pikselden çıkarılan iskelet (öğe maskesi, ızgara, blob eşleme) zemin dokusu, gradyan ve vinyetten etkilendi; reviewer'ın "aynı iskelet" ile "farklı" dediği çiftler aynı aralıkta kaldı ve ağırlık taraması aşırı uydu (birini-dışarıda-bırak 4/8). Harness sayfasında iskelet DOM'dan okunur: `__boxes(T)` ya da bileşen kutuları, `[data-hero]`; doku/ışık katmanları dışarıda. Kahramanlar kadraj ortasında toplandığı için ham örtüşme bir taban üretir (ilgisiz düzenler 1,7–2,1); eşik bu tabanın üstüne konur (L-226). · *1.1* · *—*
- **L-225 · Look-dev kapısına tam kare, kırpım değil** — Tur 2 SaaS look-dev'i reviewer'a ≤ 300 px kırpımlarla gitti ve "GEÇER 3/5" aldı. Aynı yönler tam karede üç çiftte de aynı iskeleti taşıyordu: tam kare gören reviewer 6–8 verdi, `lookdev-diff` 6,4–8,1 ölçtü. Kırpım ayrıntı kanıtıdır, iskelet kanıtı değildir. Look-dev kapısında her yönün kilit karelerinin tamamı verilir. · *eval* · *—*
- **L-226 · Ortada kahraman önseli gerçek iskelet ortaklığını söndürür** — İlgisiz look-dev düzenlerinin iskelet tabanını düşürmek için rol doluluğu, bütün yönlerin ortalama haritasıyla (önsel) şans düzeltmesine sokuldu ve kareler arası maks alındı. İlgisiz çiftler 0'a indi, ama uzlaşılı "aynı iskelet" çiftleri de indi (E3 A↔C 3,1 → 0,2; S2 B↔C 6,4 → 0,8): önsel, ortadaki kahramanı paylaşan gerçek ortaklığı da şans sayıyor. Sınıf hatası 0 → 2; geri alındı (ortalama, önsel yok, eşik tabanın üstünde 2,2). Az örnekli kalibrasyonda düzeltme katmanı eklemeden önce pozitiflerin nereye kaydığına da bakılır. · *1.1* · *—*
- **L-227 · World kütüphanesi ve yakınsama** — Benzerlik kuralı (UCUZ #11) iki farklı riski karıştırıyordu: yeni world kurarken önceki projeye ya da hazır bir görünüme kaymak (yakınsama, kusur) ile kullanıcının bilerek seçtiği world'ü sürdürmek (süreklilik, özellik). Kural kütüphaneyle ayrıldı: seçilmiş world'e benzerlik ölçülmez; seçilmemiş world'e ve yeni world kurulurken önceki projeye benzerlik #11'dir. World seçilmiş projede look-dev'in üç yönü palet/malzemede değil yapıda (iskelet, kamera, hareket grameri, ritim) ayrışır. Kütüphaneye giren world'den müşteri malzemesi ayıklanır; aksan rengi gibi markadan ölçülmüş değerler yer tutucu olur. · *1.2* · *—*
- **L-246 · Ölçüm betiği dosyadan, ajan kapanışında süreç taraması (1.4)** — Ölçüm ajanının stdin'e verdiği `python - <<EOF … || node -e …` zinciri bozuk kuruldu; Python süreci ajan bittikten sonra saatlerce bir çekirdeği kullandı. Betik dosyaya yazılıp dosyadan koşulur (ölçüm/reviewer ajanına yalnız `out/` altında Write); her DUR ve ajan kapanışında başlatılan python/node/ffmpeg/Chromium süreci taranır (PLAYBOOK §2.6). · *proje* · *PLAYBOOK §2.6*

---

## 9. World sınıfı dersler (burada değil)

Görsel dile bağlı dersler (malzeme, alet, palet, font, world bandı, dünya içi yerleşim) core'a girmez. İlgili kütüphane world'ünün `lessons.md` dosyasına gider (`skills/motion-world/library/<ad>/`). Dilden bağımsız bir çekirdeği olanlar yukarıda core ders olarak ayrıca durur; "core çekirdeği" sütunu onu gösterir.

| kaynak | ders (kısa) | world | neden world | core çekirdeği |
|---|---|---|---|---|
| world-1 | ışık düşümünde kenar etiketi 3.7:1 → koyu grafit 700; ışık tozu notun altından | focusfx-paper | palet/ağırlık değeri | okunacak metin koyu ve kalın |
| world-2 | antet başlığı hücreye sığmaz (display 160 px ≈ 1350 px) | focusfx-paper | yerleşim ölçüsü | — |
| world-3 | plaka ızgarası maske deliği bırakır → izler silinip doldurulur | focusfx-paper | plaka malzemesi | yalıtılmış grup ve maske |
| world-4 | "fazla iz" ölçüsü ızgaraya kanar (eksene paralel ≥ 20 px koşular) | focusfx-paper | plaka malzemesi | karar ölçüsü tek ve tanımlı |
| world-5 | plaka yoksa C yüzeyi daha açık (bant %62–64) | focusfx-paper | world bant değeri | — |
| world-6 | koyu son kart da world içinde (nefes + gren); siyah kart yok | focusfx-paper | dil kararı | — |
| world-7 | C ↔ B yüzey tonu eşit | focusfx-paper | palet | — |
| world-8 | yüzey kenarı ölçümü ≥ 12 dünya px içeriden; kahraman–yüzey kenarı ≥ 50 | focusfx-paper | geometri değeri | kadraj payı |
| world-9 | kaydedici kafa kirişi metni örtmez (kiriş hücre çizgileri içinde) | focusfx-paper | alet | alet yolu ∩ etiket = 0 |
| world-10 | alet görünürlüğü yön + zamanla kalıcı kilit | focusfx-paper | alet | — |
| world-11 | 3B alet parçaları (≈ 46 px) örtme hesabına girer | focusfx-paper | alet | — |
| world-12 | halka çizen kalemde gövde açısı dinamik programlamayla | focusfx-paper | alet | — |
| world-13 | gerçek formül dizgisi (matematik italik alt küme) | focusfx-paper / proje | içerik | glif kapsamı ölçülür |
| world-14 | donmuş yüzeyde `data-hero` yalnız ölçüm modunda görünür | focusfx-paper | sahne yapısı | K1 maskesi kahramanın bütünü |
| world-15 | masa malzemesi genel bakışta yüzeyle yarışır (−%40 kontrast + 2 px blur) | focusfx-paper | malzeme | — |
| world-16 | ışık çekilişi lamba kısılmasıdır, iris değil (havuz en son ve az) | focusfx-paper | ışık dili | — |
| world-17 | alet K8 denetimi gölge ucunu da kapsar | focusfx-paper | alet | (PATTERNS K-39 uyarısı) |
| world-18 | tutuş anında kadrajda alet yok | focusfx-paper | alet kuralı (RULES KM-11'e genellendi) | — |
| world-19 | kart yağmurunda derinlik bulanıklığı yalnız ≥ %60 örtülü karoya | screen-dark | kompozisyon değeri | — |
| world-20 | tüp ekran çizgisi scaleY ile ezilir → ışıma ayrı katman | screen-dark | efekt | — |
| world-21 | sayaç yüzü ekran çöküşünde ölçülürse font küçük çıkar → `review.metin` | screen-dark | efekt | elle incelenen aralık kaydı |
| world-22 | levha film tonu birikir (11 × %3) → %1.2 | screen-dark | değer | — |
| world-23 | alt paneller zaman eksenini örter → `data-doku` | screen-dark | yerleşim | — |
| world-24 | cam sayaç gövdesi ışıksız kalırsa başka nesne okunur | screen-dark | nesne dili | — |
| world-25 | fosfor yüzeye taşarsa dünya kimliksizleşir | screen-dark | palet | jenerik dünya dili kimliksiz |
| world-26 | sıcak film tonu + fosfor zeytine kaçar → nötr | screen-dark | palet | — |
| world-27 | cam yansıması ekran çöküşüyle çökmemeli | screen-dark | efekt | — |
| world-28 | marka motif ikonu 12 px okunmadı → 20 px | screen-dark / proje | ikon değeri | — |
| world-29 | ikincil aksan çizgidedir, yüzeyde değil; saf kayıp mürekkebi hiçbir zeminde 4.5:1'e ulaşmaz | screen-dark | palet | aksan ↔ ikincil renk oranla |
| world-30 | koyu tema ekran görüntüsü kâğıda basılırsa negatif + gri | desk-paper | malzeme | — |
| world-31 | masada görünen havuz: ayrı havuz katmanı + koyu taban | desk-paper | ışık uygulaması | — |
| world-32 | bütün kâğıdı eğmek izleme bandını kaydırır → ayrı kıvrık uç | desk-paper | malzeme | — |
| world-33 | kısa kopya kâğıt ışık gradyanını değiştirir (dikişte ton basamağı) | desk-paper | malzeme | — |
| world-34 | aydınlık sahnede koyu grade zinciri kanvası kirletir | light-ui | grade zinciri | (grade world verisidir) |
| world-35 | %4 overlay gren beyaz kartta kum gibi | light-ui | gren değeri | — |
| world-36 | gölge eklemek düz arayüz dilini bozar | light-ui | dil | — |
| world-37 | dikey kaynak + yatay nesne → 90° | photo-plate | kaynak işleme | — |
| world-38 | stop-motion kaynakta tekrar kareleri → benzersiz kareler seçilir | photo-plate | kaynak işleme | **core'a yakın; `/motion:promote` adayı** |
| world-39 | 3B plaka (WebGL, eğik kamera) terk; plaka düz, derinlik katmanla | photo-plate | dil | modelleme yok, ima et (İL-3) |
| world-40 | düzenleme isteminde konum metinle verildi; nesne içerik alanına girdi | photo-plate | set yöntemi (`SET.md` §10) | yerleşim yer tutucuyla (GENAI §17.2) |
| world-41 | masa nesnesi ayrı üretilip matte ile yapıştırıldı (kenar yumuşadı, gren kenara ulaşmadı) | photo-plate | set yöntemi (`SET.md` §10) | aynı üretim; zorunlu ayrımda M-KENAR |
| world-42 | luma eşikli kesim maskesi ince çizgiyi yarı gölgede düşürdü → dikiş | photo-plate | set yöntemi (`SET.md` §10) | maske ışıkla oranlı eşik; M-DIKIS |
| world-43 | düşen gölge sabit oranda → loş yüzeyde fazla koyu | photo-plate | set yöntemi (`SET.md` §10) | gölge oranı lamba/ortam modelinden |
| world-44 | fotoğraf sprite'ı kendi lamba düşümünü taşıdı → çift ışık | photo-plate | set yöntemi (`SET.md` §10) | sprite düz alan, ışık tek modelden (ILK-5) |
| world-45 | plakanın kendi gölgesi dokudan ayrılamadı | photo-plate | set yöntemi (`SET.md` §10) | gölge lamba modelinden çizilir |
| world-46 | restyle/düzenleme referansı kendi ışık yönünü taşıdı | photo-plate | set yöntemi (`SET.md` §10) | referans ışığı hedef lambayla eşlenir (karartmayla) |
| world-47 | "1:1" iki ölçek (kaynak ↔ film karesi) farklı sonuç | photo-plate | set yöntemi (`SET.md` §10) | kabul film karesinde; ölçek ölçütte yazılı |
| world-48 | havuz merkezi kadraj kenarında → lamba yeri setten sete oynadı | photo-plate | set yöntemi (`SET.md` §10) | lamba yeri tek, belirsizlikle; set ölçümü sapma denetimi |
| tuzak t-11 | gradyanlı 3B eşya "90'lar oyun grafiği" → ima et: silüet + doku + gölge + odak | desk-paper | eşya dili | İL-3 |
| tuzak t-15 | pano + disk kapalı hacim değil | desk-paper | eşya dili | — |
| tuzak d-05 | yerel buruşmada iki katman hayalet → tek katman, maske süzgeçte | desk-paper | efekt | (PATTERNS K-49) |
| tuzak d-06 | el yazısı fontunda L "C" okunur → el vuruşuyla çiz | desk-paper | font | — |
| tuzak d-08 | koyu ekran görüntüsü multiply'da kâğıdı siyaha boyar → negatif + gri baskı | desk-paper | malzeme | — |
| tuzak d-09 | geniş lens, WebGL masa, dik 3B eşya denendi, terk | desk-paper | dil | — |
| tuzak d-14 | çıplak masa karanlık eşiğinin altına düşer (%7) → havuzu güçlendir | desk-paper | ışık değeri | — |
| tuzak d-15 | örtüşen sayfa ızgarasında çentik → tek adım, sınırlı düzensizlik | desk-paper | yerleşim | — |
| retro | bant yalnız güçlü spot havuzuyla tuttu → "sayı görünüme uyar" | focusfx-paper | world bandı | bant world'de tanımlanır (KD-6) |
| retro | kenar etiketleri ışık havuzu dışında okunmadı → metin havuza | focusfx-paper | ışık yerleşimi | — |
| retro | pencere kalkınca bant sıçradı → pozlama telafisi | focusfx-paper | ışık | pozlama kamera ölçeğine bağlı |
| retro | fiziksel nesne girişleri (alet dili) | focusfx-paper | alet | — |
| retro | alet görünürlüğü yön + kutu + kilit; 3B alet parçaları örtmede | focusfx-paper | alet | — |
| retro | ışık çekilişi önce pozlama, havuz en son; tutuş aletsiz | focusfx-paper | ışık/alet | siyaha iniş 16-bit (core) |
| retro | yazıcı kafa kirişi komşu metne taşar → kiriş ∩ metin = 0 | focusfx-paper | alet | alet yolu ∩ etiket = 0 |
| kullanıcı | ön plan kuralı: yerde, temas gölgesi, ≤ 2 px, örtme ≤ %5, metin 0; "katman olsun diye alet yasak" | focusfx-paper (kural) | dünya kuralı; RULES ÖNP/K2'ye genellendi | hata gibi görünen öğe (reviewer) |
| kullanıcı | konu/vaat ilkesi; anlatımla ilgisiz metafor yasak | proje | içerik | — |
| kullanıcı | kaynaklı içerikte belirli aday ailesinin elenmesi | proje | içerik | uydurma yok, kaynaktan aynen |
| kullanıcı | logo rengi/ton değerleri | proje | marka değeri | marka rengi teslim edilmiş dosyadan |
| kullanıcı | logo vektörünü kendimiz kurma kararı + görev tavanı | proje | proje kararı | logo vektörünü raster'dan kurmak |

**Sayım:** 48 world dosyası dersi (1.4: +9 photo-plate set yöntemi) + 8 tuzak + 7 retro + 5 kullanıcı = **68 world/proje sınıfı kayıt**. Bunlardan 24'ünün dilden bağımsız çekirdeği yukarıda core ders olarak (ya da RULES/PATTERNS'te) ayrıca durur.
