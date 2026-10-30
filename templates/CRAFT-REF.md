# CRAFT-REF — <PROJE> zanaat referansı

> Hareket zanaatının tek kaynağı: referans klipler + ölçülmüş süreler, easing ve mekanik. **Kimlik değildir** (palet, iskelet, nesne dili
> world'dedir); zanaat kütüphane world'lerinden ve referans kliplerden serbestçe örnek alınır (RULES UCUZ-11). Director brief'inin parçasıdır
> (PLAYBOOK §3.1); reviewer kalibrasyonu `project.md` §3 "Kalite referansı" tablosundaki kliplerle yapılır (motion-reviewer SKILL §3.0).
> Sayılar ölçülür, uydurulmaz: `motion-render motion-test <ilkel|sahne> --ref <klip>` (hız profili, ivme, C1) ya da kaynak koddan.

## 1. Referans klipler

| klip | süre | neyin referansı | ölçüm (motion-test --ref) |
|---|---|---|---|
| <out/ref/….mp4> | <s> | <çizim · kart girişi · katlama · geçiş · kamera · yazı girişi> | <tepe px/kare @30 · C1 en kötü % · hareketli pay> |

## 2. Mekanik tablosu (ilkel başına)

| mekanik / ilkel | giriş (s) | iş (s) | çıkış (s) | easing | hız profili (tepe, rampa) | ikincil hareket | kaynak (klip · kod) |
|---|---|---|---|---|---|---|---|
| <kalem çizgisi> | <≥ 0,4> | <…> | <≥ 0,4> | <sine · out3 …> | <…> | <gölge gecikmesi n kare> | <REF-1 · world/….jsx> |

## 3. Kamera

| hamle | süre (≥) | easing | shot başına hamle | not |
|---|---|---|---|---|
| <push · pan · crane> | <s> | <…> | <≤ n> | <C1: ardışık |Δv| ≤ %5 tepe> |

## 4. Onaylı ilkeller (ilkel kütüphanesi kapısı, PLAYBOOK §4.4a)

| ilkel | dosya | motion-test çıktısı | onay (tarih, DUR-1) |
|---|---|---|---|
| <Bileşen> | <world/….jsx> | <out/motion-test/<ad>/> | <kullanıcı · YYYY-AA-GG> |
