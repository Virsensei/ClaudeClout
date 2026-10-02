import type { Effect } from "../../PixelCanvas";
import { CX, easeOut, rand, span } from "../../pixel";
import { heartRing, ramp, soul } from "./shared";

// Bravery (orange): flames erupt, a burning SOUL rises out of them and
// lands a fiery X-slash, then the fire dies down to embers.

const P = ramp("#FF7E2A");
const TAU = Math.PI * 2;
const BASE_Y = 104;
const HEART_Y = 52;
const STRIKE = 11;

const flameHeight = (x: number, f: number) => {
  const grow = easeOut(span(f, -1, 5)) * (1 - span(f, 14, 20));
  const env = 1 - ((x - CX) / 31) ** 2;
  if (env <= 0 || grow <= 0) {
    return 0;
  }
  const flicker = 0.62 + 0.38 * Math.sin(x * 0.7 + f * 1.9) * Math.sin(x * 0.31 - f * 1.3 + 1);
  return 38 * env * grow * flicker;
};

export const bravery: Effect = (b, f) => {
  // Fire.
  b.layer(
    (l) => {
      for (let x = CX - 31; x <= CX + 31; x++) {
        const h = flameHeight(x, f);
        for (let y = 0; y < h; y++) {
          const t = y / h;
          const core = Math.abs(x - CX) < 13 && t < 0.4;
          const c = core ? P.pale : t < 0.6 ? P.light : t < 0.85 ? P.base : P.deep;
          l.set(x, BASE_Y - y, c);
        }
        // Licks of flame breaking off the tips.
        if (h > 6 && (x + f) % 4 === 0) {
          l.set(x, BASE_Y - h - 2 - (f % 3), P.base);
        }
      }
    },
    { outline: P.ink },
  );

  // Embers.
  b.layer(
    (l) => {
      for (let i = 0; i < 16; i++) {
        const born = rand(`b-b-${i}`) * 14;
        const t = f - born;
        if (t < 0 || t > 7 || born + 7 > 22) {
          continue;
        }
        const x = CX + (rand(`b-x-${i}`) - 0.5) * 56 + Math.sin(t + i) * 2;
        const y = BASE_Y - 10 - t * 6;
        l.rect(x, y, t < 4 ? 2 : 1, t < 4 ? 2 : 1, t < 3 ? P.pale : P.light);
      }
    },
    { outline: P.ink },
  );

  // The burning SOUL rising out of the flames.
  if (f >= 3 && f < 21) {
    const y = BASE_Y - 8 - (BASE_Y - 8 - HEART_Y) * easeOut(span(f, 3, 10));
    const punch = f === STRIKE ? 1.35 : f === STRIKE + 1 ? 0.92 : 1;
    const size = 7 * Math.min(1, span(f, 2, 5) * 1.2) * punch;
    b.layer(
      (l) => {
        heartRing(l, CX, y, size + 3, 2, f % 2 === 0 ? P.light : P.pale);
        soul(l, CX, y, size, P, { flash: f === STRIKE });
      },
      { outline: P.ink, fade: 1 - span(f, 16, 21) },
    );
  }

  if (f < STRIKE) {
    return;
  }
  const age = f - STRIKE;

  // X-slash.
  if (age <= 3) {
    const len = [26, 24, 17, 8][age];
    const w = [5, 4, 3, 2][age];
    b.layer(
      (l) => {
        for (const dir of [1, -1]) {
          l.thickLine(CX - len, HEART_Y - len * dir, CX + len, HEART_Y + len * dir, w, P.light);
          l.line(CX - len + 2, HEART_Y - (len - 2) * dir, CX + len - 2, HEART_Y + (len - 2) * dir, P.white);
        }
      },
      { outline: P.deep },
    );
  }

  // Shockwave and sparks from the strike.
  if (age <= 5) {
    const t = age / 5;
    b.ring(CX, HEART_Y, 10 + easeOut(t) * 32, 3 - 2 * t, P.pale, 1 - t * 0.85);
    b.layer(
      (l) => {
        for (let i = 0; i < 10; i++) {
          const a = (i * TAU) / 10 + rand(`bs-a-${i}`) * 0.4;
          const d = 10 + age * (5 + rand(`bs-s-${i}`) * 3);
          l.rect(CX + Math.cos(a) * d, HEART_Y + Math.sin(a) * d + age * age * 0.3, 2, 2, i % 2 ? P.pale : P.base);
        }
      },
      { outline: P.ink },
    );
  }
};
