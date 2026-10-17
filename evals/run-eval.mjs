#!/usr/bin/env node
// motion-harness eval koşucusu — her brief için TAZE klasörde headless Claude Code oturumu.
// Oturum yalnız şunları görür: plugin (--plugin-dir), brief.md, START.md. Kaynak projeler erişilemez:
// klasöre .claude/settings.json deny kuralları yazılır; ayrıca koşu sonunda transkript yasak yollar için denetlenir (score.mjs).
//
// Kullanım:
//   node evals/run-eval.mjs --brief <ad|all> [--round 1] [--root <dizin>] [--max-turns 600] [--model <id>] [--deny <yol,yol>] [--dry]
//   ad: evals/briefs/<ad>.md   ·   çıktı: <root>/<ad>-r<round>/  (+ transcript.jsonl, run.json)
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const BRIEF = opt('--brief', 'all');
const ROUND = +opt('--round', 1);
const ROOT = path.resolve(opt('--root', path.join(path.dirname(REPO), 'mh-eval')));
const MAX_TURNS = +opt('--max-turns', 600);
const MODEL = opt('--model', null);
const DENY = (opt('--deny', process.env.MOTION_EVAL_DENY || '')).split(',').filter(Boolean);   // erişilemeyecek mutlak yollar
const DRY = args.includes('--dry');

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

// İzin kuralları: kaynak yolların hiçbir aracıyla okunamaz/yazılamaz (her iki yazımla).
function denyRules(paths) {
  const out = [];
  for (const p of paths) {
    const fwd = p.replace(/\\/g, '/').replace(/\/$/, '');
    const drive = /^([A-Za-z]):\//.exec(fwd);
    const forms = [fwd];
    if (drive) forms.push('/' + drive[1].toLowerCase() + fwd.slice(2));   // //d/Edit/... biçimi
    for (const f of forms) for (const tool of ['Read', 'Edit', 'Write']) out.push(`${tool}(/${f.startsWith('/') ? f : '/' + f}/**)`);
    out.push(`Bash(*${path.basename(fwd)}*)`);
  }
  return out;
}

const PROMPT = (brief) => `START.md'yi oku (plugin içindeki ${'$'}{CLAUDE_PLUGIN_ROOT}/START.md), sonra /motion:init brief.md ile projeyi bu klasörde kur.

EVAL KİPİ (otomatik değerlendirme koşusu — kullanıcı yok):
- Her DUR noktasında, sunacağın seçeneklerden önerilen (ilk) seçeneği kullanıcı onayı say; raporda "eval: otomatik onay" diye işaretle ve sıradaki faza geç. AskUserQuestion KULLANMA.
- Faz sırası: init → ${brief.live ? 'lookdev → live (sayfa + /motion:live akışı) → motion-render live --qc → gate' : (brief.audio ? 'audio → ' : '') + 'lookdev → lexicon → P1 → master'}.
- Her fazı plugin komutlarıyla yürüt (/motion:faz <faz>, /motion:gate, /motion:master${brief.live ? ', /motion:live' : ''}); reviewer'ı her kapıda taze motion:motion-reviewer ajanı olarak aç.
- Üretken (kredi harcayan) çağrı YASAK (genai_butce 0). Bakiye okumak serbest.
- Plugin'in sağlamadığı bir ölçüm için betik yazman gerekirse yaz ama eval-summary.json "adhocScripts" listesine yolunu ve nedenini ekle.
- Her fazın raporunu docs/rapor/<faz>.md'ye de yaz (PLAYBOOK rapor biçimi).
- Bitince eval-summary.json yaz: {phases:[{name, start, end, gate:{taste:"x/8", qc, frameCheck}, reviewer:[{karar, round}], rounds}], adhocScripts:[{path, why}], deliverables:[…], openIssues:[…]}.`;

fs.mkdirSync(ROOT, { recursive: true });
const { cmd, shell } = claudeBin();
const runs = [];
for (const name of briefs) {
  const src = path.join(HERE, 'briefs', name + '.md');
  if (!fs.existsSync(src)) { console.error('brief yok: ' + src); process.exit(2); }
  const txt = fs.readFileSync(src, 'utf8');
  const meta = { live: /\bprofil:\s*live\b/.test(txt), audio: /\bses:\s*(tts|dosya:|muzik)/.test(txt) };
  const dir = path.join(ROOT, `${name}-r${ROUND}`);
  if (fs.existsSync(dir)) { console.error('klasör zaten var (yeni tur için --round): ' + dir); process.exit(2); }
  fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
  fs.copyFileSync(src, path.join(dir, 'brief.md'));
  fs.copyFileSync(path.join(REPO, 'START.md'), path.join(dir, 'START.md'));
  fs.writeFileSync(path.join(dir, '.claude', 'settings.json'), JSON.stringify({ permissions: { deny: denyRules(DENY) } }, null, 2));
  const argv = ['-p', PROMPT(meta), '--plugin-dir', REPO, '--output-format', 'stream-json', '--verbose',
    '--max-turns', String(MAX_TURNS), '--permission-mode', 'acceptEdits',
    '--allowedTools', 'Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'Agent', 'Task', 'Skill', 'SlashCommand', 'TodoWrite', 'WebSearch', 'WebFetch'];
  if (MODEL) argv.push('--model', MODEL);
  const run = { brief: name, round: ROUND, dir, start: new Date().toISOString(), argv: argv.filter((a) => a !== PROMPT(meta)), deny: DENY.length };
  if (DRY) { console.log('[dry] ' + dir + '\n  ' + cmd + ' ' + run.argv.join(' ')); runs.push(run); continue; }
  console.log(`▶ ${name} r${ROUND} → ${dir}`);
  const out = fs.createWriteStream(path.join(dir, 'transcript.jsonl'));
  const p = spawn(cmd, argv, { cwd: dir, shell, env: { ...process.env, MOTION_EVAL: '1' } });
  p.stdout.pipe(out);
  p.stderr.on('data', (d) => fs.appendFileSync(path.join(dir, 'stderr.log'), d));
  runs.push(new Promise((ok) => p.on('close', (code) => {
    run.end = new Date().toISOString(); run.exit = code;
    run.minutes = +((Date.parse(run.end) - Date.parse(run.start)) / 60000).toFixed(1);
    fs.writeFileSync(path.join(dir, 'run.json'), JSON.stringify(run, null, 1));
    console.log(`■ ${name} r${ROUND} çıkış ${code} · ${run.minutes} dk`);
    ok(run);
  })));
}
const done = await Promise.all(runs);
fs.writeFileSync(path.join(ROOT, `runs-r${ROUND}.json`), JSON.stringify(done, null, 1));
