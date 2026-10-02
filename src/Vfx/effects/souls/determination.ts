import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeIn, easeOut, rand, span } from "../../pixel";
import { heartRing, ramp, soul, star } from "./shared";

// Determination (red): sparks converge into a SOUL, it beats twice with
// heart-shaped shockwaves, then bursts into a ring of stars.

const P = ramp("#FF001D");
const TAU = Math.PI * 2;
const BURST = 15;
const BEATS = [10, 13];

const heartSize = (f: number) => {
  const grow = 9 * easeOut(span(f, 3, 9));
  const pulse: Record<number, number> = { 10: 1.25, 11: 0.94, 13: 1.22, 14: 0.96 };
  return grow * (pulse[f] ?? 1);
};

export const determination: Effect = (b, f) => {
  // Sparks rushing into the centre.
  b.layer(
    (l) => {
      for (let i = 0; i < 22; i++) {
        const a = (i * TAU) / 22 + rand(`d-a-${i}`) * 0.25;
        const r0 = 48 + rand(`d-r-${i}`) * 18;
        const delay = rand(`d-d-${i}`) * 2.5;
        const t = span(f + 1, delay, delay + 7);
        if (t <= 0 || t >= 1) {
          continue;
        }
        const r = r0 * (1 - easeIn(t));
        const tail = r + 3 + 7 * t;
        l.line(CX + Math.cos(a) * tail, CY + Math.sin(a) * tail, CX + Math.cos(a) * r, CY + Math.sin(a) * r, P.light);
        l.rect(CX + Math.cos(a) * r, CY + Math.sin(a) * r, 2, 2, P.pale);
      }
    },
    { outline: P.ink },
  );

  // Heart-shaped shockwaves on each beat.
  for (const beat of BEATS) {
    const age = f - beat;
    if (age >= 0 && age <= 5) {
      heartRing(b, CX, CY, 11 + age * 6, 2, age < 2 ? P.pale : P.light, 1 - age / 6);
    }
  }

  // The SOUL.
  if (f < BURST + 1) {
    const size = heartSize(f);
    b.layer((l) => soul(l, CX, CY, f === BURST ? size * 1.3 : size, P, { flash: f === BURST }), {
      outline: f === BURST ? P.light : P.ink,
    });
  }

  if (f < BURST) {
    return;
  }

  // Burst: shockwave and stars flying out.
  const age = f - BURST;
  if (age <= 5) {
    const t = age / 5;
    b.ring(CX, CY, 10 + easeOut(t) * 36, 3 - 2 * t, P.pale, 1 - t * 0.85);
  }
  b.layer(
    (l) => {
      for (let i = 0; i < 8; i++) {
        if (age > 6) {
          continue;
        }
        const a = (i * TAU) / 8 + Math.PI / 8;
        const d = 8 + easeOut(span(age, 0, 7)) * (34 + (i % 2) * 8);
        const r = 5.5 * (1 - age / 8);
        const x = CX + Math.cos(a) * d;
        const y = CY + Math.sin(a) * d;
        star(l, x, y, r, age * 0.5 + i, i % 2 === 0 ? P.base : P.light);
        l.set(x, y, P.white);
      }
      // Twinkles left behind.
      for (let i = 0; i < 10; i++) {
        const born = 1 + rand(`dt-b-${i}`) * 3;
        const t = age - born;
        if (t < 0 || t > 3) {
          continue;
        }
        const a = rand(`dt-a-${i}`) * TAU;
        const d = 14 + rand(`dt-d-${i}`) * 30;
        l.sparkle(CX + Math.cos(a) * d, CY + Math.sin(a) * d, [1, 2, 1, 1][t], P.light, P.white);
      }
    },
    { outline: P.ink },
  );
};
