import { easeOut, rand } from "../../pixel";
import type { PixelBuffer, RGB } from "../../pixel";
import type { Ramp } from "../souls/shared";

// Shared pieces for the emblem-style class spells: the stamp "punch",
// shockwaves, debris, rising sparkles, runes and point transforms.

export { plus, ramp, star } from "../souls/shared";
export type { Ramp } from "../souls/shared";

// Scale for an emblem that slams in: overshoot, squash back, settle.
export const stampScale = (age: number) => [1.5, 0.86, 1.06, 1][Math.min(Math.max(age, 0), 3)];

// Expanding ring that thins and dithers out over `frames`.
export const shockwave = (
  b: PixelBuffer,
  x: number,
  y: number,
  age: number,
  from: number,
  grow: number,
  c: RGB,
  frames = 6,
) => {
  if (age < 0 || age > frames) {
    return;
  }
  const t = age / frames;
  b.ring(x, y, from + easeOut(t) * grow, 3 - 2 * t, c, 1 - t * 0.85);
};

// Chips knocked loose by an impact, flying out and falling.
export const debris = (
  l: PixelBuffer,
  x: number,
  y: number,
  age: number,
  colors: RGB[],
  seed: string,
  count = 12,
  frames = 6,
) => {
  if (age < 0 || age > frames) {
    return;
  }
  for (let i = 0; i < count; i++) {
    const a = rand(`${seed}-a-${i}`) * Math.PI * 2;
    const speed = 3 + rand(`${seed}-s-${i}`) * 3;
    const d = 12 + speed * age;
    const size = age > 3 ? 1 : 2;
    l.rect(x + Math.cos(a) * d, y + Math.sin(a) * d + 0.3 * age * age, size, size, colors[i % colors.length]);
  }
};

// Sparkles rising and twinkling out, all gone by frame 22.
export const risingSparkles = (
  l: PixelBuffer,
  f: number,
  from: number,
  x: number,
  y: number,
  spreadX: number,
  spreadY: number,
  p: Ramp,
  seed: string,
  count = 12,
) => {
  for (let i = 0; i < count; i++) {
    const born = from + rand(`${seed}-b-${i}`) * 4;
    const t = f - born;
    if (t < 0 || t > Math.min(5, 22 - born)) {
      continue;
    }
    const sx = x + (rand(`${seed}-x-${i}`) - 0.5) * spreadX;
    const sy = y + (rand(`${seed}-y-${i}`) - 0.5) * spreadY - t * 2;
    l.sparkle(sx, sy, [1, 2, 2, 1, 1, 1][Math.floor(t)] ?? 1, p.light, p.white);
  }
};

const RUNES = [
  ["X.X", ".X.", "X.X"],
  [".X.", "XXX", ".X."],
  ["XX.", ".X.", ".XX"],
  ["X..", "XXX", "..X"],
  ["XXX", "X.X", "..X"],
  [".XX", "X..", "XX."],
];

export const rune = (b: PixelBuffer, x: number, y: number, index: number, c: RGB) => {
  RUNES[index % RUNES.length].forEach((row, j) =>
    [...row].forEach((cell, i) => {
      if (cell === "X") {
        b.set(Math.round(x) - 1 + i, Math.round(y) - 1 + j, c);
      }
    }),
  );
};

export type Point = [number, number];

// Rotates and scales points around (cx, cy).
export const transform =
  (cx: number, cy: number, angle: number, scale: number) =>
  ([x, y]: Point): Point => [
    cx + (x * Math.cos(angle) - y * Math.sin(angle)) * scale,
    cy + (x * Math.sin(angle) + y * Math.cos(angle)) * scale,
  ];

// Four-pointed star (save-point twinkle) as a polygon.
export const star4 = (cx: number, cy: number, r: number, inner: number, angle = 0): Point[] => {
  const pts: Point[] = [];
  for (let i = 0; i < 8; i++) {
    const a = angle - Math.PI / 2 + (i * Math.PI) / 4;
    const rr = i % 2 === 0 ? r : inner;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return pts;
};
