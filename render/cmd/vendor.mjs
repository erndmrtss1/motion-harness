// motion-render vendor — yerel kütüphane ve fontlar (ağa bir kez çıkar; render ağsız). Ayrıntı: lib/vendor-core.mjs.
//   motion-render vendor                 scripts + fonts (aile varsa) + gsap (sayfalarda jsdelivr varsa) + ttf (Mono aile varsa)
//   motion-render vendor scripts         React 18.3.1 · ReactDOM 18.3.1 · @babel/standalone 7.29.0 (UMD, SRI sha384) → vendor/
//   motion-render vendor fonts [--families "Inter:400,700;JetBrains Mono:400,500"] [--world world/world.json]
//                                        Google Fonts woff2 → fonts/gf/*.woff2 · fonts/local.css · fonts/gf/map.json · fonts/LICENSES.md
//   motion-render vendor math            Noto Sans Math alt kümesi (local.css'e eklenir)
//   motion-render vendor gsap            sayfalardaki cdn.jsdelivr.net/npm adresleri → vendor/
//   motion-render vendor ttf [--ttf "JetBrains Mono:500"]   drawtext etiketi için TTF → fonts/gf/
// Aileler: --families ‖ world.json fonts [{family, weights, source: "google"}] (ikisi birleşir).
import { ROOT } from '../lib/project.mjs';
import { vendorScripts, vendorFonts, vendorMath, vendorGsap, vendorTtf, familiesFromWorld, parseFamilies, CACHE } from '../lib/vendor-core.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const VALUED = new Set(['--families', '--world', '--ttf']);
const only = args.filter((a, i) => !a.startsWith('--') && !VALUED.has(args[i - 1]));
const KNOWN = ['scripts', 'fonts', 'math', 'gsap', 'ttf'];
const bad = only.filter((x) => !KNOWN.includes(x)); if (bad.length) { console.error('bilinmeyen parça: ' + bad.join(', ') + ' (scripts | fonts | math | gsap | ttf)'); process.exit(2); }
const all = !only.length, want = (k) => all || only.includes(k);
const fams = []; for (const f of [...parseFamilies(opt('families', '')), ...familiesFromWorld(ROOT, opt('world', null))]) { const x = fams.find((y) => y.family === f.family); if (x) x.weights = [...new Set([...(x.weights || []), ...(f.weights || [])])]; else fams.push(f); }
console.log('vendor · proje ' + ROOT + ' · önbellek ' + CACHE);
try {
  if (want('scripts')) await vendorScripts(ROOT);
  if (want('fonts') && (fams.length || only.includes('fonts'))) await vendorFonts(ROOT, fams);
  if (want('gsap')) await vendorGsap(ROOT);
  if (only.includes('math')) await vendorMath(ROOT);
  if (want('ttf')) {
    let fam = opt('ttf', null), w = 500;
    if (fam) { const [f, ww] = fam.split(':'); fam = f; if (ww) w = +ww; } else { const m = fams.find((x) => /mono/i.test(x.family)); if (m) { fam = m.family; w = (m.weights || []).includes(500) ? 500 : (m.weights || [400])[0] || 400; } }
    if (fam) await vendorTtf(ROOT, fam, w); else if (only.includes('ttf')) { console.error('ttf: aile yok (--ttf "Aile:500" ya da world.json fonts içinde Mono aile)'); process.exit(2); }
  }
} catch (e) { console.error('✗ vendor: ' + e.message); process.exit(1); }
