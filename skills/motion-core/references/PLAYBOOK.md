# PLAYBOOK — motion üretim akışı

Bu belge, kaynak projede kanıtlanmış üretim **sürecini** taşır: fazlar, kapılar, ölçüm, bağımsız reviewer, varyantlar, DUR noktaları ve raporlar. Görsel **üslubu** taşımaz.

Komutlar `render/CONTRACT.md` §6 ile birebir aynıdır. Bağlantılı belgeler:

| belge | içerik |
|---|---|
| `RULES.md` | SERT ve VARSAYILAN kurallar, K-kuralları, eşikler |
| `MEASURE.md` | qc'nin 16 kontrolü, frame-check'in 20 tipi, OURS/K1/K3, keskinlik, devir |
| `AUDIO.md` | ses hattı, kayma, eşlem, sessiz kuyruk, loudness |
| `GENAI.md` | üretken varlık, bütçe, ledger, kabul |
| `LESSONS.md` | tuzaklar ve dersler |
| `DOCS-TEMPLATES.md` | belge dizini ve şablon kuralları |

Proje belgelerinin şablonları paketin `templates/` klasöründedir.

---

## 0. Bağlayıcılık ve profiller

### 0.1 Çelişkide sıra

1. Kullanıcının son talimatı (faz istemi, ara not, DUR cevabı).
2. Onaylı ara ürünler: look-dev seçimi, sözlük, varyant seçimi, storyboard.
3. `project.md` (projeye özgü katman). Paketin VARSAYILAN kurallarının önündedir; SERT kuralların önünde değildir.
4. `scenes.json` (manifest; fps, boyut, profil ve sahne kayıtları için tek kaynak).
5. `world/` (world.json, lessons.md, DECISIONS.md).
6. Paket skill'leri (RULES, PLAYBOOK, MEASURE, AUDIO, GENAI).
7. `script/` (transkript, BEATS, amap) ve `docs/` (künye, sözlük).

### 0.2 Profiller (`scenes.json` → `profile`)

| | `full` | `light` | `live` |
|---|---|---|---|
| Ne için | film, çok perdeli iş | kısa tek birim, hızlı tur | gerçek zamanlı oynayan sayfa |
| §0.6 kapısı | ≥ 7/8 | ≥ 6/8 | ≥ 7/8 |
| Look-dev (yeni world) | 3 yön | 3 yön | 3 yön |
| Sözlük kapısı | zorunlu | zorunlu | zorunlu |
| Varyant | shot başına 3 still, ayrı reviewer turu | shot başına 3 still; varyant seçimi animatik kapısıyla tek turda | shot başına 3 still |
| Animatik (K7) | 960×540 @30, ayrı reviewer kapısı | 960×540 @30, ayrı reviewer kapısı | `motion-render live <sayfa> --qc` kaydı + ölçüm |
| Tam render | fps tam, 2×/S× kuralları | fps tam, 2×/S× kuralları | yok (sayfa teslim edilir) |
| Teslim reviewer turu | var | var | var |
| Master + arşiv | ProRes + H.264 + FFV1 arşiv | master zorunlu; arşiv isteğe bağlı | yok; sayfa + `live` ölçüm json'ı |
| Belgeler | künye tam form, RETRO uzun ya da kısa | künye kısa form, RETRO kısa | künye + `live` ölçümü |

- Eşikler profil varsayılanıdır. Proje `scenes.json` `gate.taste` ile **yükseltebilir, düşüremez**.
- `light` ve `live` sütunlarındaki ayrımlar paket kararıdır; kaynak projede yalnız `full` koştu.
- Canlı profilin ayrıntısı `motion-live` skill'indedir.

---

## 1. Yaratıcılık kuralı: süreç evet, üslup hayır

1. **World seçilmedikçe varsayılan yok.** Hiçbir primitif, renk, font, alet ya da geçiş kalıbı kendiliğinden gelmez. `world.json` yoksa sahne kodu yazılmaz; önce look-dev yapılır (§4.3).
2. **Look-dev üç GERÇEKTEN farklı yön sunar.** İki yön, aşağıdaki altı eksenin en az üçünde ayrışmalıdır: ışık modeli · malzeme/zemin · ton (luma bandı) · tipografi · kamera dili · geçiş dili. Her yön ölçülür (§4.3). Aynı yönün üç renk varyantı, üç yön sayılmaz.
3. **UCUZ #11: seçilmemiş bir world'e ya da (yeni world kurulurken) önceki projeye benzerlik.** Reviewer her kapıda tarar. Kütüphane world'leri (`skills/motion-world/library/`) yalnız kullanıcı seçerse (`motion-render init --world <örnek>`) yüklenir; seçilmeyen örnek okunabilir ama kopyalanmaz.
4. **Kalıp kanıtla girer.** Bir kalıp sahneye ancak A/B kanıtıyla girer; A/B'si olmayan katkı raporda "deneme" diye etiketlenir.
5. Kaynak projeden gelen kural ve dersler **disiplindir**: kapı, ölçüm, belge. Değer gerektiren kurallar (bant, aksan sınıfı, K1 maskesi) değerini world'den alır. World bu değerleri vermiyorsa ilgili kontrol "ölçülemedi" uyarısı verir; değer uydurulmaz.

---

## 2. Roller ve orkestrasyon

### 2.1 Kim ne yapar

```text
kullanıcı
└─ ana oturum  (/motion:faz · /motion:gate · /motion:master · /motion:live) — orkestra; ajanlar birbirini çağırmaz
   ├─ motion:motion-research  → docs/research/<konu>.md · assets/gen/requests/<birim>.json
   ├─ motion:motion-director  → kod · kareler · qc/fc json · kontak · künye · rapor taslağı (## Katkı)
   ├─ motion:motion-measure   → out/measure/<iş>/ (sayı + yöntem + kırpım)
   └─ motion:motion-reviewer  → kapı başına TAZE · out/review/<kapı-id>/ · docs/REVIEWER.md (sona ekler)
```

| rol | kim | yetki | yazdığı | asla |
|---|---|---|---|---|
| **orkestra** | ana oturum | tüm araçlar | `project.md` §'leri, rapor, kapanış belgeleri; `docs/REVIEWER.md` yalnız dosya yoksa (reviewer'ın `RECORD.md`'sini ekler) | kapıyı kendi puanıyla geçirmek; reviewer'a künye ya da yapan sayısı vermek |
| **yapan** | `motion-director` alt ajanı ya da ana oturumun kendisi | tüm araçlar | sahne kodu, render, ölçüm, künye | reviewer'ın yerine karar vermek |
| **araştırma** | `motion-research` | salt okuma + kendi çıktı dosyası | `docs/research/<konu>.md` (sözlük taslağı, kaynak/aday tablosu), `assets/gen/requests/<birim>.json` | üretim yapmak, kredi harcamak |
| **bağımsız ölçüm** | `motion-measure` | okuma + kendi betikleri; yazma yalnız `out/measure/<iş>/` | `RESULT.md` + `result.json` (sayı, yöntem, kalibrasyon, kırpım) | yapanın aracını ya da sayılarını referans almak; zevk ya da kapı kararı vermek |
| **bağımsız reviewer** | `motion-reviewer`, **her kapıda yeni** (`/motion:gate` açar) | okuma + ölçüm ilkelleri; yazma yalnız `out/review/<kapı-id>/` ve `docs/REVIEWER.md` sonuna ekleme | `KARAR:` satırı + kayıt gövdesi | düzeltme yapmak, proje dosyasına dokunmak, künye/rapor okumak |

- `<kapı-id>` = `<birim>-<kapı-türü>-r<k>` (ör. `P2-animatik-r1`).
- `<iş>` = `<birim>-<ölçü>-<YYYYAAGG>` (ör. `P3-k1-20261017`).
- Kapı türleri: `lookdev` · `varyant` · `storyboard` · `animatik` · `render` · `teslim` · `master` · `live` · `varlik`. Ayrıntı: `motion-reviewer` SKILL §7.

İlkeler:

- **Tek görev, tek çıktı, en küçük bağlam.** Alt ajana yalnız işi için gereken dosyalar verilir. Katalog ya da uzun çıktı ajan bağlamına kopyalanmaz.
- **Ajan türü bulunamazsa:** genel amaçlı ajan açılır ve isteme şu cümle konur: "Önce `agents/<ad>.md` dosyasını oku ve oradaki rolü birebir üstlen."
- **Ölçüm ağırlıklı ön koşullar** (logo/varlık kabulü, ölçer kalibrasyonu, yapanın sayısıyla çelişen ölçü) `motion-measure`'a verilir. Ana oturum ölçüm sonucunu yapanın sayısıyla yan yana koyar ve farkı raporlar. Reviewer `out/measure/**`'ı da okumaz; kendisi ölçer.

### 2.2 Bağımsız reviewer sözleşmesi

Tek kaynak `skills/motion-reviewer/SKILL.md` ve `agents/motion-reviewer.md` dosyalarıdır; bu bölüm özettir, çelişkide onlar kazanır.

**Tazelik.** Her kapı yeni bir reviewer ajanıyla açılır; reviewer SendMessage ile bir sonraki kapıya taşınmaz. Kaynak projede tek bir kalıcı reviewer 23 dönüşte ~111 MB bağlama ulaştı ve "işi görmemiş göz" niteliği aşındı.

**Hafıza.** Kapılar arası tek hafıza `docs/REVIEWER.md`'dir: önceki kararlar, kayıtlı istisnalar, kabuller. Reviewer işe bu dosyayı okuyarak başlar.

**Verilenler (yalnız çıktı ve kural):**

- kapı türü, birim, tur (`r1`/`r2`), profil ve eşik;
- kurallar: `RULES.md`, `MEASURE.md`, `GENAI.md`; `project.md` §1 brief, §3 kalite çıtası, §4, §5, §6, §9, §10 ve §11+'nın yalnız "kullanıcı" satırları;
- **kullanıcı brief'i ve faz istemi, tırnak içinde, aynen;**
- çıktıların göreli yolları:
  - kareler `out/frames/<id>[_tag]/NNNNN.png` (dizindeki N. dosya → mutlak zaman `t = tc + N·step/fps`), mp4, kontak, anahtar kareler, varyant/look-dev still'leri;
  - `out/probe/<id>-qc.json`, `out/probe/<id>-fc.json` (+ `--sheet` sayfası) — **yönlendirici**, kanıt değil;
  - `scenes.json`, `world/world.json`, `assets/gen/manifest.json` (ledger);
- kapsam bilgisi: incelenecek ya da değişen **kare aralıkları** (yalnız aralık + konu).

**Verilmeyenler:**

- künye, faz raporu, RETRO, RENDER_REPORT, CHANGELOG notları;
- yapanın konuşması, gerekçeleri, §0.6 puanı (fark raporda ana oturumca yazılır);
- yapanın ölçüm betikleri ve sayıları (`out/probe/<faz>/…`, künye tabloları), `out/measure/**`.

**Yöntem.** Önce güncellik (kayıtlı kare ↔ yeni `probe`, `imgdiff` 0 değilse "bayat kare" → GEÇMEZ); sonra kontak; sonra her shot için ≥ 6 kare tam boyda; şüpheli yerde komşu kareler. Kesin karar tam çözünürlükte verilir. Kararın dayandığı her sayı reviewer'ın kendi yolundan alınır (kendi kırpımı, kendi `m-<konu>.mjs` betiği, `out/review/<kapı-id>/` altında).

**Dönüş biçimi.** İlk satır tek ve makine-okurdur (düzenli ifade SKILL §10'da):

```text
KARAR: <TESLİM GEÇER|GEÇER|ŞARTLI GEÇER|GEÇMEZ> · §0.6 <x>/<n>|yok · UCUZ <geçer|VAR #a[,#b][ sınırda #c]|sınırda #c> · kapı <tür> <full|light|live> ≥<e>/<n>|yok · tur r<k> · birim <id>
```

Ardından gövde (~60 satır): Kontroller · §0.6 · UCUZ (VAR ve sınırda satırları; #11 eksen tablosu) · Ön plan · Hata gibi görünen öğe · En zayıf anlar · Somut düzeltme listesi (GEÇMEZ ve ŞARTLI GEÇER için zorunlu: `| # | kare aralığı | sorun | ölçüt | nasıl doğrulanacak |`) · Küçük notlar · Açık kararlar. Son satır: `Proje dosyalarına dokunmadım. Kanıt: out/review/<kapı-id>/`.

**Kayıt.** Reviewer kaydını `out/review/<kapı-id>/RECORD.md` olarak yazar ve `docs/REVIEWER.md` sonuna kendisi ekler. Başlık `## <YYYY-AA-GG> · <birim> · <kapı> · r<k>: <KARAR>`, hemen altında `KARAR:` satırı. Dosya yoksa reviewer oluşturmaz; ekleme işini ana oturum yapar. Makineler `grep '^KARAR:' docs/REVIEWER.md` ile okur.

**Karar → akış:**

| karar | akış |
|---|---|
| **TESLİM GEÇER** (yalnız `teslim` ve `master`) | kapanış |
| **GEÇER** | sonraki adım ("KAPI GEÇERSE DURMA") |
| **ŞARTLI GEÇER** | **yeni reviewer turu açılmaz.** Yapan somut düzeltme listesindeki şartları uygular ve her birini kanıtlar (probe, kırpım, ölçüm; gerekirse `motion-measure`). Kanıt künyeye ve rapora yazılır. Şartlar bir sonraki kapıda reviewer tarafından doğrulanır |
| **GEÇMEZ** (r1) | **tek düzeltme turu** (aşağıda) |
| **GEÇMEZ** (r2) | **DUR**: kontak + nedenler kullanıcıya; render yok (§6, DUR-9). Üçüncü tur açılmaz |
| **GEÇMEZ** ve §0.6 evet < 3 | düzeltme turu açılmaz; look-dev / varyant / storyboard'a dönülür (DUR-11) |

**Dönüşten sonra kapı yeniden açılır.** DUR-11 ile look-dev / varyant / storyboard'a dönülünce yeni iş **taze reviewer kapısından** geçmeden sonraki faza (sözlük, perde, render) geçilmez. Kullanıcı onayı ya da etkileşimsiz oturumdaki otomatik onay bir GEÇMEZ kapısını atlamaz; onay yalnız kapıyı geçmiş işi ilerletir (eval bulgusu: GEÇMEZ 1/5 sonrası yön kilitlenip kapısız perdeye geçildi).

**Tek düzeltme turu.** Yalnız GEÇMEZ açar. Yapan yalnız r1'in somut düzeltme listesini uygular. r2 için **taze** reviewer açılır; ona verilenler:

- r1 kaydı (`docs/REVIEWER.md`'den) — r1'in sayıları da referans değildir;
- değişen kare aralıkları;
- yapanın **madde → durum** listesi, sayısız ve gerekçesiz: `1 → UYGULANDI, f2214–2290` · `2 → KISMEN, f2400–2422`;
- açık istek: "her maddeyi kendi yönteminle, sayıyla doğrula".

r2 kendi tablosunu yazar (`madde | r1 bulgusu | r2 ölçümü | kapandı mı`) ve yeni bulguları da kaydeder; yeni bir VAR işaret de GEÇMEZ yapar.

### 2.3 Ana oturumun bir kapıyı yürütmesi (`/motion:gate`)

```text
1. Belgeler reviewer'dan ÖNCE: reviewer'ın okuduğu kural ve manifest dosyaları güncel olmalı
   (project.md kullanıcı kararları, scenes.json istisna/"incelendi" kayıtları, world.json, qc/fc json).
   Künye ve RENDER_REPORT da aynı anda güncellenir; reviewer onları okumaz ama rapor ve teslim belgesi onlardan beslenir.
   (Eski kural/manifest reviewer bulgusunu "eski okuma"yla kirletir.)
2. Bakiye oku (`motion-render doctor`) — kapı bütçe içeriyorsa.
3. motion-reviewer'ı aç (TAZE ajan): §2.2'deki girdiler + kapı-id + bakılacak kare aralıkları
   (yalnız aralık ve konu; yapanın sayısı, gerekçesi, künyesi YOK).
4. Beklerken: PARALEL işler (künye, ölçüm tablosu, sonraki birimin taslağı).
5. Dönüş → `grep '^KARAR:' docs/REVIEWER.md` ile kaydın eklendiğini doğrula.
   Eklenmemişse (dosya yoksa) `out/review/<kapı-id>/RECORD.md`'yi aynen ekle. Kayda yorum eklenmez.
6. Karara göre:
   TESLİM GEÇER / GEÇER → sonraki adım ("KAPI GEÇERSE DURMA")
   ŞARTLI GEÇER         → şartları uygula + her birini kanıtla (yeni reviewer turu YOK); sonraki kapı doğrular
   GEÇMEZ (r1)          → tek düzeltme turu → TAZE reviewer r2
   GEÇMEZ (r2)          → DUR (kontak + nedenler, render yok)
7. Kararı raporun sonuç paragrafına yaz; kendi puanınla farkı belirt ("yapan 7/8 · reviewer 8/8").
```

### 2.4 Bekleme ve arka plan işleri

- Uzun işler (render, zincir, master) arka plan görevi olarak koşar; bitince bildirim gelir. Ya da üst sınırlı bekleme kullanılır: `motion-render wait --id <id> --tag <T>|- --frames N [--expect <s>]` (`--tag -` = etiketsiz tam render). Üst sınır, beklenen sürenin (`--expect`) iki katıdır.
- Elle `sleep`/`until` döngüsü **yasak**. Kaynak projede bir render 3 saat bekleme döngüsünde kaldı.
- Bekçi çıkış kodları:

  | kod | anlamı | ne yapılır |
  |---|---|---|
  | 4 | 120 s yeni kare yok (render bekçisi) | teşhis edilir |
  | 5 | kare atlandı | sayılır; atlanan kareler yeniden üretilir |
  | 6 | disk < 40 GB (render) · üst sınır doldu (`wait`) | §9 · teşhis |
  | 7 | `wait`: 150 s yeni kare yok, sonuç dosyası yazılmadı (harness çöktü) | log sonu okunur, yeniden başlatılır |

- Toplu render'da bir sahne başarısız olursa iş durmaz: hata loglanır, sıradaki sahneye geçilir, sonda atlanan sayısı raporlanır.
- Çok adımlı zincirler bir betik dosyası olarak yazılıp tek arka plan komutuyla koşturulur. Betik, kullanılan zinciri belgeler.
- **Etkileşimsiz oturum (headless, `claude -p`):** ajanlar ve uzun işler ön planda (`Agent` → `run_in_background: false`; Bash ön planda ya da `motion-render wait`) koşturulur ve beklenir. Headless süreç tur bitince kapanır; arka planda bırakılan ajan ve iş de ölür (eval tur 1'de üç oturum bu yüzden look-dev ortasında bitti).

### 2.5 Faz içi ara mesajlar

| durum | biçim |
|---|---|
| Bekleme bildirimi | Bir paragraf: hız, kalan, ne zaman devam edileceği, beklerken yapılanlar. Örnek: "Animatik ~1.7 s/kare ilerliyor (658 karenin 44'ü bitti, ~19 dk kaldı). Bitince bildirimle devam edeceğim; bu arada künyenin ölçüm tablosunu yazıyorum." |
| Durum sorusuna cevap | İlk cümle hüküm ("Genel olarak yolunda."), ardından `\| birim \| durum \| sonuç \|` tablosu ve kalan iş. |
| Reviewer kararı aktarımı | "Reviewer kararı: **GEÇMEZ** (§0.6 5/8). Tek düzeltme turum bu; bundan sonrası DUR. Bulgular: …" |

---

## 3. Faz sözleşmesi

### 3.1 Faz istemi (FAZ) biçimi

Kullanıcı ya da `/motion:faz` fazı bu iskeletle açar. Şablon: `templates/FAZ.md`.

```text
FAZ F<n>[-B|-C] — <KAPSAM BAŞLIĞI> [→ <hedef çıktı/sürüm>] [(kredi 0)]
<1–3 satır bağlam: kaynak aralık; DONDURULAN / değişmeyecek olanlar;
 "başka kare değişmez (imgdiff 0)">

§<N> KARARLAR (project.md):            ← önceki raporun açık kararlarına cevaplar
- <karar> … (kapalı; bir daha listelenmez)
İLKE | KURAL | ELEME KURALI (project.md §x'e ekle): <yeni bağlayıcı kural>
DEVİR: <önceki birim son karesi> → <bu birimin ilk anahtarı>; fark ≤ <eşik>

0. <ön iş / TEŞHİS — düzeltmeden önce, sayıyla neden>
1. <birim/shot kimliği> (<zaman aralığı>): <görsel tarif · alet · kamera ·
   vuruş zamanı (≤ 1 kare) · ölçülebilir kabul: px, ΔE2000, oran, %>
2. …
   [A] / [B] seçenekli maddeler → "kullanıcı kararı (önerim A)"
YAP: … · YAPMA (borç olarak kaydet): …
PARALEL: <render beklenirken yapılacaklar>
DOKUNULMAZ: <dosya/klasör listesi>

AKIŞ: <3 varyant still/shot → seçim (yapan + reviewer) → animatik 960×540/30
       + kontak + OURS → reviewer (§0.6 ≥ eşik + UCUZ) → tek düzeltme turu →
       geçerse tam render → QC/K1/K3/K6/OURS → reviewer → teslim>.
       Geçmezse: kontak + nedenler, render yok.
REVIEWER: <tek tur | ön koşul>; <bakılacaklar>; <KENDİ yöntemiyle, sayıyla>
Rapor: <zorunlu bloklar> · balance <önceki> → ?
DUR[ 1 | 2]: <durulacak nokta / teslim>

EK F<n> / F<n> ARA NOTLAR: 1. … 2. …   ← sonradan gelen düzeltmeler
```

**Faz kodları:**

| kod | anlamı |
|---|---|
| `F<n>` | yeni iş birimi |
| `F<n>-B`, `-C` | aynı fazın revizesi ya da devamı |
| `F<n> DUR 1 RED → …`, `DUR 1b KARARI` | bir DUR noktasına verilen cevap |
| `… ONAY → … BAŞLA` | onay ve sonraki adımı açma |
| `F<n> ARA NOTLAR` | iş sürerken gelen düzeltme |

İstemler telgraf üslubundadır: "·" ayraçlı listeler, "→" zincirleri. Her ölçüt sayıyla verilir.

### 3.2 Daimi çalışma kuralları (her fazda)

1. **Soru yok.** Eksik ya da uyumsuz olanı işaretle ve devam et; kullanıcının vermesi gereken karar raporda "açık karar" olur. **İstisna:** bağlayıcı bir tablodan (pencere, shot, sözlük) sapmak gerekiyorsa önce sorulur (DUR-3).
2. **KAPALI KARAR tekrar sorulmaz.** Rapor yazmadan önce `project.md` ve `scenes.json` notlarında "KAPALI KARAR" aranır. Önceki raporun açık karar listesi kopyalanmaz; her madde yeniden doğrulanır.
3. **Kararlar önce belgeye.** Faz istemindeki KARARLAR ve KURAL'lar işe başlamadan `project.md` §11'e yazılır: tarihli, "kullanıcı" etiketli, aynen. Uygulama ayrıntısı "§Na uygulama notu (yapan)" altına gider.
4. **Teşhis önce, sayıyla neden.** Düzeltmeden önce ölçülür. Brief'in varsayımı yanlış çıkabilir. Neden en az iki bağımsız deneyle sayıyla bulunur ve raporda "Teşhis: neden …?" bölümüne yazılır.
5. **Kasıtlı ihlal yok.** SERT bir ölçüm ihlali "muhtemelen kasıtlı" diye bırakılmaz. İhlalin yeri ve nedeni bulunur; düzeltilir ya da istisna önce sorulur. Animatikten önce kapanır.
6. **Her "giderildi" kare numarasıyla kanıtlanır.** Künyede "düzeltme" sütununun yanında "doğrulama (kare / probe)" sütunu bulunur.
7. **YAP / YAPMA.** Kapsam dışı iş yapılmaz. Görülen her kapsam dışı sorun `project.md` §12 borç kütüğüne yazılır.
8. **Değişmeyen kare değişmez.** Yalnız etkilenen aralık yeniden çizilir; diğer kareler `imgdiff 0` ile kanıtlanır (§5).
9. **Paylaşılan bileşene eklenen parametrenin varsayılanı eski çıktıyı verir.** Teslim edilmiş birimlerin tanık karelerinde probe farkı 0 olmalıdır.
10. **Yama dosyadan.** Heredoc ya da kabuk dizesiyle yama yapılmaz. Her yamadan sonra tek kare probe yapılır; sahne açılmıyorsa render'a geçilmez (DUR-6).
11. **Çıktılar `.part` → rename.** Kesilen iş `--resume` ile kaldığı yerden devam eder.
12. **Üç kez tekrarlanan bulgu kurala dönüşür.** Ölçülebilir bir kural ve kontrol olur (`/motion:promote`).

---

## 4. Akış (faz faz)

### 4.0 Genel sıra

```text
F0 kurulum ─► ses hattı ─► look-dev (yeni world) ─► sözlük ─► P1 … Pn perde akışı ─► master ─► teslim ─► retro/promote
              (varsa)       DUR: yön seçimi         DUR: onay   DUR: her perde teslimi    DUR       DUR
```

Perdeler sırayla tasarlanır. Bir perdenin tam render'ı arka planda koşarken bir sonraki perde tasarlanabilir; bu PARALEL iştir.

### 4.1 F0 — Kurulum (`/motion:init`)

**Mülakat.** Brief dosyasında ön bilgi (frontmatter) varsa soru sorulmaz (headless). Yoksa tek turda şunlar sorulur:

| konu | varsayılan | yazıldığı yer |
|---|---|---|
| brief (aynen) | — | `project.md` §1 |
| süre, format | 60 fps · 1920×1080 | `scenes.json` |
| profil | `full` | `scenes.json` `profile` |
| ses: kayıt / TTS / yok | — | §8, `scenes.json` `audio` |
| world: yeni look-dev / kütüphane world'ü | yeni look-dev | §6 |
| ekrana ne yazılır (metin kuralı) | — | §2 |
| aksan hakkı | — | §4 |
| yasaklar | — | §5 |
| malzeme ve lisans | — | §7 |
| üretken bütçe (kredi tavanı; 0 olabilir) | — | §9 |
| teslim biçimi | — | §0 |

**Komutlar:**

```bash
motion-render init <dir> [--world <örnek>] [--profile full|light|live] [--with-whisper]
motion-render vendor                 # React/ReactDOM/Babel + fontlar (lisans metniyle)
motion-render manifest validate      # scenes.json şeması
motion-render smoke                  # ffmpeg, Chromium, vendor → 12 kare 960×540 → qc → contact
motion-render doctor                 # ortam + Higgsfield oturumu + bakiye (yalnız okuma)
```

**Çıktılar:**

- proje kökünde: `project.md` (§0–§13, §1 aynen), `scenes.json` (sahnesiz; `manifest validate` world'ü denetler, ilk sahne eklenene dek "scenes boş" hatası verir — `init --demo` örnek sahneyle ✓), `CLAUDE.md`;
- `assets/gen/manifest.json` (ledger iskeleti);
- `docs/` şablonları (`REVIEWER.md`, `RETRO.md`, `RENDER_REPORT.md`, `KUNYE.md`, `RAPOR.md`, `FAZ.md`, `SOZLUK.md`, `SES-KAYMA.md`, `TESLIM.md`); `out/RENDER_REPORT.md` şablondan açılır ve yalnız sona eklenir (otomatik özet: `motion-render report` → `out/RENDER_SUMMARY.md`);
- `docs/INIT.md` kurulum raporu: kopyalanan · dönüştürülen · yazılan (şablon) · taşınmayan · malzeme · notlar.

**Malzeme.** Kullanıcı malzemesi **yol olarak** bağlanır; kopyalanmaz, taşınmaz, silinmez. Her malzeme için §7'ye şunlar yazılır:

- boyut, süre/fps, zemin, filigran;
- lisans notu (bilinmiyorsa "açık karar");
- kullanım yeri (öneri).

Kişi ya da üçüncü taraf içeren ya da lisanssız görsel kullanılmaz; motorla yeniden çizilir.

**DUR (F0):** kurulum raporu ve açık kararlar.

### 4.2 Ses hattı (ses varsa)

Ayrıntı `AUDIO.md`'dedir. **Ses yönetir:** kesme ve vuruşlar cümle sınırına ya da durağa kilitlidir.

```bash
# 1. ses: kullanıcı kaydı ya da TTS (TTS üretkense GENAI.md kuralları ve bütçesi geçerli)
motion-render transcribe materials/<ses>.wav --out script/<ad>            # kelime zamanları (Whisper isteğe bağlı)
motion-render transcribe verify <spec>                                    # klip doğrulaması
motion-render beats materials/<ses>.wav --words script/<ad>.words.json --out script/BEATS.md
# 2. shot listesi: kesme TC = cümle sınırı çevresindeki en uzun ölçülen sessizliğin ortası → scenes.json
# 3. ses sonradan değişirse:
motion-render audio-diff materials/<eski>.wav materials/<yeni>.wav         # zarf korelasyonu + kayma tablosu
motion-render amap build --anchors amap.config.json                       # tasarım zamanı ↔ yeni ses
```

- **Klip doğrulaması.** Whisper halüsinasyonu ayıklanır: şüpheli bölgeler farklı ışın genişliğiyle yeniden çözülür. Ham çıktı saklanır; düzeltmeler `meta.fixes` alanına yazılır. Metin farkı beklenen yerler dışındaysa **DUR** (DUR-8).
- **Olay ↔ kelime ≤ 1 kare.** Fiziksel olay (çentik, damga, çarpma) kelime başından en çok 1 kare sonra gelir ve olay anında tamdır.
- **Kayma kuralı.** `|Δ| ≤ 2 kare` (60 fps'te 33 ms) olan shot aynen kalır. Kayması daha büyük shot'lar eşlemle yeniden çizilir.
  - Etkilenen kareler tasarım listesinden değil ölçümle bulunur: kayma tablosu ve kare başı görünürlük.
  - Kayma iki bağımsız yoldan ölçülür: kelime çapaları ve zarf.
- **Tasarım zamanı korunur.** Eski perdeler eşlemle çevrilir; yeni perdeler doğrudan yeni ses zamanında tasarlanır.
- **Kayma belgesi.** Ses değişince `docs/SES-KAYMA-<ses>.md` yazılır (şablon `templates/SES-KAYMA.md`). **DUR 1:** kayma tablosu ve yeniden çizim planı, süre tahminiyle. DUR sırasında sesten bağımsız işler sürer.
- **Sessiz kuyruk.** Konuşma sonu + tutuş + ışık çekilişi + ≥ 4 kare siyah. Ses dosyasına düz dijital sessizlik eklenir. Kuyruk K3'e dahil değildir.

### 4.3 Look-dev (yeni world)

**Ne zaman:** world seçilmemişse ya da kullanıcı yeni world istiyorsa.

**Hedef:** üç gerçekten farklı yön (§1.2). Her yön filmin aynı üç kilit anında birer still verir: açılış, en yoğun an, kapanış ya da kahraman metin.

**Look-dev karesi:** kelimenin söylendiği an değil, shot'ta son yazılan öğenin yazımı bittikten birkaç kare sonrası.

1. **Yön taslakları** `world/lookdev/<yön>/` altında tutulur (geçici world.json + jsx). Seçilmeyen yönler silinmez; arşivlenir.
2. **Ölçüm** (her still):

   ```bash
   motion-render probe LOOK --frame a --frames b,c --out out/probe/look/<yön>.png   # b, c → <yön>-f000b.png, <yön>-f000c.png
   motion-render qc LOOK
   motion-render contact sheet out/probe/look/LOOK-sheet.png A1.png=A·açılış B1.png=B·açılış …
   ```

   Rapor tablosu:

   | yön | ayrışan eksenler | bant (luma %) | en düşük metin kontrastı | en küçük metin px | K1 alan/yükseklik | kenar düşümü | aksan ΔE2000 | §0.6 (yapan) | risk |
   |---|---|---|---|---|---|---|---|---|---|

3. **Font seçimi ölçümle.** Marka/logo yazısı varsa harf ölçüleri (gövde/H, genişlik/H, kontrast) adaylarla karşılaştırılır ve uzaklık raporlanır. Göz kararı seçim yapılmaz.
4. **Reviewer (kapı `lookdev`, kapı-id `LOOK-lookdev-r1`).** Taze reviewer'a still'ler ve yön başına `world.json` taslakları verilir; yukarıdaki ölçüm tablosu verilmez (yapan sayısıdır, rapora ve kullanıcıya gider). Reviewer kendi ölçümüyle bakar:
   - üç yön gerçekten farklı mı: altı eksenin 3'ünden azında ayrışan yön "yön değil, sürüm" → ELE;
   - her yönde durağan §0.6 (`n = 5`) ve durağan UCUZ maddeleri;
   - **UCUZ #11** (seçilmemiş world'e ya da önceki projeye benzerlik; beş eksen karşılaştırması);
   - yön başına **SEÇ / ELE** ve tek cümle kanıt. Seçimi yapanınkiyle uyuşmazsa açık karar olur.
5. **DUR — yön seçimi.** Kullanıcı birini ya da bir birleşimi seçer.
6. **World kaydı:**
   - `world/world.json` yazılır. `band` ve `k1.mask` **zorunludur**; palet, aksan sınıfı, font, kamera ve hareket eşikleri seçilen yönden ölçülür.
   - `world/lessons.md` ve `world/DECISIONS.md` (seçim gerekçesi) yazılır.
   - `motion-render manifest validate` çalıştırılır.
   - Bant görünüme uyar, görünüm banda uymaz: onaylı görünümün ölçülen bandı yazılır.

### 4.4 Sözlük (lexicon) kapısı

**Tasarımdan önce** her shot için nesne sözlüğü kullanıcı onayına gelir. Şablon: `templates/SOZLUK.md` → `docs/SOZLUK.md`.

- Sütunlar: shot · TC | cümle (aynen) | ekrana yazılan | nesne | ne çizilir (öğeler) | veriler | alet · işi.
- Başa ilke, yasak, veri dili, aksan ve perde planı satırları yazılır.
- Kaynaklı içerik (formül, veri, alıntı) **kaynaktan aynen** alınır; uydurulmaz. Aday gerekiyorsa `motion-research` aday tablosu çıkarır: A/B/C · kaynak + sayfa · ölçütler. **DUR 1** (aday seçimi).
- **Bilinen bir eleme kuralını önceden sor:** aday sunmadan önce kullanıcıdan gelebilecek eleme ölçütü sorulur.
- **DUR — sözlük onayı.** Onaylı sözlük bağlayıcıdır; sapma kullanıcı kararıdır. Düzeltmeler `project.md` §11'e tablo olarak işlenir.

### 4.5 P<n> — perde akışı (çekirdek döngü)

```text
sözlük ✓ → zaman + devir → izdüşüm kapısı → 3 varyant still/shot → [reviewer varyant turu] → seçim
→ animatik (K7, 960×540@30) → ölçüm → belgeler → bağımsız reviewer (animatik kapısı)
→ [tek düzeltme turu → yeni reviewer] → tam render (2×/S×) → expo-post → grade → qc → frame-check
→ contact → OURS/K1/K6 → ses → belgeler → reviewer teslim turu → kapanış belgeleri → rapor → DUR
```

#### Adım 0 — Faz açılışı

- Faz istemi okunur. KARARLAR `project.md` §11'e yazılır (§3.2-3). Bakiye okunur (`doctor`).
- `scenes.json`'a perde kaydı açılır: `frames`, `tc`, `slice`, `redQuota`, `layer.exit`, `keys`, `k1`, `checks`, `hooks`.
- Künye açılır: `docs/KUNYE-P<n>.md` (şablon `templates/KUNYE.md`).

#### Adım 1 — Zaman ve devir

- Shot sınırları ve vuruş kelimeleri BEATS'ten künyenin "Zaman" tablosuna yazılır: shot | ses | sayfa karesi (@fps) | vuruşlar.
- **DEVİR:** önceki perdenin son karesi bu perdenin ilk anahtarıdır.
  - Durağan devirde fark ≤ 2/255.
  - Hareketli devirde fark ≤ 1.1 × komşu kare farklarının büyüğü.

#### Adım 2 — İzdüşüm kapısı (render yok)

Sahne kancaları (`__boxes`, `__tools`, `__holds`, `__events`, `__camSpeed`) yazılır. Ardından:

```bash
motion-render frame-check P<n> --only framing,toolPath,overlap,camera [--cand aday.json]
```

- **Hata 0** olmadan varyanta geçilmez. Denetlenenler: kadraj payları, alet giriş/çıkışı ve hızı, örtme 0, kamera basamağı 0, K3 payı.
- Geometrik sınır (ör. kadraj payı) **aramayla** gösterilir: aday taraması `--cand`.

#### Adım 3 — 3 varyant still/shot

- Varyantlar gerçekten farklıdır (kamera açısı, kompozisyon, ışık çapası). Örnek dağılım: a önden · b eğik · c alçak açı.
- Varyant anahtarı kendi shot'unun içindedir ve kilit an shot ortasındadır. Shot sonunda ortak geçiş anahtarı baskın olur; varyantlar aynı çıkar.

```bash
motion-render probe P<n> --frame <kilit kare> [--frames <diğer kilit kareler>] --set VAR=a --out out/probe/<faz>/var/a.png   # b, c için tekrar
motion-render contact sheet out/probe/<faz>/S07-varyant.png a.png=a b.png=b c.png=c
```

- İzdüşüm kapısını geçmeyen varyant elenir; elenme gerekçesi künyeye yazılır.

#### Adım 4 — Varyant turu ve seçim

- Künye (zaman, yerleşim, aletler, kamera, ışık, varyant tablosu) önce güncellenir. Ardından taze reviewer (kapı `varyant`) **yalnız still'leri** inceler; künyeyi görmez. Yön başına SEÇ / ELE verir.
- Seçimi yapan ve reviewer ayrı ayrı verir. Fark varsa ana oturum iki gerekçeyi karşılaştırır; güçlü gerekçe kazanır ve rapora yazılır. Kaynak projede bir perdede altı shot'un beşinde reviewer'ın seçimi alındı (kadraj ve okunurluk gerekçesi).
- Kullanıcı ara notları künyede `| # | bulgu | durum |` tablosuna girer.
- `light` profilinde varyant seçimi animatik kapısında birlikte yapılır.

#### Adım 5 — Animatik (K7)

```bash
motion-render render P<n> --scale 0.5 --step 2 --tag animatic --progress   # 960×540 → out/frames/P<n>_animatic; step = fps / 30
motion-render expo-post P<n> --dir out/frames/P<n>_animatic --step 2      # yalnız sahne içi iniş/dip varsa
motion-render grade P<n> --animatic                                      # → out/scenes/P<n>_animatic.mp4 @fps/2
motion-render contact P<n> --dir out/frames/P<n>_animatic --fstep 2
motion-render ours P<n> --dir out/frames/P<n>_animatic --step 2
motion-render qc P<n> --frames-dir out/frames/P<n>_animatic --step 2   # etkin hız fps/2
motion-render frame-check P<n> --frames-dir out/frames/P<n>_animatic --step 2 --sheet   # piksel tipleri; tasarım tipleri --step olmadan
# sesli animatik: manifestte `animatic: {scale, step, fps}` alanlı animatik SAYFASI → motion-render grade <sayfa-id> [--audio P]
# (normal sahnede --audio hata verir, çıkış 2; tam sahneye ses: motion-render ses <id>)
```

- Ölçümler künyeye yazılır: K1, K3 shot başına, OURS, bant, aksan, devir.
- Kısmi animatikte de perde OURS'u tahmin edilir.
- 540p QC 60 fps'teki küçük metin titreşimini ve aksan ΔE'sini göstermez. **Tek aksan rengi grade sonrası tek karede, tam çözünürlükte erken ölçülür.**
- `qc` ve `frame-check`'in adım bayrağı yoktur: adımlı animatik dizininde kare sayısı HATA'sı (N/2 ≠ N) ve eksik kare beklenir, kare numaraları adımla ölçeklenmez (dosya k = sahne karesi 2k). Animatikte bu iki araç eğilim verir; kare numaralı kontroller (anahtar kareler, `range`) tam render ya da `k1 contrast`/probe karelerinde karara bağlanır.
- **Kapı turları animatikte yapılır**, üretken krediye dokunulmaz. Her turun bulgusu künyeye tablo olarak yazılır.

#### Adım 6 — Bağımsız reviewer (animatik kapısı)

- Kapı: §0.6 ≥ profil eşiği **ve** UCUZ 0 VAR.
- Akış §2.3'teki gibidir (kapı `animatik`, kapı-id `P<n>-animatik-r<k>`).
- GEÇMEZ ise tek düzeltme turunda yapanın künyesine şu tablo girer: `| # | reviewer bulgusu | ağırlık | r<k> düzeltmesi | doğrulama (kare / probe) |`. r2 reviewer'ına bu tablo verilmez; yalnız madde → durum listesi ve değişen kare aralıkları verilir (§2.2).
- ŞARTLI GEÇER ise şartlar kanıtla uygulanır ve aynı tabloya yazılır; yeni reviewer turu açılmaz, tam render başlar.
- Düzeltme turunda yalnız etkilenen aralık yeniden çizilir (`--range a-b --tag <T> --resume`; `--range` etiketsiz çalışmaz).
- **Kullanıcı animatik kapısı:**
  - projenin **ilk perdesinde** animatik kullanıcıya gider (DUR);
  - sonraki perdelerde faz istemi aksini demedikçe reviewer GEÇER kararı yeterlidir ("KAPI GEÇERSE DURMA").

#### Adım 7 — Tam render

- **Kare bütçesi:** kare sayısı × ölçülen s/kare.
  - Ölçüm temsilci karelerden yapılır; ilk kareden tahmin iyimser kalır.
  - Tahmin 20 dakikayı aşarsa iş aralıklara bölünür.
  - Disk ≥ 40 GB olmalıdır (§9).
- **2× kuralı:** kamera ölçeği k < 0.5 (genel bakış) olan aralıklar 2× süper örneklenir, kalanı 1×. Sınırda iki çözünürlük karışır:

  ```bash
  motion-render ss2 P<n> --plan                      # aralıkları göster
  motion-render ss2 P<n> --k 0.5 --pad 6 --blend 6   # 2× aralıklar + iniş + birleştirme
  ```

- **S× kuralı:** k ≥ 1.5 karelerde kahraman öğe kendi 3B katmanında S× dokuda çizilir (kenar ≤ 1.9 px). S değeri öğe türüne göre **ölçülerek** seçilir; tek değer her öğeye yetmez. Bu sahne kodunun işidir.
- Tek komut zinciri:

  ```bash
  motion-render run P<n> [--ss2] [--expo-post]   # render → (ss2) → (expo-post) → grade → qc → contact → ours
  # ya da adım adım:
  motion-render render P<n> --progress --frame-log
  ```

#### Adım 8 — Kare sonrası, QC ve ölçüm

```bash
motion-render expo-post P<n>          # kayan nokta pozlama + TPDF dither (siyaha iniş, sahne içi dip)
motion-render grade P<n>              # world grade zinciri; sahne sonu inişinde grade.fadeOut
motion-render qc P<n> --mp4 auto      # 16 kontrol (K1 dahil) → out/probe/P<n>-qc.json
motion-render k6 P<n>                 # K6 bileşen sayımı → out/probe/P<n>-k6.json (qc K6 ölçmez)
motion-render frame-check P<n> --mp4 auto   # checks[]: accentLocation, accentColor, sharpness, temporal, seam, luma, ramp …
motion-render contact P<n>
motion-render ours P<n>               # OURS / K3
motion-render ses P<n>                # sesli kopya
motion-render ses preview P1,P2,…,P<n>     # birleşik ön izleme
```

Künyeye `| ölçü | sonuç |` tablosu ve dikiş tablosu yazılır:

| dikiş | film s | önceki komşu | dikiş | sonraki komşu | ölçüt |
|---|---|---|---|---|---|

Ek ölçüm kuralları:

- Sahne sonu inişi ham karede **ve** mp4'te (Y düzlemi) ölçülür. Encode, ham karede olmayan basamak üretebilir.
- Aksan konumu kontrol edilir: izinli kutular dışında aksan pikseli 0.
- Logo ya da aksan tonu, teslim edilmiş diğer birimin **mp4'ünden** ölçülen tonla karşılaştırılır (ΔE2000).
- Ölçer, sonuca güvenmeden önce bilinen bir kontrol dosyasıyla kalibre edilir.

#### Adım 9 — Belgeler (reviewer'dan önce)

Güncellenenler: `scenes.json` (istisna ve "incelendi" kayıtları gerekçeli) · `project.md` kullanıcı kararları ve §13 istisna sicili · qc/fc json'ları (son kodla) — reviewer bunları okur. Aynı anda künye (render ve ölçüm bölümleri), §Na uygulama notu ve `out/RENDER_REPORT.md` (sona ekle) — reviewer okumaz, rapor ve teslim belgesi bunlardan beslenir.

#### Adım 10 — Reviewer teslim turu

Taze reviewer (kapı `teslim`) şunları alır: mp4, kare dizini, kontak, qc/fc json, devir kareleri, `scenes.json`, `world.json`, ledger, `project.md` ilgili §'leri ve bakılacak kare aralıkları listesi (yalnız aralık + konu). Künye ve yapan sayıları verilmez.

| karar | sonraki adım |
|---|---|
| **TESLİM GEÇER** | kapanış |
| **ŞARTLI GEÇER** | şartlar kanıtla uygulanır (yeni tur yok); kanıt rapora; sonraki kapı (master) doğrular |
| **GEÇMEZ** (r1) | tek düzeltme turu. Çoğu zaman encode ya da kısmi render; §5 protokolü uygulanır, yeniden ölçülür; taze reviewer r2 doğrular |
| **GEÇMEZ** (r2) | DUR: nedenler + kontak; teslim yok |

#### Adım 11 — Kapanış

1. `docs/REVIEWER.md` kaydı doğrulanır (`grep '^KARAR:'`); reviewer eklememişse `RECORD.md` aynen eklenir.
2. `docs/RETRO.md`'ye giriş eklenir.
3. `world/lessons.md`'ye bu fazın dersleri eklenir.
4. `out/RENDER_REPORT.md` güncellenir.
5. Bakiye okunur.
6. Videolar ve kontak kullanıcıya gönderilir (araç varsa) ya da yolları verilir.
7. Faz raporu yazılır (§7), ardından **DUR — Perde <n> teslimi**.

### 4.6 Master (bütün film)

**Önkoşul:** bütün perdeler TESLİM GEÇER; açık kararlar kapalı ya da borçta. Master fazı genellikle "kredi 0" fazıdır.

```bash
# 1. birleşik dizin: film kaydı (slice:false) için out/frames/<FILM>/ perde karelerine SABİT BAĞ (kopya değil)
#    sayfa ↔ dizin denetimi: birkaç kare probe ↔ dizin, fark 0
motion-render probe <FILM> --frame 0 --frames <sınır kareleri> --out out/probe/<faz>/film.png
# 2. film QC (tek sayfa, manifest global aralıklar)
motion-render qc film
motion-render ours <FILM> --no-cam
# 3. perde sınırında son 12 kare: fade/filtre kapanışı yok (perdeler slice:true)
motion-render frame-check <FILM> --only temporal        # at actBoundaries · window 12 · maxRatio 1.5
# 4. master: TEK SÜREKLİ encode (perde mp4'lerini uç uca eklemek dikişte sıçrama bırakır)
motion-render master --tag v<N>                        # ProRes 422 HQ 10-bit + H.264 CRF 16 + AAC
# 5. loudness: −16 LUFS entegre / ≤ −1 dBTP, sessiz kuyruk dahil ölçülür; doğrusal kazanç, sınırlayıcı yok
motion-render frame-check <FILM> --only loudness
# 6. seam12 master üzerinde + 7. bit-eşlik: değişmeyen kareler önceki master'la ProRes'te bit-aynı (rgb48)
motion-render frame-check <FILM> --only temporal,identical,accentColor   # src master; ref master:out/master/<film>_v<N-1>.mov
# 8. arşiv: FFV1 kayıpsız + framemd5 kare kare bit-exact; değişmeyen perdeler önceki arşive bağlanır
motion-render arsiv --tag v<N> --link-from v<N-1>
```

- Master ile perde mp4'leri arasında renk tutarlılığı ölçülür (işaretli ortalama fark).
- Son 8 kare Y = 16'dır (TV aralığı). Ham son kare 0'dır.
- Ardından teslim belgesi yazılır (§4.7). Taze reviewer (kapı `master`, karar seti TESLİM GEÇER / GEÇMEZ) kısa doğrulama yapar: kapsam maddeleri + dikişler + son kareler + önceki master ile bit eşliği + bütün film §0.6/UCUZ. Kendi ölçümüyle; `out/probe/` ve `out/measure/` sayıları referans değildir.
- Ardından rapor ve **DUR — master v<N>**.

### 4.7 Teslim

`docs/TESLIM.md` yazılır (şablon `templates/TESLIM.md`). İçerik:

- teslim dosyaları tablosu (dosya | biçim | ölçü);
- üretim komutları;
- zamanlama tablosu (shot | perde | ses | kare | ekran | yazılan | desen);
- kapı özetleri (perde | shot | son kapı | §0.6 | not);
- istisna sicili;
- ölçümler (bütün film);
- önceki ölçümler;
- bilinen borçlar;
- varlık notu (sha256);
- kredi.

Kurallar:

- **Reviewer GEÇER kaydı olmadan "FİNAL" yazılmaz.** Teslim belgesindeki kapı satırı REVIEWER.md'deki karar satırıyla aynı olmalıdır. Bekleyen tur "(bekliyor)" diye yazılır.
- Teslimden sonra "bu oturumda başka iş açılmaz" denmişse yeni iş yeni oturumda başlar.

### 4.8 Retro → `/motion:promote`

- **Her tur bir RETRO girişiyle kapanır** (şablon `templates/RETRO.md`). **Kök neden "dikkatsizlik" olamaz.** Hangi kontrolün neden yakalamadığı yazılır ve o kontrol düzeltilir.
- Dersler üç yere gider:

  | ders | gittiği yer |
  |---|---|
  | world'e özgü | `world/lessons.md` (faz başlığıyla) |
  | projeye özgü | `project.md` |
  | core aday | RETRO'da "core aday" etiketi |

- **`/motion:promote`** RETRO ve lessons'taki core adaylarını toplar:
  - tekilleştirir;
  - üç kez tekrarlanmışsa ölçülebilir kural + kontrol önerisi yapar;
  - A/B'si yoksa "deneme" etiketi koyar;
  - paket `LESSONS.md` / `RULES.md` için yama önerir.
- Proje içeriği (metin, marka, sözlük, kare) asla taşınmaz. **DUR:** kullanıcı onayı.

---

## 5. Kısmi yeniden render protokolü

Bir değişiklik birimin yalnız bir aralığını etkiliyorsa:

```text
1. TEŞHİS + ETKİ ARALIĞI   değerin girdiği bütün T aralığı ölçümle bulunur
                           (motion-render imgdiff stale <id> · probe ↔ kayıtlı kare). Tasarım listesine güvenilmez.
                           "Değişen ilk kare" hesaplanır (anahtar değişimi önceki kesiti de değiştirebilir).
2. YEDEK                   aralığın kareleri out/frames/<id>_<önceki faz>/ altına kopyalanır. SİLMEDEN ÖNCE.
3. ARALIĞI SİL             yalnız [a, b].
4. YENİDEN ÜRET            motion-render render <id> --range a-b --tag <faz> --resume   (2×/1× kuralı korunur)
5. TANIK KARELER           aralığın iki yanında ≥ 2 kare + aralık dışı örnekler:
                           motion-render imgdiff <yedek> <yeni>  ya da  frame-check <id> --only identical (ref = yedek, tol 0)
                           → fark 0. Değilse dur: başka bir şey değişmiş demektir.
6. KOPYA                   .part → rename ile yerine
7. ZİNCİR                  (expo-post) → grade → qc → frame-check → contact → ours → ses → seam
8. RAPOR                   "yeniden çizilen aralık · süre · değişmeyen kareler imgdiff 0 / ProRes bit-aynı"
```

- Yol seçimi: değişen kare oranı > %40 ise animatik yolu (tam tur); ≤ %40 ise doğrudan aralık.
- Paylaşılan bileşen değiştiyse teslim edilmiş bütün birimlerden tanık kare alınır.

---

## 6. DUR sözleşmesi

Varsayılan davranış "soru yok, işaretle ve devam"dır. Aşağıdaki durumlarda iş durur, rapor verilir ve onay beklenir.

| id | tetik | ne yapılır |
|---|---|---|
| DUR-1 | kullanıcı onay kapıları: F0 kurulum, look-dev yön seçimi, sözlük, aday seçimi, pilot (üretken), ilk perde animatiği, varlık kabulü (logo vb.) | teslim et ve dur; onaysız render yok |
| DUR-2 | bütçe: görev tavanı aşılacak · tahmin ↔ gerçek sapma > %10 · liste dışı model | dur ve sor |
| DUR-3 | bağlayıcı tablodan (pencere, shot, sözlük) sapma gerekiyor | önce sor |
| DUR-4 | analiz / yeniden teklif modu ("yalnız analiz", "uygulama yok") | sahne dosyası değişmez |
| DUR-5 | üretim aracı yok (istem sayfası yolu) | istem sayfasını yaz ve dur |
| DUR-6 | sahne açılmıyor (`[dc-runtime] x-import: FAILED`, sayfa hatası) | render'a geçme |
| DUR-7 | faz sonu: her faz "DUR: <teslim>" ile biter | rapor; sonraki faz yeni kullanıcı kararıyla |
| DUR-8 | ön koşul doğrulaması geçmedi (varlık vektör değil, ses metninde beklenmeyen fark) | DUR ve iste |
| DUR-9 | reviewer GEÇMEZ ve tek düzeltme turu da GEÇMEZ | kontak + nedenler; render yok |
| DUR-10 | SERT ihlal "kasıtlı" görünüyor | düzelt ya da önce sor; "kasıtlı" notuyla bırakma |
| DUR-11 | §0.6 eşiğin altında | render yok; look-dev / varyanta dön |

- **"KAPI GEÇERSE DURMA":** kapı geçerse akış sorgusuz sürer. DUR yalnız yukarıdaki tetiklerde ve faz isteminin DUR satırında vardır.
- DUR sırasında DUR'a bağlı olmayan işler sürdürülür ve raporda "DUR sırasında yapılanlar" bölümünde yazılır.
- Birden çok DUR numaralanır (DUR 1, DUR 2). Cevaplar faz kodu taşır: `F<n> DUR 1 RED → …`, `DUR 1b KARARI`.

---

## 7. Rapor biçimi (faz sonu)

Şablon: `templates/RAPOR.md`. Rapor ana oturumun faz sonu mesajıdır; aynı metin `docs/F<n>-RAPOR.md` olarak da kaydedilir.

**Bölüm sırası sabittir:**

```markdown
# F<n>[-X] · <kapsam>: <tek satır sonuç — "teslim" | "kapıda kaldı, render yok" | "DUR <k>: <neden>">

<Sonuç paragrafı, 2–4 cümle: ne bitti; bağımsız reviewer kararı **TESLİM GEÇER | GEÇER | ŞARTLI GEÇER | GEÇMEZ**
(§0.6 x/8, UCUZ geçer/sınırda); ilk turda engel varsa ne olduğu ve nasıl kapandığı;
"Kredi <k>, bakiye <önce> → <sonra>.">

**Teslim dosyaları:**                                  ← yalnız teslim/master fazlarında
- [<dosya>](<göreli yol>) — biçim, çözünürlük/fps, kare, süre; ses ölçümü (LUFS / dBTP)
- Arşiv: [<…>/ARSIV.json](…) — neyin yeniden kodlandığı, neyin bağlandığı; bit-exact doğrulaması
- Teslim belgesi: [docs/TESLIM.md](…)

## Kapılar                                             ← ya da Ölçümler / Maddeler / Geçişler
| kapı | sonuç |
|---|---|
| QC | hata 0 · n/n kare · fade … · parlaklık bandı … |
| K1 (kahraman) | x/x · <px> |
| K3 / OURS | <shot oranları> · OURS <x> · kamera tepe <px/kare>, basamak 0 |
| Aksan / istisnalar | <aralık sayısı> · konum taraması kutular dışında 0 |
| Devir / dikiş | <değer>/255 (ölçüt …) |
| Değişmeyen kareler | imgdiff 0 / ProRes bit-aynı |
| Bakiye | <önce> → <sonra> |

## <Faza özgü bölüm(ler)>
<Teşhis (sayıyla neden) · Düzeltme · Zaman tablosu · Dikişler · Kayma/plan tablosu · Büyütme karşılaştırması …>

## Ara notlarına yanıt                                  ← kullanıcı ara not gönderdiyse
1. **<not>:** <bulgu + yapılan; kalıcı derse/belleğe yazıldıysa söyle>

**Brief'ten sapmalar:**                                 ← varsa; her biri neden + sayı + "reviewer kabul etti/etmedi"
- **<konu>:** …

## Açık kararlar                                        ← "Kararın gereken noktalar" / "Senden gerekenler"; yoksa yazılmaz
1. **<konu>:** <durum + sayı>. Öneri: <…>. Etki: <yeniden render aralığı, süre, kredi>.

## Borç tablosu                                         ← film/teslim sonu fazlarında
| konu | durum (borç / kabul / çözüldü (F<n>) / kapandı) |

## Dosyalar                                             ← teslim dosyaları üstte verilmediyse
- Videolar · Kontak ve QC · Kod (yeni/değişen) · Belgeler: project.md §N/§Na, künye, REVIEWER, RENDER_REPORT, RETRO, world dersleri

## Katkı
- **<araç / yetenek / kural>:** ne eklendi, neden, nereye (world / araç / skill); paylaşılan bileşen varsayılanı eski çıktıyı veriyor mu (probe fark 0)
- **World'e işlenen dersler:** - …
- **Süreç dersi:** <kendi hatası → yeni kural>      ← "katkı yok" da geçerli bir değer

**DUR — <durulan nokta>.** <beklenen onay ya da karar>
```

**Doğrulanabilir kurallar:**

- `## Katkı` her raporda vardır. Görev başına 1–3 katkı yazılır; A/B'siz katkı "deneme" etiketi alır. Sahneye yazılan katkı yarım sayılır ve ortak dosyaya taşıma önerisi gerektirir.
- KAPALI KARAR'lar açık karar listesinde yer almaz. Borca devredilen karar borç tablosuna gider.
- Sayılar birimli verilir: px, /255, ΔE2000, LUFS, dBTP, kare, s, px/kare, %.
- Dosyalar göreli yol ya da göreli Markdown bağlantısıdır.
- Reviewer bulguları rapora karar ve sayı olarak taşınır. Yapanın puanı farklıysa fark yazılır ("yapan 7/8 · reviewer 8/8").
- Ölçü: 3–5,5 bin karakter, 45–80 satır, 1–3 tablo.
- Kapanış satırı her zaman `**DUR — …**` biçimindedir.
- Ara DUR raporunda başlık DUR'u taşır: `# F<n> · DUR 1: <konu>`. Ardından "Senden gerekenler" ve "DUR sırasında yapılanlar" bölümleri gelir.

---

## 8. Belgeler ve kim ne zaman yazar

Ayrıntı `DOCS-TEMPLATES.md`'dedir. Özet:

| an | belge |
|---|---|
| faz açılışı | `project.md` §11 kararlar |
| tasarım | künye (zaman, yerleşim, varyant) |
| her ölçümden sonra | künye ölçüm tabloları |
| **reviewer'dan önce** | scenes.json + project.md kullanıcı kararları + qc/fc json (reviewer okur) · künye + §Na + RENDER_REPORT (reviewer okumaz) |
| reviewer dönüşünde | reviewer kaydı `docs/REVIEWER.md` sonuna ekler; ana oturum `grep '^KARAR:'` ile doğrular |
| kapanış | RETRO, world/lessons.md, RENDER_REPORT, (teslimde) TESLIM, rapor |

---

## 9. Disk ve arşiv hijyeni

- **Disk.** Her tam ya da kesit render'dan önce çıktı diskinde ≥ 40 GB boş alan olmalıdır; altındaysa çıkış 6. 1080p kare ≈ 2 MB'tır; 60 fps'te 2 dakikalık film ≈ 14 GB tutar.
- **Tutulanlar:** teslim edilmiş birimin son kare dizini ve bir önceki sürüm (`out/frames/<id>_<faz>/`). Değişen aralık geri dönüşü bunlardan yapılır.
- **Silinebilenler:** animatik tur dizinleri (`*_A_r*`) ve tezgâh dizinleri, perde kabul edildikten (reviewer GEÇER + kullanıcı teslimi) sonra silinebilir; yeniden üretilebilirler.
  - Kalıcı silme kullanıcı kararıdır. Varsayılan, geri dönüşüme taşımadır; sayı ve GB raporda yazılır.
  - Boş alan 40 GB'ın altına inerse önce en eski animatik tur dizinleri gider.
- **Arşiv.** Master'dan sonra `arsiv` FFV1 kayıpsız ve framemd5 bit-exact üretir. Değişmeyen perdeler önceki sürüme bağlanır. Kaynak kare dizinleri arşivden sonra da silinmez; sonraki `--resume` işleri onlara bağlıdır.
- **Sürüm.** Önceki master'lar (`out/master/<FILM>_v<N-1>.*`) ve arşivleri tutulur. Teslim belgesi bunları "önceki sürümler" satırında listeler.
- **Değişmezler.**
  - Malzeme bağlantısı (`materials/`) silinmez, taşınmaz.
  - `out/RENDER_REPORT.md` ve `docs/RETRO.md` yalnız **sona eklenir**.
  - `assets/gen/manifest.json` elle düzenlenmez; tek yazarı `ingest`'tir.
- **Kilitli dosya.** Kullanıcının oynatıcısı bir mp4'ü kilitlediyse uygulama kapatılmaz; zaman damgalı yeni ad yazılır.

---

## 10. Kontrol listeleri

**Faz başı**

- [ ] Faz istemi okundu; KARARLAR → `project.md` §11 (aynen, tarihli); KAPALI KARAR'lar işaretli.
- [ ] Bakiye okundu (`doctor`); bütçe satırı hazır.
- [ ] DOKUNULMAZ listesi ve YAPMA maddeleri borca yazıldı.
- [ ] Disk ≥ 40 GB.

**Reviewer'dan önce**

- [ ] Künye, §Na, scenes.json ve RENDER_REPORT güncel.
- [ ] qc / frame-check / ours json'ları güncel; kareler kod değişikliğinden sonra render edilmiş.
- [ ] Reviewer istemi: kapı-id · brief aynen · yalnız çıktı + kural yolları · bakılacak kare aralıkları · "kendi yönteminle ölç" · künye, yapan sayısı, gerekçe ve puan YOK.

**Rapordan önce**

- [ ] `grep '^KARAR:' docs/REVIEWER.md` bu kapının satırını gösteriyor; teslim belgesi ile çelişmiyor.
- [ ] ŞARTLI GEÇER şartlarının her biri kanıtla uygulandı (künye + rapor).
- [ ] Her "giderildi" kare numarasıyla kanıtlı.
- [ ] Değişmeyen kareler imgdiff 0 / bit-aynı kanıtı var.
- [ ] RETRO girişi yazıldı (kök neden ≠ dikkatsizlik); world dersleri işlendi.
- [ ] Bakiye önce → sonra; ledger `match` doğru (kayıp varsa `lost[]`).
- [ ] Açık kararlar numaralı, öneri + etki ile; KAPALI KARAR yok.
- [ ] `## Katkı` var; kapanış `**DUR — …**`.
