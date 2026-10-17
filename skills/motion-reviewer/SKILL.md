---
name: motion-reviewer
description: Bağımsız kapı incelemesi prosedürü; yalnız taze açılmış motion-reviewer ajanı uygular (/motion:gate açar). İşi yapanın gerekçesini görmeden yalnız çıktıları ve kuralları okur, kendi yöntemiyle ölçer; §0.6 sekiz madde, UCUZ 11 işaret, ön plan 5 soru ve "hata gibi görünen öğe" taramasıyla TESLİM GEÇER | GEÇER | ŞARTLI GEÇER | GEÇMEZ kararı verir ve kaydı docs/REVIEWER.md'ye ekler. Varyant/look-dev, storyboard, animatik, render, teslim, master, canlı ve eval kiplerini kapsar.
argument-hint: <birim> <kapı-türü> [r<k>] [KİP: eval]
allowed-tools: Read, Grep, Glob, Bash
disable-model-invocation: true
---

# motion-reviewer: bağımsız kapı incelemesi

> Bu prosedürü yalnız kapı için taze açılmış `motion:motion-reviewer` ajanı uygular. `/motion:gate` bu ajanı açar.
> İşi yapan oturum bu prosedürü kendi üstünde koşmaz, çünkü kendi işini incelemek yalıtımı bozar. Model bu yüzden skill'i kendiliğinden çağıramaz (`disable-model-invocation`).

Kural kaynakları:
- SERT kurallar ve DUR sözleşmesi: `${CLAUDE_PLUGIN_ROOT}/skills/motion-core/references/RULES.md`
- Ölçüm yöntemleri: `MEASURE.md`
- Üretken varlık kuralları: `GENAI.md`
- Kapı akışı: `PLAYBOOK.md`

Bu dosya ise yalnız inceleme yöntemini, karar sözlüğünü ve dönüş biçimini tanımlar.

---

## 0. Yalıtım (pazarlıksız)

**Bu işi yapanın gerekçesini görmedin ve görmemelisin; yalnız çıktıları ve kuralları okursun.**

- **Kapı başına taze ajan.** Bir reviewer SendMessage ile bir sonraki kapıya taşınmaz.
  - Ders: Kaynak projede tek bir reviewer, kapılar boyunca SendMessage ile sürdürüldü. 23 dönüşte bağlamı ~111 MB'a büyüdü ve "işi görmemiş göz" niteliği aşındı.
  - Kapılar arası tek hafıza `docs/REVIEWER.md` dosyasıdır (§11).
- **Yapanın puanı sana verilmez.** Yapanın §0.6 puanını, ölçümlerini, raporunu ve künyesini görmezsin.
  - Puanların farkını sen değil, ana oturum kapı raporunda yazar.
- **Kendi yönteminle ölçersin.** Yapanın araçlarının ve betiklerinin ürettiği sayılar referans değildir (§2).
- **Düzeltme yapmazsın.**
  - Sahne kodunu, manifesti, world'ü ve belgeleri değiştirmezsin.
  - Yazma alanın yalnız `out/review/<kapı-id>/` klasörüdür. Bunun dışında yalnız `docs/REVIEWER.md` sonuna ekleme yaparsın.
- **Yapana soru sormazsın.** Eksik girdi "ölçülemedi" olarak yazılır. Kararı nasıl etkilediğini de yazarsın (§1.3).
- Kişisel veri, e-posta, kimlik bilgisi ya da müşteri metni kopyalamazsın. Brief'ten alıntı gerekirse yalnız ilgili cümle alınır.

`<kapı-id>` biçimi şudur: `<birim>-<kapı-türü>-r<k>`. Örnek: `P2-animatik-r1`.

---

## 1. Girdiler

### 1.1 Okuyabileceklerin (beyaz liste)

İstem sana yolları verir. Verilmeyen yol beyaz listedeyse kendin bulabilirsin (Glob). Beyaz liste dışı hiçbir şeyi açmazsın.

| tür | yol | nasıl kullanılır |
|---|---|---|
| inceleme kuralı | bu dosya · `RULES.md` · `MEASURE.md` · `GENAI.md` | ölçüt ve yöntem |
| proje kuralı | `project.md`: §1 brief (aynen) · §3 kalite çıtası (+ UCUZ ek maddeleri) · §4 palet/yazı/aksan hakkı · §5 yasaklar · §6 world seçimi kaydı · §9 üretken varlık · §10 ölçü hedefleri · §11+ faz kararlarının yalnız "kullanıcı" satırları | ölçüt |
| world | `world/world.json` | bant, K1 maskesi, aksan sınıfları, kamera/hareket sınırları, `origin` |
| örnek world'ler | `${CLAUDE_PLUGIN_ROOT}/skills/motion-world/examples/*/world.json` ve `lessons.md` | yalnız UCUZ #11 karşılaştırması |
| manifest | `scenes.json` | fps, kareler, anahtar kareler, `checks`, `exceptions` / `review` kayıtları, `gate` |
| harness çıktısı | `out/probe/<id>-qc.json` · `out/probe/<id>-fc.json` (+ `--sheet` sayfası) · `motion-render contact` kontakları | **yönlendirici**: nereye bakılacağını gösterir, kanıt değildir (§2) |
| kareler | `out/frames/<id>[_tag]/NNNNN.png` · `out/scenes/*.mp4` · varyant/look-dev still'leri · storyboard kareleri | asıl kanıt kaynağı |
| A/B | A/B kayıtları (json + png) | pencere dışı fark |
| varlık | `assets/gen/manifest.json` (items + ledger + lost) | bütçe ve varlık kuralı |
| canlı | canlı sayfa ve ayar paneli (yalnız çalıştırmak için) · canlı QC json | yönlendirici; kendi koşun kanıttır |
| hafıza | `docs/REVIEWER.md` | önceki reviewer kayıtları; düzeltme turunda önceki karar |
| kapsam bilgisi | istemde verilen "değişen kare aralıkları" listesi; düzeltme turunda yapanın madde → durum listesi (`1 → UYGULANDI, f…`) | yalnız *nereye* bakılacağı. *Neden*, *nasıl* ve yapanın sayıları yoktur; her madde senin ölçümünle doğrulanır |

Sahne kodunu yalnız `grep` ile şu iki denetim için açabilirsin:
- Medya yolu `assets/gen/` dışına çıkıyor mu?
- Render anında üretken çağrı var mı?

Kod yorumları gerekçedir. Onları okuyup karara dayanak yapmazsın.

### 1.2 Okumayacakların (kara liste)

- Yapanın faz raporu, künyesi (`docs/*KUNYE*`, `docs/*RAPOR*`), `docs/RETRO.md`, `out/RENDER_REPORT.md`, commit mesajları ve CHANGELOG notları.
  - Künye gerekçe ve yapan sayısı taşır. İddialar karelerden doğrulanacaksa sana iddianın kendisi değil, yalnız kapsam bilgisi (madde, kare aralığı) verilir.
- Yapanın kendi yazdığı ölçüm betikleri ve çıktıları: `out/probe/<faz>/…`, qc/fc json dışındaki her şey.
- Yapanın "Kalıp kararları" tablosunun gerekçe sütunu ve eksik listesi.
- `out/measure/**`: bağımsız ölçüm ajanının sayıları. Onlar da senin referansın değil, sen kendin ölçersin.
- Konuşma kayıtları, oturum transkriptleri, başka ajanların dönüşleri.

### 1.3 Eksik girdi

Gerekli bir girdi yoksa o madde **"ölçülemedi"** olur. Örnek: kontak yok, anahtar kare tanımlı değil, world bandı boş.

- Kapı kararını belirleyen bir madde ölçülemiyorsa en iyi karar **ŞARTLI GEÇER** olur. Şart, "ölçülebilir hâle getir + ölç" biçiminde yazılır.
- Teslim kapısında ölçülemeyen SERT madde varsa karar **GEÇMEZ** olur.

---

## 2. Kendi yöntemin

Harness'in denetim çıktıları (`qc`, `frame-check`, `ours`) sana nereye bakacağını söyler. Kararın dayandığı her sayıyı kendin, ayrı bir yoldan yeniden alırsın.

**Serbest araçlar.** Bunlar tarafsız harness ilkelleridir; çıktıyı hep `out/review/<kapı-id>/` altına yönlendirirsin:
- `motion-render probe <id> --frame N --out out/review/<kapı-id>/<id>-f<N>.png` (gerekirse `--eval`, `--bench N`)
- `motion-render contact sheet out/review/<kapı-id>/<ad>.png a.png=etiket …`
- `motion-render imgdiff <a> <b> out/review/<kapı-id>/<ad>-diff.png`
- `ffmpeg`, `ffprobe`

**Kendi betiklerin.** Yalnız `out/review/<kapı-id>/` altına yazılır (`m-<konu>.mjs`).
- Bağımlılıksız tutarsın. Pikseli ffmpeg ile ham olarak alırsın, örnek: `ffmpeg -v error -i <kare> -vf crop=w:h:x:y,format=gray -f rawvideo -`. İstatistiği node ile hesaplarsın.
- Sahne kodu, `render/` ve yapanın betikleri içe aktarılmaz.

**Güncellik kontrolü ilk iştir.** Kareler son kod/manifest değişikliğinden sonra mı render edilmiş?
- ss2 ve expo-post uygulanmamış bir anahtar kareyi şimdi `probe` ile al ve kayıtlı kareyle `imgdiff` yap.
- Fark 0 değilse kareler bayattır. Kapı açılmaz ve karar **GEÇMEZ** olur (gerekçe "bayat kare").
- Bu kontrolün sonucu kayıttaki "Güncellik" satırına yazılır.

**Bakış sırası:**
1. Önce kontak: tempo, ölü kare, ışık arkı, kameranın okunması.
2. Sonra anahtar kareler tam boyda: shot başına en az 6 kare.
3. Şüpheli yerde komşu kareler (±1…±3).

Kesin karar tam çözünürlükte verilir. Kontak etiket şeridi yanıltabilir.

**Kanıt biçimi.** Her bulguda üç şey bulunur:
- kare numarası: sahne karesi @ manifest fps ve film zamanı s
- kırpım dosyası: `out/review/<kapı-id>/<id>-f<NNNNN>-<bölge>.png`; etiket `f · t s · ölçü`, büyütme nearest
- ölçü: sayı + birim + yöntem; örnek "luma std 1,8/255, 64×64 kırpım, ffmpeg gray"

Kanıtı olmayan bulgu kayda girmez. "Gözle" denen yerde de kırpım verilir.

**Uyum.** Senin sayın harness'in yönlendirici sayısından kayda değer farklıysa ikisini yan yana yaz. Hangisinin hangi yöntemle alındığını belirt. Kararı kendi sayına dayandırırsın.

---

## 3. §0.6 zevk listesi: sekiz madde

Her madde **evet / hayır** olarak işaretlenir. Kanıtı kendi kırpımındır.

| # | madde | "evet" demek için | kendi kanıtın |
|---|---|---|---|
| 1 | **Derinlik** | En az iki ayrı derinlik düzlemi okunuyor: örtüşme, odak farkı, parallax ya da gölge mesafesi. | Ön/arka kırpımlarında keskinlik oranı ya da iki kare arasında ön ve arka düzlemin farklı kayması (px). |
| 2 | **Malzeme** | Ana yüzeylerin dokusu ya da malzemesi okunuyor (gren, lif, pürüz, yansıma, kırılma…). Düz renk dolgu değil. | Ana yüzeyden 1:1 kırpım ve yerel luma std. Kırpım gösterilir. |
| 3 | **Yönlü ışık** | Işığın kaynağı ve yönü okunuyor: havuz, düşüm, yönlü gölge ya da yansıma. | 8×4 luma ızgarası (gradyan yönü) ve gölge yönü. |
| 4 | **İkincil hareket** | Ana harekete tepki veren ikinci bir hareket var: gölge, parçacık, sekme, takip eden öğe, yüzeyin esnemesi. | Ardışık kare şeridi ve gecikmenin kare cinsinden değeri. |
| 5 | **Easing'de ağırlık** | Hareketler kütle hissi veriyor: ivmelenme/yavaşlama, sekme ya da overshoot. Doğrusal kayma yok; her öğe aynı eğride değil. | 6–10 ardışık karede kare başı yer değiştirme serisi (px). |
| 6 | **Bilinçli hold** | Vuruştan sonra tasarlanmış bir tutuş var (okuma süresi, nefes). Ölü bekleme ya da donma değil; tutuşta mikro hareket sürüyor. | Hold aralığının süresi (s) ve ardışık `imgdiff` > 0 kanıtı. |
| 7 | **Tek kahraman** | Her anda tek göz hedefi var; ikinci bir odak yarışmıyor. | Kahraman kırpımı ile en güçlü ikinci adayın kontrast ve ölçek oranı. |
| 8 | **Anlamlı boşluk** | Boş alan kahramanı taşıyor (yön, nefes, gerilim); kalan boşluk değil. | Kompozisyon kırpımı ve boşluğun yönü. Boş siyah sayılmaz (QC boş siyah ölçüsüyle karşılaştır). |

### 3.1 Kapı eşiği (profile göre)

| profil | eşik (8 madde) |
|---|---|
| `full` | **≥ 7/8** |
| `light` | **≥ 6/8** |
| `live` | **≥ 7/8** |

- Uygulanan eşik = max(profil eşiği, `scenes.json` `gate.taste`). Proje eşiği yükseltebilir, düşüremez.
- Değerlendirilebilen madde sayısı `n` 8'den azsa eşik şöyle hesaplanır: **en çok (8 − profil eşiği) "hayır"**. Örnek: durağan still'de `n = 5`; full için eşik 4/5, light için 3/5.
- **Evet < 3** ise karar GEÇMEZ olur ve geri dönüş noktası **look-dev / storyboard** olur. Düzeltme turu açılmaz, tasarım geri döner.

---

## 4. UCUZ işaretleri: 11 madde

Bir işaret **VAR** ise birim **GEÇMEZ** olur. **Sınırda** olan bir işaret ya ŞARTLI GEÇER'in şart listesine kare aralığıyla girer ya da GEÇMEZ yapar. Seçimi sen yaparsın ve gerekçesini yazarsın.

`project.md` §3'te ek UCUZ maddeleri varsa onlar #12'den itibaren numaralanır ve aynı kuralla taranır.

| # | işaret | neye bakılır | kanıt |
|---|---|---|---|
| 1 | Malzemesiz düz vektör | Ana yüzeyler düz dolgu; dokusuz, ışıksız. | 1:1 kırpım ve yerel std |
| 2 | Varsayılan easing | Doğrusal ya da her öğede aynı hazır eğri; oturma ve overshoot yok. | Yer değiştirme serisi (iki öğe yan yana) |
| 3 | Tek düzlem | Örtüşme, parallax, odak ya da gölge mesafesi yok. Her şey aynı düzlemde kayıyor. | İki karede ön/arka kayma eşitliği |
| 4 | Aşırı glow | Kenarları yıkayan hale, kırpılmış parlak alan, okunurluğu düşüren bloom. | Parlak bölge kırpımı ve kırpılmış piksel payı |
| 5 | Şablon geçiş | Dünyadan doğmayan hazır geçiş: wipe, itme, zoom-blur, döndürme. Fade zaten SERT olarak yasak. | Geçiş aralığının kare şeridi |
| 6 | Her shot aynı kompozisyon | Kahraman konumu/ölçeği ve kadraj düzeni shot'tan shot'a aynı. | Shot başı anahtar kare tablosu ve kahraman kutu merkezleri |
| 7 | Mikro-hareketsiz uzun hold | Tutuş boyunca ardışık kareler bit-aynı; süre project.md §10 hold sınırını aşıyor. | `imgdiff` = 0 aralığı (s) |
| 8 | Stok görünümlü üretken klip | Konuyla bağı zayıf, parlak-jenerik, stok çekim hissi. Klip cümleyi anlatıyor ya da tek başına kare oluyor. | Klip karesi, ledger kaydı |
| 9 | Yapay zekâ artefaktı | El, yüz, yazı, geometri kırığı, eriyen kenar, titreyen doku. | 1:1 ya da 2× kırpım, komşu kareler |
| 10 | Metin üstüne doğrudan efekt | Glow, blur, bozulma ya da gradyan doğrudan metne uygulanmış; okunurluk düşüyor. | Metin kırpımı ve kontrast oranı |
| 11 | **Önceki projeyi / örnek world'ü taklit** | Bkz. §4.1. | Eksen tablosu |

### 4.1 UCUZ #11: önceki projeyi ya da örnek world'ü taklit

Paket görsel üslup taşımaz. Kaynak projenin görünüm ailesi yalnız `examples/` altında örnek olarak durur. Taklit şu beş eksende karşılaştırılır:

| eksen | eşleşme sayılır |
|---|---|
| palet | `world.json` paleti ve kontaktan ölçülen baskın renkler. Renklerin yarısından fazlası örnek world paletindeki bir renge ΔE2000 ≤ 10 yakın. |
| tipografi | Display rolünde aynı aile ya da aynı kesim ailesi. |
| malzeme / primitif | `primitives` adlarında Jaccard ≥ 0,3 ya da aynı malzeme metaforu (yüzey, alet, ışık düzeni). |
| kompozisyon | Anahtar karelerde kahraman yerleşimi ve ölçeği örneğin tarif ettiği düzene oturuyor. |
| hareket imzası | Aynı kamera dili, aynı geçiş kalıpları, aynı "imza" anlar. |

- **≥ 3 eksende eşleşme: #11 VAR.**
- 2 eksende eşleşme: **sınırda**.
- İstisna: `world.json` `origin: "example:<ad>"` **ve** `project.md` §6'da "kullanıcının açık isteği" kaydı birlikte varsa, o örneğin primitif/palet/font kullanımı #11 sayılmaz.
  - Bu istisnada bile kaynak projenin shot tasarımlarını, sıralarını ya da imza anlarını birebir yeniden kurmak #11'dir.
- Eşleşme eşikleri eval kipinde (§13) ayarlanır. Değiştiyse kayıtta belirtilir.

---

## 5. Ön plan: beş soru ve "hata gibi görünen öğe"

Ön plan nesnesi olan her shot için ayrı bir satır açılır. Her soru **evet / hayır** ile cevaplanır ve kare kanıtı verilir.

| soru | beklenen |
|---|---|
| 1. Nesne bağlı mı? Bir yüzeye oturuyor, kendi başına süzülmüyor. | evet |
| 2. Temas gölgesi ya da bağlayan ışık izi var mı? | evet |
| 3. Kahramanı ya da metni örtüyor mu? Metin üzerinde örtme kabul edilmez; kahraman için eşik `world.json` → `project.md`. | hayır |
| 4. Bulanıklık world/project eşiği içinde mi? | evet |
| 5. Hata gibi görünüyor mu? | hayır |

- **Beklenenden ters bir cevap bile varsa o shot GEÇMEZ.**
- Ön plan nesnesi yoksa satıra "yok" yazılır.
- Anlatımda işi olmayan ("katman olsun diye" konmuş) ön plan nesnesi madde 5'e girer.
- Katman sayımı tek başına derinlik kanıtı değildir.
- Eşik tanımlı değilse ölçüm yine yapılır. Satıra "eşik tanımsız" notu düşülür ve konu açık karara gider.

**Hata gibi görünen öğe.** Kontakta ve anahtar karelerde şunları ararsın:
- kesik kelime parçası
- havada kalan nesne ya da çizgi
- tek karede beliren ya da kaybolan öğe (sıçrama)
- anlamsız alet ya da gösterge
- kırpılmış ok, çizgi ya da logo
- kadraj kenarına yapışmış yarım metin

Her biri kare numarasıyla yazılır. **Biri bile varsa GEÇMEZ.**

---

## 6. Diğer denetimler

Her denetimin sonucu üç değerden biridir: geçti / kaldı / ölçülemedi. Kanıtı yanında verilir.

1. **QC ve frame-check (yönlendirici).**
   - Hata 0 mı?
   - Uyarılar `scenes.json` `review` / `exceptions` kaydıyla mı?
   - Kayıtlı istisnanın gerekçesi ve aralığı var mı?
   - "Muhtemelen kasıtlı" kabul değildir. Kayıtsız SERT ihlali GEÇMEZ yapar.
2. **SERT kurallar** (RULES): fade yok, aksan kotası ve konumu, okunurluk, kadraj ve kontrast, bant, boş siyah, son kare. Kararı veren sayıyı kendin ölçersin.
3. **A/B.** Pencere dışı fark 0 mı? Değilse gerekçe (bayat kare, render geçmişi) kanıtlı mı?
4. **Bütçe** (teslim ve master kapısında zorunlu):
   - Ledger'da `balanceBefore − balanceAfter` = manifest kredi toplamı mı (`match`)?
   - Kayıplar `lost` alanında mı?
   - Görev ya da film tavanı aşılmış mı?
   - Kara listeden ya da liste dışından model kullanılmış mı?
   - Her varlıkta lisans notu var mı?
   - Taslak/final durumu onayla uyumlu mu?
5. **Varlık kuralı** (GENAI):
   - Varlık destekleyici mi? Cümleyi anlatmamalı, tek başına kare olmamalı.
   - Süre politikadaki sınırın içinde mi?
   - Sahne yalnız `assets/gen/` yolunu mu kullanıyor?
   - Yer tutucu render'a girmiş mi?
6. **Devir / dikiş.** Birim sınırında önceki ve sonraki kare farkı MEASURE ölçütünün içinde mi? Kendi `imgdiff`'in kullanılır.
7. **Ses ve vuruş.** Fiziksel olayın ilk görünür karesi ile kelime başı arasındaki fark proje ölçütü içinde mi?
   - Kelime zamanı `script/` dosyalarındandır. Bunlar çıktı sayılır, gerekçe değil.
   - Kareyi sen bulursun.

---

## 7. Kapı türleri

| kapı | ne incelenir | §0.6 `n` | karar seti |
|---|---|---|---|
| `varyant` | Birim başına 3 yön still | 5 (1, 2, 3, 7, 8). Hareket maddeleri animatikte. | Yön başına SEÇ / ELE ve birim için GEÇER / GEÇMEZ (§12) |
| `lookdev` | World yönleri (still + `world.json` taslağı) | 5 | Yön başına SEÇ / ELE ve GEÇER / GEÇMEZ (§12) |
| `storyboard` | Boyalı kareler ve hareket notları | 8. Hareket maddeleri karelerin altındaki nottan "plan" olarak işaretlenir. | GEÇER / ŞARTLI GEÇER / GEÇMEZ |
| `animatik` | Yarım çözünürlük ve animatik fps ile birim | 8 | GEÇER / ŞARTLI GEÇER / GEÇMEZ |
| `render` | Tam çözünürlük birim | 8 | GEÇER / ŞARTLI GEÇER / GEÇMEZ |
| `teslim` | Tam render, kapanış ölçümleri, bütçe | 8 | **TESLİM GEÇER** / ŞARTLI GEÇER / GEÇMEZ |
| `master` | Tek sürekli encode: film QC, ses yüksekliği, dikişler, son kareler, önceki master ile bit eşliği | yok (birim kararları geçerli) | TESLİM GEÇER / GEÇMEZ |
| `live` | Kayıtlı zarfla oynatma kaydı + canlı ölçümler (kendi koşun) | 8 | GEÇER / ŞARTLI GEÇER / GEÇMEZ |
| `varlik` | Logo, marka varlığı, üretken pilot gibi ölçüm ağırlıklı ön koşullar | yok | GEÇER / GEÇMEZ |

Animatikte ölçeğe bağlı ölçüler "tam renderda" olarak ertelenir: keskinlik, ince çizgi, metin kenarı. Bu ertelenen ölçüler karar dışıdır.

Canlı kapıda fps, gecikme ve düşen kare sayısını **kendi koşunla** alırsın, örnek: `motion-render probe <id> --frame N --bench N` ya da kendi kısa betiğin. Çıktı yalnız `out/review/<kapı-id>/` altına gider. Yapanın canlı QC dosyası yönlendiricidir.

---

## 8. Karar sözlüğü

| karar | ne zaman |
|---|---|
| **TESLİM GEÇER** | Yalnız `teslim` ve `master` kapısında verilir. Şartların hepsi tutmalı: §0.6 eşiği tutuyor, UCUZ geçer, ön plan ve hata görünümü temiz, SERT ihlali 0 (kayıtlı istisnalar gerekçeli), bütçe `match`. Birim teslim edilebilir. |
| **GEÇER** | Kapı eşiği tutuyor, UCUZ geçer, SERT ihlali 0, ön plan ve hata görünümü temiz. Akış bir sonraki adıma geçer. Küçük notlar teslimi durdurmaz. |
| **ŞARTLI GEÇER** | Eşik tutuyor ve VAR işaret yok. Ancak kare aralığıyla yazılmış, sayılı ve doğrulanabilir şartlar var: "sınırda" UCUZ, ölçülemeyen ve ölçülebilir kılınacak madde, küçük düzeltme. Şartlar yeni bir inceleme turu açmaz; yerine getirildikleri ölçümle ya da bir sonraki kapıda doğrulanır. |
| **GEÇMEZ** | Şunlardan biri yeter: eşik altı; UCUZ VAR (#11 dahil); kayıtsız SERT ihlali; ön plan sorusunda ters cevap; hata gibi görünen öğe; bayat kare; teslimde ölçülemeyen SERT madde. |

- Kararı belirleyen en ağır bulgu kayıtta ilk sırada yazılır.
- Karar değiştirilemez, yumuşatılamaz. "Geçer ama…" yazmazsın: ya şartlıdır ya geçmez.

---

## 9. Tek düzeltme turu

```
r1 GEÇMEZ ─► yapan TEK düzeltme turu (yalnız senin "Somut düzeltme listesi") ─► r2 (TAZE reviewer)
r2 GEÇER / ŞARTLI GEÇER ─► akış sürer
r2 GEÇMEZ ─► DUR: kontak + nedenler, render YOK (tam render / teslim başlatılmaz)
```

- **r1 GEÇMEZ ise** kaydın sonunda **Somut düzeltme listesi** zorunludur. Her madde şu sütunları taşır:
  - kare aralığı
  - sorun
  - ölçüt (sayı)
  - nasıl doğrulanacak

  Yapan yalnız bu listeyi alır.
- **r2 reviewer'ı** taze açılır. `docs/REVIEWER.md`'deki r1 kaydını girdi olarak alır ve listedeki her maddeyi kendi ölçümüyle doğrular.
  - Tablo biçimi: `madde | r1 bulgusu | r2 ölçümü | kapandı mı`.
  - r1'in sayıları da referans değildir.
  - r2 yeni bulguları da yazar. Yeni bir VAR işaret de GEÇMEZ yapar.
- **r2 GEÇMEZ ise** kaydın ilk satırından sonra `DUR: tek düzeltme turu tükendi, render yok` satırı yazılır.
- Evet sayısı < 3 olan GEÇMEZ düzeltme turu açmaz. Doğrudan look-dev / storyboard'a dönülür (§3.1).

---

## 10. Dönüş biçimi

**İlk satır makine-okurdur ve tek satırdır:**

```
KARAR: <TESLİM GEÇER|GEÇER|ŞARTLI GEÇER|GEÇMEZ> · §0.6 <x>/<n>|yok · UCUZ <geçer|VAR #a[,#b][ sınırda #c]|sınırda #c> · kapı <tür> <full|light|live> ≥<e>/<n>|yok · tur r<k> · birim <id>
```

Örnek: `KARAR: GEÇMEZ · §0.6 5/8 · UCUZ VAR #2,#7 · kapı animatik full ≥7/8 · tur r1 · birim P2`

Doğrulama düzenli ifadesi:

```
^KARAR: (TESLİM GEÇER|ŞARTLI GEÇER|GEÇER|GEÇMEZ) · §0\.6 (\d/\d|yok) · UCUZ (geçer|VAR #\d+(,#\d+)*( sınırda #\d+(,#\d+)*)?|sınırda #\d+(,#\d+)*) · kapı \S+ (full|light|live) (≥\d/\d|yok) · tur r\d+ · birim \S+$
```

Ardından şu gövde gelir (kaynak projede kararlı hâle gelmiş biçim). Toplam ~60 satırı geçmez; ayrıntı kanıt dosyalarındadır.

```markdown
## <birim> · <kapı>: bağımsız inceleme (r<k>)
Güncellik: <probe↔kayıtlı kare imgdiff sonucu> · Kapsam: <kare sayısı, açılan tam boy kare sayısı> · Yöntem: <kendi betikleri: out/review/<kapı-id>/m-*.mjs>

### Kontroller
| madde | sonuç | kanıt (f · t s · kırpım · ölçü) |
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
| # | durum | kanıt |      (yalnız VAR ve sınırda satırları; #11 için eksen tablosu)

### Ön plan
| shot | nesne | bağlı | gölge | örtme | bulanıklık | hata görünümü |

### Hata gibi görünen öğe
- <yok> | <f · t s · ne · kırpım>

### En zayıf anlar
| # | kare · s | bulgu | sınıf (zorunlu / isteğe bağlı / açık karar) |

### Somut düzeltme listesi        (GEÇMEZ ve ŞARTLI GEÇER için zorunlu)
| # | kare aralığı | sorun | ölçüt | nasıl doğrulanacak |

### Küçük notlar (teslimi durdurmaz)
### Açık kararlar (kullanıcıya)
Proje dosyalarına dokunmadım. Kanıt: out/review/<kapı-id>/ · Kayıt docs/REVIEWER.md'ye eklendi.
```

Sayılar her zaman birimlidir: px, /255, ΔE2000, %, kare, s, ms, LUFS. Kare numarası her zaman sahne karesidir (@fps). Gerektiğinde film zamanı da yazılır.

---

## 11. Hafıza: `docs/REVIEWER.md`

Kapılar arası tek hafıza bu dosyadır. Başka hafıza tutulmaz.

- Yalnız **sona eklenir**. Önceki kayıtlar düzenlenmez, silinmez.
- Yöntem:
  1. Kaydı önce `out/review/<kapı-id>/RECORD.md` olarak yaz.
  2. Sonra `cat out/review/<kapı-id>/RECORD.md >> docs/REVIEWER.md` ile ekle.
- Dosya yoksa şablon başlığını oluşturmazsın. Kaydı `out/review/<kapı-id>/RECORD.md` dosyasında bırakır ve dönüşte bildirirsin; ekleme işini ana oturum yapar.
- Kayıt başlığı `## <YYYY-AA-GG> · <birim> · <kapı> · r<k>: <KARAR>`. Hemen altında §10'daki `KARAR:` satırı aynen yer alır. Makineler `grep '^KARAR:' docs/REVIEWER.md` ile okur.
- Kayda şunlar girmez: yapanın sözleri, gerekçeleri, sayıları.
- Tekrarlayan bulgu varsa (aynı UCUZ işaretinin farklı birimlerde dönmesi gibi) kaydın sonuna `Tekrar: #<n> (<birimler>)` satırı eklenir. Bu satır `/motion:promote` için ders adayıdır.

---

## 12. Varyant ve look-dev incelemesi

Birim başına üç yön gelir. Her yön için şunlar yapılır:

1. Durağan §0.6 değerlendirmesi (`n = 5`).
2. Durağan UCUZ maddelerinin taranması: #1, #3, #4, #6, #10, #11.
3. **Örnek world türevi taraması.**
   - Yön, bir örnek world'ün sürümü ise (§4.1'de ≥ 3 eksen) **ELE** kararı verilir. Gerekçe "örnek world türevi (#11)" olur.
   - İstisna: kullanıcının açık isteği kayıtlıysa.
4. **Yönler arası ayrışma.**
   - Üç yön birbirinin renk/ışık takası olmamalıdır.
   - Eksenler PLAYBOOK §1'deki altı eksendir: ışık modeli · malzeme/zemin · ton (luma bandı) · tipografi · kamera dili · geçiş dili.
   - İki yön bu altı eksenin 3'ünden azında ayrışıyorsa ikisinden biri **ELE**: "yön değil, sürüm".
   - Ayrışmayı kendi ölçümünle sayarsın: bant için luma %, ton ve palet için ΔE2000, tipografi için aile.
5. Yön başına **SEÇ / ELE** kararı ve tek cümle kanıt yazılır.

Tablo biçimi: `yön | §0.6 x/5 | UCUZ | #11 eksen | ayrışma | SEÇ/ELE | kanıt`.

- Birim kararı **GEÇER**: en az bir yön SEÇ.
- Birim kararı **GEÇMEZ**: hiçbir yön seçilemiyor. Bu durumda yeni üç yön istenir.

Seçim önerin yapanın seçimiyle uyuşmazsa ana oturum bunu açık karar olarak kullanıcıya götürür. Sen yalnız kendi seçimini yazarsın.

---

## 13. Eval kipi (paket değerlendirmesi)

İstemde `KİP: eval` ve proje kökleri listesi verilir. Her projede yalnız şunları okursun:
- `world/world.json`
- kontaklar
- anahtar kareler
- `scenes.json`

**1. Proje içi.** Her projenin teslim edilen birimleri için §3 ve §4 taraması yapılır. Proje başına §0.6 ve UCUZ sonucu yazılır.

**2. Projeler arası benzerlik.** Her proje çifti için §4.1'in beş ekseni ölçülür. **≥ 3 eksende eşleşme = benzer çift.**

**3. Kaynak görünüme benzerlik.** Her proje, örnek world'lerin her biriyle aynı beş eksende karşılaştırılır. Örnek world'ler kaynak projenin görünüm ailesidir.

**Çıktının ilk satırı:**

```
EVAL: proje <N> · benzer çift <k>/<N·(N−1)/2> · örnek-world benzeri <m>/<N> · UCUZ#11 <j>/<N> · §0.6 medyan <x>/8
```

Ardından iki tablo gelir:
- benzerlik matrisi: proje × proje, eşleşen eksen sayısı
- örnek world karşılaştırması: proje × örnek, eşleşen eksenler

Eşik değişikliği (ΔE, Jaccard) yapıldıysa ilk tablonun altına yazılır.

Eval kipinde `docs/REVIEWER.md`'ye ekleme yapılmaz. Kayıt `out/review/eval-<tarih>/` altında kalır.

---

## 14. Kısa yasaklar

- Yapanın raporunu, künyesini, puanını, betiklerini ya da `out/measure/` sayılarını açma.
- Proje dosyası değiştirme. Varlık üretme, kredi harcama, üretken ya da harici servis çağırma.
- Ölçmeden "geçti" yazma. Kanıtsız bulgu yazma.
- Kararı yumuşatma. "Kasıtlı görünüyor" diye SERT ihlali geçirme.
- Bir sonraki kapıya taşınmayı kabul etme. Her kapı yeni bir ajandır.
