# Değişiklikler

Sürümleme: [semver](https://semver.org/lang/tr/). Plugin sürümü `.claude-plugin/plugin.json`, render paketi `render/package.json`.

## 1.4.0 — 2026-11-05

Konsolidasyon + herkese açık yayın. Bir kaynak projenin ölçülmüş bulguları (PN-104…148) genel yetenek olarak pakete taşındı: set yöntemi,
ilkel mekaniği, ölçüm tanımları, orkestrasyon ve araçlar. Proje içeriği (sözlük, plakalar, kareler, kredi değerleri, proje sahibinin metinleri,
kişi/hesap/yol) girmedi; kaynak projeden gelen her sayı ya world/proje alanıdır ya da "referans ölçümü (kaynak proje)" etiketlidir. Depo MIT
lisanslıdır ve herkese açık yayına hazırlandı. Testler 38 → 77 (`cd render && npm test`).

### Uyumluluk (önce okuyun)

- **Render yolu değişmedi.** `render`, `probe`, `ss2`, `encode`, `grade`, `page.mjs` ve çalışma zamanı (`motion-core.jsx`, `motion-stage.jsx`,
  `motion-runtime.js`) 1.3.0 ile aynıdır. Parite üçlüsü 1.3.0 ↔ 1.4.0 birebir (aynı makine, focusfx-paper demo): smoke 12/12 kare md5 farkı 0 · demo anahtar kareleri k90, k144 imgdiff 0 · demo 180/180
  kare (1920×1080) md5 + framemd5 farkı 0 · x264 mp4 md5 aynı. Yeni mekanik ilkeller ayrı dosyadadır (`shared/motion-mek.jsx`).
- **Ölçüm davranışı değişen yerler:**
  - frame-check `temporal` eşik üstü **bütün** kareleri listeler; incelendi kaydı kare başına uygulandığından eskiden `warn` olan bir koşu `fail` olabilir.
  - `pop` arama sınırına dayanan aday artık `fail` değil `warn`.
  - `sharpness` bölge tanımı yokken aksan kotası 0 ise ya da `red` pikseli eşik altındaysa "ölçülemedi: bölge tanımı gerekli" yazar (eskiden ilgisiz sıcak bölgeyi eşleyebiliyordu).
  - `frame-check --only` çıktısı `out/probe/<id>-fc-only-<tipler>.json` (tam kaydın üstüne yazmaz; `--out` ile değiştirilir).
  - `plan-check` varsayılan çıktısı `out/probe/plan-check-<olay dosyası adı>.{json,md}` (eski sabit `plan-check.json`).
- **contact:** `--fstep` → `--page-step` (anlamı aynı: disk karesi başına sayfa karesi). `--fstep` takma ad olarak çalışır, uyarı basar; etiket sahne
  süresini aşarsa çıkış 2 (adım 1 animatikte `--fstep 30` etiketleri ×30 yazıyordu). Hücre aralığı `--step`'tir.
- **Git geçmişi yeniden yazıldı** (yayın öncesi gizlilik): commit SHA'ları değişti. Var olan klonlar `git pull` yerine
  `git fetch origin && git checkout -B main origin/main` ile güncellenir; eski SHA'ya bağlı denetimler (ör. proje `tools/render-oncesi` tabanı)
  yeni SHA'ya çekilir.

### Set yöntemi (photo-plate)

- **`skills/motion-world/library/photo-plate/SET.md`** (yeni; `lessons.md` §7; `world.json` `set` · `edge` blokları):
  - "Set üretilir, içerik çizilir" (SET-1…8): katmanlı plaka (arka · orta · ön); masa ve ön plan nesnesi plakanın parçası, zeminle aynı üretimde,
    DOM'a nesne kesiği yok; still ve klip aynı set kaydı; plakada referans zorunlu (seed yoksa).
  - 2.5D derinlik haritası (dilim ya da sürekli çarpıtma; DoF objektif modelinden) · fiziksel paralaks k(z) = H_c / (H_c − z), keyfi katman çarpanı değil.
  - Set ışığını okuma: yön = en parlak %3'ün ağırlık merkezi, sıcaklık = beyaz nokta (temiz yüzey blokları), merkez/kenar oranı; **tek lamba yeri**
    (film boyunca tek nokta, her set kaydının `lamp` bloğunda; director değiştirmez); eşleme **yalnız karartmayla**; düşen gölge oranı o = min(1, ortam / L).
  - "Bütünlük = ışık + tasarım dili, envanter değil"; `set.json` şeması; plaka kabulü (malzeme `ingest-kapi` + kenar + yerleşim + yer/boy ± tolerans
    + bölge dışı + dikiş + askıda); büyük masa ve set geçişi kalıbı; tuzaklar W-41…49.
- **GENAI §17 maskeli bölge üretimi + §18 istem kalıpları:** bölge üretimi varsayılan (plakanın kalanı sabit); yer tutucu + ölçek referansı zorunlu
  (onaylı plaka üstüne düz gri şekil + temiz plaka; düzenlemede metinle konum tarifi tutmaz); yer/boy kabul toleransı; model ↔ yöntem ayrışması
  (sahneyi baştan kurma NCC ile ölçülür, çıktı boyu → büyütme ≤ ×1,25); işaret değil maske; iki aşamalı yöntem; deneme ≤ 3, sonra yöntem değişir
  (açık karar) · **negatif liste** (istemde seri/stüdyo/sanatçı/marka/referans proje adı yok; malzeme/ışık/lens tarifi) · düz doku istemi bağlam +
  kırpım · istemsiz araç modelleri · seed yoksa `image_references`. CATALOG'a çıktı boyu, seed, maske sütunları; istek alanları `method`, `place`,
  `mask`, `attempt`, `accept.set`. RULES GEN-23, GEN-24.

### İlkel mekaniği

- **`skills/motion-world/references/ILKEL.md`** (yeni, ILK-1…12): sprite ilkeli — 9 dilim (köşe sabit, kenar tek eksen, merkez iki eksen; doku
  gerilmez, kırpılır/döşenir), gösterim boyutunda çizim (raster bir kez; CSS ölçeğiyle büyütme yok), ölçekten bağımsız doku, küçük nesne doku
  politikası, ışık sprite'tan değil sahneden, tek gölge + temas bandı · nesne/ön plan kuralı a–f · nesne kenarı kuralı + gövde sınıfı (düz / yuvarlak
  / iç içe) · askıda nesne (**UCUZ #17**) · dikiş · ilkel kütüphanesi onayı → film (PLAYBOOK §4.4a).
- **`render/runtime/motion-mek.jsx`** → projede `shared/motion-mek.jsx` (`MH.mek`; motion-core'dan sonra yüklenir; stilden bağımsız):
  - `sweep` (süpürme: out / in / through; ön olay; yamuk hız profili; kadraj dışında hız sürer; tam örtme penceresi + `swap(T)` ile altta set
    değişimi; `window()` → `MH.mek.hooks.windows` ile frame-check `pop` `exclude`).
  - `fold` (menteşeli kalın kâğıt katlama: θ(t), ön olay, 4 menteşe, yüz değişimi, kalınlık şeritleri, zemin izi, gölge kaydı; yüzler dışarıdan).
  - `travel` / `chain` (seyahat: crane-up → travel → crane-down; tek sürekli C1 yol, varış hızıyla settle, `peakMax`/`fit`, `dof(T)`, `hook()` → `__camSpeed`).
  - Profil ailesi (hermite, quintic C2 — ivme/tepe ≈ 3,08/N, yamuk), her ilkelde `plan()` raporu (tepe, C1, görünür süre); `MHMoBlurK` (tamsayı
    ötelemeli kutu çekirdeği, isteğe bağlı); `raster` tabanı (dinlenmede tam 0 yazılmayan dönme/öteleme, isteğe bağlı).
  - `motion-test` hazır testleri `mek-supurme` · `mek-katlama` · `mek-seyahat`; `-hiz.json` `design` (tasarım hızı) + `plan`. Test `render/test/mek.test.mjs` (8).
- **CRAFT-REF şablonu §5 "Genel referans"** (FocusFX ölçümü — varsayılan değil): easing ailesi, ivme/tepe·N tablosu, nesne sınıfına göre giriş–iş–çıkış
  süreleri, geçişler, kamera, yazı, zanaat göstergeleri, taşınabilir ilkel tablosu; atıflar `skills/motion-world/library/focusfx-paper/` ve `motion-mek.jsx`.
  **PATTERNS K-55** kadrajı örten süpürme · **K-56** kalın kâğıt katlama · **K-57** seyahat hamlesi.

### Ölçüm

- **MEASURE §5'e 13 ölçü (1.4):** M-C kural C piksel izleme (tepe px/kare @1080, görünür süre %10→%90, C1 ana hamle tepesine göre, settle; LK alt
  piksel / baskın küme vektörü, öteleme + ölçek; DOM yalnız beklenti, kapıda tek sayı) · M-SEYAHAT seyahat hamlesi sınıfı · M-CANLI tutuş canlılığı
  doku-normalize · M-VURUS vuruş ağırlığı (ön olay sınıfları, aynı an ≤ 1 başlangıç, aralık eşiği, ön olay ≠ vuruş, muafiyet sınıfı) · M-ONCU yumuşak
  öncü görünürlük eşiği (referanstan kalibre) · M-LYRIC yazım pikselden · M-IZGARA kare ızgarası · M-AKSAN aksan sayımı world sınıfı + plaka dışı
  (A/B) · M-ZS zaman-saflık (kök neden: Chromium kalıcı DOM düğümlerinde raster yeniden kullanımı; çözüm: içerik ağacı her karede taze, görüntü
  gösterim boyutunda; tanık kare protokolü) · M-PROBE probe belirsizliği · M-KENAR nesne kenarı (w_matte = √(w² − w_taban² − w_optik²), hale,
  gren sürekliliği, büyütme, gövde sınıfı) · M-ASKIDA temas bandı (göreli eşik) · M-DIKIS dikiş (kalınlık ≤ 2 satır, luma ≤ 10). Eşikler world
  alanıdır (`plan`, `motion.liveness`, `edge`); §8 örneği.
- **frame-check** (`render/lib/fc/*`; test `render/test/measure-14.test.mjs`): `sharpness` bölge kuralı + özet satırında ölçülen bölge sınıfı/kutusu ·
  `pop` arama sınırı adayı (`warn`) + `searchMax: "auto"` · `onset` `tY` sınıf haritası ve yumuşak öncü için göreli eşik, A/B ilerleme satırı, kesilme
  "kanca yok"tan ayrıldı · `temporal` tam liste · `--only` ayrı dosya. Tip sayısı 25 (yeni tip yok).
- **plan-check:** world `plan` blokları (yalnız tanımlıysa) `entry` (sınıf başına giriş/çıkış) · `beats` (eşzamanlılık, aralık, öncü `of`, muaf
  `exempt`) · `leads` (öncülük bandı) · `moves` (kural C fizibilitesi: kübik C1 ≈ 4/N, beşinci derece ≈ 3,08/N; seyahat sınıfı); `--fps`/`--round`
  kare ızgarası. Blok ve `--fps` yoksa sonuç 1.3 ile aynı.
- **RULES:** ÇK-17 ölçüm eşiği yalnız proje sahibi kararıyla · ÇK-18 araç kısıtı içeriği şekillendirmez (araç düzeltilir) · ÇK-19 estetik metrik
  kapı dışı · ÇK-20 verim V1–V8 + belge hijyeni · ZN-6 kural C · ZN-7 vuruş ağırlığı · §8.2 NK-1 nesne kenarı (gövde sınıfıyla) · NK-2 temas · MT-11
  zaman-saflık · UCUZ-17 askıda nesne · DUR-12 hareket kontağı · DUR-13 "kredi yüzünden" satırı dolu (DUR 13 tetik). UCUZ taraması 12 işaret
  (#1–#11, #17; proje ek maddeleri #12–#16, #18…).
- **LESSONS L-228…L-250:** Chromium/runtime (kesirli SVG metin y'si, kök ölçek ≠ 1 parıltısı, tek parlaklık süzgeci basamağı, `feOffset` yuvarlaması,
  dinlenmede alt piksel → tamsayı netleşme, seek'te raster yeniden kullanımı, `feGaussianBlur` σ < 0,8, `rotate(0deg)` raster yolu, büyük CSS ölçek,
  SVG id çakışması, süzgeç yüzeyi küçülmesi, MoBlur "over" bileşimi, DoF süzgecinin kalkması) · ölçer sınırları · süreç (stdin betiği yetim süreç).

### Orkestrasyon

- **Roller ve kapı ilkeleri** (PLAYBOOK §2.1, §3.3; ADR-026): ana oturum = kapı/QA; director = sanat yönetmeni brief'iyle tek tasarımcı-uygulayıcı
  (`templates/BRIEF-DIRECTOR.md`, estetik ölçüt yalnız brief §1, ≤ 30k token); ölçüm ajanı iş başına ≤ 3 madde, tek tur; reviewer referans klip yan
  yana zorunlu, still ve klip ayrı reviewer, iş başına ≤ 3 soru, sayısal estetik şartı bilgidir, şart satırı nesne tanımıyla. Kapı ≠ brief; kapı
  sınıflaması (kusur · uyarı · bilgi · kapı dışı); "kredi yüzünden yapılmadı / kabul edildi" satırı zorunlu (doluysa DUR).
- **Verim V1–V8** (PLAYBOOK §3.4, ADR-027): değişim-odaklı ölçüm (her iş değişiklik listesiyle başlar), tam tarama ve taze reviewer yalnız kilometre
  taşında (`/motion:gate --ara` ara adım kapsamı), istisna raporu ≤ 40 satır (geçenler tek satır tablo), retro/dersler faz sonunda tek seferde, DUR
  yalnız geri dönüşü pahalı kararda — gerisi **bilgi kontağı** (dosya gönderilir, akış sürer), kilitli kurallar listesi. `templates/RAPOR.md` iki biçim
  (istisna · kapanış).
- **Hareket kontağı adımı** (PLAYBOOK §4.5 Adım 6a, reviewer `hareket` kapısı, DUR-12): tam render'dan önce bütün hamle ve mekanikler referans kliple
  yan yana tek videoda (`motion-render contact motion`) → "DUR — hareket".
- **Kesinti ve makine** (PLAYBOOK §2.6, ADR-029): uzun görevde her adım sonunda commit + `docs/CHECKPOINT-<görev>.md` satırı; kesinti sonrası artefakt +
  ledger mutabakatı, tanık kare ve süreç listesi denetimi; DUR öncesi arka plan süreç taraması; aynı anda tek render + `tools/render-oncesi`; harness
  geliştirmesi kurulu klonda yapılmaz. Ölçüm ve reviewer ajanlarına yalnız `out/` altında Write (stdin betiği yok).
- **Belge hijyeni — md zehirlenmesi karşıtı** (PLAYBOOK §3.5, ADR-028): `project.md` tek güncel spec (üstü çizili satır / silinti notu kalmaz),
  karar metni aynen `docs/KARAR-TARIHI.md`'de (yeni şablon), özü `project.md` §11 karar tablosunda; `CLAUDE.md` ≤ 60 satır (şablon 82 → 45); brief
  token tavanları; `celiski-tara` commit kapısı; yeni şablonlar `KARAR-TARIHI.md`, `BRIEF-DIRECTOR.md`, `PAKET-NOTLAR.md` (init `docs/`'a kopyalar).

### Araçlar

- **`motion-render celiski-tara [--rapor] [--ek a.md,b.md] [--config docs/celiski.json]`** (`render/lib/celiski.mjs`): bağlayıcı belge kümesinde
  (a) arşivlenen terim etkin satırda · (b) üstü çizili / KALDIRILDI / GEÇERSİZ / iptal izi · (c) aynı kural anahtarı farklı değerle (metin + json
  alanı) · (d) olmayan göreli yol · (e) brief > tavan (≈ ceil(kod noktası / 3)). Listeler `docs/celiski.json`'dan; çıkış 0 / 1 / 2. Commit kapısı
  `.githooks/pre-commit` (`git config core.hooksPath .githooks`).
- **`tools/render-oncesi.ps1` · `tools/render-oncesi.sh`** (init kopyalar): kurulu harness klonu beklenen tabanda (`tools/harness-taban.txt` ya da
  parametre) ve temiz mi + başka Playwright Chromium / ffmpeg süreci var mı → 0 temiz / 1 engel. Klon yolu sabit değil (`-Klon` →
  `MOTION_HARNESS_CLONE` → `motion-render --where` → `npm prefix -g`); kullanıcı yolu çıktıda maskelenir.
- **`motion-render contact motion <id>`** (hareket kontağı): hamle pencereleri `auto` (`__camSpeed` + frame-check `moves` koşu tanımı) ya da plan
  (`camera.moves`), ± pad; `--ref` ile yan yana; hamle etiketi tepe px/kare @1080 · görünür süre %10–90 · C1 en kötü; mp4 + json + kontak PNG.
- **`contact --page-step`** (yukarıda) · **`motion-render --where`** (paketin koştuğu klonun kökü) · `help` komut başına tek satır tanım.
- **init:** `docs/celiski.json`, `.githooks/pre-commit`, `tools/render-oncesi.*`, `.gitattributes`, `shared/motion-mek.jsx`; bitişte hooksPath ipucu
  (git yapılandırmasına dokunmaz).
- **doctor:** "kurulu klon" satırı — motion-render'ın koştuğu checkout temiz ve main/sürüm etiketinde değilse ✗ (zorunlu değil); git worktree ve
  zip kurulumu atlanır.
- Testler `render/test/tools-14.test.mjs` (9), `docs-world.test.mjs` (8), `docs.test.mjs` (+5).

### Yayın

- **MIT lisansı** (`LICENSE`; `plugin.json` ve `render/package.json` `license`). **README** herkese açık okura göre: ne olduğu, sıfırdan kurulum
  10 adım (Node, Git, Claude Code, ffmpeg, Playwright Chromium, Linux sistem kitaplıkları), örnek world + örnek sahne, Higgsfield'ın isteğe bağlı ve
  kullanıcının kendi hesabıyla kullanımı, katkı ve sorun bildirimi. İndirme: `git clone` ya da GitHub Release zip.
- **`examples/ornek-plan/`**: `plan-check` için olay planı + kural dosyası örneği (kusur 0 · kota 0).
- **`.gitignore`**: çıktı, kanıt, `.env`, ledger/manifest, plakalar, kişisel sahne kayıtları ve bütün medya (kare, klip, ses) izlenmez.
- **Gizlilik taraması** (`dev/privacy-scan.mjs --history --remote=<uzak>`): içerik taramasına ek olarak commit **üst verisi** (yazar/committer/
  tagger e-postası, commit ve etiket mesajları, ref adları), token ve iş/hesap kimliği desenleri, genel mutlak yol ve **uzak ref'ler** (refs/pull/*
  dahil; yerel geçmişte olmayan nesneyi gösteren ref bulgudur). Yayın öncesi geçmiş `git filter-repo` ile yeniden yazıldı: kimlikler GitHub
  noreply adresine eşlendi, mutlak yol taşıyan bir belge tüm geçmişten çıkarıldı.

### PN eşlemesi

| PN | 1.4 | nerede / kalan |
|---|---|---|
| PN-104 | kapandı (1.3) | install plugin-sync + doctor "plugin metinleri"; 1.4'te korunur |
| PN-105 | kapandı (kod) | plan-check `entry` sınıf haritası |
| PN-106 | açık (1.5) | `loadWorld(sceneId)` sahne başı world |
| PN-107 | açık (1.5) | parite içerik maskesi yerel zemine göre |
| PN-108 | kapandı (belge) | GENAI §18.2 düz doku istemi |
| PN-109 | kısmi | motion-test `design` profili + L-249; SAD eşleşme kalitesi eşiği 1.5 |
| PN-110 | kısmi (belge) | GENAI §18.4; `gen` `type: "tool"` / `policy.tools` 1.5 |
| PN-111 | kısmi (belge) | GENAI §18.5 + CATALOG seed sütunu; `gen --dry` bilinmeyen parametre uyarısı 1.5 |
| PN-112 | kısmi (belge) | M-AKSAN world sınıfı; ΔE2000 sınıfı kodu 1.5 |
| PN-113 | kısmi (belge) | M-ASKIDA + UCUZ-17 + NK-2 (bağımsız ölçüm); fc tipi 1.5 |
| PN-114 | kapandı (belge) | GENAI §17.2 yer tutucu kalıbı; `gen req` yardımcısı 1.5 |
| PN-115 | kapandı (belge) | M-ASKIDA yöntemi |
| PN-116 | kısmi (belge) | M-AKSAN; `accentColor` `relit` kodu 1.5 |
| PN-117 | kapandı (kod) | plan-check `moves` fizibilitesi + `MH.mek` quintic profil, `plan()` |
| PN-118 | kapandı (belge) | LESSONS L-228…230 |
| PN-119 | kısmi | L-231 + isteğe bağlı `MHMoBlurK`; çekirdek `MHMoBlur` parite için değişmedi |
| PN-120 | kısmi | L-232 + `raster` tabanı; `temporal` küresel sıçrama ayrımı 1.5 |
| PN-121 | kapandı (kod) | fc `sharpness` |
| PN-122 | kısmi (kod) | `pop` aday işareti + `auto`; ölçek değişiminde kutu ölçeklemeli eşleme 1.5 |
| PN-123 | kısmi (belge) | M-ZS + LESSONS + ILK-9; `imgdiff zs` 1.5 |
| PN-124 | kısmi (belge) | M-ZS (taze ağaç); `render --fresh-tree` 1.5 |
| PN-125 | kısmi (belge) | LESSONS + M-PROBE; `probe --scale` doğrulaması 1.5 |
| PN-126 | kısmi (belge) | M-KENAR + NK-1 + ILKEL §3; fc `edge` tipi 1.5 |
| PN-127 | kısmi (kod) | plan-check `beats` · `leads` · `entry` · `moves`; fc `entryExit` sınıf `minSec`, `moves` görünür süre/settle 1.5 |
| PN-128 | açık (1.5) | `render --range` dizin silme koruması (render yoluna 1.4'te dokunulmadı) |
| PN-129 | kapandı (belge) | GENAI §17.3, §17.7 |
| PN-130 | kısmi (belge) | GENAI §17.5–17.6; `gen` `mask` alanı, `--dry` çıktı boyu/büyütme 1.5 |
| PN-131 | kapandı (kod) | `frame-check --only` ayrı dosya |
| PN-132 | kapandı (belge) | V1–V8 PLAYBOOK §3.4 (V6 GENAI §17) |
| PN-133 | kısmi (kod) | çıktı adı olay dosyasından + `moves`/`beats` şeması; tutuş penceresi ve lyric ekran payı 1.5 |
| PN-134 | kısmi (belge) | M-AKSAN plaka A/B yöntemi; `accentLocation` A/B kodu 1.5 |
| PN-135 | kapandı (kod) | plan-check `--fps` kare ızgarası |
| PN-136 | kapandı (kod) | `temporal` tam liste |
| PN-137 | kısmi | L-235 + `noZero`/`raster` (isteğe bağlı) |
| PN-138 | açık (1.5) | velocity settle birleştirme; `MH.mek` `plan()` iki tanımı birlikte raporlar |
| PN-139 | açık (1.5) | `pop` tek yönlü ilerleme (MEASURE "bilinen açık") |
| PN-140 · PN-144 · PN-145 · PN-147 | açık (1.5) | grade son kare · qc metin kutusu ölçeği · entryExit `__events`'ten · lookdev-diff `--lib` |
| PN-141 · PN-143 | kapandı (belge) | LESSONS L-236, L-238 |
| PN-142 | kısmi (belge) | ILK-8 id öneki + L-237; DOM id çakışma denetimi 1.5 |
| PN-146 | kısmi (kod) | onset A/B ilerleme + kesilme ayrımı; A kareleri tekil çizim, 0,5 ölçek 1.5 |
| PN-148 | kapandı (kod) | onset sınıf/göreli eşik |
| (önceki) PN-49 · PN-85 · PN-96 · PN-98 | kapandı (belge) | checkpoint · şart nesne tanımıyla · süreç taraması · ≤ 3 madde/soru |
| (önceki) PN-67 | kapandı (belge) | makro/kompozisyon metriği kapı dışı, bilgi (ters yönde kapandı) |
| (önceki) PN-101 | kapandı (kod) | `tools/render-oncesi` + `--where` + doctor "kurulu klon" |
| (önceki) PN-36 · PN-48 · PN-55 · PN-56 · PN-57 · PN-65 | kısmi | still tazeliği adımı · set plakası profili · ILK-4 · doğruluk her render'da · W-48 · contact sözleşmesi |
| (önceki) PN-53 · PN-83 | açık (1.5) | anlatı yoğunluğu kapısı · style frame zaman damgası |

## 1.3.0 — 2026-10-30

Zanaat kapıları: ürün kalitesini hareket kalitesinden ölçen kusur kapıları ve araçlar (kimlik kuralı değil). Kaynak: proje bulguları PN-25…99
(kapanan PN'ler madde sonunda). Değerlendirme kanıtı `evals/craft-1.3/KANIT.md`.

- **frame-check zanaat kapısı (Katman D, 5 yeni tip; 20 → 25)** `render/lib/fc/craft.mjs`, RULES §8.1 ZN-1…ZN-5, MEASURE §4 Katman D:
  - `pop` (ZN-1): tek kare belirme/kaybolma — hareketle açıklanamayan değişimin aynı yönlü olay bölümündeki payı ≥ 0,5 (animatikte 0,75);
    geçiş pencereleri `exclude` (kare aralığı ya da `$__<kanca>`), ince şerit/geçiş/kesme ayrı listelenir.
  - `onset` (ZN-5, ÇEN-1'in ölçüsü): görünür başlangıç. **A/B kipi** (gizleme sözleşmesi: alet gizli ↔ öğe gizli, sayfa iki kez çizilir) kesin;
    piksel kipi kare dizininden, alet örtmesi olan satırı "belirsiz" (UYARI) sayar.
  - `velocity` (ZN-2): C1 hız sürekliliği, kamera (`__camSpeed`, shot sınırında bölünür) ve nesne (`__tools` uçları, `__boxes` merkezleri);
    ardışık |Δv| ≤ %5 hamle tepesi, kalkış/varış dahil.
  - `entryExit` (ZN-3): giriş/çıkış ≥ 0,4 s (ilk görünür → tam görünür; araçta giriş/çıkış evresi). Kanca `vis` (görünür pay) önerilir.
  - `moves` (ZN-4, UYARI): kamera hamlesi/shot, eşik parametre (varsayılan ≤ 2), isteğe bağlı hamle süresi tabanı.
  - Sayfa ölçümü `PAGE` iki yeni tür (`shapes`, `track`); `box:` başvurusunda sonda `*` önek eşleşmesi. CONTRACT §5: `vis`, `phase`,
    olay `region`/`hide`, geçiş penceresi kancası, gizleme global'leri. Testler `render/test/craft.test.mjs` (7). `npm test` Node 24 için glob'lu.
  - Kanıt: v3'teki üç bilinen kusur yakalandı — kart k1076 (`pop`, r1 kareleri), lyric k1159 (`pop`), pergel e37 +20 kare (`onset` A/B).
    Bilinen sınır: düşük kontrastlı küçük nesne (bant, 496 px²) `minPx` altında kalır.
  - Kapanan PN: **PN-99** (`frame-check onset` gizleme sözleşmesiyle + `pop` tek kare görünür alan payı).
- **`motion-render motion-test <ilkel> [--ref <klip>]`** (`render/cmd/motion-test.mjs`, `render/lib/motion-test.mjs`): world ilkeli (ya da hazır test
  sahnesi) için test sayfası üretir (prop'lar sabit ya da anahtar kare `[[t, değer, easing]]`), 3 s 1080p30 klip çizer; hız profili (px/kare @1080) ve
  ivme grafiği (SVG → PNG), C1 sıçrama özeti, 0,5 s kontak ve `--ref` klibiyle yan yana kontak + 1920×540 mp4. Hız iki klipte aynı yöntemle
  (değişen piksellerde SAD kaydırma vektörü; piramit + alt piksel) ölçülür, kesme kareleri ayrılır. Ağır iş kilidine dahil. Test
  `render/test/motion-test.test.mjs` (anahtar kare ara değeri, 6 px/kare kayma ölçümü, grafik/kontak). Kanıt KANIT.md madde 2.
  Kapanan PN: — (kaynak proje kararı: zanaat referans kliple; ilkel kütüphanesi kapısının aracı, madde 5).
- **Çekirdek araçlar (proje araçlarından genelleştirildi; projeye özgü grafik/marka kuralları çıkarıldı)** — CONTRACT §6, PLAYBOOK §4.4, GENAI §9.4,
  MEASURE M-PARITE; testler `render/test/core-tools.test.mjs` (4):
  - **`plan-check <events.json>`** (`lib/plan-check.mjs`): storyboard'dan önce olay planı. Kusur (çıkış 3): şema, senkron (0 ≤ t − a0 ≤ 1 kare),
    tek alet + ardışık alet boşluğu, giriş/çıkış ≥ 0,4 s, alet ekran hızı (yol / evre karesi ≤ `toolMaxPx`; gereken süre yazılır), sahne kancasındaki
    olay kimlikleri (`--refs`). Kota (UYARI): boş pencere, olay yoğunluğu, cümle kapsamı, sınır vuruşu. Kurallar world `plan` bloğu ‖ `--rules`.
  - **`seri-uret <girdi.json>`** (`lib/seri.mjs`): pivot kilitli süreklilik serisi (o_i = c_(i−1), kilitli pivot uçları yerel uç, tohumlu yürüyüş +
    ileri bakış); üretimden önce çözülebilirlik (zıt uçlu bitişik pivotlar arasında ≥ 2 öğe, adım bütçesi); projeye özgü geometri `--rule`; `--check`
    determinizm; `--js` sayfa aynası.
  - **`parite --ours … --ref …`** (`lib/parite.mjs`): kalite paritesi — grup, yüzey dışı ink (`inkContent`; tam en/boy yüzey grubu kahraman olamaz), içerik,
    negatif alan, kahraman oranı, luma (+ aksan) medyanları ± tol, tek yönlü sınır; bilgi (`--gate` ile kapı). Referans kalite içindir, kimlik değildir.
  - **`ingest-kapi <id|görüntü> --accept …`** (`lib/malzeme.mjs`): plaka = malzeme — doku std, ton eşlemesi (none/gain) sonrası palet ΔE2000, kimlik
    artığı, göz notu; GEÇTİ / GÖZ BEKLİYOR / KALDI. Kabul kümesi istek öğesinin `accept` alanından.
  - Kapanan PN: **PN-44** (ingest kapı paket komutu, kurallar dosyadan) · **PN-48** (`accept` makine-okur ölçü kümesi; kabul plaka = malzeme) ·
    **PN-67** (kalite paritesi aracı) · **PN-69** (seri: pivotlar arası ≥ 2 öğe, ileri bakış, çözümsüzlük onaydan önce) · **PN-80** (`plan-check`) ·
    **PN-81** (alet planlaması: giriş/çıkış süresi, ekran hızı → gereken süre, iki alet arası boşluk) · **PN-84** (kanca ↔ olay kimliği denetimi).
- **Reviewer kalibrasyonu ve animatik oynatımı** (motion-reviewer SKILL §3.0, §7.1; ajan tanımı, `/motion:gate` adım 5, şablonlar):
  - §0.6 puanı **referans kliplere görelidir**: kalibrasyon adımı zorunlu (referansı kendi yöntemiyle ölç → madde başı çıta → göreli puan).
    `project.md` §3 "Kalite referansı" tablosu boşsa reviewer durur (`DUR: kalibrasyon referansı yok`; kapı DUR-1, tur sayılmaz).
    KARAR'ın altına `kalibrasyon:` satırı; §0.6 tablosunda "çıta (referans)" sütunu.
  - Animatik kapısında **mp4 oynatımı**: kare dizininden bağımsız çözüm; her 0,5 s kontak + geçiş/giriş/çıkış pencerelerinde ardışık kare şeritleri;
    ölçüm mp4 üzerinde (`frame-check --mp4 … --only pop`, C1, giriş/çıkış). Kayıtta "Oynatım" satırı.
  - Test `render/test/docs.test.mjs` (KARAR düzenli ifadesi örnekle, kalibrasyon/oynatım adımları, ZN satırları ↔ fc tipleri). Kapanan PN: — (kaynak proje kararı: reviewer referans kliple kalibre, animatikte video izlenir).
- **Kota ölçütleri UYARI sınıfı; kapı yalnız kusur ölçer** (RULES §0.8 KO-1…KO-4): K3 hareketli pay / OURS, olay yoğunluğu, ekipman/bileşen sayısı (K6),
  sınır vuruşu. K3 ve K6 satırları SERT → UYARI (kota). `fc:camera` K3 satırı tek başına `warn` (`k3Gate: true` eski davranış); `ours` "kota altı
  (UYARI)" yazar. Rapor biçimi `kota (bilgi): …`. Kota için kusur eklemek (kısa hamle, işsiz alet) yasak; kusur kapısı ayrıca yakalar.
- **UCUZ #11 = kimlik, zanaat değil:** yalnız üç kimlik ekseni sayılır — **palet · iskelet (kompozisyon) · nesne dili** (malzeme, primitif/alet görünümü,
  tipografi ailesi); 3/3 VAR, 2/3 sınırda. **Zanaat (easing, süre, hız profili, mekanik: katlama, cetvel, kalem, kamera hareket grameri) kütüphaneden
  serbestçe örnek alınır.** RULES UCUZ-11 + §0.3, reviewer SKILL §4.1 ve eval kipi, motion-world SKILL, PLAYBOOK, şablon, ajan tanımı.
  Test `craft.test.mjs` (K3 kota → UYARI, basamakla → ihlal) + `docs.test.mjs`. Kapanan PN: — (kaynak proje kararı: kotalar uyarı, UCUZ #11 daraltma).
- **İlkel kütüphanesi onayı → film; brief ≠ kapı** (PLAYBOOK §4.0, §3.1, yeni §4.4a; `/motion:faz ilkel`; director ajanı; `templates/FAZ.md`,
  yeni `templates/CRAFT-REF.md`): sözlükten sonra filmin hareket mekanikleri world ilkeli olarak kurulur, `motion-test --ref` ile test edilir,
  taze reviewer QA'sından geçer ve kullanıcı onaylar (DUR-1); perdeler yalnız onaylı ilkellerle kurulur. Director brief'i tüm film bağlamını taşır
  (tüm sözlük + `docs/CRAFT-REF.md` + onaylı ilkeller; `BAĞLAM:` satırı); kapı listesi brief'e yazılmaz, kapılar işten sonra QA olarak koşar; kota
  hedef değildir. Test `docs.test.mjs`. Kapanan PN: — (kaynak proje kararı: director brief'i = sözlük + CRAFT-REF + onaylı mekanikler; kapılar QA).
- **Kurulum: plugin metinleri checkout'tan** (`motion-render plugin-sync`, `render/lib/plugin-sync.mjs`; `install.ps1` / `install.sh` adım 3, `doctor`):
  Claude Code plugin'i önbelleğe sürüm klasörüyle kopyalar; sürüm aynı kalınca (dal ucu, `-dev`) HK-40 sürüm karşılaştırması "güncel" der ve skill/ajan/
  komut metinleri eski kalır. Install betikleri artık sürüm adımından sonra `commands/`, `skills/`, `agents/`, `templates/`, `.claude-plugin/`,
  `render/runtime/` dosyalarını kurulu checkout'tan önbelleğe bayt bayt eşitler (eski dosya silinir; `render/` kodu global bağdan koştuğu için
  dokunulmaz); `doctor` "plugin metinleri" satırı farkı gösterir. Test `render/test/plugin-sync.test.mjs` (3). Kapanan PN: **PN-104**.

## 1.2.0 — 2026-10-19

Paket artık süreç **ve bir world kütüphanesi** taşır (HK-36). Kullanım: iki kişinin kendi projelerinde kullandığı araç; depo özel.

- **World kütüphanesi** `skills/motion-world/library/` (liste `INDEX.md`). `examples/` buraya taşındı.
  - **`focusfx-paper`** (HK-38): FocusFX FX-01'in üretim world'ü. world.json (v5), ilkel jsx (pafta, lab ışığı, kalem/rapido, cetvel, kılavuz,
    etiket, kamera düzeneği, enstrümanlar), lab grade, `lessons.md` (FocusFX §1–§28 kararları + world'e özgü dersler), `DECISIONS.md`,
    `SOZLUK-SABLON.md` (yalnız yapı). Yeni ilkel: `FXHatch` (mavi taralı vurgu), `FXLadder` (merdiven etiketleri, göreli `p_0 ±k`).
    3 s imza demosu (smoke bunu çizer). Eski örnek `fx-lab` bu world'ün damıtılmışıydı: ikileme kaldırıldı, `fx-lab` adı takma ad olarak çalışır.
  - Kütüphanedeki aksan renkleri **yer tutucu** (`#D8301A`): müşteri marka kırmızıları çıkarıldı (HK-37); aksan rengi projeden gelir.
- **UCUZ #11 yeni tanım** (HK-36): "seçilmemiş bir world'e ya da (yeni world kurulurken) önceki projeye benzerlik". Seçilmiş world'e benzerlik
  özelliktir. World seçilmiş projede look-dev üç yönü world içinde, yapısal eksenlerde ayrıştırır (motion-world §2.7); `lookdev-diff`
  "world içi" bayrağıyla palet/çekici uyarılarını bilgi sayar, iskelet uyarısı sürer.
- **`/motion:init --world <ad>`** kütüphaneden seçer; argümansız init listeyi sorar, headless'ta brief ön bilgisi `world: <ad>` (HK-39).
  `motion-render init` `origin: "library:<ad>"` yazar.
- **`/motion:promote --library <ad>`**: proje world'ünü ve derslerini kütüphaneye geri yazar, müşteri malzemesini ayıklar, `INDEX.md`'yi günceller (HK-39).
- **Kurulum güncellemesi** (HK-40): `install.ps1` / `install.sh` kurulu plugin'i `plugin.json` sürümüyle karşılaştırır; eskiyse
  `claude plugin marketplace update` + `claude plugin update`, aynıysa "güncel".
- **Gizlilik** (HK-37): pakete girmeyen = müşteri malzemesi (ad, logo, marka rengi, kare, ses, transkript, sözlük içeriği, seslendirme metni).
  Sahibinin üslubu, world kodu, dersler ve kararlar girer; "FocusFX" proje adı yazılabilir. Tarama müşteri terimleriyle daraltıldı.
- **Başlangıç rehberi** `docs/BASLANGIC.md` (HK-41): kurulum, ilk proje 10 adım, DUR, kapılar, world seçimi, kredi.
- LESSONS L-227 (world kütüphanesi ve yakınsama).

### 1.3 ve sonrası (1.1 yol haritasından taşındı, HK-42)
1. **İskelet SERT kapı için gösterim.** 1.1 betimleyicisinde (6×4 rol doluluğu, kareler arası ortalama) yön içi POZ en düşük 2,3, NEG en yüksek 2,1: marj 0,2, SERT için yetersiz. Kahramanlar kadraj ortasında toplandığı için ilgisiz düzenler 1,7–2,1 taban alıyor. Önsel (şans düzeltmesi) ve kareler arası maks bu tabanı söndürdü ama uzlaşılı pozitifleri de (sınıf hatası 2; L-226). Kare başına maks/medyan seçeneği ve daha geniş NEG seti değerlendirilecek.
2. **Canlı (bindirme) profil için silüet örtüşmesi ve en-boy kipi** (HK-23).
3. **Doku/çizgi dili ekseni:** kaynağa iskelet karşılaştırması (sayfası olmayan kontak) şu an ölçülemiyor.
4. **Koşucu yazma izni** oturum klasörüyle sınırlanacak; look-dev zaman kutusu.
5. **World içi look-dev'de kütüphane demosunun kopyası** (1.2 K3 bulgusu): seçilmiş world'ün demo sahnesini/kütüphane içeriğini birebir yeniden kuran yön UCUZ #11 tanımında yok (reviewer "seçilmiş world'ün malzemesi" sayıp açık karar yazdı). Kural ve `lookdev-diff`'e "kütüphane demosuna iskelet" karşılaştırması.
6. **`lookdev-diff` iskeleti tek kahraman zarfında:** sayfada kahraman tek [data-hero] kapsayıcıya düşünce iskelet skoru öğe dağılımını değil zarfı ölçüyor (1.2 K3 reviewer notu).
7. **`temporal` tüm diziye uygulanınca** 30 Hz gren (focusfx-paper) 60 fps'te zikzak üretir ve sıçrama sayılır; kontrol pencereli kullanılır (`at: first|last|actBoundaries`). MEASURE'a not.

## 1.1.0 — 2026-10-19

Look-dev ayrışması ölçüme bağlandı (H4 bulgusu; `evidence/1.1/K-1.1b.md`). İskelet eşiğinin marjı 0,2 (K1a), SERT kapı için yetersiz. Bu yüzden iskelet ekseni SERT değil **UYARI** olarak girdi: uyarı veren her çifte reviewer gerekçesi zorunlu (HK-33). Kapı uçtan uca denemesi (K4, HK-35) üç oturumda geçti: araç beklenen uyarıları verdi, reviewer'lar KARAR'ı `ayrışma:` ve `qc (bilgi):` satırlarıyla yazdı. Bir oturumda kapı denetimi gerekçesi eksik kaydı kabul etmedi, aynı turda taze reviewer açtı. Metrik işi 1.1'de kapandı; SERT kapı 1.2'de.

- **`motion-render lookdev-diff`**: look-dev yönlerinin sayfalarını render yoluyla açar.
  - **İskelet:** DOM'dan bileşen kutuları okunur (`__boxes(T)` ya da DOM yürüyüşü; `[data-hero]`, `[data-doku]`; ışık/vinyet katmanları ve tam kare katmanlar hariç). Kutular kahraman/bant/metin/kenar rolleriyle 6×4 doluluk haritasına dönüşür. Kareler arası ortalama alınır, kare başına değerler raporda; skor her karede tek rolden geliyorsa "(tek rol)" bayrağı konur. Önsel (şans düzeltmesi) ve kareler arası maks denendi, geri alındı (HK-33, L-226).
  - **Palet:** ekran görüntüsünden zemin ΔE2000 ve baskın renkler. Varsayılan çekici sözlüğü (terminal · defter · SaaS · sentez).
  - **Seçenekler:** `--ref` önceki proje ya da örnek kontağına karşı yalnız palet ölçer; `--pages` rastgele sayfalar. Çıktı `.json` + `.md` ve KARAR satırına `ayrışma:` parçası.
- **Kapı:** `/motion:gate` look-dev adımında aracı reviewer'dan önce koşar.
  - Reviewer SKILL §12 madde 6: iskelet UYARI (eşik 2,2; NEG n=4, eşik aralığı [2,1, 2,3]) ve palet UYARI (≥ 3,5) veren her çifte gerekçe zorunlu. KARAR satırı `ayrışma:` parçasını taşır (`templates/REVIEWER.md`).
  - Look-dev kapısında `qc` çıkış kodu kapıyı kilitlemez; sonuç kayıtta KARAR satırının altına `qc (bilgi):` satırı olarak girer (HK-34).
  - RULES YR-3 ve world SKILL'e look-dev sayfası sözleşmesi eklendi: kahraman `data-hero`, doku `data-doku`.
- **`manifest validate`:** LOOK sayfasında ve yüklediği `.jsx`'lerde `data-hero` ya da `__boxes` yoksa "iskelet ölçülemez" uyarısı.
- **LESSONS:** L-224 (piksel iskeleti dokuya batar; DOM'dan oku), L-225 (look-dev kapısına tam kare, kırpım değil), L-226 (ortada kahraman önseli gerçek iskelet ortaklığını söndürür).
- **Eval ve geliştirme:**
  - `evals/run-eval.mjs --seed <proje>` (kapı denemesi: hazır projeyle başla).
  - `dev/lookdev-calib.mjs` yalnız eşik kalibrasyonu yapar; ağırlık taraması yok.

## 1.0.0 — 2026-10-18

İlk sürüm: kaynak bir motion-grafik projesinin üretim **süreci** tek bir Claude Code plugin'i (`motion`) ve bir render/ölçüm paketi (`@motion/harness`, komut `motion-render`) olarak paketlendi. Üslup taşınmaz: her proje kendi world'ünü look-dev'de kurar.

### Plugin (`motion`)
- Komutlar: `/motion:init` (mülakat ya da ön-bilgili brief; `--profile`, `--world`), `/motion:setup`, `/motion:faz <audio|lookdev|lexicon|P<n>>`, `/motion:gate`, `/motion:master`, `/motion:promote`, `/motion:doctor`, `/motion:live`.
- Ajanlar: `motion-director` (yapan), `motion-research` (kaynak/sözlük/üretken istek), `motion-measure` (bağımsız ölçüm), `motion-reviewer` (her kapıda taze, salt-okur; hafızası `docs/REVIEWER.md`).
- Skill'ler: `motion-core` (SKILL + PLAYBOOK, RULES — 241 kural ve yaratıcılık kuralı, MEASURE — qc 16 kontrol + frame-check 20 tip, GENAI, AUDIO, DOCS-TEMPLATES, LESSONS — 225 core ders (219 kaynak + 6 eval ve 1.1), PATTERNS — 54 kalıp kartı "ilham/uyarı", DECISIONS — 16 ADR), `motion-world` (WORLD-SPEC + örnek world'ler: fx-lab, desk-paper, screen-dark, light-ui, photo-plate — ÖRNEK, varsayılan değil), `motion-reviewer` (§0.6 8 madde, UCUZ 11 işaret, tek düzeltme turu), `motion-live` (OBS canlı profil).
- Şablonlar: project.md, scenes.json, CLAUDE.md, KÜNYE, REVIEWER, RETRO, TESLİM, RENDER_REPORT, RAPOR, FAZ, SES-KAYMA, SÖZLÜK, ledger.
- Kurulum: `install.ps1` / `install.sh` (idempotent, adım adım ✓/✗), `uninstall.*`, `doctor.*`.

### Render paketi (`@motion/harness` 1.0.0)
- Kendi sayfa runtime'ı (`motion-runtime.js`, `motion-stage.jsx`) ve stilden bağımsız yardımcılar (`motion-core.jsx`).
- Harness (kare kare seek render, 2× süper örnekleme `ss2 [--frames a-b]`, watchdog, `--resume`, disk kuralı), grade/encode, expo-post (16-bit + TPDF dither), qc, **frame-check** (manifest bildirimli tek denetçi, 20 tip), ours/K3, K1, K6, kontak, imgdiff/bayatlık, master (ProRes 422 HQ + H.264, −16 LUFS), arşiv (FFV1 + framemd5), ses hattı (tts, transcribe, beats, amap, audio-diff), üretken varlık (gen, ingest + ledger), logo vektör hattı, vendor (React/Babel + Google Fonts lisanslarıyla), init, smoke, live (`--qc`, `--capture`), doctor.
- Göç testi (H2): kaynak projenin P4 (1×) ve P6 (2×) kareleri iki katmanda bit-aynı ya da ≤ 0,0001/255; ölçümler kaynak araçlarla aynı. Kaynak araçlardaki 14 hata taşınırken düzeltildi (`render/BEKLENEN-SAPMA.md`).

### Güvenli/çevrimdışı çalışma
- `MOTION_OFFLINE=1`: `vendor` ağa çıkmaz (yalnız önbellek); `MOTION_FONT_SOURCE=npm`: fontlar npm `@fontsource` paketlerinden (lisans metni paketten).
- `MOTION_NO_GENAI=1`: `gen`/`ingest` kilitli (yalnız bakiye okuma); `doctor` "üretken kilit" satırı.
- `MOTION_RENDER_LOCK=<dizin>`: aynı makinedeki birden çok oturumun ağır işleri (render, qc, frame-check, grade, master, live …) sırayla çalışır.
- Animatik kipi: `qc --step N`, `frame-check --step N` (etkin hız fps/N).
- `motion-render <komut> --help` komutu çalıştırmadan kullanımı basar.
- `templates/ADVISOR.md`: projeleri yukarıdan yöneten danışman oturumu için şablon.

### Eval (H4) sonrası düzeltmeler
Üç farklı brief'le iki tur headless eval (`docs/H4-EVAL.md`) şu düzeltmeleri getirdi:
- Etkileşimsiz (`claude -p`) oturumda ajanlar ön planda çalışır (LESSONS L-220); arka plan ajanı tur sonunda ölüyordu.
- Look-dev yön ayrışması: ayrışan eksenlerden en az biri yapısal olmalı (kamera, hareket grameri, kompozisyon iskeleti); "varsayılan çekici" görünümler (terminal · defter · SaaS · sentez) adıyla yazılır, gerekçe ister, üç yönden en çok biri (RULES YR-3, world §2, reviewer §4).
- GEÇMEZ (§0.6 evet < 3) sonrası look-dev'e dönülen iş, taze reviewer kapısından geçmeden ilerlemez; otomatik onay GEÇMEZ'i atlamaz.
- `tts --pad-to <s>`: sesi sessizlikle film süresine tamamlar.
- `live --out <dir>` ve şablon sayfada proje dosyalarının `/__project/` altından sunumu: canlı look-dev'in üç yönü (`--avatar world/avatar-<yön>.js`) ayrı klasörlere yakalanır ve ölçülür; canlı skill'e tarif.
- `doctor`: Chromium yoksa çevrimdışı kipte indirme önermez, DUR der (LESSONS L-221: paylaşılan Playwright önbelleği).
- `manifest validate`: canlı profilde boş `scenes` geçerli; `MOTION_LIVE.registerReaction()` ile projeye özel tepki.
- `contact sheet`: boş ya da klasör girdisinde kullanım mesajı.
- `evals/run-eval.mjs` (`--resume`, ağ/üretken yasakları, kanıt kopyası) ve `evals/score.mjs` (yol tekilleştirme, x/5 ve x/8 kapı skorları, bağımsız ölçüm betiklerinin ayrı sayımı).

### Eval tur 3 sonrası düzeltmeler
- `vendor`: unpkg/önbellek erişilemezse React/ReactDOM/Babel aynı sürümün npm paketinden alınır (`npm pack`, SRI aynı) ve önbelleğe yazılır. Çevrimdışı kip artık önceden dolu önbelleğe bağlı değil.
- LESSONS L-223 ve README: Claude masaüstü uygulamasının Terminal paneli `%LOCALAPPDATA%`'yı sanallaştırır (önbellekler boş/farklı görünür); kurulum ve uzun koşular normal terminalden.
- Reviewer: n = 5 (durağan) kapıda canlı eşiği 4/5; KARAR satırına dönüştürülmüş eşik yazılır.
- Eval: 12 s light brief'ler; koşucuda PowerShell aracı kapalı, tarayıcı indirmesi yerel kapalı porta yönlenir, plugin klasörüne yazma yasak; puanlayıcıda ağ komutu yalnız komut konumunda sayılır, ASCII yazılmış KARAR okunur.

### Bilinen sınırlar
- **Look-dev yön çeşitliliği doğrulanmadı:** üç turluk eval'de (`docs/H4-EVAL.md`) look-dev düzeyinde her turda 4 benzerlik ihlali; tur 3'te hiçbir oturum 150 dk'da teslime ulaşmadı. Kaynak projeyi taklit (UCUZ #11) her turda geçti.
- Kareler makineye bağlıdır: bit-aynılık aynı Chromium sürümü (Playwright 1.63.0 / Chromium rev 1243) ve aynı GPU/font ortamında geçerlidir.
- Whisper (faster-whisper) isteğe bağlıdır ve büyük model indirir; `tts` kelime zamanlaması yalnız Windows SAPI'de.
- Canlı profil ölçümü yoğun CPU yükünde (> %70) kare düşürebilir; QC bunu ayrıca raporlar.

## 1.1 yol haritası (planlanan; eval bulgularından)

1. **Ayrışma ölçümü araçla** (1.1'de UYARI olarak geldi; SERT kapı 1.2): `motion-render lookdev-diff` gibi bir araç, yönler arasında kompozisyon iskeletini (öğe kutuları, okuma sırası), zemin/palet ΔE2000'ini ve tipografi ailesini sayıyla karşılaştıracak. Yapısal eksen şartı ve varsayılan çekici denetimi reviewer'ın gözüne bırakılmayacak; kapı bu sayıya bağlanacak. Tur 3'te kural metin olarak paketteydi ama oturum reviewer'ları onu uygulamadı.
2. **Projeler arası hafıza olmadan çeşitlilik:** bağımsız oturumların aynı hazır görünümlere (krem kâğıt, koyu terminal, neon halka) yakınsaması. Örnek world'lerin etkisi ölçülecek; look-dev yönlerinin çıkış noktası brief'in kimlik zincirine bağlanacak.
3. **Teslime ulaşma süresi:** light profilde look-dev zaman kutusu, animatik ve kapı turlarının kısaltılması. Tur 3'te 12 s'lik film 150 dk'da master'a ulaşmadı; canlı look-dev 68 dk sürdü.
4. **Koşucu:** yazma izni oturum klasörüyle sınırlanacak (tur 3'te iki oturum yardımcı betiği geçici dizine yazdı); Terminal paneli sanallaştırmasının erken tespiti.
5. **Eval'i yeniden koşmak:** 1.1 değişiklikleri aynı üç brief'le ölçülecek. Ölçüt: en az bir teslim ve look-dev benzerlik ihlali 0.

