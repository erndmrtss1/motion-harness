---
description: Bir motion fazını PLAYBOOK'a göre yürütür. Fazlar audio (ses hattı), lookdev (3 yön → yön seçimi), lexicon (sözlük/kaynak kapısı) ve P<n> (perde/birim döngüsü) olabilir. Yapımı motion-director'a, ihtiyaç ve kaynak işini motion-research'e, bağımsız ölçümü motion-measure'a verir; kapılarda taze motion-reviewer açar. Rapor ve DUR ile biter.
argument-hint: "<audio|lookdev|lexicon|P<n>> [faz istemi / KARARLAR / ARA NOTLAR]"
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

**Tür bulunamazsa:** genel amaçlı ajan aç ve isteme şunu koy: "Önce `${CLAUDE_PLUGIN_ROOT}/agents/<ad>.md` dosyasını oku ve oradaki rolü birebir üstlen." Reviewer ve measure için ayrıca şunu ekle: "Write/Edit kullanma; yalnız belirtilen out/ alt klasörüne Bash ile yaz."

Her ajan isteği **tek görev, tek çıktı, en küçük bağlam** ilkesine uyar: yalnız gereken dosya yolları verilir; katalog ya da uzun çıktı kopyalanmaz.

## 0. Faz açılışı (her fazda)

1. Sırayla oku: `CLAUDE.md` → `project.md` → `scenes.json` → `world/` → `docs/REVIEWER.md`'nin son kayıtları.
2. **Kararlar önce belgeye.** İstemdeki KARARLAR ve KURAL'ları işe başlamadan `project.md` §11'e yaz: tarihli, "kullanıcı" etiketli, aynen.
   - KAPALI KARAR'ları işaretle; açık karar listesine bir daha girmezler.
   - YAPMA maddeleri §12 borç kütüğüne gider.
3. Ön koşulları kontrol et:
   - `motion-render doctor`: bakiye yalnız okunur, disk ≥ 40 GB.
   - `world.json` (audio ve lookdev hariç her fazda zorunlu).
   - Onaylı sözlük (`P<n>` için).
4. Uzun işler arka planda koşar ya da `motion-render wait --id <id> --tag <T>|- --frames N --expect <s>` ile beklenir (üst sınır = 2 × expect). Elle bekleme döngüsü yazılmaz. Beklerken belge işleri yapılır (PLAYBOOK §2.4).

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

1. İsteğe bağlı: `motion:motion-research` (`referans`) → `docs/research/REF-<konu>.md`. Yalnız öğrenme içindir; örnek world'ler referans değildir.
2. `motion:motion-director` görevi: **3 gerçekten farklı yön**.
   - Her yön `world/lookdev/<yön>/` altında geçici `world.json` + jsx olarak tutulur.
   - Her yön aynı üç kilit anda still verir.
   - Ölçüm tablosu: ayrışan eksenler · bant · metin kontrastı · en küçük metin · K1 · kenar düşümü · aksan ΔE2000 · yapanın §0.6 puanı · risk.
   - Kontak sayfası.
   - Örnek world'ler, kullanıcının §6'da kayıtlı açık isteği yoksa kullanılmaz.
3. **Kapı:** `/motion:gate LOOK lookdev` ile aynı adımlar. Taze reviewer şunlara bakar: yön başına SEÇ/ELE, #11 örnek world türevi, altı eksende ayrışma.
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

## 4. `P<n>`: perde / birim döngüsü (PLAYBOOK §4.5)

```
sözlük ✓ → zaman + devir → izdüşüm kapısı → 3 varyant still/shot → varyant kapısı → seçim
→ animatik → ölçüm → belgeler → animatik kapısı → [tek düzeltme turu] → tam render → kare sonrası + QC + ölçüm
→ belgeler → teslim kapısı → kapanış → rapor → DUR
```

1. **Açılış.**
   - `scenes.json`'a birim kaydı açılır: `frames`, `tc`, `keys`, `k1`, `checks`, `hooks`, `slice`, `redQuota`…
   - Künye açılır: `docs/KUNYE-P<n>.md` (şablon `templates/KUNYE.md`).
2. **İhtiyaç.** Gerekirse `motion:motion-research` (`ihtiyac`) → `assets/gen/requests/P<n>.json`.
   - Üretim director'ın işidir ve GENAI.md prosedürüyle yapılır.
   - Bütçe dışı, liste dışı ya da sapma > %10 ise **DUR** (DUR-2).
3. **Yapım.** `motion:motion-director`'a tek görev verilir: "P<n>: zaman + devir + izdüşüm kapısı + 3 varyant still/shot".
   - Girdi: birim id, sözlük satırları, BEATS yolu, research çıktıları.
   - Director'ın raporundaki **§0.6 (yapan)** puanını not et. Bu puan reviewer'a verilmez.
4. **Varyant kapısı.** `/motion:gate P<n> varyant` adımları uygulanır.
   - Seçimler uyuşursa sürer.
   - Uyuşmazsa güçlü gerekçe kazanır ve rapora yazılır. Kararsızsa açık karar → **DUR**.
   - `light` profilde varyant seçimi animatik kapısıyla birlikte yapılır.
5. **Animatik.** Director: animatik + qc + frame-check `--sheet` + contact + ours. Ölçümler künyeye yazılır.
6. **Animatik kapısı.** `/motion:gate P<n> animatik`. Tek düzeltme turu kuralı gate komutundadır.
   - Projenin **ilk perdesinde** animatik kullanıcıya gider (**DUR**).
   - Sonraki perdelerde faz istemi aksini demedikçe "KAPI GEÇERSE DURMA".
7. **Tam render.** Director'a verilir: kare bütçesi, disk, 2×/S×, `run` zinciri. Bekleme arka planda yapılır.
8. **Ölçüm.** Sayısal ön koşul varsa (K1, aksan ΔE, devir, senkron, varlık kabulü) `motion:motion-measure` paralel çalışır.
9. **Belgeler reviewer'dan önce:** künye, §Na, `scenes.json` istisnaları, `out/RENDER_REPORT.md`.
10. **Teslim kapısı.** `/motion:gate P<n> teslim`.
11. **Kapanış:**
    - REVIEWER kaydı yerinde mi
    - RETRO girişi
    - `world/lessons.md`
    - RENDER_REPORT
    - bakiye
    - videoların ve kontağın yolları

## 5. Faz raporu (PLAYBOOK §7)

Rapor `docs/F<n>-RAPOR.md` (ya da `docs/<faz>-RAPOR.md`) olarak kaydedilir ve kullanıcıya verilir. Sıra sabittir:

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
