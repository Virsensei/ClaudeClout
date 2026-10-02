import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeIn, easeInOut, easeOut, span } from "../../pixel";
import type { PixelBuffer } from "../../pixel";
import type { Point } from "../classes/shared";
import { ramp, risingSparkles, shockwave, transform } from "../classes/shared";

// Perseverance (purple): quill. A quill pen writes a glowing sigil on the
// card, flicks off a few ink drops, then the sigil flares inside a magic
// ring and lifts away.

const P = ramp("#D938F9");
const TAU = Math.PI * 2;
const DONE = 10;
const SAMPLES = 90;

// The sigil: a figure-eight with a stroke down through the middle.
const sigil = (t: number): Point => {
  if (t < 0.8) {
    const u = (t / 0.8) * TAU;
    return [CX + 22 * Math.sin(u), CY - 4 + 10 * Math.sin(2 * u)];
  }
  const u = (t - 0.8) / 0.2;
  return [CX, CY - 18 + u * 34];
};

const quill = (l: PixelBuffer, x: number, y: number) => {
  const t = transform(x, y, -1.05, 1);
  l.polygon(
    ([
      [0, 0],
      [8, -3],
      [24, -4],
      [30, 0],
      [22, 3],
      [8, 3],
    ] as Point[]).map(t),
    P.pale,
  );
  l.line(...t([3, 0]), ...t([27, 0]), P.light);
  for (let k = 0; k < 3; k++) {
    l.line(...t([12 + k * 5, 0]), ...t([14 + k * 5, -3]), P.light);
  }
  l.line(...t([0, 0]), ...t([4, 0]), P.deep);
};

export const perseverance: Effect = (b, f) => {
  const written = easeInOut(span(f, 1, DONE));
  const lift = easeIn(span(f, 14, 21)) * 18;
  const glow = f >= DONE + 1;

  // The sigil, written stroke by stroke.
  b.layer(
    (l) => {
      const n = Math.floor(written * SAMPLES);
      for (let i = 1; i <= n; i++) {
        const [x0, y0] = sigil((i - 1) / SAMPLES);
        const [x1, y1] = sigil(i / SAMPLES);
        l.thickLine(x0, y0 - lift, x1, y1 - lift, glow ? 3 : 2, f === DONE + 1 ? P.white : glow ? P.light : P.base);
      }
      if (glow) {
        for (let i = 1; i <= SAMPLES; i++) {
          const [x0, y0] = sigil((i - 1) / SAMPLES);
          const [x1, y1] = sigil(i / SAMPLES);
          l.line(x0, y0 - lift, x1, y1 - lift, P.white);
        }
      }
    },
    { outline: P.ink, fade: 1 - span(f, 15, 21) },
  );

  // Magic ring drawn around the finished sigil.
  if (f >= DONE + 1) {
    const age = f - DONE - 1;
    const sweep = easeOut(span(age, -1, 2)) * TAU;
    b.layer(
      (l) => {
        l.ring(CX, CY - 2 - lift, 30, 2, P.base, 1, -Math.PI / 2, -Math.PI / 2 + sweep);
        l.ring(CX, CY - 2 - lift, 26, 1, P.light, 1, Math.PI / 2, Math.PI / 2 + sweep);
      },
      { outline: P.ink, fade: 1 - span(f, 15, 21) },
    );
    shockwave(b, CX, CY - 2, age, 16, 30, P.pale);
  }

  // The quill: follows the pen tip, then flicks away up and right.
  if (f < DONE + 4) {
    let [x, y] = sigil(Math.min(1, written));
    if (f < 1) {
      x += 30;
      y -= 20;
    }
    if (f >= DONE) {
      const away = easeIn(span(f, DONE, DONE + 3));
      x += away * 50;
      y -= away * 60;
    }
    b.layer((l) => quill(l, x, y), { outline: P.ink });
  }

  // Ink drops flicked off as the pen lifts.
  b.layer(
    (l) => {
      const age = f - DONE;
      if (age >= 0 && age <= 4) {
        for (let i = 0; i < 5; i++) {
          const [x0, y0] = sigil(1);
          const x = x0 + (i - 2) * 3 * (1 + age);
          const y = y0 - age * 3 + age * age * 0.9 + (i % 2) * 2;
          l.rect(x, y, age < 2 ? 2 : 1, age < 2 ? 2 : 1, i % 2 ? P.base : P.light);
        }
      }
      risingSparkles(l, f, 13, CX, CY - 10, 60, 40, P, "pq");
    },
    { outline: P.ink },
  );
};
