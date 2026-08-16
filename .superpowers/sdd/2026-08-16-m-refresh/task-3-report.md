# Task 3 report — RefreshControl on Teraz + Miejsca

## Files

- Modified `src/features/teraz/TerazScreen.tsx` — imported `RefreshControl` from `react-native` and `useRefresh` from `../../shared/refresh`; added `const { refresh, refreshing } = useRefresh();` right after `const { settings } = useSettings();`; passed `refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.text.dim} testID="refresh-control" />}` to the existing `ScrollView`. No other lines touched.
- Modified `src/features/miejsca/MiejscaScreen.tsx` — same shape: `RefreshControl` import, `const { refresh, refreshing } = useRefresh();` after `const { setActive } = useActivePlace();`, same `refreshControl` prop added to the outer `ScrollView` (kept its existing `testID`/`style`/`contentContainerStyle`).
- Extended `src/features/teraz/__tests__/TerazScreen.test.tsx` and `src/features/miejsca/__tests__/MiejscaScreen.test.tsx` (see Test list below).

## Token used

`colors.text.dim` (`src/shared/tokens/index.ts:12`, `'rgba(255,255,255,0.5)'`) — exactly the token the plan named, confirmed it exists before using it. No hard-coded hex introduced.

## An environment quirk that shaped the tests

The RN jest preset's own `RefreshControl` mock (`@react-native/jest-preset/jest/mocks/RefreshControl.js`) renders a bare `<RCTRefreshControl />` and **drops every prop**, including `testID`. Combined with `@testing-library/react-native@14` having removed `UNSAFE_getByType`/`UNSAFE_getByProps` (host-only rendering now), there is no way to query the real `RefreshControl` element or its props from a test. Fix: in each test file, `jest.mock('react-native/Libraries/Components/RefreshControl/RefreshControl', …)` overrides just that one submodule (not the whole `react-native` package) with a stand-in that forwards `testID`, exposes `refreshing` via `accessibilityState.busy`, and wires `onRefresh` to `onPress` on a `View`. Two things had to be gotten right, both now commented in the mock:
1. Must `require('react-native/Libraries/Components/View/View').default` directly rather than `jest.requireActual('react-native')` — the latter creates a circular require back through the very module being mocked (real `react-native/index.js` also imports `RefreshControl` internally), which surfaced as "Element type is invalid" across every test in the file.
2. `react-native/index.js` reads `require(path).default` as a raw property access (no Babel interop), so the mock factory must return `{ __esModule: true, default: RefreshControl }`, not a bare function.

This is scoped per-file (only affects that test file's module registry) and doesn't touch the RN preset globally.

## Test list

`src/features/teraz/__tests__/TerazScreen.test.tsx`
- Wrapped the shared `wrap()` render helper in `<RefreshProvider>` (outermost), which all 5 pre-existing tests now implicitly exercise — no assertions changed, still green.
- New: `AC-5,6 (refresh): ScrollView carries a RefreshControl wired to useRefresh()` — a counting fake source; asserts 1 fetch on mount, `refresh-control`'s `accessibilityState.busy` is `false` before any refresh; `await fireEvent.press(refresh-control)` re-triggers the active place's fetch (2 calls), proving `onRefresh` is `useRefresh().refresh`; `busy` is back to `false` afterward because the active fetch settles within the same `act()` flush and `ActivePlaceProvider`'s `settleActive()` clears it (this is real AC-3/AC-3b behavior from Task 2, not flakiness — verified by instrumenting the mock's renders, which showed `false → true → true → false` across the same synchronous flush).

`src/features/miejsca/__tests__/MiejscaScreen.test.tsx`
- Wrapped `renderScreen()` in `<RefreshProvider>`; also gave it an optional `sourceForPlace` parameter (default `sfp`, the existing fixed fake) so the new test can inject a counting source without duplicating the whole provider tree — a minimal, backward-compatible signature change (all 3 existing call sites keep passing only `store` and are unaffected).
- New: `AC-5,6 (refresh): ScrollView carries a RefreshControl wired to useRefresh()` — counting `SourceForPlace`; mount fetches twice (the pinned location row **and** `ActivePlaceProvider`'s active reading both resolve the location place independently — confirmed via the count, not assumed); `busy` is `false`; `await fireEvent.press(refresh-control)` brings the count to 4, proving the control's `onRefresh` re-triggers both fetches through the shared signal.

Both new tests cite AC-5/AC-6 (the manual sim ACs the control serves) per the task instructions, since there's no dedicated automated AC for "the control exists" — AC-1/2/3 already cover `RefreshProvider`/hook wiring in Tasks 1–2.

## Gate results

- `npm run typecheck` → clean, no errors.
- `npm run lint` → 0 errors, 6 warnings total (4 pre-existing, unrelated to this task's content: `App.tsx` inline-style, `src/data/gios/mappers.ts` eslint-comment, `src/shared/ui/HistoryChart.tsx` and `Toggle.tsx` inline-style). The 2 new warnings are `@react-native/no-deep-imports` on the two test files' `require('react-native/Libraries/Components/View/View')` — expected and necessary for the mock workaround described above; lint exits 0 either way (no `--max-warnings`).
- `npm test` (full suite, no `--coverage`) → **59 test suites, 220 tests, all passed, 0 failures.** (218 pre-existing + 2 new.)

## Existing suites stayed green

Yes — all 218 pre-existing tests across all 59 suites still pass unchanged. Wrapping `TerazScreen`'s and `MiejscaScreen`'s render helpers in `<RefreshProvider>` was additive (the unwrapped-0 default from Task 1 means it wasn't strictly required for `useRefresh()` not to throw, but it makes the new `refresh-control` element real/queryable instead of the always-no-op unwrapped default, which is what the new tests needed).

## Commit

`feat(refresh): pull-to-refresh control on Teraz + Miejsca`

## Deviations

- The plan's literal test-query shape (`screen.getByTestId('refresh-control')` on the real `RefreshControl`, asserting `onRefresh`/`refreshing` props directly) is not achievable as written in this environment — the RN jest preset's mock strips all props from that specific host component, and `@testing-library/react-native@14` removed the `UNSAFE_*` element-type queries that could have bypassed it. Resolved with the per-file submodule mock described above, which still delivers on the plan's intent ("assert the RefreshControl is wired") via a real testID query plus a genuine behavior assertion (refetch triggered on press), rather than a snapshot.
- `MiejscaScreen.test.tsx`'s `renderScreen()` helper gained one optional parameter (`sourceForPlace`, defaulting to the existing `sfp`) — a small, non-breaking extension to avoid duplicating its provider tree for the new test.

## Constraints check

- TS strict, no `any` — clean (typecheck green); the mock's `RefreshControl` prop type is written out explicitly (`{ testID?: string; refreshing: boolean; onRefresh?: () => void }`), no `any`.
- File sizes: `TerazScreen.tsx` 96 lines (was 84), `MiejscaScreen.tsx` 108 lines (was 98) — both ≤200, no function >40 lines. `TerazScreen.test.tsx` 165 lines, `MiejscaScreen.test.tsx` 255 lines — the latter exceeds the 200-line guideline; the repo already has precedent for test files over 200 lines (`ActivePlaceContext.test.tsx` 201, `data/gios/__tests__/detail.test.ts` 242) and no lint rule enforces it. The growth here is almost entirely the necessary, well-commented `jest.mock` workaround (~25 lines) plus one new test; extracting it to a shared helper was considered but rejected — `jest.mock` calls rely on Babel's per-file hoisting, and moving the call into an imported helper function risks silently breaking that hoisting/ordering guarantee for a one-time, two-file duplication that isn't worth the fragility.
- No hard-coded hex — `colors.text.dim` reused as specified.
- Behavior tests, no snapshots; new test names cite AC-5,6.
