---
motion-brief: 1
ad: yayin-maskotu
konu: Canlı yayında mikrofona tepki veren, OBS tarayıcı kaynağı olarak çalışan bir sohbet maskotu
sure: canli
ses: mikrofon
dil: tr
profil: live
world: lookdev
genai_butce: 0
yasaklar: [insan yüzü taklidi, telifli karakter, yazı balonunda gerçek konuşma metni, sürekli titreyen/stresli hareket]
ilkeler: [konuşurken canlı ama göz yormaz, dinlerken dikkatli, boştayken nefes alır; ani ses patlamasında irkilir ama 1 s'de toparlanır]
metin_kurali: Ekranda metin yok; yalnız ayar panelinde etiketler.
aksan: tek vurgu rengi yalnız "tepki" tetiklerinde (klavye 1–3)
teslim: [obs]
fps: 60
boyut: 1920x1080
---
Küçük bir oyun/teknoloji yayıncısı için ekranın sağ alt köşesinde duran bir maskot istiyoruz. Yayıncı konuşunca maskot
"konuşuyor" durumuna geçsin (ağız ve baş ses zarfıyla), sohbetten soru okunurken "dinliyor" (eğilir, kulak/anten benzeri
ikincil hareket), sessizlikte "boşta" (nefes, ara sıra göz kırpma). Klavye 1 = sevinç, 2 = şaşkınlık, 3 = selam tepkisi.
Yayıncı OBS'te tarayıcı kaynağı olarak ekleyecek; arka plan şeffaf olmalı. Ayar panelinden mikrofon, kazanç, gürültü kapısı
ve tepki tuşları değiştirilebilmeli. Kural: 60 fps altına düşmemeli, sesten görüntüye gecikme 100 ms'yi aşmamalı.
