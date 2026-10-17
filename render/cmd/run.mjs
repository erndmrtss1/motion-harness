// motion-render run — sahne başına sırayla tam geçiş (bellek: sırayla): render → (ss2) → (expo-post) → grade → qc → contact → ours
//
//   motion-render run <id…> [--ss2] [--expo-post] [--skip-render] [--ours-step N] [--no-qc] [--no-contact] [--no-ours] [-- <render argümanları>]
//
//   render     : motion-render render <id> --progress (animatik sayfasında manifest animatic.scale/step ile) → out/logs/A-<id>.out
//                --ss2 ise yerine motion-render ss2 <id> (2× kuralı; aralık render'ları + birleştirme) → aynı log
//                --expo-post ise sayfa pozlamasız çizilir (--set FX_EXPO_POST=1) ve ardından motion-render expo-post <id>
//   --skip-render: kareler hazır (out/frames/<id>); render/ss2 atlanır, kalan adımlar çalışır
//   grade      : motion-render grade <id> (animatik sayfası kendi yoluna gider)
//   qc         : motion-render qc <id> --mp4 auto → out/logs/A-<id>-qc.out (ilk satır özet)
//   contact    : motion-render contact <id>
//   ours       : motion-render ours <id> [--step N]
// Render başarısızsa o sahnenin kalan adımları atlanır. Çıkış: render hatası varsa onun kodu, değilse qc error varsa 3, başka hata 1.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, sceneById } from '../lib/project.mjs';
import { BIN, harnessArgs, harnessEnv, runCmd } from '../lib/run.mjs';

const dd = process.argv.indexOf('--'), args = process.argv.slice(2, dd > 0 ? dd : undefined), pass = dd > 0 ? process.argv.slice(dd + 1) : [];
const argOf = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const ids = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--ours-step');
if (!ids.length) { console.error('kullanım: motion-render run <id…> [--ss2] [--expo-post] [--skip-render] [--ours-step N] [--no-qc] [--no-contact] [--no-ours] [-- <render argümanları>]'); process.exit(2); }
const SS2 = args.includes('--ss2'), EXPO = args.includes('--expo-post');
const hm = () => new Date().toTimeString().slice(0, 8);
const has = (cmd) => fs.existsSync(path.join(path.dirname(BIN), '..', 'cmd', cmd + '.mjs'));
const LOGS = path.join(ROOT, 'out', 'logs'); fs.mkdirSync(LOGS, { recursive: true });
// uzun adımlar: çıktı log dosyasına (stdout + stderr)
const toLog = (cmd, a, file) => { const fd = fs.openSync(file, 'w'); try { return spawnSync(process.execPath, harnessArgs(cmd, a), { cwd: ROOT, env: harnessEnv(), stdio: ['ignore', fd, fd] }).status; } finally { fs.closeSync(fd); } };
const lines = (s) => String(s || '').replace(/\r/g, '').split('\n').filter((l) => l.trim());
const tail = (r, k) => lines((r.stdout || '') + (r.stderr || '')).slice(-k).forEach((l) => console.log('  ' + l));

let renderFail = 0, qcError = false, other = false;
for (const id of ids) {
  console.log('== ' + id + ' ' + hm());
  let S; try { S = sceneById(id); } catch (e) { console.log('✗ ' + e.message); other = true; continue; }
  const expo = EXPO && S.expoPost, set = expo ? ['--set', 'FX_EXPO_POST=1'] : [];
  if (EXPO && !S.expoPost) console.log('  not: ' + id + ' manifestinde expoPost yok — expo-post atlandı');
  // 1) render (ya da ss2)
  const outF = path.join(LOGS, 'A-' + id + '.out');
  const anim = S.animatic ? ['--scale', String(S.animatic.scale || 0.5), '--step', String(S.animatic.step || 2)] : [];
  const st = args.includes('--skip-render') ? (console.log('render ' + id + ' atlandı (--skip-render)'), 0) : SS2 ? toLog('ss2', [id, '--', ...set, ...pass], outF) : toLog('render', [id, '--progress', ...anim, ...set, ...pass], outF);
  if (!args.includes('--skip-render')) console.log((SS2 ? 'ss2 ' : 'render ') + id + ' çıkış ' + st + ' (log: ' + path.relative(ROOT, outF).replace(/\\/g, '/') + ')');
  if (st !== 0) { renderFail = renderFail || st || 1; continue; }
  // 2) expo-post
  if (expo) { const r = runCmd('expo-post', [id]); tail(r, 1); if (r.status !== 0) { other = true; console.log('expo-post ' + id + ' çıkış ' + r.status); continue; } }
  // 3) grade
  { const r = runCmd('grade', [id]); tail(r, 2); if (r.status !== 0) { other = true; continue; } }
  // 4) qc
  if (!args.includes('--no-qc')) {
    if (!has('qc')) console.log('  qc komutu yok — atlandı');
    else {
      const qf = path.join(LOGS, 'A-' + id + '-qc.out'), q = toLog('qc', [id, '--mp4', 'auto'], qf);
      console.log('qc ' + id + ' çıkış ' + q); const first = lines(fs.readFileSync(qf, 'utf8'))[0]; if (first) console.log('  ' + first);
      if (q === 3) qcError = true; else if (q !== 0) other = true;
    }
  }
  // 5) contact
  if (!args.includes('--no-contact')) { const r = runCmd('contact', [id]); tail(r, 1); if (r.status !== 0) other = true; }
  // 6) ours
  if (!args.includes('--no-ours')) {
    if (!has('ours')) console.log('  ours komutu yok — atlandı');
    else { const r = runCmd('ours', [id, ...(argOf('--ours-step') ? ['--step', argOf('--ours-step')] : [])]); tail(r, 3); if (r.status !== 0 && r.status !== 3) other = true; if (r.status === 3) qcError = true; }
  }
}
console.log('== bitti ' + hm());
process.exitCode = renderFail || (qcError ? 3 : other ? 1 : 0);
