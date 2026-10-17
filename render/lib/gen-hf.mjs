// lib/gen-hf.mjs — üretken varlık ortakları: Higgsfield CLI sarmalayıcı, politika (assets/gen/policy.json + project.md policy bloğu),
// indirme + doğrulama ("doğrulamadan güvenme": boyut, imza, sha256, piksel boyutu), koşu kaydı.
// CLI: MOTION_HIGGSFIELD ‖ `higgsfield` (PATH). Kimlik CLI'nin kendi oturumunda; burada yalnız `credits` okunur (e-posta/jeton basılmaz).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { probe } from './ffmpeg.mjs';

export const hfBin = () => process.env.MOTION_HIGGSFIELD || 'higgsfield';
// Windows'ta CLI bir .cmd kabuğu → kabukla çağrılır; argümanlar q() ile tırnaklanır (yalnız " kaçar: istemde % kullanmayın — cmd genişletir).
export const q = (s) => '"' + String(s).replace(/"/g, '\\"') + '"';
export function hf(a, opts = {}) {
  const r = spawnSync([hfBin(), ...a].join(' '), { encoding: 'utf8', shell: true, maxBuffer: 32 << 20, cwd: opts.cwd });
  return { ok: r.status === 0, out: r.stdout || '', err: r.stderr || '' };
}
// Bakiye (yalnız sayı). Okunamazsa NaN.
export function balance() { const r = hf(['account', 'status', '--json']); try { return r.ok ? +JSON.parse(r.out).credits : NaN; } catch { return NaN; } }
export function costOnline(cli, flags) { const c = hf(['generate', 'cost', cli, ...flags, '--json']); try { return c.ok ? +JSON.parse(c.out).credits : NaN; } catch { return NaN; } }

// Politika: assets/gen/policy.json; project.md içinde ```json policy … ``` bloğu varsa eksik alanları tamamlar (ikisi birlikte değişir: fark → uyarı)
export function loadPolicy(root) {
  const G = path.join(root, 'assets', 'gen'), f = path.join(G, 'policy.json');
  let pol = {}, md = {}; const warn = [];
  if (fs.existsSync(f)) pol = JSON.parse(fs.readFileSync(f, 'utf8'));
  const pm = path.join(root, 'project.md');
  if (fs.existsSync(pm)) {
    const m = /```json(?:c)?\s+policy\s*\n([\s\S]*?)```/.exec(fs.readFileSync(pm, 'utf8'));
    if (m) { try { md = JSON.parse(m[1].replace(/^\s*\/\/.*$/gm, '')); } catch (e) { warn.push('project.md policy bloğu okunamadı: ' + e.message); } }
  }
  for (const [k, v] of Object.entries(md)) {
    if (pol[k] === undefined) pol[k] = v;
    else if (JSON.stringify(pol[k]) !== JSON.stringify(v) && typeof v !== 'object') warn.push('policy.json ↔ project.md farklı: ' + k + ' (' + pol[k] + ' / ' + v + ') — policy.json geçerli');
  }
  pol.whitelist = pol.whitelist || {}; pol.blacklist = pol.blacklist || [];
  return { pol, warn, exists: fs.existsSync(f) };
}
// Çevrimdışı tahmin (--dry): whitelist[model].credits ‖ .estimate ‖ policy.prices[model]
export const offlineCost = (pol, mid) => { const W = pol.whitelist[mid] || {}; const v = W.credits ?? W.estimate ?? (pol.prices || {})[mid]; return v == null ? NaN : +v; };

// İmza (ilk baytlar) → tür
export function sniff(buf) {
  if (buf.length >= 8 && buf.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length >= 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'webp';
  if (buf.length >= 12 && buf.subarray(4, 8).toString() === 'ftyp') return /qt {2}/.test(buf.subarray(8, 12).toString()) ? 'mov' : 'mp4';
  if (buf.length >= 4 && buf.subarray(0, 4).toString('hex') === '1a45dfa3') return 'webm';
  if (/<svg|<\?xml/i.test(buf.subarray(0, 512).toString('utf8'))) return 'svg';
  return null;
}
export const sha256 = (bufOrFile) => crypto.createHash('sha256').update(Buffer.isBuffer(bufOrFile) ? bufOrFile : fs.readFileSync(bufOrFile)).digest('hex');

// Dosya doğrulaması: imza ↔ uzantı, çözülebilirlik, piksel boyutu (beklenen w/h verilirse karşılaştır), süre.
// Dönüş { ok (ölümcül hata yok), kind, bytes, sha256, w, h, duration, fps, notes[] }
export async function verifyFile(file, expect = {}) {
  const buf = fs.readFileSync(file), notes = [], ext = path.extname(file).slice(1).toLowerCase().replace('jpeg', 'jpg');
  const kind = sniff(buf), out = { ok: true, kind, bytes: buf.length, sha256: sha256(buf), w: null, h: null, duration: null, fps: null, notes };
  const fail = (m) => { out.ok = false; notes.push(m); };
  if (!buf.length) { fail('boş dosya'); return out; }
  if (expect.bytes != null && expect.bytes !== buf.length) fail('boyut ' + buf.length + ' B ≠ beklenen ' + expect.bytes + ' B (eksik indirme)');
  if (!kind) fail('bilinmeyen içerik imzası');
  else if (ext && kind !== ext && !(kind === 'mp4' && ext === 'mov') && !(kind === 'mov' && ext === 'mp4')) fail('içerik ' + kind + ', uzantı .' + ext);
  if (['png', 'jpg', 'webp'].includes(kind)) {
    try { const m = await sharp(buf).metadata(); out.w = m.width; out.h = m.height; await sharp(buf).resize(8, 8).raw().toBuffer(); } catch (e) { fail('görüntü çözülemedi: ' + e.message); }
  } else if (['mp4', 'mov', 'webm'].includes(kind)) {
    const p = probe(file); out.w = p.width; out.h = p.height; out.duration = p.duration; out.fps = p.fps;
    if (!p.width || !p.duration) fail('video çözülemedi (ffmpeg -i)');
  }
  if (expect.w && out.w && (expect.w !== out.w || expect.h !== out.h)) notes.push('piksel boyutu ' + out.w + '×' + out.h + ' ≠ iş parametresi ' + expect.w + '×' + expect.h);
  if (expect.sha256 && expect.sha256 !== out.sha256) fail('sha256 uyuşmuyor (yan dosya ' + expect.sha256.slice(0, 12) + '…, dosya ' + out.sha256.slice(0, 12) + '…)');
  return out;
}

// İndir (.part) → doğrula → yerine koy. Doğrulama ölümcülse dosya <inbox>/_rejected/'e taşınır.
export async function download(url, dst, expect = {}) {
  const res = await fetch(url);
  if (!res.ok) return { ok: false, err: 'indirme hatası HTTP ' + res.status };
  const buf = Buffer.from(await res.arrayBuffer()), cl = res.headers.get('content-length');
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  const part = dst + '.part' + path.extname(dst); fs.writeFileSync(part, buf);
  const v = await verifyFile(part, { ...expect, bytes: cl != null && !res.headers.get('content-encoding') ? +cl : undefined });
  if (!v.ok) { const rj = path.join(path.dirname(dst), '_rejected', path.basename(dst)); fs.mkdirSync(path.dirname(rj), { recursive: true }); fs.renameSync(part, rj); return { ok: false, err: 'DOĞRULANMADI: ' + v.notes.join('; '), verify: v, rejected: rj }; }
  fs.renameSync(part, dst);
  return { ok: true, verify: v };
}

export const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
export function writeJson(f, o) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f + '.part', JSON.stringify(o, null, 1) + '\n'); fs.renameSync(f + '.part', f); }
