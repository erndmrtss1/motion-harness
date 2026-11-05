# <PROJE> — proje katmanı

> Bu dosya projeye özgü katmandır ve **tek güncel spec**tir (PLAYBOOK §3.5).
> - Çelişkide paketin **VARSAYILAN** kurallarının önündedir; **SERT** kuralların (ölçülenler) önünde değildir.
> - Kullanıcı karar metni aynen ve tarihli `docs/KARAR-TARIHI.md`'dedir; burada yalnız bugün geçerli öz durur (§11 tablosu). Değişen satırın eski metni karar tarihine taşınır; burada üstü çizili satır ya da silinti notu kalmaz.
> - **KAPALI KARAR** etiketli madde bir daha sorulmaz.
> - Doldurma: `/motion:init` mülakatı. `<…>` yer tutucudur; boş kalan alan "açık karar"dır.

## 0. Öncelik ve proje künyesi

| alan | değer |
|---|---|
| proje / film kimliği | `<FILM>` |
| profil | `full` \| `light` \| `live` (scenes.json `profile` ile aynı) |
| format | 1920×1080 · 60 fps (scenes.json tek kaynak) |
| süre hedefi | `<s>` |
| world | `world/world.json` — `<ad>` (look-dev F<n> ile seçildi \| örnek: `<ad>`) |
| ses | `<materials/…>` \| yok |
| teslim biçimi | `<ProRes 422 HQ + H.264 \| yalnız H.264 \| canlı sayfa>` |
| bağlayıcı sıra | kullanıcının son talimatı → onaylı sözlük/varyant/look-dev → bu dosya → scenes.json → world → paket skill'leri → script/ ve docs/ |

## 1. Brief (kullanıcı metni — AYNEN, değiştirme)

> <kullanıcının brief metni, harfiyen>

- Sonradan gelen ses ya da metin farkı brief'i değiştirmez; buraya tarihli not düşülür.

## 2. Kimlik okuması (yönetmen)

| alan | değer |
|---|---|
| tek cümle kimlik | <filmin taşıması gereken his, bir cümle> |
| world tarifi | <ışık · malzeme · ton · tipografi · kamera · geçiş dili — look-dev seçiminden> |
| aksan kullanımı | <aksan nerede, kaç kez> |
| kahraman | <her anda tek göz hedefi ne: tipografi / nesne / veri> |
| merkez görsel | <filmin omurgası> |
| metin kuralı | <ekrana ne yazılır: konuşulan kelime yazılır mı, hangi cümleler> |
| ses yönetir | evet: kesme ve vuruş cümle sınırına / durağa kilitli \| hayır |
| sert yasaklar | → §5 |

**Varsayılandan sapmalar** (paket varsayılanını tersine çeviren proje kararları):

| varsayılan | bu projede | gerekçe | karar (tarih, kaynak) |
|---|---|---|---|
| | | | |

## 3. Kalite çıtası

- **§0.6 zevk kapısı:** ≥ <7>/8. Profil varsayılanı full 7 · light 6 · live 7; proje yükseltebilir, düşüremez. Eşiğin altında render yok.
- **İş akışı** (PLAYBOOK §2.1): ana oturum kapı ve QA'dır; director tek tasarımcı-uygulayıcıdır. Director görev brief'i yalnız `docs/BRIEF-DIRECTOR.md` (≤ 30k token; estetik ölçüt yalnız onun §1'i). Proje brief'i = bu dosya + `docs/SOZLUK.md` + `docs/CRAFT-REF.md` + `world/world.json` + `CLAUDE.md` ≤ 60k token (aşarsa en büyük dosya kısaltılır). Tavanlar `docs/celiski.json`'dadır; `motion-render celiski-tara` ölçer. Kapılar işten sonra QA'dır.
- **Kapı sınıflaması** (PLAYBOOK §3.3): her kapı bir sınıftadır; tabloda olmayan kapı raporda bir sınıfa yazılır, sınıflanmamış kapı uygulanmaz. **Ölçüsü tanımsız madde GEÇMEZ gerekçesi olamaz**: yöntem bu dosyada ya da `world/world.json`'da yazılı değilse bulgu açık karar olur. Ölçüm eşiği yalnız proje sahibi kararıyla değişir.

  | sınıf | kapılar | etki |
  |---|---|---|
  | **kusur** (ölçüt dışı → GEÇMEZ) | <SERT kurallar · içerik doğruluğu · okunurluk · zanaat kapısı (RULES ZN) · hareket kuralı (MEASURE M-C) …> | tek düzeltme turu |
  | **uyarı** (raporda sayı) | <K3 · olay yoğunluğu · kota ölçütleri (RULES §0.8) …> | GEÇMEZ üretmez; DUR'da görülür |
  | **bilgi** | <ölçüsü bilgi olarak tutulan ölçüler> | kapı değil |
  | **kapı dışı** | kompozisyon ve doluluk metrikleri (ızgara, grup sayısı, kahraman oranı, içerik payı, kalite paritesi …) · reviewer'ın sayısal estetik şartı | estetik hüküm proje sahibi + referansla kalibre reviewer |

- **QA kapsamı** (PLAYBOOK §3.4, V1/V2/V3): ara adımda değişiklik listesinden türeyen ölçüm (dokunulmayan katman yeniden ölçülmez) + doğruluk (<içerik doğruluğu · okunurluk · aksan kotası>) + qc; reviewer yok, bilgi kontağı. **Kilometre taşında** tam tarama: frame-check bildirilen bütün tipler · hareket kuralı ve vuruş/zanaat · canlılık · taze reviewer (faz başına; referans klip yan yana; still ve klip ayrı; iş başına ≤ 3 soru). Bağımsız ölçüm iş başına ≤ 3 madde, tek tur. Rapor istisna biçiminde ≤ 40 satır.

  | kilometre taşı | kapı türü | DUR (geri dönüşü pahalı) |
  |---|---|---|
  | <look-dev seçimi · sözlük · ilkel kütüphanesi · storyboard · animatik · hareket kontağı · perde tam render · master> | <lookdev · … · hareket · teslim · master> | <evet / bilgi kontağı> |

- **UCUZ taraması:** reviewer her kapıda 12 maddeyi (#1–#11, #17 askıda nesne) tarar; biri VAR ise birim geri döner. Projeye özgü ek maddeler:

  | # | işaret | neden |
  |---|---|---|
  | 12 | <…> | <…> |

- **Kalite referansı (reviewer kalibrasyonu, zorunlu):** §0.6 puanı bu kliplere görelidir; tablo boşsa reviewer kapıda durur (DUR-1).

  | klip | neyin referansı | §0.6 maddeleri | not |
  |---|---|---|---|
  | <out/ref/….mp4 · kütüphane world demosu> | <hareket zanaatı · çizim · geçiş · kamera …> | <4, 5, 6 …> | <kaynak, süre> |

  Reviewer'a referans klip birimle **yan yana** verilir (klip kapısında `motion-render contact motion`). Projenin sabit reviewer soruları (varsa, aynen sorulur; ≤ 3 sorunun içinde): <…>.

- **OURS tabanı:** hold ≤ 0.6 · hareketli ≥ 0.4 (ölçü hedefleri §10; kota UYARI sınıfıdır, RULES §0.8).
- **Tipografi zanaatı:**
  - optik boyut, satır ritmi, display tracking;
  - 3 seviye hiyerarşi;
  - "varsayılan" duran metin yok;
  - `text-transform: uppercase` yok; büyük harf doğrudan yazılır.
- **Tek düzeltme turu:** reviewer GEÇMEZ → bir düzeltme turu → yine GEÇMEZ ise DUR, render yok.

## 4. Palet, yazı, aksan

Değerler `world/world.json`'dandır. Burada yalnız projeye özgü sapma ve aksan hakkı yazılır.

| alan | değer | kaynak |
|---|---|---|
| aksan sınıfı | `<world.classes içindeki ad>` | world |
| aksan kotası | sahne başına `<n>` aralık (scenes.json `redQuota`) | proje |
| aksanın filmdeki yeri | <…> | kullanıcı |
| display font | <aile, ağırlık> (ölçümle seçildi: `docs/…`) | look-dev |
| marka rengi | <ölçülen medyan; ürün sayfası renkleri referanstır, film paleti değildir> | malzeme |

## 5. Yasaklar (sert)

| sınıf | yasak | ölçüm / denetim |
|---|---|---|
| kimlik / içerik | <…> | reviewer |
| kalite | §0.6 < eşik · UCUZ VAR · varsayılan duran metin | reviewer, qc |
| üretken | <insan/el/yüz/yazı, pilotsuz üretim, onaysız 3. varyant, sapma > %10, kara liste> | GENAI, ingest |
| aksan | kota aşımı; izinli kutular dışında aksan pikseli | qc, frame-check |
| SERT (paket) | fade yok (sahne sonu hariç) · son kare siyah · okunurluk · kadraj · basamak 0 | qc, frame-check |
| ses | kesme ve vuruş cümle sınırı dışında | AUDIO |

## 6. World

- Seçim: <look-dev F<n>, yön <A/B/C> \| kütüphane world'ü `<ad>` (kullanıcı seçti, tarih)>.
- `world/world.json` sürümü: <0.1.0>. Zorunlu alanlar: `band`, `k1.mask`.
- Bant: <[lo, hi]> — onaylı görünümden ölçüldü. Sayı görünüme uyar.
- Dersler `world/lessons.md`; seçim gerekçesi `world/DECISIONS.md`.
- **Set yöntemi** (varsa; photo-plate world'ünün `SET.md` belgesi, 1.4): set üretilir, içerik çizilir; `set.json` tek kaynak. **Lamba:** film boyunca tek yer
  <x, y, yükseklik> = world `set.lamp` = her `set.json` `lamp` (ana oturum yazar, director değiştirmez). **Plaka kabulü:** malzeme + kenar
  (M-KENAR, gövde sınıfı) + yerleşim + yer/boy ± <tolerans> + dikiş (M-DIKIS) + askıda (M-ASKIDA); düzeltme maskeli bölgeyle (GENAI §17), deneme ≤ 3.

## 7. Malzeme ve lisans

Malzeme **yol olarak** bağlanır (`materials/`); kopyalanmaz, taşınmaz, silinmez.

| dosya | içerik | boyut / süre / fps | lisans notu | kullanım yeri (öneri) | durum |
|---|---|---|---|---|---|
| | | | <plan · tarih · kaynak \| bilinmiyor → açık karar> | | |

- Kişi ya da üçüncü taraf içeren, ya da lisansı belirsiz görsel kullanılmaz; motorla yeniden çizilir.
- Referans videolar yalnız öğrenme içindir.
- Marka varlığı (logo) vektör değilse DUR ve iste: raster izleme kenar dalgası verir.

## 8. Ses ve metin

| alan | değer |
|---|---|
| proje sesi (tek kaynak) | `scenes.json` `audio` = `<materials/…>` |
| transkript | `script/<ad>.words.json` (+ `.srt`, `.txt`, `.dogrula.md`); klip doğrulaması `meta.fixes` |
| vuruş haritası | `script/BEATS.md` (durak ≥ 250 ms; kesme TC = durak ortası) |
| eşlem | `script/<ses>.amap.json` (ses değiştiyse) |
| olay ↔ kelime | ≤ 1 kare |
| kayma kuralı | \|Δ\| ≤ 2 kare → aynen; aksi → eşlemle yeniden çizim |
| sessiz kuyruk | konuşma sonu + <0.8> s tutuş + <1.0> s ışık çekilişi + ≥ 4 kare siyah |
| loudness | −16 LUFS entegre / ≤ −1 dBTP, kuyruk dahil |

## 9. Üretken varlık

Bu bölümün makine kopyası `assets/gen/` altındaki `policy.json`'dur (GENAI.md; ilk üretimden önce yazılır). İkisi birlikte değişir.

| kural | değer |
|---|---|
| üretim | <yok (kredi 0) \| CLI yolu \| istem sayfası yolu> |
| film tavanı / rezerv | <kredi> / bakiye ≥ <kredi> |
| görev tavanı | <40> kredi (kategori: <…>) |
| model beyaz / kara liste | <…> (ajan değiştiremez; liste dışı = kullanıcı onayı) |
| önce pilot · önce taslak · önce ucuz | evet |
| sapma durdurma | tahmin ↔ gerçek > %10 → dur |
| rapor satırı (zorunlu) | "kredi yüzünden yapılmadı / kabul edildi": boşsa "yok"; **doluysa DUR** (satır kabul mekanizması değildir) |
| plaka düzeltme | maskeli bölge üretimi varsayılan (yer tutucu + ölçek referansı); tam plaka yalnız ışık/kompozisyon değişince; deneme ≤ <3>, sonra yöntem değişir |
| varyant | shot başına ≤ 2; onaysız 3. varyant yok |
| klip süresi | ≤ <s>; donma ve ileri-geri yasak |
| içerik kuralı | üretken klip cümleyi anlatmaz, tek başına kare olmaz, motor katmanının altında kalır |
| kabul | kare kare (`motion-render ingest scan <id>`), bağımsız reviewer |

## 10. Ölçü hedefleri

| ölçü | hedef | araç |
|---|---|---|
| OURS hareketli / hold | ≥ 0.4 / ≤ 0.6 | `motion-render ours` |
| K1 kahraman | alan ≥ <%30> ya da yükseklik ≥ <%50>; display metin ≥ <px> | qc |
| K3 kamera | shot başına hareketli pay ≥ 0.4 (mutlak eşik %2 ekran/s) | ours, frame-check `camera` |
| okunurluk | metin ≥ 22 px; kontrast ≥ 4.5:1 (büyük display ≥ 3:1, kayıtla) | qc |
| bant | world `band` | qc, frame-check `luma` |
| devir | durağan ≤ 2/255 · hareketli ≤ 1.1 × komşu | frame-check `seam` |
| son 12 kare | ardışık fark oranı ≤ 1.5 | frame-check `temporal` |
| aksan tonu | ΔE2000 ≤ <3> | frame-check `accentColor` |
| alet hızı | ≤ <px/kare> | frame-check `toolPath` |
| render süresi | ≤ <s/kare> | `--frame-log` |

## 11. Faz kararları

Kullanıcı karar metinleri (aynen, tarihli) ve uygulama notları `docs/KARAR-TARIHI.md`'dedir. Yeni karar önce oraya, güncel özü bu dosyanın ilgili bölümüne ve aşağıdaki tabloya (PLAYBOOK §3.5). Tabloda yalnız bugün bağlayıcı kararlar durur; yerini başka karara bırakan satır karar tarihine taşınır. **KAPALI KARAR** bir daha sorulmaz.

| id | tarih | öz | durum |
|---|---|---|---|
| 11.F0 #<n> | <YYYY-AA-GG> | <kararın tek satırlık özü; etkilediği § (ör. §3, §6)> | <KAPALI KARAR \| açık \| ŞARTLI> |

<!-- Sonraki satırlar: | 11.<faz>-karar-<k> | <tarih> | <öz> | KAPALI KARAR | — metin aynen docs/KARAR-TARIHI.md "### 11.<faz>-karar-<k>" -->


## 12. Borç kütüğü

YAPMA maddeleri, kapsam dışı bulgular ve borca devredilen açık kararlar buraya yazılır. Paket aracı yüzünden bekleyen borçta koşul "harness eklediğinde" olur, satır paket bulgusunun numarasını taşır (`docs/PAKET-NOTLAR.md`) ve o zamana dek kullanılan proje ayarını ya da bağımsız ölçümü yazar; içerik araca göre ertelenmez (PLAYBOOK §3.3). Kapanan satır karar tarihine taşınır (sonuç cümlesiyle).

| borç | kaynak (faz, bulgu) | neden ertelendi | ne zaman / koşul | durum (borç \| kabul \| çözüldü (F<n>) \| kapandı) |
|---|---|---|---|---|
| | | | | |

## 13. İstisna sicili

Kayıtlı istisnalar `scenes.json` `exceptions` / `review` kayıtlarıyla eş tutulur. Kural ile istisna ayrılır: kural her yerde geçerlidir, istisna tek yerdedir.

| # | yer (birim, kare / s) | istisna | gerekçe / ölçü | karar (faz, kaynak) |
|---|---|---|---|---|
| | | | | |
