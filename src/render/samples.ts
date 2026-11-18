import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { encodeWav } from "./audio.js";
import type { Clip, Progress, Speaker } from "./voice.js";

/** The voices worth hearing, best first, with Kokoro's own quality grade. */
export const VOICE_SHORTLIST = [
  { id: "af_heart", name: "Heart", gender: "female", accent: "American", grade: "A" },
  { id: "af_bella", name: "Bella", gender: "female", accent: "American", grade: "A-" },
  { id: "af_nicole", name: "Nicole", gender: "female", accent: "American", grade: "B-" },
  { id: "bf_emma", name: "Emma", gender: "female", accent: "British", grade: "B-" },
  { id: "am_michael", name: "Michael", gender: "male", accent: "American", grade: "C+" },
  { id: "am_fenrir", name: "Fenrir", gender: "male", accent: "American", grade: "C+" },
  { id: "am_puck", name: "Puck", gender: "male", accent: "American", grade: "C+" },
  { id: "bm_george", name: "George", gender: "male", accent: "British", grade: "C" },
] as const;

export type ShortlistVoice = (typeof VOICE_SHORTLIST)[number];

const GAP_SECONDS = 0.8;

/**
 * Speaks one short line in each shortlisted voice. Writes a file per voice and one
 * file with them all in a row, so you can hear the whole shortlist in under a minute.
 */
export async function sampleVoices(options: {
  speaker: Speaker;
  folder: string;
  text?: (voice: ShortlistVoice) => string;
  onProgress?: Progress;
}): Promise<{ files: { voice: ShortlistVoice; path: string }[]; all: string }> {
  const line = options.text ?? ((voice) => `Hi, I'm ${voice.name}. This is how your film's narration would sound.`);
  await mkdir(options.folder, { recursive: true });

  const files: { voice: ShortlistVoice; path: string }[] = [];
  const clips: Clip[] = [];
  for (const [i, voice] of VOICE_SHORTLIST.entries()) {
    options.onProgress?.(`Recording ${voice.name} (${i + 1} of ${VOICE_SHORTLIST.length})`);
    const clip = await options.speaker.speakAs(voice.id, line(voice));
    const path = join(options.folder, `${String(i + 1).padStart(2, "0")}-${voice.id}.wav`);
    await writeFile(path, encodeWav(clip.samples, clip.sampleRate));
    files.push({ voice, path });
    clips.push(clip);
  }

  const all = join(options.folder, "all-voices.wav");
  await writeFile(all, joinClips(clips, GAP_SECONDS));
  return { files, all };
}

/** Clips one after another with a short silence between them, as a WAV file. */
export function joinClips(clips: Clip[], gapSeconds: number): Buffer {
  const sampleRate = clips[0]?.sampleRate ?? 24_000;
  const gap = Math.round(gapSeconds * sampleRate);
  const total = clips.reduce((sum, clip) => sum + clip.samples.length + gap, 0);
  const out = new Float32Array(total);
  let at = 0;
  for (const clip of clips) {
    out.set(clip.samples, at);
    at += clip.samples.length + gap;
  }
  return encodeWav(out, sampleRate);
}
