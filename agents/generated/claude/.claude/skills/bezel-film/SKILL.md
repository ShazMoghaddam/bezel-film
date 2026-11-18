---
name: bezel-film
description: Make short narrated films from a repo, README or dataset with Bezel Film. Use when the user asks for a video, film, explainer, promo or data story.
---

<!-- Generated from agents/instructions.md by `npm run agents`. Edit that file, not this one. -->

# Making a film with Bezel Film

Bezel Film turns a repo, a README or a dataset into a short narrated film. You describe the film in one JSON file, and Bezel Film renders it. You never write animation code yourself unless the user asks for a custom scene.

## How to direct a film

1. **Ask one short round of questions** before writing anything. Keep it to these, and skip any the user has already answered:
   - What is the film about, and who is it for?
   - How long should it be? (default 45 to 60 seconds)
   - Which shape: 16:9 (YouTube, slides), 9:16 (Reels, Shorts, TikTok) or 1:1 (LinkedIn, X)?
   - Which style: `data-story`, `product-launch` or `whiteboard`?
   - Voiceover: a female voice, a male voice, or none? (default female)
   - Captions on or off? (default on)
   - Music: calm, upbeat, dramatic, epic, ambient, reflective, or none? (default calm)
2. **Gather the material.** Read the README, the code or the dataset. Only use facts and numbers that come from the material or from the user. Never invent figures.
3. **Write `film.json`** following the rules below. Start the file with `"$schema": "./node_modules/bezel-film/schema/film.schema.json"` so editors can check it.
4. **Check it** with `npx bezel-film validate film.json` and fix every problem it reports.
5. **Render** with `npx bezel-film render film.json` and tell the user where the video is. The first render downloads the voice and a headless browser once (about 200 MB), so let the user know it takes longer.

## The film file

```json
{
  "spec": 1,
  "title": "Northside Coffee: a year in numbers",
  "style": "data-story",
  "format": { "aspect": "16:9", "resolution": "1080p", "fps": 30 },
  "voice": { "engine": "kokoro", "gender": "female" },
  "captions": true,
  "music": { "source": "generated", "mood": "calm" },
  "scenes": [
    { "type": "title", "title": "A year in numbers", "narration": "Here is our year, told in numbers." },
    { "type": "stat", "value": "48,210", "label": "cups served", "narration": "We served over forty-eight thousand cups." }
  ]
}
```

Only `spec`, `title`, `style` and `scenes` are required. Everything else has a sensible default.

Map the user's answers to settings: a male voice is `"voice": { "gender": "male" }`, no voiceover is `"voice": { "engine": "none" }`, no captions is `"captions": false`, a music mood is `"music": { "mood": "upbeat" }`, and no music is `"music": { "source": "none" }`.

Pick a mood that suits the story if the user has no preference: `calm` for most data stories, `upbeat` for launches and good news, `dramatic` or `epic` for a big reveal, `ambient` for a quiet, natural feel, and `reflective` for something personal or looking back. If the user wants to hear voices first, run `npx bezel-film voices`.

## Scene types

| Type | Use it for | Main fields |
| --- | --- | --- |
| `title` | Opening card | `title`, `subtitle` |
| `stat` | One big number | `value`, `label`, `context` |
| `chart` | A chart drawn with Bezel Charts | `chart.type`, `chart.values`, `chart.labels`, `chart.series` |
| `points` | Up to six short points | `heading`, `points` |
| `code` | A short code snippet | `language`, `code`, `highlight` |
| `quote` | A quote or testimonial | `quote`, `attribution` |
| `outro` | Closing card and call to action | `title`, `url`, `cta` |
| `custom` | Your own canvas scene (advanced) | `module`, `props` |

Every scene can also have `id`, `narration`, `duration` (seconds) and `transition` (`cut`, `fade`, `slide` or `wipe`). Each scene needs either `narration` or `duration`.

## Writing a good film

- **One idea per scene.** Five to ten scenes suits a 45 to 60 second film.
- **Narration sets the pace.** About 150 words a minute, so one or two short sentences per scene. Write it to be spoken: plain words, numbers said the way people say them.
- **Open with the hook,** close with an `outro` that says what to do next.
- **Keep charts simple:** seven bars or fewer, short labels, one point per chart. Say the takeaway in the narration and in `chart.heading`.
- **Keep on-screen text short.** Points under about ten words each. Code snippets under fifteen lines.
- **Use the style's defaults** for colour, type and motion. Don't fight them.
- **Only the `data-story` style renders today.** `product-launch`, `whiteboard` and `custom` scenes are coming, so don't use them yet.
