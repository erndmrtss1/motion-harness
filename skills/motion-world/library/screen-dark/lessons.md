# screen-dark — world dersleri (ÖRNEK, varsayılan değil)

> Bu dosya bir **örnek** world'ün ders kaydıdır. Paket bu world'ü hiçbir projeye kendiliğinden vermez; yalnız kullanıcı açıkça isterse
> ve o zaman da projenin kendi look-dev ölçümleriyle uyarlanarak kullanılır (`../../SKILL.md` §8).
> Kaynak: önceki üretimin ekran dünyası belgesi, ortak bileşen kodu, kalıp denemeleri. Marka motifleri (imleç ve ikon biçimi), müşteri görseli,
> bölüm adlarına bağlı kurallar ve kart içerikleri çıkarıldı; imleç anonim bir glif, zemin dokusu yordamsal.

## Kimlik

- **Tek cümle:** ekran dünyası, masa dünyasıyla aynı karanlıkta.
- **Soğukluk anlatıdan gelir, renk sıcaklığından değil.** Soğuk fosfor yüzey + arduvaz + yeşil ızgara "her ekran grafiğine" benzedi ve kimliksiz
  bulundu; bu world sıcak siyah, sıcak koyu cam ve amber anahtarla kurulur. Soğukluk kaostan, sert yenilemeden, kayıp renginin tek rolünden gelir.
- **Cam:** ekranlı nesne = gövde + ışıyan veri. Gövde ışık katmanlarının altında (anahtarı alır); veri düşümün ÜSTÜNDE (`ScreenWorld.over`).
- **Izgara** düzenin işaretidir, ışık değil.

## world.json değerlerinin kaynağı

| alan | değer | kaynak | not |
|---|---|---|---|
| `band` | [12, 22] | ölçüldü | üç ekran sahnesi %12.51 / %16.01 / %12.68 |
| `profileBands.typographic` | [6, 14] | kural | tipografik sahne: bant %6–14 + okunacak display ≥ 72 px (sahne kaydı `profile: "typographic"`) |
| `edgeDark.maxFalloff` | 0.55 | türetildi | vinyet 0.35 × düşüm 0.3 → 1 − 0.65 · 0.7 ≈ 0.55; gri kartla doğrulanır |
| `k1` | dom · 0.30 / 0.50 | kural | koyu kahraman: DOM kutusu; sahne kaydında `hero: "dom"` (kadraj ölçüsü parlak bölge yerine DOM'dan) |
| `accent` | yer tutucu #D8301A · signal · 0 | kural (renk projeden; marka rengi kütüphaneye girmez, HK-37) | aksan sayılır; kayıp rengi (`bordo` sınıfı) ayrı ölçülür, oranla ayrılır, kenar karışımı düşülür |
| `camera.maxPxPerFrame` | 10 | varsayım | okuma mesafesi; bakış x ±40 px / 0.8 s — projede ölçülür |
| `motion.writeGlyphsPerSec` | 20 | kural | terminal yazımı ≈ 50 ms / harf |
| `motion.crtRate` | 30 | kural | CRT adımları 30 Hz ızgarasında (60 fps'te adım = 2 kare) |
| `motion.iconMinPx` | 20 | ölçüldü | 12 px ikon okunmadı |
| `motion.labelGapPx` | 16 | ölçüldü | etiket hapı veri çizgisinin ucundan 16 px; çizgiler önde |
| `motion.heroMinusSurroundMin` | 25 | kural (çekirdek) | kahraman − çevre ≥ 25/255 (ölçülen 25–53) |
| `motion.layerZ` / `layerTint` | 8–12 px · %1.2 | ölçüldü | gösterge levhaları arası Z; levha film tonu (11 × %3 süt grisine boğdu) |

## Işık ve renk

- **Anahtar ışık amber**, masa dünyasıyla aynı (üst-sol); şiddet bandı tutacak kadar. Gölgeler ışığın tersine (alt-sağ).
- **Fosfor YALNIZ veridir:** rakam, eksen, imleç, sparkline. Panel yüzeyi, ızgara, çerçeve, kenar, arka ışıma, zemin ışığı fosfor DEĞİLDİR.
- **Kayıp rengi ışık değildir:** çizgide, sayıda, etikette; yüzey en çok hafif ısınır (≤ %8). Bir göstergede tek role verilir.
- **Gösterge paleti (veri):** fosfor / fosfor açık / fosfor koyu / fog / gri-yeşil; ayrım ton değil çizgi tipi, kalınlık, opaklık. Sarı, altın, mavi, mor, turuncu yok;
  aksan kırmızısı gösterge rengi değildir.
- **Okunurluk sınırları:** fosforun göreli parlaklığı 0.36 → tam fosfor ancak zemin ≤ ~%18 iken 4.5:1; %60 fosfor koyu camda bile ≈ 3.2:1. Saf kayıp
  rengi (`lossInk`) hiçbir zeminde 4.5:1'e ulaşmaz (≤ 4.36:1) → okunacak kayıp metni `lossReadable` (üst) → `lossInk` (alt) gradyanı.
- **Işık düşümü veriyi karartmasın:** ışıyan veri bölgesi düşümden sonra da değerinin ≥ %80'i.
- **Flicker kare-kesin:** açılışta 2 adım, sert yenilemede 1 adım boş + yeni değer.

## Geçişler (fade yok)

| geçiş | uygulama |
|---|---|
| CRT açılışı | yatay çizgi (2 adım) → dikey açılış (scaleY 0.02 → 1, 3 adım) → 1 adım %140 parlama → değer (`scrCRT`) |
| CRT kapanışı | 1 adım %140, 3 adımda çöküş (0.42 → 0.11 → 0.02), 2 adım parlak çizgi, söner; ışıma ölçekten ayrı |
| Sert yenileme | 1 adım boş + yeni değer (panik, sayaç) |
| Sinyal kaybı | 2–4 kare tarama satırı kayması (±6–20 px şeritler) + gürültü, sonra siyah |
| İtiş (cam, kart) | kenardan translate (+400 → 0, 0.5 s inOut), gölge 0.08 s önce |
| Bulanıklıkla geri çekilme | dim yerine: blur 2–3 px + ölçek 0.98 + ışığın çekilmesi |
| Terminal yazımı | harf harf (≈ 50 ms), yazım imleci izler (`MH.typed`) |
| Kayarak giriş (şerit) | akış yönünden 2100 px → 0 / 0.2 s; yönlü bulanıklık 0.5 × kare başı yol (≤ 14 px); gölge birlikte |
| Display pop | ölçek 0.6 → 1 (pop eğrisi), opaklık ×4 eşlik eder, 0.24 s; pop boyunca `data-doku` |
| Işığın çekilmesi (sahne sonu) | karanlık cephe kenarlardan kahramana (yarıçap 1250 → 0, yumuşaklık 320 px, 0.2 s); kahraman en son pozlamayla söner |
| Durum değişimi | yerinde renk geçişi değil, tarama silmesi (sert kenar, 0.12 s) |

## Tuzaklar

| # | tuzak | ders |
|---|---|---|
| W-19 | Kart yağmurunda bütün karolara derinlik bulanıklığı | 1.5 px yalnız ≥ %60 örtülü karoya (net karo ≥ %70) |
| W-20 | CRT çizgisi scaleY ile ezilir | ışıması ölçekten ayrı çizilir (`ScreenFace` çizgi dalı) |
| W-21 | Sayaç yüzü CRT çöküşünde ölçülürse font geçici küçük çıkar | o kareler metin ölçüsünde inceleme kaydıyla |
| W-22 | Levha film tonu birikir (11 × %3 → süt grisi) | %1.2 |
| W-23 | Alt paneller zaman eksenini örter | yoğun anda doku (`data-doku`) |
| W-24 | Cam gövdesi ışıksız kalırsa başka nesne olur | gövde `over`'daysa anahtar ışığını üstüne ekle |
| W-25 | Fosfor yüzeye taşarsa dünya kimliksizleşir | fosfor yalnız veri |
| W-26 | Sıcak film tonu + fosfor ışıma zeytin/hakiye kaçar | levha film tonu nötr |
| W-27 | Cam yansıması CRT sarmalayıcısının içinde kalırsa çöküşte aydınlık şerit olur | yansıma camın (gövdenin) kendisidir, CRT'nin dışında |
| W-28 | 12 px ikon okunmadı | ikon ≥ 20 px |
| W-29 | Kayıp rengi yüzeye yayılınca "40 kırmızı plaka" okunur | kayıp rengi çizgide; plaka en çok hafif ısınır |
| s-01 | Işık düşümü kendinden ışıklı veriyi karartır | ışıyan veri `ScreenWorld.over`'da |
| s-02 | Koyu kartlar boşlukta: temas gölgesi görünmez, kare boş siyah sayılır | aydınlatılmış yüzey (`ScreenGround` + cam); koyu kahramanda `hero: "dom"` |
| s-03 | Gölge ışıyan yüzü karartır | gölgeler ayrı geçişte, karoların altında |
| s-04 | Ekran karosu kendi zemininden ayrılmazsa okunmaz | karo zeminden ≥ 25/255 parlak |
| s-05 | Anahtar ışık ekran içeriğiyle seyrelir (×1.2 anahtar +%7–13 okundu) | görünür hedef ölçülerek seçilir (×1.35 → +%23) |
| s-06 | Anahtar yansıması verinin arkasına düşerse veri okunmaz (3–3.5:1) | yansıma karonun veri olmayan tarafında (sağ-üst); veri ≥ 4.9:1 |
| s-07 | Şerit ışığı metnin arkasına düşer | ışık cam kenarlarında (üst/alt %20), metin satırı koyu |
| s-08 | Tek glifin satır kutusu kahramanı sulandırır (kutu 89×347, mürekkep 71×153) | `data-hero` mürekkep kutusunda |
| s-09 | Pop'un ilk karesi okunacak metin sayılır (opaklık %56'da 3.8:1) | giriş animasyonu boyunca `data-doku` |
| s-10 | preserve-3d'de katman sırası Z'dir, DOM sırası değil | örtü / kahraman Z'leri açıkça (ölçek telafili) |
| s-11 | Mürekkep kutusu drift'li kareden ölçülür | tasarım koordinatı = ölçülen − o karedeki drift (ya da orandan türet) |
| s-12 | Harf başına span ölçülmez | harf harf animasyonda metni tek düğümde tut (alt dizi yazdır) |
| s-13 | Koyu tema ekran görüntüsü kâğıda basılırsa kâğıdı siyaha boyar | negatif + gri baskı (bkz. desk-paper d-08) |

## Varsayılan olmamalı

Sıcak siyah cam, amber anahtar, fosfor veri ailesi, Saira Condensed display, CRT dili, kayıp renginin tek rolü bu world'e aittir. Yeni projede
"ekran" sahnesi varsa ekran dili look-dev'de yeniden seçilir; bu örneğin "soğuk değil sıcak karanlık" kararı yalnız bir kimlik çözümüdür.

## Paketlenirken çıkarılanlar

- Marka motifli imleç ve köşe ikonu (yerine: anonim çubuk imleç `ScreenCursor` — cevap anında çizgiye yatar; genel `ScreenIcon` ≥ 20 px).
- Müşteri görselinden gelen zemin dokusu (yerine yordamsal `ScreenGround`).
- Bölüm adına bağlı kayıp-rengi kuralı (genel kural kaldı: kayıp rengi tek rol, istisna sahne kaydında).
- Kart, şerit ve gösterge içerikleri; sahne künyeleri.
