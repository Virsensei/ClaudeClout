import { Composition } from "remotion";
import { PixelCanvas } from "./PixelCanvas";
import type { Effect } from "./PixelCanvas";
import { LAYERED } from "./layers";
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
import { determination as flowDetermination } from "./effects/flow/determination";
import { bravery as flowBravery } from "./effects/flow/bravery";
import { perseverance as flowPerseverance } from "./effects/flow/perseverance";
import { integrity as flowIntegrity } from "./effects/flow/integrity";
import { patience as flowPatience } from "./effects/flow/patience";
import { kindness as flowKindness } from "./effects/flow/kindness";
import { justice as flowJustice } from "./effects/flow/justice";
import { determination as classDetermination } from "./effects/classes/determination";
import { bravery as classBravery } from "./effects/classes/bravery";
import { perseverance as classPerseverance } from "./effects/classes/perseverance";
import { integrity as classIntegrity } from "./effects/classes/integrity";
import { patience as classPatience } from "./effects/classes/patience";
import { kindness as classKindness } from "./effects/classes/kindness";
import { justice as classJustice } from "./effects/classes/justice";
import { determination as classV2Determination } from "./effects/classes2/determination";
import { bravery as classV2Bravery } from "./effects/classes2/bravery";
import { perseverance as classV2Perseverance } from "./effects/classes2/perseverance";
import { integrity as classV2Integrity } from "./effects/classes2/integrity";
import { patience as classV2Patience } from "./effects/classes2/patience";
import { kindness as classV2Kindness } from "./effects/classes2/kindness";
import { justice as classV2Justice } from "./effects/classes2/justice";
import { determination as classV3Determination } from "./effects/classes3/determination";
import { bravery as classV3Bravery } from "./effects/classes3/bravery";
import { perseverance as classV3Perseverance } from "./effects/classes3/perseverance";
import { integrity as classV3Integrity } from "./effects/classes3/integrity";
import { patience as classV3Patience } from "./effects/classes3/patience";
import { kindness as classV3Kindness } from "./effects/classes3/kindness";
import { justice as classV3Justice } from "./effects/classes3/justice";
import { castEffects } from "./effects/cast";

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
  // Energy-flow class spells (no hearts), in the class colour.
  FlowDetermination: flowDetermination,
  FlowBravery: flowBravery,
  FlowPerseverance: flowPerseverance,
  FlowIntegrity: flowIntegrity,
  FlowPatience: flowPatience,
  FlowKindness: flowKindness,
  FlowJustice: flowJustice,
  // Emblem-style class spells (no hearts), in the class colour.
  ClassDetermination: classDetermination,
  ClassBravery: classBravery,
  ClassPerseverance: classPerseverance,
  ClassIntegrity: classIntegrity,
  ClassPatience: classPatience,
  ClassKindness: classKindness,
  ClassJustice: classJustice,
  // Emblem-style class spells, second set.
  ClassV2Determination: classV2Determination,
  ClassV2Bravery: classV2Bravery,
  ClassV2Perseverance: classV2Perseverance,
  ClassV2Integrity: classV2Integrity,
  ClassV2Patience: classV2Patience,
  ClassV2Kindness: classV2Kindness,
  ClassV2Justice: classV2Justice,
  // Third set: extra "game feel" (anticipation, hit-stop, shake, bounces).
  ClassV3Determination: classV3Determination,
  ClassV3Bravery: classV3Bravery,
  ClassV3Perseverance: classV3Perseverance,
  ClassV3Integrity: classV3Integrity,
  ClassV3Patience: classV3Patience,
  ClassV3Kindness: classV3Kindness,
  ClassV3Justice: classV3Justice,
  // Spell-card cast effects: Frame, Seal and Burst in every class colour.
  ...castEffects,
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

// Every layer of a layered effect in one image: a row per layer (bottom
// layer first), a column per frame.
const LayerSheet: React.FC<{ effect: string }> = ({ effect }) => (
  <div style={{ display: "flex", flexDirection: "column" }}>
    {LAYERED[effect].map((layer) => (
      <div key={layer.name} style={{ display: "flex" }}>
        {new Array(VFX_FRAMES).fill(0).map((_, i) => (
          <div key={i} style={{ width: WIDTH, height: HEIGHT, flexShrink: 0 }}>
            <PixelCanvas effect={layer.effect} frame={i} />
          </div>
        ))}
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
    {Object.keys(LAYERED).map((name) => (
      <Composition
        key={`layers-${name}`}
        id={`VfxLayers${name}`}
        component={LayerSheet}
        defaultProps={{ effect: name }}
        width={WIDTH * VFX_FRAMES}
        height={HEIGHT * LAYERED[name].length}
        fps={VFX_FPS}
        durationInFrames={1}
      />
    ))}
  </>
);
