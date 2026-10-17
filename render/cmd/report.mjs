// motion-render report — out/RENDER_SUMMARY.md (otomatik render özeti; her koşuda yeniden yazılır). out/RENDER_REPORT.md elle tutulan, yalnız sona eklenen faz kaydıdır — bu komut ona dokunmaz.
//
//   motion-render report
//
// Kaynaklar: out/logs/<sahne>.log|json (render), out/logs/_analysis.json (otomatik kare analizi, varsa), out/scenes/*.mp4,
// out/reel/reel.json ya da out/reel-v3/reel.json (motion-render master --reel; en yenisi) ve elle yazılmış görsel inceleme
// notları out/review/notes.md (varsa rapora eklenir).
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, SCENES, FPS, WIDTH, HEIGHT, readTimeline } from '../lib/project.mjs';

if (process.argv.includes('--help') || process.argv.includes('-h')) { console.log('kullanım: motion-render report  → out/RENDER_SUMMARY.md'); process.exit(0); }
const OUT = path.join(ROOT, 'out');
const rd = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null);
const analysis = JSON.parse(rd(path.join(OUT, 'logs', '_analysis.json')) || '{}');
// reel: master --reel çalışma klasörlerinden en yeni kayıt
const reels = [['reel', 'REEL_v2.mp4'], ['reel-v3', 'REEL_v3.mp4']].map(([d, f]) => ({ j: path.join(OUT, d, 'reel.json'), f })).filter((x) => fs.existsSync(x.j))
  .sort((a, b) => fs.statSync(b.j).mtimeMs - fs.statSync(a.j).mtimeMs);
const reel = reels.length ? Object.assign(JSON.parse(rd(reels[0].j)), { file: reels[0].f }) : null;

function ms(line) {
  const m = /^(\d\d):(\d\d):(\d\d)\.(\d{3})/.exec(line);
  return m ? ((+m[1] * 60 + +m[2]) * 60 + +m[3]) * 1000 + +m[4] : null;
}
function size(p) {
  if (!fs.existsSync(p)) return '—';
  const b = fs.statSync(p).size;
  return b > 1024 * 1024 ? (b / 1024 / 1024).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB';
}

function warnings(id) {
  const log = rd(path.join(OUT, 'logs', id + '.log'));
  if (!log) return ['log yok'];
  const L = log.trim().split('\n');
  const w = [];
  const aborts = L.filter((l) => l.includes('ABORT'));
  if (aborts.length) w.push('dış istek abort ×' + aborts.length + ' (' + [...new Set(aborts.map((l) => { try { return new URL(l.split(' ').pop()).host; } catch { return '?'; } }))].join(', ') + ')');
  const t0 = ms(L[0]);
  const gate = L.find((l) => l.includes(' fontlar: '));
  if (gate) {
    const dt = ms(gate) - t0;
    if (/"timedOut":true/.test(gate)) w.push('font kapısı zaman aşımı');
    else if (dt > 5000) w.push('font gecikmesi ' + dt + ' ms');
    const failed = /"failed":\[([^\]]+)\]/.exec(gate);
    if (failed) w.push('yüklenemeyen font: ' + failed[1]);
  }
  if (L.some((l) => l.includes('data-om-fonts-inlined gelmedi'))) w.push('hazır sinyali zaman aşımı (fonts-inlined)');
  const dur = L.find((l) => l.includes('UYARI: Stage süresi'));
  if (dur) w.push(dur.slice(dur.indexOf('UYARI')));
  const tries = L.filter((l) => l.includes('DENEME'));
  if (tries.length) w.push('seek denemesi başarısız ×' + tries.length + ': ' + tries[tries.length - 1].replace(/.*BAŞARISIZ: /, ''));
  const perr = L.filter((l) => l.includes('PAGEERROR')).length;
  const cerr = L.filter((l) => l.includes('console.error')).length;
  const cwarn = L.filter((l) => l.includes('console.warning')).length;
  if (perr) w.push('sayfa hatası ×' + perr);
  if (cerr) w.push('console.error ×' + cerr);
  if (cwarn) w.push('console.warning ×' + cwarn);
  const fb = L.find((l) => l.includes('FALLBACK BAŞARISIZ'));
  if (fb) w.push(fb.slice(fb.indexOf('FALLBACK')));
  const wd = L.filter((l) => l.includes('WATCHDOG')).length;
  if (wd) w.push('watchdog ×' + wd);
  return w;
}

const rows = [];
let warnCount = 0, skipped = 0;
for (const s of SCENES) {
  let tl; try { tl = readTimeline(s.file); } catch (e) { tl = { frames: s.frames || 0, totalMs: '—' }; }
  const meta = JSON.parse(rd(path.join(OUT, 'logs', s.id + '.json')) || 'null');
  const method = meta ? meta.method : 'render edilmedi';
  if (!meta || method === 'atlandı') skipped++;
  const w = warnings(s.id);
  if (w.length) warnCount++;
  const frames = method === 'seek' ? meta.frames : method === 'recordVideo' ? '~' + tl.frames : '—';
  rows.push('| ' + s.id + ' | ' + method + ' | ' + frames + ' | ' + tl.totalMs + ' | ' +
    size(path.join(OUT, 'scenes', s.id + '.mp4')) + ' | ' + (w.length ? w.join('; ') : '—') + ' |');
}

// otomatik görsel bulgular
function fr(i) { return String(i).padStart(5, '0'); }
const auto = [];
for (const s of SCENES) {
  const a = analysis[s.id];
  if (!a || a.error) continue;
  const items = [];
  const last = a.n - 1;
  for (const u of a.uniform || []) {
    const where = u.start === 0 && u.end === last ? 'TÜM kareler' : u.start === 0 ? 'baş' : u.end === last ? 'son' : 'ORTA';
    items.push('tek renk ' + u.color + ' · kare ' + fr(u.start) + (u.end > u.start ? '–' + fr(u.end) : '') +
      ' (' + (u.end - u.start + 1) + ' kare, ' + where + ')');
  }
  if (a.seam != null && a.seam > 0.5) items.push('ilk/son kare farkı ' + a.seam + ' (ort. mutlak luma farkı; 0 = dikişsiz loop)');
  const spikes = a.spikes || [];
  for (const sp of spikes.slice(0, 6)) items.push('sıçrama adayı kare ' + fr(sp.frame) + ' (fark ' + sp.diff + ', yerel medyan ' + sp.localMedian + ')');
  if (spikes.length > 6) items.push('… +' + (spikes.length - 6) + ' sıçrama adayı daha');
  if (items.length) auto.push('**' + s.id + '**\n' + items.map((x) => '- ' + x).join('\n'));
}

const notes = rd(path.join(OUT, 'review', 'notes.md'));
const reelLine = reel
  ? '`out/' + reel.file + '` · ' + (reel.segments + 1) / 2 + ' sahne · ' + (reel.totalMs / 1000).toFixed(1) + ' s' +
    (reel.failed && reel.failed.length ? ' · RENDER HATASI boşluğu: ' + reel.failed.join(', ') : '')
  : 'REEL henüz kurulmadı (motion-render master --reel)';

const md = `# RENDER RAPORU

> Üretildi: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · ${FPS} fps · ${WIDTH}×${HEIGHT} · motion-render report
> REEL: ${reelLine}
> Özet: ${SCENES.length} iş · uyarılı ${warnCount} · atlanan/render edilmemiş ${skipped}

Yöntemler: **seek** = motorun \`data-om-seek-to-time-frame\` olayıyla kare kare (frame-accurate);
**recordVideo** = gerçek zamanlı kayıt (fallback, frame-accurate değil); **atlandı** = ikisi de başarısız.
Dosya boyutu = \`out/scenes/<sahne>.mp4\` (etiketsiz tekil klip).

| Sahne | Yöntem | Kare | Süre ms | Dosya | Uyarılar |
|---|---|---|---|---|---|
${rows.join('\n')}

Uyarı ölçütleri: dış istek abort'u (routing dışı her istek), font gecikmesi (sayfa açılışından font
kapısına > 5 s ya da kapı zaman aşımı), hazır sinyali zaman aşımı (\`data-om-fonts-inlined\` 20 s içinde
gelmedi / glif sondası), sayfa ve konsol hataları, watchdog kayıtları.

## İnceleme notları

Düzeltme yapılmadı; yalnız tespit. Kare numaraları \`out/frames/<sahne>/NNNNN.png\` ile birebir.

### Otomatik tespitler (out/logs/_analysis.json)

Tek renk kare = örneklenen piksellerde luma farkı < 2. Baş/son tek renk kareler loop dikişi için
beklenen durumdur (ilk ve son kare boş); **ORTA** olanlar şüphelidir.
Sıçrama adayı = önceki kareye göre fark, ±6 karelik yerel medyanın 6 katından ve 4 luma'dan büyük
(kesme, sarma dikişi ya da tek karelik patlama olabilir).

${auto.length ? auto.join('\n\n') : '—'}

### Görsel inceleme (out/review/notes.md)

${notes || '—'}
`;
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'RENDER_SUMMARY.md'), md);
console.log('✓ out/RENDER_SUMMARY.md · uyarılı ' + warnCount + ' · atlanan/render edilmemiş ' + skipped);
