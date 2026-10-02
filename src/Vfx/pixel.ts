import { random } from "remotion";

// Pixel-art drawing on a small grid. Every pixel is either fully opaque or
// fully transparent (1-bit alpha), so the effects stay crisp and also export
// cleanly to GIF. Fades are done with ordered dithering instead of opacity.

export const SCALE = 2;
export const GRID_W = 110; // 220px / SCALE
export const GRID_H = 125; // 250px / SCALE
export const CX = 55;
export const CY = 62;

export type RGB = readonly [number, number, number];

export const hex = (value: string): RGB => {
  const n = parseInt(value.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// 4x4 Bayer matrix for ordered dithering.
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const passesDither = (x: number, y: number, level: number) =>
  level >= 1 || (level > 0 && (BAYER[y & 3][x & 3] + 0.5) / 16 < level);

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// Progress 0→1 between frames `from` and `to`.
export const span = (frame: number, from: number, to: number) =>
  clamp01((frame - from) / (to - from));

export const easeOut = (t: number) => 1 - (1 - t) ** 3;
export const easeIn = (t: number) => t ** 2;
export const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;

export const rand = (seed: string) => random(seed);

export class PixelBuffer {
  readonly data: Uint8ClampedArray<ArrayBuffer>;

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.data = new Uint8ClampedArray(new ArrayBuffer(w * h * 4));
  }

  set(x: number, y: number, c: RGB, level = 1) {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || py < 0 || px >= this.w || py >= this.h) {
      return;
    }
    if (!passesDither(px, py, level)) {
      return;
    }
    const i = (py * this.w + px) * 4;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
    this.data[i + 3] = 255;
  }

  has(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) {
      return false;
    }
    return this.data[(y * this.w + x) * 4 + 3] > 0;
  }

  clear(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) {
      return;
    }
    this.data[(y * this.w + x) * 4 + 3] = 0;
  }

  rect(x: number, y: number, w: number, h: number, c: RGB, level = 1) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        this.set(Math.round(x) + i, Math.round(y) + j, c, level);
      }
    }
  }

  disc(cx: number, cy: number, r: number, c: RGB, level = 1) {
    if (r <= 0) {
      return;
    }
    const R = Math.ceil(r);
    for (let y = -R; y <= R; y++) {
      for (let x = -R; x <= R; x++) {
        if (x * x + y * y <= r * r) {
          this.set(Math.round(cx) + x, Math.round(cy) + y, c, level);
        }
      }
    }
  }

  // Ring between radius r - t/2 and r + t/2. Optional angular window
  // [from, to] in radians (0 = right, clockwise because y points down).
  ring(
    cx: number,
    cy: number,
    r: number,
    t: number,
    c: RGB,
    level = 1,
    from = -Infinity,
    to = Infinity,
  ) {
    if (r <= 0) {
      return;
    }
    const inner = Math.max(0, r - t / 2);
    const outer = r + t / 2;
    const R = Math.ceil(outer);
    const icx = Math.round(cx);
    const icy = Math.round(cy);
    for (let y = -R; y <= R; y++) {
      for (let x = -R; x <= R; x++) {
        const d = Math.sqrt(x * x + y * y);
        if (d < inner || d >= outer) {
          continue;
        }
        if (from !== -Infinity) {
          const a = angleIn(Math.atan2(y, x), from);
          if (a > to) {
            continue;
          }
        }
        this.set(icx + x, icy + y, c, level);
      }
    }
  }

  // Flattened ring (ellipse outline), e.g. a shockwave on the ground.
  ellipseRing(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    t: number,
    c: RGB,
    level = 1,
  ) {
    if (rx <= 0 || ry <= 0) {
      return;
    }
    const half = t / 2 / rx;
    const RX = Math.ceil(rx + t);
    const RY = Math.ceil(ry + t);
    for (let y = -RY; y <= RY; y++) {
      for (let x = -RX; x <= RX; x++) {
        const d = Math.sqrt((x / rx) ** 2 + (y / ry) ** 2);
        if (Math.abs(d - 1) < half) {
          this.set(Math.round(cx) + x, Math.round(cy) + y, c, level);
        }
      }
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: RGB, level = 1) {
    let ax = Math.round(x0);
    let ay = Math.round(y0);
    const bx = Math.round(x1);
    const by = Math.round(y1);
    const dx = Math.abs(bx - ax);
    const dy = -Math.abs(by - ay);
    const sx = ax < bx ? 1 : -1;
    const sy = ay < by ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(ax, ay, c, level);
      if (ax === bx && ay === by) {
        break;
      }
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        ax += sx;
      }
      if (e2 <= dx) {
        err += dx;
        ay += sy;
      }
    }
  }

  thickLine(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    thickness: number,
    c: RGB,
  ) {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, thickness / 2, c);
    }
  }

  polygon(points: [number, number][], c: RGB, level = 1) {
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const minX = Math.floor(Math.min(...xs));
    const maxX = Math.ceil(Math.max(...xs));
    const minY = Math.floor(Math.min(...ys));
    const maxY = Math.ceil(Math.max(...ys));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (insidePolygon(x + 0.5, y + 0.5, points)) {
          this.set(x, y, c, level);
        }
      }
    }
  }

  // Classic pixel "twinkle": a plus shape with a bright core.
  sparkle(x: number, y: number, size: number, arm: RGB, core: RGB) {
    const px = Math.round(x);
    const py = Math.round(y);
    for (let i = 1; i <= size; i++) {
      this.set(px + i, py, arm);
      this.set(px - i, py, arm);
      this.set(px, py + i, arm);
      this.set(px, py - i, arm);
    }
    if (size >= 3) {
      this.set(px + 1, py + 1, arm);
      this.set(px - 1, py - 1, arm);
      this.set(px + 1, py - 1, arm);
      this.set(px - 1, py + 1, arm);
    }
    this.set(px, py, core);
  }

  // Adds a 1px outline around everything drawn so far, so the effect reads
  // on top of any card art.
  outline(c: RGB) {
    const edge: number[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.has(x, y)) {
          continue;
        }
        if (
          this.has(x + 1, y) ||
          this.has(x - 1, y) ||
          this.has(x, y + 1) ||
          this.has(x, y - 1)
        ) {
          edge.push(x, y);
        }
      }
    }
    for (let i = 0; i < edge.length; i += 2) {
      this.set(edge[i], edge[i + 1], c);
    }
  }

  // Copies every opaque pixel of `other` on top of this buffer.
  paste(other: PixelBuffer) {
    for (let i = 0; i < this.data.length; i += 4) {
      if (other.data[i + 3] > 0) {
        this.data[i] = other.data[i];
        this.data[i + 1] = other.data[i + 1];
        this.data[i + 2] = other.data[i + 2];
        this.data[i + 3] = 255;
      }
    }
  }

  // Draws `fn` on its own layer, optionally outlines and dither-fades it,
  // then puts it on top of this buffer.
  layer(
    fn: (layer: PixelBuffer) => void,
    options: { outline?: RGB; fade?: number } = {},
  ) {
    const layer = new PixelBuffer(this.w, this.h);
    fn(layer);
    if (options.outline) {
      layer.outline(options.outline);
    }
    if (options.fade !== undefined) {
      layer.fade(options.fade);
    }
    this.paste(layer);
  }

  // Ordered-dither fade of everything drawn so far (level 1 = keep all).
  fade(level: number) {
    if (level >= 1) {
      return;
    }
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (!passesDither(x, y, level)) {
          this.clear(x, y);
        }
      }
    }
  }
}

// Angle `a` expressed in the range [from, from + 2π).
const angleIn = (a: number, from: number) => {
  let v = a;
  while (v < from) {
    v += Math.PI * 2;
  }
  while (v >= from + Math.PI * 2) {
    v -= Math.PI * 2;
  }
  return v;
};

const insidePolygon = (x: number, y: number, pts: [number, number][]) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
};
