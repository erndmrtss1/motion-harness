---
description: motion plugin'inin çalışma ortamını kurar. Bu makinede motion-render CLI, Node, ffmpeg, Playwright Chromium ve isteğe bağlı Higgsfield CLI oturumu hazırlanır. Ardından /motion:doctor ve motion-render smoke ile doğrular. .env ya da anahtar kopyalamaz.
argument-hint: "[--check-only]"
allowed-tools: Read, Bash, PowerShell, Glob
---

# /motion:setup: kurulum

Argümanlar: `$ARGUMENTS`

`--check-only` verildiyse kurulum adımlarını atla ve yalnız 3. adımı (doğrulama) çalıştır.

Kurulum betikleri plugin kökündedir:

| platform | betik |
|---|---|
| Windows (birincil) | `${CLAUDE_PLUGIN_ROOT}/install.ps1` |
| macOS / Linux | `${CLAUDE_PLUGIN_ROOT}/install.sh` |

## 1. Önce oku, sonra çalıştır

1. Platformun betiğini **baştan sona oku**. Ne kuracağını kullanıcıya 5–8 satırda özetle: hangi paket, hangi sürüm, nereye.
2. Betik sistem genelinde bir şey kuruyorsa (global npm paketi, tarayıcı indirmesi) özeti verdikten sonra çalıştır. Kullanıcı bu komutu kurulum için verdi.

Çalıştırma komutları:

```powershell
powershell -ExecutionPolicy Bypass -File "${CLAUDE_PLUGIN_ROOT}/install.ps1"
```

```bash
bash "${CLAUDE_PLUGIN_ROOT}/install.sh"
```

Betiğin yaptıkları (sırayla):

1. **Node** sürüm denetimi (betikteki alt sınır); eksikse kurulum talimatı.
2. **motion-render CLI**: plugin içindeki `render/` paketinin bağımlılıkları kurulur, `motion-render` komutu PATH'e bağlanır.
3. **Playwright Chromium**: sabitlenmiş Playwright sürümünün kendi Chromium'u. Başka tarayıcı kullanılmaz.
4. **ffmpeg / ffprobe**: PATH'te mi; yoksa kurulum talimatı.
5. **Higgsfield CLI (isteğe bağlı, üretken bütçe > 0 ise):**
   - `npm i -g @higgsfield/cli`
   - **kullanıcı kendisi** `higgsfield auth login` yapar (tarayıcıda OAuth)

## 2. Kimlik kuralı

- `.env` YOK. Token, anahtar ya da kimlik dosyası kopyalanmaz, okunmaz, yazdırılmaz.
- Oturumu kullanıcı kendi açar. Sen yalnız `higgsfield account status --json` ile **bakiye ve plan alanlarını** okursun; e-posta ve ad alanlarını basmazsın.
- Giriş komutunu sen çalıştırmazsın. Kullanıcıya şunu söylersin: "`higgsfield auth login` komutunu kendi terminalinde çalıştır, bitince `/motion:doctor` de."

## 3. Doğrulama

```bash
motion-render doctor          # ortam + Higgsfield oturumu + bakiye (yalnız okuma) + disk
motion-render smoke           # ffmpeg, Chromium, vendor → geçici proje → 12 kare 960×540 → qc → contact
```

Ardından `/motion:doctor`'un tablosunu üret: bileşen · durum (✓/✗) · çözüm.

## 4. Sık engeller

| belirti | çözüm |
|---|---|
| `motion-render` bulunamadı | Betiği yeniden çalıştır; yeni terminal aç (PATH yenilenir). |
| Chromium indirilemedi | Ağ/proxy sorununu bildir. Betiğin Playwright adımını tekrar çalıştır. Sistem tarayıcısına geçme. |
| ffmpeg yok | Windows: `winget install Gyan.FFmpeg` · macOS: `brew install ffmpeg` · Linux: paket yöneticisi. Kullanıcı onayıyla kurulur. |
| `higgsfield account status` hata | Oturum yok ya da süresi dolmuş: kullanıcı `higgsfield auth login`. Üretken bütçe 0 ise bu satır uyarıdır, hata değil. |
| disk < 40 GB | Render'lar çıkış 6 verir. Yer açılması kullanıcı kararıdır; sen dosya silmezsin. |

Kapanış satırı: `**DUR — kurulum.** <✓ sayısı>/<toplam> · eksikler: …` Hepsi ✓ ise sıradaki adım `/motion:init`.
