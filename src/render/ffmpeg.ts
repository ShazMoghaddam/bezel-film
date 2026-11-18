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

/** Decodes any audio file ffmpeg can read to stereo floats at the given sample rate. */
export function decodeAudio(ffmpeg: string, file: string, sampleRate = 44_100): Promise<{ left: Float32Array; right: Float32Array }> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, ["-v", "error", "-i", file, "-f", "f32le", "-ac", "2", "-ar", String(sampleRate), "-"]);
    const chunks: Buffer[] = [];
    let errors = "";
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on("data", (chunk) => (errors += chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`Couldn't read the audio file ${file}: ${errors.trim() || `ffmpeg exit code ${code}`}`));
      const raw = Buffer.concat(chunks);
      const interleaved = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
      const frames = interleaved.length / 2;
      const left = new Float32Array(frames);
      const right = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        left[i] = interleaved[i * 2]!;
        right[i] = interleaved[i * 2 + 1]!;
      }
      resolve({ left, right });
    });
  });
}

export interface EncoderOptions {
  ffmpeg: string;
  fps: number;
  /** Narration track, if the film has a voiceover. */
  narration?: string;
  /** Music track, if the film has music. */
  music?: string;
  output: string;
}

/**
 * Starts ffmpeg reading PNG frames on stdin. Write each frame with `write`,
 * then call `finish` to close the file.
 */
export function startEncoder({ ffmpeg, fps, narration, music, output }: EncoderOptions) {
  const args = ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "-"];
  const audio = [narration, music].filter((file): file is string => !!file);
  for (const file of audio) args.push("-i", file);
  if (narration && music) {
    // The voice is mono; place it in the centre, then lay it over the (already dipped) music.
    args.push(
      "-filter_complex",
      "[1:a]aresample=48000,pan=stereo|c0=c0|c1=c0[voice];[2:a]aresample=48000[music];[voice][music]amix=inputs=2:normalize=0:duration=longest[mix]",
      "-map", "0:v", "-map", "[mix]",
    );
  }
  args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p");
  if (audio.length) args.push("-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest");
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
