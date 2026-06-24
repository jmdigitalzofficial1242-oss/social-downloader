import { createWriteStream, existsSync, unlinkSync } from "node:fs";
import { chmod, cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import https from "node:https";
import { join } from "node:path";
import { tmpdir } from "node:os";

const downloadUrl = "https://registry.npmjs.org/@ffmpeg-installer/linux-x64/-/linux-x64-4.1.0.tgz";
const dir = join(process.cwd(), "netlify", "functions", "bin");
const destPath = join(dir, "ffmpeg");

const download = (url, dest) =>
  new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        download(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }

      if (res.statusCode === 200) {
        const file = createWriteStream(dest);
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
        file.on("error", (err) => {
          if (existsSync(dest)) unlinkSync(dest);
          reject(err);
        });
        return;
      }

      reject(new Error(`Failed to download: ${res.statusCode}`));
    }).on("error", reject);
  });

const extractBinary = async (archivePath, extractDir) => {
  const { spawn } = await import("node:child_process");
  await new Promise((resolve, reject) => {
    const child = spawn("tar", ["-xzf", archivePath, "-C", extractDir]);
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || "tar extraction failed."));
    });
  });
};

(async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "social-downloader-ffmpeg-"));
  const archivePath = join(tempDir, "ffmpeg.tgz");
  const extractedDir = join(tempDir, "package");

  try {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    await download(downloadUrl, archivePath);
    await extractBinary(archivePath, tempDir);
    await cp(join(extractedDir, "ffmpeg"), destPath, { force: true });

    if (process.platform !== "win32") {
      await chmod(destPath, 0o755);
    }

    console.log("ffmpeg standalone binary installed successfully!");
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
})();
