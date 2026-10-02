import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeIn, easeOut, rand, span } from "../../pixel";
import type { Path } from "./shared";
import { bezier, orb, palette, trail } from "./shared";

// Bravery (orange): comet crossfire. Four fiery comets curve in from the
// corners and collide in the centre, which detonates into a burst of
// flame streaks and drifting embers.

const P = palette("#FF7E2A");
const TAU = Math.PI * 2;
const HX = CX;
const HY = CY + 6;
const BLAST = 9;

// Start, control point, arrival frame.
const COMETS: [number, number, number, number, number][] = [
  [16, 8, 22, 64, 5.5],
  [94, 8, 88, 64, 6.5],
  [16, 120, 60, 116, 7.3],
  [94, 120, 104, 84, 8.2],
];

export const bravery: Effect = (b, f) => {
  // Comets.
  b.layer(
    (l) => {
      COMETS.forEach(([x0, y0, cx, cy, arrive]) => {
        const path = bezier(x0, y0, cx, cy, HX, HY);
        const progress = span(f + 2, arrive - 4, arrive + 2);
        const t = progress > 0 ? 0.12 + 0.88 * easeIn(progress) : 0;
        trail(l, path, t, 0.5, 4, P.trail, 14);
      });
    },
    { outline: P.ink, fade: 1 - span(f, BLAST, BLAST + 2) },
  );

  // Heat building in the centre as each comet arrives.
  if (f < BLAST) {
    const arrived = COMETS.filter((c) => f >= c[4]).length;
    if (arrived > 0) {
      b.layer((l) => orb(l, HX, HY, 2 + arrived * 1.6 + (f % 2) * 0.7, P), { outline: P.ink });
    }
    for (const c of COMETS) {
      const age = f - Math.ceil(c[4]);
      if (age >= 0 && age <= 2) {
        b.ring(HX, HY, 8 + age * 6, 2, P.pale, 1 - age / 3);
      }
    }
    return;
  }

  const age = f - BLAST;

  // Detonation.
  if (age <= 1) {
    b.layer((l) => orb(l, HX, HY, age === 0 ? 13 : 8, P), { outline: P.deep });
  }
  if (age <= 6) {
    const t = age / 6;
    b.ring(HX, HY, 10 + easeOut(t) * 38, 4 - 3 * t, P.pale, 1 - t * 0.85);
  }

  // Flame streaks bursting outward, longer upwards, slowing as they go.
  b.layer(
    (l) => {
      for (let i = 0; i < 18; i++) {
        const a = (i * TAU) / 18 + (rand(`bf-a-${i}`) - 0.5) * 0.25;
        const speed = 6 + rand(`bf-s-${i}`) * 3 + (Math.sin(a) < 0 ? 2 : 0);
        if (age > 7) {
          continue;
        }
        const path: Path = (tau) => {
          if (tau < 0) {
            return null;
          }
          const d = 6 + speed * tau * (1 - tau / 16);
          return [HX + Math.cos(a) * d, HY + Math.sin(a) * d - tau * tau * 0.2];
        };
        trail(l, path, age, Math.min(2.2, age + 0.5), age < 4 ? 3 : 2, P.trail, 8);
      }
    },
    { outline: P.ink },
  );

  // Embers drifting up.
  b.layer(
    (l) => {
      for (let i = 0; i < 16; i++) {
        const born = 2 + rand(`be-b-${i}`) * 5;
        const t = age - born;
        if (t < 0 || BLAST + born + t > 22 || t > 6) {
          continue;
        }
        const x = HX + (rand(`be-x-${i}`) - 0.5) * 60 + Math.sin(t + i) * 2;
        const y = HY + (rand(`be-y-${i}`) - 0.5) * 40 - t * 4;
        l.rect(x, y, t < 3 ? 2 : 1, t < 3 ? 2 : 1, t < 2 ? P.pale : t < 4 ? P.hot : P.base);
      }
    },
    { outline: P.ink },
  );
};
