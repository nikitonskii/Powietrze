# Task 4 report — Miejsca row data age (AC-4)

## Scope
Display-only change per `docs/superpowers/plans/2026-08-16-m-refresh.md` Task 4
and `docs/specs/018-refresh.md` §"Miejsca row freshness" / AC-4. Did not touch
the refresh mechanism (Tasks 1–3, already done): `useRefresh`, `useRefreshSignal`,
`RefreshProvider`, `usePlaceReading`'s refetch-on-signal logic are all unchanged.

## Files changed
- `src/features/miejsca/PlaceRow.tsx`
  - Imported `formatFreshness` from `../../core/air` (alongside the existing
    `displayValue` import from the same module).
  - Inside the existing `{reading ? ... : null}` block (which already gated the
    band+trend line), wrapped the trend `<View>` and a new age `<Text>` in a
    `<>...</>` fragment. The age line renders
    `formatFreshness(reading.measuredAt, new Date())` with
    `variant="station"` and `color={colors.text.faint}` — one step dimmer than
    the subtitle's `colors.text.dim`, since it's supplementary metadata below
    the band/trend line, not hard-coded hex.
  - Condition is `reading` truthiness only (not `status`), so it fires for both
    `status: 'ready'` and `status: 'stale'` rows that still carry a last
    `reading` — matching the plan's Q4 decision (a stale row's age is honest,
    shown not hidden). No age line renders when `reading` is `undefined`
    (loading, or stale-with-no-reading → "brak danych" case), since the whole
    fragment is gated on `reading`.
- `src/features/miejsca/__tests__/PlaceRow.test.tsx`
  - Added imports: `formatFreshness` (from `../../../core/air`), `ReactNode`
    (type-only), `RefreshProvider`/`useRefresh` (from `../../../shared/refresh`).
  - Added a `RefreshHarness` helper component that exposes a `refresh-btn`
    testID wired to `useRefresh().refresh()`, so a test can drive
    `usePlaceReading` from `ready` → `stale` (mirrors the pattern already used
    in `src/shared/place/__tests__/usePlaceReading.test.tsx`).
  - Added `describe('AC-4: row data age', ...)` with `jest.useFakeTimers()` +
    `jest.setSystemTime(now)` in `beforeEach` (freezes the `now` the component's
    internal `new Date()` call reads) and `jest.useRealTimers()` in `afterEach`.
    Confirmed `waitFor`/`findBy*` in this RTL version (`@testing-library/react-native@14.0.1`)
    auto-detect and step fake timers internally (`wait-for.js` calls
    `jest.advanceTimersByTimeAsync` under modern fake timers), so mixing fake
    timers with the existing `waitFor`-based assertions in the rest of the file
    is safe — verified by running the full file, all 9 tests pass.

## Tests (AC-4)
1. `AC-4: a ready row renders the reading age` — resolves a reading, asserts
   `screen.getByText(formatFreshness(reading.measuredAt, now))` is present
   alongside the index.
2. `AC-4: a stale row that still has a last reading also renders the age` —
   wraps `PlaceRow` in `RefreshProvider` + `RefreshHarness`; first fetch
   resolves (status → `ready`, reading set), then presses `refresh-btn`, whose
   refetch rejects (status → `stale`, `usePlaceReading` keeps `prev.reading`
   per its own contract). Asserts the refetch happened (`calls === 2`) and both
   the index (`42`, unchanged — `PlaceRow`'s tri-state branches on `reading`
   truthiness, not `status`) and the age text are still rendered. This is the
   AC-4 case that needed the most care: I initially wrote it expecting
   "brak danych" to appear on the stale refetch, which is wrong — a stale row
   with a *kept* reading still shows the index, per the existing tri-state
   logic; only a stale row with *no* reading shows "brak danych". Fixed by
   asserting on `calls` and the retained index/age text instead.
3. `AC-4: a row with no reading ("brak danych") renders no age line` —
   `getCurrentReading` always rejects (never had a reading), asserts
   `screen.getByText('brak danych')` and
   `screen.queryByText(formatFreshness(reading.measuredAt, now))` is `null`.

All three were run red first (missing import / component not yet updated),
confirmed the render assertion failures, then made green by the `PlaceRow.tsx`
edit.

## Gate results (fresh, this session)
- `npm run typecheck` → clean, no errors.
- `npm run lint` → 0 errors, 4 pre-existing warnings (all in files I did not
  touch: `App.tsx`, `src/data/gios/mappers.ts`, `src/shared/ui/HistoryChart.tsx`,
  `src/shared/ui/Toggle.tsx`). Nothing in `PlaceRow.tsx` or its test file.
- `npm test` → `Test Suites: 59 passed, 59 total`, `Tests: 223 passed, 223 total`.
  No `FAIL` suites. Ran a second time with `--coverage` (sandbox needed a
  filesystem-write allowance for the coverage report; used the standard
  `npm test` script — without `--coverage` — for the assertion of record, per
  the task's specified gate command) — no coverage-threshold failure reported
  in either run; `src/core` untouched by this task so its 100% threshold is
  unaffected.
- Pre-existing `console.error: The current testing environment is not
  configured to support act(...)` warnings (37 occurrences full-suite) come
  from `usePlaceReading.ts`/`usePlaceDetail.ts`'s un-awaited `setState` inside
  `.then()/.catch()` callbacks — present before this change (reproducible in
  unrelated suites like `usePlaceDetail.test.tsx`), out of scope for a
  display-only task, not introduced or worsened here.

## Deviations from the plan
- None functionally. One design note: the plan's Step 1 says "a stale row that
  still has a `reading` ALSO renders the age" — I implemented this test by
  actually driving `usePlaceReading` through a real `ready → stale` transition
  via `RefreshProvider` (rather than only asserting on a hand-constructed
  render prop), since `PlaceRow` has no way to inject `status` directly — it
  only calls `usePlaceReading` internally. This required adding a small
  in-test-file `RefreshHarness` component (test-only, not exported, not part
  of `PlaceRow.tsx`), which isn't a new production abstraction.
- Chose `colors.text.faint` over `colors.text.dim` for the age line's color
  (spec allowed either) to keep it visually one step behind the subtitle
  (`dim`), consistent with the row's existing visual hierarchy from most to
  least prominent: title → subtitle (`dim`) → band (`high`, tinted) → age
  (`faint`).

## Concerns
- None blocking. The pre-existing `act(...)` console warnings and the
  coverage-report-write sandbox friction are environment/repo-wide issues
  unrelated to this task's diff.
