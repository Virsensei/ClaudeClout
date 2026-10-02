import type { Effect } from "../PixelCanvas";
import { CX, CY, GRID_H, GRID_W, easeOut, hex, rand, span } from "../pixel";
import type { PixelBuffer } from "../pixel";

// Freeze 2: an icy gust blows across the card, frost ferns creep in from the
// corners and edges, icicles grow from the top, then the whole card snaps
// into an ice frame with a crystal emblem, glints, and dissolves into frost.

const C = {
  ink: hex("#0c2238"),
  deep: hex("#2a6fa8"),
  mid: hex("#6cc4f0"),
  light: hex("#b8ecff"),
  pale: hex("#e9fbff"),
  white: hex("#ffffff"),
};

const TAU = Math.PI * 2;
const SNAP = 11;
const INSET = 3;

// A frost fern: a main stem with side branches and tiny twigs, growing out
// from (x, y) along `angle`. `grow` is 0 to 1.
const fern = (
  b: PixelBuffer,
  x: number,
  y: number,
  angle: number,
  length: number,
  grow: number,
  seed: string,
) => {
  const reach = length * grow;
  if (reach <= 0) {
    return;
  }
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  b.line(x, y, x + dx * reach, y + dy * reach, C.pale);
  for (let d = 4, k = 0; d < reach; d += 5, k++) {
    const side = k % 2 === 0 ? 1 : -1;
    const ba = angle + side * (0.9 + rand(`${seed}-b${k}`) * 0.25);
    const bl = Math.min((length - d) * 0.45, (reach - d) * 0.8);
    const bx = x + dx * d;
    const by = y + dy * d;
    const ex = bx + Math.cos(ba) * bl;
    const ey = by + Math.sin(ba) * bl;
    b.line(bx, by, ex, ey, C.light);
    if (bl > 4) {
      const ta = ba - side * 0.9;
      const tx = bx + Math.cos(ba) * bl * 0.5;
      const ty = by + Math.sin(ba) * bl * 0.5;
      b.line(tx, ty, tx + Math.cos(ta) * 2.5, ty + Math.sin(ta) * 2.5, C.mid);
    }
  }
};

const FERNS: [number, number, number, number, number][] = [
  // x, y, angle (degrees), length, delay
  [INSET, INSET, 45, 34, 0],
  [GRID_W - 1 - INSET, INSET, 135, 34, 0.5],
  [INSET, GRID_H - 1 - INSET, -45, 34, 0.3],
  [GRID_W - 1 - INSET, GRID_H - 1 - INSET, -135, 34, 0.8],
  [INSET, CY, 0, 18, 1.5],
  [GRID_W - 1 - INSET, CY, 180, 18, 1.8],
  [CX, GRID_H - 1 - INSET, -90, 16, 2],
];

// x, length, delay
const ICICLES: [number, number, number][] = [
  [12, 12, 0.5],
  [22, 20, 0],
  [31, 10, 1],
  [42, 16, 0.4],
  [55, 24, 0.2],
  [67, 14, 0.8],
  [77, 19, 0.1],
  [88, 11, 0.9],
  [98, 17, 0.6],
];

const icicle = (b: PixelBuffer, x: number, length: number) => {
  const top = INSET + 2;
  b.polygon(
    [
      [x - 3, top],
      [x + 3, top],
      [x, top + length],
    ],
    C.mid,
  );
  b.polygon(
    [
      [x - 3, top],
      [x, top],
      [x, top + length],
    ],
    C.light,
  );
  b.line(x - 1, top + 1, x - 1, top + length * 0.6, C.white);
};

const frame = (b: PixelBuffer, flash: boolean) => {
  const outer = flash ? C.white : C.mid;
  const inner = flash ? C.white : C.light;
  const x0 = INSET;
  const y0 = INSET;
  const x1 = GRID_W - 1 - INSET;
  const y1 = GRID_H - 1 - INSET;
  for (let t = 0; t < 3; t++) {
    const c = t === 1 ? inner : outer;
    b.line(x0 + t, y0 + t, x1 - t, y0 + t, c);
    b.line(x0 + t, y1 - t, x1 - t, y1 - t, c);
    b.line(x0 + t, y0 + t, x0 + t, y1 - t, c);
    b.line(x1 - t, y0 + t, x1 - t, y1 - t, c);
  }
  // Crystal chunks on the corners.
  for (const [cx, cy] of [
    [x0, y0],
    [x1, y0],
    [x0, y1],
    [x1, y1],
  ]) {
    b.polygon(
      [
        [cx, cy - 6],
        [cx + 6, cy],
        [cx, cy + 6],
        [cx - 6, cy],
      ],
      flash ? C.white : C.light,
    );
    b.set(cx - 1, cy - 2, C.white);
    b.set(cx - 2, cy - 1, C.white);
  }
};

const emblem = (b: PixelBuffer, scale: number, flash: boolean) => {
  const r = 18 * scale;
  const arm = flash ? C.white : C.pale;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * TAU) / 6;
    const ex = CX + Math.cos(a) * r;
    const ey = CY + Math.sin(a) * r;
    b.thickLine(CX, CY, ex, ey, 3, arm);
    // Barbs near the tip.
    const mx = CX + Math.cos(a) * r * 0.62;
    const my = CY + Math.sin(a) * r * 0.62;
    for (const side of [-1, 1]) {
      const ba = a + side * 0.75;
      b.thickLine(mx, my, mx + Math.cos(ba) * r * 0.3, my + Math.sin(ba) * r * 0.3, 2, flash ? C.white : C.light);
    }
  }
  // Faceted gem in the middle.
  const g = 6 * scale;
  b.polygon(
    [
      [CX, CY - g],
      [CX + g * 0.8, CY],
      [CX, CY + g],
      [CX - g * 0.8, CY],
    ],
    flash ? C.white : C.mid,
  );
  b.polygon(
    [
      [CX, CY - g],
      [CX, CY],
      [CX - g * 0.8, CY],
    ],
    C.white,
  );
};

export const freeze2: Effect = (b, f) => {
  // Icy gust: streaks and snow blowing left to right.
  if (f <= 7) {
    for (let i = 0; i < 7; i++) {
      const delay = rand(`g-d-${i}`) * 3;
      const y = 14 + rand(`g-y-${i}`) * 98;
      const len = 14 + rand(`g-l-${i}`) * 14;
      const head = -6 + (f + 1 - delay) * 24;
      if (head < 0 || head - len > GRID_W) {
        continue;
      }
      const wave = (x: number) => y + Math.sin(x * 0.08 + i) * 2;
      for (let x = Math.max(0, head - len); x <= Math.min(GRID_W - 1, head); x++) {
        const t = (head - x) / len;
        b.set(x, wave(x), t < 0.3 ? C.white : t < 0.65 ? C.light : C.mid);
      }
    }
    b.layer(
      (l) => {
        for (let i = 0; i < 16; i++) {
          const delay = rand(`sn-d-${i}`) * 4;
          const x = -4 + (f + 1 - delay) * (14 + rand(`sn-s-${i}`) * 8);
          const y = rand(`sn-y-${i}`) * GRID_H + Math.sin(f + i) * 3;
          if (x >= 0 && x < GRID_W) {
            l.set(x, y, i % 3 === 0 ? C.white : C.pale);
          }
        }
      },
      { outline: C.ink },
    );
  }

  // Everything that freezes onto the card; dissolves at the end.
  const iceFade = 1 - span(f, 17, 23);
  b.layer(
    (l) => {
      FERNS.forEach(([x, y, deg, length, delay], i) => {
        const grow = easeOut(span(f, 2 + delay, 10 + delay));
        fern(l, x, y, (deg * Math.PI) / 180, length, grow, `fern-${i}`);
      });

      ICICLES.forEach(([x, length, delay]) => {
        const grow = easeOut(span(f, 7 + delay, 11 + delay));
        if (grow > 0) {
          icicle(l, x, length * grow);
        }
      });

      if (f >= SNAP) {
        frame(l, f === SNAP);
      }

      // Glint sweeping across everything frozen.
      if (f >= 13 && f <= 16) {
        const pos = -20 + span(f, 13, 16) * 260;
        for (let y = 0; y < l.h; y++) {
          for (let x = 0; x < l.w; x++) {
            const d = x + y - pos;
            if (l.has(x, y) && d > -4 && d < 4) {
              l.set(x, y, Math.abs(d) < 2 ? C.white : C.pale);
            }
          }
        }
      }
    },
    { outline: C.ink, fade: iceFade },
  );

  // Crystal emblem snapping in.
  if (f >= SNAP) {
    const age = f - SNAP;
    const scale = [1.4, 0.88, 1.06, 1][Math.min(age, 3)];
    b.layer((l) => emblem(l, scale, age === 0), {
      outline: age === 1 ? C.white : C.ink,
      fade: iceFade,
    });
  }

  // Shockwave when the card snaps frozen.
  if (f >= SNAP && f <= SNAP + 5) {
    const t = (f - SNAP) / 5;
    b.ring(CX, CY, 20 + easeOut(t) * 30, 3 - 2 * t, C.pale, 1 - t * 0.85);
  }

  // Drips falling from the icicle tips.
  b.layer(
    (l) => {
      [
        [22, 20, 13],
        [55, 24, 15],
        [77, 19, 17],
      ].forEach(([x, length, at]) => {
        const t = f - at;
        if (t >= 0 && t <= 5) {
          l.rect(x, INSET + 3 + length + t * t * 1.5, 1, 2, C.pale);
        }
      });
    },
    { outline: C.ink },
  );

  // Frost sparkles rising as it dissolves.
  b.layer(
    (l) => {
      for (let i = 0; i < 18; i++) {
        const born = 16 + rand(`fs-b-${i}`) * 4;
        const t = f - born;
        if (t < 0 || t > 22 - born) {
          continue;
        }
        const onEdge = i % 2 === 0;
        const x = onEdge ? (i % 4 === 0 ? INSET + 2 : GRID_W - INSET - 3) : 10 + rand(`fs-x-${i}`) * 90;
        const y = (onEdge ? 10 + rand(`fs-y-${i}`) * 105 : CY + (rand(`fs-y-${i}`) - 0.5) * 40) - t * 2;
        l.sparkle(x, y, [1, 2, 1, 1][Math.floor(t)] ?? 1, C.light, C.white);
      }
    },
    { outline: C.ink },
  );
};
