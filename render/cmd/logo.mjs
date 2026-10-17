// motion-render logo — logo vektör hattı + kabul ölçüleri (logo tablosu: assets/logo/logos.json; --config ile başka dosya).
//   motion-render logo up                       (a) büyütme kabulü: logos.json up.<yöntem>.file (ör. motion-render gen upscale çıktısı) ↔ yerel Lanczos 4×
//   motion-render logo trace [anahtar…]         YOL 2: potrace + yol temizliği → <probe>/<anahtar>-yol2.svg/.json (potrace isteğe bağlı bağımlılık)
//   motion-render logo fit [anahtar]            YOL 1: harf harf yazı yüzü bindirme (Chromium + fonts/) → <probe>/<anahtar>-yol1.json
//   motion-render logo build                    son SVG'ler (logos.json out) + <probe>/logo-dogrulama.png + logo-olcum.json
//   motion-render logo assets                   SVG → sahne JS'i (logos.json assets.out, window.<assets.global>)
//   motion-render logo check <logo.svg> --ref <kaynak.jpg> [--px 330] [--ss 2] [--band 0.86] [--map ox,oy] [--rmin 25] [--out D]   bağımsız SVG doğrulaması (DUR koşulu)
//   motion-render logo example                  örnek logos.json (stdout)
// Kural: müşteri logosu vektör değilse (SVG kabında raster dahil) önce iste; kendimiz kuruyorsak üretken araç yalnız büyütmede, kabul ölçülerle.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/project.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const VALUED = new Set(['--config', '--ref', '--px', '--ss', '--band', '--map', '--rmin', '--out']);
const pos = args.filter((a, i) => !a.startsWith('--') && !VALUED.has(args[i - 1]));
const st = pos[0];
const EXAMPLE = {
  probe: 'out/probe/logo',
  logos: {
    marka: {
      name: 'Marka logosu', jpg: 'materials/marka-logo.jpg', layers: ['kirmizi', 'siyah'],
      letters: { kirmizi: ['A', 'B', 'C'], siyah: ['D', 'E'] },
      up: { higgsfield: { file: 'assets/gen/inbox/g-marka-logo-up2k.png', pad: null, credits: 2 } },
      srcUp: { kirmizi: 'lanczos', siyah: 'higgsfield' },
      trace: { layer: { kirmizi: { blur: 1.6, tolFit: 0.55, tolLine: 0.3, corner: 45 }, siyah: { tolFit: 0.15, tolLine: 0.12 } } },
      out: 'materials/gen/marka-logo.svg',
      fit: { candidates: { kirmizi: [['Oswald', [400, 500, 600, 700]]], siyah: [['Inter', [500, 600, 700]]] } },
    },
  },
  assets: { out: 'assets/logo/logos.js', global: 'MOTION_LOGOS' },
};
if (st === 'example') { console.log(JSON.stringify(EXAMPLE, null, 1)); process.exit(0); }

if (st === 'check') {
  const src = pos[1];
  if (!src || !opt('ref', null)) { console.error('kullanım: motion-render logo check <logo.svg> --ref <kaynak.jpg> [--px 330] [--ss 2] [--band 0.86] [--map ox,oy] [--rmin 25] [--out D]'); process.exit(2); }
  const { logoCheck } = await import('../lib/logo-check.mjs');
  const R = await logoCheck(ROOT, src, { ref: opt('ref'), px: opt('px', 330), ss: opt('ss', 2), band: opt('band', null), map: opt('map', null), rmin: opt('rmin', 25), out: opt('out', null) });
  process.exit(R.gecer ? 0 : 3);
}

const STAGES = ['up', 'trace', 'fit', 'build', 'assets'];
if (!STAGES.includes(st)) { console.error('kullanım: motion-render logo up | trace [anahtar…] | fit [anahtar] | build | assets | check <svg> --ref <jpg> | example'); process.exit(2); }
const CF = path.resolve(ROOT, opt('config', 'assets/logo/logos.json'));
if (!fs.existsSync(CF)) { console.error('logo tablosu yok: ' + path.relative(ROOT, CF) + ' (örnek: motion-render logo example > assets/logo/logos.json)'); process.exit(2); }
const CFG = JSON.parse(fs.readFileSync(CF, 'utf8'));
for (const [k, L] of Object.entries(CFG.logos || {})) {
  const miss = ['jpg', 'layers', 'out'].filter((f) => L[f] == null);
  if (miss.length) { console.error('logos.json ' + k + ': eksik alan ' + miss.join(', ')); process.exit(2); }
  const bad = L.layers.filter((ly) => !['kirmizi', 'siyah'].includes(ly)); if (bad.length) { console.error('logos.json ' + k + ': katman adı kirmizi | siyah olmalı (' + bad.join(', ') + ')'); process.exit(2); }
  if (!fs.existsSync(path.resolve(ROOT, L.jpg))) { console.error('kaynak yok: ' + L.jpg); process.exit(1); }
}
const LB = await import('../lib/logo-build.mjs');
LB.configure(ROOT, CFG);
try {
  if (st === 'up') await LB.stageUp();
  else if (st === 'trace') {
    const keys = pos.slice(1).length ? pos.slice(1) : Object.keys(CFG.logos);
    for (const k of keys) for (const [ly, m] of Object.entries(LB.SRC_UP[k] || {})) { const f = path.join(ROOT, (CFG.probe || 'out/probe/logo') + '/' + k + '-up-' + m + '.png'); if (!fs.existsSync(f)) { console.error(k + ' ' + ly + ': büyütme yok (' + path.relative(ROOT, f) + ') → önce motion-render logo up'); process.exit(1); } }
    await LB.stageTrace(keys);
  } else if (st === 'build') await LB.stageBuild();
  else if (st === 'fit') { const { runFit } = await import('../lib/logo-fit.mjs'); await runFit(ROOT, pos[1] || Object.keys(CFG.logos)[0], CFG); }
  else if (st === 'assets') { const { runAssets } = await import('../lib/logo-assets.mjs'); runAssets(ROOT, CFG); }
} catch (e) {
  console.error('✗ logo ' + st + ': ' + e.message);
  process.exit(1);
}
