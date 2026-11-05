# BRIEF-DIRECTOR — <görev adı> (<faz> · <birimler>)

> Kaynak: kullanıcı <YYYY-AA-GG>, `project.md` §11.<karar> (metin aynen `docs/KARAR-TARIHI.md`). **Güncel iş: §8.** Bu dosya director'ın **tek görev brief'idir**
> (sanat yönetmeni brief'i, PLAYBOOK §3.1; ≤ 30 000 token varsayılan, `motion-render celiski-tara` ölçer; proje `docs/celiski.json`'da değiştirebilir).
> - **Estetik ölçüt yalnız §1'dir.** §2 iştir; §3 uygulama yorumudur; §4–§6 içerik ve zanaat kaynağıdır; §7 işletim kuralıdır (ölçüt değil).
> - Kapı listesi, eşik tablosu, kompozisyon ya da doluluk metriği bu brief'te **yoktur**; kapılar işten sonra QA olarak koşar (PLAYBOOK §3.3).
> - Film bağlamı yolla okunur, kopyalanmaz: `docs/SOZLUK.md` (tüm film) · `docs/CRAFT-REF.md` · onaylı ilkeller (world `DECISIONS.md`) · `script/` (BEATS) · mevcut sahne kodu. `project.md` ve `world.json` bu dosyaya kopyalanmaz.
> - Biten işin tanımı kısaltılır ya da karar tarihine taşınır (token tavanı); güncel iş her zaman §8'dedir.

## 1. Sanat yönetmeni brief'i (kullanıcı metni aynen; bu metin dışında estetik ölçüt yok)

> <niyet: yöntem, his, kalite çıtası, referans ilişkisi — kullanıcının cümleleri harfiyen>

## 2. İş (kullanıcı metni aynen)

> <işin tanımı, sırası, DUR / bilgi kontağı noktası, teslim>

## 3. Uygulama yorumları (ana oturum; karar değil)

- <belirsiz maddenin okunuşu ve dayanağı (karar id)>
- <metinde olmayan ayrıntı → raporda açık karar; uydurulmaz>

## 4. Film bağlamı — sözlük (bu işin satırları aynen; tamamı `docs/SOZLUK.md`)

| shot · TC | cümle (aynen) | ekrana yazılan | nesne | ne çizilir | alet · işi |
|---|---|---|---|---|---|
| | | | | | |

## 5. İçerik kuralı (varsa)

<kilitli veri, kaynaklı içerik (kaynaktan aynen), içerik doğruluğu kuralı ve onay kaynağı>

## 6. Zanaat özeti (CRAFT-REF; onaylı ilkeller)

| mekanik / ilkel | süre | easing / profil | referans klip | durum |
|---|---|---|---|---|
| | | | | onaylı (karar id) |

- Yeni mekanik gerekiyorsa önce ilkel kütüphanesine eklenir ve test edilir (PLAYBOOK §4.4a); perdede ilkel tanımı değiştirilmez.

## 7. İşletim kuralları (ölçüt değil; CLAUDE.md'den)

**Kredi ve üretim:**
- Görev tavanı: <kredi> (project.md §9). Bakiye her üretimden önce ve sonra (`motion-render doctor`); ledger'ın tek yazarı `ingest`.
- Raporda **"kredi yüzünden yapılmadı / kabul edildi"** satırı zorunlu; boşsa "yok"; **doluysa DUR**.
- Plakada nesne ekleme/düzeltme maskeli bölge üretimiyle (yer tutucu + ölçek referansı); deneme ≤ 3, sonra yöntem değişir (açık karar). Ayrıntı paket GENAI §17.

**Ölçüm ve rapor:**
- Ölçüm eşiği yalnız proje sahibi kararıyla değişir (`checks/*.json`, qc/fc varsayılanı, world eşiği). Aşım teşhis edilir, düzeltilir; düzelmiyorsa açık karar.
- Araç kısıtı içeriği şekillendirmez: araç ölçemiyorsa içerik kırpılmaz, ertelenmez; sayı ve kare açık karar olur (araç proje ayarıyla ya da paket bulgusuyla düzelir).
- Her madde bir kanıta eşlenir: kare numarası, 1× ve 4× kırpım, ölçülen sayı. Her "giderildi" kare numarasıyla.
- Bağlayıcı bir sayıdan ya da maddeden her sapma raporun "Sapma (açık karar)" bölümünde **ilk sırada**. Rapor PLAYBOOK §7.1 (istisna, ≤ 40 satır).

**Makine:**
- Her render ve encode öncesi `tools/render-oncesi.ps1` (ya da `.sh`; çıkış 1 → render yok). Render tek; probe/ölçüm ≤ 2 paralel; render + probe aynı anda yok.
- Uzun iş arka planda, `motion-render wait`. Çıktılar `.part` → rename. Yama dosyadan; her yamadan sonra tek kare probe.

**Checkpoint:** her adım sonunda commit + `docs/CHECKPOINT-<görev>.md` satırı (adım · saat · durum · kanıt).

**Yazma sınırları:** <değişmeyecek dosyalar: world.json, onaylı ilkeller …> · `materials/` silinmez, taşınmaz · harness deposuna yazma yok ·
kapanışta başlatılan python/node/ffmpeg/Chromium süreci kalmaz · mutlak yol, hesap bilgisi, iş kimliği ya da token belgeye yazılmaz.

**Kapı:** kapı kararı vermezsin; reviewer ve ölçüm ajanını ana oturum açar. İstekler raporun "İstekler" bölümüne.

## 8. Güncel iş — <karar id>: <adım zinciri> → <"DUR — …" | bilgi kontağı>

| adım | ne | değişiklik listesi (V1) | teslim yolu |
|---|---|---|---|
| 1 | | <katman · ilkel · kamera · plaka> | `out/<görev>/…` |

- **Teslim:** <still'ler, klip, kontak, yan yana (referans kliple), 4× kırpım; yollar>
- **Belge:** künye `docs/<…>.md` (ilk paragraf sahne niyeti; yalnız sayı) · rapor PLAYBOOK §7.1, "Katkı" tek satır.
