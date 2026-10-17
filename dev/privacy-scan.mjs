#!/usr/bin/env node
// Gizlilik taraması — git'e girecek her dosyada marka, kişi, parite, dosya yolu, e-posta, oturum kimliği arar.
// Terim listesi git dışıdır: dev/privacy-terms.local.txt (satır başına bir düzenli ifade, # yorum).
// Kullanım: node dev/privacy-scan.mjs [--all] [--json=rapor.json]
//   varsayılan: `git ls-files` + izlenmeyen ama yok sayılmayan dosyalar (yani commit'e girebilecek her şey).
// Çıkış: bulgu 0 → 0, aksi 1.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const jsonOut = args.find(a => a.startsWith('--json='))?.slice(7);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' })
  .split('\n').filter(Boolean);

const builtin = [
  ['dosya-yolu', /\b[A-Za-z]:[\\/](?:Users|Edit|AppData)[\\/][^\s"'`)<]*/g],
  ['dosya-yolu', /\/(?:Users|home)\/(?!<)[A-Za-z0-9._-]+\//g],
  ['dosya-yolu', /\bAppData[\\/](?:Local|Roaming)\b/g],
  ['e-posta', /\b[A-Za-z0-9._%+-]+@(?!example\.|anthropic\.com|users\.noreply)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g],
  ['parite', /\b(?:EUR|USD|GBP|JPY|CHF|AUD|NZD|CAD|TRY|XAU|XAG|BTC|ETH)\s?[/-]?\s?(?:USD|EUR|JPY|GBP|CHF|CAD|AUD|NZD|TRY|USDT)\b/g],
  ['oturum-kimliği', /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g],
];
const termFile = path.join(root, 'dev', 'privacy-terms.local.txt');
const terms = fs.existsSync(termFile)
  ? fs.readFileSync(termFile, 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
      .map(l => { const [kind, re] = l.includes('\t') ? l.split('\t') : ['terim', l]; return [kind, new RegExp(re, 'gi')]; })
  : [];
// İzinli istisnalar: dosya yolu deseni → kalıp (ör. README'deki depo sahibi).
const allowFile = path.join(root, 'dev', 'privacy-allow.local.txt');
const allow = fs.existsSync(allowFile)
  ? fs.readFileSync(allowFile, 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
      .map(l => { const [glob, re] = l.split('\t'); return { file: new RegExp(glob), re: new RegExp(re, 'i') }; })
  : [];

const skipExt = /\.(png|jpe?g|webp|gif|mp4|mov|webm|wav|mp3|woff2?|ttf|otf|ico|zip|gz)$/i;
const findings = [];
for (const f of files) {
  if (skipExt.test(f)) { findings.push(...binaryCheck(f)); continue; }
  let txt;
  try { txt = fs.readFileSync(path.join(root, f), 'utf8'); } catch { continue; }
  const lines = txt.split('\n');
  for (const [kind, re] of [...builtin, ...terms]) {
    lines.forEach((line, i) => {
      re.lastIndex = 0;
      for (const m of line.matchAll(re)) {
        if (allow.some(a => a.file.test(f) && a.re.test(m[0]))) continue;
        findings.push({ file: f, line: i + 1, kind, match: m[0].slice(0, 80) });
      }
    });
  }
}
// İkili dosyalarda yalnız dosya adı taranır (içerik: görsel/ses pakete girmemeli — ayrıca listelenir).
function binaryCheck(f) {
  const out = [{ file: f, line: 0, kind: 'ikili-dosya', match: 'gözden geçir: medya dosyası commit\'e giriyor' }];
  for (const [kind, re] of terms) { re.lastIndex = 0; if (re.test(f)) out.push({ file: f, line: 0, kind, match: path.basename(f) }); }
  return out;
}

const byKind = findings.reduce((o, x) => (o[x.kind] = (o[x.kind] || 0) + 1, o), {});
const report = { scanned: files.length, terms: terms.length, findings: findings.length, byKind, items: findings };
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(report, null, 1));
console.log(`gizlilik taraması: ${files.length} dosya · ${terms.length} yerel terim · bulgu ${findings.length}` +
  (findings.length ? '  ' + JSON.stringify(byKind) : ''));
for (const x of findings.slice(0, 40)) console.log(`  ${x.file}:${x.line}  [${x.kind}]  ${x.match}`);
process.exit(findings.length ? 1 : 0);
