import type { Effect } from "../PixelCanvas";
import { CX, CY, easeIn, easeOut, hex, rand, span } from "../pixel";
import type { PixelBuffer, RGB } from "../pixel";

// Cast magic: a rune circle draws itself while motes spiral in, the core
// charges, then bursts into a star flash, a shockwave and rising sparkles.

const C = {
  ink: hex("#1d0b3a"),
  deep: hex("#4a1fa0"),
  mid: hex("#8c47ff"),
  light: hex("#c99bff"),
  pale: hex("#f1e2ff"),
  white: hex("#ffffff"),
  gold: hex("#ffd34d"),
  goldDeep: hex("#e08a1e"),
};

const TAU = Math.PI * 2;

const RUNES = [
  ["X.X", ".X.", "X.X"],
  [".X.", "XXX", ".X."],
  ["XX.", ".X.", ".XX"],
  ["X..", "XXX", "..X"],
];

const rune = (b: PixelBuffer, x: number, y: number, index: number, c: RGB) => {
  const glyph = RUNES[index % RUNES.length];
  glyph.forEach((row, j) =>
    [...row].forEach((cell, i) => {
      if (cell === "X") {
        b.set(Math.round(x) - 1 + i, Math.round(y) - 1 + j, c);
      }
    }),
  );
};

export const castMagic: Effect = (b, f) => {
  // Rune circle: draws in over 6 frames, spins faster after the burst, fades.
  const drawn = easeOut(span(f, -1, 5));
  const spin = f * 0.08 + Math.max(0, f - 10) * 0.14;
  const R = 34 + easeOut(span(f, 10, 20)) * 6;
  b.layer(
    (l) => {
      if (drawn === 0) {
        return;
      }
      const start = -Math.PI / 2 + spin;
      l.ring(CX, CY, R, 2, C.mid, 1, start, start + drawn * TAU);
      l.ring(CX, CY, R - 8, 1, C.light, 1, start + Math.PI, start + Math.PI + drawn * TAU);
      for (let i = 0; i < 8; i++) {
        if (i / 8 > drawn) {
          continue;
        }
        const a = (i * TAU) / 8 - spin * 1.6;
        rune(l, CX + Math.cos(a) * (R - 4), CY + Math.sin(a) * (R - 4), i, C.pale);
      }
    },
    { outline: C.ink, fade: 1 - span(f, 13, 21) },
  );

  // Motes spiralling into the centre.
  b.layer(
    (l) => {
      for (let i = 0; i < 16; i++) {
        const delay = rand(`m-delay-${i}`) * 3;
        const r0 = 46 + rand(`m-r-${i}`) * 14;
        const a0 = rand(`m-a-${i}`) * TAU;
        const colors = [C.white, C.pale, C.light, C.mid];
        for (let k = 3; k >= 0; k--) {
          const t = span(f + 1 - k * 0.5, delay, delay + 7);
          if (t <= 0 || t >= 1) {
            continue;
          }
          const r = r0 * (1 - easeIn(t));
          const a = a0 + t * 2.4;
          const x = CX + Math.cos(a) * r;
          const y = CY + Math.sin(a) * r;
          if (k === 0) {
            l.rect(x, y, 2, 2, colors[0]);
          } else {
            l.set(x, y, colors[k]);
          }
        }
      }
    },
    { outline: C.ink },
  );

  // Charging core.
  if (f >= 3 && f <= 10) {
    const r = 1 + easeIn(span(f, 3, 10)) * 6 + (f % 2);
    b.layer(
      (l) => {
        l.disc(CX, CY, r + 1.5, C.mid);
        l.disc(CX, CY, r, C.light);
        l.disc(CX, CY, Math.max(1, r - 2), C.white);
      },
      { outline: C.ink },
    );
  }

  // Shockwave ring.
  if (f >= 10 && f <= 17) {
    const t = span(f, 10, 17);
    b.ring(CX, CY, 8 + easeOut(t) * 44, 4 - 3 * t, t < 0.4 ? C.pale : C.light, 1 - t * 0.85);
  }

  // Star flash.
  if (f >= 10 && f <= 13) {
    const arm = [32, 22, 13, 6][f - 10];
    const core = [9, 6, 4, 2][f - 10];
    b.layer(
      (l) => {
        const w = f === 10 ? 3 : 2;
        l.thickLine(CX - arm, CY, CX + arm, CY, w, C.pale);
        l.thickLine(CX, CY - arm, CX, CY + arm, w, C.pale);
        const d = arm * 0.45;
        l.line(CX - d, CY - d, CX + d, CY + d, C.light);
        l.line(CX - d, CY + d, CX + d, CY - d, C.light);
        l.disc(CX, CY, core, C.white);
        l.line(CX - arm + 2, CY, CX + arm - 2, CY, C.white);
        l.line(CX, CY - arm + 2, CX, CY + arm - 2, C.white);
      },
      { outline: C.deep },
    );
  }

  // Rising sparkles.
  b.layer(
    (l) => {
      for (let i = 0; i < 16; i++) {
        const born = 11 + rand(`s-born-${i}`) * 5;
        const life = Math.min(5 + rand(`s-life-${i}`) * 5, 22 - born);
        const age = f - born;
        if (age < 0 || age > life) {
          continue;
        }
        const a = rand(`s-a-${i}`) * TAU;
        const d = 8 + rand(`s-d-${i}`) * 34;
        const x = CX + Math.cos(a) * d;
        const y = CY + Math.sin(a) * d - age * 1.3;
        const size = [1, 2, 3, 2, 1, 1, 2, 1, 1, 1, 1][Math.floor(age)] ?? 1;
        const gold = i % 3 === 0;
        l.sparkle(x, y, size, gold ? C.gold : C.light, C.white);
      }
    },
    { outline: C.ink },
  );
};
