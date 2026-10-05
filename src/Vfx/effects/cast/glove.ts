import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeOut, rand, span } from "../../pixel";
import type { PixelBuffer, RGB } from "../../pixel";
import type { Point } from "../classes/shared";
import { ramp } from "../classes/shared";
import { bouncePosition, chunk, doubleShock, finalTwinkle, popOut, withShake } from "../classes3/juice";

// Cast, "Glove Uppercut" (Bravery's Tough Glove): corner brackets pop onto
// the card, a boxing glove pops in low, winds up (drops, squashes,
// trembles) while speed lines rush in, then uppercuts: it rockets up and
// stretches, a comic impact burst explodes at the knuckles (flash,
// hit-stop, heavy shake), it springs back, bounces on its toes like a
// boxer with embers rising, and pops away into a twinkle.

const CARD = { x0: 15, y0: 4, x1: 94, y1: 121 };
const TAU = Math.PI * 2;
const PUNCH = 6;
const POP = 15;
const REST_Y = CY + 22;
const SIZE = 1.2;
const FLOOR = CY + 46;

const ellipse = (l: PixelBuffer, cx: number, cy: number, rx: number, ry: number, c: RGB) => {
  for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
    for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
      if ((x / rx) ** 2 + (y / ry) ** 2 <= 1) {
        l.set(cx + x, cy + y, c);
      }
    }
  }
};

// The glove, pointing up, with its cuff's bottom centre at (x, y).
const glove = (l: PixelBuffer, x: number, y: number, sx: number, sy: number, p: ReturnType<typeof ramp>, flash: boolean) => {
  const at = ([px, py]: Point): Point => [x + px * sx, y + py * sy];
  const c = (col: RGB) => (flash ? p.white : col);
  // Cuff with laces.
  l.polygon(([[-7, 0], [7, 0], [7, -8], [-7, -8]] as Point[]).map(at), c(p.pale));
  l.polygon(([[-7, -8], [7, -8], [7, -10], [-7, -10]] as Point[]).map(at), c(p.base));
  if (!flash) {
    for (const yy of [-2, -5]) {
      l.line(...at([-3, yy]), ...at([3, yy - 1]), p.deep);
      l.line(...at([-3, yy - 1]), ...at([3, yy]), p.deep);
    }
  }
  // Body, fist and thumb.
  l.polygon(([[-8, -9], [9, -9], [10, -18], [-8, -18]] as Point[]).map(at), c(p.base));
  ellipse(l, ...at([1, -21]), 10.5 * sx, 9.5 * sy, c(p.base));
  ellipse(l, ...at([-8, -15]), 4.5 * sx, 5 * sy, c(p.light));
  if (!flash) {
    l.line(...at([-4, -10]), ...at([-4, -19]), p.deep);
    ellipse(l, ...at([-2, -25]), 3.6 * sx, 2.8 * sy, p.light);
    l.set(...at([-3, -26]), p.white);
    l.line(...at([5, -14]), ...at([8, -23]), p.deep);
  }
};

// Comic impact burst: a spiky star with a jagged edge.
const burst = (l: PixelBuffer, x: number, y: number, r: number, p: ReturnType<typeof ramp>, spin: number) => {
  const pts = (scale: number): Point[] => {
    const out: Point[] = [];
    for (let i = 0; i < 14; i++) {
      const a = spin + (i * TAU) / 14;
      const rr = (i % 2 === 0 ? r : r * 0.55) * scale * (1 + (rand(`gb-${i}`) - 0.5) * 0.25);
      out.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    return out;
  };
  l.polygon(pts(1), p.pale);
  l.polygon(pts(0.62), p.light);
  l.disc(x, y, r * 0.22, p.white);
};

// Layer names, bottom to top (see `castGlove`'s `only`).
export const GLOVE_LAYERS = ["Brackets", "SpeedLines", "Smear", "ImpactBurst", "Shockwave", "Glove", "Sparks", "Embers", "Dust", "Twinkle"];

// `only` draws just that one layer (stacked in GLOVE_LAYERS order, the
// layers rebuild the full effect).
export const castGlove = (hex: string, only?: string): Effect => {
  const P = ramp(hex);
  const on = (layer: string) => !only || only === layer;

  const effect: Effect = (b, f) => {
    const age = f - PUNCH;
    const s = popOut(span(f, POP, POP + 4));

    // Card corner brackets: pop in, pinch on the wind-up, fly off on the punch.
    if (on("Brackets")) {
      b.layer(
        (l) => {
          const pop = ([0.4, 1.3, 1] as number[])[f] ?? 1;
          const pinch = f >= 4 && f < PUNCH ? 2 : 0;
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
        { outline: age === 1 ? P.white : P.ink, fade: 1 - span(f, PUNCH + 1, PUNCH + 5) },
      );
    }

    // Speed lines rushing in during the wind-up.
    if (f >= 2 && f < PUNCH && on("SpeedLines")) {
      b.layer((l) => {
        for (let i = 0; i < 10; i++) {
          const a = (i * TAU) / 10 + 0.2;
          const d0 = 44 - (f - 2) * 8;
          l.line(CX + Math.cos(a) * d0, REST_Y - 14 + Math.sin(a) * d0, CX + Math.cos(a) * (d0 - 8), REST_Y - 14 + Math.sin(a) * (d0 - 8), P.pale, 0.8);
        }
      });
    }

    // Smear behind the glove on the punch.
    if (age >= 0 && age <= 1 && on("Smear")) {
      b.layer((l) => {
        for (let k = 1; k <= 3; k++) {
          l.disc(CX + 1, CY + 12 + k * 9, 10 - k * 1.5, P.light, 0.7 - k * 0.15);
        }
      });
    }

    // Impact burst at the knuckles.
    const BX = CX + 1;
    const BY = CY - 26;
    if (age >= 0 && age <= 4 && on("ImpactBurst")) {
      b.layer(
        (l) => {
          burst(l, BX, BY, ([22, 22, 17, 11, 6] as number[])[age], P, age * 0.25);
          // Radial speed lines bursting out.
          if (age <= 3) {
            for (let i = 0; i < 12; i++) {
              const a = (i * TAU) / 12 + 0.13;
              const r0 = 18 + age * 3;
              const r1 = r0 + 8 - age * 2;
              l.thickLine(BX + Math.cos(a) * r0, BY + Math.sin(a) * r0, BX + Math.cos(a) * r1, BY + Math.sin(a) * r1, 2, P.pale);
            }
          }
        },
        { outline: age === 1 ? P.white : P.ink },
      );
    }
    if (on("Shockwave")) {
      doubleShock(b, BX, BY, age, P, 0.6);
    }

    // The glove.
    if (s > 0 && on("Glove")) {
      let y = REST_Y;
      let x = CX;
      let sx = ([0.75, 1.15] as number[])[f] ?? 1;
      let sy = sx;
      if (f >= 2 && f < PUNCH) {
        y = REST_Y + easeOut(span(f, 2, 4)) * 9;
        sx = 1.12;
        sy = 0.86;
        if (f >= 4) {
          x += f % 2 ? 1 : -1;
        }
      } else if (age === 0 || age === 1) {
        y = CY + 23;
        sx = 0.8;
        sy = 1.35;
      } else if (age === 2) {
        y = CY + 27;
        sx = 1.15;
        sy = 0.88;
      } else if (age >= 3) {
        // Boxer bounce: up and stretched, down and squashed, then ready.
        const bounce: Record<number, [number, number, number]> = {
          10: [-4, 0.92, 1.1],
          11: [1, 1.12, 0.88],
          12: [-3, 0.95, 1.06],
          13: [1, 1.08, 0.92],
        };
        const [dy, bx, by] = bounce[f] ?? [0, 1, 1];
        y = CY + 25 + dy;
        sx = bx;
        sy = by;
      }
      b.layer((l) => glove(l, x, y, sx * s * SIZE, sy * s * SIZE, P, age === 0), {
        outline: age === 1 ? P.white : P.ink,
      });
    }

    const fadeOut = { outline: P.ink, fade: 1 - span(f, 17, 21) };
    if (on("Sparks")) {
      b.layer(
        (l) => {
          // Sparks flying from the impact, falling and bouncing.
          if (age >= 0 && age <= 7) {
            for (let i = 0; i < 10; i++) {
              const a = -Math.PI / 2 + (i - 4.5) * 0.5;
              const v = 3 + rand(`gs-v-${i}`) * 3;
              const [x, y] = bouncePosition(BX, BY, Math.cos(a) * v, Math.sin(a) * v, age, FLOOR);
              if (x < 20 || x > 89 || y < 10) {
                continue;
              }
              if (age < 4) {
                chunk(l, x, y, 3, i % 3 === 0 ? P.white : i % 3 === 1 ? P.pale : P.light);
              } else if ((i + age) % 2 === 0) {
                l.sparkle(x, y, 1, P.light, P.white);
              }
            }
          }
        },
        fadeOut,
      );
    }
    if (on("Embers")) {
      b.layer(
        (l) => {
          // Embers rising off the glove while it holds.
          for (let i = 0; i < 7; i++) {
            const born = PUNCH + 4 + rand(`ge-b-${i}`) * 6;
            const t = f - born;
            if (t < 0 || t > Math.min(5, 21 - born)) {
              continue;
            }
            const x = CX + (rand(`ge-x-${i}`) - 0.5) * 30 + Math.sin(t + i) * 2;
            const y = CY - 14 - t * 4;
            l.rect(x, y, t < 2 ? 2 : 1, t < 2 ? 2 : 1, t < 2 ? P.pale : P.light);
          }
        },
        fadeOut,
      );
    }
    if (on("Dust")) {
      b.layer(
        (l) => {
          // Little dust puffs where it lands from each bounce.
          for (const land of [11, 13]) {
            const t = f - land;
            if (t >= 0 && t <= 2) {
              for (const side of [-1, 1]) {
                l.sparkle(CX + side * (13 + t * 4), CY + 24 - t, ([2, 1, 1] as number[])[t], P.pale, P.white);
              }
            }
          }
          // A ready glint on the knuckles.
          if (f === 14) {
            l.sparkle(CX + 4, CY - 4, 3, P.pale, P.white);
          }
        },
        fadeOut,
      );
    }

    if (on("Twinkle")) {
      b.layer((l) => finalTwinkle(l, CX + 1, CY + 4, f - (POP + 4), P), { outline: P.ink });
    }
  };

  return withShake(effect, [
    [PUNCH, 1.5],
    [PUNCH + 2, 0.5],
  ]);
};
