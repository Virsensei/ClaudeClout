import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeInOut, easeOut, span } from "../../pixel";
import { ramp, soul } from "./shared";

// Perseverance (purple): three strings stretch across the card, the SOUL
// hops between them, then they are pulled into a spider web that pulses
// and unravels.

const P = ramp("#D938F9");
const TAU = Math.PI * 2;
const LANES = [CY - 16, CY, CY + 16];
const LEFT = 18;
const RIGHT = 92;
const WEB = 10;
// Lane the SOUL is on at each frame while it hops along.
const HOPS = [1, 1, 0, 0, 2, 2, 1, 0, 0, 1];

const soulPosition = (t: number): [number, number] => {
  const x = LEFT + 4 + (RIGHT - LEFT - 8) * (t / (HOPS.length - 1));
  const k = Math.min(HOPS.length - 2, Math.floor(t));
  const frac = easeInOut(Math.min(1, (t - k) * 2.2));
  const y = LANES[HOPS[k]] + (LANES[HOPS[k + 1]] - LANES[HOPS[k]]) * frac;
  return [x, y];
};

export const perseverance: Effect = (b, f) => {
  // The strings, drawn in from the left; they fade as the web forms.
  b.layer(
    (l) => {
      const reach = LEFT + (RIGHT - LEFT) * easeOut(span(f, -1, 4));
      LANES.forEach((y) => {
        l.line(LEFT, y, reach, y, P.base);
        l.rect(LEFT - 1, y - 2, 1, 5, P.light);
        if (reach >= RIGHT) {
          l.rect(RIGHT + 1, y - 2, 1, 5, P.light);
        }
      });
    },
    { outline: P.ink, fade: 1 - span(f, WEB, WEB + 3) },
  );

  // SOUL hopping between strings, with afterimages; then it is pulled to
  // the centre of the web.
  if (f < 20) {
    const hopT = Math.min(HOPS.length - 1, Math.max(0, f - 1));
    let [x, y] = soulPosition(hopT);
    if (f >= WEB) {
      const pull = easeInOut(span(f, WEB, WEB + 2));
      x += (CX - x) * pull;
      y += (CY - y) * pull;
    }
    if (f >= 2 && f < WEB) {
      b.layer((l) => {
        [0.6, 0.35].forEach((level, k) => {
          const [ax, ay] = soulPosition(Math.max(0, hopT - (k + 1) * 0.5));
          soul(l, ax, ay, 5, P, { level });
        });
      });
    }
    const size = f === WEB + 3 ? 8 : f >= WEB + 3 ? 6.5 : 5;
    b.layer((l) => soul(l, x, y, size * Math.min(1, span(f, 0, 2) + 0.4), P, { flash: f === WEB + 3 }), {
      outline: P.ink,
      fade: 1 - span(f, 16, 20),
    });
  }

  if (f < WEB) {
    return;
  }

  // The web: spokes shoot out, then rings join them.
  const webFade = 1 - span(f, 15, 21);
  b.layer(
    (l) => {
      const spoke = 36 * easeOut(span(f, WEB, WEB + 2));
      const spin = 0.12 * (f - WEB);
      const point = (i: number, r: number): [number, number] => {
        const a = spin + (i * TAU) / 8;
        return [CX + Math.cos(a) * r, CY + Math.sin(a) * r];
      };
      for (let i = 0; i < 8; i++) {
        l.line(CX, CY, ...point(i, spoke), P.pale);
      }
      [12, 22, 32].forEach((r, k) => {
        if (f < WEB + 1 + k || r > spoke + 1) {
          return;
        }
        for (let i = 0; i < 8; i++) {
          // Slight sag between spokes for a silky look.
          const [x0, y0] = point(i, r);
          const [x1, y1] = point(i + 1, r);
          const [mx, my] = point(i + 0.5, r * 0.9);
          l.line(x0, y0, mx, my, f === WEB + 3 ? P.white : P.light);
          l.line(mx, my, x1, y1, f === WEB + 3 ? P.white : P.light);
        }
      });
    },
    { outline: P.ink, fade: webFade },
  );

  // Pulse ring when the web is complete.
  const age = f - (WEB + 3);
  if (age >= 0 && age <= 5) {
    const t = age / 5;
    b.ring(CX, CY, 14 + easeOut(t) * 32, 3 - 2 * t, P.pale, 1 - t * 0.85);
  }

  // Sparkles drifting off the web as it unravels.
  b.layer(
    (l) => {
      for (let i = 0; i < 12; i++) {
        const born = 14 + (i % 6);
        const t = f - born;
        if (t < 0 || t > 3) {
          continue;
        }
        const a = (i * TAU) / 8;
        const r = [12, 22, 32][i % 3];
        l.sparkle(CX + Math.cos(a) * r, CY + Math.sin(a) * r + t * 2, [2, 1, 1, 1][t], P.light, P.white);
      }
    },
    { outline: P.ink },
  );
};
