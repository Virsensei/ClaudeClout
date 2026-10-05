import type { Effect } from "./PixelCanvas";
import { CLASS_COLORS } from "./effects/cast";
import { castGlove, GLOVE_LAYERS } from "./effects/cast/glove";
import { castKnife, KNIFE_LAYERS } from "./effects/cast/knife";
import { castStar, STAR_LAYERS } from "./effects/cast/star";
import { KINDNESS_LAYERS, kindnessLayer } from "./effects/classes3/kindness";
import { PERSEVERANCE_LAYERS, perseveranceLayer } from "./effects/classes3/perseverance";

// Effects that can be rendered one layer at a time (bottom to top). Stacking
// every layer in this order gives exactly the full effect, so the layers can
// be retimed, recoloured or rebuilt in other tools.
const SOURCES: Record<string, { layers: string[]; make: (only?: string) => Effect }> = {
  CastKnifePatience: { layers: KNIFE_LAYERS, make: (only) => castKnife(CLASS_COLORS.Patience, only) },
  CastStarDetermination: { layers: STAR_LAYERS, make: (only) => castStar(CLASS_COLORS.Determination, only) },
  ClassV3Perseverance: { layers: PERSEVERANCE_LAYERS, make: perseveranceLayer },
  ClassV3Kindness: { layers: KINDNESS_LAYERS, make: kindnessLayer },
  CastGloveBravery: { layers: GLOVE_LAYERS, make: (only) => castGlove(CLASS_COLORS.Bravery, only) },
};

// effect name -> one Effect per layer, in stacking order.
export const LAYERED: Record<string, { name: string; effect: Effect }[]> = {};
for (const effect of Object.keys(SOURCES)) {
  LAYERED[effect] = SOURCES[effect].layers.map((name) => ({ name, effect: SOURCES[effect].make(name) }));
}
