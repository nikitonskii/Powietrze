# Task 4 review — Miejsca row freshness (AC-4)

**Diff:** `task-4.diff` (commit `3addd0f feat(miejsca): show data age on rows (AC-4)`)
**Spec:** `docs/specs/018-refresh.md` §"Miejsca row freshness" + AC-4

## Verdict 1 — SPEC: PASS

`PlaceRow.tsx` gates the new age line on `reading` truthiness (line 40:
`{reading ? (<>...<Text>{formatFreshness(reading.measuredAt, new Date())}</Text></>) : null}`),
which is the same condition that already gates the band/trend line, so it
covers both `ready` and `stale`-with-`reading` rows identically, and renders
nothing when `reading` is undefined (the `brak danych` case is driven by
`status === 'stale'` with no reading, a separate branch at line 74-78 that
has no age line).

Three tests in `describe('AC-4: row data age', ...)`
(`src/features/miejsca/__tests__/PlaceRow.test.tsx:155-224`), all under
`jest.useFakeTimers()` + `jest.setSystemTime(new Date('2026-08-11T22:00:00'))`:

1. **ready → age shown** (line 167-173): resolves a reading, asserts
   `formatFreshness(reading.measuredAt, now)` text is present.
2. **stale-with-reading → age shown** (line 175-213): mounts under a real
   `RefreshProvider`, first fetch resolves (`ready`), then a `RefreshHarness`
   test helper calls the real `useRefresh().refresh()` to bump the signal,
   the second fetch is made to reject, which — through the real
   `usePlaceReading` effect (confirmed in
   `src/shared/place/usePlaceReading.ts:26-31`: catch → `status: 'stale'`,
   `reading: prev.reading`) — drives an actual ready→stale transition, not a
   faked hook return value. Asserts both `'42'` (index still shown) and the
   age text are present.
3. **no reading → no age line** (line 215-223): rejects on first fetch
   (`brak danych`), asserts the age text is `null` via `queryByText`.

All three cite AC-4 in the test name, use a frozen `now`, and the stale case
is driven through the real provider/hook stack rather than mocked. This
satisfies the spec's verification note ("frozen now, ready + stale +
brak-danych").

## Verdict 2 — QUALITY: APPROVE

- **TS/strict, no `any`:** none introduced; `formatFreshness(measuredAt: string, now: Date): string` (`src/core/air/index.ts:25`) is typed throughout.
- **No hard-coded hex:** age line uses `colors.text.faint` (`src/shared/tokens/index.ts:14`, `rgba(255,255,255,0.4)`), consistent with the subtitle's use of `colors.text.dim` right above it — no literal color added in `PlaceRow.tsx`.
- **Imports one-way:** `formatFreshness` imported from `../../core/air` (feature → core), no new cross-feature or reverse-direction imports. Test file imports `RefreshProvider`/`useRefresh` from `../../../shared/refresh` (feature-test → shared), also correct direction.
- **File size:** `PlaceRow.tsx` is 106 lines (≤200); the single new function-scope addition is a JSX fragment, not a new function, well under the 40-line function limit.
- **Gating on `reading` not `status`:** confirmed at `PlaceRow.tsx:40` — the age `<Text>` is inside the same `{reading ? (...) : null}` block as the band/trend line, so it naturally covers `ready` and `stale`-with-reading without a new/duplicated condition, and doesn't need to special-case `status`.
- **`RefreshHarness` test helper** (`PlaceRow.test.tsx:143-153`): lives in the test file only, not exported or reused as a production abstraction; it's a minimal wrapper around `useRefresh().refresh()` behind a pressable testID, reasonable and scoped to what's needed to drive the stale transition.
- No dead code, no speculative abstraction, no duplicated logic introduced.

## Checks run

- `npx jest` (full suite): **59 suites passed, 223 tests passed**, 0 failed.
- `npx jest src/features/miejsca src/shared/refresh src/shared/place`: **9 suites passed, 39 tests passed** (existing `PlaceRow`/`Miejsca`/refresh/place suites all green — no regressions).
- `npx tsc --noEmit`: clean, no errors.
- `npx eslint src/features/miejsca/PlaceRow.tsx src/features/miejsca/__tests__/PlaceRow.test.tsx`: 0 errors/warnings from these files (only pre-existing, unrelated `boundaries` plugin config warnings printed globally, not attributable to the changed files).

## Findings

None — Critical / Important / Minor: none identified. Nothing flagged
"cannot verify from diff" — all claims were checked against the actual
files on disk, not just the diff.
