# H — Kararlar kaydı

Faz H (motion-harness paketleme) boyunca alınan kararlar. Her karar: kimlik · karar · gerekçe · durum.
Varsayılan kararlar (VK) brief'ten gelir ve sorulmadan uygulanır; ara kararlar (HK) gerekçeyle buraya yazılır.
Durum: `uygulandı` · `bekliyor (DUR 1)` · `doğrulanacak (Hn)`.

## Varsayılan kararlar (brief)

| id | karar | durum |
|---|---|---|
| VK-01 | Paket adı `motion-harness`, sürüm `1.0.0`, semver. | uygulandı |
| VK-02 | GitHub: bu makinede bağlı hesapla (gh keyring: `<gh-hesabı>`, kapsam `repo`) YENİ ÖZEL depo `motion-harness`. Önce yerel git (`main`), push H5'te. | yerel git uygulandı · push H5 |
| VK-03 | `.gitignore`: `evidence/`, `.env`, `node_modules/`, `out/` (+ `*.log`, `.env.*` hariç `.env.example`). | uygulandı |
| VK-04 | Platform: Windows birincil (`install.ps1`), macOS/Linux ikincil (`install.sh`); eval Windows'ta. | H1 |
| VK-05 | Renderer v1: mevcut HTML/CSS 3B + Playwright/Chromium; ek profil `live` (H3). | H1/H3 |
| VK-06 | Gizlilik: Kaynak-A/[ÖRNEK-marka] kare, MP4, ses, logo, sözlük içeriği pakete girmez; belgeler örnek olarak `[ÖRNEK]` ile anonimleştirilmiş girer; Higgsfield kimliği pakete girmez. | H1 |
| VK-07 | Yaratıcılık kuralı: paket SÜRECİ taşır, ÜSLUBU değil; world seçilmedikçe primitif/renk/font/alet/geçiş kalıbı gelmez; UCUZ #11 "önceki projeyi taklit". | H1 |
| VK-08 | Kredi: yalnız bakiye okuma; smoke ve eval'de üretken çağrı 0. | sürüyor |

## Ara kararlar (H0)

| id | karar | gerekçe | durum |
|---|---|---|---|
| HK-01 | Kaynak kümesi = 6 kök: `Kaynak-A`, `Kaynak-B`, `Kaynak-B%20morphing…` (yalnız `out/probe`, boş), `…animation.zip` (açılmaz, yalnız hash), Kaynak-A'in çalıştığı session'ın dizini `<session>` (brief'teki "scratchpad/**" burası; Kaynak-A ağacında scratchpad klasörü yok), kullanıcı belleği `<bellek>`. | Brief'teki "Kaynak-B morphing" ve "scratchpad" yollarının gerçek karşılıkları. | uygulandı |
| HK-02 | Oynak bölge = `Kaynak-A/out/**` + `Sess/**` (<session> session dizini). Fark raporunda ayrı sayılır; "kararlı bölge fark 0" ölçütü. Session transkripti (`<transkript>`, ~713 MB, büyüyor) manifest dışı; yalnız okunur. | F11 render'ı başka session'da sürüyor olabilir; o yazma bizim değil. | uygulandı |
| HK-03 | Hash kanıtı: başlangıçta TAM manifest (77 462 kayıt, 227,7 GB, 697 s, 0 hata); faz sonlarında HIZLI mod (`dev/hash-check.sh <faz>` — boyut+mtime aynıysa önceki SHA); H5'te TAM yeniden hash. | Tam koşu ~12 dk; her faz sonunda tam koşu gereksiz maliyet, H5'te zorunlu. | uygulandı |
| HK-04 | Sembolik bağlar izlenmez (`Kaynak-A/materials` → Kaynak-B `Materials/…`): bağ hedefi kaydedilir, içerik Kaynak-B kökü altında zaten hash'li. | Çift sayım ve döngü riski. | uygulandı |
| HK-05 | Higgsfield kimliği bu makinede bir API ANAHTARI değil: `@higgsfield/cli` 1.1.26 OAuth 2.0 PKCE oturumu, `%USERPROFILE%\.config\higgsfield\credentials.json` (access/refresh token) + `config.json` (workspace_id). Projelerde ve kullanıcı ortam değişkenlerinde `HIGGSFIELD_API_KEY` yok. Öneri: install adım 4 = CLI var mı → `higgsfield account status` çalışıyor mu (bakiye basılır) → yoksa kullanıcı `higgsfield auth login` yapar; token `.env`'e KOPYALANMAZ (refresh token döner, kopya bayatlar ve sırrı çoğaltır). `.env`'de `HIGGSFIELD_API_KEY` yalnız isteğe bağlı yedek yol olarak belgelenir. | Brief "anahtarı okuyup kopyala" diyor; gerçekte kopyalanacak sabit anahtar yok. | bekliyor (DUR 1) |
| HK-06 | Bakiye okuma doğrulandı: `higgsfield account status --json` → `credits` ve `subscription_plan_type` alanları (e-posta alanı loglanmaz/basılmaz). | Install adım 4 ve doctor için tek okuma yolu. | uygulandı |
| HK-07 | Plugin adı `motion` (komutlar `/motion:init` …), marketplace/depo adı `motion-harness`; kurulum `claude plugin marketplace add <owner>/motion-harness --scope user` + `claude plugin install motion@motion-harness --scope user -y`. Ad alanı plugin.json `name`'inden gelir (docs: code.claude.com/docs/en/plugins/components.md, manifest-reference.md); marketplace girdisinin `name`'i plugin.json ile aynı olmalı. Ajanlar `motion:<ad>` olarak kapsamlanır (Agent `subagent_type` değeri H1'de denenecek). | Brief hem paket adı `motion-harness` hem komut `/motion:*` istiyor; ikisi ancak bu ayrımla sağlanır. | docs ile doğrulandı · H5'te gerçek kurulumla |
| HK-08 | Yerel git kimliği yalnız bu depo için: `user.name=<gh-hesabı>`, `user.email=` kullanıcının e-postası; global git ayarına dokunulmadı. | Global `user.name/email` boş. | uygulandı |
| HK-09 | Depo = marketplace + plugin aynı kökte (`.claude-plugin/marketplace.json` `source: "."` ve `.claude-plugin/plugin.json`); depo yalnız bu plugin'e ayrılmış. `render/` ayrı npm paketi (`@motion/harness`); kök `package.json` KONMAZ (Claude Code kök lockfile görünce önbellek kopyasında kendi `--ignore-scripts` kurulumunu koşar; Playwright tarayıcısı ve `npm link` install betiğinin işi). | Docs: göreli yollu plugin önbelleğe kopyalanır; kök dışı dosya taşınmaz. Brief'teki ağaç kök düzenini öngörüyor. `claude plugin validate` ile H1'de doğrulanacak. | H1 |
| HK-10 | Sürüm kapıları: bu makinede Claude Code 2.1.263. `plugin eval` yerelde mevcut (`claude plugin --help`), `install --json` 2.1.268+, `validate` marketplace+plugin birlikte 2.1.289+. Install betiği bu sürüm kapılarına bağımlı bayrak kullanmaz; çıktı metinden ve çıkış kodundan okunur. Özel depo erişimi makinenin git kimliğiyle (gh `auth setup-git`); Claude Code'un kendi token'ı yok. | Taşınabilirlik: arkadaşın makinesindeki sürüm bilinmiyor. | H1 |
| HK-11 | Salt-okunur ölçütü "kararlı bölge fark 0" yerine "**atfedilemeyen değişiklik = 0**": kararlı bölgede değişen her dosya `dev/hash-attribute.mjs` ile canlı Kaynak-A session transkriptindeki yazma çağrısına (doğrudan girdi ya da çağrılan betiğin içeriği) bağlanır. H0: 7 değişen (6 KÜNYE + TESLİM) · 7 atfedildi · 0 atfedilemeyen. | Canlı session `out/` dışında `docs/`'a da yazıyor (F11-B teslim turu); oynak bölgeyi tek taraflı genişletmek kullanıcının tanımını değiştirirdi. | uygulandı |
| HK-12 | H0 süreç belgeleri (`docs/H0-ENVANTER.md`, `docs/h0/`) DUR 1 kararı (D1-10) verilene kadar git'e İŞLENMEZ. | Gerçek marka adları ve kullanıcı yolları içeriyor; bir kez commit edilirse push'ta geçmişle birlikte gider. | uygulandı |
| HK-13 | DUR 1'e sunulan 13 karar (D1-01 … D1-13) `H0-ENVANTER.md §12`'de; onaylanana kadar H1 başlamaz. | Brief: DUR 1 envanter onayı. | onaylandı (2026-10-17) |

## DUR 1 kararları (kullanıcı onayı, 2026-10-17)

"**brief'ten sapma**" etiketi: brief'teki bir varsayılanı değiştiren karar (kullanıcı şartı).

| id | karar (onaylı hâli) | brief'ten sapma | durum |
|---|---|---|---|
| D1-01 | Higgsfield: `.env` YOK. install/doctor `higgsfield account status` ile denetler, bakiyeyi basar; kuran kişi kendi CLI oturumunu açar. GENAI.md kurulum adımı: `npm i -g @higgsfield/cli` → `higgsfield auth login` → `/motion:doctor` ✓. | **evet** — brief install adım 4 "`.env` HIGGSFIELD_API_KEY sor, bu makinedeki konumdan kopyala" diyordu; gerçekte anahtar yok (HK-05) | H1 |
| D1-02 | Kendi runtime'ımız, **kapsamlı değil**: yalnız kaynak projenin sahne kodunun gerçekten çağırdığı yüzey (sayfa yükleyici + saat/seek + kullanılan yardımcılar). Lisans notu: kaynak `support.js` (üretilmiş "dc-runtime") ve `animations-v3.jsx` ("starter" kopyası) lisansı belirsiz → dağıtılmaz; davranış sözleşmesinden sıfırdan yazılır, kod kopyalanmaz. Playwright **1.63.0** sabit (Chromium rev 1243). | hayır | H1/H2 |
| D1-02a | **H2 parite (ek şart):** (a) kaynak runtime + paket araçları, (b) paket runtime + paket araçları; ikisi de kare farkı ≤ 0,5/255 **ve** frame-check'in künye sayılarını (K1 %, K3, OURS, alet hızı, kamera tepe) ±%2 içinde yeniden üretmesi. | hayır (brief'i sıkılaştırır) | H2 |
| D1-03 | Core varsayılan 60 fps · 1920×1080; tüm eşikler saniye + fps; animatik 960×540 @30. | hayır | H1 |
| D1-04 | Ajanlar: `motion-director` · `motion-research` · `motion-measure` · `motion-reviewer`. Reviewer her kapıda sıfırdan, yalnız okuma araçları; hafızası `docs/REVIEWER.md` kaydıdır (111 MB bağlam dersi → LESSONS). asset-scout/asset-gen emekli; işlevleri research'e. | hayır | H1 |
| D1-05 | §0.6 zevk kapısı: full ≥ 7/8 · light ≥ 6/8 · live ≥ 7/8; proje yükseltebilir, düşüremez. | hayır | H1 |
| D1-06 | Bant ve K1 maskesi world'de zorunlu, core varsayılanı yok (tipografik profil bandı %6–14 profil olarak). | hayır | H1 |
| D1-07 | World örnekleri: `fx-lab`, `desk-paper`, `screen-dark` tam örnek (world.json + jsx + lessons.md); `light-ui`, `photo-plate` yalnız world.json + lessons.md. | **evet** — brief bu örneği marka önekli adla anıyordu; gizlilik gereği `screen-dark` | H1 |
| D1-08 | Python/Whisper isteğe bağlı (`motion-render init --with-whisper`, `requirements.txt`); smoke/eval'de gerekmez. | hayır | H1 |
| D1-09 | Font dosyası pakete girmez; `motion-render vendor` indirir ve lisans metnini yazar. | hayır | H1 |
| D1-10 | `docs/h0` ekleri → `evidence/h0/` (git dışı); ana belgeler anonim (takma adlar: Kaynak-A, Kaynak-B, [ÖRNEK-marka]; eşlem `evidence/aliases.local.md`, git dışı); push öncesi gizlilik taraması zorunlu ayrı adım (regex: marka, kişi, parite, dosya yolu), sonucu raporda. Commit'ler D1-10 uygulandıktan sonra başlar. | hayır | uygulandı (tarama H5'te) |
| D1-11 | `/motion:init` brief dosyasının ön-bilgisini (frontmatter) okursa soru sormaz (headless eval); yoksa AskUserQuestion. | hayır (ekleme) | H3 |
| D1-12 | Kaynak-B'ye özgü render araçlarından `report`, `grade-rehearsal`, `staleness`, `assemble`, `seq`, `whole` genelleştirilerek taşınır; kalanı drop. | hayır | H1 |
| D1-13 | `examples/` altına kaynak proje karesi/kontağı GİRMEZ; biçim örnekleri H4 eval projelerinin kontaklarından; H4'e kadar nötr yer tutucu. Klasör adı `examples/ornek-film/`. | **evet** — brief klasörü kaynak ürünün adıyla anıyordu; ürün adı gizlilik kuralına takılır | H1/H4 |
| D1-14 | 14 kod hatası taşınırken düzeltilir; H2 paritesini bozanlar (BT.709 etiketi, fps sabitleri …) `docs/H2-GOC.md` "beklenen sapma" tablosuna: hata · düzeltme · önce/sonra fark. Görsel etkisi 0 olanlar sessiz düzeltilir. | hayır | H1/H2 |
| D1-15 | Ağaç dışı 4 betik (`down2dir`, `envxc`, `clipcheck`, `clipcheck3`) pakete alınır; envanterde "kaynak: ağaç dışı" notu. | hayır | H1 |
| D1-16 | frame-check 20 kontrol tipi; H2'de kaynak projenin künyelerinde kayıtlı izdüşüm sonuçlarını yeniden üretmesi parite testinin parçası. | hayır | H1/H2 |
| D1-17 | Paket/depo/marketplace adı `motion-harness`, plugin adı `motion` (komut ad alanı `/motion:*`, HK-07). | **evet** — brief tek ad (`motion-harness`) varsayıyordu; `/motion:init` komut adı ancak bu ayrımla mümkün | H1 |
| D1-18 | Salt-okunur kanıt ölçütü "atfedilemeyen değişiklik = 0" (HK-11). | **evet** — brief "her fazın sonunda fark 0" diyordu; canlı session `docs/`'a da yazdığı için | uygulandı |

## Ara kararlar (H4–H5)

| # | karar | gerekçe | durum |
|---|---|---|---|
| HK-14 | Tur 2 koşucusu 48,5. dakikada dışarıdan kesildi (araç kabuğunun arka plan görevi). Aynı session id'leriyle `claude -p --resume` ile kalan süre kadar sürdürüldü; 90 dk tavanı iki bölümün toplamına uygulandı; ayrı tur sayılmadı. | Kesinti oturumun hatası değil, koşturma ortamının. Yeni tur açmak 2 tur sınırını harcardı. | uygulandı |
| HK-15 | Elektronik oturumunun iki `playwright install chromium` çağrısı ağ şartı 4'ün ihlalidir: tabloda "İHLAL (ağ)" olarak işaretlendi, ayrıca raporlandı. Oturum puanlandı ama geçerli sayılmadı. Paket ve koşucu düzeltildi (`doctor` çevrimdışı DUR, yasak listesi). | Şart 4: dış indirme gerekirse oturum durur ve raporlanır. Oturum durmadı → ihlal. | uygulandı |
| HK-16 | Benzerlik değerlendirmesi look-dev düzeyinde GEÇMEZ (4 ihlal), teslim düzeyinde 0. Bulgu kurala çevrildi (yapısal eksen şartı, varsayılan çekiciler, GEÇMEZ sonrası yeniden kapı). Üçüncü eval turu açılmadı. | Brief: en çok 2 tur. Düzeltmeler eval ile **doğrulanmadı**; H5 raporunda açık nokta. | açık nokta |
| HK-17 | Eval'in indirdiği Playwright önbellek klasörleri (chromium-1248, ffmpeg-1013) kullanıcı önbelleğinde bırakıldı, silinmedi. | Kullanıcı makinesinde silme yapılmaz; zararsız (yalnız disk). Kullanıcı isterse `npx playwright uninstall` ile temizler. | raporda |
| HK-18 | Benzerlik reviewer'ı eval kipinde dosya yazmadı; raporu ajan çıktısından olduğu gibi `evidence/eval/benzerlik-r2.md`'ye kaydedildi. Depoya yalnız anonim özet girer (`docs/H4-EVAL.md`). | Şart 5 ve gizlilik: kaynak projeye ait içerik adları depoya girmez. | uygulandı |
| HK-19 | Kullanıcı onayıyla 3. eval turu (2 tur sınırı aşıldı): tavan 150 dk / 400 tur, SaaS ve elektronik 12 s light, canlı aynen. Başarı ölçütü: en az bir teslim, look-dev benzerlik ihlali 0, ağ 0, üretken 0, yasak yol 0. | Kullanıcı kararı (H5 DUR sonrası). | uygulandı: **geçmedi** (teslim 0, benzerlik 4); güvenlik ayakları 0 |
| HK-20 | Tur 3 geçmediği için 1.0.1 etiketi verilmedi. Paket 1.0.0 olarak kaldı; README'ye "bilinen boşluk", CHANGELOG'a "1.1 yol haritası" eklendi. Tur 3'ün çevre ve araç düzeltmeleri (`vendor` npm yedeği, reviewer eşik yazımı, puanlayıcı) 1.0.0 dalına işlendi. | Kullanıcı kararı: "geçmezse bulgular 1.1 yol haritasına, paket 1.0.0 'look-dev doğrulanmamış' notuyla kalır". | uygulandı |
| HK-21 | Eval'in indirdiği `chromium-1248`, `chromium_headless_shell-1248`, `ffmpeg-1013` Geri Dönüşüm Kutusu'na taşındı, kalıcı silme yapılmadı. Hepsi yalnız npx ile gelen Playwright 1.64.1'e aitti; paket 1.63.0 chromium-1243 ve ffmpeg-1011 kullanır (`doctor` 14 ✓). | Kullanıcı kararı (önbellek temizliği). Geri dönüşüm kutusu geri alınabilir yoldur. | uygulandı |
| HK-22 | Puanlayıcının tur 3'teki iki yanlış pozitifi (kod içindeki `curl:` alanı, ASCII KARAR) düzeltildi ve bütün turlar yeniden puanlandı; tur 2'nin iki gerçek dış indirmesi aynen yakalanıyor. | Ölçüt yanlış ölçüyordu; ihlal sayısı yöntemin değil oturumun davranışını göstermeli. | uygulandı |

## Sınır notu (kullanıcı, H1–H5 boyunca geçerli)

| id | kural | uygulama |
|---|---|---|
| SN-1 | `skills/motion-live` ve `/motion:live` GENEL yetenektir: OBS sayfası, ses zarfı, durum makinesi, ölçüm, panel. Belirli avatar tasarımı, karakter, kullanıcıya özgü görsel YOK; örnek avatar yalnız nötr geometrik yer tutucu. | runtime/live şablonu + skill; H5 öncesi denetim |
| SN-2 | H4 "canli-avatar" brief'i atılacak eval projesidir; çıktısı pakete örnek olarak GİRMEZ (yalnız puan tablosu). D1-13'teki "eval kontaklarından biçim örneği" yalnız video eval'leri için geçerlidir. | evals/ yalnız brief + puan; examples/ canlı çıktı içermez |
| SN-3 | Kullanıcının gerçek yayın-avatar uygulaması H5'ten SONRA, ayrı klasörde `/motion:init --profile live` ile başlar ve kendi GitHub deposuna gider; paket yalnız bağımlılıktır. | `/motion:init` `--profile`/`--world` argümanlarını kabul eder |
| SN-4 | H5 raporunda tek satır doğrulama: "pakette kullanıcıya özgü içerik: 0". | H5 gizlilik + içerik taraması |
