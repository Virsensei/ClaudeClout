import type { Effect } from "../../PixelCanvas";
import { CX, easeIn, easeOut, rand, span } from "../../pixel";
import { ramp, soul } from "./shared";

// Integrity (blue): gravity. The SOUL drops hard onto a ground line,
// squashes, bounces once, and rings of light rise from the impact.

const P = ramp("#0038F4");
const GROUND = 100;
const TOP = 22;
const SIZE = 7;
const IMPACT = 8;
const BOUNCE_LAND = 12;

// Heart centre so that its tip rests on the ground for a given squash.
const restingY = (sy: number) => GROUND - SIZE * sy * 0.88 - 1;

export const integrity: Effect = (b, f) => {
  // Ground line, drawn out from the centre just before impact.
  b.layer(
    (l) => {
      const half = 30 * easeOut(span(f, 4, 7));
      if (half > 0) {
        l.thickLine(CX - half, GROUND, CX + half, GROUND, 2, P.light);
      }
    },
    { outline: P.ink, fade: 1 - span(f, 15, 20) },
  );

  // Gravity chevrons pointing down before the fall.
  if (f < 6) {
    b.layer(
      (l) => {
        for (let k = 0; k < 3; k++) {
          if ((f + k) % 3 === 0 && f >= 1) {
            continue;
          }
          const y = TOP + 13 + k * 7;
          l.line(CX - 4, y, CX, y + 4, P.pale);
          l.line(CX, y + 4, CX + 4, y, P.pale);
        }
      },
      { outline: P.ink },
    );
  }

  // The SOUL: hover, fall, squash, bounce, settle.
  let y = TOP;
  let sx = 1;
  let sy = 1;
  if (f >= 4 && f < IMPACT) {
    y = TOP + (restingY(1) - TOP) * easeIn(span(f, 3.4, IMPACT));
    sy = 1.15;
    sx = 0.9;
  } else if (f >= IMPACT) {
    const squash: Record<number, [number, number]> = {
      8: [1.45, 0.62],
      9: [0.85, 1.2],
      12: [1.22, 0.8],
    };
    [sx, sy] = squash[f] ?? [1, 1];
    y = restingY(sy);
    if (f > IMPACT + 1 && f < BOUNCE_LAND) {
      y -= Math.sin(span(f, IMPACT + 1, BOUNCE_LAND) * Math.PI) * 12;
    }
  }

  // Speed lines while falling.
  if (f >= 5 && f < IMPACT) {
    b.layer((l) => {
      for (let i = 0; i < 5; i++) {
        const x = CX - 6 + i * 3;
        const len = 6 + (f - 4) * 4 + (i % 2) * 4;
        l.line(x, y - SIZE - 2 - len, x, y - SIZE - 2, i % 2 ? P.pale : P.light, 0.75);
      }
    });
  }

  b.layer((l) => soul(l, CX, y, SIZE * Math.min(1, span(f, -1, 2)), P, { sx, sy, flash: f === IMPACT }), {
    outline: P.ink,
    fade: 1 - span(f, 16, 21),
  });

  if (f < IMPACT) {
    return;
  }
  const age = f - IMPACT;

  // Shockwave along the ground and dust puffs.
  if (age <= 6) {
    const t = age / 6;
    const r = 10 + easeOut(t) * 40;
    b.ellipseRing(CX, GROUND, r, r * 0.25, 3 - 2 * t, P.pale, 1 - t * 0.8);
    b.layer(
      (l) => {
        // Dust kicked up on both sides.
        for (const dir of [-1, 1]) {
          for (let k = 0; k < 4; k++) {
            const x = CX + dir * (10 + age * (3 + k * 1.6));
            const yy = GROUND - 2 - k * 1.5 - age * (1.2 - k * 0.2) + 0.25 * age * age;
            const size = age < 3 ? 2 : 1;
            l.rect(x, yy, size, size, k % 2 === 0 ? P.pale : P.light);
          }
        }
      },
      { outline: P.ink },
    );
  }

  // Rings of light rising from the impact.
  for (let k = 0; k < 3; k++) {
    const t = f - (IMPACT + 3 + k * 1.5);
    if (t < 0 || t > 7) {
      continue;
    }
    const rx = 20 - t * 1.4;
    b.ellipseRing(CX, GROUND - 6 - t * 8, rx, rx * 0.3, 2, k === 1 ? P.pale : P.light, 1 - t / 8);
  }

  // Sparkles as the SOUL dissolves.
  b.layer(
    (l) => {
      for (let i = 0; i < 10; i++) {
        const born = 16 + rand(`i-b-${i}`) * 3;
        const t = f - born;
        if (t < 0 || t > 22 - born) {
          continue;
        }
        const x = CX + (rand(`i-x-${i}`) - 0.5) * 18;
        const yy = restingY(1) + (rand(`i-y-${i}`) - 0.5) * 12 - t * 3;
        l.sparkle(x, yy, [1, 2, 1, 1][Math.floor(t)] ?? 1, P.light, P.white);
      }
    },
    { outline: P.ink },
  );
};
