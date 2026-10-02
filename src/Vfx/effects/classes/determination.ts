import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeIn, easeOut, rand, span } from "../../pixel";
import { debris, ramp, risingSparkles, shockwave, stampScale, star4 } from "./shared";

// Determination (red): a rune circle draws itself while motes gather, a
// small star charges in the middle, then a big four-point star slams down,
// the card frame flashes, and it all dissolves into sparkles.

const P = ramp("#FF001D");
const TAU = Math.PI * 2;
const STAMP = 10;
const R = 30;
const CARD = { x0: 15, y0: 4, x1: 94, y1: 121 };

export const determination: Effect = (b, f) => {
  // Rune circle with triangle marks.
  const drawn = easeOut(span(f, -1, 5));
  const spin = f * 0.07 + Math.max(0, f - STAMP) * 0.16;
  const r = R + easeOut(span(f, STAMP, STAMP + 8)) * 8;
  b.layer(
    (l) => {
      const s = -Math.PI / 2 + spin;
      l.ring(CX, CY, r, 2, P.base, 1, s, s + drawn * TAU);
      l.ring(CX, CY, r - 8, 1, P.light, 1, s + Math.PI, s + Math.PI + drawn * TAU);
      for (let i = 0; i < 6; i++) {
        if (i / 6 > drawn) {
          continue;
        }
        const a = s + (i * TAU) / 6;
        const out = i % 2 === 0 ? 1 : -1;
        const mx = CX + Math.cos(a) * (r - 4);
        const my = CY + Math.sin(a) * (r - 4);
        const px = -Math.sin(a) * 2.5;
        const py = Math.cos(a) * 2.5;
        l.polygon(
          [
            [mx + Math.cos(a) * 2.5 * out, my + Math.sin(a) * 2.5 * out],
            [mx - Math.cos(a) * 1.5 * out + px, my - Math.sin(a) * 1.5 * out + py],
            [mx - Math.cos(a) * 1.5 * out - px, my - Math.sin(a) * 1.5 * out - py],
          ],
          P.pale,
        );
      }
    },
    { outline: P.ink, fade: 1 - span(f, STAMP + 2, STAMP + 8) },
  );

  // Motes spiralling in.
  b.layer(
    (l) => {
      for (let i = 0; i < 14; i++) {
        const delay = rand(`dm-d-${i}`) * 3;
        const t = span(f + 1, delay, delay + 7);
        if (t <= 0 || t >= 1) {
          continue;
        }
        const r0 = 46 + rand(`dm-r-${i}`) * 12;
        const a = rand(`dm-a-${i}`) * TAU + t * 2.2;
        const d = r0 * (1 - easeIn(t));
        l.rect(CX + Math.cos(a) * d, CY + Math.sin(a) * d, 2, 2, i % 3 === 0 ? P.white : P.pale);
      }
    },
    { outline: P.ink },
  );

  // Small star charging in the middle.
  if (f >= 5 && f < STAMP) {
    const size = 3 + (f - 5) * 1.6;
    b.layer((l) => l.polygon(star4(CX, CY, size, size * 0.3, f * 0.3), f % 2 ? P.white : P.pale), {
      outline: P.ink,
    });
  }

  if (f < STAMP) {
    return;
  }
  const age = f - STAMP;
  const scale = stampScale(age);

  // Card frame flash.
  if (age <= 3) {
    const c = [P.white, P.pale, P.light, P.base][age];
    b.layer(
      (l) => {
        for (let t = 0; t < 2; t++) {
          l.line(CARD.x0 + t, CARD.y0 + t, CARD.x1 - t, CARD.y0 + t, c);
          l.line(CARD.x0 + t, CARD.y1 - t, CARD.x1 - t, CARD.y1 - t, c);
          l.line(CARD.x0 + t, CARD.y0 + t, CARD.x0 + t, CARD.y1 - t, c);
          l.line(CARD.x1 - t, CARD.y0 + t, CARD.x1 - t, CARD.y1 - t, c);
        }
      },
      { fade: 1 - age / 4 },
    );
  }

  shockwave(b, CX, CY, age, 14, 34, P.pale);

  // The star.
  b.layer(
    (l) => {
      const flash = age === 0;
      const rot = age * 0.04;
      l.polygon(star4(CX, CY, 24 * scale, 6 * scale, rot), flash ? P.white : P.base);
      if (!flash) {
        l.polygon(star4(CX, CY, 15 * scale, 3.5 * scale, rot), P.light);
        l.disc(CX, CY, 2.5, P.white);
        // Twinkles running round the tips.
        if (age >= 2 && age <= 7) {
          const tip = (age - 2) % 4;
          const a = rot - Math.PI / 2 + (tip * Math.PI) / 2;
          l.sparkle(CX + Math.cos(a) * 24, CY + Math.sin(a) * 24, 2, P.pale, P.white);
        }
      }
    },
    { outline: age === 1 ? P.white : P.ink, fade: 1 - span(f, 17, 22) },
  );

  b.layer(
    (l) => {
      debris(l, CX, CY, age, [P.pale, P.light, P.base], "dd");
      risingSparkles(l, f, 15, CX, CY, 60, 50, P, "drs");
    },
    { outline: P.ink },
  );
};
