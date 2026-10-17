/* motion-runtime.js — @motion/harness sayfa yükleyicisi (sözleşme: render/CONTRACT.md §4).
 *
 * Sahne sayfasındaki <x-dc> alt kümesini çalıştırır:
 *   <x-dc>
 *     <helmet> <link> <style> <script> … </helmet>
 *     <x-import component-from-global-scope="Ad" from="a.jsx b.js …" style="position:absolute;inset:0"></x-import>
 *   </x-dc>
 *   <script type="text/x-dc" data-dc-script data-props='{"$preview":{…}, "prop": …}'></script>
 *
 * - helmet çocukları <head>'e taşınır (ayrıştırıcı satır içi betikleri zaten bir kez çalıştırdı; taşımak yeniden çalıştırmaz).
 * - <x-dc> → <div id="dc-root"><div class="sc-host"><div class="sc-host-x" style=…><Bileşen/></div></div></div>
 * - React 18.3.1 + ReactDOM UMD ve Babel standalone 7.29.0 unpkg adresinden yüklenir (harness yerel vendor/'a yönlendirir).
 * - from listesindeki modüller SIRAYLA: .jsx/.tsx Babel (presets react + typescript, klasik JSX), sonra
 *   new Function('React','module','exports','require', kod). Bileşen: module.exports[ad] ‖ modülün yeni window
 *   globali ‖ window[ad] ‖ module.exports.default.
 * - Global API: window.__dcSetProps(ad, props), window.__dcRootName().
 * - Hata dili harness'in yakaladığı biçimde: "[dc-runtime] x-import: FAILED to load <url>".
 */
(function () {
  'use strict';
  if (window.__motionRuntime) return;
  window.__motionRuntime = '1.0.0';

  var REACT_URL = 'https://unpkg.com/react@18.3.1/umd/react.production.min.js';
  var REACT_DOM_URL = 'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js';
  var BABEL_URL = 'https://unpkg.com/@babel/standalone@7.29.0/babel.min.js';
  var HOST_PROPS = ['position', 'left', 'right', 'top', 'bottom', 'inset', 'width', 'height', 'z-index'];

  function loadScript(src) {
    return new Promise(function (ok, fail) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { ok(); };
      s.onerror = function () { fail(new Error('betik yüklenemedi: ' + src)); };
      document.head.appendChild(s);
    });
  }

  function cssToObj(css) {
    var out = {};
    String(css || '').split(';').forEach(function (decl) {
      var i = decl.indexOf(':');
      if (i < 0) return;
      var k = decl.slice(0, i).trim().toLowerCase(), v = decl.slice(i + 1).trim();
      if (!k || HOST_PROPS.indexOf(k) < 0) return;
      out[k.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); })] = v;
    });
    return out;
  }

  function camelProp(name) { return name.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); }); }

  // x-dc ayrıştırma: DOMContentLoaded anında ağaç hazır; helmet <head>'e, x-import'lar kayda.
  function parse() {
    var dc = document.querySelector('x-dc');
    if (!dc) return null;
    var helmet = dc.querySelector('helmet');
    if (helmet) {
      Array.prototype.slice.call(helmet.childNodes).forEach(function (n) {
        if (n.nodeType === 1) document.head.appendChild(n);
      });
    }
    var imports = Array.prototype.slice.call(dc.querySelectorAll('x-import')).map(function (el) {
      var props = {};
      Array.prototype.slice.call(el.attributes).forEach(function (a) {
        if (['component-from-global-scope', 'component', 'from', 'style', 'hint-size'].indexOf(a.name) >= 0) return;
        props[camelProp(a.name)] = a.value;
      });
      return {
        name: el.getAttribute('component-from-global-scope') || el.getAttribute('component') || '',
        from: (el.getAttribute('from') || '').split(/\s+/).filter(Boolean),
        style: el.getAttribute('style'),
        props: props,
      };
    });
    var dataProps = {};
    var sc = document.querySelector('script[data-dc-script]');
    if (sc) {
      try {
        var obj = JSON.parse(sc.getAttribute('data-props') || '{}') || {};
        Object.keys(obj).forEach(function (k) { if (k.charAt(0) !== '$') dataProps[k] = obj[k]; });
      } catch (e) { console.warn('[dc-runtime] data-props ayrıştırılamadı', e); }
    }
    var root = document.createElement('div');
    root.id = 'dc-root';
    dc.replaceWith(root);
    return { root: root, imports: imports, dataProps: dataProps };
  }

  var modules = [];   // { url, mod, globals, error }
  function runModule(url, src) {
    var isJsx = /\.(jsx|tsx)(\?|#|$)/i.test(url);
    var code = isJsx ? window.Babel.transform(src, { filename: url, presets: ['react', 'typescript'] }).code : src;
    var module = { exports: {} };
    var before = new Set(Object.keys(window));
    /* eslint-disable-next-line no-new-func */
    new Function('React', 'module', 'exports', 'require', code)(window.React, module, module.exports, function () { return {}; });
    var globals = {};
    Object.keys(window).forEach(function (k) { if (!before.has(k) && typeof window[k] === 'function') globals[k] = window[k]; });
    return { url: url, mod: module.exports, globals: globals };
  }

  async function loadModules(urls) {
    var needBabel = urls.some(function (u) { return /\.(jsx|tsx)(\?|#|$)/i.test(u); });
    if (needBabel && !window.Babel) await loadScript(BABEL_URL);
    for (var i = 0; i < urls.length; i++) {
      var url = urls[i];
      console.info('[dc-runtime] x-import: loading', url);
      try {
        var res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var entry = runModule(url, await res.text());
        modules.push(entry);
        console.info('[dc-runtime] x-import: loaded', url);
      } catch (e) {
        modules.push({ url: url, mod: {}, globals: {}, error: String(e && e.message || e) });
        console.error('[dc-runtime] x-import: FAILED to load', url, e);
      }
    }
  }

  function resolve(name) {
    for (var i = modules.length - 1; i >= 0; i--) {
      var m = modules[i];
      if (m.mod && typeof m.mod[name] === 'function') return m.mod[name];
      if (m.globals && typeof m.globals[name] === 'function') return m.globals[name];
    }
    if (typeof window[name] === 'function') return window[name];
    for (var j = modules.length - 1; j >= 0; j--) if (modules[j].mod && typeof modules[j].mod.default === 'function') return modules[j].mod.default;
    return null;
  }

  var overrides = {};
  var rerender = null;
  var rootName = '';
  window.__dcRootName = function () { return rootName; };
  window.__dcSetProps = function (name, props) {
    if (name && name !== rootName) return;
    overrides = Object.assign({}, overrides, props || {});
    if (rerender) rerender();
  };

  async function boot() {
    var parsed = parse();
    if (!parsed) return;
    rootName = (parsed.imports[0] && parsed.imports[0].name) || '';
    if (!window.React) await loadScript(REACT_URL);
    if (!window.ReactDOM) await loadScript(REACT_DOM_URL);
    var urls = [];
    parsed.imports.forEach(function (x) { x.from.forEach(function (u) { if (urls.indexOf(u) < 0) urls.push(u); }); });
    await loadModules(urls);
    var h = window.React.createElement;
    function Root() {
      return h('div', { className: 'sc-host' }, parsed.imports.map(function (x, i) {
        var C = resolve(x.name);
        if (!C) {
          console.error('[dc-runtime] x-import: no component named', JSON.stringify(x.name));
          return h('div', { key: i, className: 'sc-placeholder', style: { position: 'absolute', inset: 0 } }, 'x-import: ' + x.name + ' bulunamadı');
        }
        var hostStyle = x.style != null ? cssToObj(x.style) : null;
        var props = Object.assign({}, parsed.dataProps, x.props, overrides);
        var el = h(C, props);
        return x.style != null
          ? h('div', { key: i, className: 'sc-host-x', style: Object.keys(hostStyle).length ? hostStyle : { display: 'contents' } }, el)
          : h(window.React.Fragment, { key: i }, el);
      }));
    }
    var root = window.ReactDOM.createRoot(parsed.root);
    rerender = function () {
      try { root.render(h(Root)); } catch (e) { console.error('[dc-runtime] render error', e); }
    };
    rerender();
  }

  window.__dcBoot = boot;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { boot(); });
  else boot();
})();
