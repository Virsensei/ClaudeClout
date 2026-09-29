# ClaudeClout

Videos built with [Remotion](https://www.remotion.dev/).

## Commands

```bash
npm install        # install dependencies
npm run dev        # open Remotion Studio to preview compositions
npx remotion render HelloWorld out/video.mp4   # render a video
npm run render:wood # render the Engineered Wood explainer (1080p60)
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
