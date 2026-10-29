// motion-render seri-uret — pivot kilitli süreklilik serisi üretici (tek kaynak): o_i = c_(i−1), kilitli pivot uçları, tohumlu kısıtlı yürüyüş,
// ileri bakış; üretimden ÖNCE çözülebilirlik denetimi (zıt uçlu bitişik pivotlar arasında ≥ 2 mum, adım bütçesi — PN-69). Çekirdek render/lib/seri.mjs.
//
//   motion-render seri-uret <girdi.json> [--out script/seriler.json] [--js <window adı>] [--rule kural.mjs] [--check]
//   girdi: { seriler: { <ad>: { spec: {n, start, pivots: [{i, uc: h|l, v}], body, minBody, minWick, margin, step, bounds, targets, noise, minBetween},
//                                seed?, maxTries? } } }
//   --rule: projeye özgü geometri doğrulayıcısı (ESM, `export function validate(ad, series)` → [{rule, …}] reddedilen aday nedenleri)
//   --js: aynı veriyi sayfa/vm aynası olarak <çıktı>.js'e `window.<ad> = …` yazar (elle düzenlenmez)
//   --check: üretimi yeniden koşar, yazılı çıktıyla aynı mı (determinizm) — farklıysa çıkış 3
//   Çıkış 0 · 3 çözülemeyen seri ya da --check farkı · 2 kullanım.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { generate } from '../lib/seri.mjs';
import { rel } from '../lib/project.mjs';

const argv = process.argv.slice(2);
const VALUED = new Set(['--out', '--js', '--rule']);
const argOf = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const pos = argv.filter((a, i) => !a.startsWith('--') && !VALUED.has(argv[i - 1]));
if (pos.length !== 1) { console.error('kullanım: motion-render seri-uret <girdi.json> [--out yol.json] [--js ad] [--rule kural.mjs] [--check]'); process.exit(2); }
const G = JSON.parse(fs.readFileSync(path.resolve(pos[0]), 'utf8'));
const rule = argOf('--rule') ? await import(pathToFileURL(path.resolve(argOf('--rule'))).href) : null;
const out = path.resolve(argOf('--out') || pos[0].replace(/\.json$/, '') + '-gen.json');
const res = { surum: 1, kaynak: path.basename(pos[0]), seriler: {}, rapor: {} };
let bad = 0;
for (const [ad, s] of Object.entries(G.seriler || {})) {
  const r = generate(s.spec, { seed: s.seed || 1, maxTries: s.maxTries || 20000, validate: rule && rule.validate ? (series) => rule.validate(ad, series) : null });
  if (!r.ok) { bad++; res.rapor[ad] = r.infeasible ? { cozulemez: r.infeasible } : { bulunamadi: r.tries, red: r.rejected }; console.log('✗ ' + ad + ' · ' + (r.infeasible ? 'çözülemez: ' + JSON.stringify(r.infeasible) : r.tries + ' denemede aday yok · ' + JSON.stringify(r.rejected))); continue; }
  res.seriler[ad] = r.series; res.rapor[ad] = { seed: r.seed, deneme: r.tries, red: r.rejected };
  console.log('✓ ' + ad + ' · ' + r.series.length + ' öğe · seed ' + r.seed + ' (' + r.tries + ' deneme)');
}
const text = JSON.stringify(res, null, 1);
if (argv.includes('--check')) {
  const same = fs.existsSync(out) && fs.readFileSync(out, 'utf8') === text;
  console.log((same ? '✓' : '✗') + ' --check: ' + (same ? 'deterministik (yazılı çıktıyla aynı)' : 'yazılı çıktıyla farklı ya da yok'));
  process.exit(same && !bad ? 0 : 3);
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out + '.part', text); fs.renameSync(out + '.part', out);
if (argOf('--js')) { const js = out.replace(/\.json$/, '.js'); fs.writeFileSync(js + '.part', '// seri-uret tarafından üretildi; elle düzenlenmez (kaynak ' + path.basename(out) + ')\nwindow.' + argOf('--js') + ' = ' + text + ';\n'); fs.renameSync(js + '.part', js); }
console.log((bad ? '✗' : '✓') + ' seri-uret · ' + Object.keys(res.seriler).length + ' seri · çözülemeyen ' + bad + ' → ' + rel(out));
process.exitCode = bad ? 3 : 0;
