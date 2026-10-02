import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeOut, rand, span } from "../../pixel";
import type { PixelBuffer, RGB } from "../../pixel";
import { ramp, shockwave, stampScale, star } from "./shared";

// Justice (yellow): a crosshair closes in and locks on, then a sheriff-star
// badge spins in and slams down with rays, glints and falling glitter.

const P = ramp("#FFD83D");
const TAU = Math.PI * 2;
const STAMP = 7;

const bracket = (l: PixelBuffer, x: number, y: number, sx: number, sy: number, c: RGB) => {
  l.thickLine(x, y, x + sx * 5, y, 2, c);
  l.thickLine(x, y, x, y + sy * 5, 2, c);
};

const badge = (l: PixelBuffer, scale: number, spin: number, flash: boolean) => {
  const R = 16 * scale;
  l.ring(CX, CY, 20 * scale, 3 * scale, flash ? P.white : P.base);
  star(l, CX, CY, R, spin, flash ? P.white : P.base);
  if (flash) {
    return;
  }
  star(l, CX, CY, R * 0.58, spin, P.light);
  for (let i = 0; i < 5; i++) {
    const a = spin - Math.PI / 2 + (i * TAU) / 5;
    l.disc(CX + Math.cos(a) * R, CY + Math.sin(a) * R, 2 * scale, P.pale);
  }
  l.disc(CX, CY, 2.5, P.white);
};

export const justice: Effect = (b, f) => {
  // Crosshair closing in and blinking when locked.
  if (f < STAMP + 2) {
    const close = easeOut(span(f, -1, 5));
    const d = 34 - 14 * close;
    const spin = (1 - close) * 0.9;
    b.layer(
      (l) => {
        const c = f >= 5 && f % 2 === 1 ? P.pale : P.base;
        for (let i = 0; i < 4; i++) {
          const a = spin + Math.PI / 4 + (i * TAU) / 4;
          bracket(l, CX + Math.cos(a) * d, CY + Math.sin(a) * d, -Math.sign(Math.cos(a)), -Math.sign(Math.sin(a)), c);
        }
        if (f >= 5 && f < STAMP) {
          l.rect(CX - 1, CY - 1, 2, 2, P.white);
        }
      },
      { outline: P.ink, fade: 1 - span(f, STAMP, STAMP + 2) },
    );
  }
  if (f < STAMP) {
    return;
  }

  const age = f - STAMP;
  const fade = 1 - span(f, 16, 21);
  const spin = [1.0, 0.45, 0.15][age] ?? 0;

  // Rays on impact.
  if (age <= 2) {
    b.layer(
      (l) => {
        for (let i = 0; i < 10; i++) {
          const a = (i * TAU) / 10;
          const len = [40, 32, 22][age] * (i % 2 === 0 ? 1 : 0.65);
          l.line(CX, CY, CX + Math.cos(a) * len, CY + Math.sin(a) * len, P.pale);
        }
      },
      { outline: P.ink },
    );
  }

  shockwave(b, CX, CY, age, 16, 34, P.pale);

  // The badge.
  b.layer(
    (l) => {
      badge(l, stampScale(age), spin, age === 0);
      // Shine sweeping across.
      if (age >= 3 && age <= 6) {
        const pos = -30 + ((age - 3) / 3) * 60;
        for (let y = CY - 24; y <= CY + 24; y++) {
          for (let x = CX - 24; x <= CX + 24; x++) {
            const dd = x - CX + (y - CY) * 0.7 - pos;
            if (l.has(x, y) && Math.abs(dd) < 2.5) {
              l.set(x, y, Math.abs(dd) < 1.2 ? P.white : P.pale);
            }
          }
        }
      }
      if (age >= 4 && age <= 8) {
        const a = -Math.PI / 2 + ((age - 4) * TAU) / 5;
        l.sparkle(CX + Math.cos(a) * 16, CY + Math.sin(a) * 16, 2, P.pale, P.white);
      }
    },
    { outline: age === 1 ? P.white : P.ink, fade },
  );

  // Glitter bursting out and falling.
  b.layer(
    (l) => {
      for (let i = 0; i < 16; i++) {
        const a = rand(`jg-a-${i}`) * TAU;
        const speed = 3 + rand(`jg-s-${i}`) * 3;
        const life = 6 + rand(`jg-l-${i}`) * 5;
        if (age < 1 || age > life || STAMP + life > 22) {
          continue;
        }
        const x = CX + Math.cos(a) * (14 + speed * age);
        const y = CY + Math.sin(a) * (14 + speed * age) + 0.4 * age * age;
        l.sparkle(x, y, age < 4 ? 2 : 1, P.light, P.white);
      }
    },
    { outline: P.ink },
  );
};
