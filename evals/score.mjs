#!/usr/bin/env node
// motion-harness eval puanlayıcısı: run-eval.mjs'in kanıt klasörlerinden (<kanıt>/eval/<brief>-r<tur>/) ölçütleri toplar.
// Kullanım: node evals/score.mjs <kanıt-eval-kökü> [--round 1] [--json out.json] [--md out.md]
// Ölçütler: süre · tur · maliyet · yasak yol denemesi (> 0 → GEÇMEZ) · ağ komutu denemesi · üretken çağrı denemesi ·
//           ad-hoc betik · kapı skorları (§0.6) · reviewer kararları (GEÇMEZ, tur) · teslimler · canlı QC · bakiye farkı.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const ROOT = path.resolve(args.find((a, i) => !a.startsWith('--') && !['--round', '--json', '--md'].includes(args[i - 1])) || '.');
const ROUND = +opt('--round', 1);
const KARAR = /KARAR:\s*\**\s*(TESLİM GEÇER|ŞARTLI GEÇER|GEÇMEZ|GEÇER)\**\s*·\s*§0\.6\s*(\d)\s*\/\s*8/gi;
const SCRIPT_EXT = /\.(mjs|cjs|js|py|sh|ps1)$/i;
const ALLOWED_JS = /(^|[\\/])(hooks|world|shared|live)[\\/]|\.jsx$|motion-runtime\.js$|[\\/]script[\\/][^\\/]+-amap\.js$|motion-manifest\.js$/i;
const NET = /\b(curl|wget|Invoke-WebRequest|Invoke-RestMethod|Start-BitsTransfer|git\s+(clone|fetch)|pip3?\s+install|-m\s+pip|winget|choco|brew|certutil|bitsadmin)\b/i;
const GEN = /(higgs(field)?|\bhf)\s+(generate|upload)|generate\s+create|motion-render\s+(gen|ingest)\b/i;

function forms(p) {
  const fwd = path.resolve(p).replace(/\\/g, '/').replace(/\/$/, '').toLowerCase();
  const d = /^([a-z]):\//.exec(fwd);
  return [fwd, ...(d ? ['/' + d[1] + fwd.slice(2)] : [])];
}

async function scanTranscript(file, deny) {
  const F = deny.flatMap(forms);
  const res = { tools: {}, forbidden: [], net: [], gen: [], denied: 0, writtenScripts: new Set(), turns: null, cost: null, durationMs: null, isError: null, agents: {} };
  if (!fs.existsSync(file)) return res;
  const rl = readline.createInterface({ input: fs.createReadStream(file, 'utf8'), crlfDelay: Infinity });
  for await (const line of rl) {
    let ev; try { ev = JSON.parse(line); } catch { continue; }
    if (ev.type === 'result') { res.results = (res.results || 0) + 1; res.turns = (res.turns || 0) + (ev.num_turns || 0); res.cost = (res.cost || 0) + (ev.total_cost_usd || 0); res.durationMs = (res.durationMs || 0) + (ev.duration_ms || 0); res.isError = ev.is_error; }   // headless: bildirimle ek turlar olabilir → toplam
    const blocks = ev.message?.content;
    if (!Array.isArray(blocks)) continue;
    for (const b of blocks) {
      if (b.type === 'tool_result') {
        const t = JSON.stringify(b.content || '');
        if (/permission|izin verilmedi|denied|not allowed/i.test(t) && b.is_error) res.denied++;
        continue;
      }
      if (b.type !== 'tool_use') continue;
      res.tools[b.name] = (res.tools[b.name] || 0) + 1;
      const s = JSON.stringify(b.input || {}), low = s.toLowerCase().replace(/\\\\/g, '/');
      for (const f of F) if (low.includes(f)) { res.forbidden.push({ tool: b.name, path: f, input: s.slice(0, 200) }); break; }
      if (b.name === 'Bash' || b.name === 'PowerShell') {
        const c = String(b.input?.command || '');
        if (NET.test(c)) res.net.push(c.slice(0, 160));
        if (GEN.test(c)) res.gen.push(c.slice(0, 160));
        if (/(>|tee|Out-File|Set-Content)\s*\S+\.(mjs|py|sh|ps1)\b/.test(c)) res.writtenScripts.add('(bash) ' + c.slice(0, 120));
      }
      if (b.name === 'WebFetch' || b.name === 'WebSearch') res.net.push(b.name);
      if ((b.name === 'Agent' || b.name === 'Task') && b.input?.subagent_type) res.agents[b.input.subagent_type] = (res.agents[b.input.subagent_type] || 0) + 1;
      const fp = b.input?.file_path;
      if (b.name === 'Write' && fp && SCRIPT_EXT.test(fp) && !ALLOWED_JS.test(fp)) res.writtenScripts.add(fp);
    }
  }
  res.writtenScripts = [...res.writtenScripts];
  return res;
}

function reviewerStats(dir) {
  const out = { karar: [], gecmez: 0, tasteScores: [] };
  const files = [path.join(dir, 'docs', 'REVIEWER.md')];
  const rv = path.join(dir, 'out', 'review');
  if (fs.existsSync(rv)) for (const d of fs.readdirSync(rv)) { const f = path.join(rv, d, 'karar.md'); if (fs.existsSync(f)) files.push(f); }
  const seen = new Set();
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    for (const m of fs.readFileSync(f, 'utf8').matchAll(KARAR)) {
      const k = m[0]; if (seen.has(k + f)) continue; seen.add(k + f);
      if (f.endsWith('REVIEWER.md') || !files[0] || !fs.existsSync(files[0])) {
        out.karar.push(m[1].toUpperCase() + ' ' + m[2] + '/8'); out.tasteScores.push(+m[2]); if (/GEÇMEZ/i.test(m[1])) out.gecmez++;
      }
    }
  }
  return out;
}

const runsFile = path.join(ROOT, `runs-r${ROUND}.json`);
const runsMeta = fs.existsSync(runsFile) ? JSON.parse(fs.readFileSync(runsFile, 'utf8')) : null;
const dirs = fs.readdirSync(ROOT, { withFileTypes: true }).filter((e) => e.isDirectory() && e.name.endsWith('-r' + ROUND)).map((e) => path.join(ROOT, e.name));
const rows = [];
for (const dir of dirs) {
  const run = fs.existsSync(path.join(dir, 'run.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'run.json'), 'utf8')) : {};
  const sum = fs.existsSync(path.join(dir, 'eval-summary.json')) ? (() => { try { return JSON.parse(fs.readFileSync(path.join(dir, 'eval-summary.json'), 'utf8')); } catch { return null; } })() : null;
  const tr = await scanTranscript(path.join(dir, 'transcript.jsonl'), run.deny || []);
  const rv = reviewerStats(dir);
  const lq = path.join(dir, 'out', 'probe', 'live-qc.json');
  const live = fs.existsSync(lq) ? JSON.parse(fs.readFileSync(lq, 'utf8')) : null;
  const tree = fs.existsSync(path.join(dir, 'tree.txt')) ? fs.readFileSync(path.join(dir, 'tree.txt'), 'utf8').split('\n') : [];
  const deliverables = tree.filter((l) => /^out\/(master|scenes|live)\/[^ ]+\.(mp4|mov|html)\s/.test(l) || /^live\/[^ ]+\.html\s/.test(l)).map((l) => l.split('  ')[0]);
  // out/measure ve out/review altındaki betikler bağımsız ölçüm/reviewer'ın kendi yöntemidir (tasarım gereği) → ad-hoc sayılmaz.
  const INDEP = /out[\\/](measure|review)[\\/]/i;
  const allScripts = [...new Set([...(sum?.adhocScripts || []).map((x) => x.path || x), ...tr.writtenScripts])];
  const adhoc = allScripts.filter((x) => !INDEP.test(x)), indep = allScripts.filter((x) => INDEP.test(x));
  rows.push({
    brief: path.basename(dir).replace(/-r\d+$/, ''), exit: run.exit, timedOut: !!run.timedOut, minutes: run.minutes, turns: tr.turns, costUsd: tr.cost,
    forbiddenAttempts: tr.forbidden.length, forbidden: tr.forbidden.slice(0, 5), netAttempts: tr.net.length, net: tr.net.slice(0, 5),
    genAttempts: tr.gen.length, gen: tr.gen.slice(0, 5), deniedResults: tr.denied,
    adhocScripts: adhoc.length, adhocList: adhoc, independentScripts: indep.length,
    reviewer: rv, gecmez: rv.gecmez, reviews: rv.karar.length, tasteMin: rv.tasteScores.length ? Math.min(...rv.tasteScores) : null,
    phases: sum?.phases?.map((p) => p.name) || [], openIssues: sum?.openIssues || [],
    deliverables, live: live ? { pass: live.pass, fps: live.fps, latency: live.latency, dropped: live.dropped } : null,
    agents: tr.agents, tools: tr.tools,
    verdict: tr.forbidden.length > 0 ? 'GEÇMEZ (yasak yol)' : tr.gen.length > 0 ? 'GEÇMEZ (üretken çağrı)' : 'puanlandı',
  });
}
const out = { root: ROOT, round: ROUND, at: new Date().toISOString(), balance: runsMeta ? { start: runsMeta.balanceStart, end: runsMeta.balanceEnd, delta: runsMeta.balanceDelta } : null, rows };
const jo = opt('--json'); if (jo) fs.writeFileSync(jo, JSON.stringify(out, null, 1));
const md = ['| brief | süre (dk) | tur | yasak yol | ağ | üretken | ad-hoc betik | bağımsız ölçüm betiği | reviewer kararları | GEÇMEZ | §0.6 en düşük | teslim | sonuç |',
  '|---|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---|---|',
  ...rows.map((r) => `| ${r.brief} | ${r.minutes ?? '—'}${r.timedOut ? ' (tavan)' : ''} | ${r.turns ?? '—'} | ${r.forbiddenAttempts} | ${r.netAttempts} | ${r.genAttempts} | ${r.adhocScripts} | ${r.independentScripts} | ${r.reviewer.karar.join(', ') || '—'} | ${r.gecmez} | ${r.tasteMin ?? '—'} | ${r.deliverables.join(', ') || (r.live ? 'live-qc ' + (r.live.pass ? '✓' : '✗') : '—')} | ${r.verdict} |`)].join('\n');
const mo = opt('--md'); if (mo) fs.writeFileSync(mo, md + '\n');
console.log(md);
if (out.balance) console.log(`\nbakiye ${out.balance.start} → ${out.balance.end} (Δ ${out.balance.delta})`);
