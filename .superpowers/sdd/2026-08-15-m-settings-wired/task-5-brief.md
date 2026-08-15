# Task 5 — ActivePlaceProvider: default station + loc reset; App.tsx wiring

Worktree `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest`, branch `feature/m-settings-wired`.

## Global Constraints
TS strict, no `any`; files ≤200/funcs ≤40; tests cite AC IDs; FULL suite green; layering shared→core, App may import data.

## Consumes
`defaultPlace` + `LOCATION_PLACE` from `../../core/places` (Task 2); `useSettings` from `../settings`; `KRAKOW_STATION` from `./src/data/gios` (App only).

## Change — `src/shared/place/ActivePlaceContext.tsx`
- Add prop `defaultStation?: Station` (OPTIONAL — keeps existing consumer tests that render `<ActivePlaceProvider>` bare working).
- `const { settings } = useSettings();`
- Compute the target default place:
  ```ts
  const target = defaultStation ? defaultPlace(settings.loc, defaultStation) : LOCATION_PLACE;
  ```
  (When no defaultStation is provided, behave exactly as before: always LOCATION_PLACE.)
- Initialize `useState(() => target)`; add a reset effect keyed ONLY on `[settings.loc, defaultStation]`:
  ```ts
  useEffect(() => { setActive(target); /* eslint-disable-next-line react-hooks/exhaustive-deps -- reset default on loc change */ }, [settings.loc, defaultStation]);
  ```
  (Do NOT depend on `target` — it's a fresh object each render and would loop.)
- Keep `setActive` exposed so the user can still pick places.

## Change — `App.tsx`
- Pass `defaultStation={KRAKOW_STATION}` to `<ActivePlaceProvider>` (import KRAKOW_STATION from `./src/data/gios`). App is the composition root and already imports `./src/data/gios`.

## Step 1: update/failing tests — `src/shared/place/__tests__/ActivePlaceContext.test.tsx`
- ActivePlaceProvider now calls `useSettings()` → wrap EVERY render in a real `SettingsProvider` with a fake store. Helper:
  ```ts
  import { SettingsProvider } from '../SettingsContext'; // or wherever exported: '../../shared/settings' equivalent — use the same import the app uses: `../` path for shared/place is sibling; SettingsProvider is at 'src/shared/settings' → import { SettingsProvider } from '../../settings';
  import { DEFAULT_SETTINGS, type Settings, type SettingsStore } from '../../../core/settings';
  const store = (s: Settings = DEFAULT_SETTINGS): SettingsStore => ({ load: async () => s, save: async () => {} });
  ```
  (Verify the correct import path for `SettingsProvider` from `src/shared/place/__tests__/` — it's `../../settings`.)
- Existing "AC 006-6: defaults to location" test: keep rendering WITHOUT `defaultStation` but ADD the `SettingsProvider` wrapper (default loc:true, no defaultStation → LOCATION_PLACE) — assertion unchanged.
- Add **AC-6** tests:
  - With `defaultStation={warsaw}` (reuse the `warsaw` Station) + store loc:false → active is `{kind:'station', station: warsaw}` (assert `station:Warszawa:42` via the Probe, or the active.kind).
  - With `defaultStation={warsaw}` + store loc:true → active is location (`location:Kraków:4`).
  - loc reset: a Probe with a button calling `useSettings().set('loc', false)`; start loc:true+defaultStation → location; press → active resets to the warsaw station default. (Assert the reading/kind flips.)

## Step 2: run → fail. Step 3: implement (provider + App.tsx). Step 4: gate
`npx jest src/shared/place`, then FULL `npm test` (AppNavigator/TerazScreen/MiejscaScreen tests render ActivePlaceProvider — they already have SettingsProvider ancestors from Tasks 3/4 and spec-009; confirm green), `npm run lint`, `npm run typecheck`.

## Step 5: commit
`git add src/shared/place App.tsx && git commit -m "feat(place): loc setting drives the default place (AC-6, spec 014)"`

## Report → `.superpowers/sdd/2026-08-15-m-settings-wired/task-5-report.md`; confirm all consumer tests (AppNavigator/Teraz/Miejsca) still pass. Final message: status, SHA, one-line test summary, concerns.
Note: git/npm "Operation not permitted" → retry sandbox disabled.
