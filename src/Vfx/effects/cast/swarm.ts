import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeInOut, easeOut, rand, span } from "../../pixel";
import type { PixelBuffer, RGB } from "../../pixel";
import type { Point } from "../classes/shared";
import { ramp, transform } from "../classes/shared";
import { finalTwinkle, withShake } from "../classes3/juice";

// Cast, "Butterfly Swarm" (Integrity): little butterflies flutter in from
// all around the card on spiral paths and settle into a turning ring, their
// wings falling into sync; then all open at once (flash, fine rays, soft
// bloom) and they spiral out and stream up out of the card, leaving glitter.

const TAU = Math.PI * 2;
const COUNT = 12;
const SYNC = 8;
const RING = 24;

// A tiny butterfly; `w` is how open the wings are (0.3 .. 1).
const tiny = (l: PixelBuffer, x: number, y: number, w: number, tilt: number, wing: RGB, accent: RGB, body: RGB) => {
  const t = transform(x, y, tilt, 1);
  for (const s of [-1, 1]) {
    l.polygon(([[0, -1], [s * 3 * w, -4.5], [s * 5.5 * w, -3], [s * 4 * w, 0], [0, 0.5]] as Point[]).map(t), wing);
    l.polygon(([[0, 0], [s * 3.5 * w, 1], [s * 2.5 * w, 3.5], [0, 2]] as Point[]).map(t), accent);
  }
  l.line(...t([0, -2]), ...t([0, 2]), body);
};

export const castSwarm = (hex: string): Effect => {
  const P = ramp(hex);

  // Each butterfly's position, wing openness and tilt at frame f.
  const state = (i: number, f: number): [number, number, number, number] => {
    const seat = (i * TAU) / COUNT;
    const flutter = 0.35 + 0.65 * Math.abs(Math.sin(f * 1.5 + (f < 5 ? i * 1.3 : 0)));
    if (f < SYNC) {
      // Spiralling in towards a seat on the turning ring.
      const delay = rand(`sw-d-${i}`) * 1.5;
      const e = easeInOut(span(f, -1 + delay, 6 + delay * 0.4));
      const start = seat + 1.6 + rand(`sw-a-${i}`) * 0.6;
      const ring = RING - (f >= 6 ? (f - 5) * 1 : 0);
      const turn = f * 0.1;
      const r = 50 * (1 - e) + ring * e;
      const a = start + (seat + turn - start) * e;
      return [CX + Math.cos(a) * r, CY + Math.sin(a) * r * 1.1, flutter, Math.sin(f + i) * 0.2];
    }
    if (f === SYNC || f === SYNC + 1) {
      const a = seat + SYNC * 0.1;
      const r = f === SYNC ? RING + 2 : RING;
      return [CX + Math.cos(a) * r, CY + Math.sin(a) * r * 1.1, f === SYNC ? 1.15 : 1, 0];
    }
    // Spiralling out, then curling up and away out of the card.
    const age = f - SYNC - 1;
    const a = seat + SYNC * 0.1 + age * 0.18;
    const r = RING + easeOut(span(age, 0, 6)) * 12;
    const lift = age * age * 1.0 + age * 2.2;
    const sway = Math.sin(age * 0.9 + i) * 3;
    return [CX + Math.cos(a) * r + sway, CY + Math.sin(a) * r * 1.1 - lift, flutter, Math.sin(age + i) * 0.3];
  };

  const effect: Effect = (b, f) => {
    const age = f - SYNC;

    // The ring the swarm settles on, drawn faintly while they gather.
    if (f >= 3 && f <= SYNC) {
      b.ring(CX, CY, RING - (f >= 6 ? (f - 5) * 1 : 0), 1, f === SYNC ? P.white : P.light, f === SYNC ? 1 : 0.35 + (f - 3) * 0.08);
    }

    // The moment they all open: fine rays and a soft bloom.
    if (age >= 0 && age <= 3) {
      b.layer(
        (l) => {
          for (let i = 0; i < 16; i++) {
            const a = (i * TAU) / 16 + 0.1;
            const len = ([50, 44, 34, 22] as number[])[age] * (i % 2 === 0 ? 1 : 0.7);
            l.line(CX + Math.cos(a) * 8, CY + Math.sin(a) * 8, CX + Math.cos(a) * len, CY + Math.sin(a) * len, age === 0 ? P.white : P.pale, age < 2 ? 1 : 0.6);
          }
          l.disc(CX, CY, ([6, 4, 2, 1] as number[])[age], P.white);
        },
        { outline: P.ink },
      );
    }
    if (age >= 0 && age <= 6) {
      const t = age / 6;
      b.ring(CX, CY, RING + 6 + easeOut(t) * 26, 2 - t, P.pale, 1 - t * 0.85);
    }

    // Glitter left behind each butterfly.
    b.layer(
      (l) => {
        for (let i = 0; i < COUNT; i++) {
          for (let k = 1; k <= 2; k++) {
            const tf = f - k * 0.6;
            if (tf < 0 || (f + i + k) % 2 === 0) {
              continue;
            }
            const [x, y] = state(i, tf);
            if (y < -4) {
              continue;
            }
            l.set(x + (k === 1 ? 1 : -1), y + 3, k === 1 ? P.pale : P.light);
          }
        }
      },
      { fade: 1 - span(f, 18, 21) },
    );

    // The butterflies.
    b.layer(
      (l) => {
        for (let i = 0; i < COUNT; i++) {
          const [x, y, w, tilt] = state(i, f);
          if (y < -8) {
            continue;
          }
          const flash = age === 0;
          const wing = flash ? P.white : i % 3 === 0 ? P.light : P.base;
          const accent = flash ? P.white : i % 3 === 0 ? P.pale : P.light;
          tiny(l, x, y, w, tilt, wing, accent, flash ? P.pale : P.deep);
          if (!flash && w > 0.8 && (f + i) % 4 === 0) {
            l.set(x - 3 * w, y - 3, P.white);
            l.set(x + 3 * w, y - 3, P.white);
          }
        }
      },
      { outline: age === 1 ? P.white : P.ink, fade: 1 - span(f, 19, 22) },
    );

    b.layer((l) => finalTwinkle(l, CX, 14, f - 19, P), { outline: P.ink });
  };

  return withShake(effect, [[SYNC, 0.5]]);
};
