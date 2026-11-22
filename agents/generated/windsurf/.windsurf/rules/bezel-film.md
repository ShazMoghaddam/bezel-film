---
trigger: model_decision
description: Make short narrated films from a repo, README or dataset with Bezel Film. Use when the user asks for a video, film, explainer, promo or data story.
---

<!-- bezel-film:start -->
<!-- Added by Bezel Film. Run `npx bezel-film init` again to update this section. -->

# Making a film with Bezel Film

Bezel Film turns a repo, README or dataset into a short narrated film. You describe the film in one JSON file, and Bezel Film renders it. Ready-made scenes cover most films. For anything they can't show, you write a `custom` scene in code.

## Setting up

If the project has no `node_modules/bezel-film` folder, set it up first. Use the name of the agent you are (`claude`, `codex`, `gemini`, `cursor`, `copilot` or `windsurf`):

```bash
npx bezel-film init --yes --agents claude --no-sample
```

It installs Bezel Film, adds these instructions and downloads about 230 MB once (a few minutes).

## How to direct a film

1. **Ask one short round of questions** before writing anything. Skip any the user has already answered:
   Ask: the topic and audience; length (default 45 to 60 seconds); platform (default none, 16:9); voice: female, male or none (default female); captions (default on); music mood or none (default calm).
2. **Gather the material** from the README, code or data. Never invent figures. For a code project, `npx bezel-film draft <folder or owner/repo> -o films/<name>/film.json` writes a draft to rewrite.
3. **Write** `films/<name>/film.json`, starting with `"$schema": "../../node_modules/bezel-film/schema/film.schema.json"`. `films/welcome/film.json` is an example.
4. **Check it** with `npx bezel-film validate films/<short-name>/film.json`, then `npx bezel-film preview films/<short-name>/film.json`. Look at the contact sheet it saves and fix what you see and every problem it reports.
5. **Render** with `npx bezel-film render films/<short-name>/film.json`. The video is saved next to the film file as `film.mp4`, with a cover image as `film-cover.png`. Tell the user where they are.

## The film file

```json
{
  "spec": 1,
  "title": "Northside Coffee: a year in numbers",
  "style": "data-story",
  "format": { "preset": "linkedin-mobile" },
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

Answers to settings: male voice `"voice": { "gender": "male" }`, no voice `"voice": { "engine": "none" }`, no captions `"captions": false`, a mood `"music": { "mood": "upbeat" }`, no music `"music": { "source": "none" }`, no sound effects `"sfx": { "volume": 0 }`, other fonts `"font": "editorial"`.

## Platforms

Set `format.preset` to the platform. It sets the shape and keeps text clear of the app's buttons and captions:

Presets: `tiktok`, `reels`, `shorts`, `whatsapp` (9:16); `instagram`, `linkedin-mobile` (4:5); `linkedin-square` (1:1); `linkedin-desktop`, `x`, `youtube` (16:9). Run `npx bezel-film formats` for details.

Posting in several places? Write one film and make every version at once: `npx bezel-film render films/<short-name>/film.json --for tiktok,linkedin-mobile,x`. Each video is saved as `film-<preset>.mp4`. `validate` warns when a film is too long for its preset.

Moods: `calm` for most data stories, `upbeat` for good news, `dramatic` or `epic` for a big reveal, `ambient` or `reflective` for quiet stories.

## Scene types

| Type | Use it for | Main fields |
| --- | --- | --- |
| `title` | Opening card | `title`, `subtitle` |
| `stat` | One big number | `value`, `label`, `context` |
| `chart` | A Bezel Charts chart | `chart.type`, `chart.values`, `chart.labels`, `chart.series` |
| `points` | Up to six short points | `heading`, `points` |
| `timeline` | Dated events, oldest first | `heading`, `events` (`date`, `label`, `detail`) |
| `roadmap` | Steps that are `done`, `in-progress` or `planned` | `heading`, `steps` (`label`, `status`, `when`) |
| `map` | Places and routes on a map | `pins`, `countries`, `arcs`, `focus` |
| `code` | A short code snippet | `language`, `code`, `highlight` |
| `quote` | A quote or testimonial | `quote`, `attribution` |
| `outro` | Closing card and call to action | `title`, `url`, `cta`, `links` (up to 4 stickers) |
| `custom` | Anything else, drawn by your own code | `file`, `props`, `sounds`. Read `npx bezel-film guide scenes` first |

Every scene can also have `id`, `narration`, `duration` (seconds), `transition` (`cut`, `fade`, `slide`, `wipe`) and `motion`. Each needs `narration` or `duration`.

## Writing a good film

- **One idea per scene.** Five to ten scenes suits a 45 to 60 second film.
- **Narration sets the pace.** About 150 words a minute, so one or two short sentences per scene. Write it to be spoken: plain words, numbers said the way people say them.
- **Open with the hook,** close with an `outro` that says what to do next.
- **Keep charts simple:** seven bars or fewer, short labels, one point per chart. Say the takeaway in the narration and in `chart.heading`.
- **Keep on-screen text short.** Points under ten words. Code under fifteen lines.
- **Six items at most** in points, timelines and roadmaps; split more across two scenes. On tall formats, four or five read best, with few `detail` lines.
- **Use the style's defaults** for colour, fonts and motion. Set `font` or `motion` (`calm`, `lively`, `punchy`) only if asked.
- **Styles and fonts:** `npx bezel-film styles` lists them. Pick the style that suits the story.
- **For a film that has to be great, or any custom scene,** read `npx bezel-film guide director` first and follow it.
<!-- bezel-film:end -->
