#!/usr/bin/env node
// motion-harness eval puanlayıcısı: run-eval.mjs çıktı klasörlerinden ölçütleri toplar.
// Kullanım: node evals/score.mjs <eval-kökü> [--round 1] [--forbid kalıp,kalıp] [--json out.json] [--md out.md]
// Ölçütler: süre · tur (num_turns) · maliyet · yasak yol erişim denemesi · ad-hoc betik · kapı skorları (§0.6) ·
//           reviewer kararları (GEÇMEZ sayısı, tur) · teslimler · canlı QC.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const ROOT = path.resolve(args.find((a) => !a.startsWith('--') && !['--round', '--forbid', '--json', '--md'].includes(args[args.indexOf(a) - 1])) || '.');
const ROUND = +opt('--round', 1);
const FORBID = (opt('--forbid', process.env.MOTION_EVAL_FORBID || '')).split(',').filter(Boolean).map((s) => s.toLowerCase());
const KARAR = /KARAR:\s*\**\s*(TESLİM GEÇER|ŞARTLI GEÇER|GEÇMEZ|GEÇER)\**\s*·\s*§0\.6\s*(\d)\s*\/\s*8/gi;
const SCRIPT_EXT = /\.(mjs|cjs|js|py|sh|ps1)$/i;
const ALLOWED_JS = /(^|[\\/])(hooks|world|shared)[\\/]|\.jsx$|motion-runtime\.js$|[\\/]script[\\/][^\\/]+-amap\.js$|motion-manifest\.js$/i;

async function scanTranscript(file) {
  const res = { tools: {}, forbidden: [], writtenScripts: new Set(), turns: null, cost: null, durationMs: null, isError: null, agents: {} };
  if (!fs.existsSync(file)) return res;
  const rl = readline.createInterface({ input: fs.createReadStream(file, 'utf8'), crlfDelay: Infinity });
  for await (const line of rl) {
    let ev; try { ev = JSON.parse(line); } catch { continue; }
    if (ev.type === 'result') { res.turns = ev.num_turns; res.cost = ev.total_cost_usd; res.durationMs = ev.duration_ms; res.isError = ev.is_error; }
    const blocks = ev.message?.content;
    if (!Array.isArray(blocks)) continue;
    for (const b of blocks) {
      if (b.type !== 'tool_use') continue;
      res.tools[b.name] = (res.tools[b.name] || 0) + 1;
      const s = JSON.stringify(b.input || {});
      const low = s.toLowerCase().replace(/\\\\/g, '/');
      for (const f of FORBID) if (low.includes(f)) res.forbidden.push({ tool: b.name, pattern: f, input: s.slice(0, 200) });
      if ((b.name === 'Agent' || b.name === 'Task') && b.input?.subagent_type) res.agents[b.input.subagent_type] = (res.agents[b.input.subagent_type] || 0) + 1;
      const fp = b.input?.file_path;
      if ((b.name === 'Write') && fp && SCRIPT_EXT.test(fp) && !ALLOWED_JS.test(fp)) res.writtenScripts.add(fp);
      if (b.name === 'Bash' && /(>|tee)\s*\S+\.(mjs|py|sh|ps1)\b/.test(b.input?.command || '')) res.writtenScripts.add('(bash) ' + (b.input.command || '').slice(0, 120));
    }
  }
  res.writtenScripts = [...res.writtenScripts];
  return res;
}

function reviewerStats(dir) {
  const f = path.join(dir, 'docs', 'REVIEWER.md');
  const out = { karar: [], gecmez: 0, tasteScores: [] };
  if (!fs.existsSync(f)) return out;
  const txt = fs.readFileSync(f, 'utf8');
  for (const m of txt.matchAll(KARAR)) {
    out.karar.push(m[1].toUpperCase() + ' ' + m[2] + '/8');
    out.tasteScores.push(+m[2]);
    if (/GEÇMEZ/i.test(m[1])) out.gecmez++;
  }
  return out;
}

function deliverables(dir) {
  const list = [];
  const walk = (d, depth = 0) => {
    if (!fs.existsSync(d) || depth > 3) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p, depth + 1);
      else if (/\.(mp4|mov|html)$/i.test(e.name)) list.push(path.relative(dir, p).split(path.sep).join('/'));
    }
  };
  walk(path.join(dir, 'out', 'master'));
  walk(path.join(dir, 'out', 'live'));
  return list;
}

const dirs = fs.readdirSync(ROOT, { withFileTypes: true }).filter((e) => e.isDirectory() && e.name.endsWith('-r' + ROUND)).map((e) => path.join(ROOT, e.name));
const rows = [];
for (const dir of dirs) {
  const run = fs.existsSync(path.join(dir, 'run.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'run.json'), 'utf8')) : {};
  const sum = fs.existsSync(path.join(dir, 'eval-summary.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'eval-summary.json'), 'utf8')) : null;
  const tr = await scanTranscript(path.join(dir, 'transcript.jsonl'));
  const rv = reviewerStats(dir);
  const live = fs.existsSync(path.join(dir, 'out', 'probe', 'live-qc.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'out', 'probe', 'live-qc.json'), 'utf8')) : null;
  const adhoc = [...new Set([...(sum?.adhocScripts || []).map((x) => x.path || x), ...tr.writtenScripts])];
  rows.push({
    brief: path.basename(dir).replace(/-r\d+$/, ''), dir, exit: run.exit, minutes: run.minutes, turns: tr.turns, costUsd: tr.cost,
    forbiddenAttempts: tr.forbidden.length, forbidden: tr.forbidden.slice(0, 5),
    adhocScripts: adhoc.length, adhocList: adhoc,
    reviewer: rv, gecmez: rv.gecmez, rounds: rv.karar.length,
    tasteMin: rv.tasteScores.length ? Math.min(...rv.tasteScores) : null,
    phases: sum?.phases?.map((p) => p.name) || [], openIssues: sum?.openIssues || [],
    deliverables: deliverables(dir), live: live ? { pass: live.pass, fps: live.fps, latency: live.latency, dropped: live.dropped } : null,
    agents: tr.agents, tools: tr.tools,
  });
}
const out = { root: ROOT, round: ROUND, at: new Date().toISOString(), rows };
const jo = opt('--json'); if (jo) fs.writeFileSync(jo, JSON.stringify(out, null, 1));
const md = ['| brief | süre (dk) | tur | ad-hoc betik | yasak erişim | reviewer kararları | GEÇMEZ | §0.6 en düşük | teslim |', '|---|---:|---:|---:|---:|---|---:|---:|---|',
  ...rows.map((r) => `| ${r.brief} | ${r.minutes ?? '—'} | ${r.turns ?? '—'} | ${r.adhocScripts} | ${r.forbiddenAttempts} | ${r.reviewer.karar.join(', ') || '—'} | ${r.gecmez} | ${r.tasteMin ?? '—'} | ${r.deliverables.join(', ') || (r.live ? 'live-qc ' + (r.live.pass ? '✓' : '✗') : '—')} |`)].join('\n');
const mo = opt('--md'); if (mo) fs.writeFileSync(mo, md + '\n');
console.log(md);
