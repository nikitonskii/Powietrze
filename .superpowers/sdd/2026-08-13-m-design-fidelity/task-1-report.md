# Task 1 Report: Skyline Model (core/atmosphere additions)

## Status
DONE

## Commit
`802c080` feat(core): skyline path + density haze math (AC-1..3, spec 010)

## Test Summary
All 8 tests pass (3 new AC tests for skyline + 5 existing atmosphere tests):
- AC-1: skyline path/viewBox/top-ratio pinned to design (literal fixture)
- AC-2: skyline(density) → blur + opacity mapping
- AC-3: skylineColor(density) → rgba with 2dp alpha formatting

## Implementation Details

### Files Modified
- `src/core/atmosphere/index.ts`: APPENDED exports (existing exports untouched)
  - `SKYLINE_PATH`: 389x150 generic city silhouette SVG path (from Powietrze.dc.html:34)
  - `SKYLINE_VIEWBOX`: design literal `{ width: 389, height: 150 }`
  - `SKYLINE_TOP_RATIO`: 0.44 (architectural constant)
  - `skyline(density)`: returns `{ blur, opacity }` with formulas: blur = density*7, opacity = 1 - density*0.45
  - `skylineColor(density)`: returns `rgba(3,5,9,α)` where alpha = parseFloat((0.72 - density*0.32).toFixed(2))

### Files Created
- `src/core/atmosphere/__tests__/skyline.test.ts`: Complete TDD test suite with 3 AC-linked tests

## Gates
✓ All tests pass (60/60 across src/core)
✓ TypeScript strict: no errors
✓ Coverage: 100% statements, 100% functions, 100% lines for atmosphere module
✓ No new dependencies
✓ No console warnings

## Notes
- Skyline path transcribed byte-for-byte from brief to match design spec
- All new functions fully covered by AC-linked tests
- alpha rounding to 2dp with trailing-zero stripping keeps rgba string stable (no precision artifacts)
- Ready for Task 2 (UI integration)
