# V120 UI Studio Colors + Typography

Baseline: `rummy500-v119-shareos-color-black.zip`.

## Changed
- Added a new `Colors` tab to UI Studio.
- Added color controls for:
  - app/background colors
  - background grid/detail lines
  - panel background and panel lines
  - text colors
  - button background/text
  - round input background/text
  - rounds card background
  - player card colors 1-4
- Expanded typography controls for:
  - tiny labels
  - body text
  - player names
  - dock/player input names
  - buttons
  - app title
  - modal title
  - round input
  - total score
- Wired final CSS overrides so UI Studio variables actually affect the ShareOS/Product-Passport visual layer.
- Kept the black + saturated color design. No white/light app background surfaces were added.
- Kept V117/V118/V119 functionality intact.

## Build check
- `npm run build` completed successfully.
- No `package-lock.json` included.
