import { createWriteStream, existsSync } from "node:fs";
import { chmod, mkdir } from "node:fs/promises";
import https from "node:https";
import path from "node:path";
import os from "node:os";

const isWin = process.platform === "win32";
const binaryName = isWin ? "yt-dlp.exe" : "yt-dlp";
const downloadUrl = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${isWin ? 'yt-dlp.exe' : 'yt-dlp_linux'}`;

const dir = path.join(process.cwd(), "netlify", "functions", "bin");
const destPath = path.join(dir, binaryName);

console.log(`Downloading ${downloadUrl} to ${destPath}`);

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        download(res.headers.location, dest).then(resolve).catch(reject);
      } else if (res.statusCode === 200) {
        const file = createWriteStream(dest);
        res.pipe(file);
        file.on("finish", () => {
          file.close(resolve);
        });
        file.on("error", (err) => {
          fs.unlink(dest, () => reject(err));
        });
      } else {
        reject(new Error(`Failed to download: ${res.statusCode}`));
      }
    }).on("error", reject);
  });
};

(async () => {
  try {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await download(downloadUrl, destPath);
    if (!isWin) {
      await chmod(destPath, 0o755);
    }
    console.log("yt-dlp standalone binary installed successfully!");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
