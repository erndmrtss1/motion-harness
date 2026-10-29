# Değişiklikler

Sürümleme: [semver](https://semver.org/lang/tr/). Plugin sürümü `.claude-plugin/plugin.json`, render paketi `render/package.json`.

## 1.3.0-dev — dal `feat/craft-1.3` (yayımlanmadı)

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

