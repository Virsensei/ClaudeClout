import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeIn, easeOut, span } from "../../pixel";
import type { Path } from "./shared";
import { palette, trail } from "./shared";

// Perseverance (purple): endless knot. Three ribbons of energy chase each
// other around a looping trefoil knot that draws itself, tighten, flash,
// then fly off and unravel.

const P = palette("#D938F9");
const TAU = Math.PI * 2;
const FLASH = 14;
const SPEED = 0.46;

const scaleAt = (f: number) =>
  11 * (0.55 + 0.45 * easeOut(span(f, -1, 6))) * (1 - 0.22 * easeIn(span(f, 11, FLASH)));

const knot = (u: number, s: number): [number, number] => [
  CX + s * (Math.sin(u) + 2 * Math.sin(2 * u)),
  CY + s * (Math.cos(u) - 2 * Math.cos(2 * u) + 0.45),
];

// Head position parameter for ribbon k at frame f.
const headU = (k: number, f: number) => (k * TAU) / 3 + f * SPEED + f * f * 0.006;

export const perseverance: Effect = (b, f) => {
  // The knot's path, glowing faintly, then flashing when complete.
  if (f >= 2 && f <= FLASH + 3) {
    const s = scaleAt(Math.min(f, FLASH));
    const flash = f === FLASH;
    const level = flash ? 1 : f > FLASH ? 0.5 - span(f, FLASH, FLASH + 3) * 0.5 : 0.25 + span(f, 2, 10) * 0.3;
    b.layer(
      (l) => {
        let prev = knot(0, s);
        for (let i = 1; i <= 140; i++) {
          const next = knot((i / 140) * TAU, s);
          if (flash) {
            l.thickLine(prev[0], prev[1], next[0], next[1], 2, P.pale);
          } else {
            l.line(prev[0], prev[1], next[0], next[1], P.dim, level);
          }
          prev = next;
        }
      },
      flash ? { outline: P.ink } : {},
    );
  }

  // Ribbons. After the flash each one flies off along its tangent.
  b.layer(
    (l) => {
      for (let k = 0; k < 3; k++) {
        const uFlash = headU(k, FLASH);
        const s = scaleAt(Math.min(f, FLASH));
        const sFlash = scaleAt(FLASH);
        const p1 = knot(uFlash, sFlash);
        const p0 = knot(uFlash - 0.01, sFlash);
        const tx = (p1[0] - p0[0]) / 0.01;
        const ty = (p1[1] - p0[1]) / 0.01;
        const tl = Math.hypot(tx, ty) || 1;
        const path: Path = (u) => {
          if (f <= FLASH || u <= uFlash) {
            return knot(u, f <= FLASH ? s : sFlash);
          }
          const d = (u - uFlash) * 34;
          return [p1[0] + (tx / tl) * d, p1[1] + (ty / tl) * d];
        };
        const u = f <= FLASH ? headU(k, f) : uFlash + (f - FLASH) * 0.5;
        trail(l, path, u, 1.7, 3, P.trail, 16);
      }
    },
    { outline: P.ink, fade: 1 - span(f, 17, 21) },
  );

  // Pulse when the knot completes.
  const age = f - FLASH;
  if (age >= 0 && age <= 6) {
    const t = age / 6;
    b.ring(CX, CY, 14 + easeOut(t) * 32, 3 - 2 * t, P.pale, 1 - t * 0.85);
  }
};
