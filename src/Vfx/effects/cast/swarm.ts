import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeIn, easeOut, rand, span } from "../../pixel";
import type { PixelBuffer, RGB } from "../../pixel";
import type { Point } from "../classes/shared";
import { ramp, transform } from "../classes/shared";
import { doubleShock, withShake } from "../classes3/juice";

// Cast, "Butterfly Swarm" (Integrity): a soft glow gathers in the card's
// centre and blooms, releasing little butterflies one after another. Each
// flies on its own, like in nature: its own flap rhythm, its own wandering
// path with the bob of each wingbeat, all inside the card. Each leaves at
// its own moment by shrinking away into a tiny twinkle, so nothing ever
// flies out of the frame.

const TAU = Math.PI * 2;
const COUNT = 10;
const BLOOM = 3;
// Area the butterflies stay inside (the card, inset a little).
const BOX = { x0: 21, y0: 12, x1: 88, y1: 112 };

const tiny = (l: PixelBuffer, x: number, y: number, w: number, tilt: number, s: number, wing: RGB, accent: RGB, body: RGB) => {
  const t = transform(x, y, tilt, s);
  for (const side of [-1, 1]) {
    l.polygon(([[0, -1], [side * 3 * w, -4.5], [side * 5.5 * w, -3], [side * 4 * w, 0], [0, 0.5]] as Point[]).map(t), wing);
    l.polygon(([[0, 0], [side * 3.5 * w, 1], [side * 2.5 * w, 3.5], [0, 2]] as Point[]).map(t), accent);
  }
  l.line(...t([0, -2]), ...t([0, 2]), body);
};

type Flier = {
  release: number; // frame it leaves the bloom
  leave: number; // frame it starts shrinking away
  heading: number;
  reach: number;
  flapSpeed: number;
  flapPhase: number;
  wander: number[];
};

const FLIERS: Flier[] = new Array(COUNT).fill(0).map((_, i) => ({
  release: BLOOM + i * 0.45 + rand(`fl-r-${i}`) * 0.4,
  leave: 12 + rand(`fl-l-${i}`) * 5,
  heading: (i * TAU) / COUNT + (rand(`fl-h-${i}`) - 0.5) * 0.5,
  reach: 12 + rand(`fl-d-${i}`) * 26,
  flapSpeed: 1.1 + rand(`fl-s-${i}`) * 0.9,
  flapPhase: rand(`fl-p-${i}`) * TAU,
  wander: new Array(8).fill(0).map((__, k) => rand(`fl-w-${i}-${k}`)),
}));

// Where a butterfly is `t` frames after it was released.
const position = (b: Flier, t: number): Point => {
  const out = easeOut(Math.min(1, t / 4));
  const [w0, w1, w2, w3, w4, w5, w6, w7] = b.wander;
  const settle = Math.min(1, t / 2);
  let x = CX + Math.cos(b.heading) * b.reach * 0.95 * out;
  let y = CY + Math.sin(b.heading) * b.reach * 1.35 * out;
  x += (Math.sin(t * (0.5 + w0 * 0.5) + w1 * TAU) * 6 + Math.sin(t * (1.1 + w2) + w3 * TAU) * 2.5) * settle;
  y += (Math.cos(t * (0.4 + w4 * 0.5) + w5 * TAU) * 5 + Math.sin(t * (1.3 + w6) + w7 * TAU) * 2) * settle;
  y -= t * 0.7; // gentle upward drift
  y -= Math.abs(Math.sin(t * b.flapSpeed + b.flapPhase)) * 1.5; // bob with each wingbeat
  return [Math.min(BOX.x1, Math.max(BOX.x0, x)), Math.min(BOX.y1, Math.max(BOX.y0, y))];
};

export const castSwarm = (hex: string): Effect => {
  const P = ramp(hex);

  const effect: Effect = (b, f) => {
    // A soft glow gathering in the centre, then blooming.
    if (f <= BLOOM) {
      b.layer(
        (l) => {
          const grow = easeIn(span(f, -1, BLOOM));
          for (let i = 0; i < 10; i++) {
            const a = (i * TAU) / 10 + f * 0.4;
            const d = 34 * (1 - grow) + 3;
            l.rect(CX + Math.cos(a) * d, CY + Math.sin(a) * d * 1.2, 2, 2, i % 3 === 0 ? P.white : P.pale);
          }
          const r = f === BLOOM ? 9 : 2 + grow * 4;
          l.disc(CX, CY, r + 1.5, f === BLOOM ? P.white : P.base);
          l.disc(CX, CY, r, f === BLOOM ? P.white : P.light);
          l.disc(CX, CY, Math.max(1, r - 2), P.white);
        },
        { outline: P.ink },
      );
    }
    const age = f - BLOOM;
    if (age >= 0 && age <= 3) {
      b.layer(
        (l) => {
          for (let i = 0; i < 12; i++) {
            const a = (i * TAU) / 12 + 0.15;
            const len = ([26, 22, 15, 8] as number[])[age] * (i % 2 === 0 ? 1 : 0.7);
            l.line(CX + Math.cos(a) * 6, CY + Math.sin(a) * 6, CX + Math.cos(a) * len, CY + Math.sin(a) * len, P.pale, age < 2 ? 1 : 0.6);
          }
        },
        { outline: P.ink },
      );
    }
    doubleShock(b, CX, CY, age, P, 0.7);

    // Glitter trailing each butterfly.
    b.layer(
      (l) => {
        FLIERS.forEach((fl, i) => {
          const t = f - fl.release;
          if (t < 1 || f >= fl.leave + 1) {
            return;
          }
          for (let k = 1; k <= 2; k++) {
            if ((f + i + k) % 2 === 0) {
              continue;
            }
            const [x, y] = position(fl, t - k * 0.7);
            l.set(x + (k === 1 ? 1 : -1), y + 3, k === 1 ? P.pale : P.light);
          }
        });
      },
    );

    // The butterflies, each on its own.
    b.layer(
      (l) => {
        FLIERS.forEach((fl, i) => {
          const t = f - fl.release;
          if (t < 0) {
            return;
          }
          const u = f - fl.leave;
          // Pop in from the bloom, shrink away at the end.
          const popIn = t < 0.6 ? 0.45 : t < 1.6 ? 1.25 : 1;
          const leaving = u < 0 ? 1 : (([1.18, 0.78, 0.42] as number[])[Math.floor(u)] ?? 0);
          const s = popIn * leaving;
          if (s <= 0) {
            return;
          }
          const [x, y] = position(fl, t);
          const [nx] = position(fl, t + 0.3);
          const w = 0.3 + 0.7 * Math.abs(Math.sin(t * fl.flapSpeed + fl.flapPhase));
          const light = i % 3 === 0;
          tiny(l, x, y, w, (nx - x) * 0.18, s, light ? P.light : P.base, light ? P.pale : P.light, P.deep);
          if (w > 0.85 && s >= 1) {
            l.set(x - 3, y - 3, P.white);
            l.set(x + 3, y - 3, P.white);
          }
        });
      },
      { outline: P.ink },
    );

    // The tiny twinkle each one leaves behind as it vanishes.
    b.layer(
      (l) => {
        FLIERS.forEach((fl) => {
          const u = Math.floor(f - fl.leave) - 3;
          if (u < 0 || u > 2) {
            return;
          }
          const [x, y] = position(fl, Math.floor(fl.leave) + 2 - fl.release);
          l.sparkle(x, y, [3, 2, 1][u], P.pale, P.white);
        });
      },
      { outline: P.ink },
    );
  };

  return withShake(effect, [[BLOOM, 0.5]]);
};
