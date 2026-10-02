import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeOut, rand, span } from "../../pixel";
import type { PixelBuffer } from "../../pixel";
import type { Point } from "../classes/shared";
import { plus, ramp, shockwave, transform } from "../classes/shared";

// Kindness (green): potion. A flask bubbles and shakes, the cork pops off,
// a healing geyser splashes up, green mist hangs in the air and healing
// pluses rise.

const P = ramp("#00FA3E");
const POP = 9;
const FX = CX;
const FY = CY + 10; // flask body centre
const NECK_TOP = FY - 24;

const flask = (l: PixelBuffer, shake: number, level: number, f: number, scale: number) => {
  const x = FX + shake;
  // Liquid inside the round body.
  const r = 13 * scale;
  l.disc(x, FY, r, P.deep, 0.5);
  for (let y = -Math.ceil(r); y <= Math.ceil(r); y++) {
    for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
      if (dx * dx + y * y <= (r - 1.5) * (r - 1.5) && y > r - 2 * r * level) {
        l.set(x + dx, FY + y, y < r - 2 * r * level + 2 ? P.light : P.base);
      }
    }
  }
  // Bubbles rising through the liquid.
  for (let i = 0; i < 5; i++) {
    const bx = x + (rand(`kb-x-${i}`) - 0.5) * r;
    const by = FY + r - 3 - ((f * 3 + i * 5) % Math.max(1, r * 1.4));
    l.rect(bx, by, i % 2 ? 1 : 2, i % 2 ? 1 : 2, P.pale);
  }
  // Glass: neck, rim and highlight.
  l.rect(x - 4 * scale, NECK_TOP + 4, 8 * scale, (FY - r) - (NECK_TOP + 4) + 2, P.base, 0.5);
  l.rect(x - 6 * scale, NECK_TOP + 2, 12 * scale, 3, P.light);
  l.ring(x, FY, r, 2, P.light);
  l.line(x - r * 0.55, FY - r * 0.45, x - r * 0.25, FY - r * 0.75, P.white);
};

const cork = (l: PixelBuffer, x: number, y: number, angle: number) => {
  const t = transform(x, y, angle, 1);
  l.polygon(([[-4, -4], [4, -4], [3, 3], [-3, 3]] as Point[]).map(t), P.deep);
  l.line(...t([-3, -3]), ...t([3, -3]), P.base);
};

export const kindness: Effect = (b, f) => {
  const fade = 1 - span(f, 15, 20);
  const pop = [0.6, 1.15, 1][Math.min(f, 2)];
  const shake = f >= 5 && f < POP ? (f % 2 ? 1 : -1) * (f - 4) * 0.6 : 0;
  const level = f < POP ? 0.6 + 0.08 * Math.sin(f * 1.7) : 0.6 - span(f, POP, POP + 4) * 0.25;

  b.layer((l) => flask(l, shake, level, f, pop), { outline: P.ink, fade });

  // The cork: sitting in the neck, then popping off spinning.
  if (f < POP + 7) {
    const age = f - POP;
    const x = FX + shake + (age > 0 ? age * 3 : 0);
    const y = NECK_TOP + (age > 0 ? -age * 9 + age * age * 1.1 : 0);
    b.layer((l) => cork(l, x, y, age > 0 ? age * 0.9 : 0), { outline: P.ink });
  }

  // Steam puffs while it bubbles.
  if (f >= 3 && f < POP) {
    b.layer((l) => {
      for (let k = 0; k < 2; k++) {
        const t = (f + k * 2) % 4;
        l.disc(FX + shake + (k ? 3 : -3), NECK_TOP - 3 - t * 3, 2 - t * 0.3, P.pale, 0.6);
      }
    });
  }

  if (f < POP) {
    return;
  }
  const age = f - POP;

  shockwave(b, FX, NECK_TOP, age, 6, 26, P.pale, 5);

  // Geyser of healing liquid splashing up and falling.
  b.layer(
    (l) => {
      for (let i = 0; i < 16; i++) {
        const vx = (rand(`kg-x-${i}`) - 0.5) * 6;
        const vy = 6 + rand(`kg-y-${i}`) * 5;
        const x = FX + vx * age;
        const y = NECK_TOP - vy * age + 0.9 * age * age;
        if (age > 8 || y > FY + 20) {
          continue;
        }
        const s = age < 4 ? 2 : 1;
        l.rect(x, y, s, s + 1, i % 3 === 0 ? P.pale : i % 3 === 1 ? P.light : P.base);
      }
    },
    { outline: P.ink },
  );

  // Mist hanging above, then healing pluses rising.
  b.layer(
    (l) => {
      if (age >= 1 && age <= 9) {
        for (let i = 0; i < 4; i++) {
          const x = FX + (i - 1.5) * 10 + Math.sin(age * 0.7 + i) * 2;
          const y = NECK_TOP - 12 - (i % 2) * 5 - age * 1.5;
          l.disc(x, y, 3 + easeOut(span(age, 1, 4)) * 1.5, P.light, 0.3 * (1 - span(age, 4, 8)));
        }
      }
      for (let i = 0; i < 12; i++) {
        const born = POP + 2 + rand(`kh-b-${i}`) * 6;
        const t = f - born;
        if (t < 0 || t > Math.min(6, 22 - born)) {
          continue;
        }
        const x = FX + (rand(`kh-x-${i}`) - 0.5) * 60;
        const y = CY + rand(`kh-y-${i}`) * 20 - t * 3.5;
        plus(l, x, y, t < 1 ? 1 : t < 5 ? 2 : 1, i % 3 === 0 ? P.white : i % 3 === 1 ? P.pale : P.light);
      }
    },
    { outline: P.ink },
  );
};
