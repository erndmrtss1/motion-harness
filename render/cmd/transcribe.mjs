// motion-render transcribe — kelime zamanlı transkript (faster-whisper, isteğe bağlı Python ekstrası) + klip doğrulaması.
//   motion-render transcribe <ses> [--out script/<ad>] [--model large-v3] [--low 0.6] [--lang tr] [--python P]
//       → <out>.words.json · .srt · .txt · .dogrula.md   (render/py/transcribe.py)
//   motion-render transcribe verify "<ad>,<kaynak>,<a>,<b>" … [--src KAYNAK=ses.mp3 …] [--model large-v3] [--beams 5,10] [--lang tr] [--log out/logs/<ad>-clipcheck.log]
//       şüpheli bölgeleri kısa kliplerle, önceki metne koşulsuz, ışın 5/10 ile yeniden döker (render/py/clipcheck.py; Whisper halüsinasyonu ve
//       iki ses arası fark doğrulaması; kaynak: ağaç dışı clipcheck betikleri). Sonuç elle `<ad>.words.json` meta.fixes'e işlenir; ham çıktı `<ad>.whisper.words.json` olarak saklanır.
//   motion-render transcribe check    Python + faster-whisper var mı?
// Python: --python ‖ MOTION_PYTHON ‖ <proje>/.venv ‖ python3/python. ffmpeg yolu env FFMPEG ile Python'a verilir (lib/ffmpeg).
// faster-whisper yoksa kurulum yolu yazılır ve çıkış 1 (motion-render init <proje> --with-whisper ya da pip install -r render/requirements.txt).
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ROOT } from '../lib/project.mjs';
import { ffmpeg } from '../lib/ffmpeg.mjs';
import { slugOf } from '../lib/audio-core.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), PY = path.join(HERE, '..', 'py'), REQ = path.join(HERE, '..', 'requirements.txt');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const VALUED = new Set(['--out', '--model', '--low', '--lang', '--python', '--src', '--beams', '--log']);
const pos = args.filter((a, i) => !a.startsWith('--') && !VALUED.has(args[i - 1]));

function findPython() {
  const c = [opt('python', null), process.env.MOTION_PYTHON,
    path.join(ROOT, '.venv', 'Scripts', 'python.exe'), path.join(ROOT, '.venv', 'bin', 'python'),
    ...(process.platform === 'win32' ? ['python', 'py', 'python3'] : ['python3', 'python'])].filter(Boolean);
  for (const p of c) {
    if ((p.includes('/') || p.includes('\\')) && !fs.existsSync(p)) continue;
    const r = spawnSync(p, ['-c', 'import sys; print(sys.version.split()[0])'], { encoding: 'utf8' });
    if (r.status === 0) return { py: p, ver: r.stdout.trim() };
  }
  return null;
}
function needWhisper() {
  const f = findPython();
  if (!f) { console.error('✗ Python bulunamadı (MOTION_PYTHON ya da --python). Ses hattının transkript adımı isteğe bağlıdır; kelime dosyası elle de verilebilir.'); process.exit(1); }
  const r = spawnSync(f.py, ['-c', 'import faster_whisper, numpy; print(faster_whisper.__version__)'], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error('✗ faster-whisper kurulu değil (' + f.py + ', Python ' + f.ver + ').\n  Kurulum: motion-render init <proje> --with-whisper   (proje kökünde .venv)\n' +
      '       ya da: ' + f.py + ' -m pip install -r ' + REQ + '\n  Sonra: MOTION_PYTHON=<.venv python> motion-render transcribe …');
    process.exit(1);
  }
  return { ...f, whisper: r.stdout.trim() };
}
const ENV = { ...process.env, FFMPEG: ffmpeg, PYTHONIOENCODING: 'utf-8' };

if (pos[0] === 'check') {
  const f = needWhisper();
  console.log('✓ Python ' + f.ver + ' (' + f.py + ') · faster-whisper ' + f.whisper + ' · ffmpeg ' + ffmpeg);
} else if (pos[0] === 'verify') {
  const specs = pos.slice(1);
  if (!specs.length) { console.error('kullanım: motion-render transcribe verify "<ad>,<kaynak>,<a>,<b>" … [--src KAYNAK=ses.mp3]'); process.exit(2); }
  const srcs = []; args.forEach((a, i) => { if (a === '--src' && args[i + 1]) { const [k, ...v] = args[i + 1].split('='); srcs.push(k + '=' + path.resolve(ROOT, v.join('='))); } });
  const alias = new Set(srcs.map((s) => s.split('=')[0]));
  const fixed = specs.map((s) => { const p = s.split(','); if (p.length !== 4 || !isFinite(+p[2]) || !isFinite(+p[3])) { console.error('spec biçimi: "<ad>,<kaynak>,<a>,<b>" — ' + s); process.exit(2); } if (!alias.has(p[1])) p[1] = path.resolve(ROOT, p[1]); return p.join(','); });
  const f = needWhisper();
  const a = [path.join(PY, 'clipcheck.py'), ...fixed, ...srcs.flatMap((s) => ['--src', s]), '--model', opt('model', 'large-v3'), '--beams', opt('beams', '5,10'), '--lang', opt('lang', 'tr')];
  const LOG = opt('log', null) ? path.resolve(ROOT, opt('log')) : null;
  if (LOG) fs.mkdirSync(path.dirname(LOG), { recursive: true });
  const ch = spawn(f.py, a, { env: ENV, cwd: ROOT });
  const logS = LOG ? fs.createWriteStream(LOG, { flags: 'a' }) : null;
  ch.stdout.on('data', (b) => { process.stdout.write(b); if (logS) logS.write(b); });
  ch.stderr.on('data', (b) => process.stderr.write(b));
  const code = await new Promise((res) => ch.on('close', res));
  if (logS) { logS.end(); console.log('günlük: ' + path.relative(ROOT, LOG)); }
  process.exit(code === 0 ? 0 : 1);
} else {
  const AUDIO = pos[0];
  if (!AUDIO) { console.error('kullanım: motion-render transcribe <ses> [--out script/<ad>] [--model large-v3] [--low 0.6] [--lang tr] · transcribe verify <spec…> · transcribe check'); process.exit(2); }
  const src = path.resolve(ROOT, AUDIO);
  if (!fs.existsSync(src)) { console.error('ses yok: ' + AUDIO); process.exit(1); }
  const out = path.resolve(ROOT, opt('out', 'script/' + slugOf(AUDIO)));
  const f = needWhisper();
  const rl = (p) => { const x = path.relative(ROOT, p); return x.startsWith('..') || path.isAbsolute(x) ? p : x.split(path.sep).join('/'); };   // meta.audio göreli kalsın (cwd = kök)
  const r = spawnSync(f.py, [path.join(PY, 'transcribe.py'), rl(src), '--out', rl(out), '--model', opt('model', 'large-v3'), '--low', opt('low', '0.6'), '--lang', opt('lang', 'tr')], { env: ENV, cwd: ROOT, stdio: 'inherit' });
  process.exit(r.status === 0 ? 0 : 1);
}
