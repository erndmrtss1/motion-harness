# FILM — TESLİM PAKETİ (F11-B, master v5) — seçki

> **[ÖRNEK] Kaynak projenin teslim belgesinden anonimleştirilmiş seçki.**
> - Dosya düzeni, biçimler, kare/süre/ses ölçüleri, kapı ve istisna sicili yapısı ve borç tablosu gerçektir.
> - Shot içerikleri, kelimeler, marka ve logo adları `[ÖRNEK]` ile değiştirildi. §2'den yalnız üç satır, §5'ten yalnız ana tablo alındı.
>
> **Bu örnekteki bir hata:** kaynak belge "master v5 — FİNAL" yazarken reviewer teslim turu kaydı hâlâ "(bekliyor)" idi (§3 son satırı). Yeni kural: **REVIEWER.md'de TESLİM GEÇER kaydı olmadan "FİNAL" yazılmaz.** Bu yüzden başlıktan "FİNAL" kaldırıldı.

> [ÖRNEK] · FILM · world `[ÖRNEK]` v4 · 1920×1080 · 60 fps · **116.72 s (7003 kare)** · ses: `materials/<ses-v3>` (115.07 s; yeni çekim) + düz sessiz kuyruk 115.07–116.72 · logolar: `materials/gen/<logo-1>.svg`, `materials/gen/<logo-2>.svg`.
> Karar kaynağı: `project.md` §11–§27c. Ayrıntı perde künyelerinde; ses kayması `docs/SES-KAYMA-v3.md`.

## 1. Teslim dosyaları

| dosya | biçim | ölçü |
|---|---|---|
| `out/master/FILM_v5.mov` | **ProRes 422 HQ** yuv422p10le, BT.709 tv · 1920×1080 · 60 fps · ses PCM 24-bit 48 kHz stereo (çift mono) | 7003 kare · 116.72 s · 6437 MB · ses **−16.00 LUFS / −3.89 dBTP** |
| `out/master/FILM_v5.mp4` | **H.264** High yuv420p, BT.709 tv · CRF 16 preset slow · AAC-LC 48 kHz (hedef 320k) | 7003 kare · 116.72 s · 107 MB · video 7450 kb/s · AAC 248 kb/s (kabul, F9-B #4) · ses **−16.00 LUFS / −3.89 dBTP** |
| `out/master/FILM_v5-loudness.json` | ses ölçümleri | kaynak −12.62 LUFS / −0.51 dBTP → doğrusal −3.38 dB (sınırlayıcı yok) · LRA 2.3 · ölçüm bütün dosyada, sessiz kuyruk dahil |
| `out/archive/FILM_v5/` | perde arşivi: FFV1 kayıpsız kareler (**altı perde yeni**; P1 0–239 v4 ile bit-aynı) · perde mp4'leri · künyeler · `ARSIV.json` · önceki manifest | PNG 14.3 GB → FFV1 9.6 GB · framemd5 kare kare bit-exact: **6/6 evet** |
| `out/probe/_film-qc.json` · `FILM-ours.json` · `FILM-fc.json` | bütün film QC, OURS, son-12-kare json'ları | §5 |
| `out/master/FILM_v4.*` · `out/archive/FILM_v4/` | önceki master (eski ses; 7038 kare) | v5 ile ortak: S01 (0–239) ProRes'te bit-aynı |
| `out/scenes/FILM-onizleme-ses.mp4` | önizleme (perde mp4'lerinin uç uca kopyası) — **master değil** | 7003 kare · 116.72 s |

Üretim:

```bash
motion-render master --tag v5
motion-render arsiv --tag v5 --link-from v4
```

## 2. Zamanlama tablosu (22 shot, ses v3 — akustik doğrulamalı) — seçki

| shot | perde | ses (s) | kare | ekran (son hâl) | yazılan | desen |
|---|---|---|---|---|---|---|
| S01 | P1 | 0.00–3.99 | 0–238 | [ÖRNEK] | [ÖRNEK] | ışıkla açılış |
| S02 | P1 | 3.99–9.66 | 239–578 | [ÖRNEK] | [ÖRNEK] × 3 | patlayan diyagram |
| (kuyruk) | P6 | 114.81–116.72 | 6889–7002 | son kart tutuşu (konuşma sonu akustik 114.81 + 0.8 s) → ışık çekilişi 115.62–116.62 → siyah (6 kare) | — | sessiz kuyruk (K3 dışı) |

Perde sınırları (kare): P1 0–1785 · P2 1786–2422 · P3 2423–3824 · P4 3825–4923 · P5 4924–6274 · P6 6275–7002 (ses v2'de 0–1790 · 1791–2422 · 2423–3844 · 3845–4969 · 4970–6285 · 6286–7037).

## 3. Kapı özetleri

| perde | shot | son kapı | §0.6 | not |
|---|---|---|---|---|
| P1 | S01–S06 | F4 "Perde 1 FİNAL 60 fps" **GEÇER** (F4-B cila ONAY; F5 küçük notlar ONAY) | 8/8 | künye P1, REVIEWER F4/F5 |
| P2 | S07–S08 | F4-B animatik r4 **ŞARTLI GEÇER** → şart sonrası 60 fps | 8/8 | künye P2 |
| P3 | S09–S12 | F5-B 60 fps **TESLİM GEÇER** (2. bakış) | 8/8 | künye P3 |
| P4 | S13–S16 | F6-B 60 fps **TESLİM GEÇER** | 7/8 | §4 #2 istisnası |
| P5 | S17–S19 | F7 60 fps (2× süper örnekleme) **TESLİM GEÇER** | 8/8 (UCUZ geçer) | künye P5 |
| P6 | S20–S22 | F8 60 fps r2 **TESLİM GEÇER**; F8-B son kart r2 **TESLİM GEÇER** | 8/8 (UCUZ geçer) | künye P6 |
| **Bütün film (F9)** | S01–S22 | F9 r1: **F9 kapsamı GEÇER · teslim öncesi 1 açık karar** → F9-B r2 **GEÇER** | 8/8 (UCUZ geçer) | REVIEWER F9 |
| **Yeni ses + logolar (F11)** | S01–S22 | logo ön koşulu (bağımsız denetçi): **GEÇER** · perde QC 6/6 hata 0 · teslim turu: **(bekliyor)** | — | §27–§27c, SES-KAYMA-v3 |

## 4. İstisna sicili

| # | yer | istisna | gerekçe / ölçü | karar |
|---|---|---|---|---|
| 1 | S14 (P4, 72.03–74.69) | şeffaf alet kelimeyi ≈ 0.58 s örter | alet şeffaf; kelime altında 5.71:1 okunur | §21 kayıtlı istisna |
| 2 | S13 (P4, 64.08–72.03) | alet gövdesi bir terimi ≈ 0.12 s örter | terim başına ≤ 0.35 s; #1 ile aynı sınıf | §22 kayıtlı istisna |
| 3 | S18 (P5, 89.01–95.86) | alet etiketi ≈ 0.65 s örter | fiziksel örtme; alet çıkınca açılır; teslim edilmiş P2 kodu değişmez | §23 kayıtlı istisna |
| 4 | S22 kuyruk (P6, 114.81–116.72) | **K3 dışı** | shot aralığında S22 0.576 geçer; tutuş + ışık çekilişi + siyah tasarım gereği durağan (kuyruk dahil 0.327) | §24 **kural** (istisna değil) |
| 5 | ikincil aksan sınıfı (P2, P5, P6) | logo kenar karışımı + çizgi kenar karışımı ikincil sınıf pikseli | konum taraması: logo/çizgi kutuları dışında 0 · logo tonu başlık bloğu ↔ son kart ΔE2000 0.49 / 0.95 (master mp4) | manifest `exceptions`, izinli kutular (`__redExclude`) |

## 5. Ölçümler (bütün film, master v5)

| denetim | sonuç |
|---|---|
| bütün film QC v5 | **hata 0** · 7003/7003 kare · son kare ham 0 / mp4 0 · glif eksiği 0 · fade yalnız film sonu (6961–6980) · K1 38/38 · bant ort. %54.93 |
| aksan | **1 aralık: 5473–5743** (S18) · izinli kutular · ikincil sınıf 320 kare, hepsi istisnada |
| OURS / K3 | OURS hareketli 0.52 · K3 22/22 shot ≥ 0.4 (en düşük S10 0.409, S07 0.419) |
| perde QC | P1–P6 hata 0 · K1 6/6 · 7/7 · 9/9 · 7/7 · 4/4 · 5/5 · son kart K1 yükseklik %66 |
| dikişler (ham) | P1→P2 0.900 · P2→P3 1.311 · P3→P4 0.570 · P4→P5 5.662 (hareketli, ≤ 6.10) · P5→P6 0.201 — hepsi ölçütte |
| dikişler (master mp4, son 12 kare) | film başı 1.01 · P1→P2 1.41 · P2→P3 1.07 · P4→P5 1.02 ✓ · **P3→P4 3.51** (bilinen: P3 son tutuşunda ışık katmanı 8-bit adımı — §6 borç) · **P5→P6 1.66** (dikiş farkı oranı 0.51 ✓; en kötü oran tutuşta gren tohumu; basamak değil) · film sonu 1.98 (ışık çekilişi + siyah; sahne sonu) |
| film sonu | son 8 kare Y 16 (mp4 tv) · ham son kare 0 · P6 iniş en kötü fark/komşu 1.21 |
| v5 ↔ v4 | ProRes: S01 (0–239) **bit-aynı**; 240'tan itibaren yeni ses eşlemi |

Yeniden çizilen aralıklar (render süresi):

- P1 240–1785 (44.5 dk)
- P2 S07 (8.3 dk) + başlık bloğu (4.6 dk)
- P3 tam (31.4 dk)
- P4 tam (22.5 dk)
- P5 tam 2× (118.8 dk)
- P6 2× (5.5 dk) + 1× (14.3 dk) + son kart (4.1 dk)

Toplam ≈ 4.3 sa. Kalan: P1 0–239 (v4 ile bit-aynı).

## 6. Bilinen borçlar (seçki)

| borç | durum | neden ertelendi / ne zaman |
|---|---|---|
| Hareket bulanıklığı yumuşak eşik | bulanıklık kamera hızı 3 px/kareyi aşınca birden açılır (sert eşik) | düzeltme bütün perdeleri yeniden çizer (§25 YAPMA) |
| Işık katmanı 8-bit yuvarlaması | nefes salınırken küresel 1 düzey ışık adımları (ham ΔY ≈ 0.2–0.3); son-12-kare serisini 1.5 eşiğinin üstüne çıkaran budur | bütün perdeleri yeniden çizer → **borç** (kullanıcı kararı F9-B #2; görünmez) |
| Yakın plan kahramanlar S× | world kuralı: k ≥ 1.5'te kahraman öğe S× katmanda; mevcut perdelere uygulanmadı | **borç** (yeniden render gerektirir) |
| ~~Logo yer tutucu~~ | **KAPANDI (F11-B)** — gerçek logolar (§7) | — |
| ~~P1 f236 K8~~ | **F9-B'de çözüldü** (kademeli geçiş; §5) | — |
| AAC bit hızı | hedef 320k, ölçülen ≈ 245 kb/s (VBR; çift mono + sessiz kuyruk) | **kabul** (F9-B #4) |
| Önizleme mp4 dikişleri | önizleme perde encode'larının kopyası; durağan dikişte encode sıçraması | yalnız önizleme; master tek encode |

## 8. Kredi

Bakiye **<X> [ÖRNEK]**. F11-C logo büyütme 6 kredi; 2'si sunucu hatasında kayıp (`lost[]`). F11-B kredi 0.
