import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeOut, rand, span } from "../../pixel";
import type { Point } from "../classes/shared";
import { debris, ramp, shockwave } from "../classes/shared";

// Bravery (orange): explosion. A warning-rune triangle draws itself, a
// fuse spark races around its edges, then it blows up into a pixel
// fireball with billowing smoke and flying shards.

const P = ramp("#FF7E2A");
const TAU = Math.PI * 2;
const BOOM = 9;
const R = 24;

const CORNERS: Point[] = [0, 1, 2].map((i) => {
  const a = -Math.PI / 2 + (i * TAU) / 3;
  return [CX + Math.cos(a) * R, CY + 4 + Math.sin(a) * R];
});

// Point `t` (0..1) of the way around the triangle's perimeter.
const around = (t: number): Point => {
  const s = (((t % 1) + 1) % 1) * 3;
  const i = Math.floor(s);
  const u = s - i;
  const [x0, y0] = CORNERS[i];
  const [x1, y1] = CORNERS[(i + 1) % 3];
  return [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u];
};

export const bravery: Effect = (b, f) => {
  if (f < BOOM) {
    b.layer(
      (l) => {
        // Edges drawing in.
        const drawn = easeOut(span(f, -1, 3));
        for (let i = 0; i < 3; i++) {
          const [x0, y0] = CORNERS[i];
          const [x1, y1] = CORNERS[(i + 1) % 3];
          l.thickLine(x0, y0, x0 + (x1 - x0) * drawn, y0 + (y1 - y0) * drawn, 3, P.base);
        }
        // The fuse: edges it has passed glow hot.
        const fuse = span(f, 2, BOOM - 1);
        if (fuse > 0) {
          const steps = Math.ceil(fuse * 60);
          for (let k = 0; k < steps; k++) {
            const [x, y] = around((k / 60) * 1);
            l.rect(x - 1, y - 1, 2, 2, P.light);
          }
          const [sx, sy] = around(fuse);
          l.sparkle(sx, sy, f % 2 === 0 ? 3 : 2, P.pale, P.white);
        }
        // Exclamation mark inside, flashing as it gets close.
        const c = f >= BOOM - 2 && f % 2 === 1 ? P.white : P.pale;
        l.rect(CX - 1, CY - 6, 3, 9, c);
        l.rect(CX - 1, CY + 6, 3, 3, c);
      },
      { outline: P.ink },
    );
    return;
  }

  const age = f - BOOM;

  // Smoke puffs billowing outwards and up (drawn first, behind the fire).
  b.layer(
    (l) => {
      for (let i = 0; i < 12; i++) {
        const a = (i * TAU) / 12 + rand(`bs-a-${i}`) * 0.4;
        const d = 8 + easeOut(span(age, 0, 9)) * (18 + rand(`bs-d-${i}`) * 10);
        const r = 3 + Math.min(age, 6) * 0.9 - Math.max(0, age - 8) * 0.8;
        if (r <= 0.5 || age < 1) {
          continue;
        }
        const x = CX + Math.cos(a) * d;
        const y = CY + Math.sin(a) * d * 0.8 - age * 1.6;
        l.disc(x, y, r, P.deep, 1 - span(age, 6, 12));
        l.disc(x - 1, y - 1, r * 0.55, P.base, 1 - span(age, 5, 10));
      }
    },
    { outline: P.ink },
  );

  // Fireball: white flash, then churning fire shrinking away.
  if (age <= 6) {
    const r = [15, 13, 12, 10, 7, 4, 2][age];
    b.layer(
      (l) => {
        if (age === 0) {
          l.disc(CX, CY, r, P.white);
          return;
        }
        for (let i = 0; i < 6; i++) {
          const a = (i * TAU) / 6 + age;
          l.disc(CX + Math.cos(a) * r * 0.45, CY + Math.sin(a) * r * 0.45, r * 0.6, P.base);
        }
        l.disc(CX, CY, r * 0.75, P.light);
        l.disc(CX, CY - 1, r * 0.4, P.pale);
      },
      { outline: P.ink },
    );
  }

  shockwave(b, CX, CY, age, 14, 40, P.pale, 7);

  // Shards of the triangle and debris flying out.
  b.layer(
    (l) => {
      if (age <= 7) {
        for (let i = 0; i < 6; i++) {
          const a = (i * TAU) / 6 + 0.4;
          const d = 14 + age * 6;
          const x = CX + Math.cos(a) * d;
          const y = CY + Math.sin(a) * d + 0.4 * age * age;
          const spin = age * 0.9 + i;
          l.thickLine(x - Math.cos(spin) * 3, y - Math.sin(spin) * 3, x + Math.cos(spin) * 3, y + Math.sin(spin) * 3, 2, i % 2 ? P.base : P.light);
        }
      }
      debris(l, CX, CY, age, [P.pale, P.light, P.base], "bxd", 14, 7);
      // Embers drifting up after the blast.
      for (let i = 0; i < 12; i++) {
        const born = 3 + rand(`bx-b-${i}`) * 6;
        const t = age - born;
        if (t < 0 || BOOM + born + t > 22) {
          continue;
        }
        const x = CX + (rand(`bx-x-${i}`) - 0.5) * 50 + Math.sin(t + i) * 2;
        const y = CY + (rand(`bx-y-${i}`) - 0.5) * 30 - t * 4;
        l.rect(x, y, t < 2 ? 2 : 1, t < 2 ? 2 : 1, t < 2 ? P.pale : P.light);
      }
    },
    { outline: P.ink },
  );
};
