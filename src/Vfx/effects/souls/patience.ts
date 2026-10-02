import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeInOut, easeOut, rand, span } from "../../pixel";
import { ramp, soul } from "./shared";

// Patience (cyan): a clock face draws in around the SOUL, its hand sweeps
// a full turn, it chimes, and slow ripples spread out as it fades.

const P = ramp("#00FAFE");
const TAU = Math.PI * 2;
const R = 28;
const CHIME = 14;

export const patience: Effect = (b, f) => {
  const clockFade = 1 - span(f, 16, 21);
  const chime = f === CHIME;

  b.layer(
    (l) => {
      // Rim, drawn in like a stroke.
      const drawn = easeOut(span(f, -1, 3));
      const start = -Math.PI / 2;
      l.ring(CX, CY, R, 3, chime ? P.white : P.base, 1, start, start + drawn * TAU);
      l.ring(CX, CY, R - 4, 1, chime ? P.white : P.deep, 1, start, start + drawn * TAU);

      // Hour ticks appearing one by one.
      for (let i = 0; i < 12; i++) {
        if (f < 1 + i * 0.33) {
          continue;
        }
        const a = start + (i * TAU) / 12;
        const long = i % 3 === 0;
        const r0 = long ? R - 9 : R - 7;
        l.line(
          CX + Math.cos(a) * r0,
          CY + Math.sin(a) * r0,
          CX + Math.cos(a) * (R - 5),
          CY + Math.sin(a) * (R - 5),
          long || chime ? P.white : P.pale,
        );
      }

      // Hands: the long one sweeps a full turn, the short one a quarter.
      const sweep = easeInOut(span(f, 3, CHIME));
      const long = start + sweep * TAU;
      const short = start + sweep * (TAU / 4);
      if (f >= 3 && f < CHIME) {
        // Motion trail behind the long hand.
        for (let k = 1; k <= 4; k++) {
          const a = long - k * 0.14;
          l.line(CX, CY, CX + Math.cos(a) * 19, CY + Math.sin(a) * 19, P.light, 0.7 - k * 0.15);
        }
      }
      l.thickLine(CX, CY, CX + Math.cos(short) * 12, CY + Math.sin(short) * 12, 2, P.light);
      l.thickLine(CX, CY, CX + Math.cos(long) * 20, CY + Math.sin(long) * 20, 2, chime ? P.white : P.pale);
    },
    { outline: P.ink, fade: clockFade },
  );

  // The SOUL as the clock's centre pin.
  b.layer((l) => soul(l, CX, CY + 1, 4.5 * Math.min(1, span(f, -1, 2)), P, { flash: chime }), {
    outline: P.ink,
    fade: clockFade,
  });

  // Motes drifting slowly backwards around the clock.
  if (f < 17) {
    b.layer(
      (l) => {
        for (let i = 0; i < 10; i++) {
          if ((f + i) % 4 === 0) {
            continue;
          }
          const a = (i * TAU) / 10 - f * 0.08 + rand(`p-a-${i}`) * 0.3;
          const r = 35 + rand(`p-r-${i}`) * 6;
          l.set(CX + Math.cos(a) * r, CY + Math.sin(a) * r, i % 3 === 0 ? P.white : P.pale);
        }
      },
      { outline: P.ink },
    );
  }

  // Chime: slow ripples.
  for (let k = 0; k < 3; k++) {
    const start = CHIME + k * 2;
    const t = f - start;
    if (t < 0 || t > Math.min(7, 22 - start)) {
      continue;
    }
    b.ring(CX, CY, R + 2 + t * 4, t < 3 ? 2 : 1, k === 0 ? P.pale : P.light, 1 - t / 8);
  }

  // Sparkles on the chime.
  const age = f - CHIME;
  if (age >= 0 && age <= 3) {
    b.layer(
      (l) => {
        for (let i = 0; i < 4; i++) {
          const a = -Math.PI / 2 + (i * TAU) / 4;
          l.sparkle(CX + Math.cos(a) * (R + 6 + age * 3), CY + Math.sin(a) * (R + 6 + age * 3), [3, 2, 1, 1][age], P.pale, P.white);
        }
      },
      { outline: P.ink },
    );
  }
};
