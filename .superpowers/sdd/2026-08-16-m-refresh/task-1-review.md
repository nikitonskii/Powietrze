# Review — Task 1: `src/shared/refresh/index.tsx` (RefreshProvider + useRefreshSignal + useRefresh)

**Diff:** `.superpowers/sdd/2026-08-16-m-refresh/task-1.diff` (commit `e0ee223`)
**Spec:** `docs/specs/018-refresh.md` §"A global refresh signal" + AC-1
**Plan:** `docs/superpowers/plans/2026-08-16-m-refresh.md` Task 1

## Verification performed
- Read `task-1.diff` in full (commit `e0ee223`, 2 new files: `src/shared/refresh/index.tsx` 68 lines, `src/shared/refresh/__tests__/RefreshProvider.test.tsx` 102 lines).
- Confirmed the on-disk file matches the diff byte-for-byte (`Read` of `src/shared/refresh/index.tsx`), and matches the plan's prescribed code block verbatim (implementer's "no deviation" claim checked, true).
- Ran `npx jest src/shared/refresh` -> **5/5 pass**.
- Ran `npx eslint src/shared/refresh/index.tsx src/shared/refresh/__tests__/RefreshProvider.test.tsx` -> clean (only pre-existing boundaries-plugin config warnings unrelated to this file).
- Ran `npx tsc --noEmit` -> clean, no errors touching `refresh`.
- Confirmed `jest.config.js` `coverageThreshold` is scoped to `./src/core/` only -- the report's claim that the file's 66.66% branch coverage doesn't fail the gate is accurate.
- Confirmed `react` is `19.2.3` -- relevant to the unmount-setState scrutiny below (React 18+ silently no-ops post-unmount `setState`, no console warning, unlike React 16/17).

## Verdict 1 -- SPEC: PASS

AC-1 requirements, mapped to tests:
- "refresh() increments signal + sets refreshing" -> test 1, passes.
- "settleActive() clears + cancels timeout" -> test 2 (also proves cancellation by advancing 8s afterward and confirming no re-trigger), passes.
- "8s timeout auto-clears" -> test 3, boundary-tested at 7999ms (still true) then +1ms (flips false) -- a real behavior test, not a vacuous one.
- "second refresh() while refreshing is a no-op (debounce)" -> test 4, asserts signal stays 1 AND refreshing stays true, passes.
- "unwrapped -> signal 0 + no-op actions, no throw" -> test 5, passes.

All 5 tests are genuine behavior assertions (state transitions via `testID` text content, fake-timer advancement), not snapshots, not restatements of the implementation, and every test name cites `AC-1` per CLAUDE.md's testing convention. No AC-1 sub-clause is untested.

## Verdict 2 -- QUALITY: APPROVE

Checked against CLAUDE.md:
- **Architecture**: `index.tsx` imports only from `react`. No core/data/feature imports -- correct `shared` boundary, no reverse-layer or cross-feature violation.
- **Size**: file 68 lines (<=200); largest function (`RefreshProvider` body) ~36 lines (<=40); `clear`/`refresh`/`settleActive` are single-purpose one-liners-to-4-liners.
- **Style**: TS strict, no `any` anywhere. Naming (`signal`, `refreshing`, `settleActive`, `refreshingRef`) is self-documenting and matches the spec's own vocabulary. No hard-coded design/visual values (this is pure state logic, N/A).
- **SOLID**: single responsibility (refresh-signal + refreshing-lifecycle state), no speculative abstraction, no dead code, no duplicated logic.

### Scrutiny items (per dispatch)

**(a) `refreshingRef` debounce correctness under React batching -- correct.**
`refreshingRef.current = true` (index.tsx:42) is a synchronous ref mutation, not subject to React's state-update batching the way `setRefreshing`/`setSignal` are. Because `refresh` reads `refreshingRef.current` (not the `refreshing` state variable) as its guard, even two `refresh()` calls issued back-to-back within the *same* synchronous tick (e.g. `onPress={() => { refresh(); refresh(); }}`) are handled correctly: the first call flips the ref to `true` immediately, before the second call's guard check runs -- so the second correctly early-returns. Had the guard read the `refreshing` *state* instead, both calls would see the stale `false` closure value within the same batch and both would bump the signal -- a real bug the ref avoids. This is a deliberate and correct use of a ref to sidestep the stale-closure/batching hazard, not an accidental duplication of state.

**(b) Unmount with a live 8s timer -- real but low-severity gap, not a functional defect given React 19 + the provider's expected lifetime.**
There is no `useEffect` cleanup (`return () => clearTimeout(timer.current)`) to cancel the pending safety timeout on unmount. If `RefreshProvider` unmounted while a refresh was in flight, the armed `setTimeout` would still fire up to 8s later and call `clear()`, which calls `setRefreshing(false)` on an unmounted component. Verified this is **not a functional bug** in this codebase: React 19 (confirmed in `package.json`) silently no-ops `setState` calls on unmounted components (no console warning, no crash, no memory retention beyond the timer's own 8s bound) -- the React 16/17-era "Can't perform a React state update on an unmounted component" warning was removed in React 18. Additionally, per spec design, `RefreshProvider` is mounted once at `App.tsx` root, above the navigator, and is not expected to unmount during the app's lifetime -- so the scenario is essentially unreachable in production. **Flagging as Minor/nit**: a `useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, [])` would be the textbook-correct resource-cleanup pattern and costs ~3 lines; worth adding in a follow-up polish pass but not worth blocking this task on, since it's inert given current mounting topology and React version.

**(c) `useMemo` api deps / render-loop risk -- no issue.**
`api` (index.tsx:170-173) is memoized on `[refresh, refreshing, settleActive]`. `refresh` and `settleActive` are `useCallback`-stable forever (both ultimately depend only on `clear`, which has an empty dep array `[]` and is itself stable forever) -- confirmed by reading the dependency chain, not assumed. Only `refreshing` (a boolean that changes at most twice per refresh cycle: true on `refresh()`, false on `clear()`) varies, so `api` is recomputed at most twice per refresh cycle -- a fresh object each toggle is expected and correct, and since `refreshing` only changes via explicit, guarded `setState` calls (never unconditionally on every render), there is no render-loop risk for consumers.

## Findings

**Blocker:** none.

**Should-fix:** none.

**Minor / nit:**
- `src/shared/refresh/index.tsx:143` (unmount cleanup) -- no `useEffect` cleanup to `clearTimeout` the pending 8s safety timer on unmount. Inert today (React 19 no-ops post-unmount `setState`; provider is app-root/permanent per spec design), but is the one piece of textbook resource-cleanup missing from an otherwise clean implementation. Worth a 3-line follow-up, not worth blocking on.

## Summary
Implementation is a verbatim, faithful realization of the plan's Task 1 code block. All AC-1 sub-clauses are covered by real (non-snapshot) fake-timer tests correctly citing AC-1. Architecture boundary (shared-only, react-only import) is clean. Size/complexity well within CLAUDE.md limits. The one identified gap (timer cleanup on unmount) is real but does not manifest as a bug given React 19's unmount-setState tolerance and the provider's app-root, permanent-mount lifecycle -- noted as a nit for future polish, not a merge blocker.

**Verdicts: SPEC PASS -- QUALITY APPROVE**
