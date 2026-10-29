// lib/fc/index.mjs — frame-check tip kaydı (25 tip). Her tip: { layer: pixel|design|audio, page?: true|fn(c), prefetch?, pageRun?, run }.
//   design: sayfada koşar (run(c, ctx, api)) · prefetch: sayfadan kanca verisi alır, run(c, ctx, data) sayfa kapandıktan sonra
//   zanaat kapısı (1.3): pop · onset (piksel) · velocity · entryExit · moves (tasarım) — craft.mjs
import { TYPES as DESIGN } from './design.mjs';
import { TYPES as PIXEL } from './pixel.mjs';
import { TYPES as AUDIO } from './audio.mjs';
import { TYPES as CRAFT } from './craft.mjs';

export const TYPES = Object.assign({}, PIXEL, DESIGN, AUDIO, CRAFT);
export const TYPE_NAMES = Object.keys(TYPES);
