import { Composition } from "remotion";
import { PixelCanvas } from "./PixelCanvas";
import type { Effect } from "./PixelCanvas";
import { castMagic } from "./effects/castMagic";
import { castMagic2 } from "./effects/castMagic2";
import { castMagic3 } from "./effects/castMagic3";
import { castMagic4 } from "./effects/castMagic4";
import { freeze } from "./effects/freeze";
import { freeze2 } from "./effects/freeze2";
import { silence } from "./effects/silence";
import { determination } from "./effects/souls/determination";
import { bravery } from "./effects/souls/bravery";
import { perseverance } from "./effects/souls/perseverance";
import { integrity } from "./effects/souls/integrity";
import { patience } from "./effects/souls/patience";
import { kindness } from "./effects/souls/kindness";
import { justice } from "./effects/souls/justice";

// Pixel-art card VFX for Undercards: 220x250, 16 fps, 1.5 s, transparent.
export const VFX_FPS = 16;
export const VFX_FRAMES = 24;
const WIDTH = 220;
const HEIGHT = 250;
const SHEET_COLUMNS = 6;

const effects: Record<string, Effect> = {
  CastMagic: castMagic,
  CastMagic2: castMagic2,
  CastMagic3: castMagic3,
  CastMagic4: castMagic4,
  Freeze: freeze,
  Freeze2: freeze2,
  Silence: silence,
  // One spell-casting effect per class, in the class colour.
  SpellDetermination: determination,
  SpellBravery: bravery,
  SpellPerseverance: perseverance,
  SpellIntegrity: integrity,
  SpellPatience: patience,
  SpellKindness: kindness,
  SpellJustice: justice,
};

const Vfx: React.FC<{ effect: string }> = ({ effect }) => (
  <PixelCanvas effect={effects[effect]} />
);

// Every frame in one image: 6 columns x 4 rows, left to right, top to bottom.
const SpriteSheet: React.FC<{ effect: string }> = ({ effect }) => (
  <div style={{ display: "flex", flexWrap: "wrap" }}>
    {new Array(VFX_FRAMES).fill(0).map((_, i) => (
      <div key={i} style={{ width: WIDTH, height: HEIGHT }}>
        <PixelCanvas effect={effects[effect]} frame={i} />
      </div>
    ))}
  </div>
);

export const VfxCompositions: React.FC = () => (
  <>
    {Object.keys(effects).map((name) => (
      <Composition
        key={name}
        id={`Vfx${name}`}
        component={Vfx}
        defaultProps={{ effect: name }}
        width={WIDTH}
        height={HEIGHT}
        fps={VFX_FPS}
        durationInFrames={VFX_FRAMES}
      />
    ))}
    {Object.keys(effects).map((name) => (
      <Composition
        key={`sheet-${name}`}
        id={`VfxSheet${name}`}
        component={SpriteSheet}
        defaultProps={{ effect: name }}
        width={WIDTH * SHEET_COLUMNS}
        height={HEIGHT * Math.ceil(VFX_FRAMES / SHEET_COLUMNS)}
        fps={VFX_FPS}
        durationInFrames={1}
      />
    ))}
  </>
);
