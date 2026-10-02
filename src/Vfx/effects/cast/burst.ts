import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeIn, easeOut, rand, span } from "../../pixel";
import type { PixelBuffer, RGB } from "../../pixel";
import type { Point } from "../classes/shared";
import { ramp, risingSparkles } from "../classes/shared";
import { doubleShock, finalTwinkle, withShake } from "../classes3/juice";

// Cast C, "Charge & Burst": sparks stream in from all around the card and
// charge an orb in its centre inside corner brackets; the orb sucks in,
// then bursts into a starburst and a shine sweeps across the card.

const CARD = { x0: 15, y0: 4, x1: 94, y1: 121 };
const TAU = Math.PI * 2;
const BURST = 9;

const bracket = (l: PixelBuffer, x: number, y: number, sx: number, sy: number, c: RGB) => {
  l.thickLine(x, y, x + sx * 8, y, 2, c);
  l.thickLine(x, y, x, y + sy * 8, 2, c);
};

export const castBurst = (hex: string): Effect => {
  const P = ramp(hex);

  const effect: Effect = (b, f) => {
    const age = f - BURST;

    // Corner brackets around the card: pop in, pulse, pinch in, fly off.
    b.layer(
      (l) => {
        const pop = ([0.4, 1.3, 1] as number[])[f] ?? 1;
        const pinch = f === 7 || f === 8 ? 2 : 0;
        const fly = age > 0 ? easeOut(span(age, 0, 5)) * 14 : 0;
        const c = age === 0 ? P.white : f >= 5 && f % 2 === 1 ? P.pale : P.base;
        const pts: [number, number, number, number][] = [
          [CARD.x0, CARD.y0, 1, 1],
          [CARD.x1, CARD.y0, -1, 1],
          [CARD.x0, CARD.y1, 1, -1],
          [CARD.x1, CARD.y1, -1, -1],
        ];
        for (const [x, y, sx, sy] of pts) {
          const px = x + sx * (pinch - fly) + (1 - pop) * sx * 8;
          const py = y + sy * (pinch - fly) + (1 - pop) * sy * 8;
          bracket(l, px, py, sx * pop, sy * pop, c);
        }
      },
      { outline: age === 1 ? P.white : P.ink, fade: 1 - span(f, BURST + 1, BURST + 5) },
    );

    if (f < BURST) {
      // Sparks streaming in from around the card.
      const arrived = span(f, 1, 7);
      b.layer(
        (l) => {
          for (let i = 0; i < 16; i++) {
            const delay = rand(`cb-d-${i}`) * 3;
            const t = span(f + 1, delay, delay + 5.5);
            if (t <= 0 || t >= 1) {
              continue;
            }
            const a = (i * TAU) / 16 + rand(`cb-a-${i}`) * 0.3;
            const r0 = 58 + rand(`cb-r-${i}`) * 10;
            for (let k = 2; k >= 0; k--) {
              const tt = Math.max(0, t - k * 0.08);
              const e = easeIn(tt);
              const d = r0 * (1 - e);
              const aa = a + e * 0.9;
              const x = CX + Math.cos(aa) * d;
              const y = CY + Math.sin(aa) * d * 1.3;
              if (k === 0) {
                l.rect(x, y, 2, 2, P.white);
              } else {
                l.set(x, y, k === 1 ? P.pale : P.light);
              }
            }
          }
          // The charging orb: grows, pulses, then sucks in before bursting.
          const r = f === 7 ? 3 : f === 8 ? 2 : 2 + arrived * 6 + (f % 2) * 0.8;
          l.disc(CX, CY, r + 2, P.base);
          l.disc(CX, CY, r, P.light);
          l.disc(CX, CY, Math.max(1, r - 2.5), P.white);
          if (f === 8) {
            for (let i = 0; i < 4; i++) {
              const a2 = Math.PI / 4 + (i * Math.PI) / 2;
              l.line(CX + Math.cos(a2) * 14, CY + Math.sin(a2) * 14, CX + Math.cos(a2) * 8, CY + Math.sin(a2) * 8, P.pale);
            }
          }
        },
        { outline: P.ink },
      );
      return;
    }

    doubleShock(b, CX, CY, age, P, 1.15);

    b.layer(
      (l) => {
        // Starburst.
        if (age <= 3) {
          const len = ([44, 34, 22, 10] as number[])[age];
          const w = ([4, 3, 2, 1] as number[])[age];
          for (let i = 0; i < 8; i++) {
            const a = (i * TAU) / 8;
            const ll = i % 2 === 0 ? len : len * 0.6;
            l.thickLine(CX, CY, CX + Math.cos(a) * ll, CY + Math.sin(a) * ll, i % 2 === 0 ? w : Math.max(1, w - 1), P.light);
            l.line(CX, CY, CX + Math.cos(a) * (ll - 2), CY + Math.sin(a) * (ll - 2), P.white);
          }
          l.disc(CX, CY, ([14, 9, 5, 2] as number[])[age], P.white);
        }
        // Shards spinning outwards.
        if (age <= 7) {
          for (let i = 0; i < 10; i++) {
            const a = (i * TAU) / 10 + 0.31;
            const d = 10 + easeOut(span(age, 0, 8)) * 40;
            const x = CX + Math.cos(a) * d;
            const y = CY + Math.sin(a) * d * 1.2;
            const tall = (age + i) % 2 === 0;
            const w = tall ? 1.5 : 3;
            const h = tall ? 3 : 1.5;
            l.polygon([[x, y - h], [x + w, y], [x, y + h], [x - w, y]] as Point[], i % 2 ? P.pale : P.light);
          }
        }
      },
      { outline: P.ink },
    );

    // Shine sweeping diagonally across the card.
    if (age >= 1 && age <= 5) {
      const pos = -20 + ((age - 1) / 4) * 240;
      b.layer((l) => {
        for (let y = CARD.y0 + 2; y <= CARD.y1 - 2; y++) {
          for (let x = CARD.x0 + 2; x <= CARD.x1 - 2; x++) {
            const d = x - CARD.x0 + (y - CARD.y0) * 0.8 - pos;
            if (Math.abs(d) < 5) {
              l.set(x, y, Math.abs(d) < 2 ? P.white : P.pale, Math.abs(d) < 2 ? 0.6 : 0.3);
            }
          }
        }
      });
    }

    b.layer((l) => risingSparkles(l, f, BURST + 3, CX, CY, 70, 90, P, "cb-s", 16), { outline: P.ink });
    b.layer((l) => finalTwinkle(l, CX, CY, f - 19, P), { outline: P.ink });
  };

  return withShake(effect, [[BURST, 1.5]]);
};
