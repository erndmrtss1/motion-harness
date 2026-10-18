#!/usr/bin/env node
// lookdev-diff önsel haritası (HK-31): kalibrasyon setindeki BÜTÜN yönlerin rol başına ortalama doluluk haritası (etiket kullanılmaz).
// Kullanım: node dev/lookdev-prior.mjs <run.json …> [--out render/lib/lookdev-prior.json]   (girdiler: lookdev-diff --dump çıktıları)
// Her yön eşit ağırlıklı: yönün karelerinin ortalaması, sonra yönlerin ortalaması.
import fs from 'node:fs';
import path from 'node:path';
import { occupancyMap, BOLGE } from '../render/lib/lookdev-diff.mjs';
const args = process.argv.slice(2), oi = args.indexOf('--out'), out = oi >= 0 ? args[oi + 1] : 'render/lib/lookdev-prior.json';
const files = args.filter((a, i) => !(oi >= 0 && (i === oi || i === oi + 1)));
const roles = Object.keys(BOLGE.w), sum = Object.fromEntries(roles.map((r) => [r, new Array(BOLGE.gx * BOLGE.gy).fill(0)])), src = [];
let n = 0;
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const [Y, d] of Object.entries(j.yonler)) {
    if (!d.kare) throw new Error(f + ': --dump ile koşulmamış');
    for (const r of roles) { const acc = new Array(BOLGE.gx * BOLGE.gy).fill(0); for (const k of d.kare) occupancyMap(k.boxes, r).forEach((v, i) => { acc[i] += v / d.kare.length; }); acc.forEach((v, i) => { sum[r][i] += v; }); }
    n++; src.push(path.basename(f, '.json') + '-' + Y);
  }
}
const prior = { version: 1, grid: [BOLGE.gx, BOLGE.gy], n, kaynak: src, not: 'HK-31: kalibrasyon setindeki bütün yönlerin rol başına ortalama doluluk haritası; etiket kullanılmadı',
  roles: Object.fromEntries(roles.map((r) => [r, sum[r].map((v) => +(v / n).toFixed(4))])) };
fs.writeFileSync(out, JSON.stringify(prior, null, 1) + '\n'); console.log('önsel', out, '· yön', n, '·', roles.map((r) => r + ' Σ' + prior.roles[r].reduce((s, v) => s + v, 0).toFixed(2)).join(' '));
