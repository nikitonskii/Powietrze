# Task 7 — Settings context (SettingsProvider / useSettings) — Report

## Status: DONE

## Commit
`96adc85` — feat(shared): settings context, functional-updater persistence (AC-10..12)

## Files
- Created `src/shared/settings/index.tsx` (58 lines)
- Created `src/shared/settings/__tests__/context.test.tsx` (78 lines)

## Deviations from the brief (and why)

1. **File extension: `index.tsx`, not `index.ts`.**
   The brief's Step 3 code block contains JSX (`<Ctx.Provider>...`) but names
   the target file `index.ts`. TypeScript/ESLint reject JSX syntax in a
   `.ts` file (confirmed by a parsing error: `'>' expected` on the JSX line
   when first written as `.ts`). The existing reference implementation,
   `src/shared/place/FavoritesContext.tsx`, which the brief says to mirror
   exactly, is itself a `.tsx` file. Renamed to `index.tsx` to match; module
   resolution for `import ... from '..'` is unaffected (Jest/TS resolve the
   directory's `index` regardless of `.ts` vs `.tsx`).

2. **Test file adapted for `renderHook`'s real async contract (v14).**
   The brief's literal test snippet calls `renderHook(...)` and
   `act(...)` without `await`. In the installed
   `@testing-library/react-native@14.0.1`, both `renderHook` and `act` are
   `async` and must be awaited — confirmed against the library's own source
   (`node_modules/@testing-library/react-native/dist/render-hook.js`,
   `act.js`) and docs (`docs/api/render-hook.md`), and against the existing
   in-repo pattern in `src/shared/hooks/__tests__/useDebouncedValue.test.ts`
   which already awaits `renderHook`/`act`/`rerender`/`unmount`.
   Without `await`, `renderHook(...)` returns a `Promise`, so destructuring
   `{ result }` from it is `undefined` → `Cannot read properties of
   undefined (reading 'current')`.

   A second, subtler consequence: `await renderHook(...)` uses React's
   `act` internally, which flushes pending effects **and** microtasks until
   settled. With a fake store whose `load()` resolves synchronously
   (`async () => initial`), hydration was *already complete* by the time
   `await renderHook(...)` returned — so the brief's "assert
   pre-hydration state, then `waitFor` post-hydration" sequence for AC-10
   could never observe a pre-hydration state; the first assertion would
   fail (or, depending on the exact fake, immediately show the hydrated
   value). I fixed this the same way the library's own docs handle an
   analogous case (their Suspense example): AC-10 now uses a *manually
   deferred* `load()` promise (`resolveLoad` captured, resolved later
   under `act`), which gives a real, observable pre/post-hydration
   transition instead of relying on synchronous-promise microtask timing.

   AC-11 and AC-12 wrap the `set(...)` calls in `await act(...)` instead
   of bare `act(...)`, per the same requirement. Since `act` now properly
   flushes the `store.save()` promise before returning, the `waitFor`
   wrapper around the `saved.at(-1)` assertion in those two tests was
   no longer necessary and was simplified to a direct `expect`.

   None of this changes what is being verified — AC-10/11/12 assert
   exactly what the brief specifies (pre-hydration default → hydrated
   value; state update + persisted full settings; composing successive
   `set` calls under the functional updater). Only the mechanics of
   driving async React under RTL v14 changed.

3. **Implementation code is unchanged from the brief's Step 3** except for
   the file extension. In particular the key correctness requirement was
   preserved verbatim: `set` uses `setSettings(prev => { const next =
   {...prev, [key]: val}; store.save(next); return next; })` — no
   `settings` captured from closure, so successive `set` calls in the same
   `act` batch compose correctly (AC-12).

## Verification
- `npx jest src/shared/settings` → **3/3 PASS**
  - AC-10: starts at DEFAULT_SETTINGS then hydrates from store
  - AC-11: set updates state and persists the full settings
  - AC-12: successive set calls compose (functional updater)
- `npm run typecheck` → 0 errors
- `npm run lint` → 0 errors, 4 pre-existing warnings unrelated to this
  change (`App.tsx` inline style, `src/data/gios/mappers.ts` dot-notation
  and an unused eslint-disable comment, `src/shared/ui/Toggle.tsx` inline
  style) — none touched by this task.
- File sizes: `index.tsx` 58 lines, `context.test.tsx` 78 lines — both well
  under the 200-line cap; `SettingsProvider`/`set`/`useSettings` are all
  small, single-purpose functions well under 40 lines.
- Layering: `src/shared/settings` imports only from `../../core/settings`
  (`DEFAULT_SETTINGS`, `Settings`, `SettingsStore`) and `react`. No
  cross-feature or reverse-direction imports.

## Concerns
- None blocking. The two deviations above are corrections to
  brief inaccuracies (wrong extension; pre-v14 async API assumptions in
  the literal test snippet), not scope changes — the produced API surface
  (`SettingsProvider`, `useSettings`, `SettingsApi`) matches the brief
  exactly and is what Tasks 8/9 expect to consume.
