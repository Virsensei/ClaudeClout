import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeIn, easeInOut, span } from "../../pixel";
import type { Point } from "../classes/shared";
import { ramp, risingSparkles } from "../classes/shared";
import { doubleShock, finalTwinkle, withShake } from "../classes3/juice";

// Cast A, "Frame Ignite": light races round the card's border from the
// bottom and meets at the top, the corners pop, the frame tightens, then
// the spell releases as a beam shooting up out of the top of the card.

const CARD = { x0: 15, y0: 4, x1: 94, y1: 121 };
const RELEASE = 9;
const HALF = CX - CARD.x0 + (CARD.y1 - CARD.y0) + (CX - CARD.x0);

// Point `s` px along the left half of the frame (bottom centre → top centre).
const along = (s: number, inset: number): Point => {
  const bottom = CX - CARD.x0;
  const side = CARD.y1 - CARD.y0;
  if (s <= bottom) {
    return [CX - s, CARD.y1 - inset];
  }
  if (s <= bottom + side) {
    return [CARD.x0 + inset, CARD.y1 - (s - bottom)];
  }
  return [CARD.x0 + (s - bottom - side), CARD.y0 + inset];
};
const mirror = ([x, y]: Point): Point => [CARD.x0 + CARD.x1 - x, y];

const corners: Point[] = [
  [CARD.x0, CARD.y1],
  [CARD.x0, CARD.y0],
  [CARD.x1, CARD.y1],
  [CARD.x1, CARD.y0],
];
// Distance along the half-frame at which each corner is reached.
const cornerAt = [CX - CARD.x0, CX - CARD.x0 + (CARD.y1 - CARD.y0)];

export const castFrame = (hex: string): Effect => {
  const P = ramp(hex);

  const effect: Effect = (b, f) => {
    const reach = HALF * easeInOut(span(f, -1, 5));
    const contract = f === RELEASE - 1 ? 1 : 0;

    // The frame.
    b.layer(
      (l) => {
        for (let s = 0; s <= reach; s++) {
          const fresh = reach - s < 10 && f < 6;
          for (const p of [along(s, contract), mirror(along(s, contract))]) {
            const [x, y] = p;
            const inX = x <= CX ? 1 : -1;
            const inY = y <= CY ? 1 : -1;
            const onSide = x === CARD.x0 + contract || x === CARD.x1 - contract;
            const c0 = f === RELEASE ? P.white : fresh ? P.pale : P.base;
            const c1 = f === RELEASE ? P.white : contract ? P.pale : P.light;
            l.set(x, y, c0);
            l.set(onSide ? x + inX : x, onSide ? y : y + inY, c1);
          }
        }
        // Corner gems popping as the light passes them.
        corners.forEach(([x, y], i) => {
          const at = cornerAt[i % 2];
          if (reach < at) {
            return;
          }
          const age = f - Math.ceil(((at / HALF) * 6) - 1);
          // Kept a few pixels inside the corner so the pop never touches the canvas edge.
          const r = ([2, 4, 3] as number[])[age] ?? 3;
          const cx = x + (x === CARD.x0 ? 3 : -3);
          const cy = y + (y === CARD.y0 ? 3 : -3);
          const c = f === RELEASE ? P.white : P.light;
          l.polygon([[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]], c);
          l.set(cx - 1, cy - 1, P.white);
        });
        // The two racing heads.
        if (f < 5) {
          for (const p of [along(reach, 2), mirror(along(reach, 2))]) {
            l.sparkle(p[0], p[1], 2, P.pale, P.white);
          }
        }
        if (f === 5) {
          l.sparkle(CX, CARD.y0 + 5, 4, P.pale, P.white);
        }
      },
      { outline: f === RELEASE + 1 ? P.white : P.ink, fade: 1 - span(f, 12, 18) },
    );

    // Charging: motes pulled from the frame towards the middle.
    if (f >= 5 && f < RELEASE) {
      b.layer(
        (l) => {
          for (let i = 0; i < 10; i++) {
            const t = span(f + (i % 3) * 0.5, 5, RELEASE);
            const s0 = (i / 10) * HALF;
            const [x0, y0] = i % 2 ? along(s0, 2) : mirror(along(s0, 2));
            const e = easeIn(t);
            l.rect(x0 + (CX - x0) * e, y0 + (CY - y0) * e, 2, 2, i % 3 === 0 ? P.white : P.pale);
          }
          l.disc(CX, CY, 1 + span(f, 5, RELEASE) * 4, P.light);
          l.disc(CX, CY, span(f, 5, RELEASE) * 2, P.white);
        },
        { outline: P.ink },
      );
    }

    if (f < RELEASE) {
      return;
    }
    const age = f - RELEASE;
    doubleShock(b, CX, CY, age, P);

    // The release: a beam shooting up to the top of the card, where it
    // flares; then it draws itself up into the flare and is gone.
    const TOP = CARD.y0 + 4;
    const width = ([14, 12, 10, 8, 6, 4, 3, 2, 1] as number[])[age] ?? 0;
    if (width > 0) {
      const bottom = CY - easeIn(span(age, 1, 8)) * (CY - TOP);
      b.layer(
        (l) => {
          l.rect(CX - width / 2, TOP, width, bottom - TOP, P.base);
          if (width > 2) {
            l.rect(CX - width / 2 + 1, TOP, width - 2, bottom - TOP, P.light);
          }
          if (width > 4) {
            l.rect(CX - width / 4, TOP, width / 2, bottom - TOP, P.white);
          }
          // Flare where the beam meets the top of the card.
          const flare = ([7, 6, 5, 4, 3, 2] as number[])[age] ?? 0;
          if (flare > 0) {
            l.sparkle(CX, TOP + 2, flare, P.pale, P.white);
          }
          if (age <= 1) {
            l.disc(CX, CY, age === 0 ? 12 : 8, P.white);
          }
        },
        { outline: P.ink },
      );
    }

    b.layer(
      (l) => {
        risingSparkles(l, f, RELEASE + 2, CX, CY + 8, 70, 66, P, "cf-s", 16);
      },
      { outline: P.ink },
    );
    b.layer((l) => finalTwinkle(l, CX, CARD.y0 + 8, f - 19, P), { outline: P.ink });
  };

  return withShake(effect, [[RELEASE, 1]]);
};
