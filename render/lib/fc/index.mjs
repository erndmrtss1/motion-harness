// lib/fc/index.mjs — frame-check tip kaydı (20 tip). Her tip: { layer: pixel|design|audio, page?: true|fn(c), prefetch?, pageRun?, run }.
//   design: sayfada koşar (run(c, ctx, api)) · prefetch: sayfadan kanca verisi alır, run(c, ctx, data) sayfa kapandıktan sonra
import { TYPES as DESIGN } from './design.mjs';
import { TYPES as PIXEL } from './pixel.mjs';
import { TYPES as AUDIO } from './audio.mjs';

export const TYPES = Object.assign({}, PIXEL, DESIGN, AUDIO);
export const TYPE_NAMES = Object.keys(TYPES);
