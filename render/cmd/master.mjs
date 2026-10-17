// motion-render master — film master: perde kareleri → grade (grade ile aynı zincir; fadeOut / saf kareler aynı mantık)
//   → perdeler concat süzgecinde TEK sürekli encode (tek çözme, iki çıkış: ProRes 422 HQ yuv422p10le + H.264 CRF 16 yuv420p) → ses ile kopya birleştirme
//   → out/master/<film>_<tag>.mov / .mp4
//   (perde parçalarını uç uca eklemek dikişte IDR/GOP farkı bırakıyordu — önizlemede ardışık fark oranı 4.76, ham karede 0.18 düzgün)
//   Ses: scenes.json "audio" → 48 kHz stereo (çift mono) → film süresine sessiz kuyruk (apad) → doğrusal kazanç −16 LUFS (ölçülen I'dan; tepe −1 dBTP altında
//   kalıyorsa sınırlayıcı yok) → ölçüm kuyruk dahil bütün dosyada (ebur128 peak=true) → out/master/<film>_<tag>-loudness.json
//
//   motion-render master [--tag v1] [--film <id>] [--ids P1,…,P6] [--skip-video] [--skip-audio]
//   Film ve perdeler manifestten (lib/film.mjs): `parent` = film kimliği olan, animatik olmayan sahneler, range sırasıyla; --ids ile elle.
// Çıktılar .part → rename. Sessiz video ara dosyaları out/master/parts/ (ses yeniden birleştirmesi için kalır).
//
//   motion-render master --reel [--v3] [--out P]
//   izleme reel'i: bütün sahneler film sırasıyla tek dosyada, sol üstte etiket "<id> · <tc> · <ms>ms" (JetBrains Mono 28 px, %60 opak; fonts/gf/JetBrainsMono-500.ttf);
//   sahneler arası 1 s siyah; render edilemeyen sahne 2 s siyah + "<id> · RENDER HATASI". Segmentler PNG karelerinden yeniden kodlanır
//   (recordVideo yoluyla üretilmiş sahnede onun mp4'ü) → out/REEL_v2.mp4 (çalışma out/reel). --v3: yalnız manifest sahneleri, film sırası (TC; TC'siz sona),
//   kaynak her sahnenin grade'li mp4'ü (en yeni) → out/REEL_v3.mp4 (çalışma out/reel-v3). Manifest `reel: false` sahneyi dışarıda bırakır (v2).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ffmpeg, ff as ffRun, TO709, X264_ARGS } from '../lib/ffmpeg.mjs';
import { ROOT, MAN, FPS, WIDTH, HEIGHT, SCENES, sceneById, readTimeline, latestMp4 } from '../lib/project.mjs';
import { sceneVf } from '../lib/grade.mjs';
import { filmParts, filmOfScene } from '../lib/film.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
if (args.includes('--help') || args.includes('-h')) { console.log('kullanım: motion-render master [--tag v1] [--film id] [--ids a,b,…] [--skip-video] [--skip-audio] · motion-render master --reel [--v3] [--out P]'); process.exit(0); }

if (args.includes('--reel')) {
  // ── izleme reel'i ──────────────────────────────────────────────────────
  const run = (a) => ffRun(a, { spawn: { cwd: ROOT } });   // cwd = ROOT: drawtext yolu göreli (sürücü harfi yok → kaçış gerekmez)
  const OUT = path.join(ROOT, 'out');
  const V3 = args.includes('--v3');
  const WORK = path.join(OUT, V3 ? 'reel-v3' : 'reel');
  const FONT = 'fonts/gf/JetBrainsMono-500.ttf';
  const GAP_S = 1, FAIL_S = 2, SIZE = WIDTH + 'x' + HEIGHT;
  const label = (scene, totalMs) => scene.id + ' · ' + (scene.tc || '—') + ' · ' + totalMs + 'ms';
  fs.rmSync(WORK, { recursive: true, force: true });
  fs.mkdirSync(path.join(WORK, 'labels'), { recursive: true });
  const black = path.join(WORK, 'black.mp4');
  run(['-f', 'lavfi', '-i', 'color=c=black:s=' + SIZE + ':r=' + FPS + ':d=' + GAP_S, '-vf', TO709, ...X264_ARGS, black]);
  const list = [], failed = [];
  let total = 0;
  const tcs = (tc) => { if (!tc) return 1e9; const [m, s] = tc.split(':'); return +m * 60 + +s; };
  const LIST = V3 ? SCENES.slice().sort((a, b) => tcs(a.tc) - tcs(b.tc)).map((m) => Object.assign({}, m, { reelSrc: 'mp4' }))
    : SCENES.filter((s) => s.reel !== false);
  LIST.forEach((scene, k) => {
    const tl = readTimeline(scene.file);
    const frames = path.join(OUT, 'frames', scene.id);
    const single = (V3 && latestMp4(scene.id)) || path.join(OUT, 'scenes', scene.id + '.mp4');   // v3: kilitli dosya yerine zaman damgalı en yeni
    const meta = path.join(OUT, 'logs', scene.id + '.json');
    const byRecording = (scene.reelSrc === 'mp4' || (fs.existsSync(meta) && JSON.parse(fs.readFileSync(meta, 'utf8')).method === 'recordVideo')) && fs.existsSync(single); // reelSrc mp4: grade'li tekil mp4
    const hasFrames = fs.existsSync(frames) && fs.readdirSync(frames).filter((f) => f.endsWith('.png')).length === tl.frames;
    const ok = byRecording || hasFrames;
    // Render edilemeyen sahne: 2 s siyah + "<id> · RENDER HATASI" — boşluk görünür kalır.
    const text = ok ? label(scene, tl.totalMs) : scene.id + ' · RENDER HATASI';
    const txt = path.join(WORK, 'labels', scene.id + '.txt');
    fs.writeFileSync(txt, text);
    const draw = 'drawtext=fontfile=' + FONT + ':textfile=' + path.relative(ROOT, txt).replace(/\\/g, '/') +
      ':expansion=none:fontsize=28:fontcolor=white@0.6:x=40:y=40';
    const seg = path.join(WORK, String(k).padStart(2, '0') + '_' + scene.id + '.mp4');
    const input = !ok ? ['-f', 'lavfi', '-i', 'color=c=black:s=' + SIZE + ':r=' + FPS + ':d=' + FAIL_S]
      : byRecording ? ['-i', single]
      : ['-framerate', String(FPS), '-i', path.join(frames, '%05d.png')];
    run([...input, '-vf', draw + ',' + TO709, ...X264_ARGS, seg]);
    if (list.length) { list.push(black); total += GAP_S * 1000; }
    list.push(seg);
    total += ok ? tl.totalMs : FAIL_S * 1000;
    if (!ok) failed.push(scene.id);
    console.log((ok ? '· ' : '✗ ') + path.basename(seg) + '  ' + text);
  });
  if (failed.length) console.log('UYARI: RENDER HATASI boşluğu konan sahneler: ' + failed.join(', '));
  const listFile = path.join(WORK, 'list.txt');
  fs.writeFileSync(listFile, list.map((f) => "file '" + f.replace(/\\/g, '/') + "'").join('\n') + '\n');
  const reel = path.resolve(ROOT, opt('out', path.join('out', V3 ? 'REEL_v3.mp4' : 'REEL_v2.mp4')));
  run(['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', '-movflags', '+faststart', reel]);
  const secs = total / 1000;
  fs.writeFileSync(path.join(WORK, 'reel.json'), JSON.stringify({ totalMs: total, failed, segments: list.length }, null, 1));
  console.log('✓ ' + path.relative(ROOT, reel) + ' · ' + (list.length + 1) / 2 + ' sahne · ' +
    Math.floor(secs / 60) + ':' + String(Math.round(secs % 60)).padStart(2, '0') + ' · ' +
    Math.round(fs.statSync(reel).size / 1024 / 1024) + ' MB');
  process.exit(0);
}

// ── film master ───────────────────────────────────────────────────────────
const TAG = opt('tag', 'v1');
let FILM, IDS;
try {
  if (opt('ids')) { IDS = opt('ids').split(','); FILM = opt('film') || filmOfScene(sceneById(IDS[0])); }
  else { const P = filmParts(opt('film')); FILM = P.film; IDS = P.ids; }
} catch (e) { console.error(e.message); process.exit(1); }
if (!IDS.length) { console.error('perde yok (manifestte `parent` alanlı sahne ya da --ids)'); process.exit(1); }
const OUT = path.join(ROOT, 'out', 'master'), PARTS = path.join(OUT, 'parts');
fs.mkdirSync(PARTS, { recursive: true });
const ff = (a, quiet = true) => { const r = spawnSync(ffmpeg, ['-hide_banner', '-y', ...(quiet ? ['-loglevel', 'error'] : []), ...a], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }); if (r.status !== 0) { console.error((r.stderr || '').slice(-3000)); process.exit(1); } return r.stderr || ''; };
const ren = (part, dst) => { fs.renameSync(part, dst); return dst; };
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');
const PRORES = ['-c:v', 'prores_ks', '-profile:v', '3', '-vendor', 'apl0', '-pix_fmt', 'yuv422p10le', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv'];
const H264 = ['-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv'];
const scenes = IDS.map((id) => { try { return sceneById(id); } catch { console.error('manifestte yok: ' + id); process.exit(1); } });
scenes.forEach((s, k) => { if (k && s.range && scenes[k - 1].range && s.range[0] !== scenes[k - 1].range[1] + 1) { console.error('aralık boşluğu/çakışması: ' + scenes[k - 1].id + ' → ' + s.id); process.exit(1); } });
const nAll = scenes.reduce((a, s) => a + s.frames, 0), DUR = nAll / FPS;
const STEM = FILM + '_' + TAG;

const VMOV = path.join(PARTS, STEM + '-video.mov'), VMP4 = path.join(PARTS, STEM + '-video.mp4');
if (!args.includes('--skip-video')) {
  const inp = [], ch = [], t0 = Date.now();
  scenes.forEach((s, i) => {
    const dir = path.join(ROOT, 'out', 'frames', s.id), n = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^\d{5}\.png$/.test(f)).length : 0;
    if (n !== s.frames) { console.error(s.id + ': ' + n + ' kare, ' + s.frames + ' bekleniyor'); process.exit(1); }
    inp.push('-framerate', String(FPS), '-i', path.join(dir, '%05d.png'));
    const vf = sceneVf(s);   // grade ile aynı vf (TO709 hariç); fadeOut zincirinin iç etiketleri perdeye özgü
    ch.push('[' + i + ':v]' + vf.replace(/\[(ga|gb|gf|gp)\]/g, (m, l) => '[' + l + i + ']') + ',setsar=1[v' + i + ']');   // concat: perde zincirlerinin SAR'ı eşit (blend 1000:1000 veriyordu)
  });
  const fc = ch.join(';') + ';' + scenes.map((s, i) => '[v' + i + ']').join('') + 'concat=n=' + scenes.length + ':v=1:a=0,split[a][b];[a]' + TO709 + ',format=yuv422p10le[pa];[b]' + TO709 + ',format=yuv420p[pb]';
  ff([...inp, '-filter_complex', fc, '-map', '[pa]', ...PRORES, '-f', 'mov', VMOV + '.part', '-map', '[pb]', ...H264, '-f', 'mp4', VMP4 + '.part']);
  ren(VMOV + '.part', VMOV); ren(VMP4 + '.part', VMP4);
  console.log('✓ video · ' + nAll + ' kare · ProRes ' + Math.round(fs.statSync(VMOV).size / 1048576) + ' MB · H.264 ' + Math.round(fs.statSync(VMP4).size / 1048576) + ' MB · ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');
}

const WAV = path.join(OUT, STEM + '-ses.wav'), LJ = path.join(OUT, STEM + '-loudness.json');
if (!MAN.audio) { console.error('scenes.json "audio" yok — sessiz master desteklenmiyor (video ara dosyaları: ' + rel(PARTS) + ')'); process.exit(1); }
const AUDIO = path.join(ROOT, MAN.audio), r0 = (scenes[0].range ? scenes[0].range[0] : 0) / FPS;
const PRE = 'aresample=48000,pan=stereo|c0=c0|c1=c0,apad=whole_dur=' + (DUR + r0).toFixed(4) + ',atrim=start=' + r0.toFixed(4) + ':end=' + (DUR + r0).toFixed(4) + ',asetpts=PTS-STARTPTS';
const ebu = (inp, extra = []) => { const e = ff(['-nostats', ...extra, '-i', inp, '-map', '0:a:0', '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-'], false); const g = (re) => { const m = re.exec(e.slice(e.lastIndexOf('Summary:'))); return m ? +m[1] : null; }; return { I: g(/I:\s+(-?[\d.]+) LUFS/), LRA: g(/LRA:\s+(-?[\d.]+) LU/), TP: g(/Peak:\s+(-?[\d.]+) dBFS/) }; };
let L = fs.existsSync(LJ) ? JSON.parse(fs.readFileSync(LJ, 'utf8')) : {};
if (!args.includes('--skip-audio')) {
  const e1 = ff(['-nostats', '-i', AUDIO, '-af', PRE + ',loudnorm=I=-16:TP=-1:LRA=11:print_format=json', '-f', 'null', '-'], false), j1 = JSON.parse(e1.slice(e1.lastIndexOf('{'), e1.lastIndexOf('}') + 1));
  const gain = -16 - +j1.input_i, tpAfter = +j1.input_tp + gain;
  if (tpAfter > -1) { console.error('doğrusal kazançla tepe ' + tpAfter.toFixed(2) + ' dBTP > −1 → sınırlayıcı gerekir (kullanıcı kararı)'); process.exit(1); }
  ff(['-i', AUDIO, '-af', PRE + ',volume=' + gain.toFixed(3) + 'dB', '-c:a', 'pcm_s24le', '-ar', '48000', '-f', 'wav', WAV + '.part']); ren(WAV + '.part', WAV);
  L = { kaynak: { dosya: MAN.audio, I: +j1.input_i, TP: +j1.input_tp, LRA: +j1.input_lra, not: 'loudnorm ölçümü (48 kHz stereo çift mono, sessiz kuyruk dahil ' + DUR.toFixed(2) + ' s)' }, kazanc_dB: +gain.toFixed(3), yontem: 'doğrusal kazanç (volume); sınırlayıcı/sıkıştırma yok — tahmini tepe ' + tpAfter.toFixed(2) + ' dBTP', hedef: { I: -16, TP: -1 }, wav: Object.assign({ dosya: rel(WAV) }, ebu(WAV)) };
  fs.writeFileSync(LJ, JSON.stringify(L, null, 1)); console.log('✓ ' + rel(WAV) + ' · kazanç ' + gain.toFixed(2) + ' dB · ' + JSON.stringify(L.wav));
}

// video (kopya) + ses
const MOV = path.join(OUT, STEM + '.mov'), MP4 = path.join(OUT, STEM + '.mp4');
ff(['-i', VMOV, '-i', WAV, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'pcm_s24le', '-t', DUR.toFixed(4), '-f', 'mov', MOV + '.part']); ren(MOV + '.part', MOV);
ff(['-i', VMP4, '-i', WAV, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-t', DUR.toFixed(4), '-movflags', '+faststart', '-f', 'mp4', MP4 + '.part']); ren(MP4 + '.part', MP4);
const info = (f) => { const e = spawnSync(ffmpeg, ['-hide_banner', '-i', f], { encoding: 'utf8' }).stderr || '';   // çıkışsız -i: ffmpeg hata koduyla döner (yalnız bilgi)
  return { boyutMB: Math.round(fs.statSync(f).size / 1048576), sure: (/Duration: ([\d:.]+)/.exec(e) || [])[1], video: ((/Stream #0:0[^:]*: Video: ([^\n]+)/.exec(e) || [])[1] || '').trim().slice(0, 160), ses: ((/Stream #0:1[^:]*: Audio: ([^\n]+)/.exec(e) || [])[1] || '').trim() }; };
const frames = (f) => { const e = ff(['-i', f, '-map', '0:v:0', '-f', 'null', '-'], false).replace(/\r/g, '\n'); const m = e.match(/frame=\s*(\d+)/g); return m ? +m[m.length - 1].replace(/\D/g, '') : null; };
L.mov = Object.assign({ dosya: rel(MOV), kare: frames(MOV) }, info(MOV), ebu(MOV));
L.mp4 = Object.assign({ dosya: rel(MP4), kare: frames(MP4) }, info(MP4), ebu(MP4));
L.film = { kare: nAll, sure_s: +DUR.toFixed(3), fps: FPS };
fs.writeFileSync(LJ + '.part', JSON.stringify(L, null, 1)); ren(LJ + '.part', LJ);
console.log('✓ ' + rel(MOV) + ' · ' + JSON.stringify(L.mov));
console.log('✓ ' + rel(MP4) + ' · ' + JSON.stringify(L.mp4));
