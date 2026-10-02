import type { Effect } from "../PixelCanvas";
import { CX, CY, easeIn, easeOut, hex, rand, span } from "../pixel";
import type { PixelBuffer, RGB } from "../pixel";

// Cast magic 4: three tilted orbits spin like an atom with glowing orbs
// riding them, shrink into a sun core, which goes nova with diamond-shaped
// pixel shockwaves and light rays, leaving drifting embers.

const C = {
  ink: hex("#3a1a00"),
  deep: hex("#b5560c"),
  mid: hex("#ff9a1f"),
  light: hex("#ffd25c"),
  pale: hex("#fff3c4"),
  white: hex("#ffffff"),
};

const TAU = Math.PI * 2;
const NOVA = 10;

// Point on an ellipse (radii a, b) rotated by `tilt`, at parameter `theta`.
const orbitPoint = (
  a: number,
  bb: number,
  tilt: number,
  theta: number,
): [number, number] => {
  const x = Math.cos(theta) * a;
  const y = Math.sin(theta) * bb;
  return [
    CX + x * Math.cos(tilt) - y * Math.sin(tilt),
    CY + x * Math.sin(tilt) + y * Math.cos(tilt),
  ];
};

// Draws an orbit from `start` sweeping `sweep` radians.
const orbit = (
  b: PixelBuffer,
  a: number,
  bb: number,
  tilt: number,
  start: number,
  sweep: number,
  c: RGB,
) => {
  const steps = Math.max(8, Math.ceil(sweep * a * 0.6));
  let prev = orbitPoint(a, bb, tilt, start);
  for (let i = 1; i <= steps; i++) {
    const next = orbitPoint(a, bb, tilt, start + (sweep * i) / steps);
    b.line(prev[0], prev[1], next[0], next[1], c);
    prev = next;
  }
};

// Diamond-shaped ring (|x| + |y| = r): a very "pixel" shockwave.
const diamondRing = (b: PixelBuffer, r: number, t: number, c: RGB, level: number) => {
  const R = Math.ceil(r + t);
  for (let y = -R; y <= R; y++) {
    for (let x = -R; x <= R; x++) {
      const d = Math.abs(x) + Math.abs(y);
      if (Math.abs(d - r) < t / 2) {
        b.set(CX + x, CY + y, c, level);
      }
    }
  }
};

const TILTS = [0, TAU / 6, -TAU / 6];

export const castMagic4: Effect = (b, f) => {
  if (f < NOVA) {
    const shrink = easeIn(span(f, 6, NOVA));
    const a = 34 * (1 - shrink * 0.8);
    const bb = 11 * (1 - shrink * 0.8);
    const drawn = easeOut(span(f, -1, 3));
    const spin = f * 0.12;

    // Orbits and the orbs riding them (with short trails).
    b.layer(
      (l) => {
        TILTS.forEach((tilt, i) => {
          orbit(l, a, bb, tilt + spin, i, drawn * TAU, f >= 6 ? C.light : C.mid);
        });
      },
      { outline: C.ink },
    );
    b.layer(
      (l) => {
        TILTS.forEach((tilt, i) => {
          if (drawn < 1 && f < 2) {
            return;
          }
          for (let k = 3; k >= 0; k--) {
            const theta = f * 0.9 + i * 2.1 - k * 0.22;
            const [x, y] = orbitPoint(a, bb, tilt + spin, theta);
            if (k === 0) {
              l.disc(x, y, 2, C.pale);
              l.set(x - 1, y - 1, C.white);
            } else {
              l.disc(x, y, 1.5 - k * 0.3, k === 1 ? C.light : C.mid);
            }
          }
        });
      },
      { outline: C.ink },
    );

    // Sun core, growing and flickering.
    const r = 2 + easeIn(span(f, 1, NOVA)) * 6 + (f % 2) * 0.8;
    b.layer(
      (l) => {
        l.disc(CX, CY, r + 1.5, C.mid);
        l.disc(CX, CY, r, C.light);
        l.disc(CX, CY, Math.max(1, r - 2.5), C.white);
        // Little sun spikes.
        for (let i = 0; i < 8; i++) {
          const ang = (i * TAU) / 8 + f * 0.2;
          l.line(
            CX + Math.cos(ang) * (r + 2),
            CY + Math.sin(ang) * (r + 2),
            CX + Math.cos(ang) * (r + 4),
            CY + Math.sin(ang) * (r + 4),
            C.light,
          );
        }
      },
      { outline: C.ink },
    );
    return;
  }

  const age = f - NOVA;

  // Diamond shockwaves: a fast bright one, then a slower warm one.
  if (age <= 7) {
    const t = age / 7;
    diamondRing(b, 8 + easeOut(t) * 56, 4 - 3 * t, C.pale, 1 - t * 0.85);
  }
  if (age >= 1 && age <= 8) {
    const t = (age - 1) / 7;
    diamondRing(b, 6 + easeOut(t) * 38, 3 - 2 * t, C.mid, 1 - t * 0.8);
  }

  // Nova: rays and the collapsing core.
  if (age <= 4) {
    const ray = [48, 38, 26, 14, 6][age];
    const core = [13, 10, 7, 4, 2][age];
    b.layer(
      (l) => {
        for (let i = 0; i < 12; i++) {
          const ang = (i * TAU) / 12 + 0.13;
          const len = i % 3 === 0 ? ray : ray * 0.55;
          l.line(CX, CY, CX + Math.cos(ang) * len, CY + Math.sin(ang) * len, i % 3 === 0 ? C.pale : C.light);
        }
        l.thickLine(CX - ray * 0.9, CY, CX + ray * 0.9, CY, 2, C.pale);
        l.thickLine(CX, CY - ray * 0.9, CX, CY + ray * 0.9, 2, C.pale);
        l.disc(CX, CY, core + 2, C.light);
        l.disc(CX, CY, core, C.white);
      },
      { outline: C.deep },
    );
  }

  // Afterglow ring of the sun.
  if (age >= 3 && age <= 9) {
    b.ring(CX, CY, 6, 2, C.light, 1 - span(age, 3, 9));
  }

  // Embers: fly out, slow down, drift upwards and flicker out.
  b.layer(
    (l) => {
      for (let i = 0; i < 24; i++) {
        const ang = rand(`e-a-${i}`) * TAU;
        const speed = 14 + rand(`e-s-${i}`) * 26;
        const life = Math.min(6 + rand(`e-l-${i}`) * 7, 12);
        if (age < 1 || age > life) {
          continue;
        }
        const out = 16 + easeOut(span(age, 0, life)) * speed;
        const x = CX + Math.cos(ang) * out + Math.sin(age * 0.9 + i) * 1.2;
        const y = CY + Math.sin(ang) * out - age * 1.1;
        const colors = [C.white, C.pale, C.light, C.light, C.mid];
        const c = colors[Math.min(4, Math.floor((age / life) * 5))];
        if ((age + i) % 5 === 4) {
          continue; // flicker
        }
        if (age < life - 2) {
          l.rect(x, y, 2, 2, c);
        } else {
          l.set(x, y, c);
        }
      }
    },
    { outline: C.ink },
  );
};
