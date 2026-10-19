# Görsel sözlük şablonu (YAPI, içerik yok)

> Bu dosya FocusFX üretiminde kullanılan shot başına nesne sözlüğünün **yalnız yapısıdır**: başlıklar, sütun adları, doldurma kuralları, onay akışı.
> Terim, tanım, formül, nesne adı, kaynakça ve film metni girmez. Her `<…>` yeni projede doldurulur.
> Ne zaman: anlatımın kendisi bir alanın nesneleriyse (eğitim, teknik, veri). Sözlük perde tasarımından **önce** kullanıcı onayına gider.

## Onay akışı

1. **Taslak.** Yapan; shot listesi, transkript ve vuruş haritasından tabloyu doldurur. Başlık durumu `TASLAK`.
2. **Açık sorular.** Emin olunmayan her içerik sınırı soru olur. Her sorunun altında `Önerim:` satırı vardır.
3. **Bilinen kısıt önce.** Kullanıcının bilinen bir eleme kuralı varsa aday sunmadan önce sorulur.
4. **DUR.** Sözlük kullanıcıya gider; tasarımdan (varyant still, animatik) **önce**. Onaysız perde tasarlanmaz.
5. **Onay.** Kararlar numarayla `Kararlar (kullanıcı, <tarih>)` satırına yazılır. Aynı kararlar project.md'de faz tablosu olarak (`soru | karar`) durur. Başlık `ONAYLI (kullanıcı, <tarih>; düzeltmeler project.md §<n>)` olur; soru başlığı `(KAPANDI)`.
6. **Uygulama.** Her perde teslim edildiğinde `uygulama durumu` satırı güncellenir: hangi shot'lar, hangi perde, reviewer kararı.
7. **Revizyon.** Onaylı sözlük yalnız kullanıcı kararıyla değişir. Değişiklik hücrede faz etiketiyle yazılır, eski hâl iz olarak kalır. Çelişkide project.md faz kararı geçerlidir; sözlük aynı turda düzeltilir.
8. **Kalıcı kural.** Tasarım sırasında doğan sözlük düzeyi kurallar (ör. olay ↔ kelime zamanı) sözlüğün sonuna ve project.md'ye birlikte yazılır.

## Ön bölüm alanları

| alan | ne yazılır | kaynak |
|---|---|---|
| **İlke** | konu ↔ yasak ilkesi, tek cümle; izinli nesne türlerinin listesi | project.md kimlik / yasaklar bölümü |
| **Yasak** | kimlik yasakları; anlatımla ilgisiz metafor türleri | project.md yasaklar bölümü |
| **Veri dili** | izinli veri türleri; sayıların sentetik ve tohumlu olduğu; birim kuralı | kullanıcı kararı |
| **Alet kuralı** | alet yalnız işi varsa görünür; nerede yatar; çıkış nasıl doğrulanır | project.md ön plan kuralı |
| **Aksan** | aksanın izinli yerleri; tek vuruş kuralı varsa hangi shot'ta | project.md aksan bölümü |
| **Perde planı** | perde → shot aralığı | project.md perde planı |

## Shot başına nesne tablosu (biçim)

Sütun adları kaynaktaki gibidir. `finansal nesne` sütunu yeni projede alanın adını alır (`<alan> nesnesi`).

| sütun | ne yazılır | doldurma kuralı |
|---|---|---|
| **shot · TC** | kalın shot kimliği + `t0–t1` (saniye) | Ses zamanında. Ses değişirse güncellenir; eski zaman notta kalır. Aralık perde planıyla tutarlı. |
| **cümle (aynen)** | o shot'un seslendirme cümlesi | Transkriptten harfi harfine. Özet ya da yeniden yazım yok. |
| **lyric** | ekrana yazılacak vuruş sözcükleri | Büyük harf, `·` ile ayrılır. Lyric olmayan küçük yazı `(etiket)` ile işaretlenir. Yoksa `—`. Değişirse `(<faz>; önce <eski>)` izi. |
| **finansal nesne** | shot'un tek somut nesnesi (ya da `·` ile birkaç nesne) | Kalın. Tür adı, metafor değil. Önceki perdeden geri çağrılan nesne `(<perde> nesnesi, geri çağırma)`. |
| **ne çizilir (öğeler)** | numaralı öğe listesi ve davranışı | `(1) <öğe>; (2) <öğe>` biçiminde. Davranış fiille (yazılır, çizilir, dolar, boşalır, üstü çizilir). Kalıp kimliği (K-xx) varsa yanında. Gerekirse kısa kamera notu. |
| **veriler (oran/istatistik)** | nesnenin taşıdığı veri türleri | Yalnız veri dilinin izin verdiği türler. Sayılar sentetik ve tohumlu. Kaynaklı içerik "kaynaktan aynen" notuyla; uydurma yok. Metin nesnesiyse `—`. |
| **alet · işi** | alet + fiil (çeker, yazar, basar, çentikler) | Alet yalnız işi varsa. Aynı anda tek alet. İşi yoksa `—`; kamera davranışı gerekiyorsa parantezde. |

**Satır kuralları**

- Her satır tek shot. Shot sırası film sırası.
- Aksan vuruşunun satırı kalın işaretlenir. Başka satırda aksan yok.
- Onaydan sonraki değişiklik: `**<faz> (§<n>):** <yeni hâl> … (Önce <eski hâl> — kalktı.)`. Eski hâl silinmez.
- Hücrede içerik yoksa boş bırakılmaz; `—` yazılır.

## İskelet (kopyala, doldur)

```markdown
# <Proje> · <alan> görsel sözlüğü (<ilk shot>–<son shot>) — <TASLAK | ONAYLI (kullanıcı, <tarih>; düzeltmeler project.md §<n>)>

> **İlke (project.md §<n>):** <konu ↔ yasak ilkesi>. Her çizim bir <alan> nesnesidir (<nesne türleri>).
> **Yasak:** <kimlik yasakları>, anlatımla ilgisiz metaforlar (<metafor türleri>).
> **Veri dili:** <izinli veri türleri>. Sayılar sentetik ve tutarlı (tohumlu); <birim kuralı>.
> **Alet kuralı (§<n>):** alet yalnız anlatımda işi varsa görünür, <zemin> üstünde yatar, kadrajdan çıkışı kamera hareketi eklenerek ve izdüşümle doğrulanır.
> **Aksan:** <izinli yerler> · <tek vuruş shot'u>.
> Perde planı (§<n>): <perde> <shot aralığı> · <perde> <shot aralığı> · <…>.

| shot · TC | cümle (aynen) | lyric | finansal nesne | ne çizilir (öğeler) | veriler (oran/istatistik) | alet · işi |
|---|---|---|---|---|---|---|
| **<S..>** <t0>–<t1> | <cümle, transkriptten aynen> | <VURUŞ> · <VURUŞ> (etiket) | **<nesne>** | (1) <öğe>; (2) <öğe>; (3) <öğe> | <veri türleri> | <alet> <işi> |
| **<S..>** <t0>–<t1> | <…> | — | **<nesne>** | <…> | — | — (<kamera davranışı>) |

**<Faz> uygulama durumu:** <shot aralığı> <perde>'de uygulandı (reviewer <karar>, §0.6 <n>/8). Notasyon notu: <glif / font kapsamı açığı>.

**Kararlar (kullanıcı, <tarih>):** 1 <karar> · 2 <karar> · 3 <karar> · <…>. Aşağıdaki sorular kapandı.

**Açık sorular (<AÇIK | KAPANDI>):**
1. <soru>? Önerim: <öneri>.
2. <soru>? Önerim: <öneri>.

**<Kalıcı kural adı> (<faz>, kullanıcı <tarih>):** <kural, tek cümle>.
```

## Bağlı kurallar

- Sözlük onayı bir DUR noktasıdır; onay gelmeden varyant still üretilmez.
- Sözlükteki nesne ve veri kararı project.md'ye de işlenir; değer tek kaynakta, diğeri atıf.
- Kaynaklı içeriğin (alıntı, notasyon) aday raporu ve kaynak kırpımı ayrı belgede durur; sözlük hücresi yalnız "kaynaktan aynen" der ve oraya atıf yapar.
