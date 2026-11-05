---
description: Bütün filmin master zincirini yürütür. Adımlar ön koşul kontrolü, birleşik kare dizini, film QC, perde sınırı son 12 kare, tek sürekli encode (ProRes + H.264), loudness, dikiş ve önceki master'la bit eşliği, FFV1 arşiv, teslim belgesi, taze reviewer master kapısı, rapor ve DUR'dur.
argument-hint: "[--tag v<N>] [--ids P1,P2,…]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent
---

# /motion:master: master ve teslim

> **Etkileşimsiz oturum (headless):** `claude -p` ile ya da kullanıcı olmadan çalışıyorsan (ör. ortamda `MOTION_EVAL=1`) ajanları **ön planda** başlat (`Agent` çağrısında `run_in_background: false`) ve sonucunu bekle. Arka planda ajan bırakıp turu bitirme: headless süreç tur bitince kapanır ve arka plan ajanları da ölür. Komutun bütün adımları bitmeden son mesajı yazma.

Argümanlar: `$ARGUMENTS`

Tag verilmezse bir sonraki sürüm kullanılır: `out/master/` altındaki en yüksek `v<N>` + 1.

Kaynaklar:
- `${CLAUDE_PLUGIN_ROOT}/skills/motion-core/references/PLAYBOOK.md` §4.6 (master), §4.7 (teslim), §9 (disk/arşiv)
- `AUDIO.md` (loudness, sessiz kuyruk)
- `MEASURE.md` (dikiş, temporal, identical)

Profil `live` ise bu komut çalışmaz; master yoktur. `/motion:live` kullanılır.

## 0. Ön koşul (biri tutmazsa DUR)

- Her birimin son kapısı `docs/REVIEWER.md`'de **TESLİM GEÇER** olmalı. Kontrol: `grep '^KARAR:' docs/REVIEWER.md`.
- Açık kararlar kapalı ya da borç tablosunda.
- Ledger `match` doğru; kayıplar `lost[]` alanında.
- Disk ≥ 40 GB (`motion-render doctor`). Bakiye okunur.
- Master fazı varsayılan olarak **kredi 0**'dır. Üretken çağrı yapılmaz.
- (1.4) `tools/render-oncesi.ps1` (ya da `.sh`) çıkış 0: kurulu harness beklenen tabanda, başka render/encode süreci yok; 1 → encode yok (DUR-8).
  `motion-render celiski-tara` çıkış 0. Master bir kilometre taşıdır (V2): tam tarama + taze reviewer.

## 1. Zincir

Uzun adımlar arka planda koşar ya da üst sınırlı beklenir. Zincir bir betik dosyası olarak yazılıp tek komutla koşturulabilir.

```bash
# 1. birleşik dizin: film kaydı için perde karelerine SABİT BAĞ (kopya değil) + sayfa ↔ dizin denetimi (fark 0)
motion-render probe <FILM> --frame 0 --frames <perde sınırları> --out out/probe/master/film.png
# 2. film QC
motion-render qc <FILM>                  # bütün film kaydı, 16 kontrol → out/probe/<FILM>-qc.json
motion-render qc film                    # grade tutarlılığı → out/probe/_film-grade-sheet.png + _film-qc.json
motion-render ours <FILM> --no-cam
# 3. perde sınırında son 12 kare: fade/filtre kapanışı yok
motion-render frame-check <FILM> --only temporal
# 4. master: TEK SÜREKLİ encode (perde mp4'lerini uç uca ekleme; dikişte sıçrama bırakır)
motion-render master --tag v<N> [--ids …]
# 5. loudness (sessiz kuyruk dahil; hedef AUDIO.md / project.md)
motion-render frame-check <FILM> --only loudness
# 6–7. dikiş master üzerinde + değişmeyen kareler önceki master'la bit-aynı
motion-render frame-check <FILM> --only temporal,identical,accentColor
# 8. arşiv: FFV1 + framemd5; değişmeyen perdeler önceki arşive bağlanır
motion-render arsiv --tag v<N> --link-from v<N-1>
```

- Master ile perde mp4'leri arasında renk tutarlılığı ölçülür.
- Son kareler kontrol edilir: ham son kare ve mp4 Y düzlemi.
- Bağımsız ölçüm: `motion:motion-measure` loudness ve dikiş sayılarını kendi yöntemiyle alır. Bu sayılar reviewer'a verilmez.

## 2. Teslim belgesi

`docs/TESLIM.md` dosyasını şablondan (`templates/TESLIM.md`) yaz. Bölümler:
- teslim dosyaları (dosya · biçim · ölçü)
- üretim komutları
- zamanlama tablosu
- kapı özetleri: `docs/REVIEWER.md` karar satırlarıyla **aynı**
- istisna sicili
- ölçümler
- önceki sürümler
- borçlar
- varlık notu (sha256)
- kredi

**Reviewer GEÇER kaydı olmadan "FİNAL" yazılmaz.** Bekleyen tur "(bekliyor)" olarak yazılır.

## 3. Master kapısı

`/motion:gate FILM master` adımlarını uygula: taze reviewer, kısa doğrulama, tek tur.

Reviewer'ın baktığı yerler:
- kapsam maddeleri
- dikişler
- son kareler
- loudness
- bit eşliği
- bütün film §0.6 ve UCUZ taraması (birim kararları geçerli)

Karar **GEÇMEZ** ise tek düzeltme turu gate kuralıyla işler. Çoğu zaman bu encode ya da kısmi render demektir (PLAYBOOK §5). İkinci GEÇMEZ'de **DUR**.

## 4. Kapanış ve rapor

- `out/RENDER_REPORT.md`'nin sonuna ekle.
- `docs/RETRO.md` girişi yaz; dersler ve `docs/PAKET-NOTLAR.md` bulguları aynı anda, tek seferde.
- Bakiye önce → sonra; "kredi yüzünden yapılmadı / kabul edildi" satırı (doluysa DUR).
- DUR'dan önce süreç listesi taranır: bu oturumun başlattığı ffmpeg/Chromium/node süreci kalmaz.
- Önceki master'lar ve arşivler tutulur.
- Animatik tur dizinlerinin temizliği kullanıcı kararıdır. Varsayılan geri dönüşüme taşımadır; sayı ve GB raporlanır.

Rapor PLAYBOOK §7.2 (kapanış) biçimindedir. "Teslim dosyaları" bloğu en üstte durur: dosya · biçim · çözünürlük/fps · kare · süre · LUFS/dBTP · arşiv bit-exact.

Kapanış satırı: `**DUR — master v<N>.** Teslim dosyaları ve TESLIM.md onayın için hazır.`
