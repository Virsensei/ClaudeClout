import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const FONT_FAMILY = "Lato";

for (const weight of ["400", "700", "900"]) {
  loadFont({
    family: FONT_FAMILY,
    url: staticFile(`fonts/lato-latin-${weight}-normal.woff2`),
    weight,
  });
}

export const COLORS = {
  background: "#F0EAE0",
  navy: "#253157",
  ink: "#262C40",
  pill: "#26386A",
  muted: "#857E7A",
  pink: "#EE7592",
  pinkText: "#E8788C",
  bracket: "#E4848F",
  veneer: "#F5D65E",
  veneerGrain: "#C9A338",
  core: "#FAFBFB",
  coreHatch: "#DCE3EA",
  backing: "#64C3DB",
  backingHatch: "#49A6C4",
  highlight: "#F3D35F",
  shadow: "rgba(120, 104, 80, 0.16)",
  signature: "#3A3F5C",
};

export const FPS = 60;
export const sec = (s: number) => Math.round(s * FPS);
