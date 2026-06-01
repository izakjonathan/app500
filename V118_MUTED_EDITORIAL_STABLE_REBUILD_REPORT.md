# V118 Muted Editorial Stable Rebuild

Built from **V117 build-stable-scroll-fit**, not from the broken V116 muted UI branch.

## What was wrong with V116

- V116 removed the `players-${game.players.length}` class from the root app element.
  - That disabled the four-player compact/scroll layout from V117.
- V116 replaced the V117 four-player scroll/auto-fit CSS block with the visual redesign CSS.
  - That brought back the clipping/fit problem when there are four players or short screens.
- V116 reverted the build scripts from the V117 stable build command.
  - V117 uses `NEXT_PRIVATE_BUILD_WORKER=1 next build`; V116 went back to plain `next build`.
- V116 included `package-lock.json`; this rebuild removes it again.

## What V118 does

- Starts from V117.
- Keeps all scoring, syncing, saving, settings, UI Studio, game setup, rounds overview, and bottom controls unchanged.
- Adds the muted editorial design as CSS-only visual overrides.
- Keeps the `players-2`, `players-3`, and `players-4` root class.
- Keeps vertical app scrolling and four-player compact controls.
- Keeps the V117 stable build scripts.
- Updates theme colors and default player colors to match the new design.

## Build check

`npm run build` passed locally.
