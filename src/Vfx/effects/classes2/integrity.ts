import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeIn, span } from "../../pixel";
import type { PixelBuffer } from "../../pixel";
import type { Point } from "../classes/shared";
import { debris, ramp, risingSparkles, shockwave } from "../classes/shared";

// Integrity (blue): crown. A crown descends and lands with a thud, its
// jewels light up one by one, royal rays turn behind it, a shine sweeps
// across, and it fades away.

const P = ramp("#0038F4");
const TAU = Math.PI * 2;
const LAND = 6;

const CROWN: Point[] = [
  [-20, 10],
  [20, 10],
  [20, -2],
  [22, -14],
  [12, -4],
  [0, -18],
  [-12, -4],
  [-22, -14],
  [-20, -2],
];
const TIPS: Point[] = [
  [-22, -15],
  [0, -19],
  [22, -15],
];
const BAND_JEWELS: Point[] = [
  [-12, 4],
  [0, 4],
  [12, 4],
];

const crown = (l: PixelBuffer, y: number, sx: number, sy: number, flash: boolean, lit: number) => {
  const t = ([x, yy]: Point): Point => [CX + x * sx, y + yy * sy];
  l.polygon(CROWN.map(t), flash ? P.white : P.base);
  if (flash) {
    return;
  }
  // Lighter left half and the band.
  l.polygon(([[-20, 10], [0, 10], [0, -18], [-12, -4], [-22, -14], [-20, -2]] as Point[]).map(t), P.light);
  l.polygon(([[-20, 1], [20, 1], [20, 8], [-20, 8]] as Point[]).map(t), P.deep);
  l.line(...t([-20, 1]), ...t([20, 1]), P.pale);
  // Jewels: tips then band, lighting up in turn.
  [...TIPS, ...BAND_JEWELS].forEach((p, i) => {
    const [x, yy] = t(p);
    const on = i < lit;
    l.disc(x, yy, i < 3 ? 2.2 : 2, on ? P.white : P.pale);
    if (on && i === lit - 1) {
      l.sparkle(x, yy, 3, P.pale, P.white);
    }
  });
};

export const integrity: Effect = (b, f) => {
  const fade = 1 - span(f, 16, 21);
  const age = f - LAND;

  // Royal rays slowly turning behind the crown.
  if (age >= 1) {
    b.layer(
      (l) => {
        const len = 34 + Math.min(age, 4) * 3;
        for (let i = 0; i < 12; i++) {
          const a = (i * TAU) / 12 + f * 0.05;
          const w = i % 2 === 0 ? 0.11 : 0.06;
          l.polygon(
            [
              [CX, CY],
              [CX + Math.cos(a - w) * len, CY + Math.sin(a - w) * len],
              [CX + Math.cos(a + w) * len, CY + Math.sin(a + w) * len],
            ],
            P.deep,
          );
          l.line(CX, CY, CX + Math.cos(a) * len, CY + Math.sin(a) * len, P.base);
        }
      },
      { fade: Math.min(fade, span(f, LAND, LAND + 3)) },
    );
  }

  // The crown: descending, landing with a squash, then holding.
  const y = f < LAND ? 14 + (CY - 14) * easeIn(span(f, -1, LAND)) : CY;
  const squash: Record<number, [number, number]> = { 0: [1.25, 0.7], 1: [0.92, 1.1], 2: [1.03, 0.97] };
  const [sx, sy] = squash[age] ?? [1, 1];
  const lit = age < 2 ? 0 : Math.min(6, Math.floor((age - 2) * 1.2) + 1);
  b.layer(
    (l) => {
      crown(l, y + (sy < 1 ? 4 : 0), sx, sy, age === 0, lit);
      // Shine sweeping across.
      if (age >= 8 && age <= 10) {
        const pos = -30 + ((age - 8) / 2) * 60;
        for (let yy = CY - 22; yy <= CY + 12; yy++) {
          for (let x = CX - 24; x <= CX + 24; x++) {
            const d = x - CX + (yy - CY) * 0.7 - pos;
            if (l.has(x, yy) && Math.abs(d) < 2.5) {
              l.set(x, yy, Math.abs(d) < 1.2 ? P.white : P.pale);
            }
          }
        }
      }
    },
    { outline: age === 1 ? P.white : P.ink, fade },
  );

  // Speed lines while it drops.
  if (f >= 2 && f < LAND) {
    b.layer((l) => {
      for (let k = -2; k <= 2; k++) {
        const x = CX + k * 8;
        l.line(x, y - 24 - (f - 1) * 3, x, y - 20, P.light, 0.6);
      }
    });
  }

  shockwave(b, CX, CY + 6, age, 16, 30, P.pale);
  b.layer(
    (l) => {
      debris(l, CX, CY + 8, age, [P.pale, P.light], "icd", 10, 5);
      risingSparkles(l, f, 15, CX, CY, 60, 40, P, "icr");
    },
    { outline: P.ink },
  );
};
