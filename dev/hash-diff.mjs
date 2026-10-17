#!/usr/bin/env node
// İki manifest arasındaki fark. Kararlı bölgede fark ≠ 0 → çıkış kodu 1.
// Kullanım: node dev/hash-diff.mjs <once.json> <sonra.json> [--json=rapor.json]
import fs from 'node:fs';

const [a, b, ...rest] = process.argv.slice(2);
const jsonOut = rest.find(x => x.startsWith('--json='))?.slice(7);
const A = JSON.parse(fs.readFileSync(a, 'utf8'));
const B = JSON.parse(fs.readFileSync(b, 'utf8'));
const vol = [...new Set([...(A.volatile || []), ...(B.volatile || [])])];
const isVol = k => vol.some(v => k === v || k.startsWith(v.endsWith('/') ? v : v + '/'));

const res = { stable: { added: [], removed: [], changed: [] }, volatile: { added: [], removed: [], changed: [] } };
const keys = new Set([...Object.keys(A.files), ...Object.keys(B.files)]);
for (const k of keys) {
  const x = A.files[k], y = B.files[k];
  const bucket = isVol(k) ? res.volatile : res.stable;
  if (!x) bucket.added.push(k);
  else if (!y) bucket.removed.push(k);
  else if ((x.sha256 || x.target) !== (y.sha256 || y.target)) bucket.changed.push(k);
}
const n = o => o.added.length + o.removed.length + o.changed.length;
const summary = {
  before: { file: a, created: A.created, entries: A.totals.entries },
  after: { file: b, created: B.created, entries: B.totals.entries },
  volatileZones: vol,
  stableDiff: n(res.stable),
  volatileDiff: n(res.volatile),
  stable: res.stable,
  volatile: { added: res.volatile.added.length, removed: res.volatile.removed.length, changed: res.volatile.changed.length,
    sample: [...res.volatile.added, ...res.volatile.removed, ...res.volatile.changed].slice(0, 40) },
};
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(summary, null, 1));
console.log(`kararlı bölge fark: ${summary.stableDiff}  (eklenen ${res.stable.added.length}, silinen ${res.stable.removed.length}, değişen ${res.stable.changed.length})`);
console.log(`oynak bölge fark:   ${summary.volatileDiff}  (${vol.join(', ')}) — başka session yazıyor olabilir`);
for (const k of [...res.stable.added, ...res.stable.removed, ...res.stable.changed].slice(0, 30)) console.log('  ! ' + k);
process.exit(summary.stableDiff === 0 ? 0 : 1);
