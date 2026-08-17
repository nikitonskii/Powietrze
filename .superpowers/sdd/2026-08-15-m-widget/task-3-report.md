# Task 3 report — Data adapter + App wiring (AC-4)

## Files
- Created: `src/data/widget/index.ts` (26 lines) — `createNativeWidgetSync(): WidgetSync`.
- Created: `src/data/widget/__tests__/nativeSync.test.ts` (44 lines) — 2 tests, both cite AC-4.
- Modified: `App.tsx` — import `createNativeWidgetSync` (data) + `WidgetSyncProvider` (shared),
  build `const widgetSync = createNativeWidgetSync();` beside the other data-layer instances,
  mount `<WidgetSyncProvider sync={widgetSync}>` in the provider tree.

## Implementation notes
`src/data/widget/index.ts` matches the plan's Step 3 code block, with one deliberate addition:
a locally-scoped `NativeWidgetSyncModule` interface (`{ writeSnapshot(json: string): void;
reloadTimelines(): void }`) instead of casting through `any`. `NativeModules.WidgetSync` is
typed as `NativeWidgetSyncModule | undefined` via a single `as` cast on the untyped
`NativeModules` lookup — the CLAUDE.md constitution forbids unjustified `any`; this satisfies
the same contract (module absent → `undefined`, `mod` narrows in the `if (!mod) return;` guard)
with a real interface instead. No `any` appears anywhere in the file.

## App.tsx exact placement
Read the current provider tree first (`ActivePlaceProvider` was the innermost provider,
directly wrapping `SafeAreaProvider`/`AppNavigator`, itself nested under `SettingsProvider` and
`NotificationsProvider`). Inserted `WidgetSyncProvider` as the sole child of `ActivePlaceProvider`,
wrapping `SafeAreaProvider`:

```tsx
<ActivePlaceProvider defaultStation={KRAKOW_STATION}>
  <WidgetSyncProvider sync={widgetSync}>
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <AppNavigator />
    </SafeAreaProvider>
  </WidgetSyncProvider>
</ActivePlaceProvider>
```

This satisfies both requirements: inside `ActivePlaceProvider` (so `useActivePlace()` resolves)
and under `SettingsProvider` (so `useSettings()` resolves), wrapping `SafeAreaProvider`/
`AppNavigator`. `widgetSync` is built once at module scope (`const widgetSync =
createNativeWidgetSync();`) alongside `nearest`, `favoritesStore`, `settingsStore`, `notifier` —
matching the existing "data-layer instances built once and injected" comment/pattern.

## Test list (both cite AC-4, `src/data/widget/__tests__/nativeSync.test.ts`)
1. `AC-4: native module absent → publish is a safe no-op` — deletes
   `NativeModules.WidgetSync`, asserts `createNativeWidgetSync().publish(SNAP)` does not throw.
2. `AC-4: module present → writeSnapshot(json) then reloadTimelines` — installs a fake
   `{ writeSnapshot: jest.fn(), reloadTimelines: jest.fn() }` on `NativeModules.WidgetSync`,
   asserts `writeSnapshot` is called with `JSON.stringify(SNAP)` and `reloadTimelines` is called.

`NativeModules.WidgetSync` is reset in an `afterEach` (`delete nativeModules.WidgetSync`), and
the no-op test also deletes it defensively at the top of its own body — both tests are
independent of run order.

### TDD sequence followed
1. Wrote the test file first against a non-existent `src/data/widget` module.
2. Ran `npx jest src/data/widget` → failed with `Cannot find module '..'` (confirmed red).
3. Implemented `src/data/widget/index.ts`.
4. Re-ran `npx jest src/data/widget` → both tests green.

## Gate results (all fresh, run from worktree root)
- `npm run typecheck` → clean, no output/errors.
- `npm run lint` → `0 errors, 4 warnings`; all 4 are pre-existing warnings in files unrelated to
  this task's logic (`App.tsx:52` inline `{ flex: 1 }` style — present before this change,
  `src/data/gios/mappers.ts`, `src/shared/ui/HistoryChart.tsx`, `src/shared/ui/Toggle.tsx`). No
  new lint errors or warnings introduced by Task 3's files.
- `npm test` (plain `jest`, full suite) → **58 suites passed / 208 tests passed**, 0 failed;
  `./App.test.tsx` renders green with the new provider mounted.
- `npx jest --coverage` (extra check, since the plan's gate calls for `src/core` staying 100%) →
  same 58/208 pass, no coverage-threshold failure; `core/widget/index.ts` reports 100/100/100/100;
  every other `src/core/*` module also reports 100/100/100/100. `src/data/widget/index.ts` and
  `src/shared/widget/index.tsx` are outside the enforced-100% scope (`./src/core/` only) and are
  well covered anyway (widget data adapter fully exercised by both branches; shared/widget at
  92.3%/83.33% statements/branches, unchanged from Task 2 — not touched by Task 3).

## Deviations from the plan's sketch
- `src/data/widget/index.ts`: identical logic to the plan's Step 3 block; only difference is the
  named `NativeWidgetSyncModule` interface replacing the plan's inline anonymous type — purely a
  style choice to keep the type declaration self-documenting, no behavior change.
- `src/data/widget/__tests__/nativeSync.test.ts`: same two cases as the plan's sketch, but typed
  without `any` — `SNAP` is declared as a real `WidgetSnapshot`, and `NativeModules` is narrowed
  via a local `NativeModulesRecord = Record<string, unknown>` cast (module-level, one cast site)
  instead of `(NativeModules as any).WidgetSync` at each call site. Also added an `afterEach`
  cleanup (`delete nativeModules.WidgetSync`) not in the plan's sketch, so the two tests don't
  depend on execution order (the sketch's first test deletes it inline; the second overwrites it
  without ever removing it again — the `afterEach` closes that gap defensively).
- App.tsx wiring matches the plan/spec exactly — no deviation.

## Commit
`feat(widget): native WidgetSync adapter + App wiring (AC-4)` — `30d65b8`.

## Native gate note
Per the task boundary, no native/Swift/Xcode work was touched — `NativeModules.WidgetSync` does
not exist yet at runtime (Task 4, paused for the human), so `createNativeWidgetSync().publish(...)`
is currently always the no-op path in the running app, which is the intended safe state until
Task 4 lands.
