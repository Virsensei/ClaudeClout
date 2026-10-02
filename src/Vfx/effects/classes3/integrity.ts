import type { Effect } from "../../PixelCanvas";
import { CX, CY, rand, span } from "../../pixel";
import type { PixelBuffer } from "../../pixel";
import type { Point } from "../classes/shared";
import { ramp, transform } from "../classes/shared";
import { bouncePosition, chunk, doubleShock, finalTwinkle, popOut, withShake } from "./juice";

// Integrity (blue): butterfly. A cocoon hangs and wiggles harder and
// harder, cracks, and bursts: a butterfly flaps out, loops around the card
// leaving sparkle dust, lands with its wings spread, then scatters into a
// swarm of tiny butterflies.

const P = ramp("#0038F4");
const TAU = Math.PI * 2;
const BURST = 5;
const FLY = 7;
const LAND = 15;
const SCATTER = 18;
const ANCHOR_Y = CY - 26;

const cocoon = (l: PixelBuffer, wiggle: number, squash: number, cracked: boolean) => {
  const t = (p: Point): Point => {
    const [x, y] = transform(CX, ANCHOR_Y, wiggle, 1)([p[0] / squash, (p[1] + 12) * squash]);
    return [x, y];
  };
  l.line(CX, ANCHOR_Y - 14, ...t([0, -12]), P.pale);
  l.polygon(([[0, -12], [7, -2], [6, 8], [0, 14], [-6, 8], [-7, -2]] as Point[]).map(t), P.base);
  l.polygon(([[0, -12], [0, 14], [-6, 8], [-7, -2]] as Point[]).map(t), P.light);
  for (const y of [-4, 2, 8]) {
    l.line(...t([-5, y]), ...t([5, y + 1]), P.deep);
  }
  if (cracked) {
    l.line(...t([-1, -8]), ...t([2, -3]), P.white);
    l.line(...t([2, -3]), ...t([-2, 3]), P.white);
    l.line(...t([-2, 3]), ...t([1, 9]), P.white);
  }
};

// The butterfly at (x, y), wings open by `w` (0.15 closed .. 1 open).
const butterfly = (l: PixelBuffer, x: number, y: number, w: number, tilt: number, scale: number, flash: boolean) => {
  const t = transform(x, y, tilt, scale);
  const c = (col: typeof P.base) => (flash ? P.white : col);
  for (const s of [-1, 1]) {
    l.polygon(([[0, -4], [s * 6 * w, -13], [s * 14 * w, -11], [s * 15 * w, -2], [s * 7 * w, 1], [0, 1]] as Point[]).map(t), c(P.base));
    l.polygon(([[0, 1], [s * 9 * w, 2], [s * 11 * w, 9], [s * 5 * w, 12], [0, 6]] as Point[]).map(t), c(P.light));
    if (!flash && w > 0.4) {
      l.disc(...t([s * 9 * w, -6]), 2.2 * w * scale, P.pale);
      l.disc(...t([s * 6 * w, 6]), 1.5 * w * scale, P.base);
      l.line(...t([s * 6 * w, -13]), ...t([s * 14 * w, -11]), P.pale);
    }
  }
  l.thickLine(...t([0, -6]), ...t([0, 8]), 2, c(P.deep));
  l.line(...t([0, -7]), ...t([-3, -12]), c(P.deep));
  l.line(...t([0, -7]), ...t([3, -12]), c(P.deep));
  l.set(...t([-3, -12]), P.pale);
  l.set(...t([3, -12]), P.pale);
};

const flightPath = (f: number): Point => {
  const u = span(f, FLY, LAND) * TAU;
  return [CX + 24 * Math.sin(u), CY - 2 - 14 * Math.sin(2 * u) - 8 * Math.sin(u / 2)];
};

const effect: Effect = (b, f) => {
  // The cocoon wiggling harder before it bursts.
  if (f < BURST) {
    const wiggle = Math.sin(f * 2.4) * 0.06 * (1 + f * 0.8);
    const squash = f === BURST - 1 ? 0.88 : 1;
    b.layer((l) => cocoon(l, wiggle, squash, f >= 3), { outline: P.ink });
    return;
  }

  const age = f - BURST;
  doubleShock(b, CX, CY - 12, age, P, 0.9);

  b.layer(
    (l) => {
      // Cocoon shell pieces flying and bouncing.
      if (age <= 9) {
        for (let i = 0; i < 8; i++) {
          const a = -Math.PI / 2 + (i - 3.5) * 0.55;
          const v = 2.5 + rand(`ic-v-${i}`) * 2.5;
          const [x, y] = bouncePosition(CX, CY - 12, Math.cos(a) * v, Math.sin(a) * v - 1.5, age, CY + 44);
          chunk(l, x, y, age < 4 ? 3 : 2, i % 2 ? P.base : P.light);
        }
      }
      // Sparkle dust left behind along the flight.
      if (f > FLY && f <= LAND + 1) {
        for (let k = 1; k <= 3; k++) {
          const [x, y] = flightPath(f - k * 0.7);
          l.sparkle(x + (k % 2 ? 2 : -2), y + 8, k === 1 ? 2 : 1, P.light, P.white);
        }
      }
    },
    { outline: P.ink },
  );

  // The butterfly.
  if (f < SCATTER + 1) {
    let x = CX;
    let y = CY - 12;
    let w = 0.2 + 0.8 * Math.abs(Math.cos(f * 1.7));
    let tilt = 0;
    let scale = [0.55, 1.2][age] ?? 1;
    if (f >= FLY && f < LAND) {
      [x, y] = flightPath(f);
      const [nx] = flightPath(f + 0.5);
      tilt = (nx - x) * 0.05;
    } else if (f >= LAND) {
      [x, y] = flightPath(LAND);
      w = f === LAND ? 1.15 : 1;
      scale = popOut(span(f, LAND + 1, SCATTER + 1));
    }
    if (scale > 0) {
      b.layer((l) => butterfly(l, x, y, w, tilt, scale, age === 0), {
        outline: age === 1 ? P.white : P.ink,
      });
    }
  }

  // Scatter into tiny butterflies.
  b.layer(
    (l) => {
      const sage = f - SCATTER;
      if (sage >= 0 && sage <= 4) {
        const [x0, y0] = flightPath(LAND);
        for (let i = 0; i < 7; i++) {
          const a = (i * TAU) / 7 - Math.PI / 2;
          const d = 6 + sage * 7;
          const x = x0 + Math.cos(a) * d + Math.sin(sage + i) * 2;
          const y = y0 + Math.sin(a) * d - sage * 2;
          const wing = sage % 2 === 0 ? 3 : 1;
          l.polygon([[x, y], [x - wing, y - 3], [x - wing, y + 1]], P.light);
          l.polygon([[x, y], [x + wing, y - 3], [x + wing, y + 1]], P.light);
          l.set(x, y, P.white);
        }
      }
    },
    { outline: P.ink, fade: 1 - span(f, SCATTER + 2, SCATTER + 5) },
  );

  b.layer((l) => finalTwinkle(l, ...flightPath(LAND), f - (SCATTER + 1), P), { outline: P.ink });
};

export const integrity = withShake(effect, [[BURST, 1]]);
