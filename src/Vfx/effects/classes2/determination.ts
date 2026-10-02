import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeOut, rand, span } from "../../pixel";
import type { PixelBuffer, RGB } from "../../pixel";
import type { Point } from "../classes/shared";
import { ramp, risingSparkles, shockwave, transform } from "../classes/shared";

// Determination (red): wings. A crimson crystal sprouts feathered wings
// that unfold, flap once with a flash, then scatter into drifting feathers.

const P = ramp("#FF001D");
const FLAP = 9;
const SCATTER = 13;
const FEATHERS = 5;

const feather = (l: PixelBuffer, x: number, y: number, a: number, len: number, fill: RGB, vein: RGB) => {
  const t = transform(x, y, a, 1);
  l.polygon(
    ([
      [0, 0],
      [len * 0.35, -2.6],
      [len, -0.8],
      [len * 0.9, 1.6],
      [len * 0.35, 2.4],
    ] as Point[]).map(t),
    fill,
  );
  l.line(...t([1, 0]), ...t([len * 0.85, 0]), vein);
};

// Feather angle for wing side (-1 left, 1 right), feather k, spread 0..1.
const featherAngle = (side: number, k: number, spread: number) => {
  const folded = Math.PI / 2 + 0.55 + k * 0.1; // hanging down
  const open = Math.PI - 0.2 + k * 0.24; // spread out sideways, fanning up
  const a = folded + (open - folded) * spread;
  return side < 0 ? a : Math.PI - a;
};

const spreadAt = (f: number) => {
  if (f < FLAP) {
    return easeOut(span(f, 1, 7));
  }
  return [0.55, 1.12, 0.96, 1][Math.min(f - FLAP, 3)];
};

const crystal = (l: PixelBuffer, scale: number, flash: boolean) => {
  const t = transform(CX, CY, 0, scale);
  l.polygon(([[0, -9], [6, -1], [0, 10], [-6, -1]] as Point[]).map(t), flash ? P.white : P.base);
  if (!flash) {
    l.polygon(([[0, -9], [0, 10], [-6, -1]] as Point[]).map(t), P.light);
    l.set(...t([-2, -3]), P.white);
  }
};

export const determination: Effect = (b, f) => {
  const pop = [0.5, 1.2, 1][Math.min(f, 2)];
  const flash = f === FLAP;

  // Wings, then the feathers scattering.
  b.layer(
    (l) => {
      const spread = spreadAt(f);
      for (const side of [-1, 1]) {
        for (let k = 0; k < FEATHERS; k++) {
          const len = 12 + k * 3.5;
          let x = CX + side * 4;
          let y = CY - 1;
          let a = featherAngle(side, k, spread);
          if (f >= SCATTER) {
            const age = f - SCATTER;
            const drift = 2.5 + rand(`wd-${side}-${k}`) * 2.5;
            x += Math.cos(a) * age * drift + Math.sin(age + k) * 1.5;
            y += Math.sin(a) * age * drift * 0.6 + age * age * 0.25;
            a += side * age * (0.15 + k * 0.04);
          }
          feather(l, x, y, a, len, flash ? P.white : k % 2 === 0 ? P.base : P.light, flash ? P.pale : P.pale);
        }
      }
      if (f < SCATTER) {
        crystal(l, pop * (f === FLAP + 1 ? 1.3 : 1), flash);
      }
    },
    { outline: f === FLAP + 1 ? P.white : P.ink, fade: 1 - span(f, 16, 21) },
  );

  // Gust lines on the flap.
  if (f >= FLAP && f <= FLAP + 2) {
    b.layer(
      (l) => {
        const age = f - FLAP;
        for (const side of [-1, 1]) {
          for (let k = 0; k < 3; k++) {
            const x = CX + side * (24 + k * 5 + age * 4);
            const y = CY + 14 + k * 4 + age * 3;
            l.line(x, y, x + side * 7, y + 3, P.pale, 1 - age * 0.3);
          }
        }
      },
    );
  }

  shockwave(b, CX, CY, f - FLAP, 12, 32, P.pale);
  b.layer((l) => risingSparkles(l, f, FLAP + 2, CX, CY, 70, 40, P, "dw"), { outline: P.ink });
};
