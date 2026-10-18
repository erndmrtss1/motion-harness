#!/usr/bin/env node
// lookdev-diff eşik kalibrasyonu (HK-27/28): ağırlıklar tasarımla sabit, YALNIZ iskelet eşiği kalibre edilir.
// Kullanım: node dev/lookdev-calib.mjs <etiketler.json> [--md out.md]
// Girdi: { runs: {proje: "lookdev-diff --dump çıktısı.json"}, skel: [[p1, a, p2, b, [reviewer iskelet puanları…]]], cross: [[p1, a, p2, b, tür]] }
// Etiket: bütün puanlar ≥ 5 → aynı iskelet (POZ); bütün puanlar ≤ 3 → farklı (NEG); diğerleri belirsiz (sayılmaz).
// Marj = min(POZ araç) − max(NEG araç); eşik = aralığın ortası. Projeler arası iskelet bilgi amaçlıdır (kapı yön içidir, HK-29).
import fs from 'node:fs';
import path from 'node:path';
import { skelSets, paletSets } from '../render/lib/lookdev-diff.mjs';
const args = process.argv.slice(2), man = JSON.parse(fs.readFileSync(path.resolve(args[0]), 'utf8')), dir = path.dirname(path.resolve(args[0]));
const R = Object.fromEntries(Object.entries(man.runs).map(([k, f]) => [k, JSON.parse(fs.readFileSync(path.resolve(dir, f), 'utf8'))]));
const kare = (P, Y) => { const k = R[P].yonler[Y].kare; if (!k) throw new Error(P + ' --dump ile koşulmamış'); return k; };
const f1 = (v) => (v == null ? '—' : String(+v.toFixed(1)).replace('.', ','));
const rows = man.skel.map(([P1, a, P2, b, rv]) => {
  const sk = skelSets(kare(P1, a).map((k) => k.boxes), kare(P2, b).map((k) => k.boxes));
  const lab = rv.every((v) => v >= 5) ? 'POZ' : rv.every((v) => v <= 3) ? 'NEG' : 'belirsiz';
  return { P: P1 === P2 ? P1 : P1 + '/' + P2, a: P1 === P2 ? a : P1 + '-' + a, b: P1 === P2 ? b : P2 + '-' + b, ic: P1 === P2, rv, lab, isk: sk.score, parts: sk.parts };
});
// marj varyantları: (a) POZ yalnız yön içi uzlaşı, NEG hepsi (kullanıcı tarifi, kalibrasyon) · (b) POZ hepsi (projeler arası tek reviewer dahil)
const marjOf = (poz, neg) => { const lo = Math.min(...poz.map((r) => r.isk)), hi = Math.max(...neg.map((r) => r.isk)), esik = +((lo + hi) / 2).toFixed(1);
  return { lo, hi, marj: lo - hi, esik, err: poz.filter((r) => r.isk < esik).length + neg.filter((r) => r.isk >= esik).length, nP: poz.length, nN: neg.length }; };
const NEG = rows.filter((r) => r.lab === 'NEG'), Va = marjOf(rows.filter((r) => r.lab === 'POZ' && r.ic), NEG), Vb = marjOf(rows.filter((r) => r.lab === 'POZ'), NEG);
let md = '| çift | tür | reviewer iskelet | etiket | araç iskelet | rol (kahraman/bant/metin/kenar) |\n|---|---|---|---|---:|---|\n';
for (const r of rows) md += `| ${r.ic ? r.P + ' ' : ''}${r.a}↔${r.b} | ${r.ic ? 'yön içi' : 'projeler arası'} | ${r.rv.join(' / ')} | ${r.lab} | ${f1(r.isk)} | ${['hero', 'band', 'text', 'edge'].map((k) => (r.parts[k] == null ? '—' : f1(r.parts[k] * 10))).join(' / ')} |\n`;
for (const [ad, V] of [['(a) POZ yön içi · NEG hepsi', Va], ['(b) POZ hepsi · NEG hepsi', Vb]])
  md += `\n${ad}: POZ n=${V.nP} en düşük ${f1(V.lo)} · NEG n=${V.nN} en yüksek ${f1(V.hi)} · **marj ${f1(V.marj)}** · eşik aralığı [${f1(Math.min(V.hi, V.lo))}, ${f1(Math.max(V.hi, V.lo))}] · orta ${f1(V.esik)} · sınıf hatası ${V.err}`;
const esik = Va.esik;
md += '\n';
md += '\n| çapraz | tür | araç iskelet | araç palet | sonuç |\n|---|---|---:|---:|---|\n';
for (const [P1, a, P2, b, kind] of man.cross || []) {
  const sk = skelSets(kare(P1, a).map((k) => k.boxes), kare(P2, b).map((k) => k.boxes)), pl = paletSets(kare(P1, a).map((k) => k.pal), kare(P2, b).map((k) => k.pal));
  const ok = kind.startsWith('teslim') ? pl.score < 3.5 : kind === 'palet≥' ? pl.score >= 3.5 : pl.score < 3.5;
  md += `| ${P1}-${a} ↔ ${P2}-${b} | ${kind} | ${f1(sk.score)} | ${f1(pl.score)} | ${ok ? '✓' : '✗'} |\n`;
}
console.log(md);
const mo = args[args.indexOf('--md') + 1]; if (args.includes('--md')) fs.writeFileSync(mo, md);
