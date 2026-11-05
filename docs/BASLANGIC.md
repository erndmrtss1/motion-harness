# Başlangıç

Bu rehber paketi ilk kez kuran ve ilk projesini açan kişi içindir. Paket bir motion grafik **üretim sürecidir** (kapılar, ölçüm, bağımsız
inceleme, DUR) ve bir **world kütüphanesi** taşır. Claude Code plugin'i olarak çalışır: komutlar `/motion:*`, render aracı `motion-render`.

## 1. Kurulum

**Normal bir PowerShell penceresi açın** (Başlat → PowerShell). Claude masaüstü uygulamasının içindeki Terminal panelini kullanmayın: o panel
`%LOCALAPPDATA%`'yı ayrı bir görünümle açar, kurulum önbellekleri orada boş görünür (LESSONS L-223).

```powershell
git clone https://github.com/erndmrtss1/motion-harness
cd motion-harness
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

- Depo özeldir; erişim için depo sahibinin sizi eklemiş olması ve `gh auth login` gerekir.
- Kurulum 6 adımdır ve her adım ✓/✗ basar: Node ≥ 20 + ffmpeg · `render/` bağımlılıkları + Chromium · plugin kaydı · Higgsfield (isteğe bağlı) ·
  smoke testi (12 kare) · özet. Tekrar çalıştırmak güvenlidir.
- **Güncelleme:** `git pull`, sonra `install.ps1`'i yeniden çalıştırın. Kurulu plugin eskiyse "güncellendi a → b", değilse "güncel" der.
  Ardından Claude Code'u yeniden başlatın.
- macOS / Linux: `bash install.sh`.
- **Kurulu klon yalnız sürüm alır.** `motion-render`'ın koştuğu bu klasörde dal değiştirmeyin, dosya düzenlemeyin; pakete katkı ayrı bir klonda ya da
  worktree'de yapılır. Projeler render öncesi bu klonun beklenen tabanda ve temiz olduğunu `tools/render-oncesi` ile denetler (1.4).

Kurulumu Claude Code içinden denetlemek için boş bir klasörde: `/motion:doctor` (✗ varsa `/motion:setup`).

## 2. İlk proje: 10 adım

1. Proje için **boş bir klasör** açın; Claude Code'u o klasörde başlatın.
2. Varsa malzemeyi (seslendirme, logo, görsel) klasöre koyun. Paket malzemeyi yol olarak bağlar; kopyalamaz, taşımaz, silmez.
3. `START.md'yi oku, /motion:init` yazın. Kısa bir mülakat gelir: konu, süre, ses, dil, profil, world, üretken bütçe, teslim.
   Brief dosyanızın başında ön bilgi (frontmatter) varsa soru sormaz (alanlar `commands/init.md`).
4. **World kararı** (bkz. §4): yeni look-dev ya da kütüphaneden bir world.
5. Kurulum raporunu okuyun (**DUR — kurulum**): varsayılanla doldurulan alanları ve açık kararları cevaplayın. Proje bir git deposuysa çelişki
   taraması commit kapısı kuruludur (`git config core.hooksPath .githooks`; değilse depo açınca bu komutu bir kez çalıştırın).
6. Ses varsa `/motion:faz audio`: transkript, vuruş haritası, shot listesi önerisi. Shot sınırlarını onaylayın.
7. `/motion:faz lookdev`: üç yön, ölçümler, taze reviewer kapısı. **Bir yön seçin.**
8. `/motion:faz lexicon`: shot başına nesne sözlüğü. Onaylayın.
9. `/motion:faz P1` (sonra P2 …): varyant → animatik → kapı → hareket kontağı → tam render → QC → teslim kapısı. İlk perdenin animatiğini ve
   **hareket kontağını** (bütün kamera hamleleri ve mekanikler referans kliple yan yana tek videoda; "DUR — hareket") siz onaylarsınız.
10. `/motion:master`: tek sürekli encode, loudness, arşiv, teslim belgesi, master kapısı. Bitince `/motion:promote` ile dersleri taşıyın;
    world'ü kütüphaneye almak isterseniz `/motion:promote --library <ad>`.

## 3. DUR sözleşmesi ve kapılar

- **Her faz bir rapor ve `DUR` satırıyla biter.** Raporun "Açık kararlar" bölümünde sizden ne beklendiği yazar. Onayınız olmadan sonraki faza
  geçilmez. Kapı geçerse faz içindeki akış durmadan sürer.
- **Kapı** (`/motion:gate`): belgeler güncel mi → `qc` + `frame-check` + kontak → gerekirse bağımsız ölçüm → **taze reviewer**. Reviewer işi
  görmemiştir; yalnız çıktıları ve kuralları okur, kendi yöntemiyle ölçer ve tek satırlık `KARAR:` yazar.
- **Eşikler:** full ≥ 7/8 · light ≥ 6/8 · live ≥ 7/8 (§0.6 zevk maddeleri). UCUZ işaretlerinden biri varsa birim geri döner.
- **Tek düzeltme turu:** GEÇMEZ → bir düzeltme turu → yeni reviewer → yine GEÇMEZ ise **DUR**, render yok; kontak ve nedenler size gelir.
- Look-dev kapısında `motion-render lookdev-diff` yönlerin iskeletini ve paletini ölçer; uyarı veren çift için reviewer gerekçe yazmak zorundadır.
- **1.4 — DUR yalnız geri dönüşü pahalı kararda.** Ara sonuçlar size **bilgi kontağı** olarak gelir: dosya gönderilir, akış sürer; müdahale ederseniz
  durulur. Reviewer kilometre taşında açılır (still ve klip ayrı reviewer, referans klip yan yana); ara adımda yalnız değişen katman ölçülür.
  Raporlar kısa istisna biçimindedir (geçenler tek satır; yalnız sapma, açık karar, "kredi yüzünden" satırı ve bütçe açılır).
- **Kararlarınız** aynen `docs/KARAR-TARIHI.md`'ye, güncel özü `project.md`'ye yazılır; `project.md` her zaman yalnız bugünkü kuralı taşır.

## 4. World: kütüphaneden seç ya da yenisini kur

| | kütüphaneden seç | yeni world kur |
|---|---|---|
| komut | `/motion:init --world <ad>` (ya da mülakatta "Kütüphaneden bir world seç") | `/motion:init` (önerilen varsayılan) |
| liste | `skills/motion-world/library/INDEX.md` (bugün: `focusfx-paper`, `desk-paper`, `screen-dark`, `light-ui`, `photo-plate`) | — |
| look-dev | üç yön **aynı world'ün içinde**; ayrışma yapıda (kompozisyon, kamera, hareket, ritim) | brief'ten **sıfırdan** üç gerçekten farklı yön |
| benzerlik | seçilen world'e benzemek beklenir; seçilmemiş bir world'e benzemek UCUZ #11 | kütüphane world'üne ya da önceki projeye benzemek UCUZ #11 |
| ölçüm | bant, kenar düşümü, K1, aksan, hareket sayıları projenin karelerinde yeniden ölçülür | look-dev'de ölçülerek doldurulur |
| aksan rengi | projeden gelir (kütüphanedeki `#D8301A` yer tutucudur) | look-dev'de seçilir |

`focusfx-paper`: gri teknik çizim paftası, lacivert dar kalın yazı ve kılavuz çizgileri, mavi taralı vurgu, merdiven etiketleri, cetvel dili.
Demosu için: `motion-render init <klasör> --world focusfx-paper --demo`.

## 5. Kredi ve Higgsfield

- Üretken yapay zekâ isteğe bağlıdır. Bütçe `project.md` §9'dadır (varsayılan 0 = yalnız motor). Tavan aşılacaksa iş durur ve size sorar.
- Higgsfield oturumu her kullanıcının kendisinindir: `npm i -g @higgsfield/cli` → kendi terminalinizde `higgsfield auth login` → `/motion:doctor`.
  Anahtar `.env`'e yazılmaz, paylaşılmaz; paket bakiyeyi yalnız okur.

## 6. Nereye bakılır

| soru | dosya |
|---|---|
| Akış, fazlar, rapor biçimi | `skills/motion-core/references/PLAYBOOK.md` |
| Roller, verim (V1–V8), belge hijyeni (1.4) | PLAYBOOK §2.1, §2.6, §3.3–§3.5 |
| Çelişki taraması, render öncesi denetim, hareket kontağı (1.4) | `motion-render celiski-tara`, `tools/render-oncesi.ps1` / `.sh`, `motion-render contact motion` |
| Kurallar (SERT / VARSAYILAN) | `skills/motion-core/references/RULES.md` |
| Ölçüm, qc, frame-check | `skills/motion-core/references/MEASURE.md` |
| Reviewer neye bakar, KARAR biçimi | `skills/motion-reviewer/SKILL.md` |
| World sözleşmesi, kütüphane | `skills/motion-world/SKILL.md`, `skills/motion-world/library/INDEX.md` |
| Canlı profil (OBS) | `skills/motion-live/SKILL.md`, `/motion:live` |
| Komutların ayrıntısı | `commands/*.md` |
| `motion-render` komutları | `render/CONTRACT.md`, `motion-render <komut> --help` |
| Dersler (neden böyle) | `skills/motion-core/references/LESSONS.md` |
| Sorun giderme | `README.md` "Sorun giderme", `START.md` §6 |
| Sürüm notları | `CHANGELOG.md` |
