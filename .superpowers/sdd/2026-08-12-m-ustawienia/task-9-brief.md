# Task 9 — App.tsx production wiring (SettingsProvider)

Work in worktree `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest` on branch `feature/m-ustawienia`.

## Global Constraints
- TypeScript strict; no unjustified `any`. Files ≤200, functions ≤40. Test names cite AC IDs. No new dependency.

## Goal (AC-23)
Wire the real settings store into the app so `useSettings()` has a provider in production — otherwise the live app crashes on the Ustawienia tab even though injected-fake tests pass. This is the "green tests, crashing app" guard.

## Consumes (committed)
- `createAsyncStorageSettingsStore` from `./src/data/settings` (Task 2).
- `SettingsProvider` from `./src/shared/settings` (Task 7).

## Files
- Modify: `App.tsx`
- Modify: `App.test.tsx` (add the AC-23 test)

## Current App.tsx (for reference)
Module scope already builds `nearest`, `sourceForPlace`, `favoritesStore`. The provider stack (inside `<GestureHandlerRootView style={{ flex: 1 }}>`) is:
`StationsProvider → PlaceSourceProvider → FavoritesProvider → ActivePlaceProvider → SafeAreaProvider → StatusBar + AppNavigator`.

## Step 1: Write the failing test — add to `App.test.tsx`
First READ the existing `App.test.tsx` to match its imports/setup (it already renders `<App />`, so any global fetch stub etc. is already in place). Add this test (adapt imports to the file's existing style — `render`, `screen`, `fireEvent` from `@testing-library/react-native`):
```tsx
test('AC-23: App wires SettingsProvider — Ustawienia renders without throwing', async () => {
  await render(<App />);
  fireEvent.press(screen.getByTestId('tab-Ustawienia'));
  expect(await screen.findByTestId('screen-ustawienia')).toBeTruthy();
});
```
Note: assert `screen-ustawienia` (the ScrollView testID), NOT `getByText('Ustawienia')` — the text appears twice (tab label + header). If the existing App.test uses `beforeEach`/mocks, keep using them; do not duplicate global setup.

## Step 2: Run to verify fail
`npx jest App.test` → the new test FAILS with `useSettings: wrap the tree in <SettingsProvider>` (because App.tsx has no provider yet).

## Step 3: Implement in `App.tsx`
1. Add imports:
   ```ts
   import { createAsyncStorageSettingsStore } from './src/data/settings';
   import { SettingsProvider } from './src/shared/settings';
   ```
2. Add a module-scope instance beside `favoritesStore`:
   ```ts
   const settingsStore = createAsyncStorageSettingsStore();
   ```
3. Wrap the tree with `<SettingsProvider store={settingsStore}>` — place it just inside `FavoritesProvider`, around `ActivePlaceProvider` (so AppNavigator, which mounts UstawieniaScreen, is inside it):
   ```tsx
   <FavoritesProvider store={favoritesStore}>
     <SettingsProvider store={settingsStore}>
       <ActivePlaceProvider>
         ...
       </ActivePlaceProvider>
     </SettingsProvider>
   </FavoritesProvider>
   ```

## Step 4: Verify pass + gate
`npx jest App.test` → PASS. Then FULL suite `npm test` (all green), `npm run lint` (0), `npm run typecheck` (0).

## Step 5: Commit
`git add App.tsx App.test.tsx && git commit -m "feat(app): wire SettingsProvider with AsyncStorage store (AC-23)"`

## Report
Write your full report to `.superpowers/sdd/2026-08-12-m-ustawienia/task-9-report.md` BEFORE your final message. Final message: status, commit SHA, one-line test summary, concerns.

Note: if any git/npm command fails with "Operation not permitted" (sandbox), retry with the sandbox disabled.
