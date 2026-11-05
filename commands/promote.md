---
description: Projede öğrenilen dersleri doğru katmana taşır. RETRO, REVIEWER tekrarları ve world/lessons.md'deki adayları toplar; core (paket LESSONS/PATTERNS/RULES), world ve proje olarak sınıflar. Core için anonim bir diff öneri dosyası üretir ve paketi asla sessizce düzenlemez. World ve proje derslerini proje dosyalarına işler. DUR ile biter.
argument-hint: "[--since <tarih|faz>] [--library <ad>]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# /motion:promote: ders terfisi

> **Etkileşimsiz oturum (headless):** `claude -p` ile ya da kullanıcı olmadan çalışıyorsan (ör. ortamda `MOTION_EVAL=1`) ajanları **ön planda** başlat (`Agent` çağrısında `run_in_background: false`) ve sonucunu bekle. Arka planda ajan bırakıp turu bitirme: headless süreç tur bitince kapanır ve arka plan ajanları da ölür. Komutun bütün adımları bitmeden son mesajı yazma.

Argümanlar: `$ARGUMENTS`

Kaynak: `${CLAUDE_PLUGIN_ROOT}/skills/motion-core/references/PLAYBOOK.md` §4.8.

Paket dosyaları (`${CLAUDE_PLUGIN_ROOT}/**`) bu komutta **asla düzenlenmez**. Plugin önbellek kopyasıdır: düzenleme bir sonraki güncellemede kaybolur ve core'u sessizce değiştirir. Core değişikliği yalnız öneri dosyası olarak çıkar. World kütüphanesine geri yazma (§4b) da paketin **deposuna** yapılır, önbelleğe değil.

## 1. Adayları topla

- `docs/RETRO.md`: "Dersler", "Ters giden (kök neden)", "Sonraki tur için" ve "core aday" etiketli satırlar.
- `docs/REVIEWER.md`: `Tekrar: #<n> (<birimler>)` satırları ve aynı bulgunun farklı birimlerde dönmesi.
- `world/lessons.md` ve `docs/KARAR-TARIHI.md` "uygulama notu" satırları (1.4 öncesi projelerde `project.md` §11 "uygulama notu (yapan)").
- `docs/PAKET-NOTLAR.md` (1.4): durumu "aday" olan paket bulguları (araç yanlış ölçtü / ölçemedi / yanlış sınıfladı). Bunlar core öneri dosyasına
  "araç düzeltmesi" olarak girer; numara (PN-n) öneri satırında kaynak olarak yazılır, proje içeriği taşınmaz.
- Faz raporlarındaki `## Katkı` → "Süreç dersi" maddeleri.

`--since` verilmişse yalnız o tarihten ya da fazdan sonraki girişler alınır.

## 2. Sınıfla ve damıt

| sınıf | ölçüt | gittiği yer |
|---|---|---|
| **core** | Her projede geçerli süreç, ölçüm ya da araç dersi; üsluptan bağımsız | öneri dosyası → paket `LESSONS.md` / `PATTERNS.md` / `RULES.md` / `MEASURE.md` |
| **world** | Bu world'ün görsel diline özgü | `world/lessons.md` (faz başlığıyla) |
| **proje** | Bu projenin içeriği, kararı ya da değeri | `project.md` (ilgili §) |

Kurallar:

- **Damıtarak yaz.** Yeni kural icat edilmez; var olan kural kodlanır ya da yeniden düzenlenir. Uzun anlatı LESSONS arşivine gider.
- **Kök neden "dikkatsizlik" olamaz.** Hangi kontrolün neden yakalamadığı yazılır. Öneri o kontrolü düzeltir.
- **Üç kez tekrarlanan bulgu** ölçülebilir kural ve kontrol önerisine dönüşür: frame-check tipi, qc kontrolü ya da reviewer maddesi.
- A/B kanıtı olmayan kalıp "deneme" etiketi alır.
- **Sürüm etkisi:** kural → minor · ders/düzeltme → patch · yapı → major. Yön değiştiren karar ADR önerisi olur.
- **Değer taşınmaz.** Bant, palet, eşik değeri core'a gitmez. Core'a disiplin gider; değer world ya da projede kalır.

## 3. Core öneri dosyası

`docs/promote/PROMOTE-<YYYY-AA-GG>.md` dosyasını yaz:

~~~markdown
# PROMOTE <tarih> — <n> core önerisi
| # | ders (damıtılmış, tek cümle) | kanıt (kare / rapor §, göreli yol) | tekrar | hedef dosya § | tür (kural/ders/kontrol) | semver |
## Öneri 1
Gerekçe: … · Hangi kontrol neden yakalamadı: … · Geri alma: …
```diff
--- a/skills/motion-core/references/LESSONS.md
+++ b/skills/motion-core/references/LESSONS.md
@@ … @@
+ …
```
## Gizlilik denetimi
~~~

**Gizlilik denetimi** (öneri dosyası paylaşılacak). Öneri metninde şunlar bulunmaz:
- marka, ürün ya da müşteri adı
- kişi adı
- proje metni (brief, sözlük, ekrandaki cümleler)
- mutlak dosya yolu
- e-posta
- oturum kimliği
- kare ya da medya

Denetimi `grep` ile yap. Bulunanı `[ÖRNEK]` ile anonimleştir ve sonucu dosyanın sonuna yaz: "gizlilik: 0 bulgu".

## 4. World ve proje dersleri

- `world/lessons.md` ve `project.md`'ye doğrudan işle. Bunlar projenin kendi dosyalarıdır. Her ekleme faz başlığı ve tarih taşır.
- İşlenen her satır raporda listelenir. Sessiz düzenleme yapılmaz.

## 4b. World kütüphanesine geri yazma (`--library <ad>`, HK-39)

Proje bitince world'ü kütüphaneye alır. Hedef: paketin **depo kopyası** (geliştirme klonu), önbellek değil.

1. **Depo kökünü bul.** Sırayla: ortam değişkeni `MOTION_HARNESS_REPO` · `git -C "${CLAUDE_PLUGIN_ROOT}" rev-parse --show-toplevel` (plugin bir klondan kuruluysa) · kullanıcıya sor (headless'ta DUR). Hedef dizin `<depo>/skills/motion-world/library/<ad>/`. Ad küçük harf, `[a-z0-9-]`; varsa üzerine yazılmaz (`<ad>` var → DUR, yeni ad iste).
2. **Kopyala:** `world/` (world.json + `*.jsx` + `lessons.md` + `DECISIONS.md` + varsa `demo.dc.html`/`demo.jsx`), proje `docs/RETRO.md` ve `world/lessons.md`'den world dersleri (damıtılmış, `lessons.md` sonuna "## <proje> dersleri" başlığıyla). `world.json` `origin: "library:<ad>"`, `status` satırı (kaynak proje adı, tarih).
3. **Müşteri malzemesini ayıkla (HK-37).** Pakete GİRMEZ: müşteri adı ve logoları, marka renkleri, film kareleri, ses, transkript, sözlük içeriği, seslendirme metni. Uygulama:
   - `assets/`, `out/`, `materials/`, `script/`, `fonts/` (vendor ile inen fontlar hariç, onlar zaten pakete girmez), `*.png|jpg|mp4|wav|mp3` kopyalanmaz.
   - Logo bileşenleri (`*Logo*`, `logo` geçen ilkel ve varlık yolları) çıkarılır; `world.json` `primitives`'ten de silinir.
   - Aksan rengi marka renginden ölçüldüyse `accent.color` yer tutucu olur (`#D8301A`, `note`: "aksan rengi projeden").
   - Sözlük dosyası varsa yalnız **yapısı** `SOZLUK-SABLON.md` olarak girer (başlıklar, sütunlar, onay akışı; terimler ve tanımlar `<…>`).
   - Metin taraması: proje `project.md` §1 (brief) ve §7 (malzeme) içindeki marka/müşteri adları + paketin `dev/privacy-scan.mjs` desenleri; bulunan satır anonimleştirilir (`[ÖRNEK]`) ya da çıkarılır. Sonuç raporda: "müşteri ayıklama: <n> dosya atlandı, <m> satır anonimleştirildi, kalan bulgu 0".
4. **`library/INDEX.md`'yi güncelle:** tabloya satır (ad · kimlik tek cümle · içerik · bant · K1 maskesi · grade · demo · kaynak proje + tarih · durum).
5. Depo değişikliği commit'lenmez; kullanıcı inceler ve kendisi commit'ler (paylaşmadan önce `node dev/privacy-scan.mjs`).

## 5. Rapor ve DUR

Raporda şunlar yer alır:
- aday sayısı → core / world / proje dağılımı
- öneri dosyasının yolu
- core önerilerinin özet tablosu
- işlenen world/proje satırları
- `--library` verildiyse: kütüphaneye yazılan dosyalar, müşteri ayıklama sonucu, INDEX satırı

Kapanış satırı: `**DUR — promote.** Core önerilerini onaylarsan paketin deposuna öneri (PR) olarak gönderilir; plugin dosyalarına buradan dokunulmaz.`
