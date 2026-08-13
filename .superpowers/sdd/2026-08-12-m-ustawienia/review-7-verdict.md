# Task 7 Review — SettingsProvider / useSettings

**SPEC: ✅**
**QUALITY: APPROVE**

## AC-10/11/12 checks

- **AC-11** (`src/shared/settings/index.tsx:37-48`): `set` calls `setSettings(prev => { const next = {...prev, [key]: val}; store.save(next); return next; })` — updates state and persists the full `next` object (not a partial). Test asserts `saved.at(-1)` equals the full merged settings. Correct.

- **AC-12**: Verified this is a real guard, not a tautology. In the test, both `set('alert', false)` and `set('morning', true)` execute synchronously inside one `act(() => {...})`, so there is no re-render between them — the `set` closure captured at that render is called twice. Because `set` uses the functional-updater form, React threads `prev` through both queued updates correctly (first updater sees `DEFAULT_SETTINGS`, second sees the first's output), so the final state has both `alert:false` and `morning:true`.
  If someone reverted to closure capture (`setSettings({ ...settings, [key]: val })`, closing over the outer `settings` var), both calls in the batch would close over the *same* pre-batch `settings` value (no re-render occurred between them), so the second `setSettings` call would overwrite the first's result entirely — final state would only have `morning:true`, and `alert` would remain the pre-batch value (`true`, not `false`). `expect(result.current.settings.alert).toBe(false)` would fail. Confirmed this test is a genuine regression guard for the functional-updater requirement.

- **AC-10**: The deferred-load rewrite is legitimate, not a weakening.
  - Confirmed from `node_modules/@testing-library/react-native/dist/render-hook.js`: `renderHook` is `async function renderHook(...)` internally `await`s `render(...)`, which flushes effects and pending microtasks (`act`) before resolving. With the brief's literal synchronous fake (`load: async () => initial`), `await renderHook(...)` would already flush the `.then(s => setSettings(s))` microtask before returning `{ result }` — so the brief's own snippet's "assert DEFAULT_SETTINGS, then waitFor hydrated" sequence could never observe a real pre-hydration state under RTL v14's async contract. This is a genuine incompatibility between the brief's literal snippet and the installed library version, not an invented excuse.
  - The rewritten test uses a manually-deferred `Promise<Settings>` (`resolveLoad` captured, unresolved at mount). At the point `await renderHook(...)` returns, `store.load()` has been called but its promise is still pending — the effect's `.then` has nothing to flush yet — so `result.current.settings` genuinely still equals `DEFAULT_SETTINGS`. This assertion is a real observation of pre-hydration state, not fabricated.
  - Then `await act(() => resolveLoad({ ...DEFAULT_SETTINGS, alert: false }))` resolves the promise under `act`, which flushes the `.then(s => setSettings(s))` callback, and the second assertion (`result.current.settings.alert === false`) genuinely observes the post-hydration state.
  - The test still exercises exactly what AC-10 requires: initial render uses `DEFAULT_SETTINGS` (from `useState<Settings>(DEFAULT_SETTINGS)`), and the effect's `store.load().then(...)` call is what transitions state once the store resolves. It would fail if the initial state weren't `DEFAULT_SETTINGS`, or if the effect never wired `setSettings` to the load result. Legitimate, non-trivialized guard.

**Ruling: The AC-10 deferred-promise rewrite is sound — it is a necessary adaptation to RTL v14's async `renderHook`/`act` contract (verified against the installed library's source), and it still asserts a real pre-hydration → post-hydration transition rather than trivializing the check.**

## Deviations

1. **`index.tsx` vs `index.ts`**: Legitimate. The brief's own Step 3 code block contains JSX, which cannot parse in a `.ts` file — this is an error in the brief, not a shortcut by the implementer. `FavoritesContext.tsx` (the file the brief says to mirror) is itself `.tsx`. Import resolution is unaffected: `src/shared/place/FavoritesContext.tsx` is already imported elsewhere via bare specifiers (through `src/shared/place/index.ts`) with the RN/Metro-style resolver (`@react-native/jest-preset`) that resolves `index.tsx` same as `index.ts`; `import ... from '..'` in `context.test.tsx` resolves to `src/shared/settings/index.tsx` the same way. No issue.

2. **`await renderHook`/`await act`**: Confirmed correct against `node_modules/@testing-library/react-native/dist/render-hook.js` (`async function renderHook`) and `act.js`. Consistent with the existing in-repo pattern in `src/shared/hooks/__tests__/useDebouncedValue.test.ts`, which already awaits `renderHook`/`act`/`rerender`/`unmount`. Not an invented convention.

## Quality

- Mirrors `src/shared/place/FavoritesContext.tsx` structure exactly: `useEffect` load with `on`-flag unmount guard, `useMemo` value with matching deps pattern (`[settings, store]` vs Favorites' `[favorites, store]`), `useContext` + throw-outside-provider with the same message convention (`'useSettings: wrap the tree in <SettingsProvider>'` mirrors `'useFavorites: wrap the tree in <FavoritesProvider>'`).
- `children: React.ReactNode` in the test file's `Wrapper` uses `React.ReactNode` without an explicit `import React from 'react'`. Checked this against `src/features/miejsca/__tests__/PlaceRow.test.tsx:34`, which already does the same thing and typechecks in this codebase (project's TS/JSX config permits bare `React.*` type references without a default import) — pre-existing pattern, not a new risk.
- No stale-closure, missing-dep, or setState-after-unmount bugs found. `store.save(next)` is fire-and-forget (no `await`/`.catch`), matching the exact same pattern already accepted in `FavoritesContext.tsx`.
- File sizes: `index.tsx` is 58 lines (confirmed via `wc -l`), well under the 200-line cap; all functions are small and single-purpose, well under 40 lines.
- Layering: imports only from `react` and `../../core/settings` — correct direction, no cross-feature imports, no new dependency.
- No dead code.

## Findings

None — clean.

verdict written
