// motion-render frame-check — manifest bildirimli tek denetleyici (CONTRACT §2 checks/hooks, §5 kancalar, §6 CLI; A3 §3).
//
//   motion-render frame-check <id> [--only t1,t2|ad] [--frames-dir D] [--mp4 auto|yol] [--cand aday.json] [--sheet] [--json]
//                                  [--set K=V …] [--checks dosya.json] [--out yol.json] [--list]
//
// Bildirim: scenes.json sahne `checks: [...]` + checks/<id>.json (dizi ya da { hooks, set, checks }) birleşir. Kancalar: sahne `hooks`
// + checks dosyasının `hooks`u; sahne modülleri yüklendikten sonra sayfaya enjekte edilir. Her kontrol: { type, name?, severity?, … }.
// Katmanlar: piksel/zaman (13: kare dizini ya da mp4) · tasarım zamanı izdüşüm (4: render yok, sayfa kancaları) · ses/tipografi (3).
// Çıktı: out/probe/<id>-fc.json (+ --sheet / "evidence": true → out/probe/fc/<id>-<ad>.png kanıt sayfaları). --only koşusu (1.4): --out yoksa
// out/probe/<id>-fc-only-<t1+t2>.json (tam kaydın üstüne yazmaz). Yazım .part → rename.
// Durum: pass · fail (önem: error|warn|info) · warn (ölçülemedi / incelendi) · skip. Çıkış 3 = error düzeyinde ihlal (qc ile aynı).
// --cand aday.json: [{ name, set: {GLOBAL: değer} }] (ya da { ad: {GLOBAL: değer} }) — her aday için tasarım kontrolleri ayrı sayfada
// koşar, sonuçlar `candidates` altında karşılaştırılır (kamera adayı arama).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { ROOT, OUT, FPS, sceneById, readTimeline, sceneChecks, latestMp4, rel } from '../lib/project.mjs';
import { worldFor } from '../lib/qc-common.mjs';
import { withPage, chromiumArgs } from '../lib/page.mjs';
import { worldDefaults, unmeasured, result, setStep } from '../lib/fc/common.mjs';
import { TYPES } from '../lib/fc/index.mjs';
import { evidenceSheet } from '../lib/fc/sheet.mjs';

const argv = process.argv.slice(2);
const VALUED = new Set(['--only', '--frames-dir', '--mp4', '--cand', '--set', '--checks', '--out', '--step']);
const argOf = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const has = (k) => argv.includes(k);
const pos = argv.filter((a, i) => !a.startsWith('--') && !VALUED.has(argv[i - 1]));
if (has('--list')) { console.log(Object.entries(TYPES).map(([k, v]) => k + ' (' + v.layer + ')').join('\n')); process.exit(0); }
if (pos.length !== 1) {
  console.error('kullanım: motion-render frame-check <id> [--only t1,t2] [--frames-dir D] [--mp4 auto|yol] [--cand aday.json] [--sheet] [--json] [--set K=V] [--checks f.json] [--list]');
  process.exit(2);
}
const id = pos[0];
const JSON_OUT = has('--json');
const say = (s) => { if (!JSON_OUT) console.log(s); };

let scene;
try { scene = sceneById(id); } catch (e) { console.error(e.message); process.exit(2); }

// --set K=V (sayfa global'leri; değer JSON ise sayı/bool) — probe ile aynı
const globals = {};
argv.forEach((a, i) => { if (a !== '--set') return; const [k, ...v] = String(argv[i + 1]).split('='); try { globals[k] = JSON.parse(v.join('=')); } catch { globals[k] = v.join('='); } });

// bildirim: sahne checks + checks/<id>.json (+ --checks dosyası yerine geçer)
function readDecl(file) {
  const x = JSON.parse(fs.readFileSync(file, 'utf8'));
  return Array.isArray(x) ? { checks: x, hooks: [], set: {} } : { checks: x.checks || [], hooks: x.hooks || [], set: x.set || {} };
}
let checks, hooks = [...(scene.hooks || [])], declSet = {};
if (argOf('--checks')) { const d = readDecl(path.resolve(argOf('--checks'))); checks = d.checks; hooks.push(...d.hooks); declSet = d.set; }
else {
  checks = sceneChecks(scene);
  const f = path.join(ROOT, 'checks', scene.id + '.json');
  if (fs.existsSync(f)) { const d = readDecl(f); hooks.push(...d.hooks); declSet = d.set; }
}
hooks = [...new Set(hooks)];
checks = checks.map((c, i) => Object.assign({}, c, { __i: i }));
const only = argOf('--only') ? argOf('--only').split(',').map((s) => s.trim()).filter(Boolean) : null;
function onlySlug(list) { const s = list.join('+').replace(/[^A-Za-z0-9._+-]+/g, '_').slice(0, 80); return s || 'secim'; }
if (only) checks = checks.filter((c) => only.includes(c.type) || (c.name && only.includes(c.name)));

const tl = readTimeline(scene.file);
const W = worldDefaults(worldFor(scene));
const mp4Arg = argOf('--mp4');
// --step N: animatik kareleri (render --step N) — piksel/ses tipleri etkin hız fps/N'de; tasarım tipleri (render'sız) tam hızda ayrıca koşulur.
const STEP = Math.max(1, Math.round(+argOf('--step') || 1));
if (STEP > 1) setStep(STEP);
const ctx = {
  scene, W, fps: FPS / STEP, frames: Math.ceil(tl.frames / STEP), tl, step: STEP,
  framesDir: argOf('--frames-dir') ? path.resolve(argOf('--frames-dir')) : null,
  mp4: mp4Arg === 'auto' ? latestMp4(scene.id) : mp4Arg ? path.resolve(ROOT, mp4Arg) : null,
  probeDir: path.join(OUT, 'probe'), pageData: {}, hooks: { declared: hooks, loaded: [], missing: [] }, sheet: has('--sheet'),
  // uzun tipler (onset A/B) ilerleme satırını stderr'e yazar (stdout --json için temiz kalır)
  progress: (s) => process.stderr.write(s + '\n'),
};

const results = [];
const t0 = Date.now();
const bad = checks.filter((c) => !TYPES[c.type]);
bad.forEach((c) => results.push(result(c, 'skip', 'bilinmeyen tip: ' + c.type)));
const valid = checks.filter((c) => TYPES[c.type] && !(STEP > 1 && TYPES[c.type].layer === 'design'));
if (STEP > 1) checks.filter((c) => TYPES[c.type] && TYPES[c.type].layer === 'design')
  .forEach((c) => results.push(result(c, 'skip', "tasarım tipi --step ile koşulmaz (render'sız; tam kare hızında: frame-check " + scene.id + ' --only ' + c.type + ')')));
const pageChecks = valid.filter((c) => TYPES[c.type].page === true || (typeof TYPES[c.type].page === 'function' && TYPES[c.type].page(c, ctx)));

// ── sayfa aşaması: tasarım kontrolleri + piksel/ses kontrollerinin kanca verisi (prefetch) ──
let browser = null;
async function pagePhase(set, list, sink, label) {
  await withPage(scene, { globals: Object.assign({}, declSet, set), browser }, async (page, api) => {
    const inj = await api.inject(hooks);
    if (label == null) { ctx.hooks.loaded = inj.loaded; ctx.hooks.missing = inj.missing; ctx.hooks.errors = inj.errors; }
    for (const c of list) {
      const T = TYPES[c.type];
      try {
        if (T.layer === 'design' || T.pageRun) sink.push(await (T.pageRun || T.run)(c, ctx, api));
        else if (T.prefetch) ctx.pageData[c.__i] = await T.prefetch(c, ctx, api);
      } catch (e) { sink.push(unmeasured(c, 'sayfa hatası: ' + e.message.split('\n')[0])); }
    }
  });
}
ctx.globals = Object.assign({}, declSet, globals);   // ek sayfa açan tipler (onset A/B) aynı globallerle başlar
if (pageChecks.length) {
  browser = ctx.browser = await chromium.launch({ args: chromiumArgs([scene]) });
  try {
    await pagePhase(globals, pageChecks, results, null);
  } catch (e) {
    pageChecks.filter((c) => TYPES[c.type].layer === 'design').forEach((c) => results.push(unmeasured(c, 'sayfa açılamadı: ' + e.message.split('\n')[0])));
  }
}

// ── adaylar (--cand): tasarım kontrolleri aday başına ──
let candidates = null;
if (argOf('--cand')) {
  const raw = JSON.parse(fs.readFileSync(path.resolve(argOf('--cand')), 'utf8'));
  const list = Array.isArray(raw) ? raw : Object.entries(raw).map(([name, set]) => ({ name, set }));
  const design = valid.filter((c) => TYPES[c.type].layer === 'design');
  candidates = [];
  if (!browser) browser = await chromium.launch({ args: chromiumArgs([scene]) });
  for (const cand of list) {
    const sink = [];
    try { await pagePhase(Object.assign({}, globals, cand.set || {}), design, sink, cand.name); }
    catch (e) { sink.push({ type: 'aday', status: 'warn', summary: 'sayfa açılamadı: ' + e.message.split('\n')[0] }); }
    candidates.push({ name: cand.name, set: cand.set, checks: sink.map((r) => ({ name: r.name, type: r.type, status: r.status, summary: r.summary, metrics: r.metrics })) });
    say('  aday ' + cand.name + ': ' + sink.map((r) => (r.status === 'pass' ? '✓ ' : r.status === 'fail' ? '✗ ' : '⚠ ') + r.name + ' · ' + r.summary).join(' | '));
  }
}
if (browser) await browser.close();

// ── piksel / ses aşaması ──
for (const c of valid) {
  const T = TYPES[c.type];
  if (T.layer === 'design' || T.pageRun) continue;
  try { results.push(await T.run(c, ctx, ctx.pageData[c.__i])); }
  catch (e) { results.push(unmeasured(c, 'hata: ' + e.message.split('\n')[0])); }
}
results.sort((a, b) => a.i - b.i);

// ── kanıt sayfaları ──
for (const r of results) {
  const c = checks.find((x) => x.__i === r.i);
  if (!c || !(ctx.sheet || c.evidence)) continue;
  try { const f = await evidenceSheet(c, r, ctx); if (f) r.evidence = rel(f); } catch (e) { r.evidenceError = e.message.split('\n')[0]; }
}

// ── rapor ──
const count = (p) => results.filter(p).length;
const errors = results.filter((r) => r.status === 'fail' && r.severity === 'error');
const summary = { checks: results.length, pass: count((r) => r.status === 'pass'), fail: count((r) => r.status === 'fail'), warn: count((r) => r.status === 'warn'),
  skip: count((r) => r.status === 'skip'), errors: errors.length, unmeasured: count((r) => r.unmeasured) };
const report = {
  id: scene.id, tool: 'frame-check', at: new Date().toISOString(), seconds: +((Date.now() - t0) / 1000).toFixed(1),
  fps: FPS, frames: tl.frames, set: Object.assign({}, declSet, globals), hooks: ctx.hooks,
  sources: { framesDir: ctx.framesDir ? rel(ctx.framesDir) : null, mp4: ctx.mp4 ? rel(ctx.mp4) : null },
  summary, checks: results, candidates: candidates || undefined, exit: errors.length ? 3 : 0,
};
// --only koşusu tam kaydın (<id>-fc.json) üstüne yazmaz (1.4, PN-131): --out yoksa <id>-fc-only-<süzgeç>.json
const outFile = argOf('--out') ? path.resolve(argOf('--out')) : path.join(OUT, 'probe', scene.id + (only ? '-fc-only-' + onlySlug(only) : '-fc') + '.json');
if (only) report.only = only;
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile + '.part', JSON.stringify(report, null, 1)); fs.renameSync(outFile + '.part', outFile);

if (JSON_OUT) process.stdout.write(JSON.stringify(report, null, 1) + '\n');
else {
  const mark = (r) => (r.status === 'pass' ? '✓' : r.status === 'fail' ? (r.severity === 'error' ? '✗' : r.severity === 'warn' ? '⚠' : '·') : r.status === 'skip' ? '–' : '⚠');
  for (const r of results) {
    say(mark(r) + ' ' + r.name + (r.status === 'fail' ? ' [' + r.severity + ']' : '') + ' · ' + r.summary + (r.evidence ? ' · kanıt ' + r.evidence : ''));
    if (r.status === 'fail') r.violations.slice(0, 3).forEach((v) => say('    ' + JSON.stringify(v).slice(0, 220)));
  }
  if (ctx.hooks.missing && ctx.hooks.missing.length) say('⚠ kanca dosyası yok: ' + ctx.hooks.missing.join(', '));
  say((errors.length ? '✗ ' : '✓ ') + scene.id + ' frame-check · ' + summary.pass + ' geçti · ' + summary.fail + ' ihlal (' + summary.errors + ' hata) · ' + summary.warn + ' uyarı · '
    + report.seconds + ' s → ' + rel(outFile));
}
process.exitCode = errors.length ? 3 : 0;
