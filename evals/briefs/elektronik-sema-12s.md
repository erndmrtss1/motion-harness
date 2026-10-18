---
motion-brief: 1
ad: led-flasor
konu: Bir 555 zamanlayıcının LED'i nasıl yakıp söndürdüğünü anlatan 12 saniyelik teknik açıklayıcı
sure: 12
ses: yok
dil: tr
profil: light
world: lookdev
genai_butce: 0
yasaklar: [stok devre fotoğrafı, gerçek marka/ürün adı, ekran dolusu madde işaretli metin, neon parlama klişesi]
ilkeler: [akım yolu her an tek kahraman, kondansatörün dolup boşalması ritmi taşır, izleyici devre bilgisi olmadan da döngüyü anlar]
metin_kurali: Yalnız dört kısa etiket ekrana yazılır (ŞARJ, DEŞARJ, EŞİK, ÇIKIŞ); başka metin yok.
aksan: tek vurgu rengi yalnız LED'in yandığı anlarda
teslim: [master, h264]
fps: 60
boyut: 1920x1080
---
Elektronik meraklısı genç bir izleyiciye, klasik "LED flaşör" devresinin kalbini 12 saniyede göster.
Devre: 9 V besleme, 555 zamanlayıcı astable modda, iki direnç, bir kondansatör, bir LED.
Anlatılacak döngü: kondansatör R1+R2 üzerinden dolar → gerilim eşiğe (2/3 Vcc) ulaşınca çıkış düşer, LED söner →
kondansatör R2 üzerinden boşalır → tetik seviyesine (1/3 Vcc) inince çıkış yükselir, LED yanar → döngü tekrar eder.
İzleyici sonunda "kondansatörün dolup boşalması = yanıp sönmenin saati" fikrini almalı. Film iki tam döngü gösterir,
ikinci döngü biraz hızlanır (izleyici ritmi yakalamış olur) ve son karede LED yanık kalır, sonra siyaha iner.
Ses yok: zamanlama görsel ritimle kurulur (dolma ~3 s, boşalma ~2 s; ikinci döngü %30 kısa).
