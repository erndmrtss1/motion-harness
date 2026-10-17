# REVIEWER — bağımsız reviewer kaydı ([ÖRNEK] film) — seçki

> **[ÖRNEK] Kaynak projenin reviewer kayıtlarından anonimleştirilmiş seçki**, yeni kayıt biçimine (`templates/REVIEWER.md`, `skills/motion-reviewer/SKILL.md` §10) yerleştirildi.
> - Kararlar, §0.6 puanları, kare numaraları ve ölçüler gerçektir. Kelimeler, nesneler ve marka `[ÖRNEK]` ile değiştirildi; alet adları genelleştirildi (alet A/B/C).
> - Kaynak kayıtlar şablondan eskidir:
>   - Tur numaraları kapı başına yeniden sayıldı (r1/r2).
>   - UCUZ alanı kaynakta yoksa ve VAR bulgusu yazılmamışsa `UCUZ geçer` yazıldı. #11 o tarihte taranmıyordu.
>   - Kaynakta "ana oturum notu" olarak kayda karışmış yapan bilgileri kayıttan çıkarıldı. Bunlar bu önsözde, kayıt dışı olarak duruyor.
>
> **Gösterdiği üç zincir:**
>
> 1. **P2 animatik.** r1 GEÇMEZ → tek düzeltme turu → r2 **ŞARTLI GEÇER**.
>    - Şart: logo tutuşunda sol kenarda kesik harf.
>    - *Kayıt dışı:* yapan şartı kanıtla uyguladı (kamera x 1032 → 1000, d 380 → 350; x/d/eğim ızgara taraması; tam çözünürlük probe f492 / f534 / f576'da en soldaki mürekkep x 22 / 21 / 21 px, köşelerde zemin yok). **Yeni reviewer turu açılmadı**; tam render başladı. Şart P2 teslim kapısında doğrulandı.
> 2. **P3 animatik.** r1 GEÇMEZ → tek düzeltme turu → r2 de **GEÇMEZ** (tek engel) → **DUR, render yok**.
>    - *Kayıt dışı:* yapan engeli kanıtladı; şartlı geçişi kullanıcı verdi. Ardından **P3 teslim** r1 GEÇMEZ (örtme) → düzeltme → r2 **TESLİM GEÇER**.
> 3. **Bütün film (master).** r1 **GEÇMEZ** → P1'de 3 aralık kısmi render + master v2 → r2 **TESLİM GEÇER**.
>    - Kaynakta r1 "F9 kapsamı GEÇER · teslim öncesi 1 açık karar" diye kaydedilmişti. Yeni karar sözlüğünde (SKILL §8) kayıtsız SERT ihlali GEÇMEZ yapar; kullanıcı da kaynakta düzeltmeyi seçmişti.
>
> `grep '^KARAR:' docs/REVIEWER.md` çıktısı (kayıt tablosu budur):
>
> ```text
> KARAR: GEÇMEZ · §0.6 7/8 · UCUZ geçer · kapı animatik full ≥7/8 · tur r1 · birim P2
> KARAR: ŞARTLI GEÇER · §0.6 8/8 · UCUZ geçer · kapı animatik full ≥7/8 · tur r2 · birim P2
> KARAR: GEÇMEZ · §0.6 5/8 · UCUZ geçer · kapı animatik full ≥7/8 · tur r1 · birim P3
> KARAR: GEÇMEZ · §0.6 8/8 · UCUZ geçer · kapı animatik full ≥7/8 · tur r2 · birim P3
> KARAR: GEÇMEZ · §0.6 8/8 · UCUZ geçer · kapı teslim full ≥7/8 · tur r1 · birim P3
> KARAR: TESLİM GEÇER · §0.6 8/8 · UCUZ geçer · kapı teslim full ≥7/8 · tur r2 · birim P3
> KARAR: GEÇMEZ · §0.6 8/8 · UCUZ geçer · kapı master full yok · tur r1 · birim FILM
> KARAR: TESLİM GEÇER · §0.6 8/8 · UCUZ geçer · kapı master full yok · tur r2 · birim FILM
> ```

---

## Kayıtlar

## <tarih> · P2 · animatik · r1: GEÇMEZ
KARAR: GEÇMEZ · §0.6 7/8 · UCUZ geçer · kapı animatik full ≥7/8 · tur r1 · birim P2

Güncellik: anahtar kare probe ↔ kayıtlı kare fark 0 · Kapsam: animatiğin tamamı; kontrast tam çözünürlükte probe ile (animatik QC'sinin 1.05:1 uyarıları ölçüm uyumsuzluğu) · Yöntem: kenar payı ve örtme kırpımları 540p + 1080p, `out/review/P2-animatik-r1/m-*.mjs`

### Kontroller
| madde | sonuç | kanıt |
|---|---|---|
| QC / frame-check (yönlendirici) | geçti | kontrast uyarıları tam çözünürlükte tutmuyor (ölçüm uyumsuzluğu) |
| devir | geçti | P1 son ↔ P2 ilk 1.49/255 |
| SERT: aksan | geçti | yalnız logo |
| SERT: kadraj | **kaldı** | iki kelimenin noktaları ve üst kenarı kesik (35.0–36.4 s, toplu tutuş) |
| K1 / K3 / K6 | geçti | — |
| metin (harfiyen) | geçti | tek geçiş 38.5–39.7 |

### §0.6: 7/8 (eşik ≥7/8)
| # | madde | evet/hayır | kanıt |
|---|---|---|---|
| 1–7 | derinlik · malzeme · yönlü ışık · ikincil hareket · easing ağırlığı · bilinçli hold · tek kahraman | evet | — |
| 8 | anlamlı boşluk | **hayır** | toplu tutuşta boşluk kahramanı taşımıyor |

### UCUZ: geçer

### Ön plan
| shot | nesne | bağlı | gölge | örtme | bulanıklık | hata görünümü |
|---|---|---|---|---|---|---|
| S08 | alet C | evet | evet | **evet** (gövde başlık satırını örtüyor, 38.43–39.3) | evet | hayır |

### Hata gibi görünen öğe
- 35.0–36.4 s · kesik kelime (üst kenar) · kırpım `out/review/P2-animatik-r1/`

### En zayıf anlar
| # | kare · s | bulgu | sınıf |
|---|---|---|---|
| 1 | 35.0–36.4 | iki kelimenin üst kenarı kesik | zorunlu |
| 2 | 38.43–39.3 | alet C gövdesi başlık satırını örtüyor | zorunlu |
| 3 | perde sonu | hız sıçraması, tutuş yok | zorunlu |
| 4 | logo tutuşu | S07 kelimeleri yarım kesik | isteğe bağlı |
| 5 | sağ kenar | ≤ 10 px zemin kaması | isteğe bağlı |

### Somut düzeltme listesi
| # | kare aralığı | sorun | ölçüt | nasıl doğrulanacak |
|---|---|---|---|---|
| 1 | 35.0–36.4 s | kelime üst kenarı kesik | glif kutusu kadraj içinde, tepe payı > 0 | izdüşüm + tam çözünürlük probe |
| 2 | 38.43–39.3 s | alet gövdesi metni örtüyor | metin örtmesi 0 | izdüşüm kesişimi + kırpım |
| 3 | perde son 1 s | hız sıçraması | ardışık hız farkı oranı ≤ 1.5; sonda tutuş | kare başı yer değiştirme serisi |
| 4 | logo tutuşu | yarım kelimeler | kadrajda tam kelime ya da tamamen dışarıda | anahtar kare probe |
| 5 | sağ kenar | zemin kaması | zemin 0 (12 px pay) | kenar kırpımı |

### Küçük notlar (teslimi durdurmaz)
- İki etiket aynı anda beliriyor; son karede bir kutu yarım (bağlam).

### Açık kararlar (kullanıcıya)
- Varyant: S08 a onay; S07 a koşullu onay (madde 1 şart).

Proje dosyalarına dokunmadım. Kanıt: out/review/P2-animatik-r1/

## <tarih> · P2 · animatik · r2: ŞARTLI GEÇER
KARAR: ŞARTLI GEÇER · §0.6 8/8 · UCUZ geçer · kapı animatik full ≥7/8 · tur r2 · birim P2

Güncellik: değişen aralıklar yeniden render edilmiş (probe ↔ kayıtlı 0) · Kapsam: r1 listesinin 5 maddesi + değişen kare aralıkları · Yöntem: kendi kırpımları, `out/review/P2-animatik-r2/`

### Tek düzeltme turu doğrulaması
| madde | r1 bulgusu | r2 ölçümü | kapandı mı |
|---|---|---|---|
| 1 | kelime üst kenarı kesik | toplu tutuşta kelime tepesi 28–36 px (1080p); kesik yok | evet |
| 2 | alet metni örtüyor | alet çıkışı aşağı; metin örtmesi 0 | evet |
| 3 | sonda hız sıçraması | itiş çan eğrisi, 41.17'de oturuyor, tutuş 0 px/kare | evet |
| 4 | logo tutuşunda yarım kelimeler | bir kelimenin ilk harfi hâlâ sol kenarda | **kısmen** |
| 5 | sağ kenar kaması | büyük ölçüde kapandı | evet |

Yeni değişiklikler yeni hata getirmedi. Alet A tepe noktasında kelime tabanının ≈ 8 px (540p) altında kalıyor; metin örtülmüyor.

### §0.6: 8/8 (eşik ≥7/8)
Anlamlı boşluk artık evet: geri çekilmede başlık bloğu çiziliyor.

### UCUZ: geçer

### Somut düzeltme listesi (şart — render öncesi)
| # | kare aralığı | sorun | ölçüt | nasıl doğrulanacak |
|---|---|---|---|---|
| 1 | 38.10–39.90 s (logo tutuşu) | bir kelimenin ilk harfi sol kenarda kesik | en soldaki mürekkep x ≥ 12 px; köşelerde zemin 0 | kamera anahtarı + izdüşüm + 2–3 tam çözünürlük probe |

Proje dosyalarına dokunmadım. Kanıt: out/review/P2-animatik-r2/

## <tarih> · P3 · animatik · r1: GEÇMEZ
KARAR: GEÇMEZ · §0.6 5/8 · UCUZ geçer · kapı animatik full ≥7/8 · tur r1 · birim P3

*(seçki: gövde kısaltıldı)* Geçenler: K1 (9/9), K4–K7, devir (2.13/255, 540p), aksan (0), bütçe (kredi 0). Hataların güncel kodda olduğu 10 tam çözünürlük probe ile doğrulandı (fark 0.8–1.16/255).

### Somut düzeltme listesi (10 madde; seçki)
| # | kare aralığı | sorun | ölçüt | nasıl doğrulanacak |
|---|---|---|---|---|
| 1 | 47.61 · 49.88–50.24 s | alet C tek karede beliriyor, kaybolup yeniden beliriyor, kelimeyi örtüyor | tek kare değişim 0; metin örtmesi 0 | ardışık kare şeridi + izdüşüm |
| 2 | 53.38 / 53.58 s | işaretçi havada (gölge kopuk); olay kelimeden geç | temas gölgesi; olay ↔ kelime ≤ 1 kare | kırpım + olay karesi |
| 3 | S10 | K3 0.301 | ≥ 0.4 | `__camSpeed` kendi ölçümü |
| 4 | geçişler | ara anahtar hız basamakları (35 → 20) | basamak 0 | kare başı hız serisi |
| 5 | üst kenar | kelime noktaları kenardan 8–16 px | glif kadraj içinde | probe |

Proje dosyalarına dokunmadım. Kanıt: out/review/P3-animatik-r1/

## <tarih> · P3 · animatik · r2: GEÇMEZ
KARAR: GEÇMEZ · §0.6 8/8 · UCUZ geçer · kapı animatik full ≥7/8 · tur r2 · birim P3
DUR: tek düzeltme turu tükendi, render yok

Güncellik: değişen aralıklar yeni · Kapsam: r1'in 10 maddesi · Yöntem: kamera ölçümü 540p30 kendi betiği, `out/review/P3-animatik-r2/m-cam.mjs`

### Tek düzeltme turu doğrulaması
| madde | r1 bulgusu | r2 ölçümü | kapandı mı |
|---|---|---|---|
| 1–9 | işaretçi · alet A yönü · kamera basamakları · K3 shot başına · oda ölçeği · rack · tek kahraman · etiketler · tepe payı | geçişler çan eğrisi, basamak yok, tepe ≈ 23 px/kare; ani belirme/kaybolma 0; K1 9/9; K6 21/27/28/27; tepe payı 48 / 46 px | evet (tepe payı "büyük ölçüde") |
| 10 | alet örtmesi | k192–220 (47.9–48.6 s) alet kapağı bir kelimenin iki harfinin ayaklarını **12–15 px örtüyor**. Aletin 3B yüksekliği (gövdeler ucun ≈ 46 px üstünde) hesaba katılmamış | **hayır** |

### Ön plan
| shot | nesne | bağlı | gölge | örtme | bulanıklık | hata görünümü |
|---|---|---|---|---|---|---|
| S10 | alet C | evet | evet | **evet** (12–15 px, metin) | evet | hayır |

### Somut düzeltme listesi
| # | kare aralığı | sorun | ölçüt | nasıl doğrulanacak |
|---|---|---|---|---|
| 1 | k192–220 (47.9–48.6 s) | alet kapağı metni örtüyor | metin örtmesi 0 (3B yükseklik dahil) | izdüşüm + tam çözünürlük probe 47.9–48.8 |

### Küçük notlar (teslimi durdurmaz)
- S11 → S12 0.4 s boş geçiş (59.7–60.3).
- Tutuşta üst kenarda önceki perdenin başlık bloğundan bir satır.
- Devir 2.12/255 (540p; ardışık kare 2.08 düzeyinde).

### Açık kararlar (kullanıcıya)
- Engel tek parametreyle kapanır. Şartlı geçer sayılması ya da yeni tur kullanıcının kararıdır.

Proje dosyalarına dokunmadım. Kanıt: out/review/P3-animatik-r2/

## <tarih> · P3 · teslim · r1: GEÇMEZ
KARAR: GEÇMEZ · §0.6 8/8 · UCUZ geçer · kapı teslim full ≥7/8 · tur r1 · birim P3

Güncellik: kayıtlı ↔ güncel kod probe 0–0.01/255 · Kapsam: 60 fps render; **485–876 henüz yok** (ölçülemedi).

- Şart bölgesi (sayfa 379–433, τ 47.90–48.80) kare kare temiz: alet sağ kenardan giriyor (f359 uçlar, f360–364 gövde; tek kare belirme yok), üst kapak kelime tabanının ≈ 20–25 px altında, harf örtmesi 0, gölge var, bulanıklık ≤ 2 px.
- K1 9/9 (en düşük kelime 162 px, sınırda) · K4/K5/K6 geçer · K8 sıçrama 0 · devir 1.32/255.

### Hata gibi görünen öğe
- 950–964 (≈ 0.12 s) · S11 aleti bir etiketi örtüyor · kırpım `out/review/P3-teslim-r1/`

### Somut düzeltme listesi
| # | kare aralığı | sorun | ölçüt | nasıl doğrulanacak |
|---|---|---|---|---|
| 1 | 950–964 | alet etiketi örtüyor | örtme 0 | kırpım |
| 2 | 485–876 | render eksik | K3 S10 ≥ 0.4; 876/877 dikişi komşu düzeyinde | yeniden render sonrası kendi ölçüm |

### Küçük notlar
- Kahraman kontrastı f962 / f1042 22.8 / 20.7 (çizgi çizimi; ölçüm etkisi) → `review.kontrast` kaydı ile kabul.

Proje dosyalarına dokunmadım. Kanıt: out/review/P3-teslim-r1/

## <tarih> · P3 · teslim · r2: TESLİM GEÇER
KARAR: TESLİM GEÇER · §0.6 8/8 · UCUZ geçer · kapı teslim full ≥7/8 · tur r2 · birim P3

Güncellik: 13 probe ↔ saklı kare 0–0.01/255.

### Tek düzeltme turu doğrulaması
| madde | r1 bulgusu | r2 ölçümü | kapandı mı |
|---|---|---|---|
| 1 | etiket örtmesi | etiket alet sağdayken yazılıyor (f972–990); örtme 0 | evet |
| 2 | 485–876 eksik | boşalma f508–545; alet çıkışı f565/566 (yeniden görünmüyor); işaretçi f640 giriş / çentik f700 (+70 ms) / nokta f710; kelime tam f749–790 (≈ 0.68 s); varış f633 yumuşak; S10 → S11 çan eğrisi (tepe ≈ 20); K3 S10 0.408; dikişler komşu düzeyinde | evet |

### Küçük notlar (teslimi durdurmaz)
- Kahraman kontrastı ölçüm etkisi (kayıtlı), ivme uyarısı, S11 → S12 kısa boş yüzey (cila), çentik +70 ms.

Proje dosyalarına dokunmadım. Kanıt: out/review/P3-teslim-r2/

## <tarih> · FILM · master · r1: GEÇMEZ
KARAR: GEÇMEZ · §0.6 8/8 · UCUZ geçer · kapı master full yok · tur r1 · birim FILM

Kapsam: iki cila maddesi + bütün film (master v1) · Yöntem: master mp4 160×90 ardışık fark, 1080p kare kırpımları, kendi betikleri.

### Kontroller
| madde | sonuç | kanıt |
|---|---|---|
| cila 1: çizgi kenarı ±0.5 px dalga | geçti | 1080p'de mürekkep gibi okunuyor; dalga dünya x'ine bağlı, zamanla değişmiyor. Bantta ardışık fark ort. 4.62 (öncesi 4.96). ΔE2000 2.2–2.99 (≤ 3). Aksan 1/1 |
| cila 2: pozlama −%1.5 | geçti | kazanç oranı f216–340: 1.0000 → 0.9849 → 1.0000; en çok 0.0013/kare; kare ortalaması farkı ≤ 0.19 Y |
| master mp4 | geçti | 7038 kare, 117.30 s, 60 fps; −16 LUFS / −4.2 dBTP (kuyruk dahil) |
| master mov | geçti | ProRes 422 HQ 10-bit; son kareler 10-bit siyah (64) |
| kuyruk | geçti | 7010–7029 iniş 0.2–3.5 Y/kare düzgün; 7029–7037 Y = 16 |
| dikişler (master) | geçti | 1791: 1.15 → 0.24 · 2423: 0.38–0.40 · 3845: 0.03 → 0.96 · 4970: 3.1 (hareket içinde) · 6286: 0.09–0.15; önizlemedeki encode sıçraması masterda yok |
| SERT: K8 (tek karede beliren öğe) | **kaldı** | f236 (aşağıda) |

### §0.6: 8/8 (bütün film)

### UCUZ: geçer

### Hata gibi görünen öğe
- f236 · 3.93 s · S01 → S02 öncesi çubuk **tek karede** değişiyor: bölme çizgisi, kalın çerçeve, gölge ve tarama aynı karede beliriyor. Ham P1 karelerinde de var (235→236 fark 4.58, komşular 0.6–0.8). Kırpım `out/review/FILM-master-r1/`.

### En zayıf anlar
| # | kare · s | bulgu | sınıf |
|---|---|---|---|
| 1 | 236 · 3.93 | yukarıdaki tek kare değişim (SERT K8; P1 teslim edilmiş, kayıtsız) | zorunlu |
| 2 | 4 · 0.07 | ışıkla açılış f3'ten f4'e birden (ort. 75 → 89 → 102); ease-in yok | isteğe bağlı |
| 3 | 865–885 · 14.4–14.75 | rack içinde kelime değişimi tek karede | isteğe bağlı |
| 4 | 5370–5460 / 5760–5800 | P5 iniş/dönüş tepelerinde zemin %62–71 | kayıtlı kabul |
| 5 | 3838/3840 · 6516/6517/6603 | ≤ 0.35 Y ışık katmanı adımları | borç (görünmez) |

### Somut düzeltme listesi
| # | kare aralığı | sorun | ölçüt | nasıl doğrulanacak |
|---|---|---|---|---|
| 1 | P1 f226–250 | tek karede beliren öğe | hiçbir öğe tek karede değil; ardışık fark oranı ≤ 1.5 | 1080p kare serisi oranı + şerit |
| 2 | P1 f0–16 (isteğe bağlı) | ani açılış | oran ≤ 1.5 | fark serisi |
| 3 | P1 f856–902 (isteğe bağlı) | tek kare kelime değişimi | oran ≤ 1.5 | fark serisi |

Proje dosyalarına dokunmadım. Kanıt: out/review/FILM-master-r1/

## <tarih> · FILM · master · r2: TESLİM GEÇER
KARAR: TESLİM GEÇER · §0.6 8/8 · UCUZ geçer · kapı master full yok · tur r2 · birim FILM

Güncellik: P1 kareleri f4–8, f226–281, f865–894 kod değişikliğinden sonra yeniden çizilmiş · Yöntem: 1080p kareler (480×270 fark) + master v2 mp4 (160×90).

### Tek düzeltme turu doğrulaması
| madde | r1 bulgusu | r2 ölçümü | kapandı mı |
|---|---|---|---|
| 1 | f236 tek kare değişim | bölme çizgisi f226–232 soldan sağa çiziliyor; tarama f236–240 kademeli; gölge f240–246 kopup büyüyor; çerçeve f243–246 kademeli; pencere 234–300 oran ≤ 1.08 (f224–232'deki 2–2.5 oranları durağan tutuşta, mutlak 0.4–0.6, eski karelerde de aynı) | evet |
| 2 | ani açılış | fark serisi 0.50 → 4.32 → 11.07 → 14.27 → 14.71; en kötü oran 1.06 | evet |
| 3 | rack kelime değişimi | çıkan f870–880 bulanıklaşıyor, giren f876–898 yazılıyor (≈ 4 kare çakışma); oran ≤ 1.07 | evet |

Dikişler (master v2): film başı 0.29 → 4.15 → 11.25 · P1→P2 0.24 · 2423 0.38 · 3845 0.07 · 4970 3.10 · 6286 0.09. Sıçrama bayrağı yalnız 7028'de (siyah kuyrukta dither sonu, Y 17 → 16; algılanmaz).

### Açık kararlar (kullanıcıya)
- Seviye etiketleri (f263–300) yalnız opaklıkla beliriyor (≤ 20 px doku metni; QC fade saymıyor). "Opaklık tek başına geçiş değil" → yazım ya da hareketle birleştirme önerilir.

Proje dosyalarına dokunmadım. Kanıt: out/review/FILM-master-r2/
