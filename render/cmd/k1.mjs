// motion-render k1 — K1 kahraman ölçüsü (world.k1.mask = ink | dom | alpha) + lyric display boyu → out/probe/<id>-k1.json
//
//   motion-render k1 <id> [--frames f,… | --times t,…] [--lyric "METİN@t,…"] [--mask ink|dom|alpha] [--out out/probe/<id>-k1.json]
//   motion-render k1 contrast <id> <etiket> f1,f2,… [metin1,metin2] [--json dosya]      render öncesi kontrast probe'u (lib/qc-contrast.mjs)
//
// Kareler: --frames (kare dizini) ‖ --times (saniye → kare = round(t·fps)) ‖ sahne k1.keys ‖ sahne keys.
// Yöntem ve eşikler lib/qc-k1.mjs'te: alan ≥ areaMin YA DA yükseklik ≥ heightMin; lyric ekran px ≥ lyricMin (sahne k1 > world.k1 > 0.35 / 0.55 / 160).
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, FPS, sceneById, rel } from '../lib/project.mjs';
import { cli, worldFor, k1For } from '../lib/qc-common.mjs';
import { k1Measure, lyricSizes } from '../lib/qc-k1.mjs';

const ARGV = process.argv.slice(2);
if (ARGV[0] === 'contrast') {
  const { contrast } = await import('../lib/qc-contrast.mjs');
  process.exitCode = await contrast(ARGV.slice(1));
} else process.exitCode = await k1(ARGV);

async function k1(argv) {
  const { argOf, pos } = cli(argv, ['--frames', '--times', '--lyric', '--out', '--mask']);
  const id = pos[0];
  if (!id) { console.error('kullanım: motion-render k1 <id> [--frames f,… | --times t,…] [--lyric "METİN@t,…"] [--mask ink|dom|alpha] [--out P] · k1 contrast …'); return 2; }
  let S; try { S = sceneById(id); } catch (e) { console.error(e.message); return 1; }
  const K = k1For(S, worldFor(S));
  if (argOf('--mask')) K.mask = argOf('--mask');
  if (!K.mask) { console.error('k1: maske türü yok (world.k1.mask ya da sahne k1.hero; --mask ink|dom|alpha)'); return 1; }
  const frames = argOf('--frames') ? argOf('--frames').split(',').map(Number)
    : argOf('--times') ? argOf('--times').split(',').map((t) => Math.round(+t * FPS))
      : (K.keys || S.keys || []).slice();
  if (!frames.length) { console.error('k1: kare yok (--frames / --times ya da manifest k1.keys / keys)'); return 1; }
  const hero = await k1Measure(id, frames, K, FPS);
  const ly = argOf('--lyric') ? lyricSizes(id, argOf('--lyric').split(',').map((s) => { const [a, b] = s.split('@'); return [a, +b]; }), frames[0], { selector: K.lyricSelector, min: K.lyricMin }) : null;
  const method = 'K1: ' + (K.mask === 'dom' ? 'DOM ' + K.selector + ' ızgarası 192×108' : K.mask + ' maskesi 480×270 ' + (K.mask === 'ink' ? 'luma<200' : '|luma−zemin|>55') + ', kapanış r3, leke ≥ 60 px, delik dolu') +
    '; alan ≥ ' + K.areaMin + ' ya da yükseklik ≥ ' + K.heightMin + ' · lyric ekran px ≥ ' + K.lyricMin;
  const J = { id, mask: K.mask, method, thresholds: { areaMin: K.areaMin, heightMin: K.heightMin, lyricMin: K.lyricMin }, hero, lyric: ly };
  const o = path.resolve(ROOT, argOf('--out') || path.join('out', 'probe', id + '-k1.json'));
  fs.mkdirSync(path.dirname(o), { recursive: true });
  fs.writeFileSync(o, JSON.stringify(J, null, 1));
  console.log('✓ K1 ' + id + ' · kahraman ' + hero.map((h) => 'f' + h.f + ' %' + Math.round(h.area * 100) + '/%' + Math.round(h.height * 100) + (h.ok ? ' ✓' : ' ✗')).join(' · ') +
    (ly ? ' | lyric ' + ly.map((q) => q.text + ' ' + Math.round(q.px) + (q.ok ? '✓' : '✗')).join(' · ') : '') + ' → ' + rel(o));
  return 0;
}
