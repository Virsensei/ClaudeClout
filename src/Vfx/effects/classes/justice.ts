import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeOut, rand, span } from "../../pixel";
import type { PixelBuffer, RGB } from "../../pixel";
import { bouncePosition, doubleShock, finalTwinkle, popOut, withShake } from "../classes3/juice";
import type { Point } from "./shared";
import { ramp, stampScale } from "./shared";

// Justice (yellow): a crosshair closes in, tightens and locks on, then a
// sheriff-star badge slams down (flash, shake, shockwave, rays), a shine
// sweeps across it, it does a proud coin-flip spin and lands with a
// glint, and pops away into a twinkle. Glitter bursts out and bounces.
// Everything stays inside the card.

const P = ramp("#FFD83D");
const TAU = Math.PI * 2;
const STAMP = 7;
const FLIP = 11; // coin-flip spin
const LAND = FLIP + 4;
const POP = 17;
// Coin-flip width (negative = back face) and hop height per frame.
const FLIP_W: Record<number, number> = { 11: 0.5, 12: -0.12, 13: -0.6, 14: 0.12 };
const FLIP_Y: Record<number, number> = { 11: -3, 12: -6, 13: -6, 14: -3, 15: 1 };

const bracket = (l: PixelBuffer, x: number, y: number, sx: number, sy: number, c: RGB) => {
  l.thickLine(x, y, x + sx * 5, y, 2, c);
  l.thickLine(x, y, x, y + sy * 5, 2, c);
};

const starPts = (R: number, r: number, spin: number, wx: number, oy: number): Point[] => {
  const pts: Point[] = [];
  for (let i = 0; i < 10; i++) {
    const a = spin - Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? R : r;
    pts.push([CX + Math.cos(a) * rr * wx, CY + oy + Math.sin(a) * rr]);
  }
  return pts;
};

const fillEllipseRing = (l: PixelBuffer, oy: number, rx: number, ry: number, t: number, c: RGB) => {
  for (let y = -Math.ceil(ry + t); y <= Math.ceil(ry + t); y++) {
    for (let x = -Math.ceil(rx + t); x <= Math.ceil(rx + t); x++) {
      const outer = (x / (rx + t / 2)) ** 2 + (y / (ry + t / 2)) ** 2;
      const inner = (x / Math.max(0.1, rx - t / 2)) ** 2 + (y / Math.max(0.1, ry - t / 2)) ** 2;
      if (outer <= 1 && inner > 1) {
        l.set(CX + x, CY + oy + y, c);
      }
    }
  }
};

// The badge; `wx` squashes it sideways for the coin-flip (negative = back face).
const badge = (l: PixelBuffer, scale: number, spin: number, wx: number, flash: boolean, oy: number) => {
  const R = 16 * scale;
  const w = Math.max(0.12, Math.abs(wx));
  const back = wx < 0;
  fillEllipseRing(l, oy, 20 * scale * w, 20 * scale, 3 * scale, flash ? P.white : P.base);
  l.polygon(starPts(R, R * 0.48, spin, w, oy), flash ? P.white : back ? P.deep : P.base);
  if (flash) {
    return;
  }
  l.polygon(starPts(R * 0.58, R * 0.28, spin, w, oy), back ? P.base : P.light);
  if (!back && w > 0.5) {
    for (let i = 0; i < 5; i++) {
      const a = spin - Math.PI / 2 + (i * TAU) / 5;
      l.disc(CX + Math.cos(a) * R * w, CY + oy + Math.sin(a) * R, 2 * scale, P.pale);
    }
    l.disc(CX, CY + oy, 2.5, P.white);
  }
};

const effect: Effect = (b, f) => {
  // Crosshair closing in, tightening and blinking when locked.
  if (f < STAMP + 2) {
    const close = easeOut(span(f, -1, 5));
    const pinch = f === 5 || f === 6 ? 2 : 0;
    const d = 34 - 14 * close - pinch;
    const spin = (1 - close) * 0.9;
    b.layer(
      (l) => {
        const c = f >= STAMP ? P.white : f >= 5 && f % 2 === 1 ? P.pale : P.base;
        for (let i = 0; i < 4; i++) {
          const a = spin + Math.PI / 4 + (i * TAU) / 4;
          const dd = f >= STAMP ? d + (f - STAMP + 1) * 6 : d;
          bracket(l, CX + Math.cos(a) * dd, CY + Math.sin(a) * dd, -Math.sign(Math.cos(a)), -Math.sign(Math.sin(a)), c);
        }
        if (f >= 4 && f < STAMP) {
          l.rect(CX - 1, CY - 1, 2, 2, P.white);
          if (f >= 5) {
            l.line(CX - 6, CY, CX - 3, CY, P.pale);
            l.line(CX + 3, CY, CX + 6, CY, P.pale);
            l.line(CX, CY - 6, CX, CY - 3, P.pale);
            l.line(CX, CY + 3, CX, CY + 6, P.pale);
          }
        }
      },
      { outline: P.ink, fade: 1 - span(f, STAMP, STAMP + 2) },
    );
  }
  if (f < STAMP) {
    return;
  }

  const age = f - STAMP;
  const spin = [1.0, 0.45, 0.15][age] ?? 0;

  // Rays on impact.
  if (age <= 2) {
    b.layer(
      (l) => {
        for (let i = 0; i < 10; i++) {
          const a = (i * TAU) / 10;
          const len = [38, 32, 22][age] * (i % 2 === 0 ? 1 : 0.65);
          l.line(CX + Math.cos(a) * 8, CY + Math.sin(a) * 8, CX + Math.cos(a) * len, CY + Math.sin(a) * len, P.pale);
        }
      },
      { outline: P.ink },
    );
  }
  doubleShock(b, CX, CY, age, P, 0.85);

  // The badge: slam, shine, coin-flip, glint, pop.
  const s = popOut(span(f, POP, POP + 4));
  if (s > 0) {
    // A coin flip with a little hop.
    const wx = FLIP_W[f] ?? 1;
    const hop = FLIP_Y[f] ?? 0;
    b.layer(
      (l) => {
        const sc = stampScale(age) * s * (f === LAND ? 1.08 : 1);
        badge(l, sc, spin, wx, age === 0, hop);
        // Shine sweeping across.
        if (age >= 2 && age <= 4) {
          const pos = -30 + ((age - 2) / 2) * 60;
          for (let y = CY - 24; y <= CY + 24; y++) {
            for (let x = CX - 24; x <= CX + 24; x++) {
              const dd = x - CX + (y - CY) * 0.7 - pos;
              if (l.has(x, y) && Math.abs(dd) < 2.5) {
                l.set(x, y, Math.abs(dd) < 1.2 ? P.white : P.pale);
              }
            }
          }
        }
      },
      { outline: age === 1 || f === LAND ? P.white : P.ink },
    );
  }

  b.layer(
    (l) => {
      // Glint landing on a star point after the flip.
      if (f >= LAND && f < POP + 1) {
        const k = f - LAND;
        l.sparkle(CX - 9 + k * 2, CY - 13, ([4, 3, 2] as number[])[k] ?? 1, P.pale, P.white);
      }
      // Glitter bursting out, falling and bouncing on a line below.
      if (age >= 1 && age <= 10) {
        for (let i = 0; i < 16; i++) {
          const a = (i * TAU) / 16 + rand(`jg-a-${i}`) * 0.3;
          const v = 2.4 + rand(`jg-s-${i}`) * 1.6;
          const [x, y] = bouncePosition(CX + Math.cos(a) * 14, CY + Math.sin(a) * 14, Math.cos(a) * v, Math.sin(a) * v - 1.5, age - 1, CY + 44, 0.6);
          if (x < 20 || x > 89) {
            continue;
          }
          l.sparkle(x, y, age < 4 ? 2 : 1, P.light, P.white);
        }
      }
    },
    { outline: P.ink, fade: 1 - span(f, STAMP + 8, STAMP + 11) },
  );

  b.layer((l) => finalTwinkle(l, CX, CY, f - (POP + 2), P), { outline: P.ink });
};

export const justice = withShake(effect, [
  [STAMP, 1],
  [LAND, 0.4],
]);
