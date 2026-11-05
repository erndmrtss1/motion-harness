// motion-render motion-test — ilkel hareket testi: 3 s klip 1080p30 + hız profili grafiği (px/kare, ivme) + referans klip ile yan yana kontak.
//
//   motion-render motion-test <ilkel> [--props '<json>' | --props-file f.json] [--from "world/a.jsx world/b.jsx"] [--dur 3] [--fps 30]
//                                     [--bg '#808080'] [--ref <klip.mp4>] [--ref-start s] [--name ad] [--out out/motion-test/<ad>]
//   <ilkel>: world bileşeni adı (window'a açılan; ör. kütüphane FXRule) ya da scenes.json sahne kimliği (hazır test sahnesi; --props/--from yok sayılır)
//            ya da hazır mekanik testi mek-supurme | mek-katlama | mek-seyahat (shared/motion-mek.jsx MH.mek ilkelleri; --props ilkel seçeneklerine yazılır,
//            ör. '{"kind":"out"}' · '{"hinge":"top","angle":96}' · '{"profile":"quintic"}'; world dosyası yüklenmez; projede shared/motion-mek.jsx yoksa
//            paketteki runtime kopyası test dizinine alınır — projeye yazılmaz).
//   prop değeri sabit ya da anahtar kare listesi [[t, değer, easing?], …] (MH.ease adı; varsayılan sine): '{"x":[[0,1960],[1.2,300,"out3"]],"y":400}'.
//   --from: bileşeni tanımlayan world dosyaları (sırayla); yoksa sahne sayfalarının x-import listesindeki world/*.jsx sırası, o da yoksa world/*.jsx.
//         shared/motion-mek.jsx projede varsa motion-core'dan sonra yüklenir (world ilkeli MH.mek kullanabilir).
//   Çıktı <out>/: <ad>.mp4 (1920×1080 @fps, H.264) · <ad>-hiz.png (hız + ivme; --ref varsa iki çizgi; tasarım kancası varsa üçüncü çizgi) · <ad>-hiz.json
//         (profil, C1 sıçrama, tepe; sayfada __mtSpeed ya da __camSpeed varsa `design` tasarım hızı profili, __mtPlan varsa `plan`)
//         · <ad>-kontak.png (her 0,5 s; --ref varsa ikinci satır) · <ad>-yan.mp4 (--ref: yan yana 1920×540) · kare/NNNNN.png
//   Hız iki klipte aynı yöntemle ölçülür (değişen piksellerde SAD kaydırma vektörü; lib/motion-test.mjs). Tasarım hızı C1'i frame-check velocity tanımıyla
//   (taban 0,05, tepeye göre %5). Çıkış 0 · 1 hata · 2 kullanım.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { chromium } from 'playwright';
import { ROOT, OUT, FPS, SCENES, readTimeline, rel } from '../lib/project.mjs';
import { withPage, chromiumArgs } from '../lib/page.mjs';
import { ff, ffmpeg, X264, TO709 } from '../lib/ffmpeg.mjs';
import { fileURLToPath } from 'node:url';
import { testJsx, testPage, clipGray, profile, speedSvg, svgPng, contactSheet, MEK_TESTS, mekTestJsx, noisePng, designProfile } from '../lib/motion-test.mjs';

const argv = process.argv.slice(2);
const VALUED = new Set(['--props', '--props-file', '--from', '--dur', '--fps', '--bg', '--ref', '--ref-start', '--name', '--out']);
const argOf = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const pos = argv.filter((a, i) => !a.startsWith('--') && !VALUED.has(argv[i - 1]));
if (pos.length !== 1) { console.error("kullanım: motion-render motion-test <ilkel|sahne-id|" + Object.keys(MEK_TESTS).join('|') + "> [--props '<json>'] [--from \"world/a.jsx …\"] [--dur 3] [--fps 30] [--ref klip.mp4] [--ref-start s] [--out D]"); process.exit(2); }
const ilkel = pos[0], fps = +argOf('--fps') || 30, ref = argOf('--ref') ? path.resolve(argOf('--ref')) : null, refStart = +argOf('--ref-start') || 0;
if (ref && !fs.existsSync(ref)) { console.error('referans klip yok: ' + ref); process.exit(2); }
const fail = (m) => { console.error('✗ motion-test: ' + m); process.exit(1); };

// ── sahne: hazır test sahnesi ya da üretilen sayfa ─────────────────────────────
const pageImports = () => SCENES.map((s) => { try { return fs.readFileSync(path.join(ROOT, s.file), 'utf8'); } catch { return ''; } });
let scene = SCENES.find((s) => s.id === ilkel), name, outDir, dur;
const MEK = 'shared/motion-mek.jsx', hasMek = fs.existsSync(path.join(ROOT, MEK));
const readProps = () => { try { return argOf('--props-file') ? JSON.parse(fs.readFileSync(path.resolve(argOf('--props-file')), 'utf8')) : argOf('--props') ? JSON.parse(argOf('--props')) : {}; } catch (e) { return fail('--props JSON değil: ' + e.message); } };
if (scene) {
  name = argOf('--name') || ilkel; dur = +argOf('--dur') || Math.min(3, readTimeline(scene.file).totalMs / 1000);
} else if (MEK_TESTS[ilkel]) {   // hazır mekanik testi (MH.mek): world yüklenmez; ölçüm dokusu test dizinine yazılır
  name = argOf('--name') || ilkel; dur = +argOf('--dur') || 3;
  const missingFiles = ['shared/motion-stage.jsx', 'shared/motion-core.jsx', 'motion-runtime.js'].filter((f) => !fs.existsSync(path.join(ROOT, f)));
  if (missingFiles.length) fail('proje dosyası yok: ' + missingFiles.join(', ') + ' (motion-render init ile kurulmuş proje kökünde koşun)');
  outDir = path.resolve(argOf('--out') || path.join(OUT, 'motion-test', name));
  fs.mkdirSync(outDir, { recursive: true });
  let mek = MEK;
  if (!hasMek) {   // 1.3 ile kurulmuş proje: paketteki runtime kopyası yalnız test dizinine
    const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'runtime', 'motion-mek.jsx');
    if (!fs.existsSync(src)) fail('paket runtime/motion-mek.jsx yok');
    fs.copyFileSync(src, path.join(outDir, 'motion-mek.jsx')); mek = rel(path.join(outDir, 'motion-mek.jsx'));
    console.log('· projede ' + MEK + ' yok: paket kopyası ' + mek + ' kullanıldı (projeye yazılmadı; motion-render init sonrası shared/ altında)');
  }
  await noisePng(path.join(outDir, 'mt-doku.png'));
  const jsx = path.join(outDir, name + '.jsx'), page = path.join(outDir, name + '.dc.html');
  fs.writeFileSync(jsx, mekTestJsx({ test: ilkel, opts: readProps(), bg: argOf('--bg') || '#808080', tex: rel(path.join(outDir, 'mt-doku.png')) }));
  fs.writeFileSync(page, testPage({ from: ['shared/motion-stage.jsx', 'shared/motion-core.jsx', mek, rel(jsx)], dur }));
  scene = { id: 'MT-' + name, file: rel(page), frames: Math.round(dur * FPS) };
} else {
  if (!/^[A-Za-z_$][\w$]*$/.test(ilkel)) fail('ilkel adı bir bileşen adı ya da sahne kimliği olmalı: ' + ilkel);
  name = argOf('--name') || ilkel.toLowerCase(); dur = +argOf('--dur') || 3;
  const props = readProps();
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
  fs.writeFileSync(page, testPage({ from: ['shared/motion-stage.jsx', 'shared/motion-core.jsx', ...(hasMek ? [MEK] : []), ...world, rel(jsx)], dur, fonts }));
  scene = { id: 'MT-' + name, file: rel(page), frames: Math.round(dur * FPS) };
}
outDir = outDir || path.resolve(argOf('--out') || path.join(OUT, 'motion-test', name));
const kare = path.join(outDir, 'kare'); fs.rmSync(kare, { recursive: true, force: true }); fs.mkdirSync(kare, { recursive: true });
const N = Math.round(dur * fps), pad5 = (i) => String(i).padStart(5, '0');

// ── çizim (1080p, fps) ────────────────────────────────────────────────────────
const t0 = Date.now(), browser = await chromium.launch({ args: chromiumArgs([scene]) });
let log = [], hook = null;
try {
  await withPage(scene, { browser }, async (page, api) => {
    for (let i = 0; i < N; i++) fs.writeFileSync(path.join(kare, pad5(i) + '.png'), await api.shot((i * FPS) / fps));
    // tasarım hızı (isteğe bağlı kanca): __mtSpeed (hazır mekanik testi) ‖ __camSpeed (sahne kamerası) · plan: __mtPlan
    hook = await api.eval((a) => { const f = typeof window.__mtSpeed === 'function' ? ['__mtSpeed', window.__mtSpeed] : typeof window.__camSpeed === 'function' ? ['__camSpeed', window.__camSpeed] : null;
      return { hook: f && f[0], v: f ? f[1](a.fps, a.n) : null, plan: typeof window.__mtPlan === 'function' ? window.__mtPlan() : null }; }, { fps, n: N }).catch(() => null);
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
const pd = hook && Array.isArray(hook.v) && hook.v.length > 1 ? Object.assign({ hook: hook.hook }, designProfile(hook.v, fps)) : null;
const series = [{ label: 'test ' + name, color: '#1f5fbf', p: pt }].concat(pr ? [{ label: 'ref ' + path.basename(ref), color: '#d9822b', p: pr }] : [], pd ? [{ label: 'tasarım ' + pd.hook, color: '#2a9d55', p: pd }] : []);
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
  test: pt, ref: pr ? Object.assign({ file: path.basename(ref), start: refStart }, pr) : null, design: pd, plan: (hook && hook.plan) || null,
  files: { mp4: rel(mp4), hiz: rel(hizPng), kontak: rel(kontak), yan: yan ? rel(yan) : null } }, null, 1));
const line = (l, p) => l + ': tepe ' + p.peak + ' px/kare @' + p.fps + ' (k' + p.peakAt + ') · ivme en çok ' + p.maxAccel + ' · hareketli pay ' + p.movingShare + ' · C1 sıçrama ' + p.c1.jumps + ' (en kötü %' + Math.round(p.c1.worstShare * 100) + ' tepe)';
console.log(line('test', pt)); if (pr) console.log(line('ref ', pr)); if (pd) console.log(line('tasarım (' + pd.hook + ')', pd) + ' · koşu ' + pd.c1.moves + ' · oturma birleşik C1 en kötü %' + Math.round(pd.c1Settle.worstShare * 100) + ' (' + pd.c1Settle.moves + ' koşu)');
if (hook && hook.plan) console.log('plan: ' + JSON.stringify(hook.plan));
console.log('✓ motion-test ' + ilkel + ' · ' + N + ' kare · ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s → ' + rel(outDir) + '/ (' + [mp4, hizPng, kontak, yan, json].filter(Boolean).map((f) => path.basename(f)).join(', ') + ')');
