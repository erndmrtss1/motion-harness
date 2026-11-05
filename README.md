# motion-harness

Claude Code için motion-grafik üretim hattı (plugin adı `motion`). Paket bir üretim **sürecini** taşır: kapılar, ölçüm (`qc` + `frame-check`),
bağımsız reviewer, 3 yönlü varyant, animatik, tek düzeltme turu, DUR noktaları ve istisna biçiminde rapor. Sahneler HTML/CSS/SVG (React) olarak
yazılır; `motion-render` onları Playwright'ın Chromium'uyla kare kare çizer, ölçer, kodlar ve arşivler. Hiçbir görsel **üslup** varsayılan
gelmez: her proje kendi dünyasını (world: malzeme, ışık, hareket grameri, tipografi, palet) look-dev'de sıfırdan kurar ya da kütüphaneden
açıkça seçer.

Paket iki katmandan oluşur. **Plugin metinleri** (`skills/`, `agents/`, `commands/`, `templates/`) Claude Code oturumuna süreci, kuralları
ve ölçüm yöntemlerini öğretir: ana oturum kapı ve QA yürütür, director ajanı üretir, ölçüm ajanı bağımsız ölçer, reviewer her kapıda taze
açılır. **Render araçları** (`render/`, CLI `motion-render`) render, QC, frame-check (25 tip), hareket testi (`motion-test`), olay planı
denetimi (`plan-check`), kontak sayfaları, master ve arşiv zincirini sağlar. Üretken görsel servisi (Higgsfield) isteğe bağlıdır;
kullanılmazsa bütün hat yerel çalışır. Arayüz ve belgeler Türkçedir.

> *English summary: a Claude Code plugin + Node CLI for producing motion-graphics videos with a gated, measured process (QC, frame checks,
> independent reviewer, animatic, master/archive). Docs are in Turkish. MIT licensed.*

## Sıfırdan kurulum (10 adım)

| # | adım | Windows (PowerShell) | Linux (Ubuntu/Debian) · macOS |
|---|---|---|---|
| 1 | **Node.js ≥ 20** (24 LTS önerilir) | `winget install OpenJS.NodeJS.LTS` | `nvm install 24` (ya da NodeSource paketi) · macOS `brew install node` |
| 2 | **Git** | `winget install Git.Git` | `sudo apt install git` · macOS `xcode-select --install` |
| 3 | **Claude Code** (oturum açılmış) | [code.claude.com](https://code.claude.com) kurulum talimatı → `claude` | aynı |
| 4 | **Depoyu indir** | `git clone https://github.com/erndmrtss1/motion-harness` | aynı — ya da [Releases](https://github.com/erndmrtss1/motion-harness/releases) sayfasından `v1.4.0` zip'ini açın |
| 5 | **ffmpeg** — paket `ffmpeg-static` getirir; master/arşiv için `prores_ks`, `ffv1`, `loudnorm` gerekir | `winget install Gyan.FFmpeg` (yalnız eksik özellik varsa; kurulum betiği kendisi dener) | `sudo apt install ffmpeg` · macOS `brew install ffmpeg` |
| 6 | **Kurulum betiği**: `render/` bağımlılıkları (`npm ci`) · Playwright Chromium · `npm link` → `motion-render` · Claude Code plugin kaydı · smoke (12 kare) | `cd motion-harness` → `powershell -ExecutionPolicy Bypass -File .\install.ps1` | `cd motion-harness && bash install.sh` |
| 7 | **Chromium sistem kitaplıkları** (yalnız Linux; Windows/macOS'ta gerekmez) | — | `cd render && sudo npx playwright install-deps chromium` |
| 8 | **Doğrula** | `motion-render doctor` (✓/✗ tablosu) · `claude plugin list` → `motion@motion-harness` | aynı |
| 9 | **Örnek world + örnek sahne** (aşağıdaki bölüm) | — | — |
| 10 | **İlk proje**: boş bir klasörde Claude Code'u açın, yazın: `START.md'yi oku, /motion:init` | — | — |

Kurulum betiği idempotenttir; her adım ✓/✗ basar ve tekrar çalıştırmak güvenlidir. Yeni sürüm için `git pull` ve betiği yeniden çalıştırın:
kurulu plugin sürümünü karşılaştırır, plugin metinlerini (`commands/`, `skills/`, `agents/`, `templates/`) bu checkout'tan eşitler.
Kaldırma: `uninstall.ps1` / `uninstall.sh` (projelere dokunmaz).

## Örnek world + örnek sahne

Paket bir world kütüphanesi taşır ([skills/motion-world/library/INDEX.md](skills/motion-world/library/INDEX.md)). `focusfx-paper` world'ü
bir demo sahnesiyle gelir; aşağıdaki komutlar geçici bir projede onu kurar, çizer ve ölçer (ağ yalnız ilk font/vendor indirmesinde):

```bash
motion-render init ornek --world focusfx-paper --demo     # proje iskeleti + world + DEMO sahnesi
cd ornek
motion-render render DEMO --scale 0.5                     # kareler → out/frames/DEMO/ (960×540)
motion-render qc DEMO                                     # 16 kontrol → out/probe/DEMO-qc.json
motion-render contact DEMO                                # kontak sayfası → out/probe/DEMO-contact.png
motion-render motion-test FXRule --props '{"x":[[0,1960],[1.4,300,"out3"]],"y":480,"len":640}'   # ilkel testi → out/motion-test/fxrule/
motion-render motion-test mek-seyahat                     # paketin seyahat hamlesi ilkeli: klip + hız profili + C1
motion-render plan-check <motion-harness>/examples/ornek-plan/events.json --rules <motion-harness>/examples/ornek-plan/kurallar.json --fps 60
```

`<motion-harness>` depoyu klonladığınız klasördür. `frame-check <id>` (25 tip) sahnenin `scenes.json` `checks` bildirimiyle koşar; demo
sahnesinde bildirim yoktur, kendi sahnelerinizde `/motion:gate` kapsamı belirler. `motion-test` ilk satırı FXRule için kalkışta hız sıçraması
(C1 kusuru) gösterir: ölçerin ne yakaladığını görmek için iyi bir örnektir. Olay planı örneği ve kuralları: [examples/ornek-plan/](examples/ornek-plan/). Bir filmin bütün belgelerle nasıl bittiğini görmek için:
[examples/ornek-film/](examples/ornek-film/) (künye, render raporu, reviewer kayıtları, teslim, retro). Kütüphane world'ü varsayılan değildir;
yalnız `/motion:init --world <ad>` ile seçilirse kullanılır.

## Kullanım

`/motion:init` mülakatla (ya da ön bilgili bir brief dosyasından, soru sormadan) projeyi kurar: alan, süre, ses, dil, profil
(`full|light|live`), world, üretken bütçe, yasaklar, teslim biçimi. Sonra fazlar: `/motion:faz audio` → `/motion:faz lookdev` →
`/motion:faz lexicon` → `/motion:faz ilkel` → `/motion:faz P1` … → `/motion:master`. Her faz bir rapor ve **DUR** (ya da bilgi kontağı) ile
biter; onayınız olmadan geri dönüşü pahalı bir adıma geçilmez. Ayrıntı: [START.md](START.md), [docs/BASLANGIC.md](docs/BASLANGIC.md).

| komut | iş |
|---|---|
| `/motion:init` | proje kurulumu (mülakat ya da brief dosyası); `.githooks/pre-commit` (çelişki taraması), `tools/render-oncesi.*` |
| `/motion:faz <audio\|lookdev\|lexicon\|ilkel\|P<n>>` | bir fazı yürütür, raporlar, durur |
| `/motion:gate` | kapı: qc + frame-check + bağımsız ölçüm + taze reviewer |
| `/motion:master` | master + arşiv zinciri |
| `/motion:live` | canlı profil (OBS tarayıcı kaynağı) |
| `/motion:promote` | RETRO dersini core/world'e önerir; `--library <ad>` world'ü kütüphaneye yazar |
| `/motion:setup`, `/motion:doctor` | kurulum / ortam denetimi |

CLI'nin bütün komutları: `motion-render help`; tek komutun kullanımı: `motion-render <komut> --help`; sözleşme: [render/CONTRACT.md](render/CONTRACT.md).

## Higgsfield (isteğe bağlı, kendi hesabınızla)

Üretken görsel/video varlıkları (fotoğraf plakaları, dokular, klipler) için paket Higgsfield'ı kullanabilir; zorunlu değildir. Kullanacaksanız
**kendi hesabınızla** bağlayın: CLI için `npm i -g @higgsfield/cli` → kendi terminalinizde `higgsfield auth login`; Claude Code'da MCP
sunucusu olarak eklemek de mümkündür (Higgsfield'ın kendi kurulum talimatı). Paket anahtar, token ya da oturum bilgisi saklamaz ve kopyalamaz
(`.env` depoya girmez); her üretken çağrıdan önce bakiye okunur, `--dry` ile maliyet tahmini alınır, harcama proje ledger'ına yalnız
`motion-render ingest` yazar. Krediler sizin hesabınızdan düşer. Üretken varlık kullanmayan projeler etkilenmez.

## Sorun giderme

| belirti | çözüm |
|---|---|
| `/motion:*` komutları görünmüyor | Claude Code'u yeniden başlatın ya da oturumda `/reload-plugins`; `claude plugin list` içinde `motion@motion-harness` olmalı |
| `motion-render` bulunamadı | `npm prefix -g` dizinini PATH'e ekleyin (Windows: `%APPDATA%\npm`); yeni terminal açın |
| PowerShell betik çalıştırmıyor | `powershell -ExecutionPolicy Bypass -File .\install.ps1` biçimiyle çalıştırın |
| Kurulum ya da render "Chromium bulunamadı" diyor, başka pencerede çalışıyor | Claude masaüstü uygulamasının Terminal paneli `%LOCALAPPDATA%`'nın ayrı (sanallaştırılmış) bir görünümünü kullanabilir; kurulumu ve uzun koşuları normal bir PowerShell penceresinden çalıştırın |
| Chromium inmiyor (proxy/kurumsal ağ) | `HTTPS_PROXY` ayarlayın, `cd render && npx playwright install chromium` |
| Linux'ta Chromium açılmıyor (eksik `.so`) | `cd render && sudo npx playwright install-deps chromium` |
| "Executable doesn't exist" (önceden çalışıyordu) | Playwright tarayıcı önbelleği kullanıcı çapında paylaşılır; başka bir kurulum sabitlenen sürümü silmiş olabilir: `cd render && npx playwright install chromium`, sonra `motion-render doctor` |
| ffmpeg özelliği eksik (prores_ks, ffv1, loudnorm) | sistem ffmpeg'i kurun (adım 5) ve `MOTION_FFMPEG` ortam değişkenine yolunu yazın |
| Yeni sürüm çekildi ama `/motion:*` eski davranıyor | kurulum betiğini yeniden çalıştırın (plugin metinlerini eşitler); elle: `claude plugin marketplace update motion-harness` + `claude plugin update motion@motion-harness`; Claude Code'u yeniden başlatın |
| render "disk < 40 GB" ile duruyor | kare dizinlerini arşivleyin ya da eşiği `MOTION_MIN_DISK_GB` ile değiştirin (60 fps ≈ 2 MB/kare) |
| fontlar yüklenmiyor | proje kökünde `motion-render vendor fonts` (Google Fonts; lisans metni `fonts/LICENSES.md`); erişim yoksa `MOTION_FONT_SOURCE=npm` |
| Whisper (transkript) | isteğe bağlı: `motion-render init <dir> --with-whisper` (Python 3.10+, `render/requirements.txt`) |

## Katkı ve sorun bildirimi

Hata ve öneriler için [Issues](https://github.com/erndmrtss1/motion-harness/issues) açın: belirti, komut, `motion-render doctor` çıktısı ve
(varsa) ilgili `out/probe/*.json` parçası yeterlidir; müşteri malzemesi (kare, ses, logo, metin) eklemeyin. Pull request'ler memnuniyetle
karşılanır: değişiklik bir projenin **ölçülmüş** ihtiyacından gelmeli, `cd render && npm test` geçmeli ve gizlilik taraması
(`node dev/privacy-scan.mjs`) 0 bulgu vermelidir. Paket süreç taşır, üslup taşımaz: yeni world'ler kütüphaneye yalnız `/motion:promote
--library` yoluyla, müşteri malzemesi ayıklanarak girer. Değişiklikler: [CHANGELOG.md](CHANGELOG.md). Lisans: [MIT](LICENSE).
