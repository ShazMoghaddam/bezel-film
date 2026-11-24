# Changelog

All notable changes to Bezel Film are listed here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.6.0] - 2026-11-24

Films can now look like different kinds of film. Your agent can draw whole scenes in code, and the first four styles made for it turn any idea into a whiteboard explainer, a stick-figure story, a small isometric world or a technical drawing.

### Added

- Four new styles, each a different kind of film, with a guide for agents (`bezel-film guide <style>`) and an example film:
  - **Whiteboard**: a marker pen draws and writes each idea as it's spoken.
  - **Stick figures**: stick people act the idea out on notebook paper.
  - **Isometric world**: a small world where blocks rise and things move through it.
  - **Blueprint**: technical drawings plotted in white on blue paper.
- Custom scenes: an agent can write a whole scene in code, in a small file next to the film (`"type": "custom", "file": "scenes/intro.js"`), with `props` for its words and numbers and `sounds` to land with its movement. Custom and ready-made scenes mix in one film.
- The scene kit every custom scene builds with: the safe area, the style's colours and fonts, when each sentence is spoken, springs and easing, and lines and words that draw themselves with an optional marker pen. Plus 5,491 line drawings (`kit.icon()`, Tabler Icons, MIT), hand-drawn shapes (`kit.rough`), posable stick figures (`kit.figure`), isometric blocks, tiles and trees (`kit.iso`), technical measurements (`kit.dimension`), and `kit.stage()` and `kit.text()` for layout.
- `bezel-film preview`: stills of every scene and a contact sheet in seconds, so an agent can look at its work before rendering.
- Checks on custom scenes, in `preview` and before every render: the same moment must always draw the same picture, words stay inside the safe area and readable, and frames draw quickly. Each problem names the scene, the file and the fix. A typo is reported with its file and line.
- `bezel-film guide`: a director's guide to planning a film (hook, script, shots, sound and a quality bar), the scene kit's reference, and each style's own guide.
- A `font` setting with eight font pairings: `grotesk`, `editorial`, `condensed`, `bold`, `technical`, `friendly`, `handwritten` and `mono`. Each style has its own, and a film can choose another.
- Fonts cover Latin Extended as well as Latin, so names such as Ştefan, Zoë and Łódź show in the film's own font.
- `bezel-film styles` lists the styles (and which have a guide) and the font pairings; `bezel-film icons <word>` finds line drawings.
- Each style is a folder with its own CSS, SVG filters and guide, so new styles don't touch the renderer. Styles say whether they're light or dark, and charts follow. See `styles/README.md`.
- Tests check every style's text and colours stand out enough from its background (WCAG AA).
- Example films for custom scenes and each new style in `examples/`, and a custom scene in the CI smoke render.

### Changed

- The `custom` scene, listed but never rendered before, now takes `file` (a `.js` file in the film's folder) instead of `module`.
- The `style` list comes from the folders in `styles/`. `product-launch`, which was listed but never rendered, is gone, so `validate` now catches it.
- Fonts ship inside the package in `fonts/`: only the files films use, about 1.3 MB, each with its licence. The Fontsource packages are no longer installed with Bezel Film.
- Stickers use the code font's real bold rather than one the browser draws, so their edges are crisper.
- `init` adds the preview folders to `.gitignore`.

### Fixed

- Captions keep white text in light styles, where they used to take the style's dark text colour.

## [0.5.2] - 2026-11-21

Stickers for closing cards, and a third example film.

### Added

- `outro` scenes take `links`: up to four links or commands shown as slightly tilted yellow stickers, popping in one after another, e.g. an npm and a PyPI install command side by side.
- A third example film, `examples/bezel-charts`: Bezel Charts told in under a minute and a half for LinkedIn, from why it was made to where to get it, showing off six chart types. Its figures come from the Bezel Charts README and changelog, and from the researched data in World in Charts.

### Fixed

- Headings revealed word by word now keep words joined by a non-breaking space together, so a name such as "Shaz Moghaddam · London" can't be split across lines.

### Security

- The repository now uses sharp 0.35.5, which fixes high-severity issues in the image libraries it bundles (libvips, libheif and librsvg). sharp comes in through the voice engine (kokoro-js and Hugging Face transformers), which still ask for 0.34, so an npm override moves it up. Bezel Film never gives sharp an image to open, so installed copies were not exposed.

## [0.5.1] - 2026-11-20

Point Bezel Film at a project and get a first film.

### Added

- `bezel-film draft <source>` writes a first film about a project from its folder, a README file or a GitHub repository (`owner/repo` or its link). It reads the README, `package.json` or `pyproject.toml`, the changelog and, for GitHub, the star count, then drafts a title, what it does (from the feature list), how to start (the install command and a short example), how far it's come (from the changelog), what's next (from the README's roadmap), its stars and a call to action. Scenes it has nothing for are left out. The draft is a starting point: coding agents are told to rewrite it into a story, and it never overwrites a file.
- Windsurf's compact instructions are shorter, which leaves room for what's to come.

## [0.5.0] - 2026-11-20

Product stories: three new scenes for telling where a project has been, where it's going and where in the world it happens.

### Added

- `map` scenes: pins with labels, countries coloured in (or shaded by a number, with a legend) and curved arcs between places. Name places in plain words, such as "Nairobi", "Paris, France" or "the UK", or give coordinates. Everything is looked up in the package's own copy of [Natural Earth](https://www.naturalearthdata.com) (public domain), so it works offline, and a typo gets a "did you mean" suggestion. The camera flies from the whole world to the `focus` (a region, a country or a city) or to fit everything shown, then countries fill in, pins pop and arcs draw as the narrator reaches them. On tall and square frames the camera crops in from the sides to fill the frame, never cutting anything off.
- `timeline` scenes: up to six dated events along a line, oldest first, each with an optional detail line. Each stop appears as the narrator reaches it, and the line draws itself to meet it, blending from one stop's colour to the next.
- `roadmap` scenes: up to six steps marked `done` (ticked), `in-progress` (a gently pulsing ring) or `planned` (faded, on a dashed road), each with an optional `when`. The line draws as far as the work has got.
- Timelines and roadmaps run left to right on wide frames and top to bottom on square and tall ones. All three new scenes get the spring motion, sound effects and motion blur.
- A second example film, `examples/northside-story`, with a timeline, a map and a roadmap.

### Changed

- Windsurf's instructions are now a compact version of the shared ones (its rule files are capped at 6,000 characters), so every other agent keeps the full platform table and mood guidance.
- `npm run stills` takes scenes whose items arrive with the narration (points, timelines, roadmaps and maps) just before they end, with every item showing.

## [0.4.3] - 2026-11-20

Motion blur, completing Stage 3: things in motion blur as a film camera would catch them, and settle back to sharp.

### Added

- Motion blur. In `lively` and `punchy`, things in motion are blurred along the way they move, as a film camera would catch them, and are sharp again the moment they stop. Each frame measures where everything was half a frame earlier (a little more for `punchy`) and blurs only what moved. `calm` has no blur, so it still looks exactly as it did. Covers are always sharp.
- `--quality high` for `render`: true motion blur, with each frame blended from five snapshots across the shutter. The most natural look, for final versions; it takes about five times as long.
- `npm run motion` now also checks motion blur: present while things come in, absent in `calm` and in stills.

### Changed

- Releases now publish to npm from GitHub Actions when a GitHub release is published, using npm trusted publishing: no tokens or logins, and each version carries a provenance statement linking it to the exact build. The workflow checks the tag matches the version and that every music track is in the tag first.

## [0.4.2] - 2026-11-20

Recorded music and real nature sounds: hand-picked pieces for every mood, and field recordings under ambient films.

### Added

- Recorded music. Each mood now has a few hand-picked pieces, and a film gets one, chosen from its title. They're public-domain recordings from FreePD, levelled to the same loudness as the composed music without squashing their dynamics.
- `music.track` setting, to choose a piece yourself: any recorded track, or `composed`.
- The recordings download once during `bezel-film setup` and `init` (about 30 MB), from the release's own copy in the repo, each checked against its fingerprint. If one can't be had, the film uses composed music and says how to get it.
- `npm run music` rebuilds the tracks and nature loops from their sources, each pinned to a commit and checked against its fingerprint.

### Changed

- Nature sounds under ambient music are now real field recordings (CC0 or public domain), with two or three recordings of each sound, picked from the title. They ship in the package as seamless 45-second loops (4 MB in all).
- The `dramatic` and `ambient` moods now use recorded music. `calm`, `upbeat`, `epic` and `reflective` keep composed music as one of their options. Set `"music": { "track": "composed" }` for the composed music in any mood.

## [0.4.1] - 2026-11-19

Sound effects: real recordings that land with the movement, and step back while someone is speaking.

### Added

- Sound effects that land with the movement: a whoosh or sweep between scenes, a tap as a big number, chart or code appears, a pop for chips and buttons, a click for quote marks and web addresses, a swish for each point, and ticks while a number counts up, ending in a small chime as it lands.
- `sfx.volume` setting, from `0` (off) to `1`. Defaults to `0.5`, which keeps them subtle.
- Sound effects play more quietly while someone is speaking.
- Every sound is a real recording from CC0 (public domain) packs by Kenney, Sparklin Labs and artisticdude, shipped in the package as lossless FLAC (272 KB in all). See `sounds/CREDITS.md`.
- `npm run sounds` rebuilds them from their sources, each pinned to a commit and checked against its fingerprint.

### Changed

- Films now have sound effects by default. Set `"sfx": { "volume": 0 }` for the v0.4.0 sound.
- Count-up timings now live in one place, shared by the picture and the sound, so ticks and the landing chime always match the number on screen.

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

[Unreleased]: https://github.com/ShazMoghaddam/bezel-film/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/ShazMoghaddam/bezel-film/compare/v0.5.2...v0.6.0
[0.5.2]: https://github.com/ShazMoghaddam/bezel-film/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/ShazMoghaddam/bezel-film/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/ShazMoghaddam/bezel-film/compare/v0.4.3...v0.5.0
[0.4.3]: https://github.com/ShazMoghaddam/bezel-film/compare/v0.4.2...v0.4.3
[0.4.2]: https://github.com/ShazMoghaddam/bezel-film/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/ShazMoghaddam/bezel-film/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/ShazMoghaddam/bezel-film/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/ShazMoghaddam/bezel-film/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/ShazMoghaddam/bezel-film/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/ShazMoghaddam/bezel-film/releases/tag/v0.1.0
