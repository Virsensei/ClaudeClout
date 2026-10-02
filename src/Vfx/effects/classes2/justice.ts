import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeIn, easeOut, rand, span } from "../../pixel";
import type { PixelBuffer } from "../../pixel";
import type { Point } from "../classes/shared";
import { ramp, shockwave, star, transform } from "../classes/shared";

// Justice (yellow): gavel. A gavel rises, winds up and slams down onto its
// block with a BANG of impact lines, a shockwave and golden sparks, bounces
// once, and fades.

const P = ramp("#FFD83D");
const HIT = 7;
const BLOCK_Y = CY + 22;
// The gavel pivots around the end of its handle.
const PIVOT: Point = [CX + 32, BLOCK_Y - 8];

// Angle of the gavel: 0 = head resting on the block; positive = raised.
const angleAt = (f: number) => {
  if (f < 4) {
    return 1.2 + easeOut(span(f, -1, 4)) * 0.5; // rising and winding up
  }
  if (f < HIT) {
    return 1.7 - easeIn(span(f, 4, HIT)) * 1.7; // the swing
  }
  return [0, 0.28, 0.08][f - HIT] ?? 0; // impact, bounce, settle
};

const gavel = (l: PixelBuffer, angle: number, flash: boolean) => {
  const t = transform(PIVOT[0], PIVOT[1], angle, 1);
  const c = (x: typeof P.base) => (flash ? P.white : x);
  // Handle from the pivot to the head.
  l.thickLine(...t([0, 0]), ...t([-26, 0]), 3, c(P.deep));
  l.line(...t([0, -1]), ...t([-26, -1]), c(P.base));
  // Head: a block across the end of the handle.
  l.polygon(([[-38, -7], [-26, -7], [-26, 7], [-38, 7]] as Point[]).map(t), c(P.base));
  l.polygon(([[-38, -7], [-32, -7], [-32, 7], [-38, 7]] as Point[]).map(t), c(P.light));
  l.line(...t([-35, -7]), ...t([-35, 7]), c(P.deep));
  l.line(...t([-29, -7]), ...t([-29, 7]), c(P.deep));
};

export const justice: Effect = (b, f) => {
  const fade = 1 - span(f, 15, 21);
  const age = f - HIT;

  // The sound block.
  b.layer(
    (l) => {
      const squash = age === 0 ? 1 : 0;
      l.rect(CX - 16, BLOCK_Y + squash, 32, 5 - squash, age === 0 ? P.white : P.base);
      l.line(CX - 15, BLOCK_Y + squash, CX + 15, BLOCK_Y + squash, P.pale);
      l.rect(CX - 12, BLOCK_Y + 5, 24, 2, P.deep);
    },
    { outline: P.ink, fade },
  );

  // Motion smear during the swing.
  if (f >= 5 && f < HIT) {
    b.layer((l) => {
      for (let k = 1; k <= 3; k++) {
        const a = angleAt(f) + k * 0.18;
        const [x, y] = transform(PIVOT[0], PIVOT[1], a, 1)([-32, 0]);
        l.disc(x, y, 5, P.light, 0.6 - k * 0.15);
      }
    });
  }

  b.layer((l) => gavel(l, angleAt(f), f === HIT), {
    outline: f === HIT + 1 ? P.white : P.ink,
    fade,
  });

  if (age < 0) {
    return;
  }

  // BANG: impact lines bursting from the hit.
  const [hx, hy] = transform(PIVOT[0], PIVOT[1], 0, 1)([-32, 7]);
  if (age <= 3) {
    b.layer(
      (l) => {
        for (let i = 0; i < 8; i++) {
          const a = Math.PI + (i * Math.PI) / 7;
          const r0 = 12 + age * 5;
          const r1 = r0 + [10, 8, 5, 3][age];
          l.thickLine(hx + Math.cos(a) * r0, hy + Math.sin(a) * r0, hx + Math.cos(a) * r1, hy + Math.sin(a) * r1, 2, P.pale);
        }
        if (age <= 1) {
          star(l, hx, hy - 4, age === 0 ? 11 : 7, 0.2, P.white);
        }
      },
      { outline: P.ink },
    );
  }

  shockwave(b, hx, hy, age, 12, 36, P.pale, 6);
  if (age <= 6) {
    const t = age / 6;
    b.ellipseRing(hx, BLOCK_Y + 4, 18 + easeOut(t) * 26, (18 + easeOut(t) * 26) * 0.25, 2, P.light, 1 - t * 0.8);
  }

  // Golden sparks and little stars flying up and raining down.
  b.layer(
    (l) => {
      for (let i = 0; i < 14; i++) {
        const a = -Math.PI / 2 + (rand(`jg-a-${i}`) - 0.5) * 2.6;
        const speed = 4 + rand(`jg-s-${i}`) * 3;
        const life = Math.min(5 + rand(`jg-l-${i}`) * 5, 22 - HIT);
        if (age < 1 || age > life) {
          continue;
        }
        const x = hx + Math.cos(a) * speed * age;
        const y = hy - 4 + Math.sin(a) * speed * age + 0.55 * age * age;
        if (i % 3 === 0 && age < life - 2) {
          star(l, x, y, 3, age * 0.5, P.light);
          l.set(x, y, P.white);
        } else {
          l.sparkle(x, y, age < 4 ? 2 : 1, P.light, P.white);
        }
      }
    },
    { outline: P.ink },
  );
};
