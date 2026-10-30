// motion-render plan-check — olay planı denetimi (render yok): storyboard'dan önce kusur (senkron, tek alet, giriş/çıkış ≥ 0,4 s, alet hızı,
// kanca kimlikleri) ve kota (boş pencere, olay yoğunluğu, cümle kapsamı, sınır vuruşu — UYARI) sayımı. Şema: render/lib/plan-check.mjs.
//
//   motion-render plan-check <events.json> [--rules r.json] [--refs e1,e2,… | --refs-file ids.json] [--out out/probe/plan-check.json] [--json]
//   kurallar: varsayılanlar ← world.json `plan` bloğu (varsa; toolMaxPx yoksa motion.toolMaxPx) ← --rules dosyası
//   Çıkış 0 · 3 kusur var · 2 kullanım. Çıktı .json + .md (.part → rename).
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, OUT, loadWorld, rel } from '../lib/project.mjs';
import { planCheck, planMarkdown } from '../lib/plan-check.mjs';

const argv = process.argv.slice(2);
const VALUED = new Set(['--rules', '--refs', '--refs-file', '--out']);
const argOf = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const pos = argv.filter((a, i) => !a.startsWith('--') && !VALUED.has(argv[i - 1]));
if (pos.length !== 1) { console.error('kullanım: motion-render plan-check <events.json> [--rules r.json] [--refs a,b] [--out yol.json] [--json]'); process.exit(2); }
let plan, rules = {};
try { plan = JSON.parse(fs.readFileSync(path.resolve(pos[0]), 'utf8')); } catch (e) { console.error('olay dosyası okunamadı: ' + e.message); process.exit(2); }
if (Array.isArray(plan)) plan = { events: plan };
let W = null; try { W = loadWorld(); } catch { /* world yok */ }
if (W && W.plan) Object.assign(rules, W.plan);
if (W && rules.toolMaxPx == null && W.motion && W.motion.toolMaxPx != null) rules.toolMaxPx = W.motion.toolMaxPx;
if (argOf('--rules')) Object.assign(rules, JSON.parse(fs.readFileSync(path.resolve(argOf('--rules')), 'utf8')));
const refs = argOf('--refs-file') ? JSON.parse(fs.readFileSync(path.resolve(argOf('--refs-file')), 'utf8')) : argOf('--refs') ? argOf('--refs').split(',').map((s) => s.trim()).filter(Boolean) : [];
const r = planCheck(plan, rules, { refs });
const out = path.resolve(argOf('--out') || path.join(OUT, 'probe', 'plan-check.json'));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out + '.part', JSON.stringify(Object.assign({ tool: 'plan-check', src: path.relative(ROOT, path.resolve(pos[0])).split(path.sep).join('/'), at: new Date().toISOString() }, r), null, 1)); fs.renameSync(out + '.part', out);
const md = out.replace(/\.json$/, '') + '.md'; fs.writeFileSync(md + '.part', planMarkdown(r, 'plan-check · ' + path.basename(pos[0]))); fs.renameSync(md + '.part', md);
if (argv.includes('--json')) process.stdout.write(JSON.stringify(r, null, 1) + '\n');
else {
  for (const x of r.errors.slice(0, 12)) console.log('✗ ' + x.rule + ' · ' + JSON.stringify(x).slice(0, 200));
  for (const x of r.warnings.slice(0, 8)) console.log('⚠ ' + x.rule + ' (kota) · ' + JSON.stringify(x).slice(0, 200));
  console.log((r.errors.length ? '✗' : '✓') + ' plan-check · olay ' + r.events + ' · alet ' + r.tools + ' · kusur ' + r.errors.length + ' · kota ' + r.warnings.length + ' → ' + rel(out));
}
process.exitCode = r.errors.length ? 3 : 0;
