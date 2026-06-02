# V132 UI Studio Control Audit

Built from: `rummy500-v131-full-app-qa-audit.zip`

## Result

This build is an audit/report build. It does **not** intentionally change game logic, scoring, sync, or visual layout.

## Tab status

- **type**: active: controls map to current typography CSS variables
- **space**: active: controls map to current spacing CSS variables
- **radius**: stale: radius controls exist but radius CSS is currently fixed and not variable-driven
- **color**: active: controls map to current blueprint color CSS variables
- **layout**: stale: layout/density controls exist but --ui-density-scale is not referenced by clean CSS
- **presets**: partial: presets include active values but may still include stale radius/layout values

## Active controls

These controls are connected to CSS variables currently used by the app:

- `--bottom-gap`
- `--font-size-body`
- `--font-size-caption`
- `--font-size-display`
- `--font-size-input`
- `--font-size-score`
- `--font-size-title`
- `--font-weight-body`
- `--font-weight-label`
- `--font-weight-score`
- `--font-weight-title`
- `--input-card-gap`
- `--last-round-gap`
- `--passport-bg`
- `--passport-blue`
- `--passport-muted`
- `--penalty-gap`
- `--scoreboard-gap`
- `--top-section-gap`

## Controls that need action

These controls/defaults exist in UI Studio but are not currently connected to the cleaned CSS:

- `--radius-lg`
- `--radius-sm`
- `--radius-xl`
- `--ui-density-scale`

## Defaults without direct control

- none

## Recommendation for V133

Do one of these:

### Option A — remove stale controls

Remove:
- Radius tab
- Layout tab
- `--ui-density-scale`
- `--radius-sm`
- `--radius-lg`
- `--radius-xl`

Keep:
- Type
- Space
- Color
- Presets

### Option B — reconnect radius controls

Keep Radius tab, but change fixed CSS radii to variables:

```css
--radius-sm
--radius-lg
--radius-xl
```

Use them on:
- pills/buttons
- player cards/input cards
- scoreboard/round cards/modals

The cleanest next step is **V133 Option B** if you still want UI Studio to control the full visual style. Otherwise choose Option A.
