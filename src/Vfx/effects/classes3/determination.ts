import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeOut, rand, span } from "../../pixel";
import type { PixelBuffer, RGB } from "../../pixel";
import type { Point } from "../classes/shared";
import { ramp, transform } from "../classes/shared";
import { doubleShock, finalTwinkle, popOut, withShake } from "./juice";

// Determination (red): wings. A crystal drops in, its feathers fan out one
// by one, the wings pull back, then slam down in one big flap (hit-stop,
// flash, shake), spring back, glow, and pop away into a twinkle.

const P = ramp("#FF001D");
const FLAP = 8;
const POP = 15;
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

const angle = (side: number, k: number, spread: number) => {
  const folded = Math.PI / 2 + 0.55 + k * 0.1;
  const open = Math.PI - 0.2 + k * 0.24;
  const a = folded + (open - folded) * spread;
  return side < 0 ? a : Math.PI - a;
};

// Spread of feather k at frame f: staggered fan-out, pull back, slam, spring.
const spread = (k: number, f: number) => {
  if (f < 7) {
    return easeOut(span(f, 1 + k * 0.45, 3.5 + k * 0.45));
  }
  const keys: Record<number, number> = { 7: 1.2, 8: 0.4, 9: 0.4, 10: 1.15, 11: 0.94 };
  return keys[f] ?? 1 + 0.04 * Math.sin(f * 1.3);
};

const effect: Effect = (b, f) => {
  const s = popOut(span(f, POP, POP + 4));
  const flash = f === FLAP;
  const drop = [0.55, 1.25, 1][Math.min(f, 2)];
  const cy = CY - (f === 0 ? 10 : 0);

  if (s > 0) {
    b.layer(
      (l) => {
        for (const side of [-1, 1]) {
          for (let k = 0; k < FEATHERS; k++) {
            const a = angle(side, k, spread(k, f));
            const fill = flash ? P.white : k % 2 === 0 ? P.base : P.light;
            feather(l, CX + side * 4 * s, cy - 1, a, (12 + k * 3.5) * s, fill, P.pale);
          }
        }
        // The crystal.
        const cs = drop * s * (f === FLAP + 2 ? 1.25 : 1) * (f === 7 ? 0.88 : 1);
        const t = transform(CX, cy, f < 2 ? f * 0.6 : 0, cs);
        l.polygon(([[0, -9], [6, -1], [0, 10], [-6, -1]] as Point[]).map(t), flash ? P.white : P.base);
        if (!flash) {
          l.polygon(([[0, -9], [0, 10], [-6, -1]] as Point[]).map(t), P.light);
          l.set(...t([-2, -3]), P.white);
        }
        // Twinkles running out along the wing tips while it glows.
        if (f >= 11 && f < POP) {
          const k = FEATHERS - 1 - ((f - 11) % FEATHERS);
          for (const side of [-1, 1]) {
            const a = angle(side, k, 1);
            const len = 12 + k * 3.5;
            l.sparkle(CX + side * 4 + Math.cos(a) * len, cy - 1 + Math.sin(a) * len, 2, P.pale, P.white);
          }
        }
      },
      { outline: f === FLAP + 1 ? P.white : P.ink },
    );
  }

  // Gust lines whooshing down on the flap.
  if (f >= FLAP && f <= FLAP + 2) {
    const age = f - FLAP;
    b.layer((l) => {
      for (const side of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
          const x = CX + side * (22 + k * 6 + age * 5);
          const y = CY + 12 + k * 4 + age * 4;
          l.line(x, y, x + side * 8, y + 4, P.pale, 1 - age * 0.3);
        }
      }
    });
  }
  doubleShock(b, CX, CY, f - FLAP, P);

  b.layer(
    (l) => {
      // Loose feathers drifting down after the flap.
      for (let i = 0; i < 6; i++) {
        const age = f - (FLAP + 2) - (i % 3);
        if (age < 0 || age > 9) {
          continue;
        }
        const side = i % 2 === 0 ? -1 : 1;
        const x = CX + side * (16 + rand(`dfx-${i}`) * 14) + Math.sin(age * 0.8 + i) * 3;
        const y = CY - 6 + rand(`dfy-${i}`) * 10 + age * 2.6;
        feather(l, x, y, Math.PI / 2 + Math.sin(age * 0.9 + i) * 0.6, 8, i % 2 ? P.light : P.base, P.pale);
      }
    },
    { outline: P.ink, fade: 1 - span(f, 18, 21) },
  );
  b.layer((l) => finalTwinkle(l, CX, CY, f - (POP + 4), P), { outline: P.ink });
};

export const determination = withShake(effect, [[FLAP, 1]]);
