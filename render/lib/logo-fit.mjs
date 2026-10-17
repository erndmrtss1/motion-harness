// lib/logo-fit.mjs — `motion-render logo fit [anahtar]`: YOL 1 — tipografiyle yeniden kurulum denemesi: harf harf yazı yüzü bindirme (Playwright Chromium + fonts/gf, yerel)
//   → <probe>/<anahtar>-yol1.json + özet (logo build varsa harf satırına yol1 sonucu yazılır)
// Her harf (kaynak ızgarası, kaplama ≥ 0.5) için aday yüz × ağırlık: glif mürekkep kutusu harf kutusuna eşlenir (x/y ayrı ölçek = genişlik ayarı), eğme −8…+8° (0.5°)
// ve ±0.5 px kaydırma taranır; ölçü IoU. Kabul: satır IoU ≥ 0.97 (alt satır ≥ 0.95), harf konumu p90 ≤ 1.5 px, delik birebir.
// Adaylar: logos.json fit.candidates {katman: [[aile, [ağırlıklar]]]}; yoksa fonts/local.css'teki bütün aileler (400–900).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { refOf } from './logo-build.mjs';

export async function runFit(ROOT, KEY, cfg) {
const OUT = path.join(ROOT, (cfg.probe || 'out/probe/logo') + '/' + KEY + '-yol1.json');
const LCSS = path.join(ROOT, 'fonts/local.css');
if (!fs.existsSync(LCSS)) throw new Error('fonts/local.css yok — önce motion-render vendor fonts');
const famW = {};   // local.css yüzleri: aile → ağırlıklar (değişken yazı yüzünde "400 700" aralığı 100 adımla açılır)
for (const m of fs.readFileSync(LCSS, 'utf8').matchAll(/@font-face\s*{([^}]*)}/g)) { const f = /font-family:\s*'([^']+)'/.exec(m[1]), w = /font-weight:\s*(\d+)(?:\s+(\d+))?/.exec(m[1]); if (!f) continue;
  const S = (famW[f[1]] = famW[f[1]] || new Set()); const a = w ? +w[1] : 400, b = w && w[2] ? +w[2] : a; for (let x = a; x <= b; x += 100) S.add(x); }
const L = cfg.logos[KEY], defC = Object.entries(famW).map(([f, S]) => [f, [...S].sort((x, y) => x - y)]);
const CAND = Object.fromEntries(L.layers.map((ly) => [ly, ((L.fit || {}).candidates || {})[ly] || defC]));
const ref = await refOf(KEY), W = ref.W, H = ref.H;
const targets = []; for (const ly of Object.keys(ref.letters)) ref.letters[ly].forEach((l, i) => { if (!/^[A-Z]$/.test(l.ch)) return; const m = 4, x0 = Math.max(0, l.x0 - m), y0 = Math.max(0, l.y0 - m), x1 = Math.min(W, l.x1 + m), y1 = Math.min(H, l.y1 + m), w = x1 - x0, h = y1 - y0, mask = [];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) mask.push(ref.cov[ly][y * W + x] >= 0.5 ? 1 : 0);
  targets.push({ ly, i, ch: l.ch, box: [l.x0 - x0, l.y0 - y0, l.x1 - x0, l.y1 - y0], w, h, mask, holes: l.holes }); });
const css = fs.readFileSync(LCSS, 'utf8').replace(/url\((['"]?)[^)'"]*\/([^/)'"]+\.woff2)\1\)/g, 'url(/gf/$2)');
const HTML = '<!doctype html><html><head><style>' + css + '</style></head><body><canvas id=c width=800 height=800></canvas></body></html>';
const browser = await chromium.launch(); const page = await browser.newPage();
await page.route('http://fit.local/**', (route) => { const u = new URL(route.request().url()); if (u.pathname.startsWith('/gf/')) return route.fulfill({ status: 200, contentType: 'font/woff2', headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(path.join(ROOT, 'fonts', 'gf', path.basename(u.pathname))) }); return route.fulfill({ status: 200, contentType: 'text/html', body: HTML }); });
await page.goto('http://fit.local/');
const fams = [...new Set(Object.values(CAND).flat().map((c) => c[0]))];
const sample = [...new Set(targets.map((t) => t.ch))].join('') || 'ABC';   // yüklenecek alt kümeler: hedef harfler
await page.evaluate(async ({ F, S }) => { for (const f of F) for (const w of [400, 500, 600, 700, 800, 900]) { try { await document.fonts.load(w + ' 100px "' + f + '"', S); } catch (e) { } } }, { F: fams, S: sample });
const res = await page.evaluate(({ T, C }) => {
  const cv = document.getElementById('c'), ctx = cv.getContext('2d', { willReadFrequently: true }), out = [];
  for (const t of T) { let best = null; const cand = C[t.ly];
    for (const [fam, ws] of cand) for (const wgt of ws) {
      const font = wgt + ' 400px "' + fam + '"'; if (!document.fonts.check(font, t.ch)) continue; ctx.font = font; const mt = ctx.measureText(t.ch), gw = mt.actualBoundingBoxLeft + mt.actualBoundingBoxRight, gh = mt.actualBoundingBoxAscent + mt.actualBoundingBoxDescent; if (!gw || !gh) continue;
      const bw = t.box[2] - t.box[0], bh = t.box[3] - t.box[1];
      for (let sh = -8; sh <= 8; sh += 0.5) for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) {
        const shr = Math.tan(sh * Math.PI / 180), sy = bh / gh, sx = (bw - Math.abs(shr) * bh) / gw;   // eğmede kutu genişliği = glif genişliği + |tan|·yükseklik
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, t.w, t.h); ctx.fillStyle = '#000';
        const baseY = t.box[3] + dy * 0.5 - mt.actualBoundingBoxDescent * sy, x0 = t.box[0] + dx * 0.5 + (shr < 0 ? -shr * bh : 0) + mt.actualBoundingBoxLeft * sx;
        ctx.setTransform(sx, 0, -shr * sy, sy, x0 + shr * (t.box[3] - baseY) * 0, baseY); ctx.font = font; ctx.fillText(t.ch, 0, 0);
        const d = ctx.getImageData(0, 0, t.w, t.h).data; let I = 0, U = 0; for (let i = 0; i < t.w * t.h; i++) { const a = d[i * 4 + 3] >= 128 ? 1 : 0, b = t.mask[i]; I += a & b; U += a | b; }
        const iou = U ? I / U : 0; if (!best || iou > best.iou) best = { fam, wgt, sh, dx, dy, sx: +sx.toFixed(4), sy: +sy.toFixed(4), iou: +iou.toFixed(4) }; } }
    out.push({ ly: t.ly, i: t.i, ch: t.ch, best }); }
  return out;
}, { T: targets, C: CAND });
await browser.close();
const byFam = {}; res.filter((r) => r.best).forEach((r) => { const k = r.ly + ' ' + r.best.fam + ' ' + r.best.wgt; byFam[k] = (byFam[k] || 0) + 1; });
const line = (ly) => { const a = res.filter((r) => r.ly === ly && r.best); return a.length ? +(a.reduce((s, r) => s + r.best.iou, 0) / a.length).toFixed(4) : null; };
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ not: 'YOL 1 bindirme: glif mürekkep kutusu → harf kutusu, eğme ±8°, ±0.5 px; IoU kaynak ızgarasında', harf: res, yuz: byFam, ortIoU: Object.fromEntries(L.layers.map((ly) => [ly, line(ly)])) }, null, 1));
console.log('✓ ' + path.relative(ROOT, OUT).split(path.sep).join('/'));
L.layers.forEach((ly) => console.log(ly + ' ort IoU ' + line(ly) + ' · ' + res.filter((r) => r.ly === ly && r.best).map((r) => r.ch + ' ' + r.best.iou + ' (' + r.best.fam + ' ' + r.best.wgt + ', ' + r.best.sh + '°, sx/sy ' + (r.best.sx / r.best.sy).toFixed(2) + ')').join(' · ')));
return res;
}
