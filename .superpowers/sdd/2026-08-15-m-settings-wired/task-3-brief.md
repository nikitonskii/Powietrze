# Task 3 — Teraz: scale/precision drive the hero number + tiles

Worktree `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest`, branch `feature/m-settings-wired`.

## Global Constraints
TS strict, no `any`. Files ≤200, funcs ≤40. Test names cite AC IDs. No-hex in features/shared-ui. No new dep. **The FULL suite must stay green.**

## Consumes (Task 1, committed)
`displayValue`, `formatConcentration`, `scaleLabel` from `../../core/air`; `useSettings` from `../../shared/settings`.

## Design (S4): settings are read in `TerazScreen`, passed as strings to `Hero`/`PollutantTiles` (kept PURE).

## Files + changes
### `src/features/teraz/Hero.tsx`
- Remove the `pm25?: number` prop. Add: `value: string`, `pm25Label: string | null`, `scaleCaption: string`.
- Big number: render `{value}` (was `{String(place.index)}`). Color stays `scene.key`.
- Replace the `PM2.5 · … µg/m³` line with: render `<Text variant="pm" …>{pm25Label}</Text>` ONLY when `pm25Label` is non-null.
- Add a scale caption: right after the `NumberGlow` (before the band), render `{scaleCaption ? <Text variant="station" color={colors.text.dim} style={styles.caption}>{scaleCaption}</Text> : null}` (add `caption: { marginTop: 2 }`).
- `place.index` is no longer used for the number (fine to leave `Place.index` in the interface).

### `src/shared/ui/PollutantTiles.tsx`
- Add `precision: Precision` (import `type { Precision }` from `../../core/settings`) to `PollutantTiles` and thread to `Tile`.
- `Tile`: render `value === undefined ? '—' : formatConcentration(value, precision)` (import `formatConcentration` from `../../core/air`).

### `src/features/teraz/TerazScreen.tsx`
- `import { displayValue, formatConcentration, scaleLabel } from '../../core/air';` and `import { useSettings } from '../../shared/settings';`
- `const { settings } = useSettings();`
- Compute:
  ```ts
  const value = displayValue(reading.index, reading.pm25, settings.scale, settings.precision);
  const pm25Label = settings.scale === 'µg/m³'
    ? null
    : `PM2.5 · ${formatConcentration(reading.pm25, settings.precision)} µg/m³`;
  const scaleCaption = scaleLabel(settings.scale);
  ```
- Pass to Hero: `value={value} pm25Label={pm25Label} scaleCaption={scaleCaption}` (drop `pm25`).
- Pass `precision={settings.precision}` to `<PollutantTiles … />`.

## Step 1: update/failing tests
### `src/features/teraz/__tests__/Hero.test.tsx`
Update the render calls to the new props. Example assertions:
```ts
// CAQI-style
render(<Hero scene={scene(118)} place={place} value="118" pm25Label="PM2.5 · 122 µg/m³" scaleCaption="" eyebrow="TWOJA LOKALIZACJA" />);
expect(screen.getByText('118')).toBeTruthy();
expect(screen.getByText('PM2.5 · 122 µg/m³')).toBeTruthy();
// µg/m³-style: number is the concentration, no sub-line, caption shown
render(<Hero scene={scene(118)} place={place} value="13.1" pm25Label={null} scaleCaption="µg/m³" eyebrow="MIEJSCE" />);
expect(screen.getByText('13.1')).toBeTruthy();
expect(screen.queryByText(/PM2.5 ·/)).toBeNull();
expect(screen.getByText('µg/m³')).toBeTruthy();
```
Keep asserting the big number's color is `scene(118).key` via `colorOf`.
### `src/shared/ui/__tests__/PollutantTiles.test.tsx`
Pass `precision`: `<PollutantTiles pm10={13.1} no2={22} precision="Dokładna" />` → `13.1`, `22.0`; `precision="Przybliżona"` → `13`, `22`; `no2={undefined}` → `—`.
### `src/features/teraz/__tests__/TerazScreen.test.tsx`
Wrap renders in the REAL `SettingsProvider` with a fake store (mirror spec-009 tests):
```ts
import { SettingsProvider } from '../../../shared/settings';
import { DEFAULT_SETTINGS, type Settings, type SettingsStore } from '../../../core/settings';
const settingsStore = (s: Settings = DEFAULT_SETTINGS): SettingsStore => ({ load: async () => s, save: async () => {} });
// wrap: <SettingsProvider store={settingsStore(s)}><PlaceSourceProvider…><ActivePlaceProvider>…
```
- Existing spec-002 tests (index '118', band 'Zły', 'PM2.5 · 122 µg/m³') must still pass under DEFAULT_SETTINGS (scale CAQI, precision Przybliżona) — just add the SettingsProvider wrapper.
- Add: with `settingsStore({...DEFAULT_SETTINGS, scale:'µg/m³', precision:'Dokładna'})` the hero big number is `formatConcentration(reading.pm25,'Dokładna')` and the `PM2.5 ·` sub-line is absent; with `scale:'US AQI'` it's `String(usAqiFromPm25(reading.pm25))`. Color stays `scene(reading.index).key`.

## Step 2: run → fail. Step 3: implement. Step 4: gate
`npx jest Hero PollutantTiles TerazScreen`, then FULL `npm test`, `npm run lint`, `npm run typecheck` — all green.

## Step 5: commit
`git add src/features/teraz src/shared/ui/PollutantTiles.tsx src/shared/ui/__tests__/PollutantTiles.test.tsx && git commit -m "feat(teraz): scale/precision drive the hero number + tiles (AC-5,5b,7, spec 014)"`

## Report
Write to `.superpowers/sdd/2026-08-15-m-settings-wired/task-3-report.md` before your final message; confirm the existing spec-002 Teraz tests still pass. Final message: status, commit SHA, one-line test summary, concerns.
Note: git/npm "Operation not permitted" → retry sandbox disabled.
