// lib/grade.mjs — grade zinciri (kaynak hattın grade-encode zinciri; sayılar ve süzgeç sırası birebir) + zincir çözümü.
//
// Yerleşik zincirler (sıra bağlayıcı: curves → colorbalance → vignette → colorlevels siyah noktası):
//   dark  (varsayılan)  curves hafif S · colorbalance (gölge mavi +0.04, parlak sıcak) · vignette 0.72 (siyah noktasından ÖNCE) · siyah #0A0908
//   light               yumuşak curves (beyaz 251) · hafif sıcak parlak · vignette 0.4 · siyah noktası YOK (grade.blackPoint → film siyahı #0A0908)
//   lab                 açık laboratuvar: vinyet yok (ışık düşümü sahnede) · sıcak parlak yok · nötr-soğuk siyah 8/9/10
//   none                grade yok (ffmpeg `null` süzgeci)
// Saf kareler: colorbalance ve siyah noktası yalnız `keep` karelerinde (ilk kare blackStart ise ve son `pure` kare saf kalır; vinyet/curves her karede).
//
// Zincir seçimi (yüksekten düşüğe): sahne grade.chain → world.json grade.chain → sahnenin world adı (WORLD_CHAIN eşlemi ya da doğrudan zincir adı) → dark.
// Parametreler: yerleşik zincir ← world.json grade.params (aynı zincirse) ← sahne grade.params. Alanlar: curves (dize), colorbalance (dize),
//   vignette (açı | null), black ([r,g,b] 0–255 | null), pureSec (saf kuyruk, s).
import { FPS, loadWorld } from './project.mjs';

const BLACK = [10, 9, 8];   // film siyahı #0A0908
export const CHAINS = {
  dark: { curves: '0/0 0.25/0.2382 0.5/0.5078 0.75/0.7422 1/1', colorbalance: 'bs=0.04:rh=0.03:bh=-0.04', vignette: 0.72, black: BLACK },
  light: { curves: '0/0 0.25/0.2450 0.5/0.5030 0.75/0.7520 1/0.985', colorbalance: 'rh=0.015:bh=-0.015', vignette: 0.4, black: null },
  lab: { curves: '0/0 0.25/0.2430 0.5/0.5040 0.75/0.7500 1/0.990', colorbalance: 'bs=0.015:bh=0.008', vignette: null, black: [8, 9, 10] },
  none: null,
};
// Kaynak hattın world adları → yerleşik zincir (listede olmayan her ad koyu zincire düşer, kaynakla aynı)
export const WORLD_CHAIN = { 'fx-lab': 'lab', 'light-ui': 'light' };
// Saf kuyruk: kaynakta 12 kare sabitti (30 fps tabanı; 60 fps'te 0.2 s'ye düşüyordu) → 0.4 s, fps ile ölçekli (= 12·KF)
export const PURE_SEC = 0.4;

let WORLD;
const world = () => (WORLD === undefined ? (WORLD = loadWorld()) : WORLD);

// Sahne/world için zincir adı ve parametreleri
export function chainSpec(worldName, g = {}) {
  const wg = (world() && world().grade) || {};
  const name = g.chain || wg.chain || WORLD_CHAIN[worldName] || (worldName in CHAINS ? worldName : 'dark');
  if (!(name in CHAINS)) throw new Error('bilinmeyen grade zinciri: ' + name + ' (dark | light | lab | none)');
  if (CHAINS[name] === null) return { name, spec: null };
  const spec = Object.assign({ pureSec: PURE_SEC }, CHAINS[name], !wg.chain || wg.chain === name ? wg.params : null, g.params);
  return { name, spec };
}

// Saf kuyruk kare sayısı (fps: kodlanan dizinin kare hızı; animatikte FPS/2)
export function pureFrames(fps = FPS, worldName, g = {}) {
  const { spec } = chainSpec(worldName, g);
  return Math.round((spec ? spec.pureSec : PURE_SEC) * fps);
}

// gradeChain(world, frames, head, pure, opts) — kaynak imzası. opts = sahne grade nesnesi: blackPoint (aydınlık zincire film siyahı),
// pureOnly (renk dengesi + siyah noktası yok: saf dal), chain/params (geçersiz kılma).
export function gradeChain(worldName, frames, head, pure, opts = {}) {
  const { spec } = chainSpec(worldName, opts);
  if (!spec) return 'null';
  if (pure == null) pure = Math.round(spec.pureSec * FPS);
  const keep = frames ? "enable='" + (head ? 'gte(n,' + head + ')*' : '') + 'lt(n,' + (frames - pure) + ")'" : null;
  const en = (f) => (opts.pureOnly ? null : keep ? f + ':' + keep : f);   // pureOnly → renk dengesi + siyah noktası yok (saf dal)
  const lv = (c) => 'colorlevels=romin=' + (c[0] / 255).toFixed(5) + ':gomin=' + (c[1] / 255).toFixed(5) + ':bomin=' + (c[2] / 255).toFixed(5);
  const black = spec.black || (opts.blackPoint ? (Array.isArray(opts.blackPoint) ? opts.blackPoint : BLACK) : null);
  return [
    spec.curves ? "curves=all='" + spec.curves + "'" : null,
    spec.colorbalance ? en('colorbalance=' + spec.colorbalance) : null,
    spec.vignette != null && spec.vignette !== false ? 'vignette=angle=' + spec.vignette : null,
    black ? en(lv(black)) : null,
  ].filter(Boolean).join(',');
}

// Sahnenin grade vf'i (TO709 hariç) — grade ve master aynı dizeyi kurar.
//   fadeOut [n0, n1]: tam grade → saf grade kare kare (N ile blend); animatikte n0/n1 yarıya.
//   değilse gradeChain(world, n, head, slice ? 0 : saf kuyruk)
export function sceneVf(s, { frames, anim = false } = {}) {
  const g = s.grade || {}, head = s.blackStart ? 1 : 0, FO = g.fadeOut, fo = FO ? FO.map((v) => (anim ? Math.round(v / 2) : v)) : null;
  if (fo) {
    const K = 'clip((N-' + fo[0] + ')/' + Math.max(1, fo[1] - fo[0]) + ',0,1)';
    return 'split[ga][gb];[ga]' + gradeChain(s.world, null, 0, 0, g) + '[gf];[gb]' + gradeChain(s.world, null, 0, 0, Object.assign({}, g, { pureOnly: true })) +
      "[gp];[gf][gp]blend=all_expr='A*(1-" + K + ')+B*' + K + "':enable='gte(n," + fo[0] + ")'";
  }
  const n = frames != null ? frames : s.frames;
  return gradeChain(s.world, n, head, s.slice ? 0 : pureFrames(anim ? FPS / 2 : FPS, s.world, g), g);   // slice (perde kesiti): sonu sahne sonu değil, saf siyah yok
}
