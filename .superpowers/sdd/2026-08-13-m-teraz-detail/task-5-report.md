# Task 5 report — HistoryChart + PollutantTiles + glass tokens

Status: DONE
Commit: 631b6834aadbce191dbe04fc45b3d02fd6d1a53e
Branch: feature/m-teraz-detail
Worktree: /Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest

## What was done

1. **Tokens** (`src/shared/tokens/index.ts`) — added `glass: 'rgba(255,255,255,0.07)'`
   and `glassBorder: 'rgba(255,255,255,0.09)'` to the `colors` object, next to
   the existing `card` token.

2. **Tests written first** (copied verbatim from the brief, TDD red step
   confirmed via `npx jest HistoryChart PollutantTiles` failing with
   "Cannot find module" before implementation existed):
   - `src/shared/ui/__tests__/HistoryChart.test.tsx`
   - `src/shared/ui/__tests__/PollutantTiles.test.tsx`

3. **`src/shared/ui/HistoryChart.tsx`** (73 lines) — glass card
   (`colors.glass` bg, 1px `colors.glassBorder`, radius 22, padding
   18/18/14) containing:
   - header `Text` "OSTATNIE 24 GODZINY" (`colors.text.muted`, 11/600,
     letterSpacing 1.4)
   - a `Bar` sub-component (extracted to keep `HistoryChart` render ≤40
     lines) rendering `testID="bar-<i>"` Views with `backgroundColor:
     scene(point.index).key`, `opacity: historyBarOpacity(i, count)`,
     `height: `${barHeightPct(point.index)}%``, in a row
     (`flexDirection:'row'`, `alignItems:'flex-end'`, `gap:3`, `height:76`,
     `marginTop:14`)
   - axis-label row of five `Text` nodes (`colors.text.faint`, fontSize 10):
     `12:00 18:00 00:00 06:00 teraz`

4. **`src/shared/ui/PollutantTiles.tsx`** (49 lines) — a `flexDirection:'row'`,
   `gap:12` container with a `Tile({ label, value })` helper (glass bg,
   1px glassBorder, radius 20, padding 16, flex 1) rendering label
   (`colors.text.dim`, 11/600, letterSpacing 1), value `{value ?? '—'}`
   (fontSize 30, weight 600, `colors.text.primary`, marginTop 6), and unit
   "µg/m³" (`colors.text.inactive`, fontSize 11). Renders `<Tile
   label="PM10" .../>` and `<Tile label="NO₂" .../>`.

Both components import `scene` from `../../core/scene` and
`HourPoint`/`historyBarOpacity`/`barHeightPct` from `../../core/air`
(Task 1 exports, unchanged) — no new dependency, no cross-feature imports,
imports flow features/shared → core only.

## Verification

- `npx jest HistoryChart PollutantTiles` → **4 passed, 2 suites passed**
  (AC-8 header/axis/bar color-opacity-height, AC-8 single-point no-NaN
  opacity, AC-9 PM10+NO₂ labels/values/units, AC-9 missing value → —).
- `npm run lint` → **0 errors**, 4 pre-existing-pattern warnings (all
  `react-native/no-inline-styles`; one is on the new `Bar` sub-component's
  inline style, matching the same warning already present on
  `Toggle.tsx` elsewhere in the codebase — not a hex/color violation, no
  `no-restricted-syntax` hits).
- `npm run typecheck` → clean, no output/errors.
- No sandbox "Operation not permitted" errors were encountered for any
  git/npm command in this task; all ran normally.

## Files changed

- `src/shared/tokens/index.ts` (modified — added `glass`, `glassBorder`)
- `src/shared/ui/HistoryChart.tsx` (new)
- `src/shared/ui/PollutantTiles.tsx` (new)
- `src/shared/ui/__tests__/HistoryChart.test.tsx` (new)
- `src/shared/ui/__tests__/PollutantTiles.test.tsx` (new)

Commit contains exactly these 5 files (verified via `git status` before
commit — no stray `.superpowers/` progress files were staged).

## Concerns

None. Glyphs (`OSTATNIE 24 GODZINY`, axis labels, `µg/m³`, `NO₂`, `—`)
copied verbatim from the brief. No raw hex/rgba literals appear in the two
new component files — all colors route through `colors.glass` /
`colors.glassBorder` / `colors.text.*` (tokens) or `scene(...).key`
(computed), satisfying the no-hex lint rule (`no-restricted-syntax`
selector matches `#`-prefixed hex literals; none present).
