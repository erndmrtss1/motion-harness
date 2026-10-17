// motion-stage.jsx — @motion/harness kompozisyon saati (sözleşme: render/CONTRACT.md §4).
//
// Dışa açılan yüzey (sahne kodu yalnız bunları kullanır):
//   <CompositionStage width height bg scenes playback autoplay loop> … </CompositionStage>
//   useComposition() → { T, CUES, time, duration, authoredTotal, playing }
//   <Shot from to>  (T aralığında görünür)       Easing, interpolate, clamp (küçük yardımcılar)
//
// Render sözleşmesi (harness):
//   svg[data-om-exportable-video-with-duration-secs=<toplam s>] > foreignObject > div(width,height,bg,relative,overflow hidden)
//   seek: svg'ye CustomEvent('data-om-seek-to-time-frame', {detail:{time, sync:true}}) → ReactDOM.flushSync ile aynı görevde commit
//   sayfadaki @font-face kuralları data: URL olarak foreignObject içine kopyalanınca svg data-om-fonts-inlined="true"
// Kural: her kare T'nin saf fonksiyonu; çizim useEffect/rAF'e bağlanmaz (seek edilen kare deterministik olur).
// Önizleme (tarayıcıda açınca): kendi rAF saati, Boşluk = oynat/durdur, ←/→ = 0.1 s (Shift: 1 s), 0/Home = başa.

var MH_PERSIST = 'animstage-v3';

function mhClamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

var MH_Easing = {
  linear: function (t) { return t; },
  easeInQuad: function (t) { return t * t; },
  easeOutQuad: function (t) { return t * (2 - t); },
  easeInOutQuad: function (t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; },
  easeInCubic: function (t) { return t * t * t; },
  easeOutCubic: function (t) { var u = t - 1; return u * u * u + 1; },
  easeInOutCubic: function (t) { return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1; },
};

function mhInterpolate(input, output, ease) {
  var e = ease || MH_Easing.linear;
  return function (t) {
    if (t <= input[0]) return output[0];
    var n = input.length - 1;
    if (t >= input[n]) return output[n];
    for (var i = 0; i < n; i++) {
      if (t >= input[i] && t <= input[i + 1]) {
        var span = input[i + 1] - input[i], u = span > 0 ? (t - input[i]) / span : 1;
        return output[i] + (output[i + 1] - output[i]) * e(u);
      }
    }
    return output[n];
  };
}

// OM_SCENES ayrıştırma: '[{"name":"…","dur":N,"nat"?:N}, …]' — geçersizse null.
function mhParseScenes(raw) {
  if (typeof raw !== 'string' || !raw) return null;
  var a; try { a = JSON.parse(raw); } catch (e) { return null; }
  if (!Array.isArray(a) || !a.length) return null;
  for (var i = 0; i < a.length; i++) {
    var s = a[i];
    if (!s || typeof s.name !== 'string' || typeof s.dur !== 'number' || !isFinite(s.dur) || s.dur <= 0) return null;
  }
  return a;
}
function mhParsePlayback(raw) {
  if (typeof raw !== 'string' || !raw) return null;
  var p; try { p = JSON.parse(raw); } catch (e) { return null; }
  if (!p || typeof p !== 'object') return null;
  if (p.mode === 'loop') return { mode: 'loop' };
  if (p.mode === 'times' && p.count === Math.floor(p.count) && p.count >= 1) return { mode: 'times', count: p.count };
  return null;
}

// Bölüm tablosu: oynatma zamanı (dur toplamı) ↔ yazılmış zaman (nat toplamı). Bir bölüm kırpılırsa/hızlanırsa
// yazılmış dilim doğrusal olarak yeniden zamanlanır. CUES: bölüm adı → yazılmış başlangıç (ms'e yuvarlı).
function mhDerive(scenes) {
  var play = 0, auth = 0, sections = [], table = Object.create(null);
  scenes.forEach(function (s) {
    var nat = typeof s.nat === 'number' && isFinite(s.nat) && s.nat > 0 ? s.nat : s.dur;
    sections.push({ name: s.name, playStart: play, dur: s.dur, authStart: auth, nat: nat });
    if (!(s.name in table)) table[s.name] = Math.round(auth * 1000) / 1000;
    play += s.dur; auth += nat;
  });
  return { sections: sections, table: table, total: Math.round(play * 1000) / 1000, authoredTotal: Math.round(auth * 1000) / 1000 };
}
function mhWarp(d, t) {
  var ss = d.sections;
  if (!ss.length) return 0;
  var s = ss[ss.length - 1];
  for (var i = 0; i < ss.length; i++) if (t < ss[i].playStart + ss[i].dur) { s = ss[i]; break; }
  var local = Math.min(Math.max(t - s.playStart, 0), s.dur);
  return Math.min(s.authStart + (s.dur > 0 ? local * (s.nat / s.dur) : 0), d.authoredTotal);
}
function mhCues(table) {
  if (typeof Proxy !== 'function') return table;
  return new Proxy(table, {
    get: function (t, k) {
      if (typeof k !== 'string' || k in t) return t[k];
      if (k === 'then' || k === 'toJSON' || k === 'valueOf' || k === 'toString' || k === 'constructor') return Object.prototype[k];
      console.warn('[motion-stage] bilinmeyen cue: ' + k);
      return NaN;
    },
  });
}

// Sayfanın @font-face kurallarını data: URL'li kopyalar hâlinde foreignObject'e yazar (svg kendi başına seri hale getirilebilsin).
function mhInlineFonts(svg) {
  var host = svg && svg.querySelector('foreignObject > div');
  if (!host) return function () {};
  var cancelled = false;
  (async function () {
    var rules = [];
    for (var i = 0; i < document.styleSheets.length; i++) {
      var ss = document.styleSheets[i], list = null;
      try { list = ss.cssRules; } catch (e) {
        if (ss.href) {
          try {
            var txt = await fetch(ss.href).then(function (r) { if (!r.ok) throw 0; return r.text(); });
            (txt.match(/@font-face\s*{[^}]*}/g) || []).forEach(function (css) { rules.push({ css: css, base: ss.href }); });
          } catch (e2) { /* yok say */ }
        }
        continue;
      }
      if (!list) continue;
      for (var j = 0; j < list.length; j++) if (list[j].type === CSSRule.FONT_FACE_RULE) rules.push({ css: list[j].cssText, base: ss.href || location.href });
    }
    var toData = function (url) {
      return fetch(url).then(function (r) { if (!r.ok) throw 0; return r.blob(); }).then(function (b) {
        return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = function () { res(url); }; fr.readAsDataURL(b); });
      }).catch(function () { return url; });
    };
    var parts = await Promise.all(rules.map(async function (r) {
      var re = /url\((['"]?)([^'")]+)\1\)/g, out = r.css, m;
      while ((m = re.exec(r.css))) {
        if (m[2].indexOf('data:') === 0) continue;
        var abs; try { abs = new URL(m[2], r.base).href; } catch (e) { continue; }
        out = out.split(m[0]).join('url("' + (await toData(abs)) + '")');
      }
      return out;
    }));
    if (!cancelled && parts.length) {
      var st = document.createElement('style');
      st.textContent = parts.join('\n');
      host.insertBefore(st, host.firstChild);
    }
    svg.setAttribute('data-om-fonts-inlined', 'true');
  })();
  return function () { cancelled = true; };
}

var MH_TimeCtx = React.createContext(null);
var MH_CompCtx = React.createContext(null);

function useComposition() {
  var c = React.useContext(MH_CompCtx);
  if (!c) throw new Error('useComposition() <CompositionStage> içinde çağrılmalı');
  return c;
}

function MHStage(props) {
  var width = +props.width || 1920, height = +props.height || 1080, duration = +props.duration || 10;
  var pb = props.playback, loop = pb ? pb.mode === 'loop' : props.loop !== false;
  var timeState = React.useState(function () {
    try { var v = parseFloat(localStorage.getItem(MH_PERSIST + ':t') || '0'); return isFinite(v) ? mhClamp(v, 0, duration) : 0; } catch (e) { return 0; }
  });
  var time = timeState[0], setTime = timeState[1];
  var playState = React.useState(props.autoplay !== false);
  var playing = playState[0], setPlaying = playState[1];
  var scaleState = React.useState(1);
  var scale = scaleState[0], setScale = scaleState[1];
  var outerRef = React.useRef(null), svgRef = React.useRef(null);

  React.useEffect(function () { try { localStorage.setItem(MH_PERSIST + ':t', String(time)); } catch (e) {} }, [time]);

  React.useEffect(function () {   // önizlemede pencereye sığdır (harness transform'u kapatır)
    var el = outerRef.current;
    if (!el) return;
    var fit = function () { setScale(Math.max(0.05, Math.min(el.clientWidth / width, el.clientHeight / height))); };
    fit();
    var ro = new ResizeObserver(fit); ro.observe(el);
    return function () { ro.disconnect(); };
  }, [width, height]);

  React.useEffect(function () {   // önizleme saati
    if (!playing) return;
    var raf = 0, last = null, passes = 0;
    var step = function (ts) {
      if (last == null) last = ts;
      var dt = (ts - last) / 1000; last = ts;
      setTime(function (t) {
        var n = t + dt;
        if (n >= duration) {
          if (pb && pb.mode === 'times') { passes++; if (passes >= pb.count) { setPlaying(false); return duration; } return n % duration; }
          if (loop) return n % duration;
          setPlaying(false); return duration;
        }
        return n;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return function () { cancelAnimationFrame(raf); };
  }, [playing, duration, loop]);

  React.useEffect(function () {   // klavye (önizleme)
    var onKey = function (e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space') { e.preventDefault(); setPlaying(function (p) { return !p; }); }
      else if (e.code === 'ArrowLeft') setTime(function (t) { return mhClamp(t - (e.shiftKey ? 1 : 0.1), 0, duration); });
      else if (e.code === 'ArrowRight') setTime(function (t) { return mhClamp(t + (e.shiftKey ? 1 : 0.1), 0, duration); });
      else if (e.key === '0' || e.code === 'Home') setTime(0);
    };
    window.addEventListener('keydown', onKey);
    return function () { window.removeEventListener('keydown', onKey); };
  }, [duration]);

  React.useEffect(function () {   // dış seek protokolü (harness, dışa aktarım)
    var el = svgRef.current;
    if (!el) return;
    var canSync = typeof ReactDOM !== 'undefined' && typeof ReactDOM.flushSync === 'function';
    var onSeek = function (e) {
      var apply = function () { setPlaying(false); setTime(mhClamp(e.detail.time, 0, duration)); };
      if (canSync && e.detail && e.detail.sync === true) ReactDOM.flushSync(apply); else apply();
    };
    el.addEventListener('data-om-seek-to-time-frame', onSeek);
    if (canSync) el.setAttribute('data-om-sync-seek', 'true');
    return function () { el.removeEventListener('data-om-seek-to-time-frame', onSeek); };
  }, [duration]);

  React.useEffect(function () { return mhInlineFonts(svgRef.current); }, []);

  var ctx = React.useMemo(function () { return { time: time, duration: duration, playing: playing }; }, [time, duration, playing]);

  return (
    <div ref={outerRef} data-om-starter="motion-stage" style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: '#0a0a0a', fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', minHeight: 0 }}>
        <svg ref={svgRef} width={width} height={height} data-om-exportable-video-with-duration-secs={duration}
          style={{ transform: 'scale(' + scale + ')', transformOrigin: 'center', flexShrink: 0, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', display: 'block' }}>
          <foreignObject x="0" y="0" width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml" style={{ width: width, height: height, background: props.background, position: 'relative', overflow: 'hidden' }}>
              <MH_TimeCtx.Provider value={ctx}>{props.children}</MH_TimeCtx.Provider>
            </div>
          </foreignObject>
        </svg>
      </div>
    </div>
  );
}

function MHClock(props) {
  var tl = React.useContext(MH_TimeCtx), d = props.derived;
  var T = mhWarp(d, tl.time);
  var value = React.useMemo(function () {
    return { T: T, CUES: props.cues, time: tl.time, duration: tl.duration, authoredTotal: d.authoredTotal, playing: tl.playing };
  }, [T, props.cues, tl.time, tl.duration, d, tl.playing]);
  return <MH_CompCtx.Provider value={value}>{props.children}</MH_CompCtx.Provider>;
}

function CompositionStage(props) {
  var scenes = React.useMemo(function () { return mhParseScenes(props.scenes); }, [props.scenes]);
  var playback = React.useMemo(function () { return mhParsePlayback(props.playback); }, [props.playback]);
  var derived = React.useMemo(function () { return scenes ? mhDerive(scenes) : null; }, [scenes]);
  var cues = React.useMemo(function () { return derived ? mhCues(derived.table) : null; }, [derived]);
  if (!derived) {
    return <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0b0e', color: '#c96442', font: '500 16px Inter, system-ui, sans-serif' }}>
      {'motion-stage: scenes geçerli bir OM_SCENES listesi değil (beklenen: [{name, dur}, …])'}
    </div>;
  }
  return (
    <MHStage width={props.width} height={props.height} duration={derived.total} background={props.bg || '#0b0b0e'}
      autoplay={props.autoplay == null ? true : String(props.autoplay) !== 'false'}
      loop={props.loop == null ? true : String(props.loop) !== 'false'} playback={playback}>
      <MHClock derived={derived} cues={cues}>{props.children}</MHClock>
    </MHStage>
  );
}

function Shot(props) {
  var c = useComposition(), from = +props.from, to = props.to == null ? Infinity : +props.to;
  var on = isFinite(from) && c.T >= from && c.T < to;
  return <div style={{ position: 'absolute', inset: 0, visibility: on ? 'visible' : 'hidden' }}>{props.children}</div>;
}

Object.assign(window, {
  CompositionStage: CompositionStage, useComposition: useComposition, Shot: Shot,
  Easing: MH_Easing, interpolate: mhInterpolate, clamp: mhClamp,
});
