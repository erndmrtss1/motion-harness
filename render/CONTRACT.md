# @motion/harness — sözleşme (CLI · manifest · world · sayfa kancaları)

Bu belge paketin bütün parçalarının (skill'ler, ajanlar, komutlar, `render/`) uyduğu tek sözleşmedir.
Değişiklik önce burada yapılır. Sürüm: 1.0.0.

## 1. Proje düzeni (her proje kökü)

```
<proje>/
  scenes.json            manifest (tek kaynak: fps, boyut, profil, sahneler, kontroller)
  project.md             projeye özgü katman (brief, kimlik, kalite çıtası, bütçe, yasaklar, faz kararları)
  CLAUDE.md              bağlayıcı sıra + daimi çalışma kuralları
  world/                 seçilen/kurulan world: world.json + *.jsx + lessons.md (+ DECISIONS.md)
  motion-runtime.js      sayfa yükleyici (paketten kopyalanır; `motion-render init`)
  shared/motion-stage.jsx  saat/seek/kompozisyon (paketten)
  shared/motion-core.jsx   stilden bağımsız yardımcılar (paketten)
  <SAHNE>.dc.html        sahne sayfaları (x-dc biçimi, §4)
  *.jsx                  sahne kodu
  checks/<id>.json       (isteğe bağlı) sahne kontrol bildirimi; scenes.json `checks` ile birleşir
  hooks/<ad>.js          (isteğe bağlı) ölçüm kancaları (frame-check sayfaya enjekte eder)
  script/                ses: transkript, BEATS, amap
  assets/gen/            üretken varlıklar + manifest.json (ledger)
  docs/                  künye, REVIEWER, RETRO, TESLİM, raporlar
  fonts/ vendor/         `motion-render vendor` üretir (pakete girmez)
  out/                   frames/, scenes/, probe/, logs/, master/, archive/, review/
```

Proje kökü çözümü (her komut): `--project <dizin>` → `MOTION_PROJECT` → cwd'den yukarı ilk `scenes.json`.

## 2. `scenes.json`

```jsonc
{
  "version": "1.0.0",
  "fps": 60, "width": 1920, "height": 1080,          // D1-03: varsayılan 60 fps · 1920×1080
  "profile": "full",                                   // full | light | live  (§0.6 kapısı: 7/8 · 6/8 · 7/8)
  "world": "world/world.json",                         // world dosyası (bant + K1 maskesi ZORUNLU)
  "audio": "materials/ses.wav",                        // proje sesi (tek kaynak) — yoksa null
  "animatic": { "scale": 0.5, "fps": 30 },
  "gate": { "taste": 7 },                              // profil varsayılanını yükseltebilir, düşüremez
  "scenes": [
    {
      "id": "P1", "file": "P1.dc.html", "tc": "00:00.00", "frames": 1200,
      "bg": "#000", "keys": [120, 480],                // anahtar kareler (kontak + reviewer)
      "blackStart": false, "slice": false,             // slice:false → son kare siyah denetlenir
      "layer": { "open": 0, "exit": 19.9 },
      "k1": { "hero": "dom", "areaMin": 0.30, "heightMin": 0.50, "lyricMin": 22, "keys": [] },
      "camAccel": { "max": 0.15, "floor": 2 },
      "redQuota": 1, "accent": "signal",              // aksan sınıfı world.classes'tan
      "exceptions": {}, "review": {},                  // kayıtlı istisnalar / "incelendi" ([a, b, gerekçe])
      "grade": { "fadeOut": null }, "expoPost": null,
      "chromiumArgs": [], "props": null,
      "checks": [ { "type": "seam", "next": "P2" } ],  // frame-check bildirimi (§5)
      "hooks": ["hooks/p1.js"]                          // frame-check'in sayfaya enjekte ettiği kanca dosyaları
    }
  ]
}
```

Alan adları kaynak projeyle uyumludur (kaynak manifest değiştirilmeden okunur). Kare eşikleri saniye + `fps` ile hesaplanır (`KF = fps/30` yalnız geriye uyum için).

## 3. `world/world.json`

```jsonc
{
  "name": "…", "version": "0.1.0", "origin": "lookdev|example:<ad>",
  "palette": { "bg": "#…", "ink": "#…", "…": "#…" },
  "accent": { "color": "#…", "class": "signal", "quotaDefault": 1 },
  "fonts": [ { "family": "…", "weights": [400, 700], "source": "google" } ],
  "band": [40, 58],                       // ZORUNLU — parlaklık bandı (zaman ağırlıklı ort. luma %, grade sonrası)
  "k1": { "mask": "dom|ink|alpha", "selector": "[data-hero]", "areaMin": 0.30, "heightMin": 0.50 },  // ZORUNLU mask
  "edgeDark": { "maxFalloff": 0.20 },
  "grade": { "chain": "dark|light|none", "params": {} },
  "classes": { "signal": { "rMin": 190, "gMax": 60, "bMax": 75, "rgMin": 150 } },
  "camera": { "maxPxPerFrame": 30, "stepJump": 2.5, "accel": { "max": 0.15, "floor": 2 } },
  "motion": { "toolMaxPx": 57, "writeGlyphsPerSec": 12, "settlePx": 2 },
  "supersample": { "k2x": 0.5, "pad": 6, "blend": 6, "sxK": 1.5, "edgeMaxPx": 1.9 },
  "primitives": ["…"],                    // bu world'ün bileşenleri (jsx dosyalarında)
  "lessons": "lessons.md"
}
```

World seçilmedikçe hiçbir primitif/renk/font/kalıp varsayılan gelmez. Örnek world'ler `skills/motion-world/examples/<ad>/`.

## 4. Sayfa biçimi ve runtime

Sahne sayfası `x-dc` alt kümesidir (kaynak projeyle uyumlu):

```html
<script src="motion-runtime.js"></script>
<x-dc><helmet> <link …> <style>…</style> <script>window.OM_SCENES='[{"name":"P1","dur":20}]';</script> </helmet>
<x-import component-from-global-scope="P1" from="shared/motion-stage.jsx shared/motion-core.jsx world/x.jsx p1.jsx" style="position:absolute;inset:0"></x-import>
</x-dc>
```

- `motion-runtime.js`: `<x-dc>` → `#dc-root`; helmet `<link>/<style>/<script>` sırayla `<head>`'e; React 18.3.1 + ReactDOM UMD (unpkg URL'si; harness `vendor/`'a yönlendirir); `.jsx` Babel standalone 7.29.0 (`presets: react, typescript`); her modül sırayla `new Function('React','module','exports','require', kod)`; bileşen `module.exports[ad] ‖ yeni window global ‖ window[ad]`. Global API: `__dcSetProps(ad, props)`, `__dcRootName()`. Hata: konsola `[dc-runtime] x-import: FAILED to load <url>`.
- `motion-stage.jsx`: `CompositionStage({width,height,bg,scenes,playback})`, `useComposition() → {T, CUES, time, duration, authoredTotal, playing}`. Stage DOM: `div[data-om-starter] > div > svg[data-om-exportable-video-with-duration-secs] > foreignObject > div(width,height,bg,relative,overflow hidden)`. Seek: svg'ye `CustomEvent('data-om-seek-to-time-frame', {detail:{time, sync:true}})` → `flushSync`. Fontlar satır içine alınınca svg `data-om-fonts-inlined="true"`.
- Kural: her şey `T`'nin saf fonksiyonu; useEffect/rAF ile çizim yok.

## 5. Sahne ↔ araç kancaları (`window.*`, isteğe bağlı)

| kanca | kullanan | anlamı |
|---|---|---|
| `FX_FPS` | harness yazar | sayfa kare hızı |
| `__waitRaf`, `__waitMs` | harness | kare başı ek bekleme |
| `__fxBakeSettle()` | harness | pişirme önbelleği oturdu mu (true → aynı kare yeniden seek) |
| `__probeInfo()` | probe | serbest bilgi |
| `__camSpeed(fps, n)` | qc, ours, frame-check `camera` | kare başı kamera ekran hızı (px/kare) dizisi |
| `__camK(fps, n)` | ss2 | kare başı kamera ölçeği k |
| `__redExclude(fps, n)` | qc, frame-check `accentLocation` | kare başı izinli aksan kutuları |
| `__boxes(T)` | frame-check `framing`, `overlap` | `[{name, rect:[x,y,w,h]|poly, z, kind: obj|lyric|label|text|cut|out, size}]` ekran px |
| `__tools(T)` | frame-check `toolPath`, `overlap` | `{ad: {poly, tip:[x,y], visible}}` ekran px |
| `__holds()` | frame-check `toolPath` | `[[t0,t1], …]` tutuş aralıkları |
| `__events()` | frame-check `sync` | `[{t, word, kind}]` fiziksel olay anları |
| `__glyphs(T)` | frame-check `overlap` | yazılmış glif kutuları |
| `[data-hero]`, `[data-doku]`, `[data-c]`, `[data-fx]` | qc K1, k6 | DOM işaretleri |

Kanca yoksa ilgili kontrol "ölçülemedi" UYARI verir (hata değil); `smoke` sözleşmeyi denetler.

## 6. `motion-render` alt komutları

| komut | iş |
|---|---|
| `render <id…> [--jobs N] [--scale S] [--step N] [--range a-b --tag T] [--resume] [--fps N] [--progress] [--frame-log] [--set K=V] [--prop K=V]` | kare kare PNG → `out/frames/<id>[_tag]/NNNNN.png` |
| `probe <id> --frame N [--frames a,b] [--out p.png] [--eval JS] [--bench N] [--set K=V]` | tek kare (+ sayfada değerlendirme) |
| `wait --id <id> [--tag T] [--frames N] [--timeout s]` | üst sınırlı bekleme |
| `run <id…> [--ss2] [--expo-post]` | render → (ss2) → (expo-post) → grade → qc → contact → ours |
| `ss2 <id> [--k 0.5 --pad 6 --blend 6] [--plan]` · `ss2 down <dir>` | 2× süper örnekleme aralıkları + iniş |
| `expo-post <id> [--dry]` | kayan nokta pozlama + TPDF dither |
| `grade <id…> [--animatic] [--audio]` · `encode <id>` | grade zinciri (world) + H.264 |
| `qc <id> [--mp4 auto] [--frames-dir D]` · `qc film` | tek komut QC (16 kontrol) → `out/probe/<id>-qc.json` |
| `frame-check <id> [--only t1,t2] [--frames-dir D] [--mp4 auto] [--cand c.json] [--sheet] [--json]` | manifest bildirimli 20 tip → `out/probe/<id>-fc.json` |
| `ours <id> [--step N] [--no-cam] [--dir D]` | OURS / K3 |
| `contact <id>` · `contact sheet <out> a.png=etiket …` · `contact storyboard <SB>` · `contact seq <id> --from --to --step` | kontak / tablo |
| `imgdiff a b [out]` · `imgdiff stale <id>` | kare farkı / bayatlık |
| `master [--tag vN] [--ids …]` · `arsiv [--tag vN] [--link-from vM]` | tek sürekli encode (ProRes 422 HQ + H.264) · FFV1 + framemd5 |
| `ses <id…>` · `ses preview <id,id>` | sesli kopya / birleşik ön izleme |
| `beats <audio> [--words w.json] [--out BEATS.md]` · `transcribe <audio> [--out pfx]` · `transcribe verify <spec>` | ses hattı (Whisper isteğe bağlı) |
| `tts <metin.txt|"metin"> --out materials/ses.wav [--voice ad] [--words script/ses.words.json] [--list]` | kredisiz yerel TTS (Windows SAPI kelime zamanlı; macOS `say`; Linux `espeak-ng`) |
| `amap build --anchors amap.config.json` · `audio-diff <a> <b>` | ses ↔ tasarım zamanı eşlemi · zarf korelasyonu + kayma tablosu |
| `vendor [scripts] [fonts] [math]` | React/ReactDOM/Babel + Google Fonts (lisans metniyle) |
| `gen <request> [--cap N] [--dry]` · `ingest [--balance-before N --balance-after M]` · `ingest review <id> kabul|ret|yedek "<not>"` · `ingest scan <id>` | Higgsfield üretim (CLI) · ledger |
| `logo build|fit|assets|check` | logo vektör hattı + kabul ölçüleri |
| `world <ad> bake-noise` | world yardımcıları |
| `manifest sync|validate` | manifest → sayfa manifesti · şema doğrulama |
| `report` | RENDER_REPORT özeti |
| `init <dir> [--world <örnek>] [--profile P] [--with-whisper]` | proje iskeleti (templates/) |
| `smoke [--keep]` | kurulum denetimi: ffmpeg, Chromium, vendor, geçici proje → 12 kare 960×540 → qc → contact |
| `live <page> [--qc]` | canlı profil sayfası: fps / gecikme / düşen kare ölçümü |
| `doctor` | ortam + Higgsfield oturumu + bakiye |

Çıkış kodları: 0 tamam · 1 hata · 2 kullanım · 3 QC/kontrol `error` · 4 bekçi duraksama · 5 kare atlandı · 6 disk < 40 GB.
