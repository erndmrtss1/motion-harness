# render/py/transcribe.py — seslendirme transkripti: faster-whisper (varsayılan large-v3), dil tr, kelime zamanlı.
#   motion-render transcribe "<ses>" [--out script/<ad>] [--model large-v3] [--low 0.6] [--lang tr]
#   (doğrudan: python render/py/transcribe.py "<ses>" --out script/<ad>; ffmpeg yolu env FFMPEG — motion-render verir)
# Çıktı (hepsi .part → rename):
#   <out>.words.json  {meta, segments, words: [{i, w, t0, t1, p, seg}]}  (kelime · başlangıç · bitiş · güven)
#   <out>.srt         segment altyazısı
#   <out>.txt         düz metin (noktalama, segment başına satır)
#   <out>.dogrula.md  güveni < --low olan kelimeler (TC + bağlam): kullanıcıya doğrulatılacak liste
import argparse, json, os, sys, time
sys.stdout.reconfigure(encoding="utf-8"); sys.stderr.reconfigure(encoding="utf-8")   # Windows konsolu (cp1254) ✓ basamıyordu; dosyalar etkilenmez

ap = argparse.ArgumentParser()
ap.add_argument('audio'); ap.add_argument('--out', default='script/ses'); ap.add_argument('--model', default='large-v3'); ap.add_argument('--low', type=float, default=0.6)
ap.add_argument('--lang', default='tr')
a = ap.parse_args()
try:
    import numpy as np
    from faster_whisper import WhisperModel
except ImportError as e:
    print('✗ faster-whisper / numpy kurulu değil (' + str(e) + '). Kurulum: motion-render init <proje> --with-whisper  ya da  pip install -r <paket>/render/requirements.txt', file=sys.stderr)
    sys.exit(3)

def tc(t, srt=False):
    h, r = divmod(t, 3600); m, s = divmod(r, 60)
    return ('%02d:%02d:%06.3f' % (h, m, s)).replace('.', ',') if srt else '%02d:%05.2f' % (m + 60 * h, s)

def put(path, text):
    with open(path + '.part', 'w', encoding='utf-8', newline='\n') as f: f.write(text)
    os.replace(path + '.part', path)

t_start = time.time()
# ses ffmpeg ile 16 kHz mono f32'ye çözülür: faster-whisper 1.2.1'in PyAV çağrısı (av.open(metadata_errors=…)) bazı PyAV
# sürümleriyle uyumsuz (TypeError) → dizi doğrudan modele verilir
import subprocess
FF = os.environ.get('FFMPEG') or 'ffmpeg'
raw = subprocess.run([FF, '-hide_banner', '-loglevel', 'error', '-i', a.audio, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
pcm = np.frombuffer(raw, dtype=np.float32).copy()
model = WhisperModel(a.model, device='cpu', compute_type='int8', cpu_threads=os.cpu_count() or 4)
segs, info = model.transcribe(pcm, language=a.lang, word_timestamps=True, beam_size=5, vad_filter=False, condition_on_previous_text=True)
words, seg_out = [], []
for si, s in enumerate(segs):
    seg_out.append({'i': si, 't0': round(s.start, 3), 't1': round(s.end, 3), 'text': s.text.strip(), 'avg_logprob': round(s.avg_logprob, 3), 'no_speech': round(s.no_speech_prob, 3)})
    for w in (s.words or []):
        words.append({'i': len(words), 'w': w.word.strip(), 't0': round(w.start, 3), 't1': round(w.end, 3), 'p': round(w.probability, 3), 'seg': si})
os.makedirs(os.path.dirname(a.out) or '.', exist_ok=True)
meta = {'audio': a.audio.replace('\\', '/'), 'model': 'faster-whisper ' + a.model + ' (int8, cpu)', 'language': info.language, 'language_p': round(info.language_probability, 3),
        'duration': round(info.duration, 3), 'words': len(words), 'segments': len(seg_out), 'low': a.low, 'seconds': round(time.time() - t_start, 1)}
put(a.out + '.words.json', json.dumps({'meta': meta, 'segments': seg_out, 'words': words}, ensure_ascii=False, indent=1) + '\n')
put(a.out + '.srt', '\n'.join('%d\n%s --> %s\n%s\n' % (k + 1, tc(s['t0'], True), tc(s['t1'], True), s['text']) for k, s in enumerate(seg_out)))
put(a.out + '.txt', '\n'.join(s['text'] for s in seg_out) + '\n')
low = [w for w in words if w['p'] < a.low]
ctx = lambda i: ' '.join(x['w'] for x in words[max(0, i - 3):i]) + ' **' + words[i]['w'] + '** ' + ' '.join(x['w'] for x in words[i + 1:i + 4])
put(a.out + '.dogrula.md', '# Doğrulanacak kelimeler (güven < ' + str(a.low) + ')\n\n' + meta['model'] + ' · ' + str(len(low)) + '/' + str(len(words)) + ' kelime. Doğru yazımı sağ sütuna yaz; boşsa transkript doğru sayılır.\n\n'
    '| # | TC | kelime | güven | bağlam | doğrusu |\n|---|---|---|---|---|---|\n' + ''.join('| %d | %s | %s | %.2f | %s | |\n' % (w['i'], tc(w['t0']), w['w'], w['p'], ctx(w['i'])) for w in low))
print('✓ %s · %d kelime · %d segment · düşük güven %d · süre %.1f s · %.1f s' % (a.out, len(words), len(seg_out), len(low), info.duration, time.time() - t_start))
