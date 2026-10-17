# H2 · Göç testi: paket, kaynak projeyi fire vermeden üretiyor ve ölçüyor

> Tarih 2026-10-18 · Kaynak-A (FX-01) kopyası, depo dışında iki test projesinde (kaynak SALT OKUNUR; yalnız `cp`).
> Ölçüt (D1-02a): (a) kaynak runtime + paket araçları ve (b) paket runtime + paket araçları; ikisi de kare farkı ≤ 0,5/255 **ve** ölçüm araçlarının künye sayılarını (K1 %, K3, OURS, alet hızı, kamera tepe) ±%2 içinde yeniden üretmesi.
> Kanıt dosyaları git dışında: `evidence/h2-*.json`, `evidence/h2/fc-parity.md`.

**Sonuç: GEÇER.** P4 f500–560 (1×) her iki katmanda 61/61 kare bit-aynı; P6 f0–65 (2× süper örnekleme penceresi) (b) katmanında 66/66 bit-aynı, (a) katmanında 52/66 bit-aynı ve kalan karelerde ortalama fark ≤ 0,0001/255. Ölçüm araçları aynı karelerde kaynak araçlarla aynı sayıyı veriyor (≈ 11 500 sayının 2'si hariç birebir; o ikisi %0,4 farkla). `frame-check`, künyelerde güncel kodla ölçülmüş izdüşüm değerlerinin hepsini ±%2 içinde üretiyor.

## Kurulum

| katman | proje | runtime | araçlar |
|---|---|---|---|
| kaynak taban | test kopyası | kaynağın `support.js` + `animations-v3.jsx` | kaynağın kendi `render/` betikleri (kopya) |
| (a) | test kopyası | kaynağın `support.js` + `animations-v3.jsx` | `motion-render` (paket) |
| (b) | runtime'ı değiştirilmiş kopya | paketin `motion-runtime.js` + `motion-stage.jsx` (aynı dosya adlarıyla yerine) | `motion-render` (paket) |

Playwright 1.63.0 · Chromium 153.0.8010.12 (rev 1243) · ffmpeg 6.1.1 (ffmpeg-static 5.3.0). Karşılaştırma referansı: kaynak projenin `out/frames/` kareleri (before-manifest SHA-256'larıyla doğrulandı: 1827/1827 aynı).

## Kapılar

| kapı | sonuç |
|---|---|
| P4 f500–560 · 1× · (a) | 61/61 bit-aynı · ort \|Δ\| 0,0000/255 · max 0 |
| P4 f500–560 · 1× · (b) | 61/61 bit-aynı · ort \|Δ\| 0,0000/255 · max 0 |
| P4 · harness `lib/page.mjs`'e birleştirildikten sonra (a)+(b) | 61/61 + 61/61 bit-aynı (yeniden koşu) |
| P6 f0–65 · 2× (`ss2 --frames 0-65 -- --set FX_EXPO_POST=1`) · (a) | 52/66 bit-aynı · en kötü kare ort 0,0001/255 · max 5 · ✓ (sınır 0,5) |
| P6 f0–65 · 2× · (b) | 66/66 bit-aynı · max 0 |
| ölçüm: `qc` P4 (1099 kare, kaynak ↔ paket) | 5723 sayı · 5721 aynı · 2 sayı %0,39 (K1 mürekkep maskesi probe'u: 0,767 ↔ 0,764) |
| ölçüm: `qc` P6 (728 kare) | 3939/3939 aynı |
| ölçüm: `ours` P4 / P6 | 1126/1126 · 750/750 aynı (paket ek olarak K3 `__camSpeed` tablosunu da yazar) |
| `frame-check` ↔ künye izdüşüm sayıları | P4 24 satır ✓ · P6 11 satır ✓ (±%2; çoğu birebir) · 7 satır künyenin eski kod sürümü (aşağıda) |
| K1 % ↔ künye | P6: f239 %1/%69 · f363 %20/%79 · f465 %37/%80 · f515 %39/%46 — künye ile birebir (FX2→FX3 ızgarası); P4 en düşük f993 %19/%57 = künye "f1015 %19/%57" |

## Künye ile frame-check (izdüşüm, render'sız)

Ayrıntı tablosu: `evidence/h2/fc-parity.md` (metrik · künye değeri · frame-check · Δ% · ✓/✗).

- **Yeniden üretilen (35 satır):** P4 kamera tepe 29,93 ↔ 29,9 px/kare, p95, basamak 0, K3 S14/S15/S16, S13 ≥ 1,9 payı 0,496; S13 kalem hızları faz faz, S14–S16 cetvel, S15 kalem, S16 yazıcı; gövde ∩ glif kare sayıları. P6 kamera tepe 18,8, basamak 0, K3 0,644 / 0,623 / 0,327, cetvel 56,6, kalem 52,8, S21 kafa 33,7, soru işareti 299 px, kiriş ∩ logo 0.
- **Üretilmeyen 7 satır — künyenin kendi kaydettiği sonraki kod değişikliklerinden önce ölçülmüş:** P4 S13 K3 0,685 (künyedeki K3 düzeltmesinden önce), F6 r1/r3 kamera ve K3 değerleri, F6-B r1 halka hızları; P6 F8 S22 K3 0,504, F8-B kafa 52,5, ilk geçiş değeri. Kanıt: aynı eski ölçüm betikleri güncel kodda çalıştırıldığında frame-check'in sayısını birebir veriyor.
- Sahneye özgü kancalar (`__tools`, `__boxes`, `__holds`) yalnız test kopyasında `hooks/` + `checks/` dosyalarıyla verildi; paket kodunda projeye özgü hiçbir şey yok (D1-16).

## frame-check'in kaynak projede yakaladığı, künyeye girmemiş bulgular

Künye ölçümleri tasarım (FX2) zaman tabanında alınmış; render edilen kareler son ses (FX3) eşlemiyle üretiliyor. Bu tabanda:
- P4 ve P6'da 3'er kamera hız basamağı (|Δv| > 2,5 px/kare) — "basamak 0" kuralı.
- Alet hızı > 57 px/kare: P6 cetvel 70,7, kafa 65,3; tasarım tabanında bile yeni son kartta kafa 59,0.
- P6 mp4'ünde kare 662'de (çekilişin başı) tek karelik Y basamağı; kaynağın eski `yplane` betiği aynı 19,17 oranını veriyor.
Bunlar paketin değil kaynak projenin durumudur; bilgi olarak bildirilir (kaynağa dokunulmadı).

## Beklenen sapmalar (D1-14)

Taşınırken düzeltilen 14 hatadan çıktıyı değiştirebilenler `render/BEKLENEN-SAPMA.md`'de (25 satır: hata · düzeltme · etkisi · doğrulama). Göç testindeki aralıkları etkileyen yok; öne çıkanlar:

| hata | düzeltme | ölçülen etki |
|---|---|---|
| animatik encode'unda BT.709 matrisi yok ama 709 etiketli (#3) | `TO709` eklendi | ort \|Δ\| 1,19, p99 4 (yalnız animatik mp4); kaynak argümanlarına yalnız `TO709` eklenince çıktı bayt bayt aynı |
| saf siyah kuyruk 12 kare sabit (#9) | 0,4 s = `round(12·KF)` | yalnız `slice`'sız ve `fadeOut`'suz sahneler (test kopyasında yalnız bütün film sayfası) |
| light-ui patlama ölçüsü ölü kod (#1) | çalışır hâle getirildi | yalnız aydınlık world'de yeni hata türü |
| logo hizalama araması yorum içinde (#2) | çalışıyor | IoU 0,9816 → 0,9862 (test logosu); `--map` ile aynı |
| K1 manifest eşikleri okunmuyordu (#5) | sahne `k1` → world `k1` → 0,35/0,55/160 | kaynak manifestte aynı değerler → fark 0 |
| H.264 `-color_range` etiketi yok (#13) | `tv` etiketi eklendi | encode/grade/reel çıktıları bayt bayt aynı |
| K1 `dom` ızgarası 1920×1080 varsayımı | hücre = görünüm alanı / 192×108 | 1920×1080'de 0 |

## Dosyalar

- Araçlar: [dev/h2-diff.mjs](../dev/h2-diff.mjs) (kare farkı), [dev/h2-jsondiff.mjs](../dev/h2-jsondiff.mjs) (ölçüm JSON'u sayı sayı).
- Paket: [render/cmd/render.mjs](../render/cmd/render.mjs), [render/lib/page.mjs](../render/lib/page.mjs), [render/runtime/](../render/runtime/), [render/cmd/ss2.mjs](../render/cmd/ss2.mjs), [render/cmd/qc.mjs](../render/cmd/qc.mjs), [render/cmd/ours.mjs](../render/cmd/ours.mjs), [render/cmd/frame-check.mjs](../render/cmd/frame-check.mjs).
- Kanıt (git dışı): `evidence/h2-p4-{a,b}.json`, `evidence/h2-p6-{a,b}.json`, `evidence/h2-measure-*.json`, `evidence/h2/fc-parity.md`.

## Katkı

- **Uyumlu runtime (yeni):** lisansı belirsiz barındırıcı runtime'ı yerine sıfırdan yazılmış `motion-runtime.js` + `motion-stage.jsx`; kaynak sahne kodu değiştirilmeden bit-aynı kare veriyor (b).
- **Tek sayfa açma yolu:** harness ile frame-check aynı `lib/page.mjs`'i kullanıyor (kopya kaldırıldı; parite yeniden doğrulandı).
- **Süreç dersi:** künye sayıları ölçüldükleri kod sürümüne bağlıdır; parite "aynı kare + aynı araç" ile ve "künye ↔ güncel kod" ile ayrı ayrı kanıtlanmalı. Eski ölçüm betiğini güncel kodda koşturmak, künye farkının araçtan değil koddan geldiğini gösterir.
