import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeOut, rand, span } from "../../pixel";
import type { PixelBuffer, RGB } from "../../pixel";
import type { Point } from "../classes/shared";
import { ramp, star, transform } from "../classes/shared";
import { bouncePosition, doubleShock, finalTwinkle, popOut, withShake } from "./juice";

// Justice (yellow): gavel. The gavel rises slowly and quivers at the top,
// swings down in a blur and SLAMS: hit-stop, flash, heavy shake, BANG
// lines, coins that bounce and settle, a verdict star pops up, and it all
// pops away.

const P = ramp("#FFD83D");
const TAU = Math.PI * 2;
const HIT = 8;
const POP = 15;
const BLOCK_Y = CY + 24;
const FLOOR = BLOCK_Y + 9;
const PIVOT: Point = [CX + 34, BLOCK_Y - 9];
const STAR: Point = [CX - 2, CY - 18];

// 0 = head on the block, positive = raised.
const angleAt = (f: number) => {
  if (f < 5) {
    return 0.3 + easeOut(span(f, -1, 5)) * 1.6;
  }
  const keys: Record<number, number> = { 5: 1.94, 6: 1.86, 7: 0.85, 8: 0, 9: 0, 10: 0.32, 11: 0.1 };
  return keys[f] ?? 0;
};

const gavel = (l: PixelBuffer, angle: number, s: number, flash: boolean) => {
  const t = transform(PIVOT[0], PIVOT[1], angle, s);
  const c = (x: RGB) => (flash ? P.white : x);
  l.thickLine(...t([0, 0]), ...t([-27, 0]), 3 * s, c(P.deep));
  l.line(...t([0, -1]), ...t([-27, -1]), c(P.base));
  l.polygon(([[-42, -8], [-27, -8], [-27, 8], [-42, 8]] as Point[]).map(t), c(P.base));
  l.polygon(([[-42, -8], [-35, -8], [-35, 8], [-42, 8]] as Point[]).map(t), c(P.light));
  l.line(...t([-38, -8]), ...t([-38, 8]), c(P.deep));
  l.line(...t([-31, -8]), ...t([-31, 8]), c(P.deep));
};

const effect: Effect = (b, f) => {
  const s = popOut(span(f, POP, POP + 4));
  const age = f - HIT;
  const [hx, hy] = transform(PIVOT[0], PIVOT[1], 0, 1)([-34, 8]);

  if (s > 0) {
    // Block, squashing on the hit.
    b.layer(
      (l) => {
        const squash = age === 0 || age === 1 ? 2 : 0;
        const w = (34 + squash * 2) * s;
        l.rect(CX - w / 2, BLOCK_Y + squash, w, (6 - squash) * s, age === 0 ? P.white : P.base);
        l.line(CX - w / 2 + 1, BLOCK_Y + squash, CX + w / 2 - 1, BLOCK_Y + squash, P.pale);
        l.rect(CX - (13 * s), BLOCK_Y + 6, 26 * s, 2, P.deep);
      },
      { outline: P.ink },
    );

    // Blur arc during the swing.
    if (f === 7) {
      b.layer((l) => {
        for (let k = 1; k <= 4; k++) {
          const [x, y] = transform(PIVOT[0], PIVOT[1], 0.85 + k * 0.22, 1)([-34, 0]);
          l.disc(x, y, 7, P.light, 0.65 - k * 0.12);
        }
      });
    }

    b.layer((l) => gavel(l, angleAt(f), s, age === 0), {
      outline: age === 1 ? P.white : P.ink,
    });
  }

  if (age < 0) {
    return;
  }

  doubleShock(b, hx, hy, age, P, 1.2);

  b.layer(
    (l) => {
      // BANG lines.
      if (age <= 3) {
        for (let i = 0; i < 9; i++) {
          const a = Math.PI + (i * Math.PI) / 8;
          const r0 = 13 + age * 5;
          const r1 = r0 + [12, 9, 6, 3][age];
          l.thickLine(hx + Math.cos(a) * r0, hy + Math.sin(a) * r0, hx + Math.cos(a) * r1, hy + Math.sin(a) * r1, 2, P.pale);
        }
      }
      // Coins flying up, bouncing on the floor and settling.
      if (age >= 1 && age <= 11) {
        for (let i = 0; i < 9; i++) {
          const vx = (i - 4) * 1.1 + (rand(`jc-x-${i}`) - 0.5);
          const vy = -6 - rand(`jc-y-${i}`) * 3;
          const [x, y] = bouncePosition(hx, hy - 6, vx, vy, age, FLOOR);
          const edge = (age + i) % 3 === 0;
          l.rect(x - (edge ? 1 : 2), y - 2, edge ? 2 : 4, 4, P.light);
          if (!edge) {
            l.set(x - 1, y - 1, P.white);
          }
        }
      }
    },
    { outline: P.ink, fade: 1 - span(f, 17, 20) },
  );

  // The verdict star popping up above.
  if (age >= 2 && s > 0) {
    const a2 = age - 2;
    const sc = ([0.4, 1.3, 0.9] as number[])[a2] ?? 1;
    const spin = ([1.2, 0.5, 0.15] as number[])[a2] ?? 0;
    b.layer(
      (l) => {
        star(l, STAR[0], STAR[1], 11 * sc * s, spin, P.base);
        star(l, STAR[0], STAR[1], 6 * sc * s, spin, P.light);
        l.set(STAR[0], STAR[1], P.white);
        if (a2 >= 3 && a2 <= 7) {
          const ang = spin - Math.PI / 2 + ((a2 - 3) * TAU) / 5;
          l.sparkle(STAR[0] + Math.cos(ang) * 11, STAR[1] + Math.sin(ang) * 11, 2, P.pale, P.white);
        }
      },
      { outline: P.ink },
    );
  }

  b.layer((l) => finalTwinkle(l, STAR[0], STAR[1], f - (POP + 4), P), { outline: P.ink });
};

export const justice = withShake(effect, [
  [HIT, 1.5],
  [HIT + 2, 0.5],
]);
