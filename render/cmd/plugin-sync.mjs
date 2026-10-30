// motion-render plugin-sync — plugin metinlerini (commands/, skills/, agents/, templates/, .claude-plugin/, render/runtime/) kurulu checkout'tan
// Claude Code plugin önbelleğine eşitler (PN-104: sürüm aynı kalınca `claude plugin update` önbelleği yenilemez). install.ps1 / install.sh
// plugin adımında çağırır; değişiklik yeni Claude Code oturumunda yüklenir.
//
//   motion-render plugin-sync [--check] [--root <checkout>] [--plugins-dir <dizin>] [--json]
//
// --check: yazmaz; fark varsa çıkış 3. Varsayılan checkout bu paketin deposu (render/..), plugins dizini $CLAUDE_CONFIG_DIR/plugins ‖ ~/.claude/plugins.
// Plugin kurulu değilse "–" ve çıkış 0 (kurulum adımı ayrıca bildirir).
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { syncPlugin, pluginsDir, PLUGIN_ID } from '../lib/plugin-sync.mjs';

const argv = process.argv.slice(2), argOf = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const root = path.resolve(argOf('--root') || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..'));
const check = argv.includes('--check');
const r = syncPlugin({ root, dir: argOf('--plugins-dir') ? path.resolve(argOf('--plugins-dir')) : pluginsDir(), check });
const sha = (spawnSync('git', ['-C', root, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8', windowsHide: true }).stdout || '').trim();
const b = r.before || { files: 0, changed: [], eol: [], added: [], stale: [] }, n = b.changed.length + b.added.length + b.stale.length;
const counts = `${b.changed.length} değişen${b.eol.length ? ` (${b.eol.length} yalnız satır sonu)` : ''} · ${b.added.length} yeni · ${b.stale.length} eski`;
const where = `${PLUGIN_ID} ${r.version || '?'} ← checkout${sha ? ' ' + sha : ''}`;
const line = {
  yok: `– plugin metinleri: ${PLUGIN_ID} kurulu değil`,
  eksik: `✗ plugin metinleri: kayıtlı önbellek klasörü yok (${r.path})`,
  'aynı-dizin': `✓ plugin metinleri: plugin doğrudan checkout'tan yüklü (${r.path})`,
  güncel: `✓ plugin metinleri güncel (${b.files} dosya; ${where})`,
  farklı: `✗ plugin metinleri checkout'tan farklı: ${counts} (${where}) → motion-render plugin-sync`,
  yenilendi: r.after ? `✗ plugin metinleri eşitlenemedi: ${r.after} dosya farklı kaldı (${where})` : `✓ plugin metinleri yenilendi: ${counts} (${b.files} dosya; ${where}; yeni oturumda yüklenir)`,
}[r.status];
if (argv.includes('--json')) console.log(JSON.stringify({ tool: 'plugin-sync', root, sha, check, ...r }, null, 1));
else {
  console.log(line);
  if (check && n) for (const [k, L] of [['değişen', b.changed.filter((f) => !b.eol.includes(f))], ['yeni', b.added], ['eski', b.stale]]) for (const f of L.slice(0, 12)) console.log(`  ${k}  ${f}`);
}
process.exitCode = r.status === 'eksik' || (r.status === 'yenilendi' && r.after) ? 1 : r.status === 'farklı' ? 3 : 0;
