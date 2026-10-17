---
name: motion-world
description: WORLD-SPEC — bir motion projesinin görsel dünyasını (malzeme, ışık, hareket grameri, tipografi, kamera dili, palet, ölçülebilir sınırlar, ilkel bileşenler) look-dev fazında brief'ten SIFIRDAN kurma ve world.json'u ölçerek doldurma süreci. Yeni proje world'ü kurarken ya da değiştirirken, look-dev'de 3 gerçekten farklı yön üretirken, look / varyant / karşılaştırma / gri kart / anahtar kare / galeri / storyboard tahtası hazırlarken, world.json alanlarını (band, k1.mask zorunlu) ölçerken, world ilkeli (world/*.jsx) yazarken, world dersleri ve kararları kaydederken, K-yeni kalıbı /motion:promote'a hazırlarken ve örnek world'ler (fx-lab, desk-paper, screen-dark, light-ui, photo-plate) sorulduğunda kullan. Örnek world'ler varsayılan değildir; yalnız kullanıcı açıkça isterse ve uyarlanarak kullanılır.
---

# motion-world — WORLD-SPEC

Bir **world**, bir projenin görsel dilinin tek paketidir: hangi malzemeden yapıldığı, nasıl aydınlandığı, nesnelerin nasıl hareket ettiği,
yazının neye benzediği, kameranın nasıl baktığı — ve bunların **ölçülebilir sınırları**. Süreç (kapılar, ölçüm, reviewer, DUR) `motion-core`
skill'indedir; bu skill yalnız world'ün nasıl kurulacağını, ölçüleceğini ve kaydedileceğini söyler. Sözleşme: `render/CONTRACT.md` §3 (world.json),
§4 (sayfa + runtime), §5 (kancalar).

---

## 1. World nedir

```
world/
  world.json        ölçülebilir sözleşme (CONTRACT §3): band + k1.mask ZORUNLU; palet, aksan, sınıflar, grade, kamera/hareket eşikleri
  *.jsx             world ilkelleri (World katmanı, malzemeler, araçlar, geçiş ilkelleri) — yalnız motion-core.jsx + React'e bağımlı
  lessons.md        world dersleri (kimlik, değerlerin kaynağı, ölçümler, tuzaklar)
  DECISIONS.md      world kararları (yön seçimi gerekçesi, sonradan değişen kurallar)
  lookdev/<yön>/    look-dev taslakları (geçici world.json + jsx); seçilmeyen yön silinmez, arşivlenir
```

| katman | taşıdığı | taşımadığı |
|---|---|---|
| **core** (paket: `motion-core.jsx`, kurallar, araçlar) | zaman, easing kütüphanesi, kamera matematiği, izdüşüm, ikincil hareket mekanizması, pişirme, kancalar, ölçüm yöntemi | renk, font, malzeme, ışık değeri, bant, maske, alet, geçiş görünüşü |
| **world** (`world/`) | görsel dil + onun sayıları + ilkelleri + dersleri | proje içeriği (kelimeler, logolar, veriler), sahne zamanlaması |
| **proje** (`project.md`, `scenes.json`, sahne jsx) | içerik, kimlik, sahne kayıtları, kotalar, istisnalar | world'ü değiştiren gizli kararlar (world değişikliği world'e yazılır) |

**World ilkeli yazım kuralları**

- Bağımlılık yalnız `shared/motion-core.jsx` (`window.MH`, `MH*` bileşenleri) + React. Yükleme sırası: `motion-stage → motion-core → world/*.jsx → sahne`.
- Her x-import dosyası kendi kapsamında çalışır: paylaşılan her şey sonda `Object.assign(window, {...})`. Adlar world önekli (ad çakışması).
- Her şey `T`'nin saf fonksiyonu; `useEffect`/rAF ile çizim yok. Zaman `MH.useT()` ile alınır (tahta anahtarları ve ses eşlemi oradan çözülür).
- Görünüş sayıları (genlik, süre, perspektif, drift dalgası, gren hızı, deklanşör açısı) world'ün sabitlerindedir; çekirdek fonksiyonlarına
  açıkça verilir. Çekirdek varsayılan görünüş vermez (verilmezse hareket 0 olur ya da hata atar).
- fps ve tuval parametredir (`MH.fps()`, `MH.canvas()`); 30 / 1920×1080 kodda sabit yazılmaz.
- World katmanı bileşeni (ör. `XWorld`) tahta modlarını uygular: `MH.mode.card()` → içerik yerine beyaz yüzey + dünya ışığı; `MH.mode.key()` →
  metinsiz, ışıksız, kamerasız; `<MHModeStyles root=…>` → `MH_INKMASK` / `MH_HIDE`.
- Okunacak metin ≥ 22 px; altı `data-doku`. Kahraman `data-hero` (mürekkep kutusunda). Bileşen künyesi `data-c`, katman adı `data-fx`.

---

## 2. Yaratıcılık kuralı (SERT)

> **Paket SÜRECİ taşır, ÜSLUBU değil.** World seçilmedikçe hiçbir ilkel, renk, font, alet ya da geçiş kalıbı varsayılan olarak gelmez.
> Yeni world look-dev'de brief'ten **sıfırdan** kurulur. Örnek world'ler okunabilir; kopyalanmaz (RULES YR-1, YR-2).

1. **Üç gerçekten farklı yön.** Look-dev her zaman üç yön sunar. İki yön aşağıdaki eksenlerin **en az üçünde** ayrışır (RULES YR-3, PLAYBOOK §1.2):

   | eksen | ne farklı olmalı | ölçü / kanıt |
   |---|---|---|
   | malzeme / zemin | yüzeyin ne olduğu (kâğıt, cam, metal, kumaş, ışık, plaka, boşluk…) | look still'i + ilkel listesi |
   | ışık modeli | tek yönlü / havuz / radyal / kendinden ışıklı / yumuşak geniş…, sıcaklık | gri kart düşümü (`edgeDark`) |
   | ton (bant) | karanlık – orta – aydınlık | zaman ağırlıklı luma % |
   | hareket grameri | nesneler nasıl gelir, oturur, gider (yazılır, basılır, itilir, açılır, kırılır…), easing ailesi, ikincil hareket | hareket sayıları (oturma px, süre, eğri) |
   | tipografi | aile, ağırlık, ölçek seviyeleri, yazının malzemesi | en küçük okunur px, kontrast |
   | kamera dili | sabit / tek pafta gezinti / kesmeli / derinlik; perspektif, drift | `__camSpeed` tepe, ivme |
   | geçiş dili | ışıkla, nesneyle, CRT ile, cepheyle…; fade yasak | kare dizisi + fade dedektörü |

   Görevin beş ekseni — **malzeme, ışık, hareket grameri, tipografi, kamera dili** — her yön kartında ayrı ayrı yazılır.
2. **Her yön ölçülebilir.** Ölçülemeyen yön seçime sunulmaz: bant, kontrast, `k1.mask` (+ `selector`), aksan + sınıf, düşüm, hareket sayıları.
3. **"Örnek world'ün bir versiyonu" geçerli yön değildir — UCUZ #11.** Test: yön, bir örnek world ya da önceki proje cinsinden
   "**X ama Y**" diye tarif edilebiliyorsa (ör. "teknik çizim ama koyu", "masa ama mavi") yön değildir, sürümdür → ELE.
   Reviewer beş eksende (malzeme, palet, alet dili, kamera grameri, geçiş kalıbı) örneklerle karşılaştırır.
4. **Yön brief'ten türetilir.** Zincir: projenin kimlik cümlesi → ışığın kaynağı ve anlamı ("ışık = dikkat" gibi bir ilke) → malzeme → hareket
   grameri (malzemenin fiziği) → tipografi (malzemenin yazısı) → kamera dili (izleyicinin konumu). Her halkanın gerekçesi yön kartına yazılır.
5. **Geçersiz yön örnekleri:** aynı yönün üç renk varyantı; bir örnek world'ün ilkel setini palet değiştirip kullanmak; önceki filmin kamera
   grameri + yeni font; "trend" görünüm listesi (stok görünüm UCUZ #8); yalnız font değişen üç still.
6. **Kurallar disiplindir:** K1–K8, çentik ≤ 1 kare, basamak 0, örtme 0, tek vurgu rengi her world'de geçerlidir; **eşikleri ve maskeleri world
   başına yeniden tanımlanır** (YR-6). Yeniden tanım SERT bir kuralı kaldıramaz.

---

## 3. Look-dev fazı

**Ne zaman:** `world/world.json` yoksa (sahne kodu yazılmaz), kullanıcı yeni world istediğinde, ya da world'ün kimliği değişecekse.
**Girdi:** brief, `project.md` kimlik bölümü, ses / BEATS (varsa), içerik sözlüğü taslağı, kısıtlar (süre, profil, bütçe). Örnek world'ler girdi DEĞİLDİR.

1. **Yön kartları (3).** `world/lookdev/<A|B|C>/YON.md`:

   ```markdown
   # Yön A — <ad>
   Kimlik (tek cümle): …
   Malzeme: … · Işık: … (kaynak, yön, sıcaklık, "ışık = ?") · Hareket grameri: … (geliş / oturma / gidiş, eğri ailesi, ikincil hareket)
   Tipografi: … (aile, ağırlık, seviyeler, yazının malzemesi) · Kamera dili: … (perspektif, drift, hareket türleri) · Geçiş dili: …
   Ayrışma: B'den <eksenler>, C'den <eksenler> (her biri ≥ 3)
   Ölçülecek: bant hedefi, düşüm tavanı, K1 maskesi, aksan, hareket sayıları
   Riskler: okunurluk, maliyet (s/kare), K1, bant
   ```
2. **Asgari ilkel seti** her yön için `world/lookdev/<yön>/*.jsx` + taslak `world.json` (ölçüm için geçici `band: [0, 100]`, seçilmiş `k1.mask`).
   Üç yön **aynı içerikle** çizilir (aynı kahraman kelime, aynı veri/nesne, aynı geçiş): içerik sabit, dünya değişken — karşılaştırılabilirlik.
3. **Tek look sahnesi** `LOOK.jsx` (`LOOK-A/B/C.dc.html` sayfaları yalnız `world/lookdev/<yön>/*.jsx` yükleme listesiyle ayrışır). Tahtalar §4'teki
   mekanizmayla bu tek sahneden çizilir: look board (filmin üç kilit anı: açılış, en yoğun an, kahraman metin/kapanış), gri kart, anahtar kare,
   karşılaştırma tahtası (tek değişken: palet ya da font adayı), gerekirse varyant tahtası, seçilen yön için galeri.
4. **Look-dev karesi:** kelimenin söylendiği an değil; son okunacak öğenin yazımı bittikten sonra **+0.1 s** (RULES VR-5).
5. **Ölçüm** (her yön, `motion-measure` ajanı ya da yapan):

   ```bash
   motion-render render LOOK-A                      # tahta kareleri (MH_TMAP: kare k = an k)
   motion-render qc LOOK-A                          # bant (M-QC7), kontrast, kadraj, K1, aksan, fade
   motion-render k1 LOOK-A --frames 0,1,2           # K1 alan / yükseklik (world.k1.mask)
   motion-render probe CARD-A --frame 0 --set MH_CARD=1 --out out/probe/look/A-card.png
   motion-render frame-check CARD-A --only edgeDark # gri kart düşümü (kısa: fc)
   motion-render probe LOOK-A --frame 0 --bench 30  # maliyet s/kare
   motion-render contact sheet out/probe/look/LOOK-sheet.png A1.png=A·açılış B1.png=B·açılış …
   ```

   Rapor tablosu: `| yön | ayrışan eksenler | bant | en düşük metin kontrastı | en küçük metin px | K1 alan/yükseklik | kenar düşümü | aksan ΔE2000 | s/kare | §0.6 (yapan) | risk |`
6. **Reviewer** (kapı `lookdev`, taze, yalnız okuma): still'ler + yön başına taslak `world.json`; yapan sayıları verilmez. Üç yön gerçekten
   farklı mı (eksen sayımı), UCUZ #11 (beş eksen), durağan §0.6 ve UCUZ maddeleri, yön başına SEÇ / ELE + tek cümle kanıt.
7. **DUR — yön seçimi.** Kullanıcı birini ya da bir birleşimi seçer. Birleşim yeni bir yön kartıdır: yeniden ölçülür.
8. **World kaydı (kilit).**
   - `world/world.json` (§5): `origin: "lookdev"`, `band` ve `k1.mask` zorunlu; bütün değerler **seçilen yönün ölçülen** değerleri.
     **Bant görünüme uyar, görünüm banda uymaz:** onaylı görünümün ölçülen bandı yazılır.
   - İlkeller `world/*.jsx`'e taşınır (taslak adları temizlenir), `primitives` listesi doldurulur.
   - `world/lessons.md` (§6) ve `world/DECISIONS.md` (seçim gerekçesi, elenen yönler ve neden).
   - `motion-render manifest validate` temiz.
9. **Sonrası.** World değişikliği = `version` artışı + etkilenen sahnelerin yeniden render'ı + önce/sonra kare karşılaştırması
   (`motion-render imgdiff`). Paylaşılan ilkele parametre eklerken varsayılan **eski çıktıyı** verir (diğer kullanımlarda fark 0).

---

## 4. Tek sahne, çok tahta (mekanizma)

Bütün tahtalar **filmin / look-dev'in kendi sahne bileşenini** çizer; ayrı mock yoktur. Kare k'de neyin çizileceğini sayfa anahtarları belirler.
Çekirdek bunları `MH.key(ad)` ile okur: `window.MH_<ad>` → `MOTION_<ad>` → `FX_<ad>` (geriye uyum). Sahne yalnız `MH.useT()` kullanır.

| anahtar | işlev | tahta |
|---|---|---|
| `MH_TMAP = [t0, t1, …]` | kare k → tasarım anı (k = floor(T·fps)) | look, storyboard, karşılaştırma |
| `MH_TMAP_AUDIO = 1` | TMAP değerleri ses zamanında (eşlemle tasarıma çevrilir) | ses değiştikten sonraki tahtalar |
| `MH_VARS = [{t, v: {S02: 'b'}, l: 'etiket'}]` | kare başı varyant seçimi (`window.MH_VAR`); TMAP yoksa `t`'ler zaman haritası olur | varyant tahtası |
| `MH_PAL`, `MH_DISPLAY`, `MH_DISPLAY_W` | tek değişken: palet sürümü, display font adayı | karşılaştırma tahtası |
| `MH_CARD = 1` | içerik yerine beyaz yüzey + dünya ışığı | gri kart (düşüm ölçümü) |
| `MH_KEY = 1` | metinsiz / ışıksız / kamerasız anahtar kare | plaka / restyle referansı |
| `MH_INKMASK = 1` | yalnız `[data-hero]` beyaz zeminde | K1 `ink` / `alpha` ölçümü (araç kendisi açar) |
| `MH_HIDE = <seçici>`, `MH_PROF = pen\|grain\|mblur\|…`, `MH_NOBAKE = 1` | katman kapatma, profil, pişirme kapalı | maliyet / hata ayıklama |
| `MH_T0`, `MH_AMAP` (ya da üretilmiş `motionA2D`) | sayfa ofseti, ses ↔ tasarım eşlemi | perde sayfaları, ses değişimi |
| `GEN_BASE = '../'` | tahta alt klasördeyse varlık kökü | hepsi |

Sahne tarafı sözleşmesi:

```jsx
var V = { S02: { a: {…}, b: {…}, c: {…} } }, PICK = { S02: 'b' };     // varyant tablosu + kalıcı seçim (tek satır)
function Piece() {
  var t = MH.useT(), T = t.T;                                          // TMAP / VARS / T0 / ses eşlemi burada çözülür
  var v = MH.variant(V, 'S02', PICK);                                  // önce MH_VAR (tahta), sonra PICK
  return <XWorld T={T}>…</XWorld>;                                     // XWorld kart / anahtar / maske modlarını uygular
}
```

```html
<script>window.MH_TMAP = [2.433, 7.9, 14.1];</script>                     <!-- look board: 3 kare = 3 an -->
<script>window.MH_VARS = [{"t":4.2,"v":{"S02":"a"}},{"t":4.2,"v":{"S02":"b"}},{"t":4.2,"v":{"S02":"c"}}];</script>
<script>window.MH_CARD = 1;</script>                                       <!-- gri kart -->
```

- **Varyant seçimi koda değil veriye bağlıdır:** kullanıcı seçimi `PICK` satırında kalıcılaşır; tahta sayfası sahne koduna dokunmaz.
- **Bileşen varyant tahtası:** ilkel × a/b/c (kare k = varyant k) — ilkel seçimi look-dev'de, gerçek içerik boyutunda.
- **Galeri** (`G_META`, düz JS): `{ id, name, st: kapak|var|yok|kullanılmaz, t, does, file, prop, pal (renk bağlılığı / sabit renk satırları), an, rows?, note? }`;
  1920×1080 kart: sol canlı demo (bileşen kendi yerel zamanıyla), sağ künye; 22 px altı metin `data-doku`; kare k = kart k. "Kullanılmaz" ve
  "renk sabit" satırları bir ilkelin hangi world'e kilitli olduğunu belgeler.
- **Storyboard:** panel = an (`{f, t, beat, move, light, pattern}`); storyboard, look-dev ve render aynı sahne kodundan.

---

## 5. world.json alanları ve nasıl ölçülür

| alan | zorunlu | anlam | nasıl doldurulur |
|---|---|---|---|
| `name`, `version`, `origin` | — | ad, semver, `lookdev` ya da `example:<ad>` | world değişince `version` artar |
| `palette` | — | ad → `#rrggbb` (yalnız hex) | world jsx sabitleriyle aynı; ışık telafili kaynak renk ayrı ad (`accentSrc`) |
| `accent` | — | `{color, class, quotaDefault}` | `color` grade'li çıktıdan ölçülen hedef; `class` `classes`'tan; kota sahne kaydında (`redQuota`) |
| `fonts` | — | `[{family, weights, source}]` | `motion-render vendor fonts` indirir (lisans metniyle); Türkçe glif kontrolü (`frame-check --only glyph`) |
| **`band`** | **ZORUNLU** | `[alt, üst]` zaman ağırlıklı ortalama luma %, grade sonrası | onaylı yönün look still'leri + storyboard panelleri (`qc` → `checks.band.mean`, `--mp4 auto` ile grade sonrası); hepsi içeride, kenarlara ≥ 2 puan pay; tipik genişlik 10–20 puan |
| `profileBands` | — | profil bantları (ör. `typographic: [6, 14]`) | yalnız profil kullanılıyorsa |
| **`k1.mask`** | **ZORUNLU** | `dom` \| `ink` \| `alpha` (+ `selector`, `areaMin`, `heightMin`, `lyricMin`) | açık zeminde koyu kahraman → `ink`; koyu zeminde açık kahraman → `alpha`; DOM öğesi (panel, kâğıt, cam) → `dom`. Eşik çekirdek tabanı 0.30 / 0.50; world yalnız **yükseltir** (`motion-render k1`) |
| `edgeDark.maxFalloff` | — | köşe/merkez düşüm tavanı | gri kart (`MH_CARD=1`) → `frame-check --only edgeDark`; ölçülen + ~0.05 pay (örnek: 0.153 → 0.20) |
| `grade` | — | `{chain: dark\|light\|lab\|none, params: {curves, colorbalance, vignette, black, pureSec}}` | `motion-render grade LOOK-A` provası; aydınlık world'de patlama (`burst`) kontrolü; siyah noktası + vinyet sırası bağlayıcı |
| `classes` | — | renk sınıfları (`rMin`, `gMax`, `rgMin`, `gr`, `lMax`, …) | aksan çekirdek piksellerinin ≥ %99'u sınıfa girer, palet renklerinin hiçbiri girmez; `frame-check --only accentLocation` dışarıda 0 |
| `camera` | — | `{maxPxPerFrame, stepJump, accel{max, floor}, …}` | kamera deneme sayfasında `probe --eval "JSON.stringify(window.__camSpeed(60, N))"` tepesi; `stepJump 2.5` ve `accel 0.15 / 2` çekirdek disiplinidir (gevşetilmez) |
| `motion` | — | `{toolMaxPx, writeGlyphsPerSec, settlePx, …}` | `__tools` kancasıyla görünür alet hızı (`frame-check --only toolPath`), yazım süresi / glif, oturma tepesi; world'e özgü hareket sayıları (itiş, sarsıntı, CRT ızgarası…) aynı nesneye eklenebilir |
| `supersample` | — | `{k2x, pad, blend, sxK, edgeMaxPx}` | Chromium tekniği: çekirdek ders değerleri (0.5 / 6 / 6 / 1.5 / 1.9); yalnız ölçümle değişir (`ss2 --plan`) |
| `primitives` | — | world ilkellerinin adları | `world/*.jsx` dışa açılanlarla aynı |
| `lessons` | — | ders dosyası yolu | `lessons.md` |

- Ölçülemeyen değer **uydurulmaz**: ilgili kontrol "ölçülemedi" der; zorunlu alan eksikse `manifest validate` hata verir (YR-4).
- Örneklerdeki px/kare değerleri 1920×1080 · 60 fps'te ölçülmüştür. Proje başka tuval ya da fps kullanıyorsa ölçüm o koşulda yapılıp yazılır.
- `lessons.md`'de her alan için **kaynak** sütunu tutulur: `ölçüldü` (komut + kare) · `türetildi` (formül) · `kural` (RULES kimliği) · `varsayım` (ölçülene kadar).

---

## 6. World dersleri (`lessons.md`) ve kararlar (`DECISIONS.md`)

**lessons.md bölümleri:** Kimlik (tek cümle + malzeme, ışık, hareket, tipografi, kamera) · world.json değerlerinin kaynağı · ölçümler ·
tuzaklar · "varsayılan olmamalı" notu. Tuzak satırı:

```markdown
| W-07 | <tuzak: ne oldu, hangi karede, sayı> | <ders: ne yapılır; ölçüt> |
```

- Ders önce `docs/RETRO.md` ve world `lessons.md`'ye yazılır; faz kapanışında güncellenir (PLAYBOOK §4.8).
- Sınıflama: görsel dile bağlı → **world**; Chromium / ölçüm / süreç / ses / varlık dersi → **core adayı** (fx'te bulunmuş olsa bile).
- **Üç kez aynı bulgu → kural** (ölçülebilir kontrol önerisi); world'de kalıyorsa `world.json`'a eşik olarak, değilse `/motion:promote`'a.
- Kök neden "dikkatsizlik" yazılmaz; hangi kontrolün neden yakalamadığı yazılır.

**DECISIONS.md:** `kimlik · karar · gerekçe · sonuç` (+ kanıt kare/rapor). İlk kayıt yön seçimidir (seçilen yön, elenen yönler, eksen sayımı,
kullanıcı kararı tarihi). Sonradan değişen her world kuralı (ör. "ışık spotluktan tek yönlüye", "doğrusal easing yasak") yeni bir kayıttır.

---

## 7. K-yeni kalıplar ve `/motion:promote`

Projede bulunan yeni hareket / geçiş kalıbı önce **world'e** girer:

```markdown
### K-yeni-01 · <ad>
Ne gösteriyor: … · Sayılar: {dur, …} (kart satırı) · Mekanik ↔ görünüm: <world'den bağımsız kısım> / <world'e bağlı kısım>
İddia (tek cümle) + ölçülecek kare: … · A/B: çatal (sahne dosyasına dokunmadan tek değişken) → ölçüm A → B · Karar: kabul | revize | ret · Kanıt: <yol>
```

- Kalıp sahneye ancak A/B kanıtıyla ya da `project.md`'de kayıtlı muafiyetle girer (YR-7). A/B kanıtı yoksa "deneme".
- "Ret" silinmez, kütüphanede durur (neden işe yaramadığı derstir).
- `/motion:promote` adayları toplar ve sınıflar: **mekanik** kısım (zamanlama, geometri, ölçüt) world'den bağımsızsa core önerisi olur
  (`docs/promote/PROMOTE-<tarih>.md`, anonim diff; paket dosyası asla doğrudan düzenlenmez); **görünüm** (renk, malzeme, font) world'de kalır.
  Değer core'a taşınmaz; core'a disiplin gider.
- Bir kalıp başka world'de farklı görünüm ister (ör. kâğıt dünyasında yırtık cephe, ekran dünyasında tarama şeridi): görünüm parametreye çevrilir,
  renk sabiti bırakılmaz.

---

## 8. Örnek world'ler

`examples/` altında beş örnek vardır (tablo: `examples/README.md`): **fx-lab**, **desk-paper**, **screen-dark** (world.json + jsx + lessons +
DECISIONS + demo) ve **light-ui**, **photo-plate** (world.json + lessons). Hepsi **ÖRNEK, varsayılan değil**.

- **Okumak serbesttir:** süreç örneği olarak (bir world.json'un nasıl ölçüldüğü, bir lessons dosyasının nasıl tutulduğu, bir ilkelin T'nin saf
  fonksiyonu olarak nasıl yazıldığı). Yön kartına, palete, ilkele **kopyalanmaz**; sessizce önerilmez.
- **Kullanım yalnız açık istekle:** kullanıcı "örnek world'ü kullan: <ad>" der (ya da `/motion:init` sorusunda seçer) → `motion-render init <dir> --world <ad>`.
  Kayıt: `world.json` `origin: "example:<ad>"`, `DECISIONS.md`'ye ilk satır "örnek world kullanıcı isteğiyle seçildi (tarih, istek cümlesi)".
- **Seçilse de uyarlanır:**
  1. Kimlik cümlesi projenin brief'inden yeniden yazılır (örneğin cümlesi kalmaz).
  2. Look board + gri kart projenin kendi içeriğiyle çizilir; `band`, `edgeDark`, `k1` eşikleri, `accent` + `classes`, kamera ve hareket sayıları
     **projenin karelerinde yeniden ölçülür** ve yazılır.
  3. Proje kimliğiyle çelişen ilkel / renk / font değiştirilir (değişiklik `DECISIONS.md`'ye).
  4. Örneğin dersleri (`lessons.md`) geçerlidir; projeye uymayan satır "bu projede geçersiz" notuyla kalır.
  5. Reviewer yine UCUZ #11'e bakar: kullanıcı örneği seçtiyse "taklit" değil "seçim" sayılır, ama önceki projenin **içeriği / kamera
     grameri / geçiş sırası** taşınamaz.
- **Demo sahneleri** (`demo.dc.html`) yalnız world'ün ilkellerini çalışır halde gösterir; kurulum smoke testi `fx-lab` demosundan 12 kare çizer.

---

## 9. Çekirdek yardımcılar (world ilkelleri için kısa başvuru)

Tam liste ve imzalar: `render/runtime/motion-core.jsx` başlık yorumu.

| ihtiyaç | çekirdek |
|---|---|
| zaman, tahta anahtarları, ses eşlemi | `MH.useT()`, `MH.time.resolve/pageT/toPage`, `MH.audio.*`, `MH.key`, `MH.fps`, `MH.frame` |
| ilerleme, eğri, anahtar | `MH.p`, `MH.pAB`, `MH.e`, `MH.tween`, `MH.ease.*` (power ailesi, sine, adlı bezier'ler, `get`), `MH.keys.linear/catmull/monotone/log`, `MH.typed` |
| ikincil hareket | `MH.settle`, `MH.nudge`, `MH.vib`, `MH.breath`, `MH.drift`, `MH.osc` (sayılar world'den) |
| kamera, derinlik | `MH.cam.at/project/layerPt/dof/dollyFromScale/motion`, `<MHCam>`, `<MHLayer>` (perspektif world'den) |
| ölçü, çizgi | `MH.measureText`, `MH.textWidth`, `MH.capMetrics`, `MH.poly.*`, `MH.rng`, `MH.mixColor` |
| modlar, varyant | `MH.mode.*`, `MH.variant`, `<MHModeStyles>` |
| varlık, pişirme, sarmalayıcı | `MH.asset/assetSrc`, `<MHAssetTexture>`, `<MHBakeSvg>` (+ `__fxBakeSettle`), `<MHMoBlur>`, `<MHDirBlur>`, `<MHLit>`, `<MHDesignSpace>` |
| kancalar (CONTRACT §5) | `MH.hooks.camSpeed/camK/boxes/tools/glyphs/holds/events/accentExclude/probeInfo` — geometri Stage pikselinde döner |

---

## 10. World kilit kontrol listesi

- [ ] Üç yön kartı; her çift ≥ 3 eksende ayrışıyor; hiçbiri örnek world / önceki proje "X ama Y"si değil (UCUZ #11).
- [ ] Her yön ölçüldü (bant, kontrast, K1, düşüm, aksan, s/kare); rapor tablosu + kontak var.
- [ ] Reviewer `lookdev` kaydı; kullanıcı yön seçimi (DUR) `DECISIONS.md`'de.
- [ ] `world.json`: `band` + `k1.mask` (+ `selector`), `accent` + `classes`, `grade`, kamera/hareket eşikleri ölçülen değerlerle; kaynak sütunu `lessons.md`'de.
- [ ] `motion-render manifest validate` temiz; ilkeller yalnız `motion-core.jsx` + React'e bağımlı; marka / proje metni / sabit tuval-fps yok.
- [ ] Tahta modları çalışıyor: `MH_CARD`, `MH_KEY`, `MH_INKMASK`, `MH_TMAP`, `MH_VARS`.
- [ ] Fontlar `vendor` ile indirildi, glif kontrolü temiz (ı ş ğ İ Ö Ç Ü).
