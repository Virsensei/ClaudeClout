import type { Effect } from "../../PixelCanvas";
import { CX, CY, span } from "../../pixel";
import type { PixelBuffer } from "../../pixel";
import type { Point } from "../classes/shared";
import { ramp, star4 } from "../classes/shared";
import { finalTwinkle, popOut, withShake } from "./juice";

// Patience (cyan): moon. The moon waxes in clean steps, each one a little
// bump, while lines draw between the stars to form a constellation. It
// goes full with a flash, the constellation lights up, calm ripples spread,
// and moon and stars pop away.

const P = ramp("#00FAFE");
const FULL = 11;
const POP = 15;
const R = 16;

const STARS: Point[] = [
  [-30, -32],
  [-6, -40],
  [24, -32],
  [34, -6],
  [28, 24],
  [-2, 36],
  [-30, 22],
  [-36, -6],
];

const moon = (l: PixelBuffer, phase: number, scale: number, flash: boolean) => {
  const r = R * scale;
  const shadowX = CX - phase * r * 2.1;
  for (let y = -Math.ceil(r); y <= Math.ceil(r); y++) {
    for (let x = -Math.ceil(r); x <= Math.ceil(r); x++) {
      if (x * x + y * y > r * r) {
        continue;
      }
      const px = CX + x;
      const sdx = px - shadowX;
      if (sdx * sdx + y * y < r * r) {
        l.set(px, CY + y, P.deep, 0.5);
      } else {
        const rim = x * x + y * y > (r - 2) * (r - 2);
        l.set(px, CY + y, flash ? P.white : rim ? P.light : P.pale);
      }
    }
  }
  if (phase > 0.75 && !flash && scale > 0.5) {
    l.disc(CX + 5 * scale, CY - 5 * scale, 2.5 * scale, P.light);
    l.disc(CX - 6 * scale, CY + 4 * scale, 3 * scale, P.light);
    l.disc(CX + 7 * scale, CY + 8 * scale, 1.6 * scale, P.light);
  }
};

const effect: Effect = (b, f) => {
  const s = popOut(span(f, POP, POP + 4));
  // Waxing in seven steps, with a small bump on each step.
  const step = Math.min(7, Math.floor((f + 1) / 1.5));
  const prevStep = Math.min(7, Math.floor(f / 1.5));
  const phase = f >= FULL ? 1 : 0.12 + (0.88 * step) / 8;
  const bump = step !== prevStep && f < FULL ? 1.07 : f === FULL ? 1.15 : 1;
  const pop = [0.6, 1.1][f] ?? 1;

  // Constellation lines drawing from star to star.
  b.layer(
    (l) => {
      const drawn = span(f, 2, 10) * STARS.length;
      for (let i = 0; i < STARS.length; i++) {
        const p = Math.min(1, Math.max(0, drawn - i));
        if (p <= 0) {
          continue;
        }
        const [x0, y0] = STARS[i];
        const [x1, y1] = STARS[(i + 1) % STARS.length];
        l.line(CX + x0 * s, CY + y0 * s, CX + (x0 + (x1 - x0) * p) * s, CY + (y0 + (y1 - y0) * p) * s, f === FULL ? P.white : f > FULL ? P.light : P.base);
      }
    },
    { fade: f > FULL ? 1 - span(f, FULL + 2, POP + 2) : 1 },
  );

  if (s > 0) {
    b.layer((l) => moon(l, phase, pop * bump * s, f === FULL), {
      outline: f === FULL + 1 ? P.white : P.ink,
    });
  }

  // Stars: twinkling, all flaring when the moon goes full.
  b.layer(
    (l) => {
      STARS.forEach(([dx, dy], i) => {
        const x = CX + dx * s;
        const y = CY + dy * s;
        if (s <= 0) {
          return;
        }
        if (f === FULL || f === FULL + 1 || (f + i) % 5 === 0) {
          l.polygon(star4(x, y, f === FULL ? 5 : 3, 1, 0), P.white);
        } else {
          l.sparkle(x, y, 1, P.light, P.white);
        }
      });
    },
    { outline: P.ink },
  );

  // Calm ripples from the full moon.
  for (let k = 0; k < 3; k++) {
    const start = FULL + k * 2;
    const t = f - start;
    if (t < 0 || t > Math.min(7, 22 - start)) {
      continue;
    }
    b.ring(CX, CY, R + 6 + t * 4, t < 3 ? 2 : 1, k === 0 ? P.pale : P.light, 1 - t / 8);
  }

  b.layer((l) => finalTwinkle(l, CX, CY, f - (POP + 4), P), { outline: P.ink });
};

export const patience = withShake(effect, [[FULL, 0.5]]);
