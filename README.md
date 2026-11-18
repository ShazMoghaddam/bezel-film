# Bezel Film

[![Check](https://github.com/ShazMoghaddam/bezel-film/actions/workflows/check.yml/badge.svg)](https://github.com/ShazMoghaddam/bezel-film/actions/workflows/check.yml)
[![npm](https://img.shields.io/npm/v/bezel-film?color=4C8DFF)](https://www.npmjs.com/package/bezel-film)
[![Node](https://img.shields.io/node/v/bezel-film?color=2EC4B6)](https://nodejs.org)
[![Licence: MIT](https://img.shields.io/badge/licence-MIT-FFB020)](LICENSE)

**Make short narrated films in code, from a repo, a README or a dataset.**

Describe your film in one JSON file. Bezel Film draws every scene, adds a voiceover and captions, and renders an MP4. It runs on your own computer, needs no API keys, and comes with instructions for the coding agents you already use, so you can just ask for a film.

> **Status: early development.** Rendering works for the `data-story` style. Music, more styles and more formats are on the [roadmap](#roadmap).

## Why Bezel Film

- **Repo to film.** Point your agent at a project or a dataset and get a short explainer or data story.
- **Charts built in.** Chart scenes are drawn with [Bezel Charts](https://github.com/ShazMoghaddam/bezel-charts), so data looks sharp and animates cleanly.
- **Offline after a one-time setup.** A local voice ([Kokoro](https://huggingface.co/hexgrad/Kokoro-82M)) and a headless browser download once, the first time. After that, nothing leaves your computer. No accounts, no keys, no upload.
- **Smooth and repeatable.** Every frame is drawn on a frozen clock, so films come out smooth on any computer and identical every time.
- **Works with your agent.** Ready-made instructions for Claude Code, Codex, Gemini CLI, Cursor, GitHub Copilot, Windsurf and any agent that reads `AGENTS.md`.
- **Every shape.** 16:9, 9:16 and 1:1, in full HD or 4K.

## Quick start

Needs Node 22 or later.

```bash
npm install --save-dev bezel-film
npx bezel-film validate film.json
npx bezel-film render film.json
```

```
Rendering "Northside Coffee: a year in numbers"
✓ Saved film.mp4 · 38s · rendered in 1m 59s
```

Render time depends on your computer. That run was on a small two-core machine, and most laptops are faster.

The video is saved next to the film file. Use `-o` to choose another path: `npx bezel-film render film.json -o videos/coffee.mp4`.

### First run

The first render downloads two things, once: the voice model (about 90 MB) and a headless browser (about 100 MB). To do that up front instead, run:

```bash
npx bezel-film setup
```

You don't need to install ffmpeg. Bezel Film uses yours if you have it, and otherwise fetches a copy when you install.

On Linux, the voice engine also tries to download large GPU files it doesn't need. Skip them with:

```bash
ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm install --save-dev bezel-film
```

## The film file

A film is a few settings plus a list of scenes. Only `spec`, `title`, `style` and `scenes` are required.

```json
{
  "$schema": "./node_modules/bezel-film/schema/film.schema.json",
  "spec": 1,
  "title": "Northside Coffee: a year in numbers",
  "style": "data-story",
  "format": { "aspect": "16:9", "resolution": "1080p", "fps": 30 },
  "scenes": [
    {
      "type": "stat",
      "value": "48,210",
      "label": "cups served",
      "narration": "We served just over forty-eight thousand cups."
    },
    {
      "type": "chart",
      "chart": { "type": "bars", "values": [9800, 11200, 12400, 14810], "labels": ["Q1", "Q2", "Q3", "Q4"] },
      "narration": "Every quarter beat the last."
    }
  ]
}
```

Each scene lasts as long as its narration, so the voice and visuals always line up. See the full [example film](examples/northside-coffee/film.json).

### Scene types

| Type | Use it for | Main fields |
| --- | --- | --- |
| `title` | Opening card | `title`, `subtitle` |
| `stat` | One big number | `value`, `label`, `context` |
| `chart` | Any [Bezel Charts](https://github.com/ShazMoghaddam/bezel-charts) chart | `chart.type`, `chart.values`, `chart.labels` |
| `points` | Up to six short points | `heading`, `points` |
| `code` | A short code snippet | `language`, `code`, `highlight` |
| `quote` | A quote or testimonial | `quote`, `attribution` |
| `outro` | Closing card and call to action | `title`, `url`, `cta` |
| `custom` | Your own canvas scene | `module`, `props` |

Every scene can also take `narration`, `duration`, `transition` and `id`.

### Settings

| Setting | Options | Default |
| --- | --- | --- |
| `style` | `data-story`, `product-launch`, `whiteboard` | required |
| `format.aspect` | `16:9`, `9:16`, `1:1` | `16:9` |
| `format.resolution` | `1080p`, `4k` | `1080p` |
| `format.fps` | `24`, `30`, `60` | `30` |
| `voice.engine` | `kokoro`, `none` (`piper` is planned) | `kokoro` |
| `voice.voice` | any [Kokoro voice](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md), e.g. `af_heart`, `bf_emma`, `bm_george` | `af_heart` |
| `voice.speed` | `0.5` to `2` | `1` |
| `music.source` | `generated`, `file`, `none` (music is coming soon) | `generated` |
| `captions` | `true`, `false` | `true` |

### Advanced settings

These environment variables are optional:

| Variable | What it does |
| --- | --- |
| `BEZEL_FILM_FFMPEG` | Path to the ffmpeg to use |
| `BEZEL_FILM_CHROME` | Path to a Chrome or Chromium to draw with |
| `BEZEL_FILM_CACHE` | Where downloaded models are kept (default `~/.cache/bezel-film`) |
| `BEZEL_FILM_WORKERS` | How many browser pages draw frames at once (default: spare CPU cores, up to 4) |

## Using it with a coding agent

Bezel Film ships instructions for each agent in `agents/generated/`, all built from one source so they never drift apart. They tell the agent to ask you one short round of questions, write the film file, validate it and offer a storyboard preview before rendering.

| Agent | File |
| --- | --- |
| Claude Code | `.claude/skills/bezel-film/SKILL.md` |
| OpenAI Codex and others | `AGENTS.md` |
| Gemini CLI | `GEMINI.md` |
| Cursor | `.cursor/rules/bezel-film.mdc` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Windsurf | `.windsurf/rules/bezel-film.md` |

A `bezel-film init` command that copies the right file into your project is on the roadmap.

## Roadmap

- **v0.1.0:** ~~rendering for the `data-story` style in 16:9, Kokoro voiceover, captions~~ (done), music made in code
- **v0.2.0:** layouts tuned for 9:16 and 1:1, 4K, storyboard preview, `bezel-film init`
- **v0.3.0:** `product-launch` and `whiteboard` styles, repo and README to film
- **Later:** optional paid voices, an optional Python helper for turning datasets into film files

## Contributing

Ideas, bug reports and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md). To report a security issue, see [SECURITY.md](SECURITY.md).

## Licence

Bezel Film is [MIT](LICENSE) licensed. It downloads and uses these, each under its own licence:

- [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) voice model and [kokoro-js](https://github.com/hexgrad/kokoro): Apache 2.0
- [Playwright](https://github.com/microsoft/playwright) and Chromium: Apache 2.0 and BSD
- [ffmpeg](https://ffmpeg.org), via [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static): GPL 3.0. It runs as a separate program and isn't part of Bezel Film's code.
- Space Grotesk, Inter and JetBrains Mono fonts: SIL Open Font License

---

Created by **Shaz Moghaddam** · London
[Website](https://shazmoghaddam.github.io/) · [LinkedIn](https://www.linkedin.com/in/shazmoghaddam/)
