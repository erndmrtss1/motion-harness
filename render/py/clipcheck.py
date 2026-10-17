# render/py/clipcheck.py — klip doğrulaması (Whisper halüsinasyonu / iki ses arası fark): şüpheli bölgeler kısa kliplerle,
# önceki metne koşulsuz (condition_on_previous_text=False, temperature 0), ışın 5 ve 10 ile yeniden yazıya dökülür.
# kaynak: ağaç dışı (kaynak oturumun scratchpad'indeki clipcheck.py + clipcheck3.py; sabit yol/ses tabloları kaldırıldı → --src)
#   motion-render transcribe verify "<ad>,<kaynak>,<a>,<b>" … [--src KAYNAK=ses.mp3 …] [--model large-v3] [--beams 5,10] [--lang tr]
#   <kaynak>: --src ile tanımlı kısa ad ya da doğrudan ses yolu. Çıktı satırı: <ad> <kaynak> beam <n> | kelime@t0-t1(güven) …
# ffmpeg yolu env FFMPEG (motion-render verir).
import argparse, os, sys, subprocess
sys.stdout.reconfigure(encoding='utf-8'); sys.stderr.reconfigure(encoding='utf-8')
ap = argparse.ArgumentParser()
ap.add_argument('specs', nargs='+'); ap.add_argument('--src', action='append', default=[]); ap.add_argument('--model', default='large-v3')
ap.add_argument('--beams', default='5,10'); ap.add_argument('--lang', default='tr')
a = ap.parse_args()
try:
    import numpy as np
    from faster_whisper import WhisperModel
except ImportError as e:
    print('✗ faster-whisper / numpy kurulu değil (' + str(e) + '). Kurulum: motion-render init <proje> --with-whisper  ya da  pip install -r <paket>/render/requirements.txt', file=sys.stderr)
    sys.exit(3)
FF = os.environ.get('FFMPEG') or 'ffmpeg'
SRC = dict(s.split('=', 1) for s in a.src)
def pcm(f, t0, t1):
    raw = subprocess.run([FF, '-hide_banner', '-loglevel', 'error', '-ss', str(t0), '-t', str(t1 - t0), '-i', f, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()
m = WhisperModel(a.model, device='cpu', compute_type='int8', cpu_threads=os.cpu_count() or 4)
beams = [int(x) for x in a.beams.split(',') if x.strip()]
for spec in a.specs:
    name, src, t0, t1 = spec.split(','); t0, t1 = float(t0), float(t1)
    f = SRC.get(src, src)
    for beam in beams:
        segs, _ = m.transcribe(pcm(f, t0, t1), language=a.lang, word_timestamps=True, beam_size=beam, vad_filter=False, condition_on_previous_text=False, temperature=0)
        ws = [(w.word.strip(), round(t0 + w.start, 2), round(t0 + w.end, 2), round(w.probability, 2)) for s in segs for w in (s.words or [])]
        print(name, src, 'beam', beam, '|', ' '.join('%s@%.2f-%.2f(%.2f)' % w for w in ws), flush=True)
