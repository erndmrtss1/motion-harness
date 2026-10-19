# photo-plate — world dersleri (ÖRNEK, varsayılan değil)

> Bu dosya bir **örnek** world'ün ders kaydıdır; bu örnek yalnız `world.json` + ders olarak gelir, bileşen kodu yoktur. Paket bu world'ü hiçbir
> projeye kendiliğinden vermez; kullanıcı açıkça isterse kendi plakasıyla look-dev'de kurulur (`../../SKILL.md` §8).
> Kaynak: önceki üretimlerde gerçek görüntü (fotoğraf, stok video, kullanıcı görseli) üzerine kurulan sahneler ve plaka araçları. Bütün gömülü
> plakalar (portre, damga, zemin, kokpit vb.) ve onlardan türetilmiş matlar çıkarıldı — örnek, kullanıcının kendi plakasını işleyen boş bir akıştır.

## Kimlik

- **Tek cümle:** gerçek görüntü atmosfer ve malzemedir, bilgi değil.
- Sahnenin anahtar ışığı plakanın ışık yönüyle aynı taraftan gelir; plakada olmayan ışık eklenmez.
- **Gizem / okunmazlık:** fotoğraf öğesi hiçbir karede tam, düz ve net görünmez (kamera açılı ve hareketli; en az bir kenar kadraj dışında ya da
  odak dışı; net anı kısa, bir vuruş). Plaka üzerindeki yazı okunmaz (≥ 4 px bulanık, kırpık ya da açılı). Kişi yüzü ve kimliği belirgin kullanılmaz
  (stok değilse). "Orada bir şey var" yeter.

## 1. Plaka analizi (ölç, tahmin etme)

Her plaka için bir analiz betiği bir JSON + bir look-dev görseli üretir:

| ölçü | yöntem |
|---|---|
| Çözünürlük, fps, süre, ses | `ffprobe`; kullanılabilir bölüm (geçiş, filigran, kapanış kartı hariç) |
| Zemin türü | alfa var mı / yeşil oranı > %20 / ikisi de değil (luma) |
| Ufuk | gökten zemine geçilen ilk satır (sütun medyanı) |
| Konu maskesi | eşik + morfoloji + tohumdan bağlı bileşen |
| Işık yönü | en parlak %3 pikselin ağırlık merkezi (kare merkezine göre) |
| Bakış açısı | tepeden / göz hizası / eğik |
| Renk | ortalama ton, doygunluk, kırmızı/amber var mı (aksan hakkına sayılır) |

## 2. Uzantı (16:9'u doldurmak)

Sırayla dene: (1) ölçekle + kırp (konu güvenli alanda kalıyorsa); (2) kenarı plakanın kendi bulanık ve koyulaştırılmış kopyasıyla uzat
(ayna değil; %40 karartma + 24 px blur); (3) düz zemin rengine yumuşak maske (≥ %15 kenar geçişi). Uzantı ile plaka arasında dikiş görünmez:
geçiş maskesi plakanın içinde başlar.

## 3. Key / despill

| tür | yöntem |
|---|---|
| alfa | doğrudan (alfalı video / PNG dizisi) |
| yeşil perde | `g − max(r, b)` → alfa (yumuşak eşik 40…110); taşma `g ≤ max(r, b) + 6`; ffmpeg `chromakey 0.3/0.1` + despill |
| luma | fark matı: tüm karelerdeki en parlak/koyu değer arka plan; bağlı bileşen + kapatma + delik doldurma |

- Tint nesnenin dünyadaki rengine: parlaklık × hedef renk; kaynak beyazı ~245 → 1.
- Kenarlar titremesin: ardışık karelerde maske alanı ±%2 içinde. Döngü noktası: ilk kareye piksel farkı en küçük kare (≥ 0.5 s sonra).

## 4. Paralaks

Plaka en az iki katmana ayrılır (konu / arka plan; gerekirse orta). Hızlar arka plan %60, konu %100, ön öğe %130. Katman kenarı arkasında
boşluk kalmasın: arka plan konunun altında 20–40 px uzatılır. Miktar küçük: 4–12 px (büyük paralaks 2.5D karton kesiği gibi görünür).

## 5. Kaynak ve lisans

İndirilmiş sosyal medya içeriği filigran ya da kapanış kartı taşıyabilir: yalnız temiz bölüm, kırpımlarda filigran olmadığı görülür. Ticari kullanım
hakkı rapora "kullanıcı doğrulamalı" olarak yazılır. Gömülü varlık sahnenin yükleme listesine eklenir (dışa aktarım dış dosya çözmez).

## 6. QC

- **Bant** %12–28 (UYARI); plaka çözünürlüğü kadrajdaki ölçekte ≥ 1:1 (büyütme ≤ ×1.25; fazlası yumuşaklık olarak raporlanır); maske titremesi ≤ %2;
  kırmızı/amber plakada varsa aksan hakkına sayılır.

## world.json değerlerinin kaynağı

| alan | değer | kaynak |
|---|---|---|
| `band` | [12, 28] | ölçüldü |
| `edgeDark.maxFalloff` | 0.53 | türetildi: vinyet 0.28–0.35 × düşüm 0.22–0.28 → 1 − 0.65 · 0.72 ≈ 0.53 |
| `k1` | alpha · 0.30 / 0.50 | kural: koyu zeminde açık konu (maske = zeminden luma farkı) |
| `motion.light` | x 0.5, y 0.435, r 0.443 (tuval oranı), a 0.05 | kod (world katmanı); plaka ışık yönüne göre taşınır |
| `motion.upscaleMax` / `maskFlickerMax` / `loopMinGap` | 1.25 / 0.02 / 0.5 s | ölçüldü / kural |
| `camera.parallax` | 0.6 / 1.0 / 1.3 · 4–12 px · 20–40 px | kural |
| `camera.maxPxPerFrame`, `motion.writeGlyphsPerSec`, `settlePx` | 10 / 12 / 2 | varsayım — look-dev'de ölçülür |

## Tuzaklar

| # | tuzak | ders |
|---|---|---|
| W-37 | Dikey kaynak + yatay nesne (kâğıt dikey çekilmiş) | 90° döndür |
| W-38 | Stop-motion kaynakta ardışık aynı kareler: yeniden örneklemede kesik hareket | benzersiz kareleri seç (çekirdeğe yakın ders) |
| W-39 | 3B plaka (WebGL zemin, eğik kamera) denendi | terk: plaka düz kalır, derinlik katmanlarla |
| W-40 | İndirilmiş içerikte filigran / kapanış kartı | yalnız temiz bölüm; lisans raporda |

## Bileşen kodu neden yok

Kaynakta bu world'ün ortak bileşeni yoktu; mantık sahnelere ve plakaya özgü araçlara gömülüydü ve plakaların hepsi proje içeriğiydi. Örnek,
analiz → uzantı → key → paralaks akışını ve ölçülerini taşır; ilkeller (plaka katmanı, uzantı, paralaks yığını, world katmanı) kullanıcı isterse
kendi plakasıyla look-dev'de yazılır.
