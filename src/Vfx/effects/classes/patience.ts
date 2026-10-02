import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeInOut, span } from "../../pixel";
import type { PixelBuffer } from "../../pixel";
import type { Point } from "./shared";
import { ramp, risingSparkles, transform } from "./shared";

// Patience (cyan): an hourglass pops in and its sand runs down, then it
// flips over with a flash and slow ripples spread out as it fades.

const P = ramp("#00FAFE");
const FLIP = 10;
const FLIPPED = FLIP + 3;

// Upper-bulb half width at height y (y from -21 at the top to -1 at the neck).
const bulbHalf = (y: number) => 1.5 + ((-1 - y) / 20) * 8.5;

const hourglass = (l: PixelBuffer, angle: number, scale: number, sand: number, f: number, flash: boolean) => {
  const t = transform(CX, CY, angle, scale);
  const poly = (pts: Point[], c: typeof P.base) => l.polygon(pts.map(t), flash ? P.white : c);
  const line = (a: Point, b: Point, c: typeof P.base) => l.line(...t(a), ...t(b), flash ? P.white : c);

  // Glass.
  poly([[-10, -21], [10, -21], [1.5, -1], [-1.5, -1]], P.deep);
  poly([[-1.5, 1], [1.5, 1], [10, 21], [-10, 21]], P.deep);

  // Sand left in the top: the part of the bulb below its surface.
  if (sand > 0.02) {
    const top = -1 - 20 * sand;
    poly([[-bulbHalf(top), top], [bulbHalf(top), top], [1.5, -1], [-1.5, -1]], P.base);
    line([-bulbHalf(top) + 1, top], [bulbHalf(top) - 1, top], P.light);
  }
  // Pile in the bottom.
  const pile = 18 * (1 - sand);
  if (pile > 0.5) {
    poly([[-10, 21], [10, 21], [Math.max(2, 10 - pile * 0.45), 21 - pile * 0.7], [0, 21 - pile], [-Math.max(2, 10 - pile * 0.45), 21 - pile * 0.7]], P.base);
    line([-3, 21 - pile + 1], [0, 21 - pile], P.light);
  }
  // Falling stream through the neck.
  if (sand > 0.02 && sand < 0.98) {
    line([0, -1], [0, 21 - pile], P.base);
    for (let k = 0; k < 3; k++) {
      const y = -1 + ((f * 5 + k * 7) % Math.max(1, 21 - pile));
      line([0, y], [0, y + 1], P.pale);
    }
  }

  // Glass outline and highlights.
  line([-10, -21], [-1.5, -1], P.light);
  line([10, -21], [1.5, -1], P.light);
  line([-1.5, 1], [-10, 21], P.light);
  line([1.5, 1], [10, 21], P.light);
  line([-7, -18], [-3, -9], P.white);

  // Frame: bars and posts.
  poly([[-14, -25], [14, -25], [14, -21], [-14, -21]], P.base);
  poly([[-14, 21], [14, 21], [14, 25], [-14, 25]], P.base);
  line([-14, -24], [14, -24], P.light);
  line([-14, 22], [14, 22], P.light);
  line([-12, -21], [-12, 21], P.light);
  line([12, -21], [12, 21], P.light);
};

export const patience: Effect = (b, f) => {
  const fade = 1 - span(f, 17, 22);
  const pop = [0.5, 1.15, 1][Math.min(f, 2)];
  const flipT = easeInOut(span(f, FLIP, FLIPPED));
  const angle = f < FLIPPED ? Math.PI * flipT : 0;
  // While running, sand drains from the top; once flipped, it is all on top again.
  const sand = f < FLIP ? 1 - easeInOut(span(f, 2, FLIP)) : f < FLIPPED ? 0 : 1;

  b.layer((l) => hourglass(l, angle, pop, sand, f, f === FLIPPED), {
    outline: f === FLIPPED + 1 ? P.white : P.ink,
    fade,
  });

  // Slow ripples after the flip.
  for (let k = 0; k < 3; k++) {
    const start = FLIPPED + k * 2;
    const t = f - start;
    if (t < 0 || t > Math.min(7, 22 - start)) {
      continue;
    }
    b.ring(CX, CY, 28 + t * 4, t < 3 ? 2 : 1, k === 0 ? P.pale : P.light, 1 - t / 8);
  }

  b.layer(
    (l) => {
      // Sparkles on the bars when it lands.
      const age = f - FLIPPED;
      if (age >= 0 && age <= 3) {
        for (const [x, y] of [
          [CX - 16, CY - 24],
          [CX + 16, CY + 24],
          [CX + 16, CY - 24],
          [CX - 16, CY + 24],
        ]) {
          l.sparkle(x, y, [3, 2, 1, 1][age], P.pale, P.white);
        }
      }
      risingSparkles(l, f, 16, CX, CY, 40, 50, P, "prs", 10);
    },
    { outline: P.ink },
  );
};
