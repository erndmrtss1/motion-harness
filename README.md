# motion-harness

Claude Code için motion-grafik üretim hattı (plugin `motion`). Kanıtlanmış bir üretim **sürecini** taşır — kapılar, ölçüm (`qc` + `frame-check`), bağımsız reviewer, 3 yönlü varyant, animatik, tek düzeltme turu, DUR noktaları, rapor — ama hiçbir görsel **üslubu** varsayılan getirmez: her proje kendi dilini look-dev'de sıfırdan kurar.

## Kurulum (3 satır)

Windows (PowerShell):

```powershell
git clone https://github.com/erndmrtss1/motion-harness
cd motion-harness
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

macOS / Linux:

```bash
git clone https://github.com/erndmrtss1/motion-harness && cd motion-harness && bash install.sh
```

Kurulum: Node ≥ 20 · `render/` bağımlılıkları + Playwright Chromium · `motion-render` komutu · Claude Code plugin kaydı (`motion@motion-harness`) · Higgsfield oturum denetimi (isteğe bağlı) · smoke testi (12 kare). Her adım ✓/✗ basar; tekrar çalıştırmak güvenlidir.

## Kullanım

Boş bir klasörde Claude Code'u açın ve şunu yazın:

```
START.md'yi oku, /motion:init
```

`/motion:init` mülakatla (alan, süre, ses, dil, profil `full|light|live`, world, üretken bütçe, yasaklar, teslim biçimi) projeyi kurar. Sonra fazlar: `/motion:faz audio` → `/motion:faz lookdev` → `/motion:faz lexicon` → `/motion:faz P1` … → `/motion:master`. Her faz bir rapor ve **DUR** ile biter; onayınız olmadan sonraki faza geçilmez. Ayrıntı: [START.md](START.md).

| komut | iş |
|---|---|
| `/motion:init` | proje kurulumu (mülakat ya da brief dosyası) |
| `/motion:faz <audio\|lookdev\|lexicon\|P<n>>` | bir fazı yürütür, raporlar, durur |
| `/motion:gate` | kapı: qc + frame-check + taze reviewer |
| `/motion:master` | master + arşiv zinciri |
| `/motion:live` | canlı profil (OBS tarayıcı kaynağı) |
| `/motion:promote` | RETRO dersini core/world'e önerir |
| `/motion:setup`, `/motion:doctor` | kurulum / ortam denetimi |

Birden çok projeyi yukarıdan yönetecekseniz (faz istemi yazan, raporları denetleyen bir danışman oturumu): [templates/ADVISOR.md](templates/ADVISOR.md). Paketin değerlendirmesi: [evals/](evals/) ve [docs/H4-EVAL.md](docs/H4-EVAL.md).

## Sorun giderme

| belirti | çözüm |
|---|---|
| `/motion:*` komutları görünmüyor | Claude Code'u yeniden başlatın ya da oturumda `/reload-plugins`; `claude plugin list` içinde `motion@motion-harness` olmalı |
| `motion-render` bulunamadı | `npm prefix -g` dizinini PATH'e ekleyin (Windows: `%APPDATA%\npm`); yeni terminal açın |
| PowerShell betik çalıştırmıyor | `powershell -ExecutionPolicy Bypass -File .\install.ps1` biçimiyle çalıştırın |
| Chromium inmiyor (proxy/kurumsal ağ) | `HTTPS_PROXY` ayarlayın, `cd render && npx playwright install chromium` |
| Chromium önceden çalışıyordu, şimdi "Executable doesn't exist" | Playwright tarayıcı önbelleği kullanıcı çapında paylaşılır; başka bir Playwright kurulumu paketin sabitlediği sürümü silmiş olabilir. `cd render && npx playwright install chromium`, sonra `/motion:doctor` |
| ffmpeg özelliği eksik (prores_ks, ffv1, loudnorm) | Windows: `winget install Gyan.FFmpeg`; macOS: `brew install ffmpeg`; sonra `MOTION_FFMPEG` ortam değişkenine yolunu yazın |
| `marketplace add` başarısız (özel depo) | `gh auth login` ve `gh auth setup-git`; ya da klonlanmış klasörden kurun (varsayılan) |
| Higgsfield oturumu yok | `npm i -g @higgsfield/cli` → `higgsfield auth login` → `/motion:doctor`. Anahtar `.env`'e yazılmaz; üretken varlık kullanmayan projeler etkilenmez |
| render "disk < 40 GB" ile duruyor | kare dizinlerini arşivleyin ya da eşiği `MOTION_MIN_DISK_GB` ile değiştirin (60 fps ≈ 2 MB/kare) |
| fontlar yüklenmiyor | proje kökünde `motion-render vendor fonts` (Google Fonts; lisans metni `fonts/LICENSES.md`). Google Fonts'a erişim yoksa `MOTION_FONT_SOURCE=npm` (npm `@fontsource` paketleri) |
| Whisper (transkript) | isteğe bağlı: `motion-render init <dir> --with-whisper` (Python 3.10+, `render/requirements.txt`) |

Kaldırma: `uninstall.ps1` / `uninstall.sh` (projelere dokunmaz). Değişiklikler: [CHANGELOG.md](CHANGELOG.md).
