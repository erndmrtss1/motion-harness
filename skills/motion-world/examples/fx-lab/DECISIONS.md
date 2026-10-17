# fx-lab — world kararları (ÖRNEK)

Biçim: kimlik · karar · gerekçe · sonuç. Bu kararlar örnek world'ün kendi tarihidir; yeni projeyi bağlamaz.

## FXW-01 · Açık laboratuvar ışığı, spot vinyet yok
- **Karar:** tek yönlü yumuşak anahtar (multiply lineer gradyan, yön 124°, duraklar %0/22/62/100), kenar düşümü 0.16 (tavan 0.20), pozlama 0.88, ışık nefesi ±%1.2 / 5.3 s. Elips havuz ve vinyet kaldırıldı.
- **Gerekçe:** spot havuzlu ilk sürümde bant %34.4 ve kenar etiketleri karanlıktaydı; kimlik ("laboratuvar") tam aydınlık kâğıt istiyor.
- **Sonuç:** bant %44–54, gri kart düşümü %15.3.

## FXW-02 · Doğrusal easing yasak
- **Karar:** hareket power3 in/out (`fxE`), çizgi ve yazım ease-in-out (`fxS`), varış power3 out (`fxO`); `fxP` yalnız ham ilerleme.
- **Gerekçe:** doğrusal hareket "makine" değil "yazılım" okutuyordu; kalem hızlanır ve yavaşlar.

## FXW-03 · Yazılır, çizilir, ölçülür — fade yok
- **Karar:** metin soldan sağa açılır (kırpma + kalem izi + 2 px oturma), çizgi kendini çizer, alet kayarak gelir; opaklık rampası yok.
- **Sonuç:** her shot'ta en az bir ikincil hareket (nefes, itme, titreşim, halka).

## FXW-04 · Restyle durdu; diyagram çizgisi yalnız motor + kalem basınç dokusu
- **Karar:** üretken "yeniden çizim" plakası sahneden çıkarıldı; çizgiler motorda kalır, kalem dokusu süzgeçle (`FX_PEN`) verilir.
- **Gerekçe:** plaka ızgarasını silip doldurmak damalı leke bıraktı; geniş paftada dikiş yaptı; geometri değişince plaka bayatladı.

## FXW-05 · Tek aksan
- **Karar:** kırmızı (#DB1D2E) yalnız bir cetvel çizgisinde; metin kırmızı değil; vuruşun ±2 s çevresinde başka kırmızı kütle küçük ya da dışarıda.
- **Sonuç:** `accent.quotaDefault` 1; QC `signal` sınıfı ve konum taraması.

## FXW-06 · Kamera: tek pafta, monoton kübik, basamak 0
- **Karar:** kesme yok; kamera bölgeden bölgeye monoton kübik (aşma yok, varır ve tutar), drift 0.35 altta. Kamera darbesi yok — vurgu nesnede (ölçek, mürekkep oturması).
- **Gerekçe:** Catmull-Rom anahtarlar aşma ve "savrulma" yaptı; damga anında kameraya verilen 1 karelik darbe basamak sayıldı.

## FXW-07 · Ön plan nesnesi masada yatar
- **Karar:** ön plan aleti ekran uzayında süzülmez; masada/kâğıtta yatar, temas gölgesi var, kadraj kenarında yarısı dışarıda, ≤ 2 px bulanık, kahramanı ve metni örtmez, yalnız anlatımda işi varsa.

## FXW-08 · Kalem dokusu pişirilir
- **Karar:** durağan diyagram içeriği süzgeçle birlikte bir kez PNG'ye basılır (`FXPen` → çekirdek `MHBakeSvg`); harness `__fxBakeSettle` bekler.
- **Sonuç:** 7.3 → 2.3 s/kare; tuzaklar W-23, W-24.

## FXW-09 · Yakın planda kahraman S× katmanda
- **Karar:** kamera ölçeği k ≥ 1.5 olan karede kahraman öğe kendi 3B katılımcısında S× yerleşim + `scale(1/S)` ile çizilir (S öğe türüne göre ölçülerek: SVG yol 2, HTML metin 2.25–2.5).
- **Gerekçe:** 3B kamera büyütmesi düzlemi yerel CSS px'te tarayıp k kat büyütür (kenar ≈ 1.65 px × k); DPR / will-change düzeltmez.
- **Sonuç:** `supersample.sxK` 1.5, `edgeMaxPx` 1.9.

## FXW-10 · Paket sürümü (v4.0.0)
- **Karar:** world örnek olarak pakete girerken palet v4'te sabitlendi (`MH_PAL='v3'` yalnız karşılaştırma tahtası için); marka, logo, finans içerikli bileşenler ve proje kelimeleri çıkarıldı; ortak motor parçaları (easing, drift, kamera, izdüşüm, pişirme, hareket bulanıklığı) çekirdeğe (`motion-core.jsx`) taşındı.
