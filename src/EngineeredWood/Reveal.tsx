import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { sec } from "./theme";

// Fades its children in while lifting them a few pixels, like the reference.
export const Reveal: React.FC<{
  at: number;
  duration?: number;
  rise?: number;
  children: React.ReactNode;
}> = ({ at, duration = 0.3, rise = 14, children }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [sec(at), sec(at + duration)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  if (progress === 0) {
    return null;
  }

  return (
    <AbsoluteFill
      style={{
        opacity: progress,
        transform: `translateY(${(1 - progress) * rise}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
