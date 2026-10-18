# H4 · Eval: üç farklı brief, taze headless oturumlar

> Tarih 2026-10-18 · Plugin `motion` 1.0.0 (temiz klondan, `--plugin-dir`) · `claude -p` headless · en çok 2 tur.
> Bu belge depoya giren **puan tablosu ve anonim özettir**. Oturum çıktıları (transkript, dosya ağacı, QC/fc JSON, kontaklar, izin dosyaları) git dışında: `evidence/eval/<brief>-r<tur>/`.

<!-- SONUC -->

## Yöntem

| öğe | uygulama |
|---|---|
| Brief'ler | `evals/briefs/`: **elektronik-sema-20s** (teknik açıklayıcı, sessiz, full) · **saas-teaser-20s** (kurgusal ürün teaser'ı, İngilizce yerel TTS, light) · **canli-avatar** (OBS canlı maskot, live). Kasıtlı olarak farklı türler. |
| Oturum | her brief için `%TEMP%\motion-eval-<brief>-r<tur>\` — yalnız `brief.md` + `START.md` + plugin; depo ve kaynak projeler dışında |
| Akış | `/motion:init brief.md` → (audio) → lookdev → lexicon → P1 → master; canlıda lookdev → live → `live --qc` → gate. DUR'larda önerilen seçenek "eval: otomatik onay". |
| Koşucu / puanlayıcı | `evals/run-eval.mjs`, `evals/score.mjs` |

## Güvenlik şartları ve kanıtı

| şart | uygulama | kanıt |
|---|---|---|
| 1. Yalnız geçici klasör; tam yol izin kuralları | `.claude/settings.json` `permissions.deny`: kaynak projeler, geliştirme deposu (evidence dahil), test kopyaları, danışman klasörü, Higgsfield yapılandırması, kaynak session dizinleri — Read/Edit/Write (`//` mutlak biçim, iki sürücü yazımı) + Bash içinde yolun her yazımı; WebFetch/WebSearch kapalı | her oturumun izin dosyası `evidence/eval/<brief>-r<tur>/settings.json`; yasak yol denemesi sayımı tabloda (> 0 → GEÇMEZ) |
| 2. Üretken çağrı 0 | `MOTION_NO_GENAI=1` (gen/ingest kilitli, `doctor` "üretken kilit" satırı) + Bash yasakları (`higgsfield generate/upload`, `motion-render gen/ingest`) | sonda oturumunda `motion-render gen` izin katmanında reddedildi; başlangıç ve bitiş bakiyesi tabloda |
| 3. Süre/tur tavanı, CPU paylaşımı | oturum başına 90 dk (süreç ağacı durdurulur) ve 300 tur; `MOTION_RENDER_LOCK` ile ağır işler (render, qc, frame-check, grade, master, live) makine çapında sıralı | `run.json` (`timedOut`), kilit sahibi `owner.json` |
| 4. Ağ yalnız npm + Anthropic | `MOTION_OFFLINE=1` (vendor yalnız önbellek), `MOTION_FONT_SOURCE=npm` (fontlar npm `@fontsource`), Bash'te curl/wget/Invoke-WebRequest/git clone/pip/winget… yasak; TTS yerel (SAPI) | ağ komutu denemesi sayımı tabloda |
| 5. Çıktılar kanıt klasöründe | koşucu oturum bitince transkript, ağaç, `out/probe` JSON/kontak, `out/review`, `out/measure`, belgeleri kopyalar | `evidence/eval/` (H5 gizlilik taraması bu klasörü de tarar) |
| 6. Oturum kaydı | `claude auth status` (e-posta maskeli) `runs-r<tur>.json`'a; logout yapılmadı | `evidence/eval/runs-r*.json` |

**Ortam sondası** (eval öncesi, puanlanmaz): plugin `motion@inline` olarak yüklendi (8 komut, 4 skill, 4 ajan); `doctor` → "üretken kilit · açık"; `vendor fonts` → `@fontsource/inter@5.3.0` (npm); geliştirme deposundan dosya okuma ve kaynak projeden `type` denemesi izin katmanında reddedildi; bakiye 768,02 → 768,02. Kanıt: `evidence/eval/_sonda/`.

## Tur 2 kesintisi ve devamı

Tur 2'de koşucu süreci 48,5. dakikada dışarıdan sonlandırıldı (araç kabuğunun arka plan görevi iş nesnesiyle birlikte kapandı; üç oturum aynı saniyede, araç çağrısının ortasında kesildi — oturumlarda hata yok). Tur sayılmadan, aynı session id'leriyle `claude -p --resume` (koşucu `--resume` kipi) kalan süre kadar (≈ 41,5 dk) sürdürüldü; koşucu bu kez uygulamanın Terminal panelinde, araç kabuğundan bağımsız çalıştı. Toplam süre tavanı (90 dk) iki bölümün toplamına uygulandı.

## Tur 1 → tur 2: bulunan ve düzeltilen

| bulgu (tur 1) | etki | düzeltme (tur 2 öncesi) |
|---|---|---|
| Headless (`claude -p`) oturumda ana ajan alt ajanları **arka planda** başlatıp turu bitirdi; süreç kapanınca ajanlar da öldü | üç oturum 20–27 dk'da look-dev ortasında bitti; reviewer kararı ve teslim yok | komutlar, PLAYBOOK §2.4, core SKILL ve LESSONS L-220: etkileşimsiz oturumda ajanlar ön planda; eval istemine açık talimat. Tur 2'de bütün ajan çağrıları ön planda (`run_in_background: false`). |
| `manifest validate` canlı profilde boş `scenes` dizisini hata sayıyordu | canlı proje kendi `init` çıktısını doğrulayamıyordu | live profilinde boş `scenes` geçerli (uyarı) |
| Canlı şablonun tepki kümesi kapalıydı (`RX` sabit) | brief'in "selam" tepkisi eklenemiyordu | `MOTION_LIVE.registerReaction(ad, {dur, f, kick}, etiket)` |
| Bağımsız ölçüm ajanının kendi betikleri "ad-hoc" sayılıyordu | ölçüt yanlış | `out/measure`, `out/review` altındaki betikler "bağımsız ölçüm betiği" olarak ayrı sayılır (tasarım gereği) |
| Canlı profilde video kurallarının istisnası (K3, son kare siyah) sahne nesnesine yazılamıyor | belgede kalıyor | RULES §19 profil tablosuna satır eklendi: canlı profilde bu video kuralları uygulanmaz, istisna kaydı gerekmez (tur 2 eski klonla koştu; 1.0.0 sürümünde var) |
