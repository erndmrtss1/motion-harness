// motion-render doctor — ortam denetimi (sözleşme §6): Node, paket bağımlılıkları, ffmpeg özellikleri, Chromium, proje dosyaları
// (proje içindeyse: vendor, fonts/gf/map.json), disk, Higgsfield CLI oturumu + bakiye, Python/faster-whisper (isteğe bağlı),
// Claude Code plugin'i.
//
//   motion-render doctor [--json]
//
// Her satır: ✓ tamam · ✗ sorun · – yok/atlandı (isteğe bağlı). Zorunlu bir denetim ✗ ise çıkış 1.
// Gizlilik: Higgsfield hesabından yalnız `credits` ve `subscription_plan_type` basılır (e-posta / belirteç asla).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { ROOT, MANIFEST_PATH } from '../lib/project.mjs';
import { capabilities } from '../lib/ffmpeg.mjs';

const JSON_OUT = process.argv.includes('--json');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const WIN = process.platform === 'win32';
const checks = [];
const add = (name, status, detail, required = false) => { checks.push({ name, status, required, detail }); if (!JSON_OUT) console.log((status === 'ok' ? '✓' : status === 'fail' ? '✗' : '–') + ' ' + name + (detail ? ' · ' + detail : '')); };
// dış komut (Windows'ta .cmd kabukları için kabuk; komut satırı sabit metin, kullanıcı girdisi yok)
const run = (line, timeout = 60000) => spawnSync(line, { encoding: 'utf8', timeout, shell: true, windowsHide: true });
const onPath = (cmd) => { const r = spawnSync(WIN ? 'where' : 'which', [cmd], { encoding: 'utf8', windowsHide: true }); return r.status === 0 && !!(r.stdout || '').trim(); };
const pkgVersion = (name) => {   // giriş dosyasından yukarı: adı eşleşen ilk package.json (exports alanı package.json'ı gizleyebilir)
  try { let d = path.dirname(require.resolve(name)); for (let i = 0; i < 8; i++) { const f = path.join(d, 'package.json'); if (fs.existsSync(f)) { const j = JSON.parse(fs.readFileSync(f, 'utf8')); if (j.name === name) return j.version; } d = path.dirname(d); } } catch { /* yok */ }
  return null;
};

// 1) Node
const major = +process.versions.node.split('.')[0];
add('node ≥ 20', major >= 20 ? 'ok' : 'fail', 'v' + process.versions.node, true);

// 2) paket bağımlılıkları
const own = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'package.json'), 'utf8'));
for (const dep of Object.keys(own.dependencies || {})) {
  let ok = false, why = '';
  try {
    if (dep === 'sharp' || dep === 'playwright') await import(dep); else require.resolve(dep);   // yerel ikili yüklenebiliyor mu
    ok = true;
  } catch (e) { why = String(e.message || e).split('\n')[0]; }
  add('bağımlılık ' + dep, ok ? 'ok' : 'fail', ok ? (pkgVersion(dep) || 'var') + (own.dependencies[dep] !== pkgVersion(dep) && pkgVersion(dep) ? ' (beklenen ' + own.dependencies[dep] + ')' : '') : why + ' → npm install', true);
}
for (const dep of Object.keys(own.optionalDependencies || {})) {
  let ok = false; try { require.resolve(dep); ok = true; } catch { /* yok */ }
  add('isteğe bağlı ' + dep, ok ? 'ok' : 'skip', ok ? pkgVersion(dep) || 'var' : 'yok (yalnız logo hattı)');
}

// 3) ffmpeg
let cap = null;
try { cap = capabilities(); } catch { cap = null; }
const ffOk = !!(cap && cap.version);
add('ffmpeg', ffOk && cap.libx264 ? 'ok' : 'fail', ffOk ? cap.version.replace(/\s+Copyright[\s\S]*$/, '') + (cap.libx264 ? ' · libx264' : ' · libx264 YOK') : 'çalışmıyor (MOTION_FFMPEG / ffmpeg-static / PATH)', true);
if (ffOk) {
  const opt = ['prores_ks', 'ffv1', 'aac', 'loudnorm', 'ebur128', 'drawtext'], miss = opt.filter((k) => !cap[k]);
  add('ffmpeg özellikleri (master/arşiv/ses)', miss.length ? 'fail' : 'ok', miss.length ? 'eksik: ' + miss.join(', ') : opt.join(' · '));
}

// 4) Chromium (Playwright)
try {
  const { chromium } = await import('playwright');
  const t0 = Date.now(), b = await chromium.launch({ timeout: 60000 }), v = b.version(); await b.close();
  add('Chromium (Playwright)', 'ok', v + ' · açılış ' + (Date.now() - t0) + ' ms', true);
} catch (e) {
  add('Chromium (Playwright)', 'fail', String(e.message || e).split('\n')[0] + ' → npx playwright install chromium', true);
}

// 5) proje (yalnız proje içindeyse)
const inProject = fs.existsSync(MANIFEST_PATH);
if (inProject) {
  const vendor = ['react@18.3.1/umd/react.production.min.js', 'react-dom@18.3.1/umd/react-dom.production.min.js', '@babel/standalone@7.29.0/babel.min.js'];
  const vmiss = vendor.filter((f) => !fs.existsSync(path.join(ROOT, 'vendor', f)));
  add('proje vendor/', vmiss.length ? 'fail' : 'ok', vmiss.length ? 'eksik: ' + vmiss.join(', ') + ' → motion-render vendor' : 'React 18.3.1 · ReactDOM 18.3.1 · Babel 7.29.0', true);
  const map = path.join(ROOT, 'fonts', 'gf', 'map.json');
  let mapN = null; try { mapN = Object.keys(JSON.parse(fs.readFileSync(map, 'utf8'))).length; } catch { /* yok */ }
  add('proje fonts/gf/map.json', mapN != null ? 'ok' : 'fail', mapN != null ? mapN + ' yüz' : 'yok → motion-render vendor fonts (Google Fonts istekleri iptal edilir)');
} else add('proje', 'skip', 'scenes.json bulunamadı (proje dışında; --project <dizin>)');

// 6) disk
try {
  const st = fs.statfsSync(inProject ? ROOT : process.cwd()), free = st.bavail * st.bsize / 1073741824, min = +(process.env.MOTION_MIN_DISK_GB || 40);
  add('disk boş alan', free >= min ? 'ok' : 'fail', free.toFixed(1) + ' GB (render eşiği ' + min + ' GB, MOTION_MIN_DISK_GB)');
} catch (e) { add('disk boş alan', 'skip', 'ölçülemedi'); }

// 7) Higgsfield CLI + oturum (yalnız credits ve subscription_plan_type)
if (!onPath('higgsfield')) add('Higgsfield CLI', 'skip', 'yok → npm i -g @higgsfield/cli (üretken varlık için)');
else {
  const v = run('higgsfield --version', 30000), ver = ((v.stdout || '').trim().split('\n')[0] || '').replace(/\s*\(.*$/, '');
  add('Higgsfield CLI', v.status === 0 ? 'ok' : 'fail', v.status === 0 ? ver : 'çalışmıyor');
  const s = run('higgsfield account status --json', 60000);
  let acc = null; try { const j = JSON.parse(s.stdout || ''); if (j && j.credits != null) acc = { credits: j.credits, plan: j.subscription_plan_type }; } catch { /* oturum yok */ }
  add('üretken kilit', process.env.MOTION_NO_GENAI === '1' ? 'ok' : 'skip', process.env.MOTION_NO_GENAI === '1' ? 'açık (MOTION_NO_GENAI=1): gen/ingest kapalı, yalnız bakiye okuma' : 'kapalı (üretken çağrı izinli; bütçe bekçisi GENAI.md)');
  add('Higgsfield oturumu', acc ? 'ok' : 'fail', acc ? 'credits ' + acc.credits + ' · plan ' + (acc.plan == null ? '—' : acc.plan) : 'oturum yok → higgsfield auth login');
}

// 8) Python + faster-whisper (isteğe bağlı: transcribe)
{
  const venv = [path.join(ROOT, '.venv', 'Scripts', 'python.exe'), path.join(ROOT, '.venv', 'bin', 'python')].find((p) => inProject && fs.existsSync(p));
  const cands = venv ? [[venv, []]] : [['python', []], ['python3', []], ...(WIN ? [['py', ['-3']]] : [])];
  let py = null;
  for (const [c, pre] of cands) {
    if (!venv && !onPath(c)) continue;
    const r = spawnSync(c, [...pre, '--version'], { encoding: 'utf8', timeout: 30000, windowsHide: true });
    if (r.status === 0) { py = { c, pre, v: ((r.stdout || '') + (r.stderr || '')).trim() }; break; }
  }
  if (!py) add('Python', 'skip', 'yok (isteğe bağlı: transcribe)');
  else {
    add('Python', 'ok', py.v + (venv ? ' (proje .venv)' : ''));
    const fw = spawnSync(py.c, [...py.pre, '-c', 'import faster_whisper; print(faster_whisper.__version__)'], { encoding: 'utf8', timeout: 60000, windowsHide: true });
    add('faster-whisper', fw.status === 0 ? 'ok' : 'skip', fw.status === 0 ? (fw.stdout || '').trim() : 'yok (isteğe bağlı: motion-render init --with-whisper)');
  }
}

// 9) Claude Code plugin
if (!onPath('claude')) add('Claude Code plugin', 'skip', 'claude PATH\'te yok');
else {
  const r = run('claude plugin list', 60000), out = (r.stdout || '') + (r.stderr || '');
  if (r.status !== 0 && !out.trim()) add('Claude Code plugin', 'skip', 'claude plugin list çalışmadı');
  else add('Claude Code plugin', /\bmotion\b/.test(out) ? 'ok' : 'skip', /\bmotion\b/.test(out) ? 'motion kurulu' : 'motion yok → claude plugin install motion@motion-harness --scope user');
}

const reqFail = checks.filter((c) => c.required && c.status === 'fail');
const sum = { ok: checks.filter((c) => c.status === 'ok').length, fail: checks.filter((c) => c.status === 'fail').length, skip: checks.filter((c) => c.status === 'skip').length, requiredFail: reqFail.length };
if (JSON_OUT) console.log(JSON.stringify({ ok: !reqFail.length, project: inProject ? path.basename(ROOT) : null, summary: sum, ffmpeg: cap, checks }, null, 1));
else console.log('doctor: ' + sum.ok + ' ✓ · ' + sum.fail + ' ✗' + (reqFail.length ? ' (zorunlu ' + reqFail.length + ': ' + reqFail.map((c) => c.name).join(', ') + ')' : '') + ' · ' + sum.skip + ' –' + (reqFail.length ? ' → HAZIR DEĞİL' : ' → hazır'));
process.exitCode = reqFail.length ? 1 : 0;
