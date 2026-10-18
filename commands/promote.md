---
description: Projede öğrenilen dersleri doğru katmana taşır. RETRO, REVIEWER tekrarları ve world/lessons.md'deki adayları toplar; core (paket LESSONS/PATTERNS/RULES), world ve proje olarak sınıflar. Core için anonim bir diff öneri dosyası üretir ve paketi asla sessizce düzenlemez. World ve proje derslerini proje dosyalarına işler. DUR ile biter.
argument-hint: "[--since <tarih|faz>]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# /motion:promote: ders terfisi

> **Etkileşimsiz oturum (headless):** `claude -p` ile ya da kullanıcı olmadan çalışıyorsan (ör. ortamda `MOTION_EVAL=1`) ajanları **ön planda** başlat (`Agent` çağrısında `run_in_background: false`) ve sonucunu bekle. Arka planda ajan bırakıp turu bitirme: headless süreç tur bitince kapanır ve arka plan ajanları da ölür. Komutun bütün adımları bitmeden son mesajı yazma.

Argümanlar: `$ARGUMENTS`

Kaynak: `${CLAUDE_PLUGIN_ROOT}/skills/motion-core/references/PLAYBOOK.md` §4.8.

Paket dosyaları (`${CLAUDE_PLUGIN_ROOT}/**`) bu komutta **asla düzenlenmez**. Plugin önbellek kopyasıdır: düzenleme bir sonraki güncellemede kaybolur ve core'u sessizce değiştirir. Core değişikliği yalnız öneri dosyası olarak çıkar.

## 1. Adayları topla

- `docs/RETRO.md`: "Dersler", "Ters giden (kök neden)", "Sonraki tur için" ve "core aday" etiketli satırlar.
- `docs/REVIEWER.md`: `Tekrar: #<n> (<birimler>)` satırları ve aynı bulgunun farklı birimlerde dönmesi.
- `world/lessons.md` ve `project.md` §11 "uygulama notu (yapan)" satırları.
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

## 5. Rapor ve DUR

Raporda şunlar yer alır:
- aday sayısı → core / world / proje dağılımı
- öneri dosyasının yolu
- core önerilerinin özet tablosu
- işlenen world/proje satırları

Kapanış satırı: `**DUR — promote.** Core önerilerini onaylarsan paketin deposuna öneri (PR) olarak gönderilir; plugin dosyalarına buradan dokunulmaz.`
