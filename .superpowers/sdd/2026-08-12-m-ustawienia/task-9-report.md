# Task 9 report — App.tsx production wiring (SettingsProvider)

## Deviation from the brief (important)
The brief's Step 1 says "FIRST read the existing `App.test.tsx`... it already
renders `<App />`, so any global fetch stub etc. is already in place." In
this worktree, **`App.test.tsx` did not exist** (confirmed via
`git log --all -- App.test.tsx` — zero history, never created or deleted).
So instead of adding a test to an existing file, I created `App.test.tsx`
fresh, matching the conventions of the codebase's other root-composition
test, `src/app/__tests__/AppNavigator.test.tsx`, and the global mocks
already in `jest.setup.js` (gesture-handler, linear-gradient, geolocation,
AsyncStorage, safe-area-context, reanimated — all already stubbed there).

`App.tsx` builds its data-layer instances at module scope using the real
global `fetch` (not an injectable param, unlike the unit-tested sources in
`src/data/gios`), and its `useEffect` calls `fetchStations(fetch)` on mount
for the search list. To keep the render hermetic (no real network calls,
which the sandbox doesn't allow to the GIOŚ API host anyway), I stubbed
`global.fetch` in a `beforeEach` to resolve an empty station list
(`{ 'Lista stacji pomiarowych': [] }`, matching `parseStations`'s expected
shape). Geolocation's mock in `jest.setup.js` is a bare `jest.fn()` that
never resolves or rejects, so `createNearestStationSource`'s
`geo.getCurrentPosition()` call hangs forever without erroring — the
nearest-station fetch path is never reached, which is fine since the test
doesn't wait on any Teraz reading.

## What was done
1. Read `App.tsx` (current provider stack, module-scope instances) and
   confirmed `src/shared/settings/index.tsx` (`SettingsProvider`,
   `useSettings`) and `src/data/settings/index.ts`
   (`createAsyncStorageSettingsStore`) — both already committed (Tasks 2, 7).
   Confirmed `useSettings` throws `'useSettings: wrap the tree in
   <SettingsProvider>'` when uncontexted, and `UstawieniaScreen.tsx` renders
   with `testID="screen-ustawienia"`.
2. Created `App.test.tsx` with the AC-23 test (verbatim structure from the
   brief, `screen.findByTestId('screen-ustawienia')` not `getByText`), plus
   the `global.fetch` stub described above.
3. Verified fail: `npx jest App.test` → failed with exactly the expected
   error, `useSettings: wrap the tree in <SettingsProvider>` (thrown from
   `UstawieniaScreen`), then a secondary `Unable to find an element with
   testID: screen-ustawienia`.
4. Implemented in `App.tsx`:
   - Added imports: `createAsyncStorageSettingsStore` from
     `./src/data/settings`, `SettingsProvider` from `./src/shared/settings`.
   - Added module-scope `const settingsStore = createAsyncStorageSettingsStore();`
     beside `favoritesStore`.
   - Wrapped `<SettingsProvider store={settingsStore}>` just inside
     `FavoritesProvider`, around `ActivePlaceProvider` — exactly as specified.
5. Verified pass: `npx jest App.test` → 1/1 PASS.
6. Ran full suite: `npm test` → 40 suites / 133 tests, all PASS.
7. Ran `npm run lint` → 0 errors, 4 warnings, all pre-existing and unrelated
   to this change (App.tsx's pre-existing `{flex:1}` inline style on the
   `GestureHandlerRootView`, `gios/mappers.ts` dot-notation +
   unused-eslint-disable, `Toggle.tsx` inline style).
8. Ran `npm run typecheck` → 0 errors.
9. Committed.

## Noise observed, judged pre-existing/unrelated
Both `App.test.tsx` and the full suite print a `console.error` — "The
current testing environment is not configured to support act(...)" —
originating from `@react-navigation`'s `PreventRemoveProvider` and from
`usePlaceReading`'s async `setState`. Confirmed this is **not** introduced
by this change: running `AppNavigator.test.tsx` alone (untouched by this
task) reproduces the same warning (6 occurrences). Pre-existing quirk of
react-navigation + this RN/Jest test harness version, not a regression.

## File line count (proof ≤200)
```
 65  App.tsx
 20  App.test.tsx
```

## Full-suite result
```
Test Suites: 40 passed, 40 total
Tests:       133 passed, 133 total
```

## Lint
```
0 errors, 4 warnings (all pre-existing, unrelated — see above)
```

## Typecheck
```
tsc --noEmit → 0 errors
```

## Commit
`4ad8c08` — "feat(app): wire SettingsProvider with AsyncStorage store (AC-23)"
(`App.tsx` modified, `App.test.tsx` created — 2 files changed, 32
insertions, 6 deletions)

## Concerns
- None blocking. The one deviation (creating `App.test.tsx` fresh rather
  than editing an existing file, plus adding the `global.fetch` stub not
  mentioned in the brief) was necessary because the file didn't exist in
  this worktree; it follows the same conventions used elsewhere in the repo
  and doesn't change the AC-23 test's assertions from the brief.
