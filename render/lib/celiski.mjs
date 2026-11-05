// lib/celiski.mjs — çelişki taraması çekirdeği (motion-render celiski-tara): bağlayıcı belge kümesinde beş denetim.
// Ölçüt koymaz, kural değiştirmez; yalnız belgeleri karşılaştırır. Bütün listeler yapılandırmadan (docs/celiski.json; yoksa DEFAULTS).
//   (a) arşivlenen terim etkin kural gibi geçiyor (arsivTerim)
//   (b) spec'te üstü çizili metin (~~…~~) ya da KALDIRILDI / GEÇERSİZ / iptal notu (her satır)
//   (c) aynı kural anahtarı dosyalar arasında farklı değerle (anahtar: metin desenleri · jsonAnahtar: .json satır deseni ya da alan yolu)
//   (d) var olmayan göreli yola başvuru (ilk bileşeni proje kökünde bir dizin olan yol; yer tutuculu yol < > * { } … – $ atlanır; yolHaric önekleri atlanır)
//   (e) brief toplamı > briefTavan (token ≈ ceil(Unicode kod noktası / 3); briefSet {dosya, tavan} isteğe bağlı ayrı tavan)
// Etkin olmayan satır (a, c): alıntı bloğu ('>' ile başlar) ve açıkça "arşiv" diyen satır. (b) her satıra; (d) alıntı bloğunu atlar, arşiv satırını atlamaz.
// Token tahmini: ayrıcalıklı tokenizer yok → ceil(kod noktası / 3); Türkçe metinde muhafazakâr (gerçek sayıyı çoğunlukla aşar).
import fs from 'node:fs';
import path from 'node:path';

export const SAYI = '(\\d+(?:[.,]\\d+)?)';
// Genel varsayılan küme (proje dosya adları yok). '?' sonekli dosya isteğe bağlıdır; yapılandırma yoksa bütün dosyalar isteğe bağlıdır (olmayan atlanır).
// templates/celiski.json bu nesnenin aynısıdır (+ '_' önekli açıklama alanları); test eşliği denetler.
export const DEFAULTS = {
  baglayici: ['CLAUDE.md', 'project.md', 'scenes.json?', 'world/world.json', 'docs/SOZLUK.md', 'docs/CRAFT-REF.md'],
  brief: ['CLAUDE.md', 'project.md', 'world/world.json', 'docs/SOZLUK.md', 'docs/CRAFT-REF.md'],
  briefTavan: 60000,
  briefSet: { dosya: 'docs/BRIEF-DIRECTOR.md', tavan: 30000 },   // sanat yönetmeni brief'i (yoksa atlanır)
  arsivTerim: [],
  anahtar: [
    { ad: 'kamera tepe px/kare', desen: ['tepe\\s*(?:≤|<=)\\s*{SAYI}\\s*px\\s*/\\s*kare'] },
    { ad: 'giriş/çıkış s', desen: ['giriş\\s*/\\s*çıkış\\s*(?:≥|>=)\\s*{SAYI}\\s*s(?![a-zçğıöşü])'] },
  ],
  jsonAnahtar: [{ ad: 'kamera tepe px/kare', yol: 'camera.maxPxPerFrame' }],
  disAlinti: {},
  yolHaric: ['out/', 'world/DECISIONS.md', 'script/BEATS.md', 'assets/gen/policy.json'],   // üretilen çıktı + init şablonlarının ileride oluşan dosyaları
};
const SILINTI = [
  ['üstü çizili', /~~[^~]+~~/, false],
  ['KALDIRILDI', /kaldırıldı/, true],
  ['GEÇERSİZ', /geçersiz/, true],
  ['iptal', /(^|[^a-zçğıöşü])iptal/, true],
];
export const ADLAR = { a: 'arşiv terimi etkin', b: 'spec silinti izi', c: 'kural anahtarı farklı değer', d: 'göreli yol yok', e: 'brief token tavanı' };

const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sayi = (s) => Number(String(s).replace(',', '.'));
const normal = (v) => String(+Number(v).toFixed(4));
const lower = (s) => s.toLocaleLowerCase('tr');
export const etkinDegil = (sat) => sat.trimStart().startsWith('>') || /arşiv|arsiv/.test(lower(sat));
export const tokens = (s) => Math.ceil([...s].length / 3);

// yapılandırma → derlenmiş biçim (hata → throw; çağıran çıkış 2 verir)
export function compileConfig(raw) {
  const c = Object.assign({}, DEFAULTS);
  for (const [k, v] of Object.entries(raw || {})) if (!k.startsWith('_')) c[k] = v;
  const bad = (m) => { throw new Error('celiski.json: ' + m); };
  const strList = (k) => { if (!Array.isArray(c[k]) || c[k].some((x) => typeof x !== 'string')) bad(k + ' dizgi dizisi olmalı'); };
  strList('baglayici'); strList('brief'); strList('yolHaric');
  if (!(+c.briefTavan > 0)) bad('briefTavan pozitif sayı olmalı');
  if (c.briefSet != null && (typeof c.briefSet !== 'object' || typeof c.briefSet.dosya !== 'string' || !(+c.briefSet.tavan > 0))) bad('briefSet {dosya, tavan} ya da null olmalı');
  if (typeof c.disAlinti !== 'object' || Array.isArray(c.disAlinti)) bad('disAlinti {dosya: önek} nesnesi olmalı');
  const rx = (src, flags, where) => { try { return new RegExp(String(src).replace(/\{SAYI\}/g, SAYI), flags); } catch (e) { return bad(where + ': ' + e.message); } };
  const arsiv = (c.arsivTerim || []).map((t, i) => {
    if (typeof t === 'string') return { ad: t, re: new RegExp(reEsc(lower(t)), 'i') };
    const ad = Array.isArray(t) ? t[0] : t && t.ad, d = Array.isArray(t) ? t[1] : t && t.desen;
    if (!ad || !d) bad('arsivTerim[' + i + '] {ad, desen} olmalı');
    return { ad, re: rx(d, 'i', 'arsivTerim ' + ad) };
  });
  const TUR = ['sayi', 'sure', 'aralik', 'hex', 'metin'];
  const anahtar = (c.anahtar || []).map((a, i) => {
    if (!a || !a.ad || !a.desen) bad('anahtar[' + i + '] {ad, desen} olmalı');
    const tur = a.tur || 'sayi'; if (!TUR.includes(tur)) bad('anahtar ' + a.ad + ': tur ' + TUR.join(' | '));
    return { ad: a.ad, tur, re: [].concat(a.desen).map((d) => rx(d, a.bayrak != null ? a.bayrak : 'i', 'anahtar ' + a.ad)) };
  });
  const jsonAnahtar = (c.jsonAnahtar || []).map((a, i) => {
    if (!a || !a.ad || (!a.desen && !a.yol)) bad('jsonAnahtar[' + i + '] {ad, desen | yol} olmalı');
    const tur = a.tur || 'sayi'; if (!TUR.includes(tur)) bad('jsonAnahtar ' + a.ad + ': tur ' + TUR.join(' | '));
    return { ad: a.ad, tur, yuzde: !!a.yuzde, dosya: a.dosya || null, yol: a.yol || null, re: a.desen ? rx(a.desen, a.bayrak != null ? a.bayrak : '', 'jsonAnahtar ' + a.ad) : null };
  });
  return Object.assign(c, { arsiv, anahtarRe: anahtar, jsonRe: jsonAnahtar });
}

// eşleşme → normalleştirilmiş değer
function value(tur, m, yuzde) {
  if (tur === 'hex') return String(m[1]).toUpperCase();
  if (tur === 'metin') return String(m[1]);
  if (tur === 'sure') return normal(sayi(m[1]) / (String(m[2] || 's').toLowerCase() === 'ms' ? 1000 : 1));
  if (tur === 'aralik') return normal(sayi(m[1])) + '–' + normal(sayi(m[2]));
  const v = sayi(m[1]); return normal(yuzde && v <= 1 ? v * 100 : v);
}
function jsonValue(tur, v, yuzde) {
  if (Array.isArray(v)) return v.length === 2 && v.every((x) => typeof x === 'number') ? normal(v[0]) + '–' + normal(v[1]) : null;   // [a, b] → aralık
  if (typeof v === 'number') return normal(yuzde && v <= 1 ? v * 100 : v);
  if (typeof v === 'string') return tur === 'hex' ? v.toUpperCase() : tur === 'sayi' && v.trim() !== '' && Number.isFinite(sayi(v)) ? normal(sayi(v)) : v;
  return null;
}
const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);

// root: proje kökü · cfg: compileConfig çıktısı · zorunlu: yapılandırma dosyası varsa '?'siz dosya zorunludur · ek: [yol] (yalnız c)
export function scan(root, cfg, { zorunlu = true, ek = [] } = {}) {
  const bulgu = [], ekle = (d, dosya, satir, not) => bulgu.push({ d, dosya, satir, not });
  const oku = (f) => { const p = path.resolve(root, f); try { return fs.statSync(p).isFile() ? fs.readFileSync(p, 'utf8') : null; } catch { return null; } };
  const metin = {}, kume = [], atlanan = [];
  for (const e of cfg.baglayici) {
    const opt = e.endsWith('?'), f = opt ? e.slice(0, -1) : e, s = oku(f);
    if (s == null) { if (zorunlu && !opt) ekle('d', f, 0, 'bağlayıcı dosya yok'); else atlanan.push(f); continue; }
    metin[f] = s.split(/\r?\n/); kume.push(f);
  }
  // --ek: proje dışı metin (paket kuralları) yalnız (c)'ye girer. Ad göreli yazılır (gizlilik: kullanıcı dizini görünmez).
  const ekMetin = {};
  for (const p of ek) {
    const abs = path.resolve(p), r = path.relative(root, abs).split(path.sep).join('/'), n = abs.split(path.sep).join('/');
    const m = /(?:^|\/)((?:skills|render|templates|commands|agents)\/.*)$/.exec(n);
    const ad = 'ek:' + (!r.startsWith('..') && !path.isAbsolute(r) ? r : m ? m[1] : path.basename(abs));
    const s = fs.existsSync(abs) && fs.statSync(abs).isFile() ? fs.readFileSync(abs, 'utf8') : null;
    if (s == null) { ekle('d', ad, 0, 'ek dosya yok'); continue; }
    ekMetin[ad] = s.split(/\r?\n/);
  }
  const tum = Object.assign({}, metin, ekMetin);

  // (a) + (b)
  for (const [f, satirlar] of Object.entries(metin)) satirlar.forEach((sat, i) => {
    const k = lower(sat);
    if (!etkinDegil(sat)) for (const t of cfg.arsiv) if (t.re.test(k)) ekle('a', f, i + 1, 'arşiv terimi "' + t.ad + '" etkin satırda');
    for (const [ad, re, low] of SILINTI) if (re.test(low ? k : sat)) ekle('b', f, i + 1, "spec'te " + ad + ' izi');
  });

  // (c)
  const deger = {}, kaydet = (a, v, f, satir) => { if (v != null) (deger[a] ||= []).push({ v, f, satir }); };
  for (const [f, satirlar] of Object.entries(tum)) {
    const json = f.endsWith('.json');
    satirlar.forEach((sat, i) => {
      if (etkinDegil(sat)) return;
      for (const a of cfg.anahtarRe) for (const re of a.re) { const m = sat.match(re); if (m) { kaydet(a.ad, value(a.tur, m), f, i + 1); break; } }
      if (json) for (const a of cfg.jsonRe) if (a.re && (!a.dosya || a.dosya === f)) { const m = sat.match(a.re); if (m) kaydet(a.ad, value(a.tur, m, a.yuzde), f, i + 1); }
    });
    if (json && cfg.jsonRe.some((a) => a.yol && (!a.dosya || a.dosya === f))) {
      let j = null;
      try { j = JSON.parse(satirlar.join('\n')); } catch (e) { ekle('c', f, 0, 'JSON okunamadı: ' + e.message); }
      if (j) for (const a of cfg.jsonRe) if (a.yol && (!a.dosya || a.dosya === f)) {
        const v = jsonValue(a.tur, getPath(j, a.yol), a.yuzde), son = a.yol.split('.').pop();
        if (v != null) kaydet(a.ad, v, f, satirlar.findIndex((s) => s.includes('"' + son + '"')) + 1);
      }
    }
  }
  for (const [a, liste] of Object.entries(deger)) {
    const farkli = [...new Set(liste.map((o) => o.v))];
    if (farkli.length < 2) continue;
    const ozet = farkli.map((v) => v + ' (' + liste.filter((o) => o.v === v).map((o) => o.f + ':' + o.satir).join(', ') + ')').join(' ↔ ');
    for (const o of liste) ekle('c', o.f, o.satir, '"' + a + '" = ' + o.v + '; dosyalar arası farklı: ' + ozet);
  }

  // (d)
  let ustler = [];
  try { ustler = fs.readdirSync(root).filter((ad) => !ad.startsWith('.git') && fs.statSync(path.join(root, ad)).isDirectory()); } catch { /* kök okunamadı */ }
  if (ustler.length) {
    const ustRe = new RegExp('(?<![\\w./\\-])(?:' + ustler.map(reEsc).join('|') + ')/[^\\s`\'"()\\[\\],;|]*', 'g');
    const yerTutucu = /[<>*{}…–$]|\.\.\./;
    const temiz = (p) => p.replace(/:[\d–\-, ]+$/, '').replace(/[.:]+$/, '').replace(/\*+$/, '');
    const haric = (p) => cfg.yolHaric.some((h) => p === h.replace(/\/$/, '') || p.startsWith(h.endsWith('/') ? h : h + '/'));
    for (const [f, satirlar] of Object.entries(metin)) {
      const dis = cfg.disAlinti[f];
      satirlar.forEach((sat, i) => {
        if (sat.trimStart().startsWith('>')) return;   // alıntı bloğu: aynen aktarılan metin, belgenin kendi başvurusu değil
        const adaylar = [];
        const kalan = sat.replace(/`([^`]+)`/g, (_, span) => {
          const s = span.trim();
          if (ustler.some((u) => s.startsWith(u + '/'))) adaylar.push([s, s.split(/\s+/)[0]]);
          else for (const m of s.matchAll(ustRe)) adaylar.push([m[0]]);
          return ' ';
        });
        for (const m of kalan.matchAll(ustRe)) adaylar.push([m[0]]);
        for (const sec of adaylar) {
          const ham = sec[sec.length - 1];
          if (yerTutucu.test(sec[0]) || yerTutucu.test(ham)) continue;
          if (dis && /:\d/.test(ham)) continue;   // dış depo alıntısı (`yol:satır`, disAlinti)
          if (sec.some((p) => haric(temiz(p)) || fs.existsSync(path.join(root, temiz(p))))) continue;
          ekle('d', f, i + 1, 'yol yok: ' + temiz(ham) + (dis ? ' (' + dis + ' yolu ise "' + dis + '/" önekiyle yazılır)' : ''));
        }
      });
    }
  }

  // (e)
  const tok = (f) => (metin[f] ? tokens(metin[f].join('\n')) : ((s) => (s == null ? 0 : tokens(s.split(/\r?\n/).join('\n'))))(oku(f)));
  const briefTok = cfg.brief.map((f) => [f, tok(f)]), toplam = briefTok.reduce((a, [, t]) => a + t, 0);
  if (toplam > cfg.briefTavan) ekle('e', cfg.brief.join(' + '), 0, 'brief ≈ ' + toplam + ' token > ' + cfg.briefTavan);
  let setTok = null;
  if (cfg.briefSet) { const s = oku(cfg.briefSet.dosya); setTok = s == null ? null : tokens(s.split(/\r?\n/).join('\n')); if (setTok != null && setTok > cfg.briefSet.tavan) ekle('e', cfg.briefSet.dosya, 0, "set brief'i ≈ " + setTok + ' token > ' + cfg.briefSet.tavan); }

  const anahtarOzet = [...new Set(cfg.anahtarRe.map((a) => a.ad).concat(cfg.jsonRe.map((a) => a.ad)))].map((k) => [k, deger[k] || []]);
  return { bulgu, kume, atlanan, ekSay: Object.keys(ekMetin).length, briefTok, toplam, setTok, anahtarOzet };
}

export function summary(r, cfg, kaynak) {
  const L = [];
  L.push('celiski-tara · ' + kaynak + ' · bağlayıcı ' + r.kume.length + ' dosya' + (r.atlanan.length ? ' (yok, atlandı: ' + r.atlanan.join(', ') + ')' : '') +
    (r.ekSay ? ' + ek ' + r.ekSay + ' (yalnız c)' : '') + ' · bulgu ' + r.bulgu.length);
  for (const d of 'abcde') L.push('(' + d + ') ' + ADLAR[d] + ': ' + r.bulgu.filter((b) => b.d === d).length);
  L.push('brief ≈ ' + r.toplam + ' token (tavan ' + cfg.briefTavan + '; ceil(kod noktası/3)): ' + r.briefTok.map(([f, t]) => f + ' ' + t).join(' · '));
  if (r.setTok != null) L.push("set brief'i ≈ " + r.setTok + ' token (tavan ' + cfg.briefSet.tavan + '): ' + cfg.briefSet.dosya);
  L.push('(c) anahtar değerleri: ' + (r.anahtarOzet.length ? r.anahtarOzet.map(([k, l]) => k + ' ' + (l.length ? [...new Set(l.map((o) => o.v))].join(' ↔ ') + ' ×' + l.length : '—')).join(' · ') : 'tablo boş'));
  for (const b of r.bulgu) L.push('✗ (' + b.d + ') ' + b.dosya + (b.satir ? ':' + b.satir : '') + ' — ' + b.not);
  return L;
}

export function reportMd(r, cfg, kaynak) {
  return [
    '# celiski-tara raporu', '',
    '- tarih: ' + new Date().toISOString(),
    '- yapılandırma: ' + kaynak,
    '- bağlayıcı küme: ' + (r.kume.map((f) => '`' + f + '`').join(', ') || '—') + (r.atlanan.length ? ' · yok (atlandı): ' + r.atlanan.map((f) => '`' + f + '`').join(', ') : ''),
    '- bulgu: **' + r.bulgu.length + '**', '',
    '| denetim | bulgu |', '|---|---|',
    ...'abcde'.split('').map((d) => '| (' + d + ') ' + ADLAR[d] + ' | ' + r.bulgu.filter((b) => b.d === d).length + ' |'), '',
    '## Brief (ceil(kod noktası / 3))', '', '| dosya | token |', '|---|---|',
    ...r.briefTok.map(([f, t]) => '| `' + f + '` | ' + t + ' |'), '| **toplam** | **' + r.toplam + '** (tavan ' + cfg.briefTavan + ') |',
    ...(r.setTok != null ? ['| `' + cfg.briefSet.dosya + "` (set brief'i) | " + r.setTok + ' (tavan ' + cfg.briefSet.tavan + ') |'] : []), '',
    '## (c) Kural anahtarları (etkin satırlarda bulunan değerler)', '', '| anahtar | değer | yer |', '|---|---|---|',
    ...r.anahtarOzet.map(([k, l]) => '| ' + k + ' | ' + (l.length ? [...new Set(l.map((o) => o.v))].join(' ↔ ') : '—') + ' | ' + (l.map((o) => o.f + ':' + o.satir).join(', ') || '—') + ' |'), '',
    '## Bulgular', '',
    ...(r.bulgu.length ? r.bulgu.map((b) => '- (' + b.d + ') `' + b.dosya + (b.satir ? ':' + b.satir : '') + '` — ' + b.not) : ['- yok']), '',
  ].join('\n');
}
