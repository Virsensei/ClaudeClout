// See all configuration options: https://remotion.dev/docs/config
import { Config } from "@remotion/cli/config";

// Lossless PNG frames keep text and pixel art sharp. Codec-specific quality
// settings live in the npm scripts in package.json.
Config.setVideoImageFormat("png");
Config.setColorSpace("bt709");
Config.setOverwriteOutput(true);
