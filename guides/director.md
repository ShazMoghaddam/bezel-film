# Directing a film

You're not filling in a template. You're making a short film someone will want to watch to the end and share. This guide is how to think about it, in order. Work through it every time.

Read `npx bezel-film guide scenes` too: it's how to write a scene's code.

## 1. The brief

Before anything else, be clear on five things. Ask the user only for what you can't work out from what they've given you.

- **Who it's for**, and what they already know.
- **The one idea** they should leave with. One sentence. If you can't say it in one, the film is trying to do too much.
- **Where it goes**: TikTok, Reels, Shorts, LinkedIn, YouTube. This sets the shape (`format.preset`) and the length.
- **The style**: run `npx bezel-film styles` and pick the one that suits the idea and the audience, not just the topic. Then read its guide, `npx bezel-film guide <style>`, and the example film it points to. The style's guide says how it looks and moves; follow it closely.
- **How long**: social films work best at 20 to 60 seconds. Every second has to earn its place.

## 2. The story

Every good short has the same bones:

1. **Hook** (first 3 seconds). A question, a surprising number, or a picture that makes people stop scrolling. Never open with a logo or "In this video".
2. **Turn**. Why it matters: the problem, the tension, the "but".
3. **Show**. Three beats at most, each one a single clear point.
4. **Land**. The one idea again, said simply.
5. **Next step**. What to do now: try it, visit, follow, share.

Cut anything that doesn't serve the one idea, however interesting it is.

## 3. The script

The narration sets the pace: about 150 words a minute, so a 30 second film is about 75 words.

- Write for the ear. Short sentences. Plain words. One idea per sentence.
- Say numbers as people say them: "about forty thousand", not "39,847".
- Each sentence becomes a moment on screen. In custom scenes, `kit.lines` tells you when each sentence starts, so drawings can land exactly on their words.
- Read it aloud in your head. If you'd stumble, rewrite it.

## 4. The shots

Plan each scene as a shot before writing code. For each one, write down:

- **The one thing to look at.** One focal point per moment. If two things compete, one waits.
- **How it arrives.** Things should come in the way the style moves: drawn, folded, printed, switched on. Nothing just appears.
- **The camera.** Still is fine. When it moves, it moves for a reason: to reveal, to follow, to compare. Slow and smooth beats fast and busy.
- **Rhythm.** Change something every 2 to 4 seconds: a new drawing, a cut, a move. Hold longer on what matters most.
- **Words on screen.** A few at a time, big, and inside `kit.safe`. The voice carries the detail; the screen carries the point.

Mix ready-made scenes in where they're the best tool. A real chart is better as a `chart` scene than a drawing of one.

## 5. Sound

- Pick a `music.mood` that matches the feeling, not the topic: `calm`, `upbeat`, `dramatic`, `epic`, `ambient` or `reflective`. It dips under the voice by itself.
- In custom scenes, list `sounds` to land with movement: a `tap` when something lands, `swish` as a line is drawn, `pop` for something small appearing, `ding` for a reveal, `chalk` for each stroke of chalk. Fewer is better: two or three per scene.

## 6. Build, look, fix

1. Write the film file and the scene files.
2. Run `npx bezel-film validate <film.json>`.
3. Run `npx bezel-film preview <film.json>` (add `--for tiktok` and so on for each platform it's for).
4. **Look at the contact sheet.** Really look, the way a viewer would. Then fix what you see.
5. Repeat until it's right. Only then run `npx bezel-film render`.

## 7. The quality bar

Before rendering, check every scene against these. Fix anything that fails.

- Would someone stop scrolling for the first frame?
- Is there one clear thing to look at in every moment?
- Can every word be read on a phone, at a glance?
- Does every scene look like the style, all the way through, not like a web page?
- Does movement have weight and ease, with nothing snapping or jittering?
- Are the edges clear, with nothing important where captions or the platform's buttons go?
- Do the pictures land on the words that mention them?
- Is anything there just because it could be? Take it out.
- Fix every problem `preview` reports.
