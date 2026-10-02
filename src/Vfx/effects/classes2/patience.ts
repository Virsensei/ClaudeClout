import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeInOut, span } from "../../pixel";
import type { PixelBuffer } from "../../pixel";
import { ramp, risingSparkles, star4 } from "../classes/shared";

// Patience (cyan): moon. A thin crescent waxes slowly to a full moon among
// twinkling stars, glows, and sends out calm ripples as it fades.

const P = ramp("#00FAFE");
const FULL = 11;
const R = 17;

// Lit part of the moon: inside the moon but outside the sliding shadow.
const moon = (l: PixelBuffer, phase: number, flash: boolean) => {
  const shadowX = CX - phase * R * 2.1;
  for (let y = -R; y <= R; y++) {
    for (let x = -R; x <= R; x++) {
      if (x * x + y * y > R * R) {
        continue;
      }
      const px = CX + x;
      const py = CY + y;
      const sdx = px - shadowX;
      const inShadow = sdx * sdx + y * y < R * R;
      if (inShadow) {
        l.set(px, py, P.deep, 0.5);
      } else {
        const rim = x * x + y * y > (R - 2) * (R - 2);
        l.set(px, py, flash ? P.white : rim ? P.light : P.pale);
      }
    }
  }
  // Craters show once it is nearly full.
  if (phase > 0.75 && !flash) {
    l.disc(CX + 5, CY - 5, 2.5, P.light);
    l.disc(CX - 6, CY + 4, 3, P.light);
    l.disc(CX + 7, CY + 8, 1.6, P.light);
  }
};

const STARS: [number, number, number][] = [
  [-32, -30, 1],
  [30, -26, 3],
  [-36, 10, 5],
  [34, 18, 7],
  [-18, 34, 9],
  [20, -40, 4],
];

export const patience: Effect = (b, f) => {
  const fade = 1 - span(f, 16, 21);
  const phase = f < FULL ? 0.12 + 0.88 * easeInOut(span(f, 0, FULL)) : 1;
  const pop = [0.6, 1.1, 1][Math.min(f, 2)];

  b.layer(
    (l) => {
      if (pop !== 1) {
        l.disc(CX, CY, R * pop, P.deep, 0.5);
        l.disc(CX + R * 0.6 * pop, CY, R * 0.5 * pop, P.pale);
        return;
      }
      moon(l, phase, f === FULL);
    },
    { outline: f === FULL + 1 ? P.white : P.ink, fade },
  );

  // Halo when full.
  if (f >= FULL) {
    b.ring(CX, CY, R + 5, 2, P.light, Math.max(0, 0.6 - (f - FULL) * 0.08));
  }

  // Stars twinkling in turn, slowly circling.
  b.layer(
    (l) => {
      STARS.forEach(([dx, dy, offset]) => {
        const a = f * 0.03;
        const x = CX + dx * Math.cos(a) - dy * Math.sin(a);
        const y = CY + dx * Math.sin(a) + dy * Math.cos(a);
        const cycle = (f + offset) % 6;
        const size = [1, 2, 3, 2, 1, 1][cycle];
        if (size >= 3) {
          l.polygon(star4(x, y, 4, 1, 0), P.white);
        } else {
          l.sparkle(x, y, size, P.light, P.white);
        }
      });
    },
    { outline: P.ink, fade },
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

  b.layer((l) => risingSparkles(l, f, 15, CX, CY, 50, 40, P, "pm", 10), { outline: P.ink });
};
