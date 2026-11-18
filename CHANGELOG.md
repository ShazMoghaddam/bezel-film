# Changelog

All notable changes to Bezel Film are listed here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- `bezel-film render` turns a film file into an MP4 with voiceover and captions, for the `data-story` style.
- Local Kokoro voice, voiced one sentence at a time, so each scene lasts exactly as long as its narration.
- Frame-by-frame capture on a frozen clock, including Bezel Charts' animations, so films are smooth and identical on any computer.
- Faster rendering with several browser pages drawing frames at once.
- `bezel-film setup` to do the one-time downloads (voice model and headless browser) up front.
- Rendering runs fully offline after setup: the browser is blocked from opening any network connection.
- ffmpeg is found automatically, or fetched on install, so there's nothing extra to install.
- Render smoke test in CI.

- Film spec (version 1): film-wide settings for style, format, voice, music and captions, plus a list of scenes.
- Eight scene types: `title`, `stat`, `chart`, `points`, `code`, `quote`, `outro` and `custom`.
- Chart scenes that map directly onto Bezel Charts chart types.
- `bezel-film validate` command with readable errors and a rough running time.
- JSON Schema for film files, generated from the source schema.
- Agent instructions for Claude Code, Codex, Gemini CLI, Cursor, GitHub Copilot and Windsurf, generated from one source.
- `data-story` style tokens for colour, type and motion.
- Northside Coffee example film.
- CI checks on every push and pull request, plus Dependabot.
