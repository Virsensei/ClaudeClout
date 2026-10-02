import type { Effect } from "../../PixelCanvas";
import { CX, easeOut, rand, span } from "../../pixel";
import type { PixelBuffer, RGB } from "../../pixel";
import type { Path } from "./shared";
import { orb, palette, trail } from "./shared";

// Kindness (green): growth. Curling vines of energy grow up the card,
// pulses run along them into a blossom that opens, flashes and releases
// drifting petals.

const P = palette("#00FA3E");
const TAU = Math.PI * 2;
const BASE_Y = 116;
const FLOWER_Y = 44;
const OPEN = 7;
const RELEASE = 12;

// Start x, side it bows towards, delay.
const VINES: [number, number, number][] = [
  [CX - 22, -1, 0.6],
  [CX - 9, -1, 0],
  [CX + 9, 1, 0.3],
  [CX + 22, 1, 0.9],
];

const vine =
  (x0: number, side: number): Path =>
  (t) => {
    if (t < 0 || t > 1) {
      return null;
    }
    // Rises in a bow towards the flower, curling at the very end.
    const u = Math.min(t, 0.82) / 0.82;
    const cx = x0 + side * 24;
    const ex = CX + side * 4;
    const uu = 1 - u;
    let x = uu * uu * x0 + 2 * uu * u * cx + u * u * ex;
    let y = uu * uu * BASE_Y + 2 * uu * u * 82 + u * u * (FLOWER_Y + 10);
    if (t > 0.82) {
      const a = ((t - 0.82) / 0.18) * Math.PI * 1.3;
      x += side * Math.sin(a) * 4;
      y -= (1 - Math.cos(a)) * 4;
    }
    return [x, y];
  };

const petal = (l: PixelBuffer, x: number, y: number, a: number, len: number, wid: number, c: RGB, vein: RGB) => {
  const tip: [number, number] = [x + Math.cos(a) * len, y + Math.sin(a) * len];
  const mx = x + Math.cos(a) * len * 0.45;
  const my = y + Math.sin(a) * len * 0.45;
  const px = -Math.sin(a) * wid * 0.5;
  const py = Math.cos(a) * wid * 0.5;
  l.polygon(
    [
      [x, y],
      [mx + px, my + py],
      tip,
      [mx - px, my - py],
    ],
    c,
  );
  l.line(x, y, tip[0] - Math.cos(a), tip[1] - Math.sin(a), vein);
};

export const kindness: Effect = (b, f) => {
  // Vines growing, each with an energy pulse racing to its tip.
  b.layer(
    (l) => {
      VINES.forEach(([x0, side, delay], i) => {
        const path = vine(x0, side);
        const grow = easeOut(span(f, -1 + delay, OPEN + delay * 0.5));
        trail(l, path, grow, grow, 2, [P.hot, P.base, P.base, P.dim], 14);
        // Leaves along the stem.
        [0.3, 0.55].forEach((at, k) => {
          if (grow < at + 0.05) {
            return;
          }
          const p = path(at);
          if (p) {
            const a = -Math.PI / 2 + side * (k === 0 ? 1.1 : 0.8) * (i % 2 === 0 ? 1 : -1);
            petal(l, p[0], p[1], a, 6, 4, P.light, P.base);
          }
        });
        // Pulses running up into the flower.
        for (let k = 0; k < 2; k++) {
          const t = span(f, 2 + k * 3 + delay, 5 + k * 3 + delay);
          const p = path(Math.min(grow, t));
          if (t > 0 && t < 1 && p) {
            l.rect(p[0] - 1, p[1] - 1, 2, 2, P.white);
          }
        }
      });
    },
    { outline: P.ink, fade: 1 - span(f, RELEASE, RELEASE + 6) },
  );

  // The blossom opening.
  if (f >= OPEN - 1 && f < RELEASE) {
    const open = easeOut(span(f, OPEN - 1, OPEN + 3));
    const flash = f === RELEASE - 1;
    b.layer(
      (l) => {
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 2 + (i * TAU) / 6 + (1 - open) * 0.6;
          petal(l, CX, FLOWER_Y, a, 4 + open * 10, 3 + open * 5, flash ? P.white : P.light, flash ? P.pale : P.hot);
        }
        orb(l, CX, FLOWER_Y, 1.5 + open * 2, P);
      },
      { outline: P.ink },
    );
  }

  if (f < RELEASE) {
    return;
  }
  const age = f - RELEASE;

  if (age <= 5) {
    const t = age / 5;
    b.ring(CX, FLOWER_Y, 12 + easeOut(t) * 30, 3 - 2 * t, P.pale, 1 - t * 0.85);
  }

  // Petals released: drifting outwards, swaying, slowly falling.
  b.layer(
    (l) => {
      for (let i = 0; i < 12; i++) {
        const a = -Math.PI / 2 + (i * TAU) / 12 + rand(`kp-a-${i}`) * 0.3;
        const life = Math.min(6 + rand(`kp-l-${i}`) * 4, 22 - RELEASE);
        if (age > life) {
          continue;
        }
        const d = 8 + easeOut(span(age, 0, life)) * (26 + rand(`kp-d-${i}`) * 14);
        const x = CX + Math.cos(a) * d + Math.sin(age * 0.9 + i) * 2.5;
        const y = FLOWER_Y + Math.sin(a) * d * 0.8 + age * age * 0.18;
        const size = 1 - age / (life + 2);
        petal(l, x, y, a + age * 0.6, 7 * size + 2, 4 * size + 1, i % 2 === 0 ? P.light : P.hot, P.pale);
      }
    },
    { outline: P.ink },
  );
};
