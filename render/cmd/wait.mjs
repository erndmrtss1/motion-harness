// motion-render wait — üst sınırlı render bekleyicisi (elle yazılmış `until … sleep` döngülerinin yerine)
//
//   motion-render wait --id P1 --tag A --frames 231 [--expect 260] [--since <ms|ISO>]   (tam render: --id P1 --tag -)
//
// Bitiş işareti harness'in KENDİ sonuç dosyasıdır: out/logs/<id>_<tag>.json, bekleme başladıktan sonra yazılmışsa render bitmiştir
// (başarılı ya da değil). Log satırı ya da dosya sayısı aranmaz: .log her çalıştırmada baştan yazılır, stdout'a yönlendirilen dosyada
// "kareler:" satırı hiç yoktur (kaynak projede bir kez sonsuz döngüye yol açtı). Sınırlar:
//   · beklenen süre × 2 (--expect s; yoksa eksik kare × 2.5 s + 20 s) dolarsa → çıkış 6 + teşhis (kare sayısı, son kare zamanı, log sonu)
//   · harness watchdog'u süreci sonlandırdıysa (log'da "süreç sonlanıyor") → çıkış 4
//   · 150 s yeni kare yok ve sonuç dosyası yazılmadı (harness çöktü) → çıkış 7
// Bitti: sonuç dosyasını özetler; kare eksik ya da watchdog kare atladıysa çıkış 5, hata varsa 1, yoksa 0.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/project.mjs';

const args = process.argv.slice(2), argOf = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const ID = argOf('--id'), TAG = argOf('--tag'), N = +argOf('--frames', 0);
if (!ID || !TAG || !N) { console.error('kullanım: motion-render wait --id SAHNE --tag AD|- --frames N [--expect s] [--since ms|ISO]'); process.exit(2); }
const LN = TAG === '-' ? ID : ID + '_' + TAG,   // --tag -: etiketsiz tam render (out/frames/<id>, out/logs/<id>.json)
       dir = path.join(ROOT, 'out', 'frames', LN), json = path.join(ROOT, 'out', 'logs', LN + '.json'), logf = path.join(ROOT, 'out', 'logs', LN + '.log');
const sinceArg = argOf('--since'), since = sinceArg ? (isNaN(+sinceArg) ? Date.parse(sinceArg) : +sinceArg) : Date.now() - 10000;
const frames = () => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^\d{5}\.png$/.test(f)) : []);
const newest = () => frames().reduce((m, f) => Math.max(m, fs.statSync(path.join(dir, f)).mtimeMs), 0);
const tail = (k) => (fs.existsSync(logf) ? fs.readFileSync(logf, 'utf8').trim().split('\n').slice(-k).join('\n') : '(log yok)');
const missing0 = Math.max(0, N - frames().length), expect = +argOf('--expect', missing0 * 2.5 + 20), limit = 2 * expect * 1000, start = Date.now();
const hhmm = (ms) => (ms ? new Date(ms).toTimeString().slice(0, 8) : '—');
console.log('bekleniyor: ' + LN + ' · ' + frames().length + '/' + N + ' kare · beklenen ' + expect.toFixed(0) + ' s · üst sınır ' + (limit / 1000).toFixed(0) + ' s');
let lastNote = start, lastCount = frames().length, lastChange = Date.now();
for (;;) {
  const now = Date.now(), cnt = frames().length;
  if (cnt !== lastCount) { lastCount = cnt; lastChange = now; }
  if (fs.existsSync(json) && fs.statSync(json).mtimeMs > since) {
    const r = JSON.parse(fs.readFileSync(json, 'utf8')), sk = r.watchdog && r.watchdog.skipped ? r.watchdog.skipped : [];
    console.log('bitti: ' + r.method + ' · ' + cnt + '/' + N + ' kare · çizilen ' + (r.rendered ?? '—') + ' · ' + (r.msPerFrame ?? '—') + ' ms/kare' +
      (r.watchdog && r.watchdog.retried && r.watchdog.retried.length ? ' · watchdog tekrar ' + r.watchdog.retried.join(',') : '') + (sk.length ? ' · ATLANAN ' + sk.join(',') : '') + (r.error ? ' · HATA ' + r.error : ''));
    process.exit(r.error ? 1 : cnt < N || sk.length ? 5 : 0);
  }
  if (/süreç sonlanıyor/.test(tail(3))) { console.log('✗ harness watchdog süreci sonlandırdı · ' + cnt + '/' + N + ' kare\n' + tail(5)); process.exit(4); }
  if (now - start > limit) { console.log('✗ üst sınır (' + (limit / 1000).toFixed(0) + ' s) doldu · ' + cnt + '/' + N + ' kare · son kare ' + hhmm(newest()) + '\n' + tail(5)); process.exit(6); }
  if (now - lastChange > 150000 && now - start > 150000) { console.log('✗ 150 s yeni kare yok, sonuç dosyası yazılmadı (harness çöktü?) · ' + cnt + '/' + N + ' kare · son kare ' + hhmm(newest()) + '\n' + tail(5)); process.exit(7); }
  if (now - lastNote > 60000) { lastNote = now; console.log('  … ' + cnt + '/' + N + ' kare · ' + ((now - start) / 1000).toFixed(0) + ' s'); }
  await new Promise((res) => setTimeout(res, 5000));
}
