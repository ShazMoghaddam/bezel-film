# Changelog

All notable changes to Bezel Film are listed here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Sound effects that land with the movement: a whoosh between scenes, pops as numbers, cards, chips and buttons appear, a swish for each point, and ticks while a number counts up, ending in a small bell as it lands.
- `sfx.volume` setting, from `0` (off) to `1`. Defaults to `0.5`, which keeps them subtle.
- Sound effects play more quietly while someone is speaking.
- Sounds are made in code, like the music: nothing to download or license, and the same film always sounds the same.

### Changed

- Films now have sound effects by default. Set `"sfx": { "volume": 0 }` for the v0.4.0 sound.
- Count-up timings now live in one place, shared by the picture and the sound, so ticks and the landing bell always match the number on screen.

## [0.4.0] - 2026-11-19

Spring motion: things settle into place with a little life, and every frame is still exact.

### Added

- Spring motion. Things settle into place with a small, natural overshoot, worked out as real spring maths and drawn with CSS, so every frame is still exact.
- `motion` setting, for the whole film or one scene: `calm`, `lively` or `punchy`. The `data-story` style uses `lively`.
- Headings appear word by word in `lively` and `punchy`. Long headings get tighter gaps, so they never drag.
- Each kind of element has its own entrance: numbers, cards, chips and buttons grow in, list points slide in from the side.
- Big numbers land with a small pulse, and count up on a curve that settles more decisively.
- `npm run motion` saves frame strips of every entrance and checks rendering is exact.

### Changed

- Films move with `lively` motion by default. Set `"motion": "calm"` to keep the v0.3.0 look, which is unchanged.

## [0.3.0] - 2026-11-19

Made for social: one film, ready for TikTok, Reels, Shorts, Instagram, LinkedIn, X, WhatsApp and YouTube.

### Added

- Platform presets: set `format.preset` to `tiktok`, `reels`, `shorts`, `instagram`, `linkedin-mobile`, `linkedin-desktop`, `linkedin-square`, `x`, `whatsapp` or `youtube`, and the film gets the right shape and size.
- Safe zones: on TikTok, Reels and Shorts, titles, numbers, charts and captions stay centred and clear of the app's names and captions, and of its buttons apart from TikTok's lower right corner. `render --show-safe-zones` shades the covered areas so you can check by eye.
- Layouts for tall and square frames, with larger text for phones. Long numbers, words and web addresses shrink to fit, long code lines wrap, and a scene with too much in it scales down rather than spilling off the frame.
- `render --for tiktok,reels,x` (or `--for all`) makes a version for each platform from one film, sharing the voice and music.
- A cover image next to every video, taken from the opening scene. `--no-cover` skips it.
- `bezel-film formats` lists the presets.
- The 4:5 shape and 720p resolution. WhatsApp videos are kept under 16 MB.
- `validate` and `render` warn when a film is too long for its platform.
- `init` adds cover images to `.gitignore`, alongside videos.

## [0.2.0] - 2026-11-19

One command to start: `npx bezel-film init` sets everything up and makes your first film.

### Added

- `npx bezel-film init` sets up a folder in one step: installs Bezel Film, adds instructions for your coding agents (ticking the ones it finds), does the one-time downloads and makes a welcome film so you can see it work. `--yes`, `--agents` and `--no-sample` let agents and scripts run it too.
- Shared instruction files like `AGENTS.md` only get a marked Bezel Film section, which `init` updates in place. Your own text is never touched.
- The agent instructions now start with setup: if Bezel Film isn't installed, the agent runs `init` first. Films live in `films/<name>/`.
- A welcome film, and a README demo built from it with `npm run demo`.

### Changed

- The README now starts with the demo and a three-step guide to your first film, with the technical reference further down.
- Charts leave room for captions, so a long caption never covers a chart's labels.
- The Cursor rule now applies to film files in any folder.

### Fixed

- `validate` says "1 scene", not "1 scenes".
- `npm pack` now builds first, so a packed copy always has the latest code.

## [0.1.0] - 2026-11-18

The first release: describe a film in one JSON file, and Bezel Film renders it to an MP4 with voiceover, captions and music.

### Added

#### Films

- Film spec (version 1): film-wide settings for style, format, voice, music and captions, plus a list of scenes.
- Eight scene types: `title`, `stat`, `chart`, `points`, `code`, `quote`, `outro` and `custom`.
- Chart scenes that map directly onto Bezel Charts chart types.
- `data-story` style, with its colours, type and motion.
- `bezel-film validate` with readable errors and a rough running time.
- JSON Schema for film files, for autocomplete and checking in editors.
- Northside Coffee example film.

#### Rendering

- `bezel-film render` turns a film file into an MP4 with voiceover and captions, for the `data-story` style.
- Frame-by-frame capture on a frozen clock, including Bezel Charts' animations, so films are smooth and identical on any computer.
- Faster rendering, with several browser pages drawing frames at once.
- `bezel-film setup` to do the one-time downloads (voice model and headless browser) up front.
- Rendering runs fully offline after setup: the browser is blocked from opening any network connection.
- ffmpeg is found automatically, or fetched on install, so there's nothing extra to install.

#### Voice

- Local Kokoro voice, voiced one sentence at a time, so each scene lasts exactly as long as its narration.
- Choose a female or male voice with `voice.gender`, or any Kokoro voice with `voice.voice`.
- `bezel-film voices` records a short line in eight recommended voices, so you can hear them before choosing.

#### Music

- Music composed for every film, in six moods: calm, upbeat, dramatic, epic, ambient and reflective. The same film always gets the same music.
- Recorded piano, strings, harp and timpani from the VS Chamber Orchestra: Community Edition (CC0), shipped in the package.
- The music dips automatically whenever the voice speaks, and fades out with the picture.
- Ambient music sits on a nature sound: rain, sea waves, a stream or wind in the leaves, set with `music.nature` or picked from the title.
- Use your own track with `music.source: "file"`.

#### Coding agents

- Instructions for Claude Code, Codex, Gemini CLI, Cursor, GitHub Copilot and Windsurf, generated from one source.
- The agent asks one short round of questions first, including voice, captions and music, then writes and checks the film file.

#### Project

- CI checks on every push and pull request, including a render smoke test, plus Dependabot.

[Unreleased]: https://github.com/ShazMoghaddam/bezel-film/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/ShazMoghaddam/bezel-film/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/ShazMoghaddam/bezel-film/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/ShazMoghaddam/bezel-film/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/ShazMoghaddam/bezel-film/releases/tag/v0.1.0
