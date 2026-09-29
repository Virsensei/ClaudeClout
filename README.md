# ClaudeClout

Videos built with [Remotion](https://www.remotion.dev/).

## Commands

```bash
npm install        # install dependencies
npm run dev        # open Remotion Studio to preview compositions
npx remotion render HelloWorld out/video.mp4   # render a video
npm run upgrade    # upgrade all Remotion packages together
npm run lint       # typecheck
```

Compositions are registered in `src/Root.tsx`. Static assets go in `public/`.

Keep every `remotion` / `@remotion/*` package on the same exact version.
