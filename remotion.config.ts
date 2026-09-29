// See all configuration options: https://remotion.dev/docs/config
import { Config } from "@remotion/cli/config";

// Lossless frames + visually lossless H.264: sharp text, small files.
Config.setVideoImageFormat("png");
Config.setCodec("h264");
Config.setCrf(14);
Config.setX264Preset("veryslow");
Config.setColorSpace("bt709");
Config.setOverwriteOutput(true);
