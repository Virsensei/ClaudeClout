import type { Effect } from "../../PixelCanvas";
import { CX, easeIn, easeOut, rand, span } from "../../pixel";
import type { Path } from "./shared";
import { orb, palette, trail } from "./shared";

// Determination (red): helix ascent. Twin energy streams spiral up the
// card, fuse into a burning core at the top, which erupts into a fountain
// of sparks raining down.

const P = palette("#FF001D");
const TAU = Math.PI * 2;
const BOTTOM = 114;
const TOP = 30;
const CORE = 12;

// Phase, radius, width.
const STREAMS: [number, number, number][] = [
  [Math.PI / 2, 12, 2],
  [(3 * Math.PI) / 2, 12, 2],
  [0, 21, 3],
  [Math.PI, 21, 3],
];

const helix =
  (phase: number, radius: number): Path =>
  (t) => {
    if (t < 0 || t > 1) {
      return null;
    }
    const r = radius * (1 - 0.6 * t);
    return [CX + Math.sin(t * TAU * 2 + phase) * r, BOTTOM - (BOTTOM - TOP) * t];
  };

export const determination: Effect = (b, f) => {
  // Glow where the streams start.
  if (f <= 4) {
    b.ellipseRing(CX, BOTTOM, 12 + f * 3, 3 + f, 2, P.hot, 1 - f / 5);
  }

  // The rising streams. After the core forms they drain up into it.
  b.layer(
    (l) => {
      STREAMS.forEach(([phase, radius, width], i) => {
        const start = -3 + i * 0.35;
        const t = f < CORE ? easeIn(span(f, start, CORE)) : 1 + (f - CORE) * 0.2;
        trail(l, helix(phase, radius), t, 0.55, width, P.trail, 22);
      });
    },
    { outline: P.ink, fade: 1 - span(f, CORE + 1, CORE + 4) },
  );

  // Core gathering at the top.
  if (f >= 7 && f <= CORE) {
    const r = 2 + easeIn(span(f, 7, CORE)) * 6 + (f % 2) * 0.8;
    b.layer(
      (l) => {
        orb(l, CX, TOP, r, P);
        for (let i = 0; i < 4; i++) {
          const a = f * 0.9 + (i * TAU) / 4;
          l.sparkle(CX + Math.cos(a) * (r + 6), TOP + Math.sin(a) * (r + 6), 1, P.light, P.white);
        }
      },
      { outline: P.ink },
    );
  }

  if (f < CORE) {
    return;
  }
  const age = f - CORE;

  // Eruption flash and ring.
  if (age <= 1) {
    b.layer((l) => orb(l, CX, TOP, age === 0 ? 10 : 6, P), { outline: P.deep });
  }
  if (age <= 5) {
    const t = age / 5;
    b.ring(CX, TOP, 8 + easeOut(t) * 30, 3 - 2 * t, P.pale, 1 - t * 0.85);
  }

  // Fountain of sparks arcing up and raining down.
  b.layer(
    (l) => {
      for (let i = 0; i < 22; i++) {
        const a = -Math.PI / 2 + (rand(`df-a-${i}`) - 0.5) * 2.8;
        const speed = 3 + rand(`df-s-${i}`) * 3.5;
        const life = Math.min(5 + rand(`df-l-${i}`) * 5, 22 - CORE);
        if (age > life) {
          continue;
        }
        const path: Path = (tau) =>
          tau < 0 ? null : [CX + Math.cos(a) * speed * tau, TOP + Math.sin(a) * speed * tau + 0.45 * tau * tau];
        trail(l, path, age, Math.min(2.4, age), age < life - 2 ? 2 : 1, P.trail.slice(0, 5), 8);
      }
    },
    { outline: P.ink },
  );
};
