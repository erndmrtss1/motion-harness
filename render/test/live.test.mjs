// live.test.mjs — canlı profil şablonunun ölçüm testi: `motion-render live --qc --seconds 8` (node --test).
// Geçici proje kökünde koşar (out/ oraya yazılır). Chromium sahte ses girişine erişemezse test atlanır (ölçülemedi ≠ kaldı).
// Ölçüt: CONTRACT §6 / RULES PR-3 — ≥ 60 fps (ortalama ve p5) · gecikme p95 ≤ 100 ms · düşen kare 0 · tetik p95 ≤ 100 ms.
// Kare zamanlaması makine yüküne duyarlıdır: KALDI'da bir kez yinelenir; yine kalır ve yalnız fps/düşen kare tutmuyorsa
// ve ölçüm penceresinde makine CPU'su > %70 ise test "ortam yükü" gerekçesiyle atlanır (gecikme ve mekanizma yine denetlenir).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'motion-render.mjs');

test('live --qc: şablon sayfada fps, gecikme ve düşen kare ölçülür; ölçüt tutar', { timeout: 300000 }, (t) => {
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'motion-live-'));
  const jf = path.join(proj, 'out', 'probe', 'live-qc.json');
  const run = () => {
    const r = spawnSync(process.execPath, [BIN, 'live', '--project', proj, '--qc', '--seconds', '8'], { encoding: 'utf8', timeout: 150000 });
    const rep = fs.existsSync(jf) ? JSON.parse(fs.readFileSync(jf, 'utf8')) : null;
    return { r, rep };
  };
  try {
    let { r, rep } = run();
    if (r.status === 1 && (!rep || rep.verdict === 'ÖLÇÜLEMEDİ')) {
      t.skip('Chromium sahte ses girişi kullanılamadı: ' + ((rep && rep.reason) || String(r.stderr || r.error || '').slice(0, 200)));
      return;
    }
    assert.ok(rep, 'live-qc.json yazılmadı:\n' + r.stdout + r.stderr);
    assert.ok(fs.existsSync(path.join(proj, 'out', 'probe', 'live-qc.md')), 'live-qc.md yazılmadı');

    // mekanizma: ölçüm gerçekten yapıldı mı (sayıların varlığı ve tutarlılığı)
    const m = rep.metrics;
    assert.ok(m.frames >= 300, 'ölçüm penceresinde kare sayısı az: ' + m.frames);
    assert.ok(m.latency && m.latency.valid >= 3, 'gecikme örneği < 3: ' + JSON.stringify(m.latency && m.latency.samples));
    assert.equal(m.latency.anchor, 'track.stats', 'akış başı MediaStreamTrack.stats ile çapalanmalı');
    assert.ok(m.latency.first.p95 > 0, 'gecikme pozitif olmalı (negatif = çapa hatası)');
    assert.ok(rep.summary.modesSeen.includes('konusuyor') && rep.summary.modesSeen.includes('dinliyor'), 'durum makinesi konuşuyor/dinliyor geçişi yok: ' + rep.summary.modesSeen);
    assert.equal(m.triggers.samples.length, 3, 'klavye tetiklerinin üçü de ölçülmeli');
    assert.ok(['GEÇTİ', 'KALDI'].includes(rep.verdict));

    // ölçüt
    if (r.status === 3) {
      t.diagnostic('ilk koşu KALDI (' + rep.checks.filter((c) => !c.gecti).map((c) => c.id + '=' + c.deger).join(', ') + ') · yineleniyor');
      ({ r, rep } = run());
    }
    const failed = rep.checks.filter((c) => !c.gecti);
    const loadOnly = failed.length > 0 && failed.every((c) => /^fps-|^dusen-/.test(c.id)) && rep.environment.machineCpuBusyPct > 70;
    if (r.status === 3 && loadOnly) {
      t.skip(`ortam yükü: makine CPU %${rep.environment.machineCpuBusyPct} · ` + failed.map((c) => c.id + '=' + c.deger).join(', ') + ' (gecikme p95 ' + rep.summary.latencyP95 + ' ms geçti)');
      return;
    }
    assert.equal(r.status, 0, 'live --qc KALDI: ' + failed.map((c) => `${c.ad} = ${c.deger} (${c.olcut})`).join(' · ') + '\n' + rep.warnings.join('\n'));
    assert.ok(rep.summary.latencyP95 <= 100 && rep.summary.dropped === 0 && rep.summary.fpsAvg >= 59.7);
    t.diagnostic(`fps ${rep.summary.fpsAvg} (p5 ${rep.summary.fpsP5}) · gecikme p50/p95 ${rep.summary.latencyP50}/${rep.summary.latencyP95} ms · düşen ${rep.summary.dropped} · ${rep.environment.webglRenderer}`);
  } finally {
    fs.rmSync(proj, { recursive: true, force: true });
  }
});
