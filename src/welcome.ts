import type { FilmInput } from "./spec/schema.js";

/**
 * The welcome film `bezel-film init` drops in and renders, so a new user sees a real
 * film within minutes. Short, and it shows off a little of everything.
 */
export const WELCOME_FILM: FilmInput = {
  $schema: "../../node_modules/bezel-film/schema/film.schema.json",
  spec: 1,
  title: "Welcome to Bezel Film",
  style: "data-story",
  format: { aspect: "16:9", resolution: "1080p", fps: 30 },
  voice: { engine: "kokoro", gender: "female" },
  music: { source: "generated", mood: "upbeat" },
  captions: true,
  scenes: [
    {
      id: "welcome",
      type: "title",
      title: "Welcome to Bezel Film",
      subtitle: "Your first film, made in code",
      narration: "Welcome to Bezel Film. This is your first film, and it was made entirely in code.",
    },
    {
      id: "moods",
      type: "stat",
      value: 6,
      label: "music moods",
      context: "composed fresh for every film",
      narration: "Every film gets its own music, in one of six moods.",
    },
    {
      id: "whats-inside",
      type: "chart",
      chart: {
        type: "bars",
        heading: "Plenty to play with",
        values: [8, 6, 4, 8],
        labels: ["Scene types", "Music moods", "Nature sounds", "Voices"],
      },
      narration: "Mix titles, big numbers, charts and code. Then pick a voice and a sound.",
    },
    {
      id: "ask",
      type: "points",
      heading: "Just ask your agent",
      points: ["A film about your project", "A data story from a spreadsheet", "A short for social media"],
      narration: "To make your own, just tell your agent what you want.",
    },
    {
      id: "your-turn",
      type: "outro",
      title: "Your turn",
      cta: "Tell your agent your idea",
      narration: "Now it's your turn. What will you make?",
    },
  ],
};
