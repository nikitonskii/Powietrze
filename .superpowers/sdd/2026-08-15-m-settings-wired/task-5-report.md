# Task 5 report — ActivePlaceProvider: default station + loc reset; App.tsx wiring

Status: DONE
Commit: 2e6d13e
Branch: feature/m-settings-wired

## What changed

- `src/shared/place/ActivePlaceContext.tsx`
  - `ActivePlaceProvider` now accepts an optional `defaultStation?: Station` prop.
  - Calls `useSettings()`; computes `target = defaultStation ? defaultPlace(settings.loc, defaultStation) : LOCATION_PLACE`.
  - `useState(() => target)` for initial value; a reset `useEffect` keyed only on
    `[settings.loc, defaultStation]` calls `setActive(target)` (not keyed on `target`
    itself, since it's a fresh object every render — avoids an infinite loop). ESLint
    exhaustive-deps disabled inline with a comment explaining why.
  - No behavior change when `defaultStation` is omitted (always `LOCATION_PLACE`, as
    before) — existing bare `<ActivePlaceProvider>` consumers keep working.
- `App.tsx`
  - Imports `KRAKOW_STATION` from `./src/data/gios` and passes
    `defaultStation={KRAKOW_STATION}` to `<ActivePlaceProvider>`.
- `src/shared/place/__tests__/ActivePlaceContext.test.tsx`
  - Existing AC 006-6 test now wraps `ActivePlaceProvider` in a `SettingsProvider`
    (bare, no `defaultStation`) — assertion unchanged.
  - Added AC-6 tests: `defaultStation` used when `loc:false`; `defaultStation` ignored
    when `loc:true`; and a loc-toggle Probe verifying the reset effect flips active
    place from location to the default station when `loc` is set to `false` at
    runtime.

## Unplanned fix (found via full-suite run, not in brief)

`src/app/__tests__/AppNavigator.test.tsx` nested `<SettingsProvider>` **inside**
`<ActivePlaceProvider>` in both render helpers (main `renderNav()` and the
pending-reading test at the bottom of the file). Since `ActivePlaceProvider` now
calls `useSettings()`, that ordering threw `useSettings: wrap the tree in
<SettingsProvider>` at render time — 8 tests failed on first full-suite run. Fixed
by swapping the nesting so `SettingsProvider` wraps `ActivePlaceProvider` (matches
the pattern already used correctly in `TerazScreen.test.tsx`,
`TerazScreen.nearest.test.tsx`, and `MiejscaScreen.test.tsx`, which the brief
correctly assumed were already fine). This file's ordering was the one exception;
included in the same commit since it's required for the suite to be green.

## Verification

- `npx jest src/shared/place` → 4 suites / 12 tests passed.
- `npm test` (full suite) → 51 suites / 181 tests passed, including
  `AppNavigator.test.tsx`, `TerazScreen.test.tsx`, `TerazScreen.nearest.test.tsx`,
  `MiejscaScreen.test.tsx`.
- `npm run lint` → 0 errors, 4 pre-existing warnings (unrelated: inline styles in
  App.tsx/HistoryChart/Toggle, one eslint-comments warning in gios/mappers.ts) —
  no new warnings introduced.
- `npm run typecheck` → clean, no errors.
- File/function sizes: `ActivePlaceContext.tsx` 61 lines, `App.tsx` 65 lines — well
  under the 200-line/40-line limits.

## Concerns

- None blocking. The AppNavigator test-nesting bug was pre-existing (latent until
  this task made `ActivePlaceProvider` depend on `useSettings`) and is now fixed and
  covered by the same full-suite green run.
