import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/**
 * Finds ffmpeg: BEZEL_FILM_FFMPEG if set, then one already installed on the computer,
 * then the copy the optional ffmpeg-static package downloads, so most people never
 * have to install anything themselves.
 */
export function findFfmpeg(): string {
  const candidates = [process.env.BEZEL_FILM_FFMPEG, "ffmpeg", bundledFfmpeg()].filter((path): path is string => !!path);
  for (const path of candidates) {
    if (spawnSync(path, ["-version"], { stdio: "ignore" }).status === 0) return path;
  }
  throw new Error(
    "Couldn't find ffmpeg, which Bezel Film uses to make the video. Reinstall Bezel Film to fetch it automatically, or install ffmpeg yourself (on a Mac: brew install ffmpeg).",
  );
}

function bundledFfmpeg(): string | null {
  try {
    return require("ffmpeg-static") as string | null;
  } catch {
    return null;
  }
}

export interface EncoderOptions {
  ffmpeg: string;
  fps: number;
  /** Narration track, if the film has a voiceover. */
  audio?: string;
  output: string;
}

/**
 * Starts ffmpeg reading PNG frames on stdin. Write each frame with `write`,
 * then call `finish` to close the file.
 */
export function startEncoder({ ffmpeg, fps, audio, output }: EncoderOptions) {
  const args = ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "-"];
  if (audio) args.push("-i", audio);
  args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p");
  if (audio) args.push("-c:a", "aac", "-b:a", "192k", "-shortest");
  args.push("-movflags", "+faststart", output);

  const child = spawn(ffmpeg, args, { stdio: ["pipe", "ignore", "pipe"] });
  let errors = "";
  child.stderr.on("data", (chunk) => (errors += chunk));
  const done = new Promise<void>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg failed (code ${code}): ${errors.trim()}`))));
  });

  return {
    async write(frame: Buffer) {
      if (!child.stdin.write(frame)) await new Promise((resolve) => child.stdin.once("drain", resolve));
    },
    async finish() {
      child.stdin.end();
      await done;
    },
    abort() {
      child.kill("SIGKILL");
    },
  };
}
