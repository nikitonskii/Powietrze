# M-settings-wired Implementation Plan (scale + precision + location; hide widget)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make three persisted settings actually change the app (scale, precision, location) and remove the widget row, so only the notifications rows remain "Wkrótce".

**Architecture:** Pure display math in `core/air` (US-AQI table, formatting) + `defaultPlace` in `core/places`; `TerazScreen`/`PlaceRow` read settings and render numbers via `displayValue` (color stays CAQI); `ActivePlaceProvider` gains a default station + loc-reset. No new dependency.

**Tech Stack:** RN 0.86, TS strict, Jest + RNTL v14.

## Global Constraints
- Spec: `docs/specs/014-settings-wired.md` — every AC maps to it.
- TS strict; `any` only justified. Files ≤200, functions ≤40. Tests cite AC IDs. `src/core` 100% coverage.
- Layering: core pure ← shared ← features; data→core; App.tsx (composition root) may import data.
- No-hex in features/shared-ui/app. No new dependency.
- **DoD #2: the FULL suite stays green** — several existing suites must be updated in the same tasks (each task lists them).
- Color/band/atmosphere ALWAYS from the CAQI `scene(index)`; scale changes only the displayed number.

---

### Task 1: Core display math (`core/air`: usAqiFromPm25, displayValue, formatConcentration, scaleLabel)

**Files:** Modify `src/core/air/index.ts` (or a new `src/core/air/scale.ts` re-exported — keep index ≤200); Test `src/core/air/__tests__/scale.test.ts`.
**Produces:** `usAqiFromPm25`, `displayValue`, `formatConcentration`, `scaleLabel`. Consumed by Tasks 3, 4.

- [ ] **Step 1: failing tests** — pin AC-1 (full table), AC-2, AC-3, AC-4b:
```ts
import { usAqiFromPm25, displayValue, formatConcentration, scaleLabel } from '..';

test('AC-1: usAqiFromPm25 — full EPA table, gap-trunc, clamp, non-finite', () => {
  const cases: [number, number][] = [
    [0,0],[9,38],[12,50],[12.05,50],[12.1,51],[35.4,100],[45,124],[55.4,150],
    [100,174],[150.4,200],[150.5,201],[250.4,300],[300,350],[350.4,400],
    [400,434],[500.4,500],[600,500],[-1,0],[NaN,0],
  ];
  for (const [c, aqi] of cases) expect(usAqiFromPm25(c)).toBe(aqi);
});
test('AC-2: formatConcentration', () => {
  expect(formatConcentration(13.1,'Przybliżona')).toBe('13');
  expect(formatConcentration(13.1,'Dokładna')).toBe('13.1');
  expect(formatConcentration(13,'Dokładna')).toBe('13.0');
  expect(formatConcentration(12.5,'Przybliżona')).toBe('13');
  expect(formatConcentration(NaN,'Dokładna')).toBe('—');
});
test('AC-3: displayValue', () => {
  expect(displayValue(118,122,'CAQI','Przybliżona')).toBe('118');
  expect(displayValue(118,122,'US AQI','Przybliżona')).toBe(String(usAqiFromPm25(122)));
  expect(displayValue(118,13.1,'µg/m³','Dokładna')).toBe('13.1');
  expect(displayValue(118,13.1,'µg/m³','Przybliżona')).toBe('13');
});
test('AC-4b: scaleLabel', () => {
  expect(scaleLabel('CAQI')).toBe('');
  expect(scaleLabel('US AQI')).toBe('US AQI');
  expect(scaleLabel('µg/m³')).toBe('µg/m³');
});
```
- [ ] **Step 2: run → fail.**
- [ ] **Step 3: implement** (in `core/air`; import `type { Scale, Precision }` from `../settings` — type-only, no cycle):
```ts
const US_AQI_BANDS = [
  { cLo: 0.0, cHi: 12.0, iLo: 0, iHi: 50 },
  { cLo: 12.1, cHi: 35.4, iLo: 51, iHi: 100 },
  { cLo: 35.5, cHi: 55.4, iLo: 101, iHi: 150 },
  { cLo: 55.5, cHi: 150.4, iLo: 151, iHi: 200 },
  { cLo: 150.5, cHi: 250.4, iLo: 201, iHi: 300 },
  { cLo: 250.5, cHi: 350.4, iLo: 301, iHi: 400 },
  { cLo: 350.5, cHi: 500.4, iLo: 401, iHi: 500 },
] as const;

export function usAqiFromPm25(pm25: number): number {
  if (!Number.isFinite(pm25) || pm25 <= 0) return 0;
  const c = Math.floor(pm25 * 10) / 10; // truncate to 0.1 µg/m³ (EPA)
  if (c >= 500.4) return 500;
  const b = US_AQI_BANDS.find(x => c <= x.cHi)!; // c<500.4 ⇒ always found
  return Math.round(((b.iHi - b.iLo) / (b.cHi - b.cLo)) * (c - b.cLo) + b.iLo);
}

export function formatConcentration(v: number, precision: Precision): string {
  if (!Number.isFinite(v)) return '—';
  return precision === 'Dokładna' ? v.toFixed(1) : String(Math.round(v));
}

export function displayValue(
  index: number, pm25: number, scale: Scale, precision: Precision,
): string {
  if (scale === 'US AQI') return String(usAqiFromPm25(pm25));
  if (scale === 'µg/m³') return formatConcentration(pm25, precision);
  return String(index); // CAQI
}

export function scaleLabel(scale: Scale): string {
  return scale === 'CAQI' ? '' : scale;
}
```
- [ ] **Step 4: gate** — `npx jest src/core/air`, `npm run typecheck`; `src/core` 100% (every band exercised).
- [ ] **Step 5: commit** — `feat(core): US-AQI + display/format helpers (AC-1..3,4b, spec 014)`

---

### Task 2: `defaultPlace` (`core/places`)

**Files:** Modify `src/core/places/index.ts`; Test `src/core/places/__tests__/defaultPlace.test.ts`.
**Produces:** `defaultPlace(loc, defaultStation)`. Consumed by Task 5.

- [ ] **Step 1: failing test** (AC-4):
```ts
import { defaultPlace, LOCATION_PLACE } from '..';
const krk = { id: 400, name: 'Kraków, Aleja Krasińskiego', city: 'Kraków', lat: 0, lon: 0 };
test('AC-4: defaultPlace by loc', () => {
  expect(defaultPlace(true, krk)).toEqual(LOCATION_PLACE);
  expect(defaultPlace(false, krk)).toEqual({ kind: 'station', station: krk });
});
```
- [ ] **Step 2: fail → 3: implement**:
```ts
export function defaultPlace(loc: boolean, defaultStation: Station): ActivePlace {
  return loc ? LOCATION_PLACE : { kind: 'station', station: defaultStation };
}
```
- [ ] **Step 4: gate** (`npx jest src/core/places`, typecheck, core 100%). **Step 5: commit** `feat(core): defaultPlace (AC-4, spec 014)`

---

### Task 3: Teraz — scale/precision on Hero + PollutantTiles

**Files:** Modify `src/features/teraz/TerazScreen.tsx`, `src/features/teraz/Hero.tsx`, `src/shared/ui/PollutantTiles.tsx`; Update tests `src/features/teraz/__tests__/Hero.test.tsx`, `TerazScreen.test.tsx`, `src/shared/ui/__tests__/PollutantTiles.test.tsx`.
**Consumes:** Task 1. **Reads settings in TerazScreen** (not Hero/tiles).

- [ ] **Step 1: update/failing tests** —
  - `Hero.test`: Hero props change to `value: string`, `pm25Label: string | null`, `scaleCaption: string` (drop `pm25`). Assert: big number renders `value`; color `scene(index).key`; when `pm25Label` null the `PM2.5 · …` line is absent; when `scaleCaption` non-empty it renders.
  - `PollutantTiles.test`: pass `precision='Dokładna'` → values show one decimal (e.g. `13.1`); `undefined` → `—`.
  - `TerazScreen.test`: wrap in `SettingsProvider` (fake store) + existing providers; with `scale='µg/m³',precision='Dokładna'` the hero big number is `formatConcentration(pm25,'Dokładna')` and the `PM2.5 · …` sub-line is hidden; with `scale='US AQI'` it's `String(usAqiFromPm25(pm25))`; color stays `scene(index).key`. (The existing spec-002 AC-8/AC-10 tests must still pass — update their Hero prop usage.)
- [ ] **Step 2: fail → 3: implement:**
  - `Hero`: replace `pm25` handling — render `value` as the big number (color `scene.key`); render `pm25Label` only if non-null; render `scaleCaption` (small, `colors.text.dim`) under the number if non-empty. Stays pure (no hooks).
  - `PollutantTiles`: add `precision: Precision`; format values via `formatConcentration`.
  - `TerazScreen`: `const { settings } = useSettings();` compute `value = displayValue(reading.index, reading.pm25, settings.scale, settings.precision)`, `pm25Label = settings.scale==='µg/m³' ? null : \`PM2.5 · ${formatConcentration(reading.pm25, settings.precision)} µg/m³\``, `scaleCaption = scaleLabel(settings.scale)`; pass to `Hero`; pass `precision={settings.precision}` to `PollutantTiles`.
- [ ] **Step 4: gate** — `npx jest Hero PollutantTiles TerazScreen`; full `npm test`; lint; typecheck.
- [ ] **Step 5: commit** `feat(teraz): scale/precision drive the hero number + tiles (AC-5,5b,7, spec 014)`

---

### Task 4: Miejsca — scale/precision on PlaceRow

**Files:** Modify `src/features/miejsca/PlaceRow.tsx`; Update `src/features/miejsca/__tests__/PlaceRow.test.tsx` (+ any MiejscaScreen test that asserts the raw index string).
**Consumes:** Task 1.

- [ ] **Step 1: update tests** — wrap PlaceRow renders in a fake `SettingsProvider`; assert the big number is `displayValue(reading.index, reading.pm25, scale, precision)` for a couple of scales; color stays `scene(index).key`. Check `MiejscaScreen.test` assertions that match a bare index string (e.g. `getAllByText('4')`) still hold under default `scale='CAQI'` (they should).
- [ ] **Step 2: fail → 3: implement** — in PlaceRow, `const { settings } = useSettings();` and render the big number via `displayValue(reading.index, reading.pm25, settings.scale, settings.precision)` (color unchanged).
- [ ] **Step 4: gate** — `npx jest PlaceRow MiejscaScreen`; full `npm test`; lint; typecheck.
- [ ] **Step 5: commit** `feat(miejsca): scale/precision on place-row number (AC-5, spec 014)`

---

### Task 5: ActivePlaceProvider — default station + loc reset; App.tsx wiring

**Files:** Modify `src/shared/place/ActivePlaceContext.tsx`, `App.tsx`; Update `src/shared/place/__tests__/ActivePlaceContext.test.tsx`.
**Consumes:** Task 2 `defaultPlace`.

- [ ] **Step 1: update/failing tests** (AC-6) — render `ActivePlaceProvider` with `defaultStation={krk}` inside fake `SettingsProvider` + `PlaceSourceProvider` (+ StationsProvider if needed). Assert: `settings.loc=true` → active is `LOCATION_PLACE`; `loc=false` → Kraków station place; toggling `loc` resets active to the new default. Update the pre-existing spec-006 test's wrapper (add the providers + `defaultStation`).
- [ ] **Step 2: fail → 3: implement** — `ActivePlaceProvider({ defaultStation, children })`: `const { settings } = useSettings();` init `useState(() => defaultPlace(settings.loc, defaultStation))`; a `useEffect(() => setActive(defaultPlace(settings.loc, defaultStation)), [settings.loc, defaultStation])` (keys on `settings.loc` only — do NOT depend on the computed place). In `App.tsx`, pass `defaultStation={KRAKOW_STATION}` (import from `./src/data/gios`).
- [ ] **Step 4: gate** — `npx jest src/shared/place`; full `npm test`; lint; typecheck.
- [ ] **Step 5: commit** `feat(place): loc setting drives the default place (AC-6, spec 014)`

---

### Task 6: Ustawienia — ToggleRow soon? + drop tags + remove widget row

**Files:** Modify `src/features/ustawienia/UstawieniaScreen.tsx`; Update `src/features/ustawienia/__tests__/UstawieniaScreen.test.tsx`.

- [ ] **Step 1: update/failing tests** (AC-8) — rewrite the spec-009 AC-18 assertion (remove `Stacja widżetu`/`Automatyczna` expectations; the row is gone) and AC-21 (`wkrotce-loc/precision/scale/widget` now ABSENT; `wkrotce-alert/threshold/quiet/morning` still PRESENT). Add an AC-8 test asserting exactly that.
- [ ] **Step 2: fail → 3: implement** — add `soon?: boolean` to `ToggleRow` (default false); pass `soon` for `alert` and `morning` only (NOT `loc`); remove `soon` from the `precision` and `scale` `StackedRow`s; delete the `Stacja widżetu` (`widget`) `SettingRow`.
- [ ] **Step 4: gate** — `npx jest UstawieniaScreen`; full `npm test`; lint; typecheck.
- [ ] **Step 5: commit** `feat(ustawienia): make loc/precision/scale live, hide widget row (AC-8, spec 014)`

---

### Task 7: Native run + manual AC-9 + journal

- [ ] **Step 1:** full gate green (`npm run lint && npm run typecheck && npm test`, core 100%).
- [ ] **Step 2:** on the sim — Skala indeksu flips the Teraz number CAQI/US AQI/µg/m³ (color unchanged, caption shown); Dokładna adds a decimal; Użyj mojej lokalizacji off → Kraków. Screenshot into `docs/harness/evidence/14/`.
- [ ] **Step 3:** write `docs/harness/14-settings-wired.md` (summary, AC coverage, gotchas).
- [ ] **Step 4:** commit `docs(harness): journal 14 + evidence`.

---

## Self-Review
**Coverage:** AC-1..3,4b → T1; AC-4 → T2; AC-5,5b,7 → T3; AC-5(Miejsca) → T4; AC-6 → T5; AC-8 → T6; AC-9 → T7. All covered.
**Existing-test fallout handled in-task:** Hero/PollutantTiles/TerazScreen (T3), PlaceRow/MiejscaScreen (T4), ActivePlaceContext (T5), UstawieniaScreen AC-18/21 (T6).
**Placeholders:** none. **Types:** `Scale`/`Precision` from core/settings used in T1 helpers + consumed identically in T3/T4; `defaultPlace` T2→T5; Hero prop shape (value/pm25Label/scaleCaption) consistent T3.
**Load-bearing:** US-AQI truncate-to-0.1 (no NaN); color always CAQI; loc effect keys on `settings.loc` only; settings read in TerazScreen/PlaceRow (Hero/tiles pure).
