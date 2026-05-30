# V84 CSS Audit Build
Base: rummy500-v78-css-refactor-pass5.zip
No CSS rules were removed or changed. This is an audit-only build.

## File sizes
- globals-base.css: 1689 lines, 34218 chars
- theme.css: 229 lines, 5641 chars
- typography.css: 437 lines, 11555 chars

## Duplicate selectors across split files
- None found

## Duplicate variables across split files
- `--glass-line` → globals-base.css, theme.css | recommended owner: `theme.css`
- `--type-body` → globals-base.css, typography.css | recommended owner: `typography.css`
- `--type-body-lg` → globals-base.css, typography.css | recommended owner: `typography.css`
- `--type-caption` → globals-base.css, typography.css | recommended owner: `typography.css`
- `--type-display` → globals-base.css, typography.css | recommended owner: `typography.css`
- `--type-display-sm` → globals-base.css, typography.css | recommended owner: `typography.css`
- `--type-input` → globals-base.css, typography.css | recommended owner: `typography.css`
- `--type-score` → globals-base.css, typography.css | recommended owner: `typography.css`
- `--type-small` → globals-base.css, typography.css | recommended owner: `typography.css`
- `--type-title` → globals-base.css, typography.css | recommended owner: `typography.css`
- `--type-title-lg` → globals-base.css, typography.css | recommended owner: `typography.css`
- `--weight-black` → globals-base.css, typography.css | recommended owner: `typography.css`
- `--weight-bold` → globals-base.css, typography.css | recommended owner: `typography.css`
- `--weight-heavy` → globals-base.css, typography.css | recommended owner: `typography.css`
- `--weight-medium` → globals-base.css, typography.css | recommended owner: `typography.css`
- `--weight-regular` → globals-base.css, typography.css | recommended owner: `typography.css`
- `--weight-semibold` → globals-base.css, typography.css | recommended owner: `typography.css`

## Typography values still present
### font-size
- `18px !important`: 6
- `15px`: 5
- `14px`: 5
- `13px !important`: 5
- `14px !important`: 5
- `28px !important`: 5
- `32px !important`: 5
- `16px !important`: 4
- `12px !important`: 4
- `24px !important`: 4
- `12px`: 3
- `15px !important`: 3
- `22px !important`: 3
- `16px`: 2
- `10px`: 2
- `24px`: 2
- `20px`: 2
- `9px !important`: 2
- `20px !important`: 2
- `30px !important`: 2
- `25px !important`: 2
- `7px!important`: 2
- `9px!important`: 2
- `12px!important`: 2
- `15px!important`: 2
- `10px !important`: 2
- `8px !important`: 2
- `var(--type-body) !important`: 2
- `38px !important`: 2
- `18px!important`: 2
- `11px!important`: 2
- `17px !important`: 2
- `22px`: 1
- `18px`: 1
- `9px`: 1
- `29px !important`: 1
- `6px!important`: 1
- `14px!important`: 1
- `17px!important`: 1
- `10px!important`: 1
- `16px!important`: 1
- `7px!important}
.analytics-grid strong{font-size:11px!important}

@media (min-height: 761px){
  .ui{padding-top:calc(var(--safe-top) + 6px)!important}
  
.scoreboard{padding:8px 11px 8px!important`: 1
- `7px !important`: 1
- `6px !important`: 1
- `11px !important`: 1
- `var(--type-title) !important`: 1
- `var(--type-display-sm) !important`: 1
- `var(--f03) !important`: 1
- `11px`: 1
- `8px!important`: 1
- `11px!important}

.modal-title,
.empty-sub,
.last-round-hint,
.sync-line,
.analytics-grid span{
  font-size: var(--type-micro) !important`: 1
- `17px`: 1
- `23px !important`: 1
- `13px!important}
.player-name{
  font-size:15px !important`: 1
- `40px`: 1
- `34px`: 1
- `36px !important`: 1
- `56px !important`: 1
- `45px !important`: 1
- `23px!important`: 1
- `25px!important}
.total{
  font-size:31px !important`: 1
- `27px !important`: 1
- `var(--f12) !important`: 1
- `var(--type-score) !important`: 1
- `26px`: 1
- `20px!important}
.round-input{
  font-size:42px !important`: 1
- `clamp(32px,5vh,52px) !important`: 1
- `clamp(24px,4vh,38px) !important`: 1
- `var(--f11) !important`: 1
- `var(--type-input) !important`: 1
- `13px`: 1
- `12.5px !important`: 1
- `10px!important}
.quick{
  background:rgba(255,255,255,.045) !important`: 1
- `clamp(13px,2vh,18px) !important`: 1
- `var(--f02) !important`: 1
- `var(--type-small) !important`: 1
- `19px !important`: 1
- `12px!important}
.penalty{
  height:54px !important`: 1
- `clamp(16px,2.8vh,24px) !important`: 1
- `var(--type-body-lg) !important`: 1
- `16px!important}
.add-round{
  margin-top:1px !important`: 1
- `clamp(20px,3vh,30px) !important`: 1
- `var(--f05) !important`: 1
- `var(--type-title-lg) !important`: 1
- `12px!important}
.pill{
  height:38px !important`: 1
- `var(--f01) !important`: 1
- `var(--type-caption) !important`: 1
- `20px!important}
.last-round-player-score{
  font-size:21px !important`: 1
- `clamp(28px,4.5vh,42px) !important`: 1
- `clamp(22px,3.6vh,34px) !important`: 1
- `var(--f08) !important`: 1
- `var(--type-display) !important`: 1

### font-weight
- `900 !important`: 10
- `760`: 9
- `950 !important`: 6
- `var(--weight-black) !important`: 6
- `820`: 5
- `600 !important`: 4
- `var(--weight-heavy) !important`: 4
- `var(--w06) !important`: 4
- `700 !important`: 3
- `800`: 2
- `var(--w05) !important`: 2
- `850 !important`: 2
- `650`: 1
- `820 !important`: 1
- `650 !important`: 1
- `850!important}
.icon-btn{width:25px!important`: 1
- `var(--weight-semibold) !important`: 1
- `850!important}
.player-name{font-size:13px!important}
.player-name{
  font-size:15px !important`: 1
- `900`: 1
- `950!important}
.total{font-size:25px!important}
.total{
  font-size:31px !important`: 1
- `860`: 1
- `720`: 1
- `850!important}
.quick{height:21px!important`: 1
- `850!important}
.penalty{height:29px!important`: 1
- `740 !important`: 1
- `800!important}
.pill{height:32px!important`: 1
- `var(--w04) !important`: 1
- `var(--weight-bold) !important`: 1
- `920 !important`: 1

## Radius inventory
- `999px !important`: 7
- `999px`: 5
- `17px`: 3
- `inherit !important`: 3
- `32px !important`: 3
- `999px!important`: 3
- `26px`: 2
- `14px`: 2
- `30px`: 2
- `16px`: 2
- `21px !important`: 2
- `18px !important`: 2
- `19px!important`: 2
- `22px`: 1
- `50%`: 1
- `inherit`: 1
- `20px`: 1
- `13px`: 1
- `24px`: 1
- `26px !important`: 1
- `29px !important`: 1
- `19px !important`: 1
- `13px !important`: 1
- `15px !important`: 1
- `34px !important`: 1
- `27px !important`: 1
- `0 !important`: 1
- `30px !important`: 1
- `14px!important`: 1
- `18px!important`: 1
- `9px!important`: 1
- `11px!important}
.analytics-grid span{font-size:7px!important}
.analytics-grid strong{font-size:11px!important}

@media (min-height: 761px){
  .ui{padding-top:calc(var(--safe-top) + 6px)!important}
  
.scoreboard{padding:8px 11px 8px!important`: 1
- `21px!important}
  .player-card{min-height:39px!important`: 1
- `15px!important}
  .ring{width:26px!important`: 1
- `20px!important}
  
.dock-panel{border-radius:21px!important`: 1
- `24px !important`: 1
- `22px !important`: 1
- `28px !important`: 1
- `28px`: 1
- `18px`: 1
- `20px!important`: 1
- `12px!important`: 1

## Spacing inventory: padding/margin/gap values
- `0 !important`: 30
- `10px`: 9
- `8px`: 4
- `12px !important`: 4
- `8px !important`: 4
- `18px !important`: 4
- `0 0 18px !important`: 4
- `12px`: 3
- `9px`: 3
- `9px !important`: 3
- `7px !important`: 3
- `10px !important`: 3
- `14px !important`: 3
- `0 0 16px !important`: 3
- `0`: 2
- `16px`: 2
- `0 14px`: 2
- `11px !important`: 2
- `16px !important`: 2
- `var(--gap)`: 1
- `calc(var(--safe-top) + 10px) var(--pad-x) 0`: 1
- `var(--gap) var(--pad-x) calc(var(--safe-bottom) + 10px)`: 1
- `9px 12px`: 1
- `0 10px`: 1
- `7px`: 1
- `10px 0 10px`: 1
- `6px`: 1
- `5px`: 1
- `8px 11px`: 1
- `8px 11px !important`: 1
- `9px 0 !important`: 1
- `10px 11px !important`: 1
- `-4px 0 14px`: 1
- `0 0 12px`: 1
- `4px`: 1
- `28px 28px 26px !important`: 1
- `24px 24px 22px !important`: 1
- `calc(var(--safe-top) + 18px) 14px 0 !important`: 1
- `22px 20px 18px !important`: 1
- `13px 20px !important`: 1
- `26px 22px 23px !important`: 1
- `0 14px calc(var(--safe-bottom) + 20px) !important`: 1
- `18px 18px 19px !important`: 1
- `18px 18px 15px !important`: 1
- `22px 20px 19px !important`: 1
- `15px !important`: 1
- `calc(var(--safe-top) + 4px) 14px 0!important}
.header{gap:8px!important`: 1
- `0 0 6px!important}
.scoreboard{border-radius:19px!important`: 1
- `7px 10px 7px!important`: 1
- `0 0 6px!important}
.label{font-size:7px!important`: 1
- `0 0 5px!important}
.player-card{min-height:36px!important`: 1
- `7px!important`: 1
- `4px 8px!important`: 1
- `0 0 6px!important}
.rounds-card{min-height:70px!important`: 1
- `9px 12px 8px!important`: 1
- `4px!important`: 1
- `2px!important}
.last-round-player-name{font-size:9px!important`: 1
- `0 14px calc(var(--safe-bottom) + 6px)!important}
.dock-panel{border-radius:19px!important`: 1
- `7px 9px 8px!important}
.input-row{padding:0 0 6px!important`: 1
- `0 0 6px!important}
.input-main{grid-template-columns:38px 25px 1fr 25px!important`: 1
- `6px!important}
.input-name{font-size:12px!important`: 1
- `5px!important}
.penalties{gap:6px!important`: 1
- `0 0 6px!important}
.add-round-plus{width:19px!important`: 1
- `5px!important`: 1
- `8px 11px 8px!important`: 1
- `8px 10px 9px!important}
  .input-main{grid-template-columns:42px 28px 1fr 28px!important}
  .icon-btn{width:28px!important`: 1
- `0 14px calc(var(--safe-bottom) + 4px) !important`: 1
- `11px 13px 11px !important`: 1
- `6px 11px !important`: 1
- `11px 14px 10px !important`: 1
- `10px!important}

.modal-title{font-size:8px!important`: 1
- `0 22px 0 64px !important`: 1
- `0 11px 0 34px!important`: 1
- `0 9px!important`: 1
- `0 14px !important`: 1

## Proposed ownership map
- `.app` → owner: `globals-base.css` | currently in: globals-base.css
- `.ui` → owner: `globals-base.css` | currently in: globals-base.css
- `.dock` → owner: `globals-base.css` | currently in: globals-base.css
- `.header` → owner: `globals-base.css` | currently in: globals-base.css
- `.scoreboard` → owner: `globals-base.css` | currently in: globals-base.css
- `.rounds` → owner: `globals-base.css` | currently in: globals-base.css
- `.player-card` → owner: `theme.css` | currently in: globals-base.css
- `.player-name` → owner: `typography.css` | currently in: globals-base.css, typography.css
- `.total` → owner: `typography.css` | currently in: globals-base.css, typography.css
- `.round-input` → owner: `typography.css` | currently in: globals-base.css, typography.css
- `.quick` → owner: `typography.css` | currently in: globals-base.css, typography.css
- `.penalty` → owner: `typography.css` | currently in: globals-base.css, typography.css
- `.add-round` → owner: `typography.css` | currently in: globals-base.css, typography.css
- `.pill` → owner: `theme.css` | currently in: theme.css, typography.css
- `.modal` → owner: `theme.css` | currently in: theme.css
- `.sheet` → owner: `theme.css` | currently in: theme.css
- `.glass` → owner: `theme.css` | currently in: theme.css
- `.glass-soft` → owner: `theme.css` | currently in: theme.css
- `.rounds-card` → owner: `theme.css` | currently in: globals-base.css
- `.last-round-label` → owner: `typography.css` | currently in: typography.css
- `.last-round-player-score` → owner: `typography.css` | currently in: typography.css

## Safe next pass plan
1. Consolidate duplicate variables only. Do not remove selectors.
2. Add spacing tokens in globals-base.css or a future spacing.css, but do not replace values yet.
3. Add radius/glass/shadow tokens in theme.css and replace one component family at a time.
4. Only remove duplicate selectors after visual confirmation for each selector family.
