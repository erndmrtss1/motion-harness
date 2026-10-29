// belge sözleşmeleri: reviewer KARAR biçimi, kalibrasyon ve oynatım adımları, kural kataloğundaki zanaat/kota satırları (node --test test/).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(PKG, p), 'utf8');

test('reviewer SKILL: KARAR düzenli ifadesi örnek satırı tutar; kalibrasyon/DUR ikinci satırları KARAR sayılmaz', () => {
  const s = read('skills/motion-reviewer/SKILL.md');
  const re = new RegExp(/Doğrulama düzenli ifadesi:\s*```\s*(\^KARAR[^\n]+)\s*```/.exec(s)[1]);
  const ex = /Örnek: `(KARAR:[^`]+)`/.exec(s)[1];
  assert.ok(re.test(ex), ex);
  assert.ok(!re.test('kalibrasyon: REF-1 · 5: %4 → %9'));
  assert.ok(re.test('KARAR: GEÇMEZ · §0.6 yok · UCUZ geçer · kapı animatik full yok · tur r1 · birim P1'), 'referans yok kaydı biçime uyar');
  for (const k of ['### 3.0 Kalibrasyon', '### 7.1 Animatik kapısında oynatım', 'DUR: kalibrasyon referansı yok']) assert.ok(s.includes(k), k);
  assert.ok(read('templates/REVIEWER.md').includes('kalibrasyon: <ref adları>'));
  assert.ok(read('commands/gate.md').includes('Kalibrasyon referansı'));
  assert.ok(read('templates/project.md').includes('Kalite referansı (reviewer kalibrasyonu, zorunlu)'));
});

test('RULES: zanaat kapısı ZN-1…ZN-5 ölçüleri frame-check tiplerine bağlı; tip sayısı 25', async () => {
  const r = read('skills/motion-core/references/RULES.md');
  for (const [id, fc] of [['ZN-1', 'fc:pop'], ['ZN-2', 'fc:velocity'], ['ZN-3', 'fc:entryExit'], ['ZN-4', 'fc:moves'], ['ZN-5', 'fc:onset']]) {
    const row = r.split('\n').find((l) => l.startsWith('| ' + id + ' |'));
    assert.ok(row && row.includes(fc), id);
  }
  assert.match(r, /`frame-check` \(25 tip/);
  const { TYPE_NAMES } = await import('../lib/fc/index.mjs');
  assert.equal(TYPE_NAMES.length, 25);
});

test('PLAYBOOK: ilkel kütüphanesi onayı → film; brief ≠ kapı (BAĞLAM satırı, CRAFT-REF şablonu)', () => {
  const p = read('skills/motion-core/references/PLAYBOOK.md');
  assert.match(p, /sözlük ─► ilkel kütüphanesi ─► P1/);
  assert.ok(p.includes('### 4.4a İlkel kütüphanesi'));
  assert.ok(p.includes('**Brief ≠ kapı (1.3).**'));
  assert.ok(read('templates/FAZ.md').includes('BAĞLAM: docs/SOZLUK.md (tüm film) · docs/CRAFT-REF.md'));
  assert.ok(read('commands/faz.md').includes('## 3a. `ilkel`'));
  assert.ok(read('templates/CRAFT-REF.md').includes('## 4. Onaylı ilkeller'));
  assert.ok(read('agents/motion-director.md').includes('**Film bağlamı**'));
});
