// lib/qc-film.mjs — `motion-render qc film`: film geneli QC (grade tutarlılık sayfası) + grade provası + geçiş şeritleri.
//
//   qc film                     manifestteki sahnelerin grade'li mp4'lerinden (en yeni out/scenes/<id>.mp4) her sahneden 3 kare (%25/%50/%75)
//   qc film --probe DIR         grade provası kareleri: DIR/<id>-a.png, <id>-b.png (-c.png) — render'dan önce
//   qc film --rehearsal         grade provası üret: sahne başı 2 kare (probe) → world grade zinciri → out/probe/grade-rehearsal/<id>-a|b.png,
//                               ardından sayfa (--probe out/probe/grade-rehearsal). Kareler: sahne `rehearsal: [fa, fb]` ‖ ilk iki `keys` ‖ %35/%65.
//                               Sahne `encode` alanı varsa (kendi grade'ini yapan özel encode) kareler grade'li mp4'ten alınır.
//   qc film --cuts <id> [--at f,f…] [--frames-dir D] [--class ad]
//                               geçiş şeritleri: her kesme ±0.5 s, 0.1 s adımla kareler + kare kare ortalama parlaklık ve kare-kare fark
//                               (fark > 6 / 255 = sıçrama adayı); aksan sınıfı aralıkları (sahne `redAllowed` [[a,b],…] dışı ya da
//                               redQuota aşımı → çıkış 3). Kesmeler: --at ‖ sahne `cuts` [f | [f, etiket]] ‖ çocuk sahnelerin range başları ‖ shots f0.
//   [--ids a,b,…]               alt küme
//
// Sayfa: sahne başına bir satır (film sırası, bölüm başlığıyla): kareler + ölçüler (ortalama luma, siyah noktası = %0.5 persentil,
// beyaz noktası = %99.5, doygunluk, aksan px). Tutarlılık: aynı zincir grubunda (koyu / aydınlık; world.grade.chain) siyah noktası
// medyandan ±4'ten fazla sapan sahne işaretlenir. Altta bölüm ışık arkı (sahne ortalama luma, film sırasında) ve qc.json özetleri.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { ffmpeg, TO709 } from './ffmpeg.mjs';
import { ROOT, MAN, FPS, OUT, latestMp4, sceneById, rel } from './project.mjs';
import { cli, worldFor, worldName, accentFor, probe, PROBE_DIR, pad5 } from './qc-common.mjs';

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const tcs = (tc) => { if (!tc) return 1e9; const [m, s] = String(tc).split(':'); return +m * 60 + +s; };

export async function main(argv) {
  const A = cli(argv, ['--probe', '--ids', '--at', '--frames-dir', '--class']);
  if (A.has('--cuts')) return cuts(A);
  if (A.has('--rehearsal')) { const rc = await rehearsal(A); if (rc) return rc; return sheet(A, path.join(PROBE_DIR, 'grade-rehearsal')); }
  return sheet(A, A.argOf('--probe') ? path.resolve(ROOT, A.argOf('--probe')) : null);
}

function filmScenes(A) {
  let scenes = (MAN.scenes || []).slice().sort((a, b) => tcs(a.tc) - tcs(b.tc));
  if (A.argOf('--ids')) { const want = A.argOf('--ids').split(','); scenes = scenes.filter((s) => want.includes(s.id)); }
  return scenes;
}

// 480×270 istatistik: ortalama, siyah (%0.5) / beyaz (%99.5) noktası, doygunluk, aksan pikseli
async function stats(buf, isAcc) {
  const { data, info } = await sharp(buf).resize(480, 270).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const L = new Uint8Array(info.width * info.height); let s = 0, sat = 0, red = 0;
  for (let i = 0, k = 0; i < data.length; i += 3, k++) {
    const r = data[i], g = data[i + 1], b = data[i + 2], y = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b); L[k] = y; s += y;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); sat += mx ? (mx - mn) / mx : 0;
    if (isAcc(r, g, b)) red++;
  }
  const sorted = Array.from(L).sort((a, b) => a - b), pct = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  return { mean: +(s / L.length).toFixed(1), black: pct(0.005), white: pct(0.995), sat: +(sat / L.length * 100).toFixed(1), red };
}
function grabMp4(mp4, idx) {
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', mp4, '-vf', "select='eq(n," + idx + ")'", '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], { maxBuffer: 1 << 28 });
  return r.status === 0 && r.stdout.length ? r.stdout : null;
}

async function sheet(A, PROBE) {
  fs.mkdirSync(PROBE_DIR, { recursive: true });
  const scenes = filmScenes(A), rows = [];
  for (const s of scenes) {
    const imgs = [], W = worldFor(s);
    if (PROBE) {
      for (const k of ['a', 'b', 'c']) { const p = path.join(PROBE, s.id + '-' + k + '.png'); if (fs.existsSync(p)) imgs.push({ tag: k, buf: fs.readFileSync(p) }); }
    } else {
      const mp4 = latestMp4(s.id);
      if (mp4) for (const q of [0.25, 0.5, 0.75]) { const i = Math.floor(q * (s.frames - 1)), b = grabMp4(mp4, i); if (b) imgs.push({ tag: 'f' + i, buf: b }); }
    }
    if (!imgs.length) { rows.push({ s, W, imgs: [], st: [], missing: true }); continue; }
    const acc = accentFor(s, W).test, st = []; for (const im of imgs) st.push(await stats(im.buf, acc));
    const qcj = path.join(PROBE_DIR, s.id + '-qc.json'), qc = fs.existsSync(qcj) ? JSON.parse(fs.readFileSync(qcj, 'utf8')) : null;
    rows.push({ s, W, imgs, st, qc });
  }
  // tutarlılık: zincir grubu (koyu / aydınlık) içinde siyah noktası ve ortalama
  const grp = (r) => (r.W && r.W.grade && r.W.grade.chain === 'light' ? 'aydınlık' : 'koyu');
  const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 0; };
  const groups = {};
  rows.filter((r) => r.st.length).forEach((r) => { const g = grp(r); (groups[g] = groups[g] || []).push(r); });
  const flags = [];
  for (const [g, rs] of Object.entries(groups)) {
    const bm = med(rs.map((r) => med(r.st.map((x) => x.black))));
    rs.forEach((r) => { r.blackMed = med(r.st.map((x) => x.black)); r.meanAvg = +(r.st.reduce((a, x) => a + x.mean, 0) / r.st.length).toFixed(1);
      if (Math.abs(r.blackMed - bm) > 4) { r.flag = 'siyah noktası ' + r.blackMed + ' (grup medyanı ' + bm + ')'; flags.push(r.s.id + ': ' + r.flag); } });
    groups[g].blackMedian = bm;
  }

  // sayfa
  const TW = 320, TH = 180, LEFT = 300, ROWH = TH + 30, COLS = 3, HEAD = 60, ARC = 260;
  const Wd = LEFT + COLS * (TW + 10) + 420, Hd = HEAD + rows.length * ROWH + ARC + 60;
  const comp = [];
  let svg = '<svg width="' + Wd + '" height="' + Hd + '" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0d0d0d"/>' +
    '<text x="20" y="34" font-family="monospace" font-size="20" fill="#eee">FILM grade sayfası · ' + (PROBE ? 'PROVA (grade + gren, tek kare)' : 'grade\'li mp4') + ' · ' + rows.length + ' sahne</text>' +
    '<text x="20" y="54" font-family="monospace" font-size="13" fill="#999">siyah = %0.5 persentil luma · beyaz = %99.5 · ort = ortalama luma (0–255) · doy = ort. doygunluk % · aksan = aksan sınıfı px (480×270)</text>';
  let lastCh = null;
  rows.forEach((r, i) => {
    const y = HEAD + i * ROWH, s = r.s;
    if (s.chapter !== lastCh) { svg += '<line x1="0" x2="' + Wd + '" y1="' + (y - 2) + '" y2="' + (y - 2) + '" stroke="#333"/>'; lastCh = s.chapter; }
    svg += '<text x="20" y="' + (y + 24) + '" font-family="monospace" font-size="18" fill="' + (r.flag ? '#ff6b6b' : '#ffd24a') + '">' + esc(s.id) + '</text>' +
      '<text x="20" y="' + (y + 46) + '" font-family="monospace" font-size="12" fill="#bbb">' + esc((s.tc || '—') + ' · B' + (s.chapter == null ? '—' : s.chapter) + (s.chapterName ? ' ' + s.chapterName : '')) + '</text>' +
      '<text x="20" y="' + (y + 64) + '" font-family="monospace" font-size="12" fill="#bbb">' + esc(worldName(s, r.W) + (s.temp ? ' · ' + s.temp : '') + ' · aksan hakkı ' + s.redQuota) + '</text>' +
      (r.flag ? '<text x="20" y="' + (y + 84) + '" font-family="monospace" font-size="12" fill="#ff6b6b">' + esc(r.flag) + '</text>' : '') +
      (r.missing ? '<text x="' + LEFT + '" y="' + (y + 90) + '" font-family="monospace" font-size="14" fill="#777">kare yok</text>' : '');
    r.st.forEach((st, k) => {
      const x = LEFT + k * (TW + 10);
      svg += '<text x="' + x + '" y="' + (y + TH + 22) + '" font-family="monospace" font-size="11" fill="#9fd39f">' + esc(r.imgs[k].tag + ' · ort ' + st.mean + ' · siyah ' + st.black + ' · beyaz ' + st.white + ' · doy ' + st.sat + ' · aksan ' + st.red) + '</text>';
    });
    if (r.qc) {
      const c = r.qc.checks, x = LEFT + COLS * (TW + 10) + 10;
      const lines = ['qc: ' + (r.qc.errors.length ? r.qc.errors.length + ' hata' : 'temiz'), 'son kare max ' + (c.lastFrame ? c.lastFrame.rawMax : '—'), 'ort luma %' + c.darkness.mean,
        'aksan aralık ' + c.red.signalRanges.length + '/' + c.red.quota, 'fade ' + c.fade.filter((x) => !x.exit && !x.reviewed).length + (c.fade.some((x) => x.reviewed) ? ' (+' + c.fade.filter((x) => x.reviewed).length + ' incelendi)' : '')];
      lines.forEach((t, j) => { svg += '<text x="' + x + '" y="' + (y + 22 + j * 18) + '" font-family="monospace" font-size="12" fill="' + (j === 0 && r.qc.errors.length ? '#ff6b6b' : '#bbb') + '">' + esc(t) + '</text>'; });
    }
  });
  // bölüm ışık arkı
  const ay = HEAD + rows.length * ROWH + 30, ax0 = 80, ax1 = Wd - 40, pts = rows.filter((r) => r.st.length);
  svg += '<text x="20" y="' + (ay - 6) + '" font-family="monospace" font-size="14" fill="#ddd">bölüm ışık arkı · sahne ortalama luma (grade\'li), film sırası</text>' +
    '<rect x="' + ax0 + '" y="' + ay + '" width="' + (ax1 - ax0) + '" height="' + (ARC - 60) + '" fill="#141414" stroke="#2a2a2a"/>';
  const X = (i) => ax0 + 30 + i * ((ax1 - ax0 - 60) / Math.max(1, pts.length - 1)), Yv = (v) => ay + (ARC - 60) - (v / 160) * (ARC - 70);
  const CH = ['#9fd39f', '#ff8a8a', '#6fa8dc', '#ffd24a', '#e0b050', '#c39bd3', '#76d7c4', '#f0b27a'];   // bölüm rengi (sırayla)
  const chIdx = [...new Set(pts.map((r) => r.s.chapter))];
  svg += '<path d="' + pts.map((r, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Yv(r.meanAvg).toFixed(1)).join(' ') + '" fill="none" stroke="#888" stroke-width="1.5"/>';
  pts.forEach((r, i) => { svg += '<circle cx="' + X(i) + '" cy="' + Yv(r.meanAvg) + '" r="6" fill="' + (r.s.chapter == null ? '#bbb' : CH[chIdx.indexOf(r.s.chapter) % CH.length]) + '"/>' +
    '<text x="' + (X(i) - 22) + '" y="' + (ay + ARC - 44) + '" font-family="monospace" font-size="11" fill="#aaa">' + esc(r.s.id) + '</text>' +
    '<text x="' + (X(i) - 12) + '" y="' + (Yv(r.meanAvg) - 10) + '" font-family="monospace" font-size="11" fill="#ddd">' + r.meanAvg + '</text>'; });
  svg += '</svg>';
  comp.push({ input: Buffer.from(svg), left: 0, top: 0 });
  for (let i = 0; i < rows.length; i++) for (let k = 0; k < rows[i].imgs.length; k++)
    comp.push({ input: await sharp(rows[i].imgs[k].buf).resize(TW, TH).png().toBuffer(), left: LEFT + k * (TW + 10), top: HEAD + i * ROWH + 4 });
  const sheetPng = path.join(PROBE_DIR, '_film-grade-sheet.png');
  await sharp({ create: { width: Wd, height: Hd, channels: 3, background: '#0d0d0d' } }).composite(comp).png().toFile(sheetPng + '.part.png');
  fs.renameSync(sheetPng + '.part.png', sheetPng);
  const redTotal = rows.reduce((a, r) => a + (r.qc ? r.qc.checks.red.signalRanges.length : 0), 0);
  fs.writeFileSync(path.join(PROBE_DIR, '_film-qc.json'), JSON.stringify({ mode: PROBE ? 'probe' : 'mp4', groups: Object.fromEntries(Object.entries(groups).map(([g, rs]) => [g, { blackMedian: rs.blackMedian, scenes: rs.map((r) => r.s.id) }])),
    scenes: rows.map((r) => ({ id: r.s.id, chapter: r.s.chapter, world: worldName(r.s, r.W), stats: r.st, blackMed: r.blackMed, meanAvg: r.meanAvg, flag: r.flag || null, qcErrors: r.qc ? r.qc.errors : null, redRanges: r.qc ? r.qc.checks.red.signalRanges.length : null, redQuota: r.s.redQuota })),
    flags, redTotal }, null, 1));
  console.log('✓ ' + rel(sheetPng) + ' · ' + rows.length + ' sahne · gruplar ' + Object.entries(groups).map(([g, rs]) => g + ' (siyah medyan ' + rs.blackMedian + ')').join(', ') +
    (flags.length ? '\nTUTARSIZ: ' + flags.join(' · ') : ' · tutarlı') + (rows.some((r) => r.qc) ? '\naksan (qc): ' + rows.filter((r) => r.qc).map((r) => r.s.id + ' ' + r.qc.checks.red.signalRanges.length + '/' + r.s.redQuota).join(' · ') + ' · toplam ' + redTotal : ''));
  return 0;
}

// ── grade provası ──────────────────────────────────────────────────────────
// Zincir paketin grade modülünden (lib/grade.mjs gradeChain); kare-bağımsız biçim (frames null) + BT.709 → tekrar RGB png.
async function gradeVf(s, W) {
  const f = path.join(path.dirname(fileURLToPath(import.meta.url)), 'grade.mjs');
  if (!fs.existsSync(f)) throw new Error('grade zinciri bulunamadı (lib/grade.mjs gradeChain)');
  const G = await import(pathToFileURL(f).href);
  if (typeof G.gradeChain !== 'function') throw new Error('lib/grade.mjs gradeChain dışa aktarmıyor');
  // gradeChain(worldAdı, frames, head, pure, opts): zincir sahne grade.chain > world.json grade.chain > world adı; kare-bağımsız (frames null)
  const chain = G.gradeChain(worldName(s, W), null, 0, 0, s.grade || {});
  return chain + ',' + TO709 + ',scale=in_color_matrix=bt709:in_range=tv:out_range=pc';
}
async function rehearsal(A) {
  const DIR = path.join(PROBE_DIR, 'grade-rehearsal');
  fs.mkdirSync(DIR, { recursive: true });
  const scenes = filmScenes(A);
  let fail = 0;
  for (const s of scenes) {
    const N = s.frames || 0, W = worldFor(s);
    const picks = Array.isArray(s.rehearsal) && s.rehearsal.length >= 2 ? s.rehearsal.slice(0, 2)
      : s.keys && s.keys.length >= 2 ? s.keys.slice(0, 2) : [Math.floor(0.35 * (N - 1)), Math.floor(0.65 * (N - 1))];
    for (const [tag, f] of [['a', picks[0]], ['b', picks[1]]]) {
      const out = path.join(DIR, s.id + '-' + tag + '.png');
      if (s.encode) {   // kendi grade'ini yapan özel encode: kare grade'li mp4'ten
        const mp4 = latestMp4(s.id);
        const r = mp4 ? spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', mp4, '-vf', "select='eq(n," + f + ")',scale=in_color_matrix=bt709:in_range=tv:out_range=pc", '-frames:v', '1', '-pix_fmt', 'rgb24', out]) : { status: 1 };
        console.log((r.status === 0 ? '✓ ' : '✗ ') + s.id + ' f' + f + ' (mp4)'); if (r.status !== 0) fail++; continue;
      }
      const raw = path.join(DIR, '_raw-' + s.id + '-' + tag + '.png');
      const r1 = probe(s.id, ['--frame', String(f), '--out', raw]);
      if (r1.status !== 0) { console.log('✗ ' + s.id + ' f' + f + ' probe: ' + (r1.stdout || '').trim().split('\n').pop()); fail++; continue; }
      let vf;
      try { vf = await gradeVf(s, W); } catch (e) { console.error('✗ ' + e.message); return 1; }
      const r2 = spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', raw, '-vf', vf, '-pix_fmt', 'rgb24', out]);
      console.log((r2.status === 0 ? '✓ ' : '✗ ') + s.id + ' f' + f + ' · ' + worldName(s, W)); if (r2.status !== 0) fail++;
    }
  }
  return fail ? 1 : 0;
}

// ── geçiş şeritleri (bütün film / uzun sahne) ──────────────────────────────
async function cuts(A) {
  const id = A.pos[0];
  if (!id) { console.error('kullanım: motion-render qc film --cuts <id> [--at f,f…] [--frames-dir D] [--class ad]'); return 2; }
  let S; try { S = sceneById(id); } catch (e) { console.error(e.message); return 1; }
  const W = worldFor(S), ACC = accentFor(A.argOf('--class') ? Object.assign({}, S, { accent: A.argOf('--class') }) : S, W);   // --class: aksan sınıfı adı (ör. signalWide = geniş kırmızı r ≥ 150, r−g ≥ 90, r−b ≥ 80)
  const DIR = A.argOf('--frames-dir') ? path.resolve(ROOT, A.argOf('--frames-dir')) : path.join(OUT, 'frames', id);
  const file = (f) => path.join(DIR, pad5(f) + '.png');
  const N = S.frames, have = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => /^\d{5}\.png$/.test(f)).length : 0;
  if (have < N) { console.error('kare eksik: ' + have + ' / ' + N + ' (' + rel(DIR) + ')'); return 1; }
  // kesme listesi
  let CUTS = [];
  if (A.argOf('--at')) CUTS = A.argOf('--at').split(',').map((x) => [+x, 'f' + x]);
  else if (Array.isArray(S.cuts)) CUTS = S.cuts.map((c) => (Array.isArray(c) ? [+c[0], c[1] || 'f' + c[0]] : [+c, 'f' + c]));
  else {
    const kids = (MAN.scenes || []).filter((x) => x.parent === id && Array.isArray(x.range)).sort((a, b) => a.range[0] - b.range[0]);
    if (kids.length > 1) CUTS = kids.slice(1).map((k, i) => [k.range[0], kids[i].id + ' → ' + k.id + ' · ' + (k.range[0] / FPS).toFixed(1)]);
    else if (Array.isArray(S.shots)) CUTS = S.shots.slice(1).map((s) => { const f0 = s.af0 != null ? s.af0 : s.f0; return [f0, s.id + ' · ' + (f0 / FPS).toFixed(1)]; });
  }
  const HW = Math.round(0.5 * FPS), STEP = Math.max(1, Math.round(0.1 * FPS));   // ±0.5 s pencere, 0.1 s adım (30 fps: ±15 kare, her 3. kare)
  CUTS = CUTS.filter((c) => Number.isFinite(c[0]) && c[0] - HW >= 1 && c[0] + HW < N);
  fs.mkdirSync(PROBE_DIR, { recursive: true });

  // küçük gri kopyalar (fark + parlaklık + aksan) — tek geçiş
  const bright = [], red = [], diff = [0];
  let prev = null;   // bellek: fark için yalnız önceki kare tutulur
  for (let f = 0; f < N; f++) {
    const { data, info } = await sharp(file(f)).resize(480, 270).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let s = 0, rc = 0; const g = new Uint8Array(info.width * info.height);
    for (let i = 0, k = 0; i < data.length; i += 3, k++) {
      const R = data[i], G = data[i + 1], B = data[i + 2], Yv = 0.2126 * R + 0.7152 * G + 0.0722 * B; s += Yv; g[k] = Yv;
      if (ACC.test(R, G, B)) rc++;
    }
    bright[f] = +(s / g.length / 255 * 100).toFixed(2); red[f] = rc;
    if (prev) { let d = 0; for (let i = 0; i < prev.length; i += 2) d += Math.abs(prev[i] - g[i]); diff[f] = +(d / (prev.length / 2)).toFixed(2); }
    prev = g;
  }

  // 1) geçiş şeritleri
  const CW = 200, CHh = 113, LAB = 20, GH = 70, cols = 2 * Math.round(HW / STEP) + 1, comp = [], rowH = LAB + CHh + GH + 14, notes = [];
  for (let r = 0; r < CUTS.length; r++) {
    const [c, name] = CUTS[r], y0 = r * rowH, fr = []; for (let f = c - HW; f <= c + HW; f += STEP) fr.push(f);
    const win = []; for (let f = c - HW; f <= c + HW; f++) win.push(f);
    const mx = Math.max(...win.map((f) => diff[f])), mxF = win[win.map((f) => diff[f]).indexOf(mx)];
    const bj = Math.max(...win.slice(1).map((f) => Math.abs(bright[f] - bright[f - 1])));
    notes.push({ cut: name, f: c, maxDiff: mx, at: mxF, maxBrightJump: +bj.toFixed(2), jump: mx > 6 });
    comp.push({ input: Buffer.from('<svg width="' + cols * CW + '" height="' + LAB + '"><text x="6" y="15" font-family="monospace" font-size="14" fill="#ffd24a">' + esc(name + ' · ±' + HW + ' kare · en büyük kare-kare fark ' + mx + ' (f' + mxF + ') · parlaklık sıçraması ' + bj.toFixed(2) + ' puan') + '</text></svg>'), left: 0, top: y0 });
    for (let i = 0; i < fr.length; i++) {
      comp.push({ input: await sharp(file(fr[i])).resize(CW, CHh).png().toBuffer(), left: i * CW, top: y0 + LAB });
      comp.push({ input: Buffer.from('<svg width="' + CW + '" height="16"><rect width="60" height="16" fill="rgba(0,0,0,0.6)"/><text x="4" y="12" font-family="monospace" font-size="11" fill="' + (fr[i] === c ? '#ffd24a' : '#ddd') + '">f' + fr[i] + '</text></svg>'), left: i * CW, top: y0 + LAB });
    }
    const Wp = cols * CW, px = (f) => (f - (c - HW)) / (2 * HW) * Wp, bmax = Math.max(40, ...win.map((f) => bright[f]));
    const line = win.map((f, i) => (i ? 'L' : 'M') + px(f).toFixed(1) + ' ' + (GH - bright[f] / bmax * (GH - 6)).toFixed(1)).join(' ');
    const bars = win.map((f) => '<rect x="' + (px(f) - 2).toFixed(1) + '" y="' + (GH - Math.min(GH, diff[f] * 4)).toFixed(1) + '" width="4" height="' + Math.min(GH, diff[f] * 4).toFixed(1) + '" fill="' + (diff[f] > 6 ? '#ff6b6b' : '#5a7a9a') + '"/>').join('');
    comp.push({ input: Buffer.from('<svg width="' + Wp + '" height="' + GH + '"><rect width="' + Wp + '" height="' + GH + '" fill="#161616"/>' + bars + '<path d="' + line + '" fill="none" stroke="#9fd39f" stroke-width="2"/><line x1="' + px(c) + '" x2="' + px(c) + '" y1="0" y2="' + GH + '" stroke="#ffd24a" stroke-dasharray="4 3"/><text x="6" y="14" font-family="monospace" font-size="11" fill="#9fd39f">parlaklık %</text><text x="110" y="14" font-family="monospace" font-size="11" fill="#5a7a9a">kare-kare fark (×4)</text></svg>'), left: 0, top: y0 + LAB + CHh + 4 });
  }
  const cutsPng = path.join(PROBE_DIR, id + '-cuts.png');
  if (CUTS.length) {
    await sharp({ create: { width: cols * CW, height: CUTS.length * rowH, channels: 3, background: '#0d0d0d' } }).composite(comp).png().toFile(cutsPng);
    console.log('✓ ' + rel(cutsPng));
    notes.forEach((n) => console.log('  ' + String(n.cut).padEnd(18) + ' en büyük fark ' + String(n.maxDiff).padStart(5) + ' (f' + n.at + ')' + (n.jump ? ' ✗ sıçrama adayı' : '') + ' · parlaklık sıçraması ' + n.maxBrightJump));
  } else console.log('– kesme yok (--at ya da manifest cuts / çocuk sahne range / shots)');

  // 2) aksan sayımı (≥ 25 px @480×270): sahne redAllowed dışı ya da redQuota aşımı → hata
  const RED_MIN = 25, ranges = []; let r0 = null;
  for (let f = 0; f <= N; f++) { const on = f < N && red[f] >= RED_MIN; if (on && r0 == null) r0 = f; if (!on && r0 != null) { ranges.push([r0, f - 1]); r0 = null; } }
  const allowed = Array.isArray(S.redAllowed) ? (a) => S.redAllowed.some((w) => a[0] >= w[0] && a[1] <= w[1]) : null;
  const bad = allowed ? ranges.filter((a) => !allowed(a)) : S.redQuota != null && ranges.length > S.redQuota ? ranges : [];
  console.log('aksan (' + ACC.name + '): ' + (ranges.map((a) => 'f' + a[0] + '–' + a[1]).join(', ') || 'yok') + (bad.length ? ' · BEKLENMEYEN: ' + bad.map((a) => 'f' + a[0] + '–' + a[1]).join(', ') : ' ✓'));
  fs.writeFileSync(path.join(PROBE_DIR, id + '-whole.json'), JSON.stringify({ id, window: HW, step: STEP, cuts: notes, accent: { class: ACC.name, rule: ACC.spec, minPx: RED_MIN, ranges: ranges.map((a) => ({ from: a[0], to: a[1], peak: Math.max(...red.slice(a[0], a[1] + 1)) })), unexpected: bad, perFrame: red }, brightness: bright, diff }, null, 0));
  return bad.length ? 3 : 0;
}
