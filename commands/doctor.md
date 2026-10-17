---
description: motion ortamını denetler. motion-render doctor çalıştırır ve plugin, Node, ffmpeg, Chromium, vendor, Higgsfield oturumu + bakiye (yalnız okuma) ve disk için ✓/✗ tablosu verir. Hiçbir şey kurmaz, değiştirmez.
argument-hint: "[--project <dizin>]"
allowed-tools: Read, Bash, Glob
---

# /motion:doctor: ortam denetimi

Argümanlar: `$ARGUMENTS`

Bu komut **salt okurdur**. Kurulum yapmaz, dosya yazmaz, kimlik dosyası açmaz.

## Çalıştır

```bash
motion-render doctor $ARGUMENTS
```

`motion-render` bulunamazsa diğer satırları elle denetle. Bu satırı ✗ işaretle ve çözüm sütununa `/motion:setup` yaz.

## Denetim tablosu

| bileşen | nasıl | ✓ ölçütü |
|---|---|---|
| plugin | `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json` okunur | ad `motion`, sürüm yazılır; `skills/`, `agents/`, `commands/`, `render/` mevcut |
| Node | `node --version` | install betiğindeki alt sınırı karşılıyor |
| motion-render | `motion-render --version` | sürüm `render/CONTRACT.md` sürümüyle uyumlu |
| ffmpeg / ffprobe | `ffmpeg -version`, `ffprobe -version` | PATH'te |
| Chromium | doctor çıktısı (Playwright'ın kendi Chromium'u, sabit sürüm) | bulunuyor ve açılıyor |
| vendor (projede) | proje kökünde `vendor/` (React/ReactDOM/Babel) ve `fonts/` | proje içindeysen var; değilse "proje yok" (hata değil) |
| Higgsfield | `higgsfield account status --json`: **yalnız** `credits` ve `subscription_plan_type` alanları | oturum geçerli. Bütçe 0 ise eksikliği uyarıdır |
| disk | çıktı diskinde boş alan | ≥ 40 GB. Altındaysa render çıkış 6 verir |
| proje (varsa) | `motion-render manifest validate` | şema ✓; `world.json`'da `band` ve `k1.mask` var (look-dev sonrası) |

## Kurallar

- Bakiye **yalnız okunur**. Üretken çağrı, model listeleme ya da maliyet sorgusu yapılmaz.
- E-posta, kullanıcı adı, token ya da kimlik dosyası yolu basılmaz.
- `.env` aranmaz, önerilmez (paket kararı: kimlik CLI oturumundadır).

## Çıktı

```
| bileşen | durum | değer | çözüm |
```

- Son satır `DOCTOR: <✓>/<toplam> ✓ · bakiye <kredi|okunamadı> · disk <GB>` biçimindedir.
- ✗ varsa: `Kurulum için: /motion:setup` (ya da `${CLAUDE_PLUGIN_ROOT}/install.ps1` / `install.sh`).
