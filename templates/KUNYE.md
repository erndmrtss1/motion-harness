# F<n> · Perde <p> künyesi (S<a>–S<b>, <t0>–<t1> s, <N> kare @<fps>) — <ses zaman alanı>

> Kararlar: `project.md` §<n>. Kod: `<p>.jsx` (+ paylaşılan: `<…>`). Sayfalar: `<P>.dc.html` (tam), animatik `--tag animatic`.
> Manifest `<P>`: `frames` <N>, `tc` <…>, `slice` <true|false>, `redQuota` <n>, `layer.exit` <s>, `review` <…>, `exceptions` <…>, `chromiumArgs` <…>.
> Seçim: S<a> <v> · S<b> <v> (yapan + bağımsız reviewer). Kurallar: K1–K8, ön plan, <proje ilkesi>.
> Bu künye yapanın belgesidir; **reviewer'a verilmez** (yalıtım). Rapor ve teslim belgesi buradan beslenir. Her "giderildi" doğrulama sütunuyla kanıtlanır.
> Künye yalnız sayı taşır (tablolar; anlatı ve gerekçe rapora da buraya da uzun yazılmaz). Her iş bir **değişiklik listesiyle** açılır (dokunulan katman · ilkel · kamera · plaka); ölçüm kapsamı ondan türer (PLAYBOOK §3.4 V1).

## Zaman (<ses>, `script/<ad>.words.json`)

| shot | ses (s) | sayfa karesi (@<fps>) | vuruşlar (kelime · s) |
|---|---|---|---|
| S<a> | <t0>–<t1> | <f0>–<f1> | "<kelime>" <s> · **"<vurgu>"** <s> |

**Devir:** önceki perdenin son karesi → bu perdenin ilk anahtarı. Ölçüt: durağan ≤ 2/255, hareketli ≤ 1.1 × komşu.

## Yerleşim (dünya px)

| öğe | konum |
|---|---|
| | |

## Bileşenler (K6)

| shot | motor bileşenleri (K6 ≥ 4) | katman (K2) | kamera (K3) | geçiş kalıbı | ışık olayı | ikincil hareket (≥ 2) | ilham (yalnız öğrenme) |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

**K8 notları:** başlama ofsetleri (≥ 3 kare), oturmalar (> 2 px), easing, gölge rengi, kıyas yolu.

## Aletler (tek tek; K8 izdüşümle)

| alet | zaman (s) | hareket (giriş → iş → çıkış) | tepe hız (px/kare) |
|---|---|---|---|
| | | | |

## Kamera

- Devir anahtarı: <konum, ölçek k, eğim>.
- Shot başına seçilen varyant ve yolu: <…>. Brief'ten sapma varsa gerekçe ve sayı.

## Işık

Havuz çapası sırası (nesneden önce varır): <…>. Sahne sonu: <iniş; expo-post>.

## Ölçümler (izdüşüm, render öncesi)

`motion-render frame-check <P> --only framing,toolPath,overlap,camera`:

- hata <0>;
- kamera tepe <px/kare>, basamak <0>;
- K3 shot başına <…>;
- aletler <…> px/kare;
- örtme <0>.

## Varyantlar

| shot | a | b | c |
|---|---|---|---|
| S<a> | <tarif> | <tarif> | <tarif> |

Still'ler: `out/probe/<faz>/S<a>-varyant.png` (tam çözünürlük `out/probe/<faz>/var/{a,b,c}-f….png`). İzdüşümü geçmeyen elendi: <…>.

## Varyant turu (reviewer: <seçim>) + kullanıcı ara notları

Seçim S<a> <v> · S<b> <v> (yapan: <…> · reviewer: <…>; fark varsa güçlü gerekçe: <…>).

| # | bulgu (kaynak) | durum |
|---|---|---|
| R1 | <…> (reviewer) | **uygulandı** — <ne, sayı> |
| K1 | <…> (kullanıcı) | **uygulandı** — <ne, sayı> |

## Animatik reviewer turu: <KARAR> (§0.6 x/8, UCUZ <…>)

Animatik: `out/scenes/<P>_animatic.mp4` (<kare>), kontak `out/probe/<P>-contact.png`.

- QC: <…>.
- K1 <x/x> (<kare %alan/%yükseklik …>).
- K3 <…>, OURS <…>, bant <…>.

## r<k> (bağımsız reviewer r<k-1>: <KARAR>, §0.6 x/8 → tek düzeltme turu)

| # | reviewer bulgusu | ağırlık | r<k> düzeltmesi | doğrulama (kare / probe) |
<!-- r2 reviewer'ına bu tablo verilmez; yalnız "madde → durum, kare aralığı" listesi verilir (sayısız). ŞARTLI GEÇER şartları da bu tabloya kanıtıyla yazılır; yeni tur açılmaz. -->
|---|---|---|---|---|
| 1 | <…> (f<a>–<b>) | yüksek | <…> | <f… ölçüm, kırpım yolu> |

## <fps> fps render (+ bütün film)

Render: `<komut zinciri>` — <aralık 2× (s/kare) · 1× (s/kare)>, birleştirme, expo-post, grade.

| ölçü | sonuç |
|---|---|
| QC | çıkış <0> · kare <N/N> · son kare ham <0> / mp4 <0> · fade <0> · bant ort. <%> |
| aksan | <n/quota> aralık · konum: izinli kutular dışında <0> |
| renk (ΔE2000, mp4 ↔ mp4) | <…> (≤ <3>) |
| K1 | <x/x> · display metin <px> |
| K3 / OURS | <shot oranları> · OURS <x> · kamera tepe <px/kare>, basamak 0 |
| son kare / iniş | <…> · en kötü fark/komşu <≤ 1.5> |

**Dikiş farkları** (ham kareler, /255):

| dikiş | film s | önceki komşu | **dikiş** | sonraki komşu | ölçüt |
|---|---|---|---|---|---|
| P<p-1> → P<p> | <s> | <…> | **<…>** | <…> | ≤ <2.00 \| 1.1 × komşu> ✓ |

## Teslim turu r<k> → <düzeltme>

<Reviewer bulgusu (sayıyla) → düzeltme → yeniden ölçüm sonucu.>

## F<m> · <değişiklik> (project.md §<…>)

**Teşhis:** <ölçü, sayıyla neden; denenen hipotezler>.

| uygulama | değer |
|---|---|
| | |

| ölçü | önce | sonra | hedef |
|---|---|---|---|
| | | | |

Render: değişen ilk kare f<…>; <a–b> yeniden; <tanık kareler> önceki sürümle aynı (imgdiff 0). Önceki sürüm `out/frames/<P>_<faz>`.
