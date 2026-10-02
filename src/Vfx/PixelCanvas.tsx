import { useLayoutEffect, useRef } from "react";
import { useCurrentFrame } from "remotion";
import { GRID_H, GRID_W, PixelBuffer } from "./pixel";

export type Effect = (buf: PixelBuffer, frame: number) => void;

// Draws an effect onto a tiny canvas and scales it up with nearest-neighbour
// sampling, so each art pixel becomes a crisp SCALE x SCALE block.
// The background stays transparent. `frame` overrides the current frame
// (used to lay out every frame of a sprite sheet at once).
export const PixelCanvas: React.FC<{ effect: Effect; frame?: number }> = ({
  effect,
  frame: fixedFrame,
}) => {
  const currentFrame = useCurrentFrame();
  const frame = fixedFrame ?? currentFrame;
  const ref = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) {
      return;
    }
    const buf = new PixelBuffer(GRID_W, GRID_H);
    effect(buf, frame);
    ctx.putImageData(new ImageData(buf.data, GRID_W, GRID_H), 0, 0);
  }, [effect, frame]);

  return (
    <canvas
      ref={ref}
      width={GRID_W}
      height={GRID_H}
      style={{ width: "100%", height: "100%", imageRendering: "pixelated" }}
    />
  );
};
