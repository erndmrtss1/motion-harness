// lib/qc-common.mjs — QC/ölçüm komutlarının (qc, k1, k6, ours) ortak parçaları:
//   argüman okuma · world çözümü (bant, aksan sınıfları, K1, patlama) · probe alt süreci (`motion-render probe … --eval`).
//
// World çözümü (sözleşme §3): sahne `world` alanı *.json ise o dosya; değilse proje world'ü (scenes.json "world" *.json ya da
// world/world.json). ESKİ BİÇİM (geriye uyum): manifestte world yalnız bir AD ise ("fx-lab") ve world dosyası yoksa kaynak hattın
// gömülü değerlerine düşülür (LEGACY tablosu: bant, K1 eşikleri, zincir türü). Bu yol yalnız göç testinin kaynak manifesti
// değiştirmeden koşması içindir; yeni projede world/world.json zorunludur (bant + k1.mask).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ROOT, MAN, OUT, loadWorld } from './project.mjs';
import { CLASSES, classTest } from './img.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const BIN = path.join(HERE, '..', 'bin', 'motion-render.mjs');
export const PROBE_DIR = path.join(OUT, 'probe');

// ── argümanlar ─────────────────────────────────────────────────────────────
// valued: değer alan bayraklar (konumsal argüman ayıklaması bunlara bakar)
export function cli(argv, valued = []) {
  const V = new Set(valued);
  const argOf = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d; };
  const has = (k) => argv.includes(k);
  const pos = argv.filter((a, i) => !a.startsWith('--') && !V.has(argv[i - 1]));
  return { argv, argOf, has, pos };
}

// ── world ──────────────────────────────────────────────────────────────────
// Kaynak hattın gömülü değerleri (qc BANDS, inkhero eşikleri, grade zinciri türü). Ad → world parçası.
const LEGACY = {
  'desk-paper': { band: [15, 30], grade: { chain: 'dark' } },
  'screen-dark': { band: [12, 22], grade: { chain: 'dark' } },
  'photo-plate': { band: [12, 28], grade: { chain: 'dark' } },
  'light-ui': { band: [30, 55], grade: { chain: 'light' }, burst: { luma: 250, max: 0.35 } },
  'fx-lab': { band: [40, 58], grade: { chain: 'lab' }, k1: { mask: 'ink', selector: '[data-hero]', areaMin: 0.35, heightMin: 0.55, lyricMin: 160 } },
};
// eski ekran world'ü marka önekli adla kayıtlıydı (<önek>-screen) → screen-dark
const legacyKey = (n) => (/^[a-z]+-screen$/.test(n) ? 'screen-dark' : n);
export const isLegacyName = (n) => typeof n === 'string' && !n.endsWith('.json') && !!LEGACY[legacyKey(n)];

const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
let PW;   // proje world'ü (önbellek)
function projectWorld() { if (PW === undefined) PW = loadWorld(); return PW; }

// Sahnenin world'ü: { name, legacy, band, profileBands, k1, classes, accent, grade, burst, camera, … } ya da null.
export function worldFor(S) {
  const sw = S && typeof S.world === 'string' ? S.world : null;
  if (sw && sw.endsWith('.json')) {
    const f = path.resolve(ROOT, sw);
    if (fs.existsSync(f)) return Object.assign({ source: path.relative(ROOT, f).split(path.sep).join('/') }, readJson(f));
  }
  const name = sw || (typeof MAN.world === 'string' && !MAN.world.endsWith('.json') ? MAN.world : null);
  const pw = projectWorld();
  if (pw && !(isLegacyName(name) && pw.name !== name)) return Object.assign({ source: 'world.json' }, pw);
  if (isLegacyName(name)) return Object.assign({ name, legacy: true, source: 'legacy:' + legacyKey(name) }, JSON.parse(JSON.stringify(LEGACY[legacyKey(name)])));
  return pw ? Object.assign({ source: 'world.json' }, pw) : null;
}
export const worldName = (S, W) => (S && typeof S.world === 'string' && !S.world.endsWith('.json') ? S.world : W && W.name) || null;

// Parlaklık bandı: sahne `band` > (profile:"typographic" → world.profileBands.typographic ‖ [6, 14]) > world.band (ZORUNLU).
export function bandFor(S, W) {
  const TYPO = S.profile === 'typographic';
  const band = S.band || (TYPO ? (W && W.profileBands && W.profileBands.typographic) || [6, 14] : W && W.band) || null;
  const nm = worldName(S, W);
  return { band, typo: TYPO, name: S.band || TYPO ? nm + ' tipografik' : nm };
}

// ── aksan sınıfları ────────────────────────────────────────────────────────
// Sınıf tanımı ve derleyici lib/img.mjs'te (renk sınıfı kaydı; world.classes aynı adla üzerine yazar). Varsayılanlar kaynak hattın değerleri:
// signal çekirdeği (#E0202F ≈ 224,32,47: r ≥ 190, g ≤ 60, b ≤ 75, r−g ≥ 150) ve bordo (r ≥ 110, r−g ≥ 70, g/r 0.27–0.45, b/r 0.27–0.50).
export { CLASSES, classTest };
// Sahnenin aksan sınıfı (kota sayımı) + bordo sınıfı: world.classes (yoksa kaynak değerleri), sahne `accent` > world.accent.class > signal.
export function accentFor(S, W) {
  const classes = Object.assign({}, CLASSES, (W && W.classes) || {});
  const name = S.accent || (W && W.accent && W.accent.class) || 'signal';
  if (!classes[name]) throw new Error('aksan sınıfı tanımlı değil: ' + name + ' (world.classes)');
  return { name, spec: classes[name], test: classTest(classes[name]), bordo: classes.bordo ? classTest(classes.bordo) : () => false, classes };
}

// K1: sahne k1 > world.k1 > kaynak değerleri (0.35 / 0.55 / 160 px).
export function k1For(S, W) {
  const wk = (W && W.k1) || {}, sk = S.k1 || {};
  const pick = (k, d) => (sk[k] != null ? sk[k] : wk[k] != null ? wk[k] : d);
  // eski world'de K1 yalnız sahne k1.hero ile açılır (kaynak qc davranışı); world dosyasında k1.mask zorunlu → her sahnede
  const mask = sk.hero || sk.mask || (W && !W.legacy ? wk.mask : null) || null;
  return { mask: mask === 'none' ? null : mask, enabled: !!mask && mask !== 'none' && !!(W && (!W.legacy || W.k1)),
    selector: pick('selector', '[data-hero]'), areaMin: +pick('areaMin', 0.35), heightMin: +pick('heightMin', 0.55), lyricMin: +pick('lyricMin', 160),
    lyricSelector: pick('lyricSelector', '[data-fx=write]'), keys: sk.keys || null };
}

// ── probe alt süreci ───────────────────────────────────────────────────────
// motion-render probe <id> … (paketin kendi harness'i; proje kökü MOTION_PROJECT ile)
export function probe(id, args) {
  return spawnSync(process.execPath, [BIN, 'probe', id, ...args],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20, env: Object.assign({}, process.env, { MOTION_PROJECT: ROOT }) });
}
// Tek kare + sayfada JS değerlendirme. JS bir JSON dizgisi döndürür (kaynak araçlarla aynı: çift JSON çözümü).
export function probeEval(id, frame, js, tmpName, extra = []) {
  fs.mkdirSync(PROBE_DIR, { recursive: true });
  const tmp = path.join(PROBE_DIR, tmpName || '_qc-eval.png');
  const r = probe(id, ['--frame', String(frame), '--out', tmp, '--eval', js, ...extra]);
  fs.rmSync(tmp, { force: true });
  const ln = (r.stdout || '').split('\n').find((l) => l.includes('eval →'));
  let value = null;
  if (ln) value = JSON.parse(JSON.parse(ln.slice(ln.indexOf('→') + 1).trim()));
  return { found: !!ln, value, status: r.status, tail: ((r.stdout || '') + (r.stderr || '')).trim().split('\n').pop() };
}

export const pad5 = (f) => String(f).padStart(5, '0');
