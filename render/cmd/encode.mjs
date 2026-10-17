// motion-render encode — ham kodlama: out/frames/<sahne>/%05d.png → out/scenes/<sahne>.mp4 (grade yok; grade'li yol: motion-render grade)
//
//   motion-render encode <sahne…>
//   motion-render encode --all
//
// Opak ve şeffaf sahneler aynı yoldan: H.264 yuv420p, şeffaflar render'da siyah zemin üzerine alınır.
// RGB → YUV dönüşümü BT.709 matrisiyle yapılır ve dosya BT.709 olarak etiketlenir (etiketsiz HD'yi oynatıcılar 709 sayar;
// 601 ile çevrilirse marka kırmızısı kayar). Kodlayıcı ayarı lib/ffmpeg.mjs X264_ARGS (kaynakla aynı + renk aralığı etiketi).
import fs from 'node:fs';
import path from 'node:path';
import { ff, TO709, X264_ARGS } from '../lib/ffmpeg.mjs';
import { ROOT, FPS, SCENES, sceneById, readTimeline } from '../lib/project.mjs';

const OUT = path.join(ROOT, 'out');

function encodeScene(id) {
  const scene = sceneById(id);
  const meta = path.join(OUT, 'logs', id + '.json');
  if (fs.existsSync(meta) && JSON.parse(fs.readFileSync(meta, 'utf8')).method === 'recordVideo') {
    return { id, skipped: 'recordVideo yolu mp4\'ü zaten yazdı' };
  }
  const dir = path.join(OUT, 'frames', id);
  const n = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^\d{5}\.png$/.test(f)).length : 0;
  const want = readTimeline(scene.file).frames;
  if (n !== want) throw new Error(id + ': ' + n + ' kare var, OM_SCENES ' + want + ' istiyor');
  const mp4 = path.join(OUT, 'scenes', id + '.mp4');
  fs.mkdirSync(path.dirname(mp4), { recursive: true });
  ff(['-framerate', String(FPS), '-i', path.join(dir, '%05d.png'), '-vf', TO709, ...X264_ARGS, mp4], { spawn: { cwd: ROOT } });
  return { id, mp4, frames: n, kb: Math.round(fs.statSync(mp4).size / 1024) };
}

const args = process.argv.slice(2);
const ids = args.includes('--all') ? SCENES.map((s) => s.id) : args.filter((a) => !a.startsWith('--'));
if (!ids.length) { console.error('kullanım: motion-render encode <sahne…> | --all'); process.exit(2); }
for (const id of ids) {
  try {
    const r = encodeScene(id);
    console.log(r.skipped ? '· ' + id + ' atlandı: ' + r.skipped
      : '✓ ' + path.relative(ROOT, r.mp4) + ' · ' + r.frames + ' kare · ' + r.kb + ' KB');
  } catch (e) { console.log('✗ ' + id + ' · ' + e.message); process.exitCode = 1; }
}
