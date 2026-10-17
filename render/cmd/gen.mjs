// motion-render gen — üretken varlık YOL A (Higgsfield CLI) + bütçe bekçisi. Sonra: motion-render ingest.
//   motion-render gen <istek> [--only id1,id2] [--use model] [--param k=v …] [--acil] [--cap N] [--dry [--online-cost]]
//       assets/gen/requests/<istek>.json → assets/gen/inbox/<id>.<uzantı> + <id>.json (yan dosya) · koşu kaydı assets/gen/runs/<istek>-<zaman>.json
//   motion-render gen upscale <kaynak…> [--model bytedance_image_upscale] [--resolution 2k] [--cap 10] [--pad üst,alt] [--task ad] [--dry [--online-cost]]
//       görüntü büyütme (ör. logo JPG'si → vektörleştirme kaynağı; kabul: motion-render logo up)
//   motion-render gen req <istek> --refs a.png[,b.png] [--model nano_banana_2] [--param k=v …] [--prompt "…" | --prompt-file f] [--type plate]
//       [--budget 2] [--accept "…"] [--id-prefix g-rs-] [--task-cap 40] [--rules "…"]   referans kareli istek dosyası (restyle vb.) yazar/günceller
// Bütçe bekçisi (politika assets/gen/policy.json; project.md ```json policy``` bloğu eksikleri tamamlar):
//   1. beyaz liste: modelin CLI karşılığı yoksa ya da kara listedeyse REDDET; 2. öğe başına maliyet tahmini; toplam (harcanan + tahmin) görev tavanını
//   (--cap ‖ policy.taskCap) ya da film bütçesini (policy.filmBudget − Σ ledger.diff) aşacaksa DUR; 3. `account status` önce → `generate create … --wait`
//   → `account status` sonra; gerçek kesinti = önce − sonra; 4. sapma (|gerçek − tahmin| / tahmin > policy.deviationStop ‖ 0.1) → batch DURUR;
//   5. kural 8: sınırsız pencere modelleri (policy.unlimWindow) toplu batch'te (> 1 öğe) REDDEDİLİR (policy.rule8Suspended ya da --acil hariç) → YOL B;
//   6. referans: öğede refs: [yol] → --image-references, start: yol → --start-image.
// İndirilen her dosya doğrulanır (imza ↔ uzantı, çözülebilirlik, boyut, sha256, piksel boyutu ↔ iş parametresi); doğrulanmayan inbox/_rejected/'e gider.
// Kredi kesilip çıktı gelmeyen öğe koşu kaydında lost[] olur (ingest --from-run ledger'a taşır; iade durumu `ingest refund`).
// --dry ağsızdır: tahmin politikadan (whitelist[model].credits ‖ .estimate ‖ prices[model]); --online-cost ile `generate cost` (kredi harcamaz) sorulur.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ROOT } from '../lib/project.mjs';
import { hf, hfBin, q, balance, costOnline, loadPolicy, offlineCost, download, stamp, writeJson } from '../lib/gen-hf.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; }, has = (k) => args.includes('--' + k);
const VALUED = new Set(['--only', '--use', '--param', '--cap', '--model', '--resolution', '--pad', '--task', '--refs', '--prompt', '--prompt-file', '--type', '--budget', '--accept', '--id-prefix', '--task-cap', '--rules', '--role']);
const pos = args.filter((a, i) => !a.startsWith('--') && !VALUED.has(args[i - 1]));
const G = path.join(ROOT, 'assets', 'gen'), INBOX = path.join(G, 'inbox'), rel = (f) => path.relative(ROOT, f).split(path.sep).join('/');
const slug = (s) => path.basename(String(s)).replace(/\.[^.]+$/, '').toLowerCase().normalize('NFKD').replace(/[^\x00-\x7f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const PARAM = {}; args.forEach((a, i) => { if (a === '--param' && args[i + 1]) { const [k, ...v] = args[i + 1].split('='); PARAM[k] = v.join('='); } });
const DRY = has('dry'), ONLINE = !DRY || has('online-cost');
if (process.platform === 'win32') for (const v of [opt('prompt', ''), ...Object.values(PARAM)]) if (String(v).includes('%')) console.log('! "%" içeren değer: Windows kabuğu (cmd) %AD% kalıplarını genişletebilir');

// ---------------------------------------------------------------- gen req
if (pos[0] === 'req') {
  const name = pos[1], refs = (opt('refs', '') || '').split(',').filter(Boolean);
  if (!name || !refs.length) { console.error('kullanım: motion-render gen req <istek> --refs a.png[,b.png] [--model m] [--prompt "…" | --prompt-file f] [--param k=v]'); process.exit(2); }
  const prompt = opt('prompt-file', null) ? fs.readFileSync(path.resolve(ROOT, opt('prompt-file')), 'utf8').trim() : opt('prompt', null);
  if (!prompt) { console.error('istem yok (--prompt ya da --prompt-file)'); process.exit(2); }
  const F = path.join(G, 'requests', name + '.json');
  const J = fs.existsSync(F) ? JSON.parse(fs.readFileSync(F, 'utf8')) : { scene: name, path: 'YOL A, motion-render gen ' + name, taskCap: +opt('task-cap', 40), rules: opt('rules', 'Referans = motorun metinsiz anahtar karesi; metin her zaman motorda.'), items: [] };
  let n = 0;
  for (const r of refs) {
    if (!fs.existsSync(path.resolve(ROOT, r))) { console.log('referans yok: ' + r); continue; }
    const id = opt('id-prefix', 'g-' + slug(name) + '-') + slug(r);
    J.items = J.items.filter((x) => x.id !== id);
    J.items.push({ id, type: opt('type', 'plate'), role: opt('role', 'referans karesinden üretim (' + path.basename(r) + ')'), model: opt('model', 'nano_banana_2'),
      params: Object.keys(PARAM).length ? PARAM : { resolution: '2k', aspect_ratio: '16:9' }, refs: [rel(path.resolve(ROOT, r))], budget: opt('budget', null) != null ? +opt('budget') : null,
      accept: opt('accept', 'geometri ve kompozisyon referansla hizalı; metin/rakam yok'), prompt });
    n++;
  }
  writeJson(F, J); console.log('✓ ' + rel(F) + ' · ' + n + ' öğe eklendi/güncellendi · toplam ' + J.items.length);
  process.exit(0);
}

const { pol: POL, warn: PW, exists: POLX } = loadPolicy(ROOT);
PW.forEach((w) => console.log('! ' + w));
const banned = (s) => (POL.blacklist || []).some((b) => String(s).toLowerCase().includes(String(b).toLowerCase()));
let MAN = { ledger: [] }; try { MAN = JSON.parse(fs.readFileSync(path.join(G, 'manifest.json'), 'utf8')); } catch { /* manifest yok */ }
const filmSpent = (MAN.ledger || []).reduce((a, L) => a + (L.diff || 0), 0), filmLeft = POL.filmBudget != null ? +(POL.filmBudget - filmSpent).toFixed(3) : Infinity;
const DEV = POL.deviationStop || 0.1;
console.log('higgsfield: ' + hfBin() + (DRY ? ' (dry: ' + (ONLINE ? 'tahmin CLI\'den, üretim yok' : 'ağsız, tahmin politikadan') + ')' : ''));

// ---------------------------------------------------------------- gen upscale
if (pos[0] === 'upscale') {
  const srcs = pos.slice(1);
  if (!srcs.length) { console.error('kullanım: motion-render gen upscale <kaynak…> [--model bytedance_image_upscale] [--resolution 2k] [--cap 10] [--pad üst,alt] [--dry]'); process.exit(2); }
  const MODEL = opt('model', 'bytedance_image_upscale'), RES = opt('resolution', '2k'), CAP = +opt('cap', 10), TASK = opt('task', 'upscale'), PAD = opt('pad', null) ? opt('pad').split(',').map(Number) : null;
  const CLI = (POL.whitelist[MODEL] && POL.whitelist[MODEL].cli) || MODEL;   // politika anahtarı → CLI model adı
  if (banned(MODEL) || banned(CLI) || banned(RES)) { console.error('REDDEDİLDİ: kara liste (' + MODEL + ' ' + RES + ')'); process.exit(1); }
  const items = [];
  for (const s of srcs) {
    const abs = path.resolve(ROOT, s); if (!fs.existsSync(abs)) { console.error('kaynak yok: ' + s); process.exit(1); }
    let src = abs, id = 'g-' + slug(s) + '-up' + RES;
    if (PAD) {   // aşırı en-boy oranlı görüntüde iş 'failed' olabiliyor → beyaz pay (üst, alt); çıktı vektörleştirmede geri kırpılır (logos.json up.pad)
      const m = await sharp(abs).metadata(); src = path.join(ROOT, 'out', 'probe', 'gen', slug(s) + '-pad.png'); fs.mkdirSync(path.dirname(src), { recursive: true });
      await sharp(abs).flatten({ background: '#ffffff' }).extend({ top: PAD[0], bottom: PAD[1], left: 0, right: 0, background: '#ffffff' }).png().toFile(src);
      id = 'g-' + slug(s) + '-pad-up' + RES; console.log('pay ' + m.width + '×' + m.height + ' → ' + m.width + '×' + (m.height + PAD[0] + PAD[1]) + ' · ' + rel(src));
    }
    items.push({ id, src, srcRel: rel(src) });
  }
  const REQ = path.join(G, 'requests', TASK + '.json');
  if (!fs.existsSync(REQ) && !DRY) writeJson(REQ, { scene: TASK, note: 'görüntü büyütme — yalnız biçim koruma kabulü geçen çıktı kaynak olur (motion-render logo up)', items: items.map((it) => ({ id: it.id, type: 'element', model: MODEL, prompt: null, src: it.srcRel, params: { resolution: RES } })) });
  let total = 0; const rows = [];
  for (const it of items) { const est = ONLINE ? costOnline(CLI, ['--image', q(it.src), '--resolution', RES]) : offlineCost(POL, MODEL); total += est; rows.push({ id: it.id, est }); }
  console.log('tahmin ' + JSON.stringify(rows) + ' · toplam ' + total + ' / tavan ' + CAP);
  if (!(total <= CAP)) { console.log(Number.isNaN(total) ? 'DUR: maliyet bilinmiyor (politikada ' + MODEL + ' fiyatı yok; --online-cost)' : 'DUR: tahmin tavanı aşıyor'); process.exit(DRY && Number.isNaN(total) ? 0 : 2); }
  if (total > filmLeft) { console.log('DUR: film bütçesi aşılır (kalan ' + filmLeft + ')'); process.exit(2); }
  if (DRY) process.exit(0);
  const b0 = balance(), run = { task: TASK, model: MODEL, cap: CAP, balanceBefore: b0, items: [], lost: [] };
  for (const it of items) {
    const before = balance(), g = hf(['generate', 'create', CLI, '--image', q(it.src), '--resolution', RES, '--wait', '--wait-timeout', '10m', '--json'], { cwd: ROOT }), after = balance();
    let job = null; try { job = JSON.parse(g.out); job = Array.isArray(job) ? job[0] : job; } catch { /* JSON değil */ }
    const url = job && (job.result_url || (job.result && job.result.url) || (job.results && job.results[0] && job.results[0].url));
    const rec = { id: it.id, src: it.srcRel, ok: g.ok && !!url, credits: +(before - after).toFixed(2), job: (job && (job.id || job.job_id)) || null };   // iş kimliği iade talebi için
    if (rec.ok) {
      const ext = (/\.(png|jpe?g|webp)(\?|$)/i.exec(url) || [0, 'png'])[1].toLowerCase().replace('jpeg', 'jpg'), f = path.join(INBOX, it.id + '.' + ext);
      const d = await download(url, f, {});
      if (!d.ok) { rec.ok = false; rec.err = d.err; }
      else { rec.file = rel(f); rec.bytes = d.verify.bytes; rec.sha256 = d.verify.sha256; rec.w = d.verify.w; rec.h = d.verify.h;
        writeJson(path.join(INBOX, it.id + '.json'), { model: MODEL, prompt: null, seed: null, credits: rec.credits, settings: { resolution: RES, source: it.srcRel }, sha256: d.verify.sha256, bytes: d.verify.bytes, w: d.verify.w, h: d.verify.h, verified: true, verifyNotes: d.verify.notes }); }
    } else rec.err = (g.err || g.out).slice(0, 400);
    if (!rec.ok && rec.credits > 0) run.lost.push({ id: it.id, credits: rec.credits, reason: (rec.err || 'çıktı yok').slice(0, 160), refund: 'pending' });
    run.items.push(rec); console.log((rec.ok ? '✓ ' : '✗ ') + it.id + ' · ' + rec.credits + ' kredi' + (rec.file ? ' · ' + rec.file + ' (' + rec.bytes + ' B, ' + rec.w + '×' + rec.h + ')' : ' · ' + rec.err));
  }
  run.balanceAfter = balance(); run.diff = +(run.balanceBefore - run.balanceAfter).toFixed(2);
  const rf = path.join(G, 'runs', TASK + '-' + stamp() + '.json'); writeJson(rf, run);
  console.log('bakiye ' + run.balanceBefore + ' → ' + run.balanceAfter + ' (−' + run.diff + ')' + (run.lost.length ? ' · kayıp ' + run.lost.length + ' öğe' : '') + ' · ' + rel(rf) + ' → motion-render ingest --from-run ' + rel(rf));
  process.exit(0);
}

// ---------------------------------------------------------------- gen <istek>
const scene = pos[0];
if (!scene) { console.error('kullanım: motion-render gen <istek> [--only id,…] [--use model] [--param k=v] [--cap N] [--dry] · gen upscale <kaynak…> · gen req <istek> --refs …'); process.exit(2); }
if (!POLX) { console.error('politika yok: assets/gen/policy.json (project.md §9 makine kopyası)'); process.exit(1); }
const RQF = path.join(G, 'requests', scene + '.json');
if (!fs.existsSync(RQF)) { console.error('istek yok: ' + rel(RQF)); process.exit(1); }
const REQ = JSON.parse(fs.readFileSync(RQF, 'utf8'));
const only = opt('only', null) ? opt('only').split(',') : null, use = opt('use', null), ACIL = has('acil');
const CAP = opt('cap', null) != null ? +opt('cap') : POL.taskCap;
if (!(CAP > 0)) { console.error('görev tavanı yok: --cap N ya da policy.taskCap'); process.exit(2); }
const items = REQ.items.filter((it) => !only || only.includes(it.id));
const UNL = POL.unlimWindow || [], modelOf = (it) => (use && (it.model === use || it.alt === use) ? use : it.model);
const unlBlock = !POL.rule8Suspended && items.filter((it) => UNL.includes(modelOf(it))).length > 1 && !ACIL;
let spent = 0; const rows = [], lost = [], jobs = {};
const b0 = DRY && !ONLINE ? NaN : balance();
console.log('balance önce ' + (Number.isNaN(b0) ? (DRY ? '(dry, okunmadı)' : '?') : b0) + ' · tavan ' + CAP + ' · film kalan ' + filmLeft + (POL.rule8Suspended ? ' · kural 8 askıda' : '') + ' · ' + items.length + ' öğe' + (DRY ? ' (dry)' : '') + (ACIL ? ' · ACİL (kural 8 atlandı)' : '') + (Object.keys(PARAM).length ? ' · param ' + JSON.stringify(PARAM) : ''));
for (const it of items) {
  const mid = modelOf(it), W = POL.whitelist[mid];
  if (unlBlock && UNL.includes(mid)) { rows.push([it.id, mid, '—', '—', 'YOL B (kural 8): sınırsız pencere modeli toplu batch\'te uygulamadan → docs/gen/PROMPTS-' + scene + '.md']); continue; }
  if (!W || banned(W.cli) || Object.values(W.params || {}).some(banned)) { rows.push([it.id, mid, '—', '—', 'REDDEDİLDİ (beyaz liste dışı / kara liste)']); continue; }
  if (!it.prompt) { rows.push([it.id, mid, '—', '—', 'istem yok (requests prompt alanı)']); continue; }
  const P = Object.assign({}, W.params, it.params || {}, PARAM), flags = Object.entries(P).flatMap(([k, v]) => ['--' + k, q(v)]);
  if (Object.values(P).some(banned)) { rows.push([it.id, mid, '—', '—', 'REDDEDİLDİ (kara liste parametresi)']); continue; }
  let est = ONLINE ? costOnline(W.cli, ['--prompt', q(it.prompt), ...flags]) : offlineCost(POL, mid), estSrc = ONLINE ? 'CLI' : 'politika';
  if (!ONLINE && !(est >= 0) && it.budget != null) { est = +it.budget; estSrc = 'istek bütçesi'; }   // ağsız dry: son çare isteğin bütçe alanı
  if (!(est >= 0)) { rows.push([it.id, mid, '?', '—', DRY && !ONLINE ? 'maliyet bilinmiyor (dry, ağsız: whitelist.' + mid + '.credits yok; --online-cost)' : 'maliyet okunamadı']); continue; }
  if (spent + est > CAP) { rows.push([it.id, mid, est, '—', 'DURDU: tavan ' + CAP + ' aşılır (harcanan ' + spent + ')']); break; }
  if (spent + est > filmLeft) { rows.push([it.id, mid, est, '—', 'DURDU: film bütçesi ' + POL.filmBudget + ' aşılır (kalan ' + filmLeft + ', bu koşu ' + spent + ')']); break; }
  if (DRY) { rows.push([it.id, mid, est, '—', 'dry (tahmin: ' + estSrc + ')']); spent += est; continue; }
  const refs = (it.refs || []).flatMap((r) => ['--image-references', q(path.resolve(ROOT, r))]).concat(it.start ? ['--start-image', q(path.resolve(ROOT, it.start))] : []);
  const before = balance(), g = hf(['generate', 'create', W.cli, '--prompt', q(it.prompt), ...flags, ...refs, '--wait', '--wait-timeout', '15m', '--json'], { cwd: ROOT }), after = balance();
  const real = +(before - after).toFixed(3); spent += real;
  let job = null; try { job = JSON.parse(g.out)[0]; } catch { /* çıktı JSON değil */ }
  if (!job || job.status !== 'completed' || !job.result_url) { rows.push([it.id, mid, est, real, 'BAŞARISIZ: ' + (job ? job.status : (g.err || '').slice(0, 80))]); if (real > 0) lost.push({ id: it.id, credits: real, reason: 'BAŞARISIZ: ' + (job ? job.status : (g.err || '').slice(0, 120)), job: (job && job.id) || null, refund: 'pending' }); continue; }
  const ext = (job.result_url.match(/\.(png|jpe?g|webp|mp4|mov|webm)(\?|$)/i) || [, W.kind === 'video' ? 'mp4' : 'png'])[1].toLowerCase().replace('jpeg', 'jpg');
  const dst = path.join(INBOX, it.id + '.' + ext), ew = job.params && job.params.width, eh = job.params && job.params.height;
  const d = await download(job.result_url, dst, ew && eh ? { w: +ew, h: +eh } : {});
  if (!d.ok) { rows.push([it.id, mid, est, real, d.err + (d.rejected ? ' → ' + rel(d.rejected) : '')]); if (real > 0) lost.push({ id: it.id, credits: real, reason: d.err.slice(0, 160), refund: 'pending' }); continue; }
  writeJson(path.join(INBOX, it.id + '.json'), { model: mid, cliModel: W.cli, prompt: it.prompt, params: P, seed: job.params && job.params.seed != null ? job.params.seed : null,
    credits: real, costEstimate: est, w: d.verify.w, h: d.verify.h, created: job.created_at, sha256: d.verify.sha256, bytes: d.verify.bytes, duration: d.verify.duration, verified: true, verifyNotes: d.verify.notes });   // iş kimliği yalnız koşu kaydında (iade talebi için); sonuç URL'si hiç yazılmaz
  jobs[it.id] = job.id || null; rows.push([it.id, mid, est, real, 'tamam → inbox/' + path.basename(dst) + ' (' + d.verify.w + '×' + d.verify.h + (d.verify.duration ? ', ' + d.verify.duration.toFixed(2) + ' s' : '') + (d.verify.notes.length ? ' · ' + d.verify.notes.join('; ') : '') + ')']);
  if (est > 0 && Math.abs(real - est) / est > DEV) { rows.push([it.id, mid, est, real, 'DURDU: sapma > %' + Math.round(100 * DEV) + ' (tahmin ' + est + ', gerçek ' + real + ')']); break; }
}
const b1 = DRY && !ONLINE ? NaN : balance();
for (const r of rows) console.log(String(r[0]).padEnd(18) + ' ' + String(r[1]).padEnd(18) + ' tahmin ' + String(r[2]).padEnd(5) + ' gerçek ' + String(r[3]).padEnd(6) + ' ' + r[4]);
console.log('balance ' + (Number.isNaN(b0) ? '—' : b0) + ' → ' + (Number.isNaN(b1) ? '—' : b1) + (Number.isNaN(b0 - b1) ? '' : ' · fark ' + +(b0 - b1).toFixed(3)) + ' · tavan ' + CAP + (DRY ? ' · dry tahmin toplamı ' + +spent.toFixed(3) : ''));
if (!DRY) {
  const f = path.join(G, 'runs', scene + '-' + stamp() + '.json');
  writeJson(f, { scene, cap: CAP, filmLeft, balanceBefore: b0, balanceAfter: b1, diff: +(b0 - b1).toFixed(3), rows: rows.map((r) => ({ id: r[0], model: r[1], est: r[2], real: r[3], status: r[4], job: jobs[r[0]] || undefined })), lost });
  console.log('koşu kaydı ' + rel(f) + (lost.length ? ' · kayıp ' + lost.length + ' öğe (ingest --from-run)' : '') + ' → motion-render ingest --from-run ' + rel(f));
}
