// motion-render ses — sesli kopya: perde mp4'üne proje sesi (scenes.json "audio") eklenir; birleşik ön izleme.
//   motion-render ses <id> [<id> …]                        out/scenes/<id>.mp4 (en yeni) + ses (range[0]/fps'ten, video süresi) → out/scenes/<id>-ses.mp4
//   motion-render ses preview <id,id,…> [--out <mp4>]      perdeler uç uca (concat, video kopya) + ses ilk perdenin range[0]'ından → out/scenes/<film>-onizleme-ses.mp4
//       (kaynak biçimi `--onizleme <id,…>` da geçerli; <film> = ilk perdenin parent'ı, yoksa scenes.json `film`)
// Ses kaynağı tek yerde: scenes.json "audio". Görüntü yeniden kodlanmaz (-c:v copy); ses AAC 160k; apad → ses bitince düz sessizlik. Çıktı .part → rename.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ffmpeg } from '../lib/ffmpeg.mjs';
import { ROOT, MAN, FPS, latestMp4, sceneById } from '../lib/project.mjs';
import { filmOfScene } from '../lib/film.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const PREVIEW = args[0] === 'preview' || args[0] === '--onizleme';
if (!args.length || args[0] === '--help' || (PREVIEW && !args[1])) { console.error('kullanım: motion-render ses <id…> · motion-render ses preview <id,id,…> [--out <mp4>]'); process.exit(2); }
if (!MAN.audio) { console.error('scenes.json "audio" yok'); process.exit(1); }
const AUDIO = path.join(ROOT, MAN.audio);
if (!fs.existsSync(AUDIO)) { console.error('ses yok: ' + AUDIO); process.exit(1); }
const run = (a) => { const r = spawnSync(ffmpeg, ['-hide_banner', '-v', 'error', '-y', ...a], { encoding: 'utf8' }); if (r.status !== 0) { console.error(r.stderr); process.exit(1); } };
const dur = (f) => { const r = spawnSync(ffmpeg, ['-hide_banner', '-i', f], { encoding: 'utf8' }); const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(r.stderr || ''); return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : null; };
const put = (part, out) => { fs.renameSync(part, out); console.log('✓ ' + path.relative(ROOT, out).replace(/\\/g, '/') + ' · ' + (dur(out) || 0).toFixed(3) + ' s · ses ' + path.basename(AUDIO)); };
const scene = (id) => { try { return sceneById(id); } catch { console.error('manifestte yok: ' + id); process.exit(1); } };
const mp4Of = (id) => { const f = latestMp4(id); if (!f) { console.error('mp4 yok: ' + id); process.exit(1); } return f; };

if (PREVIEW) {
  const ids = args[1].split(','), out = path.resolve(ROOT, opt('out', 'out/scenes/' + filmOfScene(scene(ids[0])) + '-onizleme-ses.mp4')), part = out.replace(/\.mp4$/, '.part.mp4');
  const r0 = scene(ids[0]).range ? scene(ids[0]).range[0] : 0, list = path.join(ROOT, 'out', 'logs', 'onizleme-concat.txt');
  ids.forEach((id, k) => { if (k && scene(id).range && scene(ids[k - 1]).range && scene(id).range[0] !== scene(ids[k - 1]).range[1] + 1) { console.error('aralık boşluğu/çakışması: ' + ids[k - 1] + ' → ' + id); process.exit(1); } });
  fs.mkdirSync(path.dirname(list), { recursive: true }); fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(list, ids.map((id) => "file '" + mp4Of(id).replace(/\\/g, '/') + "'").join('\n') + '\n');
  run(['-f', 'concat', '-safe', '0', '-i', list, '-ss', (r0 / FPS).toFixed(4), '-i', AUDIO, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', 'apad', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', '-f', 'mp4', part]);   // apad — ses bitince düz sessizlik
  put(part, out);
} else {
  for (const id of args.filter((a) => !a.startsWith('--'))) {
    const s = scene(id), src = mp4Of(id), t0 = (s.range ? s.range[0] : 0) / FPS, d = dur(src), out = path.join(ROOT, 'out', 'scenes', id + '-ses.mp4'), part = out.replace(/\.mp4$/, '.part.mp4');
    run(['-i', src, '-ss', t0.toFixed(4), '-t', d.toFixed(4), '-i', AUDIO, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', 'apad', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-f', 'mp4', part]);   // apad (sessiz kuyruk)
    put(part, out);
  }
}
