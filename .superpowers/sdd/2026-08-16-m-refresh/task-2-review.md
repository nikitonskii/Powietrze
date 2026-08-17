# Review — Task 2: fetch hooks refetch on signal; ActivePlace clears refreshing (AC-2, AC-3)

**Diff:** `.superpowers/sdd/2026-08-16-m-refresh/task-2.diff` (commit `33706fc`, HEAD matches diff exactly — verified via `git log`).
**Spec:** `docs/specs/018-refresh.md` §Design "Fetch hooks" / "ActivePlaceProvider" / AC-2, AC-3, AC-3b.
**Plan:** `docs/superpowers/plans/2026-08-16-m-refresh.md` Task 2.

## Verdict 1 — SPEC: PASS

- **AC-2** (`src/shared/place/usePlaceReading.ts:19,37`, `usePlaceDetail.ts:12,27`): `signal = useRefreshSignal()` added, `signal` added to the effect dep array alongside the existing `[sourceForPlace, placeKey]`, `place` object identity still excluded via the (unchanged) eslint-disable. New tests in `usePlaceReading.test.tsx` and `usePlaceDetail.test.tsx` are real behavior tests using fake-source call counters: 1 call on mount, 2 after `refresh()`, still 2 after an unrelated re-render (a local `tick` state bump that doesn't touch the signal), and an explicit "unwrapped — 1 call, no throw" case guarding the pre-existing suites. All correctly cite `AC-2`.
- **AC-3 / AC-3b** (`ActivePlaceContext.tsx:40,55-57`): `useRefresh().settleActive` is called from an effect keyed on `state` (the `ReadingState` returned by `usePlaceReading`, which gets a new reference on every settle including a signal-triggered refetch). The new test in `ActivePlaceContext.test.tsx` (`AC-3/AC-3b: ...`) drives a fake source whose second call hangs on a manually-resolved promise, and asserts `refreshing`: false during initial load → true immediately after `refresh()` → false only after the held promise resolves (i.e. after the active reading re-settles). This is a real integration test of the `RefreshProvider` + `ActivePlaceProvider` + `usePlaceReading` chain, not a restated implementation.
- All four new/extended test files use real behavior assertions (call counts, textual `refreshing`/`ready`/`tick` state), no snapshots, and every new test name cites the correct AC ID.

## Verdict 2 — QUALITY: APPROVE

Checked against `CLAUDE.md`:
- **Imports:** `shared/refresh` is consumed only from other `shared/*` modules (`shared/place/*`) and from `App.tsx` (root, already imports `data`/`core`/`shared`/`app`). No cross-feature import, no reverse-layer import.
- **File/function size:** `App.tsx` 78 lines, `ActivePlaceContext.tsx` 70 lines, `usePlaceReading.ts` 39 lines, `usePlaceDetail.ts` 29 lines — all ≤200, all functions well under 40 lines.
- **TS strict / no `any`:** none introduced.
- **eslint-disable scope** (`usePlaceReading.ts:36`, `usePlaceDetail.ts:26`): comment still reads "keyed by placeKey; `place` identity intentionally excluded" — accurate, since `signal` is now a *listed* dep, not a hidden/suppressed one. No real missing dep is being hidden.
- **`state`-keyed effect in `ActivePlaceContext.tsx:55-57`:** deps `[state, settleActive]` are exhaustive (no disable needed, none present). `settleActive()` is a no-op unless `refreshingRef.current` is true (verified in `src/shared/refresh/index.tsx:49-51`), so mount/place-change settles (which happen while not refreshing) don't cause spurious state churn. `settleActive` is `useCallback`-stable, so it doesn't retrigger the effect on unrelated re-renders. No loop risk: `settleActive` only ever calls `setRefreshing(false)` inside `RefreshProvider`, which cannot re-trigger `usePlaceReading`'s effect (not one of its deps).
- **App.tsx provider order:** `RefreshProvider` wraps `StationsProvider > PlaceSourceProvider > FavoritesProvider > SettingsProvider > NotificationsProvider > ActivePlaceProvider > WidgetSyncProvider > SafeAreaProvider`. All 7 pre-existing providers are present, in their original relative order, just re-indented one level deeper — nothing dropped or reordered. `RefreshProvider` sits above both `PlaceSourceProvider` and `ActivePlaceProvider` as the spec requires (§Design "Screens" / "App.tsx").
- No dead code, no speculative abstraction, no duplication introduced by this diff.

## Regression check

- **Full `npm test`: 59 suites passed, 59 total; 218 tests passed, 218 total; 0 failures.** All 8 pre-existing place/screen suites (`usePlaceReading.test.tsx`, `usePlaceDetail.test.tsx`, `ActivePlaceContext.test.tsx`, `TerazScreen.test.tsx`, `TerazScreen.nearest.test.tsx`, `MiejscaScreen.test.tsx`, `FavoriteRow.test.tsx`, `PlaceRow.test.tsx`, plus `App.test.tsx`/`AppNavigator.test.tsx`) render these hooks without a `RefreshProvider` and stayed green, confirming the unwrapped `useRefreshSignal() === 0` default (Task 1) means no behavior change without the provider.
- `npm run typecheck`: clean, 0 errors.
- `npm run lint`: 0 errors, 4 pre-existing warnings (inline styles in `App.tsx`/`HistoryChart.tsx`/`Toggle.tsx`, an unused-disable note in `mappers.ts`) — none introduced by this diff; nothing new flagged in the changed files (`usePlaceReading.ts`, `usePlaceDetail.ts`, `ActivePlaceContext.tsx`, `App.tsx` beyond its pre-existing warning).

## Findings

None — Critical / Important / Minor: none found in this diff.

⚠️ Cannot verify from this diff/task alone (out of Task 2's scope, deferred to Task 3/5 per the plan):
- `RefreshControl` wiring on `TerazScreen`/`MiejscaScreen` (Task 3, not part of this diff).
- AC-5/AC-6 manual sim behavior (spinner visuals, drag-reorder/swipe gesture coexistence, double-geolocation latency) — these are manual ACs per the spec, not testable from source.
