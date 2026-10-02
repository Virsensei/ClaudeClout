import type { Effect } from "../PixelCanvas";
import { CX, CY, GRID_H, GRID_W, easeIn, easeOut, hex, rand, span } from "../pixel";
import type { PixelBuffer, RGB } from "../pixel";

// Cast magic 3: two sparks race around the card's edge from the bottom and
// meet at the top, lighting the frame. Runes are carved into it, energy
// streams from the corners into a charging orb, the orb bursts and the
// frame flashes, then everything dissolves into rising sparkles.

const C = {
  ink: hex("#2a0a2e"),
  deep: hex("#8a1a8c"),
  mid: hex("#e03fd0"),
  light: hex("#ff9cf0"),
  pale: hex("#ffe3fb"),
  white: hex("#ffffff"),
  cyan: hex("#7ff3ff"),
};

const TAU = Math.PI * 2;
const INSET = 3;
const X0 = INSET;
const Y0 = INSET;
const X1 = GRID_W - 1 - INSET;
const Y1 = GRID_H - 1 - INSET;
const MEET = 6;
const BURST = 12;

// Half the frame: from bottom centre, left along the bottom, up the left
// side, then right along the top to top centre.
const HALF = CX - X0 + (Y1 - Y0) + (CX - X0);

// Point `s` pixels along the left half of the frame (mirror for the right).
const along = (s: number): [number, number] => {
  const bottom = CX - X0;
  const side = Y1 - Y0;
  if (s <= bottom) {
    return [CX - s, Y1];
  }
  if (s <= bottom + side) {
    return [X0, Y1 - (s - bottom)];
  }
  return [X0 + (s - bottom - side), Y0];
};

const mirror = ([x, y]: [number, number]): [number, number] => [X0 + X1 - x, y];

// Inward offset at a point on the frame, for drawing it 3px thick.
const inward = ([x, y]: [number, number], t: number): [number, number] => [
  x === X0 ? x + t : x === X1 ? x - t : x,
  y === Y0 ? y + t : y === Y1 ? y - t : y,
];

const RUNES = [
  ["X.X", ".X.", "X.X"],
  [".X.", "XXX", ".X."],
  ["XX.", ".X.", ".XX"],
  ["X..", "XXX", "..X"],
];

const rune = (b: PixelBuffer, x: number, y: number, index: number, c: RGB) => {
  RUNES[index % RUNES.length].forEach((row, j) =>
    [...row].forEach((cell, i) => {
      if (cell === "X") {
        b.set(Math.round(x) - 1 + i, Math.round(y) - 1 + j, c);
      }
    }),
  );
};

// The lit frame up to distance `reach` on both halves.
const litFrame = (b: PixelBuffer, reach: number, flash: boolean) => {
  for (let s = 0; s <= reach; s++) {
    const age = reach - s;
    for (const p of [along(s), mirror(along(s))]) {
      for (let t = 0; t < 3; t++) {
        const c = flash ? C.white : t === 1 ? (age < 14 ? C.pale : C.light) : C.mid;
        b.set(...inward(p, t), c);
      }
    }
  }
};

const corners: [number, number][] = [
  [X0, Y0],
  [X1, Y0],
  [X0, Y1],
  [X1, Y1],
];

export const castMagic3: Effect = (b, f) => {
  const frameFade = 1 - span(f, 15, 21);

  b.layer(
    (l) => {
      const reach = HALF * span(f, -1.2, MEET);
      if (reach <= 0) {
        return;
      }
      litFrame(l, reach, f === BURST);

      // Runes carved into the frame once it's lit, blinking on in turn.
      if (f >= MEET + 1) {
        for (let i = 0; i < 10; i++) {
          if (f < MEET + 1 + (i % 5) * 0.6) {
            continue;
          }
          const s = 12 + (i % 5) * ((HALF - 24) / 4);
          const p = inward(i < 5 ? along(s) : mirror(along(s)), 1);
          rune(l, p[0], p[1], i, (f + i) % 4 === 0 ? C.white : C.deep);
        }
      }

      // Corner gems light up as the sparks pass them.
      corners.forEach(([x, y]) => {
        const passed = y === Y0 ? reach > HALF - (CX - X0) : reach > CX - X0;
        if (!passed) {
          return;
        }
        l.polygon(
          [
            [x, y - 5],
            [x + 5, y],
            [x, y + 5],
            [x - 5, y],
          ],
          f === BURST ? C.white : C.cyan,
        );
        l.set(x - 1, y - 2, C.white);
        l.set(x - 2, y - 1, C.white);
      });

      // Flash where the two sparks meet.
      if (f === MEET || f === MEET + 1) {
        l.sparkle(CX, Y0 + 1, f === MEET ? 6 : 3, C.pale, C.white);
      }
    },
    { outline: C.ink, fade: frameFade },
  );

  // The two racing sparks.
  if (f < MEET) {
    const reach = HALF * span(f, -1.2, MEET);
    b.layer(
      (l) => {
        for (const p of [along(reach), mirror(along(reach))]) {
          l.sparkle(...inward(p, 1), 3, C.pale, C.white);
        }
      },
      { outline: C.ink },
    );
  }

  // Energy streaming from the corners into the centre.
  if (f >= 8 && f < BURST) {
    b.layer(
      (l) => {
        corners.forEach(([x, y], i) => {
          for (let k = 0; k < 4; k++) {
            const t = span(f + k * 0.5, 8 + (i % 2) * 0.5, BURST);
            if (t <= 0 || t >= 1) {
              continue;
            }
            const e = easeIn(t);
            const px = x + (CX - x) * e;
            const py = y + (CY - y) * e;
            l.rect(px, py, 2, 2, k === 0 ? C.white : k < 2 ? C.pale : C.light);
          }
        });
      },
      { outline: C.ink },
    );
  }

  // Charging orb.
  if (f >= 7 && f < BURST) {
    const r = 2 + easeIn(span(f, 7, BURST)) * 7 + (f % 2) * 0.8;
    b.layer(
      (l) => {
        l.disc(CX, CY, r + 1.5, C.mid);
        l.disc(CX, CY, r, C.light);
        l.disc(CX, CY, Math.max(1, r - 2.5), C.white);
        l.ring(CX, CY, r + 5, 1, C.pale, 0.5);
      },
      { outline: C.ink },
    );
  }

  if (f < BURST) {
    return;
  }
  const age = f - BURST;

  // Burst: core flash and eight rays.
  if (age <= 3) {
    const ray = [44, 32, 18, 8][age];
    const core = [12, 8, 5, 2][age];
    b.layer(
      (l) => {
        for (let i = 0; i < 8; i++) {
          const a = (i * TAU) / 8;
          const len = i % 2 === 0 ? ray : ray * 0.6;
          l.thickLine(CX, CY, CX + Math.cos(a) * len, CY + Math.sin(a) * len, i % 2 === 0 ? 3 : 2, C.light);
          l.line(CX, CY, CX + Math.cos(a) * (len - 2), CY + Math.sin(a) * (len - 2), C.white);
        }
        l.disc(CX, CY, core, C.white);
      },
      { outline: C.deep },
    );
  }

  // Shockwave.
  if (age <= 6) {
    const t = age / 6;
    b.ring(CX, CY, 12 + easeOut(t) * 38, 3 - 2 * t, C.pale, 1 - t * 0.85);
  }

  // Sparkles rising off the frame and the centre as it dissolves.
  b.layer(
    (l) => {
      for (let i = 0; i < 22; i++) {
        const born = BURST + 1 + rand(`r-b-${i}`) * 6;
        const t = f - born;
        if (t < 0 || t > 22 - born) {
          continue;
        }
        let x: number;
        let y: number;
        if (i % 3 === 0) {
          const a = rand(`r-a-${i}`) * TAU;
          const d = 10 + rand(`r-d-${i}`) * 26;
          x = CX + Math.cos(a) * d;
          y = CY + Math.sin(a) * d;
        } else {
          const s = rand(`r-s-${i}`) * HALF;
          [x, y] = inward(i % 2 === 0 ? along(s) : mirror(along(s)), 1);
        }
        const size = [1, 2, 3, 2, 1, 1, 1][Math.floor(t)] ?? 1;
        l.sparkle(x, y - t * 1.6, size, i % 4 === 0 ? C.cyan : C.light, C.white);
      }
    },
    { outline: C.ink },
  );
};
