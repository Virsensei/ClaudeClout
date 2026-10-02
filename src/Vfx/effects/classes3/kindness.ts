import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeOut, rand, span } from "../../pixel";
import type { PixelBuffer, RGB } from "../../pixel";
import { plus, ramp } from "../classes/shared";
import { bouncePosition, finalTwinkle, popOut, withShake } from "./juice";

// Kindness (green): cooking. A frying pan slides in with a sizzling
// pancake, dips, and flips it high into the air spinning; it lands back in
// the pan with a squash and a sizzle splash, a pat of butter drops on and
// melts, steam and healing pluses rise, and it all pops away.

const P = ramp("#00FA3E");
const FLIP = 5;
const CATCH = 11;
const BUTTER = 13;
const POP = 15;
const PAN_Y = CY + 24;

const fillEllipse = (l: PixelBuffer, cx: number, cy: number, rx: number, ry: number, c: RGB) => {
  if (rx <= 0 || ry <= 0) {
    return;
  }
  for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
    for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
      if ((x / rx) ** 2 + (y / ry) ** 2 <= 1) {
        l.set(cx + x, cy + y, c);
      }
    }
  }
};

const pan = (l: PixelBuffer, x: number, y: number, s: number) => {
  l.thickLine(x + 19 * s, y + 1, x + 40 * s, y + 5 * s, 3 * s, P.deep);
  l.line(x + 20 * s, y, x + 39 * s, y + 4 * s, P.base);
  fillEllipse(l, x, y, 22 * s, 6 * s, P.base);
  fillEllipse(l, x, y - 0.5, 19.5 * s, 4.5 * s, P.deep);
  l.line(x - 14 * s, y - 4 * s, x - 4 * s, y - 5 * s, P.light);
};

// Pancake seen from the side; `spin` flips which face shows.
const pancake = (l: PixelBuffer, x: number, y: number, rx: number, ry: number, spin: number, flash: boolean) => {
  const top = Math.cos(spin) >= 0;
  fillEllipse(l, x, y, rx, ry, flash ? P.white : top ? P.light : P.base);
  if (!flash && ry > 2) {
    fillEllipse(l, x - rx * 0.25, y - ry * 0.3, rx * 0.45, ry * 0.35, top ? P.pale : P.light);
  }
};

const effect: Effect = (b, f) => {
  const s = popOut(span(f, POP, POP + 4));
  const slide = -44 * (1 - easeOut(span(f, -1, 2)));
  const panX = CX - 8 + slide;
  const jerk = ({ 4: 3, 5: -3, 6: -1 } as Record<number, number>)[f] ?? 0;
  const panY = PAN_Y + jerk;

  if (s > 0) {
    b.layer(
      (l) => {
        pan(l, panX, panY, s);
        // Pancake: sizzling, flipping through the air, landing.
        let px = panX;
        let py = panY - 4;
        let rx = 13;
        let ry = 3.5;
        let spin = 0;
        if (f >= FLIP && f < CATCH) {
          const t = span(f, FLIP, CATCH);
          py = panY - 4 - 4 * 46 * t * (1 - t);
          spin = t * Math.PI * 3;
          ry = 1 + 4 * Math.abs(Math.cos(spin));
          px += Math.sin(t * Math.PI) * 4;
        } else if (f >= CATCH) {
          const squash: Record<number, [number, number]> = { 11: [16, 2.2], 12: [12, 4.6] };
          [rx, ry] = squash[f] ?? [13, 3.5];
        }
        pancake(l, px, py, rx * s, ry * s, spin, f === CATCH);

        // Butter: drops on, squishes, melts.
        if (f >= BUTTER - 2) {
          const bt = span(f, BUTTER - 2, BUTTER);
          const by = panY - 40 + (36 - 0) * bt * bt;
          if (f < BUTTER) {
            l.rect(px - 2, by - 2, 5, 4, P.white);
          } else {
            const melt = span(f, BUTTER, BUTTER + 3);
            const w = (f === BUTTER ? 8 : 5 + melt * 6) * s;
            fillEllipse(l, px, panY - 6, w / 2, (f === BUTTER ? 1.2 : 1.6 - melt * 0.6) * s, P.white);
          }
        }
      },
      { outline: f === CATCH + 1 ? P.white : P.ink },
    );
  }

  // Sizzle: little bubbles and steam wisps before the flip.
  if (f >= 1 && f < FLIP) {
    b.layer((l) => {
      for (let i = 0; i < 4; i++) {
        if ((f + i) % 2 === 0) {
          l.set(panX - 9 + i * 6, panY - 5, P.white);
        }
        const t = (f + i) % 3;
        l.line(panX - 8 + i * 5, panY - 9 - t * 3, panX - 7 + i * 5, panY - 12 - t * 3, P.pale, 0.7);
      }
    });
  }

  // Flat shockwaves rolling out along the pan on the catch.
  const age = f - CATCH;
  if (age >= 0 && age <= 4) {
    const r = 24 + (age / 4) * 30;
    b.ellipseRing(panX, panY, r, r * 0.25, 1, P.white, 1 - (age / 4) * 0.7);
  }
  if (age >= 0 && age <= 7) {
    const t = age / 7;
    const r = 22 + (1 - (1 - t) ** 3) * 24;
    b.ellipseRing(panX, panY, r, r * 0.25, 3 - 2 * t, P.pale, 1 - t * 0.85);
  }

  b.layer(
    (l) => {
      // Sizzle splash: droplets bouncing off the pan rim.
      if (age >= 0 && age <= 8) {
        for (let i = 0; i < 10; i++) {
          const vx = (i - 4.5) * 0.9;
          const vy = -3.5 - (i % 3);
          const [x, y] = bouncePosition(panX, panY - 6, vx, vy, age, panY + 2);
          l.rect(x, y, age < 4 ? 2 : 1, age < 4 ? 2 : 1, i % 2 ? P.pale : P.light);
        }
      }
      // Steam curling up and healing pluses rising.
      if (f >= CATCH + 1) {
        for (let k = 0; k < 3; k++) {
          const t = (f - CATCH - 1 + k * 2) % 6;
          for (let j = 0; j < 4; j++) {
            const y = panY - 12 - t * 4 - j * 3;
            const x = panX - 8 + k * 8 + Math.sin(j * 1.2 + f * 0.8) * 2;
            l.set(x, y, P.pale);
          }
        }
        for (let i = 0; i < 12; i++) {
          const born = CATCH + 2 + rand(`kc-b-${i}`) * 6;
          const t = f - born;
          if (t < 0 || t > Math.min(6, 21 - born)) {
            continue;
          }
          const x = CX + (rand(`kc-x-${i}`) - 0.5) * 60;
          const y = panY - 16 - rand(`kc-y-${i}`) * 20 - t * 3.5;
          plus(l, x, y, t < 1 ? 1 : t < 5 ? 2 : 1, i % 3 === 0 ? P.white : i % 3 === 1 ? P.pale : P.light);
        }
      }
    },
    { outline: P.ink, fade: 1 - span(f, 18, 21) },
  );

  b.layer((l) => finalTwinkle(l, panX, panY - 6, f - (POP + 4), P), { outline: P.ink });
};

export const kindness = withShake(effect, [[CATCH, 1]]);
