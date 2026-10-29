<!--
Faz istemi şablonu (PLAYBOOK §3.1). Kullanıcı yazar ya da /motion:faz üretir.

Kodlar:
- F<n>: yeni iş birimi
- F<n>-B, -C: aynı fazın revizesi ya da devamı
- "F<n> DUR 1 RED → …", "DUR 1b KARARI": DUR cevabı
- "… ONAY → … BAŞLA": onay ve sonraki adım
- "F<n> ARA NOTLAR": iş sürerken gelen düzeltme

Üslup telgraftır: "·" ayraçlı listeler, "→" zincirleri. Her ölçüt sayıyla verilir (≤ 2 px, ΔE ≤ 3, ≥ 160 px, ≤ 1 kare).
Soru-cevap beklenmez ("soru yok" kuralı). Seçenekli madde [A] / [B] + "önerim" ile yazılır.
-->

FAZ F<n>[-B|-C] — <KAPSAM BAŞLIĞI> [→ <hedef çıktı/sürüm>] [(kredi 0)]
<1–3 satır bağlam: kaynak aralık; DONDURULAN / değişmeyecek olanlar; "başka kare değişmez (imgdiff 0)">

§<N> KARARLAR (project.md):            ← önceki raporun açık kararlarına cevaplar
- <karar> … (kapalı; bir daha listelenmez)
- <karar> … KAPALI KARAR
İLKE | KURAL | ELEME KURALI (project.md §<x>'e ekle): <yeni bağlayıcı kural>
DEVİR: <önceki birim son karesi> → <bu birimin ilk anahtarı>; fark ≤ <2/255 | 1.1 × komşu>
BAĞLAM: docs/SOZLUK.md (tüm film) · docs/CRAFT-REF.md · onaylı ilkeller <world/…> · <bağlayıcı kararlar>
        (brief ≠ kapı: kapı listesi yazılmaz; kapılar işten sonra QA olarak koşar — PLAYBOOK §3.1)

0. <ön iş / TEŞHİS — düzeltmeden önce, sayıyla neden>
1. <birim/shot kimliği> (<zaman aralığı>): <görsel tarif · alet · kamera · vuruş zamanı (≤ 1 kare) ·
   ölçülebilir kabul: px, ΔE2000, oran, %>
2. <…>
   [A] <seçenek> / [B] <seçenek> → kullanıcı kararı (önerim <A>)
YAP: <…> · YAPMA (borç olarak kaydet): <…>
PARALEL: <render beklenirken yapılacaklar>
DOKUNULMAZ: <dosya/klasör listesi>

AKIŞ: 3 varyant still/shot → seçim (yapan + reviewer) → animatik 960×540/30 + kontak + OURS →
      reviewer (§0.6 ≥ <eşik> + UCUZ) → tek düzeltme turu → geçerse tam render (2×/S× kuralları) →
      expo-post → grade → QC/K1/K3/K6/OURS → reviewer (teslim) → teslim.
      Geçmezse: kontak + nedenler, render yok.
REVIEWER: <tek tur | ön koşul>; <bakılacaklar>; KENDİ yöntemiyle, sayıyla (yapanın araç sayıları referans değil).
Rapor: <zorunlu bloklar: kapı sonuçları, dikişler, yeniden çizilen aralıklar/süreler, …> · balance <önceki> → ?
DUR[ 1 | 2]: <durulacak nokta / teslim>

<!-- Sonradan gelen düzeltmeler: -->
EK F<n> / F<n> ARA NOTLAR: 1. <…> 2. <…>
