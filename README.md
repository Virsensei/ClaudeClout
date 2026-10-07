# ClaudeClout

Videos built with [Remotion](https://www.remotion.dev/).

## Commands

```bash
npm install        # install dependencies
npm run dev        # open Remotion Studio to preview compositions
npx remotion render HelloWorld out/video.mp4   # render a video
npm run render:wood # render the Engineered Wood explainer (1080p60)
npm run render:vfx  # export the pixel-art card VFX (all formats)
npm run upgrade    # upgrade all Remotion packages together
npm run lint       # typecheck
```

Compositions are registered in `src/Root.tsx`. Static assets go in `public/`.

Keep every `remotion` / `@remotion/*` package on the same exact version.

## Compositions

- `EngineeredWood` — 11.25s, 1920x1080 @ 60fps explainer: "Engineered wood is built in layers".
  Source in `src/EngineeredWood/`; the animation timeline lives in the `T` object in `EngineeredWood.tsx`.

Render settings (PNG frames, H.264 CRF 14, `veryslow` preset, BT.709) are in `remotion.config.ts`.
Fonts: Lato (SIL Open Font License), bundled in `public/fonts/`.

### Pixel-art card VFX (Undercards)

`VfxCastMagic`, `VfxFreeze`, `VfxSilence`: 220x250, 16 fps, 24 frames (1.5 s), transparent background.
Art is drawn on a 110x125 pixel grid and scaled 2x with no smoothing; pixels are fully opaque or
fully transparent, and fades use dithering.

- Class spells (`VfxSpellDetermination`, `…Bravery`, `…Perseverance`, `…Integrity`, `…Patience`,
  `…Kindness`, `…Justice`): `src/Vfx/effects/souls/`. Each builds its palette from one class colour
  via `ramp("#hex")` at the top of its file; the SOUL heart, stars and pluses are in `shared.ts`.
- Energy-flow class spells, no hearts (`VfxFlowDetermination` … `VfxFlowJustice`): `src/Vfx/effects/flow/`.
  Each builds a white-hot-to-deep palette from its class colour via `palette("#hex")`; trails, curves,
  lightning and orbs are in `shared.ts`.
- Emblem-style class spells, no hearts (`VfxClassDetermination` … `VfxClassJustice`): `src/Vfx/effects/classes/`.
  Same style as the Cast Magic / Freeze / Silence effects; the class colour is the `ramp("#hex")` line at the top.
- Emblem-style class spells, second set (`VfxClassV2Determination` … `VfxClassV2Justice`): `src/Vfx/effects/classes2/`
  (wings, explosion, quill, crown, moon, potion, gavel).
- Third set with extra game feel (`VfxClassV3Determination` … `VfxClassV3Justice`): `src/Vfx/effects/classes3/`.
  Kindness is a cooking spell (pancake flip) and Integrity a butterfly. Shake, bouncing particles,
  pop-out exits and the final twinkle are in `juice.ts`; wrap an effect in `withShake(effect, [[frame, strength]])`.
- Spell-card cast effects (`VfxCastFrame<Class>`, `VfxCastSeal<Class>`, `VfxCastBurst<Class>`): `src/Vfx/effects/cast/`.
  Three designs that only say "this card was cast", each in every class colour. The colours are the
  `CLASS_COLORS` table in `cast/index.ts`; change one and all three designs follow.
- `VfxCastGloveBravery`: Bravery cast with a boxing glove uppercut (`cast/glove.ts`; `castGlove(hex)` works with any colour).
- `VfxCastButterflyIntegrity`: Integrity cast with a butterfly that snaps open, rises and shrinks away into a twinkle (`cast/butterfly.ts`).
- `VfxCastSwarmIntegrity`: Integrity cast with a swarm of little butterflies (`cast/swarm.ts`). Each one has its own
  release time, flap speed, wandering path and exit frame (the `FLIERS` table), stays inside `BOX`, and leaves by
  shrinking into a tiny twinkle.
- `VfxCastKnifePatience`: Patience cast with a toy knife (`cast/knife.ts`): the knife is a clock hand that ticks
  round a circle of clock dots, whips past twelve and leaves a thin cut that waits two beats before it bursts open.
- `VfxCastStarDetermination`: Determination cast with the save-point star (`cast/star.ts`): it charges, bursts
  with a cross flare, and a ring of little stars blooms out and winks away.
  `docs/pixel-composer/CastStarDetermination.md` explains how to rebuild it in Pixel Composer.
  `fusion/CastStarDetermination.setting` is the same effect as a DaVinci Resolve Fusion node tree with one CTRL node
  (see `fusion/README.md`; regenerate with `python3 scripts/fusion/save_star.py`).
- Layered effects (`src/Vfx/layers.ts`): the knife, save star, quill, pan and glove can render one layer at a time.
  `VfxLayers<Effect>` is a still with a row per layer (bottom layer first) and a column per frame; stacked in order
  the layers rebuild the full effect exactly.
- Sound effects: `python3 scripts/sfx/make_sfx.py` synthesises a sound for the knife, save star, quill, pan, glove and
  Justice badge, a second acoustic set (`-v2`) for all of them except the pan, and one for the butterfly swarm
  (timed to their frames) into `out/sfx/<Effect>/` as WAV, OGG and MP3, plus a preview MP4 with the animation.
- The cast effects never touch the canvas edge (the game shows them over a transparent background, so anything
  cut off at the edge would look wrong). Elements may go outside the card (`{ x0: 15, y0: 4, x1: 94, y1: 121 }`)
  but must stay inside the 220 x 250 canvas, and leave by shrinking or fading, not by flying off.
- Effects: `src/Vfx/effects/*.ts`. Each one is a function that draws a single frame (`f` = 0 to 23);
  colors are in the `C` palette at the top of each file.
- Drawing helpers (rings, lines, sparkles, outline, dither fade): `src/Vfx/pixel.ts`.
- `npm run render:vfx` writes `out/vfx/<Effect>/`: `frames/` (PNG sequence), `<Effect>-spritesheet.png`
  (6 columns x 4 rows of 220x250, left to right), `<Effect>.webm` (VP9 with alpha) and `<Effect>.gif`.
  `npm run render:vfx -- Freeze` exports a single effect.
- GIF timing is stored in 10 ms steps, so the GIF runs about 1.56 s instead of exactly 1.5 s.
