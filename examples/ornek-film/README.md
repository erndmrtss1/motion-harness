# examples/ornek-film — anonim gerçek belge örnekleri

Bu klasör, paketin süreç belgelerinin **dolu hâlini** gösterir. Belgeler kaynak projenin gerçek belgelerinden anonimleştirildi.

**Korunanlar:**

- yapı (başlıklar, tablo sütunları, bölüm sırası);
- sayılar (kare numaraları, süreler, /255 farklar, ΔE2000, LUFS, px, s/kare);
- karar zincirleri (GEÇMEZ → düzeltme → GEÇER, DUR).

**Değiştirilenler** (`[ÖRNEK]` ile işaretli):

- ad, kelime, marka, logo, renk değeri, font, world adı;
- bakiye, tarih;
- alet ve nesne adları (alet A/B/C, simge, yüzey, zemin olarak genelleştirildi).

Film kimliği `FILM`, perdeler `P1…P6`, shot'lar `S01…S22`.

**Yaratıcılık kuralı.** Bu örnekler **süreç** örneğidir, **üslup** örneği değildir. İçlerindeki görsel kararlar (alet, yüzey, ışık havuzu, iniş eğrisi) kaynak projenin world'üne aittir. Yeni bir projeye taşınması UCUZ #11'dir (önceki projeyi taklit). Taşınacak olan; ölçüm biçimi, kanıt düzeni, karar dili ve tablo yapısıdır.

## Dosyalar

| dosya | şablonu | ne gösterir | dikkat edilecek yer |
|---|---|---|---|
| [KUNYE-P6.md](KUNYE-P6.md) | `templates/KUNYE.md` | Bir perdenin teknik kimlik kartı: zaman, yerleşim, aletler, kamera, izdüşüm ölçümleri, 3 varyant, varyant turu bulgu → durum tablosu, animatik kapısı, 60 fps ölçüm tablosu, dikiş tablosu, teslim turu engeli ve düzeltmesi. Sonraki fazın teşhisli bölümü (F10) de var. | Kullanıcının reddettiği "kasıtlı" kamera basamağı (K1 satırı) · her "uygulandı"nın yanındaki sayı · "brief varsayımı geçersiz" teşhisi (k serisiyle kanıt) · reviewer bu dosyayı **görmez** |
| [REVIEWER.md](REVIEWER.md) | `templates/REVIEWER.md` | Reviewer hafızası. Kayıtlar yalnız sona eklenir. Her kaydın ilk satırı makine-okur `KARAR:` satırıdır. Üç zincir var: ŞARTLI GEÇER (yeni tur yok) · GEÇMEZ → GEÇMEZ → **DUR** · master GEÇMEZ → kısmi render → TESLİM GEÇER. | Önsözdeki `grep '^KARAR:'` çıktısı kayıt tablosudur · r2 kayıtlarındaki "Tek düzeltme turu doğrulaması" tablosu · yapan bilgisinin kayıt dışında tutulması |
| [RAPOR-F8.md](RAPOR-F8.md) | `templates/RAPOR.md` | Kanonik faz sonu raporu: H1 sonuç → sonuç paragrafı (karar, §0.6, bakiye) → Kapılar → dikişler → ara notlarına yanıt + teslim turundaki engel → açık kararlar → dosyalar → Katkı → `**DUR — …**`. | Açık kararlar numaralı, öneri ve etkiyle · "kasıtlı ihlal" süreç dersi · ≈ 4,8 bin karakter |
| [RETRO.md](RETRO.md) | `templates/RETRO.md` | Bir uzun form girişi (kapıda zorlanan ilk perde, 10 kök neden) ve beş kısa form girişi. | Hiçbir kök neden "dikkatsizlik" değildir; her biri bir kontrole bağlanır · "core aday" ve "3. kez → kural" etiketleri |
| [RENDER_REPORT.md](RENDER_REPORT.md) | `templates/RENDER_REPORT.md` | Üç ardışık giriş: cila + master v1, kısmi düzeltme + master v2, teşhisli düzeltme + master v3. | Tanık kareler, ProRes bit-eşliği, arşivde bağlanan perdeler, temizlik satırı (kalıcı silme yok) |
| [TESLIM.md](TESLIM.md) | `templates/TESLIM.md` | Teslim paketi: dosya/biçim/ölçü tablosu, zamanlama, kapı özetleri, istisna sicili, bütün film ölçümleri, borçlar, kredi. | Kaynak belgenin hatası (reviewer kaydı "bekliyor" iken "FİNAL") ve yeni kural |
| [contact/README.md](contact/README.md) | — | Kontak sayfası örnekleri için yer tutucu. | Kaynak proje karesi pakete girmez |

## Okuma sırası (yeni kullanıcı için)

1. `RAPOR-F8.md`: kullanıcının faz sonunda gördüğü.
2. `REVIEWER.md`: kapıların nasıl karar verdiği.
3. `KUNYE-P6.md`: yapanın kanıt düzeni.
4. `TESLIM.md` ve `RENDER_REPORT.md`: master ve teslim.
5. `RETRO.md`: hatalardan kurala.

Akışın kendisi: `skills/motion-core/references/PLAYBOOK.md`. Belge kuralları: `DOCS-TEMPLATES.md`.
