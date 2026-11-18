import { homedir } from "node:os";
import { join } from "node:path";
import type { Film } from "../spec/schema.js";

/** A clip of mono audio as raw samples between -1 and 1. */
export interface Clip {
  samples: Float32Array;
  sampleRate: number;
}

/**
 * Anything that can turn a sentence into speech. Kokoro is built in; passing your
 * own Voice to renderFilm is how other engines (including paid ones) plug in.
 */
export interface Voice {
  speak(text: string): Promise<Clip>;
  /** Frees the voice engine. Called once rendering is done. */
  dispose?(): Promise<void>;
}

export const DEFAULT_KOKORO_VOICE = "af_heart";
const KOKORO_MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";

/** Where downloaded models live, outside node_modules so a reinstall keeps them. */
export function cacheDir(): string {
  return process.env.BEZEL_FILM_CACHE ?? join(process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache"), "bezel-film");
}

export type Progress = (message: string) => void;

/** Loads the local Kokoro voice, downloading the model once on first use (about 90 MB). */
export async function kokoroVoice(options: { voice?: string; speed?: number; onProgress?: Progress } = {}): Promise<Voice> {
  // Loaded only when needed, so validating a film never pays for the voice engine.
  const [{ KokoroTTS }, { env }] = await Promise.all([import("kokoro-js"), import("@huggingface/transformers")]);
  env.cacheDir = join(cacheDir(), "models");

  let lastPercent = -1;
  const tts = await KokoroTTS.from_pretrained(KOKORO_MODEL, {
    dtype: "q8",
    device: "cpu",
    progress_callback: (event: { status?: string; progress?: number }) => {
      if (event.status !== "progress" || typeof event.progress !== "number") return;
      const percent = Math.floor(event.progress);
      if (percent !== lastPercent && percent % 10 === 0) {
        lastPercent = percent;
        options.onProgress?.(`Downloading the voice model (one time only): ${percent}%`);
      }
    },
  });

  const voice = options.voice ?? DEFAULT_KOKORO_VOICE;
  if (!(voice in tts.voices)) {
    throw new Error(`Unknown Kokoro voice "${voice}". Try one of: ${Object.keys(tts.voices).join(", ")}`);
  }

  return {
    async speak(text) {
      const audio = await tts.generate(text, { voice: voice as keyof typeof tts.voices, speed: options.speed ?? 1 });
      return { samples: audio.audio, sampleRate: audio.sampling_rate };
    },
    // Releases the engine's native threads. Without this, Node can crash on exit on a Mac
    // ("mutex lock failed") after the video is already saved.
    async dispose() {
      await tts.model.dispose();
    },
  };
}

/** Picks the voice the film asks for. Returns null when the film has no voiceover. */
export async function voiceForFilm(film: Film, onProgress?: Progress): Promise<Voice | null> {
  switch (film.voice.engine) {
    case "none":
      return null;
    case "kokoro":
      return kokoroVoice({ voice: film.voice.voice, speed: film.voice.speed, onProgress });
    case "piper":
      throw new Error('The Piper voice isn\'t built yet. Use "kokoro" for now, or "none" for no voiceover.');
  }
}
