# AUDIO — ses hattı: transkript, vuruş, kayma, eşlem, master

> **Ne:** seslendirmeden (kayıt ya da TTS) kare zamanlarına giden hat. Transkript → klip doğrulaması → vuruş haritası → akustik çapalar → tasarım. Yeni ses gelince: kayma ölçümü → zaman eşlemi → yalnız etkilenen karelerin yeniden çizimi. Sonda sesli kopya ve master ses.
> **Kaynak:** kaynak projenin üç ses sürümüyle yaşanan hat (iki yeni çekim, bir sessiz kuyruk revizesi) ve bunun dersleri. Değerler **[ÖRNEK]** olarak verilir; sözleşme değerleri (33 ms, 250 ms, −16 LUFS) bu belgede sabittir. Değiştirmek gerekirse `project.md`'de gerekçeyle yazılır.
> **İlke — ses yönetir:** kesme ve vuruş cümle sınırına ya da ölçülmüş durağa kilitlenir. Fiziksel olay konuşulan kelimeye ≤ 1 kare oturur. Görüntü sesi beklemez, ses görüntüye uydurulmaz.
> **Kural kimlikleri** RULES.md'dedir (§13 SES-1…SES-6, ÇEN-1/2, SN-7, MS-1…3). Bu belge onların prosedürüdür; eşleme §14'te.
> **Gizlilik:** transkript, `words.json`, `BEATS`, `amap.json` (`words[]`, `diff[]`) seslendirme metni taşır. Proje içinde kalır; pakete, örneklere ya da rapor alıntısına girmez.

---

## 0. Kurulum (D1-08)

- Python + Whisper **isteğe bağlıdır**: `motion-render init <dir> --with-whisper` → `requirements.txt` (faster-whisper). Smoke ve eval Whisper istemez.
- Whisper yoksa iki yol var:
  - kelime zamanları başka kaynaktan gelir (TTS'in verdiği zamanlar ya da elle `words.json`);
  - `beats` yalnız akustik çalışır: durak ve kesme TC'leri, kelime eşlemesiz.
- Ses çözümü her yerde projenin ffmpeg'iyledir: 16 kHz mono f32. faster-whisper'ın PyAV yolu bazı sürümlerde uyumsuz; dizi doğrudan modele verilir.
- Windows konsolu UTF-8 olmayabilir. Araç çıktısı UTF-8'e zorlanır; dosyalar her zaman UTF-8, LF, BOM'suz yazılır.

## 1. Hat

```
seslendirme (kayıt | TTS)  →  materials/<ses>.wav     scenes.json "audio" = TEK KAYNAK
 1 motion-render transcribe materials/<ses>.wav --out script/<ad>
      → <ad>.words.json · .srt · .txt · .dogrula.md   (.part → rename)
 2 klip doğrulaması (şüpheli bölgeler)  motion-render transcribe verify <spec>
      → <ad>.words.json düzeltilmiş (meta.corrected, meta.fixes[]) · ham: <ad>.whisper.words.json
      DUR → metin farkı beklenen yerlerin dışında
 3 motion-render beats materials/<ses>.wav --words script/<ad>.words.json --out script/BEATS.md
      → BEATS.md + beats.json (duraklar ≥ 250 ms, kesme TC, vurgu adayları)
 4 akustik çapalar: kritik vuruşlarda kelime başı / konuşma sonu ölçülür
 5 aday listesi (öneri; karar kullanıcının) → shot listesi → scenes.json (kesme f = round(t·fps))
 6 tasarım: olay ↔ kelime ≤ 1 kare (ÇEN-1); kelime → zaman eşlemesi shot aralığıyla sınırlı
 ── yeni ses gelirse ──
 7 motion-render audio-diff <eski> <yeni>     zarf korelasyonu (aynı çekim mi?) + kayma eğrisi
 8 transcribe + verify (yeni ses) → kelime farkı → shot başına Δ tablosu (kelime çapaları + zarf sağlaması)
      DUR 1 → kayma tablosu + yeniden çizim planı (süre tahminiyle)
 9 motion-render amap build --anchors script/amap.config.json   (tasarım zamanı korunur)
10 yalnız |Δ| > tol olan aralıklar yeniden çizilir; diğer kareler imgdiff 0 (tanık kareler)
 ── teslim ──
11 motion-render ses <id…> · ses preview <id,id>    sesli kopya / birleşik ön izleme
12 motion-render master --tag vN                    sessiz kuyruk + −16 LUFS / ≤ −1 dBTP
```

## 2. Transkript (`transcribe`)

- Model `large-v3`, dil proje dili, int8 CPU [ÖRNEK].
- Çıktı:
  - `words.json`: kelime · başlangıç · bitiş · güven · segment;
  - `.srt`: segment altyazısı;
  - `.txt`: düz metin;
  - `.dogrula.md`: güveni < 0.6 olan kelimeler, TC ve bağlamla. Kullanıcıya doğrulatılacak listedir.
- **TTS de bu hattan geçer.** TTS'in verdiği kelime zamanları çapa adayıdır; akustikle (§5) doğrulanmadan kesme kurulmaz.

## 3. Klip doğrulaması (Whisper halüsinasyonu)

Whisper uzun geçişte, önceki metne koşullu çözümde güvenilmez. Belirtiler [ÖRNEK, kaynak projede görüldü]:

| belirti | nasıl görünür |
|---|---|
| sıfır süreli tekrar | aynı ifade iki kez, ikincisinin süresi ≈ 0 |
| uydurma kelime | süre < 50 ms ve güven < 0.6 |
| kelime bölme | tek kelime iki kelimeye bölünür (ya da iki kelime birleşir) |
| sınır kayması | duraktan sonraki ilk/kısa kelime sessizliğin içine konur (§5) |

Yöntem (`transcribe verify <spec>`):

```json
{ "audio": "materials/<ses>.wav", "words": "script/<ad>.words.json",
  "regions": [ [37.10, 41.20, "sıfır süreli tekrar"], [52.00, 53.40, "bölünmüş kelime?"] ],
  "beams": [5, 10], "conditionOnPrevious": false }
```

- Şüpheli bölge kısa klip olarak, **önceki metne koşulsuz**, iki ışın genişliğiyle (beam 5 / 10) yeniden çözülür. İki ses karşılaştırılıyorsa ikisinde de yapılır.
- Düzeltme kanonik dosyaya yazılır: `meta.corrected: true`, `meta.fixes[{op, from, to, why}]`. Ham çıktı `<ad>.whisper.words.json` olarak saklanır, silinmez.
- **Kelime farkı kararından önce doğrulama yapılır.** Doğrulamasız "fark var → DUR" yanlış tetiklenir.
  - [ÖRNEK] kaynak projede Whisper'ın üç "farkı" klip doğrulamasında hata çıktı. Tek gerçek fark bir kelimeydi.
- Metin farkı beklenen yerlerin dışındaysa **DUR** (RULES DUR-8): kullanıcıya fark tablosu gider.

## 4. Vuruş haritası (`beats`)

1. Ses 16 kHz mono'ya çözülür; **10 ms** pencerede RMS (dBFS).
2. **Sessizlik eşiği** = gürültü tabanı (%10'luk dilim) + 6 dB, en az −50 dBFS. Eşiğin altında kesintisiz **≥ 250 ms → durak** (SES-5).
3. **Cümle** noktalamayla biter (. ! ? …). TC aralığı = ilk kelime t0 → son kelime t1.
4. **Kesme TC:** Whisper kelime sınırları sessizliğe ±0.2–0.5 s taşar.
   - Sınır durağı = `[t1 − 0.6, sonraki t0 + 0.6]` penceresiyle kesişen **en uzun ölçülen sessizliktir**.
   - Kesme TC o sessizliğin **ortasıdır**.
   - Cümle içi duraklar önceki kelimeyle kaydedilir.
5. **Vurgu adayı puanı:** kelime RMS'inin cümle içi z-skoru · uzama (süre / hece beklentisi) · ardından gelen durak. İlk 25 aday listelenir.
6. Kare: `f = round(t · fps)`. Fps tek kaynaktır (`scenes.json fps`).

## 5. Akustik çapalar

- Whisper duraktan sonraki **ilk** kelimeyi ve **kısa** kelimeleri sessizliğin içine kaydırabilir. [ÖRNEK] −0.24 s ölçüldü.
- Kritik vuruşlarda kelime başı ve **konuşma sonu akustik ölçülür**:
  - kelime başı = durak sonrası eşiği geçen ilk pencere;
  - kapanış ünsüzü / sessizlik sonu;
  - −50 dB altında ≥ 30 ms sessiz aralıklar.
- **Kısa durak ortası (≥ 80 ms)** da çapadır.
- İki ses karşılaştırılıyorsa **ikisinde aynı akustik yöntem** kullanılır.
- **Zarfla > 50 ms çelişen Whisper çapaları atılır** (zarf §6.1). [ÖRNEK] bir eşlemde dört çapa atıldı; hepsi duraktan sonraki ilk ya da kısa kelimeydi.
- Ses karakteri değişen bölgede (ör. fısıltı → normal ses) zarf korelasyonu güvenilmez. Orada zarf kullanılmaz; çapalar doğrudan akustik ölçümden alınır.
- Aynı kelime iki shot'ta geçebilir. **Kelime → zaman eşlemesi shot aralığıyla sınırlanır.** Manifestteki lyric adları tekrar edebilir; zaman aralığıyla ayrılır.

## 6. Yeni ses / yeni çekim

### 6.1 Önce hizala: `audio-diff`

- "Aynı çekim, bir kelime kesik" varsayımı yanlış olabilir. [ÖRNEK] kaynak projede yeni ses farklı tempolu yeni çekimdi: kayma +200 ms'den −1370 ms'ye kadar sürekli değişiyordu.
- **Zarf çapraz korelasyonu:**
  - 10 ms RMS dB zarfı;
  - **kayan 1.5 s pencere**, ±1.5 s gecikme aralığı;
  - sessiz pencere atlanır;
  - gecikme PCM'de ±12 ms içinde inceltilir.
  - Çıktı kaymanın zaman içindeki eğrisidir (`t → gecikme ms, korelasyon`). Whisper'dan bağımsızdır.
- **Aynı çekim göstergesi:** PCM korelasyonu > 0.9. Altındaysa "yeni çekim" kabul edilir ve kare kopyası düşünülmez.
- Kayma **iki bağımsız yoldan** ölçülür: kelime çapaları (LCS hizalaması) ve zarf. Biri öbürünü sağlar.

### 6.2 Kelime farkı ve shot başına Δ

- Kelime hizalaması LCS ile yapılır (küçük harf, yalnız harf/rakam). Fark tablosu: `fark | eski | yeni | sonuç`.
- Shot başına Δ (ms) = çapalarda yeni − eski. Çapalar: kesme TC'leri, lyric kelime başları, ses vuruşları, sahne olay kelimeleri.
- **Kural: |Δ| ≤ 33 ms → kareler aynen kalır** (SES-2).
  - 33 ms = 60 fps'te 2 kare, 30 fps'te 1 kare.
  - Shot'taki bütün çapalar tolerans içindeyse shot yeniden çizilmez. Aksi halde etkilenen kareler listelenir ve eşlemle yeniden çizilir.
- **Silinen kelime çapasız bırakılır.** Süresi önceki ve sonraki çapa arasına yayılır. [ÖRNEK] 0.58 s'lik silinen kelime komşu shot'ta hız ≤ 1.31× verdi. Lyric değişirse yeni lyric kalan kelimenin tasarım TC'sine bağlanır.

### 6.3 DUR 1 — kayma tablosu + yeniden çizim planı

Belge `docs/<faz>-SES-KAYMA.md`:

```markdown
## 1. Metin farkı                       | fark | eski | yeni | sonuç |
## 2. Genel kayma (zarf korelasyonu, Whisper'dan bağımsız)   aynı çekim mi (PCM r), kayma eğrisi özeti
## 3. Shot başına kayma                 | shot | perde | çapalar (Δ ms) | zarf (ms) | Δ aralığı | karar (aynen | yeniden) |
## 4. Perde sınırları ve film süresi    | perde | shot | kare | süre | önce | fark |
## 5. Yeniden çizim planı              | perde | kalan kareler (imgdiff 0, tanık) | yeniden çizilen | eşlem | tempo (dτ/dt) | s/kare | tahmini süre |
## 6. Eşlem yöntemi                     çapa sayısı, koridor, en büyük hata, atılan çapalar
## 7. Akustik doğrulamalı zamanlar     | olay | eski | yeni | not |
## 8. Açık kararlar ve DUR
```

DUR sırasında bağımsız işler sürer. Ör. Δ ≤ 33 ms bölgelerin tanık karelerini doğrulamak ya da logodan bağımsız perdeleri yeniden çizmek.

## 7. Zaman eşlemi (`amap build`)

**İlke: tasarım zamanı korunur, eşlem çevirir** (RULES SES-3).

- Sahne kodu ve bütün sabitler **tasarım zamanında (τ)** kalır.
- Sayfa sesi `t`'den tasarım zamanı `τ = W(t)` hesaplanır; ters yönde ikiye bölme kullanılır.
- Model: `t = τ + Δ(τ)`.

| öğe | kural |
|---|---|
| çapalar | kesme TC'leri, lyric kelime başları, ses vuruşları, sahne olay kelimeleri; atılanlar §5 |
| çözücü | 10 ms ızgarada **en az eğrilikli yumuşatma spline'ı**. Hata > hedef olan çapanın ağırlığı ×4 (yinelemeli). Sonuç 0.1 s düğümlerde Hermite (C1) |
| koridor | hedef ±28 ms (= tol − 5 ms); doğrulama: her çapa \|t̂ − t\| ≤ 33 ms. [ÖRNEK] en büyük hata 26–28 ms |
| birebir aralık | baştaki \|Δ\| ≤ tol çapalar Δ ≡ 0. Sayfa orada **tam kimlik** kullanır (`τ = t`). 1e-9 yuvarlaması bile kareyi değiştirir |
| devralma | değişmeyen aralıkta eski eşlem fonksiyonuna devredilir → kareler bit-aynı kalır |
| sınırlar | perde/sahne sınırları kare ızgarasında **sert** çapadır. Sınır anında τ tam döner, dağıtım kayması olmaz |
| rapor | perde başına hız çarpanı `dτ/dt` aralığı. [ÖRNEK] 0.91–1.17 tipik; silinen kelime bölgesinde 1.31 |

- **Monoton kübik (Fritsch–Carlson) reddedildi:** ara düğümlerde eğimi sıfırlayıp yerel hızı 1.4×'e çıkarıyordu. Yumuşatma spline'ı aynı çapalarla 1.17× verdi.
- **Eşlemin yan etkileri** sayfada ele alınır:
  - kare başı tasarım süresi değişir → hareket bulanıklığı tasarım kare süresiyle hesaplanır;
  - kamera hız kancaları (`__camSpeed`) sayfa kareleriyle çalışır;
  - perde başlangıç algısı eşlenmiş sınırla yapılır;
  - manifest: perde `frames`/`range` ses zamanında; shot `t0`/`f0` tasarım zamanında + ses zamanı alanları (`a0`, `af0`).
- **İki eşlem** gerekebilir. [ÖRNEK] eski perdeler: ilk tasarım → yeni ses; sonraki perdeler: önceki ses → yeni ses. Sayfa ikisini sırayla yükler.
- **Yeni perdeler doğrudan yeni ses zamanında tasarlanır** (eşlemsiz). Eşlem yalnız önceden tasarlanmış perdeler içindir.
- **Saklı kare bayatlığı:** "birebir aralık, kareler kalır" kararından önce saklı kare güncel kodla probe edilip karşılaştırılır. [ÖRNEK] eski bir doku kalıntısı 0.56/255 fark verdi; eskiyi tutup yenisini eklemek doku sıçraması yapardı, perde baştan çizildi.

`script/amap.config.json` (`amap build --anchors` girdisi) [ÖRNEK, önerilen alanlar]:

```json
{
  "fps": 60, "tol": 0.033, "target": 0.028, "dropIfEnvelopeConflictMs": 50,
  "design": { "words": "script/<tasarim>.words.json", "beats": "script/<tasarim>.beats.json" },
  "audio":  { "file": "materials/<yeni-ses>.wav", "words": "script/<yeni>.words.json", "beats": "script/<yeni>.beats.json",
              "envelope": "out/probe/<faz>/audio-diff.json" },
  "bounds": [ { "id": "<FILM>-P1", "tau": 0 }, { "id": "<FILM>-P2", "tau": 30.30 } ],
  "anchors": [
    { "kind": "cut",   "label": "S03 kesme",      "tau": 8.12,  "t": 8.32 },
    { "kind": "lyric", "label": "S05 lyric başı", "tau": 15.06, "word": 44 },
    { "kind": "event", "label": "S05 damga",      "tau": 17.40, "word": 47 }
  ],
  "keep": [ { "range": [0, 3.90], "map": "identity" },
            { "range": [36.90, 40.38], "map": "script/<onceki>.amap.json" } ],
  "out": { "json": "script/<yeni>.amap.json", "page": "script/<yeni>-amap.js" }
}
```

## 8. Olay ↔ kelime ve tasarım kuralları

- **Fiziksel olay** (çentik, damga, çarpma, kilit) kelimenin ses başından **≤ 1 kare sonra** gelir (60 fps ≤ 16.7 ms) ve olay anında tamdır (ÇEN-1). Kare hesabı olayı metnin içine koyar; yüksek hızda olay metnin dışına düşebilir.
- **Yazım anı ≠ kelime anı:** yazılarak gelen kelime kelime başında başlar. Look-dev ve kontrol karesi = yazım bitişi + 0.1 s (6 kare @60; RULES VR-5).
- **Işık çekilişi kelime içinde başlamaz.** Son kart okunmadan söner; çözüm sessiz kuyruktur (§9).
- Görünürlük zaman eşiğiyle değil, izdüşümle ölçülür. Lyric'in ilk okunur karesi kelime başına göre denetlenir.

## 9. Sessiz kuyruk

- Film sonu = konuşma sonu (akustik) + **tutuş 0.8 s** (yalnız drift + toz/gren; aletsiz) + **ışık çekilişi 1.0 s** (önce pozlama, 16-bit iniş + dither; havuz en son ve az) + **siyah ≥ 0.067 s** (4 kare @60) [ÖRNEK; RULES SN-7].
- Ses dosyasına **düz dijital sessizlik** eklenir; oda sesi eklenmez. `apad` + `-shortest` ile video uzunluğunda kesilir.
- **Kuyruk K3 kamera ölçüsüne dahil değildir.** Bu istisna değil, kuraldır: K3 shot listesi aralığında ölçülür.
- Manifestte kuyruk tek yerde durur (film süresi / `audioTail`). Okuyan araç yoksa alan bayatlar; `doctor` okunmayan alanı uyarır.

## 10. Sesli kopya ve ön izleme (`ses`)

- `motion-render ses <id…>`: perde mp4'üne proje sesi eklenir. Ses manifestteki aralıktan (`range[0]/fps`) alınır, video süresi kadar sürer.
- `motion-render ses preview <id,id,…>`: perdeler uç uca (video kopya) + ses 0'dan. Yalnız ön izlemedir; master değildir (dikiş IDR sıçraması, §11).
- Görüntü yeniden kodlanmaz (`-c:v copy`); ses AAC 160k; çıktı `.part → rename`. Ses kaynağı yalnız `scenes.json audio`.

## 11. Master ses

- 48 kHz stereo (çift mono) → sessiz kuyruk → **doğrusal kazanç** (sınırlayıcı yok) → **−16 LUFS entegre / ≤ −1 dBTP** (MS-2).
- Ölçüm **kuyruk dahil** yapılır (`ebur128 peak=true`). Kuyruğun sessiz olduğu ayrıca ölçülür (`volumedetect`).
- mov: PCM 24-bit. mp4: AAC 320k hedef. [ÖRNEK] ölçülen ~245 kb/s VBR kabul edildi; sapma raporda kayıtlı kabul olarak yazılır.
- Master görüntüsü **tek sürekli encode**dur. Perde mp4'lerini uç uca eklemek dikişte IDR sıçraması bırakır.
- Sonuç `out/master/<film>_vN-loudness.json`.

## 12. Ses cue listesi (isteğe bağlı)

Ses efekti kurguda yapılıyorsa kare-kesin olaylar listelenir: `TC | t / kare | perde | olay | önerilen efekt`.

## 13. Dosya şemaları (metinler anonim)

**`script/<ad>.words.json`** (ham: `<ad>.whisper.words.json`, aynı şema):

```json
{
  "meta": { "audio": "materials/<ses>.wav", "model": "large-v3", "language": "tr", "language_p": 0.99,
            "duration": 116.72, "words": 312, "segments": 41, "low": 0.6, "seconds": 84.2,
            "corrected": true,
            "fixes": [ { "op": "merge", "from": [57, 58], "to": "<kelime>", "why": "klip doğrulaması: bölünmüş kelime" },
                       { "op": "delete", "from": [91], "to": null, "why": "sıfır süreli tekrar" } ] },
  "segments": [ { "i": 0, "t0": 0.42, "t1": 3.96, "text": "<segment metni>", "avg_logprob": -0.18, "no_speech": 0.01 } ],
  "words": [ { "i": 0, "w": "<kelime>", "t0": 0.42, "t1": 0.71, "p": 0.97, "seg": 0 } ]
}
```

**`script/<ad>.dogrula.md`:** `# Doğrulanacak kelimeler (güven < 0.6)` + `| # | TC | kelime | güven | bağlam | doğrusu |`. 0.6–0.8 aralığı ve dilbilgisi şüphesi için ayrı bölüm eklenebilir.

**`script/beats.json`:**

```json
{
  "audio": "materials/<ses>.wav", "dur": 116.72, "threshold": -47.3,
  "pauses": [ [3.96, 4.31], [8.02, 8.61] ],
  "sentences": [ { "n": 1, "t0": 0.42, "t1": 3.96, "d": 3.54, "gap": 0.35, "sil": [3.96, 4.31], "cut": 4.135,
                   "inner": [ { "at": 2.10, "ms": 270, "after": "<kelime>" } ], "text": "<cümle>" } ],
  "candidates": [ { "s": 1, "w": "<kelime>", "t0": 2.71, "t1": 3.20, "z": 1.8, "stretch": 1.4, "after": 0.27, "score": 3.1, "p": 0.95 } ]
}
```

**`script/BEATS.md`:**

```markdown
## Cümleler
| # | TC aralığı | süre | ardındaki durak | kesme TC | cümle içi duraklar | metin |
## Duraklar (≥ 250 ms)
## Vurgu adayları (ilk 25)
| kelime | cümle | TC | z | uzama | ardından durak | puan | güven |
## Lyric vuruşu önerileri
```

**`script/<yeni>.amap.json`** (`amap build` çıktısı; sayfa `script/<yeni>-amap.js` yükler, elle düzenlenmez):

```json
{
  "doc": "t = τ + Δ(τ); tasarım zamanı korunur", "audio": "materials/<yeni-ses>.wav",
  "tol": 0.033, "hedef": 0.028, "fps": 60, "identUntil": 3.90, "iter": 5, "hermErrMs": 0.4,
  "knots": { "step": 0.1, "d": [0, 0, -0.012], "m": [0, 0, -0.03] },
  "bounds": [ { "tau": 30.30, "t": 29.85, "f": 1791 } ],
  "perde": [ { "id": "<FILM>-P2", "tau": 30.30, "t": 29.85, "f": 1791, "frames": 632, "speed": [0.94, 1.31] } ],
  "anchors": [ { "kind": "cut", "label": "S03 kesme", "tau": 8.12, "t": 8.32, "d": 0.20, "err": 0.011 } ],
  "bad": [ { "label": "<kelime>", "why": "zarfla 74 ms çelişki" } ],
  "diff": [ { "op": "del", "w": "<kelime>", "t": 37.30 } ],
  "words": [ { "i": 57, "w": "<kelime>", "tau": 40.26, "t": 39.18, "d": -1.08, "fit": 0.004 } ]
}
```

Sayfa tarafı (`<yeni>-amap.js`) şunları sağlar: `step`, `ident` (birebir sınırı), düğüm dizileri ve dönüşüm işlevleri (ses → tasarım, tasarım → ses, sayfa karesi → zaman). Adlar runtime sözleşmesinde tanımlıdır; sahne kodu yalnız bu işlevleri çağırır.

**Aday listesi `script/ADAYLAR.md`** (öneri; karar kullanıcının): `# | cümle | TC (kelime) | ekrana | tür | vuruş önerisi | kalıp | not` + `## Açık kararlar`.

## 14. RULES eşlemesi

Bu belge kural tanımlamaz; RULES.md kurallarının **prosedürüdür**. Kural kimlikleri RULES.md'dedir; LESSONS.md de onlara bağlanır. RULES'ta ayrı kimliği olmayan prosedür maddeleri bölüm numarasıyla anılır (ör. "AUDIO §5").

| RULES id | kural (özet) | bu belgede |
|---|---|---|
| SES-1 | proje sesi tek kaynak: `scenes.json audio` | §1, §10 |
| SES-2 | ses kilidi; \|Δ\| ≤ 33 ms → yeniden render yok; aksi etkilenen kareler | §6.2, §6.3 |
| SES-3 | önce hizala; tasarım zamanı korunur; koridor ±28 ms; > 50 ms çelişen çapa atılır; birebir aralıkta tam kimlik | §5, §6.1, §7 |
| SES-4 | transkript doğrulanır (halüsinasyon adayı → klip yeniden dökümü); beklenmeyen metin farkı → DUR-8 | §3 |
| SES-5 | durak ≥ 250 ms | §4 |
| SES-6 | ses kilidi OURS/K3 hedefiyle çelişirse ses kazanır | §0 (ilke) |
| ÇEN-1 · ÇEN-2 | olay ↔ kelime ≤ 1 kare; olay anında tam | §8 |
| SN-7 | kapanış kuyruğu; çekiliş kelime içinde başlamaz; K3 dışı | §9 |
| MS-1 · MS-2 · MS-3 | master biçimi · −16 LUFS / ≤ −1 dBTP kuyruk dahil · tek sürekli encode | §11 |
| RH-6 | "birebir aralık" kararından önce saklı kare güncel kodla probe | §7 |
| VR-5 | look-dev karesi = tamamlanma + 0.1 s (kelime anı ≠ yazım anı) | §8 |
| DUR-8 | ön koşul: ses metninde beklenmeyen fark | §3, §6.3 |

RULES'ta ayrı kimliği olmayan prosedür maddeleri:

| madde | bölüm |
|---|---|
| Whisper isteğe bağlı; ses çözümü ffmpeg ile; UTF-8 | §0 |
| kesme TC = ±0.6 s pencerede en uzun ölçülen sessizliğin ortası | §4 |
| kritik vuruşlarda akustik çapa; kısa durak ≥ 80 ms; ses karakteri değişen bölgede zarf kullanılmaz | §5 |
| kelime → zaman eşlemesi shot aralığıyla sınırlı | §5 |
| kayma iki bağımsız yoldan (kelime + zarf); aynı çekim PCM r > 0.9 | §6.1 |
| silinen kelime çapasız | §6.2 |
| DUR 1 kayma tablosu + yeniden çizim planı | §6.3 |
| yeni perdeler doğrudan yeni ses zamanında | §7 |
| en az eğrilikli spline; sınırlar kare ızgarasında sert; değişmeyen aralıkta eski eşleme devir | §7 |
