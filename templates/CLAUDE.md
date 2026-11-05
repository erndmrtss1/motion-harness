# <PROJE> — motion grafik projesi

Çalışma dili Türkçe. Proje `motion-render init` ile kuruldu (<YYYY-AA-GG>, paket `motion` <sürüm>). Süreç paketin `motion-core` skill'indedir (PLAYBOOK, RULES, MEASURE, AUDIO, GENAI, DOCS-TEMPLATES). Bu projenin üslubu `world/` ve `project.md`'dedir. Bu dosya ≤ 60 satır kalır (PLAYBOOK §3.5).

## Bağlayıcı kaynaklar (çelişkide sıra)

1. Kullanıcının son talimatı (faz istemi, ara not, DUR cevabı).
2. Onaylı ara ürünler: look-dev seçimi, `docs/SOZLUK.md`, varyant seçimi, onaylı ilkeller.
3. `project.md`: tek güncel spec (brief, kimlik, kalite çıtası, bütçe, yasaklar, §11 karar tablosu).
4. `scenes.json`: manifest. fps, boyut ve profil için tek kaynak.
5. `world/`: world.json, lessons.md, DECISIONS.md.
6. Paket skill'leri: `motion-core` (PLAYBOOK · RULES · MEASURE · AUDIO · GENAI · LESSONS), `motion-reviewer`, `motion-world`.
7. `script/` (transkript, BEATS, amap) ve `docs/` (künye, REVIEWER, RETRO; karar metinleri aynen `docs/KARAR-TARIHI.md`: tarih, çelişki taraması dışı).

## Daimi çalışma kuralları

- **Soru yok.** Eksik ya da uyumsuz olanı işaretle ve devam et; kullanıcı kararı raporda "açık karar" olur. İstisna: bağlayıcı tablodan (pencere, shot, sözlük) sapmak → önce sor.
- **KAPALI KARAR tekrar sorulmaz.** Rapordan önce `project.md` ve `scenes.json`'da "KAPALI KARAR" ara; önceki açık kararları kopyalama, yeniden doğrula.
- **Kararlar önce belgeye.** Faz istemindeki KARARLAR işe başlamadan aynen ve tarihli `docs/KARAR-TARIHI.md` sonuna; özü `project.md`'nin ilgili bölümüne ve §11 tablosuna. Spec'te üstü çizili satır ya da silinti notu kalmaz; eski metin karar tarihine gider.
- **Belgeler reviewer'dan ÖNCE:** scenes.json, project.md kararları, qc/fc json (reviewer okur); künye, RENDER_REPORT (okumaz). **Commit kapısı:** `.githooks/pre-commit` → `motion-render celiski-tara` (bulgu ya da brief > tavan → commit yok; `git config core.hooksPath .githooks`).
- **Roller.** Ana oturum kapı ve QA'dır: yapmaz, ölçtürür, karar işler. Director tek tasarımcı-uygulayıcıdır; görevi `docs/BRIEF-DIRECTOR.md` (sanat yönetmeni brief'i ≤ 30k token; proje brief'i ≤ 60k). Kapı listesi brief'e yazılmaz; kapılar işten sonra QA'dır.
- **Bağımsız reviewer** (`/motion:gate`): kilometre taşında taze ajan, faz başına; referans klip zorunlu (yan yana; project.md §3 "Kalite referansı"); still ve klip ayrı reviewer; iş başına ≤ 3 soru; yazma yalnız `out/review/<kapı-id>/`. Yalnız çıktıları ve kuralları görür; künye, rapor, yapan sayısı ve gerekçesi verilmez. Kaydı `docs/REVIEWER.md` sonuna kendisi ekler; ilk satır `KARAR: …`.
- **Karar → akış.** GEÇER → devam · ŞARTLI GEÇER → şartlar kanıtla uygulanır, yeni tur yok · GEÇMEZ → tek düzeltme turu (taze reviewer r2) → yine GEÇMEZ ise DUR: kontak + nedenler, render yok.
- **Bağımsız ölçüm** (`motion-measure`): iş başına ≤ 3 madde, tek tur; yalnız `out/measure/<iş>/` altına yazar; reviewer bu sayıları okumaz.
- **Kapı ilkeleri** (PLAYBOOK §3.3). Teşhis önce, sayıyla neden · kasıtlı ihlal yok · her "giderildi" kare numarasıyla · **ölçüm eşiği yalnız proje sahibi kararıyla değişir** (checks, qc/fc varsayılanı, world eşiği) · **araç kısıtı içeriği şekillendirmez**, araç düzeltilir (proje ayarı ya da `docs/PAKET-NOTLAR.md`) · ölçüm tekleştirme (kaynaklar ayrışırsa yöntem tekleşir) · estetik metrik kapı dışı (bilgi) · şart satırı nesne tanımıyla.
- **Değişmeyen kare değişmez.** Kısmi render: yedek → aralığı sil → `--range a-b --tag <T> --resume` → tanık kareler `imgdiff 0` → kopya. Paylaşılan bileşen parametresinin varsayılanı eski çıktıyı verir.
- **YAP / YAPMA.** Kapsam dışı iş yapılmaz; `project.md` §12 borç kütüğüne yazılır.
- **Verim** (PLAYBOOK §3.4; kapı sayısı eksilmez, eksilen tekrar ve ritüel): **V1** her iş değişiklik listesiyle başlar; dokunulmayan katman yeniden ölçülmez; doğruluk + qc her render'da · **V2** tam tarama yalnız kilometre taşında (project.md §3 "QA kapsamı") · **V3** reviewer faz başına · **V4** ölçüm ≤ 3 madde, tek tur · **V5** istisna raporu ≤ 40 satır · **V6** maskeli bölge üretimi varsayılan, deneme ≤ 3 · **V7** DUR yalnız geri dönüşü pahalı kararda, gerisi bilgi kontağı (dosya gönderilir, akış sürer) · **V8** kilitli kurallar gevşemez.
- **Rapor** PLAYBOOK §7.1 (istisna): başlık → geçenler tek satır tablo → sapma (bağlayıcı sapma önce), açık karar, "kredi yüzünden yapılmadı / kabul edildi" satırı (boşsa "yok", doluysa DUR), ledger → `**DUR — …**` ya da bilgi kontağı; ≤ 40 satır, sayılar birimli, yollar göreli. Faz kapanışında §7.2. **Retro, dersler, paket bulgusu** faz sonunda tek seferde; kök neden "dikkatsizlik" olamaz.
- **Araçlar.** Yalnız `motion-render` ve Playwright'ın kendi Chromium'u. Çıktılar `.part` → rename. Yama dosyadan, heredoc yok; her yamadan sonra tek kare probe. Sahne açılmıyorsa render yok.
- **Bekleme.** Uzun iş arka planda; bildirim ya da `motion-render wait --id <id> --tag <T>|- --frames N --expect <s>` (üst sınır 2 × expect). Elle `sleep`/`until` döngüsü yok; beklerken belge yazılır.
- **Makine.** Render tek; probe/ölçüm ≤ 2 paralel; render + probe aynı anda yok. Her render/encode öncesi `tools/render-oncesi.ps1` (ya da `.sh`; çıkış 1 → render yok). Harness geliştirmesi kurulu klonda yapılmaz.
- **Checkpoint ve süreçler.** Uzun görevde her adım sonunda commit + `docs/CHECKPOINT-<görev>.md` satırı; kesintiden sonra artefakt + ledger mutabakatı, tanık kare, süreç listesi, sonra kaldığı yerden. Her DUR öncesi başlatılan python/node/ffmpeg/Chromium süreci kalmaz.
- **Disk.** Render öncesi ≥ 40 GB boş alan. Animatik tur dizinleri perde kabulünden sonra silinebilir; kalıcı silme kullanıcı kararıdır.
- **Bütçe.** Üretken çağrıdan önce ve sonra bakiye (`motion-render doctor`); ledger'ın tek yazarı `motion-render ingest`; sapma > %10 → dur.
- **Malzeme.** `materials/` bir bağlantıdır; silinmez, taşınmaz. **Gizlilik.** Mutlak yol, hesap bilgisi, iş kimliği ya da token belgeye yazılmaz.

## Bu projeye özgü (project.md'den özet)

- Metin kuralı: <ekrana ne yazılır> (project.md §2). Aksan: <nerede, kaç kez> (§4). Yasaklar: §5.
- Kalite kapısı: §0.6 ≥ <7>/8; kalite referansı, kapı sınıflaması ve QA kapsamı (kilometre taşları) §3.

## Sık komutlar

`motion-render` kopya kâğıdı motion-core SKILL §7'dedir (`motion-render <komut> --help`); projeye özgü zincirler bu dosyaya değil `docs/` altında ayrı bir belgeye yazılır.
