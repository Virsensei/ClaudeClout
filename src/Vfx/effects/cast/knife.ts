import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeInOut, easeOut, rand, span } from "../../pixel";
import type { PixelBuffer, RGB } from "../../pixel";
import type { Point } from "../classes/shared";
import { ramp, risingSparkles, transform } from "../classes/shared";
import { chunk, doubleShock, finalTwinkle, popOut, withShake } from "../classes3/juice";

// Cast, "Patient Cut" (Patience's Toy Knife): a knife pops in and a ring
// of clock ticks lights up one by one while it slowly draws back and a
// glint runs up the blade. Waited for... then one clean swing: a slash
// cuts across the card (flash, shake, shockwave), the cut opens and
// throws off shards, the knife settles, glints, and shrinks away into a
// twinkle. Everything stays inside the card.

const CARD = { x0: 15, y0: 4, x1: 94, y1: 121 };
const TAU = Math.PI * 2;
const STRIKE = 7;
const POP = 15;
const SIZE = 1.15;
const PIVOT: Point = [CX, CY + 4];
const TICKS = 8;
// The slash: top right to bottom left across the card, crossing the
// knife's resting pose in an X.
const S0: Point = [CARD.x1 - 9, CARD.y0 + 22];
const S1: Point = [CARD.x0 + 9, CARD.y1 - 22];

// Knife angle per frame (0 = pointing up, positive = clockwise).
const READY = -0.75;
const END = 2.1;
const angleAt = (f: number) => {
  if (f < STRIKE) {
    return 0.25 + (READY - 0.25) * easeInOut(span(f, 1, 6));
  }
  const after: Record<number, number> = { 7: END, 8: END + 0.22, 9: END - 0.08 };
  return after[f] ?? END + Math.sin(f * 0.9) * 0.03;
};

// The knife, pointing up, with the middle of its guard at the origin.
const knife = (l: PixelBuffer, angle: number, s: number, p: ReturnType<typeof ramp>, flash: boolean) => {
  const t = transform(PIVOT[0], PIVOT[1], angle, s);
  const c = (col: RGB) => (flash ? p.white : col);
  // Blade: straight back, curved edge up to the point.
  l.polygon(([[-3, -3], [3.5, -3], [4, -14], [2.5, -24], [-1.5, -31], [-3, -28]] as Point[]).map(t), c(p.light));
  if (!flash) {
    l.line(...t([3.5, -4]), ...t([4, -14]), p.white);
    l.line(...t([4, -14]), ...t([2.5, -24]), p.white);
    l.line(...t([2.5, -24]), ...t([-1.5, -31]), p.white);
    l.line(...t([-1, -6]), ...t([-1, -23]), p.base);
  }
  // Guard, handle with wraps, pommel.
  l.polygon(([[-6.5, -3.5], [6.5, -3.5], [6.5, 0], [-6.5, 0]] as Point[]).map(t), c(p.base));
  l.polygon(([[-2.5, 0], [2.5, 0], [2.5, 11], [-2.5, 11]] as Point[]).map(t), c(p.deep));
  if (!flash) {
    l.line(...t([-2.5, 3.5]), ...t([2.5, 3.5]), p.base);
    l.line(...t([-2.5, 7.5]), ...t([2.5, 7.5]), p.base);
  }
  l.disc(...t([0, 13]), 2.6 * s, c(p.base));
  l.set(...t([-0.5, 12.5]), c(p.pale));
};

// A glint `g` (0 = guard, 1 = point) along the blade's edge.
const glint = (l: PixelBuffer, angle: number, s: number, g: number, p: ReturnType<typeof ramp>) => {
  const t = transform(PIVOT[0], PIVOT[1], angle, s);
  const [x, y] = t([3.6 - g * 1.6, -5 - g * 19]);
  l.sparkle(x, y, 2, p.pale, p.white);
};

export const castKnife = (hex: string): Effect => {
  const P = ramp(hex);

  const effect: Effect = (b, f) => {
    const age = f - STRIKE;
    const angle = angleAt(f);

    // The clock ticks: one lights up every frame while the knife waits.
    b.layer(
      (l) => {
        const out = age > 0 ? easeOut(span(age, 0, 4)) * 4 : 0;
        for (let i = 0; i < TICKS; i++) {
          const a = -Math.PI / 2 + (i * TAU) / TICKS;
          const x = CX + Math.cos(a) * (33 + out);
          const y = CY + Math.sin(a) * (46 + out);
          const lit = age >= 0 || i <= f;
          if (!lit) {
            l.rect(x - 1, y - 1, 2, 2, P.deep);
            continue;
          }
          const fresh = age < 0 && i === f;
          const r = age === 0 ? 3.5 : fresh ? 3 : 2;
          l.polygon([[x, y - r], [x + r, y], [x, y + r], [x - r, y]], age === 0 || fresh ? P.white : P.pale);
          l.set(x, y, P.white);
        }
      },
      { outline: age === 1 ? P.white : P.ink, fade: 1 - span(f, STRIKE + 1, STRIKE + 5) },
    );

    // Swing smear: a crescent from where it waited to where it ended.
    if (age >= 0 && age <= 1) {
      b.layer(
        (l) => {
          const from = READY - Math.PI / 2;
          const to = END - Math.PI / 2;
          const outer = 31 * SIZE + 1;
          const N = 14;
          const start = ([0, 0.45, 0.75] as number[])[age];
          for (let i = 0; i < N; i++) {
            const t = (i + 1) / N;
            if (t < start) {
              continue;
            }
            const th = (([5, 3.5, 2] as number[])[age] + t * ([13, 8, 4] as number[])[age]);
            const a0 = from + (to - from) * (i / N);
            const a1 = from + (to - from) * t + 0.02;
            l.ring(PIVOT[0], PIVOT[1], outer - th / 2, th, ([P.pale, P.light, P.base] as RGB[])[age], 1, a0, a1);
            if (age === 0) {
              l.ring(PIVOT[0], PIVOT[1], outer - 2, 3, P.white, 1, a0, a1);
            }
          }
        },
        { outline: P.ink },
      );
    }

    // The slash across the card, then the cut opening up.
    if (age >= 0 && age <= 6) {
      b.layer(
        (l) => {
          const [x0, y0] = S0;
          const [x1, y1] = S1;
          const len = Math.hypot(x1 - x0, y1 - y0);
          const nx = -(y1 - y0) / len;
          const ny = (x1 - x0) / len;
          const mx = (x0 + x1) / 2;
          const my = (y0 + y1) / 2;
          const lens = (w: number, ox: number, oy: number, c: RGB) =>
            l.polygon([[x0 + ox, y0 + oy], [mx + nx * w + ox, my + ny * w + oy], [x1 + ox, y1 + oy], [mx - nx * w + ox, my - ny * w + oy]], c);
          if (age <= 1) {
            lens(age === 0 ? 5 : 4, 0, 0, age === 0 ? P.white : P.pale);
            lens(age === 0 ? 2.5 : 1.5, 0, 0, P.white);
          } else {
            const gap = (age - 1) * 1.4;
            const w = ([2.5, 2, 1.5, 1, 1] as number[])[age - 2];
            const c = age <= 3 ? P.pale : P.light;
            lens(w, nx * gap, ny * gap, c);
            lens(w, -nx * gap, -ny * gap, c);
          }
          // Sparkles running out along the cut.
          if (age >= 1 && age <= 5) {
            for (const dir of [-1, 1]) {
              const t = 0.5 + dir * (0.12 + age * 0.08);
              l.sparkle(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, age < 3 ? 2 : 1, P.pale, P.white);
            }
          }
          // Shards thrown off both sides of the cut.
          if (age >= 1) {
            for (let i = 0; i < 12; i++) {
              const t = 0.15 + (i / 11) * 0.7;
              const side = i % 2 === 0 ? 1 : -1;
              const d = easeOut(span(age, 0, 6)) * (5 + rand(`kn-d-${i}`) * 9);
              const x = x0 + (x1 - x0) * t + nx * side * d;
              const y = y0 + (y1 - y0) * t + ny * side * d + age * 0.6;
              chunk(l, x, y, age < 4 ? 2 : 1, i % 3 === 0 ? P.white : P.pale);
            }
          }
        },
        { outline: P.ink, fade: 1 - span(f, STRIKE + 3, STRIKE + 7) },
      );
    }
    doubleShock(b, CX, CY, age, P, 0.8);

    // The knife.
    const s = popOut(span(f, POP, POP + 4));
    if (s > 0) {
      const pop = ([0.5, 1.15] as number[])[f] ?? (age === 0 ? 1.1 : 1);
      b.layer((l) => knife(l, angle, SIZE * pop * s, P, age === 0), { outline: age === 1 ? P.white : P.ink });
    }

    b.layer(
      (l) => {
        // A glint runs up the blade as it waits, and pings at the point.
        if (f >= 3 && f < STRIKE) {
          glint(l, angle, SIZE, (f - 3) / 3, P);
        }
        if (f === STRIKE - 1) {
          const [x, y] = transform(PIVOT[0], PIVOT[1], angle, SIZE)([-1.5, -31]);
          l.sparkle(x, y, 4, P.pale, P.white);
        }
        // And once more while it holds after the cut.
        if (f >= 11 && f <= 13) {
          glint(l, angle, SIZE, (f - 11) / 2, P);
        }
        risingSparkles(l, f, STRIKE + 3, CX, CY, 60, 70, P, "kn-s", 12);
      },
      { outline: P.ink, fade: 1 - span(f, 17, 21) },
    );

    b.layer((l) => finalTwinkle(l, PIVOT[0], PIVOT[1] - 4, f - (POP + 4), P), { outline: P.ink });
  };

  return withShake(effect, [
    [STRIKE, 1.5],
    [STRIKE + 2, 0.4],
  ]);
};
