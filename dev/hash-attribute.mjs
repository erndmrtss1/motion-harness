#!/usr/bin/env node
// Kararlı bölgede değişen kaynak dosyaları, kaynağı yazan canlı session'ın transkriptiyle eşleştirir.
// Bu session kaynak ağaçlara hiç yazmaz; değişen her dosya başka session'a atfedilebilmeli.
// Ölçüt: "atfedilemeyen = 0". Transkript akışla okunur (büyük; tamamı belleğe alınmaz).
// Kullanım: node dev/hash-attribute.mjs <hash-diff.json> <transkript.jsonl>[,<transkript2.jsonl>]
//             [--since=ISO] [--scripts=dizin1,dizin2] [--json=out.json]
import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';

const [diffFile, tFiles, ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const diff = JSON.parse(fs.readFileSync(diffFile, 'utf8'));
const since = opt.since ? Date.parse(opt.since) : Date.parse(diff.before.created);
const changed = [...diff.stable.added, ...diff.stable.removed, ...diff.stable.changed];

// manifest anahtarı "Kok/docs/X.md" → aranacak işaretler: göreli yol ve dosya adı
const needles = changed.map(k => {
  const rel = k.split('/').slice(1).join('/');
  return { key: k, rel, base: path.basename(rel), hits: [] };
});

// Bash komutunun çağırdığı betik (ör. node $SP/f11-docs2.mjs) dosyayı içeriden yazıyor olabilir:
// komuttaki betik adları --scripts dizinlerinde aranır, içerikleri de taranır (yalnız okuma).
const scriptDirs = (opt.scripts || '').split(',').filter(Boolean);
const scriptCache = new Map();
function scriptText(name) {
  if (scriptCache.has(name)) return scriptCache.get(name);
  let txt = '';
  for (const d of scriptDirs) {
    try { txt = fs.readFileSync(path.join(d, name), 'utf8'); break; } catch {}
  }
  scriptCache.set(name, txt);
  return txt;
}

for (const t of tFiles.split(',')) {
  const rl = readline.createInterface({ input: fs.createReadStream(t, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.includes('tool_use')) continue;
    let ev; try { ev = JSON.parse(line); } catch { continue; }
    const ts = Date.parse(ev.timestamp || '');
    if (!(ts >= since)) continue;
    const blocks = ev.message?.content;
    if (!Array.isArray(blocks)) continue;
    for (const b of blocks) {
      if (b.type !== 'tool_use') continue;
      const s = JSON.stringify(b.input || {}).replace(/\\\\/g, '/');
      const called = b.name === 'Bash' || b.name === 'PowerShell'
        ? [...new Set((String(b.input?.command || '').match(/[\w.@-]+\.(?:mjs|cjs|js|py|sh)\b/g) || []))] : [];
      for (const n of needles) {
        if (s.includes(n.rel) || s.includes(n.base)) { n.hits.push({ ts: ev.timestamp, tool: b.name, via: 'input', session: path.basename(t) }); continue; }
        const sc = called.find(c => scriptText(c).includes(n.base));
        if (sc) n.hits.push({ ts: ev.timestamp, tool: b.name, via: sc, session: path.basename(t) });
      }
    }
  }
}

// Bash ile dolaylı yazanlar (ör. betik içinde yol) eşleşmeyebilir; mtime'ı since sonrası olanlar ayrıca listelenir.
const res = needles.map(n => ({ key: n.key, attributed: n.hits.length > 0, firstHit: n.hits[0] || null, hitCount: n.hits.length }));
const unattributed = res.filter(r => !r.attributed);
const out = { since: new Date(since).toISOString(), changed: changed.length, attributed: res.length - unattributed.length, unattributed: unattributed.length, items: res };
if (opt.json) fs.writeFileSync(opt.json, JSON.stringify(out, null, 1));
console.log(`kararlı bölge değişen: ${changed.length} · canlı session'a atfedilen: ${out.attributed} · atfedilemeyen: ${out.unattributed}`);
for (const r of unattributed.slice(0, 30)) console.log('  ? ' + r.key);
process.exit(unattributed.length === 0 ? 0 : 1);
