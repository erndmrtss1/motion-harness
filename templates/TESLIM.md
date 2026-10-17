# <FILM> — TESLİM PAKETİ (F<n>, master v<N>[ — FİNAL])

> <PROJE> · <FILM> · world `<ad>` <sürüm> · <1920×1080> · <60> fps · **<s> s (<kare> kare)** · ses: `<materials/…>` (+ sessiz kuyruk <a>–<b> s) · varlıklar: `<…>`.
> Karar kaynağı: `project.md` §<a>–§<b>. Ayrıntı perde künyelerinde (`docs/KUNYE-P1.md` … `docs/KUNYE-P<n>.md`); ses kayması `docs/SES-KAYMA-<ses>.md`.
> **"FİNAL" yalnız `docs/REVIEWER.md`'de bu master için TESLİM GEÇER kaydı varsa yazılır.** Bekleyen tur "(bekliyor)" olarak yazılır.

## 1. Teslim dosyaları

| dosya | biçim | ölçü |
|---|---|---|
| `out/master/<FILM>_v<N>.mov` | ProRes 422 HQ yuv422p10le, BT.709 tv · 1920×1080 · <fps> · ses PCM 24-bit 48 kHz stereo | <kare> · <s> · <MB> · ses **<LUFS> / <dBTP>** |
| `out/master/<FILM>_v<N>.mp4` | H.264 High yuv420p, BT.709 tv · CRF 16 preset slow · AAC-LC 48 kHz (hedef 320k) | <kare> · <s> · <MB> · video <kb/s> · AAC <kb/s> · ses **<LUFS> / <dBTP>** |
| `out/master/<FILM>_v<N>-loudness.json` | ses ölçümleri | kaynak <LUFS / dBTP> → doğrusal <dB> (sınırlayıcı yok) · LRA <…> · ölçüm kuyruk dahil |
| `out/archive/<FILM>_v<N>/` | perde arşivi: FFV1 kayıpsız kareler · perde mp4'leri · künyeler · `ARSIV.json` · önceki manifest | PNG <GB> → FFV1 <GB> · framemd5 bit-exact: **<n>/<n> evet** · yeni: <perdeler>; bağlanan: <perdeler> |
| `out/probe/<FILM>-qc.json` · `<FILM>-ours.json` · `<FILM>-fc.json` | bütün film QC, OURS, son-12-kare (frame-check `temporal`) json'ları | §5 |
| `out/master/<FILM>_v<N-1>.*` · `out/archive/<FILM>_v<N-1>/` | önceki sürüm | v<N> ile ortak: <aralık> ProRes'te bit-aynı |
| `out/scenes/<FILM>-onizleme-ses.mp4` | önizleme (`ses preview`; perde mp4'lerinin kopyası) — **master değil** | <kare> |

Üretim:

```bash
motion-render qc <FILM> · motion-render qc film
motion-render master --tag v<N>
motion-render arsiv --tag v<N> --link-from v<N-1>
```

## 2. Zamanlama tablosu (<n> shot, <ses> zamanı)

Shot sınırları `scenes.json`'dan gelir. Kare = round(t · fps). Sessiz kuyruk shot değildir.

| shot | perde | ses (s) | kare | ekran (son hâl) | yazılan | desen |
|---|---|---|---|---|---|---|
| S01 | P1 | <a>–<b> | <f0>–<f1> | <…> | <…> | <…> |
| (kuyruk) | P<n> | <a>–<b> | <f0>–<f1> | tutuş → ışık çekilişi → siyah (<n> kare) | — | sessiz kuyruk (K3 dışı) |

Perde sınırları (kare): P1 <a>–<b> · P2 <a>–<b> · …

## 3. Kapı özetleri

Bu tablo `docs/REVIEWER.md` ile aynıdır.

| perde | shot | son kapı | §0.6 | not |
|---|---|---|---|---|
| P1 | S01–S0<x> | F<n> <tur> **TESLİM GEÇER** | <x>/8 | `docs/KUNYE-P1.md` |
| **Bütün film** | S01–S<n> | F<n> master doğrulaması **<KARAR>** | <x>/8 (UCUZ geçer) | `docs/REVIEWER.md` |

## 4. İstisna sicili

`project.md` §13 ve `scenes.json` `exceptions` / `review` ile eştir.

| # | yer | istisna | gerekçe / ölçü | karar |
|---|---|---|---|---|
| 1 | <birim, s> | <…> | <…> | §<…> kayıtlı istisna \| **kural** |

## 5. Ölçümler (bütün film, master v<N>)

| denetim | sonuç |
|---|---|
| bütün film QC | **hata <0>** · <N>/<N> kare · son kare ham 0 / mp4 0 · glif eksiği 0 · fade yalnız film sonu · K1 <x/x> · bant ort. <%> |
| aksan | <n> aralık (<kare aralığı>) · izinli kutular · ikincil sınıf <n> kare, hepsi istisnada |
| OURS / K3 | OURS hareketli <x> · K3 <x/x> shot ≥ 0.4 (en düşük <shot> <x>) |
| dikişler (ham) | P1→P2 <…> · … — hepsi ölçütte |
| son 12 kare (master mp4) | film başı <…> · P1→P2 <…> · … · film sonu <…> (ölçüt ≤ 1.5; aşan varsa bulgu + neden) |
| film sonu | son 8 kare Y 16 (mp4 tv) · ham son kare 0 · iniş en kötü fark/komşu <…> |
| v<N> ↔ v<N-1> | ProRes: <aralık> **bit-aynı**; değişen yalnız <aralık> |
| renk (master ↔ perde mp4) | işaretli ortalama fark <…> Y |

<Faza özgü ölçüm tabloları — ör. keskinlik (ölçü | önce | sonra | hedef), varlık kabulü (varlık · satır | IoU | sınır p90 | delik | dalga p99 | keskinlik).>

Yeniden çizilen aralıklar (render süresi): <perde a–b (dk) · …>. Kalan: <aralık> (önceki sürümle bit-aynı).

### 5.1 Önceki ölçümler (önceki master'lar; kare numaraları eski ızgarada)

| denetim | sonuç |
|---|---|
| | |

## 6. Bilinen borçlar

`project.md` §12 ile eştir. Kapananların üstü çizilir.

| borç | durum | neden ertelendi / ne zaman |
|---|---|---|
| <…> | <…> | <…> |
| ~~<kapanan borç>~~ | **KAPANDI (F<n>)** — <nasıl> | — |

## 7. Varlık notu

| varlık | dosya | sha256 | üretim yolu | kullanım |
|---|---|---|---|---|
| | | `<ilk 16 hane>…` | <kaynak → işlem → kabul ölçüleri> | <birimler, kareler> |

Değiştirmek için: <yeni varlık → kabul kontrolü → bağımsız denetçi → etkilenen kareler (ölçümle) → yeniden render → ölçüm>.

## 8. Kredi

Bakiye **<…>** (<faz>: <önce> → <sonra>; <kayıp varsa `lost[]`>). Film toplamı <…> / tavan <…>.
