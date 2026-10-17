#!/usr/bin/env node
// H2 ölçüm paritesi: iki JSON ağacındaki SAYISAL alanları karşılaştırır (aynı anahtar yolu).
// Ölçüt: |Δ| / max(|a|, ε) ≤ tol (varsayılan %2). Metin alanları yalnız sayılır, sayılar ayrıntılı listelenir.
// Kullanım: node dev/h2-jsondiff.mjs <a.json> <b.json> [--tol 0.02] [--ignore yol1,yol2] [--json out.json]
import fs from 'node:fs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const [A, B] = args.filter((x, i) => !x.startsWith('--') && !['--tol', '--ignore', '--json'].includes(args[i - 1]));
const TOL = +opt('--tol', 0.02);
const IGN = (opt('--ignore', '') || '').split(',').filter(Boolean);
const a = JSON.parse(fs.readFileSync(A, 'utf8')), b = JSON.parse(fs.readFileSync(B, 'utf8'));

const nums = [], onlyA = [], onlyB = [], strDiff = [];
let strSame = 0;
function walk(x, y, p) {
  if (IGN.some((g) => p === g || p.startsWith(g + '.') || p.startsWith(g + '['))) return;
  if (typeof x === 'number' && typeof y === 'number') {
    const d = Math.abs(x - y), rel = d / Math.max(Math.abs(x), 1e-9);
    nums.push({ p, a: x, b: y, d, rel: x === y ? 0 : rel });
    return;
  }
  if (x && y && typeof x === 'object' && typeof y === 'object') {
    const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
    for (const k of keys) {
      const q = Array.isArray(x) ? `${p}[${k}]` : (p ? p + '.' + k : k);
      if (!(k in x)) onlyB.push(q); else if (!(k in y)) onlyA.push(q); else walk(x[k], y[k], q);
    }
    return;
  }
  if (x === y) strSame++; else strDiff.push({ p, a: String(x).slice(0, 80), b: String(y).slice(0, 80) });
}
walk(a, b, '');
const bad = nums.filter((n) => n.rel > TOL && n.d > 1e-6);
const same = nums.filter((n) => n.a === n.b).length;
const summary = { a: A, b: B, numbers: nums.length, identical: same, overTol: bad.length, tol: TOL, maxRel: nums.reduce((m, n) => Math.max(m, n.rel), 0),
  strings: { same: strSame, diff: strDiff.length }, onlyA: onlyA.length, onlyB: onlyB.length, pass: bad.length === 0 };
const jo = opt('--json'); if (jo) fs.writeFileSync(jo, JSON.stringify({ summary, overTol: bad, strDiff, onlyA, onlyB }, null, 1));
console.log(`${summary.pass ? '✓' : '✗'} sayı ${summary.numbers} · aynı ${same} · tol (%${(TOL * 100).toFixed(1)}) aşan ${bad.length} · en büyük göreli fark ${(summary.maxRel * 100).toFixed(3)}% · metin farkı ${strDiff.length} · yalnız A ${onlyA.length} · yalnız B ${onlyB.length}`);
for (const n of bad.slice(0, 12)) console.log(`  ! ${n.p}: ${n.a} ↔ ${n.b}`);
for (const s of strDiff.slice(0, 6)) console.log(`  ~ ${s.p}: ${s.a} ↔ ${s.b}`);
process.exit(summary.pass ? 0 : 1);
