# Final whole-branch review — M-teraz-detail
(Transcribed by the controller from the reviewer agent's findings — the `reviewer`
agent lacks a Write tool and its file writes didn't land.)

**VERDICT: APPROVE-WITH-NITS — 0 Critical / 2 Important / 3 Minor**

## Important
1. `src/data/gios/source.ts:19-24` — the local `SourceWithDetail` type + comment
   claim `getDetail` "is not yet part of `AirQualitySource`", but Task 4 added it
   (`src/core/air/index.ts` optional `getDetail?`). Comment now false, type
   redundant. **Fix:** delete `SourceWithDetail` + comment; type the factories as
   returning `AirQualitySource`.
2. `src/features/teraz/__tests__/TerazScreen.test.tsx:35,46` — two tests labeled
   `AC-8` actually cite spec 002's AC-8 (Hero), colliding with spec 012's own
   AC-8 (HistoryChart). **Fix:** rename to `spec-002 AC-8: …`.

## Minor
3. `src/shared/ui/HistoryChart.tsx` — missing the small clock icon beside the
   header (`design/Powietrze.dc.html:76`). **Fix:** add it, or document as a
   concession (like the blur/chevron omissions).
4. `src/data/gios/__tests__/detail.test.ts` (AC-6c) — only tests shared-station
   memoization on the geo-FAILURE path. **Fix:** add a geo-SUCCESS assertion that
   geo/`fetchStations` is called once across `getDetail`+`getCurrentReading`.
5. `src/data/gios/__tests__/detail.test.ts:36-47` — `sensorsNoNo2` built via
   inline filter + cast. **Fix:** extract to a `__fixtures__` JSON file.

## SourceWithDetail ruling
**Now redundant** — its stricter (required) guarantee is erased at
`SourceForPlace`/`usePlaceDetail`'s `.getDetail?.()`, so nothing depends on it.
Remove it (Important #1).

## AC coverage
AC-1..3 (core) ✓, AC-4..6c (data) ✓, AC-7 (hook) ✓, AC-8..9 (UI) ✓,
AC-10 (screen) ✓; AC-11 manual (sim) — pending Task 7. Gate: 48 suites/162
tests, lint+tsc 0, core 100%.
