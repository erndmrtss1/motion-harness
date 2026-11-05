// belge sözleşmeleri: reviewer KARAR biçimi, kalibrasyon ve oynatım adımları, kural kataloğundaki zanaat/kota satırları;
// 1.4 orkestrasyon (PLAYBOOK V1–V8, hareket kontağı, belge hijyeni, şablonlar, reviewer/ölçüm iş sınırı) (node --test test/).
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

// 1.4 orkestrasyon: roller, kapı ilkeleri, verim V1–V8, belge hijyeni, hareket kontağı, istisna raporu
const PB = 'skills/motion-core/references/PLAYBOOK.md';

test('PLAYBOOK 1.4: rol sözleşmesi, kapı ilkeleri, V1–V8 tablosu, belge hijyeni, hareket kontağı adımı, DUR-12/13, istisna raporu', () => {
  const p = read(PB);
  for (const h of ['**Rol sözleşmesi (1.4).**', '### 2.6 Kesinti, checkpoint ve makine (1.4)', '### 3.3 Kapı ≠ brief: kapı ilkeleri (1.4)', '### 3.4 Verim V1–V8 (1.4)',
    '### 3.5 Belge hijyeni', '#### Adım 6a — Hareket kontağı', '### 7.1 İstisna raporu (1.4)', '### 7.2 Kapanış raporu', '**Brief ≠ kapı (1.3).**', '**Sanat yönetmeni brief\'i (1.4).**']) assert.ok(p.includes(h), h);
  const v = p.slice(p.indexOf('### 3.4 Verim'), p.indexOf('### 3.5 Belge'));
  for (let i = 1; i <= 8; i++) assert.match(v, new RegExp('^\\| \\*\\*V' + i + '\\*\\* \\|', 'm'), 'V' + i + ' satırı');
  assert.match(v, /\*\*V1 kapsam tablosu\*\*/);
  assert.match(p, /hareket kontağı ─► tam render/);
  assert.ok(p.includes('motion-render contact motion') && p.includes('"DUR — hareket"'));
  for (const d of ['| DUR-12 |', '| DUR-13 |', '**Bilgi kontağı (1.4, V7).**']) assert.ok(p.includes(d), d);
  assert.match(p.slice(p.indexOf('### 7.1'), p.indexOf('### 7.2')), /≤ 40 satır/);
  for (const k of ['`.githooks/pre-commit`', 'git config core.hooksPath .githooks', '`tools/render-oncesi.ps1`', '`docs/KARAR-TARIHI.md`', 'CLAUDE.md ≤ 60 satır']) assert.ok(p.includes(k), k);
});

test('templates/CLAUDE.md ≤ 60 satır ve 1.4 kurallarını taşır; bağlayıcı şablonlarda silinti izi yok; varsayılan sayılar CLAUDE ↔ project aynı', () => {
  const c = read('templates/CLAUDE.md');
  const n = c.replace(/\n+$/, '').split('\n').length;
  assert.ok(n <= 60, 'templates/CLAUDE.md ' + n + ' satır');
  for (const k of ['docs/KARAR-TARIHI.md', '.githooks/pre-commit', 'celiski-tara', 'tools/render-oncesi.ps1', 'docs/BRIEF-DIRECTOR.md', '**V1**', '**V8**',
    'still ve klip ayrı reviewer', 'kredi yüzünden yapılmadı / kabul edildi', 'araç kısıtı içeriği şekillendirmez']) assert.ok(c.includes(k), k);
  for (const f of ['templates/CLAUDE.md', 'templates/project.md', 'templates/SOZLUK.md', 'templates/TESLIM.md']) {
    const s = read(f);
    assert.ok(!/~~|<\/?(?:del|strike)>/.test(s), f + ': üstü çizili');   // <s> şablonda saniye yer tutucusudur
    assert.ok(!/KALDIRILDI|GEÇERSİZ/.test(s), f + ': silinti notu');
  }
  for (const k of ['≤ 3 madde', '≤ 3 soru', '≤ 40 satır', '≤ 30k', '≤ 60k']) for (const f of ['templates/CLAUDE.md', 'templates/project.md']) assert.ok(read(f).includes(k), f + ': ' + k);
});

test('şablonlar 1.4: KARAR-TARIHI, BRIEF-DIRECTOR, PAKET-NOTLAR; project.md §3 QA kapsamı + kapı sınıflaması, §11 karar tablosu, §12 borç; RAPOR iki biçim', () => {
  const k = read('templates/KARAR-TARIHI.md');
  for (const h of ['## Arşivlenen kural metinleri', '## Faz kararları (aynen)', 'Kullanıcı metni aynen', 'Uygulama notu (ana oturum; karar değil)']) assert.ok(k.includes(h), h);
  const b = read('templates/BRIEF-DIRECTOR.md');
  for (const h of ['## 1. Sanat yönetmeni brief\'i', 'Estetik ölçüt yalnız §1', '## 7. İşletim kuralları (ölçüt değil', '## 8. Güncel iş', 'Kapı listesi']) assert.ok(b.includes(h), h);
  assert.ok(read('templates/PAKET-NOTLAR.md').includes('| # | tarih | faz / iş | ne oldu (sayıyla) | nerede | öneri | durum |'));
  const pr = read('templates/project.md');
  for (const h of ['Kalite referansı (reviewer kalibrasyonu, zorunlu)', '**QA kapsamı**', '**Kapı sınıflaması**', '| id | tarih | öz | durum |', '## 12. Borç kütüğü',
    '| borç | kaynak (faz, bulgu) | neden ertelendi | ne zaman / koşul |']) assert.ok(pr.includes(h), h);
  const r = read('templates/RAPOR.md');
  assert.ok(r.includes('A) İSTİSNA RAPORU') && r.includes('B) KAPANIŞ RAPORU') && r.includes('**Kredi yüzünden yapılmadı / kabul edildi:** yok'));
  const dt = read('skills/motion-core/references/DOCS-TEMPLATES.md');
  for (const h of ['### 3.13 `docs/KARAR-TARIHI.md` (1.4)', '### 3.14 `docs/CHECKPOINT-<görev>.md` (1.4)', '### 3.15 `docs/BRIEF-DIRECTOR.md` (1.4)', '### 3.16 `docs/PAKET-NOTLAR.md` (1.4)']) assert.ok(dt.includes(h), h);
  const adr = read('skills/motion-core/references/DECISIONS.md');
  for (const h of ['## ADR-026', '## ADR-027', '## ADR-028', '## ADR-029']) assert.ok(adr.includes(h), h);
});

test('reviewer 1.4: ≤ 3 soru, still ve klip ayrı, hareket kapısı, yan yana referans, nesne tanımı; KARAR ifadesi parça ve hareket kapısını tutar', () => {
  const s = read('skills/motion-reviewer/SKILL.md');
  for (const k of ['### 1.4 İş sınırı: ≤ 3 soru', '**İş başına ≤ 3 soru.**', '### 7.2 Still ve klip ayrı reviewer (1.4)', '**still ve klip ayrı reviewer**', '| `hareket` (1.4) |',
    '**nesne tanımıyla**', '**Sayısal estetik şartı bilgidir (1.4).**', '**Yan yana (1.4, zorunlu).**']) assert.ok(s.includes(k), k);
  const re = new RegExp(/Doğrulama düzenli ifadesi:\s*```\s*(\^KARAR[^\n]+)\s*```/.exec(s)[1]);
  assert.ok(re.test('KARAR: ŞARTLI GEÇER · §0.6 4/5 · UCUZ geçer · kapı animatik-still full ≥4/5 · tur r1 · birim P1'), 'still parçası');
  assert.ok(re.test('KARAR: GEÇER · §0.6 2/3 · UCUZ geçer · kapı hareket full ≥2/3 · tur r1 · birim P1'), 'hareket kapısı');
  const a = read('agents/motion-reviewer.md');
  assert.match(a, /^tools: .*\bWrite\b/m);
  for (const k of ['**≤ 3 soru**', 'Referans klip zorunludur', 'En geç 90. turda', 'Write yalnız `out/review/<kapı-id>/` altına']) assert.ok(a.includes(k), k);
  assert.ok(read('templates/REVIEWER.md').includes('`<birim>-<tür>-still-r<k>`'));
});

test('ölçüm ajanı ≤ 3 madde tek tur, Write yalnız out/measure; gate · faz · init · director 1.4 adımları; --fstep yalnız eski ad', () => {
  const m = read('agents/motion-measure.md');
  assert.match(m, /^tools: .*\bWrite\b/m);
  for (const k of ['**İş başına ≤ 3 madde, tek tur.**', 'En geç 60. turda', '"ölçülemedi"', 'yalnız `out/measure/<iş>/` altına yazılır ve dosyadan koşar']) assert.ok(m.includes(k), k);
  const g = read('commands/gate.md');
  for (const k of ['`--ara`', 'motion-render contact motion', '--page-step 2', 'motion-render celiski-tara', '**Still ve klip ayrı reviewer**', 'Sorular (≤ 3, öncelik sırasıyla)',
    '"DUR — hareket"', 'İş başına ≤ 3 madde, tek tur']) assert.ok(g.includes(k), k);
  const f = read('commands/faz.md');
  for (const k of ['6a. **Hareket kontağı**', 'docs/BRIEF-DIRECTOR.md', 'docs/KARAR-TARIHI.md', '**istisna raporu**', '## 3a. `ilkel`']) assert.ok(f.includes(k), k);
  const i = read('commands/init.md');
  for (const k of ['.githooks/pre-commit', 'docs/celiski.json', 'tools/render-oncesi.ps1', 'tools/render-oncesi.sh', 'git config core.hooksPath .githooks']) assert.ok(i.includes(k), k);
  const d = read('agents/motion-director.md');
  for (const k of ['docs/BRIEF-DIRECTOR.md', 'docs/CHECKPOINT-<görev>.md', '**Değişiklik listesi**', 'motion-render contact motion']) assert.ok(d.includes(k), k);
  for (const p of ['commands/gate.md', 'agents/motion-director.md', 'skills/motion-core/SKILL.md', PB, 'templates/CLAUDE.md']) assert.ok(!/--fstep \d/.test(read(p)), p + ': --fstep N');
});
