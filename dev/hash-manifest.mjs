#!/usr/bin/env node
// Kaynak ağaç SHA-256 manifesti — SALT OKUNUR (yalnız lstat + read stream).
// Kullanım:
//   node dev/hash-manifest.mjs <cikti.json> ad=yol [ad=yol ...] [--volatile=ad/alt,ad2] [--reuse=once.json]
// Sembolik bağ izlenmez; {type:"link", target} olarak kaydedilir.
// --volatile: başka session'ın yazıyor olabileceği alt ağaçlar (fark raporunda ayrı sayılır).
// --reuse: hızlı ara kontrol — boyut+mtime önceki manifestle aynıysa SHA yeniden kullanılır
//          (tam yeniden hash için bayraksız koştur; H5 son kanıtı tam koşudur).
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const out = args.shift();
if (!out) { console.error('kullanım: hash-manifest.mjs <cikti.json> ad=yol ...'); process.exit(2); }
const roots = {};
let volatile = [];
let reuse = null;
for (const a of args) {
  if (a.startsWith('--volatile=')) volatile = a.slice(11).split(',').filter(Boolean);
  else if (a.startsWith('--reuse=')) reuse = JSON.parse(fs.readFileSync(a.slice(8), 'utf8')).files;
  else { const i = a.indexOf('='); roots[a.slice(0, i)] = a.slice(i + 1); }
}

const files = {};
const errors = [];
const queue = [];
let bytes = 0, done = 0, reused = 0;

async function walk(name, abs, rel) {
  let dir;
  try { dir = await fsp.opendir(abs); } catch (e) { errors.push({ path: `${name}/${rel}`, error: e.code }); return; }
  for await (const ent of dir) {
    const a = path.join(abs, ent.name);
    const r = rel ? `${rel}/${ent.name}` : ent.name;
    const key = `${name}/${r}`;
    if (ent.isSymbolicLink()) {
      let target = null; try { target = await fsp.readlink(a); } catch {}
      files[key] = { type: 'link', target };
    } else if (ent.isDirectory()) {
      await walk(name, a, r);
    } else if (ent.isFile()) {
      queue.push([key, a]);
    }
  }
}

function hashFile(a) {
  return new Promise((res, rej) => {
    const h = crypto.createHash('sha256');
    const s = fs.createReadStream(a, { highWaterMark: 1 << 20 });
    s.on('data', d => h.update(d));
    s.on('error', rej);
    s.on('end', () => res(h.digest('hex')));
  });
}

const t0 = Date.now();
for (const [name, p] of Object.entries(roots)) {
  const st = await fsp.lstat(p).catch(() => null);
  if (!st) { errors.push({ path: name, error: 'ENOENT' }); continue; }
  if (st.isFile()) queue.push([name, p]);
  else await walk(name, p, '');
}
console.error(`[hash] ${queue.length} dosya listelendi (${((Date.now() - t0) / 1000).toFixed(1)} s)`);

let idx = 0;
const N = 12;
async function worker() {
  while (idx < queue.length) {
    const [key, a] = queue[idx++];
    try {
      const st = await fsp.stat(a);
      const mtimeMs = Math.round(st.mtimeMs);
      const prev = reuse?.[key];
      let sha256;
      if (prev && prev.size === st.size && prev.mtimeMs === mtimeMs) { sha256 = prev.sha256; reused++; }
      else sha256 = await hashFile(a);
      files[key] = { sha256, size: st.size, mtimeMs };
      bytes += st.size;
    } catch (e) { errors.push({ path: key, error: e.code || String(e) }); }
    if (++done % 2000 === 0) console.error(`[hash] ${done}/${queue.length} · ${(bytes / 1e9).toFixed(2)} GB`);
  }
}
await Promise.all(Array.from({ length: N }, worker));

const sorted = Object.fromEntries(Object.keys(files).sort().map(k => [k, files[k]]));
const manifest = {
  tool: 'motion-harness/dev/hash-manifest.mjs',
  created: new Date().toISOString(),
  roots, volatile,
  mode: reuse ? 'quick(size+mtime reuse)' : 'full',
  totals: { entries: Object.keys(files).length, bytes, reused, seconds: (Date.now() - t0) / 1000, errors: errors.length },
  errors,
  files: sorted,
};
await fsp.mkdir(path.dirname(path.resolve(out)), { recursive: true });
await fsp.writeFile(out, JSON.stringify(manifest, null, 1));
console.error(`[hash] bitti: ${manifest.totals.entries} kayıt, ${(bytes / 1e9).toFixed(2)} GB, ${manifest.totals.seconds.toFixed(0)} s, hata ${errors.length}`);
