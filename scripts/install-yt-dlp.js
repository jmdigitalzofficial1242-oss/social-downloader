import { createWriteStream, existsSync, unlink } from "node:fs";
import { chmod, mkdir } from "node:fs/promises";
import https from "node:https";
import path from "node:path";

const targetPlatform = String(process.env.YTDLP_TARGET_PLATFORM || process.platform).toLowerCase();
const isWin = targetPlatform === "win32" || targetPlatform === "windows";
const binaryName = isWin ? "yt-dlp.exe" : "yt-dlp";
const staleBinaryName = isWin ? "yt-dlp" : "yt-dlp.exe";
const releaseAsset = isWin ? "yt-dlp.exe" : "yt-dlp_linux";
const downloadUrl = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${releaseAsset}`;

const dir = path.join(process.cwd(), "netlify", "functions", "bin");
const destPath = path.join(dir, binaryName);
const stalePath = path.join(dir, staleBinaryName);

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
          unlink(dest, () => reject(err));
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
    if (existsSync(stalePath)) {
      unlink(stalePath, () => {});
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
