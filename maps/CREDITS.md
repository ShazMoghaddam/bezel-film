# Map credits

Made with [Natural Earth](https://www.naturalearthdata.com). Free vector and raster map data @ naturalearthdata.com.
Natural Earth is in the public domain: no permission is needed and credit isn't required, but it's given gladly.

- `world.json`: Admin 0 countries at 1:50 million scale (`geojson/ne_50m_admin_0_countries.geojson`)
- `places.json`: populated places, simple (`geojson/ne_10m_populated_places_simple.geojson`)

Built from [`nvkelso/natural-earth-vector`](https://github.com/nvkelso/natural-earth-vector) at commit `ca96624a56bd078437bca8184e78163e5039ad19` by `scripts/build-maps.ts`, which checks each file against its fingerprint, keeps only what Bezel Film uses, and adds a few everyday names (UK, USA, Holland…).

Country borders and names follow Natural Earth's own choices, which show who controls each area on the ground. They aren't a view on any dispute.
