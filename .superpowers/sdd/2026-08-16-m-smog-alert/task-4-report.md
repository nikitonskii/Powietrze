# Task 4 report — Settings default + un-tag Ustawienia rows (AC-5)

## Files changed

- `src/core/settings/index.ts` — `DEFAULT_SETTINGS.alert: true → false` (opt-in default, line 18).
- `src/core/settings/__tests__/settings.test.ts`:
  - AC-1 fixture: `alert: true → false` in the `DEFAULT_SETTINGS` literal-fixture assertion.
  - Added new assertion `test('AC-5: DEFAULT_SETTINGS.alert defaults to opt-in false ...')`.
  - AC-4 (`mergeSettings`): added `expect(mergeSettings({}).alert).toBe(false)` (explicit missing-key
    check per task instructions, in addition to the existing `toEqual(DEFAULT_SETTINGS)` check which
    already covers it); fixed `mergeSettings({ alert: 'yes' }).alert` expectation from `true` to
    `false` (invalid-typed value falls back to the new default).
- `src/features/ustawienia/UstawieniaScreen.tsx` — dropped the `soon` prop on all three
  POWIADOMIENIA rows: `alert` (Alert smogowy, `ToggleRow`), `threshold` (Próg alertu, `StackedRow`),
  `quiet` (Godziny ciszy, `SettingRow`). No other rows touched.
- `src/features/ustawienia/__tests__/UstawieniaScreen.test.tsx`:
  - AC-5 test rewritten: renamed to "no Wkrótce tags remain — alert, threshold, quiet are now live
    like morning"; merged the two lists into one — every row's `wkrotce-*` testID (`alert`,
    `threshold`, `quiet`, `morning`, `loc`, `precision`, `scale`, `widget`, `source`, `refresh`) is
    now asserted absent (`queryByTestId(...)` null). The present-set is empty as the plan/spec
    require.
  - AC-19 ("toggling Alert smogowy persists alert inverted"): fixed fallout — starting state is now
    `alert: false` (was implicitly `true` via the old default), so pressing `toggle-alert` now
    persists `true` (was asserting `false`). Updated the assertion accordingly; AC-22 (preloaded
    `alert: false` → toggle rendered off) needed no change since it already passes an explicit
    override.

## Fallout grep (Step 4 of the plan)

Grepped `alert: true`, `DEFAULT_SETTINGS`, and per-file `alert` usage across `src`. Findings:

- `src/data/settings/__tests__/store.test.ts` — AC-6/AC-7 assert `DEFAULT_SETTINGS` directly but
  don't hard-code `alert`; picks up the new default automatically, no edit needed.
- `src/shared/settings/__tests__/context.test.tsx` — all `alert` assertions use explicit
  `{ ...DEFAULT_SETTINGS, alert: false }` overrides; unaffected.
- `src/shared/alert/__tests__/{harness.tsx,crossing.test.tsx,perPlace.test.tsx,permission.test.tsx}`
  (Task 3's `SmogAlertProvider` suite) — all pass `settings: { alert: true, threshold: 50 }` as an
  explicit override via `renderAlert`'s `Partial<Settings>` merge over `DEFAULT_SETTINGS`; unaffected
  by the default flip. Did not touch (out of Task 4 scope; Task 3 already landed).
- `AppNavigator.test.tsx`, `MiejscaScreen.test.tsx`, `FavoriteRow.test.tsx`, `PlaceRow.test.tsx`,
  `TerazScreen*.test.tsx`, `WidgetSyncProvider.test.tsx`, `ActivePlaceContext.test.tsx`,
  `NotificationsProvider.test.tsx` — use `DEFAULT_SETTINGS` for unrelated fields; none assert on
  `alert`'s value. No edits needed.

## Gate results

- `npm run typecheck` → clean (`tsc --noEmit`, no output/errors).
- `npm run lint` → 0 errors, 4 warnings (all pre-existing: inline-style warnings in `App.tsx`,
  `HistoryChart.tsx`, `Toggle.tsx`; one `eslint-comments/no-unused-disable` in
  `src/data/gios/mappers.ts`). None touch files changed in this task.
- `npm test` → **62 suites passed, 243 tests passed**, 0 failed.
- `npx jest --coverage` → same 62/243 passing; no coverage-threshold failure emitted.
  `src/core/settings` (and every other `src/core/*` folder) reports 100% statements/branches/
  functions/lines. (Coverage HTML/JSON write to `./coverage/` needed the sandbox bypass — the
  directory is gitignored via `/coverage`, so nothing was committed.)

## Deviations from the plan

- None in scope. One addition beyond the literal instructions: fixed AC-19 in
  `UstawieniaScreen.test.tsx`, which the plan's Step 4 ("fix any other suite asserting `alert: true`
  default") implicitly covers but didn't name explicitly — the toggle-inversion assertion was
  hard-coded to the old default's inverted value and would have failed red without the fix.
- Did not modify `src/shared/alert/**` (Task 3, SmogAlertProvider) per the explicit instruction not
  to touch it — confirmed its tests pass unmodified because they inject `alert` explicitly rather
  than relying on `DEFAULT_SETTINGS.alert`.

## Commit

`feat(ustawienia): un-tag alert/threshold/quiet; alert default opt-in (AC-5)`
