import { random } from "remotion";
import { COLORS } from "./theme";

// Board geometry, in 1920x1080 canvas pixels.
export const BOARD = {
  left: 713,
  right: 1110,
  veneerTop: 311,
  coreTop: 386,
  backingTop: 653,
  bottom: 703,
  dotX: 707,
};

const WIDTH = BOARD.right - BOARD.left;
const STROKE = 4;

const Shadow: React.FC<{ top: number; bottom: number }> = ({ top, bottom }) => (
  <rect
    x={BOARD.left + 7}
    y={top + 7}
    width={WIDTH}
    height={bottom - top}
    fill={COLORS.shadow}
    filter="url(#soft-shadow)"
  />
);

const Outline: React.FC<{ top: number; bottom: number }> = ({
  top,
  bottom,
}) => (
  <rect
    x={BOARD.left}
    y={top}
    width={WIDTH}
    height={bottom - top}
    fill="none"
    stroke={COLORS.ink}
    strokeWidth={STROKE}
    strokeLinejoin="round"
  />
);

const Dot: React.FC<{ y: number }> = ({ y }) => (
  <circle cx={BOARD.dotX} cy={y} r={5} fill={COLORS.ink} />
);

const Knot: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g fill="none" stroke={COLORS.veneerGrain} strokeWidth={2}>
    <ellipse cx={x} cy={y} rx={11} ry={6.5} />
    <ellipse cx={x} cy={y} rx={5} ry={2.8} />
  </g>
);

export const Veneer: React.FC = () => {
  const { veneerTop: top, coreTop: bottom, left, right } = BOARD;
  const grain = [329, 347, 367].map((y, i) => {
    const wobble = i % 2 === 0 ? 2 : -2;
    return `M ${left + 6} ${y} C ${left + 120} ${y - wobble}, ${left + 260} ${y + wobble}, ${right - 6} ${y - wobble / 2}`;
  });

  return (
    <g filter="url(#sketch)">
      <Shadow top={top} bottom={bottom} />
      <rect x={left} y={top} width={WIDTH} height={bottom - top} fill={COLORS.veneer} />
      <g fill="none" stroke={COLORS.veneerGrain} strokeWidth={1.6} opacity={0.8}>
        {grain.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <Knot x={808} y={349} />
      <Knot x={973} y={349} />
      <Knot x={1057} y={349} />
      <Outline top={top} bottom={bottom} />
      <Dot y={349} />
    </g>
  );
};

const SPECKLE_COLORS = ["#8F9093", "#A7A2A0", "#C9A0A4", "#9FB3A2", "#7F8290"];

const speckles = new Array(46).fill(0).map((_, i) => ({
  x: BOARD.left + 14 + random(`sx${i}`) * (WIDTH - 28),
  y: BOARD.coreTop + 14 + random(`sy${i}`) * (BOARD.backingTop - BOARD.coreTop - 28),
  r: 1.2 + random(`sr${i}`) * 2.2,
  color: SPECKLE_COLORS[Math.floor(random(`sc${i}`) * SPECKLE_COLORS.length)],
}));

export const Core: React.FC = () => {
  const { coreTop: top, backingTop: bottom, left } = BOARD;
  return (
    <g filter="url(#sketch)">
      <Shadow top={top} bottom={bottom} />
      <rect x={left} y={top} width={WIDTH} height={bottom - top} fill={COLORS.core} />
      <rect x={left} y={top} width={WIDTH} height={bottom - top} fill="url(#core-hatch)" />
      {speckles.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={s.color} opacity={0.85} />
      ))}
      <Outline top={top} bottom={bottom} />
      <Dot y={520} />
    </g>
  );
};

export const Backing: React.FC = () => {
  const { backingTop: top, bottom, left } = BOARD;
  return (
    <g filter="url(#sketch)">
      <Shadow top={top} bottom={bottom} />
      <rect x={left} y={top} width={WIDTH} height={bottom - top} fill={COLORS.backing} />
      <rect x={left} y={top} width={WIDTH} height={bottom - top} fill="url(#backing-hatch)" />
      <Outline top={top} bottom={bottom} />
      <Dot y={677} />
    </g>
  );
};

// Shared SVG defs. `seed` changes every few frames so the hand-drawn lines "boil".
export const BoardDefs: React.FC<{ seed: number }> = ({ seed }) => (
  <defs>
    <filter id="sketch" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={seed} result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale={3.2} xChannelSelector="R" yChannelSelector="G" />
    </filter>
    <filter id="soft-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation={3} />
    </filter>
    <pattern id="core-hatch" width={16} height={16} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1={0} y1={0} x2={0} y2={16} stroke={COLORS.coreHatch} strokeWidth={1.6} />
    </pattern>
    <pattern id="backing-hatch" width={9} height={9} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1={0} y1={0} x2={0} y2={9} stroke={COLORS.backingHatch} strokeWidth={2} opacity={0.55} />
    </pattern>
  </defs>
);
