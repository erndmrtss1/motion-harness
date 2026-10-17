// motion-render grade — evrensel grade + mp4; zincir world'den (lib/grade.mjs: sahne grade → world.json grade → sahnenin world adı → dark)
//
//   motion-render grade <id> [<id> …]        out/frames/<id>/%05d.png → out/scenes/<id>.mp4
//   motion-render grade <id> --animatic      out/frames/<id>_animatic (render --scale 0.5 --step 2 --tag animatic) → out/scenes/<id>_animatic.mp4 @FPS/2
//   motion-render grade <id>                 sahnenin manifestte `animatic` alanı varsa (animatik sayfası; kareler out/frames/<id>, adım animatic.step):
//       animatik encode + proje sesi → out/scenes/<id>.mp4  [--audio P] [--dir D] [--fps N] [--start K] [--count M] [--ss s] [--out P] [--crf 16] [--world W]
//       (--dir verilirse manifestte olmayan kimlikle de; ses ofseti varsayılanı perde başlangıcı range[0]/fps; ses yoksa sessiz)
//   motion-render grade --png in.png out.png [--world W]   tek kare provası (grade + BT.709 → tekrar RGB png)
//
// Koyu zincir sıra bağlayıcı: curves hafif S · colorbalance · vignette 0.72 (siyah noktasından ÖNCE) · colorlevels siyah noktası #0A0908 · BT.709.
// Saf siyah: son 0.4 s (= 12·KF kare; animatik 6·KF) ve (blackStart ise) kare 0 — colorbalance/colorlevels o karelerde kapalı; slice (perde kesiti) → 0.
// grade.fadeOut [n0, n1]: sahne sonu inişinde tam grade → saf grade kare kare (N ile blend); saf kuyrukta birden kapanma basamağı yok.
// Çıktı .part → rename; dosya kilitliyse (oynatıcıda açık) <id>.<zaman>.mp4 olarak yazılır ve raporlanır.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PNG } from 'pngjs';
import { ffmpeg, ff, TO709, X264_ARGS } from '../lib/ffmpeg.mjs';
import { ROOT, MAN, FPS, sceneById } from '../lib/project.mjs';
import { gradeChain, sceneVf, chainSpec } from '../lib/grade.mjs';

const args = process.argv.slice(2), argOf = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const known = (x) => { try { return !!sceneById(x); } catch { return false; } };

if (args[0] === '--png') {   // tek kare provası (grade + BT.709 → tekrar RGB png); en/vignette kare bağımsız
  const [, inp, outp] = args, world = argOf('--world');
  if (!inp || !outp) { console.error('kullanım: motion-render grade --png in.png out.png [--world W]'); process.exit(2); }
  const vf = gradeChain(world, null) + ',' + TO709 + ',scale=in_color_matrix=bt709:in_range=tv:out_range=pc';
  const r = spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', path.resolve(ROOT, inp), '-vf', vf, '-pix_fmt', 'rgb24', path.resolve(ROOT, outp)]);
  if (r.status !== 0) { console.error(String(r.stderr)); process.exit(1); }
  console.log('✓ ' + outp + ' · zincir ' + chainSpec(world).name);
  process.exit(0);
}

// değer alan bayraklar (kimlik sayılmaz); --audio değeri isteğe bağlı (sonraki sözcük bayrak ya da sahne kimliği değilse)
const VALUED = new Set(['--dir', '--fps', '--start', '--count', '--ss', '--out', '--crf', '--world']);
const ai = args.indexOf('--audio'), audioVal = ai >= 0 && args[ai + 1] && !args[ai + 1].startsWith('--') && !known(args[ai + 1]) ? args[ai + 1] : null;
const ids = args.filter((a, i) => !a.startsWith('--') && !VALUED.has(args[i - 1]) && !(audioVal && i === ai + 1));
if (!ids.length) { console.error('kullanım: motion-render grade <id…> [--animatic] [--audio [P]] · motion-render grade --png in.png out.png [--world W]'); process.exit(2); }
const ANIM = args.includes('--animatic');

// ── animatik sayfası: kaynak hattın animatik encode'u (+ ses) ─────────────
// Grade: sahnenin zinciri saf kuyruksuz (animatik kesit: son kare siyah kuralı yok); BT.709 matrisiyle YUV'a (TO709) → yuv420p.
function animEncode(id, S) {
  const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
  const fps = +opt('fps', 0) || (S && S.animatic && S.animatic.fps) || 15, DIR = path.resolve(ROOT, opt('dir', path.join('out', 'frames', id))), start = +opt('start', 0);
  const n = +opt('count', 0) || fs.readdirSync(DIR).filter((f) => /^\d{5}\.png$/.test(f) && +f.slice(0, 5) >= start).length, dur = n / fps, ss = +opt('ss', S && S.range ? S.range[0] / FPS : 0);   // ses ofseti varsayılanı perde başlangıcı (manifest range, ses zamanı)
  const aRel = audioVal || MAN.audio || null, audio = aRel ? path.resolve(ROOT, aRel) : null, hasA = !!audio && fs.existsSync(audio);   // varsayılan proje sesi (scenes.json audio)
  const vf = [gradeChain(opt('world', S && S.world), null, 0, 0, (S && S.grade) || {}), TO709, 'format=yuv420p'].join(',');
  const out = path.resolve(ROOT, opt('out', path.join('out', 'scenes', id + '.mp4'))), part = out.replace(/\.mp4$/, '.part.mp4');
  const a = ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', String(fps), '-start_number', String(start), '-i', path.join(DIR, '%05d.png')];
  if (hasA) a.push('-ss', ss.toFixed(3), '-t', dur.toFixed(3), '-i', audio);
  a.push('-frames:v', String(n), '-vf', vf, '-c:v', 'libx264', '-crf', opt('crf', '16'), '-preset', 'slow', '-r', String(fps), '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709');
  if (hasA) a.push('-c:a', 'aac', '-b:a', '160k', '-shortest');
  a.push(part);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const r = spawnSync(ffmpeg, a, { encoding: 'utf8' }); if (r.status !== 0) { console.error(r.stderr); process.exitCode = 1; return; }
  fs.renameSync(part, out); console.log('✓ ' + path.relative(ROOT, out) + ' · ' + n + ' kare · ' + fps + ' fps · ' + dur.toFixed(2) + ' s' + (hasA ? ' · ses: ' + path.basename(audio) : ' · sessiz'));
}

for (const id of ids) {
  let s = null; try { s = sceneById(id); } catch { /* aşağıda */ }   // film dışı sayfalar (demo manifestleri) de kimlikle bulunur; çıktı s.out
  if (s ? s.animatic : argOf('--dir')) { animEncode(id, s); continue; }
  if (!s) { console.error('manifestte yok: ' + id); process.exitCode = 1; continue; }
  if (ai >= 0) { console.error(id + ': --audio yalnız animatik sayfasıyla (tam sahneye ses: motion-render ses ' + id + ')'); process.exitCode = 2; continue; }
  if (s.encode) { console.log(id + ': kendi encode\'u (' + s.encode + ')'); continue; }
  // --animatic: out/frames/<id>_animatic (render --scale 0.5 --step 2 --tag animatic) → <id>_animatic.mp4 @FPS/2, saf kuyruk yarı kare sayısıyla
  const nWant = ANIM ? Math.ceil(s.frames / 2) : s.frames, fps = ANIM ? FPS / 2 : FPS;
  const dir = path.join(ROOT, 'out', 'frames', id + (ANIM ? '_animatic' : '')), n = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^\d{5}\.png$/.test(f)).length : 0;
  if (n !== nWant) { console.error(id + ': ' + n + ' kare var, ' + nWant + ' bekleniyor (' + path.relative(ROOT, dir) + ')'); process.exitCode = 1; continue; }
  const vf = sceneVf(s, { frames: nWant, anim: ANIM }) + ',' + TO709;
  const mp4 = s.out && !ANIM ? path.join(ROOT, s.out) : path.join(ROOT, 'out', 'scenes', id + (ANIM ? '_animatic' : '') + '.mp4'), part = mp4 + '.part', t0 = Date.now();
  fs.mkdirSync(path.dirname(mp4), { recursive: true });
  try { ff(['-framerate', String(fps), '-i', path.join(dir, '%05d.png'), '-vf', vf, ...X264_ARGS, '-f', 'mp4', part], { spawn: { cwd: ROOT } }); }
  catch (e) { console.error('✗ ' + id + ' · ' + e.message); process.exitCode = 1; continue; }
  let dst = mp4;
  try { fs.renameSync(part, mp4); } catch { dst = mp4.replace(/\.mp4$/, '.' + Date.now() + '.mp4'); fs.renameSync(part, dst); console.log('UYARI: ' + path.basename(mp4) + ' kilitli (oynatıcıda açık?) → ' + path.basename(dst)); }
  const probe = (i) => {
    const png = path.join(ROOT, 'out', 'probe', '_ge-' + id + '-' + i + '.png');
    fs.mkdirSync(path.dirname(png), { recursive: true });
    spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', dst, '-vf', "select='eq(n," + i + ")'", '-frames:v', '1', png]);
    const d = PNG.sync.read(fs.readFileSync(png)).data; let mx = 0, mn = 255;
    for (let k = 0; k < d.length; k += 4) { const v = Math.max(d[k], d[k + 1], d[k + 2]); if (v > mx) mx = v; if (v < mn) mn = v; }
    fs.unlinkSync(png); return { mx, mn };
  };
  const last = probe(nWant - 1), first = probe(0);
  console.log('✓ ' + path.relative(ROOT, dst) + ' · ' + (s.world || '—') + ' (' + chainSpec(s.world, s.grade || {}).name + ') · ' + nWant + ' kare' + (ANIM ? ' @' + fps + ' (animatik)' : '') + ' · ' + Math.round(fs.statSync(dst).size / 1024) + ' KB · ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s · kare 0 max ' + first.mx + ' · son kare max ' + last.mx);
}
