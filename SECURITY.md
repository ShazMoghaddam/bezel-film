# Security

## Supported versions

Bezel Film is in early development. Security fixes go into the latest release only.

## Reporting a problem

Please don't open a public issue for security problems. Report them privately through [GitHub's private vulnerability reporting](https://github.com/ShazMoghaddam/bezel-film/security/advisories/new) instead.

Include what you found, how to reproduce it and what impact you think it has. You should hear back within a week.

## Things to know

- Bezel Film runs locally. The only network use is the one-time download of the voice model and headless browser. While rendering, the browser is blocked from opening any connection.
- Text from a film file is escaped before it's drawn, and chart data is passed as data, so a film file can't run code (except `custom` scenes, once they exist).
- `custom` scenes run your own code in a headless browser. Only render film files you trust, just as you would only run scripts you trust.
- Optional paid voice services, when added, will read keys from environment variables only. Never put keys in a film file.
