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
- Effects: `src/Vfx/effects/*.ts`. Each one is a function that draws a single frame (`f` = 0 to 23);
  colors are in the `C` palette at the top of each file.
- Drawing helpers (rings, lines, sparkles, outline, dither fade): `src/Vfx/pixel.ts`.
- `npm run render:vfx` writes `out/vfx/<Effect>/`: `frames/` (PNG sequence), `<Effect>-spritesheet.png`
  (6 columns x 4 rows of 220x250, left to right), `<Effect>.webm` (VP9 with alpha) and `<Effect>.gif`.
  `npm run render:vfx -- Freeze` exports a single effect.
- GIF timing is stored in 10 ms steps, so the GIF runs about 1.56 s instead of exactly 1.5 s.
