import { zColor } from "@remotion/zod-types";
import { z } from "zod";

// Everything you can change in the Engineered Wood video.
// Remotion Studio turns this into an editable form (right-hand "Props" panel).
// The starting values are the `defaultProps` in `src/Root.tsx`.

const layer = z.object({
  title: z.string(),
  note: z.string(),
});

// Seconds must be 0 or more.
const seconds = z.number().min(0);

export const engineeredWoodSchema = z.object({
  title: z.string(),
  // The word in the title that gets the pink underline (must appear in the title).
  underlinedWord: z.string(),

  veneer: layer,
  core: layer,
  backing: layer,

  thickness: z.object({
    value: z.string(),
    unit: z.string(),
    highlight: z.string(),
    note: z.string(),
  }),

  reminder: z.object({
    badge: z.string(),
    before: z.string(),
    bold: z.string(),
    after: z.string(),
  }),

  showSignature: z.boolean(),

  // When each part appears, in seconds from the start of the video.
  timing: z.object({
    underline: seconds,
    veneer: seconds,
    core: seconds,
    backing: seconds,
    thickness: seconds,
    reminder: seconds,
    // Total video length.
    end: z.number().min(1),
  }),

  colors: z.object({
    background: zColor(),
    text: zColor(),
    mutedText: zColor(),
    accent: zColor(),
    outline: zColor(),
    veneer: zColor(),
    core: zColor(),
    backing: zColor(),
    badge: zColor(),
    highlight: zColor(),
    signature: zColor(),
  }),
});

export type EngineeredWoodProps = z.infer<typeof engineeredWoodSchema>;
export type BoardColors = EngineeredWoodProps["colors"];
