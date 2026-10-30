// PN-104: plugin metinleri kurulu checkout'tan önbelleğe eşitlenir (sürüm aynı kalsa da) — lib, CLI ve install betiklerinin çağrısı (node --test test/).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { syncPlugin, diff, installed, pluginsDir } from '../lib/plugin-sync.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), REPO = path.join(HERE, '..', '..'), BIN = path.join(HERE, '..', 'bin', 'motion-render.mjs');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-sync-'));
const put = (base, files) => { for (const [f, s] of Object.entries(files)) { const p = path.join(base, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); } };
const read = (base, f) => fs.readFileSync(path.join(base, f), 'utf8');

// checkout 1.3 metinleri ↔ önbellek 1.2 kopyası (aynı sürüm klasörü: `claude plugin update` "güncel" sayar)
function fixture(name) {
  const root = path.join(TMP, name, 'checkout'), plugins = path.join(TMP, name, 'plugins'), cache = path.join(plugins, 'cache', 'motion-harness', 'motion', '1.3.0');
  put(root, { '.claude-plugin/plugin.json': '{"name":"motion","version":"1.3.0"}', 'commands/gate.md': 'adım 5: oynatım\n', 'skills/motion-reviewer/SKILL.md': '§3.0 kalibrasyon\n',
    'skills/yeni/SKILL.md': 'yeni skill\n', 'agents/motion-director.md': 'BAĞLAM\n', 'templates/CRAFT-REF.md': 'ref\n', 'render/runtime/motion-runtime.js': 'v13\n', 'render/lib/kod.mjs': 'checkout kodu\n' });
  put(cache, { '.claude-plugin/plugin.json': '{"name":"motion","version":"1.3.0"}', 'commands/gate.md': 'adım 5\n', 'skills/motion-reviewer/SKILL.md': '§0.6\n',
    'skills/eski/SKILL.md': 'kaldırılan skill\n', 'agents/motion-director.md': 'BAĞLAM\r\n', 'templates/CRAFT-REF.md': 'ref\n', 'render/runtime/motion-runtime.js': 'v12\n',
    'render/lib/kod.mjs': 'önbellek kodu\n', 'docs/NOT.md': 'belge\n' });
  put(plugins, { 'installed_plugins.json': JSON.stringify({ version: 2, plugins: { 'motion@motion-harness': [{ scope: 'user', installPath: cache, version: '1.3.0' }] } }) });
  return { root, plugins, cache };
}

test('plugin-sync: --check yazmaz; eşitleme değişen/yeni yazar, eskiyi siler, metin dışı dosyalara dokunmaz; ikinci koşu güncel', () => {
  const { root, plugins, cache } = fixture('lib');
  assert.equal(installed(plugins).path, cache);
  const c = syncPlugin({ root, dir: plugins, check: true });
  assert.equal(c.status, 'farklı');
  assert.deepEqual(c.before.changed, ['agents/motion-director.md', 'commands/gate.md', 'render/runtime/motion-runtime.js', 'skills/motion-reviewer/SKILL.md']);
  assert.deepEqual(c.before.eol, ['agents/motion-director.md'], 'eski CRLF kopya: yalnız satır sonu');
  assert.deepEqual(c.before.added, ['skills/yeni/SKILL.md']); assert.deepEqual(c.before.stale, ['skills/eski/SKILL.md']);
  assert.equal(read(cache, 'skills/motion-reviewer/SKILL.md'), '§0.6\n', '--check yazmadı');
  const s = syncPlugin({ root, dir: plugins });
  assert.equal(s.status, 'yenilendi'); assert.equal(s.after, 0);
  assert.equal(read(cache, 'skills/motion-reviewer/SKILL.md'), '§3.0 kalibrasyon\n'); assert.equal(read(cache, 'skills/yeni/SKILL.md'), 'yeni skill\n');
  assert.ok(!fs.existsSync(path.join(cache, 'skills', 'eski')), 'eski skill ve boş klasörü silindi');
  assert.equal(read(cache, 'render/lib/kod.mjs'), 'önbellek kodu\n', 'render/ kodu (global bağdan koşar) değişmez');
  assert.equal(read(cache, 'docs/NOT.md'), 'belge\n'); assert.equal(read(cache, 'agents/motion-director.md'), 'BAĞLAM\n', 'satır sonu da bayt eşit');
  const d = diff(root, cache);
  assert.equal(d.changed.length + d.added.length + d.stale.length, 0);
  assert.equal(syncPlugin({ root, dir: plugins }).status, 'güncel');
  assert.equal(syncPlugin({ root, dir: path.join(TMP, 'bos') }).status, 'yok');
});

test('plugin-sync CLI: --check fark → çıkış 3, eşitleme → 0 "yenilendi", sonra güncel; kurulu değil → 0; CLAUDE_CONFIG_DIR', () => {
  const { root, plugins } = fixture('cli');
  const cli = (...a) => spawnSync(process.execPath, [BIN, 'plugin-sync', '--root', root, '--plugins-dir', plugins, ...a], { encoding: 'utf8' });
  let r = cli('--check');
  assert.equal(r.status, 3, r.stdout + r.stderr); assert.match(r.stdout, /checkout'tan farklı: 4 değişen \(1 yalnız satır sonu\) · 1 yeni · 1 eski/); assert.match(r.stdout, /yeni {2}skills\/yeni\/SKILL\.md/);
  r = cli();
  assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /✓ plugin metinleri yenilendi: 4 değişen \(1 yalnız satır sonu\) · 1 yeni · 1 eski/);
  r = cli('--check');
  assert.equal(r.status, 0); assert.match(r.stdout, /✓ plugin metinleri güncel \(7 dosya/);
  r = spawnSync(process.execPath, [BIN, 'plugin-sync', '--root', root, '--plugins-dir', path.join(TMP, 'bos')], { encoding: 'utf8' });
  assert.equal(r.status, 0); assert.match(r.stdout, /kurulu değil/);
  const prev = process.env.CLAUDE_CONFIG_DIR; process.env.CLAUDE_CONFIG_DIR = path.join(TMP, 'cfg');
  try { assert.equal(pluginsDir(), path.join(TMP, 'cfg', 'plugins')); } finally { if (prev == null) delete process.env.CLAUDE_CONFIG_DIR; else process.env.CLAUDE_CONFIG_DIR = prev; }
});

test('install.ps1 / install.sh: plugin adımı sürüm denetiminden sonra, doğrulamadan önce plugin-sync çağırır; başarısızlık sayılır', () => {
  const cases = [
    ['install.ps1', /Join-Path \$Render 'bin\\motion-render\.mjs'\),'plugin-sync'/, /\$r\.code -ne 0\) \{ \$script:fails\+\+ \}/],
    ['install.sh', /"\$RENDER\/bin\/motion-render\.mjs" plugin-sync/, /\[ \$RC -eq 0 \] \|\| FAILS=\$\(\(FAILS\+1\)\)/],
  ];
  for (const [f, call, fail] of cases) {
    const s = fs.readFileSync(path.join(REPO, f), 'utf8'), m = call.exec(s), i = m ? m.index : -1;
    assert.ok(m, f + ': checkout\'un kendi CLI\'ı çağrılır (global bağdan bağımsız)');
    assert.ok(i > s.indexOf('[3/6]') && i < s.indexOf('[4/6]'), f + ': plugin-sync adım 3 içinde');
    assert.ok(i > s.indexOf('(güncel)') && i < s.indexOf('doğrulama:'), f + ': sürüm denetiminden sonra, doğrulamadan önce');
    assert.match(s.slice(i, i + 300), fail, f + ': çıkış kodu başarısızlık sayar');
  }
});

test.after(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* yut */ } });
