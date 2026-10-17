// motion-render smoke — kurulum öz-sınaması (ağ yalnız ilk vendor'da; sonra önbellek).
//   motion-render smoke [--keep] [--world fx-lab] [--frames 12]
// 1. ffmpeg özellikleri (libx264 zorunlu; prores_ks, ffv1, aac, loudnorm, ebur128, drawtext uyarı) · 2. Chromium açılışı (Playwright)
// 3. geçici proje (OS geçici dizini): motion-render init --world fx-lab --demo (örnek demo sahnesi; yoksa satır içi en küçük demo, motion-stage ile)
// 4. render DEMO --scale 0.5 --range 0-11 --tag smoke → 12 kare 960×540 (boyut ve sayı doğrulanır) · 5. qc (çalıştı = çıkış 0 ya da 3 + qc.json)
// 6. contact (kontak sayfası) · süre ✓ · geçici proje silinir (--keep hariç). Herhangi bir adım ✗ → çıkış 1.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { capabilities } from '../lib/ffmpeg.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), BIN = path.resolve(HERE, '..', 'bin', 'motion-render.mjs'), EXAMPLES = path.resolve(HERE, '..', '..', 'skills', 'motion-world', 'examples');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; }, has = (k) => args.includes('--' + k);
const WORLD = opt('world', 'fx-lab'), NF = Math.max(1, +opt('frames', 12));
const T0 = Date.now(), res = [];
const step = (name, ok, msg, t) => { res.push({ name, ok, msg }); console.log((ok === true ? '✓ ' : ok === 'warn' ? '! ' : '✗ ') + name.padEnd(10) + ' ' + msg + (t ? ' · ' + ((Date.now() - t) / 1000).toFixed(1) + ' s' : '')); return ok; };
const mr = (a, opts = {}) => spawnSync(process.execPath, [BIN, ...a], { encoding: 'utf8', maxBuffer: 1 << 26, ...opts });
const tail = (r) => ((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-4).join(' | ').slice(0, 400);
const pngSize = (f) => { const b = Buffer.alloc(24); const fd = fs.openSync(f, 'r'); fs.readSync(fd, b, 0, 24, 0); fs.closeSync(fd); return b.subarray(1, 4).toString() === 'PNG' ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null; };
let TMP = null;
const done = () => {
  const bad = res.filter((r) => r.ok === false);
  if (TMP && !has('keep')) { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* yut */ } } else if (TMP) console.log('geçici proje korundu: ' + TMP);
  console.log((bad.length ? '✗ smoke BAŞARISIZ (' + bad.map((r) => r.name).join(', ') + ')' : '✓ smoke tamam') + ' · süre ' + ((Date.now() - T0) / 1000).toFixed(1) + ' s');
  process.exit(bad.length ? 1 : 0);
};

// 1 · ffmpeg
{ const t = Date.now(); try { const c = capabilities(); const opt_ = ['prores_ks', 'ffv1', 'aac', 'loudnorm', 'ebur128', 'drawtext'].filter((k) => !c[k]);
  if (!c.libx264) step('ffmpeg', false, 'libx264 yok · ' + c.version, t); else step('ffmpeg', opt_.length ? 'warn' : true, c.version.replace(/ Copyright.*/, '') + (opt_.length ? ' · eksik (isteğe bağlı): ' + opt_.join(', ') : ' · libx264 prores_ks ffv1 aac loudnorm ebur128 drawtext'), t); }
  catch (e) { step('ffmpeg', false, e.message, t); } }
// 2 · Chromium
{ const t = Date.now(); try { const { chromium } = await import('playwright'); const b = await chromium.launch(); const v = b.version(); await b.close(); step('chromium', true, 'Chromium ' + v, t); }
  catch (e) { step('chromium', false, e.message.split('\n')[0] + ' (npx playwright install chromium)', t); } }
if (res.some((r) => r.ok === false)) done();

// 3 · geçici proje
TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'motion-smoke-'));
const hasDemo = fs.existsSync(path.join(EXAMPLES, WORLD, 'demo.dc.html')) && fs.existsSync(path.join(EXAMPLES, WORLD, 'world.json'));
{ const t = Date.now();
  const r = mr(['init', TMP, ...(hasDemo ? ['--world', WORLD, '--demo'] : ['--new'])]);
  if (r.status !== 0) { step('init', false, 'çıkış ' + r.status + ' · ' + tail(r), t); done(); }
  if (!hasDemo) {   // satır içi en küçük demo (örnek world demosu yoksa): motion-stage + tek kahraman kutusu, 1 s
    fs.writeFileSync(path.join(TMP, 'world', 'world.json'), JSON.stringify({ name: 'smoke', version: '0.0.1', origin: 'smoke', palette: { bg: '#000' }, fonts: [], band: [0, 100], k1: { mask: 'dom', selector: '[data-hero]', areaMin: 0, heightMin: 0 } }, null, 1));
    fs.writeFileSync(path.join(TMP, 'demo.jsx'), '// smoke: satır içi en küçük demo\nfunction SmokePiece() { var c = useComposition(), T = c.T;\n  return <div style={{ position: "absolute", inset: 0, background: "#6b6b6b" }}><div data-hero="" style={{ position: "absolute", left: 300 + 600 * T, top: 260, width: 640, height: 560, background: "#1d1f22" }} /></div>; }\n' +
      'function SmokeDemo() { return <CompositionStage width={1920} height={1080} bg="#000" scenes={window.OM_SCENES} playback={window.OM_PLAYBACK}><SmokePiece /></CompositionStage>; }\nObject.assign(window, { SmokeDemo: SmokeDemo });\n');
    fs.writeFileSync(path.join(TMP, 'demo.dc.html'), '<!DOCTYPE html>\n<html><head><meta charset="utf-8"><script src="motion-runtime.js"></script></head><body>\n<x-dc><helmet><style>html, body { margin: 0; background: #000; }</style>\n' +
      '<script>window.OM_SCENES = \'[{"name":"SMOKE","dur":1}]\';</script><script>window.OM_PLAYBACK = \'{"mode":"loop"}\';</script></helmet>\n' +
      '<x-import component-from-global-scope="SmokeDemo" from="shared/motion-stage.jsx demo.jsx" style="position:absolute;inset:0"></x-import>\n</x-dc></body></html>\n');
    const mf = path.join(TMP, 'scenes.json'), man = JSON.parse(fs.readFileSync(mf, 'utf8'));
    man.scenes = [{ id: 'DEMO', file: 'demo.dc.html', tc: '00:00.00', frames: man.fps || 60, bg: '#000', keys: [0], blackStart: false, slice: true, checks: [], hooks: [] }];
    fs.writeFileSync(mf, JSON.stringify(man, null, 2));
  }
  const vend = fs.existsSync(path.join(TMP, 'vendor', 'react@18.3.1', 'umd', 'react.production.min.js'));
  step('init', vend ? true : false, (hasDemo ? 'örnek world ' + WORLD + ' + demo' : 'satır içi demo (örnek demo yok)') + ' · vendor ' + (vend ? '✓' : '✗ (ağ/önbellek yok: ' + tail(r) + ')') + ' · ' + TMP, t);
  if (!vend) done();
}
// 4 · render
const P = ['--project', TMP];
{ const t = Date.now();
  const r = mr(['render', 'DEMO', '--scale', '0.5', '--range', '0-' + (NF - 1), '--tag', 'smoke', '--no-disk-check', ...P]);
  const dir = path.join(TMP, 'out', 'frames', 'DEMO_smoke'), files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort() : [];
  const sizes = files.map((f) => pngSize(path.join(dir, f))), okSize = sizes.length && sizes.every((s) => s && s[0] === 960 && s[1] === 540);
  const ok = r.status === 0 && files.length === NF && okSize;
  step('render', ok, files.length + '/' + NF + ' kare · ' + (sizes[0] ? sizes[0].join('×') : '—') + (ok ? '' : ' · çıkış ' + r.status + ' · ' + tail(r)), t);
  if (!ok) done();
}
// 5 · qc
{ const t = Date.now();
  const r = mr(['qc', 'DEMO', '--frames-dir', 'out/frames/DEMO_smoke', '--no-glyph', '--quiet', ...P]), j = path.join(TMP, 'out', 'probe', 'DEMO-qc.json');
  const ran = (r.status === 0 || r.status === 3) && fs.existsSync(j);
  step('qc', ran ? (r.status === 0 ? true : 'warn') : false, ran ? (r.status === 0 ? 'geçti' : 'çalıştı · kontrol bulgusu var (12 kare kesit için beklenir) · out/probe/DEMO-qc.json') : 'çıkış ' + r.status + ' · ' + tail(r), t);
}
// 6 · contact
{ const t = Date.now(), out = path.join(TMP, 'out', 'probe', 'DEMO-smoke-contact.png');
  const r = mr(['contact', 'DEMO', '--dir', 'out/frames/DEMO_smoke', '--step', '1', '--out', 'out/probe/DEMO-smoke-contact.png', ...P]);
  const ok = r.status === 0 && fs.existsSync(out) && pngSize(out);
  step('contact', ok ? true : false, ok ? 'kontak ' + pngSize(out).join('×') : 'çıkış ' + r.status + ' · ' + tail(r), t);
}
done();
