// motion-render beats — vuruş haritası: seslendirme + kelime zamanları → script/BEATS.md + script/beats.json
//   motion-render beats <ses> [--words script/<ad>.words.json] [--min-pause 0.25] [--out script/BEATS.md] [--lang tr]
//   motion-render beats shots [--src script/shots.src.json] [--dry]          (shot listesi → scenes.json + sahne JS'i)
// Yollar proje köküne göredir (kaynak hatta cwd'ye göreydi).
// 1. Ses ffmpeg ile 16 kHz mono f32'ye çözülür; 10 ms pencerede RMS (dBFS).
// 2. Sessizlik: RMS < eşik (gürültü tabanı = %10'luk dilim + 6 dB, en az −50 dBFS) kesintisiz ≥ --min-pause → durak.
// 3. Cümle: kelime sonu . ! ? … ile biter; TC aralığı = ilk kelime t0 → son kelime t1. Whisper kelime sınırları sessizliğe ±0.2–0.5 s taşar:
//    sınır durağı = [t1 − 0.6, sonraki t0 + 0.6] ile kesişen en uzun ölçülen sessizlik; KESME TC = o sessizliğin ortası (ses yönetir).
// 4. Kelime vurgusu: kelimenin RMS'i (dB, ortalama + tepe) cümle içi z-skoru · uzama (süre / hece beklentisi) · ardından durak → puan; ilk 25 aday.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/project.mjs';
import { SR, HOP, decodePcm, rmsDb, slugOf, tc, put } from '../lib/audio-core.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const P = (f) => path.resolve(ROOT, f);

if (args[0] === 'shots') {
  await import('../lib/audio-shots.mjs').then((m) => m.runShots(args.slice(1)));
} else {
  const AUDIO = args[0] && !args[0].startsWith('--') ? args[0] : null;
  if (!AUDIO) { console.error('kullanım: motion-render beats <ses> [--words script/<ad>.words.json] [--min-pause 0.25] [--out script/BEATS.md] · beats shots [--dry]'); process.exit(2); }
  const WORDS = P(opt('words', 'script/' + slugOf(AUDIO) + '.words.json')), MINP = +opt('min-pause', 0.25), OUT = P(opt('out', 'script/BEATS.md')), LANG = opt('lang', 'tr');
  if (!fs.existsSync(P(AUDIO))) { console.error('ses yok: ' + AUDIO); process.exit(1); }
  if (!fs.existsSync(WORDS)) { console.error('kelime dosyası yok: ' + path.relative(ROOT, WORDS) + ' (önce motion-render transcribe, ya da --words)'); process.exit(1); }
  const pcm = decodePcm(P(AUDIO)), dur = pcm.length / SR, db = rmsDb(pcm), N = db.length;
  const sorted = Array.from(db).sort((a, b) => a - b), floor = sorted[Math.floor(N * 0.1)], TH = Math.max(-50, floor + 6);
  // duraklar
  const pauses = []; let st = -1;
  for (let i = 0; i <= N; i++) { const sil = i < N && db[i] < TH; if (sil && st < 0) st = i; if (!sil && st >= 0) { const a = st * HOP / SR, b = i * HOP / SR; if (b - a >= MINP) pauses.push([+a.toFixed(3), +b.toFixed(3)]); st = -1; } }
  const J = JSON.parse(fs.readFileSync(WORDS, 'utf8')), W = J.words;
  const rms = (t0, t1) => { const a = Math.max(0, Math.floor(t0 * SR / HOP)), b = Math.min(N, Math.max(a + 1, Math.ceil(t1 * SR / HOP))); let s = 0, mx = -200; for (let i = a; i < b; i++) { s += db[i]; if (db[i] > mx) mx = db[i]; } return [s / (b - a), mx]; };
  const pauseAfter = (t) => { const p = pauses.find((x) => x[1] >= t - 0.1 && x[0] <= t + 0.45); return p ? +(p[1] - p[0]).toFixed(3) : 0; };
  // cümleler
  const sents = []; let cur = [];
  W.forEach((w, i) => { cur.push(w); if (/[.!?…]["”’)]*$/.test(w.w) || i === W.length - 1) { sents.push(cur); cur = []; } });
  const vowels = (s) => (s.toLocaleLowerCase(LANG).match(/[aeıioöuüâîû]/g) || []).length || 1;
  const S = sents.map((ws, k) => {
    const t0 = ws[0].t0, t1 = ws[ws.length - 1].t1, next = sents[k + 1] ? sents[k + 1][0].t0 : dur;
    const cand0 = pauses.filter((p) => p[1] >= t1 - 0.6 && p[0] <= next + 0.6), bp = cand0.sort((x, y) => (y[1] - y[0]) - (x[1] - x[0]))[0] || null, gapP = bp ? bp[1] - bp[0] : 0;
    const inner = pauses.filter((p) => p !== bp && p[0] > t0 + 0.15 && p[1] < t1 - 0.15).map((p) => { const w = ws.filter((x) => x.t1 <= p[0] + 0.45).pop(); return { at: p[0], ms: Math.round((p[1] - p[0]) * 1000), after: w ? w.w : '' }; });
    const e = ws.map((w) => { const [m, pk] = rms(w.t0, w.t1); return { w, m, pk, stretch: (w.t1 - w.t0) / (0.11 * vowels(w.w) + 0.06) }; });
    const mu = e.reduce((a, x) => a + x.m, 0) / e.length, sd = Math.sqrt(e.reduce((a, x) => a + (x.m - mu) ** 2, 0) / e.length) || 1;
    e.forEach((x) => { x.z = (x.m - mu) / sd; x.after = pauseAfter(x.w.t1); x.score = +(x.z + 0.8 * Math.max(0, x.stretch - 1) + 2.5 * Math.min(0.8, x.after)).toFixed(2); });
    return { n: k + 1, t0, t1, d: +(t1 - t0).toFixed(2), gap: +(Math.max(0, next - t1)).toFixed(2), sil: +gapP.toFixed(2), cut: bp ? +((bp[0] + bp[1]) / 2).toFixed(2) : null, inner, text: ws.map((w) => w.w).join(' '), e };
  });
  const cand = S.flatMap((s) => s.e.filter((x) => x.w.w.replace(/[^\p{L}\p{N}]/gu, '').length > 2).map((x) => ({ s: s.n, w: x.w.w, t0: x.w.t0, t1: x.w.t1, z: +x.z.toFixed(2), stretch: +x.stretch.toFixed(2), after: x.after, score: x.score, p: x.w.p })))
    .sort((a, b) => b.score - a.score).slice(0, 25);
  const md = ['# BEATS — vuruş haritası (seslendirme)', '', '`motion-render beats` · ses `' + AUDIO.replace(/\\/g, '/') + '` · ' + dur.toFixed(2) + ' s · kelime ' + W.length + ' · cümle ' + S.length + ' · durak (≥ ' + MINP * 1000 + ' ms) ' + pauses.length +
    ' · sessizlik eşiği ' + TH.toFixed(1) + ' dBFS (taban %10 ' + floor.toFixed(1) + ' + 6)', '',
    '## Cümleler', '', 'Kesme TC = cümle sınırındaki ölçülen sessizliğin ortası (ses yönetir). Kelime zamanları Whisper\'dan (±0.2 s); kesme ve vuruş ölçülen durağa kilitlenir.', '',
    '| # | TC aralığı (kelime) | süre | ardındaki durak (ölçülen) | kesme TC | cümle içi duraklar | metin |', '|---|---|---|---|---|---|---|',
    ...S.map((s) => '| ' + s.n + ' | ' + tc(s.t0) + '–' + tc(s.t1) + ' | ' + s.d.toFixed(2) + ' s | ' + (s.sil ? Math.round(s.sil * 1000) + ' ms' : '—') + ' | ' + (s.cut != null ? tc(s.cut) : '—') + ' | ' + (s.inner.length ? s.inner.map((x) => '"' + x.after + '" ' + tc(x.at) + ' (' + x.ms + ' ms)').join(' · ') : '—') + ' | ' + s.text + ' |'), '',
    '## Duraklar (≥ ' + MINP * 1000 + ' ms)', '', pauses.map((p) => tc(p[0]) + ' (' + Math.round((p[1] - p[0]) * 1000) + ' ms)').join(' · '), '',
    '## Vurgu adayları (kelime düzeyi enerji; ilk 25)', '', 'Puan = cümle içi RMS z-skoru + 0.8 × uzama fazlası + 2.5 × ardındaki durak (≤ 0.8 s). Ölçüdür, karar değil.', '',
    '| kelime | cümle | TC | z | uzama | ardından durak | puan | güven |', '|---|---|---|---|---|---|---|---|',
    ...cand.map((c) => '| ' + c.w + ' | ' + c.s + ' | ' + tc(c.t0) + ' | ' + c.z + ' | ' + c.stretch + ' | ' + (c.after ? c.after.toFixed(2) + ' s' : '—') + ' | ' + c.score + ' | ' + c.p + ' |'), '', '## Lyric vuruşu önerileri', '', 'Elle: `script/ADAYLAR.md` (12–20 satır, TC, kalıp; karar kullanıcının). Bu dosya her çalıştırmada yeniden üretilir; öneriler orada.', ''];
  put(OUT, md.join('\n'));
  const jo = path.join(path.dirname(OUT), path.basename(OUT, '.md').toLowerCase() + '.json');   // BEATS.md → beats.json, BEATS2.md → beats2.json (eskisini ezmez)
  put(jo, JSON.stringify({ audio: AUDIO, dur, threshold: TH, pauses, sentences: S.map((s) => ({ n: s.n, t0: s.t0, t1: s.t1, d: s.d, gap: s.gap, sil: s.sil, cut: s.cut, inner: s.inner, text: s.text })), candidates: cand }, null, 1));
  console.log('✓ ' + path.relative(ROOT, OUT).split(path.sep).join('/') + ' · cümle ' + S.length + ' · durak ' + pauses.length + ' · aday ' + cand.length + ' · eşik ' + TH.toFixed(1) + ' dBFS');
}
