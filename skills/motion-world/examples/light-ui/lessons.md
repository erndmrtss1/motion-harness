# light-ui — world dersleri (ÖRNEK, varsayılan değil)

> Bu dosya bir **örnek** world'ün ders kaydıdır; bu örnek yalnız `world.json` + ders olarak gelir, bileşen kodu yoktur. Paket bu world'ü hiçbir
> projeye kendiliğinden vermez; kullanıcı açıkça isterse ilkeller look-dev'de sıfırdan yazılır ve projenin kendi kareleriyle ölçülür (`../../SKILL.md` §8).
> Kaynak: önceki üretimde tek bir aydınlık arayüz sahnesi (üç cihaz ekranının yelpaze açılışı) ve onun grade provası. Üçüncü taraf tasarım dili
> belgesine dayanan token adları nötr adlara çevrildi; ürün adları ve ekran içerikleri çıkarıldı.

## Kimlik

- **Tek cümle:** düz, gölgesiz aydınlık arayüz vitrini.
- **Yüzey:** düz, gölgesiz, gradyansız kartlar; yarıçap 24–64 px; ince ya da sıfır sınır.
- **Derinlik gölgeden DEĞİL gelir:** ölçek farkı (öndeki büyük), örtüşme, paralaks (drift'te katman hızları), odak farkı (arka kart 1–2 px).
- **Aksan:** tek kromatik aksan (sahne manifestindeki hak kadar). Kaynak tasarım dilinin ek aksanları kullanılmadı.

## Dil (nötr token adlarıyla)

| token | değer | rol |
|---|---|---|
| `canvas` | #E5E5E5 | sayfa / kanvas zemini |
| `card` | #FFFFFF | kart yüzeyi |
| `ink` | #000000 | birincil metin, ters kart, buton |
| `surface2` | #F3F3F3 | ikincil yüzey |
| `hairline` | #C6C6C6 | ince çizgi, sınır |
| `textSecondary` | #979797 | ikincil metin (okunacaksa kontrastı ölç) |
| `subhead` | #444444 | alt başlık |

- **Tipografi:** display büyük harf kondens (ör. Saira Condensed 700; alternatif Anton / Barlow Condensed), satır 0.9, aralık −0.03em; gövde Inter;
  mikro etiket JetBrains Mono 12 px (doku); el yazısı imza yalnız alt satırda ve mat — Türkçe glif kontrolü zorunlu (ı, ş, ğ, İ).

## Işık

- Anahtar ışık nötr-sıcak, çok geniş ve yumuşak: kanvasa sol-üstten %4–6 aydınlatma (screen), düşüm %8–12 (multiply), sert havuz yok.
- Karanlık kontrolü bu world'de geçerli değil; yerine **patlama kontrolü**: luma > 250 piksel payı ≤ %35, beyaz kart iç ayrıntısı korunur (`world.json burst`).
- World katmanı: vinyet 0.12 (koyu world'lerde 0.35), gren %3 overlay.

## Grade — aydınlık zincir

1. curves `0/0 0.25/0.2450 0.5/0.5030 0.75/0.7520 1/0.985`: yumuşak S, beyaz noktası 251 (kart patlamasın).
2. colorbalance `rh=0.015:bh=-0.015`: hafif sıcak parlak.
3. vignette 0.4: hafif.
4. Siyah noktası YOK: kanvas grisi kalkmaz.

- **Varyant — koyu sahne + aydınlık ekranlar:** sahnenin zemini koyu, aydınlık olan yalnız ekranlar. Sahne kaydında `grade.blackPoint: true`:
  aydınlık zincir film siyah noktasıyla (10/9/8) birlikte, vinyetten sonra. Yoksa koyu zemin 2–5'te kalır, komşu koyu sahnelerle kesmede siyah kayar.
- Aydınlıktan koyu sahneye kesme: sahne sonu pozlama kapanışı (son kare siyah) → sonraki koyu sahne siyahtan.

## Kamera ve geçiş

- Drift 0.3. Ürün vitrini sakindir; hareketi yelpaze açılışı, itiş ve ölçek taşır.
- Fade yok: kartlar itilerek ya da ölçekle (0.96 → 1) + hareketle gelir; "dim" yerine bulanıklık 1–2 px + ölçek 0.98.

## QC

- **Bant** %30–55 (bant dışı UYARI); **patlama** (yukarıda); grade sonrası kanvas ortalaması ±3 içinde (film tutarlılığında aydınlık sahne kendi grubunda).
- Aksan yalnız manifest hakkı kadar.

## world.json değerlerinin kaynağı

| alan | değer | kaynak |
|---|---|---|
| `band` | [30, 55] | ölçüldü (tek sahne + grade provası) |
| `burst` | 250 / 0.35 | kural |
| `edgeDark.maxFalloff` | 0.23 | türetildi: vinyet 0.12 + düşüm 0.08–0.12 → 1 − 0.88 · 0.88 ≈ 0.23 |
| `k1` | dom · 0.30 / 0.50 | kural (çekirdek tabanı) |
| `camera.maxPxPerFrame` | 10 | varsayım — look-dev'de ölçülür |
| `motion.writeGlyphsPerSec` / `settlePx` | 12 / 2 | varsayım — look-dev'de ölçülür |

## Tuzaklar

| # | tuzak | ders |
|---|---|---|
| W-34 | Aydınlık sahneye koyu zincir (siyah noktası + 0.72 vinyet) uygulamak kanvası kirli griye çevirir, köşeleri karartır | world grade zinciri `light`; karışık sahnede `blackPoint` varyantı |
| W-35 | %4 overlay gren beyaz kartta kum gibi okunur | %3 |
| W-36 | Gölge eklemek bu dili bozar | derinlik ölçek, örtüşme, paralaks ve odaktan |
| W-37 | El yazısı imza fontunda Türkçe glif eksik olabilir | glif kontrolü (`frame-check glyph`) ilk look-dev karesinde |

## Bileşen kodu neden yok

Bu world'ün tek kaynak sahnesi proje içeriğine gömülüydü (ortak bileşen yoktu). Örnek olarak kod taşımak, içerik kalıntısı ve tek sahneye
fazla uymuş ilkel demek olurdu. Bu yüzden yalnız ölçülebilir sözleşme (`world.json`) ve dersler geliyor; ilkeller (kart, cihaz çerçevesi, yelpaze
düzeni, world katmanı) kullanıcı isterse look-dev'de yazılır ve `primitives` listesi o zaman doldurulur.
