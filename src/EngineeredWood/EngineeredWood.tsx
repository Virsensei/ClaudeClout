import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { Backing, BoardDefs, Core, Veneer } from "./Board";
import { Reveal } from "./Reveal";
import type { EngineeredWoodProps } from "./schema";
import { SIGNATURE_PATH } from "./signature";
import { FONT_FAMILY, sec } from "./theme";

// All text, timings and colors come in as props: edit them in src/Root.tsx
// or in the Props panel of Remotion Studio. This file is the layout.

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
  children: React.ReactNode;
}> = ({ baseline, size, weight, color, left, right, children }) => (
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
      whiteSpace: "pre",
      textAlign: right === undefined ? "left" : "right",
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

// A hand-drawn line that stretches to the width of the text it sits under.
// `progress` (0 to 1) reveals it from left to right.
const Underline: React.FC<{
  d: string;
  color: string;
  width: number;
  offset: number;
  inset?: number;
  progress?: number;
}> = ({ d, color, width, offset, inset = 0, progress = 1 }) => (
  <svg
    viewBox="0 0 100 10"
    preserveAspectRatio="none"
    style={{
      position: "absolute",
      left: inset,
      top: `calc(100% + ${offset}px)`,
      width: `calc(100% - ${inset}px)`,
      height: 10,
      overflow: "visible",
      clipPath: `inset(-10px calc(${(1 - progress) * 100}% - ${progress * 10}px) -10px -10px)`,
    }}
  >
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
);

const UnderlinedWord: React.FC<{
  children: React.ReactNode;
  underline: React.ReactNode;
}> = ({ children, underline }) => (
  <span style={{ position: "relative", display: "inline-block" }}>
    {children}
    {underline}
  </span>
);

const Title: React.FC<{
  props: EngineeredWoodProps;
}> = ({ props }) => {
  const frame = useCurrentFrame();
  const { title, underlinedWord, timing, colors } = props;
  const progress = interpolate(
    frame,
    [sec(timing.underline), sec(timing.underline + 1)],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    },
  );

  const index = underlinedWord ? title.indexOf(underlinedWord) : -1;
  const underline = (
    <Underline
      d="M 1 7 C 26 2, 69 1, 99 5"
      color={colors.accent}
      width={5}
      offset={22.5}
      inset={2}
      progress={progress}
    />
  );

  return (
    <Text baseline={130} size={66} weight={900} color={colors.text} left={58}>
      {index === -1 ? (
        title
      ) : (
        <>
          {title.slice(0, index)}
          <UnderlinedWord underline={underline}>{underlinedWord}</UnderlinedWord>
          {title.slice(index + underlinedWord.length)}
        </>
      )}
    </Text>
  );
};

const LayerLabel: React.FC<{
  y: number;
  title: string;
  note: string;
  colors: EngineeredWoodProps["colors"];
}> = ({ y, title, note, colors }) => (
  <>
    <Text baseline={y - 6} size={37} weight={900} color={colors.text} right={650}>
      {title}
    </Text>
    <Text baseline={y + 32} size={26} weight={400} color={colors.mutedText} right={650}>
      {note}
    </Text>
  </>
);

export const EngineeredWood: React.FC<EngineeredWoodProps> = (props) => {
  const frame = useCurrentFrame();
  const { timing, colors, thickness, reminder } = props;
  // Re-seed the sketch filter 12 times a second for a subtle hand-drawn "boil".
  const seed = Math.floor(frame / 5) % 8;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      <Canvas>
        <BoardDefs seed={seed} colors={colors} />
      </Canvas>

      <Title props={props} />

      <Reveal at={timing.veneer}>
        <Canvas>
          <Veneer colors={colors} />
        </Canvas>
        <LayerLabel y={349} {...props.veneer} colors={colors} />
      </Reveal>

      <Reveal at={timing.core}>
        <Canvas>
          <Core colors={colors} />
        </Canvas>
        <LayerLabel y={520} {...props.core} colors={colors} />
      </Reveal>

      <Reveal at={timing.backing}>
        <Canvas>
          <Backing colors={colors} />
        </Canvas>
        <LayerLabel y={677} {...props.backing} colors={colors} />
      </Reveal>

      <Reveal at={timing.thickness}>
        <Canvas>
          <g
            stroke={colors.accent}
            strokeWidth={4}
            strokeLinecap="round"
            filter="url(#sketch)"
          >
            <line x1={1168} y1={313} x2={1168} y2={700} />
            <line x1={1153} y1={313} x2={1184} y2={313} />
            <line x1={1153} y1={700} x2={1184} y2={700} />
          </g>
        </Canvas>
        <Text baseline={488} size={81} weight={900} color={colors.text} left={1211}>
          {thickness.value}
          <span style={{ fontSize: 40, marginLeft: 3 }}>{thickness.unit}</span>
        </Text>
        <Text baseline={532} size={29} weight={700} color={colors.accent} left={1213}>
          {thickness.highlight}
        </Text>
        <Text baseline={570} size={27} weight={400} color={colors.mutedText} left={1213}>
          {thickness.note}
        </Text>
      </Reveal>

      <Reveal at={timing.reminder}>
        <div
          style={{
            position: "absolute",
            left: 60,
            top: 940,
            minWidth: 198,
            height: 60,
            padding: "0 22px",
            boxSizing: "border-box",
            borderRadius: 11,
            backgroundColor: colors.badge,
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
          {reminder.badge}
        </div>
        <Text baseline={980} size={39.5} weight={700} color={colors.text} left={286}>
          <UnderlinedWord
            underline={
              <Underline
                d="M 0.2 5 C 34 3, 66 6, 99.8 4"
                color={colors.highlight}
                width={4}
                offset={4}
              />
            }
          >
            {reminder.before}
            <span style={{ fontWeight: 900 }}>{reminder.bold}</span>
            {reminder.after}
          </UnderlinedWord>
        </Text>
      </Reveal>

      {props.showSignature ? (
        <svg
          viewBox="0 0 260 140"
          width={260}
          height={140}
          style={{ position: "absolute", left: 1630, top: 915 }}
        >
          <path d={SIGNATURE_PATH} fill={colors.signature} fillRule="evenodd" />
        </svg>
      ) : null}
    </AbsoluteFill>
  );
};
