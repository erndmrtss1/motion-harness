// motion-render render — .dc.html sahnelerini kare kare PNG'ye döker (kaynak hattın harness'i, proje kökü parametreli).
//
//   motion-render render P1 [P2 …]                 belirli sahneler
//   motion-render render --all [--jobs 3]          kayıttaki tüm sahneler
//   motion-render probe P1 --frame N [--eval JS]   tek kare (+ sayfada değerlendirme)
//   … --fallback                                   doğrudan gerçek zamanlı kayıt
//
// Yol: proje kökü localhost'ta servis edilir; unpkg → vendor/, Google Fonts →
// fonts/local.css + fonts/gf/. Diğer dış istekler iptal edilip loglanır.
// Her kare motorun kendi seek olayıyla (data-om-seek-to-time-frame, sync)
// verilir ve Stage svg'sinin kutusundan ekran görüntüsü alınır.
//
// GENEL KURAL: son kare t = (kare − 1)/fps'te alınır, `duration`'da değil. Çıkış tween'leri
// `duration − 1/fps`'te bitmeli ki son kare tam sonuç (ör. opacity 0) olsun.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { ffmpeg } from '../lib/ffmpeg.mjs';
import { ROOT, FPS as FPS0, WIDTH, HEIGHT, SCENES, GLYPH_SCENES, sceneById, readTimeline } from '../lib/project.mjs';
import { startServer, installRoutes, initScript } from '../lib/page.mjs';
let FPS = FPS0;
let MODULE_FAIL = false;   // sahne modülü yüklenemediyse recordVideo geri dönüşü yapılmaz (yanlış kare üretmesin)

const OUT = path.join(ROOT, 'out');
const STAGE = 'svg[data-om-exportable-video-with-duration-secs]';
const MAX_ATTEMPTS = 3;
// WATCHDOG: bir kare (seek + video senkronu + ekran görüntüsü) 45 s'de bitmezse sayfa yeniden açılır ve kare 1 kez tekrar denenir;
// yine olmazsa kare atlanır ve rapora (out/logs/<ad>.json · watchdog) yazılır. Süreç düzeyinde: kare döngüsü sürerken 120 s yeni kare
// yoksa (yeniden açma da takıldıysa) süreç kendini sonlandırır (çıkış 4).
const WD = { frameMs: 45000, stallMs: 120000 };
let WD_LAST = 0, WD_WHAT = '', WD_LOG = null;   // 0 = kare döngüsü yok (sayfa kurulumu kendi zaman aşımlarıyla korunur)
let WD_TEST = null;   // --wd-test N:once|always — N. karede seek hiç dönmez (watchdog sınaması); --wd-ms / --wd-stall eşikleri değiştirir
function wdTouch(what) { WD_LAST = Date.now(); if (what) WD_WHAT = what; }
setInterval(() => {
  if (!WD_LAST || Date.now() - WD_LAST < WD.stallMs) return;
  const msg = 'WATCHDOG: ' + Math.round((Date.now() - WD_LAST) / 1000) + ' s yeni kare yok (son: ' + WD_WHAT + ') → süreç sonlanıyor';
  try { if (WD_LOG) WD_LOG(msg); } catch { /* yut */ }
  console.error('✗ ' + msg);
  process.exit(4);
}, 5000).unref();

// ── sunucu · ağ yönlendirme · sayfa içi hazırlık: lib/page.mjs (frame-check ile tek kaynak) ──────────────────
// startServer(): proje kökü 127.0.0.1'de (Range/206) · installRoutes(): unpkg → vendor/, Google Fonts → fonts/, diğer dış istekler iptal;
//   .jsx istekleri font kapısı açılana dek bekletilir · initScript(): globaller, seek, video senkronu, font kapısı, Stage CSS.

// ── yardımcılar ───────────────────────────────────────────────────────────
function deferred() {
  let resolve; const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}
// zamanlayıcı söz yerine gelince temizlenir (yoksa süreç ms dolana kadar ayakta kalır)
function withTimeout(p, ms, what) {
  let tm;
  const to = new Promise((_, rej) => { tm = setTimeout(() => rej(new Error(what + ': ' + ms + ' ms zaman aşımı')), ms); });
  return Promise.race([p, to]).finally(() => clearTimeout(tm));
}
function frameInfo(file) {
  const buf = fs.readFileSync(file);
  const png = PNG.sync.read(buf);
  const d = png.data;
  let min = 255, max = 0;
  for (let i = 0; i < d.length; i += 4 * 97) {
    const v = d[i] + d[i + 1] + d[i + 2];
    if (v / 3 < min) min = v / 3;
    if (v / 3 > max) max = v / 3;
  }
  return { hash: crypto.createHash('md5').update(d).digest('hex'), uniform: max - min < 2 };
}
function frameDirName(scene, opts) { return scene.id + (opts && opts.tag ? '_' + opts.tag : ''); }
function sanity(dir, n, r0 = 0) {
  const pick = (f) => path.join(dir, String(r0 + Math.min(n - 1, Math.floor(n * f))).padStart(5, '0') + '.png');
  const q = [0.25, 0.5, 0.75].map((f) => pick(f)).filter((f) => fs.existsSync(f)).map(frameInfo);
  if (q.length < 2) return null;
  if (q.every((x) => x.uniform)) return 'çeyrek karelerin hepsi düz renk (boş kare)';
  if (q[0].hash === q[1].hash && q[1].hash === q[2].hash) return '%25/%50/%75 kareleri aynı (seek çalışmıyor)';
  return null;
}

// ── yol 1: seek ile kare kare ─────────────────────────────────────────────
// opts.probe = { frame, out }: yalnız o kareyi out'a yazar, kare klasörüne dokunmaz.
// opts.globals: sayfa betiklerinden önce window'a yazılır (sahnelerin probe kancaları için).
async function renderBySeek(browser, base, scene, tl, log, opts = {}) {
  const dir = path.join(OUT, 'frames', frameDirName(scene, opts));
  if (!opts.probe && !opts.resume) await fsp.rm(dir, { recursive: true, force: true });
  if (!opts.probe) await fsp.mkdir(dir, { recursive: true });

  // --scale: cihaz piksel oranı (0.5 → tam CSS px, yarım çözünürlük PNG; animatik)
  let context = null, page = null, box = null;
  const open = async () => {
    context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: opts.scale || 1 });
    page = await context.newPage();
    const gate = deferred();
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') log('console.' + m.type() + ': ' + m.text()); if (m.type() === 'error' && /FAILED to load|render error|SyntaxError/.test(m.text())) { console.log('  PAGEERROR (konsol) ' + m.text().slice(0, 300)); if (/FAILED to load|SyntaxError/.test(m.text())) MODULE_FAIL = true; } });   // modül yükleme hatası stdout'a
    page.on('pageerror', (e) => log('PAGEERROR ' + e.message));
    await page.exposeBinding('__harnessFontsReady', (_src, info) => gate.resolve(info));
    await page.addInitScript(initScript, {
      overrides: Object.assign({ checker: false }, scene.props || {}, opts.props || {}), globals: opts.globals || null,
    });
    await installRoutes(page, base, gate, log);

    const t0 = Date.now();
    await page.goto(base + '/' + encodeURIComponent(scene.file), { waitUntil: 'domcontentloaded' });
    const fonts = await withTimeout(gate.promise, 30000, 'font kapısı');
    log('fontlar: ' + JSON.stringify(fonts));

    await page.waitForSelector(STAGE, { state: 'attached', timeout: 60000 });
    const durSecs = await page.$eval(STAGE, (el) => +el.getAttribute('data-om-exportable-video-with-duration-secs'));
    if (Math.abs(durSecs * 1000 - tl.totalMs) > 1) log('UYARI: Stage süresi ' + durSecs + ' s, OM_SCENES ' + tl.totalMs + ' ms');
    await page.waitForFunction((sel) => document.querySelector(sel).getAttribute('data-om-fonts-inlined') === 'true',
      STAGE, { timeout: 20000 }).catch(() => log('UYARI: data-om-fonts-inlined gelmedi (devam)'));
    const fonts2 = await page.evaluate(() => window.__loadAllFonts());
    log('fontlar (inline sonrası): ' + JSON.stringify(fonts2));

    // Sahnenin kendi hazır sinyali: morph sahnelerinde glif sütunları çizilmiş olmalı.
    if (GLYPH_SCENES.has(scene.id)) {
      const tProbe = (tl.totalMs / 1000) * 0.8;
      let rects = 0;
      for (let k = 0; k < 25; k++) {
        rects = await page.evaluate(async ([sel, t]) => {
          window.__seek(t); await window.__raf2();
          return document.querySelector(sel).querySelectorAll('rect').length;
        }, [STAGE, tProbe]);
        if (rects >= 60) break;
        await page.waitForTimeout(200);
      }
      log('glif sondası T=' + tProbe.toFixed(2) + ' s: ' + rects + ' rect');
      if (rects < 60) throw new Error('glifler hazır değil (' + rects + ' rect)');
    }

    // Isınma: görsellerin decode'u için birkaç noktaya git, sonra kare 0.
    for (const f of [0, 0.25, 0.5, 0.75, 0.98]) {
      await page.evaluate(async (t) => { window.__seek(t); await window.__raf2(); }, (tl.totalMs / 1000) * f);
    }
    await page.evaluate(async () => { window.__seek(0); await window.__raf2(); window.__seek(0); });
    const vids = await page.evaluate(async () => {
      await window.__syncVideos();
      return [...document.querySelectorAll('video')].map((v) => ({
        src: decodeURI(v.currentSrc).split('/').pop(), ready: v.readyState, dur: v.duration, err: v.error && v.error.code,
      }));
    });
    if (vids.length) {
      log('videolar: ' + JSON.stringify(vids));
      if (vids.some((v) => v.ready < 2 || v.err)) throw new Error('video hazır değil: ' + JSON.stringify(vids));
    }

    if (scene.props) {
      const checkerOn = await page.evaluate((sel) =>
        !!document.querySelector(sel).querySelector('[style*="48px 48px"]'), STAGE);
      if (checkerOn) throw new Error('checker kapanmadı');
    }

    box = await page.$eval(STAGE, (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
    if (Math.abs(box.x) > 0.5 || Math.abs(box.y) > 0.5 || Math.abs(box.width - WIDTH) > 0.5 || Math.abs(box.height - HEIGHT) > 0.5) {
      throw new Error('Stage kutusu ' + WIDTH + '×' + HEIGHT + ' @0,0 değil: ' + JSON.stringify(box));
    }
    log('hazır: ' + (Date.now() - t0) + ' ms');
  };
  const reopen = async (why) => {
    log('WATCHDOG: ' + why + ' → sayfa yeniden açılıyor');
    await withTimeout(context.close(), 15000, 'context.close').catch((e) => log('WATCHDOG: ' + e.message));
    const tr = Date.now(); await open(); log('WATCHDOG: sayfa yeniden açıldı (' + (Date.now() - tr) + ' ms)');
  };
  // tek kare: seek + video senkronu + ekran görüntüsü, WD.frameMs zaman aşımıyla
  const shoot = (fi) => withTimeout((async () => {
    const hang = !!WD_TEST && WD_TEST.frame === fi && (WD_TEST.mode === 'always' || !WD_TEST.hit++);
    await page.evaluate(async ([t, h]) => { if (h) await new Promise(() => {}); window.__seek(t); await window.__syncVideos();
      if (window.__fxBakeSettle && await window.__fxBakeSettle()) { window.__seek(t); await window.__syncVideos(); await window.__fxBakeSettle(); } }, [(fi * 1000 / FPS) / 1000, hang]);   // pişirme önbelleği oturunca aynı kare yeniden (pişen doku aynı karede kullanılır)
    return page.screenshot({ clip: box, type: 'png' });
  })(), WD.frameMs, 'kare ' + fi);
  // zaman aşımında: sayfayı yeniden aç, 1 kez tekrar; yine olmazsa null (kare atlanır)
  const retried = [], skippedFrames = [];
  const shootGuarded = async (fi) => {
    try { return await shoot(fi); }
    catch (e) {
      retried.push(fi); log('WATCHDOG: kare ' + fi + ' · ' + e.message);
      wdTouch('kare ' + fi + ' yeniden açma'); await reopen('kare ' + fi);
      try { return await shoot(fi); }
      catch (e2) { skippedFrames.push(fi); log('WATCHDOG: kare ' + fi + ' ATLANDI · ' + e2.message); wdTouch('kare ' + fi + ' atlandı'); await reopen('atlanan kare ' + fi); return null; }
    }
  };
  try {
    await open();

    if (opts.probe) {
      const { frame, out } = opts.probe;
      // --frames a,b,c: aynı oturumda ek kareler (out adının sonuna -f<kare>), ilk kare sonra --frame olarak çekilir
      for (const fx of opts.probe.extra || []) {
        const t0x = Date.now();
        wdTouch('probe ' + fx);
        const pngx = await shootGuarded(fx);
        if (!pngx) continue;
        const ox = out.replace(/\.png$/,'-f' + String(fx).padStart(4, '0') + '.png');
        await fsp.mkdir(path.dirname(ox), { recursive: true });
        await fsp.writeFile(ox, pngx);
        console.log('  probe ' + fx + ' → ' + path.relative(ROOT, ox) + ' · ' + (Date.now() - t0x) + ' ms');
      }
      wdTouch('probe ' + frame);
      const pngp = await shootGuarded(frame);
      if (!pngp) throw new Error('probe karesi ' + frame + ' watchdog ile atlandı');
      await fsp.mkdir(path.dirname(out), { recursive: true });
      await fsp.writeFile(out, pngp);
      const info = await page.evaluate(() => (window.__probeInfo ? window.__probeInfo() : null));
      // --eval "ifade": probe karesinden sonra sayfada değerlendirilir, sonuç stdout'a (hata ayıklama)
      if (opts.evalJs) console.log('  eval → ' + JSON.stringify(await page.evaluate(opts.evalJs)));
      log('probe: kare ' + frame + ' (' + Math.round(frame * 1000 / FPS) + ' ms) → ' + path.relative(ROOT, out) +
        (opts.globals ? ' · ' + JSON.stringify(opts.globals) : '') + (opts.props ? ' · props ' + JSON.stringify(opts.props) : '') +
        (info ? ' · ' + JSON.stringify(info) : ''));
      // --bench N: sonraki N kare (T değişir → tam yeniden çizim) seek + video + ekran görüntüsü süresi
      let bench = null;
      if (opts.bench) {
        const ms = [];
        for (let k = 1; k <= opts.bench; k++) {
          const b0 = Date.now();
          await page.evaluate(async (t) => { window.__seek(t); await window.__syncVideos(); }, ((frame + k) * 1000 / FPS) / 1000);
          await page.screenshot({ clip: box, type: 'png' });
          ms.push(Date.now() - b0);
        }
        bench = { n: ms.length, avg: Math.round(ms.reduce((a, b) => a + b, 0) / ms.length), min: Math.min(...ms), max: Math.max(...ms) };
        log('bench: ' + JSON.stringify(bench) + ' ms/kare');
      }
      WD_LAST = 0;
      return { method: 'probe', frame, out, info, bench, watchdog: retried.length ? { retried, skipped: skippedFrames } : undefined };
    }

    // --step N: her N. kare (dosya adı i/N, animatik 15 fps). --resume: var olan kareler atlanır (.part → rename, çökme güvenli)
    // --range a-b: yalnız a..b kareleri (adım 1); dosya adı mutlak kare numarası (ör. P1_A/00129.png = kare 129)
    const t1 = Date.now(), step = opts.range ? 1 : opts.step || 1;
    const r0 = opts.range ? opts.range[0] : 0, n = opts.range ? opts.range[1] - opts.range[0] + 1 : Math.ceil(tl.frames / step);
    let done = 0, skipped = 0;
    wdTouch('kare döngüsü başladı');
    for (let k = 0; k < n; k++) {
      const file = path.join(dir, String(r0 + k).padStart(5, '0') + '.png');
      if (opts.resume && fs.existsSync(file) && fs.statSync(file).size > 0) { skipped++; continue; }
      // adımlı çekimde son dosya daima sahnenin son karesi (GENEL KURAL: çıkış duration − 1/30'da biter → tam siyah)
      const fi = opts.range ? r0 + k : k === n - 1 ? tl.frames - 1 : k * step;
      const tf = Date.now(), png = await shootGuarded(fi);
      wdTouch('kare ' + fi);
      if (opts.frameLog) log('kare ' + fi + ' · ' + (Date.now() - tf) + ' ms');   // kare başı süre (canlı log)
      if (!png) continue;
      await fsp.writeFile(file + '.part', png);
      await fsp.rename(file + '.part', file);
      done++;
      if (opts.progress && (done % 30 === 0 || k === n - 1)) {
        const ms = (Date.now() - t1) / done;
        console.log('  ' + scene.id + ' ' + (k + 1) + '/' + n + ' · ' + Math.round(ms) + ' ms/kare · kalan ≈ ' + ((n - k - 1) * ms / 60000).toFixed(1) + ' dk');
      }
    }
    WD_LAST = 0;
    const el = (Date.now() - t1) / 1000;
    log('kareler: ' + n + (step > 1 ? ' (her ' + step + '. kare)' : '') + ' / ' + el.toFixed(1) + ' s' + (skipped ? ' · ' + skipped + ' atlandı (resume)' : '') +
      (retried.length ? ' · WATCHDOG tekrar: ' + retried.join(',') : '') + (skippedFrames.length ? ' · WATCHDOG ATLANAN: ' + skippedFrames.join(',') : ''));
    const bad = sanity(dir, n, r0);
    if (bad) throw new Error('kare kontrolü: ' + bad);
    return { method: 'seek', frames: n, dir, msPerFrame: done ? Math.round(el * 1000 / done) : null, rendered: done, skipped,
      watchdog: { frameMs: WD.frameMs, stallMs: WD.stallMs, retried, skipped: skippedFrames } };
  } finally {
    WD_LAST = 0;
    if (context) await withTimeout(context.close(), 15000, 'context.close').catch(() => {});
  }
}

// ── yol 1b: Hyperframes kompozisyonu (GSAP, window.__timelines) ───────────
// Sahne kendi zaman çizelgesini window.__timelines[id]'e yazar; her kare
// tl.pause(); tl.seek(t, false) (onUpdate'ler çalışır) + bir rAF ile verilir.
async function renderHyperframes(browser, base, scene, tl, log, opts = {}) {
  const dir = path.join(OUT, 'frames', scene.id);
  if (!opts.probe) {
    await fsp.rm(dir, { recursive: true, force: true });
    await fsp.mkdir(dir, { recursive: true });
  }
  const id = tl.hyperframes;
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  try {
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') log('console.' + m.type() + ': ' + m.text()); if (m.type() === 'error' && /FAILED to load|render error|SyntaxError/.test(m.text())) { console.log('  PAGEERROR (konsol) ' + m.text().slice(0, 300)); if (/FAILED to load|SyntaxError/.test(m.text())) MODULE_FAIL = true; } });   // modül yükleme hatası stdout'a
    page.on('pageerror', (e) => log('PAGEERROR ' + e.message));
    const gate = deferred();
    gate.resolve(null); // .jsx modülü yok — font kapısı gerekmez
    if (opts.globals) await page.addInitScript((g) => Object.assign(window, g), opts.globals);
    // __harnessVideoSync: sahne video zamanını yalnız video.dataset.t'ye yazar; seek'i harness yapar.
    await page.addInitScript(() => { window.__timelines = window.__timelines || {}; window.__harnessVideoSync = true; });
    await installRoutes(page, base, gate, log);

    const t0 = Date.now();
    await page.goto(base + '/' + encodeURIComponent(scene.file), { waitUntil: 'load' });
    await page.waitForFunction((cid) => !!(window.gsap && window.__timelines && window.__timelines[cid]), id, { timeout: 30000 });
    const ready = await page.evaluate(async () => {
      const imgs = [...document.images];
      const ok = await Promise.all(imgs.map((i) => i.decode().then(() => true, () => false)));
      const vids = [...document.querySelectorAll('video')];
      await Promise.all(vids.map((v) => (v.readyState >= 2 ? null : new Promise((r) => {
        v.addEventListener('loadeddata', r, { once: true }); v.addEventListener('error', r, { once: true });
      }))));
      await Promise.all([...document.fonts].map((f) => f.load().catch(() => null)));
      await document.fonts.ready;
      return {
        gsap: window.gsap.version, images: imgs.length, decoded: ok.filter(Boolean).length,
        broken: imgs.filter((i) => !i.naturalWidth).map((i) => decodeURI(i.src).split('/').pop()),
        videos: vids.map((v) => ({ src: decodeURI(v.currentSrc).split('/').pop(), ready: v.readyState, dur: v.duration, err: v.error && v.error.code })),
        failedFonts: [...document.fonts].filter((f) => f.status === 'error').map((f) => f.family + ' ' + f.weight),
      };
    });
    log('hazırlık: ' + JSON.stringify(ready));
    if (ready.decoded < ready.images) throw new Error('decode edilemeyen görsel: ' + ready.broken.join(', '));
    if (ready.videos.some((v) => v.ready < 2 || v.err)) throw new Error('video hazır değil: ' + JSON.stringify(ready.videos));
    if (ready.failedFonts.length) throw new Error('yüklenemeyen font: ' + ready.failedFonts.join(', '));

    // Kare: tl.seek → sayfadaki her video dataset.t'ye seek edilir ve 'seeked' beklenir → 2 rAF.
    const seek = (t) => page.evaluate(async ([cid, tt]) => {
      const T = window.__timelines[cid];
      T.pause();
      T.seek(tt, false);
      await Promise.all([...document.querySelectorAll('video')].map((v) => {
        const vt = parseFloat(v.dataset.t);
        if (!isFinite(vt)) return null;
        if (!v.seeking && Math.abs(v.currentTime - vt) < 1e-6 && v.readyState >= 2) return null;
        return new Promise((res) => { v.addEventListener('seeked', () => res(), { once: true }); v.currentTime = vt; });
      }));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    }, [id, t]);
    for (const f of [0, 0.25, 0.5, 0.75, 0.98]) await seek((tl.totalMs / 1000) * f);
    await seek(0);

    const box = await page.$eval('#root', (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
    if (Math.abs(box.x) > 0.5 || Math.abs(box.y) > 0.5 || Math.abs(box.width - WIDTH) > 0.5 || Math.abs(box.height - HEIGHT) > 0.5) {
      throw new Error('#root kutusu ' + WIDTH + '×' + HEIGHT + ' @0,0 değil: ' + JSON.stringify(box));
    }
    log('hazır: ' + (Date.now() - t0) + ' ms · hyperframes "' + id + '"');

    if (opts.probe) {
      const { frame, out } = opts.probe;
      await seek(frame / FPS);
      await fsp.mkdir(path.dirname(out), { recursive: true });
      await fsp.writeFile(out, await page.screenshot({ clip: box, type: 'png' }));
      const info = await page.evaluate(() => (window.__probeInfo ? window.__probeInfo() : null));
      // --eval "ifade": probe karesinden sonra sayfada değerlendirilir, sonuç stdout'a (hata ayıklama)
      if (opts.evalJs) console.log('  eval → ' + JSON.stringify(await page.evaluate(opts.evalJs)));
      log('probe: kare ' + frame + ' (' + Math.round(frame * 1000 / FPS) + ' ms) → ' + path.relative(ROOT, out) +
        (info ? ' · ' + JSON.stringify(info) : ''));
      return { method: 'probe', frame, out, info };
    }

    const t1 = Date.now();
    for (let i = 0; i < tl.frames; i++) {
      await seek(i / FPS);
      await fsp.writeFile(path.join(dir, String(i).padStart(5, '0') + '.png'), await page.screenshot({ clip: box, type: 'png' }));
    }
    log('kareler: ' + tl.frames + ' / ' + ((Date.now() - t1) / 1000).toFixed(1) + ' s');
    const bad = sanity(dir, tl.frames);
    if (bad) throw new Error('kare kontrolü: ' + bad);
    return { method: 'seek', engine: 'hyperframes', frames: tl.frames, dir };
  } finally {
    await context.close();
  }
}

// ── yol 2 (fallback): gerçek zamanlı kayıt ───────────────────────────────
async function renderByRecording(browser, base, scene, tl, log) {
  const vdir = path.join(OUT, 'video', scene.id);
  await fsp.rm(vdir, { recursive: true, force: true });
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1,
    recordVideo: { dir: vdir, size: { width: WIDTH, height: HEIGHT } },
  });
  const tStart = Date.now();
  let video, offset;
  try {
    const page = await context.newPage();
    const gate = deferred();
    page.on('pageerror', (e) => log('PAGEERROR ' + e.message));
    await page.exposeBinding('__harnessFontsReady', (_src, info) => gate.resolve(info));
    await page.addInitScript(initScript, { overrides: Object.assign({ checker: false }, scene.props || {}) });
    await installRoutes(page, base, gate, log);
    await page.goto(base + '/' + encodeURIComponent(scene.file), { waitUntil: 'domcontentloaded' });
    await withTimeout(gate.promise, 30000, 'font kapısı');
    await page.waitForSelector(STAGE, { state: 'attached', timeout: 60000 });
    await page.waitForTimeout(1500);
    // Kareyi 0'a al (seek duraklatır), Space ile motorun kendi saatini başlat.
    await page.evaluate(() => window.__seek(0));
    await page.waitForTimeout(300);
    offset = (Date.now() - tStart) / 1000;
    await page.keyboard.press('Space');
    await page.waitForTimeout(tl.totalMs + 500);
    video = page.video();
  } finally {
    await context.close();
  }
  const webm = await video.path();
  const mp4 = path.join(OUT, 'scenes', scene.id + '.mp4');
  await fsp.mkdir(path.dirname(mp4), { recursive: true });
  const r = spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-ss', offset.toFixed(3), '-i', webm,
    '-t', (tl.totalMs / 1000).toFixed(3), '-r', String(FPS), '-c:v', 'libx264', '-crf', '14',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4]);
  if (r.status !== 0) throw new Error('webm → mp4: ' + r.stderr.toString());
  return { method: 'recordVideo', mp4, offset };
}

// ── sürücü ────────────────────────────────────────────────────────────────
async function renderOne(browser, base, id, forceFallback, opts = {}) {
  const scene = sceneById(id);
  const tl = readTimeline(scene.file);
  await fsp.mkdir(path.join(OUT, 'logs'), { recursive: true });
  const lines = [], LN = frameDirName(scene, opts);
  const liveLog = opts.probe ? null : path.join(OUT, 'logs', LN + '.log');   // canlı: render sürerken okunabilir
  if (liveLog) fs.writeFileSync(liveLog, '');
  const log = (s) => { const l = new Date().toISOString().slice(11, 23) + ' ' + s; lines.push(l); if (liveLog) fs.appendFileSync(liveLog, l + '\n'); };
  WD_LOG = log;
  log(scene.id + ' ← ' + scene.file + ' · ' + tl.totalMs + ' ms · ' + tl.frames + ' kare · ' +
    tl.sections.map((s) => s.name + ' ' + s.dur).join(' | '));
  // Sahne tipi: Hyperframes (GSAP timeline) ya da Design Component (.dc.html, seek olayı)
  const hf = !!tl.hyperframes;
  const renderFn = hf ? renderHyperframes : renderBySeek;
  if (opts.probe) {
    // Tek kare probe: tek deneme, fallback yok; sahnenin .log/.json kaydına dokunmaz.
    try { return Object.assign({ id: scene.id }, await renderFn(browser, base, scene, tl, log, opts)); }
    finally { await fsp.appendFile(path.join(OUT, 'logs', scene.id + '.probe.log'), lines.join('\n') + '\n'); }
  }
  let result = null, lastErr = null;
  try {
    if (!forceFallback) {
      for (let a = 1; a <= MAX_ATTEMPTS && !result; a++) {
        try { result = await renderFn(browser, base, scene, tl, log, opts); }
        catch (e) { lastErr = e; log('DENEME ' + a + ' BAŞARISIZ: ' + e.message); }
      }
    }
    if (!result && hf) log('recordVideo fallback Hyperframes için tanımlı değil — atlanıyor');
    if (!result && MODULE_FAIL) log('FALLBACK YOK: sahne modülü yüklenemedi (sözdizimi) — önce kaynağı düzelt');
    if (!result && !hf && !opts.tag && !MODULE_FAIL) {
      log('FALLBACK → recordVideo' + (lastErr ? ' (' + lastErr.message + ')' : ''));
      try { result = await renderByRecording(browser, base, scene, tl, log); }
      catch (e) { lastErr = e; log('FALLBACK BAŞARISIZ: ' + e.message); }
    }
    if (!result) {
      // Sahne atlanır; REEL onun yerine görünür bir hata boşluğu koyar.
      if (!opts.resume) await fsp.rm(path.join(OUT, 'frames', LN), { recursive: true, force: true });
      result = { method: 'atlandı', error: lastErr ? lastErr.message : 'bilinmeyen hata' };
    }
  } finally {
    log('YOL: ' + (result ? result.method : '—'));
    await fsp.writeFile(path.join(OUT, 'logs', LN + '.json'),
      JSON.stringify(Object.assign({ id: scene.id, file: scene.file, totalMs: tl.totalMs, frames: tl.frames }, result), null, 1));
  }
  return Object.assign({ id: scene.id, totalMs: tl.totalMs }, result);
}

const args = process.argv.slice(2);
const forceFallback = args.includes('--fallback');
const VALUED = new Set(['--fps', '--jobs', '--frame', '--frames', '--out', '--set', '--prop', '--bench', '--scale', '--step', '--tag', '--range', '--eval', '--wd-ms', '--wd-stall', '--wd-test']);
const argOf = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const jobs = Math.max(1, +argOf('--jobs') || 1);
// Tek kare probe: --frame N [--out yol.png] [--set AD=değer …] (değer JSON ise sayı/bool olarak)
// --prop AD=değer: .dc sahnesinin DC prop'u (SCENES props'unun üstüne; ör. --prop mode=m1)
const globals = {}, props = {};
args.forEach((a, i) => {
  if (a !== '--set' && a !== '--prop') return;
  const [k, ...v] = String(args[i + 1]).split('=');
  const dst = a === '--set' ? globals : props;
  if (a === '--prop') { dst[k] = v.join('='); return; } // prop değerleri dize (DC enum'ları)
  try { dst[k] = JSON.parse(v.join('=')); } catch { dst[k] = v.join('='); }
});
const probeFrame = argOf('--frame');
const ids = args.includes('--all') ? SCENES.map((s) => s.id)
  : args.filter((a, i) => !a.startsWith('--') && !VALUED.has(args[i - 1]));
if (!ids.length) { console.error('kullanım: motion-render render <sahne…> | --all [--jobs N] [--fallback] [--frame N --out yol.png --set AD=değer --prop AD=değer] [--scale S --step N --tag AD --resume --progress]'); process.exit(2); }
const runOpts = { globals: Object.assign({ FX_FPS: FPS }, globals), props: Object.keys(props).length ? props : null };   // sayfa kare hızını bilir (kamera hareketi/bulanıklık/klip karesi)
// --scale S (DPR) · --step N (her N. kare) · --tag AD (out/frames/<id>_<AD>) · --resume (var olan kareleri atla) · --progress
if (argOf('--scale')) runOpts.scale = +argOf('--scale');
if (argOf('--step')) runOpts.step = Math.max(1, Math.round(+argOf('--step')));
if (argOf('--tag')) runOpts.tag = argOf('--tag');
// --range a-b: yalnız a..b kareleri (ör. --range 0-512 --tag A); --tag zorunlu (tam sahne klasörü ezilmesin)
if (argOf('--range')) {
  const m = /^(\d+)-(\d+)$/.exec(argOf('--range'));
  if (!m || +m[2] < +m[1] || !runOpts.tag) { console.error('--range a-b (a ≤ b) ve --tag gerekir'); process.exit(1); }
  runOpts.range = [+m[1], +m[2]];
}
if (args.includes('--resume')) runOpts.resume = true;
// watchdog: --wd-ms N (kare zaman aşımı, varsayılan 45000) · --wd-stall N (süreç duraksama sınırı, 120000) · --wd-test KARE:once|always (sınama)
if (argOf('--wd-ms')) WD.frameMs = Math.max(1000, +argOf('--wd-ms'));
if (argOf('--wd-stall')) WD.stallMs = Math.max(5000, +argOf('--wd-stall'));
if (argOf('--wd-test')) { const m = /^(\d+)(?::(once|always))?$/.exec(argOf('--wd-test')); if (m) WD_TEST = { frame: +m[1], mode: m[2] || 'once', hit: 0 }; }
if (args.includes('--progress')) runOpts.progress = true;
if (args.includes('--frame-log')) runOpts.frameLog = true;
// Disk kuralı: tam/kesit render öncesi proje biriminde boş alan ≥ MOTION_MIN_DISK_GB (varsayılan 40; 60 fps kare ≈ 2 MB); altındaysa durur (--no-disk-check)
if (probeFrame == null && !args.includes('--no-disk-check')) { try { const minGb = +(process.env.MOTION_MIN_DISK_GB || 40), st = fs.statfsSync(ROOT), free = st.bavail * st.bsize / 1073741824; if (free < minGb) { console.error('disk: ' + free.toFixed(1) + ' GB boş < ' + minGb + ' GB — kare dizinlerini arşiv kuralına göre temizle'); process.exit(6); } } catch (e) {} }
if (argOf('--fps')) {   // --fps N yalnız --range (+ --tag) ya da probe ile: tam sahne kare sayısı manifest fps'ine bağlı
  if (!runOpts.range && probeFrame == null) { console.error('--fps yalnız --range (+ --tag) ya da --frame ile'); process.exit(1); }
  FPS = Math.max(1, +argOf('--fps')); runOpts.globals = Object.assign({}, runOpts.globals || {}, { FX_FPS: FPS });   // varsayılan manifestten; --fps yalnız kesit/test
}
if (probeFrame != null) {
  if (ids.length !== 1) { console.error('--frame yalnız tek sahneyle'); process.exit(1); }
  runOpts.probe = { frame: +probeFrame, out: path.resolve(ROOT, argOf('--out') || path.join('out', 'probe', ids[0] + '-f' + probeFrame + '.png')) };
  if (argOf('--bench')) runOpts.bench = Math.max(1, +argOf('--bench'));
  if (argOf('--eval')) runOpts.evalJs = argOf('--eval');
  if (argOf('--frames')) runOpts.probe.extra = argOf('--frames').split(',').map(Number).filter((x) => isFinite(x));
}

const srv = await startServer();
// Chromium argümanları — manifest "chromiumArgs" (sahne başı; büyük katman karo bellek sınırına takılırsa --force-gpu-mem-available-mb=4096) + MOTION_CHROMIUM_ARGS
const CH_ARGS = [...new Set([...(process.env.MOTION_CHROMIUM_ARGS || process.env.FX_CHROMIUM_ARGS || '').split(' '), ...ids.flatMap((i) => (sceneById(i) || {}).chromiumArgs || [])].filter(Boolean))];
if (CH_ARGS.length) console.log('Chromium argümanları: ' + CH_ARGS.join(' '));
const browser = await chromium.launch({ args: CH_ARGS });
const queue = [...ids];
const results = [];
async function worker() {
  while (queue.length) {
    const id = queue.shift();
    const t = Date.now();
    try {
      const r = await renderOne(browser, srv.base, id, forceFallback, runOpts);
      results.push(r);
      console.log((r.method === 'atlandı' ? '✗ ' : '✓ ') + id + ' · ' + r.method + ' · ' + (r.bench ? 'bench ' + r.bench.avg + ' ms/kare (' + r.bench.min + '–' + r.bench.max + ', n' + r.bench.n + ') · ' : '') +
        (r.frames ? r.frames + ' kare · ' : '') + (r.msPerFrame ? r.msPerFrame + ' ms/kare · ' : '') + (r.out ? path.relative(ROOT, r.out) + ' · ' : '') +
        (r.error ? r.error + ' · ' : '') + ((Date.now() - t) / 1000).toFixed(1) + ' s' +
        (r.watchdog && r.watchdog.skipped && r.watchdog.skipped.length ? ' · ⚠ WATCHDOG atlanan kareler: ' + r.watchdog.skipped.join(',') : ''));
      if (r.watchdog && r.watchdog.skipped && r.watchdog.skipped.length) process.exitCode = 5;
    } catch (e) {
      results.push({ id, error: e.message });
      console.log('✗ ' + id + ' · ' + e.message + ' (log: out/logs/' + id + '.log)');
    }
  }
}
await Promise.all(Array.from({ length: Math.min(jobs, ids.length) }, worker));
await browser.close();
srv.close();
if (results.some((r) => r.error)) process.exitCode = 1; // atlanan sahne olsa da diğerleri tamamlanır
