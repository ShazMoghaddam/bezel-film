# Music credits

These tracks come from [FreePD](https://freepd.com), a collection of new music released into the public domain by its composers.
FreePD was set up by Kevin MacLeod. Credit isn't required, but it's given gladly.

| Track | Mood | File |
| --- | --- | --- |
| Lovely Piano Song | calm | `lovely-piano-song.opus` |
| Study and Relax | calm | `study-and-relax.opus` |
| City Sunshine | upbeat | `city-sunshine.opus` |
| The Drama | dramatic | `the-drama.opus` |
| Driving Concern | dramatic | `driving-concern.opus` |
| Epic Blockbuster 2 | epic | `epic-blockbuster-2.opus` |
| Heroic Adventure | epic | `heroic-adventure.opus` |
| Infinite Wonder | ambient | `infinite-wonder.opus` |
| Wisdom in the Sun | ambient | `wisdom-in-the-sun.opus` |
| Nostalgic Piano | reflective | `nostalgic-piano.opus` |
| Romantic Inspiration | reflective | `romantic-inspiration.opus` |

Built from a mirror of the FreePD collection, [`SoundSafari/CC0-1.0-Music`](https://github.com/SoundSafari/CC0-1.0-Music), at commit `655388f987eacf6d08d73080fcc3e727f267bfde`, by `scripts/build-music.ts`.
Each file is checked against its fingerprint, given one clean gain so it peaks at -1 dB (nothing compressed, so each keeps its own dynamics) and saved as Opus.
Films bring every track to -12 LUFS, the loudness of Bezel Film's own composed music, using the loudness recorded in `manifest.json`.

The tracks live in this repo but not in the npm package. Bezel Film downloads them once, from the release's own copy, and checks each one against `manifest.json`.
