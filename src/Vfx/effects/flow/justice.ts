import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeOut, rand, span } from "../../pixel";
import { lightning, orb, palette } from "./shared";

// Justice (yellow): lightning lock. Crackling arcs strike in from the
// card's corners and charge the centre, which compresses to a point and
// fires a precise cross of light that crackles away.

const P = palette("#FFD83D");
const CHARGE = 8;
const FIRE = 10;
const TOP = 4;
const BOTTOM = 121;
const LEFT = 15;
const RIGHT = 94;

const CORNERS: [number, number][] = [
  [LEFT + 1, TOP + 2],
  [RIGHT - 1, TOP + 2],
  [LEFT + 1, BOTTOM - 2],
  [RIGHT - 1, BOTTOM - 2],
];

export const justice: Effect = (b, f) => {
  // Arcs from the corners, re-jagged every frame.
  if (f < CHARGE) {
    b.layer(
      (l) => {
        CORNERS.forEach(([x, y], i) => {
          const reach = easeOut(span(f, -1 + i * 0.7, 2.5 + i * 0.7));
          if (reach <= 0) {
            return;
          }
          const pts = lightning(l, x, y, CX, CY, `jl-${i}-${f}`, P.base, P.white, reach, 6);
          // A small fork off the middle.
          const [mx, my] = pts[3];
          const fa = rand(`jf-${i}-${f}`) * Math.PI * 2;
          if (reach > 0.6) {
            lightning(l, mx, my, mx + Math.cos(fa) * 10, my + Math.sin(fa) * 10, `jf2-${i}-${f}`, P.hot, P.pale, 1, 3, 1);
          }
        });
      },
      { outline: P.ink },
    );
  }

  // Charge in the centre.
  if (f < FIRE) {
    const charged = CORNERS.filter((_, i) => f >= 2.5 + i * 0.7).length;
    const r = f >= CHARGE ? [3, 1.5][f - CHARGE] : 2 + charged * 1.3 + (f % 2) * 0.6;
    b.layer(
      (l) => {
        orb(l, CX, CY, r, P);
        // Crackles around the charge.
        for (let i = 0; i < 5; i++) {
          if (f >= CHARGE) {
            break;
          }
          const a = rand(`jc-a-${i}-${f}`) * Math.PI * 2;
          const d = r + 4 + rand(`jc-d-${i}-${f}`) * 6;
          l.sparkle(CX + Math.cos(a) * d, CY + Math.sin(a) * d, 1, P.light, P.white);
        }
        // Compression lines just before firing.
        if (f >= CHARGE) {
          for (let i = 0; i < 4; i++) {
            const a = Math.PI / 4 + (i * Math.PI) / 2;
            const d0 = f === CHARGE ? 20 : 10;
            l.line(CX + Math.cos(a) * d0, CY + Math.sin(a) * d0, CX + Math.cos(a) * (d0 - 6), CY + Math.sin(a) * (d0 - 6), P.pale);
          }
        }
      },
      { outline: P.ink },
    );
    return;
  }

  const age = f - FIRE;

  // The cross of light.
  const w = [6, 4, 3, 2, 1][age] ?? 0;
  if (w > 0) {
    b.layer(
      (l) => {
        l.rect(CX - w / 2, TOP, w, BOTTOM - TOP + 1, P.base);
        l.rect(LEFT, CY - Math.max(1, w / 2 - 1) / 2, RIGHT - LEFT + 1, Math.max(1, w / 2), P.base);
        if (w > 2) {
          l.rect(CX - w / 2 + 1, TOP, w - 2, BOTTOM - TOP + 1, P.light);
        }
        l.line(CX, TOP, CX, BOTTOM, P.white);
        l.line(LEFT, CY, RIGHT, CY, w > 2 ? P.white : P.light);
        if (age <= 1) {
          l.sparkle(CX, CY, age === 0 ? 7 : 4, P.pale, P.white);
        }
      },
      { outline: P.ink },
    );
  }

  if (age <= 6) {
    const t = age / 6;
    b.ring(CX, CY, 8 + easeOut(t) * 34, 3 - 2 * t, P.pale, 1 - t * 0.85);
  }

  // Crackle running along where the beams were, then sparks drifting off.
  b.layer(
    (l) => {
      if (age >= 1 && age <= 7) {
        for (let i = 0; i < 4; i++) {
          const vertical = i % 2 === 0;
          const s = rand(`jb-${i}-${f}`);
          const x = vertical ? CX : LEFT + 6 + s * (RIGHT - LEFT - 12);
          const y = vertical ? TOP + 6 + s * (BOTTOM - TOP - 12) : CY;
          const len = 6 + rand(`jbl-${i}-${f}`) * 6;
          lightning(
            l,
            x,
            y,
            x + (vertical ? (rand(`jbx-${i}-${f}`) - 0.5) * 6 : len),
            y + (vertical ? len : (rand(`jby-${i}-${f}`) - 0.5) * 6),
            `jbz-${i}-${f}`,
            P.hot,
            P.pale,
            1,
            2,
            1,
          );
        }
      }
      for (let i = 0; i < 16; i++) {
        const born = 1 + rand(`js-b-${i}`) * 5;
        const t = age - born;
        if (t < 0 || t > Math.min(5, 12 - born)) {
          continue;
        }
        const onVertical = i % 2 === 0;
        const s = rand(`js-s-${i}`);
        const x0 = onVertical ? CX : LEFT + s * (RIGHT - LEFT);
        const y0 = onVertical ? TOP + s * (BOTTOM - TOP) : CY;
        const dir = i % 4 < 2 ? 1 : -1;
        const x = x0 + (onVertical ? dir * t * 3 : 0);
        const y = y0 + (onVertical ? 0 : dir * t * 3) - t;
        l.sparkle(x, y, t < 2 ? 1 : 0, P.light, P.white);
      }
    },
    { outline: P.ink },
  );
};
