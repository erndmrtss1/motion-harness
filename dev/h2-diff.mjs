#!/usr/bin/env node
// H2 parite: iki PNG (ya da iki dizinde aynı adlı PNG'ler) arasında piksel farkı.
// Ölçüt: ortalama |Δ| (RGB, /255) ≤ 0,5 — ayrıca en büyük |Δ| ve farklı piksel oranı raporlanır.
// Kullanım: node dev/h2-diff.mjs <a.png|dirA> <b.png|dirB> [--from N --to M] [--json=out.json] [--limit 0.5]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../render/package.json', import.meta.url));
const { PNG } = require('pngjs');

const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(k + '=')); if (a) return a.slice(k.length + 1); const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const [A, B] = args.filter((x, i) => !x.startsWith('--') && !['--from', '--to', '--limit'].includes(args[i - 1]));
const LIMIT = +opt('--limit', 0.5);

function diff(fa, fb) {
  const a = PNG.sync.read(fs.readFileSync(fa)), b = PNG.sync.read(fs.readFileSync(fb));
  if (a.width !== b.width || a.height !== b.height) return { fa, fb, error: `boyut ${a.width}×${a.height} ≠ ${b.width}×${b.height}` };
  let sum = 0, max = 0, nd = 0;
  const n = a.width * a.height;
  for (let i = 0; i < a.data.length; i += 4) {
    const d0 = Math.abs(a.data[i] - b.data[i]), d1 = Math.abs(a.data[i + 1] - b.data[i + 1]), d2 = Math.abs(a.data[i + 2] - b.data[i + 2]);
    sum += d0 + d1 + d2;
    const m = Math.max(d0, d1, d2);
    if (m) nd++;
    if (m > max) max = m;
  }
  return { file: path.basename(fa), mean: sum / (3 * n), max, diffPx: nd / n };
}

let rows = [];
if (fs.statSync(A).isDirectory()) {
  const from = +opt('--from', 0), to = +opt('--to', 1e9);
  const names = fs.readdirSync(A).filter((f) => /^\d{5}\.png$/.test(f) && +f.slice(0, 5) >= from && +f.slice(0, 5) <= to).sort();
  for (const f of names) rows.push(fs.existsSync(path.join(B, f)) ? diff(path.join(A, f), path.join(B, f)) : { file: f, error: 'B\'de yok' });
} else rows.push(diff(A, B));

const ok = rows.filter((r) => !r.error);
const worst = ok.reduce((m, r) => (r.mean > m.mean ? r : m), { mean: -1 });
const summary = {
  a: A, b: B, frames: rows.length, errors: rows.filter((r) => r.error).length,
  meanOfMeans: ok.length ? ok.reduce((s, r) => s + r.mean, 0) / ok.length : null,
  worstMean: worst.mean, worstFile: worst.file, maxAbs: ok.reduce((m, r) => Math.max(m, r.max), 0),
  identical: ok.filter((r) => r.max === 0).length, limit: LIMIT,
  pass: rows.every((r) => !r.error && r.mean <= LIMIT),
};
const jo = opt('--json');
if (jo) fs.writeFileSync(jo, JSON.stringify({ summary, rows }, null, 1));
console.log(`${summary.pass ? '✓' : '✗'} ${summary.frames} kare · bit-aynı ${summary.identical} · ort |Δ| ${summary.meanOfMeans?.toFixed(4)} /255 · en kötü ${summary.worstMean?.toFixed(4)} (${summary.worstFile}) · max ${summary.maxAbs} · hata ${summary.errors} · sınır ${LIMIT}`);
for (const r of rows.filter((r) => r.error).slice(0, 10)) console.log('  ! ' + r.file + ' ' + r.error);
process.exit(summary.pass ? 0 : 1);
