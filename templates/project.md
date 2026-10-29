# <PROJE> — proje katmanı

> Bu dosya projeye özgü katmandır.
> - Çelişkide paketin **VARSAYILAN** kurallarının önündedir; **SERT** kuralların (ölçülenler) önünde değildir.
> - Kararlar tarihli ve kaynaklı yazılır: "kullanıcı" ya da "uygulama notu (yapan)".
> - **KAPALI KARAR** etiketli madde bir daha sorulmaz.
> - Doldurma: `/motion:init` mülakatı. `<…>` yer tutucudur; boş kalan alan "açık karar"dır.

## 0. Öncelik ve proje künyesi

| alan | değer |
|---|---|
| proje / film kimliği | `<FILM>` |
| profil | `full` \| `light` \| `live` (scenes.json `profile` ile aynı) |
| format | 1920×1080 · 60 fps (scenes.json tek kaynak) |
| süre hedefi | `<s>` |
| world | `world/world.json` — `<ad>` (look-dev F<n> ile seçildi \| örnek: `<ad>`) |
| ses | `<materials/…>` \| yok |
| teslim biçimi | `<ProRes 422 HQ + H.264 \| yalnız H.264 \| canlı sayfa>` |
| bağlayıcı sıra | kullanıcının son talimatı → onaylı sözlük/varyant/look-dev → bu dosya → scenes.json → world → paket skill'leri → script/ ve docs/ |

## 1. Brief (kullanıcı metni — AYNEN, değiştirme)

> <kullanıcının brief metni, harfiyen>

- Sonradan gelen ses ya da metin farkı brief'i değiştirmez; buraya tarihli not düşülür.

## 2. Kimlik okuması (yönetmen)

| alan | değer |
|---|---|
| tek cümle kimlik | <filmin taşıması gereken his, bir cümle> |
| world tarifi | <ışık · malzeme · ton · tipografi · kamera · geçiş dili — look-dev seçiminden> |
| aksan kullanımı | <aksan nerede, kaç kez> |
| kahraman | <her anda tek göz hedefi ne: tipografi / nesne / veri> |
| merkez görsel | <filmin omurgası> |
| metin kuralı | <ekrana ne yazılır: konuşulan kelime yazılır mı, hangi cümleler> |
| ses yönetir | evet: kesme ve vuruş cümle sınırına / durağa kilitli \| hayır |
| sert yasaklar | → §5 |

**Varsayılandan sapmalar** (paket varsayılanını tersine çeviren proje kararları):

| varsayılan | bu projede | gerekçe | karar (tarih, kaynak) |
|---|---|---|---|
| | | | |

## 3. Kalite çıtası

- **§0.6 zevk kapısı:** ≥ <7>/8. Profil varsayılanı full 7 · light 6 · live 7; proje yükseltebilir, düşüremez. Eşiğin altında render yok.
- **UCUZ taraması:** reviewer her kapıda 11 maddeyi tarar; biri VAR ise birim geri döner. Projeye özgü ek maddeler:

  | # | işaret | neden |
  |---|---|---|
  | 12 | <…> | <…> |

- **Kalite referansı (reviewer kalibrasyonu, zorunlu):** §0.6 puanı bu kliplere görelidir; tablo boşsa reviewer kapıda durur (DUR-1).

  | klip | neyin referansı | §0.6 maddeleri | not |
  |---|---|---|---|
  | <out/ref/….mp4 · kütüphane world demosu> | <hareket zanaatı · çizim · geçiş · kamera …> | <4, 5, 6 …> | <kaynak, süre> |

- **OURS tabanı:** hold ≤ 0.6 · hareketli ≥ 0.4 (ölçü hedefleri §10; kota UYARI sınıfıdır, RULES §0.8).
- **Tipografi zanaatı:**
  - optik boyut, satır ritmi, display tracking;
  - 3 seviye hiyerarşi;
  - "varsayılan" duran metin yok;
  - `text-transform: uppercase` yok; büyük harf doğrudan yazılır.
- **Tek düzeltme turu:** reviewer GEÇMEZ → bir düzeltme turu → yine GEÇMEZ ise DUR, render yok.

## 4. Palet, yazı, aksan

Değerler `world/world.json`'dandır. Burada yalnız projeye özgü sapma ve aksan hakkı yazılır.

| alan | değer | kaynak |
|---|---|---|
| aksan sınıfı | `<world.classes içindeki ad>` | world |
| aksan kotası | sahne başına `<n>` aralık (scenes.json `redQuota`) | proje |
| aksanın filmdeki yeri | <…> | kullanıcı |
| display font | <aile, ağırlık> (ölçümle seçildi: `docs/…`) | look-dev |
| marka rengi | <ölçülen medyan; ürün sayfası renkleri referanstır, film paleti değildir> | malzeme |

## 5. Yasaklar (sert)

| sınıf | yasak | ölçüm / denetim |
|---|---|---|
| kimlik / içerik | <…> | reviewer |
| kalite | §0.6 < eşik · UCUZ VAR · varsayılan duran metin | reviewer, qc |
| üretken | <insan/el/yüz/yazı, pilotsuz üretim, onaysız 3. varyant, sapma > %10, kara liste> | GENAI, ingest |
| aksan | kota aşımı; izinli kutular dışında aksan pikseli | qc, frame-check |
| SERT (paket) | fade yok (sahne sonu hariç) · son kare siyah · okunurluk · kadraj · basamak 0 | qc, frame-check |
| ses | kesme ve vuruş cümle sınırı dışında | AUDIO |

## 6. World

- Seçim: <look-dev F<n>, yön <A/B/C> \| kütüphane world'ü `<ad>` (kullanıcı seçti, tarih)>.
- `world/world.json` sürümü: <0.1.0>. Zorunlu alanlar: `band`, `k1.mask`.
- Bant: <[lo, hi]> — onaylı görünümden ölçüldü. Sayı görünüme uyar.
- Dersler `world/lessons.md`; seçim gerekçesi `world/DECISIONS.md`.

## 7. Malzeme ve lisans

Malzeme **yol olarak** bağlanır (`materials/`); kopyalanmaz, taşınmaz, silinmez.

| dosya | içerik | boyut / süre / fps | lisans notu | kullanım yeri (öneri) | durum |
|---|---|---|---|---|---|
| | | | <plan · tarih · kaynak \| bilinmiyor → açık karar> | | |

- Kişi ya da üçüncü taraf içeren, ya da lisansı belirsiz görsel kullanılmaz; motorla yeniden çizilir.
- Referans videolar yalnız öğrenme içindir.
- Marka varlığı (logo) vektör değilse DUR ve iste: raster izleme kenar dalgası verir.

## 8. Ses ve metin

| alan | değer |
|---|---|
| proje sesi (tek kaynak) | `scenes.json` `audio` = `<materials/…>` |
| transkript | `script/<ad>.words.json` (+ `.srt`, `.txt`, `.dogrula.md`); klip doğrulaması `meta.fixes` |
| vuruş haritası | `script/BEATS.md` (durak ≥ 250 ms; kesme TC = durak ortası) |
| eşlem | `script/<ses>.amap.json` (ses değiştiyse) |
| olay ↔ kelime | ≤ 1 kare |
| kayma kuralı | \|Δ\| ≤ 2 kare → aynen; aksi → eşlemle yeniden çizim |
| sessiz kuyruk | konuşma sonu + <0.8> s tutuş + <1.0> s ışık çekilişi + ≥ 4 kare siyah |
| loudness | −16 LUFS entegre / ≤ −1 dBTP, kuyruk dahil |

## 9. Üretken varlık

Bu bölümün makine kopyası `assets/gen/policy.json`'dur (GENAI.md). İkisi birlikte değişir.

| kural | değer |
|---|---|
| üretim | <yok (kredi 0) \| CLI yolu \| istem sayfası yolu> |
| film tavanı / rezerv | <kredi> / bakiye ≥ <kredi> |
| görev tavanı | <40> kredi (kategori: <…>) |
| model beyaz / kara liste | <…> (ajan değiştiremez; liste dışı = kullanıcı onayı) |
| önce pilot · önce taslak · önce ucuz | evet |
| sapma durdurma | tahmin ↔ gerçek > %10 → dur |
| varyant | shot başına ≤ 2; onaysız 3. varyant yok |
| klip süresi | ≤ <s>; donma ve ileri-geri yasak |
| içerik kuralı | üretken klip cümleyi anlatmaz, tek başına kare olmaz, motor katmanının altında kalır |
| kabul | kare kare (`motion-render ingest scan <id>`), bağımsız reviewer |

## 10. Ölçü hedefleri

| ölçü | hedef | araç |
|---|---|---|
| OURS hareketli / hold | ≥ 0.4 / ≤ 0.6 | `motion-render ours` |
| K1 kahraman | alan ≥ <%30> ya da yükseklik ≥ <%50>; display metin ≥ <px> | qc |
| K3 kamera | shot başına hareketli pay ≥ 0.4 (mutlak eşik %2 ekran/s) | ours, frame-check `camera` |
| okunurluk | metin ≥ 22 px; kontrast ≥ 4.5:1 (büyük display ≥ 3:1, kayıtla) | qc |
| bant | world `band` | qc, frame-check `luma` |
| devir | durağan ≤ 2/255 · hareketli ≤ 1.1 × komşu | frame-check `seam` |
| son 12 kare | ardışık fark oranı ≤ 1.5 | frame-check `temporal` |
| aksan tonu | ΔE2000 ≤ <3> | frame-check `accentColor` |
| alet hızı | ≤ <px/kare> | frame-check `toolPath` |
| render süresi | ≤ <s/kare> | `--frame-log` |

## 11. Faz kararları

Her faz iki alt bölüm açar. Kullanıcı kararı aynen yazılır; uygulama notu yapanındır.

### 11.F0 — F0 kararları (kullanıcı, <YYYY-AA-GG>)

| # | karar |
|---|---|
| 1 | <…> |
| DUR | <ne teslim edilir> |

### 11.F0a — F0 uygulama (yapan)

| konu | uygulama |
|---|---|
| | |

<!-- Sonraki fazlar: ### 11.F<n> — <kapsam> (kullanıcı, tarih) · ### 11.F<n>a — uygulama -->
<!-- KAPALI KARAR örneği: | 3 | <karar> — **KAPALI KARAR** (F<n>) | -->

## 12. Borç kütüğü

YAPMA maddeleri, kapsam dışı bulgular ve borca devredilen açık kararlar buraya yazılır.

| borç | kaynak (faz, bulgu) | neden ertelendi | ne zaman / koşul | durum (borç \| kabul \| çözüldü (F<n>) \| kapandı) |
|---|---|---|---|---|
| | | | | |

## 13. İstisna sicili

Kayıtlı istisnalar `scenes.json` `exceptions` / `review` kayıtlarıyla eş tutulur. Kural ile istisna ayrılır: kural her yerde geçerlidir, istisna tek yerdedir.

| # | yer (birim, kare / s) | istisna | gerekçe / ölçü | karar (faz, kaynak) |
|---|---|---|---|---|
| | | | | |
