# Fonts

Bezel Film ships these fonts so films render offline, in the same type on every computer.
All of them are free under the [SIL Open Font License 1.1](https://openfontlicense.org), which
allows bundling them with software. Each folder keeps its font's licence.

The files come unchanged from [Fontsource](https://fontsource.org): the weights Bezel Film uses,
in the Latin and Latin Extended character sets, as woff2. They're rebuilt with `npm run fonts`.

| Font | Copyright | Weights | Licence | Version |
| --- | --- | --- | --- | --- |
| Archivo Black | Copyright 2017 The Archivo Black Project Authors (https://github.com/Omnibus-Type/ArchivoBlack) | 400 | [OFL 1.1](archivo-black/LICENSE) | v23 |
| Barlow | Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow) | 400, 600 | [OFL 1.1](barlow/LICENSE) | v13 |
| Caveat | Copyright 2014 The Caveat Project Authors (https://github.com/googlefonts/caveat) | 600, 700 | [OFL 1.1](caveat/LICENSE) | v23 |
| Fraunces | Copyright 2020 The Fraunces Project Authors (github.com/undercasetype/Fraunces) | 600, 700 | [OFL 1.1](fraunces/LICENSE) | v38 |
| IBM Plex Mono | Copyright 2017 IBM Corp. All rights reserved. | 400, 700 | [OFL 1.1](ibm-plex-mono/LICENSE) | v20 |
| IBM Plex Sans | Copyright 2019 IBM Corp. All rights reserved. | 400, 600, 700 | [OFL 1.1](ibm-plex-sans/LICENSE) | v23 |
| Inter | Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter) | 400, 600, 700 | [OFL 1.1](inter/LICENSE) | v20 |
| JetBrains Mono | Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono) | 400, 600, 700 | [OFL 1.1](jetbrains-mono/LICENSE) | v24 |
| Nunito | Copyright 2014 The Nunito Project Authors (https://github.com/googlefonts/nunito) | 400, 600, 700, 800 | [OFL 1.1](nunito/LICENSE) | v32 |
| Oswald | Copyright 2016 The Oswald Project Authors (https://github.com/googlefonts/OswaldFont) | 500, 600 | [OFL 1.1](oswald/LICENSE) | v57 |
| Patrick Hand | Copyright (c) 2010-2012 Patrick Wagesreiter (mail@patrickwagesreiter.at) | 400 | [OFL 1.1](patrick-hand/LICENSE) | v25 |
| Press Start 2P | Copyright 2012 The Press Start 2P Project Authors (cody@zone38.net), with Reserved Font Name "Press Start 2P" | 400 | [OFL 1.1](press-start-2p/LICENSE) | v16 |
| Source Serif 4 | Google Inc. | 400, 600 | [OFL 1.1](source-serif-4/LICENSE) | v15 |
| Space Grotesk | Copyright 2020 The Space Grotesk Project Authors (https://github.com/floriankarsten/space-grotesk) | 600, 700 | [OFL 1.1](space-grotesk/LICENSE) | v22 |
| Space Mono | Copyright 2016 The Space Mono Project Authors (https://github.com/googlefonts/spacemono) | 700 | [OFL 1.1](space-mono/LICENSE) | v17 |
| VT323 | Copyright 2011, The VT323 Project Authors (peter.hull@oikoi.com) | 400 | [OFL 1.1](vt323/LICENSE) | v18 |

## Pairings

A film's `font` setting picks one of these. See `src/spec/fonts.ts`.

| Pairing | Headings | Body | Code |
| --- | --- | --- | --- |
| `grotesk` | Space Grotesk | Inter | JetBrains Mono |
| `editorial` | Fraunces | Source Serif 4 | JetBrains Mono |
| `condensed` | Oswald | Barlow | JetBrains Mono |
| `bold` | Archivo Black | Inter | JetBrains Mono |
| `technical` | IBM Plex Sans | IBM Plex Sans | IBM Plex Mono |
| `friendly` | Nunito | Nunito | JetBrains Mono |
| `handwritten` | Caveat | Patrick Hand | JetBrains Mono |
| `mono` | Space Mono | JetBrains Mono | JetBrains Mono |
| `swiss` | Inter | Inter | JetBrains Mono |
| `pixel` | Press Start 2P | VT323 | VT323 |
| `terminal` | VT323 | VT323 | VT323 |
