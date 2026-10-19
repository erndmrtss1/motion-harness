# REVIEWER — bağımsız reviewer kaydı (<PROJE>)

> **Bu dosya reviewer'ın hafızasıdır.** Her kapıda **taze** bir reviewer ajanı (`motion:motion-reviewer`, `/motion:gate` açar) işe bu dosyayı okuyarak başlar. Önceki kararları, kayıtlı istisnaları, kabulleri ve izlenecekleri buradan öğrenir.
>
> - **Yazan: reviewer.** Kaydını önce `out/review/<kapı-id>/RECORD.md` olarak yazar, sonra bu dosyanın **sonuna** ekler (`cat out/review/<kapı-id>/RECORD.md >> docs/REVIEWER.md`). Dosya yoksa oluşturmaz; ekleme işini ana oturum yapar.
> - **Yalnız sona eklenir.** Önceki kayıtlar düzenlenmez, silinmez. Ana oturum kayda yorum eklemez; kendi puan farkını faz raporunda yazar.
> - **Bu dosyada olmayanlar:** yapanın gerekçesi, konuşması, puanı, sayıları, künyesi. Reviewer işi görmemiş gözdür; yalnız çıktıları ve kuralları okur, kendi yöntemiyle ölçer.
> - **Kayıt tablosu elle tutulmaz:** `grep '^KARAR:' docs/REVIEWER.md` her kapının tek satırlık kararını listeler.
> - Prosedürün tek kaynağı: `skills/motion-reviewer/SKILL.md` (ölçüt §3–§6, kapı türleri §7, karar sözlüğü §8, tek düzeltme turu §9, dönüş biçimi §10, hafıza §11).
> - `<kapı-id>` = `<birim>-<kapı-türü>-r<k>` (ör. `P2-animatik-r1`). Kapı türleri: `lookdev` · `varyant` · `storyboard` · `animatik` · `render` · `teslim` · `master` · `live` · `varlik`.

## Ölçüt listeleri (her kayıtta kullanılır)

**§0.6 zevk listesi (8 madde; eşik full ≥ 7/8 · light ≥ 6/8 · live ≥ 7/8; proje yükseltebilir):**

| # | madde | "evet" ölçütü |
|---|---|---|
| 1 | derinlik | ≥ 2 derinlik düzlemi okunur (örtüşme, odak, paralaks, gölge mesafesi) |
| 2 | malzeme | ana yüzeylerde doku/malzeme; düz renk dolgu değil |
| 3 | yönlü ışık | kaynak ve yön okunur (havuz, düşüm, yönlü gölge, yansıma) |
| 4 | ikincil hareket | ana harekete tepki veren ikinci hareket |
| 5 | easing ağırlığı | ivmelenme/yavaşlama, sekme/overshoot; doğrusal kayma yok |
| 6 | bilinçli hold | vuruştan sonra tasarlanmış tutuş; ölü bekleme değil |
| 7 | tek kahraman | her anda tek göz hedefi |
| 8 | anlamlı boşluk | boşluk kahramanı taşır |

**UCUZ işaretleri (11; biri VAR ise GEÇMEZ; `project.md` §3 ekleri #12'den başlar):**

1. malzemesiz düz vektör
2. varsayılan easing
3. tek düzlem
4. aşırı glow
5. şablon geçiş
6. her shot aynı kompozisyon
7. mikro-hareketsiz uzun hold
8. stok görünümlü üretken klip
9. yapay zekâ artefaktı (el, yüz, yazı, geometri kırığı)
10. metin üstüne doğrudan efekt
11. önceki projeyi ya da örnek world'ü taklit (beş eksen: palet · tipografi · malzeme/primitif · kompozisyon · hareket imzası; ≥ 3 eşleşme VAR)

**Ön plan (5 soru; beklenen evet · evet · hayır · evet · hayır; ters cevap → o shot GEÇMEZ):** bağlı mı · temas gölgesi var mı · kahramanı/metni örtüyor mu (metin örtmesi 0) · bulanıklık eşik içinde mi · hata gibi görünüyor mu.

**Hata gibi görünen öğe (biri bile varsa GEÇMEZ):** kesik kelime · havada nesne ya da çizgi · tek karede beliren/kaybolan öğe · anlamsız alet · kırpık ok/çizgi/logo · kadraj kenarına yapışmış yarım metin.

## Kayıt biçimi

Her kapı aşağıdaki bloğun bir kopyasıdır. Reviewer doldurur ve sona ekler.

````markdown
## <YYYY-AA-GG> · <birim> · <kapı> · r<k>: <KARAR>
KARAR: <TESLİM GEÇER|GEÇER|ŞARTLI GEÇER|GEÇMEZ> · §0.6 <x>/<n>|yok · UCUZ <geçer|VAR #a[,#b][ sınırda #c]|sınırda #c> · kapı <tür> <full|light|live> ≥<e>/<n>|yok · tur r<k> · birim <id>[ · ayrışma: iskelet A↔B a, A↔C b, B↔C c (eşik t, UYARI) · palet A↔B x, A↔C y, B↔C z · uyarı n]
<yalnız lookdev kapısında:> qc (bilgi): LOOK-A <çıkış> · LOOK-B <çıkış> (<hata başlıkları>) · LOOK-C <çıkış>
<yalnız lookdev kapısında:> Ayrışma gerekçeleri: <UYARI veren her çift için görsel adı + öğe + neden ayrı yön / ELE; "(tek rol)" skorları belirtilir>
<yalnız r2 GEÇMEZ ise:> DUR: tek düzeltme turu tükendi, render yok

Güncellik: <probe ↔ kayıtlı kare imgdiff sonucu> · Kapsam: <kare sayısı, açılan tam boy kare sayısı> · Yöntem: <kendi betikleri: out/review/<kapı-id>/m-*.mjs>

### Kontroller
| madde | sonuç (geçti / kaldı / ölçülemedi) | kanıt (f · t s · kırpım · ölçü) |
|---|---|---|
| QC / frame-check (yönlendirici) | | |
| SERT: <kural> | | |
| A/B | | |
| bütçe / ledger | | |
| varlık kuralı | | |
| devir / dikiş | | |
| ses / vuruş | | |

### §0.6: <x>/<n> (eşik ≥<e>/<n>)
| # | madde | evet/hayır | kanıt |
|---|---|---|---|
| 1 | derinlik | | |
| 2 | malzeme | | |
| 3 | yönlü ışık | | |
| 4 | ikincil hareket | | |
| 5 | easing ağırlığı | | |
| 6 | bilinçli hold | | |
| 7 | tek kahraman | | |
| 8 | anlamlı boşluk | | |

### UCUZ: <geçer | VAR #… | sınırda #…>
| # | durum | kanıt |
|---|---|---|
| <yalnız VAR ve sınırda satırları; #11 için eksen tablosu> | | |

### Ön plan
| shot | nesne | bağlı | gölge | örtme | bulanıklık | hata görünümü |
|---|---|---|---|---|---|---|
| <shot ya da "yok"> | | | | | | |

### Hata gibi görünen öğe
- <yok> | <f · t s · ne · kırpım>

### Tek düzeltme turu doğrulaması (yalnız r2)
| madde | r1 bulgusu | r2 ölçümü | kapandı mı |
|---|---|---|---|

### En zayıf anlar
| # | kare · s | bulgu | sınıf (zorunlu / isteğe bağlı / açık karar) |
|---|---|---|---|

### Somut düzeltme listesi (GEÇMEZ ve ŞARTLI GEÇER için zorunlu)
| # | kare aralığı | sorun | ölçüt | nasıl doğrulanacak |
|---|---|---|---|---|

### Küçük notlar (teslimi durdurmaz)
- <…>

### Açık kararlar (kullanıcıya)
- <…>

<varsa:> Tekrar: #<n> (<birimler>)
Proje dosyalarına dokunmadım. Kanıt: out/review/<kapı-id>/
````

Karar → akış (PLAYBOOK §2.2):

- **GEÇER / TESLİM GEÇER** → sonraki adım.
- **ŞARTLI GEÇER** → yapan şartları kanıtla uygular; yeni tur açılmaz; sonraki kapı doğrular.
- **GEÇMEZ (r1)** → tek düzeltme turu → taze reviewer r2.
- **GEÇMEZ (r2)** → DUR, render yok.

---

## Kayıtlar

<!-- Reviewer kayıtları bu satırın altına, sona eklenir. -->
