// lib/audio-shots.mjs — `motion-render beats shots`: shot listesi (script/shots.src.json) + kelime zamanları + kesmeler → scenes.json sahne kaydı
// (yalnız shots + frames güncellenir) + sahne sayfalarının yüklediği JS (window.<global> = {id, frames, shots}).
// Kesme: shot sınırı = son cümlesinin BEATS kesme TC'si (ölçülen sessizliğin ortası); durak yoksa iki kelime arası orta nokta. Kare = round(t · FPS).
// Lyric: w → cümle aralığındaki kelimeler sırayla eşleşir (dil küçük harfi, noktalama yok); kelime t0/t1 ve kare. etiket/formül/işaret: at kelimesinin anı.
// Zaman alanları (domains): her alan {name, words, beats, from?, dur?}; shot n ≥ from olan son alan seçilir (ör. eski perdeler tasarım
// zamanında, yeni perdeler doğrudan yeni ses zamanında). Film süresi = son alanın süresi. amap verilirse tasarım alanındaki shot'lara ses
// zamanı alanları (a0/a1/af0/af1, lyric at0/at1) eşlemle eklenir; ses alanındaki shot'larda a* = t*.
// Yapılandırma: shots.src.json üst alanları (scene, domains, amap, js) ya da --config <json> (üstüne yazar) ya da CLI (--scene, --words, --beats, --js, --global, --amap, --d2a).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT, FPS, MANIFEST_PATH } from './project.mjs';
import { normWord, put } from './audio-core.mjs';

export async function runShots(args) {
  const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; }, has = (k) => args.includes('--' + k);
  const P = (f) => path.resolve(ROOT, f), J = (f) => JSON.parse(fs.readFileSync(P(f), 'utf8')), rel = (f) => path.relative(ROOT, P(f)).split(path.sep).join('/');
  const SRCF = opt('src', 'script/shots.src.json');
  if (!fs.existsSync(P(SRCF))) { console.error('shot kaynağı yok: ' + SRCF); process.exit(1); }
  const SRC = J(SRCF), CFG = Object.assign({}, SRC, opt('config', null) ? J(opt('config')) : {});
  const LANG = opt('lang', CFG.lang || 'tr'), SCENE = opt('scene', CFG.scene || null);
  if (!SCENE) { console.error('sahne kimliği yok: shots.src.json "scene" ya da --scene <id>'); process.exit(2); }
  let doms = CFG.domains;
  if (opt('words', null) || !doms) {
    if (!opt('words', null)) { console.error('zaman alanı yok: shots.src.json "domains" ya da --words <w.json> --beats <beats.json>'); process.exit(2); }
    doms = [{ name: opt('time', 'A'), words: opt('words'), beats: opt('beats', 'script/beats.json') }];
  }
  const D = doms.map((d) => { const w = J(d.words); return { name: d.name, from: d.from || 0, W: w.words, S: J(d.beats).sentences, dur: d.dur != null ? d.dur : w.meta.duration }; });
  const dom = (n) => { let x = D[0]; for (const d of D) if (n >= d.from) x = d; return x; };
  const LAST = D[D.length - 1], DUR = LAST.dur, N = Math.round(DUR * FPS);
  const norm = (s) => normWord(s, LANG);
  const wordsOf = (d, k) => d.W.filter((w) => w.t0 >= d.S[k - 1].t0 - 0.01 && w.t1 <= d.S[k - 1].t1 + 0.01);
  const cutAfter = (d, k) => { const s = d.S[k - 1]; if (k >= d.S.length) return d.dur; if (s.cut != null) return s.cut; return +((s.t1 + d.S[k].t0) / 2).toFixed(2); };
  const FIELDS = CFG.shotFields || ['is', 'pattern', 'layer', 'hf'];
  const warn = [];
  const shots = SRC.shots.map((sh, i) => {
    const d = dom(sh.n), last = sh.sent[sh.sent.length - 1], t0 = i === 0 ? 0 : cutAfter(d, SRC.shots[i - 1].sent[SRC.shots[i - 1].sent.length - 1]), t1 = cutAfter(d, last);
    const pool = sh.sent.flatMap((k) => wordsOf(d, k)); let p = 0;
    const lyric = (sh.lyric || []).map((L) => {
      const keys = L.w || L.at || []; const hit = [];
      for (const k of keys) { const j = pool.findIndex((w, q) => q >= p && norm(w.w) === norm(k)); if (j < 0) { warn.push('S' + sh.n + ': "' + k + '" bulunamadı'); continue; } hit.push(pool[j]); p = j + 1; }
      const o = { text: L.text, kind: L.kind || 'lyric' };
      if (hit.length) { o.t0 = hit[0].t0; o.t1 = hit[hit.length - 1].t1; o.f0 = Math.round(hit[0].t0 * FPS); o.f1 = Math.round(hit[hit.length - 1].t1 * FPS); o.words = hit.map((w) => w.i); }
      for (const k of ['red', 'strike', 'note', 'at0']) if (L[k] != null) o[k] = L[k];
      return o;
    });
    const rec = { id: 'S' + String(sh.n).padStart(2, '0'), n: sh.n, tcList: sh.tc, t0, t1, f0: Math.round(t0 * FPS), f1: Math.round(t1 * FPS) - 1, time: d.name, sent: sh.sent };
    rec.is = sh.is; rec.lyric = lyric; for (const k of FIELDS) if (k !== 'is') rec[k] = sh[k];
    return rec;
  });
  // ses eşlemi: tasarım alanındaki shot'lara ses zamanı alanları (t0/t1/f0/f1 tasarım zamanında kalır)
  const AM = opt('amap', CFG.amap && CFG.amap.js) || null;
  if (AM && fs.existsSync(P(AM))) {
    const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(P(AM), 'utf8'), ctx);
    const d2a = ctx.window[opt('d2a', (CFG.amap && CFG.amap.d2a) || 'motionD2A')], audioDom = (CFG.amap && CFG.amap.audioDomain) || LAST.name;
    if (typeof d2a !== 'function') { console.error('eşlem işlevi yok: ' + AM + ' (--d2a <ad>)'); process.exit(1); }
    shots.forEach((sh) => {
      if (sh.time === audioDom && D.length > 1) { sh.a0 = sh.t0; sh.a1 = sh.t1; sh.af0 = sh.f0; sh.af1 = sh.f1; sh.lyric.forEach((l) => { if (l.t0 != null) { l.at0 = l.t0; l.at1 = l.t1; } }); return; }   // zaten ses zamanı
      sh.a0 = +d2a(sh.t0).toFixed(4); sh.a1 = +d2a(sh.t1).toFixed(4); sh.af0 = Math.round(sh.a0 * FPS); sh.af1 = Math.round(sh.a1 * FPS) - 1; sh.lyric.forEach((l) => { if (l.t0 != null) { l.at0 = +d2a(l.t0).toFixed(3); l.at1 = +d2a(l.t1).toFixed(3); } });
    });
  }
  const man = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const old = (man.scenes || []).find((s) => s.id === SCENE);   // kayıt varsa yalnız shots + frames güncellenir (inceleme, not, anahtar korunur; sıra korunur)
  if (old) { old.shots = shots; old.frames = N; } else man.scenes = (man.scenes || []).concat([{ id: SCENE, file: SCENE + '.dc.html', tc: '00:00.0', frames: N, shots }]);
  const gaps = shots.slice(1).filter((s, i) => s.f0 !== shots[i].f1 + 1).map((s) => s.id);
  console.log(SCENE + ' · ' + shots.length + ' shot · ' + N + ' kare · lyric ' + shots.reduce((a, s) => a + s.lyric.length, 0) + (warn.length ? ' · UYARI: ' + warn.join('; ') : '') + (gaps.length ? ' · boşluk/çakışma: ' + gaps.join(',') : ' · kesintisiz'));
  const JS = opt('js', (CFG.js && CFG.js.file) || 'script/' + SCENE.toLowerCase().replace(/[^a-z0-9]+/g, '') + '-shots.js'), GL = opt('global', (CFG.js && CFG.js.global) || 'MOTION_SHOTS');
  if (!has('dry')) {
    put(MANIFEST_PATH, JSON.stringify(man, null, 1) + '\n');
    put(P(JS), '// ' + rel(JS) + ' — motion-render beats shots üretir, elle düzenlenmez (kaynak ' + rel(SRCF) + ')\nwindow.' + GL + ' = ' + JSON.stringify({ id: SCENE, frames: N, shots }) + ';\n');   // sahne sayfaları JSON okuyamaz: x-import ile yüklenir
    console.log('✓ scenes.json · ' + rel(JS));
  } else console.log('(dry) yazılmadı: scenes.json · ' + rel(JS));
  return { shots, frames: N };
}
