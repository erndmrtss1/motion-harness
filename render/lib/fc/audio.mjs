// lib/fc/audio.mjs — Katman C: ses / tipografi.
//   sync     events (__events ↔ kelime başı, ≤ tolFrames) · drift (align.mjs: 10 ms RMS dB zarfı, 1.5 s pencere NCC ±1.5 s, PCM ±12 ms)
//            · silence (dbprof.mjs: 10 ms RMS dBFS < th, ≥ 30 ms) · words (iki kelime dökümü LCS, Δt0 ≤ tol)
//   loudness ffmpeg loudnorm ölçümü (I, TP, LRA) + kuyruk volumedetect
//   glyph    unicodeRange (sayfa: yüklü yüz kapsıyor mu) · render (mathglyph.mjs: iki yedek yığınla genişlik) · cmap (cmap.mjs: TTF/OTF/WOFF/WOFF2)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { ffmpeg, probe } from '../ffmpeg.mjs';
import { MAN, ROOT, OUT } from '../project.mjs';
import { verdict, unmeasured, hookName, mp4For, r2, r3, FPS } from './common.mjs';
import { PAGE } from './design.mjs';

// ── ses çözme ───────────────────────────────────────────────────────────────
const SR = 16000, HOP = 160;   // 10 ms
export function decodePcm(file, { from = null, dur = null, sr = SR } = {}) {
  const a = ['-hide_banner', '-loglevel', 'error'];
  if (from != null) a.push('-ss', String(from)); if (dur != null) a.push('-t', String(dur));
  a.push('-i', file, '-ac', '1', '-ar', String(sr), '-f', 'f32le', '-');
  const r = spawnSync(ffmpeg, a, { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error('ffmpeg ses: ' + String(r.stderr || '').slice(-300));
  return new Float32Array(r.stdout.buffer.slice(r.stdout.byteOffset, r.stdout.byteOffset + r.stdout.length));
}
// 10 ms RMS dB zarfı (taban −60 dB) — align.mjs:8
export function envDb(p, floor = -60) {
  const N = Math.floor(p.length / HOP), e = new Float32Array(N);
  for (let i = 0; i < N; i++) { let s = 0; for (let k = 0; k < HOP; k++) { const v = p[i * HOP + k]; s += v * v; } e[i] = Math.max(floor, 10 * Math.log10(s / HOP + 1e-12)); }
  return e;
}
const ncc = (a, ia, b, ib, n) => { let ma = 0, mb = 0; for (let k = 0; k < n; k++) { ma += a[ia + k]; mb += b[ib + k]; } ma /= n; mb /= n; let s = 0, sa = 0, sb = 0; for (let k = 0; k < n; k++) { const x = a[ia + k] - ma, y = b[ib + k] - mb; s += x * y; sa += x * x; sb += y * y; } return s / Math.sqrt(sa * sb + 1e-9); };

// zarf hizası: pencere başına gecikme (B − A, ms) — align.mjs:10-19
export function alignEnv(A, B, { win = 1.5, max = 1.5, hop = 0.25, refine = true } = {}) {
  const EA = envDb(A), EB = envDb(B), W = Math.round(win * 100), M = Math.round(max * 100), H = Math.round(hop * 100), out = [];
  for (let i = 0; i + W < EA.length; i += H) {
    let best = -2, bl = 0;
    for (let l = -M; l <= M; l++) { const j = i + l; if (j < 0 || j + W >= EB.length) continue; const c = ncc(EA, i, EB, j, W); if (c > best) { best = c; bl = l; } }
    let bo = bl * HOP, bf = null;
    if (refine) { const s0 = i * HOP, n = W * HOP; bf = -2; for (let d = -12; d <= 12; d++) { const off = bl * HOP + d * 16; if (s0 + off < 0 || s0 + off + n > B.length) continue; let s = 0, sa = 0, sb = 0; for (let k = 0; k < n; k += 4) { const x = A[s0 + k], y = B[s0 + off + k]; s += x * y; sa += x * x; sb += y * y; } const c = s / Math.sqrt(sa * sb + 1e-12); if (c > bf) { bf = c; bo = off; } } }
    out.push({ t: +((i + W / 2) / 100).toFixed(2), lagMs: Math.round(bo / 16), env: +best.toFixed(3), pcm: bf != null ? +bf.toFixed(3) : null });
  }
  return out;
}
// sessiz aralıklar (dbprof.mjs:8-10): [t0, t1] s
export function silences(p, th = -50, minMs = 30, t0 = 0) {
  const n = Math.floor(p.length / HOP), d = []; for (let i = 0; i < n; i++) { let s = 0; for (let k = 0; k < HOP; k++) s += p[i * HOP + k] ** 2; d.push(10 * Math.log10(s / HOP + 1e-12)); }
  const out = []; let st = -1;
  for (let k = 0; k <= d.length; k++) { const s = k < d.length && d[k] < th; if (s && st < 0) st = k; if (!s && st >= 0) { if ((k - st) * 10 >= minMs) out.push([+(t0 + st / 100).toFixed(2), +(t0 + k / 100).toFixed(2)]); st = -1; } }
  return out;
}

// sahne sesi: check.audio ‖ manifest audio; sahne kesiti range (kare) → saniye
function sceneAudio(c, ctx) {
  const f = c.audio ? path.resolve(ROOT, c.audio) : MAN.audio ? path.resolve(ROOT, MAN.audio) : null;
  if (!f || !fs.existsSync(f)) return { error: 'ses dosyası yok' + (f ? ' (' + path.relative(ROOT, f) + ')' : '') };
  const S = ctx.scene, from = c.from != null ? c.from : Array.isArray(S.range) ? S.range[0] / FPS : 0, dur = c.dur != null ? c.dur : Array.isArray(S.range) ? (S.range[1] - S.range[0] + 1) / FPS : null;
  return { file: f, from, dur };
}
const norm = (w) => String(w || '').toLocaleLowerCase('tr').replace(/[^\p{L}\p{N}]+/gu, '');
function readWords(file) {
  const x = JSON.parse(fs.readFileSync(path.resolve(ROOT, file), 'utf8')), arr = Array.isArray(x) ? x : x.words || [];
  return arr.map((w) => ({ w: w.w != null ? w.w : w.word != null ? w.word : w.text, t0: +(w.t0 != null ? w.t0 : w.start != null ? w.start : w.s), t1: +(w.t1 != null ? w.t1 : w.end != null ? w.end : w.e) }));
}

async function eventsPrefetch(c, ctx, api) {
  return api.eval(PAGE, { kind: 'call', fn: hookName(c.events) || '__events', args: [], W: 1920, H: 1080, fps: api.fps, frames: api.frames });
}
async function sync(c, ctx, data) {
  const mode = c.mode || 'events', tolS = c.tol != null ? c.tol : c.tolFrames != null ? c.tolFrames / FPS : mode === 'events' ? 1 / FPS : 0.033;
  if (mode === 'events') {
    if (!data || data.missing) return unmeasured(c, 'kanca yok (' + (hookName(c.events) || '__events') + ')');
    const words = c.words ? readWords(c.words) : null, rows = [], viol = [];
    for (const e of data.value || []) {
      let at = e.at != null ? +e.at : null, wd = null;
      if (at == null && words && e.word) { const k = norm(e.word); let best = null; for (const w of words) if (norm(w.w) === k && (!best || Math.abs(w.t0 - e.t) < Math.abs(best.t0 - e.t))) best = w; if (best) { at = best.t0; wd = best.w; } }
      if (at == null) { rows.push({ t: e.t, word: e.word, kind: e.kind, unmatched: true }); continue; }
      const d = e.t - at; rows.push({ t: r3(e.t), word: e.word || wd, kind: e.kind, at: r3(at), dMs: Math.round(d * 1000) });
      if (Math.abs(d) > tolS + 1e-9) viol.push({ T: r3(e.t), rule: 'olay ↔ kelime', word: e.word, dMs: Math.round(d * 1000), tolMs: Math.round(tolS * 1000) });
    }
    if (!rows.length) return unmeasured(c, 'olay yok');
    const un = rows.filter((r) => r.unmatched).length;
    return verdict(c, ctx, rows.length + ' olay · en büyük |Δ| ' + Math.max(0, ...rows.filter((r) => r.dMs != null).map((r) => Math.abs(r.dMs))) + ' ms (≤ ' + Math.round(tolS * 1000) + ')' + (un ? ' · eşleşmeyen ' + un : ''), { mode, tolMs: Math.round(tolS * 1000), rows }, viol);
  }
  if (mode === 'words') {
    if (!c.a || !c.b) return unmeasured(c, 'a/b kelime dosyası gerekir');
    const A = readWords(c.a), B = readWords(c.b), n = A.length, m = B.length, L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = norm(A[i].w) === norm(B[j].w) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const pairs = []; let i = 0, j = 0; while (i < n && j < m) { if (norm(A[i].w) === norm(B[j].w)) { pairs.push([A[i], B[j]]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; }
    const viol = pairs.filter(([a, b]) => Math.abs(b.t0 - a.t0 - (c.offset || 0)) > tolS).map(([a, b]) => ({ T: r3(a.t0), rule: 'Δt0', word: a.w, dMs: Math.round((b.t0 - a.t0) * 1000) }));
    return verdict(c, ctx, 'eşleşen ' + pairs.length + '/' + n + ' · eşleşmeyen A ' + (n - pairs.length) + ' / B ' + (m - pairs.length) + ' · Δt0 > ' + Math.round(tolS * 1000) + ' ms: ' + viol.length,
      { mode, matched: pairs.length, onlyA: n - pairs.length, onlyB: m - pairs.length }, viol);
  }
  const au = sceneAudio(c, ctx); if (au.error) return unmeasured(c, au.error);
  const P = decodePcm(au.file, { from: au.from, dur: au.dur });
  if (mode === 'silence') {
    const sil = silences(P, c.th != null ? c.th : -50, c.minMs || 30, au.from || 0), viol = [];
    for (const [a, b] of c.expect || []) if (!sil.some(([s0, s1]) => s0 < b && s1 > a)) viol.push({ rule: 'beklenen sessizlik yok', window: [a, b] });
    return verdict(c, ctx, 'sessiz aralık ' + sil.length + ' (< ' + (c.th != null ? c.th : -50) + ' dBFS)', { mode, silences: sil }, viol);
  }
  if (mode === 'drift') {
    if (!c.ref) return unmeasured(c, 'ref ses dosyası gerekir');
    const rf = path.resolve(ROOT, c.ref); if (!fs.existsSync(rf)) return unmeasured(c, 'ref ses yok (' + c.ref + ')');
    const B = decodePcm(rf, { from: c.refFrom != null ? c.refFrom : au.from, dur: au.dur });
    const rows = alignEnv(P, B, { win: c.win || 1.5, max: c.max || 1.5, hop: c.hop || 0.25 }).filter((r) => r.env >= (c.minCorr != null ? c.minCorr : 0.5));
    const viol = rows.filter((r) => Math.abs(r.lagMs) > tolS * 1000).map((r) => ({ T: r.t, rule: 'kayma', lagMs: r.lagMs, tolMs: Math.round(tolS * 1000) }));
    const same = rows.filter((r) => r.pcm != null && r.pcm > (c.sameTake || 0.9)).length;
    return verdict(c, ctx, rows.length + ' pencere · en büyük |kayma| ' + Math.max(0, ...rows.map((r) => Math.abs(r.lagMs))) + ' ms · aynı çekim ' + same + '/' + rows.length, { mode, rows: rows.length <= 800 ? rows : undefined, sameTake: same }, viol);
  }
  return unmeasured(c, 'bilinmeyen sync modu: ' + mode);
}

// ── loudness ────────────────────────────────────────────────────────────────
export function loudnorm(file, from = null) {
  const a = ['-hide_banner', '-nostats']; if (from != null) a.push('-ss', String(from));
  a.push('-i', file, '-af', 'loudnorm=print_format=json', '-f', 'null', '-');
  const r = spawnSync(ffmpeg, a, { encoding: 'utf8', maxBuffer: 1 << 26 }), s = r.stderr || '', m = /\{[\s\S]*?"input_i"[\s\S]*?\}/.exec(s);
  if (!m) throw new Error('loudnorm çıktısı yok: ' + s.slice(-300));
  const j = JSON.parse(m[0]); return { I: +j.input_i, TP: +j.input_tp, LRA: +j.input_lra, thresh: +j.input_thresh };
}
export function volumedetect(file, from = null) {
  const a = ['-hide_banner', '-nostats']; if (from != null) a.push('-ss', String(from));
  a.push('-i', file, '-af', 'volumedetect', '-f', 'null', '-');
  const s = spawnSync(ffmpeg, a, { encoding: 'utf8', maxBuffer: 1 << 26 }).stderr || '';
  const mean = /mean_volume:\s*(-?[\d.]+|-inf)/.exec(s), max = /max_volume:\s*(-?[\d.]+|-inf)/.exec(s);
  return { mean: mean ? (mean[1] === '-inf' ? -Infinity : +mean[1]) : null, max: max ? (max[1] === '-inf' ? -Infinity : +max[1]) : null };
}
async function loudness(c, ctx) {
  let file = null;
  if (c.file) file = path.resolve(ROOT, c.file);
  else if (c.src === 'audio') file = MAN.audio ? path.resolve(ROOT, MAN.audio) : null;
  else if (c.src === 'master' || !c.src) file = mp4For({ src: c.src === 'master' || !c.src ? 'master' : c.src }, ctx);
  if ((!file || !fs.existsSync(file)) && !c.file && c.src !== 'audio') { const ses = path.join(OUT, 'scenes', ctx.scene.id + '-ses.mp4'); file = fs.existsSync(ses) ? ses : mp4For({ src: 'mp4' }, ctx); }
  if (!file || !fs.existsSync(file)) return unmeasured(c, 'ses taşıyan dosya yok');
  if (!probe(file).audio) return unmeasured(c, 'ses akışı yok (' + path.basename(file) + ')');
  let L; try { L = loudnorm(file); } catch (e) { return unmeasured(c, e.message.split('\n')[0]); }
  const I = c.I != null ? c.I : -16, TP = c.TP != null ? c.TP : -1, tolI = c.tolI != null ? c.tolI : 1, viol = [];
  if (Math.abs(L.I - I) > tolI) viol.push({ rule: 'bütünleşik ses yüksekliği', v: L.I, target: I, tol: tolI });
  if (L.TP > TP) viol.push({ rule: 'gerçek tepe', v: L.TP, max: TP });
  let tail;
  if (c.tail && c.tail.from != null) { tail = volumedetect(file, c.tail.from); if (c.tail.maxDb != null && tail.max > c.tail.maxDb) viol.push({ rule: 'kuyruk', v: tail.max, max: c.tail.maxDb }); }
  return verdict(c, ctx, 'I ' + L.I + ' LUFS (' + I + ' ±' + tolI + ') · TP ' + L.TP + ' dBTP (≤ ' + TP + ') · LRA ' + L.LRA + (tail ? ' · kuyruk maks ' + tail.max + ' dB' : '') + ' · ' + path.basename(file),
    { file: path.relative(ROOT, file).split(path.sep).join('/'), ...L, tail }, viol);
}

// ── glyph ───────────────────────────────────────────────────────────────────
// sfnt (TTF/OTF) → cmap kod noktası kümesi (format 4 + 12; cmap.mjs:8-17)
export function cmapSet(buf) {
  const sfnt = toSfnt(buf), set = new Set(), cm = sfnt.tables.cmap; if (!cm) return set;
  const b = cm, nt = b.readUInt16BE(2);
  for (let i = 0; i < nt; i++) {
    const o = b.readUInt32BE(4 + 8 * i + 4), f = b.readUInt16BE(o);
    if (f === 4) { const sc = b.readUInt16BE(o + 6) / 2, e = o + 14, s = e + 2 * sc + 2, d = s + 2 * sc, ro = d + 2 * sc;
      for (let k = 0; k < sc; k++) { const end = b.readUInt16BE(e + 2 * k), st = b.readUInt16BE(s + 2 * k), delta = b.readInt16BE(d + 2 * k), rof = b.readUInt16BE(ro + 2 * k);
        for (let ch = st; ch <= end && ch !== 0xffff; ch++) { let g; if (!rof) g = (ch + delta) & 0xffff; else { g = b.readUInt16BE(ro + 2 * k + rof + 2 * (ch - st)); if (g) g = (g + delta) & 0xffff; } if (g) set.add(ch); } } }
    if (f === 12) { const ng = b.readUInt32BE(o + 12); for (let k = 0; k < ng; k++) { const g = o + 16 + 12 * k, a = b.readUInt32BE(g), z = b.readUInt32BE(g + 4); for (let ch = a; ch <= z; ch++) set.add(ch); } }
  }
  return set;
}
// TTF/OTF/WOFF/WOFF2 → { tables: { tag: Buffer } } (yalnız ham tablolar; WOFF2 glyf/loca dönüşümü çözülmez — cmap dönüşümsüzdür)
const W2TAGS = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'];
export function toSfnt(buf) {
  const sig = buf.toString('latin1', 0, 4), tables = {};
  if (sig === 'wOFF') {
    const n = buf.readUInt16BE(12);
    for (let i = 0; i < n; i++) { const r = 44 + 20 * i, tag = buf.toString('latin1', r, r + 4), off = buf.readUInt32BE(r + 4), comp = buf.readUInt32BE(r + 8), orig = buf.readUInt32BE(r + 12), raw = buf.subarray(off, off + comp); tables[tag] = comp < orig ? zlib.inflateSync(raw) : raw; }
    return { tables };
  }
  if (sig === 'wOF2') {
    const n = buf.readUInt16BE(12), compLen = buf.readUInt32BE(20); let p = 48; const dir = [];
    const b128 = () => { let v = 0; for (let k = 0; k < 5; k++) { const x = buf[p++]; v = v * 128 + (x & 0x7f); if (!(x & 0x80)) return v; } throw new Error('UIntBase128'); };
    for (let i = 0; i < n; i++) {
      const fl = buf[p++], ti = fl & 0x3f, tv = (fl >> 6) & 3; let tag; if (ti === 63) { tag = buf.toString('latin1', p, p + 4); p += 4; } else tag = W2TAGS[ti];
      const orig = b128(), transformed = tag === 'glyf' || tag === 'loca' ? tv !== 3 : tv !== 0, tl = transformed ? b128() : orig;
      dir.push({ tag, len: tl });
    }
    if (buf.toString('latin1', 4, 8) === 'ttcf') throw new Error('WOFF2 koleksiyonu desteklenmiyor');
    const data = zlib.brotliDecompressSync(buf.subarray(p, p + compLen)); let o = 0;
    for (const d of dir) { tables[d.tag] = data.subarray(o, o + d.len); o += d.len; }
    return { tables };
  }
  const n = buf.readUInt16BE(4);
  for (let i = 0; i < n; i++) { const r = 12 + 16 * i, tag = buf.toString('latin1', r, r + 4), off = buf.readUInt32BE(r + 8), len = buf.readUInt32BE(r + 12); tables[tag] = buf.subarray(off, off + len); }
  return { tables };
}
// local.css → aile yüzlerinin dosyaları (src url) + unicode-range
function familyFiles(family, css = 'fonts/local.css') {
  const f = path.resolve(ROOT, css); if (!fs.existsSync(f)) return [];
  const out = [], txt = fs.readFileSync(f, 'utf8');
  for (const m of txt.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const body = m[1], fam = /font-family:\s*['"]?([^;'"]+)['"]?/.exec(body); if (!fam || fam[1].trim() !== family) continue;
    // göreli url → css dizinine göre; mutlak (Google Fonts) url → fonts/gf/<ad> (vendor yerleşimi)
    for (const u of body.matchAll(/url\(\s*['"]?([^)'"]+)['"]?\s*\)/g)) out.push(/^https?:/.test(u[1]) ? path.join(ROOT, 'fonts', 'gf', path.basename(new URL(u[1]).pathname)) : path.resolve(path.dirname(f), u[1]));
  }
  return [...new Set(out)].filter((x) => fs.existsSync(x));
}
async function glyphPrefetch(c, ctx, api) {
  const chars = c.chars || '', fam = c.family;
  if (c.mode === 'render') return api.eval(async ([chars, fam, fb]) => {
    await document.fonts.load('40px "' + fam + '"', chars).catch(() => null); await document.fonts.ready;
    const cv = document.createElement('canvas').getContext('2d'), out = [];
    for (const ch of [...chars]) { cv.font = '40px "' + fam + '", ' + fb[0]; const a = cv.measureText(ch).width; cv.font = '40px "' + fam + '", ' + fb[1]; const s = cv.measureText(ch).width; cv.font = '40px ' + fb[0]; const m = cv.measureText(ch).width;
      out.push({ ch, a: +a.toFixed(2), s: +s.toFixed(2), m: +m.toFixed(2), st: Math.abs(a - s) < 0.05 && Math.abs(a - m) > 0.05 ? 'var' : Math.abs(a - s) < 0.05 ? 'var?' : 'yok' }); }
    return { out, check: document.fonts.check('40px "' + fam + '"', chars) };
  }, [chars, fam, c.fallbacks || ['monospace', 'serif']]);
  return api.eval(async ([chars, fam]) => {   // unicodeRange: aileye ait, karakteri kapsayan, yüklenmiş yüz var mı
    await document.fonts.load('40px "' + fam + '"', chars).catch(() => null); await document.fonts.ready;
    const faces = [...document.fonts].filter((f) => f.family.replace(/["']/g, '') === fam);
    const inR = (cp, ur) => ur.split(',').some((r) => { const m = /U\+([0-9A-F?]+)(?:-([0-9A-F]+))?/i.exec(r.trim()); if (!m) return false; if (m[1].includes('?')) { const lo = parseInt(m[1].replace(/\?/g, '0'), 16), hi = parseInt(m[1].replace(/\?/g, 'F'), 16); return cp >= lo && cp <= hi; } const lo = parseInt(m[1], 16), hi = m[2] ? parseInt(m[2], 16) : lo; return cp >= lo && cp <= hi; });
    return { faces: faces.length, out: [...chars].map((ch) => { const cp = ch.codePointAt(0), fs2 = faces.filter((f) => inR(cp, f.unicodeRange || 'U+0-10FFFF')); return { ch, cp: 'U+' + cp.toString(16).toUpperCase(), faces: fs2.length, loaded: fs2.filter((f) => f.status === 'loaded').length }; }) };
  }, [chars, fam]);
}
async function glyph(c, ctx, data) {
  const mode = c.mode || 'unicodeRange', chars = [...new Set([...(c.chars || '')])];
  if (!chars.length) return unmeasured(c, 'chars yok');
  if (mode === 'cmap') {
    const files = c.files ? c.files.map((f) => path.resolve(ROOT, f)) : c.family ? familyFiles(c.family, c.css) : [];
    if (!files.length) return unmeasured(c, 'font dosyası bulunamadı' + (c.family ? ' (' + c.family + ')' : ''));
    const set = new Set(); for (const f of files) { try { cmapSet(fs.readFileSync(f)).forEach((x) => set.add(x)); } catch (e) { return unmeasured(c, path.basename(f) + ': ' + e.message); } }
    const miss = chars.filter((ch) => !set.has(ch.codePointAt(0)));
    return verdict(c, ctx, (c.family || files.map((f) => path.basename(f)).join(',')) + ' cmap ' + set.size + ' kod noktası · eksik ' + miss.length + '/' + chars.length + (miss.length ? ' (' + miss.join('') + ')' : ''),
      { mode, files: files.map((f) => path.relative(ROOT, f).split(path.sep).join('/')), codepoints: set.size, missing: miss }, miss.map((ch) => ({ rule: 'cmap', ch, cp: 'U+' + ch.codePointAt(0).toString(16).toUpperCase() })));
  }
  if (!data || data.out == null) return unmeasured(c, 'sayfa ölçümü yok');
  if (mode === 'render') {
    const bad = data.out.filter((x) => x.st === 'yok');
    return verdict(c, ctx, c.family + ' çizim: ' + (data.out.length - bad.length) + '/' + data.out.length + ' hedef fontta' + (bad.length ? ' · yedeğe düşen ' + bad.map((x) => x.ch).join('') : ''), { mode, rows: data.out, check: data.check }, bad.map((x) => ({ rule: 'yedek font', ch: x.ch })));
  }
  const bad = data.out.filter((x) => !x.loaded);
  return verdict(c, ctx, c.family + ' unicode-range: ' + (data.out.length - bad.length) + '/' + data.out.length + ' yüklü yüzde (' + data.faces + ' yüz)' + (bad.length ? ' · eksik ' + bad.map((x) => x.ch).join('') : ''), { mode, faces: data.faces, rows: data.out }, bad.map((x) => ({ rule: 'yüz yok', ch: x.ch, cp: x.cp })));
}

export const TYPES = {
  sync: { layer: 'audio', page: (c) => (c.mode || 'events') === 'events', prefetch: eventsPrefetch, run: sync },
  loudness: { layer: 'audio', run: loudness },
  glyph: { layer: 'audio', page: (c) => (c.mode || 'unicodeRange') !== 'cmap', prefetch: glyphPrefetch, run: glyph },
};
