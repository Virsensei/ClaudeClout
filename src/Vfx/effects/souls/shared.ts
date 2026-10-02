import { hex } from "../../pixel";
import type { PixelBuffer, RGB } from "../../pixel";

// Shared pieces for the seven class spells: a colour ramp built from one
// class colour, the SOUL heart, stars and plus signs.

export type Ramp = {
  ink: RGB; // outline
  deep: RGB;
  base: RGB; // the class colour itself
  light: RGB;
  pale: RGB;
  white: RGB;
};

const mix = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

const BLACK: RGB = [0, 0, 0];
const WHITE: RGB = [255, 255, 255];

export const ramp = (classColor: string): Ramp => {
  const c = hex(classColor);
  return {
    ink: mix(c, BLACK, 0.84),
    deep: mix(c, BLACK, 0.45),
    base: c,
    light: mix(c, WHITE, 0.45),
    pale: mix(c, WHITE, 0.78),
    white: WHITE,
  };
};

const insideHeart = (nx: number, ny: number) => {
  const a = nx * nx + ny * ny - 1;
  return a * a * a - nx * nx * ny * ny * ny <= 0;
};

export type HeartOptions = {
  sx?: number; // horizontal stretch (squash and stretch)
  sy?: number; // vertical stretch
  flip?: boolean; // upside down (pointing up)
  level?: number; // dither level
};

// A filled heart. `size` is roughly its half-width in art pixels.
export const heart = (
  b: PixelBuffer,
  cx: number,
  cy: number,
  size: number,
  c: RGB,
  options: HeartOptions = {},
) => {
  if (size <= 0.5) {
    return;
  }
  const sx = size * (options.sx ?? 1);
  const sy = size * (options.sy ?? 1);
  const W = Math.ceil(sx * 1.2) + 1;
  const H = Math.ceil(sy * 1.35) + 1;
  const ox = Math.round(cx);
  const oy = Math.round(cy);
  for (let y = -H; y <= H; y++) {
    for (let x = -W; x <= W; x++) {
      const ny = (options.flip ? y : -y) / sy + 0.12;
      if (insideHeart(x / sx, ny)) {
        b.set(ox + x, oy + y, c, options.level ?? 1);
      }
    }
  }
};

// Heart outline of the given thickness (a heart-shaped ring).
export const heartRing = (
  b: PixelBuffer,
  cx: number,
  cy: number,
  size: number,
  thickness: number,
  c: RGB,
  level = 1,
) => {
  const outer = size;
  const inner = size - thickness;
  const W = Math.ceil(outer * 1.2) + 1;
  const H = Math.ceil(outer * 1.35) + 1;
  const ox = Math.round(cx);
  const oy = Math.round(cy);
  for (let y = -H; y <= H; y++) {
    for (let x = -W; x <= W; x++) {
      const inOuter = insideHeart(x / outer, -y / outer + 0.12);
      const inInner = inner > 0 && insideHeart(x / inner, -y / inner + 0.12);
      if (inOuter && !inInner) {
        b.set(ox + x, oy + y, c, level);
      }
    }
  }
};

// A SOUL heart with a glossy highlight.
export const soul = (
  b: PixelBuffer,
  cx: number,
  cy: number,
  size: number,
  p: Ramp,
  options: HeartOptions & { flash?: boolean } = {},
) => {
  if (options.flash) {
    heart(b, cx, cy, size, p.white, options);
    return;
  }
  heart(b, cx, cy, size, p.base, options);
  if (size >= 3) {
    const dir = options.flip ? 1 : -1;
    const hx = cx - size * 0.5 * (options.sx ?? 1);
    const hy = cy + dir * size * 0.42 * (options.sy ?? 1);
    b.disc(hx, hy, Math.max(1, size * 0.18), p.light);
    b.set(hx - 1, hy + dir * 0, p.white);
  }
};

// Five-pointed star.
export const star = (
  b: PixelBuffer,
  cx: number,
  cy: number,
  r: number,
  rotation: number,
  c: RGB,
) => {
  if (r < 1) {
    b.set(cx, cy, c);
    return;
  }
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = rotation - Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  b.polygon(pts, c);
};

// Plus sign (healing cross) with arms of length `arm`.
export const plus = (b: PixelBuffer, x: number, y: number, arm: number, c: RGB) => {
  const px = Math.round(x);
  const py = Math.round(y);
  b.rect(px - arm, py, arm * 2 + 1, 1, c);
  b.rect(px, py - arm, 1, arm * 2 + 1, c);
};
