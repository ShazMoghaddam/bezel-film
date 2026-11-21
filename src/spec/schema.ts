import { z } from "zod";
import { ASPECTS, PLATFORMS, PRESETS, RESOLUTIONS, type Aspect, type Resolution } from "./formats.js";

export { ASPECTS, PRESETS, RESOLUTIONS } from "./formats.js";

/**
 * The film spec: one JSON file that describes a whole film.
 *
 * An agent (or a person) writes this file, `bezel-film validate` checks it,
 * and the renderer turns it into video. Keeping the film as data rather than
 * code is what makes it reliable for agents to write.
 */

/** Bump this only for breaking changes to the file format. */
export const SPEC_VERSION = 1;

export const STYLES = ["data-story", "product-launch", "whiteboard"] as const;
export const FRAME_RATES = [24, 30, 60] as const;
export const TRANSITIONS = ["cut", "fade", "slide", "wipe"] as const;
export const MOTION_LEVELS = ["calm", "lively", "punchy"] as const;
export const VOICE_ENGINES = ["kokoro", "piper", "none"] as const;
export const VOICE_GENDERS = ["female", "male"] as const;
export const MUSIC_SOURCES = ["generated", "file", "none"] as const;
export const MUSIC_MOODS = ["calm", "upbeat", "dramatic", "epic", "ambient", "reflective"] as const;
/** "composed" is Bezel Film's own music, written for the film. The rest are recorded tracks (see src/render/tracks.ts). */
export const MUSIC_TRACKS = [
  "composed",
  "lovely-piano-song",
  "study-and-relax",
  "city-sunshine",
  "the-drama",
  "driving-concern",
  "epic-blockbuster-2",
  "heroic-adventure",
  "infinite-wonder",
  "wisdom-in-the-sun",
  "nostalgic-piano",
  "romantic-inspiration",
] as const;
export const NATURE_SOUNDS = ["rain", "waves", "stream", "wind"] as const;

/** Chart types that map one to one onto Bezel Charts' `<bezel-chart type="...">`. */
export const CHART_TYPES = [
  "bars",
  "line",
  "area",
  "combo",
  "waterfall",
  "histogram",
  "boxplot",
  "scatter",
  "ring",
  "donut",
  "gauge",
  "progress",
  "bullet",
  "heatmap",
  "spark",
] as const;

const text = (max: number) => z.string().trim().min(1).max(max);

// Fields every scene shares.
const sceneBase = {
  id: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "use lowercase letters, numbers and hyphens, e.g. intro or big-number")
    .optional()
    .describe("Optional name for the scene, handy for previews and error messages."),
  narration: text(600)
    .optional()
    .describe("What the voice says during this scene. Scene length is timed from this unless duration is set."),
  duration: z
    .number()
    .positive()
    .max(120)
    .optional()
    .describe("Length in seconds. Overrides the timing worked out from narration."),
  transition: z.enum(TRANSITIONS).optional().describe("How this scene enters. Defaults to the style's choice."),
  motion: z.enum(MOTION_LEVELS).optional().describe("How this scene moves, overriding the film's motion."),
};

const titleScene = z.object({
  ...sceneBase,
  type: z.literal("title"),
  title: text(120),
  subtitle: text(200).optional(),
});

const statScene = z.object({
  ...sceneBase,
  type: z.literal("stat"),
  value: z.union([z.number(), text(24)]).describe("The big number, e.g. 42 or \"£1.2M\"."),
  label: text(120),
  context: text(200).optional().describe("A short line that gives the number meaning, e.g. \"up from 18 last year\"."),
});

const numberRow = z.array(z.number()).min(1);

const chartScene = z.object({
  ...sceneBase,
  type: z.literal("chart"),
  chart: z
    .object({
      type: z.enum(CHART_TYPES),
      heading: text(120).optional(),
      values: z
        .union([numberRow, z.array(numberRow).min(1)])
        .describe("One list of numbers, or a list of lists for several series."),
      labels: z.array(text(40)).optional(),
      series: z.array(text(40)).optional().describe("Series names, one per list in values."),
      prefix: z.string().max(8).optional(),
      suffix: z.string().max(12).optional(),
      options: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
        .optional()
        .describe("Any other Bezel Charts attribute, passed straight through, e.g. { \"goal\": 80 }."),
    })
    .superRefine((chart, ctx) => {
      const nested = Array.isArray(chart.values[0]);
      if (!nested && chart.labels && chart.labels.length !== chart.values.length) {
        ctx.addIssue({
          code: "custom",
          path: ["labels"],
          message: `has ${chart.labels.length} labels but values has ${chart.values.length} numbers`,
        });
      }
      if (nested && chart.series && chart.series.length !== chart.values.length) {
        ctx.addIssue({
          code: "custom",
          path: ["series"],
          message: `has ${chart.series.length} names but values has ${chart.values.length} series`,
        });
      }
    }),
});

const pointsScene = z.object({
  ...sceneBase,
  type: z.literal("points"),
  heading: text(120).optional(),
  points: z.array(text(140)).min(1).max(6),
});

/** Timelines and roadmaps hold up to this many items, so each stays readable on a phone. */
export const MAX_STEPS = 6;

const timelineScene = z.object({
  ...sceneBase,
  type: z.literal("timeline"),
  heading: text(120).optional(),
  events: z
    .array(
      z.object({
        date: text(24).describe("When it happened, as it should appear, e.g. \"2021\" or \"March 2024\"."),
        label: text(48).describe("What happened, in a few words."),
        detail: text(90).optional().describe("One short line more, if it helps."),
      }),
    )
    .min(2)
    .max(MAX_STEPS)
    .describe(`In order, oldest first. Up to ${MAX_STEPS}; split a longer story across two scenes.`),
});

export const ROADMAP_STATUSES = ["done", "in-progress", "planned"] as const;

const roadmapScene = z.object({
  ...sceneBase,
  type: z.literal("roadmap"),
  heading: text(120).optional(),
  steps: z
    .array(
      z.object({
        label: text(48).describe("The step, in a few words."),
        status: z.enum(ROADMAP_STATUSES).describe("done gets a tick, in-progress pulses gently, planned is shown faded."),
        when: text(24).optional().describe("When it's due or was done, e.g. \"Q3\" or \"Spring 2027\"."),
      }),
    )
    .min(2)
    .max(MAX_STEPS)
    .describe(`In order. Up to ${MAX_STEPS}; split a longer roadmap across two scenes.`),
});

/** Maps hold up to this many of each, so every label stays readable on a phone. */
export const MAX_PINS = 8;
export const MAX_ARCS = 6;
export const MAX_COUNTRIES = 24;

const placeRef = z
  .union([
    text(80),
    z.object({
      lat: z.number().min(-90).max(90),
      lon: z.number().min(-180).max(180),
      name: text(40).optional(),
    }),
  ])
  .describe("A city or country by name, e.g. \"Nairobi\", \"Paris, France\" or \"Brazil\", or exact coordinates as { lat, lon }.");

const mapScene = z
  .object({
    ...sceneBase,
    type: z.literal("map"),
    heading: text(120).optional(),
    focus: text(80)
      .optional()
      .describe("Where the camera ends up: \"world\", a region such as \"Europe\" or \"East Asia\", a country, or a city. Defaults to fitting everything shown."),
    pins: z
      .array(z.object({ place: placeRef, label: text(32).optional().describe("Defaults to the place's name.") }))
      .max(MAX_PINS)
      .optional()
      .describe(`Places to mark, in the order they appear. Up to ${MAX_PINS}.`),
    countries: z
      .array(
        z.object({
          country: text(60).describe("By name or code, e.g. \"Japan\", \"UK\" or \"DEU\"."),
          value: z.number().optional().describe("Shades the country by size. Give every country a value, or none."),
        }),
      )
      .max(MAX_COUNTRIES)
      .optional()
      .describe(`Countries to colour in. Up to ${MAX_COUNTRIES}.`),
    arcs: z
      .array(z.object({ from: placeRef, to: placeRef }))
      .max(MAX_ARCS)
      .optional()
      .describe(`Curved lines between places, e.g. a route or a shipment. Up to ${MAX_ARCS}.`),
    legend: text(60).optional().describe("What the shading means, e.g. \"Orders in 2025\". Shown when countries have values."),
    prefix: z.string().max(8).optional(),
    suffix: z.string().max(12).optional(),
  })
  .superRefine((scene, ctx) => {
    if (!scene.focus && !scene.pins?.length && !scene.countries?.length && !scene.arcs?.length) {
      ctx.addIssue({ code: "custom", path: ["pins"], message: "add some pins, countries or arcs, or a focus to show" });
    }
    const valued = scene.countries?.filter((c) => c.value !== undefined).length ?? 0;
    if (valued && valued !== scene.countries!.length) {
      ctx.addIssue({
        code: "custom",
        path: ["countries"],
        message: `${valued} of ${scene.countries!.length} countries have a value; give every country a value, or none`,
      });
    }
  });

const codeScene = z.object({
  ...sceneBase,
  type: z.literal("code"),
  language: text(24),
  code: z.string().min(1).max(4000),
  highlight: z.array(z.number().int().positive()).optional().describe("Line numbers to highlight, starting at 1."),
  caption: text(160).optional(),
});

const quoteScene = z.object({
  ...sceneBase,
  type: z.literal("quote"),
  quote: text(280),
  attribution: text(80).optional(),
});

/** Stickers on an outro: enough for a few ways in, never a wall of links. */
export const MAX_LINKS = 4;

const outroScene = z.object({
  ...sceneBase,
  type: z.literal("outro"),
  title: text(120),
  url: z.string().url().optional(),
  cta: text(80).optional().describe("Call to action, e.g. \"Star it on GitHub\"."),
  links: z
    .array(text(60))
    .min(1)
    .max(MAX_LINKS)
    .optional()
    .describe(`Up to ${MAX_LINKS} links or commands, shown as slightly tilted stickers, e.g. ["npm install my-lib", "github.com/me/my-lib"].`),
});

const customScene = z.object({
  ...sceneBase,
  type: z.literal("custom"),
  module: text(200).describe("Path to your own scene module, relative to the film file."),
  props: z.record(z.string(), z.unknown()).optional(),
});

export const sceneSchema = z.discriminatedUnion("type", [
  titleScene,
  statScene,
  chartScene,
  pointsScene,
  timelineScene,
  roadmapScene,
  mapScene,
  codeScene,
  quoteScene,
  outroScene,
  customScene,
]);

export const SCENE_TYPES = sceneSchema.options.map((option) => option.shape.type.value);

const formatSchema = z
  .object({
    preset: z
      .enum(PRESETS)
      .optional()
      .describe("The platform the film is for. Sets the shape and keeps text clear of that app's buttons and captions."),
    aspect: z.enum(ASPECTS).optional().describe("The shape of the frame. Set by the preset if there is one, otherwise 16:9."),
    resolution: z.enum(RESOLUTIONS).optional().describe("Set by the preset if there is one, otherwise 1080p."),
    fps: z.union(FRAME_RATES.map((rate) => z.literal(rate))).default(30),
  })
  .superRefine((format, ctx) => {
    if (format.preset && format.aspect && format.aspect !== PLATFORMS[format.preset].aspect) {
      const { label, aspect } = PLATFORMS[format.preset];
      ctx.addIssue({ code: "custom", path: ["aspect"], message: `${label} films are ${aspect}. Leave aspect out, or choose another preset` });
    }
  })
  .transform((format) => {
    const preset: Partial<{ aspect: Aspect; resolution: Resolution }> = format.preset ? PLATFORMS[format.preset] : {};
    return {
      ...format,
      aspect: format.aspect ?? preset.aspect ?? "16:9",
      resolution: format.resolution ?? preset.resolution ?? "1080p",
    };
  });

const voiceSchema = z.object({
  engine: z.enum(VOICE_ENGINES).default("kokoro"),
  gender: z.enum(VOICE_GENDERS).default("female").describe("A female or male voice. Picks the best-sounding voice of that kind."),
  voice: text(60).optional().describe("A specific voice name for the engine, e.g. \"bf_emma\". Overrides gender."),
  speed: z.number().min(0.5).max(2).default(1),
});

const musicSchema = z
  .object({
    source: z.enum(MUSIC_SOURCES).default("generated").describe("Music composed for the film, your own track, or none."),
    file: text(300).optional().describe("Path to your own track, relative to the film file. Used when source is \"file\"."),
    mood: z
      .enum(MUSIC_MOODS)
      .default("calm")
      .describe("calm: gentle piano. upbeat: bright and positive. dramatic: tense and building. epic: big and cinematic. ambient: slow, spacious music over a nature sound. reflective: thoughtful piano. Each mood has a few pieces; one is picked from the title."),
    track: z
      .enum(MUSIC_TRACKS)
      .optional()
      .describe("A specific piece of music, instead of one picked from the mood. \"composed\" is music written for the film."),
    nature: z.enum(NATURE_SOUNDS).optional().describe("The nature sound under ambient music. Picked from the title if left out."),
    volume: z.number().min(0).max(1).default(0.2).describe("How loud the music is between lines. It dips further while someone speaks."),
  })
  .superRefine((music, ctx) => {
    if (music.source === "file" && !music.file) {
      ctx.addIssue({ code: "custom", path: ["file"], message: "is needed when source is \"file\"" });
    }
    if (music.nature && music.mood !== "ambient") {
      ctx.addIssue({ code: "custom", path: ["nature"], message: "only applies to the ambient mood" });
    }
  });

const sfxSchema = z.object({
  volume: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe("How loud the sound effects are: whooshes between scenes, pops as things appear, ticks as numbers count. 0 turns them off."),
});

export const filmSchema = z
  .object({
    $schema: z.string().optional(),
    spec: z.literal(SPEC_VERSION).describe("Version of the film spec format."),
    title: text(120),
    style: z.enum(STYLES),
    format: formatSchema.prefault({}),
    voice: voiceSchema.prefault({}),
    music: musicSchema.prefault({}),
    sfx: sfxSchema.prefault({}),
    captions: z.boolean().default(true),
    motion: z
      .enum(MOTION_LEVELS)
      .optional()
      .describe("How things move. calm: smooth and simple. lively: springy, headings appear word by word. punchy: bigger and bouncier, for short social films. Defaults to the style's choice."),
    scenes: z.array(sceneSchema).min(1).max(40),
  })
  .superRefine((film, ctx) => {
    const seen = new Set<string>();
    film.scenes.forEach((scene, i) => {
      if (!scene.narration && scene.duration === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["scenes", i],
          message: "needs narration or a duration, so the renderer knows how long it lasts",
        });
      }
      if (scene.id) {
        if (seen.has(scene.id)) {
          ctx.addIssue({ code: "custom", path: ["scenes", i, "id"], message: `"${scene.id}" is used more than once` });
        }
        seen.add(scene.id);
      }
    });
  });

/** A film after validation, with every default filled in. */
export type Film = z.output<typeof filmSchema>;
/** A film as someone writes it, where defaulted fields are optional. */
export type FilmInput = z.input<typeof filmSchema>;
export type Scene = z.output<typeof sceneSchema>;
export type SceneType = Scene["type"];
export type MotionLevel = (typeof MOTION_LEVELS)[number];
export type MusicMood = (typeof MUSIC_MOODS)[number];
export type MusicTrack = (typeof MUSIC_TRACKS)[number];
