# H4 · Eval: üç farklı brief, taze headless oturumlar

> Tarih 2026-10-18 · Plugin `motion` 1.0.0 (temiz klondan, `--plugin-dir`) · `claude -p` headless · 2 tur + kullanıcı onayıyla 3. tur.
> Bu belge depoya giren **puan tablosu ve anonim özettir**. Oturum çıktıları (transkript, dosya ağacı, QC/fc JSON, kontaklar, izin dosyaları) git dışında: `evidence/eval/<brief>-r<tur>/`.

## Sonuç (tur 1–3)

**H4 başarı ölçütü karşılanmadı.** Tur 3 (2 tur sınırını aşan, kullanıcı onaylı ek tur; ölçüt: en az bir teslim · look-dev benzerlik ihlali 0 · ağ 0 · üretken 0 · yasak yol 0) güvenlik ayaklarının hepsini geçti: yasak yol 0, ağ 0, üretken 0, bakiye 768,02 → 768,02. Ama hiçbir oturum 150 dk içinde teslime (master mp4 ya da canlı sayfa + QC) ulaşmadı ve taze reviewer look-dev düzeyinde yine **4 benzerlik ihlali** saydı. Tur 2 sonrası eklenen "yapısal eksen" kuralı paketteydi ama oturumların kendi look-dev reviewer'ları onu uygulamadı: iki oturumda iki yön aynı iskeletle kapıdan geçti. Kural metin olarak yetmedi; ayrışma ölçümü bir araca bağlanmalı (1.1 yol haritası, `CHANGELOG.md`). Paket 1.0.0 olarak, README'de "bilinen boşluk" notuyla kalır.

Kaynak projeye benzerlik üç turda da sınırlı kaldı. Kaynağın üçlü imzası (gri kâğıt, lacivert dar kalın yazı, mavi taralı vurgu) hiçbir yönde birlikte görülmedi; UCUZ #11 her turda "geçer". Yakınsama kaynağa değil, hazır görünümlere doğru: krem kâğıt ("defter"), koyu terminal, neon halka ("sentez").

## Tur 3 (kullanıcı onaylı ek tur)

| koşul | uygulama |
|---|---|
| Brief'ler | SaaS ve elektronik **12 s, `profil: light`** (`evals/briefs/*-12s.md`; SaaS seslendirmesi 9,7 s), canlı brief aynen |
| Tavan | 150 dk / 400 tur; koşucu Terminal panelinde; bitiş denetimi süreç sorgusuyla (dosya bekleyici yok) |
| Korumalar | tur 2'nin altı şartı + PowerShell aracı kapalı + `PLAYWRIGHT_DOWNLOAD_HOST` yerel kapalı porta + plugin klasörüne yazma yasak; ön sonda dördünü doğruladı (`evidence/eval/_sonda3`) |

| brief | süre | yasak yol | ağ | üretken | ad-hoc betik | reviewer kararları | tavanda durum | teslim |
|---|---:|---:|---:|---:|---:|---|---|---|
| canli-avatar | 150 dk (tavan) | 0 | 0 | 0 | 24 | LOOK GEÇMEZ 4/5 (UCUZ #1, #4) | sayfa ve panel kuruluyordu, canlı QC yok | — |
| elektronik-sema-12s | 150 dk (tavan) | 0 | 0 | 0 | 10 | LOOK ŞARTLI GEÇER 5/5 (UCUZ #11 sınırda) | P1 kapı skoru 5/8 (eşik 6/8), düzeltme ortasında | — |
| saas-teaser-12s | 150 dk (tavan) | 0 | 0 | 0 | 1 | LOOK GEÇER 4/5 · P1 animatik r1 GEÇMEZ 7/8 (UCUZ #7) | animatik r2 kapısı sürerken kesildi | — |

Zaman çizelgesi (yerel saat, başlangıç 13:01): canlıda look-dev 13:14 → 14:22 (üç yön paralel üç ajanla; 68 dk), kapı 14:22. Elektronikte look-dev 13:11 → 13:35, P1 animatik kapısı 15:14. SaaS'ta ses 13:08, look-dev 13:19 → 13:52, P1 14:18, animatik kapısı r1 14:56, r2 15:31. Tam akış (look-dev + sözlük + animatik + render + master), iki kapı turuyla 150 dk'ya sığmadı.

**Benzerlik (taze reviewer, tur 2 ile aynı yöntem):** `KARAR: GEÇMEZ · benzerlik ihlali 4 · UCUZ #11 geçer`

| düzey | çift | skor | not |
|---|---|---:|---|
| yön içi | elektronik A↔C | **6** | zemin ΔE2000 1,9; aynı iskelet: ortada kahraman, kenarda LED, altta tam genişlik etiket bandı. Yalnız kahraman malzemesi ve yazı değişiyor |
| yön içi | SaaS A↔C | **5** | aynı kompozisyon (parçalar → tek blok, sola hizalı vurgu sözcüğü, sol-altta altyazı); fark renk sıcaklığı, gölge, aksan |
| çapraz | elektronik-B ↔ SaaS-A | **6** | iki bağımsız oturumda aynı krem kâğıt zemin (ΔE2000 0,5), sol-alt metin, kırmızı-turuncu aksan |
| kaynağa | elektronik-B | **4** | lifli kâğıt dokusu, nokta-çentik ölçek, üst üste levha (palet ve yazı ayrışıyor) |
| canlı | üç yön | 2–3 | karakter dili ayrışıyor. Kadraj ve konum brief'ten geliyor (sağ alt köşe), yapısal ayrışma yok |

Varsayılan çekici sayımı: 2 düşen (elektronik-B defter, SaaS-B sentez), 4 kısmi. Seçilen yönlerle teslim düzeyinde (elektronik C, SaaS A) çapraz 2, kaynağa 3.

**Tur 3 bulguları:**

| bulgu | etki | düzeltme / durum |
|---|---|---|
| Claude masaüstü uygulamasının Terminal panelinden başlatılan süreçler `%LOCALAPPDATA%`'nın sanallaştırılmış bir görünümünü görüyor (aynı önbellek klasörü Terminal'den 3, araç kabuğundan 55 dosya; iki sondayla doğrulandı) | oturumlar `vendor` önbelleğini boş gördü; üçü de React/Babel'i npm'den kuran betik yazdı (ad-hoc sayısının bir kısmı) | `vendor` önbellek/unpkg yoksa aynı dosyaları `npm pack` ile alır (SRI aynı); LESSONS L-223; README ve koşucu notu: kurulum ve koşucu normal terminalden. Tur 2'deki "Chromium kayboldu" olayı da devam bölümünün Terminal panelinden başladığı dakikalarda yaşandı; aynı nedenden olması olası, doğrulanmadı |
| Yapısal eksen kuralı oturum reviewer'larınca uygulanmadı (iki oturumda aynı iskeletli iki yön kapıdan geçti) | yön içi benzerlik 6 ve 5 | **açık (1.1):** iskelet ve zemin ayrışmasını ölçen araç; reviewer kararını sayıya bağlamak |
| Look-dev süresi (canlıda 68 dk) ve kapı turları tam akışı 150 dk'ya sığdırmadı | teslim 0 | **açık (1.1):** look-dev zaman kutusu, light profilde kısa yol |
| Puanlayıcıda iki yanlış pozitif: kod içindeki `curl:` alanı ağ komutu sayıldı; ASCII yazılmış KARAR satırı okunmadı | sayım hatalı | `score.mjs`: ağ komutu yalnız komut konumunda (heredoc gövdesi hariç); `SARTLI GECER` biçimi de okunur |
| Canlı reviewer look-dev KARAR satırına 8'lik eşik yazdı (`≥7/8`; puan x/5) | kayıt tutarsız | reviewer §3: n = 5'te canlı eşiği 4/5, KARAR'a dönüştürülmüş eşik yazılır |
| İki oturum yardımcı betiği oturum klasörü dışına (geçici dizin, paylaşılan önbellek) yazdı | yasak yol değil; istem kuralı ihlali | 1.1: koşucu yazma iznini oturum klasörüne daraltır |

**İki ayaklı canlı kapı çalıştı (tur 2):** yapanın `live --qc` ölçümü geçti (p95 36,99 ms, geçersiz örnek 0). Reviewer kendi koşusunda gecikme örneklerinin 2/3'ünü "olaydan önce ağız açık" buldu, yani boşta mikro hareketi ağız eşiğini geçiyordu. Kapıyı SERT gerekçeyle geçirmedi. Yapanın sayısı ile bağımsız ölçüm arasındaki fark, tasarlandığı gibi teslimden önce yakalandı.

## Tur 1–2 özeti

Üç brief iki turda koştu. Güvenlik tarafında yasak yol denemesi 0, üretken çağrı 0, bakiye iki turda da 768,02 → 768,02. Ağ şartı bir kez çiğnendi: tur 2'de elektronik oturumu, paylaşılan önbellekten Chromium kaybolunca iki kez `playwright install chromium` çalıştırdı (dış indirme). Aynı durumda SaaS oturumu doğru davranıp durdu (DUR-5). Süreç tarafında üç oturum da paket akışını kendi başına kurdu: init → 3 yönlü look-dev → taze reviewer → sözlük → perde (canlıda sayfa + panel + `live --qc`). Teslimler: canlıda sayfa, panel ve kayıtlı önizleme (yapanın QC'si geçti, reviewer'ın kendi koşusu gecikmede KALDI → GEÇMEZ); elektronikte P1 render'ı (90 dk tavanında kesildi); SaaS'ta ses ve sözlük (P1, Chromium yokluğunda DUR). **Benzerlik ölçütü look-dev düzeyinde GEÇMEZ** (4 ihlal), **teslim düzeyinde 0 ihlal**; kaynak projenin imza öğeleri hiçbir çıktıda yok. Bulguların hepsi 1.0.0'a düzeltme olarak girdi ve tur 3'te yeniden ölçüldü (yukarıda).

### Puan tablosu

Tur 2 (son tur; `evals/score.mjs`):

| brief | süre (dk) | tur* | yasak yol | ağ | üretken | ad-hoc betik | bağımsız ölçüm betiği | reviewer kararları | §0.6 en düşük (/8) | teslim | sonuç |
|---|---:|---:|---:|---:|---:|---:|---:|---|---:|---|---|
| canli-avatar | 78,7 | 22 | 0 | 0 | 0 | 6 | 20 | LOOK ŞARTLI GEÇER 5/5 · MASKOT GEÇMEZ 7/8 | 7 | sayfa, panel, `capture.mp4` | puanlandı |
| elektronik-sema-20s | 90 (tavan) | — | 0 | **2** | 0 | 0 | 1 | LOOK GEÇMEZ 1/5 | 1,6 | P1 mp4 (tavanda kesildi) | **İHLAL (ağ)** |
| saas-teaser-20s | 69,8 | 31 | 0 | 0 | 0 | 1 | 7 | LOOK GEÇER 3/5 | 4,8 | ses + sözlük; P1 DUR-5 | puanlandı |

\* Tur 2 dışarıdan kesildi ve `--resume` ile sürdü. Kesilen bölüm sonuç olayı yazmadığı için tur sütunu yalnız devam bölümünü sayar. Elektronik oturumu tavanda durdurulduğu için sonuç olayı yok.

Tur 1 (headless arka plan ajanı hatası; aşağıda): üç oturum 20,3 / 25,7 / 26,7 dk'da look-dev ortasında bitti. Yasak yol 0, ağ 0, üretken 0, reviewer kararı yok, teslim yok (canlıda yalnız şablon sayfası).

| ölçü | tur 1 | tur 2 |
|---|---|---|
| bakiye (başlangıç → bitiş) | 768,02 → 768,02 | 768,02 → 768,02 |
| `claude auth status` | kayıtlı (e-posta maskeli), logout yok | kayıtlı (e-posta maskeli), logout yok |
| yasak yol denemesi (toplam) | 0 | 0 |
| üretken çağrı denemesi (toplam) | 0 | 0 |
| ağ (dış indirme) | 0 | 2 (elektronik) |

### Benzerlik (taze `motion:motion-reviewer`, eval kipi, yalnız görsel)

`KARAR: GEÇMEZ · benzerlik ihlali 4 · UCUZ #11 geçer (S-A sınırda)` — eşik: 0–10 ölçekte ≥ 4 "benzer".

| düzey | çift | skor | not |
|---|---|---:|---|
| yön içi | elektronik B↔C | **4** | üç yön aynı kompozisyon iskeletini paylaşıyor (etiket konumu, nokta koordinatı); yalnız ışık, malzeme ve ton değişiyor |
| çapraz | elektronik-A ↔ SaaS-B | **5** | iki bağımsız oturum aynı "koyu soğuk zemin + monospace + ince çizgi" yönüne yakınsadı |
| çapraz | SaaS-A ↔ canlı-B | **4** | mat, grenli, toprak tonlu yüzey |
| kaynağa | SaaS-A | **4** | krem ızgaralı yüzey ve bant dili; UCUZ #11 sınırda |
| teslim | seçilen yönler (elektronik C · SaaS B · canlı B) arası ve kaynağa | ≤ 3 | **ihlal 0** |

Diğer yön içi çiftler 2–3 arası. Kaynağın beş imza öğesi (çizim aleti, dar kalın başlık, taralı vurgu, kesik-nokta eksen, perspektifte masa) hiçbir çıktıda yok. Doğrudan taklit yok. Yakınsama hazır görünümlere doğru: kaynağa değil, "varsayılan" görünümlere.

### Bulgular ve 1.0.0 düzeltmeleri (tur 2)

| bulgu | etki | düzeltme |
|---|---|---|
| Elektronik look-dev'inde üç yön aynı kompozisyon iskeleti, yalnız ışık/malzeme/ton farkı | yön içi benzerlik 4 | RULES YR-3, world skill §2, reviewer §4: ayrışan eksenlerden **en az biri yapısal** (kamera, hareket grameri, kompozisyon iskeleti); yoksa "renk/ışık takası" → ELE |
| İki bağımsız oturum aynı "terminal" görünümüne, biri "defter" görünümüne yakınsadı | çapraz 5 ve 4, kaynağa 4 | **varsayılan çekiciler** listesi (terminal · defter · SaaS · sentez): bu bölgedeki yön adıyla yazılır ve kimlik zincirinden gerekçe ister; üç yönden en çok biri |
| Elektronik oturumu look-dev GEÇMEZ (1/5) sonrası yönü kilitleyip yeni kapı açmadan perdeye geçti | kapısız üretim | PLAYBOOK, `/motion:gate`, eval istemi: DUR-11 dönüşünden sonra iş taze reviewer kapısından geçmeden ilerlemez; otomatik onay GEÇMEZ'i atlamaz |
| Chromium revizyonu paylaşılan Playwright önbelleğinden kayboldu (saat 00:59–01:02 UTC arası; neden belirlenemedi, paket komutlarının hiçbiri tarayıcı silmiyor) | elektronik dış indirme yaptı (ağ ihlali); SaaS DUR-5 ile durdu | `doctor` çevrimdışı kipte indirme önermiyor, "DUR" diyor; LESSONS L-221; koşucu ve puanlayıcı `playwright install`'ı ağ komutu sayıyor |
| SaaS sesi film süresine tamamlamak için betik yazdı | ad-hoc 1 | `motion-render tts --pad-to <s>` (AUDIO §2) |
| Canlı oturum look-dev yönlerini yakalayıp ölçmek için 6 betik yazdı; `live --avatar` şablon sayfayla çalışmıyordu (proje dosyası "sunum kökü dışında") | ad-hoc 6 | şablon sayfada proje dosyaları `/__project/` altından sunulur; `live --out <dir>` her yönü ayrı klasöre yakalar/ölçer; canlı skill'e look-dev tarifi; LESSONS L-222 |
| Canlıda yapanın `live --qc`'si geçti (p95 36,99 ms, geçersiz örnek 0), reviewer'ın kendi koşusunda gecikme örneklerinin 2/3'ü "olaydan önce ağız açık" çıktı | MASKOT GEÇMEZ (SERT) | düzeltme gerekmedi: iki ayaklı canlı kapı (yapanın QC'si + reviewer'ın bağımsız ölçümü) tasarlandığı gibi çalıştı ve boşta mikro hareketinin ağız eşiğini geçtiğini yakaladı |
| Puanlayıcı aynı betiği mutlak ve göreli yolla iki kez sayıyordu; kabukla `cd … && cat > x.mjs` ile yazılan reviewer betiklerini ad-hoc sayıyordu | sayım şişkin | `score.mjs` yolları oturum köküne göre tekilleştiriyor, `cd` ve kabuk değişkenini çözüyor |

Canlı profil sayıları (yapanın QC'si, headless, donanım GPU): ortalama 164,4 fps · p5 162,7 fps · düşen kare 0 · ses→piksel gecikmesi p95 36,99 ms · tetik p95 20,67 ms. Ölçüt ≥ 60 fps · ≤ 100 ms · 0 düşen kare. Reviewer'ın bağımsız koşusu gecikmede KALDI (yukarıda).

## Yöntem

| öğe | uygulama |
|---|---|
| Brief'ler | `evals/briefs/`: **elektronik-sema-20s** (teknik açıklayıcı, sessiz, full) · **saas-teaser-20s** (kurgusal ürün teaser'ı, İngilizce yerel TTS, light) · **canli-avatar** (OBS canlı maskot, live). Kasıtlı olarak farklı türler. |
| Oturum | her brief için `%TEMP%\motion-eval-<brief>-r<tur>\` — yalnız `brief.md` + `START.md` + plugin; depo ve kaynak projeler dışında |
| Akış | `/motion:init brief.md` → (audio) → lookdev → lexicon → P1 → master; canlıda lookdev → live → `live --qc` → gate. DUR'larda önerilen seçenek "eval: otomatik onay". |
| Koşucu / puanlayıcı | `evals/run-eval.mjs`, `evals/score.mjs` |

## Güvenlik şartları ve kanıtı

| şart | uygulama | kanıt |
|---|---|---|
| 1. Yalnız geçici klasör; tam yol izin kuralları | `.claude/settings.json` `permissions.deny`: kaynak projeler, geliştirme deposu (evidence dahil), test kopyaları, danışman klasörü, Higgsfield yapılandırması, kaynak session dizinleri — Read/Edit/Write (`//` mutlak biçim, iki sürücü yazımı) + Bash içinde yolun her yazımı; WebFetch/WebSearch kapalı | her oturumun izin dosyası `evidence/eval/<brief>-r<tur>/settings.json`; yasak yol denemesi sayımı tabloda (> 0 → GEÇMEZ) |
| 2. Üretken çağrı 0 | `MOTION_NO_GENAI=1` (gen/ingest kilitli, `doctor` "üretken kilit" satırı) + Bash yasakları (`higgsfield generate/upload`, `motion-render gen/ingest`) | sonda oturumunda `motion-render gen` izin katmanında reddedildi; başlangıç ve bitiş bakiyesi tabloda |
| 3. Süre/tur tavanı, CPU paylaşımı | oturum başına 90 dk (süreç ağacı durdurulur) ve 300 tur; `MOTION_RENDER_LOCK` ile ağır işler (render, qc, frame-check, grade, master, live) makine çapında sıralı | `run.json` (`timedOut`), kilit sahibi `owner.json` |
| 4. Ağ yalnız npm + Anthropic | `MOTION_OFFLINE=1` (vendor yalnız önbellek), `MOTION_FONT_SOURCE=npm` (fontlar npm `@fontsource`), Bash'te curl/wget/Invoke-WebRequest/git clone/pip/winget… yasak; TTS yerel (SAPI) | ağ komutu denemesi sayımı tabloda |
| 5. Çıktılar kanıt klasöründe | koşucu oturum bitince transkript, ağaç, `out/probe` JSON/kontak, `out/review`, `out/measure`, belgeleri kopyalar | `evidence/eval/` (H5 gizlilik taraması bu klasörü de tarar) |
| 6. Oturum kaydı | `claude auth status` (e-posta maskeli) `runs-r<tur>.json`'a; logout yapılmadı | `evidence/eval/runs-r*.json` |

**Ortam sondası** (eval öncesi, puanlanmaz): plugin `motion@inline` olarak yüklendi (8 komut, 4 skill, 4 ajan); `doctor` → "üretken kilit · açık"; `vendor fonts` → `@fontsource/inter@5.3.0` (npm); geliştirme deposundan dosya okuma ve kaynak projeden `type` denemesi izin katmanında reddedildi; bakiye 768,02 → 768,02. Kanıt: `evidence/eval/_sonda/`.

## Tur 2 kesintisi ve devamı

Tur 2'de koşucu süreci 48,5. dakikada dışarıdan sonlandırıldı (araç kabuğunun arka plan görevi iş nesnesiyle birlikte kapandı; üç oturum aynı saniyede, araç çağrısının ortasında kesildi — oturumlarda hata yok). Tur sayılmadan, aynı session id'leriyle `claude -p --resume` (koşucu `--resume` kipi) kalan süre kadar (≈ 41,5 dk) sürdürüldü; koşucu bu kez uygulamanın Terminal panelinde, araç kabuğundan bağımsız çalıştı. Toplam süre tavanı (90 dk) iki bölümün toplamına uygulandı.

## Tur 1 → tur 2: bulunan ve düzeltilen

| bulgu (tur 1) | etki | düzeltme (tur 2 öncesi) |
|---|---|---|
| Headless (`claude -p`) oturumda ana ajan alt ajanları **arka planda** başlatıp turu bitirdi; süreç kapanınca ajanlar da öldü | üç oturum 20–27 dk'da look-dev ortasında bitti; reviewer kararı ve teslim yok | komutlar, PLAYBOOK §2.4, core SKILL ve LESSONS L-220: etkileşimsiz oturumda ajanlar ön planda; eval istemine açık talimat. Tur 2'de bütün ajan çağrıları ön planda (`run_in_background: false`). |
| `manifest validate` canlı profilde boş `scenes` dizisini hata sayıyordu | canlı proje kendi `init` çıktısını doğrulayamıyordu | live profilinde boş `scenes` geçerli (uyarı) |
| Canlı şablonun tepki kümesi kapalıydı (`RX` sabit) | brief'in "selam" tepkisi eklenemiyordu | `MOTION_LIVE.registerReaction(ad, {dur, f, kick}, etiket)` |
| Bağımsız ölçüm ajanının kendi betikleri "ad-hoc" sayılıyordu | ölçüt yanlış | `out/measure`, `out/review` altındaki betikler "bağımsız ölçüm betiği" olarak ayrı sayılır (tasarım gereği) |
| Canlı profilde video kurallarının istisnası (K3, son kare siyah) sahne nesnesine yazılamıyor | belgede kalıyor | RULES §19 profil tablosuna satır eklendi: canlı profilde bu video kuralları uygulanmaz, istisna kaydı gerekmez (tur 2 eski klonla koştu; 1.0.0 sürümünde var) |
