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

// Editable colors are props (see schema.ts); these are fixed details.
export const SHADOW = "rgba(120, 104, 80, 0.16)";

// A darker/tinted shade of a color, for grain and hatching lines.
export const shade = (color: string, percent: number, toward = "black") =>
  `color-mix(in srgb, ${color} ${percent}%, ${toward})`;

export const FPS = 60;
export const sec = (s: number) => Math.round(s * FPS);
