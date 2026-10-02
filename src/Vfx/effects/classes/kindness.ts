import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeIn, rand, span } from "../../pixel";
import type { PixelBuffer, RGB } from "../../pixel";
import type { Point } from "./shared";
import { debris, plus, ramp, shockwave, stampScale, transform } from "./shared";

// Kindness (green): leaves swirl inwards, a shield with a cross stamps
// down with a burst of leaves, then healing pluses rise as it fades.

const P = ramp("#00FA3E");
const TAU = Math.PI * 2;
const STAMP = 8;

const leaf = (l: PixelBuffer, x: number, y: number, a: number, len: number, c: RGB) => {
  const t = transform(x, y, a, 1);
  l.polygon(
    ([
      [0, 0],
      [len * 0.5, -len * 0.3],
      [len, 0],
      [len * 0.5, len * 0.3],
    ] as Point[]).map(t),
    c,
  );
  l.line(...t([0, 0]), ...t([len * 0.8, 0]), P.pale);
};

const SHIELD: Point[] = [
  [-15, -17],
  [15, -17],
  [15, -3],
  [11, 8],
  [0, 18],
  [-11, 8],
  [-15, -3],
];

const shield = (l: PixelBuffer, scale: number, flash: boolean) => {
  const t = transform(CX, CY, 0, scale);
  const inner = transform(CX, CY - 1, 0, scale * 0.74);
  l.polygon(SHIELD.map(t), flash ? P.white : P.light);
  l.polygon(SHIELD.map(inner), flash ? P.white : P.base);
  // Cross.
  const cross = (pts: Point[]) => l.polygon(pts.map(t), flash ? P.white : P.pale);
  cross([[-2.5, -11], [2.5, -11], [2.5, 7], [-2.5, 7]]);
  cross([[-8, -4.5], [8, -4.5], [8, 0.5], [-8, 0.5]]);
  if (!flash) {
    l.line(...t([-12, -14]), ...t([-12, -5]), P.white);
  }
};

export const kindness: Effect = (b, f) => {
  // Leaves swirling inwards.
  if (f < STAMP) {
    b.layer(
      (l) => {
        for (let i = 0; i < 10; i++) {
          const r = 38 * (1 - easeIn(span(f, -1, STAMP))) + 6;
          const a = (i * TAU) / 10 + f * 0.35;
          const x = CX + Math.cos(a) * r;
          const y = CY + Math.sin(a) * r;
          leaf(l, x, y, a + Math.PI / 2, 7, i % 2 === 0 ? P.light : P.base);
        }
      },
      { outline: P.ink },
    );
    return;
  }

  const age = f - STAMP;
  const fade = 1 - span(f, 16, 21);

  b.layer((l) => shield(l, stampScale(age), age === 0), {
    outline: age === 1 ? P.white : P.ink,
    fade,
  });

  shockwave(b, CX, CY, age, 16, 32, P.pale);

  b.layer(
    (l) => {
      // Leaves flung out by the stamp.
      if (age <= 5) {
        for (let i = 0; i < 8; i++) {
          const a = (i * TAU) / 8 + 0.3;
          const d = 18 + age * 6;
          leaf(l, CX + Math.cos(a) * d, CY + Math.sin(a) * d + age * age * 0.3, a + age * 0.5, 6 - age * 0.6, i % 2 ? P.light : P.base);
        }
      }
      debris(l, CX, CY, age, [P.pale, P.light], "kd", 8, 5);
      // Healing pluses rising.
      for (let i = 0; i < 12; i++) {
        const born = STAMP + 2 + rand(`kp-b-${i}`) * 6;
        const t = f - born;
        if (t < 0 || t > Math.min(6, 22 - born)) {
          continue;
        }
        const x = CX + (rand(`kp-x-${i}`) - 0.5) * 60;
        const y = CY + 14 + rand(`kp-y-${i}`) * 14 - t * 3.5;
        plus(l, x, y, t < 1 ? 1 : t < 5 ? 2 : 1, i % 3 === 0 ? P.white : i % 3 === 1 ? P.pale : P.light);
      }
    },
    { outline: P.ink },
  );
};
