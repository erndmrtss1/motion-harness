# <ses-eski> → <ses-yeni>: ses kayması ve yeniden çizim planı (F<n> DUR 1)

> Yeni ses: `<materials/…>` (<s>). Önceki: `<materials/…>`. Transkript `script/<ad>.words.json` (klip doğrulaması: <n> düzeltme, `meta.fixes`).
> **Kural:** |Δ| ≤ 2 kare (60 fps'te 33 ms) olan shot'ın kareleri aynen kalır; diğerleri eşlemle yeniden çizilir. Tasarım zamanı korunur; yeni perdeler doğrudan yeni ses zamanında tasarlanır.
> Etkilenen kareler tasarım listesinden değil **ölçümle** bulunur.
> Komutlar: `motion-render transcribe … --out script/<ad>` · `motion-render transcribe verify <spec>` · `motion-render beats … --out script/BEATS<k>.md` · `motion-render audio-diff <eski> <yeni>` · `motion-render amap build --anchors amap.config.json`.

## 1. Metin farkı

Transkripsiyon ve klip doğrulaması sonrası. Beklenen yerler dışında fark varsa **DUR**.

| fark | eski | yeni | sonuç |
|---|---|---|---|
| <shot/cümle> | <…> | <…> | beklenen / **beklenmeyen → DUR** |

## 2. Genel kayma (zarf korelasyonu, transkripsiyondan bağımsız)

- PCM korelasyonu: <x> → <aynı çekim (kesik kopya) | yeni çekim>.
- Zarf korelasyonu tepe kayması: <ms>. Bölgesel kayma: <…>.

## 3. Shot başına kayma

Δ = yeni − eski. Çapalar: kelime başları ve kesmeler; zarf sağlaması.

| shot | perde | çapalar (Δ ms) | zarf (ms) | Δ aralığı | karar |
|---|---|---|---|---|---|
| S01 | P1 | <…> | <…> | <…> | ≤ 33 ms → **aynen** |
| S02 | P1 | <…> | <…> | <…> | yeniden (eşlem) |

Zarfla > 50 ms çelişen transkripsiyon çapaları atılır. Kritik vuruşlarda kelime başı ve konuşma sonu **akustik** ölçülür.

## 4. Perde sınırları ve film süresi

| perde | shot | kare (yeni) | süre | önce | fark |
|---|---|---|---|---|---|
| | | | | | |

Film: <kare> kare / <s> s (önce <…>). Konuşma sonu (akustik) <s>; sessiz kuyruk <a>–<b>.

## 5. Yeniden çizim planı

| perde | kalan kareler (imgdiff 0, tanık) | yeniden çizilen | eşlem | tempo (tasarım/ses) | s/kare | tahmini |
|---|---|---|---|---|---|---|
| P1 | <a–b> | <a–b> | <A \| B> | <min–maks> | <…> | <dk> |

Toplam: yeniden <kare> kare ≈ <sa> render (+ işlem ≈ <sa>). Sesten bağımsız işler DUR sırasında yürütülür.

## 6. Eşlem yöntemi

- Model: t = τ + Δ(τ).
- Çapalar: kesmeler, kelime başları, vuruşlar, sahne olay kelimeleri.
- Çözücü: en az eğrilikli yumuşatma spline'ı; hedef koridor ±<28> ms; perde sınırları kare ızgarasında sert.
- Doğrulama: her çapa |t̂ − t| ≤ 33 ms. Ölçülen en kötü <ms>.
- Değişmeyen aralıklarda eski eşlem devredilir; kareler bit-aynı kalır.

## 7. Akustik doğrulamalı zamanlar

| olay | eski | yeni | not |
|---|---|---|---|
| | | | |

## 8. Açık kararlar ve DUR

1. **<konu>:** <durum>. Öneri: <…>. Etki: <…>.

**DUR 1 — kayma tablosu ve yeniden çizim planı.** Onaylanırsa <bağımsız kısım> hemen başlar; <bağımlı kısım> <neyi> bekler.
