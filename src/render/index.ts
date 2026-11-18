import type { Film } from "../spec/schema.js";

export interface RenderOptions {
  /** Where to write the finished video, e.g. "out/film.mp4". */
  output: string;
  /** Render a quick low-resolution storyboard instead of the full film. */
  preview?: boolean;
}

/**
 * Turns a validated film into a video.
 *
 * Planned pipeline for v0.1.0:
 *   1. Narration to audio with the local voice (Kokoro), which fixes each scene's length.
 *   2. Scenes drawn frame by frame on a browser canvas, captured by headless Chromium.
 *   3. Frames, voice, music and captions joined into an MP4 with ffmpeg.
 */
export async function renderFilm(_film: Film, _options: RenderOptions): Promise<never> {
  throw new Error("Rendering is not built yet. It arrives in v0.1.0. For now, use `bezel-film validate`.");
}
