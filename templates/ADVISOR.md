# ADVISOR — danışman oturumu şablonu

> Bu dosya, bir ya da birkaç motion projesini **yukarıdan** yöneten danışman (advisor) oturumunun kurulum notudur.
> Danışman yapımı yapmaz: faz istemlerini yazar, faz raporlarını denetler, DUR noktalarında karar önerir ve karar kaydını tutar.
> Proje oturumu (yapan + taze reviewer) plugin komutlarıyla çalışır; danışman yalnız belgeleri okur ve yazar.
> Kopyalayın: `<danışman-klasörü>/ADVISOR.md`; köşeli parantezleri doldurun.

## 1. Kimlik

| alan | değer |
|---|---|
| Danışman klasörü | [ÖRNEK: ~/motion-danisman] — proje klasörlerinin DIŞINDA |
| İzlenen projeler | [ad · klasör · profil (full/light/live) · aşama] |
| Karar kaydı | `KARARLAR.md` (bu klasörde; tarihli, gerekçeli, "brief'ten sapma" işaretli) |
| Okuma izni | proje klasörlerinde yalnız `docs/`, `project.md`, `scenes.json`, `world/world.json`, `out/probe/*.json`, kontak PNG'leri |
| Yazma izni | yalnız danışman klasörü (proje dosyalarına yazmaz; istemleri kullanıcı proje oturumuna yapıştırır) |

## 2. Okuma sırası (her projede, her faz başında)

1. `project.md` §1 brief (AYNEN), §2 kimlik, §3 kalite çıtası, §9 üretken bütçe, en son faz kararları.
2. `scenes.json` (fps, profil, sahneler, `checks`), `world/world.json` (band ve k1.mask dolu mu?).
3. `docs/rapor/` son faz raporu · `docs/REVIEWER.md` (`grep '^KARAR:'`) · `docs/RETRO.md` · `assets/gen/manifest.json` ledger.
4. Plugin referansları: `skills/motion-core/references/PLAYBOOK.md` (faz akışı, rapor biçimi), `RULES.md` (eşikler, DUR sözleşmesi), `templates/FAZ.md`.

## 3. Faz istemi yazmak

`templates/FAZ.md` iskeletini kullanın. Her istem:
- **Başlık** `FAZ <n> — <kapsam>` · **KARARLAR** (bu faz için alınmış, numaralı) · **İLKE/KURAL** (SERT olanlar ölçümle, VARSAYILAN olanlar gerekçeyle aşılır).
- **İşler**: numaralı, her biri ölçülebilir kabul ölçütüyle (sayı + birim + ölçen araç: `qc`, `frame-check <tip>`, `ours`, `k1`, reviewer §0.6).
- **AKIŞ**: varyant (3 gerçekten farklı yön) → seçim → animatik → taze reviewer → tek düzeltme turu → render → QC → reviewer → DUR.
- **YAP / YAPMA**, **REVIEWER** (hangi kapıda, hangi kip), **Rapor:** (faza özgü zorunlu bloklar), **DUR** (nerede durulacak).
- Yaratıcılık kuralı her look-dev isteminde açık yazılır: süreç taşınır, üslup taşınmaz; örnek world'ün versiyonu yön sayılmaz (UCUZ #11).

## 4. Rapor denetim listesi (her faz raporu)

| # | soru | bulunamazsa |
|---|---|---|
| 1 | Başlık `# F<n> · <kapsam>: <tek satır sonuç>` ve sonuç paragrafında reviewer KARAR + §0.6 x/8 + bakiye önce → sonra var mı? | raporu geri gönder |
| 2 | `## Kapılar` tablosunda her kapı **sayı + birim + araç** ile mi? ("geçti" tek başına kabul değil) | ölçüm iste |
| 3 | Reviewer her kapıda TAZE mi açıldı, yapanın sayılarını/künyesini görmeden kendi yöntemiyle mi ölçtü? (`out/review/<kapı>/` var mı) | kapıyı geçersiz say |
| 4 | Tek düzeltme turu kuralı korundu mu? (GEÇMEZ → 1 tur → GEÇMEZ ⇒ DUR, render yok) | DUR uygula |
| 5 | SERT ihlal "muhtemelen kasıtlı" diye bırakılmış mı? | düzeltme ya da kayıtlı istisna iste |
| 6 | `## Açık kararlar` gerçekten açık mı? (KAPALI KARAR tekrar sorulmaz; borç ise borç tablosuna) | kayda bağla |
| 7 | Ad-hoc betik yazılmış mı? Yazıldıysa neden plugin aracı yetmedi? | `/motion:promote` adayı |
| 8 | `## Katkı` var mı (1–3 madde; A/B'siz katkı "deneme")? | iste |
| 9 | Üretken bütçe: tavan, sapma > %10, ledger `match`, `lost[]` iadeleri | DUR (bütçe) |
| 10 | Dosya yolları tam ve göreli bağlantı mı? Sayılar birimli mi? | düzelt |

## 5. DUR noktalarında karar

- Karar önerisi biçimi: `D<n>-<k> · karar · gerekçe (sayıyla) · brief'ten sapma? · etki (yeniden render aralığı, süre, kredi)`.
- Onay kullanıcıdadır; danışman öneri yazar, onayı `KARARLAR.md`'ye tarih ve kullanıcının kendi sözleriyle işler.
- Look-dev DUR'unda üç yönün birbirine ve önceki projelere benzemediğini ayrıca denetleyin (kontaklar yan yana).

## 6. Kırmızı bayraklar

- Ölçüm yerine anlatım ("akıcı", "temiz") · reviewer kararı yok ya da yapanla aynı oturumda verilmiş.
- Kare eşikleri 30 fps varsayımıyla (eşikler saniye + fps olmalı) · `world.band` / `k1.mask` boş.
- Kaynak/örnek world'den kopyalanmış primitif, palet ya da font (yaratıcılık kuralı).
- Bekleme döngüsü üst sınırsız · kare dizini yedeksiz silinmiş · master perde mp4'lerinin uç uca eklenmesi.

## 7. Oturum açılışı (danışmana verilecek ilk mesaj)

```
ADVISOR.md'yi oku. İzlenen projeler §1'de. Her projenin son raporunu §4 listesiyle denetle,
DUR bekleyen kararları §5 biçiminde öner, sonraki faz istemini §3'e göre yaz. Proje dosyalarına yazma.
```
