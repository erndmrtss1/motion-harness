# craft-1.3 değerlendirme kanıtı

Kaynak: bir müşteri projesinin P1 animatik v3'ü (960×540 @30, `--step 2`, 1441 kare) ve sahne sayfası; **salt okunur** ölçüldü (çıktılar oturum
scratch klasörüne; proje ağacında değişiklik 0). Müşteri malzemesi (kare, yazı metni, marka) bu dosyaya girmez; olaylar kimlik ve kare numarasıyla anılır.
Kare numarası `k` = animatik karesi (@30), `f` = film karesi (@60), `f = 2k`.

## Madde 1 — frame-check zanaat kapısı

Üç bilinen kusur (test vakası):

| # | kusur | kaynak kare kümesi | yeni kontrol | sonuç |
|---|---|---|---|---|
| 1 | ezber kartı tek karede tam boy beliriyor (k1076 = f2151) | r1 kareleri (kapı 1 kopyası) | `pop` | **yakalandı**: k1076, 66 256 px², pay 1,00 · düzeltilmiş v3'te bu kare temiz (kart düşerek giriyor) |
| 2 | S06 lyric tek karede kayboluyor (f2318 = k1159) | son v3 kareleri | `pop` | **yakalandı**: k1159, 56 768 px², pay 0,98 (r1 karelerinde de 1,00 — r1'de gözden kaçmıştı) |
| 3 | S04 pergel halkası görünür kavis +14 kare (e37, a0 27,263 s) | sahne sayfası | `onset` A/B | **yakalandı**: +20,2 kare geç (ilk A/B farkı f1656); e56 pergel S06 +20,8 |

`pop` (geçiş pencereleri `exclude: ["$__gecis"]`, varsayılan eşikler; animatik eşiği 0,75):

| küme | ihlal | kareler |
|---|---|---|
| r1 kareleri | 15 | k124, k137 (mum gövdesi tek karede) · k143 (lyric L1 çıkışı 0,1 s) · k161, k199 (kart 1–2) · k215, k237 (kart 3–4) · k785 (bant kopması yerinde) · k958 (lyric çıkışı, pay 0,83) · **k1076** · k1144 (yırtılma) · **k1159** · k1179, k1191, k1197 (AS-3 ara sahne kesmesi, makro mum dolgusu) |
| son v3 | 7 | k143 · k785 · k958 · k1144 · **k1159** · k1191 · k1197 |

r1 reviewer'ı tek kare beliriş olarak kart 1, kart 2, bant ve ezber kartını yazmıştı; `pop` bant dışındakileri buldu. **Bant (k690) yakalanmadı:**
düşük kontrastlı küçük nesne, açıklanamayan alan 496 px² < `minPx` 900 (eşik düşürülürse yakalanır, kenar gürültüsü artar). Ek bulguların hepsi
kırpım çiftlerinde gözle doğrulandı (gerçek tek kare değişimi; yeni ZN-3 ≥ 0,4 s kuralına da takılırlar).

`onset` (kontrol olaylarıyla):

| olay | A/B (sahne sayfası, 1080p @60) | piksel (v3 kareleri) | not |
|---|---|---|---|
| e37 pergel S04 | **+20,2** geç | +26,2 belirsiz (alet örtmesi %14) | test vakası 3 |
| e56 pergel S06 | **+20,8** geç | +20,8 belirsiz (%12) | r2 de "vuruş ±1 KALDI" yazmıştı |
| e09 kart 2 (kontrol) | +0,3 | +0,3 | geçti |
| e04 lyric L1 (kontrol) | +0,6 | +0,6 | geçti |
| e41 bacak 3 (kontrol) | +0,8 | +7,8 belirsiz (%25) | A/B geçti; piksel kipi kalemin örttüğü ucu geç görür |
| e36 seri A ilk mum (kontrol) | +2,9 | +1,9 | r2 +0,9 (görünürlük eşiği farkı ≈ 1 kare) |
| e67 bacak 1a (kontrol) | +10,5 | +23,5 belirsiz (%19) | sayfa v3'ten sonra değişti (world 2.3.0); A/B güncel kodu ölçer |

Sonuç: alet çizginin ucunu örttüğünde piksel kipi güvenilmez — bu satırlar UYARI ("belirsiz, A/B ile ölç") olur, hata değil. Kesin ölçü A/B.

Tasarım katmanı (sahne sayfası, 2882 kare @60):

| kontrol | sonuç |
|---|---|
| `velocity` | 366 C1 sıçraması: kamera 36 (en kötü %9,2 tepe; G4 sonrası f1745–1748 %5,3–5,8) · kalem 80 (köşeler) · pergel 60 · cetvel 20 · bıçak 4 |
| `entryExit` (araç evreleri + `kind:kart`) | 40 ihlal: S05 kalem giriş 0,33 s, çıkış 0 s (geçiş altında örtülerek biter — r2 açık notu) · kartlar anlık (kanca `vis` vermiyor → 0 s) · bıçak/cetvel/pergel girişleri 0,55–1,05 s geçer |
| `moves` (UYARI) | shot başına hamle S01 2 · S02 3 · S03 3 · S04 3 · S05 3 · S06 6; en uzun hamle 2,67 s, çoğu < 2 s |

Komutlar (ölçüm; proje kökünde, çıktı proje dışına):

```
motion-render frame-check <sahne> --step 2 --frames-dir out/frames/<animatik> --checks <scratch>/pop.json --out <scratch>/pop.json
motion-render frame-check <sahne> --checks <scratch>/design.json --out <scratch>/design.json      # velocity · entryExit · moves · onset A/B
```

## Madde 2 — `motion-render motion-test`

Kütüphane world `focusfx-paper` ile kurulan geçici projede (`motion-render init --world focusfx-paper --demo`), ilkel `FXRule` (çelik cetvel),
`x` 1960 → 300 (`out3`, 1,4 s), `angle` 0 → −2° (`sine`); referans: sahibin önceki projesinden 3 s çizim klibi (`--ref`).

| çıktı | sonuç |
|---|---|
| süre | 90 kare (3 s @30, 1920×1080), çizim + kodlama 17,6 s |
| dosyalar | `<ad>.mp4` · `<ad>-hiz.png` (hız + ivme, iki çizgi) · `<ad>-hiz.json` · `<ad>-kontak.png` (6 an × 2 satır) · `<ad>-yan.mp4` (1920×540) |
| test profili | giriş k2–k3 105 px/kare @30 (kadraj dışından tam hızla) → `out3` ile azalıyor; **C1 en kötü %60 tepe** — out3 en hızlı başladığı için kalkışta hız sıçraması (gerçek kusur; kalkış rampası gerekir) |
| referans profili | ~0,93 s'de hızlı kamera hareketi (tepe 135 px/kare @30); kesme kareleri (karenin > %50'si değişti, artık yüksek) tepe/C1 dışı |

Düzeltilen ölçüm hataları (e2e ile bulundu): alt piksel parabolü yalnız gerçek yerel en azda ve ±0,5 içinde (öncesi: düz SAD vadisinde 8957 px/kare);
arama yarıçapı 160 px @1080 (kadraj dışından hızlı giriş).

## Madde 6 — çekirdek araçlar

Birim testleri `render/test/core-tools.test.mjs` (4; tam takım `node --test render/test/` 35/35). Gerçek veride (salt okunur, çıktılar proje dışında):

| araç | koşu | sonuç |
|---|---|---|
| `parite` | v3 animatiğinden 6 anahtar kare ↔ sahibin önceki projesinden 3 referans klipten 6 kare, `--ust groups,inkContent` | **bilgi: tutmuyor** — grup 4 ↔ 3 (+%33) · yüzey dışı ink %1,44 ↔ %0,70 · içerik %38,6 ↔ %19,2 · negatif alan %62,2 ↔ %81,5 · kahraman oranı 14,8 ↔ 4,2 · luma %67,1 ↔ %64,0 (tutuyor). v3 kareleri referansın yaklaşık iki katı dolu; kullanıcının "sadelik yok" bulgusuyla aynı yön |
| `parite` (ilk koşu) | aynı | tam en koyu zemin bandı ink ve kahraman sayıldı (ink %15,5, kahraman oranı 0,46) → yüzey grubu kuralı eklendi (kaynak aracın tanımı), test eklendi |
| `plan-check` | sentetik plan (CLI) | kusur 1 (alet girişi 0,3 s < 0,4) · kota 2 (olay yoğunluğu 0,83 / 2,5 s, boş pencere) · çıkış 3. Projenin olay listesi başka şemada olduğundan gerçek veride koşulmadı (dönüştürme projenin işi) |
| `seri-uret` | sentetik iki seri (CLI) | A: 10 öğe, seed 4 (2 deneme) · B: **üretimden önce çözülemez** — zıt uçlu bitişik pivotlar arasında 1 öğe (en az 2) · çıkış 3 |
| `ingest-kapi` | düz gri zeminli kare (CLI) | doku std 0 < eşik → KALDI · çıkış 3; kazanç eşlemesi, kimlik artığı ve göz notu yolu birim testinde |
