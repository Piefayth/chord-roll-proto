# Chord Roll Prototype

Touch-first piano-roll where the units of composition are **objects** —
`(PitchSet, Voicing, Generator)` triples on a timeline — instead of
individual notes.

- **PitchSet** — *what* pitches (harmonic identity)
- **Voicing** — *where* they sit (vertical register)
- **Generator** — *when* they play (horizontal behavior)

## Status

**Phase 1** — single hardcoded object, full inspector, looped playback.

Phase 2 (multi-object timeline) and Phase 3 (per-region direct-manipulation
gestures) are upcoming.

## Stack

React + TypeScript + Vite, SVG piano roll, Tone.js audio. Vitest for headless
component and pure-function tests.

## Develop

```sh
npm install
npm run dev              # local dev server
npm run dev -- --host    # expose on LAN for iPhone testing
npm test                 # run headless tests
npm run build            # production bundle
```

## Deploy

GitHub Pages via `.github/workflows/deploy.yml`. The Vite `base` is
`/chord-roll-proto/` to match the repo path.

Enable Pages → Build and deployment → Source: **GitHub Actions** in the
repository settings before the first deploy.
