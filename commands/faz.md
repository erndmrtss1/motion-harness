---
description: Bir motion fazını PLAYBOOK'a göre yürütür. Fazlar audio (ses hattı), lookdev (3 yön → yön seçimi), lexicon (sözlük/kaynak kapısı), ilkel (hareket mekaniği kütüphanesi → onay) ve P<n> (perde/birim döngüsü) olabilir. Yapımı motion-director'a, ihtiyaç ve kaynak işini motion-research'e, bağımsız ölçümü motion-measure'a verir; kapılarda taze motion-reviewer açar. Rapor ve DUR ile biter.
argument-hint: "<audio|lookdev|lexicon|ilkel|P<n>> [faz istemi / KARARLAR / ARA NOTLAR]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent
---

# /motion:faz: faz yürütme

> **Etkileşimsiz oturum (headless):** `claude -p` ile ya da kullanıcı olmadan çalışıyorsan (ör. ortamda `MOTION_EVAL=1`) ajanları **ön planda** başlat (`Agent` çağrısında `run_in_background: false`) ve sonucunu bekle. Arka planda ajan bırakıp turu bitirme: headless süreç tur bitince kapanır ve arka plan ajanları da ölür. Komutun bütün adımları bitmeden son mesajı yazma.

Argümanlar: `$ARGUMENTS`
- İlk sözcük faz kodudur.
- Kalan metin varsa kullanıcının faz istemidir. İskeleti PLAYBOOK §3.1'dedir: KARARLAR · İLKE/KURAL · numaralı işler · YAP/YAPMA · DOKUNULMAZ · AKIŞ · REVIEWER · DUR.

Akışın tek kaynağı: `${CLAUDE_PLUGIN_ROOT}/skills/motion-core/references/PLAYBOOK.md`.

Önce §0–§3 ve fazın bölümünü oku:

| faz | PLAYBOOK bölümü |
|---|---|
| `audio` | §4.2 + `AUDIO.md` |
| `lookdev` | §4.3 + `${CLAUDE_PLUGIN_ROOT}/skills/motion-world/SKILL.md` |
| `lexicon` | §4.4 |
| `ilkel` | §4.4a (ilkel kütüphanesi onayı; film bundan sonra) |
| `P<n>` | §4.5 + §5 |

## Sen kimsin

Ana oturum **orkestradır**.
- Ajanlar birbirini çağıramaz. El değiştirme dosyayla ve senin üzerinden olur.
- Kapıyı kendi puanınla geçirmezsin.
- Yapımı ister kendin yaparsın ister `motion:motion-director`'a verirsin. Uzun ve çok adımlı yapımda director tercih edilir.

**Ajan türleri:**
- `motion:motion-director`
- `motion:motion-research`
- `motion:motion-measure`
- `motion:motion-reviewer`

**Tür bulunamazsa:** genel amaçlı ajan aç ve isteme şunu koy: "Önce `${CLAUDE_PLUGIN_ROOT}/agents/<ad>.md` dosyasını oku ve oradaki rolü birebir üstlen." Reviewer ve measure için ayrıca şunu ekle: "Edit kullanma; Write yalnız belirtilen out/ alt klasörüne; betiği dosyadan koş (stdin'e betik yok)."

Her ajan isteği **tek görev, tek çıktı, en küçük bağlam** ilkesine uyar: yalnız gereken dosya yolları verilir; katalog ya da uzun çıktı kopyalanmaz.

**Roller (1.4, PLAYBOOK §2.1).** Sen kapı ve QA'sın: tasarım yapmazsın, ölçtürürsün, kararı belgeye işlersin; teknik kısımlar (araç ayarı, `checks/`, ölçü tanımı, belge hijyeni) sende kalabilir.
Director sanat yönetmeni brief'iyle (`docs/BRIEF-DIRECTOR.md`) çalışan tek tasarımcı-uygulayıcıdır. Ölçüm işi ≤ 3 madde, reviewer işi ≤ 3 soru; ikisi de tek tur.

## 0. Faz açılışı (her fazda)

1. Sırayla oku: `CLAUDE.md` → `project.md` → `scenes.json` → `world/` → `docs/REVIEWER.md`'nin son kayıtları.
2. **Kararlar önce belgeye** (PLAYBOOK §3.5). İstemdeki KARARLAR ve KURAL'ları işe başlamadan kullanıcı metni **aynen ve tarihli** `docs/KARAR-TARIHI.md` sonuna (`### 11.<faz>`) yaz; güncel özü `project.md`'nin ilgili bölümüne ve §11 tablosuna (id · tarih · öz · durum).
   - Değişen spec satırının eski metni karar tarihine taşınır; `project.md`'de üstü çizili satır ya da silinti notu bırakılmaz.
   - KAPALI KARAR'ları işaretle; açık karar listesine bir daha girmezler.
   - YAPMA maddeleri §12 borç kütüğüne gider.
   - `motion-render celiski-tara` çıkış 0 (bulgu varsa önce belge düzeltilir).
3. Ön koşulları kontrol et:
   - `motion-render doctor`: bakiye yalnız okunur, disk ≥ 40 GB.
   - `world.json` (audio ve lookdev hariç her fazda zorunlu).
   - Onaylı sözlük (`P<n>` için).
   - Render içeren fazda `tools/render-oncesi.ps1` (ya da `.sh`) çıkış 0; 1 → render yok (DUR-8).
4. **Değişiklik listesi ve kapsam** (1.4, PLAYBOOK §3.4). Fazın dokunacağı katman · ilkel · kamera · plaka listesini çıkar; ölçüm kapsamı (V1) ve kilometre
   taşları (V2; `project.md` §3 "QA kapsamı") buradan belli olur. Ara adımda reviewer açılmaz; sonuç bilgi kontağıdır (dosya gönderilir, akış sürer).
5. **Director görevi.** Görev `docs/BRIEF-DIRECTOR.md` (şablondan) ile verilir: §1 kullanıcının sanat yönetmeni metni aynen (tek estetik ölçüt), §2 iş,
   §8 güncel iş; kapı listesi yazılmaz; ≤ 30k token. Uzun görevde director her adımda commit + `docs/CHECKPOINT-<görev>.md` satırı yazar; kesinti olursa
   devam etmeden önce artefakt + ledger mutabakatı, tanık kare ve süreç listesi denetlenir (PLAYBOOK §2.6).
6. Uzun işler arka planda koşar ya da `motion-render wait --id <id> --tag <T>|- --frames N --expect <s>` ile beklenir (üst sınır = 2 × expect). Elle bekleme döngüsü yazılmaz. Beklerken belge işleri yapılır (PLAYBOOK §2.4). Aynı anda tek render; probe/ölçüm ≤ 2 paralel.

## 1. `audio`: ses hattı

1. Kaynak `scenes.json` `audio` alanıdır. Yoksa: "ses yok" → **DUR**.
2. Komutlar:
   - `motion-render transcribe <ses> --out script/<ad>` (Whisper isteğe bağlı; kurulu değilse kullanıcının transkript dosyası istenir)
   - `transcribe verify`
   - `beats <ses> --words … --out script/BEATS.md`
   - ses değiştiyse `audio-diff` + `amap build` ve `docs/SES-KAYMA-<ses>.md` (şablondan)
3. Bağımsız senkron ve kayma ölçümü `motion:motion-measure`'a verilir. Ölçüm iki yoldan yapılır: kelime çapası ve zarf.
4. Shot listesi önerisi: kesme TC = cümle sınırı çevresindeki en uzun sessizliğin ortası.
5. Metin farkı beklenen yerler dışındaysa **DUR** (DUR-8).
6. Rapor + **DUR — ses hattı** (BEATS tablosu, kayma, açık kararlar).

## 2. `lookdev`: world kurulumu

1. İsteğe bağlı: `motion:motion-research` (`referans`) → `docs/research/REF-<konu>.md`. Yalnız öğrenme içindir; seçilmemiş kütüphane world'leri referans değildir.
2. `motion:motion-director` görevi: **3 gerçekten farklı yön**.
   - Her yön `world/lookdev/<yön>/` altında geçici `world.json` + jsx olarak tutulur.
   - Her yön aynı üç kilit anda still verir.
   - Ölçüm tablosu: ayrışan eksenler · bant · metin kontrastı · en küçük metin · K1 · kenar düşümü · aksan ΔE2000 · yapanın §0.6 puanı · risk.
   - Kontak sayfası.
   - Kütüphane world'ü yalnız §6'da kayıtlı seçimle kullanılır. Seçilmişse üç yön o world'ün üç uygulamasıdır; ayrışma yapısal eksenlerde (motion-world §2.7).
3. **Kapı:** `/motion:gate LOOK lookdev` ile aynı adımlar. Taze reviewer şunlara bakar: yön başına SEÇ/ELE, #11 seçilmemiş world türevi, altı eksende ayrışma (world seçilmişse yapısal eksenlerde).
4. **DUR — yön seçimi.** Üç yön, ölçümler ve reviewer kararı kullanıcıya gider. Seçimi kullanıcı yapar.
5. Seçim geldiğinde (sonraki mesaj ya da `/motion:faz lookdev seç <yön>`):
   - `world/world.json` kesinleşir. `band` ve `k1.mask` zorunludur; değerler seçilen yönden **ölçülür**.
   - `world/lessons.md` ve `world/DECISIONS.md` yazılır.
   - `motion-render vendor fonts`, `motion-render manifest validate`.
   - Seçilmeyen yönler arşivlenir, silinmez.

## 3. `lexicon`: sözlük ve kaynak kapısı

1. `motion:motion-research` (`sozluk`) → `docs/research/SOZLUK-taslak-<birim>.md`.
   - Kaynaklı içerik gerekiyorsa `kaynak` görevi verilir: aday tablosu, "kaynaktan aynen", "doğrulanamadı" işaretleri.
2. Bilinen bir eleme kuralı varsa adaylardan **önce** sorulur. Rapora "Senden gerekenler" maddesi olarak yazılır.
3. Taslağı `docs/SOZLUK.md`'ye (şablon `templates/SOZLUK.md`) sen işlersin. Kullanıcı onayına kadar sözlük **taslaktır**.
4. **DUR — sözlük onayı** (aday seçimi varsa DUR 1). Onaylı sözlük bağlayıcıdır; ondan sapmak kullanıcı kararıdır.

## 3a. `ilkel`: hareket mekaniği kütüphanesi (PLAYBOOK §4.4a)

1. Sözlükten mekanik envanteri çıkar (alet yalnız cümle anlamı isterse). `docs/CRAFT-REF.md` yoksa şablondan aç; referans klipler `project.md` §3'te olmalı
   (yoksa **DUR**, referans iste).
2. `motion:motion-director`'a tek görev: "ilkel kütüphanesi: <mekanikler> — world ilkeli + `motion-render motion-test <ilkel> --ref <klip>` her biri".
   Girdi: tüm sözlük, CRAFT-REF, referans klipler. Kapı listesi verilmez.
3. Test çıktıları (`out/motion-test/*/`) kusur ölçülerine bakılır (C1 ≤ %5 tepe, giriş/çıkış ≥ 0,4 s, tek kare 0); kullanıcıya ve kapıya bütün mekanikler
   referans klipleriyle yan yana **tek videoda** gider (1.4); `/motion:gate ilkel varlik` taze reviewer (≤ 3 soru). Ortak nesne ilkelleri de bu fazdadır.
4. **DUR — mekanik onayı** (DUR-1). Onaylananlar CRAFT-REF §4 ve `world/DECISIONS.md`; `P1` ancak bundan sonra açılır.

## 4. `P<n>`: perde / birim döngüsü (PLAYBOOK §4.5)

```
sözlük ✓ → zaman + devir → izdüşüm kapısı → 3 varyant still/shot → varyant kapısı → seçim
→ animatik → ölçüm → belgeler → animatik kapısı (still ve klip ayrı) → [tek düzeltme turu]
→ hareket kontağı → "DUR — hareket" (1.4) → tam render → kare sonrası + QC + ölçüm
→ belgeler → teslim kapısı → kapanış → rapor → DUR
```

1. **Açılış.**
   - `scenes.json`'a birim kaydı açılır: `frames`, `tc`, `keys`, `k1`, `checks`, `hooks`, `slice`, `redQuota`…
   - Künye açılır: `docs/KUNYE-P<n>.md` (şablon `templates/KUNYE.md`).
2. **İhtiyaç.** Gerekirse `motion:motion-research` (`ihtiyac`) → `assets/gen/requests/P<n>.json`.
   - Üretim director'ın işidir ve GENAI.md prosedürüyle yapılır.
   - Bütçe dışı, liste dışı ya da sapma > %10 ise **DUR** (DUR-2).
3. **Yapım.** `motion:motion-director`'a tek görev verilir: "P<n>: zaman + devir + izdüşüm kapısı + 3 varyant still/shot".
   - Girdi (brief = film bağlamı): `docs/BRIEF-DIRECTOR.md` (sanat yönetmeni brief'i) + birim id, **tüm** sözlük, `docs/CRAFT-REF.md`, onaylı ilkeller, BEATS yolu,
     research çıktıları, değişiklik listesi. Kapı listesi brief'e yazılmaz; kapılar işten sonra QA olarak koşar (PLAYBOOK §3.1, §3.3). Onaylı ilkel kütüphanesi
     yoksa P<n> açılmaz (§4.4a).
   - Director'ın raporundaki **§0.6 (yapan)** puanını not et. Bu puan reviewer'a verilmez.
4. **Varyant kapısı.** `/motion:gate P<n> varyant` adımları uygulanır.
   - Seçimler uyuşursa sürer.
   - Uyuşmazsa güçlü gerekçe kazanır ve rapora yazılır. Kararsızsa açık karar → **DUR**.
   - `light` profilde varyant seçimi animatik kapısıyla birlikte yapılır.
5. **Animatik.** Director: animatik + qc + frame-check `--sheet` + contact + ours. Ölçümler künyeye yazılır.
6. **Animatik kapısı.** `/motion:gate P<n> animatik`: still'ler ve mp4 **ayrı taze reviewer**'a gider, her birine ≤ 3 soru. Tek düzeltme turu kuralı gate komutundadır.
   - Projenin **ilk perdesinde** animatik kullanıcıya gider (**DUR**).
   - Sonraki perdelerde faz istemi aksini demedikçe "KAPI GEÇERSE DURMA".
6a. **Hareket kontağı** (1.4, PLAYBOOK §4.5 Adım 6a). Director `motion-render contact motion P<n> …` ile bütün hamleleri ve mekanikleri referans kliple yan yana
    tek videoda verir → `motion:motion-measure` (≤ 3 madde: M-C, M-SEYAHAT, M-VURUS/M-ONCU) → `/motion:gate P<n> hareket` → ilk perdede ve yeni
    hamle/mekanik giren perdede **"DUR — hareket"** (DUR-12); öteki perdelerde bilgi kontağı.
7. **Tam render.** Director'a verilir: `tools/render-oncesi` çıkış 0, kare bütçesi, disk, 2×/S×, `run` zinciri. Bekleme arka planda yapılır; aynı anda tek render.
8. **Ölçüm.** Sayısal ön koşul varsa (K1, aksan ΔE, devir, senkron, varlık kabulü) `motion:motion-measure` paralel çalışır.
9. **Belgeler reviewer'dan önce:** künye, §Na, `scenes.json` istisnaları, `out/RENDER_REPORT.md`.
10. **Teslim kapısı.** `/motion:gate P<n> teslim`.
11. **Kapanış:**
    - REVIEWER kaydı yerinde mi
    - RETRO girişi, `world/lessons.md` dersleri, `docs/PAKET-NOTLAR.md` bulguları — faz sonunda **tek seferde** (V5)
    - RENDER_REPORT
    - bakiye; "kredi yüzünden yapılmadı / kabul edildi" satırı (doluysa DUR)
    - süreç listesi temiz (bu oturumun başlattığı python/node/ffmpeg/Chromium kalmadı) · `celiski-tara` 0 · checkpoint son satırı + commit
    - videoların ve kontağın yolları

## 5. Faz raporu (PLAYBOOK §7)

Rapor `docs/F<n>-RAPOR.md` (ya da `docs/<faz>-RAPOR.md`) sonuna eklenir ve kullanıcıya verilir.

- **Ara DUR, kapı sonucu, bilgi kontağı** → **istisna raporu** (PLAYBOOK §7.1, ≤ 40 satır): geçenler tek satır tablo (madde · sayı · eşik · ✓); yalnız sapma
  (bağlayıcı sapma ilk sırada), açık karar, "kredi yüzünden yapılmadı / kabul edildi" satırı ve ledger açılır; `**DUR — …**` ya da bilgi kontağı.
- **Faz kapanışı** → kapanış raporu (PLAYBOOK §7.2). Sıra sabittir:

```markdown
# <faz> · <kapsam>: <tek satır sonuç>
<sonuç paragrafı: reviewer KARAR (§0.6 x/8, UCUZ …) · yapan x/8 → fark · kredi <k>, bakiye <önce> → <sonra>>
## Kapılar               | kapı | sonuç |   (KARAR satırları REVIEWER.md ile aynı)
## <faza özgü>           (teşhis · zaman · dikiş · varyant · kayma …)
## Ara notlarına yanıt   (varsa)
## Açık kararlar         (numaralı · öneri + etki; KAPALI KARAR yok)
## Borç tablosu          (teslim fazlarında)
## Dosyalar              (göreli yollar)
## Katkı                 (1–3 madde; A/B'siz "deneme"; yoksa "katkı yok")
**DUR — <nokta>.** <beklenen onay ya da karar>
```

Bütün sayılar birimlidir. Her "giderildi" kare numarasıyla kanıtlanır. DUR sırasında DUR'a bağlı olmayan işler sürer ve raporda "DUR sırasında yapılanlar" bölümüne yazılır.
