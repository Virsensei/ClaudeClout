import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeOut, rand, span } from "../../pixel";
import type { PixelBuffer } from "../../pixel";
import { ramp, risingSparkles, rune } from "./shared";

// Perseverance (purple): a spellbook pops in and opens, its pages flip
// faster and faster, then it bursts open and runes fountain out of it.

const P = ramp("#D938F9");
const BURST = 10;
const BY = CY + 12; // book spine centre
const W = 21; // page width
const H = 14; // half page height

// One page from the spine out to `w` (negative = left side).
const page = (l: PixelBuffer, w: number, color: typeof P.base, lines: boolean) => {
  if (Math.abs(w) < 0.5) {
    return;
  }
  const lift = Math.abs(w) / W;
  l.polygon(
    [
      [CX, BY - H],
      [CX + w, BY - H - 2 * lift],
      [CX + w, BY + H - 2 * lift],
      [CX, BY + H],
    ],
    color,
  );
  if (lines && Math.abs(w) > 6) {
    for (let k = 0; k < 5; k++) {
      const y = BY - H + 5 + k * 5;
      l.line(CX + Math.sign(w) * 3, y - lift, CX + w * 0.82, y - 2 * lift, P.light);
    }
  }
};

export const perseverance: Effect = (b, f) => {
  const fade = 1 - span(f, 16, 21);
  const pop = [0.6, 1.15, 1][Math.min(f, 2)];

  b.layer(
    (l) => {
      if (f < 3) {
        // Closed book with a rune on the cover.
        const w = 13 * pop;
        const h = 16 * pop;
        l.rect(CX - w, BY - h, w * 2, h * 2, P.base);
        l.rect(CX - w, BY - h, 3, h * 2, P.deep);
        l.rect(CX + w - 2, BY - h + 2, 2, h * 2 - 4, P.pale);
        rune(l, CX + 1, BY, 4, P.pale);
        return;
      }
      const open = easeOut(span(f, 3, 5));
      // Covers behind the pages.
      l.polygon(
        [
          [CX, BY - H - 2],
          [CX - (W + 2) * open, BY - H - 4],
          [CX - (W + 2) * open, BY + H],
          [CX, BY + H + 2],
          [CX + W + 2, BY + H],
          [CX + W + 2, BY - H - 4],
        ],
        P.base,
      );
      const flash = f === BURST;
      page(l, -W * open, flash ? P.white : P.pale, !flash);
      page(l, W, flash ? P.white : P.pale, !flash);
      l.line(CX, BY - H, CX, BY + H, P.deep);

      // Pages flipping right to left, quicker each time.
      for (const [start, dur] of [
        [5, 1.6],
        [6.8, 1.2],
        [8.2, 0.9],
      ]) {
        const t = span(f, start, start + dur);
        if (t > 0 && t < 1) {
          const w = W * Math.cos(Math.PI * t);
          page(l, w, w < 0 ? P.light : P.white, false);
          rune(l, CX + w * 0.5, BY - 2, Math.floor(start), P.base);
        }
      }
    },
    { outline: P.ink, fade },
  );

  if (f < BURST) {
    return;
  }
  const age = f - BURST;

  // Magic ring over the open book.
  if (age <= 5) {
    const t = age / 5;
    const rx = 18 + easeOut(t) * 26;
    b.ellipseRing(CX, BY - 6, rx, rx * 0.32, 3 - 2 * t, P.pale, 1 - t * 0.8);
  }

  // Runes fountaining out of the pages.
  b.layer(
    (l) => {
      for (let i = 0; i < 12; i++) {
        const born = rand(`pr-b-${i}`) * 3;
        const t = age - born;
        if (t < 0 || BURST + born + t > 21) {
          continue;
        }
        const vx = (rand(`pr-x-${i}`) - 0.5) * 7;
        const x = CX + vx * t;
        const y = BY - 10 - t * 7 + 0.35 * t * t;
        const colors = [P.white, P.pale, P.light, P.base];
        rune(l, x, y, i + Math.floor(t / 2), colors[i % colors.length]);
      }
      risingSparkles(l, f, 13, CX, BY - 20, 50, 30, P, "ps");
    },
    { outline: P.ink },
  );
};
