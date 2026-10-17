// lib/audio-core.mjs — ses hattının ortak parçaları (beats, audio-diff, amap, beats shots).
// ffmpeg ile 16 kHz mono f32 çözme, 10 ms RMS (dBFS) ve zarf, kelime normalizasyonu, LCS kelime hizalaması,
// cümle anahtarları, .part → rename yazımı. Kaynak hattın beats / fx3-kayma / amap / zarf korelasyonu kodundan
// (aynı sabitler: 16 kHz, 160 örnek = 10 ms, 1e-12 taban).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ffmpeg } from './ffmpeg.mjs';

export const SR = 16000, HOP = 160;   // 10 ms

// Ses → Float32Array (16 kHz mono). opts.ss/opts.t: kırpma (s).
export function decodePcm(file, opts = {}) {
  const cut = opts.ss != null ? ['-ss', String(opts.ss), '-t', String(opts.t)] : [];
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', ...cut, '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error('ffmpeg (' + file + '): ' + String(r.stderr || '').slice(-600));
  return new Float32Array(r.stdout.buffer.slice(r.stdout.byteOffset, r.stdout.byteOffset + r.stdout.length));
}

// 10 ms pencerede RMS (dBFS): 10·log10(Σv²/HOP + 1e-12)
export function rmsDb(pcm) {
  const N = Math.floor(pcm.length / HOP), db = new Float32Array(N);
  for (let i = 0; i < N; i++) { let s = 0; for (let k = 0; k < HOP; k++) { const v = pcm[i * HOP + k]; s += v * v; } db[i] = 10 * Math.log10(s / HOP + 1e-12); }
  return db;
}

// 10 ms pencerede RMS zarfı (doğrusal): √(Σv²/HOP)
export function envelope(pcm) {
  const n = Math.floor(pcm.length / HOP), e = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let k = 0; k < HOP; k++) { const v = pcm[i * HOP + k]; s += v * v; } e[i] = Math.sqrt(s / HOP); }
  return e;
}

// Kelime karşılaştırma biçimi: dil küçük harfi, harf/rakam dışı her şey atılır (varsayılan dil tr).
export const normWord = (w, lang = 'tr') => String(w).toLocaleLowerCase(lang).replace(/[^\p{L}\p{N}]/gu, '');

// LCS kelime hizalaması: A, B = words[] ({i, w, t0, t1}). Dönüş: pair (A.i → B kelimesi), diff ([{op:'yok'|'ek', w, t, i|j}]).
export function lcs(A, B, lang = 'tr') {
  const norm = (w) => normWord(w, lang);
  const n = A.length, m = B.length, L = Array.from({ length: n + 1 }, () => new Int16Array(m + 1));
  const na = A.map((x) => norm(x.w)), nb = B.map((x) => norm(x.w));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = na[i] === nb[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const pair = new Map(), diff = []; let i = 0, j = 0;
  while (i < n && j < m) {
    if (na[i] === nb[j]) { pair.set(A[i].i, B[j]); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) { diff.push({ op: 'yok', w: A[i].w, t: A[i].t0, i: A[i].i }); i++; }
    else { diff.push({ op: 'ek', w: B[j].w, t: B[j].t0, j: B[j].i }); j++; }
  }
  while (i < n) { diff.push({ op: 'yok', w: A[i].w, t: A[i].t0, i: A[i].i }); i++; }
  while (j < m) { diff.push({ op: 'ek', w: B[j].w, t: B[j].t0, j: B[j].i }); j++; }
  return { pair, diff };
}

// Cümle anahtarları: ilk|son kelime (amap kesme eşlemesi) · ilk iki kelime (audio-diff cümle eşlemi)
export const keyFirstLast = (s, lang = 'tr') => { const w = s.text.split(' '); return normWord(w[0], lang) + '|' + normWord(w[w.length - 1], lang); };
export const keyFirstTwo = (s, lang = 'tr') => s.text.split(/\s+/).slice(0, 2).map((x) => normWord(x, lang)).join('|');

// Zaman kodu: MM:SS.ss
export const tc = (t) => { const m = Math.floor(t / 60), s = t - 60 * m; return String(m).padStart(2, '0') + ':' + s.toFixed(2).padStart(5, '0'); };

// Ses dosyası adından dosya adı kökü (transkript/beats varsayılan adları): küçük harf, ASCII dışı → yaklaşık, boşluk → '-'
export function slugOf(file) {
  const tr = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
  return path.basename(String(file)).replace(/\.[^.]+$/, '').toLocaleLowerCase('tr').replace(/[çğıöşüâîû]/g, (c) => tr[c] || c)
    .normalize('NFKD').replace(/[^\x00-\x7f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'ses';
}

// Atomik yazım: <f>.part → rename (klasör yoksa açılır)
export function put(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file + '.part', text);
  fs.renameSync(file + '.part', file);
}

export const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
