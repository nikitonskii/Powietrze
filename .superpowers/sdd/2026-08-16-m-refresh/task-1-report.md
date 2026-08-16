# Task 1 report — `shared/refresh` (AC-1)

## Files
- Created `src/shared/refresh/index.tsx` (68 lines) — `RefreshProvider`, `useRefreshSignal()`, `useRefresh()`. Implemented verbatim from the plan's Task 1 code block (no deviation).
- Created `src/shared/refresh/__tests__/RefreshProvider.test.tsx` (102 lines) — behavior tests via a tiny harness component (`useRefreshSignal()` rendered as `<Text testID="signal">`, `refreshing` as `<Text testID="refreshing">`, and two pressable `<Text>` buttons wired to `refresh`/`settleActive`).

## Test list (all cite AC-1)
1. `AC-1: refresh() bumps the signal by 1 and sets refreshing true`
2. `AC-1: settleActive() sets refreshing false and cancels the safety timeout`
3. `AC-1: the 8s safety timeout auto-clears refreshing when settleActive never comes`
4. `AC-1: a second refresh() while refreshing is a no-op (signal unchanged)`
5. `AC-1: unwrapped (no RefreshProvider) — signal is 0, refresh/settleActive are safe no-ops`

Ran `npx jest src/shared/refresh` before implementing → suite failed to run (`Cannot find module '../index'`), confirming the red step. After implementing `index.tsx` verbatim from the plan, all 5 tests passed.

## Gate results
- `npm run typecheck` → clean, no errors.
- `npm run lint` → 0 errors, 4 pre-existing warnings in untouched files (`App.tsx`, `src/data/gios/mappers.ts`, `src/shared/ui/HistoryChart.tsx`, `src/shared/ui/Toggle.tsx`) — unrelated to this change.
- `npm test -- --coverage` → 59 suites / 213 tests passed, 0 failed. No coverage-threshold failure emitted. `src/core/*` all at 100/100/100/100. New file `shared/refresh/index.tsx` coverage: 100% statements/functions/lines, 66.66% branches (uncovered branch: the `if (timer.current)` guard inside `clear()` on the already-cleared path, and one arm of `if (refreshingRef.current)` in `settleActive` when called while not refreshing — both are defensive guards exercised implicitly but not asserted as a distinct branch case; no threshold is enforced outside `src/core`, so this doesn't fail the gate).

## Commit
`feat(refresh): RefreshProvider — global signal + refreshing lifecycle (AC-1)`

## Deviations
None from the plan's code block — `index.tsx` is implemented exactly as specified (same types, same `SAFETY_MS = 8000`, same ref-based debounce/timeout logic, same context defaults).

## Fake-timer / act nuances (for later tasks' authors)
- `@testing-library/react-native@14` makes `render()` **and** `fireEvent.press()` return Promises that internally wrap in `act()`. Under `jest.useFakeTimers()`:
  - Calling `fireEvent.press(...)` **without `await`** (the pattern used elsewhere in this repo's suites, which mostly run under real timers) leaves the resulting state update unflushed — the very next synchronous assertion reads stale text. Fixed by `await fireEvent.press(...)` in every case that needs the post-press state.
  - Wrapping an already-async `fireEvent.press(...)` in an outer `await act(() => fireEvent.press(...))` double-wraps and prints `"You seem to have overlapping act() calls"` to console.error (tests still pass, but it's noisy/wrong). Correct pattern: `await fireEvent.press(...)` directly (no extra `act()`), and reserve `act()` for `jest.advanceTimersByTime(...)` calls, which are not promise-returning and need the explicit wrap: `await act(() => jest.advanceTimersByTime(ms))`.
  - For the "no-op when no provider" case, `await expect(fireEvent.press(...)).resolves.not.toThrow()` (sequential awaits) avoids the same overlapping-act warning that two back-to-back un-awaited presses in the same test would trigger.

## Constraints check
- TS strict, no `any` — clean (typecheck green).
- `index.tsx` 68 lines / largest function (`RefreshProvider`) well under 40 lines.
- Imports: `react` only (`createContext`, `useCallback`, `useContext`, `useMemo`, `useRef`, `useState`, `type ReactNode`) — no core/data/feature imports, satisfies one-way boundary (`shared → shared, core` per `.eslintrc.js` boundaries config; this file needs neither).
- Not wired into any hook/screen/App — confirmed via `git status --short`: only `src/shared/refresh/` is new; no other tracked file was modified.
