# F8 · Perde 6 künyesi (S20–S22) — ses v2 zamanı, FİLM SONU

> **[ÖRNEK] Anonimleştirilmiş gerçek künye (kısaltılmış).** Yapı, kare numaraları, süreler ve ölçüler kaynak projeden aynen alındı. Kelimeler, nesne adları, renkler, marka ve world adı `[ÖRNEK]` ile değiştirildi. Alet adları genelleştirildi (alet A/B/C). Kaynak künyede sonraki fazlar (F8-B, F9, F10, F10-B, F11) aynı dosyaya bölüm olarak eklenmişti; burada F10 bölümü örnek olarak bırakıldı.

Kararlar: `project.md` §23. Kod: `p6.jsx` (+ `p5.jsx` donmuş; yalnız dışa aktarım, perde bileşeni aynı) · world logo bileşenine isteğe bağlı aksan parametresi · film dağıtımı. Sayfalar: `P6.dc.html` (60 fps), animatik `--tag animatic`. Manifest P6: 657 kare, film 6286–6942, `slice: false` (son kare siyah denetlenir), `redQuota` 1 (logo), `layer.exit` 9.8333 s (film 114.6), `review.isik` (ışık çekilişi), `chromiumArgs`.

## Zaman (ses v2, `script/<ses-v2>.words.json`)

| shot | ses | sayfa karesi (@60) | vuruşlar |
|---|---|---|---|
| S20 | 104.7667–109.82 | 0–303 | (sessiz 104.77–105.9) · "[ÖRNEK-a]" 107.32 · "[ÖRNEK-b]" 108.10 · **"[ÖRNEK-c]" 108.90** · **"[ÖRNEK-d]" 109.24** |
| S21 | 109.82–113.62 | 304–531 | "[ÖRNEK-e]" 109.70 · "[ÖRNEK-f]" 111.00 · **"[ÖRNEK-g]" 111.20** · "[ÖRNEK-h]" 111.92 · **"[ÖRNEK-i]" 113.02–113.20** |
| S22 | 113.62–115.7 | 532–656 | **"[ÖRNEK-j]" 113.87** · **"[ÖRNEK-k]" 114.50**–115.38 · film sonu 115.72 |

## Yerleşim (dünya px; önceki perdenin boş bandı x 1640–3100, y 6060–7230)

| öğe | konum |
|---|---|
| eksenler | yatay 2030–2730 (y 6352), dikey 6190–6740 (x 2380; iki kutunun **arasından**) |
| kahraman simge [ÖRNEK] | üst 6240 – alt 6455 (≈ 215 birim → ekranda **299 px**); çizgi 16 |
| kutular | iki **eşit** kutu 602 × 292, aralık 56; metin 118 birim (ekranda ≥ 160 px), satır 124 |
| çapraz çizgi | sağ kutunun köşegeni, 11 birim |
| logo [ÖRNEK] | 260 birim, üst 6840, x 2250–2510; ışık çarpanı ≈ 0.888 telafisi |

## Aletler (tek tek; K8 izdüşümle)

| alet | zaman | hareket | tepe hız (px/kare) |
|---|---|---|---|
| alet A (S20 ölçü) | 106.8–108.68 | alttan girer → yatay eksen 107.32–107.56 → merkez etrafında 90° döner 107.57–107.95 → dikey eksen 107.96–108.18 → çentik 108.19 → yukarı çıkar 108.2–108.68 | 56.6 (giriş) |
| alet B (S20 simge) | 108.69–109.58 | kadraj üstünden girer → simge 108.9–109.22 (yola orantılı) → noktaya kalkar, **109.24 tık** (nokta ilk karede tam) → yukarı çıkar | 52.8 |
| alet C (S21 baskı) | 109.58–113.38 | soldan girer (baskı hızına yavaşlar) → sol kutu 109.78–111.0 sabit hız → aralıkta yavaşlar → sağ kutu 111.92–113.02 → sağdan çıkar | 33.7 |
| alet A (S22 çizgi) | 113.34–114.66 | köşegene normal yönde kadraj altından girer → **çizgi 113.87–114.17 (0.3 s)** → çıkar | ≤ 57 |

Kutu çerçeveleri kendiliğinden çizilir (iki yarım çevre aynı köşeden, 0.35 s): sol 109.45, sağ **"[ÖRNEK-g]" 111.2**. Logo **114.50 damga** (ilk karede tam, ölçek 1.05 → 1 / 4 kare, mürekkep oturması 0.35 s).

## Kamera (seçim a / a / a)

- **Devir:** P5 son anahtarı + son kesit hızı; sürekli saat, toz, pozlama uyumu, havuz ve ışık nefesi P5 formülleriyle. P5 son karesi (2×) ↔ P6 f0 (2×) **0.203/255** (P5 komşu kare farkı 0.381).
- **S20 a:** tek sürekli itiş 106.3 (k 0.70) → 107.4 (k 1.14) → **108.5 (k 1.36)**. k 1.36'da kadraj (1412 dünya px) boş banda sığar. Brief "≈ 1.2" → 1.36: bant genişliği gerekçesi (açık karar).
- **S21 a:** simgeden kutulara dikey kayma (k 1.37 → 1.40), ikinci vurguda (113.02–113.2) tutuş.
- **S22 a:** logoya iniş + itiş → son kare (k 1.55): logo 405 px, merkez (959, 644).

## Ölçümler (izdüşüm, render öncesi)

`motion-render frame-check P6 --only framing,toolPath,overlap,camera`:

- hata 0: simge, kutular, logo ve eksenler kadrajda; kutu metni ≥ 160 px; aletler ilk ve son karede kadraj dışı; iki alet aynı anda yok;
- kamera tepe 9.4 px/kare, **basamak 1** (f585 = damga darbesi, "bilinçli") → kullanıcı reddetti, aşağıda K1;
- K3 (`__camSpeed` ≥ 0.64 px/kare): S20 0.644 · S21 0.605 · S22 0.992.

## Varyantlar

| shot | a | b | c |
|---|---|---|---|
| S20 | önden biter (k 1.36) | eğik kalır (rx 18, k 1.22) — komşu sayfa + zemin kadrajda | sağdan yay (ry −6 → 0) |
| S21 | dikey kayma | ortada itiş (k 1.44) — K3 riski | küçük yanal bakış + dikey |
| S22 | iniş + itiş (k 1.55) | geri çekilme (k 1.25) — logo küçük, altta | güçlü itiş (k 1.95) — logo ortada büyük, kutular kesik |

Still'ler: `out/probe/f8/S20-varyant.png` … (tam çözünürlük `out/probe/f8/var/{a,b,c}-f….png`).

## Varyant turu (reviewer: a / a / a) + kullanıcı ara notları

Seçim S20 a · S21 a · S22 a (yapan, kullanıcı, reviewer). S22 c elendi: logo ortada ama iki kutu kenarlardan kesik (yarım kelime).

| # | bulgu | durum |
|---|---|---|
| K1 (kullanıcı) | kamerada basamak (f585) | **kaldırıldı** — damgada kameraya verilen 1 kare 2 px darbe idi (kesme değil). Kural basamak 0 → darbe yok; damga yalnız ölçek + mürekkep oturması. İzdüşüm: basamak 0 |
| K2 (kullanıcı) | logo tonu, P2 başlık bloğundaki logoyla aynı ekran rengi (ΔE2000 ≤ 3) | **uygulandı** — P2 mp4 (f480 / 520 / 560) logo iç piksel medyanı ölçüldü; P6 grade sonrası (`grade --png` tek kare) ΔE2000 0.57 / 0.32 / 2.23. Teslimde iki mp4'ten yeniden ölçülür. Sonuç: logo QC aksan çekirdeğine girmez → brief "QC 1 aralık = logo" yerine 0 aralık + ikincil sınıf istisnası (açık karar) |
| K3 (kullanıcı) | siyaha inişte 8-bit basamak | **uygulandı** — sayfa pozlaması 1; eğri `motion-render expo-post` ile kayan nokta + TPDF dither (±1 LSB). f580–656: ardışık kare farkı pürüzü tarayıcıda 0.299 → **0.080**, eğri düzgün çan (tepe 3.30), son 3 kare max 0/0/0 (tarayıcıda 2/0/0). QC fade: `review.isik` + `layer.exit` |
| R1 | S22 son kadraj: kutular hafif kesik, üstte yarım simge | **uygulandı** — iniş 114.0 (k 1.43) → 114.75 (k 1.46), sonra tutuş: iki kutu tam, logo 381 px merkezden 51 px aşağı; simge 114.45'ten itibaren tamamen dışarıda (izdüşüm "yarım" kontrolü) |
| R2 | ışık daralması spot / iris gibi | **uygulandı** — önce pozlama (114.6–115.7); havuz yalnız son 0.4 s'de %35 daralır, düşüm yumuşak |
| R3 | büyük harf noktaları üst satıra değiyor | **uygulandı** — satır aralığı 124 → 142 (1.2 × punto), kutu 292 → 304 |
| R4 | alet C ikinci vurgu tutuşunda kadrajda | **uygulandı** — sağ kutu baskısı 112.75'te biter, alet 113.0'da dışarıda; tutuş (113.02–113.2) aletsiz (izdüşüm kontrolü) |
| R5 | S22 alet A opak; damgada kadrajda | **uygulandı** — şeffaf alet; çıkış 114.18–114.48: damgada (114.5) kadraj dışı (114.47'de %0) |
| R6 | S20 sol üst kalabalık (isteğe bağlı) | öneri — kamerayı sağa almak komşu sayfa kenarını sokar |

Ölçümler (düzeltme sonrası, izdüşüm): hata 0 · basamak 0 · K3 S20 0.644 · S21 0.623 · S22 0.504 · aletler 56.6 / 52.8 / 33.7 px/kare · son kare logo 381 px · simge 299 px.

**2× kuralı:** P6 → kare 0–65 2× (k < 0.5 ± 6), 66–656 1×. Komut: `motion-render ss2 P6 --k 0.5 --pad 6 --blend 6` → `motion-render expo-post P6` → `motion-render grade P6`.

## Animatik reviewer turu: GEÇER (§0.6 8/8, UCUZ geçer — S21 sınırda)

Animatik 329 kare, kontak `out/probe/P6-contact.png`.

- QC: yalnız "kare 329/657" (animatik adımı). Fade incelendi (ışık çekilişi). İkincil aksan sınıfı istisnası konum doğrulamalı: 36 kare, kutular dışında 0.
- K1 5/5 (f270 %1/%69 · f400 %20/%79 · f500 %37/%80 · f560 %37/%49 · f600 %39/%57); kutu metni 165–169 px.
- K3 S20 0.646 · S21 0.621 · S22 0.504; OURS 0.567.
- Parlaklık: S20 54.6 · S21 55.6 · S22 (ışık öncesi) 53.4.

Reviewer: varyant turu maddelerinin hepsi giderildi (R1 simge 114.37'de tamamen çıkar; R2 merkez/kenar oranı ≈ 1.15 sabit, daire kenarı yok; R5 alet damgada dışarıda). **Zorunlu düzeltme yok.**

İsteğe bağlı:

1. logo tonu (P2 eşitliği, kullanıcı kararı);
2. 108.8–110.0 kontak hücreleri %58.1–58.8 (bant üst sınırı %58; ortalama ölçüt %52 geçer) — kayıt;
3. S21 düzeni — not;
4. son kadrajda kutu üst payı 40 px — kabul.

## 60 fps + bütün film

Render: `motion-render ss2 P6` → kare 0–65 2× (400 s, 5.6 s/kare), 66–656 1× (725 s, 1.2 s/kare), birleştirme → `expo-post` (67 kare) → `grade`. Çıktılar `out/scenes/P6.mp4` · `-ses.mp4` · bütün film önizleme (0–115.72, 6943 kare, 1080p60, ses v2).

| ölçü | sonuç |
|---|---|
| QC | çıkış 0 · kare 657/657 · **son kare ham 0, mp4 0** · fade 0 (+1 sahne sonu) · bant ort %52.04 · uyarılar incelendi notlu (f240 eksen kontrastı 23.1, açılış metinleri, kamera ivmesi hareket başı/sonları) |
| aksan | QC 0/1 aralık (logo ikincil sınıfta) · ikincil sınıf 4 kare f584–587 kayıtlı istisna · konum: aksan pikselli 46 karenin hiçbirinde izinli kutular dışında piksel yok |
| logo tonu | mp4 ↔ mp4: P2 f480 / 520 / 560 ↔ P6 f590 → ΔE2000 **0.81 / 0.30 / 2.05** (≤ 3) |
| K1 | 5/5 · kutu metni 165 / 168 / 166 / 169 px |
| K3 / OURS | `__camSpeed` S20 0.646 · S21 0.621 · S22 0.504 → GEÇER · OURS hareketli 0.567 / hold 0.433 · kamera basamak 0 |
| bütün film son kare | kare 6940 / 6941 / 6942: max 0, ortalama 0.000 (saf siyah) |

**Perde dikiş farkları** (ham kareler, /255; ölçüt: hareketli devirde ≤ 1.1 × büyük komşu, durağanda ≤ 2):

| dikiş | film s | önceki komşu | **dikiş** | sonraki komşu | ölçüt |
|---|---|---|---|---|---|
| P1 → P2 | 29.85 | 0.995 | **0.900** | 0.792 | ≤ 2.00 ✓ |
| P2 → P3 | 40.38 | 0.947 | **1.323** | 1.109 | ≤ 2.00 ✓ |
| P3 → P4 | 64.08 | 0.040 | **0.570** | 2.076 | ≤ 2.28 ✓ |
| P4 → P5 | 82.83 | 5.083 | **5.596** | 5.538 | ≤ 6.09 ✓ (hareketli) |
| P5 → P6 | 104.77 | 0.381 | **0.203** | 0.383 | ≤ 2.00 ✓ |

## Teslim turu r1 → encode düzeltmesi

Teslim turu r1 **GEÇMEZ** (yalnız encode). Grade, son 12 karede renk dengesi ve siyah noktasını birden kapatıyordu. İnişte f645 (film 115.52 s) Y 30.55 → 22.24, ardışık fark 10.4 (komşu ≈ 1.7). Ham karelerde yok.

**Düzeltme:**

- manifest `grade.fadeOut [589, 652]`: tam grade ile saf grade dalları kare kare karışır;
- 2× → 1× sınırı (f65/66, kenar enerjisi +%37) `ss2 --blend 6` ile 11 karede karışır.

**Sonuç:** iniş Y 46.8 → 1.0 tekdüze; en kötü fark/komşu 1.32 (≤ 1.5); son kareler ham Y 16; geçişte kare oranı 0.97–1.01; QC 0; logo ΔE2000 0.14–1.86. Yeni reviewer kısa doğrulama: **TESLİM GEÇER**.

## F10 · son kart keskinlik + vuruş (project.md §26)

**Teşhis (f700, yeşil kanal):**

- Logo kenarı %10–90 3.22 px ↔ yanındaki display metin 3.30 px (0.977); Laplacian 68.2 ↔ 83.5 (0.817).
- Logo pişirilmiyor ve süzgeçte değil: **brief'in varsayımı geçersiz**.
- Kenar genişliği k ile orantılı: k 1.40 → 2.38 px, 2.00 → 3.24, 2.37 → 4.05 (≈ 1.65 px × k).
- 2× DPR, `will-change` ve `translateZ` sonucu değiştirmiyor.
- ⇒ Neden 3B kamera büyütmesi: düzlem yerel px dokusunda çizilip k kat büyütülüyor.

| uygulama | değer |
|---|---|
| logo dokusu | ayrı 3B katılımcı kap, S = 2 yerleşim + `scale(1/2)` |
| mürekkep oturması | ilk karede tam şekil (f584); yoğunluk 0.82 → 1.0 (0.25 s); kenarda tohumlu ±0.3 px yayılma (zamanla sabit) |
| ışık vuruşu | havuz 0.25 s'de karta daralır **r −%20** (brief −%30: logo uçları düşüme girip ΔE 3.38 → açık karar) |
| render | P6 f560–751 1× + birleştirme + expo-post; önceki sürüm `out/frames/P6_f9b`; 560–583 kayıtlıyla aynı (imgdiff 0) |

| ölçü | önce | sonra | hedef |
|---|---|---|---|
| logo kenarı (f700) | 3.22 px | **1.745 px** | ≤ metin (±%10) |
| oran logo / metin (kenar) | 0.977 | **0.530** | ≤ 1.1 |
| Laplacian oranı | 0.817 | **2.41** | ≥ 0.9 |
| logo ΔE2000 (mp4 f660 ↔ P2) | — | 2.33 / 1.48 / 0.53 | ≤ 3 (−%30 denemesinde 3.38) |
| dikiş / seri | — | 559↔560 oran 0.93 · iniş en kötü 1.22 · son 8 kare Y 16 · P5 → P6 0.203 | ≤ 1.5 |
