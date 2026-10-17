# RENDER_REPORT — <PROJE>

> Yalnız **sona eklenir**; eski giriş silinmez. Düzeltme yeni girişte "düzeltme: …" diye yazılır.
> Girişler elle yazılır. `motion-render report` bu dosyayı **baştan yazar** (otomatik render özeti); elle girişler varken koşulmaz.
> Faz başına bir giriş yazılır. Başlıkta render durumu bulunur: `render yok, DUR` · `animatik` · `TAM RENDER` · `master v<N>`.

<!-- Giriş şablonu — kopyala, doldur, en sona ekle. -->

## <YYYY-AA-GG> · F<n> — <kapsam> (<render durumu>) [— reviewer <KARAR>]

- **Kararlar:** project.md §<n> (<kısa liste>). YAPMA → borç (§12).
- **Çıktı:** `out/scenes/<id>.mp4` (<s>, <kare>, grade <zincir>) · kareler `out/frames/<id>/` · kontak `out/probe/<id>-contact.png` · QC `out/probe/<id>-qc.json` (hata <n>; uyarılar: <…> incelendi).
- **Render süresi:** ortalama <s>/kare, en yüksek <s> (f<…>); toplam <dk>; bekçi tekrarı <n>; 2× aralıklar <a–b> (<s>/kare).
- **Yeniden çizilen:** <a–b> (<n> kare, <dk>); değişmeyen kareler imgdiff 0 (tanık f<…>).
- **Ölçüm:** OURS <…> · K1 <…> · K3 <…> · bant ort. <%> · aksan <n/quota> · devir <…>/255.
- **Yeni:** <motor / araç değişikliği; paylaşılan bileşenin varsayılanı eski çıktıyı verir (probe fark 0)>.
- **Önceki turlar / arşiv:** `out/frames/<id>_<faz>/` · `out/archive/<FILM>_v<N>/`.
- **Temizlik:** <taşınan dizinler, adet, GB; kalıcı silme yok \| kullanıcı onayıyla>.
- **Reviewer:** <KARAR>, §0.6 x/8, UCUZ <…>. <Kapsam dışı bulgu → açık karar>.
- **Kredi** <n> · bakiye <önce> → <sonra> (canlı doğrulandı).
- **Rapor:** `docs/F<n>-RAPOR.md`.
