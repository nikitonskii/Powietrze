# Final whole-branch review — m-refresh (pull-to-refresh + freshness)

**Branch:** `feature/m-refresh` off `feature/m-widget` · **Reviewer pass** (separate lane, read-only)
**Scope:** cross-cutting issues per-task reviews may have missed — full refresh loop, regression safety, architecture, test integrity, App.tsx.

## Verdict: APPROVE-WITH-NITS

Gates all green, `src/core` untouched and still 100%, architecture one-way, tests assert real behavior. Two Minor nits + a couple of observations below; none block.

---

## Gate results (run by the reviewer, not trusted from report)
- **Tests:** 59 suites / **223 tests passed**, 0 failed, 0 snapshots (`npx jest`).
- **Typecheck:** `tsc --noEmit` clean, 0 errors.
- **Lint:** `eslint .` -> **0 errors**, 4 warnings — all pre-existing and outside this branch's new files (App.tsx `{flex:1}` inline style on GestureHandlerRootView [pre-existing], gios/mappers.ts unused-disable, HistoryChart/Toggle inline styles). No new warnings introduced.
- **`src/core` coverage:** full-suite `jest --coverage` exits 0 with the enforced `./src/core/` threshold at **100%** statements/branches/functions/lines. `git diff feature/m-widget..feature/m-refresh -- src/core` is **empty** — core is untouched.
  - Note: an isolated `jest src/core` run reports 97.89% branches, but that is a measurement artifact (core branches such as `formatFreshness` are exercised by feature suites); the real gate (full run) passes at 100%.

---

## Refresh loop correctness — traced end to end
`refresh()` -> `setSignal(s+1)` on `SignalCtx` -> every `useRefreshSignal()` consumer re-runs its fetch effect: the active place's `usePlaceReading`/`usePlaceDetail` (in `ActivePlaceProvider`) AND every `PlaceRow`'s `usePlaceReading`. One signal fans out to active + all rows. Confirmed by `MiejscaScreen.test` (`onRefresh` drives calls 2->4: location row + active place).

`refreshing` reliably returns to false:
- **Active settle path** — `usePlaceReading` always `setState`s a *new* object on both success and rejection and does **not** reset to `loading` at effect start, so its `state` reference changes only when the refetch actually settles. `ActivePlaceContext.tsx:55-57` fires `settleActive()` on that reference change -> `clear()`. No premature clear (the signal bump alone doesn't mutate `state`).
- **Backstop** — 8s safety timeout (`refresh/index.tsx:46`) force-clears; verified at the 7999/8000 boundary (`RefreshProvider.test` AC-1).
- **No stuck spinner** — a rejecting active fetch still produces a new `stale` state object -> settle -> clear.
- **No thrash** — `refresh()` is debounced via `refreshingRef` (`index.tsx:42`); effect deps are `[sourceForPlace, placeKey (primitive), signal (number)]`, no identity churn; the `[state, settleActive]` effect can't loop (`clear` toggles `refreshing`/ApiCtx, not `state`).
- **Good design detail:** signal and api are split into two contexts, so `PlaceRow`s (signal-only consumers) don't re-render when `refreshing` toggles.

Provider order (`App.tsx:54-73`): `RefreshProvider` is the outermost app provider, above `PlaceSourceProvider` and `ActivePlaceProvider`; diff shows *only* `RefreshProvider` added — no existing provider dropped or reordered.

---

## Findings

### [Minor] Detail section flickers on same-place refresh — `src/shared/place/usePlaceDetail.ts:18,27`
Confidence: HIGH. Adding `signal` to the effect deps means the `setDetail(undefined)` reset (line 18) now also fires on a **refresh of the same place**, not just on place change. On Teraz a pull-to-refresh therefore unmounts the HistoryChart + PollutantTiles (`TerazScreen.tsx:70` `detail && ...`) for the refetch duration, then remounts them — while the hero stays put (because `usePlaceReading` keeps its last reading). Inconsistent polish, not a correctness bug.
Fix: reset detail only when `placeKey` changes, not on `signal` — e.g. keep the previous detail during a signal-triggered refetch (drop the unconditional `setDetail(undefined)` and let the resolved value replace it), mirroring `usePlaceReading`'s keep-last-reading behavior; or gate the reset behind a `placeKey`-change check.

### [Minor] `RefreshProvider` is ~45 lines — over the 40-line guideline — `src/shared/refresh/index.tsx:26-70`
Confidence: MEDIUM. CLAUDE.md: "functions <= 40 lines; decompose instead." The component is ~45 lines (hooks + `useMemo` + JSX). Optional: extract the lifecycle (`signal`, `refresh`, `settleActive`, `clear`, timeout) into a `useRefreshController()` hook returning `{signal, api}`, leaving the component as thin provider wiring.

### Observations (non-blocking)
- **Miejsca `refreshing` clears on ACTIVE-place settle, not on the visible rows' settle** (`refresh/index.tsx` + `ActivePlaceContext`). On Miejsca the active place isn't shown, so the spinner can stop before the visible rows finish; the 8s timeout bounds the worst case. This is the spec's explicit accepted tradeoff (018 AC-6, design note) — flagging only for visibility, not as a defect.
- **`act(...)` console warning in test output** — a `usePlaceReading` setState lands outside `act` in some suite; tests are green and it's the pre-existing async-fetch pattern. Harmless noise.

---

## Verified clean
- **Regression safety (unwrapped-0):** `useRefreshSignal()` returns a value-stable `0` with no provider (`index.tsx:19,72-74`); explicitly covered by AC-2 "unwrapped" tests for both hooks; all 223 tests green with no RefreshProvider migration needed in existing suites.
- **Architecture:** imports one-way — `refresh` lives in `src/shared`, consumed by `shared/place` and `features` only; no feature touches data directly; no cross-feature imports; `src/core` untouched and pure.
- **No `any`** in changed production code (only in test-fixture JSON with an inline justification and in comments). **No hard-coded hex** — tints use `colors.text.dim`. **No dead code / speculative abstraction** — `settleActive` is consumed by `ActivePlaceProvider`; the ApiCtx no-op defaults exist for the unwrapped-safety contract.
- **File sizes:** `refresh/index.tsx` 77 lines; all changed files <=200.
- **Test integrity (no tautologies/snapshots):**
  - AC-1 `RefreshProvider.test` — signal counts, refreshing transitions, 7999/8000 fake-timer boundary, debounce no-op, unwrapped-0 safety.
  - AC-2 hook tests — real `getCurrentReading`/`getDetail` call counts; unrelated-re-render guard; unwrapped case.
  - AC-3/3b `ActivePlaceContext.test` — controllable promise (`resolveSecond`), refreshing false->true->false across a real active resettle under `RefreshProvider`.
  - AC-4 `PlaceRow.test` — `setSystemTime` frozen now; ready + **stale-with-reading (driven by a real refetch that rejects)** + brak-danych-no-age.
  - Teraz/Miejsca — RefreshControl props asserted via the **real** RN jest-preset seam `RefreshControl.latestRef` (`@react-native/jest-preset/jest/mocks/RefreshControl.js`), not a fabricated mock; call counts prove the wiring.
- **App.tsx:** RefreshProvider correctly outermost; `useSettings`/`useRefresh`/`usePlaceReading` dependencies for `ActivePlaceProvider` all satisfied by the ordering; no provider reordered.
- AC-5/AC-6 are manual (sim) — not treated as gaps.
