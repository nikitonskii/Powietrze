# Task 3 report — scale/precision drive the hero number + tiles

## Status: DONE

Commit: `907f77a` — "feat(teraz): scale/precision drive the hero number + tiles (AC-5,5b,7, spec 014)"

## What changed

- `src/features/teraz/Hero.tsx` — replaced `pm25?: number` with `value: string`,
  `pm25Label: string | null`, `scaleCaption: string`. Big number renders
  `{value}` (color still `scene.key`, unaffected by scale). PM2.5 sub-line
  renders only when `pm25Label !== null`. Added a `scaleCaption` line
  (variant `station`, `colors.text.dim`, new `caption: { marginTop: 2 }`
  style) right after `NumberGlow`, before the band. `Hero` stays pure — no
  hooks, no settings import.
- `src/shared/ui/PollutantTiles.tsx` — added `precision: Precision`
  (`../../core/settings`) to `PollutantTiles` and threaded it to `Tile`,
  which now renders `value === undefined ? '—' : formatConcentration(value, precision)`
  (`../../core/air`). Also pure, no hooks.
- `src/features/teraz/TerazScreen.tsx` — reads `useSettings()`, computes
  `value` via `displayValue(reading.index, reading.pm25, settings.scale, settings.precision)`,
  `pm25Label` (null when `scale === 'µg/m³'`, else the formatted PM2.5
  sub-line), and `scaleCaption` via `scaleLabel(settings.scale)`. Passes
  these to `Hero` (dropped `pm25` prop) and `precision={settings.precision}`
  to `PollutantTiles`.

## Tests updated (per brief)

- `src/features/teraz/__tests__/Hero.test.tsx` — all render calls updated to
  the new props (`value`, `pm25Label`, `scaleCaption`); added AC-5b case for
  the µg/m³-style render (concentration number, no PM2.5 sub-line, caption
  shown).
- `src/shared/ui/__tests__/PollutantTiles.test.tsx` — added `precision` prop
  to existing renders; added cases for `Dokładna` (13.1/22.0) and
  `Przybliżona` (13/22).
- `src/features/teraz/__tests__/TerazScreen.test.tsx` — wrapped every render
  in the real `SettingsProvider` with a fake store (mirrors spec-009/
  UstawieniaScreen pattern). Added two new tests: `scale: 'µg/m³'` → hero
  number is the formatted concentration and the PM2.5 sub-line is absent;
  `scale: 'US AQI'` → hero number is `String(usAqiFromPm25(reading.pm25))`.
  Band/color assertions (`scene(reading.index)`) unchanged in both.

## Fallout fixed outside the brief's file list (needed for a green full suite)

`TerazScreen` now calls `useSettings()`, which throws if not wrapped in
`<SettingsProvider>`. Two pre-existing tests (not part of spec-002 or this
task's file list, added by earlier work on this worktree) rendered
`TerazScreen`/`AppNavigator` without that provider and started failing:

- `src/features/teraz/__tests__/TerazScreen.nearest.test.tsx` — wrapped the
  render in `<SettingsProvider store={settingsStore}>` (fake store,
  `DEFAULT_SETTINGS`).
- `src/app/__tests__/AppNavigator.test.tsx` — the "Teraz tab tint is the
  neutral accent while loading" test rendered `AppNavigator` without any
  settings wrapper (the other tests already had one); added
  `<SettingsProvider store={settingsStore}>` around `<AppNavigator />` using
  the file's existing `settingsStore` const.

Both fixes were committed together with the task-3 change since they were
required for `npm test` to stay green.

## Verification

- `npx jest Hero PollutantTiles TerazScreen` — 4 suites, 19 tests, all pass.
- `npm test` (full suite) — 51 suites, 177 tests, all pass. (Some pre-existing
  `act(...)` console warnings from unrelated async state updates in
  `usePlaceReading`/`usePlaceDetail`/`BottomTabView` — not failures, not
  touched by this change.)
- `npm run lint` — 0 errors, 4 pre-existing warnings (inline-style /
  eslint-comments in files this task didn't touch).
- `npm run typecheck` — clean, no output.
- Confirmed the existing spec-002 Teraz tests still pass under
  `DEFAULT_SETTINGS` (scale `CAQI`, precision `Przybliżona`): hero shows
  index `'118'`, band `'Zły'`, and the `'PM2.5 · 122 µg/m³'` sub-line —
  only the `SettingsProvider` wrapper was added, assertions unchanged.

## Concerns

None. No new dependency, no `any`, no hex literals in touched files, all
files ≤200 lines (largest is `TerazScreen.tsx` at 85), all functions ≤40
lines. `Hero` and `PollutantTiles` remain hook-free/pure as required.
