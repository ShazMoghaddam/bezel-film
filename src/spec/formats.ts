/**
 * Platform presets: the shape, size and safe zones each social platform wants.
 *
 * Safe zones are the parts of the frame an app covers with its own buttons,
 * captions and names. They're fractions of the frame, measured from each edge.
 * TikTok, Instagram and YouTube only publish safe zones for ads; organic posts
 * have a similar layout, so these are the official ad figures (checked November 2026):
 *
 * - TikTok: TikTok Ads Manager help, in-feed ads (240 / 660 / 120 / 120 px on 1080x1920,
 *   plus a 300 px button column on the right from 840 px down).
 * - Instagram Reels: Meta Ads Guide, Reels video specs (14% top, 35% bottom, 6% sides).
 * - YouTube Shorts: Google Ads help, vertical safe zone template (288 / 672 / 48 / 192 px).
 *
 * Where a platform doesn't cover the video (LinkedIn, X, YouTube), presets use
 * Bezel Film's normal margins. WhatsApp Status covers a thin strip at the top
 * and bottom, so it gets slightly wider margins of our own.
 */

export const ASPECTS = ["16:9", "9:16", "4:5", "1:1"] as const;
export type Aspect = (typeof ASPECTS)[number];

export const RESOLUTIONS = ["720p", "1080p", "4k"] as const;
export type Resolution = (typeof RESOLUTIONS)[number];

/** Frame size in CSS pixels at 1080p. 720p and 4K scale this. */
export const FRAME_SIZES: Record<Aspect, readonly [number, number]> = {
  "16:9": [1920, 1080],
  "9:16": [1080, 1920],
  "4:5": [1080, 1350],
  "1:1": [1080, 1080],
};

export const RESOLUTION_SCALE: Record<Resolution, number> = { "720p": 720 / 1080, "1080p": 1, "4k": 2 };

/** Fractions of the frame's width (left, right) and height (top, bottom). */
export interface SafeZone {
  top: number;
  right: number;
  bottom: number;
  left: number;
  /** An extra blocked strip down the right edge, e.g. TikTok's like and share buttons. */
  column?: { width: number; from: number };
}

export interface Platform {
  label: string;
  aspect: Aspect;
  resolution?: Resolution;
  safe?: SafeZone;
  /** Longest film the platform takes, or shows to new viewers. */
  maxSeconds?: number;
  /** Past this, a film still works but tends to lose viewers on this platform. */
  idealSeconds?: number;
  /** Largest file the platform takes without shrinking it further, in megabytes. */
  maxMegabytes?: number;
  why: string;
}

export const PLATFORMS = {
  tiktok: {
    label: "TikTok",
    aspect: "9:16",
    safe: { top: 240 / 1920, right: 120 / 1080, bottom: 660 / 1920, left: 120 / 1080, column: { width: 300 / 1080, from: 840 / 1920 } },
    maxSeconds: 600,
    idealSeconds: 60,
    why: "full-screen vertical, clear of TikTok's buttons and caption",
  },
  reels: {
    label: "Instagram Reels",
    aspect: "9:16",
    safe: { top: 0.14, right: 0.06, bottom: 0.35, left: 0.06 },
    maxSeconds: 180,
    idealSeconds: 90,
    why: "full-screen vertical, clear of Instagram's buttons and caption",
  },
  shorts: {
    label: "YouTube Shorts",
    aspect: "9:16",
    safe: { top: 288 / 1920, right: 192 / 1080, bottom: 672 / 1920, left: 48 / 1080 },
    maxSeconds: 180,
    idealSeconds: 60,
    why: "full-screen vertical, clear of YouTube's buttons and title",
  },
  instagram: {
    label: "Instagram feed",
    aspect: "4:5",
    maxSeconds: 180,
    idealSeconds: 60,
    why: "tall feed post that fills more of the phone screen",
  },
  "linkedin-mobile": {
    label: "LinkedIn (mobile)",
    aspect: "4:5",
    maxSeconds: 600,
    idealSeconds: 60,
    why: "tall feed post for people scrolling on their phones",
  },
  "linkedin-desktop": {
    label: "LinkedIn (desktop)",
    aspect: "16:9",
    maxSeconds: 600,
    idealSeconds: 90,
    why: "widescreen, for people on laptops and desktops",
  },
  "linkedin-square": {
    label: "LinkedIn (square)",
    aspect: "1:1",
    maxSeconds: 600,
    idealSeconds: 60,
    why: "square, a safe middle ground for phones and desktops",
  },
  x: {
    label: "X",
    aspect: "16:9",
    maxSeconds: 140,
    idealSeconds: 60,
    why: "widescreen, the shape X shows best (free accounts take up to 2 min 20 s)",
  },
  whatsapp: {
    label: "WhatsApp",
    aspect: "9:16",
    resolution: "720p",
    safe: { top: 0.09, right: 0.06, bottom: 0.13, left: 0.06 },
    maxSeconds: 90,
    maxMegabytes: 16,
    why: "small and quick to send, and fits a Status (up to 90 s)",
  },
  youtube: {
    label: "YouTube",
    aspect: "16:9",
    idealSeconds: 600,
    why: "widescreen video for a channel or a website",
  },
} as const satisfies Record<string, Platform>;

export type PresetName = keyof typeof PLATFORMS;
export const PRESETS = Object.keys(PLATFORMS) as PresetName[];

export const platform = (name: PresetName): Platform => PLATFORMS[name];

/** "1m 30s" or "45s". */
const seconds = (s: number) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${s % 60 ? ` ${s % 60}s` : ""}`);

/** Notes about a film's length on a platform, e.g. that it's too long for Shorts. */
export function lengthNotes(name: PresetName, filmSeconds: number): string[] {
  const { label, maxSeconds, idealSeconds } = platform(name);
  const length = Math.round(filmSeconds);
  if (maxSeconds && length > maxSeconds) {
    return [`At about ${seconds(length)}, this film is longer than ${label} allows (${seconds(maxSeconds)}). Cut some narration or scenes.`];
  }
  if (idealSeconds && length > idealSeconds) {
    return [`At about ${seconds(length)}, this film is long for ${label}, where under ${seconds(idealSeconds)} tends to hold viewers best.`];
  }
  return [];
}

/** Reads a list like "tiktok, Reels" or "all". Repeats are dropped; the first unknown name is returned. */
export function readPresetList(list: string): { presets: PresetName[]; unknown?: string } {
  const names = list.split(",").map((name) => name.trim().toLowerCase()).filter(Boolean);
  if (names.includes("all")) return { presets: [...PRESETS] };
  const unknown = names.find((name) => !(PRESETS as string[]).includes(name));
  return { presets: [...new Set(names)] as PresetName[], unknown };
}
