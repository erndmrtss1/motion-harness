---
name: motion-live
description: motion plugin'inin canlı profili (`profile: "live"`) — teslim bir mp4 değil, OBS tarayıcı kaynağı olarak çalışan HTML sayfası + ayar panelidir. Canlı yayın avatarı, OBS bindirmesi (overlay), mikrofonla konuşan karakter ya da tuşla tetiklenen tepkiler istendiğinde; /motion:live yürütülürken; canlı sayfa kurulurken, projenin avatarı adaptörle takılırken, OBS'e eklenirken ya da `motion-render live --qc` ölçümü (≥ 60 fps · gecikme ≤ 100 ms · düşen kare 0) yorumlanırken kullan. Mekanizma (ses zarfı, konuşuyor/dinliyor/boşta durum makinesi, ağız/baş hareketi, tetikler, panel, ölçüm) pakettendir; görünüm look-dev'de projeye özel tasarlanır.
---

# motion-live — canlı profil (OBS tarayıcı kaynağı)

Canlı profilde teslim bir **sayfadır**: OBS'e tarayıcı kaynağı olarak eklenir, mikrofonu dinler, bir avatarı gerçek zamanlı oynatır. Yanında bir **ayar paneli** gelir (OBS özel dock'u ya da ayrı sekme).

Paket yalnız **mekanizmayı** taşır:
- ses zarfı
- durum makinesi
- hareket kanalları
- tetikler
- panel ve ayar eşlemesi
- ölçüm

Şablondaki avatar bilerek nötr bir **yer tutucudur**: gri geometri, üstünde "YER TUTUCU — look-dev'de değiştirilir" yazar. Renk, font, malzeme ya da kompozisyon önermez ve hiçbir proje onunla teslim edilmez. Görsel dil, diğer profillerde olduğu gibi look-dev'de 3 gerçekten farklı yönle kurulur. Seçilen yön küçük bir adaptör API'siyle takılır (§5).

Kaynaklar:
- sözleşme: `render/CONTRACT.md` §6 (`live <sayfa> [--qc]`, çıkış kodları)
- kurallar: `motion-core` RULES §19 (PR-3, PR-4), MEASURE M-LIVE
- akış: PLAYBOOK §0.2 ve `/motion:live`
- kapı: `motion-reviewer` §3 (live ≥ 7/8) ve §7 (`live` kapısı)

---

## 1. Ne zaman

| kullan | kullanma |
|---|---|
| Yayında konuşan avatar ya da karakter, mikrofona tepki veren grafik | Kaydı alınıp teslim edilen film: `full` ya da `light` |
| OBS bindirmesi: saydam zeminli, tuşla tetiklenen tepkiler | Önceden zamanlanmış, sesle eşlenen anlatım: `full` + AUDIO hattı |
| Canlı ölçüt gereken iş: ≥ 60 fps, ≤ 100 ms, düşen kare 0 | Yalnız tek bir still ya da poster |

Ön koşul `scenes.json` → `"profile": "live"`. Kapı eşiği §0.6 ≥ 7/8'dir (D1-05). Proje bu eşiği yükseltebilir, düşüremez.

---

## 2. PLAYBOOK'ta neler değişir

Disiplin aynıdır: look-dev, sözlük, varyant, animatik, taze reviewer, tek düzeltme turu, DUR. Değişen yalnız ara ürünlerin biçimidir.

| aşama | full | live |
|---|---|---|
| look-dev | 3 yön · still + `world.json` taslağı | 3 yön. Her yön bir **avatar adaptörüdür** (`world/avatar-<yön>.js`). Still'ler `motion-render live --capture --avatar world/avatar-<yön>.js` karelerinden alınır; her yön üç durumu da (konuşuyor / dinliyor / boşta) gösterir. Ayrışma ölçütü aynıdır: 6 eksenin en az 3'ünde. |
| sözlük | shot başına nesne sözlüğü | **durum ve tepki listesi**: 3 durumun pozu, durumlar arası geçiş tasarımı, tuş → tepki eşlemesi, ikincil hareket öğesi |
| varyant | shot başına 3 still | durum başına 3 still (seçilen world içinde) |
| animatik | 960×540 @30 render | **kayıtlı etkileşim önizlemesi**: aynı WAV'dan deterministik oynatma, `motion-render live <sayfa> --capture` → `out/live/capture.mp4` (ses dahil) + `out/live/capture-frames/`. Aynı WAV her koşuda aynı kareleri verir. |
| kapı | §0.6 + UCUZ (kareler) | **iki ayak:** (1) `live --qc` sayıları (`out/probe/live-qc.json`) ve (2) taze reviewer'ın §0.6 ≥ 7/8 + UCUZ incelemesi. Reviewer `capture.mp4` / kare dizisini inceler ve canlı sayıları **kendi koşusuyla** alır. |
| tam render / master | var | yok. Teslim: sayfa + panel + ayar JSON'u + `live-qc.json` + OBS notu + künye |

Canlı profilde §0.6 maddelerinin karşılığı:

| madde | canlı karşılığı |
|---|---|
| #4 ikincil hareket | zarfa ve baş hareketine gecikmeyle tepki veren öğe. Adaptörde `state.secondary` kanalı |
| #5 easing'de ağırlık | yay kanalları (overshoot, oturma). Doğrusal kayma yoktur |
| #6 bilinçli hold | dinliyor ve boşta durumlarında mikro hareket sürer (nefes, kırpma, bakış); donma yoktur |

Durum geçişleri tasarlanmış harekettir. Fade SERT kural olarak yasaktır, şablon geçiş UCUZ #5'tir.

---

## 3. Şablon ve projeye kurulum

Şablon `${CLAUDE_PLUGIN_ROOT}/render/runtime/live/` altındadır:

| dosya | iş |
|---|---|
| `live.html` | OBS sayfası: tek `<canvas>` (+ DOM adaptörleri için `#dom-root`), uyarı satırı |
| `live.js` | çekirdek. Derleme adımı yok, klasik betik: ses girişi, zarf, durum makinesi, hareket, tetikler, veri yolu, ölçüm kancaları (`window.__live`), adaptör API'si (`window.MOTION_LIVE`) |
| `placeholder-avatar.js` | YER TUTUCU adaptör. Sözleşmenin örneğidir, teslim edilmez |
| `panel.html` · `panel.js` | ayar paneli. Arayüzü `live.js` içindeki şemadan kurulur |

Projeye kurulum:
1. Klasörü `<proje>/live/` olarak kopyala ve `live.html` dosyasının adını `index.html` yap (`/motion:live` bu adı kullanır).
2. Look-dev'de seçilen yönün adaptörünü `world/avatar-<yön>.js` olarak yaz.
3. `index.html` içinde `placeholder-avatar.js` satırını o adaptörle değiştir. Değiştirmeden denemek için `?avatar=/world/avatar-<yön>.js` kullan.
4. Projenin ayar varsayılanlarını `live/ayarlar.json` olarak kaydet. Panelde "Dışa aktar" ile alınır; sayfaya `?settings=/live/ayarlar.json` ile verilir.

Sayfaya sabit proje değeri gömülmez. Değerler `world.json` / `project.md` / ayar JSON'undan gelir.

**Sayfa URL parametreleri**

| parametre | iş |
|---|---|
| `?bg=transparent` | saydam zemin (bindirme). `?bg=%23rrggbb` zemin rengi |
| `?avatar=<yol.js>` | adaptörü yükle (son kayıt geçerlidir) |
| `?settings=<yol.json>` | proje varsayılanları |
| `?panel=1` · `?meter=1` | masaüstü denemesi için panel katmanı ve seviye göstergesi |
| `?play=<zarf.json>` | panelde kaydedilmiş zarfı döngüyle oynat (mikrofonsuz gösterim) |
| `?drive=manual` | elle sürüş: `__live.advance(n)`, dt = 1/fps (deterministik yakalama) |
| `?qc=1` | ölçüm kipi: yerel kayıt ve aktarıcı kapalı |
| `?mic=0` | mikrofon açılmaz |

Ayar önceliği (düşükten yükseğe): paket varsayılanı < `?settings` dosyası < localStorage (panelde yapılan) < URL (`bg`).

---

## 4. Mekanizma (sayfa sözleşmesi)

**Tek saat, saf çizim.**
- Her kare `requestAnimationFrame` zaman damgasıyla `step(dt, giriş)` çağrılır.
- Bütün durum yalnız burada ilerler. Yaylar sabit 1/240 s alt adımla tümlenir; aynı dt dizisi ve aynı girdi aynı sonucu verir.
- Çizim `draw(ctx|root, state, t)` yalnız okur.
- Kırpma ve bakış t'nin saf fonksiyonudur.
- Elle sürüşte dt = 1/fps sabittir. "Animatik" ve reviewer kareleri bu yüzden yeniden üretilebilir (PR-4).

**Ses zarfı.**
1. `getUserMedia({ audio: { echoCancellation:false, noiseSuppression:false, autoGainControl:false, deviceId } })` → `MediaStreamAudioSourceNode` → `AnalyserNode` (tampon 2048 örnek). Hoparlöre bağlanmaz.
2. Seviye: her karede son kare aralığı + bir pencere boyunca 512 örneklik (≈ 10,7 ms @48 kHz) pencerelerin en yüksek RMS'i (dBFS) + kazanç. Kare aralığı pencereden uzun olduğu için yalnız son pencereye bakmak kısa geçişleri (tık, patlamalı ünsüz) kaçırırdı.
3. Gürültü kapısı: açılış `gateDb`, kapanış `gateDb − gateHystDb`.
4. Seviye 0..1: kapanış eşiği … `ceilDb` aralığına eşlenir.
5. Zarf: tek kutuplu atak/bırakma (`attackMs` / `releaseMs`); dt'ye göre tam üstel.

Elle sürüşte (`--capture`) seviye izi Node'da WAV'dan aynı yöntemle çıkarılır.

**Durum makinesi** (histerezis + tutma süreleri):

| geçiş | koşul |
|---|---|
| → konuşuyor | anlık seviye ≥ `talkOn`, `talkConfirmMs` boyunca. Tık sesleri elenir. En kısa kalış beklenmez |
| konuşuyor → dinliyor | zarf < `talkOff`, `talkHoldMs` boyunca |
| dinliyor → boşta | son konuşmadan beri `listenHoldS` geçti (tetik `dinle` dinliyor'u sabitler) |
| diğer geçişler | durumda en az `minStateMs` kalınmış olmalı. Hedef poz `transitionMs` boyunca karışır (fade değil, poz) |

**Hareket kanalları.**
- Ağız zarftan doğrudan sürülür; yay yoktur, gecikme yalnız ataktır.
- Baş: pitch / roll / yaw / y / ölçek yayları. Hedef üç yerden gelir:
  - durum pozu
  - zarf yükselişinde baş vurgusu (hız darbesi → overshoot)
  - tetik eğrileri
- İkincil: başın açısını düşük sönümle gecikmeli izleyen yay.
- Nefes, kırpma ve bakış t'nin saf fonksiyonlarıdır.

**Tetikler.**
- Varsayılan eşleme:
  - 1 onay · 2 ret · 3 şaşkınlık · 4 gülme · 5 vurgu · 6 merak
  - 7 dinle (aç/kapa) · 8 sessiz (aç/kapa) · 9 sıfırla
- Eşleme panelden değiştirilir.
- Her tepki ilk karede bir hız darbesi verir, yani gecikme ≤ 1 karedir; ardından süre boyunca hedef eğrisi uygular.
- OBS tarayıcı kaynağı klavye odağı almaz. Tuşlar panelde yakalanır ve olay zaman damgasıyla sayfaya gönderilir.

**Panel ↔ sayfa.**
- Sayfa canlı gerçektir. Panel bağlanınca sayfanın ayarlarını alır, değişiklikleri yama olarak gönderir ve localStorage'a yazar.
- Taşıma yolları:
  - `BroadcastChannel('motion-live')`: aynı tarayıcı profili
  - `motion-render live` sunarken yerel aktarıcı `/__bus` (POST + SSE): farklı tarayıcı, örneğin OBS dock'u ile dış tarayıcı
  - yedek: `storage` olayı
- Panel ek olarak şunları yapar: aygıt seçimi, zarf kaydı / oynatma, ayar JSON'u dışa / içe aktarma.
- Panel isteğe bağlı olarak **ses kaynağı** da olabilir: `kaynak = bu panel` seçilirse zarf panelde hesaplanır ve seviye her kare gönderilir (§8).

---

## 5. Adaptör API'si: projenin avatarı

```js
// world/avatar-<yön>.js — live.js'ten SONRA yüklenir
MOTION_LIVE.registerAvatar({
  name: '<yön-adı>',
  kind: 'canvas',                 // 'canvas' (varsayılan) | 'dom'
  init(ctxOrRoot, info) {},       // bir kez: varlık hazırlığı (görsel ön yükleme, DOM kurma)
  draw(ctxOrRoot, s, t) {         // her kare; SAF: yalnız s ve t okunur
    // canvas: ctx mantıksal 1920×1080'e ölçekli, zemin çizilmiş gelir
    // dom: root 1920×1080 kutu (CSS ölçekli); yalnız stil/transform güncellenir
  },
  dispose() {},
});
```

**`s` (durum anlık görüntüsü)**

Kareler arası aynı nesnedir; saklanacaksa kopyalanır.

| alan | anlam |
|---|---|
| `mode` · `label` · `prevMode` · `modeT` · `blend` | `konusuyor`/`dinliyor`/`bosta` · Türkçe ad · önceki durum · durumda geçen s · geçiş karışımı 0..1 (yumuşatılmış) |
| `env` · `level` · `db` · `talking` | zarf 0..1 · anlık seviye 0..1 · dBFS · konuşma algılayıcısı |
| `mouth` · `mouthRound` | ağız açıklığı 0..1 · yuvarlaklık |
| `head.{x,y,pitch,roll,yaw,scale}` | px ve derece. Yay çıktısı; overshoot içerir |
| `secondary.{angle,x,y}` | ikincil hareket: başı gecikmeyle izleyen salınım |
| `breath` · `blink` · `eyes` · `gaze.{x,y}` | nefes −1..1 · kırpma 0..1 · şaşkınlık/gülme göz katkısı · bakış −1..1 |
| `reactions[]` | etkin tetikler `{name, p (0..1), age}` |
| `flags.{listen,mute}` · `frame` · `t` · `dt` · `settings` | sabitlenmiş durumlar · kare · saat · adım · ayarlar |

**Adaptör kuralları**
- Saf çizim. Zamanlayıcı, kendi rAF'ı, `Math.random` ya da `Date` kullanılmaz. Rastgelelik gerekiyorsa `t`'den türetilmiş tohumlu fonksiyon kullanılır. Aksi hâlde yakalama deterministik olmaz ve kapı kanıtı bozulur.
- Bütçe: kare başı sayfa işi p99 ≤ 4 ms. `live-qc.json` → `metrics.work` alanında görülür. Pahalı doku ya da gürültü `init`'te bir kez pişirilir.
- Görsel değerler (palet, font, malzeme, ışık) world'den gelir. Yer tutucunun gri geometrisi örnek alınmaz.
- Look-dev'in üç yönü üç ayrı adaptördür; mekanizma ortaktır. Yönler `--capture --avatar …` ile aynı WAV üzerinden yan yana karşılaştırılır.

---

## 6. OBS kurulumu

1. **Sunucu.** Proje kökünde `motion-render live live/index.html` komutunu çalıştır. Komut OBS ve panel URL'lerini basar (yalnız `127.0.0.1`).
   - `http://127.0.0.1` güvenli bağlamdır; mikrofon izni ve panel aktarıcısı burada çalışır.
   - `file://` ile açılan sayfada aktarıcı yoktur ve mikrofon izni güvenilir değildir.
2. **Kaynak.** Kaynak ekle → Tarayıcı ("Browser"):

   | alan | değer |
   |---|---|
   | URL | basılan adres + `?bg=transparent` |
   | Genişlik / Yükseklik | 1920 / 1080. Başka boyutta sayfa orantılı ölçeklenir |
   | "Use custom frame rate" | kapalıysa OBS Video FPS **60** olmalı. Açıksa 60 yaz. Kaynak OBS'in kare hızında çizilir; 30 fps'lik bir OBS ölçütü tutturamaz |
   | "Custom CSS" | OBS'in varsayılan saydam gövde kuralı kalabilir |
   | "Shutdown source when not visible" | **kapalı**. Açıksa ses durumu ve ısınma her sahne geçişinde sıfırlanır |
   | "Refresh browser when scene becomes active" | **kapalı** |
3. **Donanım hızlandırma.** Ayarlar → Gelişmiş → Kaynaklar → "Enable Browser Source Hardware Acceleration" **açık**. Değişiklik OBS yeniden başlatılınca etkin olur.
4. **Panel.** Docks → "Custom Browser Docks" ile panel URL'sini ekle. Tuş tetikleri bu dock odaktayken çalışır. Kaynağın "Interact" penceresinde de çalışırlar.
5. **Mikrofon izni.** Gerekirse §8'e bak. Sayfa izin alamazsa sol altta görünür bir uyarı verir; panelde de "sayfa mikrofonu: …" satırı çıkar.

---

## 7. Ölçüm (QC)

```bash
motion-render live live/index.html --qc [--seconds 20] [--wav test.wav] [--fps 60] [--headful] [--channel msedge|chrome] [--gpu hw|sw] [--avatar …]
motion-render live live/index.html --capture [det|rt] [--seconds 8] [--scale 1]     # kayıtlı etkileşim önizlemesi
```

**Ölçüm koşusu.**
- Test WAV'ı verilmezse üretilir: `out/live/qc-test.wav` ve olay listesi `qc-test.events.json`.
  - Kapı altında zemin gürültüsü vardır.
  - Bilinen anlarda hece dizileri, tık sesleri ve uzun ünlü bulunur.
  - Her olaydan önce ≥ 0,8 s sessizlik vardır.
  - 16 s ve üstü koşuda dinliyor → boşta geçişi için ~5 s'lik uzun bir sessizlik eklenir.
- Kullanıcı WAV'ında olay başları 10 ms RMS ile bulunur. Eşik zemin p10 + 15 dB'dir (en az −50 dBFS); olaydan önce ≥ 0,5 s sessizlik aranır.
- Chromium şu bayraklarla açılır: `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream --use-file-for-fake-audio-capture=<wav> --autoplay-policy=no-user-gesture-required`. Varsayılan donanım GPU'sudur (`--gpu hw`). OBS tarayıcı kaynağı da donanım hızlandırmayla koşar. `--gpu sw` yazılım çizimiyle en kötü durumu verir.
- Sayfa `?qc=1` ile açılır ve N saniye gerçek zamanlı koşar.
  - İlk `--warmup` saniye (varsayılan 1) ölçüm dışıdır.
  - Pencere içinde üç tuş basılır: onay, vurgu, merak. Bu tepkiler ağzı etkilemez.
- Sayılar sayfanın kendi kancasından alınır: `window.__live.metrics({from, to, events, fps, presentMs})`.

| ölçü | tanım | ölçüt |
|---|---|---|
| fps ortalama | (kare − 1) / pencere süresi | ≥ 60 |
| fps p5 | 1 s kayan pencerelerin fps dağılımında 5. yüzdelik | ≥ 60 |
| düşen kare | ardışık kare aralığı > 1,5 × (1000/fps) ms (60 fps'te > 25 ms) | = 0 |
| gecikme (olay başına) | ilk tepki karesi − (akış başı + dosyadaki olay anı) + 1 kare sunum payı. İlk tepki: ağız ≥ 0,05 **ya da** konuşuyor durumu | p95 ≤ 100 ms, geçersiz örnek 0 |
| tetik gecikmesi | tuş olayının zaman damgası → tepkinin uygulandığı kare + sunum payı | p95 ≤ 100 ms |

fps ölçütünde %0,5 tolerans vardır. Gerekçesi 59,94 Hz ekranlar ve saat titreşimidir; JSON'da `criteria.fpsTolerance` alanında yazılıdır.

**Akış başı (çapa).**
- Akış başı `MediaStreamTrack.stats` ile ölçülür: `t − totalFramesDuration − latency`.
- 250 ms'de bir örneklenir ve **en erken** tahmin alınır. Bu, gecikmeyi temkinli yönde büyütür.
- `getUserMedia` çözülme anı çapa olarak kullanılmaz. Denemelerde bu anı çapa alınca aynı ham algılama koşudan koşuya 30 ile 270 ms arasında oynadı; `track.stats` çapası ise koşular arasında tutarlı kaldı.
- Stats yoksa çapa `gum` olur ve rapora "yaklaşık" uyarısı düşer.

**Kapsam.**
- Ölçülen zincir: yakalama → tarayıcı ses hattı → analyser penceresi → zarf ataklı tepki → kare → +1 kare sunum.
- Ölçülmeyen: mikrofon donanımı / sürücü tamponu (gerçek aygıtta tipik olarak 5–20 ms), OBS bileşim ve kodlama gecikmesi.
- Panelde gösterilen "giriş gecikmesi", gerçek aygıtın `track.stats.latency` değeridir.

**Çıktılar.**
- `out/probe/live-qc.json`:
  - `verdict`, `checks`, `summary`, `warnings`
  - `metrics`: aralıklar, düşen karelerin anı ve önceki karenin JS süresi, `work`, geçişler, olay başına gecikme tablosu, gürültü kapısı sızıntısı
  - `environment`: OS, CPU, tarayıcı sürümü, headless/headful, WebGL çizicisi, ölçüm penceresinde makine CPU meşguliyeti
- `out/probe/live-qc.md`: kısa özet.
- Çıkış kodları: 0 geçti · 3 kaldı · 1 ölçülemedi (sahte ses yok ya da giriş sessiz) · 2 kullanım.

**Ortam uyarıları.**
- Headless koşu gerçek ekran vsync'ine bağlı değildir. Kare zamanlaması tarayıcının iç saatiyle sürülür.
- Makine yükü (ölçüm penceresinde CPU > %70) düşen kare üretebilir. Rapor bunu uyarı olarak yazar; yük boşken yinele.
- Teslimden önce aynı ölçüm hedef yayın makinesinde `--headful` ile ya da OBS içinde yinelenir. OBS içinde ölçüm: kaynağın "Interact" penceresinde ya da uzaktan hata ayıklama ile `__live.metrics()`.
- Paketle gelen Chromium işletim sistemi tarafından engellenirse `--channel msedge` / `--channel chrome` makinedeki tarayıcıyı kullanır.

**Kayıtlı etkileşim önizlemesi (`--capture`).**
- `det` (varsayılan):
  - WAV'dan kare başı seviye izi Node'da çıkarılır; pencere analyser ile aynıdır. İz `out/live/capture-track.json` dosyasına yazılır.
  - Sayfa `?drive=manual` ile her kare bir adım sürülür ve ekran görüntüsü alınır.
  - Çıktı `out/live/capture.mp4` (WAV sesiyle) ve `capture-frames/NNNNN.png` olur. Kareler reviewer'ın §0.6 kanıtıdır.
- `rt`: Playwright video kaydıdır (≈25 fps, sessiz). Yalnız ön izleme içindir, zamanlama kanıtı değildir.

**Bağımsız ölçüm ve reviewer.**
- `live-qc.json` yapanın QC'sidir; reviewer ve `motion-measure` için yalnız yönlendiricidir.
- İkisi de sayıları kendi koşusuyla alır. Örnek: `?qc=1` sayfayı kendi Playwright betikleriyle sürer ve `__live.frames()` ham kare günlüğünden kendi istatistiğini hesaplar. Ya da kendi test sinyali ve kendi eşikleriyle koşar.
- Raporda yapanın sayısı ile measure'ın sayısı yan yana yazılır.
- Reviewer §0.6 kapısını (live ≥ 7/8) `capture.mp4` ve `capture-frames/` üzerinde, diğer kapılardaki yöntemle uygular. Ayrıca şunlara bakar:
  - durum geçişlerinin tasarımı (fade yok)
  - dinliyor ve boşta durumlarında mikro hareketin sürmesi (#6)
  - ikincil hareketin gecikmesi (#4; kare cinsinden)

---

## 8. Sorun giderme

| belirti | neden | ne yap |
|---|---|---|
| OBS'te "Mikrofon açılamadı — NotAllowedError" | OBS tarayıcı kaynağı medya iznini varsayılan olarak vermez | 1) OBS'i `--enable-media-stream` başlatma bayrağıyla aç (tarayıcı kaynağının medya akışı izni). 2) Tutmazsa Chromium bayrağı `--use-fake-ui-for-media-stream` izin istemini otomatik onaylar; OBS'in bu bayrağı CEF'e iletip iletmediği sürüme bağlıdır, dene. 3) Sayfayı `motion-render live` ile `http://127.0.0.1` üzerinden sun (`file://` değil). 4) Yedek yol: paneli izin veren sıradan bir tarayıcıda aç ve "ses kaynağı = bu panel" seç. Zarf panelde hesaplanır ve yerel aktarıcıyla sayfaya gider; birkaç ms ek gecikme getirir, `live --qc` ile değil kendi koşunla ölç |
| uyarı "AudioContext askıda" | tarayıcı otomatik oynatma politikası | kaynağın "Interact" penceresinde bir kez tıkla ya da tuşa bas. Ölçümde `--autoplay-policy=no-user-gesture-required` kullanılır |
| OBS'te hareket 30 fps | OBS Video FPS 30 ya da özel kare hızı 30 | Video FPS 60 ya da "Use custom frame rate" = 60 |
| takılma / düşen kare | donanım hızlandırma kapalı, "görünür değilken kapat" açık, adaptör pahalı | §6 ayarları; `metrics.work` p99 bütçesi; pahalı çizimi `init`'te pişir |
| panel "sayfa bağlı değil" | BroadcastChannel yalnız aynı tarayıcı profilinde çalışır; `file://`'da aktarıcı yoktur | ikisini de `motion-render live` URL'lerinden aç. OBS dock'u ile kaynak aynı kökeni kullanmalı |
| tuşlar çalışmıyor | kaynak klavye odağı almaz; odak bir yazı alanında olabilir | panel dock'una tıkla (yazı alanı dışında); eşlemeyi panelde denetle |
| ağız sessizlikte kıpırdıyor | kapı düşük, kazanç yüksek | panel göstergesinde zemin seviyesini gör; `gateDb`'yi zeminin 6–10 dB üstüne al. QC'de `gateLeakFrames` > 0 uyarısı verir |
| konuşmaya geç giriyor | `talkConfirmMs` / `talkOn` yüksek | ağız gecikmesi `talkConfirmMs`'ten bağımsızdır (yalnız kapı, kazanç ve ataka bağlı); durum gecikmesi `talkConfirmMs` kadar uzar. QC'de `stateLatencyP95` olarak görülür |
| `live --qc` "ölçülemedi" | sahte ses girişi yok ya da WAV okunamadı (biçim: 16/24/32 bit PCM ya da 32 bit float) | WAV'ı denetle; Chromium sürümünü denetle. Test ortamında test atlanır, "kaldı" sayılmaz |
| `--headful` açılmıyor (izin reddi) | işletim sistemi uygulama denetimi paketli Chromium'u engelliyor | `--channel msedge` ya da `--channel chrome` |

---

## 9. Teslim

`/motion:live` teslim paketi:
- `live/` (sayfa, panel, `live.js`, projenin adaptörü)
- `live/ayarlar.json`
- `out/probe/live-qc.json` ve `.md`: hedef makinede ya da headful koşunun sonucu ve ortam satırı
- `out/live/capture.mp4`
- künye: kapılar tablosunda fps (ortalama / p5), gecikme (p50 / p95), düşen kare ve tetik gecikmesi satırları
- OBS kurulum notu: §6

Master ve arşiv yoktur.
