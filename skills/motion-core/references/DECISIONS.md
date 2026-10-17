# DECISIONS — çekirdek mimari kararlar (ADR)

> **Ne:** kaynak projenin karar kaydından **core** olanlar: her projede geçerli süreç, motor ve ölçüm kararları. Görsel dile, tek projeye ya da platforma ait kararlar burada değildir (§ sonu).
> **Biçim:** bağlam → karar → sonuç. Her kayda **Pakette** satırı eklendi: kararın bu pakette nereye bağlandığı.
> **Durum sözlüğü:** **Kabul** (geçerli) · **Değişti** (yerine başka ADR) · **Terk** (geri alındı).
> **Numaralar** kaynak kayıttaki numaralardır; izlenebilirlik için korundu. Atlanan numaralar sondaki tabloda.
> **Yeni karar:** projeye özgü karar `project.md`'ye, world kararı `world/DECISIONS.md`'ye yazılır. Core'a ancak `/motion:promote` ile, A/B ya da üç projede tekrar kanıtıyla girer.

---

## ADR-001 · Görüntü T'nin saf fonksiyonu; harness seek ile çizer — Kabul
- **Bağlam:** kare kare render ve export, sahnenin kendi saati olursa bayat kare üretir. Tween kütüphanesi saati, `setState` ve CSS transition kareyi zamana değil olaya bağlar.
- **Karar:**
  - Tween saati, `setState` animasyonu, CSS transition, `useEffect`/rAF ile çizim yok.
  - Her kare `T`'den hesaplanır.
  - Rastgelelik yalnız tohumlu `rnd(seed)` ile üretilir.
  - Harness (Playwright Chromium) seek eder, kareyi bekleyip çeker.
  - Video öğeleri `T` ile senkronlanır.
- **Sonuç:** render deterministik: taze ↔ kayıtlı kare farkı 0. `--resume` ve kısmi yeniden render güvenli; bayatlık taraması anlamlı.
- **Pakette:** runtime sözleşmesi (CONTRACT §4: "her şey `T`'nin saf fonksiyonu"); `render`, `probe`, `imgdiff stale`.

## ADR-002 · Fade yok; opaklık yalnız harekete/bulanıklığa eşlik eder — Kabul
- **Bağlam:** crossfade ucuz ve sahte okunur. Film fiziksel bir dünyada geçer; geçiş bir olay olmalıdır.
- **Karar:** tek başına opaklık geçişi yasak. Geçiş repertuvarı:
  - rack focus; pozlama dip'i;
  - itiş/süpürme; hareket bulanıklığı;
  - baskı/yazım; tarama silmesi;
  - ışıkla kesme (ADR-021).
  - **İstisna: sahne sonu** (son 0.3–0.5 s, son kare tam siyah).
- **Sonuç:** her sahnede fade denetimi (QC fade dedektörü + kod envanteri). Dedektör küçük/kısa/hareketli fade'i kaçırabilir; envanter koddan da çıkarılır.
- **Pakette:** RULES GÇ-1 (SERT); `qc` fade kontrolü.

## ADR-003 · Aksan sayılır — Kabul
- **Bağlam:** projenin tek aksan rengi ancak nadir olursa anlam taşır.
- **Karar:**
  - Aksan hakkı **sahne başına** manifestte durur (`redQuota`). QC piksel sayımıyla doğrular.
  - Kaynak görseldeki aksan da sayılır (istisnası ADR-015).
  - İzinli kutular (logo vb.) kare başı veridir, açıklama metni değildir.
- **Sonuç:** film geneli sayım raporlanır; hakkı aşan sahne HATA.
- **Pakette:** RULES AK-3; renk sınıfı `world.json → classes`, kota `scenes.json → redQuota`; `frame-check --only accentLocation` (izinli kutular dışında 0 px).

## ADR-005 · Gren sahnede, grade encode'da — Kabul
- **Bağlam:** gren `T` tohumlu olmalı (deterministik ve canlı). Grade sahne başına değil, film boyunca tek zincir olmalı.
- **Karar:**
  - Gren sahnede (tohum `T`'den).
  - Ton eğrisi / renk dengesi / vinyet / siyah noktası / renk etiketi encode'da, world'ün grade zincirinde.
  - Encode'da ek gren yok.
- **Sonuç:** grade zinciri world'e göre seçilir (koyu / aydınlık / yok).
- **Pakette:** `world.json → grade.chain`; `motion-render grade`.

## ADR-006 · Dünya ölçeği dolly (uzak kamera yerine) — Kabul
- **Bağlam:** çok uzak kamera (z ≈ −8000) ve dev katmanlar Chromium'da karo düşürdü: siyah bloklar, eksik harfler.
- **Karar:** kamera okuma mesafesinde kalır; dünya odak etrafında ölçeklenir (`scale3d`). İzdüşüm aynı matrisle hesaplanır.
- **Sonuç:** kare 0.8–1.7 s, karo kaybı yok [ÖRNEK].
- **Pakette:** LESSONS (Chromium/karo belleği); kamera kancaları `__camK`, `__camSpeed`.

## ADR-007 · Büyük katman yarım çözünürlükte; filtre gölgesi yerine box-shadow — Kabul
- **Bağlam:** büyük katmanlar raster belleğini doldurur. `filter: blur` gölgesi pahalıdır ve 3B bağlamı düzleştirir.
- **Karar:**
  - Büyük yüzeyler (sayfa, masa) yarım CSS çözünürlükte + `scale(2)`.
  - Gölgeler `box-shadow` / `text-shadow`.
  - Örtüşen kardeşlerde açık `translateZ` sırası.
- **Sonuç:** raster belleği ~4× azaldı. Yan etki: tek kare probe ile sıralı render arasında küçük metinde raster farkı olabilir (bayatlık taramasında yanlış pozitif riski → içerik yan yana karşılaştırılır).
- **Pakette:** LESSONS (karo belleği, sahne başı `chromiumArgs`).

## ADR-008 · Birleştirmeden önce bayatlık taraması zorunlu — Kabul
- **Bağlam:** kısmi yeniden render, komşu aralığı eski değerle bıraktı. Teslim edilen filmde bir karede ışık sıçradı. Işık QC'si değeri koddan okuduğu için sıçramayı görmedi.
- **Karar:**
  - Değişikliğin **bütün etki aralığı** formülden hesaplanır; değerin girdiği her `T` aralığı silinir.
  - Birleştirmeden önce taze probe ↔ kayıtlı kare karşılaştırılır (ortalama fark > 0.01 = bayat).
- **Sonuç:**
  - Çalışma kuralı oldu: yedek → aralığı sil → yeniden üret → tanık kareler aynı mı → kopya.
  - Kod ilgisiz yerde değiştiyse küçük metinde yanlış pozitif çıkabilir; içerik yan yana karşılaştırılır.
- **Pakette:** RULES RH-6; `imgdiff stale`, `frame-check --only identical`; `render --range a-b --tag <T> --resume`.

## ADR-010 · Sahte metin yok — Kabul
- **Bağlam:** yer tutucu (lorem) metin, ölçümü ve okunurluk kararını boşa çıkarır. Ekranda neyin yazılacağı projeden projeye değişir.
- **Karar:**
  - Sayfalar gerçek metin taşır (proje dilinde, gerçek glif ve satır ritmiyle).
  - **Ekrana ne yazılacağı projenin metin kuralıdır** (`project.md §2`). [ÖRNEK] bir projede konuşulan kelime ekrana yazılmaz, başka projede vurucu cümleler kelime zamanlı yazılır.
  - QC metni sahnenin kendisinden okur: glif kapsamı, yasak kelime, birebirlik.
- **Sonuç:** gerçek metin geniş planda seyrek okunur; yoğunluk kararı kullanıcıdadır (açık karar).
- **Pakette:** RULES KD-2; `project.md` metin kuralı; `qc` glif kontrolü.

## ADR-011 · Katmanlama: evrensel + world + manifest (+ proje) — Kabul
- **Bağlam:** kurallar tek bir görsel dile göre yazılmıştı. Aynı filmin başka sahnesi aynı evrensel kuralları ama farklı malzeme/ışık/grade'i istiyordu.
- **Karar:**
  - Evrensel kurallar skill'dedir.
  - Dünyaya özgü olan world dosyasındadır.
  - Sahne künyesi (world, ışık sıcaklığı, aksan hakkı, anahtar kareler, istisnalar) manifestte durur.
  - Yönetmen sahneyi bu üçünden (+ `project.md`) okur.
- **Sonuç:** yeni sahnenin eksik listesi world dosyasından çıkar. Grade ve QC manifestten sürülür.
- **Pakette:** paketin mimari temeli: `skills/motion-core` (süreç) · `world/world.json` + jsx + `lessons.md` · `scenes.json` · `project.md`. World seçilmedikçe primitif/renk/font/kalıp varsayılan gelmez (VK-07).

## ADR-015 · Kaynak görselin kendi aksan rengi içeriktir, muaftır — Kabul
- **Bağlam:** bir sahnede gerçek ekran görüntüleri kullanıldı. İçlerindeki aksan renkli öğeler (kullanıcı adları, işaretler, ikonlar) aksan hakkını ihlal sayılıyordu.
- **Karar:**
  - Kaynak görselin kendi aksan rengi içerik sayılır, kurala tabi değildir (manifest `contentRed: true`).
  - Aksan hakkı yalnız sahnenin **kendi çizdiği** aksanı sayar.
  - Görseller doygunluk düşürülerek yatıştırılır.
- **Sonuç:** QC görsel aksanını "içerik, muaf" uyarısı olarak listeler. Sahnenin kendi öğesine aksan eklenirse sayım geçerlidir.
- **Pakette:** manifest bayrağı `contentRed`; RULES AK-3.

## ADR-018 · Üç kez aynı bulgu → ölçülebilir kural — Kabul
- **Bağlam:** aynı yönetmen bulgusu üç ayrı sahnede ayrı ayrı yakalandı ve her seferinde elle düzeltildi: kahraman küçük, metin okunmuyor, kadraj boş ya da karanlık.
  - [ÖRNEK] kahraman kadrajın %4'ü / yüksekliğin %12'si; ekran metni 16.7–18 px.
- **Karar:** bir bulgu üç sahnede (ya da üç projede) tekrarlanınca ölçülebilir kurala ve QC kontrolüne dönüşür. İlk uygulama:
  - kahraman ≥ %30 alan ya da ≥ %50 yükseklik;
  - okunacak metin ≥ 22 px;
  - boş siyah > %70 uyarı, > 1 s hata.
- **Sonuç:**
  - Kural bir ilkeye bağlanır ("kahraman büyük ve okunur"). Eksik listesi kadrajla başlar.
  - Yeni kural ilk sürümde UYARI olarak gelir; eski sahne kayıtları toplu hataya düşmez. Yönetmen geçişi uyarıyı kapatır ya da `review.*` ile gerekçelendirir.
- **Pakette:** RULES K1, KD-2, KD-9; `/motion:promote` ölçütü (world/proje dersi → core).

## ADR-019 · QC geçti ama okunmuyor → kontrast ve hedef bant — Kabul
- **Bağlam:** bir sahne QC'den 0 hatayla geçti (kütle %46, metin 25 px) ama okunmuyordu. Ölçütler boyutu ve doluluğu ölçüyor, ışığı ve kontrastı ölçmüyordu. Ölçüm şunu gösterdi:
  - ortalama parlaklık %8.4 (world bandı dışında);
  - kahraman − çevre 11–13/255;
  - 42 metnin 37–42'si 4.5:1 altında.
- **Karar:** üç evrensel ölçüt eklendi:
  - kahraman − çevre ≥ 25/255;
  - okunacak metin ≥ 4.5:1 (WCAG, **render edilmiş karede**);
  - dünya başına parlaklık **hedef bandı** (taban değil).
- **Sonuç:**
  - Ölçüm render edilmiş pikselden alınır, çünkü DOM'daki renk ışığı, bulanıklığı ve örtülmeyi bilmez.
  - Eski sahne kayıtları uyarı alır; ya kapatılır ya `review.kontrast` ile gerekçelendirilir.
- **Pakette:** RULES KD-2, KD-6 (bant world'de **zorunlu**, D1-06); `qc` kontrast kontrolleri.

## ADR-021 · Işıkla kesme: `cut: "light"` — Kabul (mekanizma)
- **Bağlam:**
  - Her sahne siyaha iner ve siyahtan açılırsa bitişik iki sahne arasındaki kesme ölü siyah olur.
  - Işık darbesiyle kesme A/B'si (K-08) ölü siyahı kaldırdı: boş siyah 35 → 4 kare.
  - Aynı A/B'de görüldü: çıkan sahne kendi kapanışıyla siyaha inerse sızıntı kesme olmaz, flaş olur.
- **Karar:**
  - Manifestte çıkan sahneye `"cut": "light"` (varsayılan `"black"`), girene `"cutIn": "light"`.
  - **Gömülü 2 kare sızıntı:** A'nın son karesi tepenin %55'i, B'nin ilk karesi tepe. Eklemeli, tepe ≤ %60. Renk varış dünyasının ışığı.
  - Yedek teslim: aynı sızıntı ayrı 2 karelik katman klibi olarak da üretilir.
  - Son-kare-siyah istisnası:
    - A'da pozlama kapanışı yok; kesme hız tepesinde (K-06);
    - B'de `blackStart` kapalı;
    - grade, A'nın son karelerinde siyah noktasını kapatmaz.
- **QC'de tanınma** (hedef mekanizma; pakette `qc` `cut`/`cutIn` alanlarını **okumaz** — çıkan sahne `slice: true` ile son kare kontrolünden muaf tutulur, aşağıdaki ölçüler `fc:ramp`/`fc:temporal` bildirimiyle alınır):
  - son 2 karede luma n−2'ye göre düşmez (tol 2);
  - artış tepesi ≤ %60;
  - n−3'ten önce siyaha iniş yok;
  - fade dedektörü sızıntıyı `cut` etiketiyle yazar, hata saymaz;
  - aksan sayımı değişmez.
- **Sonuç:** yalnız ADR'li çiftte kullanılır. Kaynak projede tek geçişte uygulandı.
- **Pakette:** manifest `cut` / `cutIn` (belge kaydı; araçlar okumaz) + `slice: true`; RULES SN-2 istisnası; `frame-check --only seam,ramp`.

## ADR-022 · SERT ve VARSAYILAN kural ayrımı — Kabul
- **Bağlam:** kurallar iki türlü birikti:
  - ölçülen, okunurluğu ve bütünlüğü koruyan kurallar;
  - alışkanlıktan gelen varsayılanlar: düz zemin, ortada yazı, tek katman.

  Varsayılanlar kural gibi korununca sahne kompozisyonları şablonda kaldı. Referanslar derinlik, malzeme, ışık ve ikincil hareketle çalışıyordu.
- **Karar:**
  - **SERT** (değişmez) = QC'nin ölçtüğü her şey: aksan kotası, kahraman/okunurluk/kontrast/bant/boş siyah, fade yok, son kare, QC tablosu. İstisna yalnız manifestte kayıtlı olur (`review`, `exceptions`, ADR'li `cut`).
  - **VARSAYILAN** (aşılabilir): düz zemin, düz yazı, tek katman, şablon kompozisyon, world'ün malzeme seti, repertuvar sırası. Aşarken gerekçe, kaynak (kalıp / referans / kendi) ve geri alma yolu yazılır.
  - **Katkı:** her raporda `## Katkı`; görev başına 1–3 katkı; A/B'siz katkı "deneme"; sahneye yazılan katkı yarım sayılır, ortak dosyaya taşıma önerilir.
  - Mevcut sahne stili sadakat gerektirmez; yeniden teklif A/B'dir.
  - **Araç ve proje ayrımı:** world ve araç proje adı, marka rengi, sahne kimliği taşımaz; değerler prop'tan ve `project.md`'den gelir.
- **Sonuç:** zevk listesi (§0.6) render kapısı oldu; repertuvar ve storyboard kapısı eklendi; stil borcu bu listeyle denetlenir.
- **Pakette:** RULES (SERT ↔ VARSAYILAN sınıfları, Z-KAPI); rapor şablonu `## Katkı`; VK-07 (paket süreci taşır, üslubu taşımaz).

## ADR-023 · Üretken çıktı = varlık — Kabul
- **Bağlam:**
  - Üretken servis bağlandı. Motor ışık, kamera, tipografi ve geometriyi zaten kuruyor; eksik olan gerçek **doku** ve **organik hareket**.
  - Üretken modelin sahne ya da tam video üretmesi motorun determinizmini (ADR-001), ışık arkını ve SERT kuralları kontrol dışı bırakır.
- **Karar:**
  1. Üretken çıktı yalnız **varlıktır**: plaka, kısa eleman/geçiş klibi, efekt animasyonu, storyboard görseli.
  2. Varlık `assets/gen/` altında **hash'li ve manifestli** durur. Alanlar: id, tür, model, istem, seed, kredi, kaynak hash, conform, alfa, lisans, kullanıldığı sahne listesi, onay durumu.
  3. **Render anında üretim yok.** Sahne kodu yalnız yolu bilir. Üretim tekrarlanmaz; değiştirme yeni id'dir.
  4. Model beyaz/kara listesi proje dosyasındadır; sahne direktifi değiştiremez.
  5. Görev başına kredi tavanı, bakiye önce/sonra, taslak önce; final kullanıcı onayıyla.
  6. Katalog bir kez süzülür.
  7. **İki yol, tek manifest:** YOL A (üretim aracı varsa) · YOL B (istem sayfası; kullanıcı üretir, inbox'a bırakır). İkisinde de ingest conform eder ve kaydeder.
  8. İşi görmemiş doğrulayıcı (reviewer) QC'yi, A/B'yi ve bütçeyi denetler (manifest kredi toplamı = bakiye farkı).
- **Seçenekler:**
  - varlık yok, her şey motorda → doku düz kalır;
  - üretken sahne / tam video → SERT kurallar ve determinizm kaybolur, **red**;
  - **varlık hattı** (seçilen).
- **Sonuç:** üretken katkı ölçülebilir ve geri alınabilir hâle geldi; bütçe ledger'la denetlenir.
- **Pakette:** GENAI.md (RULES §15 GEN-1 … GEN-9 prosedürü). D1-04: eski ihtiyaç/üretim ajanları emekli; ihtiyaç ve istek `motion-research`'te, üretim ve ingest `motion-director`'da (GENAI.md'ye göre), kabul `motion-reviewer`'da. D1-01: kimlik `.env` değil CLI oturumu.

## ADR-024 · Üretim yolu A = CLI, tek kapı, bekçi kodda — Kabul
- **Bağlam:**
  - Bağlayıcıda üretim aracı yoktu (yalnız okuma). Kullanıcı varlığı kendisi üretmek istemedi.
  - Servisin kendi skill'leri kendi varsayılanlarını öneriyordu: başka modeller, "maliyet tahmini yapma". Bu, beyaz liste ve bütçe bekçisiyle çelişiyordu.
- **Karar:**
  - Üretim **yalnız** hattın üretim komutuyla yapılır. Bekçi kodun içindedir:
    - beyaz/kara liste (politika = `project.md §9` makine kopyası);
    - her öğe için `generate cost`;
    - tavan (harcanan + tahmin > tavan → DUR);
    - bakiye önce/sonra; gerçek kredi yan dosyada.
  - Doğrudan `generate create` çağrılmaz. Harici skill'ler yalnız CLI başvurusudur; varsayılanları geçersizdir.
  - Çıktı yine `inbox/` → ingest (ADR-023 değişmez).
- **Seçenekler:**
  - YOL B sürer → kullanıcı istemedi;
  - CLI serbest (ajan doğrudan üretir) → bekçi ajanın dikkatine kalır, **red**;
  - **CLI + kodda bekçi** (seçilen).
- **Sonuç:**
  - İlk görevde tahmin = gerçek, ledger `match: true`.
  - CLI'nin platform indirimini uygulamadığı görüldü (→ ADR-025, platform notu).
- **Geri alma:** politikada boş beyaz liste → üretim komutu her öğeyi reddeder; YOL B geçerli kalır.
- **Pakette:** `motion-render gen <request> [--cap N] [--dry]` (RULES GEN-8, GEN-3, GEN-4); `motion-render doctor`.

---

## Bu dosyada olmayan kararlar

| ADR | konu | sınıf | nereye |
|---|---|---|---|
| ADR-004 | 2.5D "modelleme, ima et"; 3B katı cisim ve WebGL masa terk | world (desk-paper) — ilkesi core-ilham | `skills/motion-world/examples/desk-paper/` (DECISIONS). İlke ("derinlik örtüşme, gölge, odak, doku + ışıktan") RULES zevk listesinde |
| ADR-009 | Buruşturma efekti kaynak videodan (key + tint + maske) | world (desk-paper) / proje | desk-paper örneği |
| ADR-012 | Eski sahne kodunun evrensel katman sarmalayıcısıyla dönüşümü (kompozisyona dokunmadan) | proje geçmişi (core-ilham) | taşınmadı; ilkesi ADR-011 ve LESSONS ("dünya katmanı sarmalayıcıyla") |
| ADR-013 | Bir sahnede ikinci aksan rengi bilinçli istisna | proje | taşınmadı; mekanizması (`exceptions.<sınıf>` aralığı) RULES AK-3'de |
| ADR-014 | Aynı nesnenin üç sahnede tek bileşen olması | world / proje | screen-dark örneği; ilkesi ("tekrar eden nesne tek bileşen") LESSONS'ta |
| ADR-016 | Ekran dünyası veri paleti | world (screen-dark) | `examples/screen-dark/` |
| ADR-017 | Masa sahnesi kendi world katmanını çizer (sarmalayıcı değil) | world (desk-paper) — ilkesi core | desk-paper örneği; ilke ("evrensel katman tek kaynaktan; çift vinyet/gren/drift yok") world sözleşmesinde |
| ADR-020 | Jenerik ekran dili kimliksiz çıktı verdi; dünya kimliği markanın ışığından | world (screen-dark) / proje — dersi core-ilham | screen-dark örneği; ders LESSONS'ta |
| ADR-025 | Platformun "sınırsız pencere"si uygulamada; CLI tek varlık ya da acil iş | platform / proje | GENAI.md §3 platform notu ve §13 YOL B (`policy.unlimWindow`, `rule8Suspended`) |
