import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeIn, easeOut, rand, span } from "../../pixel";
import type { PixelBuffer } from "../../pixel";
import type { Point } from "./shared";
import { debris, ramp, shockwave, transform } from "./shared";

// Bravery (orange): two swords fly in from the bottom corners and clash in
// an X with a burst of sparks, a flame emblem roars up behind them, then
// everything burns away to embers.

const P = ramp("#FF7E2A");
const CLASH = 7;
const CROSS_Y = CY + 2;

// Draws a sword with its hilt at (x, y), blade pointing along `angle`.
const sword = (l: PixelBuffer, x: number, y: number, angle: number, flash: boolean) => {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const px = -dy;
  const py = dx;
  const len = 44;
  const tipX = x + dx * len;
  const tipY = y + dy * len;
  l.thickLine(x + dx * 2, y + dy * 2, tipX - dx * 3, tipY - dy * 3, 3, flash ? P.white : P.pale);
  l.line(x + dx * 2 + px, y + dy * 2 + py, tipX - dx * 3 + px, tipY - dy * 3 + py, flash ? P.white : P.light);
  l.polygon(
    [
      [tipX - dx * 4 + px * 1.5, tipY - dy * 4 + py * 1.5],
      [tipX, tipY],
      [tipX - dx * 4 - px * 1.5, tipY - dy * 4 - py * 1.5],
    ],
    flash ? P.white : P.pale,
  );
  l.thickLine(x - px * 7, y - py * 7, x + px * 7, y + py * 7, 3, flash ? P.white : P.base);
  l.thickLine(x, y, x - dx * 7, y - dy * 7, 2, flash ? P.white : P.deep);
  l.disc(x - dx * 8, y - dy * 8, 2, flash ? P.white : P.base);
};

const FLAME: Point[] = [
  [0, -26],
  [5, -15],
  [12, -7],
  [13, 3],
  [8, 12],
  [0, 15],
  [-8, 12],
  [-13, 3],
  [-11, -6],
  [-6, -2],
  [-5, -12],
];

export const bravery: Effect = (b, f) => {
  const fade = 1 - span(f, 15, 21);

  // Flame emblem roaring up behind the swords.
  if (f >= CLASH) {
    const age = f - CLASH;
    const grow = easeOut(span(age, 0, 3)) * (age === 2 ? 1.1 : 1);
    const flicker = 1 + 0.07 * Math.sin(f * 2.3);
    b.layer(
      (l) => {
        const outer = FLAME.map(([x, y]) => [x * grow, y * grow * flicker] as Point).map(transform(CX, CROSS_Y - 8, 0, 1));
        const inner = FLAME.map(([x, y]) => [x * grow * 0.62, y * grow * flicker * 0.62 + 4] as Point).map(transform(CX, CROSS_Y - 8, 0, 1));
        const core = FLAME.map(([x, y]) => [x * grow * 0.3, y * grow * flicker * 0.3 + 8] as Point).map(transform(CX, CROSS_Y - 8, 0, 1));
        l.polygon(outer, P.base);
        l.polygon(inner, P.light);
        l.polygon(core, P.pale);
      },
      { outline: P.ink, fade },
    );
  }

  // The swords: flying in, clashing, recoiling slightly, holding.
  const fly = 1 - easeIn(span(f, -1, CLASH));
  const recoil = f === CLASH + 1 ? 3 : 0;
  b.layer(
    (l) => {
      for (const side of [-1, 1]) {
        const angle = side === -1 ? -Math.PI / 4 : (-3 * Math.PI) / 4;
        const spin = side * fly * 0.7;
        const hx = CX + side * 17 + side * (fly * 26 + recoil);
        const hy = CROSS_Y + 17 + fly * 26;
        sword(l, hx, hy, angle + spin, f === CLASH);
        // Motion streaks behind the swords as they fly.
        if (f < CLASH && f >= 1) {
          for (let k = -1; k <= 1; k++) {
            const sx = hx + side * 4 + k * 3;
            const sy = hy + 4 - k * 3;
            l.line(sx, sy, sx + side * 10, sy + 10, P.light, 0.6);
          }
        }
      }
    },
    { outline: f === CLASH + 1 ? P.white : P.ink, fade },
  );

  if (f < CLASH) {
    return;
  }
  const age = f - CLASH;

  // Clash flash, shockwave and sparks.
  if (age <= 1) {
    b.layer((l) => l.sparkle(CX, CROSS_Y, age === 0 ? 8 : 4, P.pale, P.white), { outline: P.ink });
  }
  shockwave(b, CX, CROSS_Y, age, 10, 34, P.pale);
  b.layer(
    (l) => {
      debris(l, CX, CROSS_Y, age, [P.pale, P.light, P.base], "bd", 14);
      // Embers rising from the flame.
      for (let i = 0; i < 14; i++) {
        const born = CLASH + 3 + rand(`be-b-${i}`) * 7;
        const t = f - born;
        if (t < 0 || t > Math.min(5, 22 - born)) {
          continue;
        }
        const x = CX + (rand(`be-x-${i}`) - 0.5) * 34 + Math.sin(t + i) * 2;
        const y = CROSS_Y - 12 - t * 5;
        l.rect(x, y, t < 3 ? 2 : 1, t < 3 ? 2 : 1, t < 2 ? P.pale : P.light);
      }
    },
    { outline: P.ink },
  );
};
