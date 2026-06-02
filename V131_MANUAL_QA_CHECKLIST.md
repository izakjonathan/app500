# V131 Full App QA Audit

## Manual test checklist

Test these flows in the deployed app:

### Game setup
- Open Settings
- Open Game
- Create a 2-player game
- Create a 3-player game
- Create a 4-player game
- Change player names
- Change target score
- Save game

### Scoring
- Type a score manually
- Use `+5`
- Use `+10`
- Use `+25`
- Use `+50`
- Use each `-50` button
- Use the closed tick
- Add round
- Confirm totals update
- Confirm Last Round updates

### Recovery
- Refresh the page
- Confirm scores persist
- Use Undo
- Reset game
- Confirm cloud sync status still appears

### Popups
- Open Settings
- Open UI Studio
- Open Rounds history
- Check each popup is readable with beige fill
- Check Safari bottom bar does not hide the last controls

### UI Studio
- Type tab: change font sizes and weights
- Space tab: change top gap, score gap, last-to-controls, input cards, penalty gap, bottom gap
- Radius tab: check whether controls still affect visible UI
- Color tab: use color picker
- Color tab: tap value and manually edit
- Layout tab: check whether controls still affect visible UI
- Presets tab: Default, Compact, Large, Save, Load, Copy JSON, Paste JSON, Reset all

## Known follow-up target

V132 should audit UI Studio controls and remove/reconnect controls that no longer affect the current Blueprint UI, especially Radius and Layout.
