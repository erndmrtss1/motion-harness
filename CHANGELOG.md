# Değişiklikler

Sürümleme: [semver](https://semver.org/lang/tr/). Plugin sürümü `.claude-plugin/plugin.json`, render paketi `render/package.json`.

## 1.0.0 — 2026-10-18

İlk sürüm: kaynak bir motion-grafik projesinin üretim **süreci** tek bir Claude Code plugin'i (`motion`) ve bir render/ölçüm paketi (`@motion/harness`, komut `motion-render`) olarak paketlendi. Üslup taşınmaz: her proje kendi world'ünü look-dev'de kurar.

### Plugin (`motion`)
- Komutlar: `/motion:init` (mülakat ya da ön-bilgili brief; `--profile`, `--world`), `/motion:setup`, `/motion:faz <audio|lookdev|lexicon|P<n>>`, `/motion:gate`, `/motion:master`, `/motion:promote`, `/motion:doctor`, `/motion:live`.
- Ajanlar: `motion-director` (yapan), `motion-research` (kaynak/sözlük/üretken istek), `motion-measure` (bağımsız ölçüm), `motion-reviewer` (her kapıda taze, salt-okur; hafızası `docs/REVIEWER.md`).
- Skill'ler: `motion-core` (SKILL + PLAYBOOK, RULES — 241 kural ve yaratıcılık kuralı, MEASURE — qc 16 kontrol + frame-check 20 tip, GENAI, AUDIO, DOCS-TEMPLATES, LESSONS — 219 core ders, PATTERNS — 54 kalıp kartı "ilham/uyarı", DECISIONS — 16 ADR), `motion-world` (WORLD-SPEC + örnek world'ler: fx-lab, desk-paper, screen-dark, light-ui, photo-plate — ÖRNEK, varsayılan değil), `motion-reviewer` (§0.6 8 madde, UCUZ 11 işaret, tek düzeltme turu), `motion-live` (OBS canlı profil).
- Şablonlar: project.md, scenes.json, CLAUDE.md, KÜNYE, REVIEWER, RETRO, TESLİM, RENDER_REPORT, RAPOR, FAZ, SES-KAYMA, SÖZLÜK, ledger.
- Kurulum: `install.ps1` / `install.sh` (idempotent, adım adım ✓/✗), `uninstall.*`, `doctor.*`.

### Render paketi (`@motion/harness` 1.0.0)
- Kendi sayfa runtime'ı (`motion-runtime.js`, `motion-stage.jsx`) ve stilden bağımsız yardımcılar (`motion-core.jsx`).
- Harness (kare kare seek render, 2× süper örnekleme `ss2 [--frames a-b]`, watchdog, `--resume`, disk kuralı), grade/encode, expo-post (16-bit + TPDF dither), qc, **frame-check** (manifest bildirimli tek denetçi, 20 tip), ours/K3, K1, K6, kontak, imgdiff/bayatlık, master (ProRes 422 HQ + H.264, −16 LUFS), arşiv (FFV1 + framemd5), ses hattı (tts, transcribe, beats, amap, audio-diff), üretken varlık (gen, ingest + ledger), logo vektör hattı, vendor (React/Babel + Google Fonts lisanslarıyla), init, smoke, live (`--qc`, `--capture`), doctor.
- Göç testi (H2): kaynak projenin P4 (1×) ve P6 (2×) kareleri iki katmanda bit-aynı ya da ≤ 0,0001/255; ölçümler kaynak araçlarla aynı. Kaynak araçlardaki 14 hata taşınırken düzeltildi (`render/BEKLENEN-SAPMA.md`).

### Bilinen sınırlar
- Kareler makineye bağlıdır: bit-aynılık aynı Chromium sürümü (Playwright 1.63.0 / Chromium rev 1243) ve aynı GPU/font ortamında geçerlidir.
- Whisper (faster-whisper) isteğe bağlıdır ve büyük model indirir; `tts` kelime zamanlaması yalnız Windows SAPI'de.
- Canlı profil ölçümü yoğun CPU yükünde (> %70) kare düşürebilir; QC bunu ayrıca raporlar.
