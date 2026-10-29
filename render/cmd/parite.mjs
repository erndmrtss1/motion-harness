// motion-render parite — kalite paritesi: proje kareleri ↔ kalite referansı kareleri (kütüphane world demosu, onaylı style frame, referans klip
// kareleri). Referans = KALİTE, kimlik değil. Ölçü tanımları render/lib/parite.mjs (grup, ink, içerik, negatif alan, kahraman oranı, luma, aksan).
//
//   motion-render parite --ours <dizin|a.png,b.png|liste.json> --ref <dizin|…> [--tol 0.2] [--ust groups,ink] [--alt metrik,…]
//                        [--accent h0,h1[,sMin]] [--metrics m1,m2] [--out out/probe/parite.json] [--gate]
//   liste.json: ["a.png", …] ya da {kareler: [{dosya, parite?}]} (parite: false olan kare atlanır)
//   --ust/--alt: tek yönlü sınır (ör. sadelik serbest: --ust groups,ink → proje ≤ referans·(1 + tol))
//   Varsayılan BİLGİ: çıkış 0 (kota değil kalite kıyası; reviewer kalibrasyonunda kullanılır). --gate: parite tutmazsa çıkış 3.
import fs from 'node:fs';
import path from 'node:path';
import { OUT, rel } from '../lib/project.mjs';
import { measureFile, parity } from '../lib/parite.mjs';

const argv = process.argv.slice(2), argOf = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
if (!argOf('--ours') || !argOf('--ref')) { console.error('kullanım: motion-render parite --ours <dizin|liste> --ref <dizin|liste> [--tol 0.2] [--ust m,…] [--alt m,…] [--accent h0,h1,s] [--gate]'); process.exit(2); }
function files(spec) {
  const p = path.resolve(spec);
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return fs.readdirSync(p).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort().map((f) => path.join(p, f));
  if (/\.json$/i.test(spec) && fs.existsSync(p)) { const j = JSON.parse(fs.readFileSync(p, 'utf8')), L = Array.isArray(j) ? j : (j.kareler || []).filter((k) => k.parite !== false).map((k) => k.dosya); return L.map((f) => path.resolve(path.dirname(p), f)); }
  return spec.split(',').map((f) => path.resolve(f.trim()));
}
const O = files(argOf('--ours')), R = files(argOf('--ref')), miss = [...O, ...R].filter((f) => !fs.existsSync(f));
if (!O.length || !R.length || miss.length) { console.error('kare yok: ' + (miss.length ? miss.slice(0, 3).join(', ') : (!O.length ? '--ours' : '--ref') + ' boş')); process.exit(2); }
const acc = argOf('--accent') ? argOf('--accent').split(',').map(Number) : null, opt = { accent: acc };
const mo = [], mr = [];
for (const f of O) mo.push(Object.assign({ file: path.basename(f) }, await measureFile(f, opt)));
for (const f of R) mr.push(Object.assign({ file: path.basename(f) }, await measureFile(f, opt)));
const sides = {}; for (const [k, s] of [['--ust', 'ust'], ['--alt', 'alt']]) if (argOf(k)) argOf(k).split(',').forEach((m) => { sides[m.trim()] = s; });
const metrics = argOf('--metrics') ? argOf('--metrics').split(',') : ['groups', 'inkContent', 'content', 'negative', 'heroRatio', 'luma'].concat(acc ? ['accent'] : []);
const res = parity(mo, mr, { tol: argOf('--tol') != null ? +argOf('--tol') : 0.2, sides, metrics });
const out = path.resolve(argOf('--out') || path.join(OUT, 'probe', 'parite.json'));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out + '.part', JSON.stringify({ tool: 'parite', at: new Date().toISOString(), ours: mo, ref: mr, ...res }, null, 1)); fs.renameSync(out + '.part', out);
const md = ['# parite', '', `proje ${O.length} kare ↔ referans ${R.length} kare · tolerans ±%${Math.round(res.tol * 100)}`, '', '| ölçü | proje (medyan) | referans (medyan) | sapma | yön | sonuç |', '|---|---|---|---|---|---|']
  .concat(res.rows.map((r) => `| ${r.metric} | ${r.ours ?? '—'} | ${r.ref ?? '—'} | ${r.dev != null ? (r.dev * 100).toFixed(1) + ' %' : '—'} | ${r.side || ''} | ${r.skip ? 'ölçülemedi' : r.ok ? 'tutuyor' : 'TUTMUYOR'} |`));
fs.writeFileSync(out.replace(/\.json$/, '.md'), md.join('\n') + '\n');
for (const r of res.rows) console.log((r.skip ? '– ' : r.ok ? '✓ ' : '✗ ') + r.metric.padEnd(10) + ' proje ' + r.ours + ' · ref ' + r.ref + (r.dev != null ? ' · sapma %' + (r.dev * 100).toFixed(1) : '') + (r.side && r.side !== 'iki' ? ' (' + r.side + ')' : ''));
console.log((res.pass ? '✓' : argv.includes('--gate') ? '✗' : '⚠') + ' parite · ' + (res.pass ? 'tutuyor' : 'tutmuyor' + (argv.includes('--gate') ? '' : ' (bilgi)')) + ' → ' + rel(out));
process.exitCode = !res.pass && argv.includes('--gate') ? 3 : 0;
