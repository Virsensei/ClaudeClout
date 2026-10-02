// Exports every pixel-art VFX in all formats into out/vfx/<Effect>/.
// Usage: npm run render:vfx            (all effects)
//        npm run render:vfx -- Freeze  (just one)
// Any extra --flags are passed straight to the Remotion CLI.
import { execFileSync } from "node:child_process";

const ALL = [
  "CastMagic",
  "CastMagic2",
  "CastMagic3",
  "CastMagic4",
  "Freeze",
  "Freeze2",
  "Silence",
  "SpellDetermination",
  "SpellBravery",
  "SpellPerseverance",
  "SpellIntegrity",
  "SpellPatience",
  "SpellKindness",
  "SpellJustice",
  "FlowDetermination",
  "FlowBravery",
  "FlowPerseverance",
  "FlowIntegrity",
  "FlowPatience",
  "FlowKindness",
  "FlowJustice",
  "ClassDetermination",
  "ClassBravery",
  "ClassPerseverance",
  "ClassIntegrity",
  "ClassPatience",
  "ClassKindness",
  "ClassJustice",
  "ClassV2Determination",
  "ClassV2Bravery",
  "ClassV2Perseverance",
  "ClassV2Integrity",
  "ClassV2Patience",
  "ClassV2Kindness",
  "ClassV2Justice",
  "ClassV3Determination",
  "ClassV3Bravery",
  "ClassV3Perseverance",
  "ClassV3Integrity",
  "ClassV3Patience",
  "ClassV3Kindness",
  "ClassV3Justice",
];
const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("--"));
const picked = args.filter((a) => !a.startsWith("--"));
const effects = picked.length > 0 ? picked : ALL;

const remotion = (...cmd) =>
  execFileSync("npx", ["remotion", ...cmd, ...flags], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

for (const name of effects) {
  const dir = `out/vfx/${name}`;
  console.log(`\n=== ${name} ===`);
  // 1. Transparent PNG frames: frames/element-00.png ... element-23.png
  remotion("render", `Vfx${name}`, `${dir}/frames`, "--sequence");
  // 2. Sprite sheet: all 24 frames, 6 columns x 4 rows
  remotion("still", `VfxSheet${name}`, `${dir}/${name}-spritesheet.png`);
  // 3. WebM video with transparency (plays in Chrome, Firefox, Edge)
  remotion(
    "render",
    `Vfx${name}`,
    `${dir}/${name}.webm`,
    "--codec=vp9",
    "--pixel-format=yuva420p",
    "--crf=10",
  );
  // 4. Animated GIF with transparency
  remotion("render", `Vfx${name}`, `${dir}/${name}.gif`, "--codec=gif");
}
