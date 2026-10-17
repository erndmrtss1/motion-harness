# H0 — Envanter: Kaynak-A + Kaynak-B → motion-harness

> Tarih 2026-10-17 · Faz H0 (DUR 1) · Kaynaklar SALT OKUNUR okundu; hiçbir kaynak dosya yazılmadı, taşınmadı, çalıştırılmadı.
> Bu belge birleşik envanterdir. Satır satır ayrıntı (her dosya, her kural, `dosya:satır` atıfları) altı ekte:
> [A1 skill/ajanlar/bellek](../evidence/h0/A1-skill-agents.md) · [A2 render/](../evidence/h0/A2-render.md) · [A3 scratchpad](../evidence/h0/A3-scratchpad.md) · [A4 belgeler/project.md/ses/genAI](../evidence/h0/A4-docs-project.md) · [A5 world/jsx/Kaynak-B](../evidence/h0/A5-worlds-jsx.md) · [A6 rapor biçimi/orkestrasyon](../evidence/h0/A6-report-format.md).
> Kararlar: [H-KARARLAR.md](H-KARARLAR.md). Hash kanıtı: `evidence/` (git dışı).
> Gizlilik notu: bu belge ve ekler gerçek kaynak yollarını ve marka adlarını izlenebilirlik için taşır; H5 push öncesi işlemi §12'de (karar D1-10).

---

## 0. Özet

| ölçü | değer |
|---|---|
| Kaynak kökü | 6 (Kaynak-A · Kaynak-B · Kaynak-B%20 (boş artık) · Kaynak-B .zip · Kaynak-A'in çalıştığı session dizini `<session>` · kullanıcı belleği) |
| Hash'lenen kayıt | **77 462** dosya/bağ · **227,7 GB** · 0 hata (tam SHA-256, 697 s) |
| Etiketlenen kaynak dosya (betik/belge/kod; kare-medya hariç) | ≈ **1 090**: skill/ajan/bellek 37 · render 52 (+ Kaynak-B 51) · scratchpad betik 749 · docs 33 (+ Kaynak-B 40) · project.md 40 bölüm · jsx/sayfa/board ≈ 130 |
| Kural satırı | **205** (+ 15 manifest bayrağı/profil) — core 149 · core aday 28 · core-param 7 · core-ilham 3 · karma 7 · world 6 · proje 5 |
| Ders | **≈ 300 ham kayıt** (skill/world 144 + TRAPS 71 + Kaynak-A RETRO 72 + Kaynak-B RETRO 20 + kullanıcı düzeltmesi 29 + süreç dersi 4); tekilleştirme H1'de `LESSONS.md`'ye |
| Kalıp (bootcamp K-xx) | 54 kart (PATTERNS) · 10'u A/B kanıtlı (`brand-fx.jsx`) |
| ADR | 25 (core 11 · world 7 · proje 7) |
| Scratchpad ölçüm betiği | **122** (piksel 70 — çoğu `render/`'da karşılıksız; izdüşüm 52 — hiçbiri `render/`'da yok) + 103 reviewer alt betiği → **20 check tipiyle tek `frame-check`** |
| Koda gömülü eşik | ≈ 600 ham satır, tekrarlar dahil (A1 §11: 127 · A2 §4: 152 · A3 §7: 126 · A4 §8: 230, tablo başlıkları dahil) → birleşik tablo §6 (46 kural) |
| Higgsfield | API anahtarı **yok**; `@higgsfield/cli` 1.1.26 OAuth oturumu (§9) · bakiye 768,02 kredi (plus) — yalnız okundu |

**Kritik bulgular (paket tasarımını değiştirenler):**

1. **Çalışma zamanı bizim kodumuz değil.** Sahne sayfaları (`*.dc.html`) barındırıcının ürettiği `support.js` ("dc-runtime", `// GENERATED`) ve `shared/animations-v3.jsx` ("omelette starter" kopyası) üzerinde koşuyor; lisansları belirsiz. Paket bunları **aynen dağıtamaz** → uyumlu API'yle kendi runtime'ı (`x-import` yükleyici + `CompositionStage/useComposition` + seek sözleşmesi) yazılmalı. H2 göç testinin anlamı bu yüzden değişiyor (§12 D1-02). [A5 §0.1, §2.1; A2 §2.1]
2. **Ölçüm bilgisinin asıl gövdesi scratchpad'de.** Tasarım-zamanı izdüşüm denetimi (kadraj payları, alet yolu/hızı, örtme 0, kamera basamağı 0, K3 payı) ve teslim ölçüleri (perde dikişi, son-12-kare sıçrama oranı, Y-düzlemi basamağı, aksan konumu, ΔE2000, keskinlik, bayatlık tanığı, master bit-eşliği) `render/`'da **yok**. Ayrıca hat 4 ağaç-dışı betiğe bağlı (`down2dir.mjs`, `envxc.mjs`, `clipcheck.py`, `clipcheck3.py`; sabit mutlak yollu) — **kaynak: ağaç dışı** (session scratchpad'i); pakete alınır (D1-15). [A3 §0, §2; A2 §0]
3. **Ajan tanımları ile fiilî akış ayrışmış.** `motion-director`, `asset-scout`, `asset-gen` hiç çağrılmamış (roller ana oturumda); reviewer `general-purpose` olarak "rolü üstlen" diye açılmış, `model: sonnet` yazmasına rağmen opus koşmuş; ajanlarda `tools:` yok → reviewer yazabiliyor; kalıcı reviewer 23 tur / 111 MB bağlam büyüttü. [A6 §3; A1 §3, §12.2-21]
4. **Kaynak-A skill'i Kaynak-B'ın tam üst kümesi**, ama Kaynak-B `CLAUDE.md`'sindeki core bölümler (Retro kuralı, "tek görev, tek çıktı, en küçük bağlam" ajan zinciri) Kaynak-A'te yok → paket ikisini birleştirir. [A1 §12.1]
5. **fps ve tuval koda gömülü.** Skill ve yardımcılar 30 fps / 1920×1080 varsayıyor, Kaynak-A 60 fps üretiyor; `×(FPS/30)` yalnız `project.md`'de. Paket eşikleri **saniye cinsinden + fps** tutmalı. [A1 §12.2-11; A2 §6.4-8/9; A5 §0.3]
6. **14 kod hatası** taşınırken düzeltilecek: `qc.mjs:90` light-ui patlama ölçüsü ölü; `logo-check.mjs:111` hizalama araması yorumda; `anim-encode.mjs:16` BT.709 matrisi yok ama 709 etiketli; manifest `k1.*` alanları okunmuyor … [A2 §6.4]
7. **Higgsfield bir API anahtarıyla çalışmıyor** (OAuth PKCE CLI oturumu); brief'teki "anahtarı .env'e kopyala" adımı karar gerektiriyor (§12 D1-01).
8. **Kaynaklar canlı.** Kaynak-A'in session'ı F11-B teslimini sürdürüyor ve `out/` dışında `docs/` (ör. `FX-01-TESLIM.md` v4→v5, 22:56) ve scratchpad'e de yazıyor. Salt-okunur kanıtı buna göre atıf denetimiyle verildi (§1.2).

---

## 1. Kaynak kümesi ve salt-okunur kanıtı

### 1.1 Kökler

| ad | yol | kayıt | boyut | bölge | not |
|---|---|---:|---:|---|---|
| `Kaynak-A` | `<kaynak-A>` | 49 371 | 198,8 GB | kararlı (+ `out/` oynak) | `out/` 37 054 dosya / 197,4 GB; `materials` sembolik bağ → Kaynak-B `Materials/[ÖRNEK]` (izlenmedi, hedefi Kaynak-B kökünde hash'li) |
| `Kaynak-B` | `<kaynak-B>` | 24 443 | 26,7 GB | kararlı | öncül proje ([ÖRNEK-marka]); `out/` 23 080 / 26,3 GB |
| `KaynakB20` | `<kaynak-B%20>` | 0 | 0 | kararlı | yalnız boş `out/probe/pc-MG-04` klasörü — artık (çöp) |
| `KaynakBZip` | `<kaynak-B.zip>` | 1 | 15,5 MB | kararlı | açılmadı, yalnız hash |
| `Sess` | `<session>` | 3 643 | 2,2 GB | **oynak** | brief'teki "scratchpad/**": `scratchpad/` 1 049 girdi · `tasks/` 152 · `images/` 17 |
| `Memory` | `<bellek>` | 4 | — | kararlı | 3 bellek + dizin |
| (manifest dışı) | `<transkript>` | 1 | ~714 MB | büyüyor | Kaynak-A session transkripti (55 441 satır, 26 alt-ajan transkripti); yalnız akışla okundu (A6) |

### 1.2 Kanıt yöntemi

- `evidence/source-hashes-before.json` — tam SHA-256 manifesti (2026-10-17 19:46 UTC), araç `dev/hash-manifest.mjs`.
- Faz sonları: `bash dev/hash-check.sh <faz>` → hızlı mod (boyut+mtime aynıysa önceki SHA) + `dev/hash-diff.mjs` (kararlı / oynak bölge ayrı sayım) + `dev/hash-attribute.mjs` (kararlı bölgede değişen her dosyayı canlı session transkriptindeki yazma çağrısıyla eşleştirir). Ölçüt: **bizim yazdığımız = 0**, yani *atfedilemeyen değişiklik = 0*. H5'te tam yeniden hash.
- H0 sonu sonucu: §11.

---

## 2. Etiket sözleşmesi

| etiket | anlamı | pakette |
|---|---|---|
| **core** | Stilden bağımsız disiplin/süreç/araç: kapılar, ölçüm, reviewer, DUR, rapor, render hattı, belge şablonları, K-kurallarının disiplin hâli | `skills/motion-core`, `skills/motion-reviewer`, `agents/`, `commands/`, `render/`, `templates/` |
| **world** | Bir görsel dile ait (fx-lab kâğıt/pafta/cetvel/rapido; desk-paper; screen-dark; light-ui; photo-plate) | yalnız `skills/motion-world/examples/<world>/` — **ÖRNEK, varsayılan değil** |
| **proje** | Kaynak-A/[ÖRNEK-marka] içeriği: sahne, sözlük, metin, ses, logo, marka | **girmez**; yalnız ders çıkarılır |
| **örnek** | Anonimleştirilip örnek belge olarak taşınmaya değer (künye, reviewer kaydı, RETRO, RENDER_REPORT, teslim) | `examples/ornek-film/` — `[ÖRNEK]` ile |
| **çöp** | Kopya, eskimiş, erimiş, artık | girmez |

Ara etiketler (eklerde): `core aday` (Kaynak-A'te doğdu, genellenebilir → RULES'a parametreli), `core-param` (mekanizma core, değer proje/world), `core-ilham` (kalıp/ders: okunur, kopyalanmaz).

---

## 3. Envanter tablosu (alan bazında)

| alan | kaynak | sayı | etiket dağılımı | yeni pakette hedef | ek |
|---|---|---:|---|---|---|
| Skill gövdesi | `F/.claude/skills/motion/SKILL.md` (481 st.) | 20 bölüm | core (proje sızıntıları: §0.8 Kaynak-A notları, `brand-*.jsx` adları, makine belleği) | bölünür: §0/§0.5–0.7/§3–§7 → RULES · §1/§9/§11/§15/§16 → PLAYBOOK · §5a yöntem/§8/§10 → MEASURE · §0.8 → GENAI · §12 → AUDIO · §13 → DOCS-TEMPLATES · §14 → LESSONS · §0.6 → motion-reviewer | A1 §1b |
| Referanslar | `references/{CHANGELOG, DECISIONS, PATTERNS, RETRO_TEMPLATE, scene-template, TRAPS-ARCHIVE}.md` | 6 | CHANGELOG proje (ders kaynağı) · DECISIONS karma (11 core / 7 world / 7 proje ADR) · PATTERNS core-ilham · RETRO_TEMPLATE core · scene-template core+world · TRAPS core (t-01…t-52) + world (d-01…d-19) | DECISIONS.md (core ADR) · PATTERNS.md (anonim, "ilham/uyarı" statüsü) · DOCS-TEMPLATES · LESSONS · world ADR/TRAPS → `examples/<world>/` | A1 §4–§7 |
| Worlds | `worlds/{fx-lab, desk-paper, screen-dark, light-ui, photo-plate}.md` | 5 | world (+ fx-lab'da çok sayıda **core ders**: 8-bit ışık, pişirme imzası, 1.65 px × k, 2×, karo belleği, raster SVG …) | `skills/motion-world/examples/<world>/{world.json, *.jsx, lessons.md}`; core dersler → LESSONS.md | A1 §8; A5 §3 |
| Ajanlar | `F/.claude/agents/{motion-director, reviewer, asset-gen, asset-scout}.md` | 4 | core (sızıntı: director Kaynak-B kök yolu + [ÖRNEK-marka] kuralı + "< 3" kapısı; reviewer/scout "≤ 5 s") | `agents/motion-director.md` · `agents/motion-reviewer.md` · `motion-research.md` (scout + kaynak/sözlük taraması) · `motion-measure.md` (bağımsız ölçüm) · asset-gen → GENAI.md prosedürü (§12 D1-04) | A1 §3; A6 §3 |
| Proje belleği | `F/CLAUDE.md`, `C/CLAUDE.md` | 2 | proje (çalışma kuralları core; Kaynak-B'daki Retro kuralı + ajan zinciri core) | `templates/CLAUDE.md` (anonim) + RULES §çalışma | A1 §1a-17/33 |
| Kullanıcı belleği | `bounded-render-waits`, `closed-decisions`, `no-intentional-violations` | 3 | core | RULES §çalışma/§DUR + LESSONS | A1 §10 |
| Kaynak-B skill/ajan kopyaları | `C/.claude/**` | 16 | çöp (11 birebir, 5 eski) | drop | A1 §12.1 |
| Render araçları | `F/render/*` | 52 (4 680 st.) | core 31 · world 4 · proje 13 · çöp 4 | `render/` npm `@motion/harness` — `lib/` 7 modül + ~26 alt komut (tablo §4.2) | A2 §1, §7 |
| Kaynak-B render | `C/render/*` | 51 | 19 ortak (10 aynı, 9 Kaynak-A'te ileride) · 32 yalnız Kaynak-B | taşınacak: `report`, `grade-rehearsal` (→ qc film), `mgM-staleness` (→ imgdiff stale), `mgM-assemble`, `mgM-seq` (→ contact seq), `mgM-whole`; kalan drop | A2 §5 |
| Runtime | `support.js` (69 KB), `shared/animations-v3.jsx`, `vendor/` (react 18.3.1, @babel/standalone 7.29.0, gsap 3.14.2) | 3 + vendor | core işlev / **lisans belirsiz** | yeniden yazılır: `render/runtime/` (uyumlu `x-import` yükleyici, saat, seek); vendor install'da indirilir | A5 §2.1; A2 §2.1 |
| Paylaşılan JSX | `F/shared/{marka-kit, brand-desk, brand-fx, screen-dark, brand-world, fx-inst, fx-lab, fx-rig}.jsx` | 8 | karma: core motor adayları (easing ×3 → 1, kamera rig `fxCamAt/FXCam/fxProj/FXLayer/fxDof`, ikincil hareket, dünya katmanı, varlık kaydı, bake/MoBlur, QC kancaları, `brand-fx` kalıp kütüphanesi) · world (fx-lab/fx-inst/brand-desk/screen-dark) · proje (kit marka parçaları) | core → `render/runtime/core/*` (renk/marka parametreye); world → `examples/<world>/` | A5 §1.1, §2 |
| Sahne kodu | `F/fx01.jsx`, `fx01-p1…p6.jsx`, `FX-01*.dc.html` (13) | 20 | proje (kalıp kaynağı) | girmez; H2 göç testinde geçici kopya | A5 §1.2–1.3 |
| Boards | `F/boards/*` (look, kıyas, varyant, font, enstrüman, gri kart, anahtar kare, galeri, storyboard) + `pages.json`, `sb.json` | 20 | **core süreç artefaktı** (tek sahne bileşeni, `window.FX_TMAP/FX_P1V/FX_PAL…` ile kare başına farklı an/varyant) · içerik proje | `render/runtime/boards` + `templates/boards/` (look/variant/compare/gallery/storyboard) | A5 §6 |
| Manifest | `F/scenes.json` (74 KB), `brand-manifest.js` | 2 | şema core (kısıt alanları), içerik proje | `templates/scenes.json` + JSON şeması; `world.json` ↔ manifest üreticisi | A4 §2; A5 §0.5 |
| project.md | `F/project.md` §1–§27 (+13 alt bölüm) | 40 | core (akış, K-iskeleti, 60 fps, devir, master spec, ses kuralları …) · world (bant, ön plan, kablo) · proje (brief, kimlik, içerik, sözlük) | `templates/project.md` iskeleti (§0–§11+) + RULES/PLAYBOOK/MEASURE/GENAI/AUDIO | A4 §1 |
| Belgeler | `F/docs/*.md` | 33 | rapor 4 · künye 6 · reviewer 9 · RETRO · TESLİM · diğer → **7 şablon** (RAPOR, KUNYE, REVIEWER, RETRO, TESLIM, RENDER_REPORT, SES-KAYMA) · örnek (anonim) · proje (QUANT-SOZLUK, F6B formül, MATERIALS içeriği) | `templates/` + `examples/ornek-film/` | A4 §3 |
| Gen-AI | `docs/gen/{CATALOG, KREDI, PROMPTS-FX-01}.md`, `assets/gen/{manifest, policy}.json`, `render/{gen, ingest, clip-scan, restyle, logo-upscale}.mjs` | 10 | core akış (pilot → kabul → ingest → ledger) · proje sayılar/istemler | `references/GENAI.md` + `templates/ledger.json` + `render` gen/ingest | A4 §5 |
| Ses | `script/*` (28), `render/{transcribe.py, beats, amap, amap3, ses, fx3-kayma}` | 34 | core hat · proje içerik (metin, kelimeler, BEATS) | `references/AUDIO.md` + `render` transcribe/beats/amap/audio-diff/ses | A4 §6 |
| Scratchpad betikleri | `Sess/scratchpad/*` kök 612 + alt klasör 137 | 749 | ölçüm (piksel 70, izdüşüm 52+3, ses 6, font 4) → core'a erir · zincir 43 → PLAYBOOK sırası · belge/kod/araç yaması 285 → çöp · reviewer 103 (73 benzersiz) → frame-check + reviewer yöntemi · ~125'i Kaynak-B | `render` `frame-check` (20 tip) + `--sheet`; erimiş olanlar çöp | A3 §1–§3, §6 |
| Bootcamp | `C/bootcamp/{ab, storyboard, unit}`, `docs/bootcamp/*` | 48 | core-ilham (K-24, K-22, K-31, K-08 kabul; K-29, K-12, K-03 revize; K-01 ret; K-15 çıkarıldı; K-52 demo) · `ab.json`/`compose.jsx` core aracı | PATTERNS.md (statüsüyle) + `render` A/B compose | A5 §4 |
| 3. taraf skill | `C/.agents/skills/higgsfield-*` (8, v0.13.0, LICENSE yok) | 8 | çöp (ADR-024: yalnız CLI başvurusu) | paketlenmez, bağımlılık yapılmaz | A5 §5 |
| Fontlar | `F/fonts/*.ttf|otf` (10), `fonts/gf/` (78 woff2 + map), `local.css` | 91 | **lisans riski** (3'ü "demo / personal use only"); gf = OFL/Apache ama lisans metni yok | hiçbiri girmez; `motion-render vendor` indirir + lisans metnini yazar | A5 §1.4, §7 |
| Varlık/medya | `F/assets/{gen (877 MB), logo, fx}`, `materials`, `out/` (197 GB), Kaynak-B `out/` (26 GB), `Materials/`, `uploads/` | — | proje (gürültü PNG'leri: core **betik**) | hiçbiri girmez; `bake-noise` betiği girer | A4 §9; A5 §7 |

---

## 4. Hedef haritası (yeni paket ← kaynak)

### 4.1 Plugin ağacı

```
motion-harness/                       (depo = marketplace + plugin "motion", HK-07/HK-09)
  START.md · README.md · install.ps1/.sh · uninstall.* · doctor.*        ← yeni (A2 §6.3 kurulum engelleri)
  .claude-plugin/{plugin.json, marketplace.json}                        ← yeni
  skills/motion-core/SKILL.md + references/
    PLAYBOOK.md        ← SKILL §1/§9/§11/§15/§16 · project.md §14/§15/§18/§23/§25 akışları · A3 §4 genelleştirilmiş sıra · A6 FAZ istem iskeleti
    RULES.md           ← SKILL §0/§0.5–0.7/§2–§7 · K1–K8 + FX-* (A1 §2.19) · DUR-1…11 (A1 §2.17) · bellekler · §6 eşik tablosu
    MEASURE.md         ← SKILL §5a yöntem/§8/§10 · qc 16 kontrol (A2 §2.4) · frame-check 20 tip (A3 §3) · OURS/K3/K1/S×/devir
    GENAI.md           ← SKILL §0.8 · ADR-023/024/025 · project.md §3.2/§3.3/§9/§27b · A4 §5 · ajan asset-gen/scout prosedürü
    AUDIO.md           ← SKILL §12 · project.md §8/§19/§20/§24/§27 · A4 §6 · fx-lab ses dersleri C69–C74
    DOCS-TEMPLATES.md  ← RETRO_TEMPLATE · scene-template · A4 §3.2 iskeletleri · A6 §2.5 kanonik rapor
    LESSONS.md         ← TRAPS t-01…t-52 · A1 §9a (105) · RETRO (72) · Kaynak-B RETRO (20) · A6 §4 (core olanlar)
    PATTERNS.md, DECISIONS.md (core ADR'ler)
  skills/motion-world/SKILL.md (WORLD-SPEC) + examples/{fx-lab, desk-paper, screen-dark}/   ← worlds/*.md + shared/*.jsx world parçaları (A5 §3)
  skills/motion-reviewer/SKILL.md     ← §0.6 · UCUZ 10 (+ #11 "önceki projeyi taklit") · reviewer.md 1–8 · ön plan 5 soru · F11 "kendi yöntemiyle ölç" · A6 §3.4 dönüş biçimi
  skills/motion-live/SKILL.md         ← YENİ (kaynakta karşılığı yok)
  agents/{motion-director, motion-reviewer, motion-measure, motion-research}.md
  commands/{init, setup, faz, gate, master, promote, doctor, live}.md
  render/   (npm @motion/harness, bin motion-render)  ← F/render 31 core + Kaynak-B 6 + scratchpad ölçümleri + yeni runtime
  templates/ ← project.md, scenes.json, CLAUDE.md, KUNYE, RENDER_REPORT, RETRO, REVIEWER, TESLIM, ledger.json, rapor şablonu
  examples/ornek-film/  ← anonim belgeler + kontak PNG'leri (Kaynak-A karesi İÇERMEYEN; §12 D1-13)
  evals/
```

### 4.2 `render/` modül eşlemesi (özet; tam tablo A2 §7.2)

| modül / alt komut | eritilen kaynak | not |
|---|---|---|
| `lib/project` | `scenes.mjs` + her dosyadaki ROOT/FPS | ROOT = `--project` ‖ `MOTION_PROJECT` ‖ cwd'den yukarı `scenes.json`; tek FPS/KF |
| `lib/ffmpeg` | `encode.mjs` + 6 `ff()` kopyası | `MOTION_FFMPEG` → `ffmpeg-static` → PATH; renk etiketi ön ayarları; `.part` → rename |
| `lib/page` | harness probe + `--eval` (qc ×3, ss2, ours, k6, inkhero …) | süreç-içi sayfa API'si |
| `lib/{img, grade, amap, args, log}` | ölçüm parçaları, grade zincirleri, amap çözücüsü | grade zinciri world'den |
| `runtime/` | — (yeni) | `support.js`/`animations-v3` uyumlu yeniden yazım; sözleşme `docs/page-contract.md` |
| `render`, `probe`, `wait`, `ss2`, `expo-post`, `grade`, `encode` | harness, wait-render, ss2 + scratch `down2dir`, expo-post, grade-encode, encode, anim-encode | `render --patch-range` = yedek → sil → üret → tanık `identical` → kopya (A3 §4.2) |
| `qc`, `frame-check`, `ours`, `contact`, `imgdiff` | qc, inkhero, probe-contrast, k6count, film-qc, analyze, ours, contact, sheet, storyboard, pilot-contact, imgdiff + **scratchpad 122 ölçüm + 103 reviewer betiği** | frame-check manifest'ten (`checks[]`) okuyan TEK denetçi |
| `master`, `arsiv` | master, reel, arsiv | çıktı adları manifestten |
| `transcribe`, `beats`, `amap`, `audio-diff`, `ses` | transcribe.py + scratch `clipcheck*.py`, beats, shots, amap, amap3, fx3-kayma + scratch `envxc`, ses | Python isteğe bağlı (`requirements.txt`) |
| `vendor`, `gen`, `ingest`, `logo`, `smoke`, `init`, `run`, `manifest`, `report`, `world` | vendor, gen, logo-upscale, restyle req, ingest, clip-scan, logo-build/fit/assets/check, bench10, init-project, a-pass-batch.sh, manifest-sync, Kaynak-B report, bake-noise | `smoke` = kurulum denetimi + tek kare |
| drop | fps-test, manifest-fx3, logo-trace, look-fx, looksheet, galeri-sheet, fontmatch; Kaynak-B mgM-*/cr01/mg03/mg17/lookdev | proje arşivinde kalır |

---

## 5. Scratchpad'de kalmış bilgi

Tam tablo (betik · kural · yöntem · eşik `dosya:satır` · `render/` karşılığı · frame-check bildirimi): [A3 §2](../evidence/h0/A3-scratchpad.md). Özet:

| aile (betikler) | ölçtüğü kural | eşik | `render/`'da | frame-check tipi |
|---|---|---|---|---|
| `p2frame` … `p6frame`, `p5s19*`, `p5desk`, `p5links`, `p5logo`, `satcand`, `vis`, `cabproj` | kadraj payı (obj 12 / lyric 50 / rr 60), lyric ≥ 160 px, label ≥ 40 px, kesik metin hepsi-ya-hiç, masa payı | `desk.max` 0,003–0,006 | ✗ | `framing` |
| `p2/p3/p4tools*`, `p4hpen`, `p4pen13*`, `p5tip`, `p6frame` alet bölümü | K8 alet giriş/çıkışı kadraj dışından, tek alet, tutuşta alet yok, alet hızı | ≤ 55–57 px/kare @1080p60 | ✗ | `toolPath` |
| `p4body*`, `p4cr*`, `p4h1`, `hit`, `hit2`, `p4fit` | **örtme 0** (gövde ∩ glif, kiriş ∩ logo/metin) | 0 | ✗ | `overlap` |
| `p4/p5/p6frame` kamera, `p5cam`, `p4k3*`, `p4vcand*`, `s10cand`, `p3ours`, `vcorner` | **basamak 0** (|Δv| > 2,5 px/kare = 0), K3 hareketli pay | ≥ 0,64 px/kare @60 · pay ≥ 0,4 | ◐ (qc ivme, ours) | `camera` |
| `seams`, `seam*`, `diff*.js`, devir `imgcmp` | perde dikişi | durağan ≤ 2/255 · hareketli ≤ 1,1 × komşu | ✗ | `seam` |
| `seam12`, `f9b-series*`, `pairdiff`, `yplane`, `spikes`, `dup*` | son 12 kare sıçrama oranı, Y-düzlemi basamağı, kopya/takılma | oran ≤ 1,5 · taban 0,02 | ✗ | `temporal`, `ramp` |
| `redscan`, `f7-redloc`, `qcsig`, `red*` | **tek vurgu rengi**: konum (izinli kutular dışında 0), kota, köprü | dışarıda 0 px | ◐ (qc sayım) | `accentLocation` |
| `deltae`, `de2` | aksan/logo rengi tutarlılığı | ΔE2000 ≤ 3 (logo) / ≤ 5 (aksan çizgisi) | ✗ | `accentColor` |
| `sharp*`, `edgew`, `sledge`, `slzoom`, `trace`, `rows*`, `cols`, `prof`, `perp` | keskinlik oranı, S× kenar ≤ 1,9 px, çizgi profili | kenar %10–90 yeşil kanal | ✗ | `sharpness`, `stroke` |
| `lum*`, `lumraw`, `lumsplit`, `lumser`, `tile`, `texstat`, `edgeall`, `meas` | bant (zaman ağırlıklı), hücre ızgarası, kenar karanlığı | world bandı (zorunlu) · kenar düşümü ≤ %20 | ◐ (qc bant) | `luma`, `edgeDark` |
| `imgcmp` tanık döngüleri, `domsig`, master `cmp` | bayatlık tanığı, değişmeyen kareler, master vN ↔ vN−1 bit-eşliği | fark 0 | ◐ (imgdiff) | `identical` |
| `shift*`, `vel`, `track`, `beam`, `navy`, `ellx` | piksel hareket/takip, ilk/son görünür kare | — | ✗ | `motion` |
| `align`, `envxc`, `fx2diff`, `dbprof`, `clipcheck*.py` | çentik ≤ 1 kare, ses kayması, kelime farkı, sessizlik | |Δ| ≤ 33 ms · çentik ≤ 1 kare | ✗ (ağaç dışı) | `sync` |
| satır içi loudnorm/volumedetect | master ses | −16 LUFS / ≤ −1 dBTP | ◐ (master) | `loudness` |
| `cmap`, `mathglyph`, `glyphcheck`, `p4metric` | glif kapsamı, alt küme | — | ◐ (qc glif) | `glyph` |
| `f*-chain*.sh` (43) | hat sırası | — | — | PLAYBOOK sırası (A3 §4.2) |

Yeni sahne kancaları (izdüşüm tipleri için): `__boxes(T)`, `__tools(T)`, `__holds()`, `__events()`, `__glyphs(T)` — bugün her perdenin `pNframe.js`'inde sabit kodlu. Ortak `world.json → classes` kaydı: scratchpad'de **beş ayrı "kırmızı" tanımı** var; tek kayıtta adlandırılır. Erimiş (çöp): `f7-qcgap*`, `f7-qcrex`, `f7-k1` (→ qc), `f9-dip*` (→ expo-post), `lb-*`, `lc-fix` (→ logo-*), `diff.mjs` (= imgdiff).

---

## 6. Koda gömülü eşik envanteri (birleşik)

Ham satırlar: A1 §11 (8 kategori), A2 §4 (14 kategori, `dosya:satır`), A3 §7, A4 §8. Aşağıdaki tablo `RULES.md`'nin iskeletidir: **varsayılan** core değeridir; **override** kimin değiştirebileceğini; **zorunlu** world/proje tanımlamadan çalışılamayacağını gösterir. Kare eşikleri saniyeye çevrildi (Kaynak-A 60 fps değerleri parantezde).

| id | kural | varsayılan (core) | Kaynak-A değeri | override | zorunlu | kaynak |
|---|---|---|---|---|---|---|
| T-BAND | parlaklık bandı (zaman ağırlıklı ort.) | **yok** | fx-lab %40–58 (W:fx %40–55 çelişkisi) | world | **evet** (world) | S:251, P:332 |
| T-BAND-typ | tipografik profil bandı | %6–14 | — | world | — | S:253 |
| T-DARK | karanlık hata | ort. < %8, 0,5 s | 30 kare | world | — | S:193, P:341 |
| T-EMPTY | boş siyah | hücre > %70 → uyarı; > 1 s → hata | 60 kare | world | — | S:258 |
| T-AMB | ortam ışığı tabanı | ≥ %10 | — | world | — | S:192 |
| T-K1 | kahraman ölçeği (maske tanımı world'de) | alan ≥ %30 ya da yükseklik ≥ %50 | ≥ %35 / ≥ %55 (mürekkep maskesi) | world (maske) / proje (eşik) | **evet** (maske) | S:246, P:256 |
| T-TXT | okunacak metin | ≥ 22 px · WCAG ≥ 4,5:1 · kahraman−çevre ≥ 25/255 | lyric ≥ 160 px | proje | — | S:247–250 |
| T-DISP | display tek karakter | ≥ 72 px | — | proje | — | S:254 |
| T-FADE | fade yok | ≥ 2 kare ve ≥ %25 → hata | ≥ 4 kare | — (SERT) | — | S:361 |
| T-LAST | son kare | ham max ≤ 2, encode 0; saf siyah son 0,2 s | 12 kare (bug: 60 fps'te ölçeklenmiyor) | — (SERT) | — | S:300, S:319 |
| T-ACC | tek vurgu rengi | 1 renk · kota manifestte · izinli kutu dışında 0 px | kırmızı: logotip + film boyunca 1 vuruş | proje (kota) | **evet** (renk sınıfı world'de) | S:211, A3 §2.2 |
| T-ACC-ΔE | aksan/logo rengi tutarlılığı | ΔE2000 ≤ 3 (marka), ≤ 5 (çizgi) | aynı | proje | — | W:fx:269, P:488 |
| T-CAM-V | kamera hız tavanı | world | genel bakış ≤ 30 px/kare | world | — | P:473 |
| T-CAM-STEP | **basamak 0** | ardışık hız farkı > 2,5 px/kare sayısı = 0 | aynı | — (disiplin) | — | W:fx:226, M:noi |
| T-CAM-ACC | kamera ivmesi | ≤ %15, taban 2 px/kare (uyarı) | aynı | world | — | P:310 |
| T-K3 | sürekli kamera payı | hareketli pay ≥ 0,4, hold ≤ 0,6; hareketli = ≥ %2 ekran gen./s | 0,64 px/kare @60 | proje (profil) | — | P:397 |
| T-OURS | OURS tabanı | hareketli ≥ 0,4 · hold ≤ 0,6 | hedef 1,67 s / 0,38 / 0,62 | proje | — | P:46, P:184 |
| T-NOTCH | **çentik / olay ↔ kelime** | ≤ 1 kare (60 fps: ≤ 16,7 ms) | aynı | — (disiplin) | — | P:285 |
| T-OCC | **örtme 0** | alet/gövde ∩ metin/kahraman = 0; ön plan alan ≤ %5, metin 0 | aynı | — (disiplin) | — | P:278, P:418 |
| T-TOOL | alet/nesne hızı (görünür kısım) | ≤ 57 px/kare @1080p60 | kalem 30/50 | world | — | W:fx:244 |
| T-K8 | zanaat: aynı anda başlama/bitme yok | ofset ≥ 3 kare · ardışık fark oranı ≤ 1,5 · oturma tepe > 2 px | aynı | world | — | P:263, P:596 |
| T-HOLD | bilinçli hold / ölü açılış | son vuruş kesmeden ≥ 0,25 s önce · açılış ≤ 1,3 s · çizim arası ≤ 0,6 s | aynı | world | — | W:fx:116 |
| T-SEAM | perde/sahne dikişi | durağan ≤ 2/255 · hareketli ≤ 1,1 × komşu | aynı | — | — | P:381, P:501 |
| T-SEAM12 | sahne sonu son 12 kare | sıçrama oranı ≤ 1,5, taban 0,02 | aynı | — | — | P:564, A3 §3.2-3 |
| T-STALE | bayatlık / değişmeyen kareler | fark 0 (probe ↔ kayıtlı); bayat > 0,01 ort. | aynı | — | — | DE:15, TR:171 |
| T-2X | süper örnekleme | k < 0,5 (± 6 kare) → 2×, sınırda karışım 6 kare | aynı | world | — | P:503 |
| T-SX | S× kahraman katmanı | k ≥ 1,5 → S×; kenar ≤ 1,9 px; düzlem kenarı ≈ 1,65 px × k | aynı | world | — | W:fx:290–292 |
| T-LAYER3D | 3B katman/kare | ≤ 12 | aynı | — | — | W:fx:198 |
| T-AUDIO-Δ | yeni ses kayması | |Δ| ≤ 33 ms → yeniden render yok; koridor ±28 ms; > 50 ms çelişen çapa atılır | aynı | — | — | P:400, W:fx:297 |
| T-PAUSE | vuruş haritası durağı | ≥ 250 ms | aynı | proje | — | P:164 |
| T-WRITE | yazım hızı | ≤ 12 glif/s | kalem ≈ 15 px/kare | world | — | P:448 |
| T-LINE | Türkçe büyük harf satır aralığı | ≥ 1,2 × punto | aynı | — | — | W:fx:276 |
| T-MASTER | master | ProRes 422 HQ + H.264 CRF 16 + AAC 320k; −16 LUFS / ≤ −1 dBTP; tek sürekli encode | aynı | proje (teslim formatı) | — | P:574 |
| T-ARCH | arşiv | FFV1 kayıpsız + framemd5 bit-exact | aynı | — | — | A2 §2.8 |
| T-ANIM | animatik | 960×540, 30 fps (skill 15 fps eski) | aynı | profil | — | P:335 |
| T-GATE | §0.6 zevk kapısı | **açık karar D1-05** (skill "< 3 → render yok", Kaynak-A ≥ 7/8) | ≥ 7/8 | proje | — | S:71, P:45 |
| T-UCUZ | UCUZ işaretleri | 0 (11 madde, #11 "önceki projeyi taklit") | 10 madde | — | — | P:53–63 |
| T-VAR | varyant | shot/sahne başına 3 gerçekten farklı yön | 3 still/shot | — | — | P:336 |
| T-ROUND | tek düzeltme turu | GEÇMEZ → 1 tur → GEÇMEZ ise DUR, render yok | aynı | — | — | P:377 |
| T-GEN-CAP | üretken bütçe | görev tavanı + film tavanı + sapma > %10 → DUR; ledger her batch | 40/60, film 400 | proje | **evet** (bütçe projede) | P:88–105 |
| T-GEN-CLIP | üretken klip | ≤ 5 s (Kaynak-A A ≤ 10 s); taslak önce; 2 varyant | aynı | proje | — | S:103 |
| T-GEN-LAYER | A/B/C payı | — | A ≤ %25, B ≥ %40, C ≥ %30 | proje | — | P:72 |
| T-LOGO | logo vektör kabulü | IoU ≥ 0,98 · p90 ≤ 0,8 px · dalga p99 ≤ 0,3 px · ≤ 40 düğüm/harf · raster-SVG taraması | aynı | — | — | P:664, P:674 |
| T-DISK | disk | ≥ 40 GB boş (tam render öncesi) | aynı | makine | — | P:344 |
| T-WD | watchdog | kare 45 s · süreç 120 s; bekleme üst sınırı × 2 | aynı | — | — | S:339, M:bnd |
| T-LIVE-* | canlı profil | ≥ 60 fps · gecikme ≤ 100 ms · düşen kare 0 | — (yeni) | — | — | brief H3 |

Çelişkiler (H1'de tek kaynağa bağlanacak): fx-lab bandı %40–55 ↔ %40–58; animatik 15 ↔ 30 fps; kapı "< 3" ↔ ≥ 7/8; klip ≤ 5 s ↔ ≤ 10 s; darbe sarsıntısı "1 kare 2–3 px" ↔ basamak 0; karanlık eşiği eski %40/%0,1 ↔ %30/%0,05; saf kare 12 sabit (60 fps'te yarı süre); FPS yedek değerleri 30/60 karışık. [A1 §12.2; A2 §6.4]

---

## 7. Ders envanteri

| kaynak | kayıt | core | world | not |
|---|---:|---:|---:|---|
| TRAPS-ARCHIVE (t-01…t-52, d-01…d-19) | 71 | 63 | 8 | d = desk-paper | 
| skill/world/ADR/CHANGELOG/bellek (A1 §9) | 144 | 105 | 39 | fx-lab'daki genel dersler core sayıldı |
| Kaynak-A `docs/RETRO.md` (A4 §4) | 72 | çoğu core | — | en sık tuzak: satır ortası `//` yorumu (6+ kez) |
| Kaynak-B RETRO (A4 §7) | 20 | — | — | seçilmiş |
| kullanıcı düzeltmeleri (A6 §4) | 29 | 24 | 5 | zaman sıralı |
| yapanın süreç dersleri (A6 §4) | 4 | 4 | 0 | |
| **toplam (ham)** | **≈ 340** | | | H1'de tekilleştirilip `LESSONS.md`'ye (core) ve `examples/<world>/lessons.md`'ye (world) |

Brief'te adı geçen dersler — hepsi bulundu, hepsi **core** (fx-lab'da bulunmuş olsalar da):

| ders | özü | kaynak |
|---|---|---|
| pişirme imzası | önbellek imzalı içerikte boş koşullu çocuk bile imzayı değiştirir → canlı süzgeç; aralık dışı kareler probe ↔ kayıtlı imgdiff 0 | W:fx:287 (C1) |
| 8-bit ışık | gradyan durakları ve örtü alfası 8-bit'e yuvarlanır → nefes/küçük pozlama basamak üretir; post'ta kayan nokta + duruk dither; siyaha iniş 16-bit + TPDF | W:fx:260/284/270 (C2–C4) |
| kenar ≈ 1,65 px × k | 3B büyütme düzlemi yerel px'te çizip k kat büyütür; DPR/will-change düzeltmez → kahraman S× katmanında | W:fx:290 (C5) |
| 2× kuralı | k < 0,5 genel bakışta mipmap'siz küçültme küçük metni düşürür → aralık bazlı 2×, sınırda karışım | W:fx:272 (C7) |
| karo belleği | çok büyük katman uzakta çizilmez → `--force-gpu-mem-available-mb=4096`, küçük div + scale | W:fx:257 (C8) |
| raster SVG tuzağı | "SVG" dosyası çoğu kez base64 raster kap → önce dosya taraması, sonra IoU/delik/dalga | W:fx:293 (C9) |

Diğer öne çıkan core dersler: uç uca mp4 dikiş sıçraması → master tek sürekli encode (C14); paylaşılan bileşene parametre eklerken varsayılan = eski çıktı (C17); ses değişince önce zarf korelasyonu, tasarım zamanı korunur (C69–C74); Whisper halüsinasyonu → klip doğrulaması; "teşhis önce, sayıyla neden"; "belgeler reviewer'dan önce"; "kasıtlı" diye SERT ihlal bırakılmaz; kapalı karar tekrar sorulmaz; bekleme üst sınırlı; JSX yorum tuzakları → yama sonrası yüklenebilirlik probe'u (C41). Tam liste ve atıflar: A1 §9, §5; A4 §4, §7; A6 §4.

---

## 8. Süreç sözleşmeleri (paket bunları aynen taşır)

| sözleşme | kaynak | özü |
|---|---|---|
| FAZ istemi | A6 §1.3 | başlık · KARARLAR § · İLKE/KURAL (SERT ↔ VARSAYILAN) · numaralı işler (ölçülebilir kabul) · AKIŞ · YAP/YAPMA · REVIEWER · `Rapor:` · DUR |
| Faz sonu raporu | A6 §2.5 | `# F<n> · <kapsam>: <sonuç>` → sonuç paragrafı (reviewer kararı, §0.6 x/8, bakiye önce→sonra) → `## Kapılar` tablosu → faza özgü bölümler → sapmalar → `## Açık kararlar` (KAPALI KARAR listelenmez) → borç tablosu → `## Dosyalar` → `## Katkı` (zorunlu; 1–3 katkı, A/B'siz "deneme") → `**DUR — …**`. Ölçü 3–5,5 bin karakter, sayılar birimli |
| Reviewer kaydı | A4 §3.2; A6 §3.4 | `<tur> — <KARAR>` · §0.6 x/8 (yapanla fark) · UCUZ geçer/VAR #/sınırda # · ön plan tablosu · en zayıf anlar · zorunlu/isteğe bağlı/açık karar; GEÇMEZ ise kare aralıklı düzeltme listesi |
| Reviewer yalıtımı | A1 §3.1; A6 §3.3 | yapanın gerekçesini görmez; yalnız çıktı + kural; F11'den beri **kendi ölçüm yöntemi**, yapanın sayıları referans değil; düzeltme yapmaz |
| Faz akışı | A3 §4.2; P §18 | sözlük/varyant (3 yön) → seçim → animatik (K7) → reviewer → tek düzeltme turu → tam render → QC/kontak/OURS/K1/K6 → reviewer (teslim) → DUR |
| Künye / TESLİM / RENDER_REPORT / RETRO | A4 §3.2 | 7 şablon iskeleti çıkarıldı |

Ajan dizilimi önerisi (§12 D1-04): kullanıcı → ana oturum (`/motion:faz`) → `motion-director` (yapan) ⇄ `motion-research` (kaynak/sözlük/üretken ihtiyaç, salt-okur) · `motion-measure` (bağımsız ölçüm, kendi yöntemi) · `motion-reviewer` (taze bağlam, salt-okur araçlar + yalnız `out/review/` yazımı). Kapı başına taze reviewer; tek düzeltme turunda önceki kararı girdi olarak alır.

---

## 9. Higgsfield kimliği (değer yazılmadı)

| ne | konum / değer |
|---|---|
| Kimlik türü | OAuth 2.0 PKCE oturumu — `@higgsfield/cli` 1.1.26 (global npm, `higgsfield`/`hf`) |
| Kimlik dosyası | `%USERPROFILE%\.config\higgsfield\credentials.json` (alanlar: `access_token`, `refresh_token`, `expires_at`, `token_type`, `scope`, `auth_version`) + `config.json` (`workspace_id`) |
| API anahtarı | **yok** — projelerde `.env*` yok, `render/*.mjs` anahtar değişkeni okumuyor, kullanıcı ortam değişkenlerinde `HIGGS*`/`HF_*` yok, transkriptte yok |
| Betiklerin kullanımı | `higgsfield account status | generate cost | generate create` (`gen.mjs:27–29`, `logo-upscale.mjs:11–13`), `spawnSync(shell:true)` |
| Bakiye okuma | `higgsfield account status --json` → `credits` (şu an 768,02), `subscription_plan_type` (plus); e-posta alanı basılmaz · MCP `balance` (salt-okur) |
| Ledger | `assets/gen/manifest.json` → `ledger[] {task, date, balanceBefore, balanceAfter, diff, items, creditsSum, match}`; 503 kaybı (2 kredi) `match:false`, iade alanı yok → pakette `lost[{id, credits, reason, refund}]` |
| Kredi geçmişi | 1010 → 774,02 → 768,02 (transkript) |

---

## 10. Gizlilik — pakete asla girmez

17 kalem, yollarıyla: [A4 §9](../evidence/h0/A4-docs-project.md), lisans/font ayrıntısı [A5 §7](../evidence/h0/A5-worlds-jsx.md). Özet: müşteri `Materials/` (seslendirme, logolar, görseller, bootcamp referans videoları) · her iki `out/` (kare, mp4, master, arşiv, clipcheck günlükleri) · `assets/gen` (üretken medya, istemler, job ID/sonuç URL'leri) · `assets/logo` · `script/*` (transkript, BEATS, lyric) · `QUANT-SOZLUK`, F6B formül envanteri, `MATERIALS` metni · `project.md` §1/§2/§17/§21 metinleri · `scenes.json` lyric metinleri · sahne kodu (müşteri metni gömülü) · Kaynak-B MG/BL sayfaları, gömülü base64 görseller · fontlar (3'ü demo/personal-use) · 3. taraf Higgsfield skill'leri ve `carousel-tp.html` · Higgsfield kimliği · `.venv` (whisper modeli ~3 GB), `node_modules` · session transkriptleri ve scratchpad kırpımları.
Pakete girebilir: belge **yapıları**, genelleştirilmiş eşikler (`[ÖRNEK]`), betik **mantığı** (yeniden yazılmış), anonim JSON iskeletleri, bizim ürettiğimiz ve müşteri içeriği taşımayan örnek kontak PNG'leri.

---

## 11. H0 sonu hash farkı

| ölçüt | sonuç |
|---|---|
| Manifest | `evidence/source-hashes-H0.json` — 77 504 kayıt, 227,76 GB, hızlı mod, 0 hata |
| Kararlı bölge farkı | **7** (eklenen 0 · silinen 0 · değişen 7): `Kaynak-A/docs/F3-KUNYE.md`, `F4-KUNYE-P2.md`, `F5-KUNYE-P3.md`, `F6-KUNYE-P4.md`, `F7-KUNYE-P5.md`, `F8-KUNYE-P6.md`, `FX-01-TESLIM.md` |
| Atıf (`dev/hash-attribute.mjs`) | 7 / 7 canlı Kaynak-A session'ına atfedildi (yazma çağrıları 19:47 UTC'den itibaren, dosya başına 3–6 eşleşme) · **atfedilemeyen 0** → `evidence/hash-attribute-H0.json` |
| Oynak bölge farkı | 55 (eklenen 42 · değişen 13) — `Kaynak-A/out/**` ve `Sess/**`; F11-B teslim turu |
| Bizim yazdığımız | **0** — bu session kaynak köklere hiçbir yazma/silme/taşıma çağrısı yapmadı; ajanlar yalnız okudu (yardımcı betikler bu session'ın scratchpad'inde) |

Not: brief "out/ ve scratchpad/ oynak" diyordu; canlı session `docs/`'a da yazıyor. Kullanıcının tanımını genişletmek yerine kararlı bölgede değişen her dosya transkriptle atfedilir; kural "atfedilemeyen = 0" (HK-11).

---

## 12. DUR 1 — onayınıza sunulan kararlar

Bunlar dışındaki her şey brief'teki varsayılanlarla ilerler; ayrıntı ve gerekçe [H-KARARLAR.md](H-KARARLAR.md).

| # | karar | öneri | neden |
|---|---|---|---|
| D1-01 | Higgsfield kimliği | Kopyalama yok: install/doctor `higgsfield` CLI'yi ve `account status`'ü denetler, bakiyeyi basar; oturum yoksa kullanıcı `higgsfield auth login` yapar. `.env` `HIGGSFIELD_API_KEY` yalnız isteğe bağlı yedek yol (HK-05) | Kopyalanacak sabit anahtar yok; refresh token döner, kopya bayatlar ve sırrı çoğaltır |
| D1-02 | Runtime ve H2 anlamı | Paket kendi uyumlu runtime'ını yazar (`support.js`/`animations-v3` dağıtılmaz). H2 iki katman: (a) paket harness'i + Kaynak-A kopyasının kendi runtime'ı, (b) paket harness'i + **paket runtime'ı**; ikisi de ≤ 0,5/255. Playwright 1.63.0 (Chromium rev 1243) sabitlenir; P6 karşılaştırması aynı ss2 + expo-post zinciriyle; kaynak kareler before-manifest hash'iyle doğrulanır | Lisans; "fire vermeden" iddiasının asıl kanıtı (b) |
| D1-03 | fps/tuval | Core varsayılan 60 fps · 1920×1080, bütün eşikler saniye + fps; animatik 960×540 @30 | Kaynak-A kalitesi; 30 fps sabitleri hata kaynağı |
| D1-04 | Ajanlar | 4 ajan: `motion-director` (yapan; asset-gen prosedürünü GENAI.md'den yürütür), `motion-research` (asset-scout + kaynak/sözlük taraması), `motion-measure` (bağımsız ölçüm), `motion-reviewer` (taze bağlam, `tools` kısıtlı, yalnız `out/review/` yazar). Kapı başına taze reviewer | Fiilî akış; kalıcı reviewer 111 MB bağlam |
| D1-05 | §0.6 kapı eşiği | `full` profil ≥ 7/8 (Kaynak-A), `light` ≥ 6/8, `live` ≥ 7/8; proje yükseltebilir, düşüremez | "Kaynak-A kalitesi aynen" |
| D1-06 | Bant ve K1 maskesi | World'de zorunlu, core'da varsayılan yok (brief) — tipografik profil bandı %6–14 tek istisna (profil, world değil) | Brief + "üslup gelmez" |
| D1-07 | World örnekleri | `fx-lab`, `desk-paper`, `screen-dark` örnek paket (screen-dark anonim adla `screen-dark`); `light-ui` ve `photo-plate` yalnız `world.json` + `lessons.md` (paylaşılan kodları yok) | A5 §3 |
| D1-08 | Python/Whisper | İsteğe bağlı: `motion-render init --with-whisper` (`requirements.txt` + venv); smoke ve eval'de gerekmez | 3 GB model, CPU yavaş |
| D1-09 | Fontlar | Hiçbir font dosyası pakete girmez; `vendor` world/look-dev seçimine göre Google Fonts'tan indirir ve lisans metnini yazar | Lisans riski |
| D1-10 | Süreç belgelerinin gizliliği | `docs/H0-ENVANTER.md` + `docs/h0/` gerçek yol ve marka adı taşıyor. H5 push öncesi: ekler `evidence/h0/`'a (git dışı) taşınır, ana belge `[ÖRNEK]`'le anonimleşir; push öncesi `dev/privacy-scan` (marka/ürün/müşteri adları, mutlak kullanıcı yolları, e-posta) 0 bulgu kapısı | Depo arkadaşla paylaşılacak |
| D1-11 | Eval'de mülakat | `/motion:init` brief dosyasındaki ön-bilgiyi (frontmatter) okursa soru sormaz; yoksa AskUserQuestion. Eval `claude -p --plugin-dir` ile taze klasörde koşar | Headless session'da AskUserQuestion yanıtlanamaz |
| D1-12 | Kaynak-B'a özgü render araçları | `report`, `grade-rehearsal`, `staleness`, `assemble`, `seq`, `whole` taşınır (genelleştirilerek); kalan Kaynak-B araçları drop | A2 §5 |
| D1-13 | `examples/ornek-film/` kontak PNG'leri | Brief çelişkisi: ağaç "kontak PNG'leri" diyor, gizlilik "Kaynak-A/[ÖRNEK-marka] KARE pakete girmez" diyor. Öneri: Kaynak-A karesi girmez; örnek kontaklar ya kare yerine nötr yer tutucu + ölçüm katmanı (ızgara, etiket `f · t s · luma%`, kapı renkleri) ile **biçim örneği** olarak üretilir, ya da H4 eval projelerinin (müşterisiz) kontaklarından alınır | Gizlilik kuralı daha bağlayıcı |
