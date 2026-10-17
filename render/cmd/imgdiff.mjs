// motion-render imgdiff — iki PNG arasındaki fark: ortalama mutlak fark (0–255), %99 yüzdelik, > 24 olan piksel oranı; fark haritası (×4) isteğe bağlı
//
//   motion-render imgdiff a.png b.png [fark.png]
//   motion-render imgdiff stale <id> [--step 60] [--from 15] [--to N] [--skip a-b,…] [--dir D | --parts ETİKET:a-b,…] [--code dosya,…]
//       bayat kare taraması: seçilen karelerde bugünkü kodla taze probe ↔ kayıtlı kare → out/probe/<id>-staleness.json · çıkış 3 = bayat kare var
//       Kayıtlı kare kaynağı: --dir (varsayılan out/frames/<id>) ya da parça render'ları --parts P1:0-439,M2:440-665 (→ out/frames/<id>_<ETİKET>).
//       Bayat = ortalama fark > 0.01 VE kare, sahne kodunun son değişikliğinden eski. Kod = sahne sayfası + x-import `from` dosyaları + yerel
//       <script src> (ya da --code listesi). Kod değişikliğinden yeni karedeki fark probe ↔ sıralı render raster farkıdır (küçük metin kenarları).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { ROOT, sceneById, readTimeline } from '../lib/project.mjs';
import { harnessArgs, harnessEnv } from '../lib/run.mjs';

const argv = process.argv.slice(2);

if (argv[0] === 'stale') {
  const args = argv.slice(1), argOf = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; }, id = args[0];
  if (!id || id.startsWith('--')) { console.error('kullanım: motion-render imgdiff stale <id> [--step 60] [--from 15] [--to N] [--skip a-b,…] [--dir D | --parts ETİKET:a-b,…] [--code dosya,…]'); process.exit(2); }
  const S = sceneById(id);
  const N = S.frames || readTimeline(S.file).frames;
  const STEP = +(argOf('--step') || 60), FROM = +(argOf('--from') || 15), TO = argOf('--to') != null ? +argOf('--to') + 1 : N;
  const SKIP = (argOf('--skip') || '').split(',').filter(Boolean).map((r) => r.split('-').map(Number));
  const PARTS = (argOf('--parts') || '').split(',').filter(Boolean).map((p) => { const [tag, r] = p.split(':'); const [a, b] = r.split('-').map(Number); return { tag, a, b }; });
  const DIR = path.resolve(ROOT, argOf('--dir') || path.join('out', 'frames', id));
  const src = (f) => { const P = PARTS.find((q) => f >= q.a && f <= q.b); return path.join(P ? path.join(ROOT, 'out', 'frames', id + '_' + P.tag) : DIR, String(f).padStart(5, '0') + '.png'); };
  const tmp = path.join(ROOT, 'out', 'probe', '_stale.png'), rows = [];
  // kod zamanı: sahneyi oluşturan dosyaların en yenisi. Bundan SONRA çizilmiş kare taze sayılır (fark = probe ↔ sıralı render raster farkı)
  const codeFiles = () => {
    if (argOf('--code')) return argOf('--code').split(',');
    const html = fs.readFileSync(path.join(ROOT, S.file), 'utf8'), L = [S.file];
    for (const m of html.matchAll(/\bfrom="([^"]+)"/g)) L.push(...m[1].split(/\s+/).filter(Boolean));
    for (const m of html.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)) if (!/^(https?:)?\/\//.test(m[1])) L.push(m[1]);
    return L;
  };
  const CODE = [...new Set(codeFiles())].map((f) => path.resolve(ROOT, f)).filter((f) => fs.existsSync(f));
  const codeT = Math.max(...CODE.map((f) => fs.statSync(f).mtimeMs));
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  for (let f = FROM; f < TO; f += STEP) {
    if (SKIP.some(([a, b]) => f >= a && f <= b)) continue;
    if (!fs.existsSync(src(f))) { rows.push({ f, err: true, missing: true }); console.log('f' + f + ' · kayıtlı kare yok'); continue; }
    const r = spawnSync(process.execPath, harnessArgs('probe', id, '--frame', String(f), '--out', tmp), { cwd: ROOT, env: harnessEnv(), encoding: 'utf8' });
    if (r.status !== 0) { rows.push({ f, err: true }); continue; }
    const a = await sharp(tmp).removeAlpha().raw().toBuffer(), b = await sharp(src(f)).removeAlpha().raw().toBuffer();
    let s = 0, m = 0; for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); s += d; if (d > m) m = d; }
    const newer = fs.statSync(src(f)).mtimeMs > codeT;
    const row = { f, mean: +(s / a.length).toFixed(4), max: m, newer, stale: s / a.length > 0.01 && !newer };   // ortalama; probe ↔ sıralı render arasında metin kenarlarında fark olağan
    rows.push(row); console.log('f' + f + ' · ort ' + row.mean + ' · maks ' + m + (row.stale ? '  ← BAYAT' : s / a.length > 0.01 ? '  (koddan yeni: raster farkı)' : ''));
  }
  fs.rmSync(tmp, { force: true });
  fs.writeFileSync(path.join(ROOT, 'out', 'probe', id + '-staleness.json'), JSON.stringify(rows));
  const bad = rows.filter((r) => r.stale || r.err);
  console.log(bad.length ? 'BAYAT: ' + bad.map((r) => 'f' + r.f).join(' ') : 'bayat kare yok (' + rows.length + ' örnek)');
  if (bad.length) process.exitCode = 3;
} else {
  const [a, b, out] = argv;
  if (!a || !b) { console.error('kullanım: motion-render imgdiff a.png b.png [fark.png] · motion-render imgdiff stale <id> [--step 60]'); process.exit(2); }
  const A = await sharp(a).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const B = await sharp(b).removeAlpha().raw().toBuffer();
  const n = A.info.width * A.info.height, d = new Uint8Array(n), hist = new Uint32Array(256); let sum = 0, big = 0;
  for (let i = 0; i < n; i++) { const v = Math.max(Math.abs(A.data[3 * i] - B[3 * i]), Math.abs(A.data[3 * i + 1] - B[3 * i + 1]), Math.abs(A.data[3 * i + 2] - B[3 * i + 2])); d[i] = Math.min(255, v * 4); sum += v; hist[v]++; if (v > 24) big++; }
  let acc = 0, p99 = 0; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n * 0.99) { p99 = v; break; } }
  console.log(JSON.stringify({ a: a.split(/[\\/]/).pop(), mean: +(sum / n).toFixed(3), p99, over24: +(100 * big / n).toFixed(3) + '%' }));
  if (out) await sharp(d, { raw: { width: A.info.width, height: A.info.height, channels: 1 } }).png().toFile(out);   // yollar cwd'ye göre (kaynakla aynı)
}
