import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeInOut, easeOut, span } from "../../pixel";
import type { PixelBuffer } from "../../pixel";
import type { Point } from "../classes/shared";
import { ramp, rune, transform } from "../classes/shared";
import { bouncePosition, doubleShock, finalTwinkle, popOut, withShake } from "./juice";

// Perseverance (purple): quill. A quill pops in and writes a glowing
// sigil with sparks at the nib and ink glitter drifting off the line,
// lifts, then taps the final dot: the sigil flashes, a rune ring snaps
// into place, ink splashes and bounces, the quill hops off and vanishes
// in a sparkle, and the seal folds away into a twinkle. Nothing leaves
// the card.

const P = ramp("#D938F9");
const TAU = Math.PI * 2;
const DONE = 9;
const TAP = 10;
const POP = 15;
const SAMPLES = 90;

const sigil = (t: number): Point => {
  if (t < 0.8) {
    const u = (t / 0.8) * TAU;
    return [22 * Math.sin(u), -4 + 10 * Math.sin(2 * u)];
  }
  const u = (t - 0.8) / 0.2;
  return [0, -18 + u * 32];
};
const DOT: Point = [0, 19];

const quill = (l: PixelBuffer, x: number, y: number, tilt: number, s = 1) => {
  const t = transform(x, y, -1.05 + tilt, s);
  l.polygon(([[0, 0], [8, -3], [24, -4], [30, 0], [22, 3], [8, 3]] as Point[]).map(t), P.pale);
  l.line(...t([3, 0]), ...t([27, 0]), P.light);
  for (let k = 0; k < 3; k++) {
    l.line(...t([12 + k * 5, 0]), ...t([14 + k * 5, -3]), P.light);
  }
  l.line(...t([0, 0]), ...t([4, 0]), P.deep);
};

const effect: Effect = (b, f) => {
  const s = popOut(span(f, POP, POP + 4));
  const written = easeInOut(span(f, 0.5, DONE));
  const tapped = f >= TAP;
  const at = transform(CX, CY - 2, 0, s);

  if (s > 0) {
    b.layer(
      (l) => {
        const n = Math.floor(written * SAMPLES);
        const pulse = tapped && f > TAP + 1 ? (f % 2 === 0 ? 3 : 2) : 2;
        const c = f === TAP ? P.white : tapped ? P.light : P.base;
        for (let i = 1; i <= n; i++) {
          l.thickLine(...at(sigil((i - 1) / SAMPLES)), ...at(sigil(i / SAMPLES)), pulse * Math.max(0.5, s), c);
        }
        if (tapped) {
          for (let i = 1; i <= SAMPLES; i++) {
            l.line(...at(sigil((i - 1) / SAMPLES)), ...at(sigil(i / SAMPLES)), P.white);
          }
          l.disc(...at(DOT), 2.5 * s, f === TAP ? P.white : P.pale);
          // Rune ring that snaps into place on the tap.
          const ring = f === TAP ? 1.25 : f === TAP + 1 ? 0.94 : 1;
          const [cx, cy] = at([0, 0]);
          l.ring(cx, cy, 31 * ring * s, 2, f === TAP ? P.white : P.base);
          l.ring(cx, cy, 26 * ring * s, 1, P.light);
          for (let i = 0; i < 6; i++) {
            const a = (i * TAU) / 6 + (f - TAP) * 0.12;
            rune(l, cx + Math.cos(a) * 28.5 * ring * s, cy + Math.sin(a) * 28.5 * ring * s, i, P.pale);
          }
        }
      },
      { outline: f === TAP + 1 ? P.white : P.ink },
    );
  }

  // The quill: pops in, writes, lifts, taps the dot, hops off and
  // vanishes in a sparkle (it never flies out of the card).
  const qs = f < 2 ? ([0.6, 1.15] as number[])[f] : f > TAP ? ([1, 1.15, 0.7, 0.3] as number[])[f - TAP - 1] ?? 0 : 1;
  const [hx, hy] = DOT;
  const hop = (k: number) => [CX + hx + 10 * k, CY - 2 + hy - 22 * k + 8 * k * k] as Point;
  if (qs > 0) {
    let [x, y] = f < DONE ? sigil(Math.min(1, written)) : DOT;
    x += CX;
    y += CY - 2;
    let tilt = 0;
    if (f === DONE) {
      y -= 6; // lift before the tap
      tilt = -0.2;
    }
    if (f === TAP) {
      tilt = 0.12; // pressed down on the dot
    }
    if (f > TAP) {
      [x, y] = hop(easeOut(span(f, TAP, TAP + 4)));
      tilt = -(f - TAP) * 0.5;
    }
    b.layer(
      (l) => {
        quill(l, x, y, tilt, qs);
        if (f > 0 && f < DONE) {
          l.sparkle(x, y, f % 2 ? 2 : 1, P.pale, P.white);
        }
      },
      { outline: P.ink },
    );
  }
  // The quill's little goodbye sparkle.
  const qa = f - (TAP + 4);
  if (qa >= 0 && qa <= 2) {
    const [x, y] = hop(1);
    b.layer((l) => l.sparkle(x + 8, y - 12, ([4, 3, 1] as number[])[qa], P.pale, P.white), { outline: P.ink });
  }

  // Ink glitter drifting down off the fresh line while it's written.
  if (f >= 2 && f <= DONE + 2) {
    b.layer(
      (l) => {
        for (let k = 1; k <= 5; k++) {
          const tt = f - k * 0.8;
          if (tt < 1) {
            continue;
          }
          const [x, y] = sigil(Math.min(1, easeInOut(span(tt, 0.5, DONE))));
          l.set(CX + x + ((k % 2) * 2 - 1), CY - 2 + y + k * 1.6, k < 3 ? P.white : P.pale);
        }
      },
      { outline: P.ink },
    );
  }

  doubleShock(b, CX, CY - 2, f - TAP, P);

  b.layer(
    (l) => {
      // Ink splashing from the tap and bouncing.
      const age = f - TAP;
      if (age >= 0 && age <= 8) {
        for (let i = 0; i < 8; i++) {
          const vx = (i - 3.5) * 0.9;
          const vy = -3 - (i % 3);
          const [x, y] = bouncePosition(CX + DOT[0], CY - 2 + DOT[1], vx, vy, age, CY + 28);
          l.rect(x, y, age < 4 ? 2 : 1, age < 4 ? 2 : 1, i % 2 ? P.base : P.light);
        }
      }
    },
    { outline: P.ink, fade: 1 - span(f, 17, 20) },
  );
  b.layer((l) => finalTwinkle(l, CX, CY - 2, f - (POP + 4), P), { outline: P.ink });
};

export const perseverance = withShake(effect, [[TAP, 1]]);
