// motion-render ingest — üretken varlık alımı: inbox → doğrula → conform → alfa / luma key önizleme → hash → kontak → manifest → ledger.
//   motion-render ingest [--balance-before N] [--balance-after N] [--task "<ad>"] [--from-run assets/gen/runs/<koşu>.json] [--lost id:kredi:neden …]
//                        [--status draft|final] [--plan Plus] [--dry] [--inbox assets/gen/inbox] [--out assets/gen] [--fps 30] [--label "<ad>"] [--note "<not>"]
//   motion-render ingest review <id> <kabul|ret|yedek> "<not>" [--by "<kim>"]     yalnız kabul notu (manifest elle düzenlenmez; eski --review de geçer)
//   motion-render ingest scan <id> [--step 1]                                   klip kabul kanıtı: 1 s aralıkla tam kare + hareket haritası + şerit
//   motion-render ingest lost <görev> --id <öğe> --credits N --reason "<neden>" [--refund pending]   ledger kaydına kayıp (çıktısız kesinti)
//   motion-render ingest refund <görev> <öğe> <pending|granted|denied>          kaybın iade durumu
// Dosya adı = varlık id'si (assets/gen/requests/<istek>.json). İsteğe bağlı yan dosya <id>.json: { model, prompt, seed, credits, sha256, w, h, … } (motion-render gen yazar).
// "Doğrulamadan güvenme": kaynak imza/uzantı, çözülebilirlik, yan dosya sha256 ve piksel boyutu ile karşılaştırılır (uyuşmazsa alınmaz, inbox'ta kalır);
//   kopyanın sha256'sı yeniden ölçülür; conform çıktısının boyutu / kare hızı / kare sayısı ölçülür → item.verify.
// Görüntü: kaynak korunur, conform W×H PNG (cover; W×H = scenes.json, varsayılan 1920×1080); alfa varsa damalı önizleme. SVG: conform yok (viewBox), önizleme.
// Video: --fps (varsayılan 30), W×H; alfa (yuva*/rgba/argb/bgra/gbrap ya da VP9 alpha_mode) → PNG dizisi (RGBA) + damalı önizleme;
//   alfa yoksa H.264 yuv420p mp4 + eleman/geçişte luma key önizlemesi (koyu öğe / açık zemin: alfa = 1 − luma). İstekte trim [a, b] varsa kırpılır.
// Hash: kaynağın sha256'sı; aynı hash zaten manifestteyse atlanır. Var olan id'ye farklı hash gelirse yeni id (-v2, -v3 …), eskisi supersededBy alır.
// Ledger: görev kaydı {task, date, balanceBefore, balanceAfter, diff (= önce − sonra), items, creditsSum, match (|diff − creditsSum| < 0.005), lost[{id, credits, reason, refund}]}.
//   match:false yalnız lost ile açıklanıyorsa uyarı (explained: 'lost'), değilse hata (çıkış 3).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ROOT, WIDTH, HEIGHT } from '../lib/project.mjs';
import { ff as ffRun, probe as probe0 } from '../lib/ffmpeg.mjs';
import { verifyFile, sha256, writeJson } from '../lib/gen-hf.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; }, has = (k) => args.includes('--' + k);
const OUT = path.resolve(ROOT, opt('out', 'assets/gen')), INBOX = path.resolve(ROOT, opt('inbox', path.join(path.relative(ROOT, OUT), 'inbox')));
const MAN = path.join(OUT, 'manifest.json'), DRY = has('dry'), STATUS = opt('status', 'draft'), PLAN = opt('plan', 'Plus'), TODAY = new Date().toISOString().slice(0, 10);
const W = WIDTH, H = HEIGHT, FPS = +opt('fps', 30);
const IMG = /\.(png|jpe?g|webp)$/i, VID = /\.(mp4|mov|webm|mkv)$/i, SVG = /\.svg$/i;
const DIR = { plate: 'plates', element: 'elements', transition: 'transitions', storyboard: 'storyboard', logo: 'logos' };
const rel = (f) => path.relative(ROOT, f).split(path.sep).join('/');
const man = fs.existsSync(MAN) ? JSON.parse(fs.readFileSync(MAN, 'utf8')) : { items: [], ledger: [] };
man.items = man.items || []; man.ledger = man.ledger || [];
// üst düzey lost[]: ledger kayıtlarındaki kayıpların düz dizini (şablon alanı; her kaydetmede yeniden üretilir)
const save = () => { if (DRY) return; if (man.lost !== undefined || man.ledger.some((L) => (L.lost || []).length)) man.lost = man.ledger.flatMap((L) => (L.lost || []).map((x) => ({ task: L.task, ...x }))); writeJson(MAN, man); };
let POL = {}; try { POL = JSON.parse(fs.readFileSync(path.join(OUT, 'policy.json'), 'utf8')); } catch { /* politika yok */ }
const CLIPMAX = POL.clipMaxSeconds || 5;
const sub = args[0];

// ---------------------------------------------------------------- review
if (sub === 'review' || has('review')) {
  const i = sub === 'review' ? 0 : args.indexOf('--review'), id = args[i + 1], res = args[i + 2], note = args[i + 3], it = man.items.find((x) => x.id === id);
  if (!it || !/^(kabul|ret|yedek)$/.test(res || '')) { console.error('kullanım: motion-render ingest review <id> <kabul|ret|yedek> "<not>" [--by kim]' + (it ? '' : ' (manifestte yok: ' + id + ')')); process.exit(2); }
  it.review = { result: res, note: note || '', by: opt('by', 'look-dev'), date: TODAY };
  save(); writeAssets(); console.log('✓ review ' + id + ' · ' + res + (note ? ' · ' + note : ''));
  process.exit(0);
}
// ---------------------------------------------------------------- scan
if (sub === 'scan') { const { clipScan } = await import('../lib/gen-clipscan.mjs'); await clipScan(man, args[1], +opt('step', 1)); process.exit(0); }
// ---------------------------------------------------------------- lost / refund
if (sub === 'lost' || sub === 'refund') {
  const task = args[1], L = man.ledger.find((x) => x.task === task);
  if (!L) { console.error('ledger görevi yok: ' + task + ' (var: ' + man.ledger.map((x) => '"' + x.task + '"').join(', ') + ')'); process.exit(2); }
  L.lost = L.lost || [];
  if (sub === 'lost') {
    const id = opt('id', null), cr = +opt('credits', NaN);
    if (!id || !(cr >= 0)) { console.error('kullanım: motion-render ingest lost <görev> --id <öğe> --credits N --reason "…" [--refund pending]'); process.exit(2); }
    L.lost = L.lost.filter((x) => x.id !== id); L.lost.push({ id, credits: cr, reason: opt('reason', ''), refund: opt('refund', 'pending') });
  } else {
    const x = L.lost.find((y) => y.id === args[2]);
    if (!x || !/^(pending|granted|denied)$/.test(args[3] || '')) { console.error('kullanım: motion-render ingest refund <görev> <öğe> <pending|granted|denied>'); process.exit(2); }
    x.refund = args[3]; x.refundDate = TODAY;
  }
  ledgerMatch(L); save(); printLedger(L); process.exit(L.match === false && L.explained !== 'lost' ? 3 : 0);
}

// ---------------------------------------------------------------- alım
const REQ = {};
const RD = path.join(OUT, 'requests');
if (fs.existsSync(RD)) for (const f of fs.readdirSync(RD).filter((x) => x.endsWith('.json'))) { const j = JSON.parse(fs.readFileSync(path.join(RD, f), 'utf8')); for (const it of j.items || []) REQ[it.id] = { scene: j.scene, item: it, file: rel(path.join(RD, f)) }; }
const ff = (a) => ffRun(a, { spawn: { maxBuffer: 64 << 20 } });
function probe(f) {   // codec/piksel biçimi/alfa (ingest'e özgü ayrıştırma; süre ve boyut lib/ffmpeg ile aynı desen)
  const s = probe0(f).raw;
  const v = s.match(/Video: ([^,]+)(?:\([^)]*\))?, ([a-z0-9_]+)(?:\([^)]*\))?[^\n]*?, (\d{2,5})x(\d{2,5})/), d = s.match(/Duration: (\d+):(\d+):([\d.]+)/), r = s.match(/([\d.]+) fps/);
  const pix = v ? v[2] : '', vp9a = /alpha_mode\s*:\s*1/.test(s);
  return { codec: v ? v[1].trim() : '?', pix, w: v ? +v[3] : 0, h: v ? +v[4] : 0, dur: d ? +d[1] * 3600 + +d[2] * 60 + +d[3] : 0, fps: r ? +r[1] : 0, alpha: vp9a || /^(yuva|rgba|argb|bgra|abgr|gbrap|ya)/.test(pix), vp9a };
}
async function checker(w, h, s = 24) {   // damalı zemin (alfa önizlemesi)
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '"><defs><pattern id="c" width="' + 2 * s + '" height="' + 2 * s + '" patternUnits="userSpaceOnUse"><rect width="' + 2 * s + '" height="' + 2 * s + '" fill="#9a9a9a"/><rect width="' + s + '" height="' + s + '" fill="#6a6a6a"/><rect x="' + s + '" y="' + s + '" width="' + s + '" height="' + s + '" fill="#6a6a6a"/></pattern></defs><rect width="100%" height="100%" fill="url(#c)"/></svg>';
  return sharp(Buffer.from(svg)).png().toBuffer();
}
async function lumaKey(file) {   // koyu öğe / açık zemin: alfa = 1 − luma (eşik yumuşak), RGBA PNG
  const { data, info } = await sharp(file).removeAlpha().resize(960, 540, { fit: 'inside' }).raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) { const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2], a = Math.max(0, Math.min(255, (230 - l) * 255 / 150));
    out[j] = data[i]; out[j + 1] = data[i + 1]; out[j + 2] = data[i + 2]; out[j + 3] = a; }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}
async function overChecker(buf) { const m = await sharp(buf).metadata(); return sharp(await checker(m.width, m.height)).composite([{ input: buf }]).png().toBuffer(); }
async function label(text, w) { return Buffer.from('<svg width="' + w + '" height="20"><rect width="100%" height="100%" fill="#000"/><text x="4" y="15" fill="#fc6" font-size="13" font-family="Consolas, monospace">' + text.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</text></svg>'); }

const files = fs.existsSync(INBOX) ? fs.readdirSync(INBOX).filter((f) => IMG.test(f) || VID.test(f) || SVG.test(f)).sort() : [];
const done = [], skipped = [];
for (const f of files) {
  const src = path.join(INBOX, f), base = f.replace(/\.[^.]+$/, ''), ext = path.extname(f).toLowerCase(), hash = sha256(src);
  const dupe = man.items.find((x) => x.sourceHash === hash);
  if (dupe) { skipped.push(f + ' (aynı hash: ' + dupe.id + ')'); continue; }
  const side = fs.existsSync(path.join(INBOX, base + '.json')) ? JSON.parse(fs.readFileSync(path.join(INBOX, base + '.json'), 'utf8')) : {};
  const v0 = await verifyFile(src, { sha256: side.sha256, w: side.w, h: side.h });   // doğrulamadan güvenme
  if (!v0.ok) { skipped.push(f + ' (DOĞRULANMADI: ' + v0.notes.join('; ') + ' — inbox\'ta bırakıldı)'); continue; }
  const rq = REQ[base], it = rq ? rq.item : {};
  const type = it.type || (SVG.test(f) ? 'logo' : VID.test(f) ? 'element' : 'plate');
  let id = base; const vre = new RegExp('^' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(-v\\d+)?$'), prev = man.items.filter((x) => vre.test(x.id));
  if (prev.length) id = base + '-v' + (prev.length + 1);
  const dir = path.join(OUT, DIR[type] || 'plates', id), model = side.model || it.model || null;
  const rec = { id, type, model, prompt: side.prompt || null, seed: side.seed ?? null, credits: side.credits ?? (it.budget ?? null), creditsSource: side.credits != null ? 'yan dosya' : it.budget != null ? 'istek bütçesi (doğrulanmadı)' : null,
    sourceHash: hash, sourceName: f, files: {}, conform: {}, alpha: false, license: side.license || ('Higgsfield ' + PLAN + ' · ' + TODAY + ' · ' + (model || '?')), note: side.note || it.note || undefined, scenes: rq ? [rq.scene] : [], status: STATUS,
    request: rq ? rq.file + '#' + base : null, ingestedAt: new Date().toISOString(), warnings: [], verify: { source: { kind: v0.kind, bytes: v0.bytes, w: v0.w, h: v0.h, duration: v0.duration }, sideSha: side.sha256 ? true : null, notes: [...v0.notes] } };
  if (!rq) rec.warnings.push('istek yok: id requests/*.json içinde değil');
  v0.notes.forEach((n) => rec.warnings.push(n));
  if (DRY) { done.push(rec); continue; }
  fs.mkdirSync(dir, { recursive: true });
  const srcKeep = path.join(dir, 'source' + ext); fs.copyFileSync(src, srcKeep); rec.files.source = rel(srcKeep);
  if (sha256(srcKeep) !== hash) { fs.rmSync(dir, { recursive: true, force: true }); skipped.push(f + ' (kopya hash\'i farklı — alınmadı)'); continue; }
  rec.verify.copySha = true;
  if (SVG.test(f)) {   // vektör logo — conform yok (viewBox), önizleme kâğıt zemininde 1600 px
    const txt = fs.readFileSync(src, 'utf8'), vb = ((/viewBox="([^"]+)"/.exec(txt) || [])[1] || '0 0 0 0').split(/[\s,]+/).map(Number);
    rec.conform = { w: vb[2], h: vb[3], fps: null, codec: 'svg (yalnız path)', frames: 1, duration: null, srcW: vb[2], srcH: vb[3], fit: null }; rec.alpha = true;
    if (/<image\b|base64,/.test(txt)) rec.warnings.push('SVG içinde raster (image/base64): vektör değil — motion-render logo check');
    const bg = opt('preview-bg', '#F2F1EC'), pv = await sharp(src, { density: 72 * 1600 / (vb[2] || 1600) }).flatten({ background: bg }).png().toBuffer(), pf = path.join(dir, 'preview.png'); fs.writeFileSync(pf, pv); rec.files.preview = rel(pf);
    const th = await sharp(pv).resize(640, 360, { fit: 'contain', background: bg }).png().toBuffer(), c = path.join(dir, 'contact.png');
    await sharp({ create: { width: 640, height: 380, channels: 3, background: '#000' } }).composite([{ input: th, left: 0, top: 0 }, { input: await label(id + ' · svg ' + vb[2] + '×' + vb[3], 640), left: 0, top: 360 }]).png().toFile(c); rec.files.contact = rel(c);
    rec.verify.conform = true;
  } else if (IMG.test(f)) {
    const m = await sharp(src).metadata();
    rec.conform = { w: W, h: H, fps: null, codec: 'png', frames: 1, duration: null, srcW: m.width, srcH: m.height, fit: 'cover' };
    if (m.width < W || m.height < H) rec.warnings.push('kaynak ' + W + '×' + H + '\'den küçük (' + m.width + '×' + m.height + '): büyütüldü');
    if (Math.abs(m.width / m.height - W / H) > 0.02) rec.warnings.push('en-boy ' + (W / H).toFixed(3) + ' değil (' + (m.width / m.height).toFixed(3) + '): kırpıldı');
    const conf = path.join(dir, 'conform.png'); await sharp(src).resize(W, H, { fit: 'cover' }).png().toFile(conf); rec.files.conform = rel(conf);
    const cm = await sharp(conf).metadata(); rec.verify.conform = cm.width === W && cm.height === H; if (!rec.verify.conform) rec.warnings.push('conform boyutu ' + cm.width + '×' + cm.height + ' ≠ ' + W + '×' + H);
    rec.alpha = !!m.hasAlpha;
    const thumb = await sharp(conf).resize(640, 360).png().toBuffer(), pv = rec.alpha ? await overChecker(thumb) : thumb;
    if (rec.alpha) { const p = path.join(dir, 'preview.png'); fs.writeFileSync(p, pv); rec.files.preview = rel(p); }
    const c = path.join(dir, 'contact.png');
    await sharp({ create: { width: 640, height: 380, channels: 3, background: '#000' } }).composite([{ input: pv, left: 0, top: 0 }, { input: await label(id + ' · ' + m.width + '×' + m.height + (rec.alpha ? ' · alfa' : ''), 640), left: 0, top: 360 }]).png().toFile(c);
    rec.files.contact = rel(c);
  } else {
    const p = probe(src), trim = it.trim || side.trim || null, pre = p.vp9a ? ['-c:v', 'libvpx-vp9'] : [], tr = trim ? ['-ss', String(trim[0]), '-t', String(trim[1] - trim[0])] : [];
    rec.alpha = p.alpha;
    const dur = trim ? trim[1] - trim[0] : p.dur, nf = Math.round(dur * FPS);
    if (rec.alpha) {
      const fd = path.join(dir, 'frames'); fs.mkdirSync(fd, { recursive: true });
      ff([...pre, ...tr, '-i', src, '-vf', 'fps=' + FPS + ',scale=' + W + ':' + H + ':force_original_aspect_ratio=decrease,pad=' + W + ':' + H + ':(ow-iw)/2:(oh-ih)/2:color=black@0,format=rgba', path.join(fd, '%05d.png')]);
      rec.files.conform = rel(fd) + '/%05d.png';
      const n = fs.readdirSync(fd).filter((x) => x.endsWith('.png')).length, m1 = n ? await sharp(path.join(fd, '00001.png')).metadata() : {};
      rec.verify.conform = n > 0 && Math.abs(n - nf) <= 1 && m1.width === W && m1.height === H; rec.verify.frames = n;
    } else {
      const conf = path.join(dir, 'conform.mp4');
      ff([...tr, '-i', src, '-vf', 'fps=' + FPS + ',scale=' + W + ':' + H + ':force_original_aspect_ratio=increase,crop=' + W + ':' + H + ',format=yuv420p', '-an', '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-movflags', '+faststart', conf]);
      rec.files.conform = rel(conf);
      const cp = probe(conf); rec.verify.conform = cp.w === W && cp.h === H && Math.abs(cp.fps - FPS) < 0.01 && Math.abs(cp.dur - dur) <= 1.5 / FPS + 0.05;
      if (type !== 'plate') {   // sahne T'den kare seçer (deterministik): JPEG dizisi
        const fd = path.join(dir, 'frames'); fs.mkdirSync(fd, { recursive: true });
        ff(['-i', conf, '-q:v', '3', path.join(fd, '%05d.jpg')]);
        rec.files.frames = rel(fd) + '/%05d.jpg'; rec.verify.frames = fs.readdirSync(fd).filter((x) => x.endsWith('.jpg')).length;
        if (Math.abs(rec.verify.frames - nf) > 1) rec.verify.conform = false;
      }
    }
    if (rec.verify.conform === false) rec.warnings.push('conform ölçüsü tutmadı (boyut/kare hızı/kare sayısı) — item.verify');
    const tmp = path.join(dir, '_c'); fs.mkdirSync(tmp, { recursive: true });
    const n = 12;
    for (let k = 0; k < n; k++) ff([...pre, '-ss', String((trim ? trim[0] : 0) + dur * (k + 0.5) / n), '-i', src, '-frames:v', '1', '-vf', 'scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2:color=black@0' + (rec.alpha ? ',format=rgba' : ''), path.join(tmp, String(k).padStart(2, '0') + '.png')]);
    const comps = [];
    for (let k = 0; k < n; k++) { const fp = path.join(tmp, String(k).padStart(2, '0') + '.png'); if (!fs.existsSync(fp)) continue;
      let b = fs.readFileSync(fp); if (rec.alpha) b = await overChecker(b); else if (type !== 'plate') b = await overChecker(await lumaKey(b));
      comps.push({ input: await sharp(b).resize(320, 180).png().toBuffer(), left: (k % 4) * 320, top: Math.floor(k / 4) * 180 + 20 }); }
    comps.push({ input: await label(id + ' · ' + p.codec + ' ' + p.pix + ' · ' + p.w + '×' + p.h + ' · ' + p.dur.toFixed(2) + ' s @' + p.fps + (trim ? ' · kırp ' + trim.join('–') + ' s' : '') + ' · ' + (rec.alpha ? 'alfa' : type !== 'plate' ? 'luma key önizleme' : 'alfa yok'), 1280), left: 0, top: 0 });
    const c = path.join(dir, 'contact.png');
    await sharp({ create: { width: 1280, height: 20 + 3 * 180, channels: 3, background: '#000' } }).composite(comps).png().toFile(c);
    rec.files.contact = rel(c);
    if (!rec.alpha && type !== 'plate') { rec.alpha = 'luma'; const pv = path.join(dir, 'preview-luma.png'); fs.copyFileSync(c, pv); rec.files.preview = rel(pv); }
    fs.rmSync(tmp, { recursive: true, force: true });
    rec.conform = { w: W, h: H, fps: FPS, codec: rec.alpha === true ? 'png-rgba' : 'h264 yuv420p crf16', frames: nf, duration: +dur.toFixed(3), srcW: p.w, srcH: p.h, srcFps: p.fps, srcCodec: p.codec + ' ' + p.pix, trim };
    if (dur > CLIPMAX + 0.01) rec.warnings.push('süre > ' + CLIPMAX + ' s (eleman/geçiş ≤ ' + CLIPMAX + ' s)');
    if (p.h && p.h < H) rec.warnings.push('kaynak ' + p.h + 'p: ' + H + 'p\'ye büyütüldü (' + STATUS + ')');
  }
  for (const x of prev) if (!x.supersededBy) x.supersededBy = id;
  man.items.push(rec); done.push(rec);
  fs.rmSync(src); if (fs.existsSync(path.join(INBOX, base + '.json'))) fs.rmSync(path.join(INBOX, base + '.json'));
}

// ledger: görev kaydı (balance farkı ↔ kredi toplamı; kayıplar)
let run = null;
if (opt('from-run', null)) { run = JSON.parse(fs.readFileSync(path.resolve(ROOT, opt('from-run')), 'utf8')); }
const bb = opt('balance-before', run && Number.isFinite(run.balanceBefore) ? String(run.balanceBefore) : null), ba = opt('balance-after', run && Number.isFinite(run.balanceAfter) ? String(run.balanceAfter) : null);
const lostArg = []; args.forEach((a, i) => { if (a === '--lost' && args[i + 1]) { const [id, cr, ...why] = args[i + 1].split(':'); lostArg.push({ id, credits: +cr, reason: why.join(':'), refund: 'pending' }); } });
let L = null;
if (bb != null || ba != null || done.length || run || lostArg.length) {
  const task = opt('task', run ? (run.scene || run.task) + ' (' + path.basename(opt('from-run')) + ')' : null);
  L = task ? man.ledger.find((x) => x.task === task) : man.ledger.slice().reverse().find((x) => x.balanceAfter == null);
  if (!L) { L = { task: task || 'ingest ' + TODAY, date: TODAY, balanceBefore: null, balanceAfter: null, diff: null, items: [] }; man.ledger.push(L); }
  if (bb != null) L.balanceBefore = +bb;
  if (ba != null) L.balanceAfter = +ba;
  L.items = [...new Set([...(L.items || []), ...done.map((r) => r.id)])];
  const sum = L.items.map((i) => man.items.find((x) => x.id === i)).filter(Boolean).reduce((a, x) => a + (x.credits || 0), 0);
  L.creditsSum = +sum.toFixed(3);
  for (const x of [...(run && run.lost ? run.lost : []), ...lostArg]) { L.lost = (L.lost || []).filter((y) => y.id !== x.id); L.lost.push({ id: x.id, credits: x.credits, reason: x.reason, refund: x.refund || 'pending' }); }   // iş kimliği manifeste yazılmaz (koşu kaydında)
  if (opt('label', null)) L.task = opt('label');
  if (opt('note', null)) L.note = opt('note');
  ledgerMatch(L);
}

// genel kontak: manifestteki bütün güncel varlıklar
if (!DRY && man.items.length) {
  const cur = man.items.filter((x) => !x.supersededBy && x.files && x.files.contact), comps = [], tw = 320, th = 190;
  for (let i = 0; i < cur.length; i++) { const c = path.join(ROOT, cur[i].files.contact); if (!fs.existsSync(c)) continue;
    comps.push({ input: await sharp(c).resize(tw, th, { fit: 'contain', background: '#000' }).png().toBuffer(), left: (i % 6) * tw, top: Math.floor(i / 6) * th }); }
  if (comps.length) await sharp({ create: { width: 6 * tw, height: Math.ceil(cur.length / 6) * th, channels: 3, background: '#000' } }).composite(comps).png().toFile(path.join(OUT, 'CONTACT.png'));
}
if (!DRY) { save(); writeAssets(); }
for (const r of done) console.log('✓ ' + r.id + ' · ' + r.type + ' · ' + (r.model || '?') + ' · ' + (r.alpha === true ? 'alfa' : r.alpha === 'luma' ? 'luma key' : 'alfa yok') + ' · doğrulama ' + (r.verify.conform === false ? '✗' : '✓') + (r.warnings.length ? ' · uyarı: ' + r.warnings.join('; ') : ''));
for (const s of skipped) console.log('— atlandı: ' + s);
const LL = L || man.ledger[man.ledger.length - 1];
if (LL) printLedger(LL);
console.log((DRY ? '(dry) ' : '') + done.length + ' varlık · ' + skipped.length + ' atlandı · ' + rel(MAN));
if (LL && LL.match === false && LL.explained !== 'lost') process.exitCode = 3;

// ---------------------------------------------------------------- yardımcılar
function ledgerMatch(L) {
  if (L.balanceBefore == null || L.balanceAfter == null) return;
  L.diff = +(L.balanceBefore - L.balanceAfter).toFixed(3); L.match = Math.abs(L.diff - (L.creditsSum || 0)) < 0.005;
  const lostSum = (L.lost || []).reduce((a, x) => a + (x.credits || 0), 0);
  if (L.match) delete L.explained; else if (lostSum && Math.abs(L.diff - (L.creditsSum || 0) - lostSum) < 0.005) L.explained = 'lost'; else delete L.explained;
}
function printLedger(L) {
  const lost = (L.lost || []).map((x) => x.id + ' ' + x.credits + ' (' + x.refund + ')').join(', ');
  console.log('ledger: ' + L.task + ' · balance ' + (L.balanceBefore ?? '?') + ' → ' + (L.balanceAfter ?? '?') + ' · fark ' + (L.diff ?? '?') + ' · manifest kredi ' + (L.creditsSum ?? '?') + (lost ? ' · kayıp ' + lost : '') +
    (L.match === false ? (L.explained === 'lost' ? ' · ! uyuşmuyor, kayıpla açıklanıyor (uyarı)' : ' · ✗ UYUŞMUYOR (hata)') : L.match ? ' · ✓' : ''));
}
// sahne haritası: jsx yalnız yolu bilir (render anında üretim yok). Sayfa GEN_BASE ile köke göre çözer.
function writeAssets() {
  if (DRY) return;
  const A = {};
  for (const x of man.items.filter((i) => !i.supersededBy && !(i.review && i.review.result === 'ret'))) {   // ret notlu varlık sahneye girmez
    const fr = x.files.frames || (x.alpha === true && x.files.conform && x.files.conform.includes('%05d') ? x.files.conform : null);
    A[(x.sourceName || x.id).replace(/\.[^.]+$/, '')] = { id: x.id, type: x.type, src: x.files.conform, frames: fr, n: x.conform.frames || 1, w: x.conform.w, h: x.conform.h, alpha: x.alpha, status: x.status };
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'assets.js'), '// assets/gen/assets.js — motion-render ingest üretir, elle düzenlenmez. Sahne yalnız yolu bilir.\nwindow.GEN_ASSETS = ' + JSON.stringify(A, null, 1) + ';\n');
}
