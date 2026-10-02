import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeIn, easeOut, rand, span } from "../../pixel";
import type { Point } from "../classes/shared";
import { ramp, rune } from "../classes/shared";
import { doubleShock, finalTwinkle, withShake } from "../classes3/juice";

// Cast B, "Seal Stamp": a magic circle draws itself over the card while
// motes gather, tightens, then slams down (flash, shake, shockwave, card
// frame flash) and breaks apart into flying runes.

const CARD = { x0: 15, y0: 4, x1: 94, y1: 121 };
const TAU = Math.PI * 2;
const STAMP = 8;
const R = 28;

export const castSeal = (hex: string): Effect => {
  const P = ramp(hex);

  const effect: Effect = (b, f) => {
    const age = f - STAMP;
    const drawn = easeOut(span(f, -1, 5));
    const spin = f * 0.08 + (f >= 6 && f < STAMP ? (f - 5) * 0.2 : 0) + Math.max(0, age) * 0.05;
    const scale =
      f < STAMP ? (f === 7 ? 0.9 : 1) : (([1.35, 0.9, 1.05] as number[])[age] ?? 1) + Math.max(0, easeIn(span(f, 13, 18)) * 0.45);
    const r = R * scale;

    // The circle.
    b.layer(
      (l) => {
        const flash = age === 0;
        const s = -Math.PI / 2 + spin;
        if (f >= 5 && f < STAMP) {
          l.disc(CX, CY, r - 9, P.light, 0.25 + (f - 5) * 0.1);
        }
        l.ring(CX, CY, r, 2, flash ? P.white : P.base, 1, s, s + drawn * TAU);
        l.ring(CX, CY, r - 7, 1, flash ? P.white : P.light, 1, s + Math.PI, s + Math.PI + drawn * TAU);
        l.ring(CX, CY, r - 13, 1, flash ? P.white : P.base, 1, s, s + drawn * TAU);
        // Ticks round the outside.
        for (let i = 0; i < 16; i++) {
          if (i / 16 > drawn) {
            continue;
          }
          const a = s + (i * TAU) / 16;
          const r0 = r + 2;
          const r1 = r + (i % 4 === 0 ? 5 : 3);
          l.line(CX + Math.cos(a) * r0, CY + Math.sin(a) * r0, CX + Math.cos(a) * r1, CY + Math.sin(a) * r1, flash ? P.white : P.light);
        }
        // Four nodes at the cardinal points.
        for (let i = 0; i < 4; i++) {
          if (i / 4 > drawn) {
            continue;
          }
          const a = -s * 0.5 + (i * TAU) / 4;
          const x = CX + Math.cos(a) * (r - 3.5);
          const y = CY + Math.sin(a) * (r - 3.5);
          const n = age >= 3 && (age + i) % 4 === 0 ? 3.5 : 2.5;
          l.polygon([[x, y - n], [x + n, y], [x, y + n], [x - n, y]] as Point[], flash ? P.white : P.pale);
        }
        // Runes between the inner rings.
        for (let i = 0; i < 6; i++) {
          if (i / 6 > drawn) {
            continue;
          }
          const a = -spin * 1.5 + (i * TAU) / 6;
          rune(l, CX + Math.cos(a) * (r - 10), CY + Math.sin(a) * (r - 10), i, flash ? P.white : P.pale);
        }
      },
      { outline: age === 1 ? P.white : P.ink, fade: 1 - span(f, 13, 18) },
    );

    // Motes gathering before the stamp.
    if (f < STAMP) {
      b.layer(
        (l) => {
          for (let i = 0; i < 14; i++) {
            const delay = rand(`cs-d-${i}`) * 3;
            const t = span(f + 1, delay, delay + 6);
            if (t <= 0 || t >= 1) {
              continue;
            }
            const a = rand(`cs-a-${i}`) * TAU + t * 2;
            const d = (46 + rand(`cs-r-${i}`) * 12) * (1 - easeIn(t)) + 4;
            l.rect(CX + Math.cos(a) * d, CY + Math.sin(a) * d, 2, 2, i % 3 === 0 ? P.white : P.pale);
          }
        },
        { outline: P.ink },
      );
      return;
    }

    // Card frame flash on the stamp.
    if (age <= 2) {
      const c = [P.white, P.pale, P.light][age];
      b.layer(
        (l) => {
          for (let t = 0; t < 2; t++) {
            l.line(CARD.x0 + t, CARD.y0 + t, CARD.x1 - t, CARD.y0 + t, c);
            l.line(CARD.x0 + t, CARD.y1 - t, CARD.x1 - t, CARD.y1 - t, c);
            l.line(CARD.x0 + t, CARD.y0 + t, CARD.x0 + t, CARD.y1 - t, c);
            l.line(CARD.x1 - t, CARD.y0 + t, CARD.x1 - t, CARD.y1 - t, c);
          }
        },
        { fade: 1 - age / 3 },
      );
    }

    doubleShock(b, CX, CY, age, P);

    b.layer(
      (l) => {
        // Rays on impact.
        if (age <= 2) {
          for (let i = 0; i < 12; i++) {
            const a = (i * TAU) / 12 + 0.13;
            const len = ([46, 38, 26] as number[])[age] * (i % 2 === 0 ? 1 : 0.6);
            l.line(CX + Math.cos(a) * 10, CY + Math.sin(a) * 10, CX + Math.cos(a) * len, CY + Math.sin(a) * len, P.pale);
          }
        }
        // Runes breaking off and flying out as the circle dissolves.
        const ra = f - 13;
        if (ra >= 0 && ra <= 6) {
          for (let i = 0; i < 10; i++) {
            const a = (i * TAU) / 10 + 0.3;
            const d = R * 1.2 + ra * 5;
            rune(l, CX + Math.cos(a) * d, CY + Math.sin(a) * d - ra, i + ra, i % 2 ? P.light : P.pale);
          }
        }
      },
      { outline: P.ink, fade: 1 - span(f, 17, 20) },
    );
    b.layer((l) => finalTwinkle(l, CX, CY, f - 19, P), { outline: P.ink });
  };

  return withShake(effect, [[STAMP, 1]]);
};
