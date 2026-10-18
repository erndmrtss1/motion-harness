/* motion live — canlı profil çalışma zamanı (OBS tarayıcı kaynağı + ayar paneli ortak çekirdeği)
 *
 * Derleme adımı yok; klasik betik (file:// altında da yüklensin diye ES modülü değil).
 * Bu dosya yalnız MEKANİZMAYI taşır: ses zarfı, durum makinesi, hareket kanalları, tetikler, ayar eşleme, ölçüm.
 * Görünüm taşımaz: avatar adaptörle gelir → MOTION_LIVE.registerAvatar({ kind, init, draw }).
 * Sözleşme ve ölçüm yöntemi: skills/motion-live/SKILL.md · ölçüm komutu: motion-render live <sayfa> --qc
 *
 * Rol: <script src="live.js" data-role="panel"> ise yalnız kitaplık yüklenir (panel); aksi hâlde sahne açılır.
 * Tek saat: her kare requestAnimationFrame zaman damgasıyla adımlanır; bütün durum step(dt, giriş) ile ilerler,
 * çizim yalnız (durum, t)'nin fonksiyonudur. Elle sürüşte (?drive=manual) dt = 1/fps sabittir → aynı girdi aynı kare.
 */
(() => {
  'use strict';

  const W = 1920, H = 1080;                 // mantıksal tuval; kaynak boyutuna ölçeklenir
  const VERSION = '1.0.0';
  const STORE_KEY = 'motion-live:ayarlar';
  const CHANNEL = 'motion-live';
  const H_STEP = 1 / 240;                   // yay tümlevi sabit alt adımı (s)
  const MODES = ['bosta', 'dinliyor', 'konusuyor'];
  const MODE_LABEL = { bosta: 'boşta', dinliyor: 'dinliyor', konusuyor: 'konuşuyor' };

  // ---------------------------------------------------------------------------------------------
  // Ayarlar: varsayılanlar + şema (panel arayüzü şemadan kurulur). Görsel değer YOK (renk yalnız zemin).
  // ---------------------------------------------------------------------------------------------
  const REACTIONS = {
    onay: 'onay (baş sallama)', ret: 'ret (iki yana)', saskinlik: 'şaşkınlık', gulme: 'gülme',
    vurgu: 'vurgu', merak: 'merak (eğilme)', dinle: 'dinle (aç/kapa)', sessiz: 'sessiz (aç/kapa)', sifirla: 'sıfırla',
  };
  const DEFAULTS = {
    source: 'mic',            // mic: sayfa mikrofonu dinler · panel: zarfı panel gönderir · kapali
    deviceId: '',
    gainDb: 0,                // giriş kazancı
    gateDb: -50,              // gürültü kapısı açılma eşiği (dBFS)
    gateHystDb: 4,            // kapı kapanma histerezisi (dB)
    ceilDb: -14,              // zarfın 1'e ulaştığı seviye (dBFS)
    attackMs: 20, releaseMs: 140,
    talkOn: 0.16, talkOff: 0.08,       // konuşma algılayıcı histerezisi (zarf 0..1)
    talkConfirmMs: 45,                  // konuşmaya geçmek için anlık seviyenin eşik üstünde kalma süresi (tık sesi elenir; seviye penceresi 2 kareye taşabilir)
    talkHoldMs: 260,                    // zarf eşik altına inince konuşmayı bırakmadan önce tutma
    listenHoldS: 4,                     // konuşma bittikten sonra dinliyor → boşta geçiş süresi
    minStateMs: 160,                    // durumda en kısa kalış (konuşmaya giriş hariç)
    transitionMs: 380,                  // durum geçişinde hedef poz karışım süresi (tasarlanmış geçiş; fade yok)
    mouthGain: 1.25, mouthCurve: 0.75, mouthFlutter: 0.12,
    head: 1, nod: 1, tilt: 1, secondary: 1, breath: 1,
    keymap: { 1: 'onay', 2: 'ret', 3: 'saskinlik', 4: 'gulme', 5: 'vurgu', 6: 'merak', 7: 'dinle', 8: 'sessiz', 9: 'sifirla' },
    bg: '#3b3b3b',            // nötr zemin (yer tutucu); ?bg=transparent saydam
    showMeter: false,
  };
  const SCHEMA = [
    { group: 'Giriş', key: 'gainDb', label: 'kazanç', min: -24, max: 24, step: 0.5, unit: 'dB' },
    { group: 'Giriş', key: 'gateDb', label: 'gürültü kapısı', min: -80, max: -20, step: 1, unit: 'dBFS' },
    { group: 'Giriş', key: 'gateHystDb', label: 'kapı histerezisi', min: 0, max: 12, step: 0.5, unit: 'dB' },
    { group: 'Giriş', key: 'ceilDb', label: 'tavan', min: -40, max: 0, step: 1, unit: 'dBFS' },
    { group: 'Zarf', key: 'attackMs', label: 'atak', min: 1, max: 120, step: 1, unit: 'ms' },
    { group: 'Zarf', key: 'releaseMs', label: 'bırakma', min: 20, max: 600, step: 5, unit: 'ms' },
    { group: 'Durum', key: 'talkOn', label: 'konuşma açılış', min: 0.02, max: 0.8, step: 0.01, unit: '' },
    { group: 'Durum', key: 'talkOff', label: 'konuşma kapanış', min: 0.01, max: 0.6, step: 0.01, unit: '' },
    { group: 'Durum', key: 'talkConfirmMs', label: 'açılış onayı', min: 0, max: 200, step: 5, unit: 'ms' },
    { group: 'Durum', key: 'talkHoldMs', label: 'konuşma tutma', min: 0, max: 1500, step: 10, unit: 'ms' },
    { group: 'Durum', key: 'listenHoldS', label: 'dinliyor → boşta', min: 0.5, max: 30, step: 0.5, unit: 's' },
    { group: 'Durum', key: 'minStateMs', label: 'en kısa kalış', min: 0, max: 1000, step: 10, unit: 'ms' },
    { group: 'Durum', key: 'transitionMs', label: 'geçiş süresi', min: 0, max: 1500, step: 10, unit: 'ms' },
    { group: 'Hareket', key: 'mouthGain', label: 'ağız kazancı', min: 0, max: 3, step: 0.05, unit: '×' },
    { group: 'Hareket', key: 'mouthCurve', label: 'ağız eğrisi', min: 0.3, max: 2, step: 0.05, unit: 'γ' },
    { group: 'Hareket', key: 'mouthFlutter', label: 'ağız titreşimi', min: 0, max: 0.5, step: 0.01, unit: '' },
    { group: 'Hareket', key: 'head', label: 'baş salınımı', min: 0, max: 2, step: 0.05, unit: '×' },
    { group: 'Hareket', key: 'nod', label: 'vurgu başı (nod)', min: 0, max: 2, step: 0.05, unit: '×' },
    { group: 'Hareket', key: 'tilt', label: 'eğme', min: 0, max: 2, step: 0.05, unit: '×' },
    { group: 'Hareket', key: 'secondary', label: 'ikincil hareket', min: 0, max: 2, step: 0.05, unit: '×' },
    { group: 'Hareket', key: 'breath', label: 'nefes', min: 0, max: 2, step: 0.05, unit: '×' },
  ];

  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
  const bump = (p) => { const s = Math.sin(Math.PI * clamp01(p)); return s * s; };
  const plateau = (p) => clamp01(p / 0.15) * clamp01((1 - p) / 0.35);
  const hash = (n) => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
  // deterministik düşük frekanslı gürültü (saf t fonksiyonu)
  const noise = (t, k) => (Math.sin(t * 0.71 + k * 1.3) + 0.6 * Math.sin(t * 1.37 + k * 2.9) + 0.3 * Math.sin(t * 2.91 + k * 0.7)) / 1.9;

  function mergeSettings(base, patch) {
    const out = { ...base, keymap: { ...(base.keymap || {}) } };
    if (!patch || typeof patch !== 'object') return out;
    for (const k of Object.keys(patch)) {
      if (k === 'keymap' && patch.keymap && typeof patch.keymap === 'object') out.keymap = { ...patch.keymap };
      else if (k in DEFAULTS) out[k] = patch[k];
    }
    return out;
  }
  function loadStored() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch { return null; } }
  function saveStored(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* depolama kapalı */ } }

  // ---------------------------------------------------------------------------------------------
  // Veri yolu: BroadcastChannel (aynı tarayıcı profili) + yerel sunucu aktarıcısı (/__bus; farklı tarayıcı/OBS dock)
  // ---------------------------------------------------------------------------------------------
  function createBus(role, opts = {}) {
    const me = role + '-' + Math.random().toString(36).slice(2, 9);
    const seen = new Set(), order = [];
    const handlers = [];
    let seq = 0, bc = null, es = null, relay = false;
    const deliver = (m) => {
      if (!m || m.from === me || seen.has(m.id)) return;
      seen.add(m.id); order.push(m.id); if (order.length > 512) seen.delete(order.shift());
      for (const h of handlers) { try { h(m); } catch (e) { console.error('[motion-live] veri yolu işleyici:', e); } }
    };
    try { bc = new BroadcastChannel(CHANNEL); bc.onmessage = (e) => deliver(e.data); } catch { bc = null; }
    if (opts.relay !== false && /^https?:$/.test(location.protocol)) {
      fetch('/__bus?ping', { cache: 'no-store' }).then((r) => {
        if (r.status !== 204) return;
        relay = true;
        es = new EventSource('/__bus');
        es.onmessage = (e) => { try { deliver(JSON.parse(e.data)); } catch { /* bozuk ileti */ } };
        es.onopen = () => { if (typeof opts.onRelay === 'function') opts.onRelay(); };   // aktarıcı hazır: karşı tarafa kendini duyur
      }).catch(() => {});
    }
    return {
      id: me,
      on(h) { handlers.push(h); },
      post(type, data = {}) {
        const m = { ...data, type, id: me + ':' + (++seq), from: me, role, at: data.at ?? performance.timeOrigin + performance.now() };
        if (bc) bc.postMessage(m);
        if (relay) fetch('/__bus', { method: 'POST', body: JSON.stringify(m), keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => {});
      },
      get relay() { return relay; },
      close() { if (bc) bc.close(); if (es) es.close(); },
    };
  }

  // ---------------------------------------------------------------------------------------------
  // Ses girişi: getUserMedia → MediaStreamAudioSourceNode → AnalyserNode (çıkışa BAĞLANMAZ) → RMS dBFS
  // ---------------------------------------------------------------------------------------------
  function createAudioInput() {
    const A = {
      ctx: null, stream: null, src: null, an: null, buf: null, track: null,
      running: false, error: null, deviceLabel: '', devices: [],
      tReq: null, tGum: null, streamStart: null, anchor: null, statsSamples: 0, inputLatencyMs: null,
      fftSize: 2048, win: 512, statsTimer: 0,   // tampon 2048 örnek; seviye penceresi 512 örnek (≈10,7 ms @48 kHz)
    };
    A.constraints = (deviceId) => ({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false, noiseSuppression: false, autoGainControl: false,
      },
    });
    // Akış başlangıcı (yakalama saati): track.stats → t − totalFramesDuration − latency; en erken tahmin (temkinli)
    A.sampleStats = () => {
      const tr = A.track;
      if (!tr || !tr.stats) return;
      const s = tr.stats, now = performance.now();
      if (!(s.totalFramesDuration > 0)) return;
      const est = now - s.totalFramesDuration - (s.latency || 0);
      A.statsSamples++;
      A.inputLatencyMs = s.latency;
      if (A.anchor !== 'track.stats' || est < A.streamStart) { A.streamStart = est; A.anchor = 'track.stats'; }
    };
    A.start = async (deviceId, statsEveryMs = 1000) => {
      A.error = null;
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('getUserMedia yok (güvenli bağlam değil: http://127.0.0.1 ya da https gerekir)');
        if (!A.ctx) A.ctx = new AudioContext({ latencyHint: 'interactive' });
        if (A.ctx.state === 'suspended') A.ctx.resume().catch(() => {});
        A.stop(true);
        A.tReq = performance.now();
        A.stream = await navigator.mediaDevices.getUserMedia(A.constraints(deviceId));
        A.tGum = performance.now();
        A.track = A.stream.getAudioTracks()[0];
        A.deviceLabel = A.track ? A.track.label : '';
        A.streamStart = A.tGum; A.anchor = 'gum'; A.statsSamples = 0;   // yedek çapa: istek çözüldü (yaklaşık)
        A.src = A.ctx.createMediaStreamSource(A.stream);
        A.an = A.ctx.createAnalyser();
        A.an.fftSize = A.fftSize;
        A.an.smoothingTimeConstant = 0;
        A.buf = new Float32Array(A.an.fftSize);
        A.src.connect(A.an);
        if (A.ctx.state === 'suspended') await Promise.race([A.ctx.resume(), new Promise((r) => setTimeout(r, 400))]);
        A.running = A.ctx.state === 'running';
        if (!A.running) A.error = 'AudioContext askıda (kullanıcı hareketi gerekli)';
        clearInterval(A.statsTimer);
        A.statsTimer = setInterval(A.sampleStats, statsEveryMs);
        A.sampleStats();
        await A.listDevices();
      } catch (e) {
        A.running = false;
        A.error = (e && e.name ? e.name + ': ' : '') + (e && e.message ? e.message : String(e));
      }
      return A;
    };
    A.listDevices = async () => {
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        A.devices = list.filter((d) => d.kind === 'audioinput').map((d) => ({ id: d.deviceId, label: d.label || '(adsız aygıt)' }));
      } catch { A.devices = []; }
      return A.devices;
    };
    A.stop = (keepCtx) => {
      clearInterval(A.statsTimer);
      if (A.src) try { A.src.disconnect(); } catch { /* yok */ }
      if (A.stream) for (const t of A.stream.getTracks()) t.stop();
      A.stream = A.src = A.an = A.track = null;
      A.running = false;
      if (!keepCtx && A.ctx) { A.ctx.close().catch(() => {}); A.ctx = null; }
    };
    // Anlık seviye (dBFS): son kare aralığı + bir pencere boyunca 512 örneklik pencerelerin (256 adım) en yüksek RMS'i.
    // Kare aralığı (16,7 ms) pencereden uzun olduğu için yalnız son pencereye bakmak kısa geçişleri (tık, patlamalı ünsüz) kaçırırdı.
    A.readDb = (dt = 1 / 60) => {
      if (!A.an || !A.running) return -120;
      const b = A.buf, N = b.length, half = A.win >> 1;
      A.an.getFloatTimeDomainData(b);
      const span = Math.min(N, Math.max(A.win, Math.round(dt * A.ctx.sampleRate) + A.win));
      let best = 0, prev = -1;
      for (let end = N; end - half >= N - span; end -= half) {
        let e = 0;
        for (let i = end - half; i < end; i++) e += b[i] * b[i];
        if (prev >= 0 && e + prev > best) best = e + prev;
        prev = e;
      }
      const ms = best / A.win;
      return ms > 1e-12 ? 10 * Math.log10(ms) : -120;
    };
    A.info = () => ({
      running: A.running, error: A.error, device: A.deviceLabel,
      sampleRate: A.ctx ? A.ctx.sampleRate : null, baseLatency: A.ctx ? A.ctx.baseLatency : null,
      fftSize: A.fftSize, windowMs: A.ctx ? (1000 * A.win) / A.ctx.sampleRate : null, bufferMs: A.ctx ? (1000 * A.fftSize) / A.ctx.sampleRate : null,
      tReq: A.tReq, tGum: A.tGum, streamStart: A.streamStart, anchor: A.anchor, statsSamples: A.statsSamples,
      inputLatencyMs: A.inputLatencyMs,
    });
    return A;
  }

  // ---------------------------------------------------------------------------------------------
  // Çekirdek: zarf → durum makinesi → hareket kanalları. Saf adımlama: step(dt, db) yalnız iç durumu ilerletir.
  // ---------------------------------------------------------------------------------------------
  const spring = (w, z) => ({ x: 0, v: 0, target: 0, w, z });

  // Klavye tepkileri: başlangıçta görünür tekme (hız darbesi, gecikme ≤ 1 kare) + süre boyunca hedef eğrisi.
  const RX = {
    onay: { dur: 0.9, kick: { pitch: 170 }, f: (p) => ({ pitch: 9 * Math.sin(p * Math.PI * 4) * (1 - p) }) },
    ret: { dur: 1.0, kick: { yaw: 190 }, f: (p) => ({ yaw: 13 * Math.sin(p * Math.PI * 6) * (1 - p) }) },
    saskinlik: { dur: 0.9, kick: { y: -520, scale: 1.2 }, f: (p) => { const b = bump(p); return { y: -22 * b, scale: 0.07 * b, eyes: b, mouth: 0.35 * b }; } },
    gulme: { dur: 1.4, kick: { y: 220 }, f: (p) => { const w = 1 - p, o = Math.abs(Math.sin(p * Math.PI * 9)); return { y: 7 * o * w, roll: 5 * w, mouth: 0.45 * w * (0.4 + 0.6 * o), eyes: -0.5 * w }; } },
    vurgu: { dur: 0.55, kick: { pitch: 230, scale: 1.5 }, f: (p) => { const b = bump(p); return { pitch: 6 * b, scale: 0.05 * b }; } },
    merak: { dur: 2.2, kick: { roll: 130 }, f: (p) => ({ roll: 11 * plateau(p), pitch: 2 * plateau(p) }) },
  };

  function createEngine() {
    const S = {
      t: 0, frame: 0, dt: 0, db: -120, level: 0, env: 0, envPrev: 0, gateOpen: false,
      talk: false, aboveT: -1, belowT: 0, lastTalkEnd: -1e9,
      mode: 'bosta', prevMode: 'bosta', modeT: 1e3, flags: { listen: false, mute: false },
      reactions: [], pending: [], lastImpulse: -1, impulseSign: 1, acc: 0,
      sp: { pitch: spring(14, 0.42), roll: spring(7, 0.6), yaw: spring(9, 0.55), y: spring(11, 0.5), scale: spring(16, 0.4), sec: spring(5.5, 0.22) },
      mouth: 0, eyes: 0, transitions: [], applied: [],
    };
    const state = {   // adaptörlere verilen anlık görüntü (kareler arası aynı nesne; saklanacaksa kopyalanmalı)
      W, H, mode: 'bosta', label: MODE_LABEL.bosta, prevMode: 'bosta', modeT: 0, blend: 1, talking: false,
      env: 0, level: 0, db: -120, mouth: 0, mouthRound: 0, eyes: 0, blink: 0, breath: 0,
      head: { x: 0, y: 0, pitch: 0, roll: 0, yaw: 0, scale: 1 }, secondary: { angle: 0, x: 0, y: 0 },
      gaze: { x: 0, y: 0 }, reactions: [], flags: S.flags, frame: 0, t: 0, dt: 0, settings: null,
    };

    function baseTargets(mode, t, set, env) {
      const h = set.head;
      if (mode === 'konusuyor') return { pitch: h * (-0.5 + 4 * env), roll: h * 2.2 * noise(t * 0.9, 2), yaw: h * 3.5 * noise(t * 0.8, 3), y: -6 * env * h };
      if (mode === 'dinliyor') {
        const ln = Math.pow(Math.max(0, Math.sin((2 * Math.PI * t) / 2.7)), 8);   // seyrek "dinliyorum" başı
        return { pitch: h * (2.5 + 2 * ln * set.nod), roll: 5 * set.tilt + h * 1.2 * noise(t * 0.5, 5), yaw: h * 1.5 * noise(t * 0.4, 6), y: -4 * h };
      }
      return { pitch: h * (-1 + 1.2 * noise(t * 0.4, 7)), roll: h * 1.6 * noise(t * 0.3, 8), yaw: h * 2.5 * noise(t * 0.25, 9), y: 0 };
    }
    function setMode(m) {
      if (m === S.mode) return;
      S.transitions.push({ t: S.t, from: S.mode, to: m, frame: S.frame });
      if (S.transitions.length > 4000) S.transitions.shift();
      S.prevMode = S.mode; S.mode = m; S.modeT = 0;
    }

    function trigger(name, meta = {}) {
      if (name === 'dinle') { S.flags.listen = !S.flags.listen; S.pending.push({ name, toggle: true, meta }); return true; }
      if (name === 'sessiz') { S.flags.mute = !S.flags.mute; S.pending.push({ name, toggle: true, meta }); return true; }
      if (name === 'sifirla') { S.reactions.length = 0; S.flags.listen = false; S.flags.mute = false; S.pending.push({ name, toggle: true, meta }); return true; }
      if (!RX[name]) return false;
      S.pending.push({ name, meta });
      return true;
    }

    function step(dt, db, set) {
      S.dt = dt; S.t += dt; S.frame++; S.modeT += dt;
      const t = S.t, sp = S.sp;
      // 1) seviye + gürültü kapısı (histerezisli)
      const d = db + set.gainDb;
      S.db = d;
      if (S.gateOpen) { if (d < set.gateDb - set.gateHystDb) S.gateOpen = false; } else if (d >= set.gateDb) S.gateOpen = true;
      const floor = set.gateDb - set.gateHystDb;
      S.level = S.gateOpen && !S.flags.mute ? clamp01((d - floor) / Math.max(1, set.ceilDb - floor)) : 0;
      // 2) zarf: tek kutuplu atak/bırakma (dt ile tam üstel)
      S.envPrev = S.env;
      const tau = Math.max(1e-4, (S.level > S.env ? set.attackMs : set.releaseMs) / 1000);
      S.env += (S.level - S.env) * (1 - Math.exp(-dt / tau));
      // 3) konuşma algılayıcı: açılış anlık seviye + onay süresi; kapanış zarf + tutma (histerezis)
      if (!S.talk) {
        if (S.level >= set.talkOn) { S.aboveT = S.aboveT < 0 ? 0 : S.aboveT + dt; if (S.aboveT * 1000 >= set.talkConfirmMs) { S.talk = true; S.belowT = 0; } }
        else S.aboveT = -1;
      } else if (S.env < set.talkOff) {
        S.belowT += dt;
        if (S.belowT * 1000 >= set.talkHoldMs) { S.talk = false; S.aboveT = -1; S.lastTalkEnd = t; }
      } else S.belowT = 0;
      // 4) durum makinesi: konuşuyor / dinliyor / boşta (en kısa kalış; konuşmaya giriş beklemez)
      const target = S.talk && !S.flags.mute ? 'konusuyor' : (S.flags.listen || t - S.lastTalkEnd < set.listenHoldS ? 'dinliyor' : 'bosta');
      if (target !== S.mode && (target === 'konusuyor' || S.modeT * 1000 >= set.minStateMs)) setMode(target);
      // 5) tetikler: bekleyenler bu karede uygulanır (tekme hızı → ilk karede görünür hareket)
      for (const p of S.pending) {
        if (!p.toggle) {
          const r = RX[p.name];
          S.reactions.push({ name: p.name, t0: t, dur: r.dur });
          for (const k in r.kick) sp[k].v += r.kick[k] * (k === 'pitch' ? set.nod : 1);
        }
        S.applied.push({ name: p.name, frame: S.frame, t, meta: p.meta });
        if (S.applied.length > 2000) S.applied.shift();
      }
      S.pending.length = 0;
      // 6) hedefler: durum tabanı (geçişte karışım) + tepki eğrileri + zarf
      const blend = set.transitionMs > 0 ? ease((S.modeT * 1000) / set.transitionMs) : 1;
      const a = baseTargets(S.prevMode, t, set, S.env), b = baseTargets(S.mode, t, set, S.env);
      let pitch = lerp(a.pitch, b.pitch, blend), roll = lerp(a.roll, b.roll, blend), yaw = lerp(a.yaw, b.yaw, blend), y = lerp(a.y, b.y, blend), scale = 0;
      let rxMouth = 0, eyes = 0;
      for (let i = S.reactions.length - 1; i >= 0; i--) {
        const r = S.reactions[i], p = (t - r.t0) / r.dur;
        if (p >= 1) { S.reactions.splice(i, 1); continue; }
        const o = RX[r.name].f(clamp01(p));
        pitch += o.pitch || 0; roll += o.roll || 0; yaw += o.yaw || 0; y += o.y || 0; scale += o.scale || 0;
        rxMouth += o.mouth || 0; eyes += o.eyes || 0;
      }
      // zarf yükselişinde baş vurgusu (nod) — hız darbesi, yay ikincil salınımı üretir
      const rate = (S.env - S.envPrev) / Math.max(dt, 1e-3);
      if (rate > 4 && S.env > set.talkOn && t - S.lastImpulse > 0.16) {
        sp.pitch.v += set.nod * set.head * (50 + 120 * Math.min(1, rate / 20));
        sp.roll.v += S.impulseSign * 25 * set.tilt * set.head;
        S.impulseSign = -S.impulseSign; S.lastImpulse = t;
      }
      sp.pitch.target = pitch; sp.roll.target = roll; sp.yaw.target = yaw; sp.y.target = y; sp.scale.target = scale;
      // 7) yaylar: sabit alt adım (aynı dt dizisi → aynı sonuç)
      S.acc += dt;
      let guard = 0;
      while (S.acc >= H_STEP && guard++ < 96) {
        for (const k of ['pitch', 'roll', 'yaw', 'y', 'scale']) {
          const s = sp[k];
          s.v += (s.w * s.w * (s.target - s.x) - 2 * s.z * s.w * s.v) * H_STEP;
          s.x += s.v * H_STEP;
        }
        const sc = sp.sec;   // ikincil: başın açısını gecikmeyle izleyen düşük sönümlü yay
        sc.target = sp.roll.x + sp.yaw.x * 0.4;
        sc.v += (sc.w * sc.w * (sc.target - sc.x) - 2 * sc.z * sc.w * sc.v) * H_STEP;
        sc.x += sc.v * H_STEP;
        S.acc -= H_STEP;
      }
      if (guard >= 96) S.acc = 0;
      // 8) ağız: zarftan doğrudan (yay yok → gecikme yalnız atak)
      const flutter = S.mode === 'konusuyor' ? 1 - set.mouthFlutter * 0.5 * (1 + Math.sin(2 * Math.PI * 9.3 * t)) : 1;
      S.mouth = clamp01(set.mouthGain * Math.pow(S.env, set.mouthCurve) * flutter + rxMouth);
      S.eyes = eyes;
      return S;
    }

    function snapshot(set) {
      const sp = S.sp, t = S.t;
      state.mode = S.mode; state.label = MODE_LABEL[S.mode]; state.prevMode = S.prevMode; state.modeT = S.modeT;
      state.blend = set.transitionMs > 0 ? ease((S.modeT * 1000) / set.transitionMs) : 1;
      state.talking = S.talk; state.env = S.env; state.level = S.level; state.db = S.db;
      state.mouth = S.mouth; state.mouthRound = clamp01(S.mouth * 0.8); state.eyes = S.eyes;
      state.breath = Math.sin(2 * Math.PI * 0.22 * t) * set.breath;
      state.blink = blinkAt(t);
      const ga = S.mode === 'bosta' ? 1 : S.mode === 'dinliyor' ? 0.35 : 0.55;
      state.gaze.x = ga * gazeAt(t, 1); state.gaze.y = ga * 0.5 * gazeAt(t, 2);
      const hd = state.head;
      hd.pitch = sp.pitch.x; hd.roll = sp.roll.x; hd.yaw = sp.yaw.x; hd.scale = 1 + sp.scale.x;
      hd.x = sp.yaw.x * 3; hd.y = sp.y.x + state.breath * 3;
      const sw = (sp.sec.x - sp.roll.x) * 1.6 * set.secondary;
      state.secondary.angle = sw; state.secondary.x = -sw * 0.8; state.secondary.y = Math.abs(sw) * 0.3;
      state.reactions = S.reactions.map((r) => ({ name: r.name, p: clamp01((t - r.t0) / r.dur), age: t - r.t0 }));
      state.frame = S.frame; state.t = t; state.dt = S.dt; state.settings = set;
      return state;
    }
    // Göz kırpma ve bakış: saf t fonksiyonları (kare zamanlamasından bağımsız)
    function blinkAt(t) {
      const L = 3.7, cell = Math.floor(t / L);
      let x = t - cell * L - (0.4 + hash(cell) * 2.6), v = 0;
      if (x >= 0 && x < 0.16) v = Math.sin((Math.PI * x) / 0.16);
      if (hash(cell + 999) > 0.8) { x -= 0.28; if (x >= 0 && x < 0.16) v = Math.max(v, Math.sin((Math.PI * x) / 0.16)); }
      return v;
    }
    function gazeAt(t, k) {
      const L = 1.3, cell = Math.floor(t / L), x = t - cell * L;
      const a = hash(cell * 7 + k) * 2 - 1, b = hash((cell - 1) * 7 + k) * 2 - 1;
      return lerp(b, a, ease(x / 0.08));
    }
    return { S, state, step, snapshot, trigger, setMode };
  }

  // ---------------------------------------------------------------------------------------------
  // Ölçüm: kare günlüğü (halka tampon) + metrics() — fps, aralıklar, düşen kare, geçişler, gecikme örnekleri
  // ---------------------------------------------------------------------------------------------
  function createRecorder(cap = 36000) {
    const R = { cap, n: 0, i: 0, t: new Float64Array(cap), mouth: new Float32Array(cap), env: new Float32Array(cap), mode: new Uint8Array(cap), level: new Float32Array(cap), work: new Float32Array(cap) };
    R.push = (t, s, work) => {
      const k = R.i;
      R.t[k] = t; R.mouth[k] = s.mouth; R.env[k] = s.env; R.mode[k] = MODES.indexOf(s.mode); R.level[k] = s.level; R.work[k] = work;
      R.i = (k + 1) % cap; if (R.n < cap) R.n++;
    };
    R.range = (from = -Infinity, to = Infinity) => {
      const out = { t: [], mouth: [], env: [], mode: [], level: [], work: [] };
      const start = R.n < cap ? 0 : R.i;
      for (let j = 0; j < R.n; j++) {
        const k = (start + j) % cap, t = R.t[k];
        if (t < from || t > to) continue;
        out.t.push(t); out.mouth.push(R.mouth[k]); out.env.push(R.env[k]); out.mode.push(MODES[R.mode[k]]); out.level.push(R.level[k]); out.work.push(R.work[k]);
      }
      return out;
    };
    return R;
  }
  const pct = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))] : null);
  const r2 = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 100) / 100);
  const stats = (arr) => {
    if (!arr.length) return { n: 0 };
    const s = [...arr].sort((a, b) => a - b), mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return { n: arr.length, mean: r2(mean), p50: r2(pct(s, 50)), p95: r2(pct(s, 95)), p99: r2(pct(s, 99)), max: r2(s[s.length - 1]), min: r2(s[0]) };
  };

  // opts: { from, to (performance ms), fps (hedef), events: [{t (s, dosya zamanı), dur}], streamStart, presentMs, reactThr }
  function computeMetrics(rec, eng, audio, opts = {}) {
    const fps = opts.fps || 60, nominal = 1000 / fps;
    const L = rec.range(opts.from, opts.to);
    const T = L.t, n = T.length;
    const iv = [];
    for (let i = 1; i < n; i++) iv.push(T[i] - T[i - 1]);
    const dropLimit = 1.5 * nominal;
    const droppedAt = [];
    for (let i = 0; i < iv.length; i++) if (iv[i] > dropLimit) droppedAt.push({ t: r2(T[i + 1]), ms: r2(iv[i]), workBeforeMs: r2(L.work[i]) });
    // 1 s kayan pencerelerde fps (pencere = aralık sayısı / aralık toplamı)
    const winFps = [];
    for (let i = 0, j = 0; i < n; i++) {
      if (j < i) j = i;
      while (j + 1 < n && T[j + 1] - T[i] <= 1000) j++;
      if (T[n - 1] - T[i] < 1000) break;
      if (j > i) winFps.push(((j - i) * 1000) / (T[j] - T[i]));
    }
    const wf = [...winFps].sort((a, b) => a - b);
    const avg = n > 1 ? ((n - 1) * 1000) / (T[n - 1] - T[0]) : null;
    const ivs = stats(iv);
    const out = {
      version: VERSION,
      window: { from: r2(opts.from ?? (n ? T[0] : null)), to: r2(opts.to ?? (n ? T[n - 1] : null)), ms: n > 1 ? r2(T[n - 1] - T[0]) : 0 },
      nominalFps: fps, nominalMs: r2(nominal), frames: n,
      fps: { avg: r2(avg), p5: r2(pct(wf, 5)), p50: r2(pct(wf, 50)), min: r2(wf[0]), windowS: 1, instP5: ivs.p95 ? r2(1000 / ivs.p95) : null },
      intervals: { ...ivs, sd: iv.length ? r2(Math.sqrt(iv.reduce((a, x) => a + (x - ivs.mean) ** 2, 0) / iv.length)) : null },
      dropped: { count: droppedAt.length, limitMs: r2(dropLimit), at: droppedAt.slice(0, 50) },
      work: { ...stats(L.work), budgetMs: r2(nominal), note: 'kare başı sayfa JS süresi (girdi + adım + çizim çağrıları); bileşim/GPU hariç' },
      transitions: eng.S.transitions.map((x) => ({ t: r2(x.tPerf ?? null), frame: x.frame, from: x.from, to: x.to })),
      audio: audio ? audio.info() : null,
      input: { levelMax: r2(L.level.reduce((x, y) => Math.max(x, y), 0)), envMax: r2(L.env.reduce((x, y) => Math.max(x, y), 0)), mouthMax: r2(L.mouth.reduce((x, y) => Math.max(x, y), 0)) },
    };
    // tetik gecikmesi: olay zaman damgası → tepkinin uygulandığı kare (+ sunum payı)
    const present = opts.presentMs ?? nominal;
    const trig = eng.S.applied.filter((a) => a.meta && a.meta.tEvent != null && a.meta.tFrame != null && (opts.from == null || a.meta.tFrame >= opts.from) && (opts.to == null || a.meta.tFrame <= opts.to));
    out.triggers = {
      presentMs: r2(present),
      samples: trig.map((a) => ({ name: a.name, key: a.meta.key || null, via: a.meta.via || null, ms: r2(a.meta.tFrame - a.meta.tEvent + present) })),
    };
    out.triggers.stats = stats(out.triggers.samples.map((x) => x.ms));
    // ses gecikmesi: dosyadaki olay başı → ilk tepki karesi (ağız eşiği ya da konuşuyor durumu) + sunum payı
    if (opts.events && opts.events.length) {
      const t0 = opts.streamStart ?? (audio ? audio.streamStart : null);
      const thr = opts.reactThr ?? 0.05;
      const all = rec.range(), AT = all.t;
      const samples = [];
      for (const ev of opts.events) {
        const exp = t0 + ev.t * 1000;
        if (opts.from != null && exp < opts.from) continue;
        if (opts.to != null && exp > opts.to - 500) continue;
        // olaydan önceki 150 ms ağız kapalı olmalı (geçerli ölçüm); tepki penceresi [−50, +500] ms
        let i0 = AT.findIndex((t) => t >= exp - 150);
        if (i0 < 0) { samples.push({ t: ev.t, kind: ev.kind || null, ok: false, why: 'kayıt yok' }); continue; }
        let pre = 0;
        for (let i = i0; i < AT.length && AT[i] < exp - 50; i++) pre = Math.max(pre, all.mouth[i]);
        let fm = null, fs = null;
        const wasTalking = all.mode[Math.max(0, i0 - 1)] === 'konusuyor';
        for (let i = i0; i < AT.length && AT[i] <= exp + 500; i++) {
          if (AT[i] < exp - 50) continue;
          if (fm == null && all.mouth[i] >= thr) fm = AT[i];
          if (fs == null && !wasTalking && all.mode[i] === 'konusuyor') fs = AT[i];
        }
        const first = [fm, fs].filter((x) => x != null);
        const s = {
          t: ev.t, kind: ev.kind || null, expected: r2(exp),
          mouthMs: fm != null ? r2(fm - exp + present) : null, stateMs: fs != null ? r2(fs - exp + present) : null,
          ms: first.length ? r2(Math.min(...first) - exp + present) : null, preMouth: r2(pre),
        };
        s.ok = s.ms != null && pre < thr;
        if (pre >= thr) s.why = 'olaydan önce ağız açık';
        else if (s.ms == null) s.why = 'tepki yok (500 ms)';
        samples.push(s);
      }
      const ok = samples.filter((s) => s.ok);
      // gürültü kapısı sızıntısı: olaylar arası sessizlikte ağzın eşiği aşması
      let leak = 0;
      const evs = opts.events.map((e) => [t0 + e.t * 1000, t0 + (e.t + (e.dur || 0)) * 1000]);
      for (let i = 0; i < AT.length; i++) {
        const t = AT[i];
        if ((opts.from != null && t < opts.from) || (opts.to != null && t > opts.to)) continue;
        const near = evs.some(([a, b]) => t >= a - 60 && t <= b + 700);
        if (!near && all.mouth[i] >= thr) leak++;
      }
      out.latency = {
        anchor: audio ? audio.anchor : 'verilen', streamStart: r2(t0), presentMs: r2(present), reactThr: thr,
        samples, valid: ok.length, invalid: samples.length - ok.length,
        first: stats(ok.map((s) => s.ms)), mouth: stats(ok.filter((s) => s.mouthMs != null).map((s) => s.mouthMs)),
        state: stats(samples.filter((s) => s.stateMs != null).map((s) => s.stateMs)),
        gateLeakFrames: leak,
      };
    }
    return out;
  }

  // ---------------------------------------------------------------------------------------------
  // Genel API (kitaplık): adaptör kaydı + ortak parçalar (panel de kullanır)
  // ---------------------------------------------------------------------------------------------
  const api = window.MOTION_LIVE = window.MOTION_LIVE || {};
  Object.assign(api, {
    VERSION, W, H, DEFAULTS, SCHEMA, REACTIONS, MODES, MODE_LABEL, STORE_KEY, CHANNEL,
    mergeSettings, loadStored, saveStored, createBus, createAudioInput, createEngine,
    _avatar: api._avatar || null,
    // Avatar adaptörü: { name, kind: 'canvas'|'dom', init?(ctx|root, info), draw(ctx|root, state, t), dispose?() }
    // canvas: ctx mantıksal 1920×1080'e ölçekli ve zemin çizilmiş gelir. dom: root 1920×1080 kutu, CSS ile ölçekli.
    // draw saf olmalı: yalnız (state, t) okur; kendi zamanlayıcısı/rAF'ı olmaz. Son kayıt geçerlidir.
    registerAvatar(av) {
      if (!av || typeof av.draw !== 'function') throw new Error('registerAvatar: draw(ctx|root, state, t) gerekli');
      api._avatar = { kind: 'canvas', name: 'adsız', ...av };
      if (typeof api._onAvatar === 'function') api._onAvatar(api._avatar);
      return api._avatar;
    },
    // Tepki kaydı (proje adaptörü genişletir): def = { dur: s, kick?: {kanal: hız}, f(p 0..1) → {pitch,yaw,roll,x,y,scale,mouth,eyes} }.
    // Aynı adla kayıt öncekini değiştirir; panel listesi REACTIONS'tan okunur. Tuş eşlemesi ayarlarda (keys) yapılır.
    registerReaction(name, def, label) {
      if (!name || !/^[a-z0-9_-]+$/i.test(name)) throw new Error('registerReaction: ad [a-z0-9_-] olmalı');
      if (!def || typeof def.f !== 'function' || !(def.dur > 0)) throw new Error('registerReaction: { dur > 0, f(p) } gerekli');
      if (['dinle', 'sessiz', 'sifirla'].includes(name)) throw new Error('registerReaction: ' + name + ' ayrılmış (durum anahtarı)');
      RX[name] = { kick: {}, ...def };
      REACTIONS[name] = label || name;
      return Object.keys(RX);
    },
  });

  const role = (document.currentScript && document.currentScript.dataset.role) || 'stage';
  if (role !== 'stage') return;

  // ---------------------------------------------------------------------------------------------
  // Sahne (OBS sayfası)
  // ---------------------------------------------------------------------------------------------
  const q = new URLSearchParams(location.search);
  const QC = q.get('qc') === '1';
  const MANUAL = q.get('drive') === 'manual';
  const FPS = +q.get('fps') || 60;
  const bgParam = q.get('bg');
  const TRANSPARENT = bgParam === 'transparent';

  let settings = mergeSettings(DEFAULTS, QC ? null : loadStored());
  if (bgParam && !TRANSPARENT) settings.bg = bgParam;
  if (q.get('meter') === '1') settings.showMeter = true;

  const canvas = document.getElementById('stage') || document.body.appendChild(Object.assign(document.createElement('canvas'), { id: 'stage' }));
  const ctx = canvas.getContext('2d', { alpha: TRANSPARENT });   // opak zeminde alfa kapalı: bileşimde karışım yok
  const domRoot = document.getElementById('dom-root');
  const notice = document.getElementById('notice');
  if (TRANSPARENT) { document.documentElement.style.background = 'transparent'; document.body.style.background = 'transparent'; }
  else document.body.style.background = settings.bg;

  const eng = createEngine();
  const audio = createAudioInput();
  const rec = createRecorder();
  const bus = createBus('sahne', { relay: !QC, onRelay: () => bus.post('state', stateMsg()) });
  let view = { s: 1, ox: 0, oy: 0, cw: 0, ch: 0 };
  let avatar = null, avatarErr = false, lastPanelHello = -1e9, remoteDb = -120, remoteAt = -1e9;
  let track = null, recording = null;
  let t0 = null, last = null, loopOn = false;

  function say(msg) { if (!notice) return; notice.textContent = msg || ''; notice.style.display = msg ? 'block' : 'none'; }

  function fit() {
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.max(1, Math.round(innerWidth * dpr)), ch = Math.max(1, Math.round(innerHeight * dpr));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    const s = Math.min(cw / W, ch / H);
    view = { s, ox: (cw - W * s) / 2, oy: (ch - H * s) / 2, cw, ch, dpr };
    if (domRoot) domRoot.style.transform = `translate(${view.ox / dpr}px, ${view.oy / dpr}px) scale(${s / dpr})`;
  }
  addEventListener('resize', fit);
  fit();

  function useAvatar(av) {
    if (avatar && typeof avatar.dispose === 'function') try { avatar.dispose(); } catch { /* yok */ }
    avatar = av; avatarErr = false;
    if (domRoot) { domRoot.innerHTML = ''; domRoot.style.display = av && av.kind === 'dom' ? 'block' : 'none'; }
    if (av && typeof av.init === 'function') {
      try { av.init(av.kind === 'dom' ? domRoot : ctx, { W, H, settings, api }); } catch (e) { console.error('[motion-live] avatar init:', e); }
    }
    bus.post('state', stateMsg());
  }
  api._onAvatar = useAvatar;
  if (api._avatar) useAvatar(api._avatar);
  // ?avatar=yol/avatar.js → projenin look-dev avatarını yükle (yer tutucunun yerine)
  if (q.get('avatar')) { const s = document.createElement('script'); s.src = q.get('avatar'); s.onerror = () => say('avatar yüklenemedi: ' + q.get('avatar')); document.head.appendChild(s); }

  // Yedek çizim: hiç avatar yoksa
  function drawFallback(c) {
    c.fillStyle = '#9a9a9a'; c.font = '28px system-ui, sans-serif'; c.textAlign = 'center';
    c.fillText('avatar kayıtlı değil — MOTION_LIVE.registerAvatar(...)', W / 2, H / 2);
  }
  function drawMeter(c, st) {
    c.save();
    c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(24, H - 110, 420, 86);
    c.fillStyle = '#888'; c.fillRect(36, H - 70, 396 * st.level, 12);
    c.fillStyle = '#ddd'; c.fillRect(36, H - 52, 396 * st.env, 12);
    c.fillStyle = '#fff'; c.fillRect(36 + 396 * settings.talkOn, H - 74, 2, 40);
    c.font = '14px system-ui, sans-serif'; c.textAlign = 'left'; c.fillText(st.label + ' · ' + st.db.toFixed(1) + ' dBFS', 36, H - 86);
    c.restore();
  }

  function draw(st) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (TRANSPARENT) ctx.clearRect(0, 0, view.cw, view.ch);
    else { ctx.fillStyle = settings.bg; ctx.fillRect(0, 0, view.cw, view.ch); }
    ctx.setTransform(view.s, 0, 0, view.s, view.ox, view.oy);
    if (!avatar) drawFallback(ctx);
    else if (!avatarErr) {
      try {
        if (avatar.kind === 'dom') avatar.draw(domRoot, st, st.t);
        else { ctx.save(); avatar.draw(ctx, st, st.t); ctx.restore(); }
      } catch (e) { avatarErr = true; console.error('[motion-live] avatar draw hatası (çizim durduruldu):', e); say('avatar çizim hatası — konsola bak'); }
    }
    if (settings.showMeter) drawMeter(ctx, st);
  }

  function inputDb(nowMs, dt) {
    if (track) {   // kayıtlı zarf oynatma (döngülü)
      const k = MANUAL ? (eng.S.frame % track.db.length) : Math.floor((((nowMs - track.start) / 1000) * track.fps)) % track.db.length;
      return track.db[Math.max(0, k)];
    }
    if (settings.source === 'panel') return nowMs - remoteAt < 250 ? remoteDb : -120;
    if (settings.source === 'kapali') return -120;
    return audio.readDb(dt);
  }

  // Tek kare: girdi → adım → çizim → günlük. now = performance ms (rAF damgası ya da elle saat)
  function tick(now, dt) {
    const db = inputDb(now, dt);
    eng.step(dt, db, settings);
    // bu karede doğan geçiş/tetik kayıtlarına kare saati (sondan geriye; eskiler zaten damgalı)
    for (let i = eng.S.transitions.length - 1; i >= 0 && eng.S.transitions[i].tPerf == null; i--) eng.S.transitions[i].tPerf = now;
    for (let i = eng.S.applied.length - 1; i >= 0 && eng.S.applied[i].tFrame == null; i--) { const a = eng.S.applied[i]; a.tFrame = now; if (a.meta) a.meta.tFrame = now; }
    const st = eng.snapshot(settings);
    draw(st);
    if (recording) { recording.db.push(r2(db)); recording.t.push(r2(now - recording.start)); }
    if (!QC && eng.S.frame % 4 === 0 && now - lastPanelHello < 5000) bus.post('telemetry', telemetry(now, st));
    return st;
  }

  function loop(now) {
    requestAnimationFrame(loop);   // önce planla: çizim hatası döngüyü durdurmaz
    if (t0 == null) { t0 = now; last = now - 1000 / FPS; }
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    const w0 = performance.now();
    const st = tick(now, dt);
    rec.push(now, st, performance.now() - w0);
    fpsWin.push(now); while (now - fpsWin[0] > 1000) fpsWin.shift();   // panel telemetrisi için son 1 s
  }

  // --- telemetri / panel iletişimi ---
  const fpsWin = [];
  function telemetry(now, st) {
    return {
      mode: st.mode, label: st.label, env: r2(st.env), level: r2(st.level), db: r2(st.db), mouth: r2(st.mouth),
      fps: fpsWin.length > 1 ? r2(((fpsWin.length - 1) * 1000) / (fpsWin[fpsWin.length - 1] - fpsWin[0])) : null,
      flags: { ...eng.S.flags }, inputLatencyMs: audio.inputLatencyMs, audioError: audio.error, recording: !!recording,
    };
  }
  function stateMsg() {
    return { settings, devices: audio.devices, device: audio.deviceLabel, avatar: avatar ? avatar.name : null, version: VERSION, audioError: audio.error, transparent: TRANSPARENT };
  }
  function applySettings(patch, persist = true) {
    const prevDev = settings.deviceId, prevSrc = settings.source;
    settings = mergeSettings(settings, patch);
    if (bgParam && !TRANSPARENT) settings.bg = bgParam;
    if (!TRANSPARENT) document.body.style.background = settings.bg;
    if (persist && !QC) saveStored(settings);
    if (!MANUAL && (settings.deviceId !== prevDev || (settings.source === 'mic' && prevSrc !== 'mic'))) startMic();
    if (settings.source !== 'mic' && prevSrc === 'mic') audio.stop(true);
  }
  function fire(name, meta) {
    if (!eng.trigger(name, meta)) return false;
    return true;
  }
  function keyName(e) { return e.key && e.key.length === 1 ? e.key.toLowerCase() : e.code; }
  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = keyName(e), name = settings.keymap[k];
    if (name) fire(name, { key: k, via: 'klavye', tEvent: e.timeStamp });
  });
  bus.on((m) => {
    if (m.type === 'hello') { lastPanelHello = performance.now(); bus.post('state', stateMsg()); }
    else if (m.type === 'settings') { applySettings(m.settings || {}); bus.post('state', stateMsg()); }
    else if (m.type === 'trigger') {
      const name = m.name || settings.keymap[m.key];
      const tEvent = m.at != null ? m.at - performance.timeOrigin : null;   // panelin mutlak saatinden bu sayfanın saatine
      if (name) fire(name, { key: m.key || null, via: 'panel', tEvent });
    } else if (m.type === 'level') { remoteDb = m.db; remoteAt = performance.now(); }
    else if (m.type === 'record') {
      if (m.on) recording = { start: performance.now(), t: [], db: [] };
      else if (recording) {
        const r = recording; recording = null;
        const dur = r.t.length ? r.t[r.t.length - 1] / 1000 : 0;
        bus.post('track', { track: { version: VERSION, kind: 'motion-live-zarf', fps: dur > 0 ? r2(r.t.length / dur) : FPS, t: r.t, db: r.db } });
      }
    } else if (m.type === 'play') { loadTrack(m.track || null); }
  });

  // yedek yol: panel aynı kökende localStorage'a yazınca (BroadcastChannel yoksa da) ayarlar gelir
  addEventListener('storage', (e) => {
    if (QC || e.key !== STORE_KEY || !e.newValue) return;
    try { applySettings(JSON.parse(e.newValue), false); } catch { /* bozuk kayıt */ }
  });

  function loadTrack(tr) {
    if (!tr || !Array.isArray(tr.db) || !tr.db.length) { track = null; return false; }
    track = { fps: +tr.fps || FPS, db: tr.db.map(Number), start: performance.now() };
    return true;
  }

  async function startMic() {
    if (settings.source !== 'mic') return audio;
    say('');
    await audio.start(settings.deviceId, QC ? 250 : 1000);
    if (audio.error) {
      say('Mikrofon açılamadı — ' + audio.error + '. OBS için bkz. motion-live SKILL "sorun giderme".');
      if (/askıda/.test(audio.error)) {
        const resume = () => { audio.ctx.resume().then(() => { audio.running = audio.ctx.state === 'running'; if (audio.running) { audio.error = null; say(''); } }); };
        addEventListener('pointerdown', resume, { once: true }); addEventListener('keydown', resume, { once: true });
      }
    }
    bus.post('state', stateMsg());
    return audio;
  }
  if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
    navigator.mediaDevices.addEventListener('devicechange', () => audio.listDevices().then(() => bus.post('state', stateMsg())));
  }

  // --- isteğe bağlı panel katmanı (?panel=1): aynı köken iframe ---
  if (q.get('panel') === '1') {
    const f = document.createElement('iframe');
    f.src = 'panel.html?gomulu=1';
    f.title = 'motion live paneli';
    f.style.cssText = 'position:fixed;top:0;right:0;width:440px;height:100vh;border:0;z-index:10;background:#1e1e1e';
    document.body.appendChild(f);
  }

  // --- ayar dosyası (?settings=yol.json): varsayılanların üstüne, yerel kaydın altına ---
  const readyP = (async () => {
    if (q.get('settings')) {
      try {
        const r = await fetch(q.get('settings'), { cache: 'no-store' });
        const fileSet = await r.json();
        settings = mergeSettings(mergeSettings(DEFAULTS, fileSet), QC ? null : loadStored());
        if (bgParam && !TRANSPARENT) settings.bg = bgParam;
      } catch (e) { say('ayar dosyası okunamadı: ' + q.get('settings')); }
    }
    if (q.get('play')) {
      try { loadTrack(await (await fetch(q.get('play'), { cache: 'no-store' })).json()); } catch { say('zarf kaydı okunamadı: ' + q.get('play')); }
    }
    if (!MANUAL && !track && q.get('mic') !== '0') await startMic();
    return audio.info();
  })();

  if (!MANUAL) { loopOn = true; requestAnimationFrame(loop); }

  // --- ölçüm / sürüş kancaları (motion-render live --qc, reviewer ve measure kendi koşuları için) ---
  window.__live = {
    version: VERSION,
    ready: () => readyP,
    audio: () => audio.info(),
    settings: () => JSON.parse(JSON.stringify(settings)),
    setSettings: (patch) => { applySettings(patch, false); return true; },
    state: () => JSON.parse(JSON.stringify(eng.snapshot(settings))),
    trigger: (name, tEvent) => fire(name, { via: 'api', tEvent: tEvent ?? performance.now() }),
    metrics: (opts = {}) => computeMetrics(rec, eng, audio, { fps: FPS, ...opts }),
    frames: (from, to) => rec.range(from, to),
    transitions: () => eng.S.transitions.map((x) => ({ ...x })),
    // elle sürüş (?drive=manual): sabit dt = 1/fps, girdi kayıtlı zarftan → deterministik kare
    loadTrack: (tr) => loadTrack(tr),
    advance: (n = 1) => {
      for (let i = 0; i < n; i++) { const now = (eng.S.frame + 1) * (1000 / FPS), w0 = performance.now(); const st = tick(now, 1 / FPS); rec.push(now, st, performance.now() - w0); }
      return eng.S.frame;
    },
    avatar: () => (avatar ? { name: avatar.name, kind: avatar.kind } : null),
    loop: () => loopOn,
  };
})();
