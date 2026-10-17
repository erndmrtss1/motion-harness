/* motion live — ayar paneli mantığı. Ortak çekirdek: live.js (data-role="panel" → yalnız kitaplık).
 * Sayfa canlı gerçektir: bağlanınca sayfanın ayarları panele alınır; paneldeki her değişiklik yama olarak gider
 * ve burada da localStorage'a yazılır. Tetik tuşları panelde yakalanır, olay zaman damgasıyla gönderilir.
 */
(() => {
  'use strict';
  const L = window.MOTION_LIVE;
  const $ = (id) => document.getElementById(id);
  const bus = L.createBus('panel', { onRelay: () => bus.post('hello') });
  let settings = L.mergeSettings(L.DEFAULTS, L.loadStored());
  let lastPage = -1e9, tele = null, touchedAt = -1e9, panelAudio = null, recOn = false;

  // --- değişiklik gönderimi (kaydırıcılar kare başına bir yama) ---
  let pend = null;
  function send(patch) {
    settings = L.mergeSettings(settings, patch);
    L.saveStored(settings);
    pend = { ...(pend || {}), ...patch };
    requestAnimationFrame(() => { if (pend) { bus.post('settings', { settings: pend }); pend = null; } });
    touchedAt = performance.now();
    if ('source' in patch) syncSource();
  }

  // --- şemadan kaydırıcılar ---
  const outs = {};
  const fmt = (x, step) => (step < 1 ? (+x).toFixed(step < 0.1 ? 2 : 1) : String(Math.round(x)));
  function buildGroups() {
    const host = $('groups');
    host.innerHTML = '';
    let g = null;
    for (const f of L.SCHEMA) {
      if (f.group !== g) { g = f.group; const h = document.createElement('h2'); h.textContent = g; host.appendChild(h); }
      const row = document.createElement('div'); row.className = 'row';
      const id = 'f-' + f.key;
      row.innerHTML = `<label for="${id}">${f.label}</label><input id="${id}" type="range" min="${f.min}" max="${f.max}" step="${f.step}"><output></output>`;
      const inp = row.querySelector('input'), out = row.querySelector('output');
      inp.value = settings[f.key];
      out.textContent = fmt(settings[f.key], f.step) + (f.unit ? ' ' + f.unit : '');
      inp.addEventListener('input', () => { out.textContent = fmt(inp.value, f.step) + (f.unit ? ' ' + f.unit : ''); send({ [f.key]: +inp.value }); });
      outs[f.key] = { inp, out, f };
      host.appendChild(row);
    }
  }
  function refreshControls() {
    for (const k in outs) {
      const { inp, out, f } = outs[k];
      if (document.activeElement === inp) continue;
      inp.value = settings[k]; out.textContent = fmt(settings[k], f.step) + (f.unit ? ' ' + f.unit : '');
    }
    $('source').value = settings.source;
    buildKeys();
  }

  // --- tetik düğmeleri + tuş eşlemesi ---
  function buildTriggers() {
    const host = $('triggers');
    host.innerHTML = '';
    for (const [name, label] of Object.entries(L.REACTIONS)) {
      const b = document.createElement('button');
      b.textContent = label; b.dataset.name = name;
      b.addEventListener('click', (e) => fire(name, null, e.timeStamp));
      host.appendChild(b);
    }
  }
  function flash(name) {
    const b = document.querySelector(`#triggers button[data-name="${name}"]`);
    if (!b) return;
    b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 160);
  }
  function fire(name, key, ts) {
    bus.post('trigger', { name, key, at: performance.timeOrigin + (ts ?? performance.now()) });
    flash(name);
  }
  function buildKeys() {
    const host = $('keys');
    if (host.contains(document.activeElement)) return;
    host.innerHTML = '';
    const opts = Object.entries(L.REACTIONS).map(([n, l]) => `<option value="${n}">${l}</option>`).join('') + '<option value="">— (sil)</option>';
    for (const [k, name] of Object.entries(settings.keymap)) {
      const ki = document.createElement('input'); ki.type = 'text'; ki.value = k; ki.maxLength = 12; ki.setAttribute('aria-label', 'tuş');
      const sel = document.createElement('select'); sel.innerHTML = opts; sel.value = name; sel.setAttribute('aria-label', 'tepki');
      const upd = () => {
        const km = {};
        host.querySelectorAll('input').forEach((inp, i) => { const s = host.querySelectorAll('select')[i]; const kk = inp.value.trim().toLowerCase(); if (kk && s.value) km[kk] = s.value; });
        send({ keymap: km });
      };
      ki.addEventListener('change', upd); sel.addEventListener('change', upd);
      host.appendChild(ki); host.appendChild(sel);
    }
  }
  $('addKey').addEventListener('click', () => {
    const used = new Set(Object.keys(settings.keymap));
    const k = 'qwertyuiopasdfghjklzxcvbnm'.split('').find((c) => !used.has(c)) || 'x';
    send({ keymap: { ...settings.keymap, [k]: 'vurgu' } });
    buildKeys();
  });
  document.addEventListener('keydown', (e) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && e.target.matches && e.target.matches('input:not([type=range]):not([type=button]), select, textarea')) return;   // yazı alanında tuş tetik değildir
    const k = e.key && e.key.length === 1 ? e.key.toLowerCase() : e.code;
    const name = settings.keymap[k];
    if (name) { e.preventDefault(); fire(name, k, e.timeStamp); }
  });

  // --- kaynak / aygıt ---
  $('source').addEventListener('change', () => send({ source: $('source').value }));
  $('device').addEventListener('change', () => send({ deviceId: $('device').value }));
  function renderDevices(list, current) {
    const sel = $('device');
    if (document.activeElement === sel) return;
    sel.innerHTML = '<option value="">varsayılan</option>' + (list || []).map((d) => `<option value="${d.id}">${d.label.replace(/</g, '&lt;')}</option>`).join('');
    sel.value = current || '';
  }
  // Panel kaynağı: zarf bu pencerede hesaplanır, seviye her karede sayfaya gider (OBS mikrofon izni yoksa yedek yol)
  async function syncSource() {
    if (settings.source === 'panel') {
      if (!panelAudio) panelAudio = L.createAudioInput();
      await panelAudio.start(settings.deviceId);
      $('err').textContent = panelAudio.error ? 'panel mikrofonu: ' + panelAudio.error : '';
      renderDevices(panelAudio.devices, settings.deviceId);
    } else if (panelAudio) { panelAudio.stop(); panelAudio = null; }
  }

  // --- kayıt / oynatma ---
  $('rec').addEventListener('click', () => { recOn = !recOn; bus.post('record', { on: recOn }); $('rec').textContent = recOn ? 'Kaydı bitir' : 'Zarfı kaydet'; });
  $('playFile').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { bus.post('play', { track: JSON.parse(await f.text()) }); } catch { $('err').textContent = 'zarf dosyası okunamadı'; }
  });
  $('stopPlay').addEventListener('click', () => bus.post('play', { track: null }));
  function download(name, obj) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' }));
    a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // --- ayar dışa/içe aktarma ---
  $('export').addEventListener('click', () => download('live-ayarlar.json', settings));
  $('importFile').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { const s = JSON.parse(await f.text()); settings = L.mergeSettings(L.DEFAULTS, s); L.saveStored(settings); bus.post('settings', { settings }); refreshControls(); }
    catch { $('err').textContent = 'ayar dosyası okunamadı'; }
  });
  $('reset').addEventListener('click', () => { settings = L.mergeSettings(L.DEFAULTS, null); L.saveStored(settings); bus.post('settings', { settings }); refreshControls(); });

  // --- sayfadan gelenler ---
  bus.on((m) => {
    const now = performance.now();
    if (m.type === 'state') {
      lastPage = now;
      if (m.settings && now - touchedAt > 600) { settings = L.mergeSettings(L.DEFAULTS, m.settings); L.saveStored(settings); refreshControls(); }
      if (settings.source !== 'panel') renderDevices(m.devices, settings.deviceId);
      $('av').textContent = m.avatar || '—';
      $('err').textContent = m.audioError ? 'sayfa mikrofonu: ' + m.audioError : '';
    } else if (m.type === 'telemetry') { lastPage = now; tele = m; }
    else if (m.type === 'track') download('live-zarf.json', m.track);
  });
  bus.post('hello');
  setInterval(() => bus.post('hello'), 2000);
  setTimeout(() => { $('relay').textContent = bus.relay ? 'aktarıcı: yerel sunucu + BroadcastChannel' : 'aktarıcı: yalnız BroadcastChannel (aynı tarayıcı)'; }, 800);

  // --- gösterge döngüsü (panel kaynağıysa seviyeyi de gönderir) ---
  const mc = $('meter'), mx = mc.getContext('2d');
  function frame() {
    requestAnimationFrame(frame);
    const now = performance.now();
    if (panelAudio && panelAudio.running) bus.post('level', { db: panelAudio.readDb() });
    const on = now - lastPage < 3000;
    $('dot').className = 'dot' + (on ? ' on' : '');
    $('conn').textContent = on ? 'sayfa bağlı' : 'sayfa bağlı değil';
    if (tele && on) {
      $('mode').textContent = tele.label + (tele.flags && tele.flags.listen ? ' (dinle sabit)' : '') + (tele.flags && tele.flags.mute ? ' (sessiz)' : '');
      $('fps').textContent = tele.fps != null ? tele.fps.toFixed(1) : '—';
      $('lat').textContent = tele.inputLatencyMs != null ? tele.inputLatencyMs.toFixed(1) + ' ms' : '—';
    }
    const w = mc.width, h = mc.height;
    mx.fillStyle = '#151515'; mx.fillRect(0, 0, w, h);
    if (tele && on) {
      mx.fillStyle = '#5c5c5c'; mx.fillRect(0, 10, w * tele.level, 44);
      mx.fillStyle = '#cfcfcf'; mx.fillRect(0, 70, w * tele.env, 44);
    }
    mx.fillStyle = '#e0b060';
    mx.fillRect(w * settings.talkOn - 1, 0, 3, h);
    mx.fillStyle = '#7f7f7f';
    mx.fillRect(w * settings.talkOff - 1, 0, 3, h);
  }

  buildGroups(); buildTriggers(); refreshControls(); syncSource();
  window.__panel = { audio: () => (panelAudio ? panelAudio.info() : null), settings: () => ({ ...settings }), db: () => (panelAudio ? panelAudio.readDb() : null) };   // tanı kancası
  requestAnimationFrame(frame);
})();
