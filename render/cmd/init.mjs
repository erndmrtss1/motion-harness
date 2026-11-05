// motion-render init — proje iskeleti (CONTRACT §1). Kaynak proje kopyalanmaz; node_modules ve junction yok (paket bağımlılıkları pakette kalır).
//   motion-render init <dizin> [--world <kütüphane-ad> | --new] [--profile full|light|live] [--fps 60] [--with-whisper] [--demo] [--no-vendor] [--force] [--dry]
// Yazılanlar (var olan dosyaya --force olmadan dokunulmaz; tekrar çalıştırmak güvenli):
//   scenes.json (templates/scenes.json; fps/profil/world/kapı ayarlı, scenes boş) · project.md · CLAUDE.md · docs/<şablonlar>.md
//   assets/gen/manifest.json (templates/ledger.json) · motion-runtime.js + shared/motion-stage.jsx + shared/motion-core.jsx (+ shared/motion-mek.jsx varsa) (render/runtime/)
//   docs/celiski.json (templates/celiski.json; motion-render celiski-tara yapılandırması) · .githooks/pre-commit (templates/githooks/; celiski-tara commit kapısı)
//   tools/render-oncesi.ps1 + tools/render-oncesi.sh (templates/tools/; render/encode öncesi makine denetimi) · .gitattributes (kanca/betik satır sonları)
//   Bitişte hooksPath ipucu ("git config core.hooksPath .githooks"); git yapılandırması yalnız okunur, değiştirilmez.
//   world/: --world <ad> → skills/motion-world/library/<ad>/ (demo.* hariç; origin "library:<ad>"; eski ad fx-lab → focusfx-paper); yoksa world.json iskeleti (band / k1.mask "TANIMLANMADI") + README (look-dev doldurur)
//   dizinler: checks/ hooks/ script/ assets/gen/{inbox,requests,runs,plates,elements,transitions,storyboard,logos} docs/ fonts/ vendor/ out/{frames,scenes,probe,logs,master,archive,review}
//   --demo: kütüphane world'ünün demo.dc.html + demo.jsx'i köke, scenes.json'a DEMO sahnesi (smoke bunu kullanır)
//   sonra vendor: scripts (React/ReactDOM/Babel, SRI) + world fonts varsa Google Fonts (+ LICENSES.md); --no-vendor ile atlanır.
//   --with-whisper: <dizin>/.venv + pip install -r render/requirements.txt (faster-whisper; model ilk transcribe'da iner).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), PKG = path.resolve(HERE, '..');
const TPL = path.resolve(PKG, '..', 'templates'), EXAMPLES = path.resolve(PKG, '..', 'skills', 'motion-world', 'library'), RUNTIME = path.join(PKG, 'runtime');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; }, has = (k) => args.includes('--' + k);
const VALUED = new Set(['--world', '--profile', '--fps']);
const pos = args.filter((a, i) => !a.startsWith('--') && !VALUED.has(args[i - 1]));
if (!pos[0]) { console.error('kullanım: motion-render init <dizin> [--world <kütüphane-ad> | --new] [--profile full|light|live] [--fps 60] [--with-whisper] [--demo] [--no-vendor] [--force] [--dry]'); process.exit(2); }
const ALIAS = { 'fx-lab': 'focusfx-paper' };   // HK-38: fx-lab örneği FocusFX world'ünün damıtılmışıydı → focusfx-paper
const DIR = path.resolve(pos[0]), FORCE = has('force'), DRY = has('dry'), WORLD = ((w) => (w ? ALIAS[w] || w : null))(opt('world', null) && opt('world', null).replace(/^(?:example|library):/, '')), PROFILE = opt('profile', 'full'), FPS = +opt('fps', 60);
if (!['full', 'light', 'live'].includes(PROFILE)) { console.error('--profile full | light | live'); process.exit(2); }
if (!(FPS > 0)) { console.error('--fps sayı olmalı'); process.exit(2); }
if (WORLD && has('new')) { console.error('--world ile --new birlikte olmaz'); process.exit(2); }
const EX = WORLD ? path.join(EXAMPLES, WORLD) : null;
if (EX && !fs.existsSync(path.join(EX, 'world.json'))) { const av = fs.existsSync(EXAMPLES) ? fs.readdirSync(EXAMPLES).filter((d) => fs.existsSync(path.join(EXAMPLES, d, 'world.json'))) : []; console.error('kütüphanede world yok: ' + WORLD + ' (var: ' + (av.join(', ') || '—') + ')'); process.exit(2); }
if (has('demo') && !EX) { console.error('--demo yalnız --world <kütüphane-ad> ile'); process.exit(2); }

const log = { yazildi: [], atlandi: [], dizin: [] };
const rel = (f) => path.relative(DIR, f).split(path.sep).join('/') || '.';
function mk(d) { const p = path.join(DIR, d); if (!fs.existsSync(p)) { if (!DRY) fs.mkdirSync(p, { recursive: true }); log.dizin.push(d); } }
function put(relp, data, why, mode) {   // mode: çalıştırılabilir dosya (git kancası, .sh) için 0o755
  const p = path.join(DIR, relp);
  if (fs.existsSync(p) && !FORCE) { log.atlandi.push(relp + ' (var)'); return false; }
  if (!DRY) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p + '.part', data); fs.renameSync(p + '.part', p); if (mode) fs.chmodSync(p, mode); }
  log.yazildi.push(relp + (why ? ' — ' + why : '')); return true;
}
const cp = (src, relp, why, mode) => (fs.existsSync(src) ? put(relp, fs.readFileSync(src), why, mode) : (log.atlandi.push(relp + ' (kaynak yok: ' + path.relative(PKG, src).split(path.sep).join('/') + ')'), false));

if (!DRY) fs.mkdirSync(DIR, { recursive: true });
// 1 · dizinler
for (const d of ['checks', 'hooks', 'script', 'docs', 'fonts', 'vendor', 'shared', 'world', ...['inbox', 'requests', 'runs', 'plates', 'elements', 'transitions', 'storyboard', 'logos'].map((x) => 'assets/gen/' + x),
  ...['frames', 'scenes', 'probe', 'logs', 'master', 'archive', 'review'].map((x) => 'out/' + x)]) mk(d);
// 2 · çalışma zamanı
cp(path.join(RUNTIME, 'motion-runtime.js'), 'motion-runtime.js', 'sayfa yükleyici');
cp(path.join(RUNTIME, 'motion-stage.jsx'), 'shared/motion-stage.jsx', 'saat/seek/kompozisyon');
cp(path.join(RUNTIME, 'motion-core.jsx'), 'shared/motion-core.jsx', 'stilden bağımsız yardımcılar');
if (fs.existsSync(path.join(RUNTIME, 'motion-mek.jsx'))) cp(path.join(RUNTIME, 'motion-mek.jsx'), 'shared/motion-mek.jsx', 'hareket mekaniği ilkelleri');   // paket sürümünde yoksa sessizce atlanır
// 3 · şablonlar
const tplF = (f) => path.join(TPL, f);
if (!fs.existsSync(TPL)) log.atlandi.push('templates/ (paket şablon dizini yok)');
{
  let man = null;
  if (fs.existsSync(tplF('scenes.json'))) { try { man = JSON.parse(fs.readFileSync(tplF('scenes.json'), 'utf8')); } catch (e) { log.atlandi.push('templates/scenes.json okunamadı: ' + e.message); } }
  man = man || { version: '1.0.0', width: 1920, height: 1080, audio: null, animatic: { scale: 0.5, fps: 30 } };
  man.fps = FPS; man.profile = PROFILE; man.world = 'world/world.json'; man.gate = Object.assign({}, man.gate || {}, { taste: PROFILE === 'light' ? 6 : 7 });
  man.scenes = [];   // birimler /motion:faz ile eklenir
  if (has('demo')) {
    const src = fs.readFileSync(path.join(EX, 'demo.dc.html'), 'utf8'), m = /window\.OM_SCENES\s*=\s*'([^']*)'/.exec(src), dur = m ? JSON.parse(m[1]).reduce((a, s) => a + s.dur, 0) : 4;
    man.scenes.push({ id: 'DEMO', file: 'demo.dc.html', tc: '00:00.00', frames: Math.round(dur * FPS), bg: '#000', keys: [Math.round(dur * FPS * 0.5), Math.round(dur * FPS * 0.8)], blackStart: false, slice: true, checks: [], hooks: [], note: 'kütüphane world demosu (smoke); film sırasına girmez' });
    { const ep = /window\.OM_EXPO_POST\s*=\s*'([^']*)'/.exec(src); if (ep) man.scenes[man.scenes.length - 1].expoPost = JSON.parse(ep[1]); }   // demo iniş penceresi (expo-post, L-005)
  }
  put('scenes.json', JSON.stringify(man, null, 2) + '\n', 'fps ' + FPS + ' · profil ' + PROFILE + ' · kapı ≥ ' + man.gate.taste + '/8');
}
cp(tplF('project.md'), 'project.md', 'projeye özgü katman');
cp(tplF('CLAUDE.md'), 'CLAUDE.md', 'bağlayıcı sıra + daimi kurallar');
if (fs.existsSync(tplF('ledger.json'))) cp(tplF('ledger.json'), 'assets/gen/manifest.json', 'boş ledger');
else put('assets/gen/manifest.json', JSON.stringify({ schema: '1.0.0', items: [], ledger: [], lost: [] }, null, 1) + '\n', 'boş ledger');
if (fs.existsSync(tplF('policy.json'))) cp(tplF('policy.json'), 'assets/gen/policy.json', 'üretken politika (project.md §9 kopyası)');
if (fs.existsSync(tplF('celiski.json'))) cp(tplF('celiski.json'), 'docs/celiski.json', 'çelişki taraması yapılandırması (motion-render celiski-tara)');
// şablon alt dizinleri → proje hedefi (githooks/ ve tools/ içindekiler çalıştırılabilir)
const TDIR = { docs: ['docs', 'şablon', 0], githooks: ['.githooks', 'git kancası (celiski-tara commit kapısı)', 0o755], tools: ['tools', 'proje aracı', 0o755] };
if (fs.existsSync(TPL)) for (const f of fs.readdirSync(TPL)) {
  const p = tplF(f);
  if (fs.statSync(p).isDirectory()) {
    const m = TDIR[f];
    if (m) for (const g of fs.readdirSync(p)) { const q = path.join(p, g); if (fs.statSync(q).isFile()) cp(q, m[0] + '/' + g, m[1], m[2] && (f === 'githooks' || g.endsWith('.sh')) ? m[2] : 0); }
    continue;
  }
  if (['project.md', 'CLAUDE.md', 'scenes.json', 'ledger.json', 'policy.json', 'README.md'].includes(f) || !f.endsWith('.md')) continue;
  cp(p, 'docs/' + f, 'belge şablonu');
}
// 4 · world
if (EX) {
  const walk = (d, r = '') => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f), q = r ? r + '/' + f : f; if (fs.statSync(p).isDirectory()) walk(p, q); else if (!/^demo\./.test(q)) cp(p, 'world/' + q, 'kütüphane world ' + WORLD); } };
  walk(EX);
  { const wf = path.join(DIR, 'world', 'world.json'); if (!DRY && fs.existsSync(wf)) { try { const w = JSON.parse(fs.readFileSync(wf, 'utf8')); if (w.origin !== 'library:' + WORLD) { w.origin = 'library:' + WORLD; fs.writeFileSync(wf, JSON.stringify(w, null, 2) + '\n'); } } catch (e) { log.atlandi.push('world/world.json origin yazılamadı: ' + e.message); } } }
  if (has('demo')) { cp(path.join(EX, 'demo.dc.html'), 'demo.dc.html', 'kütüphane demo sayfası'); cp(path.join(EX, 'demo.jsx'), 'demo.jsx', 'kütüphane demo sahnesi'); }
} else {
  const name = path.basename(DIR).toLowerCase().replace(/[^a-z0-9-]+/g, '-') || 'world';
  put('world/world.json', JSON.stringify({
    name, version: '0.1.0', origin: 'lookdev', status: 'TANIMLANMADI — look-dev (F2) doldurur; render/QC bu dosya tamamlanmadan çalışmaz',
    palette: {}, accent: null, fonts: [],
    band: 'TANIMLANMADI', k1: { mask: 'TANIMLANMADI', selector: '[data-hero]' },
    edgeDark: null, grade: { chain: 'none', params: {} }, classes: {}, camera: {}, motion: {}, supersample: {}, primitives: [], lessons: 'lessons.md',
  }, null, 2) + '\n', 'iskelet (band / k1.mask TANIMLANMADI)');
  put('world/README.md', '# world/ — görsel dil\n\nBu proje yeni bir world ile başladı. `world.json` iskelettir: **look-dev** fazı (3 yön → seçim) paleti, fontları, aksan sınıfını,\n' +
    'parlaklık bandını (`band`, ZORUNLU) ve K1 kahraman maskesini (`k1.mask`, ZORUNLU) doldurur; primitifler `*.jsx` dosyalarına, dersler `lessons.md`\'ye yazılır.\n' +
    'Alanlar: render/CONTRACT.md §3. `band` ve `k1.mask` "TANIMLANMADI" kaldıkça `motion-render manifest validate` geçmez ve sahne render edilmez.\n' +
    'World seçilmedikçe hiçbir primitif/renk/font/kalıp varsayılan gelmez; kütüphaneden world yalnız kullanıcı seçerse (`/motion:init --world <ad>`; liste skills/motion-world/library/INDEX.md).\n', 'look-dev notu');
  put('world/lessons.md', '# Dersler — ' + name + '\n\n(look-dev ve fazlar boyunca: sorun → ölçü → kural.)\n', 'boş');
}
put('.gitignore', 'out/\nvendor/\nfonts/gf/\n.venv/\nnode_modules/\n*.part\n', 'üretilen dosyalar');
put('.gitattributes', '# satır sonları: kabuk betikleri ve git kancası LF, PowerShell CRLF (Windows autocrlf klonlarında kanca bozulmasın)\n.githooks/* text eol=lf\n*.sh text eol=lf\n*.ps1 text eol=crlf\n', 'satır sonları (kanca ve betikler)');

// 5 · rapor
const say = (t, a) => { if (a.length) console.log(t + ' (' + a.length + '):\n  ' + a.join('\n  ')); };
console.log((DRY ? '(dry) ' : '') + 'init ' + DIR + ' · world ' + (WORLD ? 'kütüphane ' + WORLD : 'yeni (look-dev)') + ' · profil ' + PROFILE + ' · ' + FPS + ' fps');
say('yazıldı', log.yazildi); say('atlandı', log.atlandi); if (log.dizin.length) console.log('dizin: ' + log.dizin.length + ' yeni');
// commit kapısı ipucu: git yapılandırması yalnız OKUNUR (değiştirilmez); proje depo kökü değilse yol depo köküne göre yazılır
function hooksHint() {
  if (!fs.existsSync(path.join(DIR, '.githooks', 'pre-commit')) && !log.yazildi.some((x) => x.startsWith('.githooks/'))) return;
  const g = (...a) => { const r = spawnSync('git', ['-C', fs.existsSync(DIR) ? DIR : process.cwd(), ...a], { encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : null; };
  const top = g('rev-parse', '--show-toplevel'), want = top ? (path.relative(top, path.join(DIR, '.githooks')).split(path.sep).join('/') || '.githooks') : '.githooks';
  if (top && g('config', '--get', 'core.hooksPath') === want) { console.log('✓ commit kapısı etkin (core.hooksPath ' + want + ' → celiski-tara)'); return; }
  console.log('ipucu: çelişki taraması commit kapısı için (bir kez, proje deposunda): git config core.hooksPath ' + want + (top ? '' : '   (önce git init)') + ' — init git yapılandırmasına dokunmaz');
}
if (DRY) { hooksHint(); process.exit(0); }

// 6 · whisper (isteğe bağlı)
let rc = 0;
if (has('with-whisper')) {
  const cand = process.platform === 'win32' ? ['python', 'py', 'python3'] : ['python3', 'python'];
  const py = cand.find((p) => spawnSync(p, ['--version'], { encoding: 'utf8' }).status === 0);
  const venv = path.join(DIR, '.venv'), vpy = path.join(venv, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  if (!py) { console.error('✗ --with-whisper: Python yok'); rc = 1; }
  else {
    if (!fs.existsSync(vpy)) { console.log('whisper: ' + py + ' -m venv .venv'); if (spawnSync(py, ['-m', 'venv', venv], { stdio: 'inherit' }).status !== 0) rc = 1; }
    if (!rc) { console.log('whisper: pip install -r ' + path.join(PKG, 'requirements.txt')); if (spawnSync(vpy, ['-m', 'pip', 'install', '-r', path.join(PKG, 'requirements.txt')], { stdio: 'inherit' }).status !== 0) { console.error('✗ pip install başarısız'); rc = 1; } else console.log('✓ .venv hazır (motion-render transcribe projede .venv\'i kendisi bulur)'); }
  }
}
// 7 · vendor
if (!has('no-vendor')) {
  const V = await import('../lib/vendor-core.mjs');
  try {
    await V.vendorScripts(DIR);
    const fams = V.familiesFromWorld(DIR);
    if (fams.length) await V.vendorFonts(DIR, fams); else console.log('font · world fonts yok (look-dev sonrası: motion-render vendor fonts)');
  } catch (e) { console.error('✗ vendor: ' + e.message + ' — ağ gelince: motion-render vendor --project ' + DIR); rc = rc || 1; }
}
console.log((rc ? '✗' : '✓') + ' init · sıradaki: ' + (WORLD ? 'motion-render manifest validate --project ' + DIR : 'look-dev (world.json band / k1.mask)'));
hooksHint();
process.exitCode = rc;   // process.exit değil: Windows'ta açık fetch tutamaçlarıyla çıkışta libuv iddiası (async.c) tetiklenebiliyor
