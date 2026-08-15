# Task 4 — Miejsca: scale/precision on the PlaceRow number

Worktree `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest`, branch `feature/m-settings-wired`.

## Global Constraints
TS strict, no `any`; no-hex features; files ≤200/funcs ≤40; tests cite AC IDs; FULL suite green.

## Consumes (Task 1)
`displayValue` from `../../core/air`; `useSettings` from `../../shared/place`? NO — settings live in `../../shared/settings`. Import `useSettings` from `../../shared/settings`.

## Change
`src/features/miejsca/PlaceRow.tsx`: it currently renders the big number as `{String(reading.index)}` with color `scene(reading.index).key`. Add `const { settings } = useSettings();` and render the big number via `displayValue(reading.index, reading.pm25, settings.scale, settings.precision)` (color UNCHANGED = `scene(reading.index).key`). The band+trend line (spec 013) is unchanged.

## Step 1: update tests
- `src/features/miejsca/__tests__/PlaceRow.test.tsx`: PlaceRow now calls `useSettings` → wrap every render in the real `SettingsProvider` with a fake store (mirror spec-009/Task-3 pattern: `SettingsProvider store={{ load: async()=>DEFAULT_SETTINGS, save: async()=>{} }}`). Add an assertion: under `scale:'µg/m³',precision:'Dokładna'` (reading index 42, pm25 43) the big number renders `displayValue(42,43,'µg/m³','Dokładna')` (='43.0'); color stays `scene(42).key`. Keep the existing tests (they use default CAQI → big number '42' as before).
- `src/features/miejsca/__tests__/MiejscaScreen.test.tsx`: MiejscaScreen renders PlaceRow → now needs `SettingsProvider` in its render wrapper. Add it (fake store, DEFAULT_SETTINGS). Existing assertions (index strings like '4', save/delete) still hold under CAQI defaults.

## Step 2: run → fail. Step 3: implement (PlaceRow useSettings + displayValue). Step 4: gate
`npx jest PlaceRow MiejscaScreen`, then FULL `npm test`, lint, typecheck — all green.

## Step 5: commit
`git add src/features/miejsca && git commit -m "feat(miejsca): scale/precision on place-row number (AC-5, spec 014)"`

## Report → `.superpowers/sdd/2026-08-15-m-settings-wired/task-4-report.md` before final message; confirm existing Miejsca tests pass. Final message: status, SHA, one-line test summary, concerns.
Note: git/npm "Operation not permitted" → retry sandbox disabled.
