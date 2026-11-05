#!/usr/bin/env node
// Gizlilik taraması — git'e girecek her dosyada marka, kişi, parite, dosya yolu, e-posta, oturum kimliği arar.
// Terim listeleri git dışıdır (HK-37: yasak olan MÜŞTERİ malzemesidir; sahibinin üslubu ve FocusFX proje adı serbest):
//   evidence/aliases.local.md "## Müşteri terimleri" bölümü (satır: - <tür>: `<regex>`) · dev/privacy-terms.local.txt (kişi, yol; <tür>TAB<regex>).
// Kullanım: node dev/privacy-scan.mjs [--json=rapor.json] [--history] [--remote=<uzak>] [--evidence=<dizin>]
//   varsayılan: `git ls-files` + izlenmeyen ama yok sayılmayan dosyalar (yani commit'e girebilecek her şey).
//   --history: ayrıca bütün commit'lerdeki her blob (geçmiş; silinmiş dosyalar dahil) aynı desenlerle taranır; ek olarak (1.4)
//     commit ÜST VERİSİ: yazar/committer adı + e-postası (izinli: GitHub noreply, anthropic.com), commit mesajları, açıklamalı etiketlerin
//     tagger kimliği + mesajı ve ref adları. Kimlik satırları için izin dosyasındaki yol deseni `git:author` / `git:committer` / `git:tagger`,
//     mesajlar için `git:msg` / `git:tag`.
//   --remote=<uzak>: (1.4) uzaktaki her ref (refs/pull/* dahil) yerel geçmişte erişilebilir bir nesneyi göstermeli; göstermiyorsa bulgu
//     (geçmiş yeniden yazıldıktan sonra GitHub PR ref'leri eski commit'leri tutar; bunlar force-push ile değişmez).
//   --evidence=<dizin>: kanıt klasörünün (git dışı) depoya sızmadığı denetlenir: ağaçta/geçmişte o dizin altında yol 0;
//     kanıt dosyalarından içeriği depodaki bir blob'la aynı olanlar listelenir (beklenen: yalnız paketin kendi şablon/çalışma zamanı kopyaları).
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
  // 1.4: genel mutlak yol (sürücü harfi + en az bir klasör; ortam değişkenli yollar %APPDATA% … sayılmaz), token ve iş/hesap kimlikleri
  ['dosya-yolu', /\b[A-Za-z]:[\\/](?!Program Files)[A-Za-z0-9_][\w .-]+[\\/][\w .-]{2,}/g],
  ['token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-(?:ant-)?[A-Za-z0-9_-]{24,}|AKIA[0-9A-Z]{16}|xox[abprs]-[A-Za-z0-9-]{10,}|hf_[A-Za-z0-9]{30,})\b/g],
  ['token', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{6,}/g],
  ['token', /\b(?:api[_-]?key|secret|access[_-]?token|auth[_-]?token|password|passwd|bearer)\b["']?\s*[:=]\s*["']?(?!<)[A-Za-z0-9_\-.]{16,}/gi],
  ['iş-kimliği', /\b(?:job|generation|request|task|workspace|account|user)[_-]?id\b["']?\s*[:=]\s*["']?(?!<)[A-Za-z0-9-]{8,}/gi],
];
const termFile = path.join(root, 'dev', 'privacy-terms.local.txt');
const terms = fs.existsSync(termFile)
  ? fs.readFileSync(termFile, 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
      .map(l => { const [kind, re] = l.includes('\t') ? l.split('\t') : ['terim', l]; return [kind, new RegExp(re, 'gi')]; })
  : [];
{ const alias = path.join(root, 'evidence', 'aliases.local.md');   // müşteri terimleri (HK-37)
  if (fs.existsSync(alias)) { const t = fs.readFileSync(alias, 'utf8'), i = t.search(/^## Müşteri terimleri/m);
    if (i >= 0) for (const l of t.slice(i).split('\n').slice(1)) { if (/^## /.test(l)) break; const m = /^-\s*([^:`]+):\s*`([^`]+)`/.exec(l.trim()); if (m) terms.push([m[1].trim(), new RegExp(m[2], 'gi')]); } } }
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

// --- geçmiş: bütün commit'lerdeki tekil blob'lar ---
const git = (a, o = {}) => execFileSync('git', a, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28, ...o });
let historyInfo = null, blobPaths = null;
function historyBlobs() {
  if (blobPaths) return blobPaths;
  blobPaths = new Map();   // sha → Set(yol)
  for (const l of git(['rev-list', '--all', '--objects']).split('\n')) {
    const i = l.indexOf(' '); if (i < 0) continue;
    const sha = l.slice(0, i), p = l.slice(i + 1);
    if (!blobPaths.has(sha)) blobPaths.set(sha, new Set()); blobPaths.get(sha).add(p);
  }
  const types = git(['cat-file', '--batch-check'], { input: [...blobPaths.keys()].join('\n') + '\n' }).split('\n');
  for (const t of types) { const [sha, type] = t.split(' '); if (type !== 'blob') blobPaths.delete(sha); }
  return blobPaths;
}
if (args.includes('--history')) {
  const blobs = historyBlobs(), current = new Set(files);
  let scannedBlobs = 0;
  for (const [sha, paths] of blobs) {
    const f = [...paths][0];
    if (skipExt.test(f)) { for (const p of paths) if (!current.has(p)) findings.push({ file: 'geçmiş:' + p, line: 0, kind: 'ikili-dosya', match: sha.slice(0, 10) }); continue; }
    const txt = git(['cat-file', '-p', sha]); scannedBlobs++;
    const lines = txt.split('\n');
    for (const [kind, re] of [...builtin, ...terms]) lines.forEach((line, i) => {
      re.lastIndex = 0;
      for (const m of line.matchAll(re)) {
        if ([...paths].every((p) => allow.some(a => a.file.test(p) && a.re.test(m[0])))) continue;
        const key = [...paths].join('|') + ':' + (i + 1) + ':' + m[0];
        if (findings.some((x) => x.key === key)) continue;
        findings.push({ key, file: 'geçmiş:' + [...paths].join(','), line: i + 1, kind, match: m[0].slice(0, 80) });
      }
    });
  }
  // 1.4: commit/etiket üst verisi (kimlik, mesaj) ve ref adları
  const okMail = /@(?:users\.noreply\.github\.com|anthropic\.com)$/i;
  const scanText = (label, text, pseudo) => text.split('\n').forEach((line, i) => {
    for (const [kind, re] of [...builtin, ...terms]) { re.lastIndex = 0;
      for (const m of line.matchAll(re)) { if (allow.some(a => a.file.test(pseudo) && a.re.test(m[0]))) continue;
        findings.push({ key: label + ':' + (i + 1) + ':' + m[0], file: label, line: i + 1, kind, match: m[0].slice(0, 80) }); } }
  });
  const ident = (label, role, name, mail) => {
    if (mail && !okMail.test(mail)) findings.push({ key: label + ':' + role + ':' + mail, file: label, line: 0, kind: 'yazar-e-posta', match: role + ' <' + mail + '>' });
    scanText(label + ' ' + role, name, 'git:' + role);
  };
  const recs = git(['log', '--all', '--format=%H%x1f%an%x1f%ae%x1f%cn%x1f%ce%x1f%B%x1e']).split('\x1e').map((r) => r.replace(/^\n/, '')).filter(Boolean);
  for (const r of recs) { const [sha, an, ae, cn, ce, body] = r.split('\x1f'); const label = 'commit:' + sha.slice(0, 10);
    ident(label, 'author', an, ae); ident(label, 'committer', cn, ce); scanText(label + ' mesaj', body || '', 'git:msg'); }
  const tagRecs = git(['for-each-ref', 'refs/tags', '--format=%(refname:short)%1f%(objecttype)%1f%(taggername)%1f%(taggeremail)%1f%(contents)%1e']).split('\x1e').map((r) => r.replace(/^\n/, '')).filter(Boolean);
  let annotated = 0;
  for (const r of tagRecs) { const [name, type, tn, te, body] = r.split('\x1f'); if (type !== 'tag') continue; annotated++; const label = 'etiket:' + name;
    ident(label, 'tagger', tn, (te || '').replace(/^<|>$/g, '')); scanText(label + ' mesaj', body || '', 'git:tag'); }
  const refNames = git(['for-each-ref', '--format=%(refname)']).split('\n').filter(Boolean);
  for (const n of refNames) scanText('ref', n, 'git:ref');
  const commits = git(['rev-list', '--all', '--count']).trim();
  historyInfo = { commits: +commits, blobs: blobs.size, scannedTextBlobs: scannedBlobs, commitMeta: recs.length, annotatedTags: annotated, refs: refNames.length };
  // ağaçtaki bulgu geçmişte de görünür (son commit) → yalnız ağaçta olmayanları geçmiş bulgusu say
  for (let k = findings.length - 1; k >= 0; k--) { const x = findings[k]; if (x.key && x.file.startsWith('geçmiş:') && findings.some((y) => !y.key && x.file.split(':')[1].split(',').includes(y.file) && y.line === x.line && y.match === x.match.slice(0, 80))) findings.splice(k, 1); }
}
// --- 1.4: uzak ref'ler (refs/pull/* dahil) yerel geçmişte erişilebilir nesneyi göstermeli ---
let remoteInfo = null;
const remArg = args.find(a => a.startsWith('--remote='))?.slice(9);
if (remArg) {
  const reach = new Set(git(['rev-list', '--all']).split('\n').filter(Boolean));
  const tagObjs = new Set(git(['for-each-ref', 'refs/tags', '--format=%(objectname)']).split('\n').filter(Boolean));
  const lines = git(['ls-remote', remArg]).split('\n').filter(Boolean).map((l) => l.split('\t'));
  let stale = 0;
  for (const [sha, ref] of lines) {
    if (reach.has(sha) || tagObjs.has(sha)) continue;
    stale++; findings.push({ file: 'uzak:' + remArg, line: 0, kind: 'uzak-eski-nesne', match: ref + ' → ' + sha.slice(0, 10) + ' (yerel geçmişte yok)' });
  }
  remoteInfo = { remote: remArg, refs: lines.length, stale };
}
// --- kanıt klasörü sızıntı denetimi ---
let evidenceInfo = null;
const evArg = args.find(a => a.startsWith('--evidence='))?.slice(11);
if (evArg) {
  const evRel = path.relative(root, path.resolve(root, evArg)).split(path.sep).join('/');
  const inTree = files.filter((f) => f === evRel || f.startsWith(evRel + '/'));
  const inHistory = git(['log', '--all', '--name-only', '--format=', '--', evRel]).split('\n').filter(Boolean);
  const blobs = historyBlobs(), same = [];
  let n = 0;
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.isFile()) { n++; const sha = git(['hash-object', '--no-filters', p]).trim(); if (blobs.has(sha)) same.push({ evidence: path.relative(root, p).split(path.sep).join('/'), repo: [...blobs.get(sha)] }); } } };
  walk(path.resolve(root, evArg));
  const pkgRe = /^(templates|render|skills|commands|agents|examples|evals\/briefs)\/|^START\.md$/;   // eval projesine paketten kopyalanan dosyalar
  const nonPackage = same.filter((x) => !x.repo.some((r) => pkgRe.test(r)));
  evidenceInfo = { dir: evRel, files: n, trackedInTree: inTree.length, pathsInHistory: inHistory.length, sameContentAsRepoBlob: same.length, sameContentNonPackage: nonPackage.length, nonPackage: nonPackage.slice(0, 20) };
  for (const f of inTree) findings.push({ file: f, line: 0, kind: 'kanıt-sızıntısı', match: 'kanıt dosyası ağaçta' });
  for (const f of inHistory) findings.push({ file: 'geçmiş:' + f, line: 0, kind: 'kanıt-sızıntısı', match: 'kanıt dosyası geçmişte' });
  for (const x of nonPackage) findings.push({ file: x.evidence, line: 0, kind: 'kanıt-sızıntısı', match: 'içerik depoda: ' + x.repo.join(',') });
}

const byKind = findings.reduce((o, x) => (o[x.kind] = (o[x.kind] || 0) + 1, o), {});
const report = { scanned: files.length, terms: terms.length, history: historyInfo, remote: remoteInfo, evidence: evidenceInfo, findings: findings.length, byKind, items: findings.map(({ key, ...x }) => x) };
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(report, null, 1));
console.log(`gizlilik taraması: ${files.length} dosya · ${terms.length} yerel terim · bulgu ${findings.length}` +
  (findings.length ? '  ' + JSON.stringify(byKind) : ''));
if (historyInfo) console.log(`  geçmiş: ${historyInfo.commits} commit · ${historyInfo.blobs} tekil blob · ${historyInfo.scannedTextBlobs} metin blob tarandı · üst veri: ${historyInfo.commitMeta} commit (yazar/committer/mesaj) · ${historyInfo.annotatedTags} açıklamalı etiket · ${historyInfo.refs} ref`);
if (remoteInfo) console.log(`  uzak (${remoteInfo.remote}): ${remoteInfo.refs} ref · yerel geçmişte olmayan nesneyi gösteren ${remoteInfo.stale}`);
if (evidenceInfo) console.log(`  kanıt (${evidenceInfo.dir}): ${evidenceInfo.files} dosya · ağaçta ${evidenceInfo.trackedInTree} · geçmişte ${evidenceInfo.pathsInHistory} · depo blob'uyla aynı içerik ${evidenceInfo.sameContentAsRepoBlob} (paket dışı ${evidenceInfo.sameContentNonPackage})`);
for (const x of findings.slice(0, 40)) console.log(`  ${x.file}:${x.line}  [${x.kind}]  ${x.match}`);
process.exit(findings.length ? 1 : 0);
