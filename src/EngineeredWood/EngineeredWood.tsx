import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { Backing, BoardDefs, Core, Veneer } from "./Board";
import { Reveal } from "./Reveal";
import { SIGNATURE_PATH } from "./signature";
import { COLORS, FONT_FAMILY, sec } from "./theme";

// Timeline, in seconds (matches the reference video).
const T = {
  underline: 2.3,
  veneer: 2.75,
  core: 4.72,
  backing: 7.2,
  thickness: 8.4,
  remember: 9.07,
};

export const ENGINEERED_WOOD_DURATION = 11.25;

// Lato renders its baseline at ~0.887em below the top of a line-height:1 box.
const topForBaseline = (baseline: number, size: number) =>
  baseline - size * 0.887;

const Text: React.FC<{
  baseline: number;
  size: number;
  weight: 400 | 700 | 900;
  color: string;
  left?: number;
  right?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ baseline, size, weight, color, left, right, style, children }) => (
  <div
    style={{
      position: "absolute",
      top: topForBaseline(baseline, size),
      left,
      right: right === undefined ? undefined : 1920 - right,
      fontFamily: FONT_FAMILY,
      fontSize: size,
      fontWeight: weight,
      lineHeight: 1,
      color,
      whiteSpace: "nowrap",
      textAlign: right === undefined ? "left" : "right",
      ...style,
    }}
  >
    {children}
  </div>
);

const Canvas: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg
    width={1920}
    height={1080}
    viewBox="0 0 1920 1080"
    style={{ position: "absolute", inset: 0, overflow: "visible" }}
  >
    {children}
  </svg>
);

const LayerLabel: React.FC<{ y: number; title: string; note: string }> = ({
  y,
  title,
  note,
}) => (
  <>
    <Text baseline={y - 6} size={37} weight={900} color={COLORS.navy} right={650}>
      {title}
    </Text>
    <Text baseline={y + 32} size={26} weight={400} color={COLORS.muted} right={650}>
      {note}
    </Text>
  </>
);

const TitleUnderline: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(
    frame,
    [sec(T.underline), sec(T.underline + 1)],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    },
  );
  return (
    <path
      d="M 62 167 C 150 162, 300 161, 406 165"
      fill="none"
      stroke={COLORS.pink}
      strokeWidth={5}
      strokeLinecap="round"
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - progress}
      opacity={progress > 0 ? 1 : 0}
    />
  );
};

export const EngineeredWood: React.FC = () => {
  const frame = useCurrentFrame();
  // Re-seed the sketch filter 12 times a second for a subtle hand-drawn "boil".
  const seed = Math.floor(frame / 5) % 8;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      <Canvas>
        <BoardDefs seed={seed} />
        <TitleUnderline />
      </Canvas>

      <Text baseline={130} size={66} weight={900} color={COLORS.navy} left={58}>
        Engineered wood is built in layers
      </Text>

      <Reveal at={T.veneer}>
        <Canvas>
          <Veneer />
        </Canvas>
        <LayerLabel y={349} title="Real wood veneer" note="the bit you actually see" />
      </Reveal>

      <Reveal at={T.core}>
        <Canvas>
          <Core />
        </Canvas>
        <LayerLabel y={520} title="Plywood / HDF core" note="where the thickness hides" />
      </Reveal>

      <Reveal at={T.backing}>
        <Canvas>
          <Backing />
        </Canvas>
        <LayerLabel y={677} title="Backing layer" note="stops the board bowing" />
      </Reveal>

      <Reveal at={T.thickness}>
        <Canvas>
          <g
            stroke={COLORS.bracket}
            strokeWidth={4}
            strokeLinecap="round"
            filter="url(#sketch)"
          >
            <line x1={1168} y1={313} x2={1168} y2={700} />
            <line x1={1153} y1={313} x2={1184} y2={313} />
            <line x1={1153} y1={700} x2={1184} y2={700} />
          </g>
        </Canvas>
        <Text baseline={488} size={81} weight={900} color={COLORS.navy} left={1211}>
          14–20
          <span style={{ fontSize: 40, marginLeft: 3 }}>mm</span>
        </Text>
        <Text baseline={532} size={29} weight={700} color={COLORS.pinkText} left={1213}>
          thicker than most floors
        </Text>
        <Text baseline={570} size={27} weight={400} color={COLORS.muted} left={1213}>
          (laminate is only ~8mm)
        </Text>
      </Reveal>

      <Reveal at={T.remember}>
        <div
          style={{
            position: "absolute",
            left: 60,
            top: 940,
            width: 198,
            height: 60,
            borderRadius: 11,
            backgroundColor: COLORS.pill,
            boxShadow: "4px 5px 10px rgba(38, 56, 106, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONT_FAMILY,
            fontWeight: 900,
            fontSize: 23,
            letterSpacing: 2.7,
            color: "white",
          }}
        >
          REMEMBER
        </div>
        <Canvas>
          <path
            d="M 288 994 C 600 992, 900 995, 1182 993"
            fill="none"
            stroke={COLORS.highlight}
            strokeWidth={4}
            strokeLinecap="round"
          />
        </Canvas>
        <Text baseline={980} size={39.5} weight={700} color={COLORS.navy} left={286}>
          Measure the <span style={{ fontWeight: 900 }}>finished</span> floor
          height before you order.
        </Text>
      </Reveal>

      <svg
        viewBox="0 0 260 140"
        width={260}
        height={140}
        style={{ position: "absolute", left: 1630, top: 915 }}
      >
        <path d={SIGNATURE_PATH} fill={COLORS.signature} fillRule="evenodd" />
      </svg>
    </AbsoluteFill>
  );
};
