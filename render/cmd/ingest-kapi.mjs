// motion-render ingest-kapi — üretken plaka kabulü "plaka = malzeme" (render/lib/malzeme.mjs): doku std · palet ΔE2000 (isteğe bağlı ton eşlemesi
// sonrası) · kimlik artığı · göz (yazı/el/logo 0). Gölge, ışık yönü, renk payı ve kompozisyon plaka ölçütü değildir (motor/render karesinde ölçülür).
//
//   motion-render ingest-kapi <varlık-id | görüntü.png> --accept <kabul.json | istek.json> [--goz "<not>"] [--native] [--out D]
//   kabul.json: { regions: [{name, rect: [x0,y0,x1,y1] @1920×1080, target: '<palet adı>|#hex', stdMin?, dEMax?}], map: none|gain, from?, stdMin, dEMax,
//                 identityMax, block } — istek.json (assets/gen/requests) verilirse öğenin `accept` alanı kullanılır; palet world.json `palette`.
//   Görüntü 1920×1080'e oturtulur (--native: kendi boyutu). Çıktı out/probe/ingest-kapi/<ad>.malzeme.{json,md} + <ad>-malzeme-norm.png (eşlenmiş önizleme;
//   göz denetimi bunun üstünde). Sonuç: GEÇTİ (ölçüler + --goz) · GÖZ BEKLİYOR (ölçüler tuttu, göz notu yok) · KALDI. Çıkış 0 · 3 KALDI · 2 kullanım.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ROOT, OUT, loadWorld, rel } from '../lib/project.mjs';
import { materialGate } from '../lib/malzeme.mjs';

const argv = process.argv.slice(2), VALUED = new Set(['--accept', '--goz', '--out']);
const argOf = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const pos = argv.filter((a, i) => !a.startsWith('--') && !VALUED.has(argv[i - 1]));
if (pos.length !== 1 || !argOf('--accept')) { console.error('kullanım: motion-render ingest-kapi <varlık-id|görüntü> --accept <kabul.json|istek.json> [--goz "<not>"] [--native] [--out D]'); process.exit(2); }
let file = path.resolve(pos[0]), ad = path.basename(pos[0]).replace(/\.\w+$/, '');
if (!fs.existsSync(file)) {
  const mf = path.join(ROOT, 'assets', 'gen', 'manifest.json'), M = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, 'utf8')) : { items: [] };
  const it = (M.items || []).find((x) => x.id === pos[0]);
  if (!it) { console.error('varlık ya da dosya yok: ' + pos[0]); process.exit(2); }
  file = path.resolve(ROOT, (it.files && (it.files.conform || it.files.source)) || ''); ad = it.id;
  if (!fs.existsSync(file)) { console.error('varlık dosyası yok: ' + file); process.exit(2); }
}
let acc = JSON.parse(fs.readFileSync(path.resolve(argOf('--accept')), 'utf8'));
if (Array.isArray(acc.items)) { const it = acc.items.find((x) => x.id === ad || x.id === pos[0]); if (!it || !it.accept) { console.error('istekte öğe ya da accept yok: ' + ad); process.exit(2); } acc = it.accept; }
let W = null; try { W = loadWorld(); } catch { /* world yok */ }
acc = Object.assign({}, acc, { palette: Object.assign({}, (W && W.palette) || {}, acc.palette || {}), goz: argOf('--goz') || acc.goz });
let p = sharp(file); if (!argv.includes('--native')) p = p.resize(1920, 1080, { fit: 'fill' });
const { data, info } = await p.removeAlpha().raw().toBuffer({ resolveWithObject: true });
let r;
try { r = materialGate({ data, W: info.width, H: info.height, C: info.channels }, acc); } catch (e) { console.error('✗ ingest-kapi: ' + e.message); process.exit(2); }
const dir = path.resolve(argOf('--out') || path.join(OUT, 'probe', 'ingest-kapi')); fs.mkdirSync(dir, { recursive: true });
const norm = path.join(dir, ad + '-malzeme-norm.png');
await sharp(r.mapped.data, { raw: { width: r.mapped.W, height: r.mapped.H, channels: r.mapped.C } }).png().toFile(norm + '.part.png'); fs.renameSync(norm + '.part.png', norm);
const { mapped, ...J } = r;
fs.writeFileSync(path.join(dir, ad + '.malzeme.json'), JSON.stringify(Object.assign({ tool: 'ingest-kapi', id: ad, src: path.relative(ROOT, file).split(path.sep).join('/'), at: new Date().toISOString() }, J), null, 1));
const md = [`# ingest-kapi · ${ad}: ${r.verdict}`, '', `eşleme ${r.accept.map}${r.gain ? ' (kazanç ' + r.gain.join(' / ') + ')' : ''} · doku ≥ ${r.accept.stdMin} · ΔE ≤ ${r.accept.dEMax} · kimlik ≤ ${r.accept.identityMax}/255 · göz: ${r.goz || 'BEKLİYOR (önizleme ' + path.basename(norm) + ')'}`, '',
  '| bölge | doku std | ΔE önce → sonra | kimlik | sonuç |', '|---|---|---|---|---|']
  .concat(r.rows.map((x) => `| ${x.name} | ${x.std} (≥ ${x.stdMin}) | ${x.dEBefore ?? '—'} → ${x.dE ?? '—'} | ${x.identity ?? '—'} | ${x.fails.length ? x.fails.join('; ') : 'tutuyor'} |`));
fs.writeFileSync(path.join(dir, ad + '.malzeme.md'), md.join('\n') + '\n');
for (const x of r.rows) console.log((x.fails.length ? '✗ ' : '✓ ') + x.name + ' · doku ' + x.std + (x.dE != null ? ' · ΔE ' + x.dEBefore + ' → ' + x.dE : '') + (x.identity != null ? ' · kimlik ' + x.identity : '') + (x.fails.length ? ' · ' + x.fails.join('; ') : ''));
console.log((r.verdict === 'KALDI' ? '✗ ' : r.verdict === 'GEÇTİ' ? '✓ ' : '⚠ ') + 'ingest-kapi ' + ad + ' · ' + r.verdict + ' → ' + rel(dir));
process.exitCode = r.verdict === 'KALDI' ? 3 : 0;
