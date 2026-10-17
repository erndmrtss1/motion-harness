# RENDER_REPORT — [ÖRNEK] film (seçki)

> **[ÖRNEK] Kaynak projenin `out/RENDER_REPORT.md` dosyasından anonimleştirilmiş üç ardışık giriş:** cila + master v1, kısmi düzeltme + master v2, teşhisli düzeltme + master v3.
> Kare aralıkları, süreler, ölçüler ve dosya düzeni gerçektir. Kelimeler, marka ve bakiye `[ÖRNEK]` ile değiştirildi. Film kimliği `FILM`.
>
> Gösterdikleri:
> - sona ekleme;
> - her girişte karar → uygulama → ölçüm → reviewer → kredi sırası;
> - bayatlık tanığı ve bit-eşlik satırları;
> - temizlik kaydı.

## <tarih> · F9 — cila + master v1

- **Kararlar** (project.md §24 kural satırları, §25, §25a): sessiz kuyruk K3'e dahil değil (kural); K1 son kartta yükseklik ≥ %55. F9 kapsamı 6 madde; YAPMA → teknik borç.
- **#1 çizgi kenar dalgası:**
  - Yalnız kenar, tohumlu. Düzlem raster ızgarası (1 texel/birim, dikey 4 örnek) kenarı 0.25 birim adımla nicemler → taban yarı kalınlık 2.1 → 2.0, genlik 0.25 → kenar −0.43 / +0.45 px.
  - P5 f553–832 2× (4.53 s/kare); 555–830 kopya; 553/554/829–832 aynı (tanık).
  - QC 0 · aksan 1/1 · konum 0 · ΔE2000 mp4 2.24–2.99, master 2.21–2.53.
- **#2 pozlama −%1.5:**
  - Sayfa örtüsü 8-bit alfa basamağı verdi (4 × ΔY ≈ 0.9) → `expo-post` `expoPost.dip` (duruk dikdörtgen dither; rampalanan TPDF ölü bölge yaptı).
  - P6 f224–332 1× yeniden + birleştirme + expo-post. Kontak hücreleri bant dışı 0/29; kazanç = 1 − dp (5 ondalık).
- **#3 son 12 kare:**
  - P1–P5 `slice` → saf kare / fadeOut yok (kod + manifest).
  - Bulgular (yalnız rapor): P3 son tutuşunda iki ışık adımı (f3838/3840, ham ΔY −0.29/−0.22; oran 2.25–3.54); önizleme P5→P6 encode sıçraması 4.76 (master tek encode: 0.77); film başı ışık açılışı f4'te ani başlar (oran 1.07).
- **#4 bütün film QC** (`out/probe/FILM-full-qc/`): hata 0 · 7038 kare · aksan 1 aralık (5526–5800) · ikincil sınıf 239 kare istisnada · glif 0 · fade yalnız film sonu · K1 38/38 · bant ort. %55.02 · OURS 0.517 · K3 22/22. Bütün film sayfası (117.3 s); manifest global aralıklar; kareler sabit bağ.
- **#5 master:**
  - `out/master/FILM_v1.mov` ProRes 422 HQ yuv422p10le 6469 MB · `FILM_v1.mp4` H.264 CRF 16 107 MB · 7038 kare / 117.30 s.
  - Ses −16.01 / −16.02 LUFS, −4.17 / −4.19 dBTP (doğrusal −3.54 dB; kuyruk dahil ölçüm). Tek sürekli encode.
  - Arşiv `out/archive/FILM_v1/` (FFV1 kayıpsız, framemd5 bit-exact).
- **#6 teslim paketi:** `docs/TESLIM.md`.
- **Yeni araçlar:** master, arşiv; expo-post `dip`.
- **Reviewer (F9 r1):** F9 kapsamı GEÇER, §0.6 8/8, UCUZ geçer.
  - Kapsam dışı SERT bulgu: P1 f236 (3.93 s) çubuk stili tek karede değişiyor (K8) → açık karar (öneri: geçiş + P1 f230–250 yeniden + master v2).
  - İsteğe bağlı: f4 açılış ease-in, f865–885 kelime değişimi.
- Kredi 0 · bakiye <X> → <X> [ÖRNEK].

## <tarih> · F9-B — P1 üç geçiş + master v2

- **Kararlar** (project.md §25b): P1 f236 düzelt; ışık yuvarlaması borç; açılış + rack aynı geçişte; AAC 245 kb/s kabul; animatik tur dizinleri v2 GEÇER'den sonra silinebilir.
- **P1:** f4–8 (açılış kalkışı), f226–281 (kademeli çubuk geçişi + çizgiler + iz silme + eksen), f865–894 (rack) 1× yeniden; aralık dışı imgdiff 0.
  - QC 0 · K1 6/6 · OURS 0.622 · K3 6/6 · devir 0.900.
  - Ardışık fark oranı: açılış 1.13 · çubuk geçişi 1.08 · rack 1.06.
- **Bütün film QC v2:** hata 0 · aksan 1 aralık · ikincil sınıf istisnada · glif 0 · K1 38/38 · OURS 0.517.
- **Master v2:** `out/master/FILM_v2.mov` · `FILM_v2.mp4` · 7038 kare / 117.30 s · −16.01 / −16.02 LUFS · −4.17 / −4.19 dBTP.
  - ProRes'te değişmeyen kareler v1 ile **bit-aynı** (mp4'te tek encode hız denetimi farkı ≤ 1/255).
  - Son 12 kare: film başı 1.01.
- **Arşiv v2:** `out/archive/FILM_v2/` (P1 FFV1 yeni; P2–P6 v1'den sabit bağ).
- **Bulgu (yapan):** bir bileşenin orta/dikey çizgileri belirdiği karede tek karede çıkıyordu (f242) → çizilerek gelir. Etiketler tek tek opaklıkla → açık karar.
- **Reviewer (F9-B r2):** GEÇER, §0.6 8/8, UCUZ geçer. K8 üç aralıkta doğrulandı; oranlar ≤ 1.08; dikişler sıçramasız. Açık (isteğe bağlı): etiketler yalnız opaklıkla.
- **Temizlik:** v2 GEÇER sonrası animatik tur dizinleri (`*_A_r*`, 17 dizin, 4.7 GB) geri dönüşüme taşındı; **kalıcı silme yok**. Final PNG dizinleri (P1–P6) ve son animatikler yerinde.
- Kredi 0 · bakiye <X> [ÖRNEK].

## <tarih> · F10 — son kart keskinlik + vuruş → master v3

- **Teşhis:**
  - Logo, yanındaki display metin kadar yumuşak (3.22 ↔ 3.30 px).
  - Neden 3B kamera büyütmesi: kenar ≈ 1.65 px × k; DPR ve katman ipuçları etkisiz.
  - Logo pişirmesiz SVG: **brief varsayımı geçersiz**.
- **Düzeltme:**
  - Logo kendi 3B katılımcısında S=2 dokuda → 1.745 px (metin 3.29; oran 0.53, Laplacian ×2.41).
  - Mürekkep oturması: yoğunluk 0.82 → 1 + tohumlu ±0.3 px kenar.
  - Işık vuruşu r −%20 (brief −%30 → logo ΔE 3.38; açık karar).
  - Tutuşta gren −%30, nefes 0.
- **P6:** f560–751 1× yeniden (560–583 aynı) · QC 0 · K1 %59 · logo ΔE ≤ 2.33 · 559↔560 0.93 · son 8 kare Y 16 · P5→P6 0.203.
- **Bütün film QC v3:** hata 0.
- **Master v3:** `out/master/FILM_v3.mov` / `.mp4` (7038 kare, −16 LUFS). v2 ile değişmeyen kareler ProRes'te bit-aynı (değişen yalnız 6870–7036).
- **Arşiv v3:** P6 yeni; P1–P5 v2'den bağ.
- **Reviewer (F10 r1):** GEÇER, §0.6 8/8, UCUZ geçer.
  - Bağımsız ölçüm: logo 1.76 ↔ metin 3.31 px (0.53), gradyan p99 oranı 1.33.
  - Damga ilk karede tam; havuz daralması sıçramasız; K8 temiz.
  - r −%20 sapması kabul (açık karar). İsteğe bağlı: metne de S×.
- Kredi 0 · bakiye <X> [ÖRNEK].
