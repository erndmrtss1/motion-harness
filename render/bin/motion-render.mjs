#!/usr/bin/env node
// motion-render — @motion/harness komut dağıtıcısı (sözleşme: render/CONTRACT.md §6).
// Kullanım: motion-render <komut> [--project <dizin>] [argümanlar…]
// --project kaldırılır ve MOTION_PROJECT'e yazılır; komut modülü kalan argümanları process.argv'den okur.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CMD_DIR = path.join(HERE, '..', 'cmd');

// komut → modül (aynı modülü paylaşan alt komutlar: probe = render --frame)
const ALIAS = { probe: 'render', 'fc': 'frame-check' };

const argv = process.argv.slice(2);
const i = argv.indexOf('--project');
if (i >= 0) { process.env.MOTION_PROJECT = path.resolve(argv[i + 1]); argv.splice(i, 2); }
const cmd = argv.shift();

function list() {
  return fs.readdirSync(CMD_DIR).filter((f) => f.endsWith('.mjs')).map((f) => f.slice(0, -4)).sort();
}
if (!cmd || cmd === '--help' || cmd === '-h' || cmd === 'help') {
  console.log('motion-render <komut> [--project <dizin>] …\nkomutlar: ' + list().concat(Object.keys(ALIAS)).sort().join(' ') +
    '\nayrıntı: render/CONTRACT.md §6');
  process.exit(cmd ? 0 : 2);
}
if (cmd === '--version' || cmd === '-v') {
  const pkg = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'package.json'), 'utf8'));
  console.log(pkg.name + ' ' + pkg.version);
  process.exit(0);
}
const mod = ALIAS[cmd] || cmd;
const file = path.join(CMD_DIR, mod + '.mjs');
if (!fs.existsSync(file)) { console.error('bilinmeyen komut: ' + cmd + ' (motion-render help)'); process.exit(2); }
if (cmd === 'probe' && !argv.includes('--frame')) { console.error('probe: --frame N gerekir'); process.exit(2); }
// --help / -h: komut ÇALIŞTIRILMAZ; komut dosyasının baş açıklama bloğu (kullanım) basılır. '--' sonrası argümanlar komuta aittir.
const own = argv.indexOf('--') >= 0 ? argv.slice(0, argv.indexOf('--')) : argv;
if (own.includes('--help') || own.includes('-h')) {
  const src = fs.readFileSync(file, 'utf8').split('\n');
  let i0 = 0;
  while (i0 < src.length && (src[i0].startsWith('#!') || src[i0].trim() === '')) i0++;
  const head = [];
  for (let k = i0; k < src.length && src[k].startsWith('//'); k++) head.push(src[k].replace(/^\/\/ ?/, ''));
  console.log(head.length ? head.join('\n') : 'motion-render ' + cmd + ' — açıklama yok (render/CONTRACT.md §6)');
  process.exit(0);
}
// Süreçler arası ağır iş kilidi (MOTION_RENDER_LOCK=<dizin yolu>): birden çok oturum aynı makinede render/ölçüm yaparken
// CPU'yu sırayla kullanır. mkdir atomiktir; sahibi ölmüşse kilit bayat sayılır. Alt süreçler MOTION_LOCK_HELD ile devralır.
const HEAVY = new Set(['render', 'lookdev-diff', 'motion-test', 'probe', 'ss2', 'run', 'qc', 'frame-check', 'fc', 'ours', 'k1', 'k6', 'grade', 'encode', 'expo-post', 'master', 'arsiv', 'live', 'smoke', 'contact']);
if (process.env.MOTION_RENDER_LOCK && !process.env.MOTION_LOCK_HELD && HEAVY.has(cmd)) {
  const lock = path.resolve(process.env.MOTION_RENDER_LOCK), owner = path.join(lock, 'owner.json');
  const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
  let said = false;
  for (;;) {
    try {
      fs.mkdirSync(lock);
      fs.writeFileSync(owner, JSON.stringify({ pid: process.pid, cmd, cwd: process.cwd(), since: new Date().toISOString() }));
      break;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      let o = null; try { o = JSON.parse(fs.readFileSync(owner, 'utf8')); } catch { /* yazılıyor olabilir */ }
      if (o && !alive(o.pid)) { fs.rmSync(lock, { recursive: true, force: true }); continue; }
      if (!said) { console.log('… ağır iş kilidi bekleniyor (' + (o ? o.cmd + ' · pid ' + o.pid : 'başka oturum') + ')'); said = true; }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  process.env.MOTION_LOCK_HELD = '1';
  process.on('exit', () => { try { const o = JSON.parse(fs.readFileSync(owner, 'utf8')); if (o.pid === process.pid) fs.rmSync(lock, { recursive: true, force: true }); } catch { /* yok */ } });
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(130));
}
process.argv = [process.argv[0], file, ...argv];
process.env.MOTION_CMD = cmd;
await import(pathToFileURL(file).href);
