import type { Effect } from "../PixelCanvas";
import { CX, easeOut, hex, rand, span } from "../pixel";
import type { PixelBuffer } from "../pixel";

// Freeze: frost motes rush in, ice shards erupt from the base and a
// snowflake forms, a glint sweeps across, the ice cracks and shatters.

const C = {
  ink: hex("#0a1f3d"),
  deep: hex("#1c5ba8"),
  mid: hex("#3f9cec"),
  light: hex("#8fd6ff"),
  pale: hex("#d6f5ff"),
  white: hex("#ffffff"),
};

const TAU = Math.PI * 2;
const BASE_Y = 100;
const FLAKE_Y = 30;
const SHATTER = 16;

// angle (degrees from straight up), length, width, delay (frames)
const SHARDS: [number, number, number, number][] = [
  [-80, 16, 7, 3],
  [80, 15, 7, 3.5],
  [-58, 26, 9, 2],
  [58, 24, 9, 2.5],
  [-18, 30, 9, 2.8],
  [40, 30, 8, 3.2],
  [-32, 42, 11, 1],
  [30, 44, 12, 1.5],
  [12, 48, 12, 0.5],
  [-8, 52, 14, 0],
];

const shardGeometry = (index: number, f: number) => {
  const [deg, len, width, delay] = SHARDS[index];
  const grow = easeOut(span(f, 1 + delay, 6 + delay));
  const a = (deg * Math.PI) / 180;
  const dir = [Math.sin(a), -Math.cos(a)];
  const perp = [Math.cos(a), Math.sin(a)];
  const bx = CX + Math.sin(a) * 6;
  const by = BASE_Y;
  return { grow, dir, perp, bx, by, len: len * grow, width: width * (0.6 + 0.4 * grow) };
};

const drawShard = (l: PixelBuffer, index: number, f: number) => {
  const { grow, dir, perp, bx, by, len, width } = shardGeometry(index, f);
  if (grow === 0) {
    return;
  }
  const at = (along: number, side: number): [number, number] => [
    bx + dir[0] * len * along + perp[0] * side,
    by + dir[1] * len * along + perp[1] * side,
  ];
  const half = width / 2;
  const tip = at(1, 0);
  l.polygon([at(0, -half), at(0.72, -half), tip, at(0.72, half), at(0, half)], C.mid);
  l.polygon([at(0, -half), at(0.72, -half), tip, at(0.72, 0), at(0, 0)], C.light);
  l.line(...at(0.05, -half + 1), ...at(0.7, -half + 1), C.pale);
  const [rx0, ry0] = at(0, half - 0.5);
  const [rx1, ry1] = at(0.72, half - 0.5);
  l.line(rx0, ry0, rx1, ry1, C.deep);
  l.line(rx1, ry1, tip[0], tip[1], C.deep);
};

const drawSnowflake = (l: PixelBuffer, f: number) => {
  const r = 13 * easeOut(span(f, 4, 9));
  if (r < 1) {
    return;
  }
  const rot = f * 0.05;
  for (let i = 0; i < 6; i++) {
    const a = rot + (i * TAU) / 6;
    const ex = CX + Math.cos(a) * r;
    const ey = FLAKE_Y + Math.sin(a) * r;
    l.line(CX, FLAKE_Y, ex, ey, C.pale);
    const mx = CX + Math.cos(a) * r * 0.55;
    const my = FLAKE_Y + Math.sin(a) * r * 0.55;
    for (const side of [-1, 1]) {
      const ba = a + side * 0.8;
      l.line(mx, my, mx + Math.cos(ba) * r * 0.32, my + Math.sin(ba) * r * 0.32, C.light);
    }
    l.set(ex, ey, C.white);
  }
  l.disc(CX, FLAKE_Y, 2, C.white);
};

export const freeze: Effect = (b, f) => {
  // Frost motes rushing in towards the base.
  b.layer(
    (l) => {
      for (let i = 0; i < 18; i++) {
        const delay = rand(`f-delay-${i}`) * 2;
        const a0 = rand(`f-a-${i}`) * TAU;
        const r0 = 55 + rand(`f-r-${i}`) * 15;
        for (let k = 1; k >= 0; k--) {
          const t = span(f + 1 - k * 0.7, delay, delay + 6);
          if (t <= 0 || t >= 1) {
            continue;
          }
          const r = r0 * (1 - easeOut(t));
          const a = a0 - t * 1.5;
          l.set(CX + Math.cos(a) * r, 80 + Math.sin(a) * r * 1.1, k === 0 ? C.white : C.light);
        }
      }
    },
    { outline: C.ink },
  );

  // Ice shards (until they shatter), with a glint and cracks.
  if (f < SHATTER) {
    b.layer(
      (l) => {
        SHARDS.forEach((_, i) => drawShard(l, i, f));
        // Ice mound at the base.
        const mound = easeOut(span(f, -1, 3));
        if (mound > 0) {
          l.polygon(
            [
              [CX - 30 * mound, BASE_Y + 6],
              [CX - 18 * mound, BASE_Y - 4],
              [CX + 18 * mound, BASE_Y - 4],
              [CX + 30 * mound, BASE_Y + 6],
            ],
            C.mid,
          );
          l.line(CX - 16 * mound, BASE_Y - 3, CX + 16 * mound, BASE_Y - 3, C.pale);
        }

        // Glint sweeping diagonally.
        if (f >= 9 && f <= 13) {
          const pos = -30 + span(f, 9, 13) * 190;
          for (let y = 0; y < l.h; y++) {
            for (let x = 0; x < l.w; x++) {
              const d = x + (125 - y) * 0.7 - pos;
              if (l.has(x, y) && d > -3 && d < 3) {
                l.set(x, y, Math.abs(d) < 1.5 ? C.white : C.pale);
              }
            }
          }
        }

        // Cracks right before shattering.
        if (f >= 14) {
          const pts: [number, number][] = [
            [CX - 4, BASE_Y - 46],
            [CX + 2, BASE_Y - 34],
            [CX - 6, BASE_Y - 24],
            [CX + 3, BASE_Y - 12],
            [CX - 1, BASE_Y],
          ];
          for (let i = 0; i < pts.length - 1; i++) {
            l.line(...pts[i], ...pts[i + 1], C.ink);
          }
          if (f >= 15) {
            l.line(CX - 6, BASE_Y - 24, CX - 22, BASE_Y - 30, C.ink);
            l.line(CX + 3, BASE_Y - 12, CX + 20, BASE_Y - 20, C.ink);
          }
        }
      },
      { outline: C.ink },
    );
  }

  // Frost burst rolling out along the ground.
  if (f >= 6 && f <= 12) {
    const t = span(f, 6, 12);
    const r = 20 + easeOut(t) * 32;
    b.ellipseRing(CX, BASE_Y + 3, r, r * 0.28, 3 - 2 * t, C.pale, 1 - t * 0.8);
  }

  // Snowflake.
  b.layer((l) => drawSnowflake(l, f), {
    outline: C.ink,
    fade: 1 - span(f, 14, 20),
  });

  // Twinkles on the ice while it holds.
  b.layer(
    (l) => {
      const spots: [number, number, number][] = [
        [CX - 2, BASE_Y - 50, 10],
        [CX + 24, BASE_Y - 38, 11],
        [CX - 24, BASE_Y - 34, 12],
        [CX + 8, BASE_Y - 22, 13],
        [CX - 12, BASE_Y - 14, 14],
      ];
      for (const [x, y, at] of spots) {
        const age = f - at;
        if (age >= 0 && age <= 2) {
          l.sparkle(x, y, [2, 3, 1][age], C.pale, C.white);
        }
      }
    },
    { outline: C.ink },
  );

  // Shatter: fragments fly out and fall.
  if (f >= SHATTER) {
    const age = f - SHATTER;
    b.layer(
      (l) => {
        for (let i = 0; i < 48; i++) {
          const g = shardGeometry(i % SHARDS.length, SHATTER);
          const along = rand(`s-al-${i}`);
          const side = (rand(`s-si-${i}`) - 0.5) * g.width;
          const x0 = g.bx + g.dir[0] * g.len * along + g.perp[0] * side;
          const y0 = g.by + g.dir[1] * g.len * along + g.perp[1] * side;
          const vx = (x0 - CX) * 0.09 + (rand(`s-vx-${i}`) - 0.5) * 2;
          const vy = -1.2 - rand(`s-vy-${i}`) * 2;
          const x = x0 + vx * age * 1.6;
          const y = y0 + vy * age * 1.6 + 0.5 * 0.9 * age * age;
          const size = age > 3 + rand(`s-sz-${i}`) * 3 ? 1 : 2;
          const color = [C.pale, C.light, C.mid, C.white][i % 4];
          l.rect(x, y, size, size, color);
        }
      },
      { outline: C.ink, fade: 1 - span(f, 19, 23) },
    );
  }
};
