# GENAI — üretken varlık hattı

> **Ne:** üretken servisle (Higgsfield CLI) varlık üretmenin süreci: kurulum, politika, istek, bütçe, üretim, ingest, kare kare kabul, ledger, rapor.
> **Kaynak:** kaynak projenin üretken varlık hattı (ADR-023/024), politika ve ledger şemaları, kabul ölçütleri ve hatalardan çıkan dersler. Sayılar kaynak projede ölçüldü ve **[ÖRNEK]** olarak verilir. Yeni projede değerleri `project.md §9` ile `assets/gen/policy.json` belirler.
> **Kim okur:**
> - `motion-research`: ihtiyaç listesi, katalog süzgeci, istek JSON'u.
> - `motion-director`: bu belgeye göre üretim ve ingest; bekçi kodda, ajan bekçiyi aşmaz.
> - `motion-reviewer`: bağımsız kabul ve bütçe denetimi.
> - `motion-measure`: klip tarama ve logo ölçümleri.
>
> (D1-04: eski `asset-scout` / `asset-gen` ajanları emekli; işlevleri `motion-research` ve `motion-director`a geçti.)
> **Kural kimlikleri** RULES.md'dedir (§15 GEN-1…GEN-9, DUR-2/5/8, ML-2). Bu belge onların prosedürüdür; eşleme §19'da.
> **1.4:** plaka düzenleme — maskeli bölge üretimi (§17) ve istem kalıpları (§18); set plakası kabulü §9.4 + motion-world `library/photo-plate/SET.md` §7.

---

## 0. İlke: üretken çıktı = varlık (ADR-023)

- Üretken model sahne, shot ya da tam video üretmez. Üretken çıktı yalnız **varlıktır**: plaka (görüntü), eleman/geçiş klibi, efekt animasyonu, storyboard görseli, büyütülmüş dış kaynak (ör. logo büyütme).
- Varlık `assets/gen/` altında **hash'li ve manifestli** durur. Sahne kodu yalnız dosya yolunu bilir (`assets/gen/assets.js`).
- **Render anında üretim yok.** Üretim tekrarlanmaz: bazı modellerde seed yoktur, aynı istem aynı çıktıyı vermez. Değişiklik yeni id ya da `-vN` sürümüdür.
- Gerekçe: üretken sahne motorun determinizmini (her kare `T`'nin saf fonksiyonu), ışık arkını ve SERT kuralları (fade yok, aksan kotası, okunurluk) kontrol dışına çıkarır.
- **Motorun yapabildiğini üretkenden isteme:** ışık, gölge, kamera, tipografi, çizgi, ızgara, geçiş. Üretkenin katkısı gerçek **doku/malzeme** ve **organik harekettir**.
- Üretken klip **asla cümleyi anlatmaz** ve **asla tek başına kare olmaz**. Her zaman motor katmanının (tipografi, çizgi, ışık, gren) altında, destek olarak durur.

## 1. Kurulum ve kimlik (D1-01)

```
npm i -g @higgsfield/cli
higgsfield auth login          # tarayıcıda OAuth; girişi kullanıcı kendisi tamamlar
/motion:doctor                 # ✓ CLI · ✓ oturum · bakiye basılır
```

- **`.env` YOK, API anahtarı yok.** Kimlik CLI'nin yönettiği OAuth oturumudur.
- Token hiçbir dosyaya kopyalanmaz: refresh token döner, kopya bayatlar ve sırrı çoğaltır. Token loglanmaz, rapora yazılmaz.
- Bakiye tek yoldan okunur: `higgsfield account status --json` → `credits`. Çıktıdaki hesap ve e-posta alanları süzülür, hiçbir yere basılmaz.
- `motion-render doctor` CLI'yi, oturumu ve bakiyeyi denetler. Oturum yoksa kullanıcıya `higgsfield auth login` önerir; girişi kendisi yapmaz.
- Varsa servis MCP bağlayıcısı yalnız okuma içindir (bakiye, katalog, geçmiş üretimler); üretim yolu değildir.
- Hesap/workspace kimliği, iş kimliği (`jobId`) ve sonuç URL'si yalnız proje içindeki yan dosyada kalır. Belgeye, rapora ya da pakete girmez.
- **Eval / smoke: üretken çağrı 0** (VK-08). `generate create` hiç çağrılmaz; `gen` yalnız `--dry` ile koşar. Bakiye okumak serbesttir.

## 2. Roller ve kapı

| adım | kim | çıktı |
|---|---|---|
| ihtiyaç listesi: shot · katman (A/B) · neden motor yapamaz · kabul ölçütü | `motion-research` | `docs/gen/IHTIYAC-<sahne>.md` (ya da faz raporu bölümü) |
| katalog süzgeci (projede **bir kez**) | `motion-research` | `docs/gen/CATALOG.md`, `docs/gen/KREDI.md` |
| istek JSON'u | `motion-research` | `assets/gen/requests/<sahne>.json` |
| tahmin → üretim → ingest → tarama | `motion-director` (bu belgeye göre) | `inbox/`, `manifest.json`, `runs/`, `out/probe/clipscan/` |
| bağımsız kabul + bütçe denetimi | `motion-reviewer` (taze bağlam, kendi yöntemi) | `out/review/…`; karar manifeste `ingest review` ile işlenir |
| onay (pilot, final, tavan aşımı, liste dışı model) | kullanıcı | DUR (§8) |

- **Tek kapı (ADR-024):** üretim yalnız `motion-render gen` ile yapılır. `higgsfield generate create` doğrudan çağrılmaz.
- Bekçi kodun içindedir: liste denetimi, maliyet tahmini, tavanlar, bakiye önce/sonra, sapma denetimi. Ajanın dikkatine bırakılmaz.
- Üçüncü taraf üretken skill'lerin varsayılanları (model önerisi, "maliyet tahmini yapma" gibi) bu hattın bekçisiyle çelişir. Geçersiz sayılır; o skill'ler yalnız CLI başvurusu olarak okunur.
- Reviewer manifeste yazmaz. Kararını `out/review/` altına yazar; director bunu `motion-render ingest review <id> kabul|ret|yedek "reviewer: <not>"` ile aktarır.
- **Manifest elle düzenlenmez.** Tek yazar `ingest`'tir.

## 3. Katalog bir kez (`docs/gen/CATALOG.md`, `docs/gen/KREDI.md`)

- Model kataloğu projede **bir kez** listelenir ve süzülür. Sonra `models_list` / `models_get` çağrılmaz; dosya okunur.
- Yeni model gerekirse tek seferlik ek okuma kullanıcı kararıdır. Sonuç aynı dosyaya eklenir.
- Kredi fiyatı katalogda yoktur. Fiyatlar ölçülür:
  - **tahmin:** `higgsfield generate cost <job> … --json`; kredi harcamaz;
  - **gerçek:** bakiye farkı. `gen` her öğede ikisini de yazar.
- **Katalog id ≠ CLI job adı.** Eşleme tablosu zorunludur.
  - [ÖRNEK] kaynak projede bir katalog id'si CLI'da başka (pahalı) bir modelin takma adı çıktı. Doğru CLI job'u farklı bir addı.
  - Eşleme `policy.json → whitelist.<id>.cli` alanına yazılır.

`CATALOG.md` iskeleti:

```markdown
# CATALOG — <servis>, süzülmüş (<tarih>, tek listeleme)
> Bundan sonra katalog çağrısı yok; bu dosya okunur. Beyaz/kara liste project.md §9'da; sahne direktifi değiştiremez.
## CLI eşlemesi
| katalog id | CLI job | dikkat |
## Gereken modeller
| # | id | ad | tür | liste (beyaz · kara · araç · liste dışı) | girdi rolleri | süre | çözünürlük | en-boy | çıktı boyu (px) | seed | maske girdisi | not |
## Kara liste
| kara liste | katalog id'leri |
## Notlar   (ses varsayılanı, seed var/yok, platform fiyat farkları)
```

- (1.4) **çıktı boyu** gerçek üretimden (yan dosya `w`/`h`) yazılır, katalog çözünürlük adından değil: hedef plakaya büyütme oranı buradan hesaplanır
  (§17.5). **seed** `var | yok` ve **maske girdisi** `var | yok | belgesiz` modelin parametre listesinden (tek katalog okuması; §18.5).

`KREDI.md` tablosu: `model | CLI job | ayar | tahmin | gerçek (bakiye farkı) | tarih | not`.

[ÖRNEK — kaynak projede ölçüldü. Fiyatlar değişir, her projede yeniden ölçülür:]

| sınıf | ayar | kredi |
|---|---|---|
| ucuz görüntü (gerçekçi doku) | 2K · 16:9 | 0.12 |
| genel görüntü | 2K · 16:9 (referans görüntülü de aynı) | 2 |
| hızlı video (mini) | 480p · 4 s · ses kapalı | 2 |
| hızlı video (mini) | 720p · 4 s · ses kapalı | 4 |
| video std | 720p · 10 s · ses kapalı | 15 |
| video pro | 1080p · 10 s · ses kapalı | 17.5 |
| üst video | 1080p std · 4 s · ses kapalı | 36 (tek başına görev tavanına yakın → ayrı görev) |

- Kaynak projede tahmin, gerçek kesintiyle her ölçümde eşleşti. Yine de her görevde bakiye farkıyla doğrulanır (§10).
- **Platform notu (ADR-025):** CLI, uygulamadaki "sınırsız pencere" indirimini uygulamadı; liste fiyatı kesti. Uygulamada ücretsiz olan modeller toplu istendiğinde YOL B (§13) daha ucuzdur. Bu proje kararıdır: `policy.unlimWindow` + `rule8Suspended`.

## 4. Politika (`assets/gen/policy.json`)

`project.md §9`'un **makine kopyasıdır**. İkisi birlikte değişir. Sahne direktifi ya da ajan politikayı değiştiremez. Liste dışı model kullanmak kullanıcı onayı ister.

```jsonc
{
  "note": "project.md §9'un makine kopyası; ikisi birlikte değişir",
  "plan": "<abonelik>",
  "taskCap": 40,                                   // görev başına varsayılan tavan (kredi)
  "taskCaps": { "plateBatch": 40, "A": 60 },       // kategori tavanları [ÖRNEK]
  "filmBudget": 400,                               // film tavanı; kalan = filmBudget − Σ ledger.diff
  "filmSpentBefore": 0,
  "reserveMin": 500,                               // bakiye bunun altına inmez
  "allocation": { "A": 200, "B": 30, "pilot": 25, "rezerv": 145 },
  "deviationStop": 0.10,                           // tahmin ↔ gerçek sapması > %10 → batch DURUR
  "variantsMax": 2,                                // onaysız varyant üst sınırı (kapsamı açık yaz: A klibi mi, B plakası mı)
  "bRetryFreeUnder": 5,                            // B denemeleri toplam bu krediye kadar serbest
  "whitelist": {
    "<katalog-id>": { "cli": "<CLI job>", "kind": "image|video",
                      "params": { "aspect_ratio": "16:9", "resolution": "2k" } }
  },
  "tools": { "<araç-id>": { "cli": "<CLI job>", "kind": "video" } },   // ör. arka plan silici
  "blacklist": ["4k", "<model ailesi>", "<pazarlama stüdyosu>"],       // alt dize eşleşmesi; parametre değerleri de taranır
  "layers": { "ground": "dünya zemini; katman sayılmaz",
              "A": "üretken HAREKET kahraman dokusu", "B": "üretken YÜZEY/PLAKA dokusu", "C": "yalnız motor",
              "targets": { "A": "≤ %25", "B": "≥ %40", "C": "≥ %30" } },
  "contentRule": "yalnız soyut/makro: malzeme, mekanizma, akışkan, optik, yüzey; insan, el, yüz, yazı, rakam, logo, grafik ekranı yok",
  "pilot": { "shot": "<shot>", "model": "<katalog-id>", "variants": 2, "taskCap": 30,
             "acceptance": "kare kare: 1 s aralık tam çözünürlük + hareketli bölge; bağımsız reviewer",
             "final": "1080p yalnız kullanıcı onayından sonra" },
  "clipMaxSeconds": 5,                             // core varsayılanı 5 s; kaynak projede 10 s
  "clipRule": "donma (son kareye kıstırma) ve ileri-geri (ping-pong) yok; klip shot penceresini kapsar",
  "cheapFirst": "her kategoride önce ucuz model; pahalıya geçişin gerekçesi raporda",
  "draftFirst": "video önce taslak (480p/720p); görüntü doğrudan hedef çözünürlük",
  "clipFps": { "target": 60, "method": "ffmpeg minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1",
               "fallback": "tarama geçmezse kaynak fps (kare tekrarı)" },
  "productionPath": "A",                           // A = CLI · B = istem sayfası + inbox (§13)
  "unlimWindow": [], "rule8Suspended": false,      // platform notu (§3)
  "audio": "off"                                   // üretken klipte ses kapalı; ses kurguda
}
```

- `blacklist` alt dize olarak eşleşir; model adına ve parametre değerlerine bakılır. `"4k"` her modelde 4K seçeneğini yasaklar.
- Politika alanı eklendiğinde aynı değer başka belgede (ajan metni, reviewer listesi) yazılmaz; oradan **bu dosyaya** atıf yapılır.
  - [ÖRNEK] kaynak projede reviewer metni klip için "≤ 5 s" diyordu, politika 10 s. Değerler ayrıştı.

## 5. A/B/C katman payları (proje parametresi)

| katman | ne | tipik maliyet | süre hedefi [ÖRNEK] |
|---|---|---|---|
| zemin | dünya zemini / gren plakası | ≈ 0 | **katman sayılmaz**; C shot'ında da serbest |
| **A** | üretken **hareket** kahraman dokusu (inceleme penceresi, organik hareket) | tam fiyat; 1080p final | ≤ %25 |
| **B** | üretken **yüzey/plaka** kahraman dokusu (malzeme, alet yüzeyi, cam, metal) | ucuz model | ≥ %40 |
| **C** | yalnız motor | 0 | ≥ %30 |

- Her shot tek katmana atanır. Atama manifestte durur (`layer` / `layerV2.shots`).
- Her A shot şu soruya "evet" demelidir: "üretken olmasa daha mı kötü olurdu?"
- Oranlar **proje parametresidir** (`project.md §9`, `policy.layers.targets`), core varsayılanı yoktur. Reviewer film sonunda süre oranını ölçer.
- [ÖRNEK] kaynak projede ölçülen oran: A %14.8 · B %52.8 · C %32.4.

## 6. İçerik yasakları

- Üretken klip ve plakada **insan, el, yüz, yazı/harf/rakam, logo/kimlik, grafik ekranı yok**. İzin ancak `project.md`'de kayıtlı istisnayla verilir (yer + gerekçe).
- Model olumsuz istemi güvenilir izlemez. İstemde "yazı yok" yazmak yetmez; kabul taramasında aranır (§9).
- Üretken klip cümleyi anlatmaz, tek başına kare olmaz, motor katmanının altında kalır (§0).
- İçerik yalnız soyut/makro: malzeme, mekanizma, akışkan, optik, yüzey. Anlatıyla ilgisiz metafor ve stok görünüm (UCUZ #8) reddedilir.
- Yer tutucu render'a girmez. Klip yoksa iş motorla çözülür. Yer tutucu kullanılacaksa siyah olmaz; beklenen kütle ve tonda olur (siyah disk kahramanla yarışır).

## 7. İstek JSON'u (`assets/gen/requests/<sahne>.json`) — `motion-research` yazar

```json
{
  "scene": "<SAHNE>",
  "path": "A",
  "taskCap": 30,
  "rules": "<bu istekte geçerli politika maddeleri, kısa>",
  "items": [
    {
      "id": "g-<sahne>-<ad>",
      "type": "plate",
      "role": "B",
      "shot": "S07",
      "window": [12.40, 18.90],
      "model": "<beyaz listeden katalog-id>",
      "alt": "<ucuz yedek katalog-id>",
      "params": { "resolution": "2k" },
      "budget": 0.12,
      "status": "bekliyor",
      "accept": "normalize görüntüde yazı/parmak/desen yok; görünür kenarda koyu bant yok; palet world bandında",
      "prompt": "<soyut/makro istem — insan, el, yazı, logo yok>",
      "refs": ["assets/gen/refs/<ad>.png"],
      "start": null,
      "trim": null
    }
  ]
}
```

| alan | anlam |
|---|---|
| `id` | varlık kimliği = inbox dosya adı. Varyant adı sürüm sonekiyle (`-vN`) çakışmayacak biçimde: `-a`, `-b` gibi |
| `type` | `plate` · `element` · `transition` · `storyboard` · `logo` |
| `role` | `A` (hareket) · `B` (yüzey) |
| `shot`, `window` | (bilgi) hedef shot ve pencere (s). Klip karesi **shot başından** sayılır |
| `model`, `alt` | beyaz listeden; `alt` önce-ucuz yedeği |
| `params` | politikadaki varsayılanların üstüne yazılır (süre, çözünürlük); 4K kara listede |
| `budget` | `KREDI.md`'den beklenen kredi |
| `status` | `bekliyor` · `pilot` · `onaylı` · `final` · `yazılı-üretme` (istek durur, üretilmez) |
| `accept` | **ölçülebilir** kabul ölçütü (§9); boş bırakılmaz |
| `prompt` | istem; brief, marka ya da müşteri metni içermez |
| `refs`, `start` | referans görüntü / başlangıç karesi (proje içi yol) |
| `trim` | `[a, b]` s; ingest kırpar |
| `method` (1.4) | plaka düzenleme yöntemi: `region` (maskeli bölge, varsayılan) · `two-stage` · `full` (§17.1) |
| `place` (1.4) | `{object, center, sizeMm, sizePx}` — nesne hedefi; yer tutucu referansıyla aynı tek kaynak (§17.2) |
| `mask` (1.4) | bölge maskesi dosyası; yalnız modelin belgelenmiş maske parametresi varsa (§17.3) |
| `attempt` (1.4) | `<n>/3` — aynı yöntemle deneme sayacı (§17.8) |
| `accept.set` (1.4) | set plakası kabul kümesi (kenar · yerleşim + yer/boy toleransı · bölge dışı · dikiş · askıda); `ingest-kapi` okumaz, bağımsız ölçüm okur (§17.4) |

`gen` 1.4 alanlarını okumaz (belge + kabul alanıdır); `params`'ı CLI'ye bayrak olarak geçirir — bilinmeyen parametre işi reddettirebilir (§18.5).

## 8. Akış ve DUR noktaları

```
0  ihtiyaç listesi (research) → katalog (bir kez) → requests/<sahne>.json
1  PİLOT: tek shot, ≤ 2 varyant, taslak çözünürlük, pilot tavanı
2  motion-render gen <sahne> --dry [--online-cost]      tahmin tablosu (ağsız: whitelist.<id>.credits ‖ istek budget; --online-cost → generate cost; kredi harcamaz)
       DUR → görev tavanı / film tavanı / rezerv aşılıyor · liste dışı ya da kara liste model · istem yok
3  motion-render gen <sahne> [--cap N]                  requests/<sahne>.json okunur · bakiye önce → generate create … --wait → bakiye sonra
       → inbox/<id>.<uzantı> (.part → rename) + inbox/<id>.json (yan dosya) · runs/<sahne>-<zaman>.json
       DUR → sapma > %10 (batch durur) · iş başarısız / çıktısız ama kredi kesildi (lost, §10)
4  motion-render ingest --balance-before B --balance-after A
       → conform · sha256 · -vN · uyarılar · kontak · manifest · ledger (match)
5  motion-render ingest scan <id>                        kare kare kanıt (§9)
6  bağımsız kabul (reviewer, kendi yöntemi) → motion-render ingest review <id> kabul|ret|yedek "<not>"
7  PİLOT ONAYI (kullanıcı) → finaller: onaylı varyant, hedef çözünürlük, yeni sürüm (-vN, durum final)
8  kullanım: sahne yalnız assets.js yolunu bilir; ret ve supersededBy olan varlık haritaya girmez
9  film sonu: kredi/sn · A/B/C süre oranı · ledger toplamı → rapor (§12)
```

DUR koşulları (RULES DUR-2, DUR-5, DUR-8):

| tetik | ne yapılır |
|---|---|
| tahmin + harcanan > görev tavanı (`taskCap` / `--cap`) | dur, tavanı ve gerekçeyi kullanıcıya sor |
| tahmin > film kalanı (`filmBudget − Σ ledger.diff`) ya da bakiye < `reserveMin` olacak | dur, sor |
| model beyaz listede değil / kara listede / parametre kara listede | reddet; liste dışı model kullanıcı onayıyla |
| gerçek ↔ tahmin sapması > `deviationStop` | batch durur; neden rapora |
| pilot onaylanmadı | başka A üretimi yok; diğer A istekleri `yazılı-üretme` kalır |
| onaysız 3. varyant | yok; kural kapsamı (A mı B mi) politikada açık yazılır |
| dış varlık ön koşulu geçmedi (ör. "SVG" raster çıktı, §11) | DUR ve vektör kaynağı iste |
| üretim aracı yok / oturum yok | YOL B istem sayfası (§13) → dur |

Toplu işte bir öğe başarısız olursa bütün iş durmaz. Öğe koşu kaydına `BAŞARISIZ` olarak yazılır, sonraki öğeye geçilir; sayılar raporlanır. Ancak bütçe ve sapma tetikleri batch'i durdurur.

## 9. Ingest, tarama ve kabul

### 9.1 `motion-render ingest`

- Dosya adı = varlık id'si. Yan dosya `<id>.json` model, istem, seed, gerçek kredi ve tahmini taşır.
- **Conform:**
  - görüntü: kaynak korunur; hedef boyut (ör. 1920×1080) cover PNG;
  - video: `--fps` (varsayılan 30) ve proje boyutu. Alfa varsa (rgba/argb/gbrap, VP9 alpha) RGBA PNG dizisi + damalı önizleme. Alfa yoksa H.264 + eleman/geçişte luma-key önizlemesi;
  - istekte `trim` varsa kırpılır.
- **Hash:** kaynağın sha256'sı.
  - Aynı hash manifestte varsa atlanır.
  - Var olan id'ye farklı hash gelirse yeni sürüm `-v2`, `-v3` … açılır; eskisine `supersededBy` yazılır.
  - Sürüm deseni `^<id>(-v\d+)?$`. Eşleşme tam kalıpla yapılır, önek benzerliğiyle değil.
- **Uyarılar:**
  - süre > `clipMaxSeconds`;
  - kaynak < 1080p → büyütüldü;
  - en-boy |w/h − 16/9| > 0.02 → kırpıldı;
  - fps uyarlaması yapıldı.
- **Lisans notu** her varlıkta: `<plan> · <tarih> · <model>`.
- Çıktı `assets/gen/assets.js` (sahne yalnız yolu bilir). `supersededBy` ya da `review.result = ret` olan varlık bu haritaya girmez.

### 9.2 fps uyarlama

Klip proje fps'inden düşükse (ör. 24/30 → 60) önce motorla ara kare üretilir; kredi harcanmaz (`policy.clipFps.method`). Sonra ingest (0 kredilik ledger kaydı) → tarama → kabul. Tarama geçmezse kaynak fps kullanılır (kare tekrarı).

- 24 ↔ 30 fps kare dizileri karışabilir. "Temiz aralık" bağımsız ölçülür, kontaktan varsayılmaz.

### 9.3 `motion-render ingest scan <id>` (kare kare kanıt)

- 1 s aralıkla **kaynak tam çözünürlükte** kareler: `out/probe/clipscan/<id>/tNNN.png` (NNN = t × 10).
- `motion.png`: ardışık kare |fark| birikimi orta kareye bindirilir. Artefakt çoğunlukla hareketli bölgededir.
- `strip.png`: 1 s şerit. `scan.json`: saniye başına hareket ve en hareketli bölge kutusu (birikimin %40 üstü).
- Araç kanıt üretir; tarama **gözle** yapılır. Bakılacaklar:
  - yazı, harf, rakam;
  - el, yüz, insan;
  - yabancı nesne;
  - geometri kırığı, morf artefaktı;
  - titreme;
  - donma / ileri-geri;
  - stok görünüm.
- Kesintisiz temiz süre shot penceresini kapsamalıdır.

### 9.4 Kabul ölçütleri

**Plaka = malzeme (1.3):** üretken plaka yalnız malzeme olarak kabul edilir — `motion-render ingest-kapi <id> --accept <istek.json>` (öğenin `accept`
alanı makine-okur: bölgeler, hedef palet adı, `stdMin`, `dEMax`, `map: none|gain`): doku std, ton eşlemesi sonrası palet ΔE2000, kimlik artığı ve
göz notu (yazı/el/logo 0). Gölge, ışık yönü, renk payı ve kompozisyon plaka ölçütü değildir; motor katmanında ve render karesinde ölçülür.

| varlık | ölçüt |
|---|---|
| **A klibi** (pilot/final) | kare kare: 1 s aralık, tam çözünürlük + hareketli bölge haritası; §9.3 listesi temiz; temiz süre ≥ shot penceresi; bağımsız reviewer kararı. **Kontaktan kabul yok.** |
| **B plakası** | **normalize** (kontrast gerilmiş) görüntüde yazı, parmak, desen, yabancı nesne yok. Görünür kenarda plakanın kendi koyu bandı yok (varsa görünür kenarda kırpılır). Palet world bandında. Küçük kontakta kabul yok. |
| **türetilmiş plaka** (anahtar kareden restyle) | **iki yönlü** ölçü: vektör → plaka p90 ≤ 6 px [ÖRNEK] **ve** ters yön ("bant içi fazla" çizgi). Model geometriyi korur, çizgiyi korumaz (çift çizgi, eklenmiş nesne). Eksene paralel uzun koşular ızgara olarak ayrı sayılır. **Bayatlık bekçisi:** kaynak geometri değişince plaka bayatlar. p95 küçük değişikliği kaçırdı; ölçü "değişen pay"dır. |
| **set plakası** (1.4) | malzeme (`ingest-kapi`, yüzey bölgesinde onaylı referansla parite) **+** nesne kenarı (M-KENAR, gövde sınıfıyla; ham plaka ve kesim çıktısı aynı ızgarada) **+** yerleşim (içerik/metin örtmesi 0, karar noktası açık) **+** yer/boy (set kaydındaki gerçek ölçü ± tolerans) **+** maskeli bölgede bölge dışı değişmedi ve dikiş (M-DIKIS) **+** askıda (M-ASKIDA). Kabul kümesi örneği motion-world `library/photo-plate/SET.md` §7; düzenleme §17. Işık yönü ve sıcaklık bilgi. |
| **logo büyütme** | §11.2 |
| **logo vektörü** | §11.3 |
| **her dış varlık** | dosya türü taraması önce, ölçü sonra. Ölçer kontrol dosyasıyla kalibre edilir (§14). |

Kabul notu sözlüğü: `kabul` (kullanılır) · `ret` (haritaya girmez, gerekçe) · `yedek` (kullanılmaz ama tutulur).
Ret nedenleri kısa ve sınıflı yazılır [ÖRNEK]: `EL`, `YAZI`, `palet dışı`, `desen tutmadı`, `geometri kırığı`, `stok görünüm`, `bayat`.

## 10. Ledger, koşu kaydı ve kayıp/iade

Yer: `assets/gen/manifest.json` → `{ note, schema, items[], ledger[] }`. Tek yazar `ingest`.

**`items[]`:**

```json
{
  "id": "g-<sahne>-<ad>-v2", "type": "element", "model": "<katalog-id>", "prompt": "<istem>", "seed": null,
  "credits": 15, "creditsSource": "sidecar", "sourceHash": "<sha256>", "sourceName": "<id>.mp4",
  "files": { "source": "assets/gen/elements/<id>/source.mp4", "conform": "…", "frames": "…", "contact": "…", "preview": "…" },
  "conform": { "w": 1920, "h": 1080, "fps": 60, "codec": "h264", "frames": 600, "duration": 10, "srcW": 1280, "srcH": 720, "srcFps": 24, "srcCodec": "h264", "trim": null },
  "alpha": false, "license": "<plan> · <tarih> · <model>", "scenes": ["<SAHNE>"],
  "status": "draft", "request": "requests/<sahne>.json#<id>", "ingestedAt": "<ISO>",
  "warnings": ["kaynak < 1080p → büyütüldü"],
  "review": { "result": "kabul", "note": "reviewer: 1–9 s temiz, hareketli bölgede artefakt yok", "by": "reviewer", "date": "<tarih>" },
  "supersededBy": null
}
```

**`ledger[]`** (her batch'te bir kayıt):

```json
{
  "task": "<görev adı>", "date": "<tarih>",
  "balanceBefore": 500.00, "balanceAfter": 494.00, "diff": 6,
  "items": ["g-<ad>-a", "g-<ad>-b"], "creditsSum": 4,
  "lost": [ { "id": "<öğe id'si; servis iş kimliği değil>", "credits": 2, "reason": "HTTP 503, çıktı yok",
              "refund": "pending", "refundDate": "<tarih; ingest refund yazar>" } ],
  "match": false, "explained": "lost",
  "note": "fark = Σkredi + Σlost"
}
```

- `diff = balanceBefore − balanceAfter`; `creditsSum = Σ items[].credits`.
- `match = |diff − creditsSum| < 0.005`.
- `match:false` yalnız `lost[]` ile açıklanıyorsa (`|diff − creditsSum − Σ lost.credits| < 0.005` → `explained:"lost"`) uyarıdır. Açıklanamıyorsa **hata → DUR** (`ingest` çıkış 3); neden bulunmadan yeni üretim yok.
- **503 / iade:**
  - İş HTTP 503 ya da `failed` dönüp çıktı vermeden kredi kesebilir. Kaynak projede bir büyütme işi böyle 2 kredi düşürdü. Bu `lost[]`'a yazılır, `match` açıklamalı kalır.
  - İade durumu `higgsfield account transactions --json` ile kontrol edilir: `refund: pending|granted|denied`.
  - İade gelince bakiye artışı ayrı ledger kaydıdır: `task: "iade: <görev>"`, `diff` negatif. Film harcaması `Σ diff`'ten kendiliğinden düşer.
  - Açıklaması yalnız serbest metinde kalan kayıp denetlenemez. Bu yüzden yapılandırılmış alan zorunludur.
- **Koşu kaydı** `assets/gen/runs/<sahne>-<ISO>.json`: `{ scene, cap, filmLeft, balanceBefore, balanceAfter, diff, rows[{ id, model, est, real, status }] }`. Kuru koşu (`--dry`) kayıt yazmaz.
- **Yan dosya** `inbox/<id>.json`: `{ model, cliModel, prompt, params, seed, credits, costEstimate, w, h, created }`. Servis iş kimliği ve sonuç URL'si varsa yalnız burada kalır, belgeye taşınmaz.
- Varlık maliyeti 0 olan kayıtlar da ledger'a girer (fps uyarlaması, yerel logo vektörü): `diff 0`, `items[]` dolu.

## 11. Dış varlık ve logo

### 11.1 Dosya türü ön koşulu (raster SVG tuzağı)

"SVG" uzantılı müşteri dosyaları çoğu kez `<image>` içinde base64 JPEG/PNG kabıdır. Glif yolu yoktur; bazen uzantısı `.svg` olan bir JPEG'dir. Kabulden önce **dosya taraması** yapılır:

- magic baytlar;
- `<image>` / `data:image` / base64 / `<text>` / `filter`;
- `<path>` sayısı ve gerçekten glif yolu olup olmadığı.

Raster çıkarsa **DUR ve vektör kaynağı iste** (SVG/AI/PDF; RULES DUR-8). Raster izlemenin kenar dalgası verdiği ölçüyle gösterilir. Vektör gelmezse ve kullanıcı onaylarsa §11.3 yolu izlenir.

### 11.2 Büyütme kabulü

Kaynak yalnız raster (ör. JPG) ise önce büyütme yapılır. Üretken büyütme bir varlık işidir: görev tavanı [ÖRNEK 10 kredi], önce `generate cost`, ledger.

- Kabul: çıktı 1200 px'e indirilir, orijinal maskeyle karşılaştırılır:
  - **IoU ≥ 0.99**;
  - delikler birebir;
  - **kenar p90 ≤ 0.5 px**.
- **Katman başına en iyi kaynak** seçilir: yerel Lanczos ↔ üretken büyütme. [ÖRNEK] bir renk katmanında üretken büyütme p90 0.91 px ile reddedildi, yerel Lanczos seçildi; diğer katmanlarda üretken kazandı.
- Büyütme servisinde 4K kara listedeyse 2K + yerel büyütme kullanılır.

### 11.3 Vektörleştirme kabulü (`motion-render logo build|fit|assets|check`)

| yol | sonuç [ÖRNEK] |
|---|---|
| YOL 1 — yerel yüzlerle harf harf bindirme (`logo fit`) | özel çizim logoda tutmadı: IoU ≈ 0.91. Zarf bükülmesi var; en iyi yüz harften harfe değişiyor |
| YOL 2 — büyütme → potrace → köşeden bölme + doğru / kübik eğri uydurma + yatay/dikey ±0.5° yakalama (`logo build`) | IoU 0.969–0.987 · p90 ≤ 0.80 px · delikler birebir · düğüm ≤ 39/harf · dalga p99 ≤ 0.23 px |

Kabul ölçüleri (`logo check`):

| ölçü | eşik [ÖRNEK, ML-2] |
|---|---|
| satır/harf IoU | ≥ 0.98 (ince yardımcı satır ≥ 0.95 kayıtlı kabulle) |
| kenar p90 | ≤ 0.8 px |
| delikler | birebir |
| düğüm sayısı | ≤ 40/harf |
| kenar dalgası p99 | ≤ 0.3 px. Köşe ve serif bağı sayılmaz (eğrilik yarıçapı < 25 px). Raster kaynağın potrace izi 0.4–0.7 px verir; ölçü ayırt eder |
| dosya | yalnız `<path>`, şeffaf, gölgesiz; `<image>` / base64 yok |

- **Ölçer kalibrasyonu (§14):**
  - aynı içerikli kontrol dosyası ≈ 0.995 vermeli;
  - ölçek gerçek render boyutundan alınır (SVG çıktısının tam sayıya yuvarlanması ~%0.07 sapma verir);
  - kesirli alan ortalaması kullanılır (½ px pencere kayması yok);
  - iki tarafta aynı kaplama işlevi kullanılır (alfa ↔ mürekkep karışırsa ince harf yanlı ölçülür).
- **Bağımsız ön koşul:** denetçi kendi yöntemiyle ölçer (farklı rasterleyici, yerel zemin mürekkep oranı, farklı dalga ölçüsü). Yapanın aracının sayıları referans değildir. Denetçi GEÇER demeden render yok.
- Logo varlığı ingest edilir: tür `logo`, kredi 0, not = üretim yolu. Renkler varlıktan alınır, world ışığı için telafi edilir.
- Render tarafı (RULES):
  - yakın planda (k ≥ 1.5) S× katmanı (SS-2), kenar ≤ 1.9 px, aynı karttaki logolar eşit ±%10;
  - renk tutarlılığı ΔE2000 ≤ 3; teslim edilmiş grade'li mp4'ten ölçülür (AK-5).

## 12. Rapor

Her görev (faz raporu "Bütçe" bölümü):

```markdown
- Bakiye <önce> → <sonra> (ledger match: true | false + açıklama) · film toplamı <x> / <tavan> · rezerv ✓
| görev | bakiye önce | sonra | fark | Σkredi | eşleşme | kayıp (iade) |
| id | model | tahmin | gerçek | durum | neden |
```

Film sonunda (TESLİM §8 Kredi):

- **kredi/sn** = film toplamı / film süresi. [ÖRNEK] kaynak projede bir ara fazda 0.85, A katmanı eklenince 1.93.
- **A/B/C süre oranı** hedefle yan yana.
- Varlık tablosu: `varlık | dosya | sha256 | üretim yolu | kullanım`.
- Reviewer denetimi:
  - `ledger` önce−sonra = manifest kredi toplamı (match);
  - tavanlar; kara liste; lisans notu;
  - taslak/final onayla uyumlu mu;
  - sahne yalnız `assets/gen` yolunu mu kullanıyor;
  - klip süre sınırı;
  - A/B/C oranı.

## 13. YOL B — istem sayfası (araç yoksa ya da platformda daha ucuzsa)

- `docs/gen/PROMPTS-<sahne>.md`:
  - `## Nasıl` (uygulamada ayar, dosya adı = id, inbox yolu);
  - `| id | sahnede | model (yedek) | ayar | kredi | kabul ölçütü |`;
  - istem blokları;
  - `## Yazılı — ÜRETME` (bekleyen istekler).
- Kullanıcı uygulamada üretir ve `assets/gen/inbox/<id>.<uzantı>` olarak bırakır. Hat aynıdır: ingest, tarama, kabul.
- Ledger için bakiye önce/sonra kullanıcıdan alınır ya da `account status` ile okunur.
- Ajan sayfayı yazar ve **durur** (DUR-5).
- **Geri alma:** `policy.whitelist` boş liste → `gen` her öğeyi reddeder; hat YOL B'ye döner.

## 14. Doğrulamadan güvenme

Her üretken çıktı, her dış varlık ve **her ölçer** bağımsız, ölçülü bir kabul adımından geçer. Kaynak projedeki kanıtlar:

| ne oldu | ders |
|---|---|
| kontaktan kabul edilen klipte sonradan geometri kırığı bulundu | kabul kare kare, tam çözünürlükte (§9.3) |
| küçük kontakta silik yazı görünmedi | plaka normalize görüntüde |
| model olumsuz istemi (yazı yok, parmak yok) izlemedi | istem güvence değil; tarama |
| 24 ↔ 30 fps karışması talimattaki "temiz aralığı" bozdu | aralık bağımsız ölçülür |
| "SVG" müşteri dosyaları raster kap çıktı | dosya taraması önce (§11.1) |
| kendi logo ölçeri kontrol dosyasıyla doğrulanmadan yanlış sonuç verdi (ölçek yuvarlaması ~%0.07, ½ px pencere kayması, iki tarafta farklı kaplama işlevi) | ölçer önce kalibre (aynı içerik ≈ 0.995) |
| türetilmiş plaka kaynak geometri değişince bayatladı; p95 küçük değişikliği kaçırdı | bayatlık bekçisi + pay ölçüsü |
| reddedilen varlık sahne haritasına girdi | `ret` notlu varlık haritaya girmez (ingest zorlar) |
| varyant adı (`-v1`) sürüm sonekiyle çakıştı | id kaynağın adından; sürüm deseni tam kalıp |
| servis "nsfw" döndü (0 kredi, yanlış pozitif) | istem nötr "doku çalışması" diliyle yeniden yazılır |
| iş çıktısız döndü ama kredi kesildi | `lost[]` + iade kontrolü (§10) |
| (1.4) düzenleme isteminde konum metinle verildi; nesne iki turda da içerik alanına girdi | yerleşim düz gri yer tutucuyla (§17.2) |
| (1.4) çok referanslı "ekle" nesneyi yerinde tuttu ama sahneyi baştan kurdu | bölge dışı NCC ölçülür; yer/boy iyi olsa da ret (§17.4–§17.5) |
| (1.4) kılavuzdaki işaretli şerit bölge sanıldı, nesne kesildi | işaret değil maske (§17.6) |
| (1.4) düz doku istemi çıktı süzgecinde reddedildi (0 kredi) | bağlamlı istem + kırpım (§18.2) |

Araçların iddiasına güvenilmez: tamamlandı mesajı, tahmin, "kabul" çıktısı. Her biri dosyadan, bakiyeden ya da kareden doğrulanır.

## 15. Bütçe kuralları (özet)

1. **Önce pilot.** Pilot onayı olmadan başka A üretimi yok.
2. **Önce ucuz model.** Kalite yetmezse pahalı modele geçilir; gerekçe raporda.
3. **Video önce taslak** (480p/720p); 1080p yalnız onaylı varyant. Görüntü doğrudan hedef çözünürlükte (taslak görüntü para kaybıdır).
4. **Onaysız ≤ 2 varyant**; 3. varyant kullanıcı onayıyla. Kuralın kapsamı yazılı olur.
5. **Görev tavanı** (kategori başına) + **film tavanı** + **rezerv tabanı**. Üstü dur-sor.
6. **Sapma > %10 → dur.**
7. **Ledger her batch'te**; bakiye önce/sonra canlı okunur.
8. **Kapı turları** (storyboard, animatik, reviewer) üretken krediye dokunmadan, motorla yapılır. Final üretim kapıdan sonra gelir.
9. **Ses kapalı, 4K yok.** Üretken klipte ses kurguda eklenir.
10. **B denemeleri** toplam B harcaması `bRetryFreeUnder` altındayken serbesttir.
11. **Eval/smoke 0 üretken çağrı.**

## 16. Bekçi ve ingest'in zorladıkları (uygulama özeti)

- `gen`:
  - beyaz/kara liste;
  - istem var mı;
  - öğe başına `generate cost`;
  - `harcanan + tahmin > tavan` → DUR;
  - `tahmin > film kalanı` → DUR;
  - bakiye önce/sonra her öğede; gerçek = fark;
  - indirme `.part → rename`;
  - sapma > %10 → DUR;
  - koşu kaydı.
- `ingest`:
  - conform, sha256, `-vN`, `supersededBy`;
  - uyarılar;
  - lisans notu;
  - ledger `match` / `lost`;
  - `assets.js` (ret ve eski sürüm hariç);
  - `review` yalnız kabul notunu yazar.
- `ingest scan`: kare kare kanıt. Karar insanda/reviewer'dadır.

## 17. Plaka düzenleme: maskeli bölge üretimi (1.4)

> Kaynak: kaynak projenin set plakası düzeltmeleri (nesne ekleme, yer/boy ve kenar düzeltme). Sayılar **referans ölçümü (kaynak proje)**; eşikler
> world `edge` / `set.accept` ve `project.md` §6'dadır. Set yöntemi: motion-world `library/photo-plate/SET.md`; ilkel ve kenar kuralları:
> motion-world `references/ILKEL.md`.

### 17.1 Yöntem seçimi

| değişiklik | yöntem (`method`) | koşul |
|---|---|---|
| nesne ekleme / düzeltme / kaldırma; plakanın kalanı onaylı | **maskeli bölge üretimi — varsayılan** (`region`) | yer tutucu + ölçek referansı zorunlu (§17.2); plakanın kalanı sabit |
| nesnenin yeri ya da boyu bölge üretiminde tutmuyor | **iki aşamalı** (`two-stage`, §17.7) | önce nesnesiz plaka kabulü |
| ışık modeli ya da kompozisyon değişiyor | **tam plaka** (`full`) | yalnız bu durumda; referans zinciriyle (photo-plate SET-4) |
| aynı yöntemle 3 deneme, kabul 0 | **yöntem değişir** — açık karar | §17.8 |

Bölge üretimi plakanın onaylı ışığını, geometrisini ve dokusunu korur; kabul yalnız bölgede ve sınırında ölçülür. Tam plaka önceki kabulün bütün
ölçülerini (ışık, yerleşim, kenar, kayıt) baştan açar.

### 17.2 Yer tutucu + ölçek referansı (zorunlu)

- **Düzenlemede metinle konum tarifi tutmaz** ("sağ-alt köşede", "kâğıdın yanında"). Referans ölçümü (kaynak proje): metinle iki tur × 3 adayda
  nesneler içerik alanına girdi; yer tutucu referansla tek üretimde üç nesne yer tutucunun yerinde ve boyunda geldi (daire uydurma: merkez
  ±14 px, yarıçap ±4 px), yüzey geometrisi değişmedi (gradyan NCC kayması 0 px).
- **Yer tutucu referans kalıbı (2 ref):** **ref 1** = onaylı plaka + üstüne **düz gri yer tutucu şekil** (hedef konum ve taban izi; boy = gerçek ölçü
  mm × px/mm; kenarı hafif yumuşak, σ ≈ 2 px; nötr gri, yüzey lumasından ayrılır) · **ref 2** = **temiz** onaylı plaka (ışık ve set). Yer tutucu nesne
  değildir; model onu gerçek nesneyle değiştirir; render'a girmez (RULES K4).
- **Ölçek referansı (ref 3, zorunlu):** aynı nesnenin onaylı/temiz bir kırpımı, kendi yüzeyiyle, hedef boya ölçeklenmiş. Nesnenin onaylı görüntüsü
  henüz yoksa (ilk üretim) ölçek referansı yer tutucunun gerçek ölçüden çizilmiş boyudur ve istemde ölçü cm/mm ile yazılır (§18.3).
- Yer tutucuyu proje aracı üretir (onaylı plaka + şekil listesi → `assets/gen/refs/<set>-yer.png`); şekil listesi istek öğesinin `place` alanıyla
  aynıdır (tek kaynak).
- **Kılavuz temizliği ön koşulu:** kılavuzdaki her kusur (eski nesne kalıntısı, kopya kenar, işaret çizgisi, kolaj dikişi) çıktıya taşınır → kılavuz
  önce temizlenir ve 4×'te denetlenir (referans ölçümü (kaynak proje): kılavuzdaki halka kusuru çıktıda kaldı).

### 17.3 İstek alanları

§7 şemasına `method` · `place` · `mask` · `attempt` · `accept.set` eklenir. Maske girdisi yalnız modelin CLI'de **belgelenmiş** parametresiyse
`params` altında verilir; belgesizse maske görüntüsü referansa çevrilmez (işaret değil, §17.6), yer tutucu kalıbı kullanılır.

```json
{
  "id": "g-<set>-arka-ekle-a",
  "type": "plate",
  "role": "B",
  "method": "region",
  "attempt": "1/3",
  "model": "<beyaz listeden katalog-id>",
  "refs": ["assets/gen/refs/<set>-yer.png", "assets/gen/refs/<set>-temiz.png", "assets/gen/refs/<nesne>-olcek.png"],
  "place": { "object": "<nesne>", "center": null, "sizeMm": [null, null], "sizePx": null },
  "prompt": "<ekle: nesnenin malzeme ve ışık tarifi, gerçek ölçüsü; konum yok — konum yer tutucuda>",
  "accept": {
    "regions": [],
    "set": {
      "placement": { "posTolPx": null, "sizeTol": null, "overlapMax": 0 },
      "outsideMask": { "shiftMaxPx": 0, "nccMin": null },
      "edge": { "objects": ["<nesne>"], "bodyClass": "flat" },
      "seam": "world edge.seam",
      "contact": "world edge.contact"
    }
  }
}
```

### 17.4 Kabul (bölge üretimi)

| ölçü | yöntem | eşik |
|---|---|---|
| bölge dışı değişmedi | temiz plaka ↔ çıktı, maske dışında gradyan NCC kayması + piksel farkı | kayma 0 px; fark ≈ 0 — **sahneyi baştan kurma** burada görünür |
| yer · boy | nesne silüeti (fark maskesi ya da daire uydurma) ↔ `place` | ± `posTolPx` · ± `sizeTol` (world `set.accept`; proje yeniden yazar) |
| dikiş | M-DIKIS, maske sınırında | world `edge.seam` |
| kenar | M-KENAR, gövde sınıfıyla | world `edge` |
| askıda | M-ASKIDA | world `edge.contact` |
| yerleşim | içerik/metin örtmesi; karar noktası | 0; açık |
| çıktı boyu | üretim boyu → hedef plaka boyu | büyütme ≤ `edge.upscaleMax` |

- Nesne kadraj ortasına kayar ya da büyürse **ret**; sayaç artar.
- Ret nedeni sözlüğü (§9.4'e ek): `YER` · `BOY` · `SAHNE` (bölge dışı değişti) · `DİKİŞ` · `KENAR` · `ASKIDA` · `KILAVUZ` (kılavuz kusuru taşındı) · `BÜYÜTME`.

### 17.5 Model ↔ yöntem ayrışması

Model, referans sayısı, kılavuz türü (yer tutucu ↔ kolaj) ve çıktı boyu **birlikte değişen değişkenlerdir**: denemede biri değişir, diğerleri sabit
kalır (A/B). Bir modelin bir yöntemde tuttuğu şey başka yöntemde tutmayabilir.

| durum | gözlem (referans ölçümü (kaynak proje)) | ders |
|---|---|---|
| çok referans (kılavuz + kimlik) | nesne yerinde ve boyunda (merkez +2,5 px, r ×1,003) ama sahne baştan kuruldu (bölge dışı NCC 0,12; kadraja yabancı nesne) | bölge dışı NCC her denemede ölçülür; düşükse ret — yer/boy iyi olsa da |
| tek referans | sahne korundu (≤ 5,7 px) ama nesne (−102, −133) px kaydı | sahnenin korunması yerin kanıtı değil; yer/boy ayrı ölçü |
| çıktı boyu ≠ hedef plaka | 1920×1440 · 1920×1088 çıktı → hedef plakaya ×1,25–1,43 büyütme | çıktı boyu ve en-boy katalogda (§3); büyütme > `edge.upscaleMax` ise model bu plaka için uygun değil |

`gen --dry` çıktı boyunu ve hedefe büyütme oranını yazmaz (1.4): katalogdaki çıktı boyundan elle hesaplanır ve istek notuna yazılır.

### 17.6 İşaret değil maske

Kılavuza çizilen renkli işaret (şerit, çerçeve, ok, kopya kenar) modelin gözünde içeriktir: nesneyi keser, kopyalar ya da işaretin rengini taşır
(referans ölçümü (kaynak proje): işaretli kopya şerit bölge sanıldı, nesne kesildi). Bölge **maskeyle** verilir (model maske alıyorsa) ya da **yer
tutucunun kendisi bölgedir**; işaret çizgisi referansa girmez.

### 17.7 İki aşamalı yöntem

1. **Nesnesiz plaka:** aynı set, aynı lamba; nesnenin yeri boş yüzey (referans = onaylı plaka; istem "aynı masa, nesnesiz"). Kabul: malzeme +
   bölge dışı NCC + ışık (bilgi).
2. **"Ekle":** ref 1 = nesnesiz plaka + düz gri yer tutucu · ref 2 = nesnesiz plaka · ref 3 = ölçek referansı → §17.4 kabulü.

Nesnesiz plaka sonradan da işe yarar: derinlik ayrımında ve gölge kesiminde nesnenin arkasındaki **gerçek dolgu**dur (photo-plate `SET.md` §2).

### 17.8 Deneme sınırı ve açık karar

- Aynı yöntemle **deneme ≤ 3** (`attempt`). Üçte kabul 0 → **yöntem değişir** (bölge → iki aşamalı → tam plaka ya da nesne değişimi) ve **açık karar**
  olarak raporlanır: `| deneme | yöntem | model | ref | yer | boy | NCC (dışı) | dikiş | kenar | kredi | sonuç |`.
- Aynı yöntemle 4. deneme yok. Bütçe kuralları (§15) ve ledger aynen; "kredi yüzünden kabul edildi" yoktur.
- Referans ölçümü (kaynak proje): sınırdan önce bir düzeltme 4 denemede, bir başkası 6 denemede kabul 0 verdi — kaynak sorunu yöntemdeydi, denemede değil.

## 18. İstem kalıpları (1.4)

### 18.1 Negatif liste (kimlik taşıyan ad yok)

- İstemde **seri, stüdyo, sanatçı, marka, ürün ya da referans projenin adı yok.** Kimlik taşıyan ad çıktıya o kimliğin görünümünü (palet, iskelet,
  nesne dili) taşır: UCUZ #11 riski, lisans ve benzerlik riski; müşteri adı ve marka paket dışıdır (HK-37).
- Yerine **malzeme, ışık ve lens tarifi:** yüzey ("mat, lifli kâğıt; yırtık kenar"), ışık ("tek nokta ışık, alçak açı, bir yandan; havuz konuda"),
  lens ("tepe kamera, normal açı, odak yüzeyde, ön plan bulanık"), ölçü ("Ø 8 cm"). Örnekler kalıptır; değerler projenin look-dev'inden.
- Negatif liste istek dosyasının `rules` alanına yazılır ve istem yazılırken denetlenir. Model olumsuz istemi güvenilir izlemez (§6): kabul taramasında yine aranır.

### 18.2 Düz doku istemi süzgeç reddi → bağlam + kırpım

Düz kâğıt/karton/kumaş doku istemleri bazı modellerin çıktı süzgecinde yanlış pozitifle reddedilir (referans ölçümü (kaynak proje): 6 iş, 0 kredi).
**Bağlamlı istem** — yüzey gerçek bir sahnede ("masada duran kâğıt, kenarda masa şeridi") — geçer; bağlam şeridi ingest sonrası **kırpılır** (kırpım
kutusu yan dosyada). §14'teki "nötr doku çalışması" kalıbından önce denenir.

### 18.3 Işık ve geometri istemde, kabul ölçümde

- Işık yönü, yüksekliği, sıcaklığı ve gölge yönü ("gölge kenarın ALTINDA") istemde yazılır; kabulde ölçülür (istem güvence değil).
- **Referans görüntü ışığı da taşır:** referansın ışık yönü hedef lambayla aynı olmalı; değilse referans önce karartmayla eşlenir (photo-plate `SET.md` §4).
- Nesne boyu sıfatla değil gerçek ölçüyle (cm/mm) ve yer tutucuyla verilir; konum yalnız yer tutucuyla (§17.2).

### 18.4 İstemsiz araç modelleri

- Arka plan kaldırıcı, büyütücü gibi **araç** modelleri istem almaz, tek referans görüntü alır; politikada `tools` altında durur (§4).
- `gen` bugün (1.4) yalnız `whitelist`'e bakar ve her öğede istem ister: araç `gen` yolundan çağrılamaz. O zamana dek yerel kesim/anahtar (0 kredi,
  proje aracı) ya da YOL B (§13); ledger kaydı yine yazılır (0 kredilik).
- Araç çıktısı da varlıktır: ingest + kabul. Alfa = 4 kanal **ve** en küçük alfa < 255 (opak RGBA "alfa" sayılmaz; kesim kararı ölçümle).

### 18.5 Seed parametresi olmayan modeller

- Bazı görüntü modelleri seed almaz (parametre listesi tek katalog okumasında, §3). Seed yoksa tutarlılık yalnız `refs` ile kurulur (photo-plate
  SET-4); `params.seed` yazılmaz — `gen` bilinmeyen parametreyi CLI'ye bayrak olarak geçirir, iş reddedilebilir.
- Seed yokluğu aynı çıktının yeniden üretimini imkânsız kılar: kabul edilen çıktı hash'li varlıktır (§0, §9.1); "aynısını tekrar üret" planı yapılmaz.

## 19. RULES eşlemesi

Bu belge kural tanımlamaz; RULES.md kurallarının **prosedürüdür**. Kural kimlikleri RULES.md'dedir; LESSONS.md de onlara bağlanır. RULES'ta ayrı kimliği olmayan prosedür maddeleri bölüm numarasıyla anılır (ör. "GENAI §10").

| RULES id | kural (özet) | bu belgede |
|---|---|---|
| GEN-1 | üretken çıktı = varlık; sahne/tam video üretilmez | §0, §6 |
| GEN-2 | hash + manifest; render anında üretim yok; değişiklik yeni id (`-vN`) | §0, §9.1, §10 |
| GEN-3 | bütçe projede zorunlu: görev + film tavanı, bakiye önce/sonra, ledger ↔ bakiye eşitliği | §4, §8, §10, §15 |
| GEN-4 | tahmin ↔ gerçek sapması > %10 → DUR-2 | §8, §16 |
| GEN-5 | klip ≤ 5 s (proje gerekçeyle yükseltir); donma/ileri-geri yok | §4 (`clipMaxSeconds`), §9.3 |
| GEN-6 | taslak önce; önce pilot; onaysız 3. varyant yok | §8, §15 |
| GEN-7 | motorun yapabildiğini isteme; insan/el/yüz/yazı/logo yok | §0, §6 |
| GEN-8 | tek kapı `motion-render gen`; harici varsayılanlar geçersiz; liste dışı model = onay | §2, §4, §16 |
| GEN-9 | lisans notu her varlıkta | §9.1 |
| DUR-2 · DUR-5 · DUR-8 | bütçe · YOL B · dış varlık ön koşulu | §8, §11.1, §13 |
| ML-2 (M-LOGO) | logo vektör değilse DUR-8; kabul ölçüleri; bağımsız denetçi | §11 |
| RV-3 (M-REV, M-SELF) | bağımsız ölçüm; ölçer kalibre edilir | §9.4, §11.3, §14 |
| K4 | yer tutucu render'a girmez (düzenleme yer tutucusu dahil) | §6, §17.2 |
| UCUZ-8 · UCUZ-9 | stok görünümlü klip · yapay zekâ artefaktı | §6, §9.3 |
| UCUZ-11 | kimlik taşıyan ad istemde yok (seçilmemiş world'e / referansa benzerlik) | §18.1 |
| UCUZ #17 (1.4) | askıda nesne (plaka nesnesi değil ya da a–f bozuk) | §9.4, §17.4 |

RULES'ta ayrı kimliği olmayan prosedür maddeleri:

| madde | bölüm |
|---|---|
| kimlik: CLI oturumu, `.env` yok, token kopyalanmaz (D1-01) | §1 |
| eval / smoke: üretken çağrı 0 (VK-08) | §1, §15 |
| katalog bir kez; katalog id ↔ CLI job eşlemesi | §3 |
| A/B/C katman payı proje parametresi; film sonunda ölçülür | §5, §12 |
| kabul kare kare (`ingest scan`) + bağımsız not; kontaktan kabul yok; manifest elle düzenlenmez | §2, §9 |
| `ret` / `supersededBy` varlık haritaya girmez | §9.1 |
| ledger `lost[]` + iade durumu; açıklanamayan fark → DUR | §10 |
| türetilmiş varlıkta bayatlık bekçisi | §9.4 |
| üretken klip cümleyi anlatmaz, tek başına kare olmaz | §0, §6 |
| film sonu kredi/sn + A/B/C oranı + varlık tablosu | §12 |
| (1.4) maskeli bölge üretimi varsayılan; tam plaka yalnız ışık/kompozisyon değişince; yer tutucu + ölçek referansı zorunlu; deneme ≤ 3 → yöntem değişir (açık karar) | §17.1, §17.2, §17.8 |
| (1.4) set plakası kabulü: malzeme + kenar + yerleşim + yer/boy + bölge dışı + dikiş + askıda | §9.4, §17.4; photo-plate `SET.md` §7 |
| (1.4) model ↔ yöntem ayrışması; işaret değil maske; iki aşamalı yöntem; kılavuz temizliği | §17.5, §17.6, §17.7, §17.2 |
| (1.4) negatif liste; düz doku bağlam + kırpım; istemsiz araç modelleri; seed yok → refs | §18 |
