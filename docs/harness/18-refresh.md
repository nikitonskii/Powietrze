# Journal 18 — M-refresh (pull-to-refresh + freshness)

**Spec:** `docs/specs/018-refresh.md` (AC-1..6) · **Plan:** `docs/superpowers/plans/2026-08-16-m-refresh.md`
**Branch:** `feature/m-refresh` (off `feature/m-widget`/PR #16; chain #3→…→#16 precede) · **PR:** #17
**Built:** 2026-08-16, subagent-driven (4 code tasks, per-task review each) + whole-branch review + verifier. **No new dependency** (`RefreshControl` on board).

## What shipped
Pull down on Teraz/Miejsca to re-fetch live GIOŚ data; Miejsca rows now show the reading's data age.
- **`src/shared/refresh`** — `RefreshProvider`: a global `signal` (bumped on pull) + a `refreshing` boolean tied to the active place's refetch settle + an 8s safety timeout + debounce. `useRefreshSignal()` returns `0` when unwrapped; `useRefresh()` → `{ refresh, refreshing, settleActive }`.
- **`usePlaceReading`/`usePlaceDetail`** add `signal` to their effect deps → one pull refetches the active place AND all Miejsca rows.
- **`ActivePlaceContext`** clears `refreshing` when the active reading settles. **`App.tsx`** mounts `RefreshProvider` above the tree.
- **`RefreshControl`** on both ScrollViews; **`PlaceRow`** shows `formatFreshness(reading.measuredAt, now)` (ready + stale-with-reading; none on brak danych).
- **Widget stays in sync for free**: a refresh that changes the data republishes the snapshot via the existing `WidgetSyncProvider`.

## Design decisions (critic REWORK resolved)
- **Active-place-tied `refreshing` + 8s timeout + debounce, NOT an in-flight counter** (critic B1: the counter had a timeout/underflow desync). Simpler + can't stick.
- **`useRefreshSignal()` defaults to `0` unwrapped** (critic B2) → the 8 existing hook/screen suites need no `RefreshProvider` migration; adding it is a value-stable dep with no behavior change.
- **Data-age label only** (no app-fetch-time) — honest: if a refresh finds no newer GIOŚ hour, the age correctly stays; the RefreshControl spinner is the "refreshing now" feedback. Shown on stale rows too (it IS that old).

## Process notes
- **Task-3 review CHANGES-NEEDED → resolved:** the RefreshControl test first used a fragile deep-import `jest.mock` (2 lint warnings, duplicated); replaced with the RN preset's own `RefreshControl.latestRef` seam (real props, zero mock, zero warnings).
- **Final review APPROVE-WITH-NITS → both fixed:** (1) `usePlaceDetail` blanked the chart/tiles on every refresh — now resets only on placeKey change (no flicker), +1 test; (2) `RefreshProvider` slimmed via an extracted `useRefreshState()` hook.
- **Reusable gotcha:** the RN jest preset strips `RefreshControl` props but exposes `RefreshControl.latestRef.props` — use that to assert wiring, no custom mock. And a fetch hook that resets to a loading/undefined state on EVERY effect run flickers when the effect also re-runs on a refresh signal — reset only on the identity (placeKey) change.

## AC coverage
Gate: 59 suites / 224 tests · lint 0 errors · typecheck clean · `src/core` 100%.
- **AC-1** (RefreshProvider: bump/settle/timeout/debounce/unwrapped-0) ✓ · **AC-2** (hooks refetch on signal; unwrapped→1 call) ✓ · **AC-3/3b** (refreshing false→true→false on active settle) ✓ · **AC-4** (PlaceRow age: ready + stale-with-reading + none on brak danych) ✓.
- **AC-5/AC-6 (manual)** — PENDING sim: pull on Teraz/Miejsca; confirm re-fetch + spinner + row ages, and the RefreshControl coexists with the drag-reorder/swipe gestures; note the location place re-runs geolocation.

Verifier: AC-1..4 all VERIFIED (non-tautological). Whole-branch review: APPROVE-WITH-NITS (both nits fixed).

<!-- MANUAL EVIDENCE (append after sim): docs/harness/evidence/18/. -->
