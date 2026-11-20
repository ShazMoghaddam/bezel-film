# Nature sound credits

Every sound here is a field recording released under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) or into the public domain.
Credit isn't required, but it's given gladly.

| Sound | Recording | Recordist | Licence | File |
| --- | --- | --- | --- | --- |
| rain | [Soft rain on a tile roof](https://freesound.org/s/466241/) | richwise | CC0 1.0 | `rain-tile-roof.opus` |
| rain | [Rain against the window](https://commons.wikimedia.org/wiki/File:Rain_against_the_window.ogg) | cori | Public domain | `rain-window.opus` |
| rain | [Light rain, distant thunder](https://commons.wikimedia.org/wiki/File:Light_Rain_Distant_Thunder_July_5th_2016.wav) | kvgarlic | CC0 1.0 | `rain-woods.opus` |
| waves | [Crashing waves, Pacific Ocean](https://freesound.org/s/817075/) | SecureSubset | CC0 1.0 | `waves-pacific.opus` |
| stream | [Relaxing river](https://freesound.org/s/722875/) | IceVFX | CC0 1.0 | `stream-river.opus` |
| stream | [Snowmelt flowing into a lake](https://commons.wikimedia.org/wiki/File:Snowmelt_flowing_into_lake_at_Okanagan_Mountain_Provincial_Park.flac) | Extemporalist | CC0 1.0 | `stream-mountain.opus` |
| stream | [River weir](https://commons.wikimedia.org/wiki/File:Vojn%C3%ADkov,_3._jez,_st%C5%99eda.ogg) | Juandev | Public domain | `stream-weir.opus` |
| wind | [Wind on bushes](https://freesound.org/s/711106/) | felix.blume | CC0 1.0 | `wind-bushes.opus` |
| wind | [Wind in the trees, Grunewald](https://commons.wikimedia.org/wiki/File:245286_dbspin_grunewald.wav) | dbspin | CC0 1.0 | `wind-trees.opus` |

The loops were cut from tidied copies of these recordings in two open-source projects, each checked against its fingerprint:

- [Ambient for Omarchy](https://github.com/funcoder/omarchy-ambient) at commit `2686c861bff26bc7da55dd8e4e858f6d66d39a41` (recordings from Freesound)
- [Brown Noise sound library](https://github.com/RinvalAi/brown-noise-library) at commit `21160674f9ad6e52597620a95675375382a1bd26` (recordings from Wikimedia Commons, each licence checked there)

`scripts/build-music.ts` cuts each into a 45-second loop whose last 3 seconds blend into its start, and saves it as Opus.
