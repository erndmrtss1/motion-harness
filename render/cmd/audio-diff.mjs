// motion-render audio-diff — iki ses (A = önceki, B = yeni) arasında: zarf korelasyonu (Whisper'dan bağımsız genel kayma, aynı çekim mi?),
// kelime farkı ve shot/cümle başına kayma tablosu. Kural: bir satırdaki bütün çapalar |Δ| ≤ tol → kareler aynen kalır; aksi → eşlemle yeniden çizilir.
// kaynak: ağaç dışı (kaynak oturumun scratchpad'indeki zarf korelasyonu betiği, envxc) + kaynak hattın kayma tablosu aracı — proje tabloları kaldırıldı.
//   motion-render audio-diff <a> <b> [--words-a A.words.json --words-b B.words.json --beats-a beatsA.json --beats-b beatsB.json]
//        [--scene <id> [--words-design W0.words.json --design-time <ad>] [--a-time <ad>]] [--events ev.json] [--no-env S22,…] [--env-until <s>]
//        [--tol 0.033] [--win 2 --hop 0.5 --max 3] [--env-win 1.5] [--env envxc.json] [--out out/probe/audio-diff/<a>--<b>] [--md docs/<AD>.md] [--lang tr]
// Çıktı: <out>/envxc.json (pencere başına gecikme, zarf ve PCM korelasyonu) · <out>/drift.json (amap drift çapası kaynağı) · <md> (varsayılan <out>/AUDIO-DIFF.md).
// 1. Zarf korelasyonu: 10 ms RMS zarfı; B'de --win s pencere (--hop adım), A'da ±--max s içinde en iyi NCC gecikmesi; örnek düzeyinde ±12 ms inceltme
//    ve PCM korelasyonu (> 0.9 → AYNI çekim, değilse yeni çekim); ortalama zarf < 0.004 → sessiz pencere.
// 2. Kelime farkı: LCS (dil küçük harfi, noktalama yok).
// 3. Satırlar: --scene shots[] (sent: A cümle numaraları, lyric kelime dizinleri; time = --design-time ise --words-design dizinleri) ya da
//    her A cümlesi bir satır. Çapalar: cümle sınırı (iki seste aynı yöntem: ölçülen kesme · kısa durak ortası ≥ 80 ms · son cümlede akustik
//    konuşma sonu · yoksa kelime arası orta), lyric kelime başı, olay kelimeleri (--events: A zamanları ya da jsx tablosu). Zarf sütunu =
//    çapanın ±--env-win/2 çevresindeki pencerelerin (zarf ≥ 0.75) gecikme medyanı (kelime ölçümünden bağımsız sağlama); uyum = Δ − zarf.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, MAN } from '../lib/project.mjs';
import { SR, HOP, decodePcm, rmsDb, envelope, lcs, normWord, keyFirstTwo, slugOf, put, readJson } from '../lib/audio-core.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const VALUED = new Set(['--words-a', '--words-b', '--beats-a', '--beats-b', '--scene', '--words-design', '--design-time', '--a-time', '--events', '--no-env', '--env-until', '--tol', '--win', '--hop', '--max', '--env-win', '--env', '--out', '--md', '--lang']);
const pos = args.filter((a, i) => !a.startsWith('--') && !VALUED.has(args[i - 1]));
const [FA, FB] = pos;
if (!FA || !FB) { console.error('kullanım: motion-render audio-diff <a> <b> [--words-a … --words-b … --beats-a … --beats-b …] [--scene <id>] [--events ev.json] [--tol 0.033] [--out D] [--md M]'); process.exit(2); }
const P = (f) => path.resolve(ROOT, f), rel = (f) => path.relative(ROOT, f).split(path.sep).join('/');
for (const f of [FA, FB]) if (!fs.existsSync(P(f))) { console.error('ses yok: ' + f); process.exit(1); }
const TOL = +opt('tol', 0.033), WIN = +opt('win', 2), HOPS = +opt('hop', 0.5), MAX = +opt('max', 3), EWIN = +opt('env-win', 1.5), LANG = opt('lang', 'tr');
const ENV_UNTIL = opt('env-until', null) != null ? +opt('env-until') : Infinity, NO_ENV = new Set((opt('no-env', '') || '').split(',').filter(Boolean));
const OUT = P(opt('out', 'out/probe/audio-diff/' + slugOf(FA) + '--' + slugOf(FB))), MD = P(opt('md', rel(path.join(OUT, 'AUDIO-DIFF.md'))));
const norm = (w) => normWord(w, LANG);
fs.mkdirSync(OUT, { recursive: true });

// ---------- 1. zarf korelasyonu
const A = decodePcm(P(FA)), B = decodePcm(P(FB)), EA = envelope(A), EB = envelope(B);
let EV;
if (opt('env', null)) EV = readJson(P(opt('env')));
else {
  const ncc = (a, ia, b, ib, n) => { let sa = 0, sb = 0; for (let k = 0; k < n; k++) { sa += a[ia + k]; sb += b[ib + k]; } sa /= n; sb /= n; let num = 0, da = 0, db = 0; for (let k = 0; k < n; k++) { const x = a[ia + k] - sa, y = b[ib + k] - sb; num += x * y; da += x * x; db += y * y; } return num / Math.sqrt(da * db + 1e-20); };
  const W = Math.round(WIN * 100), M = Math.round(MAX * 100); EV = [];
  for (let tb = 0; tb + WIN <= EB.length / 100; tb += HOPS) {
    const ib = Math.round(tb * 100); let e = 0; for (let k = 0; k < W; k++) e += EB[ib + k]; if (e / W < 0.004) { EV.push({ t: tb, sil: true }); continue; }   // sessiz pencere
    let best = -2, bl = 0; for (let l = -M; l <= M; l++) { const ia = ib + l; if (ia < 0 || ia + W > EA.length) continue; const c = ncc(EB, ib, EA, ia, W); if (c > best) { best = c; bl = l; } }
    const sb = Math.round(tb * SR), n = Math.round(WIN * SR), sa0 = sb + bl * HOP; let pb = -2, pl = 0;   // örnek düzeyinde inceltme + PCM korelasyonu (±12 ms)
    for (let l = -192; l <= 192; l += 1) { const sa = sa0 + l; if (sa < 0 || sa + n > A.length) continue; let num = 0, da = 0, db = 0; for (let k = 0; k < n; k += 2) { const x = A[sa + k], y = B[sb + k]; num += x * y; da += x * x; db += y * y; } const c = num / Math.sqrt(da * db + 1e-20); if (c > pb) { pb = c; pl = l; } }
    EV.push({ t: tb, lagMs: bl * 10, env: +best.toFixed(3), pcm: +pb.toFixed(3), lagPcmMs: +((bl * HOP + pl) / SR * 1000).toFixed(2) });
  }
  put(path.join(OUT, 'envxc.json'), JSON.stringify(EV));
}
const EVs = EV.filter((r) => !r.sil), same = EVs.filter((r) => r.pcm > 0.9).length;
// kayma bölütleri (B zamanı; Δ = −gecikme): ardışık pencerelerde Δ bölüt başından ≤ 40 ms sapıyorsa aynı bölüt
const segs = []; for (const r of EVs.filter((x) => x.env >= 0.75)) {   // güvenilir pencereler (zarf ≥ 0.75, çapa sağlamasıyla aynı eşik)
  const d = -r.lagPcmMs, s = segs[segs.length - 1], k = r.pcm > 0.9;
  if (s && Math.abs(d - s.d0) <= 40 && s.same === k && r.t - s.t1 <= 2 * HOPS + 1e-9) { s.t1 = r.t; s.ds.push(d); s.env = Math.min(s.env, r.env); } else segs.push({ t0: r.t, t1: r.t, d0: d, ds: [d], env: r.env, same: k }); }
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
console.log('A ' + (A.length / SR).toFixed(3) + ' s · B ' + (B.length / SR).toFixed(3) + ' s · pencere ' + EVs.length + ' (sessiz ' + (EV.length - EVs.length) + ') · aynı çekim (pcm > 0.9) ' + same + '/' + EVs.length + ' → ' + (same > 0.5 * EVs.length ? 'AYNI çekim (düzenlenmiş kopya)' : 'yeni çekim'));

// ---------- 2–3. kelime farkı ve kayma tablosu (kelime dosyaları varsa)
const WA_F = opt('words-a', 'script/' + slugOf(FA) + '.words.json'), WB_F = opt('words-b', 'script/' + slugOf(FB) + '.words.json');
const haveWords = fs.existsSync(P(WA_F)) && fs.existsSync(P(WB_F));
let J = { a: FA, b: FB, tol: TOL, envxc: rel(path.join(OUT, 'envxc.json')), sameTake: { windows: EVs.length, same }, segments: segs.map((s) => ({ t: [s.t0, +(s.t1 + WIN).toFixed(2)], d: Math.round(med(s.ds)), dRange: [Math.round(Math.min(...s.ds)), Math.round(Math.max(...s.ds))], envMin: s.env, same: s.same })) };
let rows = [], P_AB = null, smap = new Map(), son = null;
if (!haveWords) console.log('kelime dosyaları yok (' + WA_F + ', ' + WB_F + ') → yalnız zarf korelasyonu');
else {
  const WA = readJson(P(WA_F)).words, WB = readJson(P(WB_F)).words;
  const BA_F = opt('beats-a', null), BB_F = opt('beats-b', null);
  P_AB = lcs(WA, WB, LANG);
  J.diff = P_AB.diff;
  if (!BA_F || !BB_F) console.log('beats yok (--beats-a / --beats-b) → yalnız kelime farkı');
  else {
    const BA = readJson(P(BA_F)), BB = readJson(P(BB_F)), DB = { a: rmsDb(A), b: rmsDb(B) };
    BA.sentences.forEach((s) => { const c = BB.sentences.find((x) => keyFirstTwo(x, LANG) === keyFirstTwo(s, LANG) && Math.abs(x.t0 - s.t0) < 3.5); if (c) smap.set(s.n, c.n); });
    // sessizlik kenarı (en uzun ≥ 80 ms bölge; 'son' → bitişi, 'baş' → başı) ve kısa durak ortası
    const run = (v, a, b, th) => { const d = DB[v], i0 = Math.max(0, Math.floor(a * 100)), i1 = Math.min(d.length, Math.ceil(b * 100)); let best = null, st = -1; for (let i = i0; i <= i1; i++) { const sil = i < i1 && d[i] < th; if (sil && st < 0) st = i; if (!sil && st >= 0) { if (i - st >= 8 && (!best || i - st > best[1] - best[0])) best = [st, i]; st = -1; } } return best; };
    const shortPause = (v, a, b, th) => { const r = run(v, a, b, th); return r ? { t: +((r[0] + r[1]) / 200).toFixed(3), ms: (r[1] - r[0]) * 10 } : null; };
    const speechEnd = (v, W, Bt) => { const last = W[W.length - 1]; const r = last ? run(v, last.t1 - 0.2, Bt.dur, Bt.threshold) : null; return r ? r[0] / 100 : null; };
    son = { a: speechEnd('a', WA, BA), b: speechEnd('b', WB, BB), whisper: { a: WA.length ? WA[WA.length - 1].t1 : null, b: WB.length ? WB[WB.length - 1].t1 : null } };
    // son cümle: akustik konuşma sonu (son sessizliğin başı; Whisper sonu sessizliğe taşar, son "kesme" dosya kuyruğuna bağlı) — kaynakta son shot'a özel kuraldı
    const bnd = (Bt, n, v) => { const s = Bt.sentences[n - 1], nx = Bt.sentences[n]; if (!s) return null;
      if (!nx) { const e = son[v]; return e != null ? { t: e, kind: 'konuşma sonu (akustik)' } : { t: s.t1, kind: 'konuşma sonu' }; }
      if (s.cut != null) return { t: s.cut, kind: 'kesme' };
      const p = shortPause(v, s.t1 - 0.3, nx.t0 + 0.3, Bt.threshold); if (p) return { t: p.t, kind: 'kısa durak ' + p.ms + ' ms' }; return { t: +((s.t1 + nx.t0) / 2).toFixed(3), kind: 'orta' }; };
    const envD = (tb) => { if (tb >= ENV_UNTIL) return null; const c = EV.filter((r) => !r.sil && Math.abs(r.t + WIN / 2 - tb) <= EWIN / 2 && r.env >= 0.75).map((r) => -r.lagPcmMs).sort((a, b) => a - b); return c.length ? Math.round(c[Math.floor(c.length / 2)]) : null; };
    // olaylar (A zamanı): JSON [{src, t}] ya da jsx tablosu {jsx, var, index?, skip?}
    const evs = [];
    if (opt('events', null)) for (const e of readJson(P(opt('events')))) {
      if (e.jsx) { const src = fs.readFileSync(P(e.jsx), 'utf8'), m = new RegExp('var ' + e.var + ' = (\\{[^;]*?\\});').exec(src), o = m ? Function('return ' + m[1])() : {};
        Object.entries(o).forEach(([k, v]) => { if ((e.skip || []).includes(k)) return; evs.push({ src: e.var + '.' + k, t2: Array.isArray(v) ? v[e.index || 0] : v }); }); }
      else evs.push({ src: e.src, t2: e.t });
    }
    evs.forEach((e) => { const w = WA.filter((x) => Math.abs(x.t0 - e.t2) < 0.035).sort((a, b) => Math.abs(a.t0 - e.t2) - Math.abs(b.t0 - e.t2))[0]; e.w2 = w || null; if (!w) { const w1 = WA.filter((x) => x.t1 > e.t2 - 0.02).sort((a, b) => a.t0 - b.t0)[0]; e.near = w1 ? w1.w + '@' + w1.t0 : null; } e.w3 = w ? P_AB.pair.get(w.i) || null : null; });
    // satırlar: sahne shot'ları ya da A cümleleri
    const scene = opt('scene', null) ? (MAN.scenes || []).find((s) => s.id === opt('scene')) : null;
    if (opt('scene', null) && !(scene && scene.shots)) { console.error('sahnede shots yok: ' + opt('scene')); process.exit(1); }
    const SH = scene ? scene.shots : BA.sentences.map((s) => ({ id: 'C' + s.n, sent: [s.n], lyric: [] }));
    const DT = opt('design-time', null), W0 = opt('words-design', null) ? readJson(P(opt('words-design'))).words : null, P0A = W0 ? lcs(W0, WA, LANG) : null, P0B = W0 ? lcs(W0, WB, LANG) : null, AT = opt('a-time', null);
    SH.forEach((sh) => {
      const n0 = sh.sent[0], n1 = sh.sent[sh.sent.length - 1], an = [], noEnv = NO_ENV.has(sh.id);
      const add = (kind, label, ta, tb, extra) => { if (ta == null) return; const d = tb == null ? null : Math.round((tb - ta) * 1000); an.push(Object.assign({ kind, label, ta: +ta.toFixed(3), tb: tb == null ? null : +tb.toFixed(3), d, env: tb == null || noEnv ? null : envD(tb) }, extra || {})); };
      const man = (k) => (AT && sh.time === AT ? sh[k] : undefined);
      if (n0 > 1) { const ba = bnd(BA, n0 - 1, 'a'), m = smap.get(n0 - 1) ?? smap.get(n0 - 2), bb = m ? bnd(BB, m, 'b') : null; add('sınır', 'başlangıç C' + (n0 - 1) + ' (A ' + ba.kind + ' · B ' + (bb ? bb.kind : '—') + ')', ba.t, bb && bb.t, man('t0') !== undefined ? { man: man('t0') } : null); } else add('sınır', 'başlangıç', 0, 0);
      { const ba = bnd(BA, n1, 'a'), m = smap.get(n1) ?? smap.get(n1 - 1), bb = m ? bnd(BB, m, 'b') : null; add('sınır', 'bitiş C' + n1 + ' (A ' + ba.kind + ' · B ' + (bb ? bb.kind : '—') + ')', ba.t, bb && bb.t, man('t1') !== undefined ? { man: man('t1') } : null); }
      (sh.lyric || []).forEach((l) => { if (!l.words || !l.words.length) return; const wi = l.words[0];
        if (W0 && DT && sh.time === DT) { const x1 = W0[wi], x2 = P0A.pair.get(wi), x3 = P0B.pair.get(wi); add(l.kind, l.text, x2 ? x2.t0 : null, x3 ? x3.t0 : null, { tau: x1 ? x1.t0 : null }); }
        else { const x2 = WA[wi], x3 = P_AB.pair.get(wi); add(l.kind, l.text, x2 ? x2.t0 : null, x3 ? x3.t0 : null); } });
      if (an.length) { const lo = Math.min(...an.map((a) => a.ta)), hi = Math.max(...an.map((a) => a.ta));
        evs.filter((e) => e.w2 && e.t2 > lo + 0.01 && e.t2 < hi - 0.01 && !an.some((a) => Math.abs(a.ta - e.w2.t0) < 0.02)).forEach((e) => add('olay', e.src + ' "' + norm(e.w2.w) + '"', e.w2.t0, e.w3 ? e.w3.t0 : null)); }
      an.sort((a, b) => a.ta - b.ta);
      an.forEach((a) => { a.uyum = a.d != null && a.env != null ? a.d - a.env : null; });
      const ds = an.filter((a) => a.d != null).map((a) => a.d), mx = ds.length ? Math.max(...ds.map(Math.abs)) : null;
      const ok = an.filter((a) => a.tb != null); let tempo = null;
      if (ok.length >= 2) { const sa = ok[ok.length - 1].ta - ok[0].ta, sb = ok[ok.length - 1].tb - ok[0].tb; if (sb >= 0.25) tempo = +(sa / sb).toFixed(3); }
      rows.push({ id: sh.id, sent: sh.sent, time: sh.time, an, dMin: ds.length ? Math.min(...ds) : null, dMax: ds.length ? Math.max(...ds) : null, absMax: mx, tempo, missing: an.filter((a) => a.d == null).map((a) => a.label), kalir: mx != null && mx <= TOL * 1000 && !an.some((a) => a.d == null) });
    });
    J = Object.assign(J, { smap: [...smap.entries()], son, evs: evs.map((e) => ({ src: e.src, t2: e.t2, w2: e.w2 && e.w2.w, t3: e.w3 && e.w3.t0, near: e.near })), rows });
  }
}
put(path.join(OUT, 'drift.json'), JSON.stringify(J, null, 1));

// ---------- belge
{
  const BT = String.fromCharCode(96), c = (x) => BT + x + BT, sg = (d) => d == null ? '—' : (d > 0 ? '+' : '') + d;
  const short = (a) => a.kind === 'sınır' ? (a.label.startsWith('başlangıç') ? (a.label.match(/C\d+/) || ['başı'])[0] : (a.label.match(/C\d+/) || [''])[0]) + (a.label.includes('kısa durak') ? '*' : a.label.includes('akustik') ? '°' : '') : a.kind === 'olay' ? a.label.replace(/^[A-Za-z0-9]+_(EV|LY)\./, '').replace(/ ".*$/, '') : a.label;
  const L = ['# Ses farkı: ' + c(FA) + ' → ' + c(FB), '',
    'Ölçüm ' + new Date().toISOString().slice(0, 10) + ' · ' + c('motion-render audio-diff') + ' → ' + c(rel(path.join(OUT, 'drift.json'))) + ' · zarf ' + c(J.envxc) + '. Δ = t(B) − t(A) (ms). Kural: satırdaki bütün çapalar |Δ| ≤ ' + Math.round(TOL * 1000) + ' ms → kareler aynen kalır; aksi → eşlemle (motion-render amap) yeniden çizilir.', '',
    '## 1. Genel kayma (zarf korelasyonu, Whisper\'dan bağımsız)', '',
    'A ' + (A.length / SR).toFixed(2) + ' s · B ' + (B.length / SR).toFixed(2) + ' s · pencere ' + WIN + ' s / adım ' + HOPS + ' s (tablo: zarf ≥ 0.75 olan ' + EVs.filter((x) => x.env >= 0.75).length + ' pencere) · PCM korelasyonu > 0.9 olan pencere ' + same + '/' + EVs.length + ' → **' + (same > 0.5 * EVs.length ? 'aynı çekim (düzenlenmiş kopya)' : 'yeni çekim') + '**.', '',
    '| B zaman aralığı (s) | Δ medyan (ms) | Δ aralığı | en düşük zarf | çekim |', '|---|---|---|---|---|',
    ...J.segments.map((s) => '| ' + s.t[0].toFixed(1) + '–' + s.t[1].toFixed(1) + ' | ' + sg(s.d) + ' | ' + sg(s.dRange[0]) + ' … ' + sg(s.dRange[1]) + ' | ' + s.envMin + ' | ' + (s.same ? 'AYNI' : 'yeni') + ' |'), ''];
  if (J.diff) L.push('## 2. Metin farkı (A ↔ B)', '', J.diff.length ? '| fark | kelime | zaman (s) |\n|---|---|---|\n' + J.diff.map((d) => '| ' + (d.op === 'yok' ? 'B\'de yok' : 'B\'de ek') + ' | ' + d.w + ' | ' + d.t.toFixed(2) + ' |').join('\n') : 'Metin farkı yok.', '',
    'Beklenen yerler dışında metin farkı → **DUR** (klip doğrulaması: ' + c('motion-render transcribe verify') + ').', '');
  if (rows.length) {
    L.push('## 3. Satır başına kayma (Δ = B − A, ms; |Δ| ≤ ' + Math.round(TOL * 1000) + ' ms → kalır)', '',
      'Çapalar: cümle sınırı (iki seste aynı yöntem: ölçülen kesme · * kısa durak ortası ≥ 80 ms · ° akustik konuşma sonu), lyric kelime başı, olay kelimeleri. Zarf = aynı andaki zarf korelasyonu kayması (sağlama); |Δ − zarf| > 50 ms olan kelime çapası eşlemde atılır.', '',
      '| satır | çapalar (Δ ms) | zarf (ms) | Δ aralığı | tempo A/B | karar |', '|---|---|---|---|---|---|',
      ...rows.map((r) => '| ' + r.id + ' | ' + r.an.map((a) => short(a) + ' ' + sg(a.d)).join(' · ') + ' | ' + (r.an.filter((a) => a.env != null).map((a) => sg(a.env)).join(' · ') || '—') + ' | ' + sg(r.dMin) + ' … ' + sg(r.dMax) + ' | ' + (r.tempo ?? '—') + ' | ' + (r.kalir ? '**kalır**' : 'yeniden') + (r.missing.length ? ' (B\'de yok: ' + r.missing.map((x) => x.replace(/ ".*$/, '')).join(', ') + ')' : '') + ' |'), '');
    const keep = rows.filter((r) => r.kalir).map((r) => r.id), redo = rows.filter((r) => !r.kalir).map((r) => r.id);
    L.push('## 4. Özet', '', '- Kalır (' + keep.length + '): ' + (keep.join(', ') || '—'), '- Yeniden çizilir (' + redo.length + '): ' + (redo.join(', ') || '—'),
      son ? '- Konuşma sonu (akustik): A ' + (son.a ?? '—') + ' (Whisper ' + son.whisper.a + ') → B ' + (son.b ?? '—') + ' (Whisper ' + son.whisper.b + ')' : '',
      '- Eşlem: ' + c('motion-render amap build --anchors amap.config.json') + ' (drift çapası ' + c(rel(path.join(OUT, 'drift.json'))) + ').', '');
  }
  put(MD, L.join('\n'));
}
if (rows.length) rows.forEach((r) => console.log(r.id + ' Δ ' + r.dMin + '…' + r.dMax + ' ms · |Δ|max ' + r.absMax + (r.kalir ? ' · KALIR' : ' · yeniden') + (r.missing.length ? ' · eşsiz: ' + r.missing.join(', ') : '')));
if (J.diff) console.log('fark A↔B: ' + (J.diff.map((d) => d.op + ' "' + d.w + '"@' + d.t).join(' · ') || 'yok'));
console.log('✓ ' + rel(path.join(OUT, 'drift.json')) + ' · ' + rel(MD));
