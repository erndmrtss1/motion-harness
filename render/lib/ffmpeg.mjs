// lib/ffmpeg.mjs — ffmpeg ikilisinin tek bulunduğu yer + ortak çalıştırma/renk ön ayarları.
// Sıra: MOTION_FFMPEG → ffmpeg-static (npm) → PATH'teki ffmpeg.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

function locate() {
  if (process.env.MOTION_FFMPEG && fs.existsSync(process.env.MOTION_FFMPEG)) return process.env.MOTION_FFMPEG;
  try {
    const p = createRequire(import.meta.url)('ffmpeg-static');
    if (p && fs.existsSync(p)) return p;
  } catch { /* yok */ }
  return 'ffmpeg';
}
export const ffmpeg = locate();
export default ffmpeg;

// Çalıştır; hata olursa stderr ile fırlat (kütüphane içinde process.exit yok).
export function ff(args, opts = {}) {
  const r = spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', opts.loglevel || 'error', ...args],
    { maxBuffer: 1 << 28, encoding: opts.encoding === null ? undefined : 'utf8', ...opts.spawn });
  if (r.error) throw r.error;
  if (r.status !== 0 && !opts.allowFail) throw new Error('ffmpeg: ' + String(r.stderr || '').slice(-2000));
  return r;
}

// ffprobe yok: `ffmpeg -i` stderr'inden süre ve kare bilgisi (yerel ayardan bağımsız desenler).
export function probe(file) {
  const r = spawnSync(ffmpeg, ['-hide_banner', '-i', file], { encoding: 'utf8' });
  const s = r.stderr || '';
  const d = /Duration: (\d+):(\d+):([\d.]+)/.exec(s);
  const v = /Stream #\S+.*Video: ([^,]+).*?, (\d+)x(\d+).*?([\d.]+) fps/.exec(s);
  return {
    duration: d ? +d[1] * 3600 + +d[2] * 60 + +d[3] : null,
    codec: v ? v[1].trim() : null, width: v ? +v[2] : null, height: v ? +v[3] : null, fps: v ? +v[4] : null,
    audio: /Stream #\S+.*Audio:/.test(s), raw: s,
  };
}

// Renk etiketleri ve dönüşüm: sRGB PNG → BT.709 YUV (matris açıkça 709; swscale varsayılanı 601'dir).
export const TO709 = 'scale=out_color_matrix=bt709:out_range=tv';
export const TAG709 = ['-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv'];
// Kaynak hatla aynı H.264 ayarı (preset varsayılan, CRF 14); renk aralığı etiketi eklendi (D1-14: piksel etkisi 0, H2'de doğrulanır).
export const X264_ARGS = ['-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', ...TAG709, '-movflags', '+faststart'];
export const X264 = (crf = 14) => X264_ARGS.map((a) => (a === '14' ? String(crf) : a));

// Özellik denetimi (smoke/doctor): gereken kodlayıcı ve süzgeçler var mı?
export function capabilities() {
  const enc = spawnSync(ffmpeg, ['-hide_banner', '-encoders'], { encoding: 'utf8' }).stdout || '';
  const fil = spawnSync(ffmpeg, ['-hide_banner', '-filters'], { encoding: 'utf8' }).stdout || '';
  const ver = (spawnSync(ffmpeg, ['-version'], { encoding: 'utf8' }).stdout || '').split('\n')[0];
  const has = (re, s) => re.test(s);
  return {
    path: ffmpeg, version: ver,
    libx264: has(/\blibx264\b/, enc), prores_ks: has(/\bprores_ks\b/, enc), ffv1: has(/\bffv1\b/, enc), aac: has(/\baac\b/, enc),
    loudnorm: has(/\bloudnorm\b/, fil), ebur128: has(/\bebur128\b/, fil), framemd5: true, drawtext: has(/\bdrawtext\b/, fil),
  };
}
