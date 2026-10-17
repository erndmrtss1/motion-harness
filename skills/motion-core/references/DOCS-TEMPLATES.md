# DOCS-TEMPLATES — belge dizini ve yazım kuralları

Bir motion projesinin belgeleri iki işe yarar:

- **Süreci denetlenebilir kılar:** her kapı, her ölçüm ve her karar bir dosyada sayıyla durur.
- **Bağımsız reviewer'a hafıza olur:** reviewer yalnız çıktıları, kural belgelerini ve kendi kayıt dosyasını (`docs/REVIEWER.md`) görür; yapanın belgelerini (künye, rapor, RETRO, RENDER_REPORT) görmez.

Şablonlar paketin `templates/` klasöründedir. `motion-render init` kök şablonları kopyalar; diğerleri ihtiyaç anında kopyalanıp doldurulur. Anonim gerçek örnekler `examples/ornek-film/` altındadır.

---

## 1. Dizin

| belge (projede) | şablon | ne zaman | kim yazar | kim okur |
|---|---|---|---|---|
| `project.md` | `templates/project.md` | F0'da; sonra her faz açılışında §11'e eklenir | ana oturum | herkes; reviewer ilgili §'leri |
| `scenes.json` | `templates/scenes.json` | F0'da; her birim açılışında kayıt eklenir | ana oturum / yapan | bütün `motion-render` komutları |
| `CLAUDE.md` | `templates/CLAUDE.md` | F0 | ana oturum | her oturum başında |
| `assets/gen/manifest.json` | `templates/ledger.json` | F0 (boş iskelet) | **yalnız** `motion-render ingest` | reviewer (bütçe), rapor |
| `docs/SOZLUK.md` | `templates/SOZLUK.md` | tasarımdan önce, perde başına | yapan (+ `motion-research` taslağı) | kullanıcı (onay) |
| `docs/research/<konu>.md` | — (ajan biçimi: `agents/motion-research.md`) | sözlük, kaynaklı içerik adayı, üretken ihtiyaç | `motion-research` | yapan, ana oturum |
| `docs/KUNYE-P<n>.md` | `templates/KUNYE.md` | perde açılışı; her ölçümden sonra; her fazda yeni bölüm | yapan | ana oturum (rapor), teslim belgesi — **reviewer okumaz** |
| `docs/REVIEWER.md` | `templates/REVIEWER.md` | F0'da başlık; her kapıda reviewer kaydı | **reviewer** (`out/review/<kapı-id>/RECORD.md` → sona ekler); dosya yoksa ana oturum ekler | her yeni reviewer (hafıza), ana oturum (`grep '^KARAR:'`), teslim belgesi |
| `out/review/<kapı-id>/` | — | her kapı | reviewer (kanıt, kendi betikleri, RECORD.md) | ana oturum, kullanıcı |
| `out/measure/<iş>/` | — | ölçüm isteği | `motion-measure` (RESULT.md + result.json) | ana oturum — reviewer okumaz |
| `docs/SES-KAYMA-<ses>.md` | `templates/SES-KAYMA.md` | ses değişince, render'dan önce (DUR 1) | yapan | kullanıcı, reviewer |
| `out/RENDER_REPORT.md` | `templates/RENDER_REPORT.md` | her render / animatik / master sonrası | yapan (`motion-render report` taslak satırları üretir) | kullanıcı, sonraki faz — reviewer okumaz |
| `docs/RETRO.md` | `templates/RETRO.md` | her faz kapanışında | ana oturum / yapan | `/motion:promote`, sonraki faz |
| `docs/TESLIM.md` | `templates/TESLIM.md` | master ve teslim fazlarında | ana oturum | kullanıcı |
| `docs/F<n>-RAPOR.md` | `templates/RAPOR.md` | faz sonu (ana oturumun son mesajıyla aynı metin) | ana oturum | kullanıcı |
| faz istemi | `templates/FAZ.md` | faz açılışı | kullanıcı ya da `/motion:faz` | ana oturum |
| `docs/INIT.md` | (PLAYBOOK §4.1) | F0 | `/motion:init` | kullanıcı |
| `world/lessons.md`, `world/DECISIONS.md` | (world şablonu: `motion-world`) | look-dev seçimi; her faz kapanışı | yapan | yapan, reviewer, `/motion:promote` |

---

## 2. Ortak dil (bütün belgelerde)

**Karar sözcükleri.** Yalnız şunlar kullanılır:

- **GEÇER**, **ŞARTLI GEÇER**, **GEÇMEZ**, **GEÇMEZ (yakın | çok yakın)**;
- **TESLİM GEÇER**, **ONAY** (koşullu onay dahil);
- **LOOK-DEV / ÖN KOŞUL: GEÇER**.

**Bulgu sınıfları.**

| sınıf | anlamı |
|---|---|
| zorunlu | kapıyı durdurur |
| isteğe bağlı | cila |
| açık karar | kullanıcının kararı |
| kayıtlı istisna | `scenes.json` `exceptions` / `review` + `project.md` §13 |
| kayıtlı kabul | reviewer kabul etti, gerekçeli |
| borç | `project.md` §12 |

**Ağırlık:** yüksek · orta · düşük.

**Kanıt.** Her bulgu ve her "giderildi" kare numarasıyla verilir. Biçim `f<kare>` ya da `f<a>–<b>`, gerekiyorsa saniyeyle: `f585 · 9.75 s`. Animatikte kare numarası animatik dizinine göre mi sayfaya göre mi verildiği yazılır.

**Sayılar birimlidir:** px, px/kare, /255, ΔE2000, LUFS, dBTP, kare, s, ms, %, kredi.

**Yollar göreli** proje yoludur. Mutlak yol, kullanıcı adı ya da oturum kimliği yazılmaz.

**Aynen kuralı.** Kullanıcı metni (brief, karar, sözlük cümlesi) değiştirilmeden alıntılanır. Özetlenmez, düzeltilmez. Sonradan gelen ses farkı brief'i değiştirmez; not düşülür.

**Sona ekleme kuralı.** RETRO, RENDER_REPORT, REVIEWER ve künyenin faz bölümleri yalnız sona eklenir. Eski giriş silinmez; düzeltme yeni girişte "düzeltme: …" diye yazılır.

**Tutarlılık kuralı.** Bir kapının kararı üç yerde aynı yazılır: REVIEWER.md'deki `KARAR:` satırı, künyenin ilgili bölümü, teslim belgesinin kapı satırı. Reviewer kaydı olmadan "GEÇER" ya da "FİNAL" yazılmaz; bekleyen tur "(bekliyor)" olarak yazılır.

**Yalıtım kuralı.** Yapanın belgeleri (künye, rapor, RETRO, RENDER_REPORT, `out/probe/<faz>/` betik çıktıları) ve `out/measure/**` reviewer'a verilmez. Reviewer'ın gördüğü belgeler: kural dosyaları, `project.md` (brief, kalite çıtası, yasaklar, world, bütçe, hedefler, kullanıcı kararları), `scenes.json`, `world.json`, ledger, `docs/REVIEWER.md`.

---

## 3. Belge başına kurallar

### 3.1 `project.md`

- Projeye özgü katmandır. Paketin VARSAYILAN kurallarının önündedir; SERT kuralların önünde değildir.
- **Zorunlu bölümler:**

  | § | bölüm |
  |---|---|
  | §0 | öncelik ve proje künyesi |
  | §1 | brief (aynen) |
  | §2 | kimlik okuması |
  | §3 | kalite çıtası |
  | §4 | palet/yazı/aksan |
  | §5 | yasaklar |
  | §6 | world |
  | §7 | malzeme ve lisans |
  | §8 | ses ve metin |
  | §9 | üretken varlık |
  | §10 | ölçü hedefleri |
  | §11 | faz kararları |
  | §12 | borç kütüğü |
  | §13 | istisna sicili |

- §11'de her fazın iki alt bölümü vardır:
  - `F<n> kararları (kullanıcı, tarih)`: aynen, tablo;
  - `F<n>a uygulama (yapan)`: ölçü, gerekçe, sapma.
- "İLKE" ve "KURAL" satırları kalın yazılır. **KAPALI KARAR** etiketi açıkça yazılır.
- Varsayılanı tersine çeviren her proje kararı §2 "Varsayılandan sapmalar" tablosuna girer.

### 3.2 `scenes.json`

- Şema `render/CONTRACT.md` §2'dir. Yorum satırı **olmaz** (geçerli JSON). Açıklama gereken yer `notes` alanıdır.
- Kare hızı, boyut ve profil yalnız burada tutulur. Araçlar başka yerden okumaz.
- İstisna ve "incelendi" kayıtları `[a, b, "gerekçe"]` biçimindedir. Gerekçesiz kayıt geçersizdir.
- Eski değerler kayda gömülmez. Sürüm değişince eski manifest arşive kopyalanır (`out/archive/<FILM>_v<N>/scenes.<etiket>.json`).
- Her değişiklikten sonra `motion-render manifest validate` çalıştırılır.

### 3.3 Künye (`docs/KUNYE-P<n>.md`)

- Perdenin teknik kimlik kartıdır: yapanın tasarım kararları, ölçümleri ve düzeltmeleri. **Reviewer'a verilmez** (yalıtım); rapor ve teslim belgesi buradan beslenir.
- **Zorunlu:**
  - başlık satırı: perde, shot aralığı, süre, kare @fps, ses zaman alanı;
  - üst alıntı: kararlar §, kod dosyaları, sayfalar, manifest alanları;
  - Zaman tablosu;
  - Ölçümler (izdüşüm, render öncesi);
  - Varyantlar;
  - her reviewer turu için bulgu → düzeltme → **doğrulama** tablosu;
  - render ölçüm tablosu;
  - dikiş tablosu.
- Sonraki fazlar aynı künyeye `## F<n> · <değişiklik> (project.md §…)` bölümü ekler. Teşhis, uygulama ve önce/sonra ölçü tablosu bu bölüme girer.
- **"Giderildi" yazmadan önce doğrulanır.** Doğrulama sütunu boş bırakılmaz.

### 3.4 `docs/REVIEWER.md` (reviewer hafızası)

- **Tek dosya, bütün proje; yalnız sona eklenir.** F0'da şablon başlığıyla açılır. Her kapıda reviewer kaydını `out/review/<kapı-id>/RECORD.md` olarak yazar ve `docs/REVIEWER.md` sonuna kendisi ekler. Dosya yoksa reviewer oluşturmaz; ana oturum `RECORD.md`'yi aynen ekler. Ana oturum kayda yorum eklemez; kendi puan farkını faz raporunda yazar.
- **Kayıt biçimi** (`skills/motion-reviewer/SKILL.md` §10–§11):
  - başlık `## <YYYY-AA-GG> · <birim> · <kapı> · r<k>: <KARAR>`;
  - hemen altında tek satır, makine-okur: `KARAR: <TESLİM GEÇER|GEÇER|ŞARTLI GEÇER|GEÇMEZ> · §0.6 <x>/<n>|yok · UCUZ <…> · kapı <tür> <profil> ≥<e>/<n>|yok · tur r<k> · birim <id>`;
  - r2 GEÇMEZ ise ikinci satır `DUR: tek düzeltme turu tükendi, render yok`;
  - gövde: Kontroller · §0.6 (8 madde) · UCUZ (VAR ve sınırda; #11 eksen tablosu) · Ön plan · Hata gibi görünen öğe · En zayıf anlar · Somut düzeltme listesi (GEÇMEZ ve ŞARTLI GEÇER için zorunlu, kare aralıklı) · Küçük notlar · Açık kararlar;
  - son satır `Proje dosyalarına dokunmadım. Kanıt: out/review/<kapı-id>/`.
- **Özet** elle tutulmaz: `grep '^KARAR:' docs/REVIEWER.md` kayıt tablosudur. Tekrarlayan bulgu `Tekrar: #<n> (<birimler>)` satırıyla işaretlenir (`/motion:promote` adayı).
- Kayıtta yapanın sözü, gerekçesi ya da sayısı bulunmaz.

### 3.5 `docs/SOZLUK.md`

- Tasarımdan önce kullanıcı onayına gider (DUR). Onay tarihi ve düzeltme tablosu `project.md` §11'e yazılır.
- Cümle sütunu ses metninden aynen alınır. Kaynaklı içerik kaynak + sayfa ile verilir; uydurma yoktur.

### 3.6 `docs/SES-KAYMA-<ses>.md`

- Yeni ses geldiğinde ve render'dan önce yazılır.
- **Zorunlu:**
  - metin farkı;
  - genel kayma (zarf korelasyonu, transkripsiyondan bağımsız);
  - shot başına kayma tablosu ve karar (`|Δ| ≤ 2 kare` → aynen);
  - perde sınırları;
  - yeniden çizim planı (kalan kareler tanıkla, yeniden çizilen, s/kare, tahmini süre);
  - eşlem yöntemi;
  - açık kararlar ve DUR.

### 3.7 `out/RENDER_REPORT.md`

- Faz başına bir giriş: `## <tarih> · <faz> — <kapsam> (<render durumu>)`.
- Giriş başına zorunlu satırlar:
  - çıktı (mp4, kare sayısı, grade, kontak, QC);
  - render süresi (s/kare ortalama ve en yüksek; toplam);
  - ölçüm;
  - yeni araç ya da motor değişikliği;
  - önceki tur dizinleri;
  - reviewer kararı;
  - kredi ve bakiye;
  - rapor yolu.
- Temizlik yapıldıysa ne taşındığı ve kaç GB olduğu yazılır.

### 3.8 `docs/RETRO.md`

- **Uzun form:** İstenen · Çıkan · İyi giden · Ters giden (kök neden) · Kararlar ve sapmalar · Sayılar · Katkı · Dersler (nereye işlendi) · Sonraki tur için.
- **Kısa form** (perde akışı oturduktan sonra): İyi giden · Kötü giden (numaralı) · Dersler (nereye).
- **Kök neden "dikkatsizlik" olamaz.** Hangi kontrolün neden yakalamadığı yazılır ve o kontrol düzeltilir.
- Kendi hatası "benim hatam" diye açıkça yazılır.
- Kullanıcının vermesi gereken karar "Sonraki tur için"e yazılır; sessizce verilmez.

### 3.9 `docs/TESLIM.md`

- Master ve teslim fazında yazılır; her yeni master sürümünde güncellenir. Başlıktaki sürüm ve "FİNAL" etiketi reviewer kaydına bağlıdır.
- **Zorunlu bölümler:**
  1. teslim dosyaları (dosya | biçim | ölçü) + üretim komutları;
  2. zamanlama tablosu;
  3. kapı özetleri;
  4. istisna sicili;
  5. ölçümler (bütün film) ve önceki ölçümler;
  6. bilinen borçlar (kapananların üstü çizili);
  7. varlık notu (sha256, üretim yolu);
  8. kredi.

### 3.10 Faz raporu (`docs/F<n>-RAPOR.md`)

- Biçim PLAYBOOK §7'dedir.
- **Doğrulanabilir kurallar:** `## Katkı` var · KAPALI KARAR listelenmez · sayılar birimli · yollar göreli · kapanış `**DUR — …**` · 3–5,5 bin karakter.

### 3.11 Faz istemi (`templates/FAZ.md`)

- Biçim PLAYBOOK §3.1'dedir.
- Her madde ölçülebilir bir kabul taşır. Seçenekli maddeler `[A] / [B]` ve "önerim" ile yazılır.
- `Rapor:` satırı faza özgü zorunlu blokları ekler.

### 3.12 Ledger (`assets/gen/manifest.json`)

- Tek yazarı `motion-render ingest`'tir; elle düzenlenmez. Kabul notu yalnız `ingest review` ile yazılır.
- Kayıt alanları:

  | kayıt | alanlar |
  |---|---|
  | `ledger[]` | `task`, `date`, `balanceBefore`, `balanceAfter`, `diff`, `items`, `creditsSum`, `match` |
  | `lost[]` | `id`, `credits`, `reason`, `refund` (`pending` \| `granted` \| `denied`) |

- `match:false` yalnız `lost[]` ile açıklanıyorsa uyarıdır; açıklanamıyorsa hatadır (DUR-2).
- İş kimliği, sonuç URL'si ve hesap bilgisi yazılmaz.
