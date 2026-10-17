// motion-render ours — OURS profili (shot uzunluğu, hareketli kare payı, hold oranı) + K3 kamera kapısı; render edilmiş karelerden.
//
//   motion-render ours <id> [--dir out/frames/<id>] [--step N] [--no-cam]   → out/probe/<id>-ours.json + özet satırı
//
// Yöntem (referans analizi / bootcamp tanımı):
//   kare hareketi = 480p gri karede dokulu 16×16 blokların blok eşleme (±6 px) ortalama yer değiştirmesi (px/kare);
//   shot başına eşik th = max(0.5, 0.2 × tepe); hareketli pay = eşiği aşan kare / shot karesi; hold = 1 − hareketli pay (kare ağırlıklı).
//   Shot sınırları manifest (sahne ya da parent) shots f0/f1 (ses zamanı af0/af1 öncelikli); shot yoksa sahne tek shot.
//   Hedef (sahne `ours` > world.ours > varsayılan): shot 1.67 s, hold ≤ 0.6, hareketli pay ≥ 0.4.
// --step N (ya da sahne animatic.step): her dosya N kare; tam render + --step N → her N. kare örneklenir; yer değiştirme ÷N (px / (1/fps·N)).
// K3: perde OURS ≥ movingMin + shot başına KAMERA hareketli payı ≥ movingMin (sahnenin window.__camSpeed'i: kare başı ortalama ekran
//   hareketi, px). MUTLAK eşik camMin × ekran genişliği / s → px/kare (varsayılan %2: 1920 px, 60 fps → 0.64); sahne `k3` > world.k3.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ROOT, MAN, FPS, WIDTH, OUT, sceneById, rel } from '../lib/project.mjs';
import { cli, worldFor, probeEval } from '../lib/qc-common.mjs';

const { argOf, has, pos } = cli(process.argv.slice(2), ['--dir', '--step']);
const id = pos[0];
if (!id) { console.error('kullanım: motion-render ours <id> [--dir D] [--step N] [--no-cam]'); process.exit(2); }
let S; try { S = sceneById(id); } catch { console.error('manifestte yok: ' + id); process.exit(1); }
const WLD = worldFor(S) || {};
const L = MAN.scenes || [];
const P = S.parent ? L.find((x) => x.id === S.parent) || S : S, r0 = S.range ? S.range[0] : 0, r1 = S.range ? S.range[1] : S.frames - 1;
const STEP = +argOf('--step', (S.animatic && S.animatic.step) || 1);   // animatik — her dosya STEP kare
const DIR = path.resolve(ROOT, argOf('--dir', 'out/frames/' + id));
if (!fs.existsSync(DIR)) { console.error('kare klasörü yok: ' + rel(DIR)); process.exit(1); }
const all = fs.readdirSync(DIR).filter((f) => /^\d{5}\.png$/.test(f)).sort();
const FULL = STEP > 1 && all.length > (r1 - r0 + 1) / STEP + 2, files = FULL ? all.filter((f, i) => i % STEP === 0) : all;   // tam render + --step N → her N. kare örneklenir
if (files.length < 2) { console.error('kare yetersiz: ' + files.length + ' (' + rel(DIR) + ')'); process.exit(1); }
const TGT = Object.assign({ shot: 1.67, holdMax: 0.6, movingMin: 0.4 }, WLD.ours || {}, S.ours || {});
const K3 = Object.assign({ camMin: 0.02, movingMin: TGT.movingMin }, WLD.k3 || {}, S.k3 || {});
const W = 480, H = 270, B = 16, R = 6;
async function gray(f) { return await sharp(path.join(DIR, f)).removeAlpha().resize(W, H, { kernel: 'cubic' }).greyscale().raw().toBuffer(); }
function motion(a, b) {   // a: önceki, b: şimdiki; dokulu blokların en iyi eşleşme yer değiştirmesi ortalaması
  let sum = 0, n = 0;
  for (let by = R; by + B + R <= H; by += B) for (let bx = R; bx + B + R <= W; bx += B) {
    let mean = 0; for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) mean += a[(by + y) * W + bx + x]; mean /= B * B;
    let vari = 0; for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) { const d = a[(by + y) * W + bx + x] - mean; vari += d * d; } if (vari / (B * B) < 40) continue;   // dokusuz blok (düz zemin) atlanır
    let best = 1e18, bdx = 0, bdy = 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { let s = 0; for (let y = 0; y < B; y += 2) for (let x = 0; x < B; x += 2) s += Math.abs(a[(by + y) * W + bx + x] - b[(by + y + dy) * W + bx + x + dx]); if (s < best || (s === best && Math.abs(dx) + Math.abs(dy) < Math.abs(bdx) + Math.abs(bdy))) { best = s; bdx = dx; bdy = dy; } }
    sum += Math.hypot(bdx, bdy); n++; }
  return n ? sum / n : 0;
}
const m = new Float32Array(files.length); let prev = await gray(files[0]);
const raw = new Float32Array(files.length);
for (let i = 1; i < files.length; i++) { const g = await gray(files[i]); raw[i] = motion(prev, g); m[i] = raw[i] / STEP; prev = g; if (i % 100 === 0) process.stdout.write('· ' + i + ' '); }   // STEP > 1: px / adım
const sf = (s, k) => (s['a' + k] != null ? s['a' + k] : s[k]);   // shot sınırı ses zamanı karesi (af0/af1; eşlemsiz f0/f1)
const shotList = Array.isArray(P.shots) && P.shots.length ? P.shots : [{ id: S.id, f0: r0, f1: r1 }];
const shots = shotList.filter((s) => sf(s, 'f1') >= r0 && sf(s, 'f0') <= r1).map((s) => ({ id: s.id, f0: Math.max(sf(s, 'f0'), r0), f1: Math.min(sf(s, 'f1'), r1) }));
const res = shots.map((s) => { const seg = Array.from(m.slice(Math.ceil((s.f0 - r0) / STEP) + 1, Math.floor((s.f1 - r0) / STEP) + 1)), peak = Math.max(0, ...seg), th = Math.max(0.5, 0.2 * peak), mov = peak < 0.5 ? 0 : seg.filter((v) => v >= th).length / seg.length;
  return { id: s.id, dur: +((s.f1 - s.f0 + 1) / FPS).toFixed(2), frames: s.f1 - s.f0 + 1, peak: +peak.toFixed(2), th: +th.toFixed(2), moving: +mov.toFixed(3) }; });
// K3 kapısı: kamera hareketli payı (deterministik, yavaş pan'ı sayar — blok eşlemenin göreli eşiği saymıyor). Shot başına OURS bilgi amaçlı.
let cam = null;
if (!has('--no-cam')) {
  const n = r1 - r0 + 1;
  const r2 = probeEval(id, 0, 'JSON.stringify(window.__camSpeed ? window.__camSpeed(' + FPS + ', ' + n + ') : null)', '_ours-cam.png');
  const v = r2.value;
  const TH = WIDTH * K3.camMin / FPS;
  if (v && v.length > 2) cam = shots.map((s) => { const seg = v.slice(s.f0 - r0 + 1, s.f1 - r0 + 1), peak = Math.max(0, ...seg), mov = seg.filter((x) => x >= TH).length / seg.length;
    return { id: s.id, peak: +peak.toFixed(2), th: +TH.toFixed(3), moving: +mov.toFixed(3) }; });
  else if (!r2.found) console.log('  K3 kamera: ölçülemedi (' + r2.tail + ')');
}
const tot = res.reduce((a, s) => a + s.frames, 0), moving = res.reduce((a, s) => a + s.moving * s.frames, 0) / tot, durs = res.map((s) => s.dur).sort((a, b) => a - b), med = durs[Math.floor(durs.length / 2)];
const camOk = cam ? cam.every((s) => s.moving >= K3.movingMin) : null;
const J = { id, step: STEP, method: 'blok eşleme 16 px ±6 (480p), th = max(0.5, 0.2·tepe), referans analizi (bootcamp) tanımı' + (STEP > 1 ? '; adım ' + STEP + ' (' + (FPS / STEP) + ' fps örnekleme; animatik ya da tam render), yer değiştirme ÷' + STEP + '; tamsayı nicemleme tam kare hızından yumuşak' : ''), shots: res, shotMedian: med, moving: +moving.toFixed(3), hold: +(1 - moving).toFixed(3), target: { shot: TGT.shot, holdMax: TGT.holdMax, movingMin: TGT.movingMin },
  k3: { kural: 'perde OURS ≥ ' + K3.movingMin + ' + shot başına __camSpeed hareketli pay ≥ ' + K3.movingMin + ' (eşik %' + +(K3.camMin * 100).toFixed(2) + ' ekran genişliği/s); shot başına OURS bilgi', ours: +moving.toFixed(3) >= K3.movingMin, camSpeed: cam, camOk, gecer: +moving.toFixed(3) >= K3.movingMin && camOk !== false },
  perFrame: Array.from(m).map((v) => +v.toFixed(2)), perFrameRaw: STEP > 1 ? Array.from(raw).map((v) => +v.toFixed(2)) : undefined };
fs.mkdirSync(path.join(OUT, 'probe'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'probe', id + '-ours.json'), JSON.stringify(J, null, 1));
console.log('\n✓ OURS ' + id + ' · shot medyanı ' + med + ' s · hareketli pay ' + J.moving + (J.moving >= TGT.movingMin ? ' ✓' : ' ✗') + ' · hold ' + J.hold + (J.hold <= TGT.holdMax ? ' ✓' : ' ✗') + ' · ' + res.map((s) => s.id + ' ' + s.moving).join(' · ') +
  (cam ? '\n  K3 kamera (__camSpeed ≥ %' + +(K3.camMin * 100).toFixed(2) + '/s, shot başına pay ≥ ' + K3.movingMin + '): ' + cam.map((s) => s.id + ' ' + s.moving + (s.moving >= K3.movingMin ? '' : ' ✗')).join(' · ') + ' → K3 ' + (J.k3.gecer ? 'GEÇER' : 'GEÇMEZ') : ''));
