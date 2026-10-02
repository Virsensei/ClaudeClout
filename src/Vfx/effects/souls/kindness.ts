import type { Effect } from "../../PixelCanvas";
import { CX, CY, easeOut, rand, span } from "../../pixel";
import type { PixelBuffer } from "../../pixel";
import { plus, ramp, soul } from "./shared";

// Kindness (green): a shield spins around the SOUL blocking incoming
// arrows, grows into a full protective bubble, then healing pluses rise.

const P = ramp("#00FA3E");
const TAU = Math.PI * 2;
const SHIELD_R = 17;
const BUBBLE = 12;

// Arrows: direction they come from (radians) and the frame they hit.
const ARROWS: [number, number][] = [
  [-Math.PI / 2, 5],
  [0, 7],
  [Math.PI, 9],
  [Math.PI / 2, 11],
];

// Where the shield faces: it turns to meet each arrow just before it hits.
const shieldAngle = (f: number) => {
  let angle = ARROWS[0][0];
  for (let i = 1; i < ARROWS.length; i++) {
    const [prev] = ARROWS[i - 1];
    const [next, hit] = ARROWS[i];
    const t = easeOut(span(f, hit - 1.6, hit - 0.6));
    let delta = next - prev;
    if (Math.abs(delta) > Math.PI) {
      delta -= Math.sign(delta) * TAU;
    }
    angle += delta * t;
  }
  return angle;
};

const arrow = (l: PixelBuffer, x: number, y: number, a: number) => {
  // Points towards the centre (direction a + π).
  const dx = -Math.cos(a);
  const dy = -Math.sin(a);
  l.line(x - dx * 6, y - dy * 6, x, y, P.pale);
  l.line(x, y, x - dx * 3 - dy * 2, y - dy * 3 + dx * 2, P.white);
  l.line(x, y, x - dx * 3 + dy * 2, y - dy * 3 - dx * 2, P.white);
};

export const kindness: Effect = (b, f) => {
  const heartFade = 1 - span(f, 17, 21);
  const pulse = f >= BUBBLE ? 1 + 0.08 * Math.sin(f * 1.6) : 1;
  b.layer((l) => soul(l, CX, CY, 8 * easeOut(span(f, -1, 4)) * pulse, P, { flash: f === BUBBLE }), {
    outline: P.ink,
    fade: heartFade,
  });

  // Shield arc blocking arrows.
  if (f >= 3 && f < BUBBLE) {
    const a = shieldAngle(f);
    b.layer(
      (l) => {
        l.ring(CX, CY, SHIELD_R, 3, P.light, 1, a - 0.7, a + 0.7);
        l.ring(CX, CY, SHIELD_R - 1, 1, P.pale, 1, a - 0.6, a + 0.6);
      },
      { outline: P.ink },
    );
  }

  // Incoming arrows and the sparks when they are blocked.
  b.layer(
    (l) => {
      for (const [a, hit] of ARROWS) {
        const t = span(f, hit - 3, hit);
        if (f < hit && t > 0) {
          const r = 58 - (58 - SHIELD_R - 4) * t;
          arrow(l, CX + Math.cos(a) * r, CY + Math.sin(a) * r, a);
        }
        const age = f - hit;
        if (age >= 0 && age <= 2) {
          const x = CX + Math.cos(a) * (SHIELD_R + 3);
          const y = CY + Math.sin(a) * (SHIELD_R + 3);
          l.sparkle(x, y, [3, 2, 1][age], P.pale, P.white);
          for (let k = 0; k < 4; k++) {
            const da = a + (k - 1.5) * 0.6;
            const d = 3 + age * 4;
            l.rect(x + Math.cos(da) * d, y + Math.sin(da) * d, 1, 1, P.light);
          }
        }
      }
    },
    { outline: P.ink },
  );

  // Full bubble.
  const age = f - BUBBLE;
  if (age >= 0) {
    const r = SHIELD_R + easeOut(span(age, 0, 3)) * 8;
    b.layer(
      (l) => {
        l.ring(CX, CY, r, age < 2 ? 3 : 2, age === 0 ? P.white : P.light);
        // Shine on the bubble.
        l.ring(CX, CY, r - 3, 1, P.pale, 1, Math.PI * 1.1, Math.PI * 1.4);
      },
      { outline: P.ink, fade: 1 - span(f, 14, 19) },
    );
  }

  // Healing pluses rising.
  b.layer(
    (l) => {
      for (let i = 0; i < 11; i++) {
        const born = BUBBLE + 1 + rand(`k-b-${i}`) * 5;
        const t = f - born;
        if (t < 0 || t > 22 - born) {
          continue;
        }
        const x = CX + (rand(`k-x-${i}`) - 0.5) * 56;
        const y = CY + 12 + rand(`k-y-${i}`) * 16 - t * 3;
        const arm = t < 1 ? 1 : t < 2 ? 2 : t < 5 ? 3 : 2;
        plus(l, x, y, arm, i % 3 === 0 ? P.pale : i % 3 === 1 ? P.light : P.base);
      }
    },
    { outline: P.ink },
  );
};
