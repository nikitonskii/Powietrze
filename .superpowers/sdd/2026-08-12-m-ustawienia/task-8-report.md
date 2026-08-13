# Task 8 report — UstawieniaScreen (compose + wire)

## What was done
1. Wrote the test file verbatim from the brief:
   `src/features/ustawienia/__tests__/UstawieniaScreen.test.tsx` (all Polish
   glyphs copied byte-for-byte from the brief, including U+2013 en dash in
   `22:00 – 07:00` and µ (U+00B5 MICRO SIGN) in `µg/m³`, matching
   `src/core/settings`'s `Scale` type literal).
2. Verified fail: `npx jest UstawieniaScreen` → 6/6 failed (placeholder
   screen had no rows/testIDs).
3. Implemented `src/features/ustawienia/SettingRow.tsx` — copied verbatim
   from the brief (horizontal row: title, optional `Wkrótce` tag, optional
   subtitle, and either a static `value` or a `trailing` control).
4. Implemented `src/features/ustawienia/UstawieniaScreen.tsx` — replaced the
   placeholder. Structure:
   - `ScrollView` (`testID="screen-ustawienia"` preserved), header text
     `Ustawienia` (32/600/`colors.text.primary`).
   - Four `SettingsGroup`s (LOKALIZACJA, POWIADOMIENIA, WIDŻET I WYGLĄD,
     DANE) per the row spec table, each row wired via `useSettings()`'s
     `set(key, value)`.
   - Horizontal rows (`loc`, `alert`, `quiet`, `morning`, `widget`,
     `source`, `refresh`) use `SettingRow` directly.
   - Stacked rows (`precision`, `threshold`, `scale`) use a small local
     `StackedRow` helper (title + optional `Wkrótce` line, control below)
     defined in the same file, keeping `SettingRow.tsx` focused on
     horizontal rows only, as suggested by the brief.
   - Footer: two centered `Text` lines, `colors.text.footer`, 11.5px.
5. Verified pass: `npx jest UstawieniaScreen` → 6/6 PASS.
6. Ran the full suite `npm test` → **1 regression found**: `AC-10` in
   `src/app/__tests__/AppNavigator.test.tsx` broke. Root cause: that test's
   `renderNav()` helper mounts the *real* `AppNavigator` (which now mounts
   the real `UstawieniaScreen` when the Ustawienia tab is pressed), but the
   helper didn't provide a `SettingsProvider` or a `GestureHandlerRootView`
   ancestor (needed transitively by `ThresholdSlider`'s `GestureDetector`).
   This is the same pattern already present in that file (a comment notes
   the Miejsca tab needed `FavoritesProvider`/`StationsProvider` added when
   `MiejscaScreen` went live). Fixed by:
   - Adding a fake in-memory `SettingsStore` (`settingsStore`, mirroring the
     existing `emptyStore` pattern for favorites) and wrapping `renderNav()`
     in `SettingsProvider` and `GestureHandlerRootView`.
   - This is a **test-only** fix. It does **not** wire `App.tsx` to a real
     `AsyncStorage`-backed store — that remains Task 9's explicit scope
     ("App.tsx wiring (AC-23)", per `.superpowers/sdd/.../progress.md`).
     `src/data/settings/index.ts` (`createAsyncStorageSettingsStore`) already
     exists, committed in an earlier task, unused until Task 9 wires it into
     `App.tsx`.
7. Re-ran full suite → all green. Ran lint and typecheck → both clean.

## Deviations from the brief
- Brief's file list said only 3 files (screen, SettingRow, test). I also
  modified `src/app/__tests__/AppNavigator.test.tsx` to fix a regression the
  brief's own Step 4 gate ("full suite — nothing else broke") requires be
  fixed. No production file outside `src/features/ustawienia` was touched;
  `App.tsx` itself is untouched and still lacks `SettingsProvider` — the
  real app will need Task 9 before the Ustawienia tab works at runtime.

## File line counts (proof ≤200)
```
165  src/features/ustawienia/UstawieniaScreen.tsx
 51  src/features/ustawienia/SettingRow.tsx
117  src/features/ustawienia/__tests__/UstawieniaScreen.test.tsx
128  src/app/__tests__/AppNavigator.test.tsx
```
All under the 200-line cap.

## Full-suite result
```
Test Suites: 39 passed, 39 total
Tests:       132 passed, 132 total
```
(One pre-existing `console.error` act()-warning from an unrelated
`usePlaceReading` async state update remains, same as before this change —
not a failure.)

## Lint
```
0 errors, 4 warnings (all pre-existing, unrelated to this change:
App.tsx inline style, gios/mappers.ts dot-notation + unused-disable,
Toggle.tsx inline style)
```

## Typecheck
```
tsc --noEmit → 0 errors
```

## Commit
`git add src/features/ustawienia src/app/__tests__/AppNavigator.test.tsx`
then committed (SHA recorded in final message).

## Fix round 1 (reviewer: Important — functions ≤40 lines)

**Finding:** `UstawieniaScreen()`'s body had grown to ~107 lines (return
statement alone ~104 lines) — over the project's function-size constraint
(CLAUDE.md / brief global constraints, `functions ≤40 lines`). No lint rule
enforces this, so it slipped through gate 4 (lint/typecheck/tests all pass
regardless of function length).

**Fix applied (pure structural refactor — no test/testID/copy/wiring
changes):**
- Extracted one component per `SettingsGroup` in
  `src/features/ustawienia/UstawieniaScreen.tsx`: `LokalizacjaGroup`,
  `PowiadomieniaGroup`, `WygladGroup`, `DaneGroup`, each taking
  `{ settings, set }: Pick<SettingsApi, 'settings' | 'set'>` as props
  (`DaneGroup` needs neither, since both its rows are static).
- Extracted a `ToggleRow` helper (horizontal row + `Toggle` trailing control)
  to dedupe the `loc`/`alert`/`morning` wiring pattern, further shrinking
  `LokalizacjaGroup` and `PowiadomieniaGroup`.
- `UstawieniaScreen()` itself is now just the `ScrollView` + header + four
  group components + footer — 20 lines.
- Minor (optional, applied): shared the `title`/`soon` row-header text
  styles between `SettingRow.tsx` and the local `StackedRow` by exporting
  `rowHeaderStyles` from `SettingRow.tsx` and importing it in
  `UstawieniaScreen.tsx`. (`titleLine` itself was **not** shared — the
  stacked-row header needs an extra `marginBottom: 12` the horizontal row's
  `titleLine` doesn't, so unifying it would have required conditional
  styling for no real gain.)

### Function line counts (proof ≤40)
All counted as the full function definition, opening `function ... {` /
`({ ... }) {` line through the closing `}`, inclusive, per
`src/features/ustawienia/UstawieniaScreen.tsx`:

| Function | Lines | Count |
|---|---|---|
| `ToggleRow` | 14–40 | 27 |
| `StackedRow` | 43–67 | 25 |
| `LokalizacjaGroup` | 69–89 | 21 |
| `PowiadomieniaGroup` (largest — 4 rows) | 91–124 | 34 |
| `WygladGroup` | 126–145 | 20 |
| `DaneGroup` | 147–158 | 12 |
| `UstawieniaScreen` (top level) | 160–179 | **20** |

All ≤40 (target for the top-level function was ~15–20; landed at 20).

### File line counts (proof ≤200)
```
198  src/features/ustawienia/UstawieniaScreen.tsx
 56  src/features/ustawienia/SettingRow.tsx
```

### Gate results after the refactor
- `npx jest UstawieniaScreen` → 6/6 PASS (AC-17..22), unchanged.
- Full suite `npm test` → 39/39 suites, 132/132 tests PASS (same pre-existing
  unrelated `console.error` act()-warning from `usePlaceReading`, not a
  failure).
- `npm run lint` → 0 errors, 4 warnings, all pre-existing and unrelated
  (App.tsx inline style, gios/mappers.ts dot-notation +
  unused-eslint-disable, Toggle.tsx inline style).
- `npm run typecheck` → 0 errors.

### Commit
`c6abaa1` — "refactor(ustawienia): extract per-group components to satisfy
functions ≤40 lines"
