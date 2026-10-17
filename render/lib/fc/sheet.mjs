// lib/fc/sheet.mjs — kanıt sayfası (--sheet ya da kontrol "evidence": true): ihlal kareleri (yoksa ölçülen karelerden örnek),
// kırpım (check.crop ‖ region ‖ box), en yakın komşu büyütme, etiket "f · t s · luma%". Düzen: check.sheet = { layout: grid|strip|column, cols, cell, max }.
// Çıktı: out/probe/fc/<id>-<ad>.png
import path from 'node:path';
import { OUT } from '../project.mjs';
import { frameSource, FPS } from './common.mjs';
import { readRaw, meanLumaPct, sheet } from '../img.mjs';

const slug = (s) => String(s).normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'kontrol';

export function evidenceFrames(c, r, max = 12) {
  const fv = (r.violations || []).map((v) => (v.f != null ? v.f : v.frame)).filter((f) => Number.isInteger(f));
  let fr = [...new Set(fv)];
  if (!fr.length && r.metrics && Array.isArray(r.metrics.sampled)) fr = r.metrics.sampled;
  if (fr.length > max) { const k = fr.length / max; fr = Array.from({ length: max }, (_, i) => fr[Math.floor(i * k)]); }
  return fr;
}

// kırpım: [x, y, w, h] (1080p) — region/box [x0,y0,x1,y1] biçimi de kabul (box)
function cropOf(c) {
  if (Array.isArray(c.crop)) return c.crop;
  if (Array.isArray(c.region)) return c.region;
  if (Array.isArray(c.box)) return [c.box[0], c.box[1], c.box[2] - c.box[0] + 1, c.box[3] - c.box[1] + 1];
  return null;
}

export async function evidenceSheet(c, r, ctx) {
  const o = c.sheet || {}, fr = evidenceFrames(c, r, o.max || 12);
  if (!fr.length) return null;
  const src = frameSource(c.src === 'mp4' || c.src === 'master' ? c : Object.assign({}, c, { src: 'frames' }), ctx);
  if (src.missing) return null;
  const items = [];
  for (const f of fr) {
    if (!src.has(f)) continue;
    const img = await src.read(f, null);
    const lum = meanLumaPct(await readRaw(src.file(f) || (await toPng(img)), 'qc'));
    const input = src.file(f) || (await toPng(img));
    items.push({ input, crop: cropOf(c), label: 'f' + f + ' · ' + (f / FPS).toFixed(2) + ' s · ' + lum.toFixed(1) + '%' });
  }
  if (!items.length) return null;
  const out = path.join(OUT, 'probe', 'fc', ctx.scene.id + '-' + slug(r.name) + '.png');
  return sheet(items, out, { layout: o.layout || 'grid', cols: o.cols || 4, cell: o.cell || (cropOf(c) ? 360 : 480), title: ctx.scene.id + ' · ' + r.name + ' · ' + r.status });
}
async function toPng(img) {
  const sharp = (await import('sharp')).default;
  return sharp(img.data, { raw: { width: img.W, height: img.H, channels: img.C } }).png().toBuffer();
}
