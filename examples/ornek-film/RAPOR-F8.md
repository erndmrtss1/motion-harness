<!--
[ÖRNEK] Kaynak projenin F8 faz sonu raporu (ana oturumun son mesajı), anonimleştirilmiş.
Yapı, kapı tablosu, dikiş tablosu, karar sayıları ve kapanış satırı gerçektir. Kelimeler, marka, bakiye ve world adı [ÖRNEK].
Kanonik biçime (PLAYBOOK §7) uyar: H1 sonuç → sonuç paragrafı (karar, §0.6, bakiye) → ## Kapılar → faza özgü (dikişler) →
## Ara notlarına yanıt + teslim turundaki engel → ## Açık kararlar ("Kararın gereken noktalar") → ## Dosyalar → ## Katkı → **DUR — …**.
Ölçü: ≈ 4,8 bin karakter, ~75 satır, 2 tablo.
-->

# F8 · Perde 6 (S20–S22) ve bütün film: teslim

Perde 6 bitti ve bütün film birleşti. Reviewer kararı **TESLİM GEÇER** (§0.6 8/8, UCUZ geçer). İlk teslim turu yalnız encode yüzünden geçmemişti; düzeltildi, yeniden ölçüldü ve taze reviewer r2'de geçti. Kredi 0, bakiye <X> → <X> [ÖRNEK].

## Kapılar

| kapı | sonuç |
|---|---|
| QC | Hata yok, 657/657 kare. İniş sahne sonu kapanışı sayıldı, fade bulgusu yok. Ortalama parlaklık %52 (world bandı içinde). |
| Son kare siyah | P6 karesi ve mp4'ü 0. Bütün filmin son 4 karesi (6939–6942) Y = 16, saf siyah. |
| K1 | 5/5 kare geçiyor. Kutu yazıları 165–169 px (≥ 160). |
| K3 / OURS | S20 0.646 · S21 0.621 · S22 0.504; S22 için istisna gerekmedi. OURS 0.567, kamera basamağı 0. |
| Aksan | QC 0/1 aralık; logo ikincil sınıfta sayılıyor, istisna kayıtlı. 46 karenin hiçbirinde izinli kutular dışında aksan pikseli yok. |
| Logo tonu | P2 başlık bloğundaki logoyla aynı ton, iki mp4'ten ölçüldü: ΔE2000 0.14–1.86 (sınır ≤ 3). |
| Siyaha iniş | Kare kare düzgün iniyor (en kötü sıçrama oranı 1.46). Tarayıcıdaki 8-bit sürüme göre pürüz 0.299 → 0.080. |
| Bakiye | <X> → <X> [ÖRNEK] |

## Perde dikişleri (/255)

| dikiş | önceki komşu | **dikiş** | sonraki komşu | sonuç |
|---|---|---|---|---|
| P1 → P2 (29.85) | 0.995 | **0.900** | 0.792 | ✓ |
| P2 → P3 (40.38) | 0.947 | **1.323** | 1.109 | ✓ |
| P3 → P4 (64.08) | 0.040 | **0.570** | 2.076 | ✓ |
| P4 → P5 (82.83) | 5.083 | **5.596** | 5.538 | ✓ (hareketli, ≤ 6.09) |
| P5 → P6 (104.77) | 0.381 | **0.203** | 0.383 | ✓ |

## Ara notlarına yanıt

1. **Basamak:** f585'teki basamak kesme değildi. Logo damgasına kameradan 1 karelik 2 px darbe vermiştim. Kaldırdım; basamak artık 0. Bu tür ihlali bir daha "kasıtlı" diye bırakmayacağım; kalıcı belleğe yazdım.
2. **Logo tonu:** P2'deki logoya uydurdum (yukarıdaki ΔE).
3. **Siyaha iniş:** sayfa pozlamasız çiziliyor; iniş eğrisi sonradan yüksek hassasiyetle ve dither'la uygulanıyor (`motion-render expo-post`).

**Teslim turundaki engel:** grade, son 12 karede iki filtreyi aynı anda kapatıyordu. İnişin sonunda tek karede göz kırpması gibi bir parlaklık düşüşü oluşuyordu: f645 Y 30.55 → 22.24, ardışık fark 10.4 (komşu ≈ 1.7). Artık iki grade kare kare karışıyor (`grade.fadeOut [589, 652]`). Aynı turda 2× → 1× geçişindeki keskinlik sıçramasını da 11 karelik karışımla kaldırdım (`ss2 --blend 6`).

## Açık kararlar

1. **Logo yer tutucu:** filmin son karesinde yer tutucu logo duruyor; asıl logo gelince değişecek (F2-B karar 6). Etki: son kart kareleri yeniden render.
2. **"1 aralık = logo" beklentisi:** P2 tonundaki logo QC'nin aksan eşiğine girmiyor, bu yüzden 0 aralık çıkıyor. Öneri: böyle kalsın. İstersen logo marka tonuna çekilebilir; o zaman QC 1 aralık olur ama P2'deki logodan farklı görünür.
3. **S20 itişi k 1.36'da bitiyor** (brief ≈ 1.2). Bu değerde kadraj boş yüzey bandına sığıyor. Öneri: kabul.
4. **Işık çekilişi ikinci vurgu kelimesi sırasında (114.6) başlıyor.** Konuşma 115.38'de bitiyor, film 115.72'de; aradaki süreye 1.0–1.3 s'lik bir çekiliş sığmıyor. Öneri: sessiz kuyruk (film süresi uzar; ses dosyasına düz sessizlik).

F9 cila listesine eklenenler:

- hareket bulanıklığı eşikte yumuşak başlasın;
- diğer sahne sonlarında grade'in son 12 kare davranışı gözden geçirilsin;
- isteğe bağlı: S21 kutularına etiketler;
- isteğe bağlı: 108.8–110.0'daki %58.1–58.8 parlaklık (bant üst sınırı %58).

## Dosyalar

- **Bütün film:** `out/FILM-onizleme-ses.mp4` (0–115.72, 6943 kare, 1080p60, ses v2)
- **Perde 6:** `out/scenes/P6.mp4`, `out/scenes/P6-ses.mp4`; animatik `out/scenes/P6-A.mp4`
- **Kontak ve QC:** `out/probe/P6-contact.png`, `out/probe/P6-qc.json`, `out/probe/P6-fc.json`
- **Kod:**
  - `p6.jsx` (yeni), `p5.jsx` (yalnız dışa aktarım; varsayılan eski çıktıyı veriyor, probe fark 0)
  - world logo bileşeni (isteğe bağlı aksan parametresi)
  - `scenes.json` (`grade.fadeOut`, `review.isik`)
- **Belgeler:** `docs/KUNYE-P6.md` · `docs/REVIEWER.md` · `project.md` §23 / §23a · `out/RENDER_REPORT.md` · `docs/RETRO.md` · `world/lessons.md` (F8 dersleri)

## Katkı

- **2× kuralı:** `motion-render ss2` kamera k < 0.5 olan aralıkları 2× çizip birleştiriyor; sınırda iki çözünürlüğü karıştırıyor.
- **Sahne sonu siyaha iniş:** `motion-render expo-post` 16-bit hassasiyet ve dither ile uyguluyor.
- **Grade inişi:** `grade.fadeOut` sahne sonundaki inişte tek kare basamağı önlüyor.
- **QC yanlış alarmları kapatıldı:**
  - animatikte sahne sonu muafiyetinin çalışmaması `review` kaydıyla;
  - üstte yarım kalan simgenin "!" gibi okunması kadraj denetimine kural olarak eklendi.
- **World'e işlenen dersler (F8):** basamak 0; logo tonunu teslim edilmiş perdeden ölçmek; ışık çekilişinde önce pozlama; büyük harfte satır aralığı ≥ 1.2 × punto; aletin gölgesinin de kadraj dışında olması; sahne sonu inişini mp4'ten ölçmek.
- **Süreç dersi:** SERT ihlal "kasıtlı" diye bırakılmaz; istisna önce sorulur (core aday → `/motion:promote`).

**DUR — Perde 6 teslimi.** Yukarıdaki dört karar için onayını bekliyorum.
