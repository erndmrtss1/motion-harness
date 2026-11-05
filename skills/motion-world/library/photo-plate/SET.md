# photo-plate — set yöntemi (1.4)

> **Ne:** gerçek görüntü (fotoğraf plakası) üzerine kurulan bir filmin **set** yöntemi: katmanlı plaka, plakadan derinlik, fiziksel paralaks, set
> ışığını okuma ve eşleme, set kaydı (`set.json`), plaka kabulü, büyük masa ve set geçişi. **Süreci** taşır; üslup (palet, nesne, ışık sıcaklığı)
> projenin look-dev'inden gelir. Kaynak: bir kaynak projenin altı set + bir ara set üretimindeki ölçülmüş bulgular; proje içeriği (sözlük, plakalar,
> kareler, nesne listesi, harita) çıkarıldı. Sayılar **referans ölçümü (kaynak proje)** etiketlidir; varsayılan ya da eşik değildir — world
> (`world.json` `set` · `edge`) ya da proje (`project.md` §6) alanına kendi ölçümünle yazılır.
> **Kim okur:** look-dev ve set fazında yapan (`motion-director`), set kaydını yazan ana oturum, kabulü ölçen `motion-measure`, reviewer.
> İlgili: motion-world `references/ILKEL.md` (ilkel mekaniği: sprite, nesne/ön plan, kenar, askıda) · motion-core `GENAI.md` §17–§18 (maskeli
> bölge üretimi, istem kalıpları) · `MEASURE.md` M-KENAR · M-ASKIDA · M-DIKIS · M-SEYAHAT. Bu dosya `init --world photo-plate` ile projenin
> `world/` klasörüne kopyalanır.

---

## §0 İlke: set üretilir, içerik çizilir

| katman | kim çizer | örnek |
|---|---|---|
| **dünya** (zemin, masa, kâğıt/yüzey, masa üstü nesneleri, uzak nesneler, lamba düşümü) | **üretken plaka** (fotoğraf); kod çizmez | arka · orta · ön plan plakaları |
| **içerik** (veri, grafik, metin, çizgi, vurgu) | motor (DOM/SVG), set ışığına oturur | grafik, kelime, çizgi kendini çizer |
| **tekrar eden nesne** (birden çok shot'ta aynı gövde) | ilkel sprite (fotoğraf kesimi; motion-world `references/ILKEL.md`) | gövde, kart, bant, alet |

- **SET-1 · Dünya nesnesi kodla çizilmez.** Kâğıt, kart, bant, masa nesnesi, lamba düşümü motorla taklit edilmez; plakadan gelir. Kod yalnız içerik ve hareket çizer.
- **SET-2 · Masa üstü ve ön plan nesneleri plakanın parçasıdır; DOM'a nesne kesiği konmaz.** Nesne zeminle **aynı üretimde** doğar; ayrı üretilip
  matte ile yapıştırılmaz. Zorunlu ayrımda (kesim kaçınılmazsa) nesne kenarı kuralı geçerlidir (`references/ILKEL.md` §3; ölçü M-KENAR).
- **SET-3 · Still ve klip aynı set kaydıdır.** Yerleşimin tek kaynağı `set.json`; klip still'den türer (aynı plaka, aynı lamba, aynı nesne
  koordinatı). Still'i ayrı düzenlemek klibi bayatlatır.
- **SET-4 · Plakada referans zorunlu.** Seed parametresi olmayan modellerde tutarlılık yalnız `image_references` ile kurulur (GENAI §18.5): her
  set plakası onaylı bir plakaya (ilk sette onaylı look-dev karesine) referansla üretilir. Referanssız set plakası kabul edilmez.
- **SET-5 · Motorun yapabildiğini plakadan isteme, plakanın taşıdığını motorla taklit etme** (GENAI §0 ile aynı sınır): ışık modeli, gölge yönü,
  kamera, tipografi motordadır; doku, malzeme, nesne gövdesi ve gerçek düşüm plakadadır.

## §1 Katmanlı plaka (arka · orta · ön)

| katman | taşıdığı | z kaynağı | odak (DoF) | not |
|---|---|---|---|---|
| **arka** | zemin, uzak nesneler, lamba havuzu ve düşümü; **içerik alanı boş** | 0 (masa düzlemi) | odak düzleminde ya da objektif modelinden | içerik alanında nesne, yazı, desen yok (kabul: göz + normalize görüntü) |
| **orta** | içerik yüzeyi (kâğıt, kart yığını…) ve masa nesneleri — zeminle aynı üretimde | nesnenin gerçek yüksekliği (mm × px/mm) | objektif modelinden | içerik DOM'u bu yüzeyin ışığına oturur |
| **ön** | kameraya yakın nesne kenarı (yarısı kadraj dışında olabilir) | plakanın derinlik haritasından (§2) | objektif modelinden, plakaya pişirilir | ön plan kuralı a–f (`references/ILKEL.md` §2) |

- Katmanlar aynı üretimden (tek plaka + derinlik haritası) ya da aynı referans zinciriyle üretilmiş plakalardan gelir. Ayrı üretimlerde ışık yönü ve
  sıcaklık her plakada ölçülür (§4); sapma raporda.
- Katman kenarında arkada boşluk kalmaz: alt katman üst katmanın altında dolgulu sürer (gerçek dolgu: aynı plakanın nesnesiz hâli ya da
  nesnesiz plaka; kenar uzantısı `lessons.md` §2).
- Plaka kadrajdan geniştir: kamera yolunun (dolly + push-in) her karesinde görüş plaka içinde kalır; pay her kenarda kamera yolu tablosuyla
  hesaplanır (plaka kenarı kadraja girerse uzantı gerekir — `lessons.md` §2).

## §2 2.5D derinlik haritası (z → paralaks ve DoF; derinlik plakadan)

Derinlik **plakanın kendisinden** ayrılır; kodla nesne kurulmaz (RULES İL-3 "modelleme yok, ima et"). Derinlik modeli whitelist'te yoksa
plakanın alfa ve yükseklik bilgisinden türetilir:

| adım | yöntem |
|---|---|
| 1. hizalama | aday plaka ↔ onaylı plaka: gradyan NCC (yüzey kenarları, sabit nesneler) → kayma 0 px beklenir; kayma varsa plaka sahneyi yeniden kurmuştur (GENAI §17.5) |
| 2. alfa | daire/silindir gövde: yer tutucu merkezinden ışın başına en büyük luma türevi → aykırı ayıklamalı daire uydurma · serbest biçim: nesnesiz plakayla **fark** (σ ≈ 2, nötr kararma = gölge hariç) → kapama + delik doldurma + tohum bileşeni · yumuşak kenar ≈ 1,5 px |
| 3. gölge | nesne dışında nötr kararma oranı q → arka = nesnesiz plaka × q (gerçek dolgu, boşluk yok) |
| 4. yükseklik z | **dikey nesne** (tepe kamera): ilke noktasından her ışında nesneye ilk giriş = temas (z 0), uzak uç = tepe: z = h·(r − r_temas)/(r_uzak − r_temas) · **yatık nesne**: kubbe profili · **düz yüzey**: z sabit · h = gerçek boy (mm) × px/mm |
| 5. DoF | objektif modelinden: σ(z) = σ_ref · [z/(H − z)] / [z_ref/(H − z_ref)], odak düzlemi masada; önçarpımlı alfa ile pişirilir, σ düzeyleri z'ye göre karışır; tekdüze blur yok |
| 6a. dilimler | z'de eşit adımlı N dilim, komşu dilimlere çadır ağırlıkla bölünür (dilim alfaları toplamı = nesne alfası; paralakste yırtık yok); çizim sırası z'ye göre; **taşma payı:** her dilim kendinden yüksek komşu dilimin iç pikselini birkaç px taşır → dilim arası açıklık 0 |
| 6b. sürekli çarpıtma | tek görüntü + 16 bit yükseklik → her karede ileri eşleme + üçgen tarama + z tamponu (dilim basamağı yok; büyük nesnede tercih) |

- **Tutuş drift'i yalnız katmanın CSS dönüşümünde;** çarpıtma (6b) sabit kalır. Drift çarpıtmaya sokulursa piksel ızgarasında yeniden taranır ve
  alt piksel drift tek karede basamak verir (referans ölçümü (kaynak proje): 0,39/255 basamak, `fc:temporal` 1,77).
- Derinlik ölçüsü: dilim/çarpıtma çıktısında komşu dilim göreli kayması hamle boyunca ölçülür (açıklık 0); ön plan hız oranı bilgi, kapı değil.

## §3 Fiziksel paralaks (kamera + z'den; keyfi katman çarpanı değil)

Paralaks katman başına seçilen bir oran (ör. 0,6 / 1,0 / 1,3) **değildir**; plakanın çekildiği objektif ve nesnenin gerçek yüksekliğinden türer.
Tepe kamera modeli (plaka H_K px yükseklikten, ilke noktası PP0 üstünden çekilmiş; kamera yüksekliği H_c; öteleme Δ plaka px):

```
ekran(p, z) = S · ( σ_z · (p − PP0) + PP0 − C_ref − Δ · m_z )
σ_z = (H_K − z) / (H_c − z)      m_z = H_K / (H_c − z)      k(z) = H_c / (H_c − z)
```

- **Push-in** = kamera alçalır (H_c azalır); **dolly/crane** = Δ. Duruşta Δ = 0, H_c = H_K → ekran = p − C_ref (**still = plaka**, 1:1).
- H_K, PP0 ve px/mm bir kez ölçülür (world `set.lens`); bütün set plakaları aynı objektif varsayımıyla üretilir ya da kendi değeri set kaydına yazılır.
- `camera.parallax` (world.json) eski katman yaklaşımının **varsayımıdır**; set kaydı olan sahnede kullanılmaz, yalnız tek plakalı (set kaydı
  olmayan) sahnede geçerlidir.
- Paralaks ve hız **piksel izlemeden** ölçülür; DOM/model yalnız beklentidir (kaynaklar ayrışırsa yöntem tekleşir: aynı kare aralığı, aynı özellik noktası).
- Hareket kuralları (tepe hız, görünür süre, settle, seyahat) motion-core `RULES`/`MEASURE` (M-C, M-SEYAHAT) ve world `camera` alanındadır;
  bu dosya yalnız geometriyi verir.

## §4 Set ışığını okuma (ölç, tahmin etme)

| ölçü | yöntem | çıktı |
|---|---|---|
| **yön** (hızlı okuma) | en parlak %3 pikselin ağırlık merkezi, kare merkezine göre açı (`lessons.md` §1) | açı ° |
| **havuz modeli** | yüzey iç bölgesi (kenardan içeri; plaka nesneleri hariç), ¼ alt örnek, σ ≈ 24 px bulanık (lif dokusu silinir); kanal başına log(v) = ikinci derece yüzey (6 terim) en küçük kareler → havuz tepe noktası; düşüm = tepe / görüş köşesi | havuz merkezi, düşüm, uyum RMS |
| **lamba yeri** | (a) havuz merkezi + sabit ofset δ (lamba ↔ havuz; referans plakada bir kez, nesne gölge ışınlarıyla doğrulanır) · (b) bağımsız denetim: nesne gölge ışınlarının kesişimi (nadir) | `lamp.P` (plaka px) + `h` + belirsizlik px |
| **sıcaklık / beyaz nokta** | temiz yüzey blokları (blok `set.lightRead.blockPx`; doygunluk < `satMax`; blok içi (p95 − p5)/medyan < `blockFlatMax`) → en parlak blokların medyan rengi; McCamy CCT havuzda, ortada, köşede | `lamp.whitePoint` #hex, `cctK` |
| **merkez/kenar oranı** (bilgi) | still @1×, doğrusal Y; temiz bloklar → en parlak `centerBrightShare` medyanı / en karanlık `edgeDarkShare` medyanı; oran + stop | referans bandı (set ↔ set) |
| **ortam (gölge)** | **ışık eşleme öncesi** kaynak plakada kalkık nesnenin düşen gölge çekirdeği / yüzey albedosu, ≥ 3 konum, kanal medyanı; çekirdek ışıktan bağımsız sabitse → sabit ortam modeli | `set.shadow.ambient` |
| **gölge yönü** | lamba P'den nesneye vektör gv(p, z); plakadaki gölgelerle açı farkı | ° (tutarlılık; referans ölçümü (kaynak proje): 2–9°) |

- **SET-6 · Tek lamba.** Film boyunca **tek lamba yeri**: referans plakalardan bir kez türetilir, world `set.lamp`'a ve **her set kaydının
  `lamp` bloğuna aynen** yazılır. Ana oturum yazar; yapan (director) değiştirmez. Her sette havuz ölçümünden türeyen P ↔ set kaydı farkı raporlanır;
  fark > belirsizlik → açık karar. Lamba gövdesi kadraja girmek zorunda değildir; havuzu ve gölgeleri görülür.
- **Havuz merkezi yanlılığı.** Havuz kadraj kenarına yakınsa ya da dışındaysa uydurma yanlıdır (referans ölçümü (kaynak proje): merkez kadraj
  içinde 1 px; üst kenara yakın 73–80 px; kadraj dışında 455 px) → sentetik havuzla kalibre edilir; P'nin belirsizliği set kaydına yazılır.
- **Lamba modeli ve eşleme karartmayla (ışık eklenmez).** Plaka hedef lamba modeline yalnız kazanç **g ≤ 1** ile eşlenir: log-oran
  t = ln(L_hedef/L_ref) − ln(L_plaka/L_ref) hücre ızgarasında, ikinci derece yüzey, g = exp(t̂ − max t̂) — daha dar bir havuza eşdeğer.
  Hiçbir kanal parlatılmaz (kanal oranlı ya da nötr). İçerik rengi = palet × L(x, y), L = model / albedo. Fotoğraftaki kendi düşümü sprite'tan
  kaldırılır (düz alan); sahne ışığı tek modelden gelir (çift ışık yok).
- **Düşen gölge oranı lambadan.** o_c(x) = min(1, ortam_c / L_c(x)), x = gölge merkezi; **sabit oran değil.** Eşleme kazancı gölge ile ışığı
  birlikte çarpar, oranı korur: tek noktada ölçülen oran o noktanın parlaklığına aittir; loş yüzeyde gerçek gölge daha açıktır. Temas bandı / AO
  ayrı ve sabittir. Plakada olmayan bütün düşen gölgeler (sprite, kart, bant, ince parça) aynı modeli kullanır — tek lamba altında iki gölge koyuluğu olmaz.
- Işık **yönü**, **sıcaklık** ve **düşüm** set plakasında ölçü olarak bilgi, sapma raporda; kabul ölçütü olarak plaka malzemesinin parçası
  değildir (GENAI §9.4 "plaka = malzeme"); render karesinde ölçülür.

## §5 Bütünlük = ışık + tasarım dili, envanter değil

| SABİT (bütün setlerde) | SERBEST (set başına) |
|---|---|
| tek lamba modeli (yön, yükseklik, sıcaklık, düşüm), malzeme stoğu (kâğıt/yüzey), palet (aksan tek), ilkeller, kamera zanaatı, ön plan kuralı a–f, objektif | masa düzeni, nesne seçimi, kompozisyon — **shot'un anlamından** |

- **SET-7 · Sahne niyeti.** Her set kaydında bir paragraf sahne niyeti (`intent`): bu shot ne söylüyor, nesneler neden burada. **Niyet yoksa set yok.**
- **SET-8 · Bağlayıcı nesne.** Sözlükte shot'tan shot'a taşınan nesne komşu setlerde **aynı nesnedir** (aynı plaka kesimi ya da aynı ilkel;
  `objects[].binding`). Yeni nesneler plaka; birden çok sette tekrar edenler ilkel olur (`references/ILKEL.md`).
- Bütünlüğü envanter (her sette aynı nesneler) kurmaz; aynı ışık ve aynı tasarım dili kurar. Reviewer setleri yan yana görür ve iki şeyi
  ayrı tartar: süreklilik (aynı ışık, aynı dil) ve shot'un kendi anlamı (niyet okunuyor mu).

## §6 Set kaydı (`set.json`) — tek kaynak

Yer: `world/lookdev/<SET>/set.json` (ya da projenin set dizini). Dünya koordinatı = arka plaka pikseli. Sahne kodu yerleşimi, kamerayı ve lambayı
yalnız buradan okur (derlenmiş kopya: `<set>-set.js`). Değerler ölçülür; ölçülmemiş alan `null` kalır (uydurulmaz).

```json
{
  "version": "set <ad> · <tarih>",
  "note": "TEK SET KAYNAĞI: still ve klip bu kayıttan; dünya koordinatı = arka plaka pikseli",
  "scale": 1,
  "intent": "<sahne niyeti: bu shot ne söylüyor, nesneler neden burada>",
  "lamp": { "P": null, "h": null, "whitePoint": null, "cctK": null, "uncertaintyPx": null, "source": "<ölçüm kaydı yolu>",
            "rule": "film boyunca tek lamba; world set.lamp ile aynı; ana oturum yazar, director değiştirmez" },
  "camera": { "ref": [0, 0], "heightPx": null, "principalPoint": null, "pxPerMm": null,
              "dof": { "focusZ": 0, "sigmaRefPx": null, "zRefPx": null } },
  "layers": [
    { "name": "arka", "z": 0, "plate": "<varlık-id>", "file": "assets/gen/kesim/<set>-arka.png", "process": "ışık eşleme: yalnız karartma (kazanç ≤ 1)" },
    { "name": "orta", "zMm": null, "plate": "<varlık-id>", "note": "içerik yüzeyi; masa nesneleri zeminle aynı üretimde" },
    { "name": "on", "zMm": null, "plate": "<varlık-id>", "depth": "<16 bit yükseklik dosyası>", "slices": null }
  ],
  "objects": [
    { "id": "<nesne>", "layer": "on", "plate": "<varlık-id>", "center": null, "sizeMm": [null, null], "heightMm": null,
      "bodyClass": "flat", "box": null, "rules": "a–f: <madde başına tek cümle>", "binding": null }
  ],
  "content": { "boxes": "__boxes", "decisionPoints": [], "marginPx": null },
  "registration": { "table": "<masa plakası varlık-id>", "corners": null, "homography": null, "seam": "world edge.seam" }
}
```

| alan | anlam | kim yazar |
|---|---|---|
| `lamp` | tek lamba (§4); world `set.lamp` ile birebir | ana oturum (ölçüm kaydından) |
| `camera` | `ref` = still görüşünün plaka px sol-üstü (C_ref); objektif (§3) | yapan; objektif ölçümü bir kez |
| `layers[]` | katman, z, kaynak plaka, işlem (eşleme, kesim) | yapan |
| `objects[]` | nesne başına plaka, merkez, **gerçek ölçü** (mm; kabulde boy ±tolerans buna göre), yükseklik, gövde sınıfı (`flat` · `round` · `nested`), a–f notu, bağlayıcı nesne | yapan; boy kabulü ölçümle |
| `content` | içerik kutuları (sahne kancası), karar noktaları (örtülmez), içerik ↔ nesne payı | yapan |
| `registration` | büyük masa plakasına kayıt (§8): köşe eşlemesi, homografi, dikiş testi başvurusu | yapan; dikiş ölçümle |
| `intent` | sahne niyeti (SET-7) | yapan (bilgi kontağında proje sahibine) |

## §7 Plaka kabulü (set plakası)

Kabul = **malzeme** (1.3, `motion-render ingest-kapi`; GENAI §9.4) **+ set koşulları** (1.4) birlikte:

| koşul | ölçü | eşik kaynağı |
|---|---|---|
| malzeme | yüzey bölgesinde doku std (onaylı referansla parite) + palet ΔE2000 (+ ton eşleme) + göz (yazı/el/rakam/logo 0, normalize görüntü) | istek `accept.regions` (ingest-kapi okur) |
| kenar | nesne başına M-KENAR (matte, hale, gren sürekliliği, büyütme, temas boşluğu) — **gövde sınıfıyla**; ham plakada ve ekrandaki kesim çıktısında aynı ızgarayla | world `edge` |
| yerleşim | içerik ve metin örtmesi 0; karar noktası açık; içerik kutularına pay | `set.json` `content` · world `set.accept.overlapMax` |
| yer · boy | nesne merkezi yer tutucu hedefinden ± `posTolPx`; boy `objects[].sizeMm` gerçek ölçüsünün ± `sizeTol` (referans ölçümü (kaynak proje): ±%10, ±20 px) | world `set.accept` (proje yeniden yazar) |
| bölge dışı | maskeli bölge üretiminde (GENAI §17) maske dışı plaka değişmedi: NCC kayma 0 px, fark ≈ 0 | GENAI §17.4 |
| dikiş | maskeli bölge ve kayıt kenarında M-DIKIS (kalınlık · luma) | world `edge.seam` |
| askıda | nesne başına M-ASKIDA (temas bandı + gölge; göreli eşik) | world `edge.contact` |

- Nesne kadraj ortasına kayar ya da büyürse plaka reddedilir ve yeniden üretilir (deneme ≤ 3, sonra yöntem değişir — GENAI §17.8).
- **Set plakası ≠ malzeme plakası:** malzeme plakasının mutlak doku eşiği fotoğraf set plakasına doğrudan uygulanmaz; yüzey bölgesinde onaylı
  referansla parite (× 0,9) kullanılır. Işık yönü ve sıcaklık set plakasında bilgi (§4).
- Kenar penceresi sonucu değiştirir: ölçü kümesi (bölge, pencere, eşik) istem yazılırken plaka profiline göre sabitlenir, sonradan değil.

Örnek istek öğesi (`assets/gen/requests/<set>.json` → `items[]`; ingest-kapi `accept` içinden `regions` · `map` · `goz`'ü okur, `set` alt
nesnesini **okumaz** — kenar, yerleşim, dikiş, askıda bağımsız ölçümle (`motion-measure`, MEASURE M-KENAR · M-DIKIS · M-ASKIDA) alınır ve
sonuç `ingest review` notuna yazılır):

```json
{
  "id": "g-<set>-arka-a",
  "type": "plate",
  "role": "B",
  "method": "region",
  "refs": ["assets/gen/refs/<set>-yer.png", "assets/gen/refs/<set>-temiz.png", "assets/gen/refs/<nesne>-olcek.png"],
  "place": { "object": "<nesne>", "center": null, "sizeMm": [null, null], "sizePx": null },
  "accept": {
    "map": "none",
    "regions": [{ "name": "yuzey", "rect": null, "target": "<palet adı>", "stdMin": null }],
    "goz": null,
    "set": {
      "edge": { "objects": ["<nesne>"], "bodyClass": "flat", "sourcePlate": null, "thresholds": "world edge" },
      "placement": { "overlapMax": 0, "decisionPoints": "açık", "posTolPx": null, "sizeTol": null },
      "outsideMask": { "shiftMaxPx": 0, "nccMin": null },
      "seam": "world edge.seam",
      "contact": "world edge.contact"
    }
  }
}
```

`rect` görüntü pikselidir (ingest-kapi görüntüyü 1920×1080'e oturtur; `--native` kendi boyutu); `stdMin` onaylı referans ölçümü × 0,9.

## §8 Büyük masa, harita konumu ve set geçişi (kalıp)

Film tek büyük yüzeyde (masa) geçiyorsa setler o yüzeyin **sabit** parçalarıdır:

1. **Masa haritası** (üstten çizim + tablo): her setin yüzeyinin (kâğıt) masadaki konumu, boyutu, dönmesi (masa koordinatı mm ve plaka px);
   tek lamba noktası; lamba mesafesinden **beklenen düşüm** (yüzey başına; lambadan uzak yüzey daha koyu — fiziksel, ölçülen yüzey lumasıyla
   karşılaştırılır); komşuluk sözlük sırası ve geçiş yönüyle tutarlı; ön plan nesneleri haritada.
2. **Ana masa plakası:** `image_references` = onaylı set plakaları (aynı malzeme stoğu, nesne aileleri, tek lamba); istem negatif listeyle
   (GENAI §18.1). Yüksek çözünürlük gerekiyorsa proje politikasıyla ve bildirerek.
3. **Kayıt:** set plakaları harita konumuna perspektifle kaydedilir (köşe eşlemesi → homografi; `set.json` `registration`); **her kayıt kenarında
   dikiş testi** (M-DIKIS). Kayıt sonrası set ışığı tek lamba modeline karartmayla eşlenir (§4).
4. **Set geçişi:** kamera görünür hamleyle masa üstünde ilerler — seyahat hamlesi (yükselme → ilerleme → iniş; yükseklikte DoF masayı
   yumuşatır, iniş kahramanı netleştirir; ölçü M-SEYAHAT, değerler world `camera`) — ya da tam kadrajı örten süpürme altında set değişir.
   Gizli kamera hamlesi yok; kesme proje kararıdır. Geçiş yönü harita yönüyle tutarlı.
5. **Harita tablosu şablonu:** `| set | yüzey (mm) | konum (mm) | dönme ° | lamba uzaklığı (mm) | beklenen düşüm | ölçülen | komşular | geçiş türü |`.

## §9 Akış ve kontrol listesi

```
sahne niyeti (SET-7) → set kaydı taslağı (lamp bloğu ana oturumdan) → plaka üretimi (referanslı; düzeltme maskeli bölgeyle, GENAI §17)
→ plaka kabulü (§7) → kesim + ışık eşleme (yalnız karartma) → derinlik haritası / dilim (§2) → içerik DOM + ilkeller set ışığında
→ still → klip (aynı set kaydı) → QA (V1 değişiklik listesine göre kapsam)
```

- [ ] Set kaydında niyet paragrafı; `lamp` world ile birebir; ölçülmemiş alan `null`.
- [ ] Dünya nesnesi kodla çizilmedi; masa/ön plan nesnesi plakada; DOM'da nesne kesiği yok.
- [ ] Paralaks kamera + z'den; katman çarpanı yok; drift yalnız CSS dönüşümünde.
- [ ] Eşleme kazancı ≤ 1; çift ışık yok; düşen gölgeler ortam modelinde.
- [ ] Plaka kabulü: malzeme + kenar + yerleşim + yer/boy + (bölge dışı + dikiş) + askıda; sayılar raporda.
- [ ] Still ↔ klip aynı kayıt; bağlayıcı nesne komşu sette aynı nesne.

## §10 Tuzaklar (set yöntemi)

| # | tuzak | ders |
|---|---|---|
| W-41 | Düzenleme isteminde nesnenin konumu metinle ("sağ-alt köşede") verildi; nesne iki turda da içerik alanına girdi | yerleşim düz gri yer tutucuyla verilir (GENAI §17.2); metinle konum tarifi tutmaz |
| W-42 | Masa nesnesi ayrı üretilip matte ile yapıştırıldı: kenarda yumuşatma, yüzey greni kenara ulaşmıyor, sınır çizgisi görünür | aynı üretim (SET-2); zorunlu ayrımda M-KENAR |
| W-43 | Kesim maskesi (luma eşiği) ince bir çizgiyi yarı gölgede maskeden düşürdü; doku kazancı yalnız maske içinde → çizgi bir yanda ışık dudağı aldı (dikiş) | doku maskesi ışıkla oranlı eşik (yerel ışık × oran); kesim çıktısı ham plakayla aynı ızgarada ölçülür |
| W-44 | Düşen gölge sabit oranda (tek noktada ölçülmüş): loş yüzeyde gölge fazla koyu, kenar bandı kontrastı düştü | ortam modeli o = min(1, ortam / L) (§4) |
| W-45 | Fotoğraf sprite'ı kendi lamba düşümünü taşıdı (şerit boyunca %9–40 — referans ölçümü (kaynak proje)) → sahne ışığıyla çift ışık | sprite düz alan; ışık tek modelden |
| W-46 | Plakanın kendi gölgesi yüzey dokusundan ayrılamadı (lekeli, sert sınırlı) | gölge lamba modelinden çizilir; plaka gölgesi yalnız plakanın parçası olan nesnede kalır |
| W-47 | Restyle/düzenleme referansı kendi ışık yönünü çıktıya taşıdı | referans plakanın ışığı hedef lambayla aynı olmalı; değilse önce karartmayla eşlenir |
| W-48 | "1:1" iki ölçek: kaynak ölçeğinde 1:1 ↔ film karesinde 1:1 farklı sonuç verdi | kabul kararı film karesinde; ölçek ölçütte yazılı |
| W-49 | Havuz merkezi kadraj kenarında: lamba yeri setten sete 230 px oynadı (referans ölçümü (kaynak proje)) | P tek, belirsizlikle; set ölçümü yalnız sapma denetimi (SET-6) |
