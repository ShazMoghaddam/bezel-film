import type { z } from "zod";
import { filmSchema, type Film, type Scene } from "./schema.js";

export type ValidationResult = { ok: true; film: Film } | { ok: false; errors: string[] };

/** Turns a path like ["scenes", 2, "chart", "values"] into "scenes[2].chart.values". */
function formatPath(path: PropertyKey[]): string {
  return path.reduce<string>((out, key) => {
    if (typeof key === "number") return `${out}[${key}]`;
    return out ? `${out}.${String(key)}` : String(key);
  }, "");
}

function formatIssue(issue: z.core.$ZodIssue): string {
  const where = formatPath(issue.path);
  return where ? `${where}: ${issue.message}` : issue.message;
}

/** Checks a parsed film file. Never throws; returns readable errors instead. */
export function validateFilm(input: unknown): ValidationResult {
  const result = filmSchema.safeParse(input);
  if (result.success) return { ok: true, film: result.data };
  return { ok: false, errors: result.error.issues.map(formatIssue) };
}

/** Average speaking pace used for rough timing before real audio exists. */
export const WORDS_PER_MINUTE = 150;
const SCENE_PADDING_SECONDS = 0.6;

/** Rough scene length in seconds, worked out the same way the renderer will start from. */
export function estimateSceneSeconds(scene: Scene, speed = 1): number {
  if (scene.duration !== undefined) return scene.duration;
  const words = scene.narration?.split(/\s+/).filter(Boolean).length ?? 0;
  return (words / WORDS_PER_MINUTE) * 60 / speed + SCENE_PADDING_SECONDS;
}

export function estimateFilmSeconds(film: Film): number {
  return film.scenes.reduce((total, scene) => total + estimateSceneSeconds(scene, film.voice.speed), 0);
}
