import { PixelBuffer } from "../../pixel";
import type { RGB } from "../../pixel";
import type { Effect } from "../../PixelCanvas";
import type { Ramp } from "../classes/shared";
import { star4 } from "../classes/shared";

// "Game feel" helpers that make the third set of class spells satisfying:
// screen shake, hit-stop friendly timing, bouncing particles, a pop-out
// exit and a final twinkle.

const SHAKE: [number, number][] = [
  [2, 0],
  [-2, 1],
  [1, -1],
  [-1, 0],
];

// Wraps an effect so the whole thing jolts for a few frames after each
// impact. `impacts` lists [frame, strength] (strength 1 = 2px jolt).
export const withShake =
  (effect: Effect, impacts: [number, number][]): Effect =>
  (b, f) => {
    let dx = 0;
    let dy = 0;
    for (const [at, strength] of impacts) {
      const age = f - at;
      if (age >= 0 && age < SHAKE.length) {
        dx += SHAKE[age][0] * strength;
        dy += SHAKE[age][1] * strength;
      }
    }
    if (dx === 0 && dy === 0) {
      effect(b, f);
      return;
    }
    const stage = new PixelBuffer(b.w, b.h);
    effect(stage, f);
    b.pasteOffset(stage, dx, dy);
  };

// Exit scale: swells a little, then shrinks to nothing (t from 0 to 1).
export const popOut = (t: number) => {
  if (t <= 0) {
    return 1;
  }
  if (t >= 1) {
    return 0;
  }
  return t < 0.3 ? 1 + 0.18 * (t / 0.3) : 1.18 * (1 - (t - 0.3) / 0.7) ** 2;
};

// The last little sparkle left behind when something pops out.
export const finalTwinkle = (l: PixelBuffer, x: number, y: number, age: number, p: Ramp) => {
  const r = [5, 9, 5, 2][age];
  if (r === undefined) {
    return;
  }
  l.polygon(star4(x, y, r, Math.max(1, r * 0.22), age * 0.2), age === 1 ? p.white : p.pale);
  l.set(x, y, p.white);
};

// Two shockwaves: a fast thin one and a slower thick one.
export const doubleShock = (b: PixelBuffer, x: number, y: number, age: number, p: Ramp, size = 1) => {
  if (age >= 0 && age <= 4) {
    const t = age / 4;
    b.ring(x, y, (10 + t * 34) * size, 1, p.white, 1 - t * 0.7);
  }
  if (age >= 0 && age <= 7) {
    const t = age / 7;
    b.ring(x, y, (8 + (1 - (1 - t) ** 3) * 26) * size, 4 - 3 * t, p.pale, 1 - t * 0.85);
  }
};

// A particle thrown with velocity (vx, vy) that falls and bounces on `floor`,
// simulated frame by frame so the bounces land exactly.
export const bouncePosition = (
  x0: number,
  y0: number,
  vx: number,
  vy: number,
  age: number,
  floor: number,
  gravity = 0.9,
): [number, number] => {
  let x = x0;
  let y = y0;
  let sx = vx;
  let sy = vy;
  for (let t = 0; t < age; t++) {
    x += sx;
    y += sy;
    sy += gravity;
    if (y > floor) {
      y = floor;
      sy = -sy * 0.45;
      sx *= 0.65;
    }
  }
  return [x, y];
};

export const chunk = (l: PixelBuffer, x: number, y: number, size: number, c: RGB) =>
  l.rect(x - size / 2, y - size / 2, size, size, c);
