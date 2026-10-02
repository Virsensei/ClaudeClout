import { hex, rand } from "../../pixel";
import type { PixelBuffer, RGB } from "../../pixel";

// Shared pieces for the energy-flow class spells: a rich colour ramp from
// one class colour, glowing trails that follow a path, curves and lightning.

const mix = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

const BLACK: RGB = [0, 0, 0];
const WHITE: RGB = [255, 255, 255];

export type Palette = {
  ink: RGB; // outline
  deep: RGB;
  dim: RGB;
  base: RGB; // the class colour itself
  hot: RGB;
  light: RGB;
  pale: RGB;
  white: RGB;
  // Hottest to coolest, for trails: head first.
  trail: RGB[];
};

export const palette = (classColor: string): Palette => {
  const c = hex(classColor);
  const p = {
    ink: mix(c, BLACK, 0.86),
    deep: mix(c, BLACK, 0.55),
    dim: mix(c, BLACK, 0.28),
    base: c,
    hot: mix(c, WHITE, 0.25),
    light: mix(c, WHITE, 0.5),
    pale: mix(c, WHITE, 0.78),
    white: WHITE,
  };
  return { ...p, trail: [p.white, p.pale, p.light, p.hot, p.base, p.dim, p.deep] };
};

export type Path = (t: number) => [number, number] | null;

// A glowing trail along `path`, with its head at time `t` and its tail
// `length` time units behind. It tapers from `width` at the head to 1px,
// running through the palette from white-hot to deep.
export const trail = (
  b: PixelBuffer,
  path: Path,
  t: number,
  length: number,
  width: number,
  colors: RGB[],
  steps = 12,
) => {
  for (let k = steps - 1; k >= 0; k--) {
    const t0 = t - (length * k) / steps;
    const t1 = t - (length * (k + 1)) / steps;
    const p0 = path(t0);
    const p1 = path(t1);
    if (!p0 || !p1) {
      continue;
    }
    const along = k / steps;
    const w = Math.max(1, width * (1 - along * 0.8));
    const c = colors[Math.min(colors.length - 1, Math.floor(along * colors.length))];
    if (w <= 1.2) {
      b.line(p1[0], p1[1], p0[0], p0[1], c);
    } else {
      b.thickLine(p1[0], p1[1], p0[0], p0[1], w, c);
    }
  }
};

// Quadratic Bezier curve through control point (cx, cy).
export const bezier =
  (x0: number, y0: number, cx: number, cy: number, x1: number, y1: number): Path =>
  (t) => {
    if (t < 0 || t > 1) {
      return null;
    }
    const u = 1 - t;
    return [u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1];
  };

// A jagged lightning bolt from (x0, y0) to (x1, y1). Change `seed` every
// frame to make it crackle. `reach` (0 to 1) grows it from the start.
export const lightning = (
  b: PixelBuffer,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  seed: string,
  glow: RGB,
  core: RGB,
  reach = 1,
  jag = 5,
  glowWidth = 3,
) => {
  const segments = 7;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const pts: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * reach;
    const off = i === 0 || (i === segments && reach >= 1) ? 0 : (rand(`${seed}-${i}`) - 0.5) * 2 * jag;
    pts.push([x0 + dx * t + nx * off, y0 + dy * t + ny * off]);
  }
  for (let i = 0; i < segments; i++) {
    if (glowWidth > 1) {
      b.thickLine(...pts[i], ...pts[i + 1], glowWidth, glow);
    }
  }
  for (let i = 0; i < segments; i++) {
    b.line(...pts[i], ...pts[i + 1], core);
  }
  return pts;
};

// Layered glowing orb.
export const orb = (b: PixelBuffer, x: number, y: number, r: number, p: Palette) => {
  if (r <= 0) {
    return;
  }
  b.disc(x, y, r + 2, p.base);
  b.disc(x, y, r, p.light);
  b.disc(x, y, Math.max(1, r - 2.5), p.white);
};
