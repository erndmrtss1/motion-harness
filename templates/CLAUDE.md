# <PROJE> — motion grafik projesi

Çalışma dili Türkçe. Proje `motion-render init` ile kuruldu (<YYYY-AA-GG>, paket `motion` <sürüm>). Süreç paketin `motion-core` skill'indedir (PLAYBOOK, RULES, MEASURE, AUDIO, GENAI, DOCS-TEMPLATES). Bu projenin üslubu `world/` ve `project.md`'dedir.

## Bağlayıcı kaynaklar (çelişkide sıra)

1. Kullanıcının son talimatı (faz istemi, ara not, DUR cevabı).
2. Onaylı ara ürünler: look-dev seçimi, `docs/SOZLUK.md`, varyant seçimi.
3. `project.md`: projeye özgü katman (brief, kimlik, kalite çıtası, bütçe, yasaklar, faz kararları).
4. `scenes.json`: manifest. fps, boyut ve profil için tek kaynak.
5. `world/`: world.json, lessons.md, DECISIONS.md.
6. Paket skill'leri: `motion-core` (PLAYBOOK · RULES · MEASURE · AUDIO · GENAI · LESSONS), `motion-reviewer`, `motion-world`.
7. `script/` (transkript, BEATS, amap) ve `docs/` (künye, REVIEWER, RETRO).

## Daimi çalışma kuralları

- **Soru yok.** Eksik ya da uyumsuz olanı işaretle ve devam et; kullanıcının vermesi gereken karar raporda "açık karar" olur.
  - İstisna: bağlayıcı bir tablodan (pencere, shot, sözlük) sapmak → önce sor.
- **KAPALI KARAR tekrar sorulmaz.** Rapordan önce `project.md` ve `scenes.json`'da "KAPALI KARAR" ara. Önceki açık kararları kopyalama; yeniden doğrula.
- **Kararlar önce belgeye.** Faz istemindeki KARARLAR işe başlamadan `project.md` §11'e aynen ve tarihli yazılır.
- **Belgeler reviewer'dan ÖNCE güncellenir:** reviewer'ın okuduğu scenes.json, project.md kullanıcı kararları, qc/fc json; aynı anda künye, §Na, RENDER_REPORT.
- **Bağımsız reviewer** (`/motion:gate`).
  - Her kapıda taze ajan açılır; yazma yalnız `out/review/<kapı-id>/`.
  - Yalnız çıktıları ve kuralları görür: kareler, kontak, qc/fc json, scenes.json, world.json, ledger, project.md kuralları. Künye, rapor, yapan sayısı ve gerekçesi verilmez.
  - Kendi yöntemiyle ölçer; kaydını `docs/REVIEWER.md` sonuna kendisi ekler. İlk satır makine-okur: `KARAR: … · §0.6 x/8 · UCUZ …`.
- **Karar → akış.** GEÇER → devam · ŞARTLI GEÇER → şartlar kanıtla uygulanır, yeni tur yok · GEÇMEZ → tek düzeltme turu (taze reviewer r2) → yine GEÇMEZ ise DUR: kontak + nedenler, render yok.
- **Bağımsız ölçüm** (`motion-measure`) yalnız `out/measure/<iş>/` altına yazar; reviewer bu sayıları da okumaz.
- **Teşhis önce, sayıyla neden.** Düzeltmeden önce ölç; brief'in varsayımı yanlış çıkabilir.
- **Kasıtlı ihlal yok.** SERT ölçüm ihlali "kasıtlı" diye bırakılmaz: düzelt ya da istisnayı önce sor.
- **Her "giderildi" kare numarasıyla** doğrulanır.
- **Değişmeyen kare değişmez.**
  - Kısmi render sırası: yedek → aralığı sil → yeniden üret (`--range a-b --tag <T> --resume`) → tanık kareler `imgdiff 0` → kopya.
  - Paylaşılan bileşene eklenen parametrenin varsayılanı eski çıktıyı verir.
- **YAP / YAPMA.** Kapsam dışı iş yapılmaz; `project.md` §12 borç kütüğüne yazılır.
- **Rapor.**
  - Biçim PLAYBOOK §7'dedir: `# F<n> · <kapsam>: <sonuç>` → sonuç paragrafı (reviewer kararı, §0.6 x/8, bakiye önce → sonra) → `## Kapılar` → … → `## Katkı` → `**DUR — …**`.
  - Sayılar birimli, yollar göreli yazılır.
- **Retro.** Her faz `docs/RETRO.md`'ye bir girişle kapanır. Kök neden "dikkatsizlik" olamaz.
- **Araçlar.**
  - Yalnız `motion-render` ve Playwright'ın kendi Chromium'u kullanılır.
  - Çıktılar `.part` → rename.
  - Yama dosyadan yapılır, heredoc yok; her yamadan sonra tek kare probe.
  - Sahne açılmıyorsa render yok.
- **Bekleme.**
  - Uzun iş arka planda koşar; bildirim ya da `motion-render wait --id <id> --tag <T>|- --frames N --expect <s>` ile beklenir (üst sınır = 2 × expect).
  - Elle `sleep`/`until` döngüsü yok.
  - Beklerken belge yazılır.
- **Disk.** Render öncesi ≥ 40 GB boş alan. Animatik tur dizinleri perde kabulünden sonra silinebilir; kalıcı silme kullanıcı kararıdır.
- **Bütçe.**
  - Üretken çağrıdan önce ve sonra bakiye okunur (`motion-render doctor`).
  - Ledger'ın tek yazarı `motion-render ingest`'tir.
  - Sapma > %10 → dur.
- **Malzeme.** `materials/` bir bağlantıdır: içindekiler kopya değildir; silinmez, taşınmaz.
- **Gizlilik.** Mutlak yol, hesap bilgisi, iş kimliği ya da token belgeye yazılmaz.

## Bu projeye özgü (project.md'den özet)

- Metin kuralı: <ekrana ne yazılır> (project.md §2).
- Aksan: <nerede, kaç kez> (project.md §4).
- Yasaklar: project.md §5.
- Kalite kapısı: §0.6 ≥ <7>/8 (project.md §3).

## Sık komutlar

```bash
motion-render manifest validate
motion-render frame-check <id> --only framing,toolPath,overlap,camera     # izdüşüm kapısı (render yok)
motion-render probe <id> --frame <N> [--frames a,b] [--out p.png]
motion-render render <id> --scale 0.5 --step 2 --tag animatic --progress    # animatik 960×540 @30 → out/frames/<id>_animatic
motion-render grade <id> --animatic                                         # → out/scenes/<id>_animatic.mp4 (--audio yalnız animatik sayfasında)
motion-render contact <id> --dir out/frames/<id>_animatic --fstep 2         # animatik ölçümü: qc/frame-check --frames-dir, ours --dir … --step 2
motion-render run <id> [--ss2] [--expo-post]                                # tam zincir
motion-render render <id> --range a-b --tag <faz> --resume                  # kısmi yeniden render
motion-render qc <id> --mp4 auto
motion-render frame-check <id> --mp4 auto [--sheet]
motion-render contact <id>
motion-render ours <id>
motion-render imgdiff stale <id>
motion-render ses <id> · motion-render ses preview <id,id>
motion-render qc film · motion-render master --tag v<N> · motion-render arsiv --tag v<N> --link-from v<N-1>
motion-render doctor
```
