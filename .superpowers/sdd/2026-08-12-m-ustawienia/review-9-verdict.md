# Review 9 verdict — App.tsx production wiring (SettingsProvider, AC-23)

SPEC: ✅
QUALITY: APPROVE

## AC-23 checks
- **Provider encloses AppNavigator, not a sibling.** Confirmed by diff nesting:
  `FavoritesProvider → SettingsProvider → ActivePlaceProvider → SafeAreaProvider →
  StatusBar + AppNavigator`. `settingsStore = createAsyncStorageSettingsStore()` is
  built at module scope (line 27, beside `favoritesStore`), not inside the `App()`
  function body — not re-created on render.
- **Test genuinely exercises production wiring.** `App.test.tsx` renders the real
  `<App />` (no injected fakes), presses `tab-Ustawienia` (testID confirmed at
  `src/app/TabBar.tsx:23`, `` testID={`tab-${route.name}`} ``), and asserts
  `findByTestId('screen-ustawienia')` (confirmed at
  `src/features/ustawienia/UstawieniaScreen.tsx:164`). `useSettings()`
  (`src/shared/settings/index.tsx`) throws `'useSettings: wrap the tree in
  <SettingsProvider>'` when uncontexted — report's fail-run transcript reproduces
  exactly this error pre-fix. Test is not neutered: it would fail without the
  `App.tsx` change. StatusBar/SafeAreaProvider relative order is untouched — the
  diff only inserts `SettingsProvider` as a new wrapper around the existing
  `ActivePlaceProvider` subtree.

## Deviation checks (App.test.tsx creation + fetch stub)
- `git log --all -- App.test.tsx` in this worktree shows no prior history —
  the implementer's claim that the file didn't exist is consistent with what's
  in the diff (new file, not a modification).
- Fetch stub shape: `{ 'Lista stacji pomiarowych': [] }` matches
  `STATIONS_KEY = 'Lista stacji pomiarowych'` in `src/data/gios/stations.ts:6`,
  exactly what `parseStations` reads (`findAllJson?.[STATIONS_KEY]`). Correct
  shape, resolves to `[]` cleanly — not masking a real failure, just avoiding a
  live network call `App.tsx`'s module-scope `fetchStations(fetch)` would
  otherwise make on mount (sandbox has no route to the GIOŚ host anyway).
- `jest.setup.js` mocks gesture-handler, linear-gradient, geolocation,
  AsyncStorage, safe-area-context, reanimated — no existing `global.fetch`
  mock. No duplication/conflict with the new file's `beforeEach` stub.
- No `afterEach`/`jest.restoreAllMocks()` to reset `global.fetch`. In isolation
  this is a latent tidiness gap, but not a real leak risk: Jest gives each test
  file (`App.test.tsx`) its own module registry and global object by default,
  so a `global.fetch` reassignment here cannot bleed into other suites' test
  files. Only the two tests within this same file would ever be affected, and
  there is only one test in the file. No fix required.

## Quality / constraints
- TS strict: `global.fetch = jest.fn(...) as unknown as typeof fetch` is a
  reasonable narrow cast for a test double, no bare `any`.
- No new dependency; layering intact (App.tsx is the composition root, already
  imports both data and shared layers pre-existing this task).
- File sizes: `App.tsx` 65 lines, `App.test.tsx` 21 lines — both well under 200.
- No real bugs found: provider nesting correct, store at module scope, no
  StatusBar/SafeAreaProvider reordering.

## Deviation ruling
The fetch stub is a legitimate test-hermeticity measure with the exact shape
`parseStations` expects, and creating `App.test.tsx` fresh (rather than editing
a nonexistent file) was the only viable path once the brief's premise (file
already exists) didn't hold in this worktree; no `afterEach` cleanup exists but
Jest's per-file isolation makes cross-suite leakage a non-issue — no blocking
concern, approve as-is.

verdict written
