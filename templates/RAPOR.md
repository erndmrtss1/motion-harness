<!--
Faz sonu raporu şablonu (PLAYBOOK §7). Rapor ana oturumun faz sonu mesajıdır; aynı metin docs/F<n>-RAPOR.md olarak kaydedilir.

Bölüm sırası sabittir. Koşullu bölümler (← işaretli) gerekmiyorsa yazılmaz; sıraları değişmez.

Kurallar:
- `## Katkı` her raporda vardır. 1–3 katkı yazılır; A/B'siz katkı "deneme" etiketi alır. Katkı yoksa "katkı yok".
- KAPALI KARAR listelenmez. Rapordan önce project.md ve scenes.json'da "KAPALI KARAR" aranır; önceki açık kararlar kopyalanmaz, yeniden doğrulanır.
- Sayılar birimli (px, /255, ΔE2000, LUFS, dBTP, kare, s, px/kare, %), yollar göreli yazılır.
- Reviewer kararı docs/REVIEWER.md ile aynıdır. Yapanın puanı farklıysa fark yazılır.
- Ölçü: 3–5,5 bin karakter, 45–80 satır, 1–3 tablo.
- Ara DUR raporu: başlık `# F<n> · DUR <k>: <konu>`; sonra "Senden gerekenler" ve "DUR sırasında yapılanlar".
-->

# F<n>[-X] · <kapsam>: <tek satır sonuç — "teslim" | "kapıda kaldı, render yok" | "DUR <k>: <neden>">

<Sonuç paragrafı, 2–4 cümle. Ne bitti. Bağımsız reviewer kararı **<TESLİM GEÇER | GEÇER | ŞARTLI GEÇER | GEÇMEZ>** (§0.6 <x>/8, UCUZ <geçer | sınırda #…>). İlk turda engel varsa ne olduğu ve nasıl kapandığı. Kredi <k>, bakiye <önce> → <sonra>.>

**Teslim dosyaları:**  <!-- ← yalnız teslim/master fazlarında -->
- [<FILM>_v<N>.mov](out/master/<FILM>_v<N>.mov) — ProRes 422 HQ, 10-bit, 1080p<fps>, <kare> kare, <s> s.
- [<FILM>_v<N>.mp4](out/master/<FILM>_v<N>.mp4) — H.264 CRF 16 + AAC; ses <LUFS> / <dBTP> ([loudness.json](out/master/<FILM>_v<N>-loudness.json)).
- Arşiv: [ARSIV.json](out/archive/<FILM>_v<N>/ARSIV.json) — <yeniden kodlanan / bağlanan perdeler>; framemd5 bit-exact <n>/<n>.
- Teslim belgesi: [docs/TESLIM.md](docs/TESLIM.md)

## Kapılar

| kapı | sonuç |
|---|---|
| QC | hata <0> · <n/n> kare · fade <…> · parlaklık bandı <ort. %, world bandı> |
| K1 (kahraman) | <x/x> · <display metin px> |
| K3 / OURS | <shot oranları> · OURS <x> · kamera tepe <px/kare>, basamak 0 |
| Aksan / istisnalar | <n/quota> aralık · konum taraması: izinli kutular dışında 0 · ton ΔE2000 <…> |
| Devir / dikiş | <değer>/255 (ölçüt <durağan ≤ 2 \| hareketli ≤ 1.1 × komşu>) |
| Son kare / iniş | <ham 0 / mp4 0 · en kötü fark/komşu ≤ 1.5> |
| Değişmeyen kareler | imgdiff 0 / ProRes bit-aynı (<aralık>) |
| Bakiye | <önce> → <sonra> |

## <Faza özgü bölüm>

<!--
Fazın türüne göre: "Teşhis: neden …?" (sayıyla neden, denenen hipotezler) · "Düzeltme ve vuruş" · "Zaman tablosu" ·
"Perde dikişleri (/255)" (| dikiş | önceki komşu | **dikiş** | sonraki komşu | sonuç |) · "Kayma tablosu" ·
"Yeniden çizim planı" (| perde | kare | süre | tahmini |) · "Büyütme karşılaştırması" · "Bu fazda eklenen ana çözümler".
-->

## Ara notlarına yanıt  <!-- ← kullanıcı ara not gönderdiyse -->

1. **<not>:** <bulgu (sayıyla) + yapılan; kalıcı derse/belleğe yazıldıysa söyle>

**Teslim turundaki engel:** <reviewer'ın ilk tur bulgusu ve düzeltmesi, sayıyla>  <!-- ← varsa -->

**Brief'ten sapmalar:**  <!-- ← varsa; her biri neden + sayı + reviewer kabul etti mi -->
- **<konu>:** <brief <x> → uygulanan <y>; neden; reviewer <kabul etti / etmedi>>

## Açık kararlar  <!-- ← yoksa yazılmaz -->

1. **<konu>:** <durum + sayı>. Öneri: <…>. Etki: <yeniden render aralığı, süre, kredi>.
2. **<konu>:** <…>. Borç olarak mı kalsın?

## Borç tablosu  <!-- ← film/teslim sonu fazlarında; project.md §12 ile eş -->

| konu | durum (borç / kabul / çözüldü (F<n>) / kapandı) |
|---|---|
| | |

## Dosyalar  <!-- ← teslim dosyaları üstte verilmediyse -->

- **Videolar:** `out/scenes/<id>.mp4`, `out/scenes/<id>-ses.mp4`, animatik `<…>`, birleşik ön izleme `<…>`
- **Kontak ve QC:** `out/probe/<id>-contact.png`, `out/probe/<id>-qc.json`, `out/probe/<id>-fc.json`
- **Kod:** `<p>.jsx` (yeni), `<…>` (değişen; paylaşılan bileşen varsayılanı eski çıktıyı verir)
- **Belgeler:** `project.md` §<N> / §<N>a · `docs/KUNYE-P<n>.md` · `docs/REVIEWER.md` · `out/RENDER_REPORT.md` · `docs/RETRO.md` · `world/lessons.md` (F<n> dersleri)

## Katkı

- **<araç / yetenek / kural>:** <ne eklendi, neden, nereye (world / araç / skill)>. <A/B yoksa "deneme">.
- **World'e işlenen dersler (F<n>):** <ders>; <ders>.
- **Süreç dersi:** <kendi hatası → yeni kural>  <!-- ya da "katkı yok" -->

**DUR — <durulan nokta>.** <beklenen onay ya da karar>
