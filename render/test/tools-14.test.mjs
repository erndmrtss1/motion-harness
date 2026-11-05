// 1.4 araçları (node --test test/): celiski-tara (a–e + temiz küme + CLI + şablon eşliği) · pre-commit kancası · render-oncesi (ps1 + sh sözdizimi,
// "taban yok → bilgi" yolu) · init yeni kopyaları · contact --page-step (etiket, koruma, --fstep takma adı) · contact motion (sentetik kare dizini + plan).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url)), PKG = path.resolve(HERE, '..'), REPO = path.resolve(PKG, '..'), BIN = path.join(PKG, 'bin', 'motion-render.mjs');
const TPL = path.join(REPO, 'templates');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'tools14-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));
const MAIN = path.join(TMP, 'ana');
fs.mkdirSync(MAIN, { recursive: true });
fs.writeFileSync(path.join(MAIN, 'scenes.json'), JSON.stringify({ fps: 30, width: 1920, height: 1080, scenes: [] }));
process.env.MOTION_PROJECT = MAIN;
const C = await import('../lib/celiski.mjs');
const MC = await import('../lib/motion-contact.mjs');
const cli = (proj, ...a) => spawnSync(process.execPath, [BIN, ...a, '--project', proj], { encoding: 'utf8', cwd: proj, timeout: 120000 });
const w = (root, rel, s) => { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); return p; };

// ps1 çıktısı ASCII (5.1 yönlendirilen çıktıyı OEM kod sayfasıyla yazar), sh çıktısı Türkçe: desenler ikisini de kabul eder.
// Git for Windows bash'i (PATH'teki bash.exe WSL olabilir) ya da POSIX bash; yoksa ilgili testler atlanır
function findBash() {
  const ok = (b) => { try { return (spawnSync(b, ['-c', 'echo ok'], { encoding: 'utf8', timeout: 20000 }).stdout || '').trim() === 'ok'; } catch { return false; } };
  if (process.platform === 'win32') {
    const r = spawnSync('git', ['--exec-path'], { encoding: 'utf8' });
    if (r.status === 0) { const g = path.resolve(r.stdout.trim(), '..', '..', '..'); for (const b of [path.join(g, 'bin', 'bash.exe'), path.join(g, 'usr', 'bin', 'bash.exe')]) if (fs.existsSync(b) && ok(b)) return b; }
    return null;
  }
  return ok('bash') ? 'bash' : null;
}
const BASH = findBash();
const PS = process.platform === 'win32' ? 'powershell' : (spawnSync('pwsh', ['-NoProfile', '-Command', '1'], { encoding: 'utf8' }).status === 0 ? 'pwsh' : null);

// ── celiski-tara ─────────────────────────────────────────────────────────────
function temizProje(root) {
  w(root, 'scenes.json', JSON.stringify({ fps: 60, scenes: [] }, null, 2));
  w(root, 'CLAUDE.md', '# Proje\n\n- Kamera: tepe ≤ 12 px/kare.\n- Belgeler `docs/SOZLUK.md` ve `world/world.json`.\n- Çıktı `out/probe/x.json` (üretilir).\n- Şablon yolu `docs/<ad>.md`.\n');
  w(root, 'project.md', '# project\n\n> alıntı: tepe ≤ 30 px/kare (eski brief, aynen)\n- giriş/çıkış ≥ 0,4 s\n');
  w(root, 'world/world.json', JSON.stringify({ name: 'w', camera: { maxPxPerFrame: 12 } }, null, 2));
  w(root, 'docs/SOZLUK.md', '# Sözlük\n\n- terim: tanım\n');
  w(root, 'docs/CRAFT-REF.md', '# Zanaat\n\n- giriş/çıkış ≥ 0.4 s (aynı değer, nokta ondalık)\n');
}
test('celiski-tara: temiz küme 0 bulgu; her denetim (a–e) bir bulgu verir; --ek yalnız (c)', () => {
  const root = path.join(TMP, 'cel'); temizProje(root);
  let cfg = C.compileConfig({ arsivTerim: [{ ad: 'eski kalem', desen: 'eski\\s+kalem' }] });
  let r = C.scan(root, cfg, { zorunlu: true });
  assert.equal(r.bulgu.length, 0, JSON.stringify(r.bulgu));
  assert.deepEqual(r.anahtarOzet.find(([k]) => k === 'kamera tepe px/kare')[1].map((o) => o.v), ['12', '12'], 'metin + world.json alanı aynı değer');
  // (a) etkin satırda arşiv terimi; alıntı bloğu ve "arşiv" satırı etkin değil
  fs.appendFileSync(path.join(root, 'project.md'), '- Eski kalem kullanılır.\n> eski kalem (alıntı)\n- arşiv: eski kalem\n');
  // (b) üstü çizili + KALDIRILDI
  fs.appendFileSync(path.join(root, 'docs/SOZLUK.md'), '- ~~eski tanım~~ yeni tanım\n- Not: bu kural KALDIRILDI\n');
  // (c) world alanı metinle çelişir
  w(root, 'world/world.json', JSON.stringify({ name: 'w', camera: { maxPxPerFrame: 14 } }, null, 2));
  // (d) olmayan yol
  fs.appendFileSync(path.join(root, 'CLAUDE.md'), '- Ayrıntı `docs/YOK.md` dosyasında.\n');
  r = C.scan(root, cfg, { zorunlu: true });
  const by = (d) => r.bulgu.filter((b) => b.d === d);
  assert.equal(by('a').length, 1); assert.match(by('a')[0].not, /eski kalem/); assert.equal(by('a')[0].dosya, 'project.md');
  assert.equal(by('b').length, 2); assert.ok(by('b').some((b) => /üstü çizili/.test(b.not)) && by('b').some((b) => /KALDIRILDI/.test(b.not)));
  assert.equal(by('c').length, 2, 'iki taraf da işaretlenir'); assert.ok(by('c').every((b) => /12 .*↔ 14|14 .*↔ 12/.test(b.not)));
  assert.equal(by('d').length, 1); assert.match(by('d')[0].not, /docs\/YOK\.md/);
  assert.equal(by('e').length, 0);
  // (e) brief tavanı + ayrı set brief'i
  w(root, 'docs/BRIEF-DIRECTOR.md', 'x'.repeat(40));
  cfg = C.compileConfig({ briefTavan: 10, briefSet: { dosya: 'docs/BRIEF-DIRECTOR.md', tavan: 5 } });
  r = C.scan(root, cfg);
  assert.equal(r.bulgu.filter((b) => b.d === 'e').length, 2);
  assert.equal(r.setTok, Math.ceil(40 / 3));
  // zorunlu dosya yok → (d); '?' sonekli dosya yok → atlanır
  cfg = C.compileConfig({ baglayici: ['CLAUDE.md', 'docs/YOK-ZORUNLU.md', 'docs/YOK-ISTEGE.md?'] });
  r = C.scan(root, cfg, { zorunlu: true });
  assert.ok(r.bulgu.some((b) => b.d === 'd' && b.dosya === 'docs/YOK-ZORUNLU.md')); assert.deepEqual(r.atlanan, ['docs/YOK-ISTEGE.md']);
  // --ek: proje dışı metin yalnız (c)'ye girer (üstü çizili metin (b) vermez)
  const ek = w(TMP, 'paket/skills/x/RULES.md', '- kamera tepe ≤ 9 px/kare\n- ~~çizik~~\n');
  w(root, 'world/world.json', JSON.stringify({ name: 'w', camera: { maxPxPerFrame: 12 } }, null, 2));
  r = C.scan(root, C.compileConfig({}), { zorunlu: false, ek: [ek] });
  assert.ok(r.bulgu.some((b) => b.d === 'c' && b.dosya === 'ek:skills/x/RULES.md'), JSON.stringify(r.bulgu));
  assert.ok(!r.bulgu.some((b) => b.d === 'b' && b.dosya.startsWith('ek:')), 'ek metne (b) uygulanmaz');
  // tür dönüşümleri: sure (ms → s) ve aralik
  const c2 = C.compileConfig({ anahtar: [{ ad: 'settle', desen: ['settle\\s*{SAYI}\\s*(ms|s)'], tur: 'sure' }], jsonAnahtar: [{ ad: 'settle', yol: 'motion.settle' }] });
  w(root, 'docs/SOZLUK.md', '- settle 280 ms\n'); w(root, 'world/world.json', JSON.stringify({ motion: { settle: 0.28 } }));
  r = C.scan(root, c2);
  assert.deepEqual([...new Set(r.anahtarOzet[0][1].map((o) => o.v))], ['0.28']);
  assert.throws(() => C.compileConfig({ anahtar: [{ ad: 'x', desen: ['('] }] }), /celiski\.json/);
});
test('celiski-tara CLI: çıkış 0 / 1 (+ --rapor) / 2; şablon = DEFAULTS', () => {
  const root = path.join(TMP, 'celcli'); temizProje(root);
  let r = cli(root, 'celiski-tara');
  assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /varsayılan küme/); assert.match(r.stdout, /bulgu 0/);
  fs.appendFileSync(path.join(root, 'project.md'), '- iptal edildi: eski kural\n');
  r = cli(root, 'celiski-tara', '--rapor');
  assert.equal(r.status, 1); assert.match(r.stdout, /✗ \(b\) project\.md:\d+/);
  const md = fs.readFileSync(path.join(root, 'out', 'probe', 'celiski-tara.md'), 'utf8');
  assert.match(md, /bulgu: \*\*1\*\*/); assert.ok(!fs.existsSync(path.join(root, 'out', 'probe', 'celiski-tara.md.part')));
  w(root, 'docs/celiski.json', '{ bozuk');
  assert.equal(cli(root, 'celiski-tara').status, 2);
  assert.equal(cli(root, 'celiski-tara', '--config', 'docs/yok.json').status, 2);
  assert.equal(cli(root, 'celiski-tara', '--bilinmeyen').status, 2);
  const tpl = JSON.parse(fs.readFileSync(path.join(TPL, 'celiski.json'), 'utf8'));
  const bare = Object.fromEntries(Object.entries(tpl).filter(([k]) => !k.startsWith('_')));
  assert.deepEqual(bare, C.DEFAULTS, 'templates/celiski.json (açıklamasız) = lib DEFAULTS');
});

// ── pre-commit + render-oncesi ───────────────────────────────────────────────
test('şablon betikleri: satır sonu (sh/kanca LF · ps1 CRLF + BOM), sözdizimi', () => {
  const hook = path.join(TPL, 'githooks', 'pre-commit'), sh = path.join(TPL, 'tools', 'render-oncesi.sh'), ps1 = path.join(TPL, 'tools', 'render-oncesi.ps1');
  for (const f of [hook, sh]) { const s = fs.readFileSync(f, 'utf8'); assert.ok(!s.includes('\r'), f + ' LF olmalı'); assert.match(s, /^#!/); }
  assert.match(fs.readFileSync(hook, 'utf8'), /celiski-tara/);
  const b = fs.readFileSync(ps1); assert.deepEqual([...b.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'ps1 UTF-8 BOM (Windows PowerShell 5.1 Türkçe metin)');
  const t = b.toString('utf8'); assert.equal(t.split('\n').length - 1, (t.match(/\r\n/g) || []).length, 'ps1 CRLF');
  assert.ok(!/[A-Z]:\\Users\\(?!\[)/.test(t + fs.readFileSync(sh, 'utf8')), 'mutlak kullanıcı yolu yok');
  if (BASH) for (const f of [hook, sh]) { const r = spawnSync(BASH, ['-n', f.split(path.sep).join('/')], { encoding: 'utf8' }); assert.equal(r.status, 0, f + ': ' + r.stderr); }
  if (PS) {
    const r = spawnSync(PS, ['-NoProfile', '-Command', '$e = $null; [void][System.Management.Automation.Language.Parser]::ParseFile($env:PS1_FILE, [ref]$null, [ref]$e); $e.Count'],
      { encoding: 'utf8', env: Object.assign({}, process.env, { PS1_FILE: ps1 }) });
    assert.equal(r.stdout.trim(), '0', 'PowerShell parse: ' + r.stdout + r.stderr);
  }
});
test('render-oncesi: taban yok → bilgi (çıkış 0) · çözülemeyen taban → engel (çıkış 1)', { skip: !BASH && !PS ? 'bash/powershell yok' : false }, () => {
  const proj = path.join(TMP, 'ro'); fs.mkdirSync(path.join(proj, 'tools'), { recursive: true });
  for (const f of ['render-oncesi.sh', 'render-oncesi.ps1']) fs.copyFileSync(path.join(TPL, 'tools', f), path.join(proj, 'tools', f));
  const env = Object.assign({}, process.env, { MOTION_HARNESS_CLONE: REPO });
  const runs = [];
  if (BASH) runs.push((...a) => spawnSync(BASH, [path.join(proj, 'tools', 'render-oncesi.sh').split(path.sep).join('/'), '--surecsiz', ...a], { encoding: 'utf8', env, timeout: 60000 }));
  if (PS) runs.push((...a) => spawnSync(PS, ['-NoProfile', '-File', path.join(proj, 'tools', 'render-oncesi.ps1'), '-Surecsiz', ...a.map((x) => x.replace(/^--klon-head$/, '-KlonHead'))], { encoding: 'utf8', env, timeout: 60000 }));
  for (const run of runs) {
    let r = run();
    if (/running scripts is disabled|betik çalıştırma/i.test(r.stderr || '')) continue;   // makinenin yürütme ilkesi (değiştirilmez)
    const last = (r.stdout || '').trim().split(/\r?\n/).pop();
    assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(last, /^render-oncesi: temiz [·-] klon bilgi: taban yok/); assert.match(last, /(süreç taraması atlandı|surec taramasi atlandi)/);
    fs.writeFileSync(path.join(proj, 'tools', 'harness-taban.txt'), '# taban\nyok-boyle-bir-etiket-14\n');
    r = run(); fs.rmSync(path.join(proj, 'tools', 'harness-taban.txt'));
    assert.equal(r.status, 1, r.stdout + r.stderr); assert.match(r.stdout, /taban (çözülemedi|cozulemedi): yok-boyle-bir-etiket-14 \(tools\/harness-taban\.txt/);
    r = run('--klon-head', 'yok-boyle-2');
    assert.equal(r.status, 1); assert.match(r.stdout, /taban (çözülemedi|cozulemedi): yok-boyle-2/);
  }
  // gerçek süreç taraması (kısa): yalnız biçim — makinede başka render olabilir
  const real = process.platform === 'win32' && PS ? spawnSync(PS, ['-NoProfile', '-File', path.join(proj, 'tools', 'render-oncesi.ps1'), '-Sessiz'], { encoding: 'utf8', env, timeout: 60000 })
    : BASH && process.platform !== 'win32' ? spawnSync(BASH, [path.join(proj, 'tools', 'render-oncesi.sh'), '--sessiz'], { encoding: 'utf8', env, timeout: 60000 }) : null;
  if (real && !/running scripts is disabled/i.test(real.stderr || '')) { assert.ok([0, 1].includes(real.status), real.stderr); assert.match(real.stdout.trim().split(/\r?\n/).pop(), /^render-oncesi: (temiz|ENGEL).*ffmpeg \d+ [·-] Playwright Chromium \d+/); }
});

// ── init ─────────────────────────────────────────────────────────────────────
test('init: celiski.json, .githooks/pre-commit, tools/render-oncesi.*, motion-mek (varsa) + hooksPath ipucu; taze proje çelişkisiz', () => {
  const proj = path.join(TMP, 'init');
  const r = spawnSync(process.execPath, [BIN, 'init', proj, '--no-vendor'], { encoding: 'utf8', timeout: 120000 });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  for (const f of ['docs/celiski.json', '.githooks/pre-commit', 'tools/render-oncesi.ps1', 'tools/render-oncesi.sh', '.gitattributes']) {
    assert.ok(fs.existsSync(path.join(proj, f)), f); assert.ok(r.stdout.includes(f), 'rapor listeler: ' + f);
  }
  assert.equal(fs.existsSync(path.join(proj, 'shared', 'motion-mek.jsx')), fs.existsSync(path.join(PKG, 'runtime', 'motion-mek.jsx')));
  assert.match(r.stdout, /git config core\.hooksPath \S*\.githooks/);
  assert.deepEqual(fs.readFileSync(path.join(proj, 'tools', 'render-oncesi.ps1')), fs.readFileSync(path.join(TPL, 'tools', 'render-oncesi.ps1')), 'bayt bayt kopya');
  if (process.platform !== 'win32') assert.ok(fs.statSync(path.join(proj, '.githooks', 'pre-commit')).mode & 0o100, 'kanca çalıştırılabilir');
  const c = cli(proj, 'celiski-tara');
  assert.equal(c.status, 0, 'taze init projesi kendi commit kapısından geçmeli:\n' + c.stdout);
  assert.match(c.stdout, /yapılandırma docs\/celiski\.json/);
  // kanca: MOTION_RENDER ile koşar; bulgu → çıkış 1, temiz → 0
  if (BASH) {
    const env = Object.assign({}, process.env, { MOTION_RENDER: '"' + process.execPath.split(path.sep).join('/') + '" "' + BIN.split(path.sep).join('/') + '"', MOTION_PROJECT: '' });
    const hook = path.join(proj, '.githooks', 'pre-commit').split(path.sep).join('/');
    let h = spawnSync(BASH, [hook], { encoding: 'utf8', env, timeout: 60000 });
    assert.equal(h.status, 0, h.stdout + h.stderr);
    fs.appendFileSync(path.join(proj, 'project.md'), '\n- ~~eski~~ yeni\n');
    h = spawnSync(BASH, [hook], { encoding: 'utf8', env, timeout: 60000 });
    assert.equal(h.status, 1); assert.match(h.stderr, /commit yok/);
  }
});

// ── contact --page-step ──────────────────────────────────────────────────────
test('contact etiketi: pageFrame / frameLabel / koruma / --fstep takma adı (saf)', () => {
  assert.equal(MC.pageFrame(5, { pageStep: 2, sceneFrames: 120 }), 10);
  assert.equal(MC.pageFrame(59, { pageStep: 2, sceneFrames: 119 }), 118, 'son disk karesi = sahnenin son karesi (render --step eşlemesi)');
  assert.equal(MC.frameLabel(30, { pageStep: 1, fps: 60 }), 'f30 · 0.50 s');
  assert.equal(MC.frameLabel(30, { pageStep: 2, sceneFrames: 200, fps: 60 }), 'k30 · f60 · 1.00 s');
  assert.equal(MC.pageStepGuard(59, { pageStep: 2, sceneFrames: 120 }).ok, true);
  const g = MC.pageStepGuard(2881, { pageStep: 30, sceneFrames: 2882 });   // adım 1 animatikte --fstep 30 (hücre aralığı sanıldı)
  assert.equal(g.ok, false); assert.match(g.msg, /sahne süresini aşıyor/); assert.match(g.msg, /hücre aralığı --step/); assert.match(g.msg, /--page-step disk→sayfa/);
  assert.equal(MC.pageStepGuard(9999, { pageStep: 3 }).checked, false, 'sahne kare sayısı yoksa koruma atlanır');
  assert.deepEqual(MC.pageStepOf(['--page-step', '2'], { step: 4 }), { pageStep: 2, source: '--page-step' });
  const f = MC.pageStepOf(['--fstep', '3'], null); assert.equal(f.pageStep, 3); assert.match(f.warn, /kullanımdan kalkıyor/);
  assert.equal(MC.pageStepOf([], { step: 2 }).source, 'manifest animatic.step');
  assert.throws(() => MC.pageStepOf(['--page-step', '0'], null), /pozitif tamsayı/);
});
async function frameDir(dir, n, W, H, at) {
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < n; i++) {
    const b = Buffer.alloc(W * H * 3, 128), x0 = Math.round(at(i));
    for (let y = 0; y < Math.round(H * 0.28); y++) for (let x = 0; x < Math.round(W * 0.19); x++) { const X = x0 + x, Y = Math.round(H / 3) + y; if (X >= 0 && X < W) { const v = 40 + ((((x * 73856093) ^ (y * 19349663)) >>> 0) % 170); b[(Y * W + X) * 3] = v; b[(Y * W + X) * 3 + 1] = v; b[(Y * W + X) * 3 + 2] = v; } }
    await sharp(b, { raw: { width: W, height: H, channels: 3 } }).png().toFile(path.join(dir, String(i).padStart(5, '0') + '.png'));
  }
}
test('contact <id> CLI: --page-step etiketi, --fstep 30 koruması (çıkış 2), animatic.step otomatik', async () => {
  const proj = path.join(TMP, 'ct');
  w(proj, 'scenes.json', JSON.stringify({ fps: 60, width: 1920, height: 1080, scenes: [{ id: 'A', file: 'A.dc.html', frames: 24 }, { id: 'B', file: 'B.dc.html', frames: 24, animatic: { scale: 0.5, step: 2, fps: 30 } }] }));
  await frameDir(path.join(proj, 'out', 'frames', 'A'), 12, 64, 36, (i) => i * 2);
  fs.cpSync(path.join(proj, 'out', 'frames', 'A'), path.join(proj, 'out', 'frames', 'B'), { recursive: true });
  let r = cli(proj, 'contact', 'A', '--page-step', '2', '--step', '4');
  assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /page-step 2 \(--page-step\), son f23/);
  r = cli(proj, 'contact', 'A', '--fstep', '30', '--step', '4');
  assert.equal(r.status, 2); assert.match(r.stderr, /kullanımdan kalkıyor/); assert.match(r.stderr, /etiket sahne süresini aşıyor/);
  r = cli(proj, 'contact', 'B', '--step', '4');
  assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /page-step 2 \(manifest animatic\.step\)/);
  assert.ok(fs.existsSync(path.join(proj, 'out', 'probe', 'B-contact.png')));
});

// ── contact motion ───────────────────────────────────────────────────────────
test('hamle pencereleri: plan biçimleri, auto (movesOf koşu tanımı), pencere ve görünür süre (saf)', () => {
  assert.equal(MC.movesFromPlan({ camera: { moves: [{ id: 'H1', a: 1, b: 2 }] } }).length, 1);
  assert.equal(MC.movesFromPlan([{ a: 0, b: 1, ref: [3, 4] }])[0].ref[1], 4);
  assert.throws(() => MC.movesFromPlan({ camera: { moves: [{ id: 'X', a: 2, b: 1 }] } }), /a < b/);
  assert.throws(() => MC.movesFromPlan({}), /camera\.moves/);
  const v = Array(120).fill(0); for (let f = 10; f < 40; f++) v[f] = 5; for (let f = 70; f < 100; f++) v[f] = 3;
  const m = MC.movesFromSpeed(v, [['S1', 0, 59], ['S2', 60, 119]], { fps: 30, floor: 1 });
  assert.deepEqual(m.map((x) => [x.id, x.a, x.b]), [['S1·H1', 0.333, 1.3], ['S2·H1', 2.333, 3.3]]);
  const ks = Array.from({ length: 60 }, (_, i) => i), win = MC.windowOf({ a: 1, b: 1.5 }, { pad: 0.5, fps: 30, frames: ks });
  assert.deepEqual([win.k0, win.k1, win.c0, win.c1, win.contiguous], [15, 59, 30, 45, true]);
  assert.equal(MC.visibleSec([0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], 10), 0.8);
  assert.equal(MC.visibleSec([0, 0, 0], 10), null);
});
test('contact motion: sentetik kare dizini + plan → mp4 + json + kontak PNG; tepe ve görünür süre beklenen aralıkta', async () => {
  const proj = path.join(TMP, 'mc');
  w(proj, 'scenes.json', JSON.stringify({ fps: 30, width: 1920, height: 1080, scenes: [{ id: 'T1', file: 'T1.dc.html', frames: 60 }] }));
  // 60 kare 320×180: blok k10–k40 arası 4 px/kare kayar (= 24 px/kare @1080), sonra durur
  await frameDir(path.join(proj, 'out', 'frames', 'T1'), 60, 320, 180, (i) => 20 + 4 * Math.min(30, Math.max(0, i - 10)));
  w(proj, 'plan.json', JSON.stringify({ camera: { moves: [{ id: 'H1', a: 10 / 30, b: 40 / 30 }, { id: 'H2', a: 1.5, b: 1.9 }] } }));
  const r = cli(proj, 'contact', 'motion', 'T1', '--moves', 'plan.json', '--pad', '0.3');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const base = path.join(proj, 'out', 'probe', 'T1-hareket');
  for (const f of ['.mp4', '.json', '-kontak.png']) { assert.ok(fs.existsSync(base + f), f); assert.ok(fs.statSync(base + f).size > 1000, f + ' boş değil'); }
  assert.ok(!fs.existsSync(base + '.parts'), 'ara dizin silindi');
  const J = JSON.parse(fs.readFileSync(base + '.json', 'utf8'));
  assert.equal(J.count, 2); assert.equal(J.moves.length, 2); assert.equal(J.source, 'plan plan.json'); assert.deepEqual(J.size, [1920, 1080]);
  const h1 = J.moves[0];
  assert.ok(h1.peak >= 21 && h1.peak <= 27, 'tepe ≈ 24 px/kare @1080: ' + h1.peak);
  assert.ok(Math.abs(h1.visible - 0.8) <= 0.1, 'görünür (%10–90) ≈ 0,8 s: ' + h1.visible);
  assert.ok(J.moves[1].peak < 1, 'H2 tutuşta: ' + J.moves[1].peak);
  const meta = (await sharp(base + '-kontak.png').metadata()); assert.equal(meta.width, 3 * 384);
  assert.equal(cli(proj, 'contact', 'motion', 'T1', '--moves', 'yok.json').status, 2);
  assert.equal(cli(proj, 'contact', 'motion', 'T1', '--moves', 'plan.json', '--page-step', '30').status, 2, 'page-step koruması');
});
