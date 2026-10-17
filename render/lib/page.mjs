// lib/page.mjs — süreç içi sayfa API'si: sahne sayfasını harness'le aynı yoldan açar ve bir geri çağırmaya verir.
//
//   import { withPage } from '../lib/page.mjs';
//   await withPage('P1', { globals, props, hooks: ['hooks/p1.js'], warm: false }, async (page, api) => {
//     const v = await api.eval(() => window.__camSpeed(60));
//   });
//
// api: { scene, tl, fps, frames, eval(fn, arg), seek(t), shot(frame) → PNG Buffer, inject(files) → {loaded, missing}, has(name), log[] }
// Yol (cmd/render.mjs ile aynı): proje kökü 127.0.0.1'de servis edilir; unpkg → vendor/, Google Fonts → fonts/local.css + fonts/gf/,
// diğer dış istekler iptal; initScript (props, globals, seek, font kapısı); .jsx modülleri fontlar yüklenene kadar bekletilir.
// Bu parçalar cmd/render.mjs'teki sayfa açma yolunun kopyasıdır (render.mjs dışa aktarmadığı için); render.mjs ileride bunları
// buradan içe aktaracak biçimde sadeleştirilebilir. Değişiklik iki yerde birlikte yapılmalı.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { ROOT, FPS, WIDTH, HEIGHT, sceneById, readTimeline } from './project.mjs';

export const STAGE = 'svg[data-om-exportable-video-with-duration-secs]';
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jsx': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm',
};

// ── statik sunucu (Range destekli) ─────────────────────────────────────────
export function startServer(root = ROOT) {
  const server = http.createServer((req, res) => {
    let rel; try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { rel = '/'; }
    const file = path.join(root, rel);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404).end(); return; }
      const head = { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' };
      const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
      if (m) {
        const start = m[1] ? +m[1] : buf.length - +m[2], end = m[1] && m[2] ? Math.min(+m[2], buf.length - 1) : buf.length - 1;
        if (start >= buf.length || start > end) { res.writeHead(416, { 'Content-Range': 'bytes */' + buf.length }).end(); return; }
        res.writeHead(206, Object.assign(head, { 'Content-Range': 'bytes ' + start + '-' + end + '/' + buf.length, 'Content-Length': end - start + 1 }));
        res.end(buf.subarray(start, end + 1)); return;
      }
      res.writeHead(200, head); res.end(buf);
    });
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({
    base: 'http://127.0.0.1:' + server.address().port,
    close: () => { if (server.closeAllConnections) server.closeAllConnections(); server.close(); },
  })));
}

// ── ağ yönlendirme ─────────────────────────────────────────────────────────
const CORS = { 'access-control-allow-origin': '*' };
export async function installRoutes(page, base, gate, log, root = ROOT) {
  const mapFile = path.join(root, 'fonts', 'gf', 'map.json'), GF = fs.existsSync(mapFile) ? JSON.parse(fs.readFileSync(mapFile, 'utf8')) : {};
  await page.route('**/*', async (route) => {
    const u = new URL(route.request().url());
    if (u.origin === base) { if (u.pathname.endsWith('.jsx')) await gate.promise; return route.continue(); }
    let file = null, type = null;
    if (u.hostname === 'unpkg.com') { file = path.join(root, 'vendor', decodeURIComponent(u.pathname)); type = 'text/javascript'; }
    else if (u.hostname === 'fonts.googleapis.com' && u.pathname.startsWith('/css')) { file = path.join(root, 'fonts', 'local.css'); type = 'text/css'; }
    else if (u.hostname === 'fonts.googleapis.com' && u.pathname.startsWith('/gf/')) { file = path.join(root, 'fonts', 'gf', path.basename(u.pathname)); type = 'font/woff2'; }
    else if (u.hostname === 'fonts.gstatic.com' && GF[u.pathname]) { file = path.join(root, 'fonts', 'gf', GF[u.pathname]); type = 'font/woff2'; }
    else if (u.hostname === 'cdn.jsdelivr.net' && u.pathname.startsWith('/npm/')) { file = path.join(root, 'vendor', decodeURIComponent(u.pathname.slice(5))); type = 'text/javascript'; }
    if (file && fs.existsSync(file)) return route.fulfill({ status: 200, contentType: type, headers: CORS, body: fs.readFileSync(file) });
    log('ABORT (dış istek) ' + u.href);
    return route.abort();
  });
}

// ── sayfa içi hazırlık (addInitScript; cmd/render.mjs initScript ile aynı) ──
export function initScript({ overrides, globals }) {
  if (globals) Object.assign(window, globals);
  try { localStorage.setItem('animstage-v3:t', '0'); } catch (e) { /* yok */ }
  window.__harnessVideoSync = true;
  const once = (v, evs) => new Promise((r) => evs.forEach((e) => v.addEventListener(e, r, { once: true })));
  window.__syncVideos = async function () {
    const vids = [...document.querySelectorAll('video')].filter((v) => isFinite(parseFloat(v.dataset.t)));
    if (!vids.length) {
      if (window.__waitRaf) { const n = typeof window.__waitRaf === 'number' ? window.__waitRaf : 2; for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(() => r())); }
      if (window.__waitMs) { await new Promise((r) => setTimeout(r, window.__waitMs)); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))); }
      return false;
    }
    await Promise.all(vids.map(async (v) => {
      if (v.readyState < 1) await once(v, ['loadedmetadata', 'error']);
      const vt = parseFloat(v.dataset.t);
      if (v.seeking || Math.abs(v.currentTime - vt) > 1e-6) { const done = once(v, ['seeked', 'error']); v.currentTime = vt; await done; }
      if (v.readyState < 2) await once(v, ['loadeddata', 'canplay', 'error']);
    }));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    return true;
  };
  const CSS = '[data-om-starter]{background:#000!important;z-index:2147483646!important}' +
    '[data-omelette-chrome],[data-om-unknown-cues]{display:none!important}' +
    'svg[data-om-exportable-video-with-duration-secs]{transform:none!important;box-shadow:none!important}';
  window.__seek = function (t) {
    const el = document.querySelector('[data-om-exportable-video-with-duration-secs]');
    if (!el) return false;
    el.dispatchEvent(new CustomEvent('data-om-seek-to-time-frame', { detail: { time: t, sync: true } }));
    return true;
  };
  window.__raf2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  function fontKeys() {
    const seen = new Map();
    for (const f of document.fonts) { const fam = /^["']/.test(f.family) ? f.family : '"' + f.family + '"'; seen.set(f.style + ' ' + f.weight + ' 32px ' + fam, f.family); }
    return [...seen.keys()];
  }
  window.__loadAllFonts = async function () {
    const faces = [...document.fonts];
    await Promise.all(faces.map((f) => f.load().catch(() => null)));
    await Promise.all(fontKeys().map((k) => document.fonts.load(k, 'İŞĞÜÖÇ').catch(() => null)));
    await document.fonts.ready;
    return { faces: faces.length, loaded: faces.filter((f) => f.status === 'loaded').length, failed: faces.filter((f) => f.status === 'error').map((f) => f.family + ' ' + f.weight), keys: fontKeys().length };
  };
  let applied = false;
  const t0 = Date.now();
  async function tick() {
    const booted = !document.querySelector('x-dc') && document.getElementById('dc-root');
    if (booted && !applied && window.__dcSetProps && window.__dcRootName) { window.__dcSetProps(window.__dcRootName(), overrides); applied = true; }
    const links = [...document.querySelectorAll('link[rel~="stylesheet"]')];
    const ready = booted && applied && links.every((l) => l.sheet && document.head.contains(l));
    if (ready || Date.now() - t0 > 20000) { const info = await window.__loadAllFonts(); info.timedOut = !ready; window.__harnessFontsReady(info); return; }
    setTimeout(tick, 25);
  }
  document.addEventListener('DOMContentLoaded', () => {
    const s = document.createElement('style'); s.id = '__harness_css'; s.textContent = CSS; document.head.appendChild(s); tick();
  });
}

function deferred() { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; }
function withTimeout(p, ms, what) {
  let tm; const to = new Promise((_, rej) => { tm = setTimeout(() => rej(new Error(what + ': ' + ms + ' ms zaman aşımı')), ms); });
  return Promise.race([p, to]).finally(() => clearTimeout(tm));
}

// Chromium argümanları: MOTION_CHROMIUM_ARGS + sahne chromiumArgs (render ile aynı)
export function chromiumArgs(scenes) {
  return [...new Set([...(process.env.MOTION_CHROMIUM_ARGS || '').split(' '), ...scenes.flatMap((s) => (s && s.chromiumArgs) || [])].filter(Boolean))];
}

// Sahne sayfasını aç → fn(page, api) → kapat. opts.browser verilirse paylaşılır (kapatılmaz).
//   opts: { globals, props, scale, hooks: [dosya…], warm, browser, timeoutMs }
export async function withPage(sceneId, opts, fn) {
  const scene = typeof sceneId === 'string' ? sceneById(sceneId) : sceneId;
  const tl = readTimeline(scene.file);
  if (tl.hyperframes) throw new Error(scene.id + ': Hyperframes sayfası frame-check sayfa API\'sinde desteklenmiyor');
  const log = [];
  const L = (s) => log.push(new Date().toISOString().slice(11, 23) + ' ' + s);
  const ownBrowser = !opts.browser;
  const browser = opts.browser || await chromium.launch({ args: chromiumArgs([scene]) });
  const srv = await startServer();
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: opts.scale || 1 });
  try {
    const page = await context.newPage();
    const gate = deferred();
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') L('console.' + m.type() + ': ' + m.text()); });
    page.on('pageerror', (e) => L('PAGEERROR ' + e.message));
    await page.exposeBinding('__harnessFontsReady', (_s, info) => gate.resolve(info));
    await page.addInitScript(initScript, {
      overrides: Object.assign({ checker: false }, scene.props || {}, opts.props || {}),
      globals: Object.assign({ FX_FPS: FPS }, opts.globals || {}),
    });
    await installRoutes(page, srv.base, gate, L);
    await page.goto(srv.base + '/' + encodeURIComponent(scene.file), { waitUntil: 'domcontentloaded' });
    L('fontlar: ' + JSON.stringify(await withTimeout(gate.promise, 30000, 'font kapısı')));
    await page.waitForSelector(STAGE, { state: 'attached', timeout: opts.timeoutMs || 60000 });
    await page.waitForFunction((sel) => document.querySelector(sel).getAttribute('data-om-fonts-inlined') === 'true', STAGE, { timeout: 20000 })
      .catch(() => L('UYARI: data-om-fonts-inlined gelmedi (devam)'));
    await page.evaluate(() => window.__loadAllFonts());
    if (opts.warm) for (const f of [0, 0.25, 0.5, 0.75, 0.98]) await page.evaluate(async (t) => { window.__seek(t); await window.__raf2(); }, (tl.totalMs / 1000) * f);
    await page.evaluate(async () => { window.__seek(0); await window.__raf2(); });
    let box = null;
    const api = {
      scene, tl, fps: FPS, frames: tl.frames, log, page,
      eval: (f, arg) => page.evaluate(f, arg),
      seek: (t) => page.evaluate(async (tt) => { window.__seek(tt); await window.__syncVideos(); }, t),
      // tek kare ekran görüntüsü (render ile aynı seek + video senkronu + pişirme önbelleği)
      shot: async (fi) => {
        if (!box) box = await page.$eval(STAGE, (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
        await page.evaluate(async (t) => { window.__seek(t); await window.__syncVideos();
          if (window.__fxBakeSettle && await window.__fxBakeSettle()) { window.__seek(t); await window.__syncVideos(); await window.__fxBakeSettle(); } }, fi / FPS);
        return page.screenshot({ clip: box, type: 'png' });
      },
      // kanca dosyaları (proje köküne göre) sayfa global kapsamında çalıştırılır; sahne modülleri yüklendikten SONRA
      inject: async (files) => {
        const loaded = [], missing = [], errors = [];
        for (const f of files || []) {
          const p = path.resolve(ROOT, f);
          if (!fs.existsSync(p)) { missing.push(f); continue; }
          try { await page.addScriptTag({ content: fs.readFileSync(p, 'utf8') + '\n//# sourceURL=' + f.replace(/\\/g, '/') }); loaded.push(f); }
          catch (e) { errors.push(f + ': ' + e.message.split('\n')[0]); }
        }
        L('kancalar: ' + JSON.stringify({ loaded, missing, errors }));
        return { loaded, missing, errors };
      },
      has: (name) => page.evaluate((n) => typeof window[n] === 'function', name),
    };
    return await fn(page, api);
  } finally {
    await withTimeout(context.close(), 15000, 'context.close').catch(() => {});
    srv.close();
    if (ownBrowser) await browser.close();
  }
}
