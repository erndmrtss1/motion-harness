// lib/film.mjs — film ve perdeleri manifestten (kaynak hatta gömülü film kimliği ve perde listesi yerine).
//
// Perde = manifestte `parent` alanı film kimliğine eşit, animatik olmayan (`animatic` alanı yok) sahne; sıra range[0] (yoksa tc, yoksa manifest sırası).
// Film kimliği: --film <id> → scenes.json `film` (dize ya da { id, parts: [...] }) → perdelerin tek `parent`'ı.
// Hiç `parent` yoksa film = `film` alanı ya da "film", perdeler = animatik olmayan bütün sahneler (manifest sırası).
import { MAN, SCENES } from './project.mjs';

const tcs = (tc) => { if (!tc) return 1e9; const [m, s] = String(tc).split(':'); return +m * 60 + +s; };

export function filmId(explicit) {
  if (explicit) return explicit;
  if (MAN.film) return typeof MAN.film === 'string' ? MAN.film : MAN.film.id;
  const parents = [...new Set(SCENES.filter((s) => s.parent).map((s) => s.parent))];
  if (parents.length > 1) throw new Error('manifestte birden çok film var (' + parents.join(', ') + ') — --film <id> ile seç');
  return parents[0] || 'film';
}

export function filmParts(explicit) {
  const id = filmId(explicit);
  if (MAN.film && typeof MAN.film === 'object' && Array.isArray(MAN.film.parts) && (!explicit || explicit === MAN.film.id)) return { film: id, ids: MAN.film.parts.slice() };
  const hasParent = SCENES.some((s) => s.parent);
  const L = SCENES.map((s, i) => ({ s, i })).filter(({ s }) => !s.animatic && (hasParent ? s.parent === id : true));
  const key = L.every(({ s }) => Array.isArray(s.range)) ? ({ s }) => s.range[0] : L.every(({ s }) => s.tc) ? ({ s }) => tcs(s.tc) : ({ i }) => i;
  L.sort((a, b) => key(a) - key(b) || a.i - b.i);
  return { film: id, ids: L.map(({ s }) => s.id) };
}

// Bir sahnenin ait olduğu film (önizleme çıktı adı): parent → film alanı → "film"
export function filmOfScene(s) {
  return (s && s.parent) || (MAN.film ? (typeof MAN.film === 'string' ? MAN.film : MAN.film.id) : 'film');
}
