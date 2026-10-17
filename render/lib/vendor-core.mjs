// lib/vendor-core.mjs — ağa bir kez çıkılır, sonra render tamamen yerel çalışır (`motion-render vendor`, `motion-render init`).
//  1. motion-runtime.js'in unpkg'den çektiği React 18.3.1 / ReactDOM 18.3.1 / Babel standalone 7.29.0 UMD'leri aynı sürüm ve SRI (sha384)
//     denetimiyle vendor/<paket@sürüm>/… altına (yol unpkg ile aynı; render unpkg isteklerini buraya yönlendirir).
//  2. Google Fonts: world.json `fonts` (ve/veya --families) aileleri woff2 olarak fonts/gf/ altına (bütün alt kümeler; unicode-range korunur),
//     fonts/local.css + fonts/gf/map.json (Google yolu → yerel dosya; render bunu okur) + fonts/LICENSES.md (aile başına lisans + kaynak + metin).
//  3. math: Noto Sans Math alt kümesi (Google Fonts text= alt kümelemesi; iki yüz, ayrık unicode-range). 4. gsap: sayfalardaki jsdelivr adresleri.
//  5. ttf: ffmpeg drawtext etiketleri için bir monospace ailenin TTF'i.
// Önbellek: MOTION_CACHE ‖ %LOCALAPPDATA%/motion-harness/cache ‖ ~/.cache/motion-harness — aynı adres yeniden inmez (SRI yine denetlenir);
// ağ yoksa Google Fonts CSS'i önbellekten okunur.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

export const UA_WOFF2 = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36';
export const SCRIPTS = [
  { url: 'https://unpkg.com/react@18.3.1/umd/react.production.min.js', sri: 'sha384-DGyLxAyjq0f9SPpVevD6IgztCFlnMF6oW/XQGmfe+IsZ8TqEiDrcHkMLKI6fiB/Z' },
  { url: 'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js', sri: 'sha384-gTGxhz21lVGYNMcdJOyq01Edg0jhn/c22nsx0kyqP0TxaV5WVdsSH1fSDUf5YJj1' },
  { url: 'https://unpkg.com/@babel/standalone@7.29.0/babel.min.js', sri: 'sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y' },
];
export const CACHE = process.env.MOTION_CACHE || (process.platform === 'win32' && process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'motion-harness', 'cache') : path.join(os.homedir(), '.cache', 'motion-harness'));
const ck = (url, ua) => path.join(CACHE, crypto.createHash('sha256').update(url + '\n' + (ua || '')).digest('hex').slice(0, 32));

// İndir (önbellekli). fresh: önce ağ (CSS gibi değişebilen), ağ yoksa önbellek.
export async function get(url, headers = {}, { fresh = false } = {}) {
  const f = ck(url, headers['User-Agent']);
  if (!fresh && fs.existsSync(f)) return fs.readFileSync(f);
  try {
    const r = await fetch(url, { headers, redirect: 'follow' });
    if (!r.ok) throw new Error(url + ' → HTTP ' + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    fs.mkdirSync(CACHE, { recursive: true }); fs.writeFileSync(f + '.part', buf); fs.renameSync(f + '.part', f);
    return buf;
  } catch (e) {
    if (fs.existsSync(f)) { console.log('! ağ yok (' + e.message.slice(0, 80) + ') → önbellek: ' + url.slice(0, 90)); return fs.readFileSync(f); }
    throw e;
  }
}
const write = async (f, buf) => { await fsp.mkdir(path.dirname(f), { recursive: true }); await fsp.writeFile(f + '.part', buf); await fsp.rename(f + '.part', f); };
const rel = (root, f) => path.relative(root, f).split(path.sep).join('/');

export async function vendorScripts(root) {
  const rt = path.join(root, 'motion-runtime.js');
  if (fs.existsSync(rt)) { const src = fs.readFileSync(rt, 'utf8'); for (const u of src.match(/https:\/\/unpkg\.com\/[^'" ]+/g) || []) if (!SCRIPTS.some((s) => s.url === u)) console.log('! motion-runtime.js bilinmeyen unpkg adresi (SRI tablosunda yok): ' + u); }
  for (const { url, sri } of SCRIPTS) {
    const buf = await get(url);
    const got = 'sha384-' + crypto.createHash('sha384').update(buf).digest('base64');
    if (got !== sri) { try { fs.rmSync(ck(url)); } catch { /* yut */ } throw new Error('SRI uyuşmadı: ' + url + '\n  beklenen ' + sri + '\n  gelen    ' + got); }
    const out = path.join(root, 'vendor', new URL(url).pathname);
    await write(out, buf);
    console.log('vendor ✓', rel(root, out), (buf.length / 1024).toFixed(0) + ' KB', 'SRI ok');
  }
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
// Aile listesi: [{family, weights?, italic?}] → Google Fonts css2 adresi (tek ağırlık/ağırlıksız → yalnız aile adı, kaynakla aynı)
export function cssUrl(fams) {
  return 'https://fonts.googleapis.com/css2?' + fams.map((f) => {
    const n = 'family=' + f.family.trim().replace(/ /g, '+'), w = [...new Set((f.weights || []).map(Number))].sort((a, b) => a - b);
    if (f.italic) return n + ':ital,wght@' + [...w.map((x) => '0,' + x), ...w.map((x) => '1,' + x)].join(';');
    return w.length && !(w.length === 1 && w[0] === 400) ? n + ':wght@' + w.join(';') : n;
  }).join('&') + '&display=swap';
}
// world.json fonts → [{family, weights}] (source google ya da belirtilmemiş)
export function familiesFromWorld(root, worldFile) {
  const f = worldFile ? path.resolve(root, worldFile) : (() => { try { const m = JSON.parse(fs.readFileSync(path.join(root, 'scenes.json'), 'utf8')); return path.join(root, typeof m.world === 'string' && m.world.endsWith('.json') ? m.world : 'world/world.json'); } catch { return path.join(root, 'world/world.json'); } })();
  if (!fs.existsSync(f)) return [];
  const w = JSON.parse(fs.readFileSync(f, 'utf8'));
  return (Array.isArray(w.fonts) ? w.fonts : []).filter((x) => x && x.family && (!x.source || x.source === 'google')).map((x) => ({ family: x.family, weights: x.weights || [], italic: !!x.italic }));
}
export const parseFamilies = (s) => String(s || '').split(';').map((x) => x.trim()).filter(Boolean).map((x) => { const [fam, w] = x.split(':'); return { family: fam.trim(), weights: w ? w.split(',').map(Number).filter(Boolean) : [] }; });

export async function vendorFonts(root, fams) {
  if (!fams.length) { console.log('font · aile yok (world.json fonts ya da --families) — atlandı'); return null; }
  const GF_CSS = cssUrl(fams);
  const css = (await get(GF_CSS, { 'User-Agent': UA_WOFF2 }, { fresh: true })).toString('utf8');
  const re = /(?:\/\*\s*([\w-]+)\s*\*\/\s*)?@font-face\s*{([^}]*)}/g;   // alt küme yorumu olmayan blok da alınır
  const byUrl = new Map(), blocks = [];
  let m;
  while ((m = re.exec(css))) {
    const subset = m[1] || 'all', body = m[2];
    const family = /font-family:\s*'([^']+)'/.exec(body)[1], weight = +/font-weight:\s*(\d+)/.exec(body)[1], url = /url\(([^)]+)\)/.exec(body)[1];
    if (!byUrl.has(url)) byUrl.set(url, { family, subset, weights: [] });
    byUrl.get(url).weights.push(weight);
    blocks.push({ subset, body, url });
  }
  if (!blocks.length) throw new Error('Google Fonts CSS boş: ' + GF_CSS);
  const dir = path.join(root, 'fonts', 'gf'), lp = path.join(root, 'fonts', 'local.css');
  const hadMath = fs.existsSync(lp) && /math-sub /.test(fs.readFileSync(lp, 'utf8'));
  await fsp.mkdir(dir, { recursive: true });
  const map = {}; let bytes = 0;
  for (const [url, info] of byUrl) {
    const w = info.weights.length > 1 ? Math.min(...info.weights) + '-' + Math.max(...info.weights) : info.weights[0];
    const file = slug(info.family) + '-' + w + '-' + info.subset + '.woff2';
    const buf = await get(url, { 'User-Agent': UA_WOFF2 });
    await write(path.join(dir, file), buf);
    map[new URL(url).pathname] = file; info.file = file; bytes += buf.length;
  }
  let local = '/* fonts/local.css — motion-render vendor tarafından üretildi.\n   Kaynak: ' + GF_CSS + '\n   unicode-range korunmuştur; dosyalar fonts/gf/ altında. Lisanslar: fonts/LICENSES.md */\n';
  for (const b of blocks) local += '/* ' + b.subset + ' */\n@font-face {' + b.body.replace(b.url, 'gf/' + byUrl.get(b.url).file) + '}\n';
  await write(lp, local);
  await write(path.join(dir, 'map.json'), JSON.stringify(map, null, 1));
  const famFiles = {};
  for (const i of byUrl.values()) (famFiles[i.family] = famFiles[i.family] || { subsets: new Set(), files: [] }).subsets.add(i.subset), famFiles[i.family].files.push(i.file);
  for (const f in famFiles) console.log('font ✓', f.padEnd(16), [...famFiles[f].subsets].join(', '));
  console.log('font ✓', byUrl.size, 'woff2 dosyası,', (bytes / 1024).toFixed(0), 'KB → fonts/gf/, fonts/local.css, fonts/gf/map.json');
  await writeLicenses(root, Object.entries(famFiles).map(([family, v]) => ({ family, files: v.files, css: GF_CSS })));
  if (hadMath) await vendorMath(root);   // local.css yeniden yazıldı → önceki matematik alt kümesi yeniden eklenir
  return { css: GF_CSS, files: byUrl.size, bytes };
}

// Lisans: google/fonts deposundan (ofl → OFL.txt, apache → LICENSE.txt, ufl → UFL.txt). Önceki LICENSES.md girdileri korunur (aile bazında birleşir).
const LIC = [['ofl', 'OFL.txt', 'SIL Open Font License 1.1'], ['apache', 'LICENSE.txt', 'Apache License 2.0'], ['ufl', 'UFL.txt', 'Ubuntu Font Licence 1.0']];
export async function licenseOf(family) {
  const s = family.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [dir, file, name] of LIC) {
    const url = 'https://raw.githubusercontent.com/google/fonts/main/' + dir + '/' + s + '/' + file;
    try { const t = (await get(url)).toString('utf8'); return { name, url: 'https://github.com/google/fonts/blob/main/' + dir + '/' + s + '/' + file, text: t }; } catch { /* sonraki */ }
  }
  return { name: 'bilinmiyor (google/fonts deposunda bulunamadı)', url: 'https://fonts.google.com/specimen/' + family.replace(/ /g, '+') + '/license', text: null };
}
export async function writeLicenses(root, entries) {
  const f = path.join(root, 'fonts', 'LICENSES.md'), old = new Map();
  if (fs.existsSync(f)) for (const sec of fs.readFileSync(f, 'utf8').split(/\n(?=## )/).slice(1)) { const fam = /^## (.+?) — /.exec(sec); if (fam) old.set(fam[1], '\n' + sec.replace(/\s+$/, '') + '\n'); }
  for (const e of entries) {
    const L = await licenseOf(e.family), cr = L.text ? L.text.split('\n').filter((l) => /^\s*Copyright\s+(\(c\)\s*|©\s*)?\d{4}/i.test(l)).slice(0, 4) : [];
    old.set(e.family, '\n## ' + e.family + ' — ' + L.name + '\n\n- Kaynak (CSS): ' + e.css + '\n- Lisans: ' + L.url + '\n- Dosyalar: ' + [...new Set(e.files)].join(', ') + '\n' + (cr.length ? cr.map((c) => '- ' + c.trim()).join('\n') + '\n' : '') +
      (L.text ? '\n<details><summary>Lisans metni</summary>\n\n```text\n' + L.text.replace(/\r\n/g, '\n').replace(/```/g, "'''").trim() + '\n```\n\n</details>\n' : '\n> Lisans metni alınamadı; dağıtımdan önce yukarıdaki adresten ekleyin.\n'));
  }
  const head = '# Font lisansları\n\n`motion-render vendor` üretir (yerel kopya; render ağsız çalışır). Fontlar pakete girmez; proje dosyaları dağıtılırken bu dosya fontlarla birlikte gider.\n' +
    'OFL fontlar tek başına satılamaz; Ayrılmış Font Adı (RFN) varsa değiştirilmiş sürüm aynı adla dağıtılamaz.\n';
  await write(f, head + [...old.keys()].sort().map((k) => old.get(k)).join(''));
  console.log('font ✓ fonts/LICENSES.md (' + old.size + ' aile)');
}

// Noto Sans Math alt kümesi: (1) Noto Sans Math — ≥ ≤ ≠ ≈, σ Σ ∑ ∂ ∫ √ ∞, Yunan, 𝔼 ℙ ℝ, ASCII, matematik italik; (2) Noto Sans — alt/üst simgeler
// (matematik fontu alt/üst simgeyi MATH tablosuyla kurar, Unicode alt simge glifi taşımaz). unicode-range'ler ayrık.
const MATH_FACES = [
  ['Noto+Sans+Math', 'noto-sans-math-400-sub.woff2', 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-=()[]{}|/<>.,:;^_\'*!' +
    '≥≤≠≈≡∼∝±×÷·⋅∘−∑∏∫∬∮∂∇√∞∈∉∀∃∧∨⊂⊆∪∩→⇒↦⟨⟩‖′″' + 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρσςτυφχψωϵϑϕ' + '𝔼ℙℝℕℤ𝟙ℓ' + '̄' + Array.from({ length: 52 }, (_, i) => 0x1D434 + i).filter((c) => c !== 0x1D455).map((c) => String.fromCodePoint(c)).join('') + 'ℎ'],
  ['Noto+Sans', 'noto-sans-400-subsup.woff2', '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓₕₖₗₘₙₚₛₜᵢⱼ']];
export async function vendorMath(root) {
  const hex = (n) => n.toString(16).toUpperCase().padStart(4, '0'), lp = path.join(root, 'fonts', 'local.css');
  let local = fs.existsSync(lp) ? fs.readFileSync(lp, 'utf8') : '/* fonts/local.css — motion-render vendor tarafından üretildi. */\n';
  local = local.replace(/\/\*[^*]*\*\/\s*@font-face\s*{[^}]*font-family:\s*'Noto Sans Math'[^}]*}\s*/g, '').replace(/\s*$/, '\n');   // eski tam dosya / önceki alt küme blokları
  const lic = [];
  for (const [fam, file, text] of MATH_FACES) {
    const cps = [...new Set([...text].map((c) => c.codePointAt(0)))].sort((a, b) => a - b);
    const cssU = 'https://fonts.googleapis.com/css2?family=' + fam + '&text=' + encodeURIComponent(text);
    const css = (await get(cssU, { 'User-Agent': UA_WOFF2 }, { fresh: true })).toString('utf8');
    const buf = await get(/url\(([^)]+)\)/.exec(css)[1], { 'User-Agent': UA_WOFF2 }), fp = path.join(root, 'fonts', 'gf', file);
    await write(fp, buf);
    const ranges = []; for (const c of cps) { const r = ranges[ranges.length - 1]; if (r && c === r[1] + 1) r[1] = c; else ranges.push([c, c]); }
    const ur = ranges.map((r) => 'U+' + hex(r[0]) + (r[1] > r[0] ? '-' + hex(r[1]) : '')).join(', ');
    local += "/* math-sub " + fam.replace(/\+/g, ' ') + " (motion-render vendor math; Google Fonts text= alt kümesi) */\n@font-face {\n  font-family: 'Noto Sans Math';\n  font-style: normal;\n  font-weight: 400;\n  font-display: block;\n  src: url(gf/" + file + ") format('woff2');\n  unicode-range: " + ur + ";\n}\n";
    lic.push({ family: fam.replace(/\+/g, ' '), files: [file], css: 'https://fonts.googleapis.com/css2?family=' + fam + '&text=…' });
    console.log('font ✓ Noto Sans Math yüzü ←', fam.replace(/\+/g, ' '), cps.length, 'kod noktası,', (buf.length / 1024).toFixed(1), 'KB → fonts/gf/' + file);
  }
  await write(lp, local);
  await writeLicenses(root, lic);
  console.log('font ✓ fonts/local.css (Noto Sans Math: ' + MATH_FACES.length + ' yüz, ayrık unicode-range)');
}

// Hyperframes kompozisyonlarının jsdelivr'den çektiği betikler (GSAP vb.; sürüm sayfadaki URL'den). Render cdn.jsdelivr.net/npm/<yol> → vendor/<yol>.
export async function vendorGsap(root) {
  const urls = new Set();
  for (const f of fs.readdirSync(root).filter((x) => x.endsWith('.html'))) for (const m of fs.readFileSync(path.join(root, f), 'utf8').matchAll(/https:\/\/cdn\.jsdelivr\.net\/npm\/[^"' ]+/g)) urls.add(m[0]);
  for (const url of urls) {
    const buf = await get(url), out = path.join(root, 'vendor', new URL(url).pathname.replace(/^\/npm\//, ''));
    await write(out, buf); console.log('vendor ✓', rel(root, out), (buf.length / 1024).toFixed(0) + ' KB');
  }
  if (!urls.size) console.log('vendor · jsdelivr referansı bulunamadı');
  return urls.size;
}

// drawtext için TTF (UA'sız istekte Google truetype döndürür): fonts/gf/<AileBitişik>-<ağırlık>.ttf
export async function vendorTtf(root, family, weight = 500) {
  const ttfCss = (await get('https://fonts.googleapis.com/css2?family=' + family.replace(/ /g, '+') + ':wght@' + weight, {}, { fresh: true })).toString('utf8');
  const u = /url\(([^)]+\.ttf)\)/.exec(ttfCss); if (!u) throw new Error('TTF adresi yok: ' + family + ' ' + weight);
  const f = path.join(root, 'fonts', 'gf', family.replace(/\s+/g, '') + '-' + weight + '.ttf');
  await write(f, await get(u[1]));
  console.log('font ✓ ' + rel(root, f) + ' (ffmpeg drawtext etiketi)');
  return f;
}
