// motion-render tts — yerel, kredisiz metin → konuşma (ses hattını üretken çağrı olmadan sınamak için; taslak/yer tutucu ses).
//   motion-render tts <metin.txt | "metin"> [--out materials/tts.wav] [--voice <ad>] [--rate 0] [--words script/<ad>.words.json] [--lang <kod>]
//   motion-render tts --list                       kurulu sesler
// Windows: System.Speech (SAPI) — powershell -NoProfile; SpeakProgress olaylarından kelime başına ses konumu → words.json (transcribe.py
//   şemasıyla aynı: {meta, segments, words[{i, w, t0, t1, p, seg}]}, meta.source = "sapi"). Kelime sonu: sonraki kelime başı ya da arada
//   ölçülen sessizliğin başı (10 ms RMS). Metin geçici UTF-8 dosyayla verilir (tırnak/kaçış sorunu yok).
// macOS: `say -o x.aiff` · Linux: `espeak-ng -w x.wav` (varsa) — kelime zamanı yok → words.json yazılmaz (motion-render transcribe ile çıkar).
// Çıkış sesi: 48 kHz · 16 bit · mono WAV (ffmpeg). Hız --rate: SAPI −10…10; say/espeak için 175 kelime/dk × (1 + rate/10).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from '../lib/project.mjs';
import { ff, probe } from '../lib/ffmpeg.mjs';
import { decodePcm, rmsDb, slugOf, put } from '../lib/audio-core.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; }, has = (k) => args.includes('--' + k);
const VALUED = new Set(['--out', '--voice', '--rate', '--words', '--lang']);
const pos = args.filter((a, i) => !a.startsWith('--') && !VALUED.has(args[i - 1]));
const P = (f) => path.resolve(ROOT, f), rel = (f) => path.relative(ROOT, f).split(path.sep).join('/');
const psq = (s) => "'" + String(s).replace(/'/g, "''") + "'";   // PowerShell tek tırnak dizgesi
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'motion-tts-'));
const cleanup = () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* yut */ } };
process.on('exit', cleanup);   // process.exit finally'yi atlar
const ps = (script) => spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script], { encoding: 'utf8', maxBuffer: 64 << 20 });
const has_ = (bin) => spawnSync(process.platform === 'win32' ? 'where' : 'which', [bin], { encoding: 'utf8' }).status === 0;

try {
  if (has('list')) {
    if (process.platform === 'win32') {
      const r = ps("Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name + ' | ' + $_.VoiceInfo.Culture + ' | ' + $_.VoiceInfo.Gender + ' | ' + $(if ($_.Enabled) { 'etkin' } else { 'kapalı' }) }");
      if (r.status !== 0) { console.error('SAPI okunamadı: ' + (r.stderr || '').slice(-400)); process.exit(1); }
      console.log((r.stdout || '').trim() || '(kurulu ses yok)');
    } else if (process.platform === 'darwin') console.log(spawnSync('say', ['-v', '?'], { encoding: 'utf8' }).stdout);
    else if (has_('espeak-ng')) console.log(spawnSync('espeak-ng', ['--voices'], { encoding: 'utf8' }).stdout);
    else { console.error('yerel TTS yok (espeak-ng kurulu değil)'); process.exit(1); }
    process.exit(0);
  }
  if (!pos[0]) { console.error('kullanım: motion-render tts <metin.txt | "metin"> [--out materials/tts.wav] [--voice ad] [--rate 0] [--words script/<ad>.words.json] · tts --list'); process.exit(2); }
  const text = (fs.existsSync(P(pos[0])) && fs.statSync(P(pos[0])).isFile() ? fs.readFileSync(P(pos[0]), 'utf8') : pos[0]).replace(/^﻿/, '').replace(/\r\n/g, '\n').trim();
  if (!text) { console.error('metin boş'); process.exit(2); }
  const OUT = P(opt('out', 'materials/tts.wav')), WORDS = P(opt('words', 'script/' + slugOf(OUT) + '.words.json')), RATE = Math.max(-10, Math.min(10, Math.round(+opt('rate', 0)))), VOICE = opt('voice', null);
  const txtF = path.join(TMP, 'metin.txt'), rawF = path.join(TMP, process.platform === 'darwin' ? 'ham.aiff' : 'ham.wav'), evF = path.join(TMP, 'olay.json');
  fs.writeFileSync(txtF, text, 'utf8');
  const t0 = Date.now();
  let events = null, voiceInfo = null;
  if (process.platform === 'win32') {
    const script = [
      'Add-Type -AssemblyName System.Speech',
      '$s = New-Object System.Speech.Synthesis.SpeechSynthesizer',
      VOICE ? '$s.SelectVoice(' + psq(VOICE) + ')' : '',
      '$s.Rate = ' + RATE,
      '$t = [IO.File]::ReadAllText(' + psq(txtF) + ', [Text.Encoding]::UTF8)',
      "Register-ObjectEvent -InputObject $s -EventName SpeakProgress -SourceIdentifier mtts | Out-Null",
      // SAPI AudioPosition motorun 16 kHz akışına göre sayılıyor (22.05/44.1 kHz çıktıda konumlar oranla kayıyor) → çıktı 16 kHz, sonra ffmpeg 48 kHz
      '$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)',
      '$s.SetOutputToWaveFile(' + psq(rawF) + ', $fmt)',
      '$s.Speak($t)',
      '$s.SetOutputToNull()',
      'Start-Sleep -Milliseconds 100',
      "$ev = @(Get-Event -SourceIdentifier mtts | ForEach-Object { $a = $_.SourceEventArgs; [pscustomobject]@{ ms = $a.AudioPosition.TotalMilliseconds; pos = $a.CharacterPosition; len = $a.CharacterCount } })",
      'Unregister-Event -SourceIdentifier mtts',
      '$v = $s.Voice',
      '$o = [pscustomobject]@{ voice = $v.Name; culture = $v.Culture.Name; events = $ev }',
      '[IO.File]::WriteAllText(' + psq(evF) + ', ($o | ConvertTo-Json -Depth 4 -Compress), (New-Object Text.UTF8Encoding $false))',
      '$s.Dispose()',
    ].filter(Boolean).join('; ');
    const r = ps(script);
    if (r.status !== 0 || !fs.existsSync(rawF)) { console.error('SAPI sentezi başarısız: ' + (r.stderr || r.stdout || '').trim().slice(-600)); process.exit(1); }
    const o = JSON.parse(fs.readFileSync(evF, 'utf8').replace(/^﻿/, ''));
    events = (Array.isArray(o.events) ? o.events : o.events ? [o.events] : []).sort((a, b) => a.pos - b.pos); voiceInfo = { name: o.voice, culture: o.culture };
  } else if (process.platform === 'darwin') {
    const a = ['-o', rawF, '-f', txtF, '-r', String(Math.round(175 * (1 + RATE / 10)))]; if (VOICE) a.push('-v', VOICE);
    const r = spawnSync('say', a, { encoding: 'utf8' }); if (r.status !== 0) { console.error('say başarısız: ' + r.stderr); process.exit(1); }
    voiceInfo = { name: VOICE || 'say (varsayılan)', culture: opt('lang', '') };
  } else {
    if (!has_('espeak-ng')) { console.error('yerel TTS yok: espeak-ng kurulu değil (ör. apt install espeak-ng)'); process.exit(1); }
    const a = ['-w', rawF, '-f', txtF, '-s', String(Math.round(175 * (1 + RATE / 10)))]; if (VOICE) a.push('-v', VOICE);
    const r = spawnSync('espeak-ng', a, { encoding: 'utf8' }); if (r.status !== 0) { console.error('espeak-ng başarısız: ' + r.stderr); process.exit(1); }
    voiceInfo = { name: VOICE || 'espeak-ng (varsayılan)', culture: opt('lang', '') };
  }
  // 48 kHz · 16 bit · mono
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  ff(['-i', rawF, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', OUT + '.part.wav']); fs.renameSync(OUT + '.part.wav', OUT);
  const pr = probe(OUT), dur = pr.duration;
  console.log('✓ ' + rel(OUT) + ' · ' + (dur != null ? dur.toFixed(3) + ' s' : '?') + ' · 48 kHz mono 16 bit · ses ' + voiceInfo.name + (voiceInfo.culture ? ' (' + voiceInfo.culture + ')' : '') + ' · hız ' + RATE);
  if (!events) { console.log('kelime zamanı yok (' + process.platform + ') → words.json yazılmadı; motion-render transcribe ' + rel(OUT)); process.exit(0); }
  // kelimeler: olay konumu + metinde sonraki boşluğa kadar (noktalama kelimeye yapışık, Whisper gibi) · bitiş = sonraki başlangıç ya da arada ölçülen sessizliğin başı
  const db = rmsDb(decodePcm(OUT)), N = db.length, sorted = Array.from(db).sort((a, b) => a - b), TH = Math.max(-50, sorted[Math.floor(N * 0.1)] + 6);
  const silentFrom = (a, b) => { let i = Math.min(N, Math.ceil(b * 100)); while (i > Math.floor(a * 100) + 1 && i - 1 < N && db[i - 1] < TH) i--; return i / 100; };   // b'den geriye sessizlik
  const evs = events.filter((e) => e.len > 0 && /[\p{L}\p{N}]/u.test(text.substr(e.pos, e.len)));
  // sağlama: son kelime başı ses süresini aşıyorsa konum tabanı 16 kHz değildir → yaygın oranlardan süreye sığan en yakını (uyarıyla)
  const lastMs = evs.length ? Math.max(...evs.map((e) => e.ms)) : 0;
  if (dur != null && lastMs > dur * 1000) { const k = [11025, 22050, 24000, 32000, 44100, 48000].map((b) => 16000 / b).filter((q) => lastMs * q <= dur * 1000).sort((a, b) => b - a)[0] || dur * 1000 / lastMs;
    evs.forEach((e) => { e.ms *= k; }); console.log('! SAPI konumları süreyi aşıyordu (son ' + Math.round(lastMs) + ' ms > ' + Math.round(dur * 1000) + ' ms) → ×' + k.toFixed(4) + ' ölçeklendi'); }
  const words = []; let seg = 0;
  evs.forEach((e, k) => {
    let end = e.pos + e.len; while (end < text.length && !/\s/.test(text[end])) end++;
    const w = text.slice(e.pos, end), ta = e.ms / 1000, tb = k + 1 < evs.length ? evs[k + 1].ms / 1000 : (dur || ta);
    const t1 = Math.max(ta + 0.02, Math.min(tb, silentFrom(ta, tb)));
    words.push({ i: words.length, w, t0: +ta.toFixed(3), t1: +t1.toFixed(3), p: 1, seg });
    if (/[.!?…]["”’)]*$/.test(w)) seg++;
  });
  const segments = []; words.forEach((w) => { const s = segments[w.seg] || (segments[w.seg] = { i: w.seg, t0: w.t0, t1: w.t1, text: '', avg_logprob: 0, no_speech: 0 }); s.t1 = w.t1; s.text = (s.text ? s.text + ' ' : '') + w.w; });
  const mono = words.every((w, i) => w.t1 > w.t0 && (i === 0 || w.t0 >= words[i - 1].t1 - 1e-9));
  const lang = (opt('lang', null) || (voiceInfo.culture || '').split('-')[0] || null);
  const meta = { audio: rel(OUT), model: 'sapi ' + voiceInfo.name, source: 'sapi', language: lang, language_p: 1, duration: dur != null ? +dur.toFixed(3) : null, words: words.length, segments: segments.length, low: 0.6, seconds: +((Date.now() - t0) / 1000).toFixed(1), rate: RATE };
  put(WORDS, JSON.stringify({ meta, segments, words }, null, 1) + '\n');
  console.log('✓ ' + rel(WORDS) + ' · ' + words.length + ' kelime · ' + segments.length + ' cümle · zaman sırası ' + (mono ? 'monoton ✓' : '✗ MONOTON DEĞİL') + ' · son kelime ' + (words.length ? words[words.length - 1].t1 : '—') + ' s / ses ' + (dur != null ? dur.toFixed(3) : '?') + ' s');
  if (!mono) process.exitCode = 3;
} finally { cleanup(); }
