import type { Effect } from "../../PixelCanvas";
import { castBurst } from "./burst";
import { castFrame } from "./frame";
import { castGlove } from "./glove";
import { castSeal } from "./seal";

// Spell-card cast effects: three designs, each in every class colour.
// Change a colour here and all three versions follow.
export const CLASS_COLORS: Record<string, string> = {
  Determination: "#FF001D",
  Bravery: "#FF7E2A",
  Perseverance: "#D938F9",
  Integrity: "#0038F4",
  Patience: "#00FAFE",
  Kindness: "#00FA3E",
  Justice: "#FFD83D",
};

const DESIGNS: Record<string, (hex: string) => Effect> = {
  Frame: castFrame,
  Seal: castSeal,
  Burst: castBurst,
};

// e.g. CastFrameDetermination, CastSealKindness, CastBurstJustice.
export const castEffects: Record<string, Effect> = {};
for (const design of Object.keys(DESIGNS)) {
  for (const cls of Object.keys(CLASS_COLORS)) {
    castEffects[`Cast${design}${cls}`] = DESIGNS[design](CLASS_COLORS[cls]);
  }
}

// Class-specific cast: Bravery's boxing glove (its Undertale item is the Tough Glove).
castEffects.CastGloveBravery = castGlove(CLASS_COLORS.Bravery);
