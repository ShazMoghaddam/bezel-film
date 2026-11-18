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

/** The best-sounding Kokoro voice of each kind, by Kokoro's own quality grades. */
export const KOKORO_VOICES = { female: "af_heart", male: "am_michael" } as const;
export const DEFAULT_KOKORO_VOICE = KOKORO_VOICES.female;

/** The Kokoro voice a film asks for: a named voice if it gives one, otherwise the best for its gender. */
export function kokoroVoiceName(film: Film): string {
  return film.voice.voice ?? KOKORO_VOICES[film.voice.gender];
}
const KOKORO_MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";

/** Where downloaded models live, outside node_modules so a reinstall keeps them. */
export function cacheDir(): string {
  return process.env.BEZEL_FILM_CACHE ?? join(process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache"), "bezel-film");
}

export type Progress = (message: string) => void;

type KokoroEngine = Awaited<ReturnType<typeof import("kokoro-js").KokoroTTS.from_pretrained>>;

/** Loads the Kokoro engine, downloading the model once on first use (about 90 MB). */
async function loadKokoro(onProgress?: Progress): Promise<KokoroEngine> {
  // Loaded only when needed, so validating a film never pays for the voice engine.
  const [{ KokoroTTS }, { env }] = await Promise.all([import("kokoro-js"), import("@huggingface/transformers")]);
  env.cacheDir = join(cacheDir(), "models");

  let lastPercent = -1;
  return KokoroTTS.from_pretrained(KOKORO_MODEL, {
    dtype: "q8",
    device: "cpu",
    progress_callback: (event: { status?: string; progress?: number }) => {
      if (event.status !== "progress" || typeof event.progress !== "number") return;
      const percent = Math.floor(event.progress);
      if (percent !== lastPercent && percent % 10 === 0) {
        lastPercent = percent;
        onProgress?.(`Downloading the voice model (one time only): ${percent}%`);
      }
    },
  });
}

function checkVoiceName(engine: KokoroEngine, voice: string): keyof KokoroEngine["voices"] {
  if (!(voice in engine.voices)) {
    throw new Error(`Unknown Kokoro voice "${voice}". Try one of: ${Object.keys(engine.voices).join(", ")}`);
  }
  return voice as keyof KokoroEngine["voices"];
}

/** A Kokoro engine that can speak in any of its voices. Used by `bezel-film voices`. */
export interface Speaker {
  /** Every voice name the engine knows. */
  voices: string[];
  speakAs(voice: string, text: string, speed?: number): Promise<Clip>;
  dispose(): Promise<void>;
}

export async function kokoroSpeaker(onProgress?: Progress): Promise<Speaker> {
  const engine = await loadKokoro(onProgress);
  return {
    voices: Object.keys(engine.voices),
    async speakAs(voice, text, speed = 1) {
      const audio = await engine.generate(text, { voice: checkVoiceName(engine, voice), speed });
      return { samples: audio.audio, sampleRate: audio.sampling_rate };
    },
    // Releases the engine's native threads. Without this, Node can crash on exit on a Mac
    // ("mutex lock failed") after the work is already saved.
    async dispose() {
      await engine.model.dispose();
    },
  };
}

/** The local Kokoro voice, speaking in one chosen voice. */
export async function kokoroVoice(options: { voice?: string; speed?: number; onProgress?: Progress } = {}): Promise<Voice> {
  const speaker = await kokoroSpeaker(options.onProgress);
  const voice = options.voice ?? DEFAULT_KOKORO_VOICE;
  if (!speaker.voices.includes(voice)) {
    await speaker.dispose();
    throw new Error(`Unknown Kokoro voice "${voice}". Try one of: ${speaker.voices.join(", ")}`);
  }
  return {
    speak: (text) => speaker.speakAs(voice, text, options.speed ?? 1),
    dispose: () => speaker.dispose(),
  };
}

/** Picks the voice the film asks for. Returns null when the film has no voiceover. */
export async function voiceForFilm(film: Film, onProgress?: Progress): Promise<Voice | null> {
  switch (film.voice.engine) {
    case "none":
      return null;
    case "kokoro":
      return kokoroVoice({ voice: kokoroVoiceName(film), speed: film.voice.speed, onProgress });
    case "piper":
      throw new Error('The Piper voice isn\'t built yet. Use "kokoro" for now, or "none" for no voiceover.');
  }
}
