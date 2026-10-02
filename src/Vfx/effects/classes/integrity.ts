import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeIn, easeOut, span } from "../../pixel";
import type { PixelBuffer } from "../../pixel";
import type { Point } from "./shared";
import { debris, ramp, risingSparkles, shockwave, stampScale, transform } from "./shared";

// Integrity (blue): the card frame draws itself in, four crystal shards
// fly in from the corners and snap together into a big faceted gem, a
// glint runs across it, and frame and gem dissolve.

const P = ramp("#0038F4");
const SNAP = 9;
const CARD = { x0: 15, y0: 4, x1: 94, y1: 121 };
const CORNERS: Point[] = [
  [CARD.x0, CARD.y0],
  [CARD.x1, CARD.y0],
  [CARD.x1, CARD.y1],
  [CARD.x0, CARD.y1],
];

// Gem outline (relative to its centre).
const TABLE_L: Point = [-9, -12];
const TABLE_R: Point = [9, -12];
const GIRDLE_L: Point = [-16, -4];
const GIRDLE_R: Point = [16, -4];
const CULET: Point = [0, 18];

const gem = (l: PixelBuffer, scale: number, flash: boolean) => {
  const t = transform(CX, CY, 0, scale);
  const fill = (pts: Point[], c: typeof P.base) => l.polygon(pts.map(t), flash ? P.white : c);
  fill([TABLE_L, TABLE_R, GIRDLE_R, CULET, GIRDLE_L], P.base);
  fill([GIRDLE_L, [0, -4], CULET], P.light);
  fill([TABLE_L, [-3, -4], GIRDLE_L], P.light);
  fill([TABLE_L, TABLE_R, [3, -4], [-3, -4]], P.pale);
  if (!flash) {
    l.line(...t(GIRDLE_L), ...t(GIRDLE_R), P.pale);
    l.line(...t([0, -4]), ...t(CULET), P.deep);
    l.line(...t(TABLE_R), ...t([3, -4]), P.deep);
    l.set(...t([-5, -9]), P.white);
  }
};

const shard = (l: PixelBuffer, x: number, y: number, angle: number) => {
  const t = transform(x, y, angle, 1);
  l.polygon(
    ([
      [0, -6],
      [4, 0],
      [0, 6],
      [-4, 0],
    ] as Point[]).map(t),
    P.light,
  );
  l.polygon(
    ([
      [0, -6],
      [0, 0],
      [-4, 0],
    ] as Point[]).map(t),
    P.pale,
  );
};

export const integrity: Effect = (b, f) => {
  const fade = 1 - span(f, 17, 22);

  // The frame, drawn clockwise from every corner at once.
  b.layer(
    (l) => {
      const p = easeOut(span(f, -1, 5));
      const flash = f === SNAP;
      for (let i = 0; i < 4; i++) {
        const [x0, y0] = CORNERS[i];
        const [x1, y1] = CORNERS[(i + 1) % 4];
        const xe = x0 + (x1 - x0) * p;
        const ye = y0 + (y1 - y0) * p;
        const inX = i === 1 ? -1 : i === 3 ? 1 : 0;
        const inY = i === 0 ? 1 : i === 2 ? -1 : 0;
        for (let k = 0; k < 3; k++) {
          const c = flash ? P.white : k === 1 ? P.light : P.base;
          l.line(x0 + inX * k, y0 + inY * k, xe + inX * k, ye + inY * k, c);
        }
      }
      CORNERS.forEach(([x, y]) => {
        const cx = x + (x === CARD.x0 ? 1 : -1);
        const cy = y + (y === CARD.y0 ? 1 : -2);
        l.polygon(
          [
            [cx, cy - 4],
            [cx + 4, cy],
            [cx, cy + 4],
            [cx - 4, cy],
          ],
          flash ? P.white : P.light,
        );
        l.set(cx - 1, cy - 1, P.white);
      });
    },
    { outline: P.ink, fade },
  );

  // Shards flying in from the corners.
  if (f < SNAP) {
    b.layer(
      (l) => {
        CORNERS.forEach(([x, y], i) => {
          const t = easeIn(span(f, 0.5 + i * 0.4, SNAP));
          const sx = x + (x === CARD.x0 ? 8 : -8);
          const sy = y + (y === CARD.y0 ? 8 : -8);
          const ex = CX + (x === CARD.x0 ? -5 : 5);
          const ey = CY + (y === CARD.y0 ? -5 : 5);
          if (t <= 0) {
            return;
          }
          for (let k = 2; k >= 0; k--) {
            const tt = Math.max(0, t - k * 0.06);
            const px = sx + (ex - sx) * tt;
            const py = sy + (ey - sy) * tt;
            if (k === 0) {
              shard(l, px, py, f * 0.6 + i);
            } else {
              l.rect(px, py, 2, 2, P.light, 0.6 - k * 0.2);
            }
          }
        });
      },
      { outline: P.ink },
    );
    return;
  }

  const age = f - SNAP;

  // The gem snapping together.
  b.layer(
    (l) => {
      gem(l, stampScale(age), age === 0);
      // Glint sweeping across it.
      if (age >= 2 && age <= 5) {
        const pos = -30 + ((age - 2) / 3) * 70;
        for (let y = CY - 20; y <= CY + 22; y++) {
          for (let x = CX - 20; x <= CX + 20; x++) {
            const d = x - CX + (y - CY) * 0.6 - pos;
            if (l.has(x, y) && Math.abs(d) < 2.5) {
              l.set(x, y, Math.abs(d) < 1.2 ? P.white : P.pale);
            }
          }
        }
      }
      if (age >= 3 && age <= 7) {
        const tips: Point[] = [GIRDLE_L, GIRDLE_R, CULET, TABLE_L, TABLE_R];
        const [x, y] = transform(CX, CY, 0, 1)(tips[(age - 3) % tips.length]);
        l.sparkle(x, y, 2, P.pale, P.white);
      }
    },
    { outline: age === 1 ? P.white : P.ink, fade },
  );

  shockwave(b, CX, CY, age, 16, 30, P.pale);
  b.layer(
    (l) => {
      debris(l, CX, CY, age, [P.pale, P.light], "id");
      risingSparkles(l, f, 16, CX, CY, 60, 70, P, "irs", 14);
    },
    { outline: P.ink },
  );
};
