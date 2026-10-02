import type { Effect } from "../PixelCanvas";
import { CX, CY, easeIn, easeOut, hex, rand, span } from "../pixel";
import type { PixelBuffer, RGB } from "../pixel";

// Cast magic 2: a hexagram traces itself while gems orbit, collapses into a
// glowing gem, then erupts into a pillar of light with rising runes and
// spinning diamond shards.

const C = {
  ink: hex("#0b1f2a"),
  deep: hex("#136f6f"),
  mid: hex("#22b3a4"),
  light: hex("#7cf2d0"),
  pale: hex("#e6fff6"),
  white: hex("#ffffff"),
  gold: hex("#ffd34d"),
  goldDeep: hex("#e08a1e"),
};

const TAU = Math.PI * 2;
const BURST = 10;

const RUNES = [
  ["X.X", ".X.", "X.X"],
  [".X.", "XXX", ".X."],
  ["XX.", ".X.", ".XX"],
  ["X..", "XXX", "..X"],
  ["XXX", "X.X", "..X"],
];

const rune = (b: PixelBuffer, x: number, y: number, index: number, c: RGB) => {
  RUNES[index % RUNES.length].forEach((row, j) =>
    [...row].forEach((cell, i) => {
      if (cell === "X") {
        b.set(Math.round(x) - 1 + i, Math.round(y) - 1 + j, c);
      }
    }),
  );
};

// Diamond (rhombus). `tall` flips between upright and sideways, which reads
// as spinning when it alternates.
const diamond = (
  b: PixelBuffer,
  x: number,
  y: number,
  size: number,
  fill: RGB,
  shine: RGB,
  tall = true,
) => {
  const w = tall ? size * 0.6 : size;
  const h = tall ? size : size * 0.6;
  b.polygon(
    [
      [x, y - h],
      [x + w, y],
      [x, y + h],
      [x - w, y],
    ],
    fill,
  );
  b.polygon(
    [
      [x, y - h],
      [x, y],
      [x - w, y],
    ],
    shine,
  );
};

const vertex = (r: number, angle: number): [number, number] => [
  CX + Math.cos(angle) * r,
  CY + Math.sin(angle) * r,
];

export const castMagic2: Effect = (b, f) => {
  // Hexagram: six edges traced one after another, then it spins and collapses.
  if (f < BURST) {
    const collapse = easeIn(span(f, 6, BURST));
    const R = 32 * (1 - collapse * 0.85);
    const rot = -Math.PI / 2 + f * 0.04 + collapse * 1.4;
    const traced = span(f, -1, 6) * 6;
    // Edges alternate between the two triangles.
    const edges: [number, number][] = [];
    for (let i = 0; i < 3; i++) {
      edges.push([i * 2, ((i + 1) % 3) * 2], [i * 2 + 1, (((i + 1) % 3) * 2 + 1)]);
    }
    const points = new Array(6)
      .fill(0)
      .map((_, k) => vertex(R, rot + (k % 2 === 0 ? 0 : Math.PI) + Math.floor(k / 2) * (TAU / 3)));

    // Faint guide of the whole star, so the bright line visibly traces it.
    if (f < 6) {
      b.layer(
        (l) => {
          edges.forEach(([from, to]) => {
            l.line(...points[from], ...points[to], C.deep);
          });
        },
        { fade: 0.5 + span(f, 0, 5) * 0.5 },
      );
    }

    b.layer(
      (l) => {
        edges.forEach(([from, to], i) => {
          const p = Math.min(1, Math.max(0, traced - i));
          if (p === 0) {
            return;
          }
          const [x0, y0] = points[from];
          const [x1, y1] = points[to];
          const xe = x0 + (x1 - x0) * p;
          const ye = y0 + (y1 - y0) * p;
          if (f >= 6) {
            l.thickLine(x0, y0, xe, ye, 2, C.light);
          } else {
            l.line(x0, y0, xe, ye, C.light);
          }
        });
        // Sparks on the vertices that have been reached.
        edges.forEach(([, to], i) => {
          if (traced - i >= 1) {
            const [x, y] = points[to];
            l.sparkle(x, y, f % 2 === 0 ? 2 : 1, C.gold, C.white);
          }
        });
      },
      { outline: C.ink },
    );

    // Orbiting gems, pulled in as the hexagram collapses.
    b.layer(
      (l) => {
        for (let i = 0; i < 4; i++) {
          if (f < i * 0.8) {
            continue;
          }
          const a = f * 0.38 + (i * TAU) / 4;
          const r = 42 * (1 - collapse * 0.9);
          diamond(l, CX + Math.cos(a) * r, CY + Math.sin(a) * r, 4, C.gold, C.pale);
        }
      },
      { outline: C.ink },
    );

    // The gem forming in the middle.
    const gem = span(f, 6, BURST);
    if (gem > 0) {
      b.layer(
        (l) => {
          diamond(l, CX, CY, 3 + gem * 6, C.light, C.white);
          if (f === BURST - 1) {
            diamond(l, CX, CY, 10, C.white, C.white);
          }
        },
        { outline: C.deep },
      );
    }
    return;
  }

  const age = f - BURST;

  // Ground ring where the spell was cast.
  if (age <= 7) {
    const t = age / 7;
    const r = 10 + easeOut(t) * 40;
    b.ellipseRing(CX, CY + 10, r, r * 0.32, 3 - 2 * t, C.light, 1 - t * 0.8);
  }

  // Pillar of light shooting up, thinning and lifting off the ground.
  if (age <= 9) {
    const width = [16, 12, 10, 8, 6, 5, 4, 3, 2, 1][age];
    const bottom = CY + 10 - easeIn(span(age, 2, 9)) * (CY + 10);
    b.layer(
      (l) => {
        l.rect(CX - width / 2, 0, width, bottom, C.mid);
        if (width > 2) {
          l.rect(CX - width / 2 + 1, 0, width - 2, bottom, C.light);
        }
        if (width > 4) {
          l.rect(CX - width / 4, 0, width / 2, bottom, C.white);
        }
        // Flare at the base on impact.
        if (age <= 1) {
          const flare = age === 0 ? 46 : 30;
          l.thickLine(CX - flare, CY + 10, CX + flare, CY + 10, 2, C.pale);
          l.disc(CX, CY + 10, age === 0 ? 10 : 7, C.white);
        }
      },
      { outline: C.ink },
    );
  }

  // Runes rising inside the pillar.
  b.layer(
    (l) => {
      for (let i = 0; i < 6; i++) {
        const born = 1 + i * 0.9;
        const t = age - born;
        if (t < 0 || t > Math.min(7, 12 - born)) {
          continue;
        }
        const y = CY + 4 - t * 7;
        const x = CX + (i % 2 === 0 ? -1 : 1) * (2 + (t % 2));
        rune(l, x, y, i, i % 2 === 0 ? C.gold : C.pale);
      }
    },
    { outline: C.ink },
  );

  // Diamond shards spinning outwards.
  b.layer(
    (l) => {
      for (let i = 0; i < 10; i++) {
        const a = (i * TAU) / 10 + rand(`sh-a-${i}`) * 0.3;
        const life = 7 + rand(`sh-l-${i}`) * 4;
        if (age > life) {
          continue;
        }
        const d = 8 + easeOut(span(age, 0, life)) * (34 + rand(`sh-d-${i}`) * 14);
        const x = CX + Math.cos(a) * d;
        const y = CY + Math.sin(a) * d - age * 0.6;
        if (age > life - 2) {
          l.sparkle(x, y, 1, C.light, C.white);
        } else {
          const gold = i % 3 === 0;
          diamond(l, x, y, 4, gold ? C.gold : C.mid, gold ? C.pale : C.light, (age + i) % 2 === 0);
        }
      }
    },
    { outline: C.ink },
  );
};
