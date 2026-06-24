import { join } from "node:path";
import { fileURLToPath } from "node:url";

const serviceDir = fileURLToPath(new URL(".", import.meta.url));

export const resolveBundledFfmpegPath = () => join(serviceDir, "..", "netlify", "functions", "bin", "ffmpeg");
