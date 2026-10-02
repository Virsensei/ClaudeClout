import type { Effect } from "../../PixelCanvas";
import { CX, easeIn, easeOut, rand, span } from "../../pixel";
import type { PixelBuffer } from "../../pixel";
import type { Path } from "./shared";
import { palette, trail } from "./shared";

// Integrity (blue): downpour and rebound. Energy rains down into a pool
// at the base of the card, which shoots back up as a pulsing column that
// dissolves upwards.

const P = palette("#0038F4");
const GROUND = 108;
const SURGE = 10;

const DROPS = new Array(9).fill(0).map((_, i) => ({
  x: 20 + i * 8.8,
  delay: -1 + rand(`id-d-${i}`) * 4.5,
}));

const landed = (f: number) => DROPS.filter((d) => f >= d.delay + 3).length;

const fillEllipse = (b: PixelBuffer, cx: number, cy: number, rx: number, ry: number, c: typeof P.base) => {
  for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
    for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
      if ((x / rx) ** 2 + (y / ry) ** 2 <= 1) {
        b.set(cx + x, cy + y, c);
      }
    }
  }
};

export const integrity: Effect = (b, f) => {
  // Falling energy, curving slightly inwards, with splashes on landing.
  b.layer(
    (l) => {
      DROPS.forEach(({ x, delay }) => {
        const path: Path = (t) =>
          t < 0 || t > 1 ? null : [x + (CX - x) * 0.35 * t * t, -6 + (GROUND + 6) * t * t];
        trail(l, path, (f - delay) / 3, 0.5, 2, P.trail, 10);
        const age = f - Math.ceil(delay + 3);
        if (age >= 0 && age <= 2) {
          const lx = x + (CX - x) * 0.35;
          for (const dir of [-1, 1]) {
            l.rect(lx + dir * (2 + age * 2), GROUND - 2 - age * 2 + age * age, 1, 2, P.pale);
          }
        }
      });
    },
    { outline: P.ink, fade: 1 - span(f, SURGE, SURGE + 2) },
  );

  // The pool gathering at the base.
  const pool = f < SURGE ? landed(f) : 9 * (1 - span(f, SURGE + 1, SURGE + 6));
  if (pool > 0) {
    b.layer(
      (l) => {
        const rx = 8 + pool * 2.6;
        fillEllipse(l, CX, GROUND, rx, 3.5, P.base);
        fillEllipse(l, CX, GROUND, rx * 0.7, 2.2, P.light);
        l.line(CX - rx * 0.45, GROUND, CX + rx * 0.45, GROUND, f === SURGE ? P.white : P.pale);
      },
      { outline: P.ink },
    );
  }

  if (f < SURGE) {
    return;
  }
  const age = f - SURGE;

  // Ground shockwave as the column erupts.
  if (age <= 5) {
    const t = age / 5;
    const r = 16 + easeOut(t) * 34;
    b.ellipseRing(CX, GROUND, r, r * 0.25, 3 - 2 * t, P.pale, 1 - t * 0.8);
  }

  // The column: shoots up, pulses climb it, then it lifts off and thins.
  const top = GROUND - easeOut(span(f, SURGE, SURGE + 2)) * (GROUND - 2);
  const bottom = GROUND - easeIn(span(f, SURGE + 5, 21)) * (GROUND + 4);
  const width = [12, 10, 9, 8, 7, 6, 5, 4, 3, 3, 2, 1][age] ?? 0;
  if (width > 0 && bottom > top) {
    b.layer(
      (l) => {
        l.rect(CX - width / 2, top, width, bottom - top, P.base);
        if (width > 2) {
          l.rect(CX - width / 2 + 1, top, width - 2, bottom - top, P.light);
        }
        if (width > 4) {
          l.rect(CX - width / 4, top, width / 2, bottom - top, P.white);
        }
        // Bright pulses travelling up the column.
        for (let k = 0; k < 3; k++) {
          const y = GROUND - ((age * 16 + k * 36) % (GROUND + 10));
          if (y > top && y < bottom) {
            l.rect(CX - width / 2 - 2, y, width + 4, 3, P.pale);
          }
        }
      },
      { outline: P.ink },
    );
  }

  // Motes peeling off the column as it dissolves.
  b.layer(
    (l) => {
      for (let i = 0; i < 16; i++) {
        const born = 3 + rand(`ic-b-${i}`) * 6;
        const t = age - born;
        if (t < 0 || t > Math.min(5, 12 - born)) {
          continue;
        }
        const side = i % 2 === 0 ? -1 : 1;
        const x = CX + side * (5 + t * 2.5);
        const y = 10 + rand(`ic-y-${i}`) * 90 - t * 4;
        l.rect(x, y, t < 2 ? 2 : 1, t < 2 ? 2 : 1, t < 2 ? P.pale : P.light);
      }
    },
    { outline: P.ink },
  );
};
