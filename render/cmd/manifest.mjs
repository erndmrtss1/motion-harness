// motion-render manifest — scenes.json (tek kaynak) yardımcıları
//
//   motion-render manifest sync
//       scenes.json → sayfa manifesti (sahne sayfaları JSON okuyamaz, x-import ile yüklenir): window.MOTION_MANIFEST = { <id>: { bg, temp, world: layer } }
//       Dosya: scenes.json `pageManifestFile` (varsayılan motion-manifest.js). Uyum: `pageManifestGlobal` verilmişse aynı nesne o global adla da yazılır.
//       Ayrıca her sahnenin kare sayısını OM_SCENES'ten doğrular (frames alanı ile); uyuşmazlıkta çıkış 2.
//   motion-render manifest validate [--json]
//       scenes.json'ı sözleşme §2'ye, world dosyasını §3'e göre denetler (world: bant ve k1.mask ZORUNLU). Hata → çıkış 3, yalnız uyarı → 0.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, MAN, MANIFEST_PATH, readTimeline } from '../lib/project.mjs';
import { CHAINS } from '../lib/grade.mjs';

const args = process.argv.slice(2), sub = args[0];
if (sub !== 'sync' && sub !== 'validate') { console.error('kullanım: motion-render manifest sync | validate [--json]'); process.exit(2); }
if (!fs.existsSync(MANIFEST_PATH)) { console.error('scenes.json yok: ' + ROOT); process.exit(1); }

if (sub === 'sync') {
  const out = {}, warn = [];
  for (const s of MAN.scenes || []) {
    out[s.id] = { bg: s.bg, temp: s.temp, world: s.layer || {} };
    try { const tl = readTimeline(s.file); if (tl.frames !== s.frames) warn.push(s.id + ': manifest ' + s.frames + ' kare, OM_SCENES ' + tl.frames); } catch (e) { warn.push(s.id + ': ' + e.message); }
  }
  const file = MAN.pageManifestFile || 'motion-manifest.js', G = MAN.pageManifestGlobal;
  if (G && !/^[A-Za-z_$][\w$]*$/.test(G)) { console.error('pageManifestGlobal geçerli bir JS adı değil: ' + G); process.exit(1); }
  const js = '// motion-render manifest sync çıktısı (kaynak scenes.json) — elle düzenleme\nwindow.MOTION_MANIFEST = ' + JSON.stringify(out, null, 1) + ';\n' +
    (G && G !== 'MOTION_MANIFEST' ? 'window.' + G + ' = window.MOTION_MANIFEST;   // uyum (scenes.json pageManifestGlobal)\n' : '');
  const dst = path.resolve(ROOT, file);
  fs.writeFileSync(dst + '.part', js); fs.renameSync(dst + '.part', dst);
  console.log('✓ ' + file + ' · ' + Object.keys(out).length + ' sahne' + (G ? ' · global ' + G : '') + (warn.length ? '\nUYARI:\n  ' + warn.join('\n  ') : ' · kare sayıları OM_SCENES ile aynı'));
  if (warn.length) process.exitCode = 2;
} else {
  // ── şema denetimi ──────────────────────────────────────────────────────
  const E = [], W = [];
  const err = (w, m) => E.push(w + ': ' + m), wrn = (w, m) => W.push(w + ': ' + m);
  const isNum = (v) => typeof v === 'number' && isFinite(v), isInt = (v) => Number.isInteger(v), isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const HEX = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i, MASKS = ['dom', 'ink', 'alpha'], PROFILES = ['full', 'light', 'live'];
  const frac = (w, k, v) => { if (v != null && !(isNum(v) && v > 0 && v <= 1)) err(w, k + ' (0, 1] aralığında sayı olmalı (' + JSON.stringify(v) + ')'); };
  const nums = (w, k, o) => { if (o == null) return; if (!isObj(o)) return err(w, k + ' nesne olmalı'); for (const [kk, v] of Object.entries(o)) if (!isNum(v) && !isObj(v) && !Array.isArray(v) && typeof v !== 'string') err(w, k + '.' + kk + ' sayı olmalı'); };

  // world (§3)
  const worldRel = typeof MAN.world === 'string' && MAN.world.endsWith('.json') ? MAN.world : 'world/world.json';
  if (MAN.world == null) wrn('scenes.json', '"world" alanı yok — varsayılan ' + worldRel);
  else if (typeof MAN.world !== 'string' || !MAN.world.endsWith('.json')) err('scenes.json', '"world" world dosyasının yolu olmalı (…/world.json): ' + JSON.stringify(MAN.world));
  const worldFile = path.join(ROOT, worldRel);
  let world = null;
  if (!fs.existsSync(worldFile)) err(worldRel, 'world dosyası yok (bant ve k1.mask zorunlu)');
  else {
    try { world = JSON.parse(fs.readFileSync(worldFile, 'utf8')); } catch (e) { err(worldRel, 'JSON çözülemedi: ' + e.message); }
  }
  if (world) {
    const w = worldRel;
    if (typeof world.name !== 'string' || !world.name) wrn(w, 'name yok');
    if (world.version != null && typeof world.version !== 'string') wrn(w, 'version dize olmalı');
    if (world.palette != null) { if (!isObj(world.palette)) err(w, 'palette nesne olmalı'); else for (const [k, v] of Object.entries(world.palette)) if (!HEX.test(String(v))) err(w, 'palette.' + k + ' renk (#rrggbb) olmalı: ' + JSON.stringify(v)); }
    if (world.accent != null) {
      if (!isObj(world.accent)) err(w, 'accent nesne olmalı');
      else { if (world.accent.color != null && !HEX.test(String(world.accent.color))) err(w, 'accent.color renk olmalı'); if (world.accent.quotaDefault != null && !(isInt(world.accent.quotaDefault) && world.accent.quotaDefault >= 0)) err(w, 'accent.quotaDefault ≥ 0 tamsayı olmalı'); }
    }
    if (world.fonts != null) { if (!Array.isArray(world.fonts)) err(w, 'fonts dizi olmalı'); else world.fonts.forEach((f, i) => { if (!isObj(f) || typeof f.family !== 'string') err(w, 'fonts[' + i + '].family yok'); else if (f.weights != null && !(Array.isArray(f.weights) && f.weights.every(isInt))) err(w, 'fonts[' + i + '].weights tamsayı dizisi olmalı'); }); }
    // ZORUNLU: bant
    if (world.band == null) err(w, 'band ZORUNLU ([alt, üst] luma %)');
    else if (!(Array.isArray(world.band) && world.band.length === 2 && world.band.every(isNum) && world.band[0] >= 0 && world.band[1] <= 100 && world.band[0] < world.band[1])) err(w, 'band [alt, üst] 0–100 ve alt < üst olmalı: ' + JSON.stringify(world.band));
    // ZORUNLU: K1 maskesi
    if (!isObj(world.k1)) err(w, 'k1 ZORUNLU ({ mask: dom|ink|alpha, … })');
    else {
      if (!MASKS.includes(world.k1.mask)) err(w, 'k1.mask ZORUNLU: dom | ink | alpha (' + JSON.stringify(world.k1.mask) + ')');
      if (world.k1.selector != null && typeof world.k1.selector !== 'string') err(w, 'k1.selector dize olmalı');
      frac(w, 'k1.areaMin', world.k1.areaMin); frac(w, 'k1.heightMin', world.k1.heightMin);
    }
    if (world.edgeDark != null) { if (!isObj(world.edgeDark)) err(w, 'edgeDark nesne olmalı'); else frac(w, 'edgeDark.maxFalloff', world.edgeDark.maxFalloff); }
    if (world.grade != null) {
      if (!isObj(world.grade)) err(w, 'grade nesne olmalı');
      else {
        if (world.grade.chain != null && !(world.grade.chain in CHAINS)) err(w, 'grade.chain: ' + Object.keys(CHAINS).join(' | ') + ' (' + JSON.stringify(world.grade.chain) + ')');
        if (world.grade.params != null && !isObj(world.grade.params)) err(w, 'grade.params nesne olmalı');
      }
    }
    if (world.classes != null) { if (!isObj(world.classes)) err(w, 'classes nesne olmalı'); else for (const [k, v] of Object.entries(world.classes)) nums(w, 'classes.' + k, v); }
    for (const k of ['camera', 'motion', 'supersample']) nums(w, k, world[k]);
    if (world.primitives != null && !(Array.isArray(world.primitives) && world.primitives.every((x) => typeof x === 'string'))) err(w, 'primitives dize dizisi olmalı');
    if (typeof world.lessons === 'string' && !fs.existsSync(path.join(path.dirname(worldFile), world.lessons))) wrn(w, 'lessons dosyası yok: ' + world.lessons);
  }

  // scenes.json kökü (§2)
  const M = 'scenes.json';
  if (MAN.version == null) wrn(M, 'version yok');
  if (MAN.fps == null) wrn(M, 'fps yok — varsayılan 60');
  else if (!(isNum(MAN.fps) && MAN.fps > 0)) err(M, 'fps pozitif sayı olmalı');
  for (const k of ['width', 'height']) if (MAN[k] != null && !(isInt(MAN[k]) && MAN[k] > 0)) err(M, k + ' pozitif tamsayı olmalı');
  if (MAN.profile != null && !PROFILES.includes(MAN.profile)) err(M, 'profile: ' + PROFILES.join(' | ') + ' (' + JSON.stringify(MAN.profile) + ')');
  if (MAN.audio != null) { if (typeof MAN.audio !== 'string') err(M, 'audio dize ya da null olmalı'); else if (!fs.existsSync(path.join(ROOT, MAN.audio))) wrn(M, 'audio dosyası yok: ' + MAN.audio); }
  if (MAN.animatic != null) { if (!isObj(MAN.animatic)) err(M, 'animatic nesne olmalı'); else { frac(M, 'animatic.scale', MAN.animatic.scale); if (MAN.animatic.fps != null && !(isNum(MAN.animatic.fps) && MAN.animatic.fps > 0)) err(M, 'animatic.fps pozitif olmalı'); } }
  if (MAN.gate != null) { if (!isObj(MAN.gate)) err(M, 'gate nesne olmalı'); else if (MAN.gate.taste != null && !(isNum(MAN.gate.taste) && MAN.gate.taste >= 0 && MAN.gate.taste <= 8)) err(M, 'gate.taste 0–8 olmalı'); }
  if (!Array.isArray(MAN.scenes) || !MAN.scenes.length) err(M, 'scenes boş olmayan dizi olmalı');

  // sahneler
  const ids = new Set(), all = new Set((MAN.scenes || []).map((s) => s && s.id));
  for (const [i, s] of (MAN.scenes || []).entries()) {
    const w = 'scenes[' + i + ']' + (s && s.id ? ' ' + s.id : '');
    if (!isObj(s)) { err(w, 'nesne olmalı'); continue; }
    if (typeof s.id !== 'string' || !s.id) err(w, 'id yok');
    else if (ids.has(s.id)) err(w, 'id tekrar ediyor'); else ids.add(s.id);
    if (!(isInt(s.frames) && s.frames > 0)) err(w, 'frames pozitif tamsayı olmalı');
    if (typeof s.file !== 'string' || !s.file) err(w, 'file yok');
    else if (!fs.existsSync(path.join(ROOT, s.file))) err(w, 'sayfa dosyası yok: ' + s.file);
    else { try { const tl = readTimeline(s.file); if (isInt(s.frames) && tl.frames !== s.frames) err(w, 'frames ' + s.frames + ' ≠ OM_SCENES ' + tl.frames + ' (motion-render manifest sync)'); } catch (e) { err(w, e.message); } }
    if (s.tc != null && !/^\d+:\d{2}(\.\d+)?$/.test(String(s.tc))) wrn(w, 'tc biçimi mm:ss.ff olmalı: ' + s.tc);
    if (s.keys != null && !(Array.isArray(s.keys) && s.keys.every((k) => isInt(k) && k >= 0 && (!isInt(s.frames) || k < s.frames)))) err(w, 'keys [0, frames) aralığında tamsayı dizisi olmalı');
    if (s.range != null) {
      if (!(Array.isArray(s.range) && s.range.length === 2 && s.range.every(isInt) && s.range[1] >= s.range[0])) err(w, 'range [a, b] (a ≤ b) tamsayı olmalı');
      else if (isInt(s.frames) && s.range[1] - s.range[0] + 1 !== s.frames) wrn(w, 'range uzunluğu ' + (s.range[1] - s.range[0] + 1) + ' ≠ frames ' + s.frames);
    }
    for (const k of ['blackStart', 'slice']) if (s[k] != null && typeof s[k] !== 'boolean') err(w, k + ' boolean olmalı');
    if (s.layer != null && !isObj(s.layer)) err(w, 'layer nesne olmalı');
    if (s.k1 != null) {
      if (!isObj(s.k1)) err(w, 'k1 nesne olmalı');
      else {
        frac(w, 'k1.areaMin', s.k1.areaMin); frac(w, 'k1.heightMin', s.k1.heightMin);
        if (s.k1.lyricMin != null && !(isNum(s.k1.lyricMin) && s.k1.lyricMin > 0)) err(w, 'k1.lyricMin pozitif sayı olmalı');
        if (s.k1.keys != null && !(Array.isArray(s.k1.keys) && s.k1.keys.every(isInt))) err(w, 'k1.keys tamsayı dizisi olmalı');
      }
    }
    if (s.camAccel != null) { if (!isObj(s.camAccel)) err(w, 'camAccel nesne olmalı'); else for (const k of ['max', 'floor']) if (s.camAccel[k] != null && !isNum(s.camAccel[k])) err(w, 'camAccel.' + k + ' sayı olmalı'); }
    if (s.redQuota != null && !(isInt(s.redQuota) && s.redQuota >= 0)) err(w, 'redQuota ≥ 0 tamsayı olmalı');
    if (s.accent != null) {
      if (typeof s.accent !== 'string') err(w, 'accent sınıf adı (dize) olmalı');
      else if (world && isObj(world.classes) && !(s.accent in world.classes)) err(w, 'accent sınıfı world.classes içinde yok: ' + s.accent);
    }
    for (const k of ['exceptions', 'review']) if (s[k] != null && !isObj(s[k])) err(w, k + ' nesne olmalı');
    if (s.grade != null) {
      if (!isObj(s.grade)) err(w, 'grade nesne olmalı');
      else {
        const fo = s.grade.fadeOut;
        if (fo != null && !(Array.isArray(fo) && fo.length === 2 && fo.every(isInt) && fo[0] < fo[1] && (!isInt(s.frames) || fo[1] <= s.frames))) err(w, 'grade.fadeOut [n0, n1] (n0 < n1 ≤ frames) olmalı');
        if (s.grade.chain != null && !(s.grade.chain in CHAINS)) err(w, 'grade.chain: ' + Object.keys(CHAINS).join(' | '));
      }
    }
    if (s.expoPost != null) { if (!isObj(s.expoPost) || !isNum(s.expoPost.t0) || !(isNum(s.expoPost.dur) && s.expoPost.dur > 0)) err(w, 'expoPost { t0, dur > 0 } olmalı'); else if (s.expoPost.dip != null && !['t0', 'r', 't1', 'd'].every((k) => isNum(s.expoPost.dip[k]))) err(w, 'expoPost.dip { t0, r, t1, d } olmalı'); }
    if (s.chromiumArgs != null && !(Array.isArray(s.chromiumArgs) && s.chromiumArgs.every((x) => typeof x === 'string'))) err(w, 'chromiumArgs dize dizisi olmalı');
    if (s.props != null && !isObj(s.props)) err(w, 'props nesne ya da null olmalı');
    if (s.checks != null) { if (!Array.isArray(s.checks)) err(w, 'checks dizi olmalı'); else s.checks.forEach((c, k) => { if (!isObj(c) || typeof c.type !== 'string') err(w, 'checks[' + k + '].type yok'); }); }
    if (s.hooks != null) { if (!Array.isArray(s.hooks)) err(w, 'hooks dizi olmalı'); else s.hooks.forEach((h) => { if (typeof h !== 'string' || !fs.existsSync(path.join(ROOT, h))) err(w, 'kanca dosyası yok: ' + h); }); }
    if (s.animatic != null) { if (!isObj(s.animatic)) err(w, 'animatic nesne olmalı'); else { frac(w, 'animatic.scale', s.animatic.scale); if (s.animatic.step != null && !(isInt(s.animatic.step) && s.animatic.step >= 1)) err(w, 'animatic.step ≥ 1 tamsayı olmalı'); } }
    if (s.parent != null && !all.has(s.parent)) wrn(w, 'parent manifestte sahne değil: ' + s.parent);
  }

  if (args.includes('--json')) console.log(JSON.stringify({ errors: E, warnings: W }, null, 1));
  else {
    for (const m of E) console.log('✗ ' + m);
    for (const m of W) console.log('! ' + m);
    console.log((E.length ? '✗' : '✓') + ' manifest validate · ' + (MAN.scenes || []).length + ' sahne · world ' + worldRel + ' · hata ' + E.length + ' · uyarı ' + W.length);
  }
  if (E.length) process.exitCode = 3;
}
