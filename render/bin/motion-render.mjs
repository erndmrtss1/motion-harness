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
process.argv = [process.argv[0], file, ...argv];
process.env.MOTION_CMD = cmd;
await import(pathToFileURL(file).href);
