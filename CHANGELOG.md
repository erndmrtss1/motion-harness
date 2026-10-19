# Değişiklikler

Sürümleme: [semver](https://semver.org/lang/tr/). Plugin sürümü `.claude-plugin/plugin.json`, render paketi `render/package.json`.

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

### 1.2 yol haritası (1.1'den)
1. **İskelet SERT kapı için gösterim.** 1.1 betimleyicisinde (6×4 rol doluluğu, kareler arası ortalama) yön içi POZ en düşük 2,3, NEG en yüksek 2,1: marj 0,2, SERT için yetersiz. Kahramanlar kadraj ortasında toplandığı için ilgisiz düzenler 1,7–2,1 taban alıyor. Önsel (şans düzeltmesi) ve kareler arası maks bu tabanı söndürdü ama uzlaşılı pozitifleri de (sınıf hatası 2; L-226). Kare başına maks/medyan seçeneği ve daha geniş NEG seti değerlendirilecek.
2. **Canlı (bindirme) profil için silüet örtüşmesi ve en-boy kipi** (HK-23).
3. **Doku/çizgi dili ekseni:** kaynağa iskelet karşılaştırması (sayfası olmayan kontak) şu an ölçülemiyor.
4. **Koşucu yazma izni** oturum klasörüyle sınırlanacak; look-dev zaman kutusu.

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

