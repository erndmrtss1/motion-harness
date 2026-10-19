# @motion/harness — sözleşme (CLI · manifest · world · sayfa kancaları)

Bu belge paketin bütün parçalarının (skill'ler, ajanlar, komutlar, `render/`) uyduğu tek sözleşmedir.
Değişiklik önce burada yapılır. Sürüm: 1.2.0.

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
  "animatic": { "scale": 0.5, "fps": 30 },             // belge alanı (validate denetler); araçlar SAHNE `animatic` alanını okur
  "gate": { "taste": 7 },                              // profil varsayılanını yükseltebilir, düşüremez (komutlar okur)
  "scenes": [
    {
      "id": "P1", "file": "P1.dc.html", "tc": "00:00.00", "frames": 1200,
      "bg": "#000", "keys": [120, 480],                // anahtar kareler (kontak + reviewer + qc kadraj/K1/metin)
      "blackStart": false, "slice": false,             // slice:false → son kare siyah denetlenir
      "layer": { "open": 0, "exit": 19.9 },            // exit (s): qc/fc pencere sonu
      "k1": { "hero": "dom", "areaMin": 0.30, "heightMin": 0.50, "lyricMin": 160, "keys": [] },   // hero|mask = maske türü (world'ün üstüne yazar)
      "camAccel": { "max": 0.15, "floor": 2 },
      "redQuota": 1, "accent": "signal",              // aksan sınıfı world.classes'tan
      "exceptions": {}, "review": {},                  // kayıtlı istisnalar (exceptions.bordo) / "incelendi" ([a, b, gerekçe])
      "grade": { "fadeOut": null }, "expoPost": null,  // grade: { fadeOut [n0, n1], chain, params, blackPoint } · expoPost: { t0, dur, dip? }
      "chromiumArgs": [], "props": null,
      "checks": [ { "type": "seam", "next": "P2" } ],  // frame-check bildirimi (§5)
      "hooks": ["hooks/p1.js"]                          // frame-check'in sayfaya enjekte ettiği kanca dosyaları
    }
  ]
}
```

Alan adları kaynak projeyle uyumludur (kaynak manifest değiştirilmeden okunur). Kare eşikleri saniye + `fps` ile hesaplanır (`KF = fps/30` yalnız geriye uyum için).
`manifest validate`: `scenes` boş olmayan dizi olmalıdır — `init` (`--demo`suz) sahnesiz manifest yazar; ilk sahne eklenene dek validate yalnız bu hatayı verir (world denetimi yine çalışır).

Araçların okuduğu diğer alanlar:

| alan | okuyan | anlamı |
|---|---|---|
| kök `film` · `pageManifestFile` · `pageManifestGlobal` · `archive.docs` | master/arsiv/ses · `manifest sync` · `arsiv` | film kimliği · sayfa manifesti dosyası (varsayılan `motion-manifest.js`) ve ek global adı · arşive girecek belge yolları |
| `range: [a, b]` · `parent` | ses, master, arsiv, ours, k6, grade (animatik ses ofseti), frame-check `temporal` `at:"actBoundaries"` | perde kesiti (film karesi, dahil) · film kimliği |
| `shots: [{id, f0, f1, af0?, af1?, …}]` | ours, k6, `beats shots`, audio-diff | shot sınırları (kare; `af*` ses zamanı) |
| `animatic: {scale, step, fps}` | run (render), grade, contact, expo-post, ours | animatik sayfası (render `--scale/--step`; grade animatik encode + ses) |
| `hero: "dom"` · `heroMin` | qc kadraj | DOM kahraman alanı · sahne alan eşiği |
| `profile: "typographic"` · `typeMin` · `band` | qc kadraj ve bant | tipografik profil (display px ≥ `typeMin`, varsayılan 72) · sahne bandı (`band` ‖ world `profileBands.typographic` ‖ [6, 14]) |
| `bordo` · `contentRed` · `redExclude` · `redAllowed` | qc aksan, `qc film --cuts` | bordoya izin · içerik kırmızısı (HATA → UYARI) · `__redExclude` kancası kullanılır · izinli aksan aralıkları |
| `world` | qc, k1, ours, grade | sahneye özel world (`…/world.json` yolu ya da eski biçim ad) |
| `glyph: true` | render | glif hazır sondası (≥ 60 rect) |
| `fps` | ss2, expo-post | sahne kare hızı (yoksa manifest `fps`) |
| `encode` · `out` · `reel` · `tc` · `temp` · `chapter` | grade, `master --reel`, `manifest sync`, qc | kendi encode'u · çıktı yolu · reel dışı (`false`) · film sırası · sayfa manifesti · bölüm |
| `rehearsal: [fa, fb]` · `cuts: [f \| [f, etiket]]` | `qc film --rehearsal` · `qc film --cuts` | grade provası kareleri · kesmeler |
| `ours: {shot, holdMax, movingMin}` · `k3: {camMin, movingMin}` | ours | OURS/K3 hedefleri (sahne > world > 1,67 s / 0,6 / 0,4 · %2) |
| `review.{dark, kadraj, kontrast, fade, metin}` · `review.<tip>` | qc · frame-check (`check.review` ‖ tip adı) | "incelendi" aralıkları `[[a, b, gerekçe]]` |

## 3. `world/world.json`

```jsonc
{
  "name": "…", "version": "0.1.0", "origin": "lookdev|library:<ad>",
  "palette": { "bg": "#…", "ink": "#…", "…": "#…" },
  "accent": { "color": "#…", "class": "signal", "quotaDefault": 1 },
  "fonts": [ { "family": "…", "weights": [400, 700], "source": "google" } ],
  "band": [40, 58],                       // ZORUNLU — parlaklık bandı (pencere karelerinin ortalama luma %, grade sonrası)
  "profileBands": { "typographic": [6, 14] },   // sahne profile:"typographic" bandı
  "k1": { "mask": "dom|ink|alpha", "selector": "[data-hero]", "areaMin": 0.30, "heightMin": 0.50, "lyricMin": 160, "lyricSelector": "[data-fx=write]" },  // ZORUNLU mask
  "edgeDark": { "maxFalloff": 0.20, "maxDelta": 15 },
  "grade": { "chain": "dark|light|lab|none", "params": { "curves": "…", "colorbalance": "…", "vignette": 0.72, "black": [10, 9, 8], "pureSec": 0.4 } },
  "burst": { "luma": 250, "max": 0.35 },  // patlama kontrolü (chain "light" ise kendiliğinden açık)
  "classes": { "signal": { "rMin": 190, "gMax": 60, "bMax": 75, "rgMin": 150 } },
  "camera": { "maxPxPerFrame": 30, "stepJump": 2.5, "maxSteps": 0, "accel": { "max": 0.15, "floor": 2 }, "k3": { "minShare": 0.4 } },
  "motion": { "toolMaxPx": 57, "writeGlyphsPerSec": 12, "settlePx": 2 },
  "supersample": { "k2x": 0.5, "pad": 6, "blend": 6, "sxK": 1.5, "edgeMaxPx": 1.9 },
  "ours": { "shot": 1.67, "holdMax": 0.6, "movingMin": 0.4 }, "k3": { "camMin": 0.02, "movingMin": 0.4 },
  "bake": { "noise": [ { "name": "…", "w": 512, "h": 512, "sigma": 1, "seed": 1 } ], "out": "assets/fx" },
  "primitives": ["…"],                    // bu world'ün bileşenleri (jsx dosyalarında)
  "lessons": "lessons.md"
}
```

World seçilmedikçe hiçbir primitif/renk/font/kalıp varsayılan gelmez. Kütüphane world'leri `skills/motion-world/library/<ad>/` (liste `INDEX.md`); `init --world <ad>` kopyalar, `origin: "library:<ad>"`.

Hangi araç hangi alanı okur (px/kare değerleri proje fps'inde uygulanır; araç ölçeklemez):

| alan | okuyan | araç varsayılanı (alan yoksa) |
|---|---|---|
| `band` | qc bant, frame-check `luma` (`$world.band`) | yok — ZORUNLU (`manifest validate` hata) |
| `profileBands.typographic` | qc bant (sahne `profile:"typographic"`) | [6, 14] |
| `k1.mask` · `selector` · `areaMin` · `heightMin` · `lyricMin` · `lyricSelector` | qc K1, k1, `k1 contrast`, qc metin/kadraj (`selector`) | mask ZORUNLU · `[data-hero]` · 0,35 · 0,55 · 160 px · `[data-fx=write]` (sahne `k1.*` üstüne yazar) |
| `grade.chain` · `grade.params` | grade, master, `qc film` (zincir grubu), qc patlama (`light`) | zincir: sahne `grade.chain` → world → world adı eşlemi → `dark`; params: `curves`, `colorbalance`, `vignette` (açı \| null), `black` ([r,g,b] \| null), `pureSec` (0,4) |
| `burst` | qc patlama | `{luma: 250, max: 0.35}`; `grade.chain:"light"` ise kendiliğinden açık |
| `classes` | qc aksan/bordo, frame-check `accent*`/`sharpness`/`motion`/`overlapPx`/`edgeDark` (`desk`) | yerleşik sınıflar (`signal`, `bordo`, `redInner`, `redPair`, `red`, `darkNeutral`, `desk`, `emptyBlack`, `visible` …); aynı ad üstüne yazar |
| `accent.class` · `accent.color` | qc aksan (sınıf), frame-check `accentLocation` (sınıf), `accentColor` (`target`) | `signal` · hedef yok |
| `accent.quotaDefault` | yalnız `manifest validate` (tamsayı ≥ 0) | — kota sahne `redQuota`'dan |
| `edgeDark.maxFalloff` · `maxDelta` | frame-check `edgeDark` | 0,2 · 15 |
| `camera.accel` | qc kamera ivmesi | `{max: 0.15, floor: 2}` (sahne `camAccel` üstüne yazar) |
| `camera.stepJump` · `maxSteps` · `maxPxPerFrame` · `k3` | frame-check `camera` (+ `motion` için `stepJump`) | 2,5 · 0 · — · `{v: W·0,02/fps, minShare: —}` |
| `motion.toolMaxPx` | frame-check `toolPath` | 57 |
| `ours` · `k3` | ours | `{shot: 1.67, holdMax: 0.6, movingMin: 0.4}` · `{camMin: 0.02}` |
| `fonts` (`family`, `weights`, `italic`, `source: "google"`) | vendor fonts, init (vendor) | — |
| `bake.noise` · `bake.out` | `world <ad> bake-noise` | focusfx-paper (eski fx-lab) için yerleşik üç gürültü · `assets/fx` |
| `motion.writeGlyphsPerSec` · `settlePx` · `supersample.*` · `palette` · `primitives` · `origin` | araç okumaz (look-dev/sahne kodu ve belge değeri; `ss2` eşikleri `--k/--pad/--blend` bayraklarıyla verilir) | — |
| `name` · `version` · `lessons` | validate (uyarı) | — |

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
| `__waitRaf` (sayı, `true` = 2), `__waitMs` | harness | kare başı ek bekleme (rAF sayısı / ms) |
| `__fxBakeSettle()` | harness | pişirme önbelleği oturdu mu (true → aynı kare yeniden seek) |
| `__probeInfo()` | probe | serbest bilgi (`MH.hooks.probeInfo`) |
| `__camSpeed(fps, n)` | qc kamera ivmesi, ours K3, frame-check `camera` ve `temporal` (`detect: ["dup"]`) | kare başı kamera ekran hızı (px/kare) dizisi (`MH.hooks.camSpeed`) |
| `__camK(fps, n)` | ss2 | kare başı kamera ölçeği k (`MH.hooks.camK`) |
| `__redExclude(fps, n)` | qc (sahne `redExclude` doluysa), frame-check `accentLocation` (`allow: ["$__redExclude"]`) | kare başı izinli aksan kutuları `[[x0, y0, x1, y1], …]` ekran px (`MH.hooks.accentExclude`) |
| `__boxes(T)` | frame-check `framing`, `overlap` (`box:<ad>`, `kind:<tür>`) | `[{name, rect:[x,y,w,h] \| poly, kind, px?, pad?, minPx?, test?}]` ekran px; `kind`: `obj` \| `lyric` \| `label` \| `text` \| `cut` \| `out` \| `rr` (+ `paper` = masa payı yüzeyi, `ref` = yok sayılır); `px` = ekrandaki display boyu (`minPx` ile karşılaştırılır) |
| `__tools(T, Tönceki)` | frame-check `toolPath`, `overlap` (`tool:<ad>[.<parça>]`) | `{ad: {poly \| tip:[x,y], visible?, ref?, parts?: {parça: poly}, phase?}}` ekran px |
| `__holds()` | frame-check `toolPath` (`holds: "$__holds"`) | `[[t0,t1], …]` tutuş aralıkları |
| `__events()` | frame-check `sync` (`mode: "events"`) | `[{t, word, kind, at?}]` fiziksel olay anları |
| `__glyphs(T, ad?)` | frame-check `overlap` (`glyphs[:<ad>]`) | yazılmış glif kutuları (`rect` \| `poly`) |
| `__shots(fps)` | frame-check `camera` (`shots: "$__shots"`) | `[[ad, f0, f1], …]` K3 shot aralıkları |
| `__frameN(fps)`, `__frameT(i, fps)` | frame-check tasarım tipleri (isteğe bağlı) | izdüşüm zaman tabanı: kare sayısı · kare i → T (ya da [T, dt]); yoksa T = i / fps |
| `[data-hero]` (K1 `selector`), `[data-doku]`, `[data-c]`, `[data-fx]` (`[data-fx=write]` lyric) | qc K1/kadraj/metin, k1, k6, frame-check `identical` (`mode: "dom"`) | DOM işaretleri |

Kanca yoksa ilgili kontrol "ölçülemedi" UYARI verir (hata değil). Kanca sözleşmesini `smoke` denetlemez (o kurulumu denetler); kancalar `probe --eval` ve frame-check tasarım tipleriyle doğrulanır. Kanca adlarının sahne tarafı `motion-core.jsx` `MH.hooks.*`'tır (`__shots`, `__frameN`, `__frameT` için `MH.hooks.set(ad, fn)`).

## 6. `motion-render` alt komutları

Dağıtıcı: `motion-render <komut> [--project <dizin>] …` · `motion-render help` (komut listesi) · `--version`. Takma adlar: `probe` = `render --frame N` (`--frame`'siz çalışmaz) · `fc` = `frame-check` · `qc k1 …` / `qc k6 …` = `k1` / `k6`.

| komut | iş |
|---|---|
| `render <id…> \| --all [--jobs N] [--fallback] [--scale S] [--step N] [--tag T] [--range a-b (--tag zorunlu)] [--resume] [--progress] [--frame-log] [--fps N (yalnız --range ya da --frame ile)] [--set K=V] [--prop K=V] [--no-disk-check] [--wd-ms N] [--wd-stall N]` | kare kare PNG → `out/frames/<id>[_tag]/NNNNN.png` · `out/logs/<id>[_tag].log` (canlı) + `.json` (bitiş işareti) |
| `probe <id> --frame N [--frames a,b,…] [--out p.png] [--eval JS] [--bench N] [--set K=V] [--prop K=V]` | tek kare (+ sayfada değerlendirme) → varsayılan `out/probe/<id>-f<N>.png`; `--frames` ek kareleri `<out>-fNNNN.png` |
| `wait --id <id> --tag <T>\|- --frames N [--expect s] [--since ms\|ISO]` | üst sınırlı bekleme (üst sınır 2 × `--expect`; yoksa eksik kare × 2,5 s + 20 s); `--tag -` = etiketsiz tam render |
| `run <id…> [--ss2] [--expo-post] [--skip-render] [--ours-step N] [--no-qc] [--no-contact] [--no-ours] [-- <render argümanları>]` | render → (ss2) → (expo-post) → grade → qc `--mp4 auto` → contact → ours (log `out/logs/A-<id>.out`) |
| `ss2 <id> [--k 0.5] [--pad 6] [--blend 6] [--frames a-b] [--plan] [--no-merge] [-- <render argümanları>]` · `ss2 down <dir>` | 2× süper örnekleme aralıkları + iniş (eşikler bayraktan; world `supersample` okunmaz) |
| `expo-post <id> [--dir D] [--step N] [--dry]` | kayan nokta pozlama + TPDF dither → kayıt `out/logs/<dizin>-expo-post.json` |
| `grade <id…> [--animatic]` · `grade <animatik-sayfa> [--audio [P]] [--dir D] [--fps N] [--start K] [--count M] [--ss s] [--out P] [--crf 16] [--world W]` · `grade --png in.png out.png [--world W]` · `encode <id…> \| --all` | grade zinciri (world) + H.264 → `out/scenes/<id>.mp4` (`--animatic`: `out/frames/<id>_animatic` → `<id>_animatic.mp4`); `--audio` yalnız manifestte `animatic` alanı olan sayfada · encode = grade'siz |
| `qc <id> [--frames-dir D] [--step N] [--mp4 auto\|yol] [--no-glyph] [--no-cam] [--quiet]` | tek komut QC (16 kontrol) → `out/probe/<id>-qc.json` |
| `qc film [--probe D] [--ids a,b]` · `qc film --rehearsal [--ids a,b]` · `qc film --cuts <id> [--at f,f…] [--frames-dir D] [--class ad]` | film grade sayfası `out/probe/_film-grade-sheet.png` + `_film-qc.json` · grade provası `out/probe/grade-rehearsal/` · geçiş şeritleri `out/probe/<id>-cuts.png` + `<id>-whole.json` |
| `frame-check <id> [--only tip\|ad,…] [--frames-dir D] [--step N] [--mp4 auto\|yol] [--cand c.json] [--sheet] [--json] [--set K=V] [--checks f.json] [--out yol.json] [--list]` | manifest bildirimli 20 tip → `out/probe/<id>-fc.json` (`--sheet` → `out/probe/fc/<id>-<ad>.png`) |
| `ours <id> [--dir D] [--step N] [--no-cam]` | OURS / K3 → `out/probe/<id>-ours.json` |
| `k1 <id> [--frames f,… \| --times t,…] [--lyric "METİN@t,…"] [--mask ink\|dom\|alpha] [--out P]` · `k1 contrast <id> <etiket> f1,f2,… [metin1,metin2] [--json f]` | K1 kahraman + lyric boyu → `out/probe/<id>-k1.json` · render öncesi kontrast probe'u → `out/probe/pc-<id>/` |
| `k6 <id> [--at "S01:0.8,2.2;S02:…"]` | K6 bileşen sayımı (`[data-c]` + `[data-fx]`) → `out/probe/<id>-k6.json` |
| `contact <id> [--step N] [--cols 8] [--dir D] [--fstep N] [--out P]` · `contact sheet <out.png> [--cols 3] [--w 640] [--title T] a.png[=etiket] …` · `contact storyboard <SB-id>` · `contact clips <id,id,…> [--t …] [--fps 30] [--out P] [--title T]` · `contact seq <id> --from A --to B [--step 3] [--cols 4] [--tag T] [--name seq] [--dir D]` | kontak → `out/probe/<id>-contact.png` · tablo · storyboard `out/boards/` · klipler `out/probe/clips/CLIPS.png` · sekans `out/probe/<id>[-<T>]-<ad>.png` |
| `imgdiff a.png b.png [fark.png]` · `imgdiff stale <id> [--step 60] [--from 15] [--to N] [--skip a-b,…] [--dir D \| --parts ETİKET:a-b,…] [--code dosya,…]` | kare farkı / bayatlık → `out/probe/<id>-staleness.json` (bayat → çıkış 3) |
| `master [--tag vN] [--film id] [--ids …] [--skip-video] [--skip-audio]` · `master --reel [--v3] [--out P]` · `arsiv [--tag vN] [--film id] [--ids …] [--skip-frames] [--link-from vM]` | tek sürekli encode (ProRes 422 HQ + H.264) → `out/master/<film>_<tag>.mov/.mp4` + `-loudness.json` · izleme reel'i · FFV1 + framemd5 → `out/archive/<film>_<tag>/` |
| `ses <id…>` · `ses preview <id,id,…> [--out P]` | sesli kopya `out/scenes/<id>-ses.mp4` / birleşik ön izleme |
| `beats <ses> [--words w.json] [--min-pause 0.25] [--out script/BEATS.md] [--lang tr]` · `beats shots [--src script/shots.src.json] [--dry]` · `transcribe <ses> [--out script/<ad>] [--model large-v3] [--low 0.6] [--lang tr]` · `transcribe verify "<ad>,<kaynak>,<a>,<b>" … [--src K=ses]` · `transcribe check` | ses hattı (Whisper isteğe bağlı) |
| `tts <metin.txt\|"metin"> [--out materials/tts.wav] [--voice ad] [--rate 0] [--words script/<ad>.words.json] [--lang kod] [--pad-to s]` · `tts --list` | kredisiz yerel TTS (Windows SAPI kelime zamanlı; macOS `say`; Linux `espeak-ng`) · `--pad-to s`: sonuna sessizlik ekleyip sesi tam s saniyeye tamamlar (ses süresi = film süresi) |
| `amap build --anchors amap.config.json [--tol 0.033] [--fps N] [--dry]` · `amap example` · `audio-diff <a> <b> [--words-a … --words-b …] [--scene <id>] [--tol 0.033] [--out D] [--md M]` | ses ↔ tasarım zamanı eşlemi · zarf korelasyonu + kayma tablosu → `out/probe/audio-diff/<a>--<b>/` |
| `vendor [scripts] [fonts] [math] [gsap] [ttf] [--families "Aile:400,700;…"] [--world W] [--ttf "Aile:500"]` | React/ReactDOM/Babel + Google Fonts (lisans metniyle); argümansız: scripts + fonts + gsap + ttf (math yalnız açıkça) |
| `gen <istek> [--only id,…] [--use model] [--param k=v] [--acil] [--cap N] [--dry [--online-cost]]` · `gen upscale <kaynak…>` · `gen req <istek> --refs a.png[,b.png] …` · `ingest [--balance-before N --balance-after M] [--task ad] [--from-run f.json] [--lost id:kredi:neden] [--dry] …` · `ingest review <id> kabul\|ret\|yedek "<not>"` · `ingest scan <id>` · `ingest lost <görev> --id <öğe> --credits N --reason "…"` · `ingest refund <görev> <öğe> pending\|granted\|denied` | Higgsfield üretim (CLI) · ledger |
| `logo up \| trace [anahtar…] \| fit [anahtar] \| build \| assets \| check <svg> --ref <jpg> [--px 330] … \| example` | logo vektör hattı + kabul ölçüleri (`assets/logo/logos.json`, `--config`) |
| `world <ad> bake-noise [--out assets/fx] [--force]` | world yardımcıları |
| `manifest sync \| validate [--json]` | manifest → sayfa manifesti · şema doğrulama (hata → çıkış 3) |
| `report` | otomatik render özeti → `out/RENDER_SUMMARY.md` (her koşuda yeniden yazılır; elle tutulan `out/RENDER_REPORT.md`'ye dokunmaz) |
| `init <dir> [--world <örnek> \| --new] [--profile full\|light\|live] [--fps 60] [--with-whisper] [--demo] [--no-vendor] [--force] [--dry]` | proje iskeleti (templates/) |
| `smoke [--keep] [--world focusfx-paper] [--frames 12]` | kurulum denetimi: ffmpeg, Chromium, vendor, geçici proje → 12 kare 960×540 → qc → contact |
| `live [<sayfa.html>] [--port 4317]` · `live [<sayfa>] --qc [--seconds 20] [--wav t.wav] [--fps 60]` · `live [<sayfa>] --capture [det\|rt]` · ortak `[--avatar world/avatar-<yön>.js] [--settings J] [--out D]` | canlı profil: yerel sunum (OBS/panel URL) · ölçüm (fps ortalama + p5, gecikme p95, düşen kare, tetik p95) → `out/probe/live-qc.json` + `.md` · deterministik yakalama `out/live/capture.mp4` · `--out D` ikisini de D'ye yazar (look-dev yönleri); sayfa şablonsa proje dosyaları `/__project/` altından sunulur |
| `lookdev-diff [--dirs A,B,C \| --pages a.dc.html,…] [--frames 0,1,2] [--ref <png>[@CxR+şerit]] [--threshold t] [--out out/review/lookdev-diff.json] [--dump]` | look-dev ayrışması: iskelet (DOM: `__boxes(T)` ya da DOM yürüyüşü → kahraman/bant/metin/kenar 6×4 doluluk, kareler arası ortalama; 1.1 UYARI, eşik 2,2) + palet (zemin ΔE2000 + baskın renkler, UYARI ≥ 3,5) + varsayılan çekici; `--ref` yalnız palet. Çıktı `.json` + `.md`, KARAR `ayrışma:` parçası. Çıkış 0 · 3 (SERT kipte ihlal) · 2 kullanım/sayfa yok |
| `doctor [--json]` | ortam + Higgsfield oturumu + bakiye |

Çıkış kodları: 0 tamam · 1 hata · 2 kullanım · 3 QC/kontrol `error` · 4 bekçi duraksama · 5 kare atlandı · 6 disk < 40 GB (render) ya da üst sınır doldu (`wait`) · 7 `wait`: 150 s yeni kare yok (harness çöktü).

`--step N` (qc, frame-check, ours, contact `--fstep`): animatik kareleri (`render --step N`, dosya adı sıralı k) etkin hız `fps/N` ile ölçülür; kare sayısı ⌈N_kare/N⌉. frame-check'te yalnız piksel/ses tipleri; tasarım tipleri render'sız olduğu için `--step` olmadan tam hızda koşulur.
