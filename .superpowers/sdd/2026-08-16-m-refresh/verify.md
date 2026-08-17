# Verify — Spec 018 (pull-to-refresh) — Automated ACs

**Worktree:** `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest`
**Branch:** `feature/m-refresh`
**Spec:** `docs/specs/018-refresh.md`
**Date:** 2026-08-16

## Verdict table

| AC | Verdict | Evidence |
|---|---|---|
| AC-1 | VERIFIED | `src/shared/refresh/__tests__/RefreshProvider.test.tsx` — 5 tests, all named `AC-1: …`: "refresh() bumps the signal by 1 and sets refreshing true", "settleActive() sets refreshing false and cancels the safety timeout", "the 8s safety timeout auto-clears refreshing when settleActive never comes", "a second refresh() while refreshing is a no-op (signal unchanged)", "unwrapped (no RefreshProvider) — signal is 0, refresh/settleActive are safe no-ops". All 5 PASS. Uses `jest.useFakeTimers()` + `jest.advanceTimersByTime` to genuinely exercise the 8s timeout boundary (7999ms still true, +1ms flips false) and the debounce (second press leaves signal at 1). Assertions read observable state (`signal`, `refreshing` text nodes), not internals — real evidence, not tautological. |
| AC-2 | VERIFIED | `src/shared/place/__tests__/usePlaceReading.test.tsx` — "AC-2: usePlaceReading refetches when the signal bumps, not on an unrelated re-render" (call-count 1→2→2, unrelated re-render via `tick` state confirmed not to trigger a 3rd call) and "AC-2: unwrapped (no RefreshProvider) — usePlaceReading still works, 1 call, no throw". Same pair in `src/shared/place/__tests__/usePlaceDetail.test.tsx` for `usePlaceDetail`/`getDetail`. All 4 PASS. Real fake-source call counters, not stubs that always resolve true. |
| AC-3 / AC-3b | VERIFIED | `src/shared/place/__tests__/ActivePlaceContext.test.tsx` — single test "AC-3/AC-3b: refreshing is false during initial load, true after refresh(), false once the active reading resettles". Drives a controllable promise (first `getCurrentReading` resolves at mount, second stays pending until `resolveSecond` is called manually) through `RefreshProvider` + `ActivePlaceProvider` nested together (the actual provider-order integration the spec calls for) — asserts `refreshing` false during initial load, true immediately after `refresh()` (call count 2 confirmed), then false again only after `resolveSecond` is invoked and awaited. PASS. Not a tautology — the middle assertion would fail if `ActivePlaceProvider` cleared `refreshing` eagerly instead of waiting for the active reading. |
| AC-4 | VERIFIED | `src/features/miejsca/__tests__/PlaceRow.test.tsx`, `describe('AC-4: row data age', …)` with frozen `now` via `jest.setSystemTime`: "a ready row renders the reading age" (asserts `formatFreshness(reading.measuredAt, now)` text present), "a stale row that still has a last reading also renders the age" (drives fetch #1 success → fetch #2 rejection via `refresh()`, confirms status flips but index+age both still render), "a row with no reading (\"brak danych\") renders no age line" (asserts the freshness text is absent). Verified against `PlaceRow.tsx` source: the age `<Text>` is inside the same `{reading ? (…) : null}` block as the index/band lines, so "no reading → no age" is a real structural guarantee, not an artifact of checking one specific string. All 3 PASS. |
| AC-5 | PENDING-MANUAL | Not attempted (out of scope per dispatch — manual/sim). Spec designates journal `docs/harness/18-refresh.md` + `evidence/18` as the record; not audited here. |
| AC-6 | PENDING-MANUAL | Not attempted (out of scope per dispatch — manual/sim). Same note. |

## Commands run

```
npx jest src/shared/refresh/__tests__/RefreshProvider.test.tsx \
  src/shared/place/__tests__/usePlaceReading.test.tsx \
  src/shared/place/__tests__/usePlaceDetail.test.tsx \
  src/shared/place/__tests__/ActivePlaceContext.test.tsx \
  src/features/miejsca/__tests__/PlaceRow.test.tsx --verbose
```
Result: `Test Suites: 5 passed, 5 total` / `Tests: 29 passed, 29 total`

```
npx jest --coverage --coverageReporters=text-summary
```
Result:
```
Test Suites: 59 passed, 59 total
Tests:       223 passed, 223 total
Snapshots:   0 total
```
Coverage summary (whole repo, informational only — threshold gate is scoped to `src/core/`):
```
Statements   : 95.34% ( 656/688 )
Branches     : 87.32% ( 255/292 )
Functions    : 93.25% ( 235/252 )
Lines        : 95.87% ( 605/631 )
```
Exit code 0, no "Jest: \"...\" coverage threshold" failure emitted → `src/core/` coverage threshold (100% stmts/branches/functions/lines, set in `jest.config.js`) is met.

```
npm run typecheck   →  tsc --noEmit, clean, no output, exit 0
npm run lint        →  eslint ., 0 errors, 4 warnings, exit 0
```
Lint warnings (all pre-existing, unrelated to spec 018 — none touch `src/shared/refresh`, `src/shared/place`, or `src/features/miejsca/PlaceRow.tsx`):
- `App.tsx:53` inline style
- `src/data/gios/mappers.ts:3` unused eslint-disable comment
- `src/shared/ui/HistoryChart.tsx:49` inline style
- `src/shared/ui/Toggle.tsx:21` inline style

## AC → test file/name map

| AC | Test file | Test name(s) |
|---|---|---|
| AC-1 | `src/shared/refresh/__tests__/RefreshProvider.test.tsx` | `AC-1: refresh() bumps the signal by 1 and sets refreshing true`; `AC-1: settleActive() sets refreshing false and cancels the safety timeout`; `AC-1: the 8s safety timeout auto-clears refreshing when settleActive never comes`; `AC-1: a second refresh() while refreshing is a no-op (signal unchanged)`; `AC-1: unwrapped (no RefreshProvider) — signal is 0, refresh/settleActive are safe no-ops` |
| AC-2 | `src/shared/place/__tests__/usePlaceReading.test.tsx` | `AC-2: usePlaceReading refetches when the signal bumps, not on an unrelated re-render`; `AC-2: unwrapped (no RefreshProvider) — usePlaceReading still works, 1 call, no throw` |
| AC-2 | `src/shared/place/__tests__/usePlaceDetail.test.tsx` | `AC-2: usePlaceDetail refetches when the signal bumps, not on an unrelated re-render`; `AC-2: unwrapped (no RefreshProvider) — usePlaceDetail still works, 1 call, no throw` |
| AC-3/AC-3b | `src/shared/place/__tests__/ActivePlaceContext.test.tsx` | `AC-3/AC-3b: refreshing is false during initial load, true after refresh(), false once the active reading resettles` |
| AC-4 | `src/features/miejsca/__tests__/PlaceRow.test.tsx` | `AC-4: a ready row renders the reading age`; `AC-4: a stale row that still has a last reading also renders the age`; `AC-4: a row with no reading ("brak danych") renders no age line` |
| AC-5 | — | none (manual, pending) |
| AC-6 | — | none (manual, pending) |

## Findings

No AC with missing or trivially-passing test evidence among AC-1..AC-4. All assert observable behavior (signal/refreshing state, call counts, rendered text) tied to genuine fake-timer/fake-promise control, not tautologies. `console.error` "not wrapped in act(...)" warnings appear during the full-suite run (pre-existing, from unrelated async-effect tests, e.g. `usePlaceReading`/`ActivePlaceContext`/`SettingsProvider` setState-after-unmount timing) — cosmetic noise, do not cause test failures, out of scope for this spec.

AC-5 and AC-6 are manual/sim criteria; per dispatch scope, not attempted here — reported PENDING-MANUAL, not FAILED/UNTESTED.
