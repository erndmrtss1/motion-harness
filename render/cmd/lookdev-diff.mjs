// motion-render lookdev-diff — look-dev yönleri arası ayrışma (RULES YR-3 · reviewer §12 · /motion:gate lookdev)
//
//   motion-render lookdev-diff [--dirs A,B,C | --pages a.dc.html,b.dc.html] [--frames 0,1,2] [--ref <png>[@4x3+30]] [--threshold <t>]
//                              [--out out/review/lookdev-diff.json] [--dump]
//   --pages: look-dev dışı sayfalar (ör. world örneği demo.dc.html); tek sayfada yalnız kutu raporu (iskelet okunabilir mi — K5).
//
// Her yönün look-dev sayfası (LOOK-<Y>.dc.html kökte ya da world/lookdev/<Y>/LOOK-<Y>.dc.html) render ile aynı yoldan açılır; kilit
// karelerde (öncelik: --frames · manifestteki LOOK-<Y> "keys" · sayfa ≤ 5 kare ise hepsi · değilse %15/%50/%85 kareleri):
//   iskelet (UYARI; 1.1.0) — DOM kutuları: önce __boxes(T), yoksa DOM yürüyüşü (boyalı kutular + metin blokları + [data-hero]; [data-doku] ve
//                     tam kare katmanlar hariç) → rol başına 6×4 kaba bölge doluluğu (kahraman · bant · metin · kenar) → 0–10.
//                     Kareler arası ortalama, kare başına değerler raporda. Yön içi çift ≥ eşik → UYARI (reviewer gerekçesi
//                     zorunlu); ISKELET_MOD 'SERT' olursa İHLAL (kapı GEÇMEZ). Skor tek rolden geliyorsa "(tek rol)".
//   palet (UYARI)   — ekran görüntüsünden zemin ΔE2000 + baskın renkler → 0–10. ≥ 3,5 → reviewer'ın gerekçeli incelemesi zorunlu.
//   çekici (UYARI)  — terminal · defter · SaaS · sentez; iki yön aynı çekicide → reviewer gerekçesi zorunlu.
// --ref: önceki proje / örnek kontağı (PNG; @CxR+şerit ile hücrelere bölünür). Yalnız palet uyarısı; iskelet "ölçülemedi" (1.1.0).
// World içi (HK-36): world/world.json origin "library:<ad>" (ya da eski "example:<ad>") → üç yön aynı world'ün uygulamasıdır; palet ve çekici
//   uyarıları bilgi olur (sayılmaz), iskelet uyarısı sürer. Satır "world içi (<ad>) · …" ile başlar.
// --threshold yalnız sıkılaştırır (paket eşiğinden düşük); scenes.json "gate.lookdevSkel" de aynı.
// Çıktı: <out>.json + .md; KARAR satırı parçası "iskelet: A↔B a, … (eşik t) · palet: … · ihlal n". Çıkış: 0 ihlal yok · 3 ihlal · 2 kullanım/sayfa yok.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, FPS, MAN, loadWorld } from '../lib/project.mjs';
import { withPage, STAGE } from '../lib/page.mjs';
import { loadImage, features, paletSets, pageBoxes, topBoxes, skelSets, attractorLevel, refCells, ISKELET_ESIK, ISKELET_MOD, PALET, VERSION } from '../lib/lookdev-diff.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 && args[i + 1] != null ? args[i + 1] : d; };
const t0 = Date.now();

const PAGES = opt('--pages', null)?.split(',').map((s) => s.trim()).filter(Boolean);
const pageOf = PAGES ? Object.fromEntries(PAGES.map((f) => [path.basename(f).replace(/\.dc\.html$/, ''), f])) : null;
function findPage(Y) {
  if (pageOf) return pageOf[Y] && fs.existsSync(path.resolve(ROOT, pageOf[Y])) ? pageOf[Y] : null;
  for (const c of [`LOOK-${Y}.dc.html`, `world/lookdev/${Y}/LOOK-${Y}.dc.html`, `world/lookdev/${Y.toLowerCase()}/LOOK-${Y}.dc.html`]) if (fs.existsSync(path.join(ROOT, c))) return c;
  return null;
}
let dirs = pageOf ? Object.keys(pageOf) : opt('--dirs', null)?.split(',').map((s) => s.trim()).filter(Boolean);
if (!dirs) dirs = ['A', 'B', 'C', 'D', 'E', 'F'].filter(findPage);
if (dirs.length < (pageOf ? 1 : 2)) { console.error('lookdev-diff: en az iki yön sayfası gerekli (LOOK-<Y>.dc.html ya da world/lookdev/<Y>/LOOK-<Y>.dc.html) · bulunan: ' + (dirs.join(',') || 'yok')); process.exit(2); }
const missing = dirs.filter((Y) => !findPage(Y));
if (missing.length) { console.error('lookdev-diff: sayfa yok: ' + missing.join(', ')); process.exit(2); }
const projT = (() => { const g = (MAN && MAN.gate) || {}; return typeof g.lookdevSkel === 'number' ? g.lookdevSkel : Infinity; })();
const T = Math.min(ISKELET_ESIK, projT, +opt('--threshold', Infinity));
const WORLD_ICI = (() => { try { const o = String((loadWorld() || {}).origin || ''); const m = /^(?:library|example):(.+)$/.exec(o); return m ? m[1] : null; } catch { return null; } })();
const fArg = opt('--frames', null)?.split(',').map((x) => +x.replace(/^K/i, '') - (/^K/i.test(x) ? 1 : 0));

// ── yönleri oku ──
const D = {};
for (const Y of dirs) {
  const file = findPage(Y);
  await withPage({ id: 'LOOK-' + Y, file }, { warm: false }, async (page, api) => {
    const n = api.frames, man = (MAN.scenes || []).find((s) => s.id === 'LOOK-' + Y), keys = man && Array.isArray(man.keys) && man.keys.length ? man.keys.filter((k) => k < n) : null;
    const frames = fArg || keys || (n <= 5 ? [...Array(n).keys()] : [0.15, 0.5, 0.85].map((q) => Math.min(n - 1, Math.round(q * (n - 1)))));
    const per = [];
    for (const fi of frames) {
      const png = await api.shot(fi);
      const raw = await api.eval(pageBoxes, { stage: STAGE, W: 1920, H: 1080, t: fi / FPS });
      per.push({ frame: fi, src: raw.src, raw: raw.boxes, boxes: topBoxes(raw.boxes), pal: features(await loadImage(png)) });
    }
    D[Y] = { file, frames, per, log: api.log.filter((l) => /PAGEERROR|console\.error/.test(l)).slice(0, 5) };
  });
}
const empty = dirs.filter((Y) => D[Y].per.every((p) => p.boxes.length === 0));

// ── çiftler ──
const pairs = [];
for (let i = 0; i < dirs.length; i++) for (let j = i + 1; j < dirs.length; j++) {
  const a = D[dirs[i]], b = D[dirs[j]];
  const sk = skelSets(a.per.map((p) => p.boxes), b.per.map((p) => p.boxes)), pl = paletSets(a.per.map((p) => p.pal), b.per.map((p) => p.pal));
  const ust = sk.score != null && sk.score >= T;
  pairs.push({ a: dirs[i], b: dirs[j], iskelet: sk.score, iskeletKare: sk.frames, iskeletRol: sk.parts, tekRol: sk.tekRol, palet: pl.score, zeminDE: pl.dEbg, paletDE: pl.palDE, gren: pl.grain,
    ihlal: ISKELET_MOD === 'SERT' && ust, iskeletUyari: ISKELET_MOD === 'UYARI' && ust, uyari: !WORLD_ICI && pl.score >= PALET.uyari, paletBilgi: !!WORLD_ICI && pl.score >= PALET.uyari });
}
// ── çekiciler ──
const att = {};
for (const Y of dirs) { const s = {}; for (const p of D[Y].per) for (const [k, v] of Object.entries(p.pal.attractors)) s[k] = (s[k] || 0) + v / D[Y].per.length; att[Y] = s; }
const cekici = [];
for (const k of ['terminal', 'defter', 'saas', 'sentez']) { const ys = dirs.filter((Y) => att[Y][k] >= 0.45); if (ys.length >= 2) cekici.push({ cekici: k, yonler: ys }); }
// ── kaynak/örnek referansı (yalnız palet) ──
const ref = [];
const refArg = opt('--ref', null);
if (refArg) {
  const m = /^(.*?)(?:@(\d+)x(\d+)(?:\+(\d+))?)?$/.exec(refArg), file = path.resolve(m[1]);
  const cells = await refCells(file, m[2] ? [+m[2], +m[3]] : [1, 1], +(m[4] || 0));
  const F = []; for (const reg of cells) F.push(features(await loadImage(file, { region: reg })));
  for (const Y of dirs) {
    let best = null; F.forEach((c, ci) => { const r = paletSets(D[Y].per.map((p) => p.pal), [c]); if (!best || r.score > best.score) best = { ...r, cell: ci + 1 }; });
    ref.push({ yon: Y, palet: best.score, hucre: best.cell, zeminDE: best.dEbg, paletDE: best.palDE, iskelet: 'ölçülemedi', uyari: best.score >= PALET.uyari });
  }
}

const ihlal = pairs.filter((p) => p.ihlal).length;
const uyari = pairs.filter((p) => p.uyari || p.iskeletUyari).length + ref.filter((r) => r.uyari).length + (WORLD_ICI ? 0 : cekici.length);
const f1 = (v) => String(v).replace('.', ',');
const line = (WORLD_ICI ? `world içi (${WORLD_ICI}; palet/çekici bilgi) · ` : '') + `iskelet (${ISKELET_MOD}): ` + pairs.map((p) => `${p.a}↔${p.b} ${p.iskelet == null ? 'ölçülemedi' : f1(p.iskelet)}${p.tekRol ? ' (tek rol)' : ''}`).join(', ') + ` (eşik ${f1(T)}) · palet: ` + pairs.map((p) => `${p.a}↔${p.b} ${f1(p.palet)}`).join(', ')
  + (ref.length ? ' · kaynağa palet: ' + ref.map((r) => `${r.yon} ${f1(r.palet)}`).join(', ') : '') + ` · ihlal ${ihlal} · uyarı ${uyari}`;
const out = {
  tool: 'motion-render lookdev-diff', version: VERSION, worldIci: WORLD_ICI, date: new Date().toISOString(), root: ROOT, esik: T, iskeletMod: ISKELET_MOD, paletUyari: PALET.uyari,
  yonler: Object.fromEntries(dirs.map((Y) => [Y, { file: D[Y].file, frames: D[Y].frames, kaynak: [...new Set(D[Y].per.map((p) => p.src))], kutu: D[Y].per.map((p) => p.boxes.length),
    cekici: Object.fromEntries(Object.entries(att[Y]).map(([k, v]) => [k, attractorLevel(v)])), hatalar: D[Y].log,
    ...(args.includes('--dump') ? { kare: D[Y].per.map((p) => ({ frame: p.frame, boxes: p.boxes, pal: { bg: p.pal.bg, bgCov: p.pal.bgCov, palette: p.pal.palette, grain: p.pal.grain } })) } : {}) }])),
  ciftler: pairs, cekici, kaynaga: ref, ihlal, uyari, iskeletOlculemedi: empty, line, sureMs: Date.now() - t0,
};
const outF = path.resolve(ROOT, opt('--out', 'out/review/lookdev-diff.json'));
fs.mkdirSync(path.dirname(outF), { recursive: true });
fs.writeFileSync(outF, JSON.stringify(out, null, 1));
const md = ['# lookdev-diff', '', '`' + line + '`', '',
  `| çift | iskelet (${ISKELET_MOD}) | kare başına | palet (UYARI) | zemin ΔE | palet ΔE | sonuç |`, '|---|---:|---|---:|---:|---:|---|',
  ...pairs.map((p) => `| ${p.a}↔${p.b} | ${p.iskelet == null ? 'ölçülemedi' : f1(p.iskelet)}${p.tekRol ? ' (tek rol)' : ''} | ${p.iskeletKare.map(f1).join(' / ')} | ${f1(p.palet)} | ${p.zeminDE == null ? '—' : f1(p.zeminDE)} | ${f1(p.paletDE)} | ${[p.ihlal ? '**İHLAL** (aynı iskelet)' : '', p.iskeletUyari ? 'uyarı (iskelet)' : '', p.uyari ? 'uyarı (palet)' : '', p.paletBilgi ? 'bilgi (palet, world içi)' : ''].filter(Boolean).join(' · ') || '—'} |`),
  ...(ref.length ? ['', '| yön → kaynak | palet | hücre | iskelet | sonuç |', '|---|---:|---:|---|---|', ...ref.map((r) => `| ${r.yon} | ${f1(r.palet)} | ${r.hucre} | ölçülemedi | ${r.uyari ? 'uyarı' : '—'} |`)] : []),
  '', 'çekici: ' + dirs.map((Y) => Y + ' ' + Object.entries(out.yonler[Y].cekici).filter(([, v]) => v !== 'yok').map(([k, v]) => k + ' ' + v).join('/') || Y + ' —').join(' · ')
    + (cekici.length ? (WORLD_ICI ? ' · aynı çekici (bilgi, world içi): ' : ' · **iki yön aynı çekicide:** ') + cekici.map((c) => c.cekici + ' (' + c.yonler.join(', ') + ')').join('; ') : ''),
  ...(empty.length ? ['', '**iskelet ölçülemedi:** ' + empty.join(', ') + ' (sayfada anlamlı kutu yok; __boxes ya da [data-hero] ekle)'] : []),
  '', `kutu kaynağı: ${dirs.map((Y) => Y + ' ' + out.yonler[Y].kaynak.join('/')).join(' · ')} · süre ${(out.sureMs / 1000).toFixed(1)} s`].join('\n');
fs.writeFileSync(outF.replace(/\.json$/, '') + '.md', md + '\n');
console.log(md);
process.exitCode = ihlal ? 3 : 0;
