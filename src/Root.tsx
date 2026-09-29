import { Composition } from "remotion";
import { HelloWorld } from "./HelloWorld";
import {
  ENGINEERED_WOOD_DURATION,
  EngineeredWood,
} from "./EngineeredWood/EngineeredWood";
import { FPS } from "./EngineeredWood/theme";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="EngineeredWood"
        component={EngineeredWood}
        durationInFrames={Math.round(ENGINEERED_WOOD_DURATION * FPS)}
        fps={FPS}
        width={1920}
        height={1080}
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
    </>
  );
};
