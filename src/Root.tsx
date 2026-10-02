import { Composition } from "remotion";
import { HelloWorld } from "./HelloWorld";
import { EngineeredWood } from "./EngineeredWood/EngineeredWood";
import { engineeredWoodSchema } from "./EngineeredWood/schema";
import { FPS } from "./EngineeredWood/theme";
import { VfxCompositions } from "./Vfx/Vfx";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="EngineeredWood"
        component={EngineeredWood}
        schema={engineeredWoodSchema}
        fps={FPS}
        width={1920}
        height={1080}
        durationInFrames={Math.round(11.25 * FPS)}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.round(props.timing.end * FPS),
        })}
        // ─────────────────────────────────────────────────────────
        //  EDIT THE VIDEO HERE (or use the Props panel in Remotion Studio)
        //  Change any text, time (seconds) or color, then save.
        //  Keep the quotes "..." around text and the commas at line ends.
        // ─────────────────────────────────────────────────────────
        defaultProps={{
          title: "Engineered wood is built in layers",
          underlinedWord: "Engineered",

          veneer: {
            title: "Real wood veneer",
            note: "the bit you actually see",
          },
          core: {
            title: "Plywood / HDF core",
            note: "where the thickness hides",
          },
          backing: {
            title: "Backing layer",
            note: "stops the board bowing",
          },

          thickness: {
            value: "14–20",
            unit: "mm",
            highlight: "thicker than most floors",
            note: "(laminate is only ~8mm)",
          },

          reminder: {
            badge: "REMEMBER",
            before: "Measure the ",
            bold: "finished",
            after: " floor height before you order.",
          },

          showSignature: true,

          // Seconds from the start of the video.
          timing: {
            underline: 2.3,
            veneer: 2.75,
            core: 4.72,
            backing: 7.2,
            thickness: 8.4,
            reminder: 9.07,
            end: 11.25,
          },

          // Colors as hex codes, e.g. "#F5D65E".
          colors: {
            background: "#F0EAE0",
            text: "#253157",
            mutedText: "#857E7A",
            accent: "#EE7592",
            outline: "#262C40",
            veneer: "#F5D65E",
            core: "#FAFBFB",
            backing: "#64C3DB",
            badge: "#26386A",
            highlight: "#F3D35F",
            signature: "#3A3F5C",
          },
        }}
      />
      <Composition
        id="HelloWorld"
        component={HelloWorld}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ title: "ClaudeClout" }}
      />
      <VfxCompositions />
    </>
  );
};
