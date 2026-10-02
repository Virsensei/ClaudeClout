import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeOut, rand, span } from "../../pixel";
import type { Point } from "../classes/shared";
import { ramp } from "../classes/shared";
import { bouncePosition, chunk, doubleShock, withShake } from "./juice";

// Bravery (orange): explosion. A warning triangle draws in, its fuse spits
// sparks as it burns round, the triangle swells and trembles, sucks in,
// then BOOM: flash, heavy shake, fireball, smoke ring, bouncing debris.

const P = ramp("#FF7E2A");
const TAU = Math.PI * 2;
const BOOM = 9;
const R = 24;
const FLOOR = CY + 44;

const cornersAt = (scale: number, jitter: number): Point[] =>
  [0, 1, 2].map((i) => {
    const a = -Math.PI / 2 + (i * TAU) / 3;
    return [CX + jitter + Math.cos(a) * R * scale, CY + 4 + Math.sin(a) * R * scale];
  });

const along = (corners: Point[], t: number): Point => {
  const s = Math.min(0.9999, Math.max(0, t)) * 3;
  const i = Math.floor(s);
  const u = s - i;
  const [x0, y0] = corners[i];
  const [x1, y1] = corners[(i + 1) % 3];
  return [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u];
};

const effect: Effect = (b, f) => {
  if (f < BOOM) {
    const scale = ({ 6: 1.06, 7: 1.12, 8: 0.84 } as Record<number, number>)[f] ?? 1;
    const jitter = f >= 6 && f <= 7 ? (f % 2 ? 1 : -1) : 0;
    const corners = cornersAt(scale, jitter);
    const fuse = span(f, 2, 7.5);
    b.layer(
      (l) => {
        const drawn = easeOut(span(f, -1, 2.5));
        for (let i = 0; i < 3; i++) {
          const [x0, y0] = corners[i];
          const [x1, y1] = corners[(i + 1) % 3];
          l.thickLine(x0, y0, x0 + (x1 - x0) * drawn, y0 + (y1 - y0) * drawn, 3, f === 8 ? P.pale : P.base);
        }
        // Burnt-through part of the fuse glows hot.
        for (let k = 0; k < fuse * 60; k++) {
          const [x, y] = along(corners, k / 60);
          l.rect(x - 1, y - 1, 2, 2, P.light);
        }
        // The "!" blinking faster as it gets close.
        const blink = f >= 5 && f % 2 === 1;
        const c = f >= 8 || blink ? P.white : P.pale;
        l.rect(CX + jitter - 1, CY - 6 * scale, 3, 9 * scale, c);
        l.rect(CX + jitter - 1, CY + 6 * scale, 3, 3, c);
      },
      { outline: P.ink },
    );
    // Fuse spark spitting little sparks.
    if (fuse > 0 && f < 8) {
      b.layer(
        (l) => {
          const [sx, sy] = along(corners, fuse);
          l.sparkle(sx, sy, f % 2 === 0 ? 3 : 2, P.pale, P.white);
          for (let i = 0; i < 3; i++) {
            const a = rand(`bfs-${f}-${i}`) * TAU;
            l.rect(sx + Math.cos(a) * (4 + i * 2), sy + Math.sin(a) * (4 + i * 2), 1, 1, i === 0 ? P.white : P.light);
          }
        },
        { outline: P.ink },
      );
    }
    return;
  }

  const age = f - BOOM;

  // Smoke ring billowing outwards and up, behind the fire.
  b.layer(
    (l) => {
      for (let i = 0; i < 12; i++) {
        const a = (i * TAU) / 12 + rand(`bs-a-${i}`) * 0.4;
        const d = 8 + easeOut(span(age, 0, 9)) * (18 + rand(`bs-d-${i}`) * 10);
        const r = 3 + Math.min(age, 6) * 0.9 - Math.max(0, age - 8) * 0.9;
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

  // Fireball: two white hit-stop frames, then churning fire.
  if (age <= 7) {
    const r = [18, 16, 14, 12, 10, 7, 4, 2][age];
    b.layer(
      (l) => {
        if (age <= 1) {
          l.disc(CX, CY, r, P.white);
          return;
        }
        for (let i = 0; i < 6; i++) {
          const a = (i * TAU) / 6 + age * 1.3;
          l.disc(CX + Math.cos(a) * r * 0.45, CY + Math.sin(a) * r * 0.45, r * 0.6, P.base);
        }
        l.disc(CX, CY, r * 0.75, P.light);
        l.disc(CX, CY - 1, r * 0.4, P.pale);
      },
      { outline: age === 1 ? P.pale : P.ink },
    );
  }

  doubleShock(b, CX, CY, age, P, 1.25);

  b.layer(
    (l) => {
      // Chunks of the triangle flying out, falling and bouncing.
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i - 4.5) * 0.45;
        const v = 3 + rand(`bc-v-${i}`) * 3;
        const [x, y] = bouncePosition(CX, CY, Math.cos(a) * v, Math.sin(a) * v - 2, age, FLOOR);
        if (age <= 11) {
          chunk(l, x, y, age < 5 ? 3 : 2, i % 3 === 0 ? P.pale : i % 3 === 1 ? P.light : P.base);
        }
      }
      // Embers drifting up.
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
    { outline: P.ink, fade: 1 - span(f, 18, 22) },
  );
};

export const bravery = withShake(effect, [
  [BOOM, 1.5],
  [BOOM + 2, 0.5],
]);
