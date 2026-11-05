---
description: Yeni motion projesi kurar (F0). Ön bilgili (frontmatter) bir brief dosyası verildiyse ya da klasörde varsa soru sormadan kurar (headless); yoksa kısa bir AskUserQuestion mülakatı yapar. Ardından motion-render init çalıştırır, project.md §1–§11, scenes.json, CLAUDE.md, ledger ve docs/ şablonlarını (karar tarihi dahil) doldurur; çelişki taraması commit kapısını (.githooks, core.hooksPath) ve render öncesi makine denetimini (tools/render-oncesi) kurar ve DUR ile biter.
argument-hint: "[brief.md] [hedef-dizin] [--profile full|light|live] [--world lookdev|<kütüphane-ad>]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion
---

# /motion:init: proje kurulumu (F0)

> **Etkileşimsiz oturum (headless):** `claude -p` ile ya da kullanıcı olmadan çalışıyorsan (ör. ortamda `MOTION_EVAL=1`) ajanları **ön planda** başlat (`Agent` çağrısında `run_in_background: false`) ve sonucunu bekle. Arka planda ajan bırakıp turu bitirme: headless süreç tur bitince kapanır ve arka plan ajanları da ölür. Komutun bütün adımları bitmeden son mesajı yazma.

Argümanlar: `$ARGUMENTS`

Akışın kaynağı: `${CLAUDE_PLUGIN_ROOT}/skills/motion-core/references/PLAYBOOK.md` §4.1.

Bu komut yalnız kurar. Look-dev, ses ya da sahne işi yapmaz.

## 0. Ön kontrol

0. Önce `${CLAUDE_PLUGIN_ROOT}/START.md`'yi oku (kullanıcı "START.md'yi oku" dediyse kastedilen bu dosyadır; yeni klasörde START.md yoktur). Ardından `${CLAUDE_PLUGIN_ROOT}/skills/motion-core/SKILL.md`. Kurulum bitince hedef dizine `START.md`'nin bir kopyasını bırak (sonraki oturumlar için).
1. `motion-render --version`'ı çalıştır. Komut yoksa ya da hata verirse dur ve kullanıcıyı `/motion:setup`'a yönlendir. Bu durumda kurulum yapma.
2. Hedef dizini belirle. Argümanda brief dışında bir dizin verildiyse orası, verilmediyse çalışma dizini.
   Argüman bayrakları mülakatın ilgili sorusunu önceden cevaplar (sorulmaz): `--profile full|light|live` → profil; `--world lookdev|<ad>` → world (`<ad>` kütüphaneden: `${CLAUDE_PLUGIN_ROOT}/skills/motion-world/library/INDEX.md`; eski biçim `example:<ad>` ve eski ad `fx-lab` → `focusfx-paper` kabul edilir). Örn. canlı bir proje: `/motion:init --profile live`.
3. Hedefte `scenes.json` zaten varsa üzerine yazma. Mevcut projeyi raporla ve **DUR**.

## 1. Brief kaynağı (headless kurulum)

Sırayla bak:
1. `$ARGUMENTS` içindeki `.md` dosyası.
2. Hedef dizindeki `brief.md`, `BRIEF.md` ya da `*.brief.md`.

Dosyanın başında YAML ön bilgisi (`---` … `---`) varsa **soru sorma**: cevapları buradan oku (headless kurulum). Beklenen alanlar:

```yaml
---
motion-brief: 1
ad: <proje kısa adı, dosya adına uygun>
konu: <alan / konu, tek cümle>
sure: 45                 # saniye; canlı için "canli"
ses: yok | dosya:<göreli yol> | tts | muzik
dil: tr
profil: full | light | live
world: lookdev | <kütüphane-ad>   # ör. focusfx-paper; liste library/INDEX.md (HK-39)
genai_butce: 0           # kredi; 0 = yalnız motor
yasaklar: [ … ]
ilkeler: [ … ]
metin_kurali: <ekrana ne yazılır>   # isteğe bağlı
aksan: <aksan hakkı>                # isteğe bağlı
teslim: [master, h264] | [obs] | [png]
fps: 60                  # isteğe bağlı; varsayılan 60
boyut: 1920x1080         # isteğe bağlı; varsayılan 1920×1080
---
<brief metni → project.md §1'e AYNEN>
```

- Eksik isteğe bağlı alanlar varsayılanla doldurulur: fps 60, 1920×1080, `profil: full`, `world: lookdev`, `genai_butce: 0`.
- Varsayılanla doldurulan her alan `project.md`'de "varsayılan (brief'te yok)" diye işaretlenir ve DUR raporunda açık karar olarak listelenir. **Soru sorulmaz.**
- Ön bilgi yoksa ama brief metni varsa: metin §1'e aynen gider; alanlar §2'deki mülakatla sorulur.

## 2. Mülakat (yalnız ön bilgi yoksa)

`AskUserQuestion` aracını en fazla üç çağrıda kullan. Her çağrıda en çok 4 soru olur. Seçeneklerde kullanıcı "Diğer" ile serbest metin yazabilir.

**Çağrı A: içerik**

| soru | seçenekler |
|---|---|
| Konu / alan? | Ürün ya da hizmet tanıtımı · Açıklayıcı / eğitim · Veri ya da rapor anlatımı · Marka kimliği / logo animasyonu |
| Süre? | ≤ 30 s · 30–90 s · 90 s – 3 dk · Canlı / süresiz |
| Ses? | Hazır seslendirme dosyası var · TTS ile üretilecek · Yalnız müzik · Sessiz |
| Dil? | Türkçe · İngilizce · Türkçe + İngilizce |

**Çağrı B: süreç**

| soru | seçenekler |
|---|---|
| Profil? | full: film, kapı ≥ 7/8 (Önerilen) · light: kısa tek birim, ≥ 6/8 · live: canlı yayın sayfası, ≥ 7/8 |
| World (görsel dil)? | **Yeni look-dev: 3 farklı yön, sen seçersin (Önerilen)** · Kütüphaneden bir world seç (liste bir sonraki soruda) · Kendi referanslarım var, look-dev'e girdi olsun |
| Üretken yapay zekâ bütçesi? | 0: yalnız motor (Önerilen) · Küçük (≤ 50 kredi) · Orta (≤ 200 kredi) · Proje başına ben belirleyeceğim |
| Teslim biçimi? | Master: ProRes 422 HQ + H.264 (Önerilen) · Yalnız H.264 · Canlı: OBS tarayıcı kaynağı · PNG kare dizisi |

**Çağrı C: kurallar**

| soru | seçenekler |
|---|---|
| Projeye özgü yasak ya da ilke var mı? | Şimdilik yok · Var, "Diğer" ile yazacağım |
| Ekrana ne yazılır (metin kuralı)? | Yalnız vurucu cümleler, kelime zamanlı · Konuşulan kelime yazılmaz; yalnız başlık/veri · Look-dev'de birlikte karar verelim |
| Brief metni? | "Diğer" ile şimdi yazacağım · Sonra project.md §1'e kendim yazacağım |

**Kütüphane world'ü (HK-36, HK-39).**
- Kullanıcı "Kütüphaneden bir world seç" derse `${CLAUDE_PLUGIN_ROOT}/skills/motion-world/library/INDEX.md`'yi oku ve tek soruluk bir `AskUserQuestion` ile listeyi sun: her seçenek world adı + INDEX'teki tek cümlelik kimlik (en çok 4 seçenek; fazlası "Diğer" ile yazılır). Ad argümanla (`--world <ad>`) ya da brief ön bilgisiyle (`world: <ad>`) geldiyse soru sorulmaz.
- Seçim `project.md` §6'ya "kütüphane world'ü: <ad> (tarih, kullanıcının seçimi)" diye yazılır; `world.json` `origin: "library:<ad>"` olur (`motion-render init` yazar).
- World seçilmiş projede look-dev üç yönü **o world'ün içinde** üretir (motion-world §2 madde 7); seçilmiş world'e benzerlik UCUZ #11 değildir.

**Ses dosyası.** "Hazır seslendirme" seçildiyse hedef dizindeki ses dosyalarını (`*.wav`, `*.mp3`, `*.m4a`) tara ve tek soruluk bir `AskUserQuestion` ile hangisi olduğunu sor. Dosya bulunamazsa yol "Diğer" ile alınır.

## 3. İskelet

```bash
motion-render init <dizin> --profile <full|light|live> [--world <kütüphane-ad>]   # --world YALNIZ kullanıcının seçimiyle
                                                                     # Whisper yalnız ses dosyası varsa ve kullanıcı yerelde transkript istiyorsa: --with-whisper
motion-render vendor scripts                                         # React/ReactDOM/Babel (fontlar look-dev'de)
```

- Kullanıcı malzemesi (ses, logo, görsel) **yol olarak** bağlanır. Kopyalanmaz, taşınmaz, silinmez.
- Her malzeme için §7'ye şunlar yazılır: boyut, süre/fps, zemin, filigran, lisans notu. Lisans bilinmiyorsa açık karar olur.

**1.4 ile `motion-render init`'in ayrıca kopyaladıkları** (PLAYBOOK §2.6, §3.5):

| dosya | iş |
|---|---|
| `.githooks/pre-commit` | çelişki taraması commit kapısı: `motion-render celiski-tara` bulgu verirse ya da brief tavanı aşılırsa commit yok |
| `docs/celiski.json` | bağlayıcı belge kümesi, brief listeleri ve token tavanları (varsayılan proje brief'i 60k, director brief'i 30k; proje değiştirebilir) |
| `tools/render-oncesi.ps1` + `tools/render-oncesi.sh` | render/encode öncesi makine denetimi: kurulu harness klonu beklenen tabanda ve temiz mi, başka Playwright Chromium / ffmpeg süreci var mı; çıkış 1 → render yok |
| `docs/KARAR-TARIHI.md` · `docs/BRIEF-DIRECTOR.md` · `docs/PAKET-NOTLAR.md` | karar tarihi (karar metni aynen) · director görev brief'i (sanat yönetmeni brief'i) · paket bulguları (şablonlardan) |

- **hooksPath.** Hedef bir git deposuysa (`git rev-parse --is-inside-work-tree` başarılı) proje kökünde bir kez `git config core.hooksPath .githooks` çalıştır ve
  `INIT.md`'ye yaz. Depo değilse git deposu açmazsın; `INIT.md`'ye "depo açılınca: `git config core.hooksPath .githooks`" notu düşülür.
- `render-oncesi`'nin beklenen tabanı kurulu harness klonunun şu anki commit'idir; harness geliştirmesi kurulu klonda yapılmaz (ayrı klon ya da worktree).
- Kurulumdan sonra `motion-render celiski-tara` bir kez koşturulur; şablonlardan gelen yer tutucular bulgu vermemelidir (bulgu varsa INIT.md'de açık karar).

## 4. Doldur

`motion-render init` şablonları `${CLAUDE_PLUGIN_ROOT}/templates/` klasöründen kopyalar. Sen yalnız brief'ten gelen değerleri yazarsın; **değer uydurmazsın**.

| dosya | ne yazılır |
|---|---|
| `project.md` §0 | öncelik notu (şablon) + teslim biçimi |
| §1 | brief, **aynen**, tarihli |
| §2 | kimlik okuması iskeleti; metin kuralı (cevaptan ya da "look-dev'de"); "ses yönetir" satırı |
| §3 | kalite çıtası: profil eşiği (full ≥ 7/8 · light ≥ 6/8 · live ≥ 7/8; proje yükseltebilir); UCUZ 12 (#1–#11, #17) + "ek maddeler: yok" (proje maddeleri #12–#16, #18…) |
| §4 | palet / yazı / aksan: "world seçilince" (aksan hakkı cevaptan) |
| §5 | yasaklar ve ilkeler (aynen) |
| §6 | world: `lookdev` (Önerilen yol) ya da kütüphaneden `<ad>` + seçim kaydı (tarih, kullanıcı cümlesi) |
| §7 | malzeme ve lisans tablosu |
| §8 | ses ve metin: kaynak, dil, TTS/kayıt, kelime dosyaları yeri |
| §9 | üretken varlık: bütçe (kredi; 0 ise "üretim yok"), politika dosyası yolu (GENAI.md) |
| §10 | ölçü hedefleri: profil varsayılanları, `MEASURE.md`'den kopya; proje değeri yok |
| §11 | karar tablosu (id · tarih · öz · durum): F0 kararlarının özü; kullanıcı metni aynen `docs/KARAR-TARIHI.md` "### 11.F0" altına |
| `scenes.json` | `fps`, `width`, `height`, `profile`, `world`, `audio` (yol ya da `null`), `animatic`, `gate.taste` (= profil eşiği) |
| `CLAUDE.md` | proje adı; bağlayıcı sıra (CLAUDE.md → project.md → scenes.json → world/ → motion-core); daimi kurallar (şablondan). **≤ 60 satır** kalır: komut listesi ve uzun kural metni ayrı belgeye |
| `assets/gen/manifest.json` | boş ledger: `items: []`, `ledger: []`, `lost: []`. Bütçe §9 ile aynı |
| `docs/` | `REVIEWER.md` (başlık), `RETRO.md`, `KARAR-TARIHI.md` (F0 kararları aynen), `INIT.md` (kurulum raporu) · `out/RENDER_REPORT.md` |

`scenes` dizisi boş kalır; birimler `/motion:faz P<n>`'de eklenir.

World kütüphaneden seçildiyse `world/` o world'ün dosyalarıyla dolar (`origin: "library:<ad>"`); look-dev fazında `band`, `edgeDark`, `k1`, aksan ve hareket sayıları projenin karelerinde yeniden ölçülür (aksan rengi projeden; kütüphanedeki değer yer tutucudur). World `lookdev` ise `motion-render init` yalnız bir `world/world.json` İSKELETİ yazar: `band` ve `k1.mask` "TANIMLANMADI" işaretlidir (yanında `world/README.md`); bu alanlar look-dev fazında ölçülerek doldurulur, dolmadan `qc` çalışmaz ("world.band tanımlı değil"). Sahne kodu ancak look-dev'den sonra yazılır.

## 5. Doğrula

```bash
motion-render manifest validate
motion-render doctor            # bakiye yalnız okunur
motion-render celiski-tara      # bağlayıcı küme çelişkisi + brief tavanı (1.4); çıkış 0 beklenir
```

## 6. Rapor ve DUR

`docs/INIT.md` dosyasını yaz ve aynı özeti kullanıcıya ver. Rapor PLAYBOOK §7 biçimindedir ve kısa tutulur. Bölümler:
- yazılan dosyalar tablosu (1.4 kopyaları dahil: `.githooks/pre-commit`, `docs/celiski.json`, `tools/render-oncesi.*`; hooksPath durumu)
- bağlanan malzeme
- varsayılanla doldurulan alanlar
- açık kararlar (numaralı, öneri + etki)
- sıradaki komut:
  - ses varsa `/motion:faz audio`
  - sonra `/motion:faz lookdev`
  - sonra `/motion:faz lexicon`
  - sonra `/motion:faz P1`

Kapanış satırı: `**DUR — kurulum (F0).** project.md §1–§10'u gözden geçir; açık kararları cevapla ya da sıradaki komutu ver.`
