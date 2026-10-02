import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeInOut, easeOut, rand, span } from "../../pixel";
import type { Path } from "./shared";
import { palette, trail } from "./shared";

// Patience (cyan): slow vortex. A galaxy of motes spirals calmly inwards
// into a glowing core, which blooms back out in slow waves, releasing the
// motes outwards.

const P = palette("#00FAFE");
const TAU = Math.PI * 2;
const BLOOM = 14;

const MOTES = new Array(42).fill(0).map((_, i) => {
  const r0 = 14 + rand(`pm-r-${i}`) * 32;
  return {
    r0,
    a0: ((i % 3) * TAU) / 3 + r0 * 0.085 + (rand(`pm-a-${i}`) - 0.5) * 0.35,
  };
});

// Radius over time: drifts in until the bloom, then is released outwards.
const radiusAt = (r0: number, tau: number) => {
  const inward = r0 * (1 - 0.6 * easeInOut(span(tau, 0, BLOOM)));
  return tau <= BLOOM ? inward : inward * (1 + 0.13 * (tau - BLOOM));
};

const moteAt =
  (r0: number, a0: number): Path =>
  (tau) => {
    if (tau < -1) {
      return null;
    }
    const r = radiusAt(r0, tau);
    const a = a0 + tau * (0.05 + 1.4 / r0);
    return [CX + Math.cos(a) * r, CY + Math.sin(a) * r * 0.92];
  };

export const patience: Effect = (b, f) => {
  // Soft core growing in the eye of the vortex.
  if (f < BLOOM + 2) {
    const grow = easeOut(span(f, 3, BLOOM));
    b.layer((l) => {
      l.disc(CX, CY, 3 + grow * 8, P.base, 0.45);
      l.disc(CX, CY, 2 + grow * 4, P.light);
      l.disc(CX, CY, 1 + grow * 2, f === BLOOM ? P.white : P.pale);
    });
  }

  // The motes: inner ones glow hotter, outer ones cooler.
  b.layer(
    (l) => {
      MOTES.forEach(({ r0, a0 }) => {
        const inner = r0 < 28;
        const colors = inner ? P.trail.slice(0, 4) : P.trail.slice(2, 6);
        trail(l, moteAt(r0, a0), f, 2.2, inner ? 2 : 1, colors, 6);
      });
    },
    { outline: P.ink, fade: 1 - span(f, 16, 22) },
  );

  // Bloom: slow waves rolling outwards.
  for (let k = 0; k < 3; k++) {
    const start = BLOOM + k * 2;
    const t = f - start;
    if (t < 0 || t > Math.min(7, 22 - start)) {
      continue;
    }
    b.ring(CX, CY, 8 + t * 4.5, t < 3 ? 3 : 2, k === 0 ? P.pale : P.light, 1 - t / 8);
  }
  if (f >= BLOOM && f <= BLOOM + 1) {
    b.layer((l) => l.sparkle(CX, CY, f === BLOOM ? 6 : 3, P.pale, P.white), { outline: P.ink });
  }
};
