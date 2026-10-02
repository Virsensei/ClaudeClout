import type { Effect } from "../PixelCanvas";
import { CX, CY, easeIn, easeOut, hex, rand, span } from "../pixel";
import type { PixelBuffer, RGB } from "../pixel";

// Silence: a note sings out sound waves, dark wisps choke them, then a
// "no sound" seal slams down with a shockwave, "..." appears, and the
// seal dissolves into smoke.

const C = {
  ink: hex("#140c1f"),
  dark: hex("#2e2340"),
  mid: hex("#5b4b73"),
  soft: hex("#9a8db3"),
  pale: hex("#ddd6ea"),
  white: hex("#ffffff"),
  red: hex("#d4314f"),
  redDeep: hex("#7a1830"),
  redLight: hex("#ff7a8f"),
};

const TAU = Math.PI * 2;
const STAMP = 10;

const NOTE = [
  "....XXXX",
  "....XXXX",
  "....X..X",
  "....X..X",
  "....X..X",
  "....X..X",
  ".XXXX.XX",
  "XXXXXXXX",
  "XXXX.XXX",
  ".XX...X.",
];

const note = (b: PixelBuffer, x: number, y: number, c: RGB) => {
  NOTE.forEach((row, j) =>
    [...row].forEach((cell, i) => {
      if (cell === "X") {
        b.set(Math.round(x) - 4 + i, Math.round(y) - 5 + j, c);
      }
    }),
  );
};

const seal = (l: PixelBuffer, x: number, y: number, scale: number, flash: boolean) => {
  const r = 20 * scale;
  const t = 5 * scale;
  const red = flash ? C.white : C.red;
  note(l, x - 1, y, flash ? C.white : C.pale);
  l.ring(x, y, r, t, red);
  // Highlight on the upper-left of the ring.
  if (!flash) {
    l.ring(x, y, r - t / 2 + 1, 1, C.redLight, 1, Math.PI * 1.05, Math.PI * 1.45);
    l.ring(x, y, r + t / 2 - 1, 1, C.redDeep, 1, Math.PI * 0.05, Math.PI * 0.6);
  }
  const d = (r - 1) * Math.SQRT1_2;
  l.thickLine(x - d, y - d, x + d, y + d, t, red);
};

export const silence: Effect = (b, f) => {
  // The note at the centre, bobbing while it "sings".
  if (f < STAMP) {
    b.layer((l) => note(l, CX - 1, CY - (f % 4 < 2 ? 0 : 1), C.pale), {
      outline: C.ink,
    });
  }

  // Sound waves: three arcs per side push out, then get choked back.
  if (f < STAMP) {
    const choke = easeIn(span(f, 5, 9));
    for (let k = 0; k < 3; k++) {
      if (f < k * 1.5) {
        continue;
      }
      const r = (12 + k * 7 + Math.min(f, 5) * 1.3) * (1 - choke * 0.65);
      const level = 1 - choke;
      const color = k === 0 ? C.pale : C.soft;
      b.ring(CX, CY, r, 2, color, level, -0.6, 0.6);
      b.ring(CX, CY, r, 2, color, level, Math.PI - 0.6, Math.PI + 0.6);
    }
  }

  // Dark wisps spiralling in.
  b.layer(
    (l) => {
      for (let i = 0; i < 7; i++) {
        const start = 1 + rand(`w-start-${i}`) * 2;
        const a0 = (i * TAU) / 7 + rand(`w-a-${i}`) * 0.6;
        // A tapering tendril: thick bright head, thin dark tail.
        const pos = (lag: number): [number, number] | null => {
          const t = span(f - lag, start, STAMP);
          if (t <= 0 || t >= 1) {
            return null;
          }
          const r = 62 * (1 - easeIn(t)) + 4;
          const a = a0 + t * 1.9;
          return [CX + Math.cos(a) * r, CY + Math.sin(a) * r];
        };
        const SEGMENTS = 8;
        for (let k = SEGMENTS - 1; k >= 0; k--) {
          const p0 = pos(k * 0.25);
          const p1 = pos((k + 1) * 0.25);
          if (!p0 || !p1) {
            continue;
          }
          const w = 3.4 - (k / SEGMENTS) * 2.6;
          const color = k < 2 ? C.soft : k < 5 ? C.mid : C.dark;
          l.thickLine(p1[0], p1[1], p0[0], p0[1], w, color);
        }
      }
    },
    { outline: C.ink },
  );

  if (f < STAMP) {
    return;
  }

  const age = f - STAMP;
  const scale = [1.5, 0.86, 1.06, 1][Math.min(age, 3)];
  const shake = [0, 2, -1, 1][age] ?? 0;
  const sealFade = 1 - span(f, 17, 23);

  // Shockwaves.
  if (age <= 6) {
    const t = age / 6;
    b.ring(CX, CY, 18 + easeOut(t) * 32, 3 - 2 * t, C.pale, 1 - t * 0.85);
  }
  if (age >= 1 && age <= 6) {
    const t = (age - 1) / 5;
    b.ring(CX, CY, 16 + easeOut(t) * 22, 1, C.red, 1 - t * 0.7);
  }

  // The seal.
  b.layer((l) => seal(l, CX + shake, CY, scale, age === 0), {
    outline: age === 1 ? C.white : C.ink,
    fade: sealFade,
  });

  // Debris chips knocked loose by the impact.
  if (age <= 6) {
    b.layer(
      (l) => {
        for (let i = 0; i < 14; i++) {
          const a = rand(`d-a-${i}`) * TAU;
          const speed = 3 + rand(`d-s-${i}`) * 3;
          const x = CX + Math.cos(a) * (20 + speed * age);
          const y = CY + Math.sin(a) * (20 + speed * age) + 0.3 * age * age;
          const color = [C.soft, C.pale, C.red][i % 3];
          const size = age > 3 ? 1 : 2;
          l.rect(x, y, size, size, color);
        }
      },
      { outline: C.ink },
    );
  }

  // "..." — the silenced card can't speak.
  b.layer(
    (l) => {
      for (let k = 0; k < 3; k++) {
        if (f >= 13 + k * 2) {
          l.rect(CX - 8 + k * 7, CY - 34, 3, 3, C.pale);
        }
      }
    },
    { outline: C.ink, fade: sealFade },
  );

  // Smoke rising as the seal dissolves.
  if (f >= 16) {
    b.layer(
      (l) => {
        for (let i = 0; i < 10; i++) {
          const a = (i * TAU) / 10 + rand(`p-a-${i}`) * 0.4;
          const born = 16 + rand(`p-b-${i}`) * 3;
          const t = f - born;
          if (t < 0) {
            continue;
          }
          const x = CX + Math.cos(a) * 20 + Math.sin(t + i) * 1.5;
          const y = CY + Math.sin(a) * 20 - t * 2;
          const r = [1.5, 2.5, 3, 2.5, 2, 1.5, 1][Math.floor(t)] ?? 1;
          l.disc(x, y, r, t < 2 ? C.soft : C.mid, 1 - span(t, 3, 7));
        }
      },
      { fade: 1 - span(f, 21, 23) },
    );
  }
};
