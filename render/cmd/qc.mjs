// motion-render qc — tek komut sahne QC → out/probe/<id>-qc.json + özet; çıkış 3 = kural ihlali (sözleşme §6)
//
//   motion-render qc <id> [--frames-dir out/frames/X] [--mp4 auto|yol] [--no-glyph] [--no-cam] [--quiet]
//   motion-render qc film [--probe DIR] [--ids a,b] · qc film --rehearsal [--ids a,b] · qc film --cuts <id> [--at f,f…]   (lib/qc-film.mjs)
//   motion-render qc k1 … · qc k6 … → `motion-render k1` / `k6` ile aynı
//
// Kontroller (manifest scenes.json + world): frames, redQuota, bordo, blackStart, layer.exit, keys, review, exceptions, contentRed,
// redExclude, hero/heroMin, profile/typeMin, band, k1, camAccel, slice, accent. World: band (ZORUNLU), classes, k1, grade.chain/burst, camera.accel.
//   kare     klasördeki kare sayısı = manifest
//   son      ham son kare max ≤ 2 (mp4 verilirse encode'da max 0); slice → muaf
//   karanlık boş/karanlık kare (ortalama luma < %8 VE %30 üstü piksel < %0.05) > 0.5 s (açılış ve sahne sonu kapanışı hariç) = HATA
//   patlama  aydınlık zincir (world.grade.chain = light ya da world.burst): luma > 250 piksel payı > %35 = HATA
//   derinlik %25/%50/%75 karelerinde merkez/kenar parlaklık oranı + Laplace keskinlik oranı; ikisi de < 1.05 = UYARI (düz kare)
//   glif     sahnenin metin düğümlerindeki ASCII dışı karakterler × kullanılan font yüzlerinin (aile + ağırlık) yüklü unicode-range'i
//   aksan    world aksan sınıfı (varsayılan signal çekirdeği) kareleri → aralık sayısı ≤ redQuota; bordo yalnız bordo: true sahnede
//   kadraj   (§5a) anahtar karelerde en büyük bağlı parlak bölge (luma > %30, 480×270, 3×3 kapanış, 8-komşu): alan ≥ %30 YA DA
//            yükseklik ≥ %50; değilse UYARI (review.kadraj → incelendi). hero:"dom" → DOM kahraman alanı; profile:"typographic" → display px
//   K1       world.k1.mask (ink | dom | alpha) ile kahraman alanı ≥ areaMin YA DA yükseklik ≥ heightMin = HATA değilse
//   metin    (§5a) anahtar karelerde görünür metin ekran px'i < 22 = UYARI ([data-doku] serbest; review.metin → incelendi)
//   boş siyah (§5a) luma < %6 piksel oranı: kontak hücresinde > %70 = UYARI, kesintisiz > 1 s = HATA
//   fade     ardışık karelerde yalnız ton/opaklık değişen bölge (kenar gradyanları aynı yönde, genlik oranı sabit ve ≠ 1) ≥ 2/30 s +
//            toplam kontrast değişimi ≥ %25 → olay (sahne sonu kapanışı serbest; review.fade → incelendi)
//   kamera   sahne __camSpeed(fps, n): ardışık (1/30 s) hız farkı ≤ camAccel.max, taban floor px/kare = UYARI
// Kare eşikleri 30 fps'te tanımlı ve KF = fps/30 ile ölçeklenir (60 fps'te ×2).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { ffmpeg } from '../lib/ffmpeg.mjs';
import { ROOT, FPS as FPS_M, KF as KF_M, WIDTH, HEIGHT, latestMp4, sceneById } from '../lib/project.mjs';
// Etkin kare hızı: animatik kareleri (render --step N: her N. kare) için `qc <id> --step N` → FPS = fps/N, KF = FPS/30, kare sayısı ⌈N/step⌉.
let FPS = FPS_M, KF = KF_M;
import { cli, worldFor, worldName, bandFor, accentFor, k1For, probeEval, PROBE_DIR, pad5 } from '../lib/qc-common.mjs';
import { W2, H2, lum480, heroContrast, heroRegion, gridMask, textRatio, JS_PAINTED, jsTextRows, jsHeroGrid } from '../lib/qc-img.mjs';
import { k1Measure } from '../lib/qc-k1.mjs';

const ARGV = process.argv.slice(2);

// alt komutlar
if (ARGV[0] === 'film') {
  const { main } = await import('../lib/qc-film.mjs');
  process.exitCode = await main(ARGV.slice(1));
} else if (ARGV[0] === 'k1' || ARGV[0] === 'k6') {
  process.argv = [process.argv[0], path.join(path.dirname(process.argv[1]), ARGV[0] + '.mjs'), ...ARGV.slice(1)];
  await import(pathToFileURL(process.argv[1]).href);
} else {
  process.exitCode = await qcScene(ARGV);
}

async function qcScene(argv) {
  const { argOf, has, pos } = cli(argv, ['--frames-dir', '--mp4', '--step']);
  const STEP = Math.max(1, Math.round(+argOf('--step') || 1));
  FPS = FPS_M / STEP; KF = FPS / 30;
  const id = pos[0];
  if (!id) { console.error('kullanım: motion-render qc <id> [--frames-dir D] [--step N] [--mp4 auto|yol] [--no-glyph] [--no-cam] [--quiet] · qc film …'); return 2; }
  let S;
  try { S = sceneById(id); } catch { console.error('manifestte yok: ' + id); return 1; }
  const WLD = worldFor(S);
  const DIR = argOf('--frames-dir') ? path.resolve(ROOT, argOf('--frames-dir')) : path.join(ROOT, 'out', 'frames', id);
  const N = Math.ceil(S.frames / STEP), quiet = has('--quiet');
  const res = { id, world: worldName(S, WLD), frames: N, step: STEP, checks: {}, errors: [], warnings: [] };
  const err = (k, m) => { res.errors.push(k + ': ' + m); }, warn = (k, m) => { res.warnings.push(k + ': ' + m); };
  const file = (f) => path.join(DIR, pad5(f) + '.png');
  const exitF = S.layer && S.layer.exit != null ? Math.floor(S.layer.exit * FPS) - 1 : N - Math.round(12 * KF);   // (#9) kapanış yedeği 12/30 s
  fs.mkdirSync(PROBE_DIR, { recursive: true });

  // aksan sınıfı (kota) + bordo + patlama (aydınlık zincir)
  const ACC = accentFor(S, WLD), isSig = ACC.test, isBor = ACC.bordo;
  const BURST = WLD && (WLD.burst || (WLD.grade && WLD.grade.chain === 'light')) ? Object.assign({ luma: 250, max: 0.35 }, WLD.burst || {}) : null;
  const HOT = BURST ? BURST.luma : 250;

  // 1) kare sayısı
  const have = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => /^\d{5}\.png$/.test(f)).length : 0;
  res.checks.frames = { have, want: N };
  if (have !== N) { err('kare', have + ' / ' + N); }

  // tek geçiş, yarım çözünürlük (960×540): ışık/kırmızı/fade ölçüleri; bellekte yalnız önceki kare (+ derinlik/anahtar kareler)
  const Y = {}, luma = [], bright = [], sig = [], sigBox = [], bor = [], hot = [], fadeLike = [0], empty = [];
  const depthF = new Set([Math.floor(N * 0.25), Math.floor(N * 0.5), Math.floor(N * 0.75)]);
  const KEYS = (S.keys && S.keys.length ? S.keys.map((f) => Math.round(f / STEP)) : [...depthF]).filter((f) => f >= 0 && f < N), keyF = new Set(KEYS);   // §5a anahtar kareler
  let prev = null;
  function fadeMetric(A, B) {   // kenar gradyanı yönü (cos), genlik oranı (mu, cv); yalnız B'de / yalnız A'da kenar payı (beliriş / kayboluş)
    let n = 0;
    for (let k = 0; k < A.length; k++) if (Math.abs(A[k] - B[k]) > 4) n++;
    if (n < 40) return null;
    let dot = 0, na = 0, nb = 0, m = 0, sumR = 0, sumR2 = 0, ne = 0, onlyA = 0, onlyB = 0, x0 = W2, y0 = H2, x1 = 0, y1 = 0;
    for (let yy = 1; yy < H2 - 1; yy++) for (let xx = 1; xx < W2 - 1; xx++) {
      const k = yy * W2 + xx;
      if (Math.abs(A[k] - B[k]) <= 4) continue;
      const ax = A[k + 1] - A[k - 1], ay = A[k + W2] - A[k - W2], bx = B[k + 1] - B[k - 1], by = B[k + W2] - B[k - W2];
      const ga = Math.hypot(ax, ay), gb = Math.hypot(bx, by);
      if (ga < 6 && gb < 6) continue;
      dot += ax * bx + ay * by; na += ga * ga; nb += gb * gb; ne++;
      if (ga < 6) onlyB++; else if (gb < 6) onlyA++; else { const r = gb / ga; sumR += r; sumR2 += r * r; m++; }
      if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy;
    }
    if (ne < 20) return null;
    const cos = dot / Math.sqrt(na * nb), mu = m ? sumR / m : 1, cv = m ? Math.sqrt(Math.max(0, sumR2 / m - mu * mu)) / mu : 9;
    return { cos: +cos.toFixed(3), mu: +mu.toFixed(3), cv: +cv.toFixed(3), m, ne, appear: onlyB / ne, vanish: onlyA / ne, box: [x0 * 2, y0 * 2, x1 * 2, y1 * 2] };
  }
  // aksan hariç kutuları: sahne window.__redExclude(fps, n) → kare başı [[x0, y0, x1, y1], …] (ekran px); kutulardaki aksan pikseli sayılmaz
  let REX = null, rexN = 0;
  if (S.redExclude) {
    const rx = probeEval(id, 0, 'JSON.stringify(window.__redExclude ? window.__redExclude(' + FPS + ', ' + N + ') : null)', '_qc-rex.png');
    REX = rx.value;
    if (!REX) warn('kırmızı hariç', 'manifest redExclude var ama sahne window.__redExclude vermedi');
  }
  const SX = WIDTH / W2, SY = HEIGHT / H2;
  for (let f = 0; f < Math.min(have, N); f++) {
    if (!fs.existsSync(file(f))) { err('kare', 'eksik ' + pad5(f) + '.png — kareler 00000\'dan sürekli olmalı (--range çıktısı mutlak numaralı; tam sahne klasörü gerekir)'); break; }
    const rexF = REX ? REX[Math.min(REX.length - 1, Math.round(f * N / Math.min(have, N)))] || [] : [], inRex = (k) => { const x = (k % W2) * SX, y = Math.floor(k / W2) * SY; for (const r of rexF) if (x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]) return true; return false; };
    const data = await sharp(file(f)).blur(0.8).resize(W2, H2, { kernel: 'cubic' }).removeAlpha().raw().toBuffer();   // hafif bulanıklık: gren gürültüsü fade ölçüsünü bozmasın
    const y = new Float32Array(W2 * H2); let s = 0, sc = 0, bc = 0, hc = 0, br = 0, eb = 0, bx0 = W2, by0 = H2, bx1 = -1, by1 = -1;   // aksan kutusu (köprü mekânsal şartı)
    for (let i = 0, k = 0; i < data.length; i += 3, k++) {
      const r = data[i], g = data[i + 1], b = data[i + 2], v = 0.2126 * r + 0.7152 * g + 0.0722 * b; y[k] = v; s += v;
      if (isSig(r, g, b)) { if (rexF.length && inRex(k)) rexN++; else { sc++; const sx = k % W2, sy = (k - sx) / W2; if (sx < bx0) bx0 = sx; if (sx > bx1) bx1 = sx; if (sy < by0) by0 = sy; if (sy > by1) by1 = sy; } }
      else if (isBor(r, g, b)) bc++;   // bordo: aksanın koyu/aydınlık kenar karışımı ve pembe ayrık
      if (v > HOT) hc++; if (v > 77) br++;   // görünür öğe: luma > %30
      if (v < 15.3) eb++;                    // boş siyah: luma < %6 (§5a)
    }
    empty.push(eb / y.length);
    luma.push(+(s / y.length / 255 * 100).toFixed(2)); bright.push(br / y.length); sig.push(sc / 4); sigBox.push(sc ? [bx0, by0, bx1, by1] : null); bor.push(sc >= 100 ? 0 : bc / 4);   // aksan olan karede bordo sayılmaz; sayılar 480×270 eşdeğeri
    hot.push(hc / y.length);   // (#1) patlama payı — kaynakta bu satır yorumun içinde kalmıştı (kontrol hiç çalışmıyordu)
    if (prev) fadeLike.push(fadeMetric(prev, y));
    if (depthF.has(f) || keyF.has(f)) Y[f] = y;
    prev = y;
  }

  // 2) son kare
  if (have === N && fs.existsSync(file(N - 1))) {
    const { data } = await sharp(file(N - 1)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let mx = 0; for (let i = 0; i < data.length; i++) if (data[i] > mx) mx = data[i];
    res.checks.lastFrame = { rawMax: mx, slice: !!S.slice };
    if (mx > 2 && !S.slice) err('son kare', 'ham max ' + mx + ' (> 2, siyah değil)');   // slice (kesit) sahne sonu değil; son kare kuralı sahnenin kendisinde
    const mp4Arg = argOf('--mp4') === 'auto' ? latestMp4(id) : argOf('--mp4');
    if (mp4Arg) {
      const png = path.join(PROBE_DIR, '_qc-last.png');
      spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', path.resolve(ROOT, mp4Arg), '-vf', "select='eq(n," + (N - 1) + ")'", '-frames:v', '1', png]);   // tam son kare (indeksle)
      const d = await sharp(png).removeAlpha().raw().toBuffer(); let m2 = 0; for (let i = 0; i < d.length; i++) if (d[i] > m2) m2 = d[i];
      fs.rmSync(png, { force: true }); res.checks.lastFrame.mp4Max = m2; if (m2 > 0 && !S.slice) err('son kare', 'mp4 max ' + m2);
    }
  }

  // 3) karanlık / patlama
  const openF = S.blackStart ? Math.round(15 * KF) : 0, runs = [];
  let r0 = null;
  for (let f = 0; f <= luma.length; f++) {
    const dark = f < luma.length && f >= openF && f < exitF && luma[f] < 8 && bright[f] < 0.0005;   // boş/karanlık kare: ortalama düşük VE görünür parlak öğe yok (boşluk üstü tipografi geçer)
    if (dark && r0 == null) r0 = f;
    if (!dark && r0 != null) { if (f - r0 > 15 * KF) runs.push([r0, f - 1]); r0 = null; }
  }
  res.checks.darkness = luma.length ? { mean: +(luma.reduce((a, b) => a + b, 0) / luma.length).toFixed(2), min: Math.min(...luma), runs } : { mean: null, min: null, runs };
  const REV = S.review || {}, revd = (list, a, b) => (list || []).find((r) => a <= r[1] && b >= r[0]);   // manifest review: elle incelenmiş aralık [a, b, gerekçe]
  const darkBad = runs.filter((r) => !revd(REV.dark, r[0], r[1]));
  runs.filter((r) => revd(REV.dark, r[0], r[1])).forEach((r) => warn('karanlık (incelendi)', 'f' + r[0] + '–' + r[1] + ': ' + revd(REV.dark, r[0], r[1])[2]));
  if (darkBad.length) err('karanlık', '%8 altı > ' + Math.round(15 * KF) + ' kare: ' + darkBad.map((r) => 'f' + r[0] + '–' + r[1]).join(', '));
  if (BURST && hot.length) { const hmax = Math.max(...hot); res.checks.clip = { maxHot: +hmax.toFixed(3), luma: BURST.luma, max: BURST.max }; if (hmax > BURST.max) err('patlama', '%' + Math.round(BURST.luma / 2.55) + ' üstü piksel ' + (hmax * 100).toFixed(1) + '%'); }

  // 3b) §5a kadraj ve boş siyah
  // hero: "dom" → kahraman koyu (ör. cam kartlar): parlak bölge yerine [data-hero] öğelerinin ekrandaki birleşik alanı (glif adımında, DOM)
  const K1 = k1For(S, WLD);
  const HERO_DOM = S.hero === 'dom', BAND = bandFor(S, WLD), TYPO = BAND.typo, TYPE_MIN = S.typeMin || 72;   // tipografik profil: kadraj = okunacak display metin ≥ typeMin px
  const kadraj = HERO_DOM ? [] : KEYS.filter((f) => Y[f]).map((f) => Object.assign({ f }, heroRegion(Y[f])));
  kadraj.forEach((k) => { k.ok = k.area >= 0.30 || k.height >= 0.50; });
  res.checks.kadraj = kadraj;
  // K1 (SERT): kahraman = world.k1.mask ölçüsü (ink: mürekkep/nesne maskesi, kâğıt değil); k1.keys verilmişse yalnız o karelerde
  if (K1.enabled) {
    const kf = (K1.keys ? K1.keys.map((f) => Math.round(f / STEP)) : KEYS).filter((f) => f >= 0 && f < N);
    if (kf.length) {
      try {
        const ik = await k1Measure(id, kf, K1, FPS); res.checks.k1 = ik;
        const th = '(eşik %' + Math.round(K1.areaMin * 100) + ' / %' + Math.round(K1.heightMin * 100) + ')';
        ik.filter((k) => !k.ok).forEach((k) => { const r = revd(REV.kadraj, k.f, k.f), m = 'f' + k.f + ' K1 kahraman (' + (K1.mask === 'ink' ? 'mürekkep' : K1.mask) + ' maskesi) alan %' + Math.round(k.area * 100) + ' / yükseklik %' + Math.round(k.height * 100) + ' ' + th; if (r) warn('K1 (incelendi)', m + ': ' + r[2]); else err('K1 kahraman', m); });
      } catch (e) { err('K1 kahraman', 'ölçülemedi: ' + e.message); }
    }
  }
  function kadrajWarn(k) {
    const r = revd(REV.kadraj, k.f, k.f), m = k.type != null ? 'f' + k.f + ' tipografik kadraj: en büyük okunacak display metin ' + k.type + ' px (eşik ' + TYPE_MIN + ' px)' :
      'f' + k.f + ' kahraman alan %' + Math.round(k.area * 100) + ' / yükseklik %' + Math.round(k.height * 100) + ' (eşik %30 / %50' + (k.need ? '; sahne eşiği %' + Math.round(k.need * 100) + ' alan' : '') + ')';
    if (r) warn('kadraj (incelendi)', m + ': ' + r[2]); else warn('kadraj', m);
  }
  kadraj.filter((k) => !k.ok).forEach(kadrajWarn);
  function contrastWarn(k) { // kahraman − çevre ≥ 25/255 (1.4.1); açık dünyada kahraman koyu mürekkep → fark negatif; eşik mutlak değerde
    if (!k.contrast || Math.abs(k.contrast.diff) >= 25) return;
    const r = revd(REV.kontrast, k.f, k.f), m = 'f' + k.f + ' kahraman ' + k.contrast.hero + ' − çevre ' + k.contrast.ring + ' = ' + k.contrast.diff + ' (< 25/255)';
    if (r) warn('kahraman kontrastı (incelendi)', m + ': ' + r[2]); else warn('kahraman kontrastı', m);
  }
  kadraj.forEach(contrastWarn);
  // parlaklık bandı (1.4.1): sahne ortalaması (açılış/kapanış hariç) world bandında (world.band ZORUNLU)
  const band = BAND.band, bandName = BAND.name;
  if (!band) err('bant', 'world.band tanımlı değil' + (WLD ? '' : ' (world bulunamadı: scenes.json "world" ya da world/world.json)'));
  else if (luma.length) {
    const win = luma.slice(openF, Math.max(openF + 1, exitF)), bm = +(win.reduce((a, b) => a + b, 0) / win.length).toFixed(2);
    const cells = []; for (let f = openF; f < exitF && f < luma.length; f += Math.round(12 * KF)) if (luma[f] < band[0] || luma[f] > band[1]) cells.push(f);
    res.checks.band = { world: bandName, band, mean: bm, cellsOut: cells.length, cells: Math.ceil((exitF - openF) / Math.round(12 * KF)) };
    if (bm < band[0] || bm > band[1]) warn('parlaklık bandı', 'ortalama %' + bm + ' bandın dışında (' + bandName + ' %' + band[0] + '–' + band[1] + '); kontak hücresi dışarıda: ' + cells.length + '/' + res.checks.band.cells);
  }
  const ebIn = (f) => f >= openF && f < exitF && empty[f] > 0.70, ebCells = [], ebRuns = [];
  for (let f = 0; f < empty.length; f += Math.round(12 * KF)) if (ebIn(f)) ebCells.push(f);   // (#9) hücre adımı 12/30 s (kaynakta KF'siz 12 kare)
  r0 = null;
  for (let f = 0; f <= empty.length; f++) {
    const on = f < empty.length && ebIn(f);
    if (on && r0 == null) r0 = f;
    if (!on && r0 != null) { if (f - r0 > 30 * KF) ebRuns.push([r0, f - 1]); r0 = null; }
  }
  res.checks.emptyBlack = { maxRatio: +Math.max(0, ...empty.slice(openF, exitF)).toFixed(3), cells: ebCells, runs: ebRuns };
  if (ebRuns.length) err('boş siyah', '> %70 kesintisiz > 1 s: ' + ebRuns.map((r) => 'f' + r[0] + '–' + r[1]).join(', '));
  else if (ebCells.length) warn('boş siyah', 'kontak hücresinde > %70: ' + ebCells.map((f) => 'f' + f + ' %' + Math.round(empty[f] * 100)).join(', '));

  // 4) derinlik (merkez / kenar)
  const depth = [];
  for (const f of [...depthF].sort((a, b) => a - b)) {
    const y = Y[f]; if (!y) continue;
    let cS = 0, cN = 0, eS = 0, eN = 0, cL = 0, eL = 0;
    for (let yy = 1; yy < H2 - 1; yy += 2) for (let xx = 1; xx < W2 - 1; xx += 2) {
      const k = yy * W2 + xx, lap = Math.abs(4 * y[k] - y[k - 1] - y[k + 1] - y[k - W2] - y[k + W2]);
      const cx = Math.abs(xx - W2 / 2) / (W2 / 2), cy = Math.abs(yy - H2 / 2) / (H2 / 2);
      if (cx < 0.45 && cy < 0.45) { cS += y[k]; cL += lap * lap; cN++; } else if (cx > 0.8 || cy > 0.8) { eS += y[k]; eL += lap * lap; eN++; }
    }
    const lum = (cS / cN + 1) / (eS / eN + 1), sharpR = (cL / cN + 1) / (eL / eN + 1);
    depth.push({ f, lum: +lum.toFixed(2), sharp: +sharpR.toFixed(2) });
    if (lum < 1.05 && sharpR < 1.05) warn('derinlik', 'f' + f + ' düz (merkez/kenar ' + lum.toFixed(2) + ', keskinlik ' + sharpR.toFixed(2) + ')');
  }
  res.checks.depth = depth;

  // 5) aksan (kırmızı) — kota world aksan sınıfıyla
  const sigRanges = [], borFrames = [], sigOn = sig.map((v) => v >= 25), bridged = [];
  // < 2·KF karelik boşluk (iki yanı aksan) aralığı bölmez — ince çizginin alt-piksel evresi tek karede eşiğin altına düşürebilir; iki yanın kutuları örtüşmeli (8 px pay)
  for (let f = 1, g0 = -1; f < sigOn.length; f++) { if (!sigOn[f] && sigOn[f - 1]) g0 = f; if (sigOn[f] && g0 >= 0) { const A = sigBox[g0 - 1], B = sigBox[f], near = A && B && A[0] - 8 <= B[2] && B[0] - 8 <= A[2] && A[1] - 8 <= B[3] && B[1] - 8 <= A[3]; if (f - g0 < 2 * KF && near) { for (let j = g0; j < f; j++) sigOn[j] = true; bridged.push([g0, f - 1]); } g0 = -1; } }
  r0 = null;
  for (let f = 0; f <= sig.length; f++) {
    const on = f < sig.length && sigOn[f];
    if (on && r0 == null) r0 = f;
    if (!on && r0 != null) { if (f - r0 >= 2 * KF) sigRanges.push([r0, f - 1]); r0 = null; }
    if (f < bor.length && f < exitF && bor[f] >= 60 && (bor[f - 1] >= 60 || bor[f + 1] >= 60)) borFrames.push(f);   // tek kare kırıntısı ve sahne sonu karışımı sayılmaz
  }
  res.checks.red = { quota: S.redQuota, accent: ACC.name, signalRanges: sigRanges, bridged: bridged, bordoFrames: borFrames.length, bordoAllowed: !!S.bordo, excluded: S.redExclude ? { note: S.redExclude, pixels: rexN } : undefined };
  if (S.contentRed && sigRanges.length > S.redQuota) warn('kırmızı (içerik, muaf)', sigRanges.length + ' aralık > hak ' + S.redQuota + ' — görsel içeriği (contentRed)');
  else if (sigRanges.length > S.redQuota) err('kırmızı', sigRanges.length + ' aralık > hak ' + S.redQuota + ' (' + sigRanges.map((r) => 'f' + r[0] + '–' + r[1]).join(', ') + ')');
  const EXC = (S.exceptions && S.exceptions.bordo) || [], borExc = borFrames.filter((f) => EXC.some((e) => f >= e[0] && f <= e[1])), borRest = borFrames.filter((f) => !borExc.includes(f));
  if (!S.bordo && borExc.length) warn('bordo (kayıtlı istisna)', borExc.length + ' kare f' + borExc[0] + '–' + borExc[borExc.length - 1] + ': ' + EXC[0][2]);
  borFrames.length = 0; borRest.forEach((f) => borFrames.push(f));
  if (!S.bordo && S.contentRed && borFrames.length) { warn('bordo (içerik, muaf)', borFrames.length + ' kare — görsel içeriği (contentRed)'); borFrames.length = 0; }
  if (!S.bordo && borFrames.length) err('bordo', borFrames.length + ' karede bordo' + (S.chapter != null ? ' (bölüm ' + S.chapter + ')' : '') + ': f' + borFrames[0] + '–' + borFrames[borFrames.length - 1]);

  // 6) fade tespiti (ölçü yukarıda, tek geçişte)
  const isFade = (q) => q && q.m >= 12 && q.cos > 0.96 && q.cv < 0.15 && Math.abs(q.mu - 1) > 0.03;
  const fades = [];
  for (let f = 1; f < fadeLike.length; ) {
    if (!isFade(fadeLike[f])) { f++; continue; }
    let a = f, b = f, lnP = 0; const boxes = [];
    while (b < fadeLike.length && isFade(fadeLike[b])) { lnP += Math.log(fadeLike[b].mu); boxes.push(fadeLike[b].box); b++; }
    b--;
    if (a > 1 && fadeLike[a - 1] && fadeLike[a - 1].appear > 0.6) { a--; boxes.push(fadeLike[a].box); lnP += Math.log(2); }      // beliriş karesi (yoktan)
    if (b + 1 < fadeLike.length && fadeLike[b + 1] && fadeLike[b + 1].vanish > 0.6) { b++; boxes.push(fadeLike[b].box); lnP -= Math.log(2); }
    if (b - a + 1 >= 2 * KF && Math.abs(lnP) >= Math.log(1.25)) {
      const bx = [Math.min(...boxes.map((q) => q[0])), Math.min(...boxes.map((q) => q[1])), Math.max(...boxes.map((q) => q[2])), Math.max(...boxes.map((q) => q[3]))];
      fades.push({ from: a, to: b, t: [+(a / FPS).toFixed(2), +(b / FPS).toFixed(2)], box: bx, contrast: +Math.exp(lnP).toFixed(2), exit: a >= exitF });
    }
    f = b + 1;
  }
  res.checks.fade = fades;
  const badFades = fades.filter((x) => !x.exit && !revd(REV.fade, x.from, x.to));
  fades.forEach((x) => { if (!x.exit && revd(REV.fade, x.from, x.to)) x.reviewed = true; });
  fades.filter((x) => x.reviewed).forEach((x) => warn('fade (incelendi)', 'f' + x.from + '–' + x.to + ': ' + revd(REV.fade, x.from, x.to)[2]));
  if (badFades.length) err('fade', badFades.map((x) => 'f' + x.from + '–' + x.to + ' [' + x.box.join(',') + ']').join(' · ') + ' (incele: renk/ışık geçişi olabilir)');

  // 7) glif + metin + DOM kahraman (sahnenin kendisinden; 4 zamanda + anahtar karelerde)
  if (!has('--no-glyph')) {
    const ts = [0.2, 0.45, 0.7, 0.92].map((q) => +(q * (N - 1) / FPS).toFixed(3)), kts = KEYS.map((f) => +(f / FPS).toFixed(4));
    const js = `(async function(){var ts=${JSON.stringify(ts)},kts=${JSON.stringify(kts)},chars={},bad={},txt=[];
var seek=function(t){ if(window.__seek){window.__seek(t);} else if(window.__timelines){var k=Object.keys(window.__timelines)[0];var tl=window.__timelines[k];tl.pause();tl.seek(t,false);} };
var raf=function(){return new Promise(function(r){requestAnimationFrame(function(){requestAnimationFrame(r)})})};
var tg=ts.concat(kts); for(var i=0;i<tg.length;i++){ seek(tg[i]); await raf();
 var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null),n;
 while(n=w.nextNode()){ var tx=n.nodeValue; if(!tx||!/[^\\x00-\\x7F]/.test(tx)) continue; var el=n.parentElement; if(!el) continue; var cs=getComputedStyle(el);
  if(cs.display==='none'||cs.visibility==='hidden') continue;
  var fam=cs.fontFamily.split(',')[0].replace(/["']/g,'').trim(), wt=cs.fontWeight;
  for(var c of tx){ if(c.charCodeAt(0)>127&&c.trim()) { var key=fam+'|'+wt; (chars[key]=chars[key]||{})[c]=1; } } } }
${JS_PAINTED}
for(var j=0;j<kts.length;j++){ seek(kts[j]); await raf(); ${jsTextRows(40)}
 ${jsHeroGrid(K1.selector)}
 var hn=0; for(var q=0;q<hg.length;q++) hn+=hg[q];
 var hs=''; for(var q2=0;q2<hg.length;q2++) hs+=hg[q2];
 txt.push({t:kts[j], rows:rows, hero:{area:+(hn/hg.length).toFixed(3), height:+(hy1>=hy0?(hy1-hy0+1)/108:0).toFixed(3), grid:hn?hs:''}}); }
var faces=[...document.fonts];
Object.keys(chars).forEach(function(key){ var p=key.split('|'), fam=p[0], wt=+p[1];
 var fs=faces.filter(function(f){return f.family.replace(/["']/g,'')===fam});
 if(!fs.length){ bad[key]=Object.keys(chars[key]).join('')+' (yüz yok — yedek font)'; return; }
 var best=fs.map(function(f){var w=String(f.weight).split(' ').map(Number);var d=w.length>1?(wt>=w[0]&&wt<=w[1]?0:Math.min(Math.abs(wt-w[0]),Math.abs(wt-w[1]))):Math.abs(wt-w[0]);return {f:f,d:d}}).sort(function(a,b){return a.d-b.d});
 var dmin=best[0].d, cand=best.filter(function(b){return b.d===dmin}).map(function(b){return b.f});
 var miss=Object.keys(chars[key]).filter(function(ch){var cp=ch.codePointAt(0);return !cand.some(function(f){return f.status==='loaded'&&f.unicodeRange.split(',').some(function(r){var m=r.trim().replace(/U\\+/i,'').split('-');var a=parseInt(m[0].replace(/\\?/g,'0'),16),b=m[1]?parseInt(m[1],16):parseInt(m[0].replace(/\\?/g,'F'),16);return cp>=a&&cp<=b})})});
 if(miss.length) bad[key]=miss.join('');});
return JSON.stringify({txt:txt,chars:Object.fromEntries(Object.entries(chars).map(function(e){return [e[0],Object.keys(e[1]).join('')]})),missing:bad});})()`;
    const rr = probeEval(id, Math.floor(N / 2), js, '_qc-glyph.png');
    if (!rr.found) warn('glif', 'ölçülemedi (' + rr.tail + ')');
    else {
      const g = rr.value;
      const txt = g.txt || []; delete g.txt;
      res.checks.glyph = g;
      const miss = Object.entries(g.missing); if (miss.length) err('glif', miss.map(([k, v]) => k + ': ' + v).join(' · '));
      // §5a kadraj (hero: "dom"): [data-hero] birleşik alanı; sahne eşiği manifest heroMin (yoksa %30 alan / %50 yükseklik)
      if (HERO_DOM) {
        txt.forEach((q, i) => {
          if (!q.hero) return;
          const k = { f: KEYS[i], area: q.hero.area, height: q.hero.height, dom: true, need: S.heroMin || null };
          k.ok = S.heroMin ? k.area >= S.heroMin : (k.area >= 0.30 || k.height >= 0.50);
          if (TYPO) { const vp = q.rows.filter((r) => !(r[6] < 0.5)).map((r) => r[1]); k.type = vp.length ? Math.max(...vp) : 0; k.ok = k.type >= TYPE_MIN; }   // tipografik: alan değil metin boyu
          if (q.hero.grid && Y[k.f]) k.contrast = heroContrast(lum480(Y[k.f]), gridMask(q.hero.grid));   // DOM ızgarası → 480×270 maske → kahraman/çevre kontrastı
          res.checks.kadraj.push(k); if (!k.ok) kadrajWarn(k); contrastWarn(k);
        });
      }
      // §5a metin kontrastı (1.4.1): render edilmiş karede metin kutusu → WCAG oranı ≥ 4.5:1
      res.checks.contrast = [];
      for (let i = 0; i < txt.length; i++) {
        const f = KEYS[i], q = txt[i]; if (!q || !q.rows.length || !fs.existsSync(file(f))) continue;
        const { data, info } = await sharp(file(f)).removeAlpha().raw().toBuffer({ resolveWithObject: true }), out = [];
        for (const r of q.rows) {
          if (r[6] < 0.5) continue;   // örtülü (başka öğe üstte, elementFromPoint): okunması beklenmez
          const ratio = textRatio(data, info.width, info.height, r); if (ratio == null) continue;
          out.push([r[0], +ratio.toFixed(2)]);
        }
        const low = out.filter((o) => o[1] < 4.5).sort((a, b) => a[1] - b[1]);
        res.checks.contrast.push({ f, n: out.length, min: out.length ? Math.min(...out.map((o) => o[1])) : null, low: low.slice(0, 12), lowN: low.length });
        if (low.length) { const rv = revd(REV.kontrast, f, f), m = 'f' + f + ' ' + low.length + '/' + out.length + ' metin < 4.5:1 (en düşük ' + low.slice(0, 3).map((o) => '"' + o[0] + '" ' + o[1]).join(', ') + ')';
          if (rv) warn('metin kontrastı (incelendi)', m + ': ' + rv[2]); else warn('metin kontrastı', m); }
      }
      // §5a okunurluk: anahtar karelerde ekranda < 22 px metin (data-doku hariç)
      res.checks.text = txt.map((q, i) => {
        const f = KEYS[i], rs = q.rows.filter((r) => !(r[6] < 0.5)), px = rs.map((r) => r[1]), small = rs.filter((r) => r[1] < 22).sort((a, b) => a[1] - b[1]);
        return { f, n: rs.length, hidden: q.rows.length - rs.length, min: px.length ? Math.min(...px) : null, small: small.slice(0, 12), smallN: small.length };
      });
      res.checks.text.filter((q) => q.smallN).forEach((q) => {
        const r = revd(REV.metin, q.f, q.f), m = 'f' + q.f + ' ' + q.smallN + '/' + q.n + ' metin < 22 px (en küçük ' + q.min + ' px: ' + q.small.slice(0, 3).map((s) => '"' + s[0] + '" ' + s[1]).join(', ') + ')';
        if (r) warn('metin (incelendi)', m + ': ' + r[2]); else warn('metin', m);
      });
    }
  }

  // 8) kamera ivmesi: ardışık (1/30 s) kamera hızı farkı ≤ max (sahne window.__camSpeed(fps, n): kare başı ortalama ekran hareketi, px).
  //    Taban: iki kare de < floor px/kare ise ölçülmez (durağandan kalkış). Aşan kare UYARI. Eşik: sahne camAccel > world.camera.accel > 0.15 / 2.
  if (!has('--no-cam')) {
    const CA = Object.assign({ max: 0.15, floor: 2 }, (WLD && WLD.camera && WLD.camera.accel) || {}, S.camAccel || {});
    const r2 = probeEval(id, 0, 'JSON.stringify(window.__camSpeed ? window.__camSpeed(' + FPS + ', ' + N + ') : null)', '_qc-cam.png');
    const v = r2.value;
    if (v && v.length > 2) {
      const bad = []; let maxRel = 0;
      const wn = Math.max(1, Math.round(KF));   // ivme penceresi 1/30 s (60 fps'te 2 kare): v[i] ↔ v[i − wn]
      for (let i = wn + 1; i < v.length; i++) { const mx = Math.max(v[i], v[i - wn]); if (mx < CA.floor) continue; const rel = Math.abs(v[i] - v[i - wn]) / mx; if (rel > maxRel) maxRel = rel; if (rel > CA.max) bad.push(i); }
      const cruns = []; bad.forEach((f) => { const L = cruns[cruns.length - 1]; if (L && f - L[1] <= wn) L[1] = f; else cruns.push([f, f]); });
      res.checks.camAccel = { max: CA.max, floor: CA.floor, peak: +Math.max(...v).toFixed(2), maxRel: +maxRel.toFixed(3), frames: bad.length, runs: cruns, speed: v };
      if (cruns.length) warn('kamera ivmesi', bad.length + ' kare, ' + cruns.length + ' aralık > %' + Math.round(CA.max * 100) + ' (taban ' + CA.floor + ' px/kare, en yüksek %' + Math.round(maxRel * 100) + '): ' + cruns.map((r) => 'f' + r[0] + (r[1] > r[0] ? '–' + r[1] : '')).join(' '));
    } else if (!r2.found) warn('kamera ivmesi', 'ölçülemedi');
  }

  fs.writeFileSync(path.join(PROBE_DIR, id + '-qc.json'), JSON.stringify(Object.assign(res, { luma, bright, signal: sig, bordo: bor }), null, 0));
  const c = res.checks;
  if (!quiet) {
    console.log(id + ' · ' + res.world + ' · kare ' + c.frames.have + '/' + N + ' · son kare ' + (c.lastFrame ? c.lastFrame.rawMax + (c.lastFrame.mp4Max != null ? ' (mp4 ' + c.lastFrame.mp4Max + ')' : '') : '—') +
      ' · parlaklık ort %' + c.darkness.mean + ' en düşük %' + c.darkness.min +
      ' · derinlik ' + c.depth.map((d) => d.lum + '/' + d.sharp).join(' ') +
      ' · kırmızı ' + c.red.signalRanges.length + '/' + S.redQuota + ' aralık, bordo ' + c.red.bordoFrames + ' kare' +
      ' · fade ' + badFades.length + (fades.some((x) => x.exit) ? ' (+' + fades.filter((x) => x.exit).length + ' sahne sonu)' : '') + (fades.length - badFades.length - fades.filter((x) => x.exit).length ? ' (+' + (fades.length - badFades.length - fades.filter((x) => x.exit).length) + ' incelendi)' : '') +
      (c.glyph ? ' · glif ' + Object.values(c.glyph.chars).join('').split('').filter((x, i, a) => a.indexOf(x) === i).join('') + (Object.keys(c.glyph.missing).length ? ' EKSİK' : ' ✓') : ''));
    console.log('  §5a kadraj (' + (TYPO ? 'tipografik: display px' : 'alan/yükseklik') + ') ' + (c.kadraj || []).map((k) => 'f' + k.f + ' ' + (k.type != null ? k.type + ' px' : '%' + Math.round(k.area * 100) + '/%' + Math.round(k.height * 100)) + (k.ok ? ' ✓' : ' ✗')).join(' · ') +
      (c.k1 ? ' | K1 ' + c.k1.map((k) => 'f' + k.f + ' %' + Math.round(k.area * 100) + '/%' + Math.round(k.height * 100) + (k.ok ? ' ✓' : ' ✗')).join(' · ') : '') +
      (c.text ? ' | metin en küçük ' + c.text.map((q) => 'f' + q.f + ' ' + (q.min == null ? '—' : q.min + ' px') + (q.smallN ? ' ✗' : ' ✓')).join(' · ') : '') +
      ' | boş siyah en çok %' + Math.round(c.emptyBlack.maxRatio * 100) + (c.emptyBlack.runs.length ? ' ✗' : c.emptyBlack.cells.length ? ' (uyarı)' : ' ✓'));
    console.log('  1.4.1 kontrast: kahraman−çevre ' + (c.kadraj || []).map((k) => 'f' + k.f + ' ' + (k.contrast ? k.contrast.diff + (Math.abs(k.contrast.diff) >= 25 ? ' ✓' : ' ✗') : '—')).join(' · ') +
      (c.contrast ? ' | metin en düşük ' + c.contrast.map((q) => 'f' + q.f + ' ' + (q.min == null ? '—' : q.min + ':1') + (q.lowN ? ' ✗' : ' ✓')).join(' · ') : '') +
      (c.band ? ' | bant ' + c.band.world + ' %' + c.band.band.join('–') + ': ort %' + c.band.mean + (c.band.mean < c.band.band[0] || c.band.mean > c.band.band[1] ? ' ✗' : ' ✓') : '') +
      (c.camAccel ? ' | kamera tepe ' + c.camAccel.peak + ' px/kare, ivme en çok %' + Math.round(c.camAccel.maxRel * 100) : ''));
    if (WLD && WLD.legacy) console.log('  world "' + WLD.name + '": eski biçim (ad, world dosyası yok) → gömülü kaynak değerleri');   // ilk satır özet kalır (run)
    if (res.errors.length) console.log('  HATA: ' + res.errors.join('\n  HATA: '));
    if (res.warnings.length) console.log('  uyarı: ' + res.warnings.join('\n  uyarı: '));
  }
  return res.errors.length ? 3 : 0;
}
