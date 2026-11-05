// world belgeleri (1.4): photo-plate set yöntemi (SET.md + world.json set/edge), motion-world ilkel mekaniği (references/ILKEL.md),
// GENAI maskeli bölge üretimi + istem kalıpları (§17–§18), bağlantılar ve kütüphane world.json şeması (node --test test/).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { materialGate } from '../lib/malzeme.mjs';

const PKG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(PKG, p), 'utf8');
const LIB = 'skills/motion-world/library';
const PP = LIB + '/photo-plate';
const jsonBlocks = (s) => [...s.matchAll(/```json\n([\s\S]*?)```/g)].map((m) => JSON.parse(m[1]));
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const REF = 'referans ölçümü (kaynak proje)';

test('photo-plate world.json: mevcut alanlar aynı; set + edge blokları (1.4) geçerli ve etiketli', () => {
  const w = JSON.parse(read(PP + '/world.json'));
  // mevcut sözleşme değişmedi
  assert.deepEqual(w.band, [12, 28]);
  assert.equal(w.k1.mask, 'alpha');
  assert.equal(w.accent.color, '#D8301A', 'aksan kütüphane yer tutucusu');
  assert.deepEqual(w.camera.parallax, { bg: 0.6, subject: 1.0, fg: 1.3, pxMin: 4, pxMax: 12, bleedMin: 20, bleedMax: 40 });
  assert.equal(w.motion.upscaleMax, 1.25);
  // set bloğu
  const s = w.set;
  assert.ok(isObj(s) && s.method === 'set üretilir, içerik çizilir');
  assert.deepEqual(s.layers.map((l) => l.name), ['arka', 'orta', 'on']);
  assert.equal(s.layers[0].z, 0);
  assert.equal(s.lamp.single, true, 'film boyunca tek lamba');
  for (const k of ['P', 'h', 'whitePoint', 'cctK', 'uncertaintyPx']) assert.ok(k in s.lamp, 'lamp.' + k);
  for (const k of ['P', 'h', 'whitePoint', 'cctK', 'uncertaintyPx']) assert.equal(s.lamp[k], null, 'ölçülmemiş değer uydurulmaz: lamp.' + k);
  assert.equal(s.match.mode, 'darken');
  assert.ok(isNum(s.match.gainMax) && s.match.gainMax <= 1, 'eşleme ışık eklemez');
  assert.equal(s.shadow.model, 'ambient');
  for (const k of ['dirTopShare', 'blockPx', 'satMax', 'blockFlatMax', 'centerBrightShare', 'edgeDarkShare']) assert.ok(isNum(s.lightRead[k]), 'lightRead.' + k);
  for (const k of ['sizeTol', 'posTolPx', 'overlapMax', 'attemptsMax']) assert.ok(isNum(s.accept[k]), 'accept.' + k);
  assert.ok(s.lightRead.note.includes(REF) && s.accept.note.includes(REF));
  // edge bloğu
  const e = w.edge;
  for (const k of ['matteMaxPx', 'haloMax', 'upscaleMax', 'contactGapPx']) assert.ok(isNum(e[k]), 'edge.' + k);
  assert.equal(e.contactGapPx, 0);
  assert.ok(Array.isArray(e.grainRatio) && e.grainRatio.length === 2 && e.grainRatio[0] < 1 && e.grainRatio[1] > 1, 'gren oranı 1 çevresinde aralık');
  assert.ok(isNum(e.seam.rowsMax) && isNum(e.seam.lumaMax));
  assert.ok(isObj(e.bodyClass.flat) && isObj(e.bodyClass.round) && typeof e.bodyClass.nested === 'string');
  assert.ok(isNum(e.bodyClass.round.haloRel) && isNum(e.bodyClass.round.terminatorRel));
  assert.ok(isNum(e.contact.bandMin) && isNum(e.contact.shadowMin));
  assert.ok(e.note.includes(REF), 'edge değerleri referans ölçümü etiketli');
});

test('kütüphane world.json dosyaları manifest şemasından geçer (band, k1.mask, palet, sayısal bloklar)', () => {
  const dirs = fs.readdirSync(path.join(PKG, LIB)).filter((d) => fs.existsSync(path.join(PKG, LIB, d, 'world.json')));
  assert.ok(dirs.includes('photo-plate') && dirs.length >= 5);
  for (const d of dirs) {
    const w = JSON.parse(read(LIB + '/' + d + '/world.json'));
    assert.ok(Array.isArray(w.band) && w.band.length === 2 && w.band.every(isNum) && w.band[0] < w.band[1], d + ' band');
    assert.ok(['dom', 'ink', 'alpha'].includes(w.k1 && w.k1.mask), d + ' k1.mask');
    for (const [k, v] of Object.entries(w.palette || {})) assert.match(String(v), /^#[0-9A-Fa-f]{6}$/, d + ' palette.' + k);
    for (const b of ['camera', 'motion', 'supersample']) if (w[b] != null) {   // manifest validate `nums` kuralı
      assert.ok(isObj(w[b]), d + ' ' + b);
      for (const [k, v] of Object.entries(w[b])) assert.ok(isNum(v) || isObj(v) || Array.isArray(v) || typeof v === 'string', d + ' ' + b + '.' + k);
    }
    if (typeof w.lessons === 'string') assert.ok(fs.existsSync(path.join(PKG, LIB, d, w.lessons)), d + ' lessons');
  }
});

test('photo-plate SET.md: bölümler, kurallar, JSON örnekleri çözülür; set kaydı ↔ world.json tutarlı; ingest-kapi set alt nesnesini yok sayar', () => {
  const s = read(PP + '/SET.md');
  for (const h of ['## §0 İlke: set üretilir, içerik çizilir', '## §1 Katmanlı plaka', '## §2 2.5D derinlik haritası', '## §3 Fiziksel paralaks',
    '## §4 Set ışığını okuma', '## §5 Bütünlük = ışık + tasarım dili, envanter değil', '## §6 Set kaydı', '## §7 Plaka kabulü', '## §8 Büyük masa',
    '## §9 Akış', '## §10 Tuzaklar']) assert.ok(s.includes(h), h);
  for (let i = 1; i <= 8; i++) assert.ok(s.includes('**SET-' + i + ' ·'), 'SET-' + i);
  for (const k of ['M-KENAR', 'M-ASKIDA', 'M-DIKIS', 'ingest-kapi', 'GENAI §17']) assert.ok(s.includes(k), k);
  const [rec, item] = jsonBlocks(s);
  for (const k of ['intent', 'lamp', 'camera', 'layers', 'objects', 'content', 'registration']) assert.ok(k in rec, 'set.json.' + k);
  assert.deepEqual(rec.layers.map((l) => l.name), ['arka', 'orta', 'on']);
  assert.ok(rec.objects.every((o) => 'sizeMm' in o && ['flat', 'round', 'nested'].includes(o.bodyClass)), 'nesne gerçek ölçüsü + gövde sınıfı');
  const W = JSON.parse(read(PP + '/world.json'));
  for (const k of ['P', 'h', 'whitePoint', 'cctK', 'uncertaintyPx']) assert.ok(k in rec.lamp && k in W.set.lamp, 'lamp.' + k + ' iki yerde');
  assert.equal(item.method, 'region');
  assert.ok(Array.isArray(item.refs) && item.refs.length >= 2, 'yer tutucu + temiz plaka');
  for (const k of ['edge', 'placement', 'outsideMask', 'seam', 'contact']) assert.ok(k in item.accept.set, 'accept.set.' + k);
  // ingest-kapi (materialGate) bu kabul kümesiyle koşar: set alt nesnesi yok sayılır, bölge ölçülür, göz bekler
  const N = 128, img = { data: Buffer.alloc(N * N * 3).map((_, i) => 120 + ((i * 7919) % 23)), W: N, H: N, C: 3 };
  const acc = JSON.parse(JSON.stringify(item.accept)); acc.regions[0].rect = [0, 0, N, N]; acc.regions[0].stdMin = 0;
  const r = materialGate(img, acc);
  assert.equal(r.rows.length, 1);
  assert.equal(r.verdict, 'GÖZ BEKLİYOR');
});

test('motion-world references/ILKEL.md: ILK kuralları, nesne/ön plan a–f, kenar + gövde sınıfı, askıda; başvurular çözülür', () => {
  const s = read('skills/motion-world/references/ILKEL.md');
  for (const h of ['## §1 Sprite ilkeli', '## §2 Nesne / ön plan kuralı (a–f)', '## §3 Nesne kenarı kuralı', '## §4 Askıda nesne (UCUZ #17)',
    '## §5 Maskeli bölge ve dikiş', '## §6 İlkel kütüphanesi onayı → film']) assert.ok(s.includes(h), h);
  for (let i = 1; i <= 12; i++) assert.match(s, new RegExp('\\*\\*(?:[^*]*\\()?ILK-' + i + '\\b'), 'ILK-' + i);
  for (const m of ['(a) dayanak', '(b) gölge', '(c) odak', '(d) silüet', '(e) süreklilik', '(f) içerik']) assert.ok(s.includes(m), m);
  for (const c of ['`flat`', '`round`', '`nested`']) assert.ok(s.includes(c), 'gövde sınıfı ' + c);
  for (const k of ['M-KENAR', 'M-ASKIDA', 'M-DIKIS', 'PLAYBOOK.md` §4.4a', 'library/photo-plate/SET.md']) assert.ok(s.includes(k), k);
  assert.ok(read('skills/motion-core/references/PLAYBOOK.md').includes('### 4.4a İlkel kütüphanesi'), 'PLAYBOOK §4.4a var');
  const W = JSON.parse(read(PP + '/world.json'));
  for (const f of [...s.matchAll(/`edge\.([A-Za-z]+)(?:\.([A-Za-z]+))?`/g)]) assert.ok(f[1] in W.edge && (!f[2] || f[2] in W.edge[f[1]]), 'edge.' + f[1] + (f[2] ? '.' + f[2] : '') + ' world.json\'da');
});

test('GENAI 1.4: §17 maskeli bölge üretimi, §18 istem kalıpları, §19 eşleme; bölüm başvuruları çözülür', () => {
  const g = read('skills/motion-core/references/GENAI.md');
  for (const h of ['## 17. Plaka düzenleme: maskeli bölge üretimi (1.4)', '## 18. İstem kalıpları (1.4)', '## 19. RULES eşlemesi']) assert.ok(g.includes(h), h);
  assert.ok(!g.includes('## 17. RULES eşlemesi'));
  assert.ok(g.includes("eşleme §19'da"), 'başlık başvurusu güncel');
  const heads = new Set([...g.matchAll(/^#{2,3} (\d+(?:\.\d+)?)[. ]/gm)].map((m) => m[1]));
  for (let i = 1; i <= 8; i++) assert.ok(heads.has('17.' + i), '17.' + i);
  for (let i = 1; i <= 5; i++) assert.ok(heads.has('18.' + i), '18.' + i);
  for (const m of g.matchAll(/§(1[78](?:\.\d+)?)\b/g)) assert.ok(heads.has(m[1]), '§' + m[1] + ' başlığı var');
  const ex = jsonBlocks(g).find((j) => j.method === 'region');
  assert.ok(ex && ex.attempt === '1/3' && 'place' in ex && 'set' in ex.accept, '§17.3 örneği');
  assert.equal(materialGate({ data: Buffer.alloc(64 * 64 * 3, 128), W: 64, H: 64, C: 3 }, ex.accept).verdict, 'GÖZ BEKLİYOR', 'ingest-kapi set alt nesnesini yok sayar');
  for (const k of ['düz gri yer tutucu', 'İşaret değil maske', 'İki aşamalı', 'Kılavuz temizliği', 'Negatif liste', 'bağlam + kırpım', 'İstemsiz araç', 'Seed parametresi olmayan']) assert.ok(g.includes(k), k);
});

test('motion-world SKILL + INDEX: 1.4 bağlantıları çözülür', () => {
  const s = read('skills/motion-world/SKILL.md');
  for (const p of ['references/ILKEL.md', 'library/photo-plate/SET.md']) {
    assert.ok(s.includes(p), p);
    assert.ok(fs.existsSync(path.join(PKG, 'skills/motion-world', p)), p + ' dosyası var');
  }
  assert.ok(s.includes('| `set` (1.4) |') && s.includes('| `edge` (1.4) |'), '§5 alan satırları');
  const row = read(LIB + '/INDEX.md').split('\n').find((l) => l.startsWith('| [`photo-plate`]'));
  assert.ok(row && row.includes('(photo-plate/SET.md)'), 'INDEX photo-plate satırı SET.md');
  assert.ok(read(PP + '/lessons.md').includes('`SET.md`'), 'lessons → SET.md');
});

test('belgeler arası § başvuruları çözülür (GENAI · SET.md · ILKEL.md)', () => {
  const heads = (t, re) => new Set([...t.matchAll(re)].map((m) => m[1]));
  const G = heads(read('skills/motion-core/references/GENAI.md'), /^#{2,3} (\d+(?:\.\d+)?)[. ]/gm);
  const S = heads(read(PP + '/SET.md'), /^## §(\d+) /gm), I = heads(read('skills/motion-world/references/ILKEL.md'), /^## §(\d+) /gm);
  const files = [PP + '/SET.md', PP + '/lessons.md', PP + '/world.json', 'skills/motion-world/SKILL.md', 'skills/motion-world/references/ILKEL.md', 'skills/motion-core/references/GENAI.md'];
  let n = 0;
  for (const f of files) {
    const t = read(f);
    for (const [re, H, ad] of [[/GENAI(?:\.md`?)? §(\d+(?:\.\d+)?)/g, G, 'GENAI'], [/SET\.md`? §(\d+)/g, S, 'SET.md'], [/ILKEL\.md`? §(\d+)/g, I, 'ILKEL.md']])
      for (const m of t.matchAll(re)) { n++; assert.ok(H.has(m[1]), f + ': ' + ad + ' §' + m[1] + ' başlığı yok'); }
  }
  assert.ok(n >= 20, 'başvuru sayısı ' + n);
});

test('1.4 world belgeleri: PN numarası, mutlak yol ve kullanıcı dizini yok', () => {
  for (const f of [PP + '/SET.md', PP + '/lessons.md', PP + '/world.json', LIB + '/INDEX.md', 'skills/motion-world/SKILL.md',
    'skills/motion-world/references/ILKEL.md', 'skills/motion-core/references/GENAI.md']) {
    const t = read(f);
    assert.doesNotMatch(t, /\bPN-\d+/, f + ': PN numarası');
    assert.doesNotMatch(t, /\b[A-Za-z]:[\\/][A-Za-z]/, f + ': mutlak yol');
    assert.doesNotMatch(t, /\/(?:Users|home)\/[A-Za-z]/, f + ': kullanıcı dizini');
  }
});
