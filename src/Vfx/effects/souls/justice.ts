import type { Effect } from "../../PixelCanvas";
import { CX, easeOut, rand, span } from "../../pixel";
import type { PixelBuffer, RGB } from "../../pixel";
import { ramp, soul, star } from "./shared";

// Justice (yellow): a crosshair locks onto a target, the upside-down SOUL
// fires three shots, and the last one lands as a big spinning star.

const P = ramp("#FFD83D");
const TAU = Math.PI * 2;
const TARGET_Y = 34;
const HEART_Y = 96;
const SHOTS = [6, 8, 10];
const TRAVEL = 2;
const FINAL = SHOTS[SHOTS.length - 1] + TRAVEL;

const bracket = (l: PixelBuffer, x: number, y: number, sx: number, sy: number, c: RGB) => {
  l.thickLine(x, y, x + sx * 4, y, 2, c);
  l.thickLine(x, y, x, y + sy * 4, 2, c);
};

export const justice: Effect = (b, f) => {
  const fade = 1 - span(f, 15, 20);
  const shake = SHOTS.some((s) => f === s + TRAVEL) ? (f % 2 ? 1 : -1) : 0;

  // Crosshair closing in and locking on.
  if (f < 20) {
    const close = easeOut(span(f, -1, 5));
    const d = 32 - 18 * close;
    const spin = (1 - close) * 0.9;
    const locked = f >= 5;
    b.layer(
      (l) => {
        const c = locked && f % 2 === 1 ? P.pale : P.base;
        for (let i = 0; i < 4; i++) {
          const a = spin + Math.PI / 4 + (i * TAU) / 4;
          const x = CX + shake + Math.cos(a) * d;
          const y = TARGET_Y + Math.sin(a) * d;
          bracket(l, x, y, -Math.sign(Math.cos(a)), -Math.sign(Math.sin(a)), c);
        }
        if (locked) {
          l.rect(CX + shake - 1, TARGET_Y - 1, 2, 2, P.white);
        }
      },
      { outline: P.ink, fade: Math.min(fade, 1 - span(f, FINAL, FINAL + 3)) },
    );
  }

  // Aim line flickers on just before the first shot.
  if (f >= 4 && f < SHOTS[0]) {
    b.line(CX, HEART_Y - 13, CX, TARGET_Y + 10, P.light, 0.4);
  }

  // The SOUL, upside down, recoiling on each shot.
  const recoil = SHOTS.some((s) => s === f) ? 2 : 0;
  b.layer((l) => soul(l, CX, HEART_Y + recoil, 8 * easeOut(span(f, -1, 3)), P, { flip: true }), {
    outline: P.ink,
    fade,
  });

  b.layer(
    (l) => {
      SHOTS.forEach((s, k) => {
        // Muzzle flash.
        if (f === s) {
          l.sparkle(CX, HEART_Y - 12, 3, P.pale, P.white);
        }
        // Bullet in flight.
        const t = span(f, s, s + TRAVEL);
        if (f >= s && f < s + TRAVEL) {
          const y = HEART_Y - 13 - (HEART_Y - 13 - TARGET_Y) * t;
          l.rect(CX - 1, y - 4, 2, 7, P.white);
          l.rect(CX - 1, y + 3, 2, 6, P.light);
        }
        // Small star bursts for the first shots.
        const age = f - (s + TRAVEL);
        if (k < SHOTS.length - 1 && age >= 0 && age <= 3) {
          star(l, CX, TARGET_Y, [6, 8, 5, 2][age], age * 0.4, P.light);
          for (let i = 0; i < 5; i++) {
            const a = (i * TAU) / 5 + k;
            const dist = 6 + age * 4;
            l.rect(CX + Math.cos(a) * dist, TARGET_Y + Math.sin(a) * dist, 2, 2, P.pale);
          }
        }
      });
    },
    { outline: P.ink },
  );

  if (f < FINAL) {
    return;
  }
  const age = f - FINAL;

  // Final hit: a big spinning star with rays and a shockwave.
  if (age <= 6) {
    const t = age / 6;
    b.ring(CX, TARGET_Y, 10 + easeOut(t) * 30, 3 - 2 * t, P.pale, 1 - t * 0.85);
  }
  b.layer(
    (l) => {
      if (age <= 2) {
        for (let i = 0; i < 8; i++) {
          const a = (i * TAU) / 8;
          const len = [30, 24, 14][age];
          l.line(CX, TARGET_Y, CX + Math.cos(a) * len, TARGET_Y + Math.sin(a) * len, P.pale);
        }
      }
      const r = [17, 15, 14, 13, 11, 9, 7, 5, 3, 1][age] ?? 0;
      if (r > 0) {
        const spin = age * 0.35;
        star(l, CX, TARGET_Y, r, spin, age === 0 ? P.white : P.base);
        star(l, CX, TARGET_Y, r * 0.55, spin, age === 0 ? P.white : P.light);
        l.set(CX, TARGET_Y, P.white);
      }
    },
    { outline: P.ink },
  );

  // Glitter falling from the hit.
  b.layer(
    (l) => {
      for (let i = 0; i < 14; i++) {
        const a = rand(`j-a-${i}`) * TAU;
        const speed = 3 + rand(`j-s-${i}`) * 3;
        const life = 5 + rand(`j-l-${i}`) * 4;
        if (age < 1 || age > life || FINAL + life > 22) {
          continue;
        }
        const x = CX + Math.cos(a) * speed * age;
        const y = TARGET_Y + Math.sin(a) * speed * age + 0.45 * age * age;
        l.sparkle(x, y, age < 3 ? 2 : 1, P.light, P.white);
      }
    },
    { outline: P.ink },
  );
};
