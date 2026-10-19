---
description: Bir birimin kapısını yürütür. Sırayla belgeler güncel mi denetlenir, qc + frame-check + contact koşulur, gerekirse bağımsız ölçüm (motion-measure) alınır, TAZE bir motion-reviewer açılır ve KARAR satırı işlenir. Tek düzeltme turu kuralı uygulanır: GEÇMEZ → bir düzeltme turu → yeni reviewer → yine GEÇMEZ ise DUR ve render yok.
argument-hint: "<birim> [varyant|lookdev|storyboard|animatik|render|teslim|master|live|varlik] [--tek]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent
---

# /motion:gate: kapı

> **Etkileşimsiz oturum (headless):** `claude -p` ile ya da kullanıcı olmadan çalışıyorsan (ör. ortamda `MOTION_EVAL=1`) ajanları **ön planda** başlat (`Agent` çağrısında `run_in_background: false`) ve sonucunu bekle. Arka planda ajan bırakıp turu bitirme: headless süreç tur bitince kapanır ve arka plan ajanları da ölür. Komutun bütün adımları bitmeden son mesajı yazma.

Argümanlar: `$ARGUMENTS`
- `<birim>`: `scenes.json` sahne id'si ya da `LOOK`, `FILM`, `LIVE`.
- Kapı türü verilmezse `render`.
- `--tek` verilirse yalnız bu tur çalışır; düzeltme turu otomatik açılmaz.

Kaynaklar:
- `${CLAUDE_PLUGIN_ROOT}/skills/motion-core/references/PLAYBOOK.md` §2.2–§2.3
- `${CLAUDE_PLUGIN_ROOT}/skills/motion-reviewer/SKILL.md`. Bu dosyayı **sen uygulamazsın**; yalnız reviewer'a girdileri doğru vermek için okursun.

## 0. Tur ve eşik

1. `<kapı-id>` = `<birim>-<tür>-r<k>`.
   - `k`: `grep '^KARAR:' docs/REVIEWER.md` içinde bu birim ve tür için önceki tur sayısı + 1.
   - Önceki tur `r1 GEÇMEZ` ise bu tur **r2** (düzeltme turu) olur.
   - Önceki `r2 GEÇMEZ` varsa kapı açılmaz: **DUR** (DUR-9).
2. Eşik = max(profil eşiği, `scenes.json` `gate.taste`). Profil eşikleri: full ≥ 7/8 · light ≥ 6/8 · live ≥ 7/8.

## 1. Kapıdan önce (sen yaparsın)

1. **Belgeler reviewer'dan önce.** Şunlar güncel olmalı:
   - künye
   - `project.md` §Na
   - `scenes.json` (istisna ve "incelendi" kayıtları gerekçeli)
   - `out/RENDER_REPORT.md`

   Güncel değilse önce güncellenir ya da director'a güncelletilir.
2. **Ölçüm** (harness; kapının kendi koşusu):

   ```bash
   motion-render imgdiff stale <id>               # bayat kare var mı
   motion-render qc <id> [--frames-dir …] [--mp4 auto]
   motion-render frame-check <id> [--frames-dir …] [--mp4 auto] --sheet
   motion-render contact <id>
   motion-render ours <id>                         # hareketli birimde
   ```

   - **Kayıtsız QC hatası varsa (çıkış 3) reviewer açılmaz.** Kapı açılmamış sayılır; tur sayılmaz. Hata director'a döner. "Muhtemelen kasıtlı" kabul değildir: düzeltilir ya da istisna önce sorulur.
   - **İstisna, look-dev kapısı (HK-34):** `qc LOOK…` çıkış kodu kapıyı kilitlemez; reviewer yine açılır. Look-dev sayfası teslim değil, yön karşılaştırmasıdır. qc sonucu (yön başına çıkış kodu + hata başlıkları) reviewer istemine verilir ve kayıtta KARAR satırının altına `qc (bilgi):` satırı olarak girer. Hatalar seçilen yön sahneye taşınırken kapanır.
   - Bayat kare varsa da reviewer açılmaz; önce yeniden render gerekir.
   - `animatik` kapısında kareler `out/frames/<id>_animatic`'tedir (`render … --tag animatic`): qc/frame-check `--frames-dir out/frames/<id>_animatic`, contact `--dir out/frames/<id>_animatic --fstep 2`, ours `--dir out/frames/<id>_animatic --step 2`.
   - **Look-dev kapısında ayrışma ölçümü (1.1):** `motion-render lookdev-diff` → `out/review/lookdev-diff.json` + `.md`. Önceki proje ya da örnek world kontağı varsa `--ref <kontak.png>@<C>x<R>+<şerit>` eklenir. Reviewer'a her yönün kilit karelerinin **tam karesi** verilir, kırpım değil (LESSONS L-225). Komut "iskelet ölçülemedi" diyorsa look-dev sayfasının kahraman öğesine `data-hero` eklenir (`manifest validate` uyarısı).
   - Kapı türüne göre: `varyant` ve `lookdev` için still'ler ve kontak sayfası; `master` için `qc film` ve `frame-check <FILM> --only temporal,identical,loudness,accentColor`; `live` için `motion-render live <sayfa> --qc`.
3. **Bağımsız ölçüm.** Kapı sayısal bir ön koşula dayanıyorsa `motion:motion-measure` açılır. Örnekler: varlık/logo kabulü, K1, aksan ΔE, devir, senkron, canlı fps/gecikme.
   - İstek: ne · hangi kareler · ölçütün kaynağı.
   - Measure sayıları **reviewer'a verilmez**. Raporda yapanın sayısıyla yan yana konur.
4. **Yapanın puanı.** Director raporundaki §0.6 (yapan) puanını kendine not et. Bu puan reviewer'a verilmez.
5. Bakiye, kapı bütçe içeriyorsa okunur (`motion-render doctor`).

## 2. Reviewer'ı aç (her zaman yeni ajan)

`Agent` → `subagent_type: motion:motion-reviewer`.
- **Asla** önceki bir reviewer'a SendMessage ile devam etme.
- Tür bulunamazsa genel amaçlı ajan açılır: "Önce `${CLAUDE_PLUGIN_ROOT}/agents/motion-reviewer.md` dosyasını oku ve rolü birebir üstlen. Write/Edit kullanma."

İstem şablonu (yalnız yollar; içerik kopyalanmaz):

```
Kapı: <kapı-id> · tür <tür> · birim <id> · profil <p> · eşik ≥<e>/8 · tur r<k>
Brief ve faz istemi (aynen): "<…>"
Kurallar: ${CLAUDE_PLUGIN_ROOT}/skills/motion-reviewer/SKILL.md · RULES.md · MEASURE.md · GENAI.md · project.md §1,§3,§4,§5,§6,§9,§10
World: world/world.json · Örnekler (#11): ${CLAUDE_PLUGIN_ROOT}/skills/motion-world/examples/
Manifest: scenes.json (birim <id>)
Çıktılar: out/frames/<id>[_tag]/ · out/scenes/<…>.mp4 · out/probe/<id>-qc.json · out/probe/<id>-fc.json (+ sheet) · kontak <yol> · A/B <yol> · assets/gen/manifest.json
[lookdev] Ayrışma: out/review/lookdev-diff.md (iskelet + palet UYARI; gerekçe zorunlu) · yönlerin tam kareleri · qc (bilgi): LOOK-A <çıkış> · LOOK-B <çıkış> (<hata başlıkları>) · …
[r2] Önceki kayıt: docs/REVIEWER.md "<birim> · <tür> · r1" · Değişen kare aralıkları: <…> · Madde → durum: <1 → UYGULANDI f…, …> (sayısız)
Lütfen özellikle bak: <madde listesi; kare aralığıyla>
Yazma alanı: out/review/<kapı-id>/ · kaydı docs/REVIEWER.md sonuna ekle · ilk satır KARAR.
```

**Reviewer'a verilmeyenler:**
- yapanın raporu, künyesi, gerekçesi, §0.6 puanı
- `out/probe/<faz>/…` ölçüm betikleri ve sayıları
- `out/measure/**`
- konuşma

Reviewer beklenirken paralel iş yapılır: belgeler, sonraki birimin taslağı.

## 3. Kararı işle

1. Dönüşün ilk satırını SKILL §10'daki düzenli ifadeyle doğrula.
   - Uymuyorsa reviewer'dan biçimi düzeltmesini iste. Bu yalnız biçim içindir; içerik değişmez.
2. `docs/REVIEWER.md`'de kayıt var mı bak. Yoksa `out/review/<kapı-id>/RECORD.md`'yi ya da dönüşü **aynen** sona ekle.
3. Karara göre ilerle:

| karar | sonraki adım |
|---|---|
| **TESLİM GEÇER** | kapanış (PLAYBOOK §4.5 Adım 11 / §4.6) |
| **GEÇER** | sonraki adım; "KAPI GEÇERSE DURMA". İstisna: projenin ilk perdesinin animatiği kullanıcıya gider (DUR) |
| **ŞARTLI GEÇER** | Şartlar director'a verilir → uygulanır → kanıt (probe/kırpım, gerekirse measure) → sonraki adım. Yeni reviewer turu açılmaz; şartlar sonraki kapıda doğrulanır |
| **GEÇMEZ r1** (evet ≥ 3) | `--tek` yoksa **tek düzeltme turu**. Director'a yalnız reviewer'ın "Somut düzeltme listesi" verilir. Etkilenen aralık PLAYBOOK §5 protokolüyle yeniden çizilir. §1'deki ölçüm tekrarlanır. Yeni reviewer açılır (r2) |
| **GEÇMEZ r1** (evet < 3) | Düzeltme turu yok. Look-dev / storyboard / varyanta dönülür (DUR-11); dönülen iş yeni bir taze reviewer kapısından geçmeden sonraki faza geçilmez (otomatik onay dahil) |
| **GEÇMEZ r2** | **DUR — tek düzeltme turu tükendi, render yok.** Kontak + nedenler kullanıcıya gider. Tam render ya da teslim başlatılmaz (DUR-9) |

4. Varyant ve look-dev kapısında yapanın seçimiyle reviewer'ın SEÇ/ELE kararı karşılaştırılır.
5. **Look-dev kaydı denetlenir.** KARAR satırı `ayrışma:` parçasını taşır, altında `qc (bilgi):` satırı vardır (HK-34); `lookdev-diff` UYARI veren her çift (iskelet ≥ eşik, palet ≥ 3,5, iki yön aynı çekicide) için kayıtta görsel adı + öğe ile gerekçe vardır. Gerekçe eksikse GEÇER/ŞARTLI GEÇER kabul edilmez: kayıt eksik sayılır, aynı turda taze reviewer açılır. İskelet ekseni SERT olduğunda (1.2; `ISKELET_MOD`) eşik üstü yön içi çift kapıyı GEÇMEZ yapar ve metinle geçilemez.
   - Uyuşmazlıkta güçlü gerekçe kazanır ve rapora yazılır.
   - Kararsızsa açık karar → **DUR**.
   - #11 ile ELE edilen yön, kullanıcının açık isteği olmadan geri alınmaz.

## 4. Kapı bloğu (faz raporuna girer)

```markdown
### <kapı-id>: <KARAR>
KARAR satırı (aynen) · yapan §0.6 x/8 · reviewer y/8 · fark ±n
| ölçü | yapan | measure | reviewer | ölçüt |      (sayısal ön koşul varsa)
UCUZ: … · Ön plan: … · Hata görünümü: …
Düzeltme turu: <yok | r2 sonucu> · Kanıt: out/review/<kapı-id>/
```

Kapanış:
- Kapı GEÇER ise akış sürer.
- DUR gerekiyorsa `**DUR — <kapı-id>: <neden>.**`
