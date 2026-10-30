// lib/plugin-sync.mjs — plugin metinleri ↔ kurulu checkout (PN-104). Claude Code plugin'i önbelleğe SÜRÜM klasörüyle kopyalar
// (<plugins>/cache/<pazar>/<plugin>/<sürüm>/); sürüm aynı kalınca (dal ucu, -dev) `claude plugin update` kopyayı yenilemez ve skill/ajan/komut
// metinleri eski kalır. Burada ${CLAUDE_PLUGIN_ROOT}'tan okunan dosyalar (TEXT_DIRS) checkout'tan önbelleğe aynalanır: değişen ve yeni dosya
// yazılır, checkout'ta olmayan silinir; önbelleğin geri kalanına (render/ kodu, belgeler) dokunulmaz. Karşılaştırma bayt bayt.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const TEXT_DIRS = ['.claude-plugin', 'commands', 'skills', 'agents', 'templates', 'render/runtime'];
export const PLUGIN_ID = 'motion@motion-harness';
export const pluginsDir = () => path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'plugins');

// kurulu kayıt: installed_plugins.json (v2: {plugins: {id: [{scope, installPath, version}]}}); kullanıcı kapsamı önce
export function installed(dir = pluginsDir(), id = PLUGIN_ID) {
  let j; try { j = JSON.parse(fs.readFileSync(path.join(dir, 'installed_plugins.json'), 'utf8')); } catch { return null; }
  const L = [].concat((j.plugins || {})[id] || []), e = L.find((x) => x.scope === 'user') || L[0];
  return e && e.installPath ? { path: e.installPath, version: e.version || null, scope: e.scope || null } : null;
}

function walk(base, rel, out) {
  let ents; try { ents = fs.readdirSync(path.join(base, rel), { withFileTypes: true }); } catch { return out; }
  for (const d of ents) {
    const r = rel ? rel + '/' + d.name : d.name;
    if (d.isDirectory()) walk(base, r, out); else if (d.isFile() && !d.name.endsWith('.part')) out.push(r);
  }
  return out;
}
const filesOf = (base, dirs) => new Set(dirs.flatMap((d) => walk(base, d, [])));

// fark: checkout (src) → önbellek (dst); yollar '/' ayraçlı, sıralı. eol: değişenlerden yalnız satır sonu farklı olanlar (eski CRLF kopya;
// yine eşitlenir, raporda içerik farkından ayrılır)
const noCR = (b) => b.toString('latin1').replace(/\r/g, '');
export function diff(src, dst, dirs = TEXT_DIRS) {
  const S = filesOf(src, dirs), D = filesOf(dst, dirs), changed = [], eol = [], added = [], stale = [];
  for (const f of S) {
    if (!D.has(f)) { added.push(f); continue; }
    const a = fs.readFileSync(path.join(src, f)), b = fs.readFileSync(path.join(dst, f));
    if (!a.equals(b)) { changed.push(f); if (noCR(a) === noCR(b)) eol.push(f); }
  }
  for (const f of D) if (!S.has(f)) stale.push(f);
  return { files: S.size, changed: changed.sort(), eol: eol.sort(), added: added.sort(), stale: stale.sort() };
}

// eşitle: check → yalnız fark; aksi halde yaz/sil ve yeniden karşılaştır (after = kalan fark, beklenen 0)
export function syncPlugin({ root, dir = pluginsDir(), id = PLUGIN_ID, dirs = TEXT_DIRS, check = false } = {}) {
  const inst = installed(dir, id);
  if (!inst) return { status: 'yok' };
  if (!fs.existsSync(inst.path)) return { status: 'eksik', ...inst };
  if (path.resolve(inst.path) === path.resolve(root)) return { status: 'aynı-dizin', ...inst };   // önbellek yerine checkout'tan yüklü
  const before = diff(root, inst.path, dirs), n = before.changed.length + before.added.length + before.stale.length;
  if (check || !n) return { status: n ? 'farklı' : 'güncel', ...inst, before };
  for (const f of before.changed.concat(before.added)) {
    const to = path.join(inst.path, f);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(root, f), to + '.part'); fs.renameSync(to + '.part', to);
  }
  for (const f of before.stale) {   // eski dosya + boşalan üst klasörleri (TEXT_DIRS kökü kalır; boş skill klasörü bırakılmaz)
    fs.rmSync(path.join(inst.path, f), { force: true });
    for (let d = path.posix.dirname(f); d !== '.' && !dirs.includes(d); d = path.posix.dirname(d)) {
      try { fs.rmdirSync(path.join(inst.path, d)); } catch { break; }
    }
  }
  const after = diff(root, inst.path, dirs);
  return { status: 'yenilendi', ...inst, before, after: after.changed.length + after.added.length + after.stale.length };
}
