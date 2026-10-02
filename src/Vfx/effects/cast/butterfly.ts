import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeIn, easeOut, rand, span } from "../../pixel";
import type { PixelBuffer, RGB } from "../../pixel";
import type { Point } from "../classes/shared";
import { ramp, transform } from "../classes/shared";
import { doubleShock, finalTwinkle, popOut, withShake } from "../classes3/juice";

// Cast, "Butterfly" (Integrity): corner brackets pop onto the card, a
// butterfly sits with its wings closed while motes gather into it, then
// its wings snap open (flash, hit-stop, shake, shockwave, rays). Two big
// flaps throw off glittering wing dust, a last flap lifts it, and it
// shrinks away into a twinkle without ever leaving the card.

const CARD = { x0: 15, y0: 4, x1: 94, y1: 121 };
const TAU = Math.PI * 2;
const OPEN = 6;
const LAUNCH = 13;
const SHRINK = 15;
const SIZE = 1.45;

// Wing openness per frame: closed and trembling, snap open, two flaps, launch.
const WINGS: Record<number, number> = {
  6: 1.15,
  7: 1.1,
  8: 1,
  9: 0.4,
  10: 1.05,
  11: 0.38,
  12: 1,
  13: 0.36,
  14: 0.9,
  15: 0.4,
  16: 0.85,
};
const wingsAt = (f: number) => (f < OPEN ? 0.4 + (f >= 4 ? (f % 2 ? 0.08 : -0.06) : 0) : WINGS[f] ?? 0.5);

// Height: rests, lifts a little on each downstroke, then rises gently.
const yAt = (f: number) => {
  if (f < 9) {
    return CY;
  }
  if (f < LAUNCH) {
    return CY - (f - 8) * 1.5;
  }
  return CY - 6 - easeOut(span(f, LAUNCH - 1, SHRINK + 3)) * 14;
};

const butterfly = (l: PixelBuffer, x: number, y: number, w: number, s: number, p: ReturnType<typeof ramp>, flash: boolean) => {
  const t = transform(x, y, 0, s);
  const c = (col: RGB) => (flash ? p.white : col);
  for (const side of [-1, 1]) {
    l.polygon(([[0, -4], [side * 6 * w, -13], [side * 14 * w, -11], [side * 15 * w, -2], [side * 7 * w, 1], [0, 1]] as Point[]).map(t), c(p.base));
    l.polygon(([[0, 1], [side * 9 * w, 2], [side * 11 * w, 9], [side * 5 * w, 12], [0, 6]] as Point[]).map(t), c(p.light));
    if (!flash && w > 0.45) {
      l.disc(...t([side * 9 * w, -6]), 2.2 * w * s, p.pale);
      l.set(...t([side * 9 * w, -6]), p.white);
      l.disc(...t([side * 6 * w, 6]), 1.5 * w * s, p.base);
      l.line(...t([side * 6 * w, -13]), ...t([side * 14 * w, -11]), p.pale);
      l.line(...t([side * 15 * w, -2]), ...t([side * 7 * w, 1]), p.deep);
    }
  }
  l.thickLine(...t([0, -6]), ...t([0, 8]), 2 * s, c(p.deep));
  l.line(...t([0, -7]), ...t([-3, -12]), c(p.deep));
  l.line(...t([0, -7]), ...t([3, -12]), c(p.deep));
  l.set(...t([-3, -12]), c(p.pale));
  l.set(...t([3, -12]), c(p.pale));
};

export const castButterfly = (hex: string): Effect => {
  const P = ramp(hex);

  const effect: Effect = (b, f) => {
    const age = f - OPEN;

    // Card corner brackets: pop in, pinch while it gathers, fly off when it opens.
    b.layer(
      (l) => {
        const pop = ([0.4, 1.3, 1] as number[])[f] ?? 1;
        const pinch = f >= 4 && f < OPEN ? 2 : 0;
        // On the release the brackets retract into the corners (never leave the card).
        const retract = age > 0 ? easeOut(span(age, 0, 4)) : 0;
        const c = age === 0 ? P.white : P.base;
        for (const [x, y, sx, sy] of [
          [CARD.x0, CARD.y0, 1, 1],
          [CARD.x1, CARD.y0, -1, 1],
          [CARD.x0, CARD.y1, 1, -1],
          [CARD.x1, CARD.y1, -1, -1],
        ]) {
          const px = x + sx * (pinch + 1);
          const py = y + sy * (pinch + 1);
          const arm = 8 * pop * (1 - retract);
          if (arm >= 1) {
            l.thickLine(px, py, px + sx * arm, py, 2, c);
            l.thickLine(px, py, px, py + sy * arm, 2, c);
          }
        }
      },
      { outline: age === 1 ? P.white : P.ink, fade: 1 - span(f, OPEN + 1, OPEN + 5) },
    );

    // Motes gathering into the butterfly before it opens.
    if (f < OPEN) {
      b.layer(
        (l) => {
          for (let i = 0; i < 14; i++) {
            const delay = rand(`cbf-d-${i}`) * 2;
            const t = span(f + 1, delay, delay + 5);
            if (t <= 0 || t >= 1) {
              continue;
            }
            const a = rand(`cbf-a-${i}`) * TAU + t * 1.8;
            const d = (44 + rand(`cbf-r-${i}`) * 12) * (1 - easeIn(t)) + 3;
            l.rect(CX + Math.cos(a) * d, CY + Math.sin(a) * d * 1.2, 2, 2, i % 3 === 0 ? P.white : P.pale);
          }
        },
        { outline: P.ink },
      );
    }

    // Light rays bursting from behind the wings as they snap open.
    if (age >= 0 && age <= 3) {
      b.layer(
        (l) => {
          for (let i = 0; i < 12; i++) {
            const a = (i * TAU) / 12 + 0.13;
            const len = ([46, 40, 30, 18] as number[])[age] * (i % 2 === 0 ? 1 : 0.6);
            l.line(CX + Math.cos(a) * 12, CY + Math.sin(a) * 12, CX + Math.cos(a) * len, CY + Math.sin(a) * len, P.pale);
          }
        },
        { outline: P.ink },
      );
    }
    doubleShock(b, CX, CY, age, P);

    // The butterfly.
    const y = yAt(f);
    const leave = popOut(span(f, SHRINK, SHRINK + 4));
    if (leave > 0) {
      const pop = ([0.5, 1.15] as number[])[f] ?? 1;
      b.layer((l) => butterfly(l, CX, y, wingsAt(f), SIZE * pop * leave * (age === 0 ? 1.12 : 1), P, age === 0), {
        outline: age === 1 ? P.white : P.ink,
      });
    }

    b.layer(
      (l) => {
        // Wing dust thrown out on each downstroke.
        for (const down of [9, 11, 13]) {
          const t = f - down;
          if (t < 0 || t > 5) {
            continue;
          }
          const by = yAt(down);
          for (let i = 0; i < 8; i++) {
            const side = i % 2 === 0 ? -1 : 1;
            const row = i >> 1;
            const x = CX + side * (14 + t * (2.5 + row * 0.6) + row * 2);
            const yy = by + 2 + row * 4 + t * (1.2 + row * 0.4);
            if (t < 2) {
              l.rect(x, yy, 2, 2, i % 3 === 0 ? P.white : P.pale);
            } else {
              l.sparkle(x, yy, 1, P.light, P.white);
            }
          }
          if (t <= 3) {
            const r = 16 + t * 6;
            l.ellipseRing(CX, by + 12, r, r * 0.3, 1, P.pale, 1 - t / 4);
          }
        }
        // Sparkle dust drifting off it as it rises.
        if (f > LAUNCH && f < SHRINK + 4) {
          for (let k = 1; k <= 4; k++) {
            const tt = f - k * 0.6;
            l.sparkle(CX + (k % 2 ? 4 : -4), yAt(tt) + 12 + k, k < 3 ? 2 : 1, P.light, P.white);
          }
        }
      },
      { outline: P.ink, fade: 1 - span(f, 18, 21) },
    );

    b.layer((l) => finalTwinkle(l, CX, yAt(SHRINK + 3), f - (SHRINK + 4), P), { outline: P.ink });
  };

  return withShake(effect, [[OPEN, 1]]);
};
