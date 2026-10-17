# MEASURE — ölçüm yöntemleri

> [RULES.md](RULES.md)'deki her kural burada **nasıl ölçüldüğüyle** karşılanır. Kural satırındaki `M-…` kodu bu dosyadaki bölüm başlığıdır; `fc:<tip>` §4'teki frame-check tipidir; `qc#n` §3'teki kontroldür.
> Araç: `motion-render` (paket `render/`); sözleşme `render/CONTRACT.md` (alan adları, kancalar, çıkış kodları oradan).
> Değerler [ÖRNEK] etiketliyse world/proje değeridir, core varsayılanı değildir.

---

## §0 Ölçüm ilkeleri

1. **Ölçmeden karar yok.** Her kapı iddiası bir `out/probe/*.json` ya da kare kanıtına bağlanır (ÇK-16).
2. **Teşhis önce, sayıyla neden** (ÇK-05): kusur önce ölçülür (sayı + hipotez + kanıt kırpımı), sonra düzeltilir; önce/sonra **aynı ölçüm yoluyla** (aynı araç, çözünürlük, kare kümesi) verilir (RP-8).
3. **Kesin karar tam çözünürlükte.** Kontak, animatik ve küçük önizleme eğilim gösterir; okunurluk/kontrast/keskinlik kararı 1080p karede verilir (animatik kontrastı yarım çözünürlükte sahte değer verir).
4. **Tasarım zamanı önce, piksel sonra.** Kadraj, alet yolu, örtme, kamera basamağı render'dan önce izdüşümle (Katman B tipleri, render yok) ölçülür; animatik ancak bunlar temizse alınır. Piksel ölçüsü (Katman A) render sonrası doğrulamadır.
5. **Tek sınıf kaydı.** Renk sınıflandırıcıları yalnız `world.json` → `classes`'ta; kontroller sınıfı adla çağırır (AK-9).
6. **Ölçüm aracının kendi hatası ölçülür** (§7, M-SELF): aynı içerikte araç ≈ 0,995 benzerlik / ≈ 0 fark vermiyorsa sonuç kullanılmaz.
7. **Reviewer ve motion-measure kendi yöntemiyle ölçer** (RV-3, M-REV); yapanın sayısı referans değildir.

---

## §1 Birimler, ölçüm yolları, ızgaralar

### §1.1 Birimler

| büyüklük | tanım |
|---|---|
| süre | saniye; kare = `round(s · fps)`, fps yalnız `scenes.json` `fps` |
| kare dizini | manifest fps'inde mutlak kare numarası (0 tabanlı); `range` aralıklarında **mutlak** numara |
| px | 1080p ekran pikseli; başka yükseklikte `× H/1080` |
| px/kare (world) | `camera.maxPxPerFrame`, `camera.stepJump`, `camera.accel.floor`, `motion.toolMaxPx` **60 fps · 1080p referansıdır**; araç `× 60/fps` ile ölçekler (px/s karşılığı RULES §21) |
| luma % | Rec.709 Y′ = 0,2126 R + 0,7152 G + 0,0722 B, **8-bit gamma uzayında**, /255 · 100 (doğrusal ışık değil) |
| fark | /255 (kanal ya da Y′ farkı) |
| renk farkı | ΔE2000 (CIEDE2000, kL = kC = kH = 1), D65 |
| ses | LUFS (entegre), dBTP (gerçek tepe), dBFS |

### §1.2 Ölçüm yolları (M-YOL)

| ad | çözünürlük ve ön işlem | kullanım |
|---|---|---|
| `qc` | Gauss bulanıklığı σ 0,8 → 960×540 kübik → luma; piksel sayımları 480×270 eşdeğerine (/4) çevrilir | qc'nin bütün piksel kontrolleri; `fc:luma` (qc ile birebir aynı sonuç gerekiyorsa) |
| `fast` | 480×270 gri | ardışık fark (MAD), sıçrama, OURS blok eşleme, kontak |
| `full` | 1920×1080 | ΔE, kenar genişliği, çizgi profili, keskinlik, örtme pikseli |
| `dom` | 192×108 ızgara (10 px hücre) | `[data-hero]` birleşik alanı (K1 `dom`, kadraj `hero:"dom"`) |
| `mp4-Y` | grade'li mp4'ün Y düzlemi, `scale=…:flags=area` (960×540 ya da 480×270) | dikiş, son kareler, iniş, encode basamağı (encode sonrası gerçek) |
| izdüşüm | render yok; sayfa `probe --eval` ile kare kare (60 fps'te 2–3 kare adım), sahne kancaları ekran px döndürür | Katman B tipleri (`framing`, `toolPath`, `overlap`, `camera`) |

Kadraj parlak bölgesi: luma > %30 (77/255), 480×270, 3×3 kapanış, 8-komşu bağlı bileşen. Boş siyah pikseli: luma < %6 (15,3/255). Kahraman çevre halkası: kutu + 120 px @1080 (= 30 px @480).

---

## §2 Komut → çıktı haritası

✓ = adı CONTRACT'ta sabit. Diğer yollar aracın varsayılanıdır; `motion-render <komut> --help` ile doğrulanır.

| komut | ürettiği | içerik |
|---|---|---|
| `render <id…>` | `out/frames/<id>[_<tag>]/NNNNN.png` ✓ · `out/logs/<id>.log` (canlı) · `out/logs/<id>.json` (bitiş işareti) | kare süreleri, atlanan kareler (watchdog), yöntem; `--resume` > 0 baytlı kareyi atlar; yazım `.part` → rename |
| `probe <id> --frame N [--frames a,b] [--eval JS] [--bench N]` | PNG (`--out`) · stdout `eval → <JSON>` · `out/logs/<id>.probe.log` | tek kare, sayfada değerlendirme, kare süresi ölçümü; sahnenin render log'una dokunmaz |
| `qc <id> [--mp4 auto] [--frames-dir D]` | `out/probe/<id>-qc.json` ✓ | 16 kontrol (§3); kare başı `luma`, `bright`, aksan dizileri; HATA → çıkış 3 |
| `qc film` | film geneli QC JSON + grade sayfası PNG (`out/probe/`) | sahne başına 3 grade'li kare; ortalama, siyah/beyaz noktası (%0,5/%99,5 persentil), bölüm ışık arkı, film aksan sayımı |
| `frame-check <id> [--only …] [--cand c.json] [--sheet]` | `out/probe/<id>-fc.json` ✓ (+ `--sheet` kanıt sayfası PNG) | bildirilen tipler (§4); error → çıkış 3 |
| `ours <id> [--step N] [--no-cam] [--dir D]` | OURS/K3 tablosu (`out/probe/`) | M-OURS, M-K3 |
| `contact <id>` · `contact seq` · `contact storyboard` | kontak PNG | M-CONTACT |
| `imgdiff a b [out]` · `imgdiff stale <id>` | stdout fark + fark haritası PNG · bayatlık raporu | M-STALE |
| `ss2 <id> --plan` | 2×/1× aralık planı | M-2X |
| `expo-post <id> [--dry]` | işlenmiş kareler + `out/logs/<dizin>-expo-post.json` | aynı kare ikinci kez işlenmez (çıkış 3) |
| `grade <id…> [--animatic]` | `out/scenes/<id>.mp4` (kilitliyse `<id>.<ms>.mp4`) | M-GRADE |
| `master --tag vN` | `out/master/` MOV (ProRes) + MP4 (H.264) + loudness JSON | M-LOUD; tek sürekli encode |
| `arsiv --tag vN [--link-from vM]` | FFV1 MKV + `ARSIV.json` | framemd5 özeti, `bitExact` |
| `live <sayfa> [--qc]` | canlı ölçüm JSON (`out/probe/`) | M-LIVE |
| `logo check` | kabul ölçüleri tablosu | M-LOGO |
| `report` | RENDER_REPORT özeti | — |
| `smoke [--keep]` | kurulum denetimi | geçici proje → 12 kare 960×540 → qc → contact |

Çıkış kodları: 0 tamam · 1 hata · 2 kullanım · 3 QC/kontrol `error` · 4 bekçi duraksama · 5 kare atlandı · 6 disk < 40 GB.

---

## §3 qc — 16 kontrol (`motion-render qc <id>`)

Ön işlem: `qc` ölçüm yolu (§1.2). Pencereler: `openF` = `blackStart` ise 0,5 s, değilse 0; `exitF` = `layer.exit` (s) ise ondan, yoksa son 0,2 s. `review.<tür>: [[a, b, "gerekçe"]]` ilgili bulguyu "incelendi" UYARI'ya çevirir; `exceptions`, `contentRed` kayıtlı istisna/muafiyettir. Herhangi bir HATA → çıkış 3.

| kod | kontrol | yöntem | eşik | manifest / world alanı | seviye | kural |
|---|---|---|---|---|---|---|
| M-QC1 | kare sayısı | `NNNNN.png` sayısı = `frames` (= round(süre · fps)); sayfa `OM_SCENES` süresi ↔ Stage süresi farkı > 1 ms uyarı | eşit | `frames`, `fps` | HATA | MT-3 |
| M-QC2 | son kare | ham son kare max; `--mp4` ile mp4'ün N−1. karesi max. `cut:"light"`: son 2 karede luma n−2'ye göre düşmez (tol 2), artış tepesi ≤ %60, n−3'ten önce iniş yok | ham ≤ 2 · mp4 0 | `slice` (muaf), `cut` | HATA | SN-1, SN-2, GÇ-7 |
| M-QC3 | karanlık | kare ortalama luma < %8 **ve** parlak (> %30) piksel payı < 0,0005; kesintisiz süre `[openF, exitF)` içinde. Aydınlık zincirli world (`grade.chain:"light"`): yerine **patlama** — luma > 250 payı > 0,35 | > 0,5 s → HATA · patlama UYARI | `blackStart`, `layer.exit`, `review.dark` | HATA (incelendi → UYARI) | KD-8 |
| M-QC4 | kadraj | anahtar karelerde (`keys` ‖ %25/%50/%75) en büyük bağlı parlak bölge (§1.2): alan oranı, yükseklik oranı. `hero:"dom"` → `[data-hero]` birleşik alanı (`dom` yolu), eşik `heroMin`. `profile:"typographic"` → en büyük görünür okunacak display metin px | alan ≥ 0,30 **ya da** yükseklik ≥ 0,50 · tipografik ≥ `typeMin` (72 px) | `keys`, `hero`, `heroMin`, `profile`, `typeMin`, `review.kadraj` | UYARI | KD-1, KD-3, KD-7 |
| M-QC5 | K1 | world maskesi (M-K1) anahtar karelerde | alan ≥ `areaMin` **ya da** yükseklik ≥ `heightMin` | `world.k1.*` (zorunlu), manifest `k1.{areaMin, heightMin, lyricMin, keys}` (yalnız yukarı) | HATA (`review.kadraj` → UYARI) | K1 |
| M-QC6 | kahraman kontrastı | \|kahraman maskesi ort. luma − çevre halkası ort.\| (halka = kutu + 120 px @1080) | ≥ 25/255 | `review.kontrast` | UYARI | KD-4 |
| M-QC7 | parlaklık bandı | `[openF, exitF)` kare ortalamalarının **zaman ağırlıklı** (trapez) ortalaması; hücre başı (her 0,4 s) bant dışı sayımı | `world.band` (**zorunlu**) · tipografik `band` ‖ [6, 14] | `world.band`, `band`, `bandWhy`, `profile` | UYARI | KD-6, KD-7 |
| M-QC8 | boş siyah | luma < %6 piksel payı | hücre (0,4 s) > 0,70 → UYARI · kesintisiz > 0,70 > 1 s → HATA | `blackStart`, `layer.exit`, `review` | HATA / UYARI | KD-9 |
| M-QC9 | derinlik | %25/%50/%75 karelerinde merkez (\|x\|, \|y\| < 0,45) / kenar (> 0,8) luma oranı ve Laplace enerji oranı | ikisi de < 1,05 → UYARI (düz kare) | — | UYARI | Z1, UCUZ-3 |
| M-QC10 | aksan (kota) | sınıf `world.accent.class` → `world.classes`; kare "açık" = sınıf pikseli ≥ 25 px (480 eşd.); iki açık küme arası boşluk < 0,067 s **ve** kutular 8 px payla örtüşüyorsa köprü (tek aralık); aralık süresi ≥ 0,067 s; sahne `__redExclude(fps,n)` kutuları hariç | aralık sayısı ≤ `redQuota` | `redQuota` ‖ `world.accent.quotaDefault`, `contentRed`, `exceptions` | HATA (`contentRed` → UYARI) | AK-3 |
| M-QC11 | ikincil / kısıtlı sınıf | world'ün tanımladığı ikincil ton sınıfı ≥ 60 px iki ardışık karede; aksanın açık olduğu karede sayılmaz; `f < exitF` | yalnız `exceptions.<sınıf>` aralıklarında | `world.classes`, `exceptions` | HATA (istisna → UYARI) | AK-9 |
| M-QC12 | fade | M-FADE dedektörü | olay ≥ 0,067 s **ve** toplam kontrast ≥ %25, `exitF` öncesi → HATA | `layer.exit`, `review.fade` | HATA (incelendi → UYARI) | GÇ-1, GÇ-2 |
| M-QC13 | glif | sayfada 0,2 / 0,45 / 0,7 / 0,92 · (N−1)/fps anları + anahtar karelerde görünür ASCII dışı karakterler × (aile, ağırlık) yüklü yüzlerin `unicode-range`'i | eksik 0; boş liste = "kontrol yok" uyarısı | `keys`, `world.fonts` | HATA | KD-17 |
| M-QC14 | metin kontrastı | M-KONT metin yöntemi (WCAG) anahtar karelerde | ≥ 4,5:1 | `keys`, `review.kontrast` | UYARI | KD-5 |
| M-QC15 | metin boyu | görünür metin düğümünün ekran px'i (font-size × ekran kutusu / yerel kutu); tek karakter yalnız ≥ 72 px ise ölçülür; `[data-doku]` hariç | ≥ 22 px | `keys`, `review.metin` | UYARI | KD-2, KD-3 |
| M-QC16 | kamera ivmesi | `__camSpeed(fps, n)`; \|v[i] − v[i−w]\| / max(v[i], v[i−w]) ; w = round(fps/30); iki değer de tabanın altındaysa ölçülmez | ≤ `camera.accel.max` (0,15) · taban 120 px/s (2 px/kare @60) | `camAccel` ‖ `world.camera.accel` | UYARI | KM-5 |

**qc dışı ama zorunlu denetimler** (probe/yönetmen geçişi): konsol temiz (`PAGEERROR` yok), süzgeç bölgesi kırpması (ince öğe), kadraj dışı kritik öğe, parlak bant/artefakt tam çözünürlükte.

**Kontrast probe'u (tam render öncesi, KD-12):** anahtar kareler `probe --frames` ile çizilir, qc'nin anahtar kare kontrolleri (M-QC4/5/6/7/14/15) bu karelerde çalıştırılır (`qc <id> --frames-dir <probe dizini>`; kesitte kare sayısı denetimi anlamsızdır). Işık ayarı bu döngüyle yapılır; tam render ölçüm tutunca.

---

## §4 frame-check — 20 tip

### §4.0 Sözleşme

```
motion-render frame-check <id> [--only t1,t2] [--frames-dir D] [--mp4 auto|yol] [--cand aday.json] [--sheet] [--json]
  → out/probe/<id>-fc.json   (özet satırı; çıkış 3 = error düzeyinde ihlal)
```

- **Girdi:** `scenes.json` sahne kaydının `checks: [...]` dizisi + (varsa) `checks/<id>.json` (birleşir) · `world/world.json` (varsayılanlar, sınıflar) · sahnenin `hooks: [...]` dosyaları (frame-check sayfaya enjekte eder) · `review` kayıtları (`[a, b, gerekçe]` → incelendi).
- **Ortak alanlar:** `type` · `severity` (`error` | `warn` | `info`; SERT tiplerde varsayılan `error`) · `frames` (liste) | `range` [a, b] | `step` (kare) | `at` (`"actBoundaries"` | `"last"` | `"keys"`) · `region` ([x, y, w, h] @1080 ya da `$kanca`) · `src` (`frames` | `mp4` | `master` | `asset`) · `scale` (`qc` | `fast` | `full`) · `ref` (karşılaştırma: dizin, `tag:<T>`, mp4, `master:vN`) · `evidence: true` (ihlal karesinin kanıt sayfası).
- **Değer başvuruları:** `"$world.<yol>"` = world.json değeri (ör. `$world.band`) · `"$__boxes"`, `"$redExclude"` … = sahne kancası · `"$shots"` = manifest `shots[]`.
- **Birim kuralı:** süre parametreleri **saniye**; kare listeleri mutlak kare dizini; px 1080p; luma %; fark /255.
- **Kanca yoksa** ilgili kontrol "ölçülemedi" UYARI verir (hata değil); `smoke` kanca sözleşmesini denetler.
- **Çıktı:** her kontrol için tip, seviye, geçti/kaldı, ölçülen değer(ler), eşik, ihlal kareleri, (varsa) kanıt sayfası yolu.
- **Katmanlar:** A = piksel/zaman (render sonrası, 13 tip) · B = tasarım zamanı izdüşüm (render yok, 4 tip) · C = ses/tipografi (3 tip).

Kanca sözleşmesi (CONTRACT §5, özet): `__camSpeed(fps,n)` kare başı kamera ekran hızı · `__camK(fps,n)` kare başı kamera ölçeği k · `__redExclude(fps,n)` kare başı izinli aksan kutuları · `__boxes(T)` `[{name, rect|poly, z, kind: obj|lyric|label|text|cut|out, size}]` · `__tools(T)` `{ad: {poly, tip, visible}}` · `__holds()` tutuş aralıkları · `__events()` `[{t, word, kind}]` · `__glyphs(T)` yazılmış glif kutuları · DOM işaretleri `[data-hero]`, `[data-doku]`, `[data-c]`, `[data-fx]`.

### Katman A — piksel / zaman

#### fc:luma (1) — parlaklık, bant, bölge ışığı
Kural: KD-6, KD-10, IŞ-10. Kanca: yok. World: `band` (zorunlu).

| parametre | varsayılan | anlamı |
|---|---|---|
| `range` / `frames` / `step` | sahne `[openF, exitF)`, step = 0,4 s | ölçülen kareler |
| `region` | tüm kare | bölge (şerit, köşe, merkez) |
| `grid` | — | [sütun, satır] ızgara (ışık havuzu dağılımı) |
| `stat` | `mean` | `mean` · `p90` · `hp` (yüksek geçiren std = doku gücü) |
| `band` | `$world.band` | [alt, üst] % |
| `darkShare` | — | `{below: %, max: pay}` koyu bölge payı (genel bakış pozlaması) |
| `report` | `cells` | `overFrames` (bant dışı kare listesi) · `cells` |
| `src` | `frames` | `mp4` ile grade sonrası |

```json
{"type":"luma","range":[600,1200],"step":4,"band":"$world.band","report":"overFrames","scale":"qc"}
```

#### fc:black (2) — boş siyah, son kareler
Kural: KD-9, SN-2. Kanca: yok. World: — (core sabitleri).

| parametre | varsayılan | anlamı |
|---|---|---|
| `emptyLuma` | 15,3 (/255, %6) | boş siyah piksel eşiği |
| `emptyMax` | 0,70 | kare başı boş pay sınırı |
| `runMax` | 1,0 s | kesintisiz boş süre sınırı (HATA) |
| `last.rawMax` | 2 | ham son kare max |
| `last.mp4Max` | 0 | encode son kare max (RGB) |
| `last.yWindow` | 0,13 s | mp4 son kareleri Y = 16 (TV siyahı) olmalı |

```json
{"type":"black","runMax":1.0,"last":{"rawMax":2,"mp4Max":0,"yWindow":0.13}}
```

#### fc:temporal (3) — sıçrama, takılma, dikiş serisi
Kural: DV-3, K8 (tek kare değişim), BAS-3, IŞ-9, SS-1, UCUZ-9. Kanca: `__camSpeed` (yalnız `dup`/`stutter`). World: —.

| parametre | varsayılan | anlamı |
|---|---|---|
| `metric` | `mad` | `mad` (ortalama mutlak fark /255) · `meanY` (ortalama Y; encode/iniş basamağı) · `edgeEnergy` (ort. \|∇luma\|; 2×/1× sınırı) · `globalExposure` (değişen kutu dışındaki ΔY; pozlama basamağı) |
| `at` | — | `actBoundaries` (her perde sınırı + film başı/sonu, sınırlar manifest `range`'den) · `last` · `keys` |
| `window` | 0,2 s | `at` çevresindeki pencere (±) |
| `maxRatio` | 1,5 | sıçrama oranı r_i = d_i / max(d_{i−1}, d_{i+1}, floor) |
| `floor` | 0,02 | oran paydası tabanı |
| `spike` | `{k:1,6, abs:0,8}` | d > k · komşu ort. **ve** d − komşu > abs |
| `detect` | — | `dup` (d < 0,15 ve kamera > 1 px/kare) · `stutter` (m > 0,6 ve d < 0,35 m) · `jump` (d > 2,5 m ve d > 3) · `freeze` (d < 0,05) · `colorCast` (renk sınıfı payı kayması) |
| `mix` | — | `{new: dizin, ranges: [[a,b]…]}` yeni aralık + kayıtlı komşuların birleşik serisi |
| `outsideBoxPad` | 8 px | `globalExposure` için değişen kutu payı |
| `src` | `frames` | `mp4` · `master` · `asset` (üretken klip kabulü: spike > 2,2 × medyan, freeze) |

```json
{"type":"temporal","at":"actBoundaries","window":0.2,"src":"mp4","metric":"mad","maxRatio":1.5,"floor":0.02}
```

#### fc:ramp (4) — iniş/çıkış tekdüzeliği
Kural: SN-4, SN-5, BAS-3. Kanca: yok.

| parametre | varsayılan | anlamı |
|---|---|---|
| `frames` | — | [a, b] rampa aralığı |
| `monotone` | true | ortalama Y tekdüze |
| `maxRelDev` | 1,5 | ardışık fark / komşu farkı (göreli sapma = sapma / max(0,05, D)) |
| `lastMax` | 0 | rampanın son karesi max |
| `ref` | — | karşılaştırma dizini (önce/sonra) |

```json
{"type":"ramp","frames":[1380,1439],"monotone":true,"lastMax":0,"src":"mp4"}
```

#### fc:seam (5) — perde/sahne devri
Kural: DV-1, DV-2. Kanca: yok. Yöntem: M-SEAM.

| parametre | varsayılan | anlamı |
|---|---|---|
| `next` / `prev` | — | komşu sahne kimliği |
| `neighborK` | 1,1 | hareketli devir: dikiş ≤ k × büyük komşu fark |
| `staticMax` | 2 (/255) | durağan devir sınırı |
| `src` | `frames` | `mp4` |

```json
{"type":"seam","next":"S2","neighborK":1.1,"staticMax":2}
```

#### fc:identical (6) — bayatlık tanığı, bit-eşliği
Kural: RH-5, RH-6, RH-7, MT-1, MT-5, MT-6, MS-4, MS-6. Kanca: `mode:"dom"` için `[data-fx]` DOM işareti.

| parametre | varsayılan | anlamı |
|---|---|---|
| `ref` | — | `tag:<T>` · dizin · mp4 · `master:vN` |
| `frames` / `ranges` | — | tanık kareler |
| `expect` | `same` | `same` (aralık dışı) · `diff` (değişmesi gereken aralık) |
| `tol` | 0 | izinli ortalama fark (/255) |
| `mode` | `pixel` | `pixel` · `dom` (`[data-fx]` outerHTML imzası; pişirme imzası değişti mi) · `rgb48` (16-bit; master vN ↔ vN−1) |
| `report` | — | `diffMap` (fark haritası, kanal farkı ×4) |

```json
{"type":"identical","ref":"tag:v3","ranges":[[0,559]],"expect":"same","tol":0}
```

#### fc:edgeDark (7) — kadraj kenarı kararması, world düşümü
Kural: KD-11, KM-7. Kanca: yok. World: `edgeDark.maxFalloff`.

| parametre | varsayılan | anlamı |
|---|---|---|
| `mode` | `band` | `band` (yapay koyu kenar bandı) · `corners` (world düşümü) |
| `band` | [1, 3] px | kenar bandı |
| `ref` | [12, 15] px | içerideki karşılaştırma bandı |
| `maxDelta` | 15 (luma /255) | bant − ref farkı sınırı (durağan karelerde, kamera ≤ 3 px/kare) |
| `patch` | 60 px | `corners`: 4 köşe + merkez yaması |
| `maxFalloff` | `$world.edgeDark.maxFalloff` | köşe/merkez düşüm sınırı (vinyetsiz world'de) |

```json
{"type":"edgeDark","mode":"band","band":[1,3],"ref":[12,15],"maxDelta":15}
```

#### fc:accentLocation (8) — tek vurgu rengi: konum
Kural: AK-4, AK-7. Kanca: `__redExclude(fps, n)`. World: `accent.class`, `classes`.

| parametre | varsayılan | anlamı |
|---|---|---|
| `classes` | [`$world.accent.class`] | taranan sınıflar (ikincil sınıf eklenebilir) |
| `allow` | [`"$redExclude"`] | izinli kutular (kanca + sabit kutular @1080) |
| `maxOutsidePx` | 0 | izinli kutular dışındaki sınıf pikseli |
| `quota` | `redQuota` | aralık sayısı (qc#10 ile aynı mantık) |
| `bridge` | `{gap: 0,067 s, boxPad: 8}` | köprü kuralı |
| `step` | 1 kare | örnekleme |

```json
{"type":"accentLocation","classes":["$world.accent.class"],"allow":["$redExclude"],"maxOutsidePx":0,"step":2}
```

#### fc:accentColor (9) — aksan/marka rengi tutarlılığı
Kural: AK-5, MS-6. Kanca: yok. World: `accent.color`, `classes`. Yöntem: M-DE.

| parametre | varsayılan | anlamı |
|---|---|---|
| `target` | `$world.accent.color` | hedef renk |
| `classifier` | world sınıf adı | iç piksel seçimi (3×3 komşuluğun tamamı sınıfta) |
| `frames` | — | ölçülen kareler |
| `src` | `mp4` | teslim edilen grade'li dosya (`master` da) |
| `maxDeltaE` | 5 (çizgi aksanı) | hedefe karşı |
| `pairs` / `maxPairDeltaE` | — / 3 | sahne çiftleri [[a, b]] arası marka tonu |
| `box` | — | bölge |

```json
{"type":"accentColor","src":"mp4","frames":[600,700],"classifier":"accentInner","maxDeltaE":5}
```

#### fc:sharpness (10) — keskinlik eşitliği, S× kenar
Kural: SS-2, SS-3, KD-16. Kanca: yok. World: `supersample.edgeMaxPx`, `classes`. Yöntem: M-SX.

| parametre | varsayılan | anlamı |
|---|---|---|
| `frames` | — | ölçülen kareler (tam çözünürlük) |
| `regions` | — | `{a: {cls}, b: {cls, below: "a"}}` sınıf + konum ilişkisi · `bands: "auto"` satır bantları |
| `metric` | [`edge1090`, `lapVarNorm`] | %10–90 kenar genişliği (px) · Laplace varyansı / kontrast² · `grad99` |
| `ratio` | — | [alt, üst] a/b oranı (ör. [0,9, 1,1] = ±%10) |
| `maxEdgePx` | `$world.supersample.edgeMaxPx` | mutlak kenar sınırı |

```json
{"type":"sharpness","frames":[1300],"regions":{"a":{"cls":"brandMark"},"b":{"cls":"darkNeutral","below":"a"}},"metric":["edge1090","lapVarNorm"],"ratio":[0.9,1.1]}
```

#### fc:stroke (11) — çizgi profili, süreklilik
Kural: K8 (zanaat), HAT. Kanca: yok. World: `classes`.

| parametre | varsayılan | anlamı |
|---|---|---|
| `box` | — | çizgi bölgesi @1080 |
| `metric` | — | `thickness` · `top` · `bottom` (sütun başı %50 kaplama geçişi, alt piksel) · `fwhm` · `inkExtent` · `continuity` (sütun başı en koyu ince piksel merkezinin eğimden sapması) |
| `ref` | — | önceki sürüm (kenar konumu yeni ↔ eski) |
| `maxDelta` | — px | kenar/kalınlık farkı sınırı |
| `maxKink` | 1,2 px | süreklilik kırığı sınırı |

```json
{"type":"stroke","box":[440,920,560,40],"metric":["thickness","top","bottom"],"ref":"tag:v2","maxDelta":0.5}
```

#### fc:motion (12) — piksel hareketi, takip
Kural: KM-9, KM-11 (piksel doğrulaması), İL-5. Kanca: yok (tasarım zamanında `fc:camera`/`fc:toolPath` tercih edilir).

| parametre | varsayılan | anlamı |
|---|---|---|
| `mode` | `global` | `global` (piksel kamera hızı) · `track` (sınıflı nesne takibi) |
| `method` | `sad` | SAD ± arama + parabol alt piksel; kabadan inceye (240p ± 14 → 960 ± 3) |
| `region` / `classifier` | — | bölge / world sınıfı |
| `subpx` | true | alt piksel |
| `report` | — | `peak` · `accel` · `stall` (hız ≈ 0 duraksama) · `firstVisible` · `lastVisible` · `edgeTouch` (kadraj kenarına değen mürekkep) |

```json
{"type":"motion","mode":"global","method":"sad","subpx":true,"report":["peak","stall"]}
```

#### fc:overlapPx (13) — örtme (piksel doğrulaması)
Kural: ÖRT-1. Kanca: yok.

| parametre | varsayılan | anlamı |
|---|---|---|
| `ref` | — | örtücüsüz referans kare (SAD ile hizalanır) |
| `band` | — | [x0, x1] tarama bandı |
| `maxHidden` | 0 | ref'te koyu glif pikseli (< 70) olup hedefte açık (> 110) olan piksel sayısı |
| `mode` | `hidden` | `hidden` · `clearance` (iki sınıf arası açıklık) |
| `a`, `b`, `minGap` | — | `clearance` sınıfları ve en küçük açıklık px |

```json
{"type":"overlapPx","ref":812,"band":[300,900],"maxHidden":0}
```

### Katman B — tasarım zamanı izdüşüm (render yok)

Sayfa açılır, kare kare (varsayılan 2 kare adım @60) kancalar çağrılır; dünya kutuları kamera izdüşümüyle ekrana iner. `--cand aday.json` sahneye aday değerleri (kamera eğrisi, yerleşim) enjekte eder; adaylar aynı tablo ile karşılaştırılır. Varyant eleme (VR-3) ve kamera adayı araması bu katmanla yapılır.

#### fc:framing (14) — kadraj payları, kesik metin
Kural: KD-2, KD-13, KD-14, K1-M, DV-5, KM-2. Kanca: `__boxes(T)`.

| parametre | varsayılan | anlamı |
|---|---|---|
| `boxes` | `"$__boxes"` | kutular |
| `kinds.obj` | `{pad: 12}` [ÖRNEK] | nesne kadraj payı px |
| `kinds.lyric` | `{pad: 50, minPx: k1.lyricMin}` | kahraman metin payı ve boyu |
| `kinds.label` | `{pad: 50, minPx: 40}` [ÖRNEK] | etiket |
| `kinds.text` | `{minPx: 22}` | okunacak metin (core) |
| `kinds.out` | `{fullyOutside: true}` | tamamen dışarıda olmalı |
| `kinds.cut` | `{allOrNothing: true}` | tam içeride ya da tam dışarıda |
| `desk` | `{max: …}` | yüzey dışı (world zemini dışında görünen) alan payı |
| `points` | — | ek noktalar ve payları |
| `search` | — | `{grid: {x, y, k, rx, ry}, must: [...], minimize: "desk"}` kadraj ızgara araması |
| `step` | 2 kare | örnekleme |

```json
{"type":"framing","boxes":"$__boxes","kinds":{"obj":{"pad":12},"lyric":{"pad":50,"minPx":160},"text":{"minPx":22},"cut":{"allOrNothing":true}},"desk":{"max":0.003},"step":2}
```

#### fc:toolPath (15) — aktör/alet yolu, hızı, K8 giriş/çıkış
Kural: KM-10, KM-11, KM-12. Kanca: `__tools(T)`, `__holds()`. World: `motion.toolMaxPx`, `motion.writeGlyphsPerSec`.

| parametre | varsayılan | anlamı |
|---|---|---|
| `tools` | `"$__tools"` | alet çokgenleri (z dahil) + uç noktası |
| `k8` | true | `{enterOutside, exitOutside}`: ilk/son görünür karede alet kadraj dışından |
| `single` | true | aynı anda tek görünür alet |
| `holds` | `"$__holds"` | tutuş aralıklarında alet görünmez |
| `maxPx` | `$world.motion.toolMaxPx` | görünürken uç ekran hızı px/kare (60 fps referansı) |
| `relative` | false | yüzeye göreli hız da raporla |
| `inkHead` | — | `{pad: 20, minShare}` yazan ucun kadrajda kalma payı |
| `report` | — | `first` · `last` · `peakAbs` · `peakRel` |

```json
{"type":"toolPath","tools":"$__tools","k8":true,"single":true,"holds":"$__holds","maxPx":"$world.motion.toolMaxPx"}
```

#### fc:overlap (16) — örtme 0 (geometri)
Kural: ÖRT-1, ÖRT-2, ÖNP, KM-11. Kanca: `__tools(T)`, `__boxes(T)`, `__glyphs(T)`.

| parametre | varsayılan | anlamı |
|---|---|---|
| `a`, `b` | — | `tool:<ad>.<parça>[u0,u1]` (gövde parçası, uçtan oran) · `glyphs:written` · `box:<ad>` · DOM seçici |
| `pad` | 0 px | kutu payı (negatif = iç pay) |
| `max` | 0 | kesişim (px² ya da kare sayısı) |
| `minGap` | — | en küçük açıklık px |
| `perPhase` | false | evre başına örten kare raporu |
| `mode` | `geom` | `geom` (segment–kutu kırpma, Liang–Barsky) · `dom` (`getBoundingClientRect`) · `hit` (`elementsFromPoint`; opaklık < 0,05 örtmez) |

```json
{"type":"overlap","a":"tool:pen.body[0.15,0.95]","b":"glyphs:written","pad":2,"max":0,"perPhase":true}
```

#### fc:camera (17) — basamak 0, ivme, K3, tepe
Kural: BAS-1, BAS-2, KM-4, KM-5, KM-6, K3. Kanca: `__camSpeed(fps, n)`. World: `camera.{maxPxPerFrame, stepJump, accel}`. Yöntem: M-STEP, M-K3.

| parametre | varsayılan | anlamı |
|---|---|---|
| `speed` | `"$__camSpeed"` | kare başı kamera ekran hızı |
| `stepJump` | `$world.camera.stepJump` (2,5 px/kare @60) | ani hız değişimi eşiği |
| `maxSteps` | 0 | basamak sayısı |
| `accel` | `$world.camera.accel` (`{max: 0,15, floor: 2}`) | ivme (qc#16 ile aynı) |
| `k3` | `{v: "W*0.02/fps", minShare: 0,4, shots: "$shots"}` | K3 shot payları |
| `peak` | `$world.camera.maxPxPerFrame` | hız tavanı |
| `p95` | — | rapor |
| `candidates` | — | `--cand` aday karşılaştırması (tepe, basamak, K3, kesik kutu) |

```json
{"type":"camera","stepJump":"$world.camera.stepJump","maxSteps":0,"k3":{"minShare":0.4,"shots":"$shots"}}
```

### Katman C — ses / tipografi

#### fc:sync (18) — çentik, ses kayması, transkript
Kural: ÇEN-1, ÇEN-2, SES-03, SES-04, SES-06, SES-09, SES-10, SES-11. Kanca: `__events()` (`events` modu). Ayrıntı [AUDIO.md](AUDIO.md).

| parametre | varsayılan | anlamı |
|---|---|---|
| `mode` | `events` | `events` (olay ↔ kelime) · `drift` (iki ses arası kayma) · `words` (kelime farkı) · `silence` (sessiz aralıklar) |
| `events` | `"$__events"` | `[{t, word, kind}]` fiziksel olay anları |
| `tolFrames` | 1 | olayın ilk görünür karesi − kelime başı ∈ [0, 1 kare] (kural kare tanımlıdır) |
| `ref` | — | karşılaştırılan ses / kelime dosyası |
| `win` | 1,5 s | `drift`: 10 ms RMS dB zarfı, kayan pencere NCC (± 1,5 s), PCM ± 12 ms inceltme |
| `sameTake` | 0,9 | PCM korelasyonu > 0,9 → aynı çekim |
| `tol` | 0,033 s | izinli kayma (\|Δ\| ≤ 33 ms → yeniden render yok) |
| `th` / `minSilence` | −50 dBFS / 0,03 s | `silence` |

`words`: LCS kelime hizalaması + Δt + kesme TC farkı; halüsinasyon adayı = süre < 50 ms ve güven < 0,6.

```json
{"type":"sync","mode":"events","events":"$__events","tolFrames":1}
```

#### fc:loudness (19) — master ses
Kural: MS-2, SN-7. Kanca: yok. Yöntem: M-LOUD.

| parametre | varsayılan | anlamı |
|---|---|---|
| `src` | `master` | ölçülen dosya |
| `I` | −16 LUFS | entegre hedef |
| `TP` | −1 dBTP | gerçek tepe sınırı |
| `tail` | — | `{from: s, maxDb}` sessiz kuyruk |

```json
{"type":"loudness","src":"master","I":-16,"TP":-1}
```

#### fc:glyph (20) — glif kapsamı
Kural: KD-17. Kanca: yok. World: `fonts`.

| parametre | varsayılan | anlamı |
|---|---|---|
| `mode` | `unicodeRange` | `unicodeRange` (qc#13) · `cmap` (font dosyasının cmap tablosu) · `render` (hedef + yedek ↔ yalnız yedek çizim karması; genişlik farkı < 0,05 → yedeğe düşmüş) |
| `chars` | sayfadan | denetlenecek karakterler |
| `metrics` | false | taban çizgisi, ascent/descent, derinlik → ölçek |
| `frames` | qc anları + anahtar kareler | — |

```json
{"type":"glyph","mode":"render","chars":"≥≤ΣİŞĞ"}
```

**Ekler (yeni tip değil):** `logo` = `logo check` sarmalayıcısı (M-LOGO) · `--sheet` = kanıt sayfası (kırpım/şerit/ızgara/yakın plan, etiket `f · t s · luma%`, en yakın komşu büyütme).

### §4.21 Bütün film bildirimi [ÖRNEK]

```json
"checks": [
  {"type":"temporal","at":"actBoundaries","window":0.2,"src":"master","maxRatio":1.5},
  {"type":"identical","ref":"master:v4","frames":[0,100,200,239],"mode":"rgb48","expect":"same"},
  {"type":"accentColor","src":"master","pairs":[[1200,5400]],"maxPairDeltaE":3},
  {"type":"loudness","src":"master","I":-16,"TP":-1}
]
```

---

## §5 Özel ölçüler

### M-K1 · kahraman maskesi (K1)
- **Anahtar kareler:** manifest `k1.keys` ‖ `keys` ‖ %25 / %50 / %75.
- **Maske türü world'de zorunlu** (`world.k1.mask`, core varsayılanı yok):
  - `dom` — `world.k1.selector` (ör. `[data-hero]`) öğelerinin ekran kutularının birleşimi, `dom` ızgarasında (192×108). İşaret mürekkep kutusuna konur (tek glifin satır kutusu kahramanı sulandırır). Pişmiş/donmuş içerikte işaret yalnız ölçüm modunda görünür kılınır.
  - `ink` — zeminden ayrışan koyu (ya da world'ün tanımladığı) piksel: 480×270, eşik [ÖRNEK] luma < 200 (açık zemin), 3× kapanış, leke ≥ 60 px. Maske kahramanın **bütünüdür** (çizim yığını tek nesne); en büyük bileşen yalnız bilgi. Zemin (kâğıt, panel) maskeye girmez.
  - `alpha` — kahraman katmanı ayrı probe'da yalnız `selector` görünür bırakılarak çizilir; alfa > 0,5 pikseller maske.
- **Ölçüt:** alan oranı ≥ `areaMin` **ya da** yükseklik oranı (maskenin dikey kapsamı / H) ≥ `heightMin`. Manifest `k1.*` world değerini yalnız yükseltir.
- **Display metin:** en büyük okunacak kahraman metin ≥ `k1.lyricMin` px (DOM, `fc:framing` `lyric`).
- **Çıktı:** qc JSON K1 satırı (kare başı alan, yükseklik, geçti/kaldı).

### M-K3 · sürekli kamera (K3)
- Kaynak: sahne kancası `__camSpeed(fps, n)` → kare başı kamera ekran hızı (dünya örnek noktalarının izdüşüm farkı büyüklüğü, px/kare). **Deterministiktir;** blok eşleme yavaş pan'ı sayamadığı için K3 kapısı pikselden değil kancadan ölçülür.
- **Mutlak eşik:** `TH = 0,02 · W / fps` px/kare (W = 1920 → 38,4 px/s; 60 fps'te 0,64 px/kare). Göreli eşik (tepenin %20'si) yavaş izlemeyi tutuş saydığı için **kullanılmaz**.
- Shot payı = (v ≥ TH kare sayısı) / shot kare sayısı; shotlar manifest `shots[]` (`f0`, `f1`) ya da `k3.shots`. Geçer: her shot pay ≥ 0,4 (hold ≤ 0,6) **ve** perde OURS hareketli ≥ 0,4.
- Hariç: sessiz kuyruk (kural), `profile: "typographic"`.
- Animatikte: kanca render fps'inden bağımsızdır; piksel tabanlı ölçümde yer değiştirme `÷ (scale · step)` ile tam çözünürlük ve tek kare aralığına çevrilir.
- Sınırdaki shot (pay ≈ 0,4): varışı ~0,1 s geciktirmek çoğu kez yeter (tasarım zamanında `--cand` ile sınanır).

### M-OURS · referansa karşı profil
- `motion-render ours <id> [--step N] [--no-cam] [--dir D]`.
- Piksel profili: `fast` yolu (480×270 gri), blok 16 px, arama ± 6 px, 2'şer örnek; dokusuz blok (varyans < 40) atlanır; kare hareketi = blok yer değiştirmelerinin medyanı; "hareketli" bilgisi th = max(0,5, 0,2 · tepe) px (yalnız bilgi).
- Ölçüler: shot uzunluğu, hareket yoğunluğu, kontrast dağılımı, hold oranı, ortalama luma.
- `--step N` yalnız **örnekler** (60 fps'te 2 = 30 fps örnekleme); kareleri bölmez. (Kaynakta adım bütün kareleri bölüyordu: 0,753 ↔ doğrusu 0,614.)
- `--no-cam`: kancasız birleşik film dizini.
- Taban: hareketli ≥ 0,4, hold ≤ 0,6. Referans profili projede [ÖRNEK: shot 1,67 s · hold 0,38 · hareketli 0,62 · luma %37,5].

### M-STEP · kamera basamağı (BAS-1)
- `v_i` = `__camSpeed`; `Δv_i = |v_i − v_{i−1}|`; basamak: `Δv_i > stepJump · 60/fps` (60 fps referansında 2,5 px/kare ≡ 150 px/s ani hız değişimi). Sayım = 0 olmalı.
- Tasarım zamanında `fc:camera --cand` ile aday eğriler: tepe, p95, basamak sayısı, K3 payı, kesik kutu sayısı tek tabloda.
- Bilinen neden: monoton kübik eğride ara anahtarda yön değişimi hızı sıfırlar → bileşen bazında monoton eğri.

### M-SX · kenar genişliği ve S× (SS-2)
- **Kanal:** yeşil (G) — luma karışımından daha az renk kenarı gürültüsü.
- **Kontrast:** bölgede C = p97 − p3.
- **Kenar seçimi:** satır ve sütun profillerinde \|d\| ≥ 0,12 · C olan geçişler; temiz kenar = iki yandaki düzlükler arası hi − lo ≥ 0,7 · C.
- **Genişlik:** geçişin %10 → %90 arası mesafesi, alt piksel doğrusal ara değerleme; bölgedeki **medyan**.
- **Laplace:** Laplace varyansı / C² (kontrastla normalize).
- **Hedef:** kenar ≤ `supersample.edgeMaxPx` ([ÖRNEK] 1,9 px); aynı karttaki kahramanlar birbirinin ± %10'u.
- **Neden:** 3B perspektif büyütmesi düzlemi yerel CSS px'te çizip k kat büyütür → kenar ≈ 1,65 px × k; DPR, `will-change`, `translateZ` düzeltmez. k ≥ `sxK` ([ÖRNEK] 1,5) karede kahraman kendi 3B katılımcısında S× + `scale(1/S)` (S = 2: 3,2 → 1,73 px). S öğe türüne göre ölçülerek seçilir.

### M-2X · 2× süper örnekleme planı (SS-1)
- `__camK(fps, n)` → kare başı kamera ölçeği k. `ss = k < supersample.k2x`; aralıklar ± `pad` genişletilir; sınır ağırlığı W2 = smoothstep(± `blend` kutu ortalaması).
- W2 > 0 aralıkları `--scale 2` (etiket `ss2`), W2 < 1 aralıkları 1× (etiket `ss1`); birleştirme: 2× → 2×2 kutu ortalaması sRGB'de `(a+b+c+d+2) >> 2`; 0 < w < 1 → `round(A·w + B·(1−w))`; 1× → kopya. Birleştirme sonrası `expo-post` kaydı sıfırlanır (kareler ham).
- `pad`/`blend` world'de kare olarak yazılır (60 fps referansı; [ÖRNEK] 6 = 0,1 s).
- Doğrulama: sınır karelerinde `fc:temporal` `metric: "edgeEnergy"` (2×/1× sınırında karışımsız +%37 sıçrama görülmüştü).

### M-SEAM · devir/dikiş metriği (DV-1, DV-2)
- Üç ardışık fark (ham PNG, ortalama ve maks kanal farkı /255): `d_önce` = (son−1 → son) · `d_dikiş` = (son → sonraki ilk) · `d_sonra` = (ilk → ilk+1).
- Geçer: `d_dikiş ≤ max(neighborK · max(d_önce, d_sonra), staticMax/255)`.
- Durağan devir (komşular ≈ 0): `d_dikiş ≤ 2/255`. Hareketli devir: `≤ 1,1 ×` büyük komşu.
- Bütün film teslim belgesine perde dikiş tablosu (/255) yazılır.

### M-SEAM12 · son/ilk pencere sıçrama oranı (DV-3)
- Kaynak: grade'li mp4 (ya da master) Y düzlemi, 960×540 `area`; d_i = ortalama \|ΔY\| / 255.
- Oran: `r_i = d_i / max(d_{i−1}, d_{i+1}, 0,02)`; her perde sınırının ± 0,2 s penceresinde, film başında ve sonunda. Geçer: tüm r_i ≤ 1,5.
- Bulgu varsa önce perde sonu kapanışı (fade/filtre) ve uç uca encode aranır (master tek sürekli encode olmalı).

### M-DE · ΔE2000 (AK-5)
1. Kaynak: **teslim edilen** grade'li mp4/master'dan kare (PNG değil — grade ve süzgeç rengi değiştirir).
2. İç pikseller: sınıf pikseli ve 3×3 komşuluğunun tamamı sınıfta (kenar karışımı düşülür).
3. Kanal medyanı → sRGB (gamma çöz) → doğrusal → XYZ (D65) → CIELAB → CIEDE2000 (kL = kC = kH = 1).
4. Hedefe karşı (`target`) ve/veya çift karşılaştırma (`pairs`). Eşik: ≤ 3 marka/logo (sahne ile sahne arası), ≤ 5 çizgi aksanı.
- Ders: ışık farklı düştüğü için marka rengi teslim dosyasından ölçülür ve kaynak ona uydurulur; aksan çizgisi bir süzgeçten geçince ΔE 5–6'ya çıkmıştı.

### M-LOUD · loudness (MS-2)
- Ölçüm: `ffmpeg loudnorm=I=-16:TP=-1:LRA=11:print_format=json` (yalnız ölçüm) → `input_i`, `input_tp`.
- Kazanç = −16 − `input_i` (doğrusal `volume`); tahmini tepe = `input_tp` + kazanç > −1 dBTP → **DUR** (sınırlayıcı kullanıcı kararı).
- Uygulama sonrası doğrulama: `ebur128=peak=true`; kuyruk dahil.
- Ön işlem: 48 kHz, (mono kaynakta) çift mono stereo, `apad` ile video süresine.

### M-FADE · fade dedektörü (GÇ-1)
- `qc` yolu (960×540). Ardışık kare çiftinde: değişen piksel (\|Δ\| > 4) ≥ 40 ve kenar gradyanı ≥ 6 olan bölge.
- Yalnız ton/opaklık değişimi ölçütü: gradyan yönleri aynı (cos > 0,96), genlik oranı sabit (cv < 0,15), oran ≠ 1 (\|μ − 1\| > 0,03), örnek ≥ 12.
- Olay: ≥ 0,067 s süren ardışık kareler **ve** toplam kontrast değişimi \|ln P\| ≥ ln 1,25; beliriş/kayboluş payı > 0,6 olay süresini uzatır; `exitF` sonrası serbest.
- **Sınır:** 2–3 karelik, küçük ya da hareketle çakışan fade kaçabilir → birincil denetim koddaki opaklık girdileri envanteridir (GÇ-3). Işıkla açılışta şiddet + havuz birlikte büyürse dedektör fade sayar (GÇ-6).

### M-KONT · kontrast (KD-4, KD-5, KD-12)
- **Kahraman − çevre:** kahraman maskesi (parlak bölge ya da `data-hero`) ortalama luma ↔ kutunun 120 px @1080 genişletilmiş halkası; \|fark\| ≥ 25/255.
- **Metin (WCAG):** ölçüm kutusu metnin **satır kutusu** (DOM Range; öğe kutusu değil, kutu ≥ 4 px). Zemin = kutudaki piksellerin medyanı. Mürekkep = medyandan %1 / %99 uçlarına giden yolun yarısını aşan piksellerin %90 dilimi (glif çekirdeği). Yön (açık/koyu metin) **DOM renginden** alınır (medyan sezgisi karışık zeminde ters döner). Oran = (L1 + 0,05)/(L2 + 0,05), göreli parlaklık doğrusal sRGB'den.
- **Görünürlük/örtülme:** 5×3 noktada `elementsFromPoint`; noktaların yarısından çoğunda üstte opak öğe ya da başka metin varsa ölçülmez; kümülatif opaklık ≥ 0,15 görünür; örtücü opaklığı ≥ 0,85 (rgba dolgulu, alfa < 0,85 SVG örtmez); saydam kap ve parlama katmanı örtmez.
- **Tam render öncesi** probe karelerinde (§3 son paragraf); karar tam çözünürlükte.

### M-ARC · ışık arkı (IŞ-5, IŞ-6)
- Kare başı anahtar ışık ekran konumu / yarıçapı / şiddeti sahneden okunur (`probe --eval`, ör. `__probeInfo()`); film geneli ortalama parlaklık arkı `qc film`'de çizilir.
- **Kırık** = görünür ışıkta (görünürlük a × pozlama ≥ 0,04) ivme sıçraması > 22 500 px/s² (kaynak tanımı 25 px/kare² @30) ve yarıçap r > 40, **ya da** şiddet basamağı > 0,03 (kare arası). Hızlı ama kesintisiz süzülme kırık değildir.

### M-STALE · bayatlık (RH-5, RH-6)
- Sıra: yedek → aralığı sil → yeniden üret → **tanık kareler** (`fc:identical`: aralık dışı `same`, aralık içi `diff`) → kopya (`.part` → rename).
- Bayat: probe ↔ kayıtlı kare ortalama mutlak farkı > 0,01 (/255 ölçeğinde). Tek kare probe pişirme zamanlaması nadiren ≈ 0,09/255 gürültü verir → probe tekrarlanır ya da 2 karelik dizi kullanılır.
- Değişikliğin girdiği bütün T aralığı formülden hesaplanır; donmuş dünyada bir öğe değişince görünür olduğu bütün aralıklar kamera izdüşümüyle bulunur.

### M-BENCH · render süresi
- `motion-render probe <id> --frame N --bench 10` → sonraki 10 karenin s/kare süresi.
- Kare bütçesi = kare sayısı × ölçülen s/kare; > 20 dk → aralıklara bölünür (RH-3). Hedef s/kare projededir; ölçüm raporda.

### M-LOGO · marka varlığı vektör kabulü (ML-2)
- Önce dosya taraması: "SVG" uzantılı dosyada `<image>`, base64, gömülü raster, metin, süzgeç → raster kap ise **DUR-8**.
- Sonra (2× ölçek): IoU ≥ 0,98 · kenar sapması p90 ≤ 0,8 px · kenar dalgası p99 ≤ 0,3 px (eğrilik yarıçapı < 25 px köşe sayılmaz) · ≤ 40 düğüm/harf · delik sayısı birebir.
- Bağımsız denetçi (motion-measure) kendi yöntemiyle ölçmeden render yok.

### M-CONTACT · kontak sayfası
- Her 0,4 s (24 kare @60), 8 sütun, hücre 240×135, üst/alt 16 px etiket. Üst: `f · t s`; alt: `Ø luma % · dolu %` (dolu = 100 − boş siyah payı; dolu < %30 turuncu). Ölçüm yolu qc ile aynı.
- Önce kontak (tempo, ölü kare, ışık arkı, kamera okunması), sonra anahtar kareler tam çözünürlükte; kontak etiket şeridi yanıltabilir.

### M-LIVE · canlı profil (PR-3)
- `motion-render live <sayfa> [--qc]`: sayfa gerçek zamanlı oynatılır ve ölçülür.
- **Kare hızı:** ölçüm penceresindeki ortalama ≥ 60 fps.
- **Gecikme:** girdi olayından ilk değişen kareye kadar geçen süre ≤ 100 ms.
- **Düşen kare:** kare aralığı > 1,5 × (1/60 s) olan aralık sayısı = 0.
- `--qc`: kaydedilen oynatma üzerinde qc kontrolleri (son kare/fade/kontrast/bant).

### M-REV · bağımsız ölçüm (RV-3)
- motion-measure ve motion-reviewer yapanın sayılarını **referans almaz**; aynı kuralı kendi yöntemiyle (farklı ölçüm yolu, farklı rasterleyici/ölçek, farklı kare kümesi ya da kendi küçük betiği) ölçer ve farkı raporlar. Ölçüm ağırlıklı kapıda istem açıkça "yapanın `out/probe/` sayılarını okuma; kendi betiğini yaz" der.
- Yazım yalnız kendi çıktı klasörüne (reviewer: `out/review/<kapı>/`; measure: ajan tanımındaki ölçüm klasörü); proje/sahne dosyasına dokunulmaz.
- Sonuç biçimi: sayı + yeniden üretilebilir yöntem + kırpım + ölçüt karşılaştırması (`geçti` / `kaldı` / `ölçülemedi`).
- Önce kendi aracının öz-hatasını sınar (M-SELF): aynı içerikte ≈ 0,995 / fark ≈ 0.
- Ölçüm ağırlıklı kapılar (marka varlığı, K1, S× kenar, ses kayması) bağımsız ölçüm olmadan geçmez.

---

## §6 M-GRADE · grade zincirleri world verisidir

Core'da grade değeri yoktur; `world.json` → `grade: {chain: "dark" | "light" | "none", params: {...}}`. Koyu zinciri aydınlık dünyaya uygulamak kanvası kirletir — zincir bu yüzden world'e aittir.

**Zincir yapısı (sıra bağlayıcı):**

| adım | `dark` | `light` | `none` |
|---|---|---|---|
| 1 eğri | hafif S `curves` | yumuşak `curves`, beyaz < 1 | — |
| 2 renk dengesi | `colorbalance` (yalnız `keep` karelerinde) | `colorbalance` (hafif) | — |
| 3 vinyet | `vignette` — **siyah noktasından ÖNCE** (yoksa köşe tabanı siyah noktasının altına iner) | zayıf `vignette` (world vinyetsizse yok) | — |
| 4 siyah noktası | `colorlevels` (yalnız `keep` karelerinde) | yok (`grade.blackPoint` varyantı hariç) | — |
| 5 çıkış | `scale=out_color_matrix=bt709:out_range=tv` + libx264 CRF 14 `yuv420p` + bt709 primaries/trc/colorspace etiketleri + `+faststart` | aynı | aynı |

- **Saf pencere:** `keep = n ≥ head ve n < frames − pure`; `pure` = son 0,2 s (`slice` 0), `head` = `blackStart` ise kare 0. Renk dengesi ve siyah noktası saf karelerde kapalı; eğri/vinyet her karede.
- **`grade.fadeOut [n0, n1]`:** tam zincir ↔ saf zincir karışımı `A·(1−K) + B·K`, `K = clip((n − n0)/(n1 − n0), 0, 1)` — inişli sonda tek kare basamağını önler (animatikte n0/n1 ölçeklenir).
- **Animatik** aynı zincirle (BT.709 matrisi uygulanarak; kaynakta animatik encode'u 709 etiketli ama matrissizdi — düzeltildi).
- **Doğrulama:** son kare max 0 (`cut:"light"` hariç) · koyu zincirde grade'li min ≈ siyah noktası · süre ve kare sayısı · `qc film` sahne ile sahne arası ortalama/siyah noktası tutarlılığı · aydınlık zincirde kanvas grade sonrası ± 3.
- **`expo-post`** (zincirden önce): sahne içi küçük pozlama değişimi ve siyaha iniş kayan noktada; inişte TPDF dither, sahne içi düşüşte duruk dikdörtgen ± 0,5 LSB; 8-bit'e yuvarlama.

`world.json` örneği [ÖRNEK — parametre biçimi araçla doğrulanır]:

```json
"grade": { "chain": "dark", "params": {
  "curves": "0/0 0.25/0.24 0.5/0.505 0.75/0.745 1/1",
  "colorbalance": "bs=0.02:bh=-0.02",
  "vignette": 0.6,
  "blackPoint": [10, 9, 8],
  "crf": 14 } }
```

Örnek world'lerin gerçek zincir değerleri `skills/motion-world/examples/<ad>/world.json`'dadır; kopyalanmaz, ölçülür (YR-2).

---

## §7 M-SELF · ölçüm aracının kendi hatası

Kaynak projede ölçüm araçları birden çok kez yanlış sonuç verdi. Her yeni ölçüm betiği ve her bağımsız ölçüm önce bu denetimden geçer:

| hata | belirti | önlem |
|---|---|---|
| boyut yuvarlaması | ~%0,07 sistematik fark | aynı içerik karşılaştırması |
| ½ px pencere kayması | kenar/keskinlik farkı sahte | pencere hizası sabit, alt piksel |
| iki tarafta farklı kaplama işlevi | IoU/oran düşük | iki tarafa aynı işlev |
| örnekleme adımı yanlış uygulandı | OURS 0,753 ↔ doğrusu 0,614 | adım örnekler, bölmez |
| göreli eşik | yavaş izleme tutuş sayıldı | mutlak eşik (K3) |
| ikili maske | izlemede basamak | sürekli kaplama maskesi |
| seyrek örneklerin düz ortalaması | bant yanıltıcı | zaman ağırlıklı (trapez) |
| animatikte kontrast | sahte 1,05:1 | kontrast tam çözünürlükte |
| kontak etiket şeridi | yanlış karar | anahtar kare tam çözünürlükte |
| tek kare probe pişirme gürültüsü | ≈ 0,09/255 sahte bayat | probe tekrarı / 2 kare dizi |
| `will-change` önbelleği | ölçüm yavaş/farklı | ölçüm modunda kapalı |
| öğe kutusu ile kontrast | glif kutunun %6'sı | satır kutusu (Range) |
| saydam kabı örtücü sayma | "okunmaz" yanlış alarm | yalnız opak öğe örter |

**Kabul testi:** aynı içerik (aynı kare ya da kendisiyle) ölçüldüğünde benzerlik ≈ 0,995+ (IoU, oran) ve fark ≈ 0 çıkmalı. Çıkmıyorsa önce araç düzeltilir; sonuç raporda "ölçüm aracı düzeltildi" notuyla verilir.

---

## §8 world.json ölçüm alanları [ÖRNEK]

Bir world'ün ölçülebilir olması için gereken alanlar (CONTRACT §3). Değerler örnektir; her world kendi look-dev'inde ölçüp yazar.

```json
{
  "band": [18, 32],
  "k1": { "mask": "dom", "selector": "[data-hero]", "areaMin": 0.30, "heightMin": 0.50 },
  "accent": { "color": "#…", "class": "signal", "quotaDefault": 1 },
  "classes": {
    "signal":      { "rMin": 190, "gMax": 60, "bMax": 75, "rgMin": 150 },
    "accentInner": { "rMin": 140, "rgMin": 100, "rbMin": 90, "inner": 3 },
    "darkNeutral": { "lMax": 90, "rgAbsMax": 30 },
    "emptyBlack":  { "lMax": 15.3 },
    "visible":     { "lMin": 77 }
  },
  "edgeDark": { "maxFalloff": 0.20 },
  "grade": { "chain": "dark", "params": {} },
  "camera": { "maxPxPerFrame": 30, "stepJump": 2.5, "accel": { "max": 0.15, "floor": 2 } },
  "motion": { "toolMaxPx": 57, "writeGlyphsPerSec": 12, "settlePx": 2 },
  "supersample": { "k2x": 0.5, "pad": 6, "blend": 6, "sxK": 1.5, "edgeMaxPx": 1.9 }
}
```

Zorunlu (varsayılanı yok): `band`, `k1.mask` (+ `selector`), `accent.color` + `accent.class` (+ `classes` içinde tanımı). Eksikse `manifest validate` hata verir; ilgili qc/fc kontrolü "ölçülemedi" der ve değer uydurulmaz. Ölçülemeyen SERT kural geçmiş sayılmaz: kapı açılmaz, önce world tamamlanır (look-dev, PLAYBOOK §4.3).
