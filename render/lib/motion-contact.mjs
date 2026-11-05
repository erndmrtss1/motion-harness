// lib/motion-contact.mjs — kontak zaman etiketi (disk karesi ↔ sayfa karesi) ve hareket kontağı (contact motion) çekirdeği. Saf parçalar test edilir.
//   Disk karesi k: kare dizinindeki NNNNN.png sırası. Sayfa karesi f: sahne zamanındaki kare (t = f / fps).
//   page-step = disk karesi başına sayfa karesi (render --step N; animatikte manifest animatic.step). Hücre aralığı (contact --step) AYRI şeydir.
//   Eşleme render --step ile aynıdır: f = k · N; son disk karesi (k = ⌈F/N⌉ − 1) sahnenin son karesidir (F − 1).
// Hareket kontağı: hamle pencereleri (auto: __camSpeed + frame-check `moves` koşu tanımı · plan: camera.moves [{id, a, b}] s) ± pad → kare dizini
//   kesitleri; hız motion-test yöntemiyle (lib/motion-test.mjs profile: değişen piksellerde SAD kaydırma vektörü, px/kare @1080).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { ff, ffmpeg, X264 } from './ffmpeg.mjs';
import { movesOf } from './fc/craft.mjs';
import { profile, clipGray, contactSheet } from './motion-test.mjs';

const r2 = (x) => Math.round(x * 100) / 100, r3 = (x) => Math.round(x * 1000) / 1000;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
export const pad5 = (k) => String(k).padStart(5, '0');

// ── zaman etiketi ─────────────────────────────────────────────────────────────
export function pageFrame(k, { pageStep = 1, sceneFrames = null } = {}) {
  if (pageStep > 1 && sceneFrames > 0 && k === Math.ceil(sceneFrames / pageStep) - 1) return sceneFrames - 1;
  return k * pageStep;
}
// page-step 1: "f<sayfa> · t s" (eski biçim) · page-step ≠ 1: "k<disk> · f<sayfa> · t s"
export function frameLabel(k, { pageStep = 1, sceneFrames = null, fps }) {
  const f = pageFrame(k, { pageStep, sceneFrames }), t = (f / fps).toFixed(2) + ' s';
  return pageStep !== 1 ? 'k' + k + ' · f' + f + ' · ' + t : 'f' + f + ' · ' + t;
}
// koruma: en büyük disk karesi × page-step sahnenin kare sayısını (+1) aşıyorsa etiketler yanlıştır (ör. hücre aralığı --page-step'e verilmiş)
export function pageStepGuard(maxDisk, { pageStep = 1, sceneFrames = null } = {}) {
  if (!(sceneFrames > 0)) return { ok: true, checked: false };
  const top = maxDisk * pageStep;
  if (top <= sceneFrames + 1) return { ok: true, checked: true, top };
  return { ok: false, checked: true, top, msg: 'etiket sahne süresini aşıyor (k' + maxDisk + ' × page-step ' + pageStep + ' = f' + top + ' > sahne ' + sceneFrames + ' kare); ' +
    'hücre aralığı --step\'tir, --page-step disk→sayfa oranıdır (disk karesi başına sayfa karesi; animatikte manifest animatic.step)' };
}
// --page-step | --fstep (kullanımdan kalkan takma ad) | manifest animatic.step | 1
export function pageStepOf(args, animatic) {
  const at = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const v = (x) => { const n = +x; if (!(Number.isInteger(n) && n >= 1)) throw new Error('page-step pozitif tamsayı olmalı: ' + x); return n; };
  if (at('--page-step') != null) return { pageStep: v(at('--page-step')), source: '--page-step' };
  if (at('--fstep') != null) return { pageStep: v(at('--fstep')), source: '--fstep', warn: 'uyarı: --fstep kullanımdan kalkıyor → --page-step N (disk karesi başına sayfa karesi). Hücre aralığı --step\'tir.' };
  if (animatic && animatic.step) return { pageStep: v(animatic.step), source: 'manifest animatic.step' };
  return { pageStep: 1, source: 'varsayılan' };
}
export function diskFrames(dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^\d{5}\.png$/.test(f)).map((f) => +f.slice(0, 5)).sort((a, b) => a - b) : [];
}

// ── hamle pencereleri ────────────────────────────────────────────────────────
// plan: { camera: { moves: [...] } } | { moves: [...] } | [...]; hamle { id, a, b } saniye (sahne zamanı), isteğe bağlı ref: [a, b] (referans klip saniyesi)
export function movesFromPlan(plan) {
  const list = Array.isArray(plan) ? plan : plan && plan.camera && Array.isArray(plan.camera.moves) ? plan.camera.moves : plan && Array.isArray(plan.moves) ? plan.moves : null;
  if (!list) throw new Error('plan dosyasında camera.moves [{id, a, b}] yok');
  return list.map((m, i) => {
    const a = +m.a, b = +m.b;
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) throw new Error('hamle ' + (m.id || i) + ': a < b saniye olmalı');
    const ref = Array.isArray(m.ref) && m.ref.length === 2 ? [+m.ref[0], +m.ref[1]] : null;
    return { id: String(m.id || 'H' + (i + 1)), a, b, ref };
  });
}
// auto: kamera hızı (__camSpeed, px/kare @fps) + shot'lar → frame-check `moves` ile aynı koşu tanımı (movesOf: taban, birleşme 0,25 s, en kısa 0,1 s)
export function movesFromSpeed(v, shots, { fps, floor, mergeSec = 0.25, minRunSec = 0.1 }) {
  const per = movesOf(v, shots, { floor, merge: Math.round(mergeSec * fps), minRun: Math.max(1, Math.round(minRunSec * fps)), fps });
  const one = per.length === 1;
  return per.flatMap((s) => s.moves.map((m, j) => ({ id: (one ? '' : s.shot + '·') + 'H' + (j + 1), a: r3(m.f0 / fps), b: r3(m.f1 / fps), shot: s.shot, designPeak: m.peak, ref: null })));
}
// pencere → disk kareleri (çekirdek [a, b] ve ± pad); kareler mevcut diziye kırpılır
export function windowOf(m, { pad = 0.5, fps, pageStep = 1, sceneFrames = null, frames }) {
  const t = (k) => pageFrame(k, { pageStep, sceneFrames }) / fps, set = frames;
  const inW = (lo, hi) => set.filter((k) => t(k) >= lo - 1e-9 && t(k) <= hi + 1e-9);
  const win = inW(m.a - pad, m.b + pad), core = inW(m.a, m.b);
  return { k0: win[0], k1: win[win.length - 1], c0: core[0], c1: core[core.length - 1], n: win.length, nCore: core.length, contiguous: win.length ? win[win.length - 1] - win[0] + 1 === win.length : false };
}
// görünür süre: yol ilerlemesi (hızın birikimli toplamı) %10 → %90 arası (s); hareket yoksa null
export function visibleSec(speed, fps) {
  const tot = speed.reduce((x, y) => x + y, 0); if (!(tot > 1e-6)) return null;
  let cum = 0, f10 = null, f90 = null;
  speed.forEach((s, i) => { cum += s; if (f10 == null && cum >= 0.1 * tot) f10 = i; if (f90 == null && cum >= 0.9 * tot) f90 = i; });
  return r3((f90 - f10) / fps);
}
// çekirdek pencere gri kareleri → hamle ölçüsü. diskFps = fps / pageStep; tepe sayfa karesi başına (px/kare @1080, proje fps'inde)
export function moveMetrics(gray, W, H, { diskFps, pageStep = 1 }) {
  const p = profile(gray, W, H, { fps: diskFps });
  return { peak: r2(p.peak / pageStep), peakAtDisk: p.peakAt, visible: visibleSec(p.speed, diskFps), c1Worst: r3(p.c1.worstShare), c1Jumps: p.c1.jumps,
    movingShare: p.movingShare, cuts: p.cuts.length, speed: p.speed.map((x) => r2(x / pageStep)) };
}
export async function grayOf(dir, ks, W = 960, H = 540) {
  const out = []; for (const k of ks) out.push(await sharp(path.join(dir, pad5(k) + '.png')).resize(W, H, { kernel: 'cubic' }).greyscale().raw().toBuffer());
  return out;
}

// ── çıktı parçaları ──────────────────────────────────────────────────────────
const bar = (w, h, text, { fill = '#000', op = 0.62, color = '#fff', size = 17 } = {}) => '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="' + fill + '" fill-opacity="' + op + '"/>' +
  '<text x="10" y="' + Math.round(h * 0.7) + '" font-family="Consolas, DejaVu Sans Mono, monospace" font-size="' + size + '" fill="' + color + '">' + esc(text) + '</text>';
// etiket katmanı (saydam PNG, çıktı boyutunda): sol panel hamle etiketi, sağ panel referans etiketi
export async function labelPng(file, { OW, OH, PW, left, right }) {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + OW + '" height="' + OH + '"><g>' + bar(PW, 30, left) + '</g>' +
    (right ? '<g transform="translate(' + PW + ',0)">' + bar(OW - PW, 30, right, { color: '#fc6' }) + '</g>' : '') + '</svg>';
  await sharp(Buffer.from(svg)).png().toFile(file);
}
// tek hamle kesiti → mp4 (kare dizini [k0, k1] · isteğe bağlı referans penceresi · etiket · çekirdek pencerede alt şerit)
export function encodeSegment({ dir, k0, n, dfps, OW, OH, PW, PH, label, coreBar, ref, out }) {
  const D = n / dfps, args = ['-framerate', String(dfps), '-start_number', String(k0), '-i', path.join(dir, '%05d.png')];
  if (ref) args.push('-ss', String(ref.start), '-t', String(ref.dur), '-i', ref.file);
  args.push('-loop', '1', '-framerate', String(dfps), '-i', label, '-loop', '1', '-framerate', String(dfps), '-i', coreBar.file);
  const M = 'out_color_matrix=bt709:out_range=tv', L = ref ? 2 : 1, B = L + 1;
  const g = ['[0:v]scale=' + PW + ':' + PH + ':flags=lanczos:' + M + ',format=yuv420p,setsar=1[a]'];
  if (ref) g.push('[1:v]setpts=PTS-STARTPTS,fps=' + dfps + ',scale=' + (OW - PW) + ':' + PH + ':flags=lanczos,setsar=1,format=yuv420p,tpad=stop_mode=clone:stop_duration=' + D.toFixed(3) + ',trim=duration=' + D.toFixed(3) + ',setpts=PTS-STARTPTS[b]', '[a][b]hstack=inputs=2[s]');
  g.push('[' + L + ':v]format=rgba,scale=' + M + ',format=yuva420p[e]', '[' + B + ':v]format=rgba,scale=' + M + ',format=yuva420p[c]',
    '[' + (ref ? 's' : 'a') + '][e]overlay=0:0:format=yuv420[x]', "[x][c]overlay=0:" + (PH - 8) + ":format=yuv420:enable='between(t," + coreBar.t0.toFixed(3) + ',' + coreBar.t1.toFixed(3) + ")',format=yuv420p[v]");
  ff([...args, '-filter_complex', g.join(';'), '-map', '[v]', '-frames:v', String(n), '-r', String(dfps), '-an', ...X264(18), out]);
}
export function concatMp4(parts, out) {
  const list = out + '.list.txt';
  fs.writeFileSync(list, parts.map((p) => "file '" + p.replace(/\\/g, '/').replace(/'/g, "'\\''") + "'").join('\n') + '\n');
  try { ff(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out + '.part.mp4']); fs.renameSync(out + '.part.mp4', out); }
  finally { fs.rmSync(list, { force: true }); }
}
export function refFramePng(file, t) {
  const r = spawnSync(ffmpeg, ['-v', 'error', '-ss', String(Math.max(0, t)), '-i', file, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], { maxBuffer: 1 << 28 });
  return r.status === 0 && r.stdout.length ? r.stdout : null;
}
// referans penceresi aynı yöntemle (kesitin kare hızında örneklenir; tepe sahneyle aynı birimde: px / sayfa karesi @1080)
export function refMetrics(file, start, dur, { diskFps, pageStep = 1 }) {
  const g = clipGray(file, { start, dur, fps: diskFps, w: 960, h: 540 });
  if (g.length < 2) return null;
  const p = profile(g, 960, 540, { fps: diskFps });
  return { peak: r2(p.peak / pageStep), visible: visibleSec(p.speed, diskFps), c1Worst: r3(p.c1.worstShare), cuts: p.cuts.length };
}
export async function motionSheet(rows, file, title) {
  await contactSheet(rows, file + '.part.png', { cell: 384, title }); fs.renameSync(file + '.part.png', file);
}
