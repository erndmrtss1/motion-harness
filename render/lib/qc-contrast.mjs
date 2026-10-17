// lib/qc-contrast.mjs — `motion-render k1 contrast`: render öncesi kontrast probe'u (qc 1.4.1 ile aynı yöntem).
//   motion-render k1 contrast <id> <etiket> f1,f2,… [metin1,metin2] [--json sonuç.json]   → out/probe/pc-<id>/<etiket>-f<N>.png
//   Her kare: ortalama luma (960×540, blur .8), boş siyah payı, DOM kahraman ızgarası → kahraman/çevre farkı, metin WCAG oranı (örtülü
//   hariç), metin px. Seçili metin parçaları (virgüllü) verilirse o satırların oranı ayrıca yazılır. --json (ya da PC_JSON ortam değişkeni):
//   kare başı sonuçlar JSON.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ROOT, OUT, sceneById } from './project.mjs';
import { cli, worldFor, k1For, probe } from './qc-common.mjs';
import { JS_PAINTED, jsTextRows, jsHeroGrid, textRatio } from './qc-img.mjs';

export async function contrast(argv) {
  const A = cli(argv, ['--json']);
  const [id, tag, fl, pick] = A.pos;
  if (!id || !tag || !fl) { console.error('kullanım: motion-render k1 contrast <id> <etiket> f1,f2,… [metin1,metin2] [--json dosya]'); return 2; }
  let S; try { S = sceneById(id); } catch (e) { console.error(e.message); return 1; }
  const K1 = k1For(S, worldFor(S));
  const FR = fl.split(',').map(Number);
  const DIR = path.join(OUT, 'probe', 'pc-' + id); fs.mkdirSync(DIR, { recursive: true });
  const js = `(function(){
${JS_PAINTED}
${jsTextRows(24)}
${jsHeroGrid(K1.selector)}
var hs=''; for(var q2=0;q2<hg.length;q2++) hs+=hg[q2];
return JSON.stringify({rows:rows, grid:hs});})()`;
  const RES = [];
  for (const f of FR) {
    const png = path.join(DIR, tag + '-f' + f + '.png');
    const rr = probe(id, ['--frame', String(f), '--out', png, '--eval', js]);
    const ln = (rr.stdout || '').split('\n').find((l) => l.includes('eval →'));
    if (!ln) { console.log('f' + f + ' eval yok: ' + ((rr.stdout || '') + (rr.stderr || '')).slice(-400)); continue; }
    const d = JSON.parse(JSON.parse(ln.slice(ln.indexOf('→') + 1).trim()));
    const y = await sharp(png).blur(0.8).resize(960, 540, { kernel: 'cubic' }).removeAlpha().raw().toBuffer();
    const Y = new Float32Array(960 * 540); let s = 0, eb = 0; for (let i = 0, k = 0; i < y.length; i += 3, k++) { const v = 0.2126 * y[i] + 0.7152 * y[i + 1] + 0.0722 * y[i + 2]; Y[k] = v; s += v; if (v < 15.3) eb++; }
    const w = 480, h = 270, L = new Float32Array(w * h); for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const k = 2 * yy * 960 + 2 * xx; L[yy * w + xx] = (Y[k] + Y[k + 1] + Y[k + 960] + Y[k + 961]) / 4; }
    const m = new Uint8Array(w * h); let hn = 0; for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { m[yy * w + xx] = d.grid.charCodeAt(Math.floor(yy / 2.5) * 192 + Math.floor(xx / 2.5)) === 49 ? 1 : 0; hn += m[yy * w + xx]; }
    let x0 = w, y0 = h, x1 = -1, y1 = -1, hsum = 0; for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (m[yy * w + xx]) { hsum += L[yy * w + xx]; if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
    let rs = 0, rn = 0; if (hn) for (let yy = Math.max(0, y0 - 30); yy <= Math.min(h - 1, y1 + 30); yy++) for (let xx = Math.max(0, x0 - 30); xx <= Math.min(w - 1, x1 + 30); xx++) if (!m[yy * w + xx]) { rs += L[yy * w + xx]; rn++; }
    const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true }), out = [];
    for (const r of d.rows) {
      if (r[6] < 0.5) continue;
      const ratio = textRatio(data, info.width, info.height, r); if (ratio == null) continue;
      out.push([r[0], +ratio.toFixed(2), r[1]]);
    }
    out.sort((a, b) => a[1] - b[1]);
    const low = out.filter((o) => o[1] < 4.5);
    console.log('f' + f + ' · ort %' + (s / Y.length / 2.55).toFixed(2) + ' · boş siyah %' + (eb / Y.length * 100).toFixed(0) + ' · kahraman %' + (hn / (w * h) * 100).toFixed(0) +
      ' ' + (hsum / hn).toFixed(1) + ' − çevre ' + (rs / rn).toFixed(1) + ' = ' + (hsum / hn - rs / rn).toFixed(1) + ' · metin ' + out.length + '/' + d.rows.length + ' görünür, < 4.5: ' + low.length +
      ' · en düşük ' + out.slice(0, 4).map((o) => o[0] + ' ' + o[1] + ' (' + o[2] + 'px)').join(', ') + ' · en yüksek ' + (out.length ? out[out.length - 1][1] : '—') +
      (pick ? ' · seçili ' + out.filter((o) => pick.split(',').some((p) => o[0].includes(p))).map((o) => o[0] + ' ' + o[1]).join(', ') : ''));
    RES.push({ f, mean: +(s / Y.length / 2.55).toFixed(2), empty: +(eb / Y.length).toFixed(3), heroArea: +(hn / (w * h)).toFixed(3), hero: hn ? +(hsum / hn).toFixed(1) : null, ring: rn ? +(rs / rn).toFixed(1) : null, diff: hn && rn ? +(hsum / hn - rs / rn).toFixed(1) : null, texts: out, rows: d.rows.map((r) => [r[0], r[1]]) });
  }
  const jf = A.argOf('--json') || process.env.PC_JSON;
  if (jf) fs.writeFileSync(path.resolve(ROOT, jf), JSON.stringify(RES, null, 1));
  return 0;
}
