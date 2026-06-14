import { spawn } from "node:child_process";

const commands = process.platform === "win32" ? ["python", "python3"] : ["python3", "python"];
const args = ["-m", "pip", "install", "-t", "netlify/functions/python", "yt-dlp"];

const run = (command) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: false });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`))));
  });

let lastError;

for (const command of commands) {
  try {
    await run(command);
    process.exit(0);
  } catch (error) {
    lastError = error;
  }
}

throw lastError || new Error("Python was not found.");
