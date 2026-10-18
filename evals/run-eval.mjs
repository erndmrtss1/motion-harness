#!/usr/bin/env node
// motion-harness eval koşucusu — her brief için TAZE geçici klasörde headless Claude Code oturumu (`claude -p`).
// Oturum yalnız şunları görür: plugin (--plugin-dir), brief.md, START.md.
//
// Güvenlik (H4 şartları):
//  1. Klasör: <kök>/motion-eval-<brief>-r<tur> (varsayılan kök: işletim sistemi geçici dizini; depo ve kaynak projeler dışında).
//     İzinler .claude/settings.json'da TAM YOL kurallarıyla: yasak yollar (Read/Edit/Write + Bash içinde yol geçmesi),
//     ağ komutları (curl, wget, Invoke-WebRequest …), üretken komutlar (higgsfield generate/upload). WebFetch/WebSearch kapalı.
//     İzin dosyası kanıt klasörüne kopyalanır. Yasak yol denemesi > 0 → eval GEÇMEZ (score.mjs).
//  2. Üretken çağrı 0: MOTION_NO_GENAI=1 (gen/ingest kapalı; doctor gösterir) + Bash yasakları. Bakiye başta ve sonda okunur.
//  3. Süre/tur tavanı: --minutes (90) dolunca süreç ağacı durdurulur, kısmi sonuç puanlanır; --max-turns. Oturumlar paralel,
//     ağır işler MOTION_RENDER_LOCK ile makine çapında sıralı.
//  4. Ağ: yalnız npm kayıt defteri + Anthropic. MOTION_OFFLINE=1 (vendor önbellek dışına çıkmaz), MOTION_FONT_SOURCE=npm (@fontsource).
//  5. Çıktılar (transkript, dosya ağacı, QC/fc JSON, kontaklar, belgeler) <kanıt>/eval/<brief>-r<tur>/ altına kopyalanır.
//
// Kullanım:
//   node evals/run-eval.mjs --brief <ad|all> [--round 1] [--root <dizin>] [--plugin <dizin>] [--evidence <dizin>]
//                           [--minutes 90] [--max-turns 300] [--model <id>] [--deny <yol,yol>] [--dry]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const BRIEF = opt('--brief', 'all');
const ROUND = +opt('--round', 1);
const ROOT = path.resolve(opt('--root', os.tmpdir()));
const PLUGIN = path.resolve(opt('--plugin', REPO));
const EVID = path.resolve(opt('--evidence', path.join(REPO, 'evidence', 'eval')));
const MINUTES = +opt('--minutes', 90);
const MAX_TURNS = +opt('--max-turns', 300);
const MODEL = opt('--model', null);
const DENY = (opt('--deny', process.env.MOTION_EVAL_DENY || '')).split(',').map((s) => s.trim()).filter(Boolean);
const DRY = args.includes('--dry');
const PROMPT_FILE = opt('--prompt-file', null);   // sonda: kendi istemi (ortam doğrulaması; puanlanmaz)
const BRIEF_FILE = opt('--brief-file', null);     // sonda: briefs/ dışından brief
const LOCK = path.join(ROOT, 'motion-eval-render.lock');

const briefs = BRIEF === 'all'
  ? fs.readdirSync(path.join(HERE, 'briefs')).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3))
  : BRIEF.split(',');

function claudeBin() {
  if (process.platform !== 'win32') return { cmd: 'claude', shell: false };
  try {
    const root = execFileSync('npm', ['root', '-g'], { encoding: 'utf8', shell: true }).trim();
    const exe = path.join(root, '@anthropic-ai', 'claude-code', 'bin', 'claude.exe');
    if (fs.existsSync(exe)) return { cmd: exe, shell: false };
  } catch { /* yok */ }
  return { cmd: 'claude', shell: true };
}

// Yasak yolun bütün yazımları (C:\a\b · C:/a/b · /c/a/b · c:\a\b), Read/Edit/Write için //-mutlak biçim + Bash içinde geçmesi.
export function pathForms(p) {
  const fwd = path.resolve(p).replace(/\\/g, '/').replace(/\/$/, '');
  const drive = /^([A-Za-z]):\//.exec(fwd);
  const forms = new Set([fwd, fwd.replace(/\//g, '\\')]);
  if (drive) { forms.add('/' + drive[1].toLowerCase() + fwd.slice(2)); forms.add(drive[1].toLowerCase() + fwd.slice(1)); forms.add(drive[1].toLowerCase() + fwd.slice(1).replace(/\//g, '\\')); }
  return { fwd, drive, forms: [...forms] };
}
export const NET_CMDS = ['curl', 'wget', 'Invoke-WebRequest', 'Invoke-RestMethod', 'Start-BitsTransfer', 'git clone', 'git fetch', 'pip install', 'pip3 install', '-m pip', 'winget ', 'choco ', 'brew ', 'certutil', 'bitsadmin', 'playwright install'];
export const GEN_CMDS = ['higgsfield generate', 'higgs generate', 'hf generate', 'higgsfield upload', 'higgs upload', 'hf upload', 'generate create', 'motion-render gen', 'motion-render ingest'];
function settingsFor() {
  const deny = [];
  for (const p of DENY) {
    const { fwd, drive, forms } = pathForms(p);
    const abs = drive ? ['//' + fwd, '//' + drive[1].toLowerCase() + fwd.slice(2)] : ['/' + fwd];
    for (const a of abs) for (const tool of ['Read', 'Edit', 'Write']) deny.push(`${tool}(${a}/**)`);
    for (const f of forms) deny.push(`Bash(*${f}*)`);
  }
  { // plugin klasörü okunur ama yazılmaz (tur 2: oturum plugin'in render/ klasöründen tarayıcı kurdu)
    const { fwd, drive } = pathForms(PLUGIN);
    for (const a of drive ? ['//' + fwd, '//' + drive[1].toLowerCase() + fwd.slice(2)] : ['/' + fwd]) for (const tool of ['Edit', 'Write']) deny.push(`${tool}(${a}/**)`);
  }
  for (const c of [...NET_CMDS, ...GEN_CMDS]) deny.push(`Bash(*${c.trim()}*)`);
  deny.push('WebFetch', 'WebSearch');
  return { permissions: { deny, defaultMode: 'acceptEdits' }, env: {
    MOTION_NO_GENAI: '1', MOTION_OFFLINE: '1', MOTION_FONT_SOURCE: 'npm', MOTION_RENDER_LOCK: LOCK, MOTION_EVAL: '1',
    // tarayıcı indirmesi (playwright install) dışarı çıkamaz: yerel kapalı porta yönlenir ve başarısız olur (şart 4, tur 2 bulgusu)
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1', PLAYWRIGHT_DOWNLOAD_HOST: 'http://127.0.0.1:9',
  } };
}

function balance() {
  try {
    const r = spawnSync('higgsfield', ['account', 'status', '--json'], { encoding: 'utf8', shell: process.platform === 'win32', timeout: 60000 });
    return JSON.parse(r.stdout).credits;   // yalnız kredi (e-posta okunmaz/yazılmaz)
  } catch { return null; }
}

function killTree(pid) {
  if (process.platform === 'win32') spawnSync('taskkill', ['/T', '/F', '/PID', String(pid)]);
  else try { process.kill(-pid, 'SIGKILL'); } catch { try { process.kill(pid, 'SIGKILL'); } catch { /* yok */ } }
}

const PROMPT = (meta) => `START.md'yi oku (plugin içindeki ${'$'}{CLAUDE_PLUGIN_ROOT}/START.md), sonra /motion:init brief.md ile projeyi bu klasörde kur.

EVAL KİPİ (otomatik değerlendirme koşusu — kullanıcı yok):
- Her DUR noktasında sunacağın seçeneklerden önerilen (ilk) seçeneği kullanıcı onayı say; raporda "eval: otomatik onay" diye işaretle ve sıradaki faza geç. AskUserQuestion KULLANMA. Otomatik onay bir GEÇMEZ kapısını atlamaz: GEÇMEZ'den dönülen iş yeniden taze reviewer kapısından geçer (PLAYBOOK §1 kapı tablosu).
- Faz sırası: init → ${meta.live ? 'lookdev → live (sayfa + /motion:live akışı) → motion-render live --qc → gate' : (meta.audio ? 'audio → ' : '') + 'lookdev → lexicon → P1 → master'}.
- HEADLESS: bu oturum \`claude -p\`; tur bitince süreç kapanır. Ajanları ÖN PLANDA çalıştır (Agent → run_in_background: false) ve bekle; arka planda ajan bırakıp son mesajı yazma. Bütün fazlar (ya da süre tavanı) bitmeden durma.
- Her fazı plugin komutlarıyla yürüt (/motion:faz <faz>, /motion:gate, /motion:master${meta.live ? ', /motion:live' : ''}); reviewer'ı her kapıda taze motion:motion-reviewer ajanı olarak aç.
- ASIL HEDEF TESLİM: ${meta.live ? 'canlı sayfa + panel + `motion-render live --qc` (out/probe/live-qc.json) + canlı kapı' : 'out/master/ altında master mp4 (/motion:master)'}. Önce teslime ulaş, cila teslimden sonra.
- Süre tavanı ${MINUTES} dk: önce bütün fazların asgari geçerli hâlini bitir (kısa render, light ayarlar), sonra cila.
- Üretken (kredi harcayan) çağrı YASAK ve kilitli (MOTION_NO_GENAI=1). Bakiye okumak serbest.
- Ağ: yalnız npm kayıt defteri. Fontlar \`motion-render vendor fonts\` ile npm @fontsource'tan gelir (MOTION_FONT_SOURCE=npm). WebFetch/WebSearch ve curl/wget kapalı. Bir adım dış indirme gerektirirse DUR: o adımı atla, eval-summary.json openIssues'a yaz.
- Ses gerekiyorsa yerel: \`motion-render tts\` (Windows SAPI; yalnız İngilizce ses var). Whisper kurulu değilse transkript adımını tts kelime zamanlarıyla yap.
- Bu klasörün dışına yazma. Plugin'in sağlamadığı bir ölçüm için betik yazman gerekirse yaz ama eval-summary.json "adhocScripts" listesine yolunu ve nedenini ekle.
- Her fazın raporunu docs/rapor/<faz>.md'ye de yaz (PLAYBOOK rapor biçimi).
- Bitince eval-summary.json yaz: {phases:[{name, start, end, gate:{taste:"x/8", qc, frameCheck}, reviewer:[{karar, round}], rounds}], adhocScripts:[{path, why}], deliverables:[…], openIssues:[…]}.`;

function copyEvidence(dir, dst) {
  fs.mkdirSync(dst, { recursive: true });
  const take = (rel) => { const s = path.join(dir, rel); if (fs.existsSync(s)) { fs.mkdirSync(path.dirname(path.join(dst, rel)), { recursive: true }); fs.cpSync(s, path.join(dst, rel), { recursive: true }); } };
  for (const f of ['transcript.jsonl', 'stderr.log', 'run.json', 'eval-summary.json', 'scenes.json', 'project.md', 'CLAUDE.md', 'brief.md', '.claude/settings.json']) take(f);
  for (const d of ['docs', 'world', 'checks', 'hooks']) take(d);
  const probe = path.join(dir, 'out', 'probe');
  if (fs.existsSync(probe)) for (const f of fs.readdirSync(probe)) if (/\.(json|md)$/.test(f) || /contact|sheet|kontak/i.test(f)) take(path.join('out', 'probe', f));
  for (const sub of ['review', 'measure']) take(path.join('out', sub));
  const outDir = path.join(dir, 'out');   // look-dev/still/kontak görselleri ve teslim mp4 (kare dizinleri, ProRes ve arşiv hariç)
  const walkOut = (d, rel) => { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const r = path.join(rel, e.name), p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/^(frames|capture-frames|archive|logs)$/.test(e.name)) walkOut(p, r); continue; }
    if (/\.(png|jpe?g|webp|json|md|mp4)$/i.test(e.name) && fs.statSync(p).size < 150e6) take(r);
  } };
  walkOut(outDir, 'out');
  const lines = [];   // dosya ağacı (kare dizinleri özetlenir)
  const walk = (d, rel = '', depth = 0) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const r = rel ? rel + '/' + e.name : e.name, p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (/^(node_modules|\.git)$/.test(e.name)) continue;
        if (/^out\/frames\/[^/]+$/.test(r)) { lines.push(r + '/  (' + fs.readdirSync(p).length + ' girdi)'); continue; }
        lines.push(r + '/'); walk(p, r, depth + 1);
      } else lines.push(r + '  ' + fs.statSync(p).size);
    }
  };
  walk(dir);
  fs.writeFileSync(path.join(dst, 'tree.txt'), lines.join('\n') + '\n');
}

// Devam kipi (--resume): dış bir sebeple kesilen turun oturumları aynı session id ile kalan süre kadar sürdürülür
// (aynı tur; transkripte eklenir). Süre = tavan − önceki koşunun transkriptteki ilk/son zaman damgası farkı.
const RESUME = args.includes('--resume');
function transcriptSpan(file) {
  const L = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean) : [];
  let sid = null, t0 = null, t1 = null;
  for (const l of L) { let e; try { e = JSON.parse(l); } catch { continue; } if (!sid && e.session_id) sid = e.session_id; if (e.timestamp) { t0 = t0 || e.timestamp; t1 = e.timestamp; } }
  return { sid, t0, t1, minutes: t0 && t1 ? (Date.parse(t1) - Date.parse(t0)) / 60000 : 0 };
}

fs.mkdirSync(ROOT, { recursive: true });
const { cmd, shell } = claudeBin();
const settings = settingsFor();
const b0 = DRY ? null : balance();
console.log(`eval r${ROUND} · ${briefs.length} brief · plugin ${PLUGIN} · kök ${ROOT} · tavan ${MINUTES} dk / ${MAX_TURNS} tur · yasak yol ${DENY.length} · başlangıç bakiyesi ${b0}`);
const runs = [];
for (const name of briefs) {
  const src = BRIEF_FILE ? path.resolve(BRIEF_FILE) : path.join(HERE, 'briefs', name + '.md');
  if (!fs.existsSync(src)) { console.error('brief yok: ' + src); process.exit(2); }
  const txt = fs.readFileSync(src, 'utf8');
  const meta = { live: /\bprofil:\s*live\b/.test(txt), audio: /\bses:\s*(tts|dosya:|muzik)/.test(txt) };
  const dir = path.join(ROOT, `motion-eval-${name}-r${ROUND}`), ev = path.join(EVID, `${name}-r${ROUND}`);
  if (DRY) { console.log('[dry] ' + dir + ' · kanıt ' + ev + ' · deny ' + settings.permissions.deny.length + ' kural'); continue; }
  if (RESUME) {
    const span = transcriptSpan(path.join(dir, 'transcript.jsonl')), left = Math.max(0, MINUTES - span.minutes);
    if (!span.sid) { console.error('devam: session id yok: ' + dir); continue; }
    if (left < 1) { console.log('devam: süre doldu (' + span.minutes.toFixed(1) + ' dk) · ' + name); continue; }
    const cont = 'Bu oturum dış bir sebeple (değerlendirme koşucusu) kesildi; kaldığın yerden devam et. Aynı EVAL KİPİ kuralları geçerli ' +
      '(ajanlar ön planda, AskUserQuestion yok, DUR → önerilen seçenek, üretken çağrı ve dış ağ yasak). Kalan süre ' + Math.floor(left) +
      ' dk: önce yarım kalan kapıyı bitir, sonra sıradaki fazlara geç; sonunda eval-summary.json yaz.';
    const argvR = ['-p', cont, '--resume', span.sid, '--plugin-dir', PLUGIN, '--output-format', 'stream-json', '--verbose',
      '--max-turns', String(MAX_TURNS), '--permission-mode', 'acceptEdits',
      '--allowedTools', 'Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'Agent', 'Task', 'Skill', 'SlashCommand', 'TodoWrite',
      '--disallowedTools', 'WebFetch', 'WebSearch', 'PowerShell'];
    if (MODEL) argvR.push('--model', MODEL);
    const run = { brief: name, round: ROUND, dir, evidence: ev, start: span.t0, resumedAt: new Date().toISOString(), firstLegMinutes: +span.minutes.toFixed(1), minutesCap: MINUTES, maxTurns: MAX_TURNS, deny: DENY, interrupted: 'dış sonlandırma (koşucu süreci) → --resume' };
    console.log(`▶ devam ${name} r${ROUND} · ilk bölüm ${span.minutes.toFixed(1)} dk · kalan ${left.toFixed(1)} dk`);
    const out = fs.createWriteStream(path.join(dir, 'transcript.jsonl'), { flags: 'a' });
    const p = spawn(cmd, argvR, { cwd: dir, shell, env: { ...process.env, ...settings.env }, stdio: ['ignore', 'pipe', 'pipe'] });
    p.stdout.pipe(out);
    p.stderr.on('data', (d) => fs.appendFileSync(path.join(dir, 'stderr.log'), d));
    const timer = setTimeout(() => { run.timedOut = true; console.log(`⏱ ${name} tavan → durduruluyor`); killTree(p.pid); }, left * 60000);
    runs.push(new Promise((ok) => p.on('close', (code) => {
      clearTimeout(timer);
      run.end = new Date().toISOString(); run.exit = code;
      run.minutes = +(span.minutes + (Date.parse(run.end) - Date.parse(run.resumedAt)) / 60000).toFixed(1);
      fs.writeFileSync(path.join(dir, 'run.json'), JSON.stringify(run, null, 1));
      try { copyEvidence(dir, ev); } catch (e) { run.copyError = e.message; }
      console.log(`■ ${name} r${ROUND} çıkış ${code}${run.timedOut ? ' (tavan)' : ''} · toplam ${run.minutes} dk`);
      ok(run);
    })));
    continue;
  }
  if (fs.existsSync(dir)) { console.error('klasör zaten var (yeni tur için --round): ' + dir); process.exit(2); }
  fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
  fs.copyFileSync(src, path.join(dir, 'brief.md'));
  fs.copyFileSync(path.join(PLUGIN, 'START.md'), path.join(dir, 'START.md'));
  fs.writeFileSync(path.join(dir, '.claude', 'settings.json'), JSON.stringify(settings, null, 2));
  fs.mkdirSync(ev, { recursive: true });
  fs.writeFileSync(path.join(ev, 'settings.json'), JSON.stringify(settings, null, 2));
  const argv = ['-p', PROMPT_FILE ? fs.readFileSync(PROMPT_FILE, 'utf8') : PROMPT(meta), '--plugin-dir', PLUGIN, '--output-format', 'stream-json', '--verbose',
    '--max-turns', String(MAX_TURNS), '--permission-mode', 'acceptEdits',
    '--allowedTools', 'Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'Agent', 'Task', 'Skill', 'SlashCommand', 'TodoWrite',
    '--disallowedTools', 'WebFetch', 'WebSearch', 'PowerShell'];
  if (MODEL) argv.push('--model', MODEL);
  const run = { brief: name, round: ROUND, dir, evidence: ev, start: new Date().toISOString(), minutesCap: MINUTES, maxTurns: MAX_TURNS, deny: DENY };
  console.log(`▶ ${name} r${ROUND} → ${dir}`);
  const out = fs.createWriteStream(path.join(dir, 'transcript.jsonl'));
  const p = spawn(cmd, argv, { cwd: dir, shell, env: { ...process.env, ...settings.env }, detached: process.platform !== 'win32' });
  p.stdout.pipe(out);
  p.stderr.on('data', (d) => fs.appendFileSync(path.join(dir, 'stderr.log'), d));
  const timer = setTimeout(() => { run.timedOut = true; console.log(`⏱ ${name} ${MINUTES} dk tavanı → durduruluyor`); killTree(p.pid); }, MINUTES * 60000);
  runs.push(new Promise((ok) => p.on('close', (code) => {
    clearTimeout(timer);
    run.end = new Date().toISOString(); run.exit = code;
    run.minutes = +((Date.parse(run.end) - Date.parse(run.start)) / 60000).toFixed(1);
    fs.writeFileSync(path.join(dir, 'run.json'), JSON.stringify(run, null, 1));
    try { copyEvidence(dir, ev); } catch (e) { run.copyError = e.message; }
    console.log(`■ ${name} r${ROUND} çıkış ${code}${run.timedOut ? ' (tavan)' : ''} · ${run.minutes} dk`);
    ok(run);
  })));
}
if (!DRY) {
  const done = await Promise.all(runs);
  const b1 = balance();
  const auth = spawnSync(cmd, ['auth', 'status'], { encoding: 'utf8', shell }).stdout || '';
  const summary = { round: ROUND, balanceStart: b0, balanceEnd: b1, balanceDelta: b0 != null && b1 != null ? +(b1 - b0).toFixed(2) : null,
    authStatus: auth.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '<e-posta>').trim(), runs: done };
  fs.mkdirSync(EVID, { recursive: true });
  fs.writeFileSync(path.join(EVID, `runs-r${ROUND}.json`), JSON.stringify(summary, null, 1));
  console.log(`bakiye ${b0} → ${b1} · auth kaydı ${path.join(EVID, `runs-r${ROUND}.json`)}`);
}
