// motion-render k6 — K6 bileşen yoğunluğu: shot başına görünür farklı motor bileşeni sayımı (DOM `[data-c]` + `[data-fx]`), birden çok an.
//
//   motion-render k6 <id> --at "S01:0.8,2.2,3.6;S02:4.6,6.6,9.0;…"   → out/probe/<id>-k6.json
//   motion-render k6 <id>                                            anlar manifestten: shot başına %20/%50/%80 (sahne ya da parent shots,
//                                                                    sahne range'iyle kesişen; saniye = sahne sayfasının kendi zamanı)
// Sayılan: data-c (bileşen kimliği) ve data-fx (world parçası: "fx:<ad>"); görünür olanlar (visibility/display); her shot için anların birleşimi.
import fs from 'node:fs';
import path from 'node:path';
import { MAN, FPS, OUT, sceneById, rel } from '../lib/project.mjs';
import { cli, probeEval } from '../lib/qc-common.mjs';

const { argOf, pos } = cli(process.argv.slice(2), ['--at']);
const id = pos[0];
if (!id) { console.error('kullanım: motion-render k6 <id> [--at "S01:0.8,2.2;S02:…"]'); process.exit(2); }
let S; try { S = sceneById(id); } catch (e) { console.error(e.message); process.exit(1); }

let at;
if (argOf('--at')) at = argOf('--at').split(';').filter(Boolean).map((s) => { const [k, v] = s.split(':'); return [k, v.split(',').map(Number)]; });
else {
  const P = S.parent ? (MAN.scenes || []).find((x) => x.id === S.parent) || S : S, r0 = S.range ? S.range[0] : 0, r1 = S.range ? S.range[1] : S.frames - 1;
  const sf = (s, k) => (s['a' + k] != null ? s['a' + k] : s[k]);   // ses zamanı karesi (af0/af1; eşlemsiz f0/f1)
  at = (P.shots || []).filter((s) => sf(s, 'f1') >= r0 && sf(s, 'f0') <= r1).map((s) => {
    const f0 = Math.max(sf(s, 'f0'), r0) - r0, f1 = Math.min(sf(s, 'f1'), r1) - r0;
    return [s.id, [0.2, 0.5, 0.8].map((q) => +((f0 + q * (f1 - f0)) / FPS).toFixed(3))];
  });
  if (!at.length) { console.error('k6: --at yok ve manifestte shot yok'); process.exit(1); }
}
const js = '(async function(){var A=' + JSON.stringify(at) + ',o={};for(var i=0;i<A.length;i++){var set={};for(var j=0;j<A[i][1].length;j++){window.__seek(A[i][1][j]);await new Promise(function(r){requestAnimationFrame(function(){requestAnimationFrame(r)})});'
  + 'document.querySelectorAll("[data-c],[data-fx]").forEach(function(e){var r=e.getBoundingClientRect(),cs=getComputedStyle(e);if(cs.visibility==="hidden"||cs.display==="none")return;var k=e.getAttribute("data-c")||("fx:"+e.getAttribute("data-fx"));set[k]=(set[k]||0)+1;});}o[A[i][0]]=Object.keys(set).sort();}return JSON.stringify(o);})()';
const r = probeEval(id, 0, js, '_k6.png');
if (!r.found) { console.error('k6: ölçülemedi (' + r.tail + ')'); process.exit(1); }
const o = r.value, outF = path.join(OUT, 'probe', id + '-k6.json');
fs.writeFileSync(outF, JSON.stringify({ id, method: 'görünür data-c / data-fx öznitelikleri, anların birleşimi', at: Object.fromEntries(at), shots: o }, null, 1));
Object.entries(o).forEach(([k, v]) => console.log(k + ' · ' + v.length + ' · ' + v.join(', ')));
console.log('→ ' + rel(outF));
