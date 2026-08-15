# Task 4 report — scale/precision on the PlaceRow number

## Status: DONE

Commit: `a2e17d0` — "feat(miejsca): scale/precision on place-row number (AC-5, spec 014)"

## What changed

- `src/features/miejsca/PlaceRow.tsx` — added `const { settings } = useSettings();`
  (from `../../shared/settings`) and `import { displayValue } from '../../core/air';`.
  The big number now renders
  `displayValue(reading.index, reading.pm25, settings.scale, settings.precision)`
  instead of `String(reading.index)`. Color is unchanged:
  `color={scene(reading.index).key}` on the same `<Text variant="index">`.
  The band+trend line (spec 013, lines above the number) was not touched.

## Tests updated (per brief)

- `src/features/miejsca/__tests__/PlaceRow.test.tsx` — the shared `wrap()`
  helper now renders every case inside a real `SettingsProvider` (fake
  store: `{ load: async () => s, save: async () => {} }`, defaulting to
  `DEFAULT_SETTINGS`) around the existing `PlaceSourceProvider`. All
  existing assertions (index `'42'`, `'brak danych'`, band/trend/color)
  are unchanged and still pass under CAQI defaults. Added:
  `AC-5: the big number honors settings.scale/precision, color stays
  scene(index).key` — renders with `scale: 'µg/m³', precision: 'Dokładna'`
  (reading index 42, pm25 43), asserts the big number is
  `displayValue(42, 43, 'µg/m³', 'Dokładna')` (`'43.0'`) and its color is
  still `scene(42).key`.
- `src/features/miejsca/__tests__/MiejscaScreen.test.tsx` — added a
  module-level `settingsStore: SettingsStore` (`DEFAULT_SETTINGS`) and
  wrapped `renderScreen()` plus the two ad-hoc `render()` calls (the
  `GestureHandlerRootView` favorites test and the 12-station search-cap
  test) in `<SettingsProvider store={settingsStore}>`. All four existing
  tests (pinned-location hint, search/save/navigate, favorites +
  refetch guard, capped-results) pass unchanged under `DEFAULT_SETTINGS`.

## Fallout fixed outside the brief's file list (needed for a green full suite)

`PlaceRow` now calls `useSettings()`, which throws if not wrapped in
`<SettingsProvider>`. One more test renders `PlaceRow` indirectly and
was not in the brief's list:

- `src/features/miejsca/__tests__/FavoriteRow.test.tsx` — `FavoriteRow`
  renders `PlaceRow` internally. Wrapped its single render in
  `<SettingsProvider store={{ load: async () => DEFAULT_SETTINGS, save:
  async () => {} }}>` around the existing `PlaceSourceProvider`. No
  assertion changes; existing test still passes.

Grepped for all non-test consumers of `PlaceRow` (`FavoriteRow.tsx`,
`MiejscaScreen.tsx`) to confirm no other render sites were missed.

## Verification

- `npx jest PlaceRow MiejscaScreen` — 2 suites, 10 tests, all pass
  (existing Miejsca tests confirmed green under CAQI defaults; pre-existing
  `act(...)` console warnings from async `usePlaceReading`/`usePlaceDetail`
  state updates — not failures, not touched by this change).
- `npm test` (full suite) — 51 suites, 178 tests, all pass.
- `npm run lint` — 0 errors, 4 pre-existing warnings (inline-style /
  eslint-comments in files this task didn't touch: `App.tsx`,
  `src/data/gios/mappers.ts`, `src/shared/ui/HistoryChart.tsx`,
  `src/shared/ui/Toggle.tsx`).
- `npm run typecheck` — clean, no output.
- No hex literals, no `any` in the diff (`git diff -- src/features/miejsca`
  checked). All touched files well under the 200-line limit (largest is
  `MiejscaScreen.test.tsx` at 198 lines, pre-existing plus additions;
  `PlaceRow.tsx` itself is 101 lines).

## Concerns

None. `PlaceRow` stays a single-responsibility row component; the only
addition is one hook call and swapping the number-formatting expression.
No new dependency, no cross-feature/cross-layer import violation
(`useSettings` comes from `shared/settings`, `displayValue` from
`core/air` — both already-established seams from Task 1/3).
