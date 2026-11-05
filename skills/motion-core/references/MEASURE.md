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
8. **Eşik kararla değişir, araç içerikle değil (1.4).** Ölçüm eşiği (`checks` alanı, araç varsayılanı, world ölçü alanı) yalnız proje sahibi kararıyla değişir; aşım ölçümle açık karar olur. Araç bir içeriği ölçemiyor ya da yanlış sınıflıyorsa araç düzeltilir (proje ayarı ya da paket notu); içerik araca göre kırpılmaz, ertelenmez (RULES ÇK-17, ÇK-18). Aynı ölçüde kaynaklar ayrışırsa yöntem tekleşir: aynı kare aralığı, aynı özellik noktası, kapıda tek sayı (M-C).

---

## §1 Birimler, ölçüm yolları, ızgaralar

### §1.1 Birimler

| büyüklük | tanım |
|---|---|
| süre | saniye; kare = `round(s · fps)`, fps yalnız `scenes.json` `fps` |
| kare dizini | manifest fps'inde mutlak kare numarası (0 tabanlı); `range` aralıklarında **mutlak** numara |
| px | 1080p ekran pikseli; başka yükseklikte `× H/1080` |
| px/kare (world) | `camera.maxPxPerFrame`, `camera.stepJump`, `camera.accel.floor`, `motion.toolMaxPx` örneklerde **60 fps · 1080p**'de ölçülmüştür; araç **ölçeklemez** (değer proje fps'inde px/kare uygulanır) — 60 fps dışındaki projede world'e o fps'te ölçülen değer yazılır (px/s karşılığı RULES §21) |
| luma % | Rec.709 Y′ = 0,2126 R + 0,7152 G + 0,0722 B, **8-bit gamma uzayında**, /255 · 100 (doğrusal ışık değil) |
| fark | /255 (kanal ya da Y′ farkı) |
| renk farkı | ΔE2000 (CIEDE2000, kL = kC = kH = 1), D65 |
| ses | LUFS (entegre), dBTP (gerçek tepe), dBFS |

### §1.2 Ölçüm yolları (M-YOL)

| ad | çözünürlük ve ön işlem | kullanım |
|---|---|---|
| `qc` | Gauss bulanıklığı σ 0,8 → 960×540 kübik → luma; piksel sayımları 480×270 eşdeğerine (/4) çevrilir | qc'nin bütün piksel kontrolleri; `fc:luma` (qc ile birebir aynı sonuç gerekiyorsa) |
| `fast` | 480×270 (gri ya da RGB) | ardışık fark (MAD), sıçrama, OURS blok eşleme, `fc:motion` |
| `half` | 960×540 kübik (bulanıklık yok) | `fc:temporal` `globalExposure`, `fc:motion` `track` |
| `nearest` | 960×540 en yakın komşu | `fc:accentLocation` (sınıf pikseli karışmasın) |
| `edge` | 960×540 (varsayılan çekirdek) | `fc:edgeDark` `band`, `fc:temporal` `edgeEnergy` |
| `full` | 1920×1080 | ΔE, kenar genişliği, çizgi profili, keskinlik, örtme pikseli |
| `dom` | 192×108 ızgara (10 px hücre) | `[data-hero]` birleşik alanı (K1 `dom`, kadraj `hero:"dom"`) |
| `mp4-Y` | grade'li mp4'ün Y düzlemi, `scale=…:flags=area` (960×540; `meanY` 480×270) | dikiş, son kareler, iniş, encode basamağı (encode sonrası gerçek) |
| izdüşüm | render yok; frame-check sayfayı açar, kancaları kare kare çağırır (`step`, varsayılan 1 kare); sahne kancaları ekran px döndürür | Katman B tipleri (`framing`, `toolPath`, `overlap`, `camera`) |

Kadraj parlak bölgesi: luma > %30 (77/255), 480×270, 3×3 kapanış, 8-komşu bağlı bileşen. Boş siyah pikseli: luma < %6 (15,3/255). Kahraman çevre halkası: kutu + 120 px @1080 (= 30 px @480).

---

## §2 Komut → çıktı haritası

✓ = adı CONTRACT'ta sabit. Diğer yollar aracın varsayılanıdır; `motion-render <komut> --help` ile doğrulanır.

| komut | ürettiği | içerik |
|---|---|---|
| `render <id…>` | `out/frames/<id>[_<tag>]/NNNNN.png` ✓ · `out/logs/<id>.log` (canlı) · `out/logs/<id>.json` (bitiş işareti) | kare süreleri, atlanan kareler (watchdog), yöntem; `--resume` > 0 baytlı kareyi atlar; yazım `.part` → rename |
| `probe <id> --frame N [--frames a,b] [--eval JS] [--bench N]` | PNG (`--out`, varsayılan `out/probe/<id>-f<N>.png`; `--frames` ekleri `<out>-fNNNN.png`) · stdout `eval → <JSON>` · `out/logs/<id>.probe.log` | tek kare, sayfada değerlendirme, kare süresi ölçümü; sahnenin render log'una dokunmaz |
| `qc <id> [--mp4 auto] [--frames-dir D]` | `out/probe/<id>-qc.json` ✓ | 16 kontrol (§3); kare başı `luma`, `bright`, aksan dizileri; HATA → çıkış 3 |
| `qc film [--probe D] [--ids …]` · `qc film --rehearsal` · `qc film --cuts <id> [--at f,…]` | `out/probe/_film-qc.json` + `_film-grade-sheet.png` · `out/probe/grade-rehearsal/` · `out/probe/<id>-cuts.png` + `<id>-whole.json` | sahne başına 3 grade'li kare; ortalama, siyah/beyaz noktası (%0,5/%99,5 persentil), bölüm ışık arkı, aksan px · grade provası · kesme ±0,5 s şeritleri (fark > 6/255 sıçrama adayı; aksan aralıkları, `redAllowed`/`redQuota` → çıkış 3) |
| `frame-check <id> [--only …] [--cand c.json] [--sheet]` | `out/probe/<id>-fc.json` ✓ (+ `--sheet` → `out/probe/fc/<id>-<ad>.png`) · (1.4) `--only` koşusu `--out` yoksa `out/probe/<id>-fc-only-<t1+t2>.json` (tam kaydın üstüne yazmaz) | bildirilen tipler (§4); error → çıkış 3 |
| `plan-check <events.json> [--rules r.json] [--fps N [--round ceil\|round\|floor]] [--out yol.json]` | (1.4) `--out` yoksa `out/probe/plan-check-<olay dosyası adı>.{json,md}` | olay planı (render yok): kusur çıkış 3, kota UYARI; world `plan` blokları (`entry` · `beats` · `leads` · `moves`) yalnız tanımlıysa; `--fps` M-IZGARA |
| `ours <id> [--step N] [--no-cam] [--dir D]` | `out/probe/<id>-ours.json` | M-OURS, M-K3 |
| `k1 <id> [--frames …]` · `k1 contrast <id> <etiket> f1,f2,…` | `out/probe/<id>-k1.json` · `out/probe/pc-<id>/<etiket>-f<N>.png` | M-K1 · render öncesi kontrast probe'u (M-KONT) |
| `k6 <id> [--at …]` | `out/probe/<id>-k6.json` | K6 bileşen sayımı (`[data-c]` + `[data-fx]`) |
| `contact <id>` · `contact seq` · `contact storyboard` · `contact clips` | `out/probe/<id>-contact.png` · `out/probe/<id>[-<T>]-<ad>.png` · `out/boards/` · `out/probe/clips/CLIPS.png` | M-CONTACT |
| `imgdiff a b [out]` · `imgdiff stale <id>` | stdout fark + fark haritası PNG · `out/probe/<id>-staleness.json` (bayat → çıkış 3) | M-STALE |
| `ss2 <id> --plan` | 2×/1× aralık planı | M-2X |
| `expo-post <id> [--dry]` | işlenmiş kareler + `out/logs/<dizin>-expo-post.json` | aynı kare ikinci kez işlenmez (çıkış 3) |
| `grade <id…> [--animatic]` | `out/scenes/<id>.mp4` (kilitliyse `<id>.<ms>.mp4`) | M-GRADE |
| `master --tag vN` | `out/master/<film>_<tag>.mov` (ProRes) + `.mp4` (H.264) + `<film>_<tag>-loudness.json` | M-LOUD; tek sürekli encode |
| `arsiv --tag vN [--link-from vM]` | `out/archive/<film>_<tag>/` FFV1 MKV + `ARSIV.json` | framemd5 özeti, `bitExact` |
| `live [<sayfa>] --qc` · `live --capture det` | `out/probe/live-qc.json` + `live-qc.md` · `out/live/capture.mp4` | M-LIVE |
| `logo check` | kabul ölçüleri tablosu | M-LOGO |
| `report` | `out/RENDER_REPORT.md` | — |
| `smoke [--keep]` | kurulum denetimi | geçici proje → 12 kare 960×540 → qc → contact |

Çıkış kodları: 0 tamam · 1 hata · 2 kullanım · 3 QC/kontrol `error` · 4 bekçi duraksama · 5 kare atlandı · 6 disk < 40 GB (`wait`: üst sınır doldu) · 7 `wait`: harness çöktü.

---

## §3 qc — 16 kontrol (`motion-render qc <id>`)

Ön işlem: `qc` ölçüm yolu (§1.2). Pencereler: `openF` = `blackStart` ise 0,5 s, değilse 0; `exitF` = `layer.exit` (s) ise ondan, yoksa son 0,4 s (12·KF kare). `review.<tür>: [[a, b, "gerekçe"]]` ilgili bulguyu "incelendi" UYARI'ya çevirir; `exceptions`, `contentRed` kayıtlı istisna/muafiyettir. Herhangi bir HATA → çıkış 3.

| kod | kontrol | yöntem | eşik | manifest / world alanı | seviye | kural |
|---|---|---|---|---|---|---|
| M-QC1 | kare sayısı | `NNNNN.png` sayısı = `frames` (= round(süre · fps)); sayfa `OM_SCENES` süresi ↔ Stage süresi farkı > 1 ms uyarı | eşit | `frames`, `fps` | HATA | MT-3 |
| M-QC2 | son kare | ham son kare max; `--mp4` ile mp4'ün N−1. karesi max. Muafiyet yalnız `slice: true`; `cut:"light"` kaydını qc okumaz (ışıkla kesmenin sızıntı ölçüsü `fc:ramp`/`fc:temporal` bildirimiyle yapılır) | ham ≤ 2 · mp4 0 | `slice` (muaf) | HATA | SN-1, SN-2, GÇ-7 |
| M-QC3 | karanlık | kare ortalama luma < %8 **ve** parlak (> %30) piksel payı < 0,0005; kesintisiz süre `[openF, exitF)` içinde. Ayrıca `world.burst` tanımlıysa ya da `grade.chain:"light"` ise **patlama**: luma > `burst.luma` (250) piksel payı > `burst.max` (0,35) | > 0,5 s → HATA · patlama HATA | `blackStart`, `layer.exit`, `review.dark`, `world.burst` | HATA (karanlık incelendi → UYARI) | KD-8 |
| M-QC4 | kadraj | anahtar karelerde (`keys` ‖ %25/%50/%75) en büyük bağlı parlak bölge (§1.2): alan oranı, yükseklik oranı. `hero:"dom"` → `[data-hero]` birleşik alanı (`dom` yolu), eşik `heroMin`. `profile:"typographic"` → en büyük görünür okunacak display metin px | alan ≥ 0,30 **ya da** yükseklik ≥ 0,50 · tipografik ≥ `typeMin` (72 px) | `keys`, `hero`, `heroMin`, `profile`, `typeMin`, `review.kadraj` | UYARI | KD-1, KD-3, KD-7 |
| M-QC5 | K1 | world maskesi (M-K1) anahtar karelerde | alan ≥ `areaMin` **ya da** yükseklik ≥ `heightMin` (world'de yoksa 0,35 / 0,55) | `world.k1.*` (`mask` zorunlu); sahne `k1.{hero\|mask, areaMin, heightMin, keys}` world'ün üstüne yazar (kural: yalnız yükseltir; araç denetlemez) | HATA (`review.kadraj` → UYARI) | K1 |
| M-QC6 | kahraman kontrastı | \|kahraman maskesi ort. luma − çevre halkası ort.\| (halka = kutu + 120 px @1080) | ≥ 25/255 | `review.kontrast` | UYARI | KD-4 |
| M-QC7 | parlaklık bandı | `[openF, exitF)` içindeki **bütün karelerin** ortalama luma'sının ortalaması (her kare eşit süre); hücre başı (her 0,4 s) bant dışı sayımı | `world.band` (**zorunlu**) · tipografik: sahne `band` ‖ `world.profileBands.typographic` ‖ [6, 14] | `world.band`, `world.profileBands`, `band`, `profile` (`bandWhy` gerekçe kaydıdır, araç okumaz) | UYARI | KD-6, KD-7 |
| M-QC8 | boş siyah | luma < %6 piksel payı | hücre (0,4 s) > 0,70 → UYARI · kesintisiz > 0,70 > 1 s → HATA | `blackStart`, `layer.exit`, `review` | HATA / UYARI | KD-9 |
| M-QC9 | derinlik | %25/%50/%75 karelerinde merkez (\|x\|, \|y\| < 0,45) / kenar (> 0,8) luma oranı ve Laplace enerji oranı | ikisi de < 1,05 → UYARI (düz kare) | — | UYARI | Z1, UCUZ-3 |
| M-QC10 | aksan (kota) | sınıf `world.accent.class` → `world.classes`; kare "açık" = sınıf pikseli ≥ 25 px (480 eşd.); iki açık küme arası boşluk < 0,067 s **ve** kutular 8 px payla örtüşüyorsa köprü (tek aralık); aralık süresi ≥ 0,067 s; sahne `__redExclude(fps,n)` kutuları hariç | aralık sayısı ≤ `redQuota` (sahnede `redQuota` yoksa kota denetlenmez) | `redQuota`, `accent`, `redExclude` (doluysa kanca çağrılır), `contentRed` (`world.accent.quotaDefault`'u qc okumaz) | HATA (`contentRed` → UYARI) | AK-3 |
| M-QC11 | bordo (kısıtlı sınıf) | `bordo` sınıfı (`world.classes.bordo` ‖ yerleşik) ≥ 60 px (480 eşd.) iki ardışık karede; aksan pikseli ≥ 25 olan karede sayılmaz; `f < exitF` | sahne `bordo: true` değilse 0 kare (`exceptions.bordo` aralıkları hariç) | `world.classes.bordo`, `bordo`, `exceptions.bordo`, `contentRed` | HATA (istisna / `contentRed` → UYARI) | AK-9 |
| M-QC12 | fade | M-FADE dedektörü | olay ≥ 0,067 s **ve** toplam kontrast ≥ %25, `exitF` öncesi → HATA | `layer.exit`, `review.fade` | HATA (incelendi → UYARI) | GÇ-1, GÇ-2 |
| M-QC13 | glif | sayfada 0,2 / 0,45 / 0,7 / 0,92 · (N−1)/fps anları + anahtar karelerde görünür ASCII dışı karakterler × (aile, ağırlık) yüklü yüzlerin `unicode-range`'i | eksik 0; sayfa ölçülemezse UYARI | `keys` (`--no-glyph` atlar) | HATA | KD-17 |
| M-QC14 | metin kontrastı | M-KONT metin yöntemi (WCAG) anahtar karelerde | ≥ 4,5:1 | `keys`, `review.kontrast` | UYARI | KD-5 |
| M-QC15 | metin boyu | görünür metin düğümünün ekran px'i (font-size × ekran kutusu / yerel kutu); tek karakter yalnız ≥ 72 px ise ölçülür; `[data-doku]` hariç | ≥ 22 px | `keys`, `review.metin` | UYARI | KD-2, KD-3 |
| M-QC16 | kamera ivmesi | `__camSpeed(fps, n)`; \|v[i] − v[i−w]\| / max(v[i], v[i−w]) ; w = round(fps/30); iki değer de tabanın altındaysa ölçülmez | ≤ `accel.max` (0,15) · taban `accel.floor` 2 px/kare (proje fps'inde; ölçeklenmez) | sahne `camAccel` ‖ `world.camera.accel` (`--no-cam` atlar) | UYARI | KM-5 |

**qc dışı ama zorunlu denetimler** (probe/yönetmen geçişi): konsol temiz (`PAGEERROR` yok), süzgeç bölgesi kırpması (ince öğe), kadraj dışı kritik öğe, parlak bant/artefakt tam çözünürlükte.

**Kontrast probe'u (tam render öncesi, KD-12):** `motion-render k1 contrast <id> <etiket> f1,f2,… [metin1,metin2]` anahtar kareleri probe'la çizer ve qc'nin yöntemiyle ölçer (ortalama luma, boş siyah, kahraman − çevre, metin WCAG, metin px) → `out/probe/pc-<id>/`; K1 için `motion-render k1 <id> --frames …`. (`probe --frames` çıktısı `<out>-fNNNN.png` adlıdır, `qc --frames-dir`'in beklediği `NNNNN.png` dizini değildir.) Işık ayarı bu döngüyle yapılır; tam render ölçüm tutunca.

---

## §4 frame-check — 25 tip

### §4.0 Sözleşme

```
motion-render frame-check <id> [--only tip|ad,…] [--frames-dir D] [--mp4 auto|yol] [--cand aday.json] [--sheet] [--json]
                               [--set K=V …] [--checks f.json] [--out yol.json] [--list]          (kısa: fc)
  → out/probe/<id>-fc.json   (özet satırı; çıkış 3 = error düzeyinde ihlal)
```

- **Girdi:** `scenes.json` sahne kaydının `checks: [...]` dizisi + (varsa) `checks/<id>.json` (dizi ya da `{hooks, set, checks}`; birleşir) — `--checks f.json` ikisinin yerine geçer · `world/world.json` (varsayılanlar, sınıflar) · kancalar: sahne `hooks` + checks dosyasının `hooks`'u (frame-check sayfaya enjekte eder) · `set` (sayfa global'leri; `--set` üstüne yazar) · `review` kayıtları (`[a, b, gerekçe]` → incelendi). `--only` tip adıyla ya da kontrolün `name`'iyle süzer; `--list` tipleri ve katmanlarını yazar.
- **Ortak alanlar:** `type` · `name` (varsayılan `<tip>#<sıra>`) · `severity` (`error` | `warn` | `info`; tip varsayılanı aşağıdaki tabloda) · `review` (incelendi anahtarı; varsayılan tip adı) · `maxViolations` (200) · `evidence: true` (+ `crop` [x, y, w, h], `sheet: {layout: grid|strip|column, cols, cell, max}`) — kanıt sayfası `out/probe/fc/<id>-<ad>.png`.
- **Kare seçimi:** `frames` (liste; negatif = sondan) | `range` [a, b] (dahil) + `step` | `at`: `first` / `last` (ilk/son `n` ‖ `window` ‖ 12 kare) · `keys` (sahne `keys`); hiçbiri yoksa bütün kareler (`step`, varsayılan 1). `at: "actBoundaries"` yalnız `temporal`'da.
- **Kare kaynağı:** `src`: `frames` (varsayılan; `dir` ‖ `--frames-dir` ‖ `out/frames/<id>[_<tag>]`) · `mp4` (`mp4` yolu ‖ `--mp4` ‖ sahnenin en yeni `out/scenes/<id>.mp4`) · `master` (`master` yolu ‖ en yeni `out/master/*.mov|mp4`). `ref` biçimleri: `tag:<T>` (`out/frames/<id>_<T>`) · `scene:<id>` · dizin yolu; `identical`'da ayrıca `master:<video yolu>` / `mp4:<video yolu>`.
- **Ölçüm yolu** `scale`: `qc` · `fast` · `half` · `nearest` · `edge` · `full` (§1.2); tipin varsayılanı tabloda.
- **Değer başvuruları:** `"$__<kanca>"` = sahne kancası (`"$__redExclude"`, `"$__events"`, `"$__holds"`, `"$__camSpeed"`, `"$__shots"`). `"$world.<yol>"` / `"$scene.<alan>"` yalnız `luma.band` ve `toolPath.maxPx`'te çözülür; diğer alanlarda başvuru yazılmaz — alan verilmezse varsayılan zaten world'dendir.
- **Birimler:** kare seçimi ve pencere parametreleri **kare** (`step`, `window`, `n`, `runMax`, `bridge`, `last.n`, `tolFrames`); ses parametreleri **saniye** (`tol`, `win`, `max`, `hop`, `from`, `dur`, `tail.from`) ya da ms (`minMs`); konum px 1080p (`region` [x, y, w, h]; `box`/`allow` [x0, y0, x1, y1]); luma % (`band`, `min`, `max`, `darkShare.below`); fark ve renk kanalı 0–255 (`tol`, `staticMax`, `maxDelta`). px/kare eşikleri proje fps'inde uygulanır (ölçeklenmez).
- **Kanca yoksa** ilgili kontrol "ölçülemedi" UYARI verir (hata değil). Kare/mp4 yoksa da "ölçülemedi". Bilinmeyen tip `skip`. Çizim kesilmesi (sayfa çöküşü, zaman aşımı, dış kesme) "kanca yok" yazılmaz, ayrı iletiyle raporlanır (1.4; `onset` A/B).
- **`--only` (1.4):** süzülmüş koşu `--out` verilmedikçe `out/probe/<id>-fc-only-<t1+t2>.json`'a yazar (rapora `only` alanı); kapının tam kaydı (`<id>-fc.json`) yalnız süzgeçsiz koşuyla değişir. Uzun tipler (A/B `onset`) ilerleme satırını stderr'e yazar (`olay i/N`); stdout `--json` için temiz kalır.
- **Çıktı:** her kontrol için `type`, `name`, `severity`, `status` (`pass` | `fail` | `warn` = ölçülemedi ya da tümü incelendi | `skip`), `summary`, `metrics`, `violations` (ilk `maxViolations`), `violationCount`, (varsa) `evidence`. Rapor: `summary` sayıları, `hooks` (yüklenen/eksik), `sources`, `candidates` (`--cand`), `exit`.
- **Katmanlar:** A = piksel/zaman (render sonrası, 13 tip) · B = tasarım zamanı izdüşüm (render yok, 4 tip) · C = ses/tipografi (3 tip) · D = zanaat kapısı (1.3; hareket kalitesi kusurları, 5 tip: `pop`, `onset` piksel · `velocity`, `entryExit`, `moves` tasarım).

**Varsayılan önem** (`severity` ile değişir): `error` — black, temporal, seam, identical, accentLocation, accentColor, overlapPx, framing, toolPath, overlap, camera, sync, loudness, glyph, pop, onset, velocity, entryExit · `warn` — luma, ramp, edgeDark, sharpness, stroke, motion, moves.

Kanca sözleşmesi (CONTRACT §5, özet): `__camSpeed(fps,n)` kare başı kamera ekran hızı · `__camK(fps,n)` kare başı kamera ölçeği k · `__redExclude(fps,n)` kare başı izinli aksan kutuları `[[x0,y0,x1,y1]…]` · `__boxes(T)` `[{name, rect|poly, kind: obj|lyric|label|text|cut|out|rr|paper|ref, px, pad?, minPx?, vis?, phase?}]` · `__tools(T, Tönceki)` `{ad: {poly|tip, visible?, ref?, parts?, phase?, vis?}}` · `__holds()` tutuş aralıkları · `__events()` `[{t, word, kind, at?, region?, hide?}]` · `__glyphs(T, ad?)` yazılmış glif kutuları · `__shots(fps)` `[[ad, f0, f1]]` · geçiş pencereleri (ör. `__gecis()` `[{t, son}|{t, dur}|{t0, t1}]`, `pop.exclude`) · isteğe bağlı `__frameN(fps)`, `__frameT(i, fps)` · DOM işaretleri `[data-hero]`, `[data-doku]`, `[data-c]`, `[data-fx]` · gizleme sözleşmesi (`onset` A/B): sayfa, başlangıçta okunan bir global'le öğeyi ya da alet katmanını çizmez.

### Katman A — piksel / zaman

#### fc:luma (1) — parlaklık, bant, bölge ışığı
Kural: KD-6, KD-10, IŞ-10. Kanca: yok. World: `band` (zorunlu). Önem: `warn`.

| parametre | varsayılan | anlamı |
|---|---|---|
| kare seçimi | bütün kareler (`step` 1), sonra qc penceresi `[openF, exitF)` | `window: "all"` pencere süzmesini kapatır |
| `region` | tüm kare | [x, y, w, h] @1080 bölge (şerit, köşe, merkez) |
| `grid` · `gridMaxRatio` | — | [sütun, satır] ızgara (ışık havuzu dağılımı) · hücre max/min oranı sınırı |
| `stat` | `mean` | `mean` · `p90` · `hp` (yüksek geçiren std = doku gücü; `hpRadius` 4) |
| `band` | world `band` | [alt, üst] luma %; `"$world.<yol>"` çözülür |
| `min` · `max` | — | tek taraflı sınır (`max`, `band`'ın üst ucunun yerine geçer) |
| `darkShare` | — | `{below: % (35), max: pay}` koyu piksel payı (genel bakış pozlaması) |
| `report` | sınır varsa `overFrames`, yoksa `mean` | `mean` = ortalama sınır dışıysa tek ihlal · `overFrames` = sınır dışı her kare ihlal |
| `scale` | `qc` (`darkShare` varsa `fast`) | ölçüm yolu |
| `src` | `frames` | `mp4` / `master` ile grade sonrası |

```json
{"type":"luma","range":[600,1199],"step":24,"band":"$world.band","report":"overFrames","scale":"qc"}
```

#### fc:black (2) — boş siyah, karanlık, son kareler
Kural: KD-9, KD-8, SN-2. Kanca: yok. World: — (core sabitleri). Önem: `error`.

| parametre | varsayılan | anlamı |
|---|---|---|
| `emptyMax` | 0,70 | kare başı boş siyah payı sınırı (boş piksel = luma < %6 = 15,3/255, sabit) |
| `runMax` | `fps` kare (1 s) | **kare**: `[openF, exitF)` içinde pay > `emptyMax` kesintisiz koşu bu uzunluğu aşarsa ihlal |
| `dark` | true | karanlık koşusu: ortalama luma < %8 **ve** parlak (> %30) pay < 0,0005, > 15·KF kare (0,5 s); `false` kapatır |
| `last` | `{rawMax: 2, mp4Max: 0, n: 8}` | son kare: ham max ≤ `rawMax`; sahnenin mp4'ünde N−1. kare max ≤ `mp4Max`; son `n` karenin ortalama Y'si (480×270) raporlanır, `yMax` verilirse sınırdır; `slice: true` sahnede atlanır; `last: false` kapatır |
| kare seçimi | bütün kareler (`step` 1) | — |

Başka ihlal yoksa kontak hücresi karelerinde (kare % 12 = 0) pay > `emptyMax` sonucu `warn` yapar.

```json
{"type":"black","runMax":60,"last":{"rawMax":2,"mp4Max":0,"n":8}}
```

#### fc:temporal (3) — sıçrama, takılma, dikiş serisi
Kural: DV-3, K8 (tek kare değişim), BAS-3, IŞ-9, SS-1, UCUZ-9. Kanca: `__camSpeed` (yalnız `detect: ["dup"]`). World: —. Önem: `error`.

| parametre | varsayılan | anlamı |
|---|---|---|
| `metric` | `mad` | `mad` (ardışık ortalama mutlak fark, 0–255) · `meanY` (ortalama Y farkı; encode/iniş basamağı) · `edgeEnergy` (ort. \|∇luma\| oranı; 2×/1× sınırı) · `globalExposure` (değişen kutu dışındaki ΔY; pozlama basamağı) |
| `at` | — (ortak kare seçimi) | `actBoundaries` = başlangıç + her perde sınırı + son (sınırlar: `parent` = bu sahne olan kesitlerin `range[0]`'ı) · `first` · `last` · `keys` |
| `window` | 12 **kare** | `actBoundaries`: sınırın ± `window` karesi, baş/son `window` + 1 kare · `first`/`last`: kare sayısı |
| `maxRatio` | 1,5 | sıçrama oranı r_i = d_i / max(d_{i−1}, d_{i+1}, `floor`) |
| `floor` | 0,02 (`meanY` 0,05) | oran paydası tabanı |
| `detect` | — | dizi: `dup` (d < 0,15 ve kamera > 1 px/kare) · `stutter` (komşu ort. m > 0,6 ve d < 0,35 m) · `jump` (d > 2,5 m ve d > 3) · `freeze` (d < `freeze`, 0,05) · `spike` (d > `spike.k` × dört komşu ort. ve fark > `spike.abs`) |
| `spike` | `{k: 1.6, abs: 0.8}` | `spike` dedektörü eşiği |
| `maxJump` · `maxOutside` | — | `edgeEnergy` \|r − 1\| sınırı · `globalExposure` kutu dışı ΔY sınırı |
| `outsideBoxPad` | 8 (ölçek pikseli) | `globalExposure` değişen kutu payı |
| `mix` | — | `{dir, ranges: [[a,b]…]}`: bu aralıkların kareleri `dir`'den okunur (yeni aralık + kayıtlı komşular tek seri) |
| `src` | `frames` | `mp4` · `master`: Y düzlemi `w`×`h` (varsayılan 960×540 `area`; `meanY` 480×270) |
| `scale` · `channels` | `fast` (`edgeEnergy` → `edge`, `globalExposure` → `half`) · gri | kare dizini ölçüm yolu · `rgb` \| `luma` |
| `camSpeed` | `"$__camSpeed"` | `dup` kancası |

**Tam liste (1.4):** `mad`/`meanY` oranında penceredeki eşik üstü **bütün** kareler ayrı ihlal satırıdır (yalnız en kötüsü değil); özet "n kare > eşik", pencere satırında `over`. Bir düzeltme turu tek sayıyla değil kare listesiyle açılır: aynı pencerede ayrı kök nedenli birden çok sıçrama olabilir (raster yolu, kimlik çakışması, süzgeç yüzeyi — LESSONS §1.5). `review.temporal` aralıkları kare başına uygulanır.

```json
{"type":"temporal","at":"actBoundaries","window":12,"src":"mp4","metric":"mad","maxRatio":1.5,"floor":0.02}
```

#### fc:ramp (4) — iniş/çıkış tekdüzeliği
Kural: SN-4, SN-5, BAS-3. Kanca: yok. Önem: `warn`.

| parametre | varsayılan | anlamı |
|---|---|---|
| `range` | — | [a, b] rampa aralığı (dahil; `frames` bir kare **listesidir**) |
| `monotone` | false | ortalama Y tekdüze (ters yönde adım > `tol` ihlal) |
| `tol` | 0,05 | tekdüzelik toleransı (luma 0–255) |
| `maxRelDev` | — | göreli sapma \|D_i − ort(D_{i−1}, D_{i+1})\| / max(0,05, D_i) sınırı |
| `lastMax` | — | rampanın son karesinin en büyük kanal değeri sınırı |
| `ref` | — | karşılaştırma dizini (önce/sonra): kare başı ortalama oranı (rapor) |
| `src` | `frames` | `mp4` · `master` |

```json
{"type":"ramp","range":[1380,1439],"monotone":true,"maxRelDev":1.5,"lastMax":0,"src":"mp4"}
```

#### fc:seam (5) — perde/sahne devri
Kural: DV-1, DV-2. Kanca: yok. Yöntem: M-SEAM. Önem: `error`.

| parametre | varsayılan | anlamı |
|---|---|---|
| `next` / `prev` | — | komşu sahne kimliği |
| `neighborK` | 1,1 | hareketli devir: dikiş ≤ k × büyük komşu fark |
| `staticMax` | 2 (0–255 ortalama fark) | durağan devir sınırı |
| `src` | `frames` | `mp4` · `master` (tam çözünürlük kareler) |

```json
{"type":"seam","next":"S2","neighborK":1.1,"staticMax":2}
```

#### fc:identical (6) — bayatlık tanığı, bit-eşliği
Kural: RH-5, RH-6, RH-7, MT-1, MT-5, MT-6, MS-4, MS-6. Kanca: `mode:"dom"` için DOM işareti (`[data-fx]`). Önem: `error`.

| parametre | varsayılan | anlamı |
|---|---|---|
| `ref` | — | `tag:<T>` · `scene:<id>` · dizin yolu · `master:<video yolu>` / `mp4:<video yolu>` (video ↔ video) |
| `frames` / `ranges` (+ `step`) | — | tanık kareler (`ranges: [[a, b], …]`) |
| `offset` | 0 | ref kare numarası kaydırması |
| `expect` | `same` | `same` (aralık dışı) · `diff` (değişmesi gereken aralık) |
| `tol` | 0 | izinli **en büyük** kanal farkı (0–255) |
| `mode` | `pixel` | `pixel` · `dom` (`selector` (`[data-fx]`) outerHTML FNV imzası; ilk koşu tabanı `out/probe/<id>-dom-<ref>.json`'a yazar) · `rgb48` (16-bit; `src` (varsayılan `master`) videosu ↔ `ref` videosu bit-aynı) |
| `report` · `amp` | — · 4 | `diffMap` → ilk 6 ihlalin fark haritası `out/probe/fc/<id>-diff-NNNNN.png` (kanal farkı × `amp`) |

```json
{"type":"identical","ref":"tag:v3","ranges":[[0,559]],"expect":"same","tol":0}
```

#### fc:edgeDark (7) — kadraj kenarı kararması, world düşümü
Kural: KD-11, KM-7. Kanca: yok. World: `edgeDark.maxFalloff`, `edgeDark.maxDelta`. Önem: `warn`.

| parametre | varsayılan | anlamı |
|---|---|---|
| `mode` | `band` | `band` (yapay koyu kenar şeridi) · `corners` (world düşümü: 4 köşe + merkez yama) · `desk` (`cls` sınıfı piksel sayısı) |
| `band` | [1, 3] | kenar şeridi (ölçek pikseli; `scale` varsayılanı `edge` = 960×540) |
| `ref` | [12, 15] | içerideki karşılaştırma şeridi |
| `maxDelta` | world `edgeDark.maxDelta` ‖ 15 | ref − kenar luma farkı sınırı (0–255) |
| `patch` | 60 px | `corners` yaması (tam çözünürlük) |
| `maxFalloff` | world `edgeDark.maxFalloff` ‖ 0,2 | `corners`: 1 − min/max yama |
| `cls` · `maxPx` | `desk` · 200 | `desk` modu |

Kamera durağanlığı araçta denetlenmez: `band` modunda kare seçimi durağan karelere (kamera ≤ 3 px/kare) yapılır.

```json
{"type":"edgeDark","mode":"band","band":[1,3],"ref":[12,15],"maxDelta":15}
{"type":"edgeDark","mode":"corners","frames":[0],"patch":60}
```

#### fc:accentLocation (8) — tek vurgu rengi: konum
Kural: AK-4, AK-7. Kanca: `__redExclude(fps, n)` (`allow` içinde). World: `accent.class`, `classes`. Önem: `error`.

| parametre | varsayılan | anlamı |
|---|---|---|
| `classes` | [world `accent.class` ‖ `signal`, `bordo`] | taranan sınıf adları ya da satır içi tanımlar (pikselde ilk eşleşen) |
| `allow` | [] | izinli kutular: `"$__redExclude"` (kanca, kare başı) · `[x0, y0, x1, y1]` · `{name, box: [x0, y0, x1, y1]}` (1080p) |
| `maxOutsidePx` | 0 | kare başı izinli kutular dışındaki sınıf pikseli (ölçek pikseli) |
| `quota` | sahne `redQuota` | aksanlı kare koşusu sayısı sınırı; `false` kapatır |
| `bridge` | round(2·KF) **kare** (0,067 s) | koşuyu bölmeyen boşluk (kutu örtüşme şartı yok; qc#10'dan farkı) |
| `scale` | `nearest` (960×540) | ölçüm yolu |
| `step` | 1 | örnekleme |

```json
{"type":"accentLocation","allow":["$__redExclude"],"maxOutsidePx":0,"step":2}
```

#### fc:accentColor (9) — aksan/marka rengi tutarlılığı
Kural: AK-5, MS-6. Kanca: yok. World: `accent.color`, `classes`. Yöntem: M-DE. Önem: `error`.

| parametre | varsayılan | anlamı |
|---|---|---|
| `target` | world `accent.color` | hedef renk (#hex) |
| `classifier` | `redInner` (yalnız `pairs` verilmişse `redPair`) | iç piksel sınıfı (`inner: 3` → 3×3 komşuluğun tamamı sınıfta) |
| `frames` | — | ölçülen kareler (liste) |
| `src` | `frames` | teslim ölçüsü için `mp4` / `master` (grade'li dosya) verilir |
| `maxDeltaE` | 5 (çizgi aksanı) | hedefe karşı ΔE2000 |
| `pairs` · `maxPairDeltaE` | — · — | `[[a, b]]`; a/b = kare numarası ya da `{id, frame, src, mp4, dir, box}` (başka sahne/dosya) · çift ΔE2000 sınırı (verilmezse yalnız rapor; marka/logo için 3) |
| `box` · `boxB` | — | [x0, y0, x1, y1] tam çözünürlük bölge |

```json
{"type":"accentColor","src":"mp4","frames":[600,700],"classifier":"redInner","maxDeltaE":5}
```

#### fc:sharpness (10) — keskinlik eşitliği, S× kenar
Kural: SS-2, SS-3, KD-16. Kanca: yok. World: `classes`. Yöntem: M-SX. Önem: `warn`.

| parametre | varsayılan | anlamı |
|---|---|---|
| kare seçimi | — | ölçülen kareler (tam çözünürlük) |
| `regions` | `{a: {cls: "red"}, b: {cls: "darkNeutral", below: "a"}}` | iki bölge; bölge başına `cls` (sınıf), `box` [x0, y0, x1, y1], `below: "<bölge>"` (o bölgenin altı, ± 80 px), `band: k` (altındaki k. koyu satır bandı) |
| `metric` | `edge1090` | `edge1090` (%10–90 kenar genişliği medyanı, px) · `lapVarNorm` (Laplace varyansı / kontrast²); dizi verilirse ilki oranlanır, ikisi de raporlanır |
| `ratio` | — | [alt, üst] a/b oranı (ör. [0,9, 1,1] = ±%10) |
| `minRegionPx` | varsayılan çiftte 200 · açık `regions`'ta 0 | a bölgesinin en az sınıf pikseli (ölçülen kare pikseli); altı = bölge bulunamadı |

Mutlak kenar sınırı (`supersample.edgeMaxPx`) bu tipte denetlenmez: satırdaki `edge1090` raporlanır, karar M-SX'e göre verilir.

**Varsayılan çift (1.4):** `regions` verilmemişse red ↔ darkNeutral çifti yalnız sahnede aksan olabilecekken ölçülür. Sahne `redQuota` 0 ise ya da a bölgesinin `red` pikseli `minRegionPx` altındaysa sonuç **"ölçülemedi: bölge tanımı gerekli"** olur: aksansız karede `red` sınıfı sıcak bir zemini (ahşap, talaş) eşleyip içerikten bağımsız "geçti" ya da ışık değişince "bölgeler bulunamadı" verebiliyordu. Özet satırı ölçülen bölgenin sınıfını ve kutusunu yazar (`bölge a <sınıf> [x0,y0,x1,y1] · b …`, kare pikseli; varsayılan çiftte "(varsayılan çift)"); `metrics.regions` sınıf adları, satırlarda `cls` ve `px`. Kapıda bölgeler her zaman açık yazılır (okunacak metin ↔ komşu mürekkep gibi aynı karttaki kahramanlar).

```json
{"type":"sharpness","frames":[1300],"regions":{"a":{"cls":"brandMark"},"b":{"cls":"darkNeutral","below":"a"}},"metric":["edge1090","lapVarNorm"],"ratio":[0.9,1.1]}
```

#### fc:stroke (11) — çizgi profili, süreklilik
Kural: K8 (zanaat), HAT. Kanca: yok. Önem: `warn`.

| parametre | varsayılan | anlamı |
|---|---|---|
| `box` | — (zorunlu) | [x0, y0, x1, y1] tam çözünürlük (2× kare kendiliğinden 1080p'ye iner) |
| `metric` | [`top`, `bottom`, `thickness`] | `top` · `bottom` · `thickness` · `area` (sütun başı %50 kaplama geçişi, alt piksel) · `fwhm` · `inkExtent` (luma < `inkMax` 55 satırları) · `continuity` (en koyu ince piksel merkezinin eğimden sapması → kırık) |
| `channel` | kırmızı − yeşil | `dark` → 255 − luma (koyu çizgi) |
| `ref` | — | önceki sürüm dizini (`tag:<T>` …): kenar/kalınlık yeni ↔ eski |
| `maxDelta` | 0,5 px | ref farkı sınırı |
| `maxKink` | 1,2 px | süreklilik kırığı eşiği (her kırıklı kare ihlal) |
| `maxThickness` · `colStep` | — · 1 | kalınlık sınırı · `fwhm` sütun adımı |

```json
{"type":"stroke","box":[440,920,1000,960],"metric":["thickness","top","bottom"],"ref":"tag:v2","maxDelta":0.5}
```

#### fc:motion (12) — piksel hareketi, takip
Kural: KM-9, KM-11 (piksel doğrulaması), İL-5. Kanca: yok (tasarım zamanında `fc:camera`/`fc:toolPath` tercih edilir). Önem: `warn`.

| parametre | varsayılan | anlamı |
|---|---|---|
| `mode` | `global` | `global` (piksel kamera kayması) · `track` (sınıflı nesne merkezi takibi) |
| `method` | `sad` | `sad` · `sse`; tek ölçekte ± `search` arama + parabol alt piksel |
| `scale` · `search` | `fast` (480×270) · 6 | ölçüm yolu · arama yarıçapı (ölçek pikseli) |
| `region` | merkez %60 | [x, y, w, h] @1080 |
| `stepJump` · `maxSteps` | world `camera.stepJump` · — | basamak: ardışık hız farkı > `stepJump` (px/kare); `maxSteps` aşılırsa ihlal |
| `maxPx` | — | tepe hız sınırı (px/kare @1080) |
| `stallMax` · `stalls` | 0,5 · — | duraksama: hız < `stallMax` ve komşular > 2 px/kare; `stalls: false` → her duraksama ihlal |
| `track`: `classifier`/`cls`, `region`, `minPx` (20), `scale` (`half`), `maxPx`, `edgeTouch: false` | — | ilk/son görünür kare, tepe hız; `edgeTouch: false` → kadraj kenarına değen kare ihlal |

Rapor (global): tepe, p95, ivme, basamak ve duraksama kareleri, kare başı vektörler.

```json
{"type":"motion","mode":"global","method":"sad","maxSteps":0}
```

#### fc:overlapPx (13) — örtme (piksel doğrulaması)
Kural: ÖRT-1. Kanca: yok. Önem: `error`.

| parametre | varsayılan | anlamı |
|---|---|---|
| `mode` | `hidden` | `hidden` · `clearance` (iki sınıf arası açıklık) |
| `ref` | — (zorunlu) | örtücüsüz referans **kare numarası** (aynı kaynaktan; `refDir` ile başka dizinden) |
| `band` | — (zorunlu) | [x0, x1] tarama sütunları (tam çözünürlük) |
| `rows` | [40, 170] | tarama satırları [y0, y1) |
| `dark` · `light` | 70 · 110 | ref'te glif pikseli (< `dark`) hedefte açık (> `light`) → örtülmüş |
| `align` | `{dx: 60, dy: 20, region}` | SAD hizalama araması; `false` kapatır |
| `maxHidden` | 0 | kare başı örtülen glif pikseli |
| `clearance`: `a`, `b`, `minGap`, `maxClose` | —, —, 4 px, 0 | `a` sınıfına `minGap`'ten yakın `b` pikseli sayısı sınırı |

```json
{"type":"overlapPx","ref":812,"band":[300,900],"maxHidden":0}
```

### Katman B — tasarım zamanı izdüşüm (render yok)

frame-check sayfayı açar, kancaları kare kare çağırır (`step`, varsayılan 1 kare; `range` [a, b] ile aralık); kancalar ekran px'i döndürür (dünya → ekran izdüşümü sahnenin işidir). `--cand aday.json` (`[{name, set: {GLOBAL: değer}}]` ya da `{ad: {GLOBAL: değer}}`) her adayı ayrı sayfada koşturur; sonuçlar `candidates` altında aynı tabloda karşılaştırılır. Varyant eleme (VR-3) ve kamera adayı araması bu katmanla yapılır.

#### fc:framing (14) — kadraj payları, kesik metin
Kural: KD-2, KD-13, KD-14, K1-M, DV-5, KM-2. Kanca: `__boxes(T)`. Önem: `error`.

| parametre | varsayılan | anlamı |
|---|---|---|
| kutular | `__boxes(T)` kancası (sabit; `boxes` alanı okunmaz) | `kind` başına kural uygulanır |
| `kinds` | `obj {pad: 12}` · `lyric {pad: 50, minPx: 160}` · `label {pad: 50}` · `text {minPx: 22}` · `cut {allOrNothing: true}` · `out {fullyOutside: true}` · `rr {pad: 12, padLeft: 60}` | tür başı kural; verilen alanlar varsayılanın üstüne yazar. Kutu kendi `pad`, `padLeft`, `minPx`, `allOrNothing`, `fullyOutside`, `test` alanıyla geçersiz kılar |
| kutu `px` | — | ekrandaki display boyu; `minPx` ile karşılaştırılır (world `k1.lyricMin` kendiliğinden gelmez → farklıysa `kinds.lyric.minPx`) |
| `test` | `bbox` | `bbox` · `points` (çokgen köşeleri) — kesik/görünür sınaması |
| `desk` | — | sayı ya da `{max}`: `kind: "paper"` yüzeylerinin dışında kalan ekran payı sınırı |
| `measure` | — | `[{box, T}]` adlı kutunun o andaki ekran ölçüsü (rapor) |
| `range` · `step` · `n` | bütün kareler · 1 · — | izdüşüm kareleri |

```json
{"type":"framing","kinds":{"obj":{"pad":12},"lyric":{"pad":50,"minPx":160},"text":{"minPx":22},"cut":{"allOrNothing":true}},"desk":{"max":0.003},"step":2}
```

#### fc:toolPath (15) — aktör/alet yolu, hızı, K8 giriş/çıkış
Kural: KM-10, KM-11, KM-12. Kanca: `__tools(T, Tönceki)`, `__holds()`. World: `motion.toolMaxPx`. Önem: `error`.

| parametre | varsayılan | anlamı |
|---|---|---|
| `tools` | bütün aletler | ad listesi (yalnız bunlar ölçülür); kanca `__tools` sabittir |
| `metric` | `tip` | `tip` (uç noktası hızı) · `poly` (çokgen köşelerinin en büyük yer değiştirmesi) |
| `k8` | false | `true` → alet kadraj içinde görünür hâlde belirir ya da kaybolursa ihlal (kadraj dışından girip çıkmalı) |
| `single` | false | `true` → aynı anda birden çok görünür alet ihlal |
| `holds` | — | `"$__holds"` → tutuş aralıklarında görünür alet ihlal |
| `maxPx` | world `motion.toolMaxPx` | görünürken uç hızı px/kare (proje fps'i); sayı ya da `{default, <alet>, "<alet>/<evre>"}`; `"$world.<yol>"` çözülür |
| `relative` | false | yüzeye göreli hız (alet `ref` noktası) da sınırlanır |
| `phaseBy` · `resetHidden` · `visMargin` | `phase` · false · 0 | evre alanı · gizlenince hız geçmişini sıfırla · görünürlük payı px |
| `range` · `step` · `n` | bütün kareler · 1 · — | izdüşüm kareleri |

Rapor: alet (ve alet/evre) başına tepe mutlak/göreli hız ve anı, ilk/son görünür an.

```json
{"type":"toolPath","k8":true,"single":true,"holds":"$__holds","maxPx":"$world.motion.toolMaxPx"}
```

#### fc:overlap (16) — örtme 0 (geometri)
Kural: ÖRT-1, ÖRT-2, ÖNP, KM-11. Kanca: `__tools`, `__boxes`, `__glyphs` (başvuruya göre). Önem: `error`.

| parametre | varsayılan | anlamı |
|---|---|---|
| `a`, `b` | — (zorunlu) | `tool:<ad>[.<parça>]` (`parts[parça]`, yoksa `poly`/`tip`) · `box:<ad>` · `kind:<tür>` (`__boxes`) · `glyphs[:<ad>]` (`__glyphs(T, ad)`) |
| `shape` | `bbox` | `bbox` (eksen hizalı kutu kesişimi) · `sat` (dışbükey çokgen, ayırıcı eksen) |
| `pad` | 0 | px; sayı ya da `bbox`'ta [sol, üst, sağ, alt] |
| `max` | 0 | izinli örten kare sayısı |
| `perPhase` · `phaseBy` | false · `phase` | evre başına örten kare raporu (`a` aletinin evre alanı) |
| `range` · `step` · `n` | bütün kareler · 1 · — | izdüşüm kareleri |

```json
{"type":"overlap","a":"tool:pen.body","b":"glyphs:written","pad":2,"max":0,"perPhase":true}
```

#### fc:camera (17) — basamak 0, K3, tepe
Kural: BAS-1, BAS-2, KM-4, KM-6, K3. Kanca: `__camSpeed(fps, n)` (+ `__shots(fps)`). World: `camera.{stepJump, maxSteps, maxPxPerFrame, k3}`. Yöntem: M-STEP, M-K3. Önem: `error`.

| parametre | varsayılan | anlamı |
|---|---|---|
| `speed` | `"$__camSpeed"` | kare başı kamera ekran hızı kancası |
| `stepJump` | world `camera.stepJump` ‖ 2,5 | basamak: \|v_j − v_{j−1}\| > `stepJump` (px/kare, proje fps'i) |
| `maxSteps` | world `camera.maxSteps` ‖ 0 | izinli basamak sayısı |
| `maxPxPerFrame` | world `camera.maxPxPerFrame` | tepe hız sınırı |
| `shots` | — | `[[ad, f0, f1], …]` ya da `"$__shots"` (kanca `__shots(fps)`) |
| `k3` | world `camera.k3` ‖ `{v: W·0,02/fps}` | `{v (eşik px/kare; dizi olabilir), minShare}`: shot başına v ≥ eşik kare payı ≥ `minShare` |
| `n` · `keepSeries` | — · false | kare sayısı · hız dizisini rapora yaz |

İvme (`accel`) bu tipte ölçülmez → qc#16. Rapor: tepe ve anı, p95, basamak kareleri, shot başına K3 payı; `--cand` ile aday karşılaştırması.

```json
{"type":"camera","maxSteps":0,"shots":"$__shots","k3":{"minShare":0.4}}
```

### Katman C — ses / tipografi

#### fc:sync (18) — çentik, ses kayması, transkript
Kural: ÇEN-1, ÇEN-2, SES-03, SES-04, SES-06, SES-09, SES-10, SES-11. Kanca: `__events()` (`events` modu). Ayrıntı [AUDIO.md](AUDIO.md). Önem: `error`.

| parametre | varsayılan | anlamı |
|---|---|---|
| `mode` | `events` | `events` (olay ↔ kelime) · `words` (iki kelime dökümü farkı) · `silence` (sessiz aralıklar) · `drift` (iki ses arası kayma) |
| `events` | `"$__events"` | `[{t, word, kind, at?}]` fiziksel olay anları |
| `words` | — | `events`: kelime dosyası (`*.words.json`); olayın `word`'ü en yakın aynı kelimenin `t0`'ıyla eşlenir (olay `at` verirse o kullanılır) |
| `tolFrames` · `tol` | 1 kare (`events`) · 0,033 s (diğer modlar) | izinli \|olay − kelime başı\| (araçta **iki yönlü mutlak**; erken olay satırda `dMs < 0` görünür) |
| `a`, `b`, `offset` | — | `words`: iki kelime dökümü (LCS hizası), beklenen kayma (s) |
| `audio`, `from`, `dur` | manifest `audio`, sahne `range` | `silence`/`drift` ses kesiti (s) |
| `th` · `minMs` · `expect` | −50 dBFS · 30 ms · — | `silence`: eşik, en kısa sessizlik, olması gereken aralıklar [[a, b]] (s) |
| `ref`, `refFrom`, `win`, `max`, `hop`, `minCorr`, `sameTake` | —, `from`, 1,5 s, 1,5 s, 0,25 s, 0,5, 0,9 | `drift`: karşılaştırılan ses; 10 ms RMS dB zarfı pencere NCC (± `max`), PCM ± 12 ms inceltme; zarf korelasyonu < `minCorr` pencere atılır; PCM > `sameTake` → aynı çekim |

```json
{"type":"sync","mode":"events","events":"$__events","tolFrames":1}
```

#### fc:loudness (19) — master ses
Kural: MS-2, SN-7. Kanca: yok. Yöntem: M-LOUD. Önem: `error`.

| parametre | varsayılan | anlamı |
|---|---|---|
| `src` | `master` | `master` (en yeni `out/master/*.mov` / `.mp4`) · `audio` (manifest `audio`) · `mp4`; bulunamazsa `out/scenes/<id>-ses.mp4`, sonra sahne mp4'ü |
| `file` | — | doğrudan ölçülecek dosya |
| `I` · `tolI` | −16 LUFS · 1 | entegre hedef ± tolerans |
| `TP` | −1 dBTP | gerçek tepe sınırı |
| `tail` | — | `{from: s, maxDb}` sessiz kuyruk (volumedetect en büyük) |

```json
{"type":"loudness","src":"master","I":-16,"TP":-1}
```

#### fc:glyph (20) — glif kapsamı
Kural: KD-17. Kanca: yok. Önem: `error`.

| parametre | varsayılan | anlamı |
|---|---|---|
| `mode` | `unicodeRange` | `unicodeRange` (sayfada aileye ait, karakteri kapsayan yüklü yüz var mı) · `render` (hedef aile + iki yedekle canvas genişliği; yalnız yedekle aynıysa "yedeğe düşmüş") · `cmap` (font dosyasının cmap tablosu; sayfasız) |
| `chars` | — (zorunlu) | denetlenecek karakterler |
| `family` | — | aile (`unicodeRange`/`render` için gerekli; `cmap`'te `files` yoksa `fonts/local.css`'ten dosyaları bulur) |
| `fallbacks` | [`monospace`, `serif`] | `render` yedekleri |
| `files` · `css` | — · `fonts/local.css` | `cmap`: font dosyaları (TTF/OTF/WOFF/WOFF2) ya da ailenin `@font-face` kaynakları |

Sayfadaki görünür karakterlerin kendiliğinden taranması qc#13'tedir; bu tip verilen karakter kümesini denetler.

```json
{"type":"glyph","mode":"render","family":"<aile>","chars":"≥≤ΣİŞĞ"}
```

**Ekler (yeni tip değil):** `logo check` (M-LOGO) ayrı komuttur · `--sheet` / `evidence: true` = kanıt sayfası (ihlal kareleri, yoksa ölçülen karelerden örnek; kırpım `crop` ‖ `region` ‖ `box`, en yakın komşu büyütme, etiket `f · t s · luma%`).

### Katman D — zanaat kapısı (1.3): hareket kalitesi kusurları

Kapı yalnız **kusur** ölçer (RULES §8.1 ZN-1…ZN-5); kota ölçütleri (K3 payı, olay/s, ekipman sayısı, sınır vuruşu) bu katmanda yoktur, UYARI sınıfıdır (RULES §0.8 KO-1…KO-4). Ortak çekirdek "açıklanamayan değişim": ardışık iki karede |ΔY| ≥ `tY` olan bileşen, ±`search` px içinde en iyi kaydırmayla (ileri `cur(p) ↔ prev(p − d)` ve geri `prev(p) ↔ cur(p + d)` aynı vektörle) hâlâ tutmuyorsa yeni ya da kaybolan içeriktir; hareket eden nesne ve kamera kaydırmayla açıklanır. Kaynak: `render/lib/fc/craft.mjs` (saf fonksiyonlar `render/test/craft.test.mjs`).

#### fc:pop (21) — tek kare belirme/kaybolma
Kural: ZN-1, K8, HAT. Kanca: yalnız `exclude` kanca başvurusuysa. World: —. Önem: `error`.

Ölçü: aday bileşenin kendi kutusundaki açıklanamayan piksel ÷ aynı yönlü (ortalama ΔY işareti aynı) **olay bölümünün** toplamı. Bölüm = adayın kutusuyla kesişen, boşluğu ≤ `gap` kare olan komşu karelerdeki açıklanamayan değişim; kutu üyeleriyle büyür (silinerek açılan öğenin şeritleri tek bölümdür). Tek karede tamamı beliren/kaybolan öğe ≈ 1,0; dört karede silinen öğe ≈ 0,25.

| parametre | varsayılan | anlamı |
|---|---|---|
| `maxShare` | 0,5 | film karesi eşiği; `--step N ≥ 2` animatikte `p + (1 − p)/2` (0,75) — bir animatik karesi N film karesini kapsar |
| `tY` · `scale` | 12 (/255) · `fast` (480×270) | değişim eşiği (krem üstü krem kart gibi düşük kontrast için düşük) · ölçüm yolu |
| `minPx` · `minThick` | 900 px² · 6 px (@1080) | aday alanı · ortalama kalınlık (alan ÷ uzun kenar); altı = katman kenarının alt piksel kayması, ince şerit |
| `search` · `searchMax` · `searchCap` | 48 px · — · 4 × `search` | hareketle açıklama arama yarıçapı (@1080) · geniş arama yalnız açıkça verilirse (uzak kaydırma kaybolan koyu içeriği rastgele "açıklayabilir"); (1.4) `"auto"` = sınıra dayanan bileşende yarıçap ikiye katlanır, en çok `searchCap` |
| `grow` · `margin` · `gap` | 12 px · 24 px · round(0,05·fps) kare | bileşen birleştirme · bölüm kutusu payı · bölüm boşluğu |
| `stable` | true | basamak pikseli: değişimden önceki ve sonraki kare çiftinde kararlı (< tY/2); sürekli kayan doku elenir |
| `cutShare` · `maxBoxShare` | 0,25 · 0,4 | karenin ≥ payı açıklanamıyorsa (kesme, ölçek, sayfa çevirme) ya da bileşen kutusu karenin ≥ payıysa → geçiş, aday değil (listelenir) |
| `exclude` · `excludePad` | — · 0 | muaf pencereler: `[[a, b]…]` kare · `"$__<kanca>"` → `[[ad, f0, f1]]` (shot başı ± pad) ya da `[{t, son}\|{t, dur}\|{t0, t1}]` (s). Tasarlanmış geçiş tek kare ölçüsü dışıdır (GÇ kurallarıyla ölçülür) |
| `cuts` · `polarity` | — · true | elle kesme kareleri · bölüme yalnız aynı yönlü değişim (kaybolan yazının üstünden hemen kayan sayfa ayrı olaydır) |

Bilinen sınır: düz renkli öğe silinerek açılırken ilk şerit kenar kaydırmasıyla kısmen açıklanır, payı büyük çıkabilir; dokulu yüzeyde sorun yok. Rapor: ihlal başına `f`, `T`, `box` (@1080), `px`, `share`, `episode`, `d` (en iyi kaydırma); `metrics.top` en yüksek paylı 12 aday, `cuts`/`wide` geçiş kareleri.

**Arama sınırı adayı (1.4).** En iyi öteleme arama yarıçapının sınırındaysa ve bileşen açıklanmamışsa (pay > 0,3) 2× yarıçapta bir **yoklama araması** yapılır (sonuç benimsenmez). Geniş pencere hareketi açıklıyorsa (pay ≤ 0,3 ve yarıdan az) aday ihlal değil **"aday: hız arama penceresini aşıyor"** satırıdır (`metrics.edgeCandidates`: `f`, `box`, `d`, `searchPx`, `probe`); başka ihlal yoksa kontrol `warn` verir (geçti değildir) → `searchMax` (sayı ya da `"auto"`) ile yeniden ölçülür. Gerçek tek kare belirmede geniş pencere de açıklayamaz, ihlal kalır. Bilinen nedeni: hızlı ve ölçek değiştiren nesne (düşen, büyüyen kart) varsayılan 48 px'i aşar; aynı nesnede hız eşiğinde tek karede kapanan hareket bulanıklığı gerçek pop'tur ve geniş pencerede de kalır. `"auto"` kullanılan en büyük yarıçapı `metrics.searchUsed` (px @1080) ve özette yazar.

Bilinen açık: tek yönlü ilerleme (yazım cephesinin tek harfi, yumuşak gölge cephesi tek karede `minPx`'i aşıp geri dönmeden sürer) bölüm payında tek kare görünebilir; olay bölgesi ve süresiyle "yazım/iniş" ayrımı sonraki sürümdedir — o zamana dek `exclude` ya da `review.pop` kaydıyla, kare şeridi kanıtıyla.

```json
{"type":"pop","exclude":["$__gecis"]}
```

#### fc:onset (22) — görünür başlangıç
Kural: ZN-5, ÇEN-1 (ölçü = olayın ilk **görünür** karesi). Kanca: `__events` (ya da satır içi `events`), A/B kipinde gizleme global'leri, `region`/`mask` başvurusunda `__boxes`/`__tools`. Önem: `error`.

| kip | ne yapar | ne zaman |
|---|---|---|
| **A/B** (`hide` verilirse; kesin) | sayfa iki kez çizilir: A = `base` global'leri (ör. alet katmanı gizli), B = A + `hide` global'ine olayın `hide` değeri (öğe çizilmez). Bölgede \|Y_A − Y_B\| ≥ `tY` pikselleri birikir; ≥ `minPx` (ve uzanım ≥ `minExtent`) olan ilk sahne karesi = görünür başlangıç. Kare dizini gerekmez, tam çözünürlük, sahne fps'i | çizen alet çizginin ucunu örtüyorsa (kalem, pergel) — tek güvenilir yol |
| **piksel** (varsayılan) | kare dizininde bölgenin (`region` başvurusu varsayılan **dinamik**: her karede öğenin o ana dek çizilmiş kendi çokgenleri + `regionPad`) yeni içeriği; bölge için tek kamera kaydırması SAD ile kestirilir, değer d kaydırmalı 3×3 komşuluk aralığı dışındaysa yeni. `mask` (`kind:alet` vb.) çokgenleri çıkarılır. Birikim ≥ `minPx` ve uzanım ≥ `minExtent` | alet içermeyen olay (kart, yazı, mum); alet çokgeni bölgenin ≥ `maskWarn` payını örtüyorsa satır **belirsiz** → yalnız belirsiz ihlal varsa UYARI ("A/B ile ölç") |

| parametre | varsayılan | anlamı |
|---|---|---|
| `events` | `"$__events"` | satır içi `[{name, at\|t\|f, region, hide?, mask?, regionAt?, regionMode?}]`; `at` (a0) varsa çapa odur |
| `region` | — | `[x, y, w, h]` @1080 · `"box:<ad>"` (`*` sonda = önek) · `"kind:<tür>"` · `"full"` |
| `pre` · `post` | A/B 0,1 / 0,5 s · piksel 0,5 / 1,0 s | çapa çevresindeki pencere |
| `tolFrames` · `earlyFrames` | 1 · 0 | geç toleransı (sahne karesi; `--step N`'de + N − 1) · erken toleransı (ÇEN-1: önce gelmez) |
| `tY` · `minPx` · `minExtent` | 40 · 12 px · A/B 0 / piksel 12 px | görünürlük eşiği (mürekkep/nesne); uzanım = birikimin dış kutusunun uzun kenarı (tek mürekkep noktası ya da kenar kırıntısı başlangıç sayılmaz). (1.4) `tY` sınıf haritası olabilir: `{default: n, <sınıf>: n \| {rel, min?, floor?}}` — aşağıda |
| `base` · `hide` | — | A/B: A sayfasının global'leri · B'de olayın `hide` değerinin yazılacağı global adı |
| `mask` · `maskPad` · `maskWarn` | — · 0 · 0,05 | piksel kipi alet çokgenleri · genişletme · belirsizlik eşiği |
| `regionAt` · `regionMode` · `regionPad` | post · `dynamic` · 12 px | statik bölge anı (çapa + s) · `static` = `regionAt` anındaki dış kutu |

```json
{"type":"onset","base":{"OLC_ALETSIZ":1},"hide":"OLC_GIZLE","events":[{"name":"halka","at":27.263,"region":"box:dip-halka*","hide":"dip-halka"}]}
```

**Sınıf eşiği (1.4, M-ONCU).** `tY` sayıysa bugünkü tek eşik aynen (özet ve satırlar önceki biçimde). Harita verilirse olay sınıfı `class` ‖ `kind` ile seçilir; eşleşme yoksa `default` (‖ 40). Değer sayı = mutlak |ΔY| eşiği; `{rel: k, min: 2, floor: 2}` = **göreli eşik**: pencere sonunda öğenin tam gelişmiş farkı (A/B: \|Y_A − Y_B\| kare `g1`; piksel: kare `g1` ↔ pencere öncesi `g0 − 1`, kaydırma telafisi yok → durağan kamerada) içinde `floor` üstü piksellerin ortancası × k, en az `min`. Bölgede fark yoksa satır "görünür başlangıç yok (göreli eşik: bölgede fark yok)". Satırlarda `tY` (çözülen), `tYClass`, `tYRel` (`rel`, `median`, `n`); özette "eşik sınıfı <sınıf> <eşik> (n)". k projede referans kliplerden kalibre edilir (M-ONCU); paket değer vermez.

```json
{"type":"onset","base":{"OLC_ALETSIZ":1},"hide":"OLC_GIZLE","events":"$__events","tY":{"default":40,"golge":{"rel":0.3},"isik":{"rel":0.3},"kilavuz":{"rel":0.5}}}
```

**A/B süresi ve kesilme (1.4).** A/B kipi A sayfasını pencerelerin toplamı kadar, her olay için B sayfasını ayrıca çizer: uzun filmde saatler sürebilir (kare × olay × ~s/kare). İlerleme satırı stderr'e (`A sayfası N kare · M olay`, `olay i/M <ad>`). Çizim kesilirse sonuç "ölçülemedi: A/B çizimi kesildi (olay i/M): <ileti>" — çöküş/kapanma/zaman aşımı iletisinde "zaman aşımı ya da dış kesme olası (kanca eksikliği değil)" eki; "kanca yok" yalnız kanca eksikliğidir. Uzun koşu arka planda başlar, üst sınırla beklenir (ÇK-09); süre `olay sayısı × pencere karesi × s/kare` ile önceden hesaplanır.

#### fc:velocity (23) — C1 hız sürekliliği
Kural: ZN-2, BAS-1, KM-5. Kanca: `__camSpeed`, `__shots` (shot sınırında dizi bölünür), `__tools`, isteğe bağlı `__boxes`. Önem: `error`.

Hamle = hız > `floor` koşusu; hamle başına tepe. Ardışık iki kare arası hız vektörü farkı |Δv| > max(`minDv`, `maxJump` × tepe) → sıçrama. Kalkış (0 → v) ve varış da sayılır: doğrusal kalkış ihlaldir. Araç ucu ve kutu merkezi **vektörle** ölçülür (hız sabitken 90° köşe |Δv| = √2·v); kamera skaler hızla (kanca). Kanca shot'un ilk karesinde 0 verdiği için her shot dizisinin ilk örneği atılır.

| parametre | varsayılan | anlamı |
|---|---|---|
| `of` | `["camera","tools"]` | + `"box:<ad>"` / `"kind:<tür>"` kutu merkezleri |
| `maxJump` · `floor` · `minDv` | 0,05 · 0,05 px/kare · 0,05 px/kare | tepenin payı · dinlenme tabanı · gürültü tabanı |
| `visibleOnly` | true | araç/kutu: iki kare de kadrajda |

inOutSine bir hamlede ilk adım ≈ tepe × π/N: %5 için hamle ≥ ≈ 63 kare @60 (1,05 s). Kısa rampalar (0,25 s) bu ölçüye takılır — kural bilinçli olarak sıkıdır (hız sıçraması = kusur).

**Bilinen fark (1.4).** Hamle = taban üstü koşu olduğundan ana yol bitip hız tabana inince **settle** ayrı bir "mikro hamle" olur ve C1 kendi küçük tepesine bölünür (pay ≈ 1 sahte sıçrama). Kural C'nin tanımında (M-C) settle ana hamlenin parçasıdır ve C1 ana hamlenin tepesine göre alınır; iki ölçü ayrışırsa kapı sayısı M-C'nin piksel izlemesidir (ölçüm tekleştirme), `velocity` satırı bilgi olarak yazılır ya da settle karelerine `review.velocity` kaydı düşülür.

#### fc:entryExit (24) — giriş/çıkış süresi
Kural: ZN-3. Kanca: `__tools` (evre adları), `__boxes` (`boxes` başvurusuyla seçilen; `vis` 0..1 görünür pay önerilir). Önem: `error`.

Görünür = kadrajla kesişiyor ve `vis` > 0. Giriş = koşunun ilk görünür karesi → tam görünür (kadraj içinde ve `vis` = 1) ilk kare; araçta koşu giriş evresiyle başlıyorsa giriş evresinin süresi. Çıkış simetrik. Ölçüm aralığının ilk karesinde zaten görünen nesnenin girişi, son karesinde hâlâ görünenin çıkışı ölçülmez. `vis` vermeyen kutu (kırpımla açılan kart, yazı) anlık (0 s) görünür — kanca `vis` vermelidir.

| parametre | varsayılan | anlamı |
|---|---|---|
| `minSec` | 0,4 s | giriş ve çıkış alt sınırı |
| `of` · `boxes` | `["tools"]` · — | araçlar · izlenecek kutu başvuruları (`kind:kart`, `box:S02-*` …) |
| `phases` | `{in: [gir, giris, giriş, in, enter], out: [cik, cikis, çıkış, out, exit]}` | evre dizgesinin boşlukla ayrılmış parçalarıyla eşleşir (`"S01-kalem gir"`) |

#### fc:moves (25) — hamle/shot sayısı (UYARI)
Kural: ZN-4 (UYARI sınıfı). Kanca: `__camSpeed`, `__shots`. Önem: `warn`.

Hamle = shot içinde kamera hızı ≥ `floor` koşusu (aradaki < `mergeSec` boşluk birleşir, < `minRunSec` koşu sayılmaz). Shot başına hamle sayısı > `maxPerShot` ya da hamle süresi < `minSec` (verilirse) → UYARI.

| parametre | varsayılan | anlamı |
|---|---|---|
| `maxPerShot` · `minSec` | 2 · — | eşik parametredir; proje yükseltir/düşürür (ör. hamle ≥ 2,5 s) |
| `floor` | world `camera.k3.v` ‖ %2 ekran/s (0,64 px/kare @60) | hareketli kare tabanı (K3 ile aynı) |
| `mergeSec` · `minRunSec` | 0,25 · 0,1 s | birleştirme · en kısa koşu |

```json
{"type":"moves","maxPerShot":2,"minSec":2.5}
```

### §4.21 Bütün film bildirimi [ÖRNEK]

```json
"checks": [
  {"type":"temporal","at":"actBoundaries","window":12,"src":"master","maxRatio":1.5},
  {"type":"identical","ref":"master:out/master/FILM_v4.mov","frames":[0,100,200,239],"mode":"rgb48","expect":"same"},
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
  - `ink` — maske kipinde (`FX_INKMASK`; yalnız `selector` alt ağaçları açık zeminde) zeminden ayrışan koyu piksel: 480×270, luma < 200 (sabit), 3×3 kapanış ×3, leke ≥ 60 px. Maske kahramanın **bütünüdür** (çizim yığını tek nesne); en büyük bileşen yalnız bilgi. Zemin (kâğıt, panel) maskeye girmez.
  - `alpha` — aynı maske kipi, zemin rengi serbest: |luma − zemin luması| > 55 (zemin = kenar halkasının medyanı); koyu zeminde açık kahraman için.
- **Ölçüt:** alan oranı ≥ `areaMin` **ya da** yükseklik oranı (maskenin dikey kapsamı / H) ≥ `heightMin` (world'de yoksa araç 0,35 / 0,55 kullanır). Sahne `k1.*` world değerinin üstüne yazar; kural gereği yalnız yükseltir (araç denetlemez).
- **Display metin:** kahraman metin (`k1.lyricSelector`, varsayılan `[data-fx=write]`) ekran px ≥ `k1.lyricMin` (varsayılan 160) — `motion-render k1 <id> --lyric "METİN@t,…"`; tasarım zamanında `fc:framing` `lyric.minPx`.
- **Çıktı:** qc JSON K1 satırı (kare başı alan, yükseklik, geçti/kaldı); `motion-render k1` → `out/probe/<id>-k1.json`.

### M-K3 · sürekli kamera (K3)
**Sınıf (1.3): UYARI — kota** (RULES §0.8 KO-1). `fc:camera` K3 satırı tek başına kalırsa kontrol `warn` verir (`k3Gate: true` eski SERT davranışı), `ours` "kota altı" yazar; kapı kusur ölçüleriyle (BAS-1, ZN-2) karar verir.
- Kaynak: sahne kancası `__camSpeed(fps, n)` → kare başı kamera ekran hızı (dünya örnek noktalarının izdüşüm farkı büyüklüğü, px/kare). **Deterministiktir;** blok eşleme yavaş pan'ı sayamadığı için K3 kapısı pikselden değil kancadan ölçülür.
- **Mutlak eşik:** `TH = 0,02 · W / fps` px/kare (W = 1920 → 38,4 px/s; 60 fps'te 0,64 px/kare). Göreli eşik (tepenin %20'si) yavaş izlemeyi tutuş saydığı için **kullanılmaz**.
- Shot payı = (v ≥ TH kare sayısı) / shot kare sayısı; shotlar `ours`'ta manifest `shots[]` (sahne ya da `parent`; `af0`/`af1` ses zamanı önce, yoksa `f0`/`f1`), `fc:camera`'da `shots` parametresi (`[[ad, f0, f1]]` ya da `"$__shots"`). Eşik/hedef: sahne `k3` > world `k3` (`camMin` 0,02, `movingMin` 0,4). Geçer: her shot pay ≥ 0,4 (hold ≤ 0,6) **ve** perde OURS hareketli ≥ 0,4.
- Hariç: sessiz kuyruk (kural), `profile: "typographic"`.
- Animatikte: kanca render fps'inden bağımsızdır; piksel tabanlı ölçümde yer değiştirme `÷ (scale · step)` ile tam çözünürlük ve tek kare aralığına çevrilir.
- Sınırdaki shot (pay ≈ 0,4): varışı ~0,1 s geciktirmek çoğu kez yeter (tasarım zamanında `--cand` ile sınanır).

### M-PARITE · kalite paritesi (1.3)
`motion-render parite --ours <kareler> --ref <kareler>`: grup sayısı (E kenar/ink elemanları, 24 px @1080 genişletmeyle birleşen bileşenler), ink payı
(L* < 35; `inkContent` yalnız yüzey dışı grupların ink'i — dış kutusu kare eninin/boyunun ≥ %90'ı olan yüzey grubu kahraman olamaz), içerik ve negatif alan payı (≥ %2 tek yüzey bölgeleri), kahraman/ikincil kutu oranı, luma, isteğe bağlı aksan payı; medyanlar ± tol (varsayılan
%20), tek yönlü sınır `--ust/--alt` (ör. sadelik serbest: grup ve ink yalnız üstten). Referans kalite içindir, kimlik değildir; reviewer kalibrasyonunda
(motion-reviewer §3.0) ve ilkel/style frame kapısında bilgi olarak kullanılır (`--gate` ile kapı).

### M-OURS · referansa karşı profil
- `motion-render ours <id> [--step N] [--no-cam] [--dir D]`.
- Piksel profili: `fast` yolu (480×270 gri), blok 16 px, arama ± 6 px, 2'şer örnek; dokusuz blok (varyans < 40) atlanır; kare hareketi = blok yer değiştirmelerinin ortalaması; "hareketli" bilgisi th = max(0,5, 0,2 · tepe) px (yalnız bilgi).
- Ölçüler: shot uzunluğu, hareket yoğunluğu, kontrast dağılımı, hold oranı, ortalama luma.
- `--step N` yalnız **örnekler** (60 fps'te 2 = 30 fps örnekleme); kareleri bölmez. (Kaynakta adım bütün kareleri bölüyordu: 0,753 ↔ doğrusu 0,614.)
- `--no-cam`: kancasız birleşik film dizini.
- Taban: hareketli ≥ 0,4, hold ≤ 0,6. Referans profili projede [ÖRNEK: shot 1,67 s · hold 0,38 · hareketli 0,62 · luma %37,5].

### M-STEP · kamera basamağı (BAS-1)
- `v_i` = `__camSpeed`; `Δv_i = |v_i − v_{i−1}|`; basamak: `Δv_i > stepJump` (px/kare, proje fps'inde; araç ölçeklemez — 60 fps'te 2,5 px/kare ≡ 150 px/s ani hız değişimi). Sayım = 0 olmalı.
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
- `__camK(fps, n)` → kare başı kamera ölçeği k. `ss = k < --k` (varsayılan 0,5); aralıklar ± `--pad` kare genişletilir; sınır ağırlığı W2 = ½ − ½·cos(π·u), u = maskenin ± `--blend` kare kutu ortalaması. World `supersample.k2x/pad/blend` değerleri `ss2`'ye bayrakla verilir (araç world'ü okumaz).
- W2 > 0 aralıkları `--scale 2` (etiket `ss2`), W2 < 1 aralıkları 1× (etiket `ss1`); birleştirme: 2× → 2×2 kutu ortalaması sRGB'de `(a+b+c+d+2) >> 2`; 0 < w < 1 → `round(A·w + B·(1−w))`; 1× → kopya. Birleştirme sonrası `expo-post` kaydı sıfırlanır (kareler ham).
- `pad`/`blend` kare cinsindendir (world'de 60 fps'te yazılır; [ÖRNEK] 6 = 0,1 s). `ss2 <id> --frames a-b` yalnız pencereyi yeniden çizer (plan bütün sahne için aynı); `--plan` yalnız planı yazar.
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
- Bayat (`motion-render imgdiff stale <id>`): probe ↔ kayıtlı kare ortalama mutlak farkı > 0,01 (/255 ölçeğinde) **ve** kare, sahne kodunun (sayfa + `x-import` dosyaları + yerel `<script src>`) son değişikliğinden eski → `out/probe/<id>-staleness.json`, çıkış 3. Tek kare probe pişirme zamanlaması nadiren ≈ 0,09/255 gürültü verir → probe tekrarlanır ya da 2 karelik dizi kullanılır.
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
- `motion-render live [<sayfa>] --qc [--seconds 20] [--wav t.wav] [--fps 60]`: test WAV'ı Chromium'un sahte mikrofonuna verilir, sayfa gerçek zamanlı koşar; ölçüm sayfanın `window.__live.metrics` kancasından → `out/probe/live-qc.json` + `.md` (çıkış 0 geçti · 3 kaldı · 1 ölçülemedi).
- **Kare hızı:** ortalama **ve** 1 s kayan pencerelerin p5'i ≥ hedef fps (%0,5 tolerans).
- **Gecikme:** ses olayından ilk tepki karesine (+ 1 kare sunum payı) p95 ≤ 100 ms (geçersiz örnek 0).
- **Düşen kare:** kare aralığı > 1,5 × (1000/fps) ms olan aralık sayısı = 0.
- **Tetik gecikmesi:** tuş olayı → tepki karesi p95 ≤ 100 ms.
- `--capture det`: aynı WAV'dan elle sürülen kare kare yakalama → `out/live/capture.mp4` (canlı profilin animatiği); bu kayıt üzerinde kare araçları (qc/kontak) koşturulabilir. `--capture rt` yalnız ön izleme.

### M-REV · bağımsız ölçüm (RV-3)
- motion-measure ve motion-reviewer yapanın sayılarını **referans almaz**; aynı kuralı kendi yöntemiyle (farklı ölçüm yolu, farklı rasterleyici/ölçek, farklı kare kümesi ya da kendi küçük betiği) ölçer ve farkı raporlar. Ölçüm ağırlıklı kapıda istem açıkça "yapanın `out/probe/` sayılarını okuma; kendi betiğini yaz" der.
- Yazım yalnız kendi çıktı klasörüne (reviewer: `out/review/<kapı>/`; measure: ajan tanımındaki ölçüm klasörü); proje/sahne dosyasına dokunulmaz.
- Sonuç biçimi: sayı + yeniden üretilebilir yöntem + kırpım + ölçüt karşılaştırması (`geçti` / `kaldı` / `ölçülemedi`).
- Önce kendi aracının öz-hatasını sınar (M-SELF): aynı içerikte ≈ 0,995 / fark ≈ 0.
- Ölçüm ağırlıklı kapılar (marka varlığı, K1, S× kenar, ses kayması) bağımsız ölçüm olmadan geçmez.

### 1.4 ölçüleri: hareket, vuruş, nesne, zaman-saflık

Aşağıdaki ölçülerin eşikleri **world/proje alanıdır** (çoğu `world.json` `plan` bloğunda — `plan-check` bu bloğu okur; diğerleri motion-measure ve reviewer'ın okuduğu ölçü tanımıdır, araç okumaz). "[referans ölçümü (kaynak proje)]" etiketli sayılar bir projede ölçülmüş değerdir: başlangıç önerisidir, paket varsayılanı değildir; yeni projede kalite referansından yeniden ölçülür. Her ölçünün sonucu sayı + yöntem + kanıt (tablo, JSON, kırpım) biçimindedir (M-REV).

### M-C · kural C: kamera hamlesi, piksel izleme (1.4)
Kural: ZN-6. Eşikler world `plan.moves` (`peak` [alt, üst] px/kare, `visibleS` [alt, üst], `maxJump`, `settleS`; sınıf başına `classes`). [referans ölçümü (kaynak proje): tepe 8–14 px/kare @60, görünür süre ≥ 1,0 s, C1 ≤ %5, varışta settle 0,28 s.]
- **Kaynak:** ölçülen kare dizini (animatik ya da render). Kanca/DOM (`__camSpeed`, plan) yalnız **beklentidir**; kapı sayısı pikselden.
- **İzleme** (ardışık kare çifti başına tek kamera hareketi, iki kabul edilen yöntem): (a) **LK alt piksel** — sağlam (Tukey IRLS) Lucas–Kanade, ≥ 3 seviye piramit, model u = t + ds·(x − c) (**öteleme + ölçek**), bütün kare; ekran-sabit katmanlar (lyric, süpürme) sağlam ağırlıkla dışlanır, ağırlıklı alan payı raporda. (b) **Baskın küme vektörü** — dokulu bloklarda alt piksel blok eşleme; her vektörün ± ε içindeki blok sayısı, en kalabalık kümenin ortalaması = kamera (zemin düzlemi) hızı; paralaks katmanları (yükseltilmiş kart, ön plan) ayrı kümede kalır. Blok vektörü **büyüklüklerinin medyanı kullanılmaz**: iki derinlik kümesi arasında geçiş yapıp hız serisini basamaklandırır.
- **Birim:** px/kare @1080, proje fps'inde (merkez noktası; ölçek hamlesinde köşe tepesi ayrı sütun) · görünür süre s · C1 oran.
- **Hamle** = hız > taban koşusu (taban = hamle dışı ölçülen hız tabanının p95'i; raporda). **Tepe** = hamlede en büyük hız (3 kare ortalamalı seri; ham seri raporda). **Görünür süre** = kümülatif yolun %10 → %90 arası (ara değerli kare ÷ fps). **C1** = ardışık |Δv| en büyüğü ÷ **ana hamlenin** tepesi — kalkış, varış ve **settle ana hamleye dahildir** (ayrı mikro hamle sayılmaz). **Settle** = varıştan sonra hızın tabana inişine dek süre + ters yön tepesi. Sürüklenme (tepe alt bandın altında uzun koşu) ve sert varış (settle'sız dinlenme) ayrı satır.
- **Kalibrasyon (M-SELF):** ölçülen karenin bilinen kayma/ölçekle sentetik kopyası + ekran-sabit yama → hata (px @1080, ölçek) raporda; tek kare hız belirsizliği ve hamle dışı hız tabanı (p50, p95). Tepe ↔ eşik marjı kalibrasyon hatasından küçükse sonuç "sınırda" yazılır.
- **Ölçüm tekleştirme:** yapan, motion-measure ve reviewer aynı ölçüde ayrışırsa yöntem tekleşir: aynı kare aralığı, aynı özellik noktası (merkez ya da köşe), aynı izleme; kapıda **tek sayı**, yöntem raporda. `fc:velocity`/`fc:camera` (kanca) ve `plan-check` `moves` (plan) beklentidir.
- **Kanıt:** kare başı t/ds JSON · hız profili (SVG; bant çizgileri, %10/%90 işaretleri) · kalibrasyon JSON · hamle tablosu `hamle · kareler (görünür %10–90) · tepe (köşe) · görünür s · yol px (plan) · ters tepe · sürüklenme · sonuç`.
- **Plan karşılığı** (`plan-check` `moves`, render yok): uçları tutuşlu tek hamle kare kare örneklenir. Kübik Hermite: tepe ≈ 1,5·L/N, C1 ≈ 4/N, görünür ≈ 0,61·N kare; beşinci derece: tepe ≈ 1,875·L/N, C1 ≈ 3,08/N, görünür ≈ 0,51·N (L yol px, N kare). C1 ≤ %5 kübikte N ≥ 80 ister; o sürede tepe ≥ p için yol ≥ p·N/1,5 — kısa yol + kısa süre kural C ile çelişir, çözüm yolu uzatmak (ya da profil) storyboard'dan önce görülür. Aşma/settle fizibiliteye girmez.

### M-SEYAHAT · seyahat hamlesi (1.4)
Kural: ZN-6 (sınıf). Yüzeyden yüzeye geçiş hamlesi: **crane-up → travel → crane-down** (yüksel · taşı · in) tek sürekli hamle. Görünür süre bandı ve tepe tavanı **sınıfa göre** world alanıdır (`plan.moves.classes.<sınıf>`: `visibleS: [alt, üst]`, `peak: [null, tavan]`; hamle `class`). [referans ölçümü (kaynak proje): görünür 1,5–2,5 s, tepe ≤ 25 px/kare @60.] Ölçüm M-C ile aynı yöntem: evreler ölçek kanalından (ds, crane) ve öteleme kanalından (t, travel) ayrı okunur; tepe, görünür süre ve C1 bütün seyahat üzerinden. Sürüklenme ve sert varış GEÇMEZ. Kanıt M-C tablosunda `sınıf` sütunuyla.

### M-CANLI · tutuş canlılığı, doku-normalize (1.4)
Kural: Z6, UCUZ-7. Tutuşta "nefes mi sallantı mı" sorusunu dokudan bağımsız sayıya çevirir (dokulu yüzey aynı hareketle daha çok fark üretir).
- **ham** = eylem sonrası son 15 kare @30 (60 fps'te 30 kare, 2 kare adımla) ardışık kare ortalama mutlak luma farkı (/255, bütün kare) medyanı;
- **G** = aynı karelerde Sobel gradyan büyüklüğü ortalaması (gri) medyanı;
- **normalize** = (ham / G) ÷ (ham / G)_referans; referans = projenin onaylı tutuş penceresi (world `motion.liveness.ref`: `{dir, frames: [a, b]}`, @30 eşdeğeri 15 kare);
- **bant** normalize değere uygulanır, world'den (`motion.liveness.band`); ham bilgi. [referans ölçümü (kaynak proje): bant 0,3–1,9.]
- Kanıt: pencere başına `ham · G · ham/G · normalize · en düşük fark · bant · sonuç` + referans satırı; öz-denetim: referansın kendisi normalize = 1.

### M-VURUS · vuruş ağırlığı (1.4)
Kural: ZN-7 (KAPI), ZN-3, ÇEN-1.
- **Vuruş başlangıcı** = olayın ilk görünür karesi (fc:onset; planda olay `t`). **Öncü (ön olay)** = vuruşun fiziksel öncüsü (düşen gölge, ışık, kör baskı kılavuzu …): **ayrı vuruş değildir**, vuruş sayımına girmez (planda `of: <vuruş id>` + `class`).
- **Öncülük** = vuruş başlangıcı − öncü başlangıcı (ms; kare ızgarasında kare farkı, M-IZGARA); sınıf başına bant `plan.leads.<sınıf>: [min, max]` (ms). [referans ölçümü (kaynak proje): gölge 60–70 ms, ışık 120–150 ms, kılavuz ≈ 420 ms.]
- **Eşzamanlılık ve aralık:** aynı anda (ızgarada aynı kare) ≤ `plan.beats.maxConcurrent` vuruş başlangıcı; ardışık başlangıçlar arası ≥ `plan.beats.minGapMs`. [referans: ≤ 1 · ≥ 120 ms.] Çakışmada ses çapalı olay (a0) ve shot sınırı kaymaz; nesne vuruşu kayar.
- **Giriş süresi sınıf başına:** `plan.entry.<sınıf>: {in, out}` (s) — ZN-3'ün sınıflı hâli; tutuş penceresi (vuruştan sonraki vuruşun öncüsünün başına dek) world/proje alanı.
- **Muafiyet sınıfı** (yalnız proje sahibi kararıyla, olay başına): (a) perdenin/filmin ilk vuruşu (öncesinde kadraj yok); (b) fiziksel öncüsü olmayan olay türü (ışıksız kadraj dışı giriş, sesle gelen yazı); (c) öncüsü anlatıyı değiştirmeden kurulamayan olay — sayıyla gösterilir (ör. ışık yönü gölgeyi örtünün altına düşürüyor). **Kayıt:** plan olayında `exempt: true` + gerekçe alanı; `project.md` faz kararında `olay · sınıf · gerekçe · karar`; ölçüde `review.onset: [[a, b, "muaf: <karar>"]]`. plan-check muafları `beats.exempt`'te listeler; muaf olmayan eksik öncü kusurdur.
- **Ölçüm:** plan → `plan-check` (`beats`, `leads`, `entry`; `--fps`); render → fc:onset A/B (vuruş ve öncü ayrı olay, öncü göreli eşikle — M-ONCU), öncülük = iki satırın `onset` kare farkı; giriş fc:entryExit (sınıf başına bildirim).
- **Kanıt:** `vuruş · başlangıç kare · öncü sınıfı · öncü kare · öncülük kare/ms · bant · önceki başlangıçtan aralık · durum`.

### M-ONCU · yumuşak öncü görünürlük eşiği (1.4)
Kural: ZN-5, ZN-7. Mürekkep/nesne için kurulan tek mutlak eşik (|ΔY| ≥ 40/255, ≥ 12 px) yumuşak öncüyü **geç** sayar: gölge rampası çapada düşük farkla başlar, mutlak eşiği ana vuruşla aynı karede geçer ya da hiç geçmez → öncülük 0 ya da "yok" ölçülür. **Yöntem:** fc:onset `tY` sınıf haritasında öncü sınıflarına göreli eşik `{rel: k}` — eşik = öğenin tam gelişmiş farkının (pencere sonu) bölge ortancası × k (MEASURE §4 fc:onset). **Kalibrasyon:** k, projenin kalite referansı kliplerinde aynı ölçüyle (A/B, aynı pencere) öncülüğü referansta ölçülen değere getirecek biçimde seçilir; yöntem + sayı `project.md` ölçü tanımına proje sahibi onayıyla yazılır; o zamana dek mutlak eşik. Raporda eşik sınıfı ve çözülen eşik (satır `tYClass`, `tY`).

### M-LYRIC · lyric yazımı pikselden (1.4)
Kural: ÇEN-1, ZN-3, ZN-7. Kelime başına; ölçüm kutusu = kelimenin mürekkep kutusu + pay (komşu kelimenin kuyruğu/aksanı kutuya girerse kutu daraltılır, raporda):
- **ilk mürekkep karesi** = fc:onset yöntemiyle (tercihen A/B: kelime gizli ↔ açık, mürekkep eşiği) ilk görünür kare; a0 → ilk mürekkep ≤ 1 kare (ÇEN-1);
- **son mürekkep karesi** = kutudaki mürekkep pikseli sayısının son değerinin ≥ %98'ine ulaştığı ilk kare (yazım cephesi bitti);
- **yazım süresi** = son − ilk (kare ÷ fps); alt sınır ve ekran süresine oranı world/proje alanı (`plan.entry.lyric.in`, ekran payı ölçü tanımında). [referans ölçümü (kaynak proje): ≥ 0,34 s/kelime · ≤ ekran süresinin %60'ı.] Plan tarafı kare ızgarasında (M-IZGARA; 0,34 s @60 → 21 kare, ilk kare ⌈a0·fps⌉).
- Kanıt: `kelime · a0 · ilk · son · kare · s · ekran payı · durum` + kelime başına kare şeridi (ilk − 1 … son + 1).

### M-IZGARA · kare ızgarası (1.4)
Kural: ÇEN-1, ZN-3, ZN-7. Plan saniyededir, render kare ızgarasındadır: ms eşiği ızgaraya düşünce kısalır (120 ms @60 = 7,2 kare; 7 kare = 116,7 ms). `plan-check --fps N [--round ceil|round|floor]`:
- **olay anı → ilk görünür kare:** `ceil` (varsayılan) ⌈t·fps − 10⁻⁶⌉ (t anında başlayan öğenin ilk çizildiği kare) · `floor` ⌊t·fps + 10⁻⁶⌋ (kare-kesin olay, MT-3) · `round`;
- **eşik → kare:** alt sınır (≥) yukarı ⌈s·fps − 10⁻⁶⌉ (0,12 s → 8 · 0,34 s → 21 kare @60), üst sınır (≤) aşağı ⌊s·fps + 10⁻⁶⌋; [alt, üst] bandı kareye çevrilince boşsa (alt > üst: bant bir kareden dar) "öncülük bandı kare ızgarasında boş" kusuru;
- **aralık, öncülük, evre süresi, hamle karesi** ilk görünür kare farkından; senkron = kare(t) − kare(a0) ∈ [0, `syncFrames`];
- kota (boş pencere, yoğunluk, kapsam, sınır vuruşu) saniyede kalır.
- **Yuvarlama yönü sonucu değiştirir** (aynı plan ceil/round/floor ile farklı sayıda bant dışı öncü verir): yön raporda (`grid: {fps, round, thresholds: [{name, s, frames, dir}]}` + .md başı satırı) ve render ölçüsüyle (fc:onset ilk görünür kare) aynı tanım seçilir.

### M-AKSAN · aksan sayımı: world sınıfı ve plaka dışı (1.4)
Kural: AK-3, AK-4, AK-5, AK-9.
- **Sınıf world'dedir** (`world.classes`); qc, fc ve `manifest validate` aynı kaydı okur — sahne `accent` sınıfı world'de açıkça yazılır. Fotoğraf/ışıkla gölgelenmiş aksan (iplik, boya) sabit RGB eşiğinin altına düşebilir (gölgede sinyal azalınca kenar karışımı ikincil sınıfa kayar; hareket bulanıklığı bir aralığı ikiye böler): world sınıfı gölgelenme aralığını kapsayacak biçimde **ölçülerek** yazılır — aksan çekirdek piksellerinin tamamı sınıfta, plaka paletinde yanlış pozitif 0.
- **ΔE2000 tabanlı sınıf seçeneği:** hedef renge ΔE2000 ≤ e, C* ≥ c, ton açısı [h0, h1] — gölgelenmeye RGB eşiğinden dayanıklı; değerler world'de.
- **Yeniden aydınlatılmış aksan rengi (AK-5):** ham ΔE2000 yanında en iyi çarpımsal kazanç k sonrası ΔE ve Δh° ayrı sütun (k aralığı yapılandırılır); eşik ham ΔE'de kalır, gölgedeki parça bileşimi sayıyla açık karar olur (eşik değişmez).
- **Plaka dışı (A/B):** plakanın (fotoğraf zemini) kendi pikseli aksan sayılmaz. B = aynı kare yalnız plaka (içerik katmanı `opacity` 0, ataların dönüşüm/süzgeci aynen; `visibility` yolu süzgeçli gizli atada kareyi siyah bırakabilir). A'da sınıfta olan piksel \|A − B\|∞ ≤ tol ise plaka pikselidir, sayımdan düşer; içerik aksanı plakanın üstüne düşse de değeri B'den ayrışır, sayımda kalır. Sonra standart `fc:accentLocation` (izinli kutular, kota, `maxOutsidePx` aynen) düzeltilmiş kareyle: eşik değişmez, değişen yalnız sayılan pikselin kaynağıdır.
- Kanıt: kare başı `sınıf px (A) · plaka px · kalan · izinli kutu dışı` + plaka ayrımı kırpımı.

### M-ZS · zaman-saflık (1.4)
Kural: MT-11, MT-1, RH-5.
- **Kök neden:** Chromium kalıcı DOM düğümlerinde boya/raster önbelleğini yeniden kullanır. Seek render'ında bir karenin çıktısı **önceki karelere** bağlı olabilir: hareket sırasında (süzgeç, hareket bulanıklığı açık) çizilmiş bir kare, sonraki durgun karelerde aynı düğümün rasterini değiştirir → ortadan başlayan render ile tam render aynı karede farklı çıkar (küçük ama sıfır değil: ort. ≈ 0,01–0,03/255, p99 1/255, kenarlarda birkaç /255). JS durumu yoktur; MT-1 kodda sağlansa da çıktı geçmişe bağlıdır. Küçük sabit dönme ve "görünmez boya geçersizlemesi" farkı küçültür, sıfırlamaz.
- **Çözüm:** içerik ağacı her karede **taze** kurulur (sahne içerik kökünün React anahtarı kare başı değişir); görüntüler **gösterim boyutunda** çizilir. Süre maliyeti ölçülür (kare süresi önce/sonra).
- **Tanık kare protokolü:** (1) tam render (kare 0'dan) ↔ (2) ortadan başlayan render (hareket sonrası durgun bir kareden) → tanık karelerde `imgdiff` 0 (bit-aynı); (3) kısmi render öncesi ve sonrası aynı tanıklar; (4) fark varsa probe dizileriyle geçmiş daraltılır (yalnız kare 0 → N · hamle içi kare → N · kamera duruşta). Tanıklar: her hamlenin varış sonrası 2 karesi + her shot/perde sınırı.
- Kanıt: `tanık kare · başlangıç karesi · ort · p99 · maks /255 · sonuç`.

### M-PROBE · probe belirsizliği (1.4)
- Tek kare probe **geçmişsizdir** (sayfa o kareye doğrudan seek eder): zaman-saflık hatasını (M-ZS) göstermez. Probe ↔ render farkında sıra: M-ZS → asenkron kaynak (RH-10) → bayatlık (M-STALE).
- `--eval` sayfada **bir kez** değerlendirilir (kare başı değil); kare başı değer için `--frames` + kanca ya da frame-check.
- `--scale` bellek sınırı: büyük ölçekte (ör. 4×) büyük süzgeçli/karışımlı katmanlar raster belleğini aşıp **sessizce** eksik çizilebilir (karenin bir kısmı siyah, süzgeç uygulanmamış) → büyük ölçekli çekimde siyah alan / süzgeç eksikliği denetlenir; olmazsa döşemeli çekim ya da 1× karenin en yakın komşu büyütmesi (yalnız görsel kanıt, ölçü değil).
- Probe sayısı render kararını vermez; probe ↔ render farkı raporda ayrı satırdır.

### M-KENAR · nesne kenarı (1.4)
Kural: NK-1. Ayrı üretilip matte ile yapıştırılmış ya da yerel düzenlemeyle eklenmiş nesnenin kenarını (yumuşatma, greni kesilmiş kenar, sınır çizgisi) yakalar.
- **Profil:** silüete dik ışınlar; **4× kırpımda** ölçülür (alt piksel), **@1×** bildirilir; doğrusal Y.
- **Matte genişliği:** w_matte = √(w² − w_taban² − w_optik²); w = %10 → %90 geçiş genişliği; **w_taban** = aynı yoldan (kırpım, ölçek, kodlama) geçen keskin sentetik kenarın w'si (ölçüm yolunun kendi bulanıklığı, M-SELF); **w_optik** = nesnenin kendi odak bulanıklığı (nesne içi kenarlardan aynı yöntemle).
- **Hale** = dış 0–6 px bant ↔ 12–36 px bant medyan farkı (/255).
- **Gren sürekliliği** = yüksek geçiren (σ ≈ 1,5 px) varyans oranı, kenar bandı (4–10 px; 0–6 px bandı kenar sızıntısı taşır) ↔ uzak bant (12–36 px); ≈ 1 beklenir.
- **Büyütme oranı** = nesnenin üretim çözünürlüğünden ekran boyuna büyütmesi. **Gölge temas boşluğu** (px) = nesne tabanı ile temas gölgesi arasındaki açık şerit.
- **Gövde sınıfı:** **düz** kenar → w_matte sınırı uygulanır; **yuvarlak** gövde (silindir, pah) → kenar dışı hale (kenardan birkaç px dışarıdaki luma tümseği) ve terminatör (ışıktan gölgeye düşüş) genişliği **kaynak plakaya göre ±%20** — mutlak eşik yok; kaynak = nesnenin onaylı kaynak plakası; gren yine oranla.
- **İç içe kenarlı nesne** (çerçeve, cam, parlama): yalnız **silüet** (nesne ↔ yüzey sınırı) ölçülür; nesne düzeyi silüetin 2–4 px içi medyanı, kontrastı düşük profil dışlanır; w_optik iç kenardan.
- **Kenar kaydı:** nesne başına **lamba tarafı + gölge tarafı**; taraf başına 6 başlangıç noktasının medyanı; taraf **≥ 10 ışınla** geçerli (altı "ölçülemedi"); dış bant komşu nesneye/gölgeye değerse 12…(açıklık − 2) px; gren ölçütü kâğıda bakan lamba tarafında, gölge tarafı bilgi; plaka kabulü ham plakada ve ekrandaki kesim çıktısında aynı ızgarayla.
- **Eşikler** world alanı (`world.edge`: `matteMaxPx`, `haloMax`, `grainRatio`, `upscaleMax`, `contactGapPx`, `bodyClass`; örnek `library/photo-plate/world.json`). [referans ölçümü (kaynak proje): w_matte ≤ 1 px @1× · hale ≤ 2/255 · gren 1/1,5…1,5 · büyütme ≤ ×1,25 · temas boşluğu 0 px; w_taban ≈ 1,6 px.]
- Kanıt: nesne × taraf tablosu `w · w_taban · w_optik · w_matte · hale · gren · büyütme · temas · ışın` + 4× kırpım sayfası.

### M-ASKIDA · temas bandı, askıda nesne (1.4)
Kural: UCUZ-17, NK-2.
- Girdi: nesne silüeti (dikdörtgen, daire ya da alfa + dönüşüm; `__boxes` `kind: obj` ya da proje listesi) ve gölge yönü (lamba modeli ya da fotoğrafın ışığı).
- Gölge tarafında silüet kenarından dışarı **L(d)** profili, d = 1…24 px (doğrusal Y, ışın medyanı).
- **Temas bandı** = (L_ref − min L(1…2)) / L_ref · **gölge** = (L_ref − ort. L(3…6)) / L_ref · L_ref = d 20–24 ortalaması (gölgenin ötesi, aynı yüzey). **Göreli eşik** (koyu yüzeyde /255 farkı küçük kalır; yüzey parlaklığına bölünür); eşikler world (`world.edge.contact`: `bandMin`, `shadowMin`). [referans ölçümü (kaynak proje): temas ≥ %6 · gölge ≥ %3.]
- **Askıda** = temas bandı yok **ya da** gölge yok.
- Kenar ötesinde yüzey değişirse (kâğıt → masa; L_ref bandı ile 1–6 bandı farklı yüzeyde) **"ölçülemedi"**.
- Kanıt: nesne başına `temas % · gölge % · L_ref · yüzey · sonuç` + profil kırpımı.

### M-DIKIS · maskeli bölge dikişi (1.4)
Kural: NK-1 (yerel düzenleme kabulü). Maskeli bölge üretiminde (nesne ekleme/düzeltme; plakanın kalanı sabit) maske sınırı boyunca dik profil, üretilmiş ↔ ham plaka:
- **kalınlık** = sınırda görünür çizginin piksel satırı sayısı (ışın boyunca, komşu zeminden |ΔY| > zeminin yüksek geçiren std'sinin 2 katı olan ardışık pikseller);
- **luma basamağı** = sınırın iki yanındaki 4–8 px bantların medyan farkı (/255);
- **maske dışı sabit:** maske dışı ↔ ham plaka farkı 0, kayma 0 px (NCC).
- Eşik world/proje alanı. [referans ölçümü (kaynak proje): kalınlık ≤ 2 satır · luma ≤ 10/255.]
- Kanıt: sınır boyunca örnek profil tablosu + 4× kırpım.

---

## §6 M-GRADE · grade zincirleri world verisidir

Core'da grade değeri yoktur; `world.json` → `grade: {chain: "dark" | "light" | "lab" | "none", params: {...}}`. Zincir seçimi: sahne `grade.chain` → world `grade.chain` → world adı eşlemi → `dark`. `lab` = açık laboratuvar (vinyet yok, sıcak parlak yok, nötr-soğuk siyah 8/9/10). Koyu zinciri aydınlık dünyaya uygulamak kanvası kirletir — zincir bu yüzden world'e aittir.

**Zincir yapısı (sıra bağlayıcı):**

| adım | `dark` | `light` | `none` |
|---|---|---|---|
| 1 eğri | hafif S `curves` | yumuşak `curves`, beyaz < 1 | — |
| 2 renk dengesi | `colorbalance` (yalnız `keep` karelerinde) | `colorbalance` (hafif) | — |
| 3 vinyet | `vignette` — **siyah noktasından ÖNCE** (yoksa köşe tabanı siyah noktasının altına iner) | zayıf `vignette` (world vinyetsizse yok) | — |
| 4 siyah noktası | `colorlevels` (yalnız `keep` karelerinde) | yok (`grade.blackPoint` varyantı hariç) | — |
| 5 çıkış | `scale=out_color_matrix=bt709:out_range=tv` + libx264 CRF 14 `yuv420p` + bt709 primaries/trc/colorspace etiketleri + `+faststart` | aynı | aynı |

- **Saf pencere:** `keep = n ≥ head ve n < frames − pure`; `pure` = son `pureSec` (world `grade.params`; araç varsayılanı 0,4 s; `slice` 0), `head` = `blackStart` ise kare 0. Aydınlık zincire film siyahı sahne `grade.blackPoint` ile eklenir. Renk dengesi ve siyah noktası saf karelerde kapalı; eğri/vinyet her karede.
- **`grade.fadeOut [n0, n1]`:** tam zincir ↔ saf zincir karışımı `A·(1−K) + B·K`, `K = clip((n − n0)/(n1 − n0), 0, 1)` — inişli sonda tek kare basamağını önler (animatikte n0/n1 ölçeklenir).
- **Animatik** aynı zincirle (BT.709 matrisi uygulanarak; kaynakta animatik encode'u 709 etiketli ama matrissizdi — düzeltildi).
- **Doğrulama:** son kare max 0 (`cut:"light"` hariç) · koyu zincirde grade'li min ≈ siyah noktası · süre ve kare sayısı · `qc film` sahne ile sahne arası ortalama/siyah noktası tutarlılığı · aydınlık zincirde kanvas grade sonrası ± 3.
- **`expo-post`** (zincirden önce): sahne içi küçük pozlama değişimi ve siyaha iniş kayan noktada; inişte TPDF dither, sahne içi düşüşte duruk dikdörtgen ± 0,5 LSB; 8-bit'e yuvarlama.

`world.json` örneği [ÖRNEK — parametre adları `lib/grade.mjs`: `curves`, `colorbalance`, `vignette` (açı | null), `black` ([r,g,b] | null), `pureSec`; kodlayıcı ayarı sabittir (CRF 14), world'den gelmez]:

```json
"grade": { "chain": "dark", "params": {
  "curves": "0/0 0.25/0.24 0.5/0.505 0.75/0.745 1/1",
  "colorbalance": "bs=0.02:bh=-0.02",
  "vignette": 0.6,
  "black": [10, 9, 8],
  "pureSec": 0.4 } }
```

Kütüphane world'lerinin gerçek zincir değerleri `skills/motion-world/library/<ad>/world.json`'dadır; kopyalanmaz, ölçülür (YR-2).

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

**1.4 ölçü alanları** [ÖRNEK — değerler referans ölçümüdür (kaynak proje), varsayılan değildir]. `plan` bloğunu `plan-check` okur (blok/alt blok yoksa o denetim atlanır); `motion.liveness`, `edge` (kenar, dikiş, temas) ölçü tanımıdır (motion-measure ve reviewer okur, araç okumaz):

```json
{
  "plan": {
    "entry":  { "kalem": { "in": 0.15, "out": 0.25 }, "kart": { "in": 0.30, "out": 0.70 }, "lyric": { "in": 0.34 } },
    "beats":  { "maxConcurrent": 1, "minGapMs": 120 },
    "leads":  { "golge": [60, 70], "isik": [120, 150] },
    "moves":  { "peak": [8, 14], "visibleS": [1.0, null], "maxJump": 0.05, "settleS": 0.28, "profile": "cubic",
                "classes": { "travel": { "peak": [null, 25], "visibleS": [1.5, 2.5] } } }
  },
  "motion": { "liveness": { "band": [0.3, 1.9], "ref": { "dir": "out/frames/<onaylı sahne>", "frames": [150, 179] } } },
  "edge": { "matteMaxPx": 1, "haloMax": 2, "grainRatio": [0.667, 1.5], "upscaleMax": 1.25, "contactGapPx": 0, "seam": { "rowsMax": 2, "lumaMax": 10 },
            "contact": { "bandMin": 0.06, "shadowMin": 0.03 } }
}
```

Zorunlu (`manifest validate` hata verir): `band`, `k1.mask`. Ölçüm için tanımlanır (validate denetlemez; yoksa araç varsayılana düşer): `k1.selector` (`[data-hero]`), `k1.areaMin`/`heightMin` (0,35 / 0,55), `accent.class` (`signal`; sahne `accent` sınıfı `classes`'ta yoksa validate hata), `accent.color` (`fc:accentColor` hedefi; yoksa yalnız çift karşılaştırma). `band` yoksa qc bant kontrolü HATA verir; değer uydurulmaz. Hangi aracın hangi alanı okuduğu: CONTRACT §3 tablosu. Ölçülemeyen SERT kural geçmiş sayılmaz: kapı açılmaz, önce world tamamlanır (look-dev, PLAYBOOK §4.3).
