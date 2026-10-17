---
description: Canlı profil (live) akışını yürütür. Çıktı, OBS tarayıcı kaynağı olarak çalışan bir sayfa ile bir ayar panelidir. Sayfa mikrofon zarfını Web Audio ile alır, klavye tetiklerini işler ve avatar durum makinesini (konuşuyor / dinliyor / boşta) çalıştırır; ağız ve baş zarftan sürülür. Kurallar ≥ 60 fps, gecikme ≤ 100 ms ve düşen kare 0'dır; motion-render live --qc ile ölçülür ve QC'ye yazılır. Look-dev, varyant, animatik ve kapı akışı diğer profillerle aynıdır; aynı §0.6 reviewer kullanılır.
argument-hint: "[lookdev|varyant|build|qc|gate] [birim]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent
---

# /motion:live: canlı profil

Argümanlar: `$ARGUMENTS`. Adım verilmezse sıradaki eksik adımdan başlanır.

Kaynaklar:
- `${CLAUDE_PLUGIN_ROOT}/skills/motion-live/SKILL.md`: sayfa sözleşmesi, ses zarfı, durum makinesi, ölçüm yöntemi
- `${CLAUDE_PLUGIN_ROOT}/skills/motion-core/references/PLAYBOOK.md` §0.2 (profil farkları), §4.3–§4.5
- `${CLAUDE_PLUGIN_ROOT}/skills/motion-reviewer/SKILL.md` (kapı türü `live`)

Ön koşul: `scenes.json` `profile: "live"`. Değilse bu komut çalışmaz. Kullanıcıya `/motion:init` ile live profil önerilir (açık karar).

## 1. Akış (diğer profillerle aynı disiplin)

```
look-dev (3 yön, DUR: seçim) → sözlük/durum listesi (DUR: onay) → 3 varyant still (avatar/grafik) → varyant kapısı
→ "animatik" = kayıtlı zarfla oynatma kaydı → live kapısı (§0.6 ≥ 7/8 + UCUZ) → [tek düzeltme turu]
→ build (sayfa + panel) → canlı ölçüm (QC) → live teslim kapısı → rapor → DUR
```

- World kuralı aynıdır. World seçilmeden primitif, renk ya da font gelmez. Look-dev `/motion:faz lookdev` ile yapılır. UCUZ #11 geçerlidir.
- Yapım `motion:motion-director`, bağımsız ölçüm `motion:motion-measure`, kapı **taze** `motion:motion-reviewer`.
- "Animatik" canlı profilde **kayıtlı ses zarfıyla deterministik oynatmadır**. Aynı zarf her koşuda aynı kareleri verir. Reviewer bu kayıttan kare ve kontak alır.

## 2. Sayfa sözleşmesi (ayrıntı motion-live SKILL)

| parça | ne |
|---|---|
| `live/index.html` | OBS tarayıcı kaynağı: sabit tuval (`scenes.json` boyutu), saydam ya da world zemini, ek arayüz yok |
| `live/panel.html` | Ayar paneli (OBS özel dock ya da ayrı sekme): mikrofon aygıtı, kazanç, konuşma eşikleri (aç/kapa, histerezis), atak/bırakma (ms), ağız kazancı, baş salınımı, tuş eşlemesi, kayıt/oynatma |
| ayarlar | Panel → sayfa: `BroadcastChannel` (yedek: `storage` olayı). Kalıcılık `localStorage`. JSON dışa/içe aktarma |
| ses zarfı | `getUserMedia({audio:{echoCancellation:false, noiseSuppression:false, autoGainControl:false}})` → `AudioWorklet` ya da `AnalyserNode` RMS → dB → atak/bırakma yumuşatması → zarf 0..1 |
| klavye tetikleri | Tuş → olay kuyruğu → tasarlanmış anlar. OBS tarayıcı kaynağı klavye odağı almaz; tetikler panelde yakalanır ve kanalla sayfaya gönderilir |
| durum makinesi | `boşta ↔ dinliyor ↔ konuşuyor`. Geçişte histerezis ve en kısa kalış süresi vardır. Geçişler tasarlanmış harekettir: fade yok (SERT), şablon geçiş yok (UCUZ #5) |
| ağız / baş | Ağız açıklığı = f(zarf) yumuşatılmış. Baş = düşük frekanslı hareket + zarfa bağlı vurgu. İkincil hareket (§0.6 #4) zarfa tepki verir |
| saf çizim | Görüntü = f(t, durum, zarf). Çizimde yan etki yoktur; aynı girdi aynı kareyi verir (oynatma ve kapı bunun için) |

Tüm değerler (eşikler, kazanç, renk, font) `world.json`, `project.md` ve paneldeki ayarlardan gelir. Sayfaya sabit proje değeri gömülmez.

**OBS notu.** Tarayıcı kaynağında mikrofon erişimi için OBS'in medya akışı izniyle başlatılması gerekebilir (`--enable-media-stream`). Bu satır kurulum notudur; panel izin yoksa görünür bir uyarı verir.

## 3. Canlı ölçüm (QC)

```bash
motion-render live live/index.html --qc        # fps · gecikme · düşen kare → QC dosyası (out/probe/)
```

| kural | ölçüt | nasıl |
|---|---|---|
| kare hızı | **≥ 60 fps** sürekli (p95 kare aralığı ≤ 1/60 s) | kayıtlı zarf + tetik dizisiyle ölçüm koşusu |
| gecikme | **≤ 100 ms** (ses girişi → ilk görünür ağız hareketi) | test sinyali; motion-live SKILL yöntemi |
| düşen kare | **0** | ölçüm koşusu boyunca |

- Sonuçlar QC dosyasına ve künyeye yazılır.
- Bir ölçüt tutmuyorsa kapı açılmaz; düzeltme director'a döner. Kayıtsız QC hatası kapıyı kilitler (gate §1).
- `motion:motion-measure` aynı üç sayıyı **kendi koşusuyla** alır. Raporda yapan ile measure yan yana yazılır.

## 4. Kapı

`/motion:gate LIVE live` adımlarını uygula. Taze reviewer aynı kuralları kullanır:
- §0.6 kapısı ≥ 7/8 (proje yükseltebilir)
- UCUZ 1–11
- ön plan
- hata gibi görünen öğe

Reviewer kayıtlı oynatma karelerini inceler ve canlı sayıları kendi koşusuyla alır. Tek düzeltme turu kuralı aynıdır: ikinci GEÇMEZ'de DUR, teslim yok.

## 5. Teslim ve rapor

- Teslim paketi:
  - `live/` sayfası ve paneli
  - ayar JSON'u (varsayılanlar)
  - canlı QC json'u
  - OBS kurulum notu: kaynak boyutu, fps, dock ekleme, mikrofon izni
  - künye
- Master ve arşiv yoktur (PLAYBOOK §0.2).
- Rapor PLAYBOOK §7 biçimindedir. Kapılar tablosunda fps (p50/p95), gecikme (ms) ve düşen kare satırları bulunur.

Kapanış satırı: `**DUR — canlı sayfa teslimi.** OBS'te dene; ayar ve tetik notlarını ara not olarak gönder.`
