// lib/logo-assets.mjs — `motion-render logo assets`: logo SVG'leri (logos.json logos.<k>.out) → sahne sayfalarının x-import ile yüklediği JS
//   window.<global> = { <k>: { vb, glyph, layers: [{ key, fill, d }], src, sha } }   (logos.json assets.out / assets.global; varsayılan assets/logo/logos.js, MOTION_LOGOS)
// glyph = path örneklerinden mürekkep kutusu (viewBox birimi; eğri başına 24 örnek). Renk varlıktan (kaynaktan ölçülen düz dolgu); sahne ışık telafisini ayrıca uygular.
// Katman anahtarı: path sırası = logos.json layers sırası (logo build bu sırayla yazar).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseD } from './logo-build.mjs';

export function runAssets(ROOT, cfg) {
  const out = {}, A = cfg.assets || {}, OUTF = A.out || 'assets/logo/logos.js', GL = A.global || 'MOTION_LOGOS';
  const bez = (a, b, c, d, t) => { const m = 1 - t; return [m * m * m * a[0] + 3 * m * m * t * b[0] + 3 * m * t * t * c[0] + t * t * t * d[0], m * m * m * a[1] + 3 * m * m * t * b[1] + 3 * m * t * t * c[1] + t * t * t * d[1]]; };
  for (const [k, L] of Object.entries(cfg.logos)) {
    const f = L.out, fp = path.join(ROOT, f);
    if (!fs.existsSync(fp)) throw new Error('SVG yok: ' + f + ' (önce motion-render logo build)');
    const s = fs.readFileSync(fp, 'utf8'), vb = ((/viewBox="([^"]+)"/.exec(s) || [])[1] || '0 0 0 0').split(/[\s,]+/).map(Number), layers = [];
    let li = 0;
    for (const m of s.matchAll(/<path\b[^>]*fill="([^"]+)"[^>]*d="([^"]+)"/g)) layers.push({ key: (L.layers || [])[li++] || (/^#1|^#0/.test(m[1]) ? 'siyah' : 'kirmizi'), fill: m[1], d: m[2] });
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    layers.forEach((Ly) => parseD(Ly.d).forEach((sb) => { let p = sb.start; const pts = [p]; sb.segs.forEach((q) => { if (q.t === 'L') pts.push(q.p); else for (let i = 1; i <= 24; i++) pts.push(bez(p, q.c1, q.c2, q.p, i / 24)); p = q.p; }); pts.forEach((q) => { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }); }));
    out[k] = { src: f, sha: crypto.createHash('sha256').update(s).digest('hex').slice(0, 16), vb, glyph: [x0, y0, x1, y1].map((v) => +v.toFixed(3)), layers };
  }
  const js = '// ' + OUTF + ' — motion-render logo assets üretir, elle düzenlenmez. Logo vektörleri (YOL 2 izleme; logos.json).\n' + 'window.' + GL + ' = ' + JSON.stringify(out) + ';\n';
  const p = path.join(ROOT, OUTF); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p + '.part', js); fs.renameSync(p + '.part', p);
  console.log('✓ ' + OUTF + ' · ' + Object.entries(out).map(([k, v]) => k + ' vb ' + v.vb.slice(2).join('×') + ' glif ' + v.glyph.join(',') + ' (' + (v.glyph[2] - v.glyph[0]).toFixed(1) + '×' + (v.glyph[3] - v.glyph[1]).toFixed(1) + ') katman ' + v.layers.map((l) => l.key + ' ' + l.fill).join('/') + ' sha ' + v.sha).join(' · '));
  return out;
}
