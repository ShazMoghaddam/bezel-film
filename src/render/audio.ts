import type { Clip } from "./voice.js";

/** Places each clip at its start time on one silent track, then returns it as a 16-bit WAV file. */
export function mixToWav(placed: { clip: Clip; start: number }[], durationSeconds: number): Buffer {
  const sampleRate = placed[0]?.clip.sampleRate ?? 24_000;
  const track = new Float32Array(Math.ceil(durationSeconds * sampleRate));

  for (const { clip, start } of placed) {
    if (clip.sampleRate !== sampleRate) throw new Error("All voice clips must share one sample rate");
    const offset = Math.round(start * sampleRate);
    for (let i = 0; i < clip.samples.length && offset + i < track.length; i++) {
      track[offset + i]! += clip.samples[i]!;
    }
  }
  return encodeWav(track, sampleRate);
}

/** Mono 16-bit PCM WAV. Small, lossless and something ffmpeg reads everywhere. */
export function encodeWav(samples: Float32Array, sampleRate: number): Buffer {
  const bytes = samples.length * 2;
  const wav = Buffer.alloc(44 + bytes);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + bytes, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16); // size of the format block
  wav.writeUInt16LE(1, 20); // PCM
  wav.writeUInt16LE(1, 22); // mono
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28); // bytes per second
  wav.writeUInt16LE(2, 32); // bytes per sample
  wav.writeUInt16LE(16, 34); // bits per sample
  wav.write("data", 36);
  wav.writeUInt32LE(bytes, 40);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]!));
    wav.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  return wav;
}

/** Seconds of audio in a clip. */
export function clipSeconds(clip: Clip): number {
  return clip.samples.length / clip.sampleRate;
}
