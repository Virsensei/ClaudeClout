import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeIn, easeOut, rand, span } from "../../pixel";
import type { PixelBuffer } from "../../pixel";
import { ramp, risingSparkles, star4 } from "../classes/shared";
import { doubleShock, finalTwinkle, popOut, withShake } from "../classes3/juice";

// Cast, "Save Star" (Determination): the save-point star pops in and
// twinkles while motes of determination spiral into it; it swells and
// trembles, then bursts (flash, cross flare, shake, shockwave). A ring of
// little stars blooms out and each winks away on its own beat, and the
// big star spins down into a twinkle. Everything stays inside the card.

const TAU = Math.PI * 2;
const BURST = 7;
const POP = 15;
const MINI = 8;

// Main star radius per frame: pop, grow while charging, burst, settle.
const RADIUS: Record<number, number> = { 0: 7, 1: 13, 2: 11, 3: 11.5, 4: 12.5, 5: 13.5, 6: 14.5, 7: 30, 8: 21, 9: 15, 10: 17.5 };
const radiusAt = (f: number) => RADIUS[f] ?? 16.5;

const bigStar = (l: PixelBuffer, x: number, y: number, r: number, spin: number, p: ReturnType<typeof ramp>, flash: boolean) => {
  if (flash) {
    l.polygon(star4(x, y, r, r * 0.3, spin), p.white);
    return;
  }
  l.polygon(star4(x, y, r, r * 0.3, spin), p.base);
  l.polygon(star4(x, y, r * 0.72, r * 0.24, spin), p.light);
  l.polygon(star4(x, y, r * 0.45, r * 0.16, spin), p.pale);
  l.disc(x, y, Math.max(1, r * 0.12), p.white);
};

// Little stars blooming out after the burst, each with its own timing.
const MINIS = new Array(MINI).fill(0).map((_, i) => ({
  angle: (i * TAU) / MINI + 0.2 + (rand(`ss-a-${i}`) - 0.5) * 0.3,
  dist: 0.78 + rand(`ss-d-${i}`) * 0.22,
  leave: 12.5 + rand(`ss-l-${i}`) * 4,
  spin: (rand(`ss-s-${i}`) - 0.5) * 0.5,
}));

// Layer names, bottom to top. Pass one to `castStar` to render only that
// layer (stacking all seven in this order gives the full effect), e.g. to
// rebuild or retime it in another tool.
export const STAR_LAYERS = ["Motes", "Flare", "Shockwave", "MiniStars", "Star", "Sparkles", "Twinkle"];

export const castStar = (hex: string, only?: string): Effect => {
  const P = ramp(hex);
  const on = (layer: string) => !only || only === layer;

  const effect: Effect = (b, f) => {
    const age = f - BURST;
    const s = popOut(span(f, POP, POP + 4));
    const shiver = f >= 5 && f < BURST ? (f % 2 ? 1 : -1) : 0;
    const x = CX + shiver;
    const y = CY;
    // A gentle twinkle wobble that keeps the points on the cross flare's axes.
    const spin = age === 0 ? 0 : Math.sin(f * 0.9) * 0.1;

    // Motes of determination spiralling in while it charges.
    if (f < BURST && on("Motes")) {
      b.layer(
        (l) => {
          for (let i = 0; i < 14; i++) {
            const delay = rand(`ss-md-${i}`) * 2.5;
            const t = span(f + 1, delay, delay + 5);
            if (t <= 0 || t >= 1) {
              continue;
            }
            const a = rand(`ss-ma-${i}`) * TAU + t * 2.2;
            const d = (30 + rand(`ss-mr-${i}`) * 8) * (1 - easeIn(t)) + 6;
            l.rect(CX + Math.cos(a) * d, CY + Math.sin(a) * d * 1.3, 2, 2, i % 3 === 0 ? P.white : P.pale);
          }
        },
        { outline: P.ink },
      );
    }

    // Cross flare on the burst: long thin rays along the star's points.
    if (age >= 0 && age <= 3 && on("Flare")) {
      b.layer(
        (l) => {
          const len = ([1, 0.75, 0.5, 0.25] as number[])[age];
          const w = ([3, 2, 1, 1] as number[])[age];
          l.thickLine(CX, CY - 48 * len, CX, CY + 48 * len, w, age === 0 ? P.white : P.pale);
          l.thickLine(CX - 36 * len, CY, CX + 36 * len, CY, w, age === 0 ? P.white : P.pale);
          for (let i = 0; i < 4; i++) {
            const a = Math.PI / 4 + (i * TAU) / 4;
            const r = 22 * len;
            l.line(CX + Math.cos(a) * 8, CY + Math.sin(a) * 8, CX + Math.cos(a) * (8 + r), CY + Math.sin(a) * (8 + r), P.pale);
          }
        },
        { outline: P.ink },
      );
    }
    if (on("Shockwave")) {
      doubleShock(b, CX, CY, age, P, 0.85);
    }

    // The little stars blooming out, each winking away on its own beat.
    if (age >= 1 && on("MiniStars")) {
      b.layer(
        (l) => {
          MINIS.forEach((m, i) => {
            const t = f - BURST - 1;
            const out = easeOut(Math.min(1, t / 4));
            const u = f - m.leave;
            const r = u < 0 ? (t < 1 ? 5.5 : 4 + (((f + i) % 3 === 0) ? 1 : 0)) : (([5, 3, 1.5] as number[])[Math.floor(u)] ?? 0);
            if (r <= 0) {
              return;
            }
            const mx = CX + Math.cos(m.angle) * 31 * m.dist * out;
            const my = CY + Math.sin(m.angle) * 42 * m.dist * out - t * 0.6;
            l.polygon(star4(mx, my, r, Math.max(1, r * 0.3), m.spin * t), u >= 0 && u < 1 ? P.white : P.pale);
            l.set(mx, my, P.white);
          });
        },
        { outline: P.ink },
      );
    }

    // The save star.
    if (s > 0 && on("Star")) {
      const r = radiusAt(f) * s;
      b.layer(
        (l) => {
          bigStar(l, x, y, r, spin, P, age === 0);
          // Save-point twinkle: a bright glint flickering on the star.
          if (age < 0 && f % 2 === 1) {
            l.sparkle(x - r * 0.25, y - r * 0.3, 2, P.pale, P.white);
          }
          if (age >= 3 && f % 3 === 0) {
            l.sparkle(x + r * 0.2, y - r * 0.35, 2, P.pale, P.white);
          }
        },
        { outline: age === 1 ? P.white : P.ink },
      );
      // A soft ring breathing round it while it charges.
      if (age < 0 && f >= 2) {
        b.ring(x, y, r + 5 + (f % 2), 1, P.light);
      }
    }

    if (on("Sparkles")) {
      b.layer(
        (l) => {
          risingSparkles(l, f, BURST + 3, CX, CY + 6, 60, 70, P, "ss-r", 6);
        },
        { outline: P.ink, fade: 1 - span(f, 17, 21) },
      );
    }

    if (on("Twinkle")) {
      b.layer((l) => finalTwinkle(l, CX, CY, f - (POP + 4), P), { outline: P.ink });
    }
  };

  return withShake(effect, [[BURST, 1.5]]);
};
