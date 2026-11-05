# ILKEL — ilkel mekaniği: tasarım kuralları (1.4)

> **Ne:** world ilkellerinin (world `*.jsx` bileşeni, fotoğraf sprite'ı, plaka nesnesi kesimi) **mekaniği**: nasıl çizilir, sahneye nasıl oturur,
> nasıl kabul edilir. Görünüş (malzeme, renk, gövde biçimi) world'den gelir; bu belge görünüş taşımaz.
> **Kaynak:** bir kaynak projenin ortak ilkel kütüphanesi (sprite gövdeleri, baskı/çizgi yolu, ince parça, ön plan nesneleri) ve altı set üretimindeki ölçülmüş
> bulgular; proje içeriği çıkarıldı. Sayılar **referans ölçümü (kaynak proje)** etiketlidir; eşikler world'dedir (`world.json` `edge`; örnek:
> `library/photo-plate/world.json`) ve projenin plakasıyla yeniden ölçülür.
> **Kim okur:** ilkel yazan yapan (`motion-director`), kabul ölçen `motion-measure`, reviewer. **Ölçüm yöntemi** motion-core `MEASURE.md`
> (M-KENAR · M-ASKIDA · M-DIKIS · M-SX · M-ZS); **onay akışı** `PLAYBOOK.md` §4.4a; set yöntemi `library/photo-plate/SET.md`.
> Kural kimlikleri **ILK-n** (RULES'a giren satırlar orada kimliğiyle anılır).

---

## §1 Sprite ilkeli (fotoğraf sprite)

| id | kural | neden (ölçü) |
|---|---|---|
| **ILK-1** | **9 dilim:** köşeler sabit (ölçeklenmez), kenar bantları tek eksende, merkez iki eksende uzar — ama **doku gerilmez:** uzayan dilim kaynağı gösterim ölçeğinde **kırpar** ya da döşer. Kapaklar orta dilime birkaç sprite px'te solarak biner. Maske dilim sarmalayıcı grupta durur (iç içe `svg`'de maske boş kalabilir). Kesim kutusu = gövde kutusu (görünür silüet); lif/tüy payı ≤ 1 px/yan. Kısa gövdede (gövde < 2 kapak) yüz tek parça, kapak yarıları solarak. | sıkıştırılmış orta dilim yüz dokusunu satır ortalamasıyla siler, dilim sınırında dikiş bırakır ("9 dilim kuyruğu"; referans ölçümü (kaynak proje): gövde içi komşu satır farkı sıkıştırmada 15/255 ↔ kırpmada 2,9/255) |
| **ILK-2** | **Gösterim boyutunda çizim:** raster bir kez, gösterim ölçeğinde. Sprite parçaları gösterim boyutuna önceden küçültülmüş varyantlardan (yüksek kaliteli küçültme, tek atlas, parçalar arası saydam pay; ince parçalarda tamsayı boy merdiveni) ≈ 1:1 çizilir. CSS `scale` ile büyütme yok; küçültme varyant seçimiyle. Büyütme ≤ `edge.upscaleMax`; yakın planda (k ≥ `supersample.sxK`) S× kuralı (RULES SS-2, M-SX). | büyük/kesirli ölçekte raster yolu değişir ve kalıcı düğümde yeniden kullanılır; büyütme yumuşatır |
| **ILK-3** | **Ölçekten bağımsız doku:** doku gösterim ölçeğinde 1:1; nesne boyuyla gerilmez (gövde uzarsa doku döşenir/kırpılır). Kamera ölçeği s < 1 iken alt piksel yeniden örnekleme dokuyu yumuşatır → **doku katmanı**: plakanın yüzey maskesinde güçlendirilmiş yüksek frekans kopyası, opaklık w(s) ölçüm tablosundan, s → 1'de yumuşak sıfıra (basamaksız). | referans ölçümü (kaynak proje): s 0,87–0,999 aralığında doku ×0,6–0,7; tam s = 1 + tamsayı ötelemede kayıp yok; ölçü: ardışık kare gren keskinliği sıçraması + uzak görüş dokusu ↔ referans ±%20 |
| **ILK-4** | **Küçük nesne doku politikası:** küçük nesne büyük yüzeyin dokusunu taşımaz. Nesne sınıfı başına politika world'de: **büyük yüzey** → doku ≥ parite eşiği · **küçük nesne** → düz malzeme, kenar keskin, iç std düşük. Kalite kapısı sınıfa göre **iki yönlü** ölçer (büyük yüzeyde az doku, küçük nesnede fazla doku kusurdur). Sınıf sınırı (boy px) world'de. | 1:1'de doku gürültüsü küçük gövdeyi bulanıklaştırdı; parite kapısı (doku ≥ eşik) büyük yüzeyde doğru, küçük nesnede ters işaret (referans ölçümü (kaynak proje): küçük nesne kenar ≤ 2 px, iç std ≤ 3) |
| **ILK-5** | **Işık sprite'tan değil sahneden:** fotoğraf sprite'ının kendi düşümü kaldırılır (düz alan); sahne ışığı tek lamba modelinden çarpılır (`SET.md` §4). Gölge tarafı kenarı parlak kalmaz (gölge yanındaki son satırlar yüz medyanının altında). | çift ışık; gölgede "parlak dudak" |
| **ILK-6** | **Gölge ve temas:** tek süpürme gölge (temasa yaklaştıkça sertleşir), **kopya gölge yok**; düşen gölge geometrisi koni (taban gövdeye yakın uçta daralır, yarıgölge uzaklıkla büyür; ışık tarafına ve yan kenara taşmaz); oran lamba modelinden (o = min(1, ortam / L), `SET.md` §4). Temas bandı (AO): silüet + < 1 px, küçük σ, gölge yönüne kayık; ışık tarafında ≈ 0 (çerçeve okunmaz). İnce parça (tel, uç, sap) kendi z'siyle. **İlkelde maske/kırpma yok:** şekil geometriyle (örtü çokgeni). | gövdeyle aynı z'deki ince parça "gölge kuyruğu" verdi; karışım modlu grupta maske/kırpma komşu çizimin birleşimini değiştirdi (maske dışı değişen piksel) |
| **ILK-7** | **Gövde ↔ zemin ayrımı** (açık gövde açık zeminde): kenar bandı (iç kontur + temas gölgesi, ≈ 2 px) ↔ birkaç px dışı zemin ΔE2000 ≥ proje eşiği; gövde tonu değişmez. Loş yüzeyde tavana takılırsa gölge modeli düzeltilir, eşik değil. | referans ölçümü (kaynak proje): eşik 15; sabit gölge oranında loş yüzeyde 13,4 → ortam modeliyle 16,5 |
| **ILK-8** | **Ölçüm kancası ve kimlik:** gövde kutusu ve gölge vektörü öznitelikle (`data-*`) + ekran CTM ile okunur; çizime etkisi yok (tanık imgdiff 0). SVG kimlikleri ilkel/set önekli (varsayılan ''). Paylaşılan ilkele eklenen parametrenin varsayılanı eski çıktıyı verir (PLAYBOOK §3.2 madde 9). | kutu tahminle (ölçek × konum) dönme/makroda kaydı; iki set aynı karede çizilince `url(#…)` belgedeki ilk tanıma gitti, set geçişinde tek kare değişim |
| **ILK-9** | **Raster saflığı:** sprite'lı sahnede kalıcı DOM düğümü raster yeniden kullanımı ortadan başlayan render ↔ tam render farkı verir (M-ZS) → içerik/sprite ağacı kare başı taze kurulur (sahne kökünde kare başı anahtar). Çok sayıda atlas `<image>`'ı çözme yarışı verebilir: belirsizlik kaydı + atlas sayısı düşük tutulur. Ayrıntı motion-core `LESSONS` / `PATTERNS`. | hareket içinde çizilmiş karenin durgun karede gövde kenarını değiştirmesi (JS durumu yok, Chromium tarafı) |

## §2 Nesne / ön plan kuralı (a–f)

Masa üstü ve ön plan nesnesi **plakanın parçasıdır** (photo-plate `SET.md` SET-2); DOM'a nesne kesiği konmaz (**ILK-10**). Derinlik plakanın kendi
derinlik haritasından ayrılır (2.5D), paralaks ve odak oradan (**ILK-11**; `SET.md` §2–§3). Her nesne altı maddeyi birlikte sağlar:

| madde | kural | ölçü / kanıt |
|---|---|---|
| **(a) dayanak** | dayandığı yüzey görünür ya da kadraj dışında mantıklı | 4× kırpım; M-ASKIDA temas bandı |
| **(b) gölge** | lamba modelinden ve yüzeye düşer: temas bandı + yumuşak uzun gölge | M-ASKIDA gölge; gölge ↔ lamba yönü açısı |
| **(c) odak** | bulanıklık objektif modelinden, odak düzlemine uzaklıkla değişir; **tekdüze blur yok** | σ(z) haritası; 4× (yüksek kenar bulanık, taban net) |
| **(d) silüet** | tanınır (ne olduğu tek bakışta) | reviewer; 4× |
| **(e) süreklilik** | shot boyunca kadrajda kalır ya da kamera taşımasıyla girer/çıkar; **pop yok** | `fc:pop`; kare şeridi |
| **(f) içerik** | karar noktasını (kesişim, uç, kahraman öğe) ve metni örtmez; içerik kutularına pay | örtme 0 (A/B gizleme farkı); pay px (`set.json` `content`) |

- Ön plan derinliği shot başına bu kurala uyan bir nesneyle kurulur; ön plan ↔ orta plan hız oranı **bilgi**, kapı değil.
- Aday tablosu (ön plan seçimi): `| aday | yer (plaka px) | z maks · k maks · σ maks | a–f (madde başına tek cümle) | still'de / klipte |`; öneri gerekçesi
  derinlik, silüet, içerikle çakışma ve kadrajda kalma süresiyle yazılır.
- Yerleşim istemle tutmaz: aday nesneler plakaya yer tutucu referansla eklenir (motion-core GENAI §17.2).

## §3 Nesne kenarı kuralı

Nesne zeminle aynı üretimde olmalıdır (SET-2). **Zorunlu ayrımda** (ayrı üretilip kesilmiş nesne, ya da plakadan kesilip ekrana çizilen nesne)
kenar şu ölçülerin hepsini geçer. Profil silüete diktir, 4× kırpımda ölçülür, @1× bildirilir; yöntem MEASURE **M-KENAR**, eşikler world `edge`:

| ölçü | tanım (kısa) | eşik |
|---|---|---|
| matte genişliği | %10 → %90 geçiş genişliği w; w_matte = √(w² − w_taban² − w_optik²) — w_taban aynı yoldan geçen keskin sentetik kenar, w_optik nesnenin kendi odak bulanıklığı (iç kenarlarından) | ≤ `matteMaxPx` (referans ölçümü (kaynak proje): 1 px @1×) |
| hale | silüet dışı yakın bant ↔ uzak bant medyan farkı (açık tüy ya da koyu çerçeve) | \|hale\| ≤ `haloMax` /255 |
| gren sürekliliği | yüksek geçiren varyans, yüzey tarafı yakın bant / uzak bant (en yakın birkaç px kenar sızıntısı taşır, dışarıda bırakılır) | `grainRatio` aralığında (referans ölçümü (kaynak proje): 1/1,5…1,5) |
| büyütme | kaynak px → ekran px ölçeği | ≤ `upscaleMax` (×1,25) |
| gölge temas boşluğu | gölge tarafında silüet ile temas bandı/gölge arasında parlak boşluk | `contactGapPx` = 0 px |

**Gövde sınıfı (ILK-12)** — kenarın fiziği ölçüyü seçer (`set.json` `objects[].bodyClass`):

| sınıf | örnek | ölçü |
|---|---|---|
| `flat` (düz kenar) | kâğıt, kart, bant, levha | w_matte ≤ `bodyClass.flat.matteMaxPx` |
| `round` (yuvarlak gövde) | silindir, pahlı blok, kalem gövdesi | matte yerine kenar dışı hale tümseği ve **terminatör** düşüş genişliği **kaynak plakaya göre** ± `haloRel` / `terminatorRel` (referans ölçümü (kaynak proje): ±%20); **mutlak eşik yok**; kaynak = nesnenin onaylı kaynak üretimi; gren aynı aralıkta |
| `nested` (iç içe kenarlı) | çerçeve, cam, parlama, mercek | **yalnız silüet** (nesne ↔ yüzey sınırı) ölçülür; nesne düzeyi silüetin birkaç px içi medyanı; kontrastı düşük profil dışlanır; w_optik nesnenin iç kenarından |

**Kenar kaydı (yöntem tekleştirme):** nesne başına lamba tarafı ve gölge tarafı ayrı; gren ölçütü yüzeye bakan lamba tarafında, gölge tarafı bilgi;
dış bant komşu nesneye ya da gölgeye değerse daraltılır; bir taraf yeterli ışın sayısıyla geçerlidir; kaynakta hale zaten küçükse ölçüt kaynak
düzeyidir. **Plaka kabulünde ham plaka ve ekrandaki kesim çıktısı aynı ızgarayla ölçülür** — kesim (doku kazancı, maske kipi) kenarı bozabilir
(referans ölçümü (kaynak proje): nesneli plakadan alınan doku alanı kenar, hale ve gölge geçişini σ 3 detayında ×4,9 büyüttü).

## §4 Askıda nesne (UCUZ #17)

**Askıda:** masa üstü ya da ön plan nesnesi plakanın parçası değil (DOM'a nesne kesiği) **ya da** a–f bozuk — dayanak yok, temas bandı / lamba gölgesi
yok, tekdüze blur, tanınmaz silüet, pop, karar noktasını örtüyor. Reviewer UCUZ listesinde **#17**; ölçü MEASURE **M-ASKIDA**:

- Nesnenin gölge tarafında silüetten dışarı luma profili L(d); **temas** = yakın bantta (1–2 px) göreli düşüş, **gölge** = orta bantta (3–6 px)
  göreli düşüş; referans L aynı yüzeyde uzak bant. Eşikler **göreli** (koyu yüzeyde /255 farkı küçük kalır): world `edge.contact`
  (referans ölçümü (kaynak proje): temas ≥ %6, gölge ≥ %3).
- Gölge yönü lamba modelinden (gv); plaka nesnesinde fotoğrafın kendi ışığından. Kenar ötesinde yüzey değişirse (kâğıt → masa) **ölçülemedi** —
  geçti sayılmaz, 4× kırpım + reviewer.
- Referans ölçümü (kaynak proje): DOM kesiği gevşek nesne temas %3,6 / gölge %0,7 (askıda); plaka nesnesi ve sprite gövdeleri temas %26–44 (geçer).

## §5 Maskeli bölge ve dikiş

Plakaya sonradan eklenen ya da düzeltilen bölge (motion-core GENAI §17), plaka kayıt kenarı (`SET.md` §8) ve kesim maskesi sınırı **dikiş** üretir:

- Test MEASURE **M-DIKIS**: maske sınırı ± birkaç px bantta kalınlık ≤ `edge.seam.rowsMax` satır, luma basamağı ≤ `edge.seam.lumaMax`; maske dışı
  değişen piksel 0.
- Kesim maskesi ile doku/ışık maskesi farklıysa sınırda dikiş doğar (yarı gölgede ince çizgi maskeden düşer, doku kazancı bir yanda kalır): doku
  maskesi ışıkla oranlı eşik (yerel ışık × oran) kullanır; maskeye yalnız ekleme yapılır, piksel çıkarılmaz; düzeltme kesim çıktısında ölçülür.
- Dikiş plakada mı kesimde mi doğuyor: aynı pencere önce kaynak plakada, sonra kesimde ölçülür (teşhis önce).

## §6 İlkel kütüphanesi onayı → film

- **PLAYBOOK §4.4a:** film birimleri yalnız onaylı ilkellerle kurulur; kütüphane onaylanmadan set/perde tasarımı başlamaz; yeni mekanik önce
  kütüphaneye eklenir, test edilir, onaylanır.
- **Kanıt kontağı:** her ilkel 4× (önceki | yeni) + kanıt shot'unda yerinde 1×. Künye tablosu:
  `| ilkel | kaynak (plaka / kesim) | gösterim ölçeği | 9 dilim | gölge (model) | temas | kenar (M-KENAR) | askıda (M-ASKIDA) | 4× |`.
- **Kanıt yüzeyi tur değildir:** ilkel kanıt shot'una bayrakla bağlanır; bayraksız yol eski çıktıyı verir (tanık imgdiff 0).
- **Paylaşılan ilkel değişince** her sahneden tanık kareler önce/sonra imgdiff 0 (ya da fark yalnız değişen katmanın ayak izinde — fark haritası).
- Kütüphane kapısının şartları ilk sette sayıyla kapanır; ilkel ölçüleri V1 değişiklik listesine göre yalnız dokunulan ilkelde yeniden alınır.
