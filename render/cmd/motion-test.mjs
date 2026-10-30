// motion-render motion-test — ilkel hareket testi: 3 s klip 1080p30 + hız profili grafiği (px/kare, ivme) + referans klip ile yan yana kontak.
//
//   motion-render motion-test <ilkel> [--props '<json>' | --props-file f.json] [--from "world/a.jsx world/b.jsx"] [--dur 3] [--fps 30]
//                                     [--bg '#808080'] [--ref <klip.mp4>] [--ref-start s] [--name ad] [--out out/motion-test/<ad>]
//   <ilkel>: world bileşeni adı (window'a açılan; ör. kütüphane FXRule) ya da scenes.json sahne kimliği (hazır test sahnesi; --props/--from yok sayılır).
//   prop değeri sabit ya da anahtar kare listesi [[t, değer, easing?], …] (MH.ease adı; varsayılan sine): '{"x":[[0,1960],[1.2,300,"out3"]],"y":400}'.
//   --from: bileşeni tanımlayan world dosyaları (sırayla); yoksa sahne sayfalarının x-import listesindeki world/*.jsx sırası, o da yoksa world/*.jsx.
//   Çıktı <out>/: <ad>.mp4 (1920×1080 @fps, H.264) · <ad>-hiz.png (hız + ivme; --ref varsa iki çizgi) · <ad>-hiz.json (profil, C1 sıçrama, tepe)
//         · <ad>-kontak.png (her 0,5 s; --ref varsa ikinci satır) · <ad>-yan.mp4 (--ref: yan yana 1920×540) · kare/NNNNN.png
//   Hız iki klipte aynı yöntemle ölçülür (değişen piksellerde SAD kaydırma vektörü; lib/motion-test.mjs). Çıkış 0 · 1 hata · 2 kullanım.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { chromium } from 'playwright';
import { ROOT, OUT, FPS, SCENES, readTimeline, rel } from '../lib/project.mjs';
import { withPage, chromiumArgs } from '../lib/page.mjs';
import { ff, ffmpeg, X264, TO709 } from '../lib/ffmpeg.mjs';
import { testJsx, testPage, clipGray, profile, speedSvg, svgPng, contactSheet } from '../lib/motion-test.mjs';

const argv = process.argv.slice(2);
const VALUED = new Set(['--props', '--props-file', '--from', '--dur', '--fps', '--bg', '--ref', '--ref-start', '--name', '--out']);
const argOf = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const pos = argv.filter((a, i) => !a.startsWith('--') && !VALUED.has(argv[i - 1]));
if (pos.length !== 1) { console.error("kullanım: motion-render motion-test <ilkel|sahne-id> [--props '<json>'] [--from \"world/a.jsx …\"] [--dur 3] [--fps 30] [--ref klip.mp4] [--ref-start s] [--out D]"); process.exit(2); }
const ilkel = pos[0], fps = +argOf('--fps') || 30, ref = argOf('--ref') ? path.resolve(argOf('--ref')) : null, refStart = +argOf('--ref-start') || 0;
if (ref && !fs.existsSync(ref)) { console.error('referans klip yok: ' + ref); process.exit(2); }
const fail = (m) => { console.error('✗ motion-test: ' + m); process.exit(1); };

// ── sahne: hazır test sahnesi ya da üretilen sayfa ─────────────────────────────
const pageImports = () => SCENES.map((s) => { try { return fs.readFileSync(path.join(ROOT, s.file), 'utf8'); } catch { return ''; } });
let scene = SCENES.find((s) => s.id === ilkel), name, outDir, dur;
if (scene) {
  name = argOf('--name') || ilkel; dur = +argOf('--dur') || Math.min(3, readTimeline(scene.file).totalMs / 1000);
} else {
  if (!/^[A-Za-z_$][\w$]*$/.test(ilkel)) fail('ilkel adı bir bileşen adı ya da sahne kimliği olmalı: ' + ilkel);
  name = argOf('--name') || ilkel.toLowerCase(); dur = +argOf('--dur') || 3;
  let props = {};
  try { props = argOf('--props-file') ? JSON.parse(fs.readFileSync(path.resolve(argOf('--props-file')), 'utf8')) : argOf('--props') ? JSON.parse(argOf('--props')) : {}; } catch (e) { fail('--props JSON değil: ' + e.message); }
  let world = argOf('--from') ? argOf('--from').split(/\s+/).filter(Boolean) : null, fonts = [];
  for (const src of pageImports()) {
    const m = /<x-import[^>]*from="([^"]+)"/.exec(src); if (!m || !/world\//.test(m[1])) continue;
    if (!world) world = m[1].split(/\s+/).filter((f) => /^world\/.+\.jsx$/.test(f));
    fonts = (src.match(/<link [^>]*fonts\.(googleapis|gstatic)[^>]*>/g) || []); break;
  }
  if (!world || !world.length) { const d = path.join(ROOT, 'world'); world = fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith('.jsx')).sort().map((f) => 'world/' + f) : []; }
  const missingFiles = ['shared/motion-stage.jsx', 'shared/motion-core.jsx', 'motion-runtime.js', ...world].filter((f) => !fs.existsSync(path.join(ROOT, f)));
  if (missingFiles.length) fail('proje dosyası yok: ' + missingFiles.join(', ') + ' (motion-render init ile kurulmuş proje kökünde koşun)');
  outDir = path.resolve(argOf('--out') || path.join(OUT, 'motion-test', name));
  fs.mkdirSync(outDir, { recursive: true });
  const jsx = path.join(outDir, name + '.jsx'), page = path.join(outDir, name + '.dc.html');
  fs.writeFileSync(jsx, testJsx({ comp: ilkel, props, bg: argOf('--bg') || '#808080' }));
  fs.writeFileSync(page, testPage({ from: ['shared/motion-stage.jsx', 'shared/motion-core.jsx', ...world, rel(jsx)], dur, fonts }));
  scene = { id: 'MT-' + name, file: rel(page), frames: Math.round(dur * FPS) };
}
outDir = outDir || path.resolve(argOf('--out') || path.join(OUT, 'motion-test', name));
const kare = path.join(outDir, 'kare'); fs.rmSync(kare, { recursive: true, force: true }); fs.mkdirSync(kare, { recursive: true });
const N = Math.round(dur * fps), pad5 = (i) => String(i).padStart(5, '0');

// ── çizim (1080p, fps) ────────────────────────────────────────────────────────
const t0 = Date.now(), browser = await chromium.launch({ args: chromiumArgs([scene]) });
let log = [];
try {
  await withPage(scene, { browser }, async (page, api) => {
    for (let i = 0; i < N; i++) fs.writeFileSync(path.join(kare, pad5(i) + '.png'), await api.shot((i * FPS) / fps));
    log = api.log;
  });
} catch (e) { await browser.close(); fail('sayfa: ' + e.message.split('\n')[0]); }
await browser.close();
const errs = log.filter((l) => /PAGEERROR|x-import: FAILED/.test(l));
if (errs.length) fail('sayfa hatası (DUR-6): ' + errs.slice(0, 3).join(' | '));

// ── klip, profil, grafik, kontak ──────────────────────────────────────────────
const mp4 = path.join(outDir, name + '.mp4');
ff(['-framerate', String(fps), '-i', path.join(kare, '%05d.png'), '-vf', TO709, ...X264(16), mp4 + '.part.mp4']); fs.renameSync(mp4 + '.part.mp4', mp4);
const W = 960, H = 540, gray = [];
for (let i = 0; i < N; i++) gray.push((await sharp(path.join(kare, pad5(i) + '.png')).resize(W, H, { kernel: 'cubic' }).greyscale().raw().toBuffer()));
const pt = profile(gray, W, H, { fps });
let pr = null;
if (ref) { const g = clipGray(ref, { start: refStart, dur, fps, w: W, h: H }); if (g.length < 2) fail('referans klipten kare alınamadı'); pr = profile(g, W, H, { fps }); }
const series = [{ label: 'test ' + name, color: '#1f5fbf', p: pt }].concat(pr ? [{ label: 'ref ' + path.basename(ref), color: '#d9822b', p: pr }] : []);
const hizPng = path.join(outDir, name + '-hiz.png');
await svgPng(speedSvg(series, { title: 'motion-test · ' + ilkel + ' · ' + dur + ' s @' + fps }), hizPng);
const refPng = (t) => { const r = spawnSync(ffmpeg, ['-v', 'error', '-ss', String(refStart + t), '-i', ref, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], { maxBuffer: 1 << 28 }); return r.status === 0 && r.stdout.length ? r.stdout : null; };
const times = []; for (let t = 0; t < dur - 1e-6; t += 0.5) times.push(+t.toFixed(3));
const rows = [{ label: 'test', frames: times.map((t) => ({ t, png: fs.readFileSync(path.join(kare, pad5(Math.min(N - 1, Math.round(t * fps))) + '.png')) })) }];
if (ref) rows.push({ label: 'ref', frames: times.map((t) => ({ t, png: refPng(t) })).filter((x) => x.png) });
const kontak = path.join(outDir, name + '-kontak.png');
await contactSheet(rows, kontak, { title: ilkel + (ref ? ' ↔ ' + path.basename(ref) : '') });
let yan = null;
if (ref) {
  yan = path.join(outDir, name + '-yan.mp4');
  ff(['-i', mp4, '-ss', String(refStart), '-t', String(dur), '-i', ref, '-filter_complex', '[0:v]scale=960:540,setsar=1[a];[1:v]fps=' + fps + ',scale=960:540,setsar=1[b];[a][b]hstack=inputs=2[v]',
    '-map', '[v]', '-t', String(dur), ...X264(18), yan + '.part.mp4']);
  fs.renameSync(yan + '.part.mp4', yan);
}
const json = path.join(outDir, name + '-hiz.json');
fs.writeFileSync(json, JSON.stringify({ tool: 'motion-test', ilkel, scene: scene.id, dur, fps, at: new Date().toISOString(), seconds: +((Date.now() - t0) / 1000).toFixed(1),
  test: pt, ref: pr ? Object.assign({ file: path.basename(ref), start: refStart }, pr) : null, files: { mp4: rel(mp4), hiz: rel(hizPng), kontak: rel(kontak), yan: yan ? rel(yan) : null } }, null, 1));
const line = (l, p) => l + ': tepe ' + p.peak + ' px/kare @' + p.fps + ' (k' + p.peakAt + ') · ivme en çok ' + p.maxAccel + ' · hareketli pay ' + p.movingShare + ' · C1 sıçrama ' + p.c1.jumps + ' (en kötü %' + Math.round(p.c1.worstShare * 100) + ' tepe)';
console.log(line('test', pt)); if (pr) console.log(line('ref ', pr));
console.log('✓ motion-test ' + ilkel + ' · ' + N + ' kare · ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s → ' + rel(outDir) + '/ (' + [mp4, hizPng, kontak, yan, json].filter(Boolean).map((f) => path.basename(f)).join(', ') + ')');
