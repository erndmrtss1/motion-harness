// lib/project.mjs — proje kökü, manifest (scenes.json), sahne kaydı, OM_SCENES okuyucu.
// Kök: --project <dizin> (bin dağıtıcısı MOTION_PROJECT'e yazar) → MOTION_PROJECT → cwd'den yukarı ilk scenes.json → cwd.
// Süre ve kare sayısı her zaman sayfanın helmet'indeki OM_SCENES'ten okunur; kare hızı manifestten (tek kaynak).
import fs from 'node:fs';
import path from 'node:path';

function findRoot() {
  if (process.env.MOTION_PROJECT) return path.resolve(process.env.MOTION_PROJECT);
  let d = process.cwd();
  for (;;) {
    if (fs.existsSync(path.join(d, 'scenes.json'))) return d;
    const up = path.dirname(d);
    if (up === d) return process.cwd();
    d = up;
  }
}

export const ROOT = findRoot();
export const MANIFEST_PATH = path.join(ROOT, 'scenes.json');
export const MAN = fs.existsSync(MANIFEST_PATH) ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) : { scenes: [] };
export const FPS = +MAN.fps || 60;                         // D1-03: varsayılan 60 fps
export const KF = FPS / 30;                                 // 30 fps tabanlı eski kare eşikleri için ölçek
export const WIDTH = +MAN.width || 1920;
export const HEIGHT = +MAN.height || 1080;
export const PROFILE = MAN.profile || 'full';
export const OUT = path.join(ROOT, 'out');

// Kare ↔ saniye: bütün eşikler saniye cinsinden tutulur, kareye burada çevrilir.
export const sec2f = (s) => Math.round(s * FPS);
export const f2sec = (f) => f / FPS;

export const SCENES = (MAN.scenes || []).map((x) => ({ ...x }));
export const GLYPH_SCENES = new Set(SCENES.filter((x) => x.glyph).map((x) => x.id));

// Film dışı sayfalar (look-dev tahtaları, storyboard, A/B demoları): film sırasına girmez; araçlar yalnız kimlikle bulur.
export function demoManifest() {
  const out = { scenes: [] };
  for (const rel of ['boards/pages.json', 'boards/sb.json', 'bootcamp/unit/demos.json', 'bootcamp/ab/ab.json', 'bootcamp/storyboard/sb.json']) {
    const f = path.join(ROOT, rel);
    if (fs.existsSync(f)) out.scenes.push(...(JSON.parse(fs.readFileSync(f, 'utf8')).scenes || []));
  }
  return out;
}
export function sceneById(id) {
  const s = SCENES.find((x) => x.id === id) || demoManifest().scenes.find((x) => x.id === id);
  if (!s) throw new Error('Bilinmeyen sahne: ' + id + ' (geçerli: ' + SCENES.map((x) => x.id).join(', ') + ')');
  return s;
}

// Sahnenin en yeni mp4'ü: out/scenes/<id>.mp4 ya da kilit yüzünden zaman damgalı <id>.<ms>.mp4 — en yeni mtime
export function latestMp4(id) {
  const dir = path.join(OUT, 'scenes');
  if (!fs.existsSync(dir)) return null;
  const ok = (f) => f === id + '.mp4' || (f.startsWith(id + '.') && /^\d{10,}\.mp4$/.test(f.slice(id.length + 1)));
  const c = fs.readdirSync(dir).filter(ok).map((f) => ({ f: path.join(dir, f), t: fs.statSync(path.join(dir, f)).mtimeMs })).sort((a, b) => b.t - a.t);
  return c.length ? c[0].f : null;
}

// Hyperframes kompozisyonu mu? (x-dc yok, GSAP zaman çizelgesi window.__timelines'ta)
export function isHyperframes(file) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  return !/<x-dc[\s>]/.test(src) && /window\.__timelines/.test(src) && /data-composition-id=/.test(src);
}

export function readTimeline(file, fps = FPS) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  if (isHyperframes(file)) {
    const tag = /<[^>]*data-composition-id="([^"]+)"[^>]*>/.exec(src)[0];
    const dur = +/data-duration="([\d.]+)"/.exec(tag)[1];
    const hfps = +(/data-fps="([\d.]+)"/.exec(tag) || [0, fps])[1];
    if (hfps !== fps) throw new Error(file + ': data-fps ' + hfps + ', proje ' + fps + ' fps');
    const id = /data-composition-id="([^"]+)"/.exec(tag)[1];
    const totalMs = Math.round(dur * 1000);
    return { sections: [{ name: id, dur }], totalMs, frames: Math.round((totalMs * fps) / 1000), hyperframes: id };
  }
  const m = /window\.OM_SCENES\s*=\s*'([^']*)'/.exec(src);
  if (!m) throw new Error(file + ': OM_SCENES bulunamadı');
  const sections = JSON.parse(m[1]);
  const totalMs = Math.round(sections.reduce((a, s) => a + s.dur, 0) * 1000);
  return { sections, totalMs, frames: Math.round((totalMs * fps) / 1000) };
}

// World dosyası (scenes.json "world" alanı ya da world/world.json). Yoksa null; band/k1.mask zorunluluğu `manifest validate`te.
export function loadWorld() {
  const rel = typeof MAN.world === 'string' && MAN.world.endsWith('.json') ? MAN.world : 'world/world.json';
  const f = path.join(ROOT, rel);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
}

// Sahne kontrol bildirimi: scenes.json scene.checks + checks/<id>.json (varsa) birleşir.
export function sceneChecks(scene) {
  const out = [...(scene.checks || [])];
  const f = path.join(ROOT, 'checks', scene.id + '.json');
  if (fs.existsSync(f)) {
    const x = JSON.parse(fs.readFileSync(f, 'utf8'));
    out.push(...(Array.isArray(x) ? x : x.checks || []));
  }
  return out;
}

export const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
