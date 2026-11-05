// motion-render celiski-tara — bağlayıcı belge kümesinde çelişki taraması; commit kapısı (.githooks/pre-commit).
//
//   motion-render celiski-tara [--rapor] [--ek a.md,b.md] [--config docs/celiski.json]
//       bulgu 0 → çıkış 0 · bulgu var → dosya:satır listesi + çıkış 1 · kullanım / yapılandırma hatası → çıkış 2
//   --rapor   ek olarak out/probe/celiski-tara.md (.part → rename)
//   --ek      tek koşuluk ek metin (ör. paket kuralları, plugin önbelleği); yalnız (c) anahtar karşılaştırmasına girer
//   --config  yapılandırma (proje köküne göre; varsayılan docs/celiski.json). Yoksa genel varsayılan küme: CLAUDE.md, project.md,
//             scenes.json?, world/world.json, docs/SOZLUK.md, docs/CRAFT-REF.md (olmayan dosya atlanır).
// Denetimler (her bulgu çıkış 1):
//   (a) arşivlenen terim etkin kural gibi geçiyor (arsivTerim)
//   (b) spec'te üstü çizili metin (~~…~~) ya da KALDIRILDI / GEÇERSİZ / iptal notu
//   (c) aynı kural anahtarı dosyalar arasında farklı değerle (anahtar: metin desenleri; jsonAnahtar: .json satır deseni ya da alan yolu)
//   (d) var olmayan göreli yola başvuru (ilk bileşeni proje kökünde bir dizin olan yol; yer tutuculu yol atlanır; yolHaric önekleri atlanır)
//   (e) brief toplamı > briefTavan (token ≈ ceil(kod noktası / 3)); briefSet {dosya, tavan} verilirse o dosya ayrı tavanla
// Yapılandırma alanları (docs/celiski.json; '_' önekli alanlar açıklamadır): baglayici ('?' sonek = isteğe bağlı) · brief · briefTavan ·
//   briefSet · arsivTerim [{ad, desen}] · anahtar [{ad, desen: [..], tur?: sayi|sure|aralik|hex|metin, bayrak?}] (desen içinde {SAYI}) ·
//   jsonAnahtar [{ad, desen | yol, tur?, yuzde?, dosya?}] · disAlinti {dosya: önek} · yolHaric [önek]. Çekirdek: render/lib/celiski.mjs.
// Kapı: .githooks/pre-commit bu komutu koşar (etkin kılma: git config core.hooksPath .githooks); çıkış ≠ 0 → commit yok.
import fs from 'node:fs';
import path from 'node:path';
import { compileConfig, scan, summary, reportMd } from '../lib/celiski.mjs';

const argv = process.argv.slice(2), VALUED = new Set(['--ek', '--config']), BOOL = new Set(['--rapor']);
const usage = 'kullanım: motion-render celiski-tara [--rapor] [--ek a.md,b.md] [--config docs/celiski.json]';
for (let i = 0; i < argv.length; i++) {
  if (VALUED.has(argv[i])) { if (argv[i + 1] == null || argv[i + 1].startsWith('--')) { console.error(argv[i] + ' değer ister\n' + usage); process.exit(2); } i++; continue; }
  if (!BOOL.has(argv[i])) { console.error('bilinmeyen argüman: ' + argv[i] + '\n' + usage); process.exit(2); }
}
const argOf = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };

// proje kökü (lib/project.mjs ile aynı sıra; scenes.json bozuksa bile tarama koşsun diye burada): MOTION_PROJECT → cwd'den yukarı ilk scenes.json → cwd
function findRoot() {
  if (process.env.MOTION_PROJECT) return path.resolve(process.env.MOTION_PROJECT);
  for (let d = process.cwd(); ; d = path.dirname(d)) { if (fs.existsSync(path.join(d, 'scenes.json'))) return d; if (path.dirname(d) === d) return process.cwd(); }
}
const ROOT = findRoot();
const cfgRel = argOf('--config') || 'docs/celiski.json', cfgAbs = path.resolve(ROOT, cfgRel), cfgVar = fs.existsSync(cfgAbs);
if (argOf('--config') && !cfgVar) { console.error('✗ yapılandırma yok: ' + cfgRel + '\n' + usage); process.exit(2); }
let cfg;
try { cfg = compileConfig(cfgVar ? JSON.parse(fs.readFileSync(cfgAbs, 'utf8')) : null); }
catch (e) { console.error('✗ ' + (e instanceof SyntaxError ? cfgRel + ' JSON değil: ' : '') + e.message); process.exit(2); }
const cfgAd = ((r) => (r.startsWith('..') || path.isAbsolute(r) ? path.basename(cfgAbs) + ' (proje dışı)' : r))(path.relative(ROOT, cfgAbs).split(path.sep).join('/'));   // rapora mutlak yol yazılmaz
const kaynak = cfgVar ? 'yapılandırma ' + cfgAd : 'varsayılan küme (' + cfgRel + ' yok)';
const ek = (argOf('--ek') || '').split(',').map((s) => s.trim()).filter(Boolean);

const r = scan(ROOT, cfg, { zorunlu: cfgVar, ek });
console.log(summary(r, cfg, kaynak).join('\n'));
if (argv.includes('--rapor')) {
  const out = path.join(ROOT, 'out', 'probe', 'celiski-tara.md');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out + '.part', reportMd(r, cfg, kaynak)); fs.renameSync(out + '.part', out);
  console.log('rapor → out/probe/celiski-tara.md');
}
process.exit(r.bulgu.length ? 1 : 0);
