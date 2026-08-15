# Task 2 — GIOŚ mappers: findSensorId / parseSeries / parseLatestValue (+ dedup)

Worktree `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest`, branch `feature/m-teraz-detail`.

## Global Constraints
- TS strict; the file already has a justified `eslint-disable @typescript-eslint/no-explicit-any` for GIOŚ JSON — keep that pattern. Files ≤200, functions ≤40. Test names cite AC IDs. `src/data`→`src/core` only.

## Consumes / current file
`src/data/gios/mappers.ts` currently has:
```ts
const SENSORS_KEY = 'Lista stanowisk pomiarowych dla podanej stacji';
const DATA_KEY = 'Lista danych pomiarowych';
export function findPm25SensorId(sensorsJson: any): number { … find 'Wskaźnik - kod'==='PM2.5' → 'Identyfikator stanowiska'; throw if none }
export function parseLatestPm25(getDataJson: any): { pm25: number; measuredAt: string } { … first non-null 'Wartość' → {pm25, measuredAt}; throw if none }
```
Fixtures: `sensors400.json` (PM2.5→2752, PM10→2750, NO2→2747), `getData2752.json` (newest-first hourly series).

## Produces
`findSensorId(json, code)`, `parseSeries(json)`, `parseLatestValue(json)`; `findPm25SensorId`/`parseLatestPm25` refactored to reuse them (same external behavior/shape).

## Files
- Modify: `src/data/gios/mappers.ts`
- Test: `src/data/gios/__tests__/mappers.test.ts` (create or extend)

## Step 1: Write the failing tests
```ts
import sensors from '../__fixtures__/sensors400.json';
import series from '../__fixtures__/getData2752.json';
import { findSensorId, parseSeries, parseLatestValue } from '../mappers';

test('AC-5: findSensorId by code', () => {
  expect(findSensorId(sensors, 'PM2.5')).toBe(2752);
  expect(findSensorId(sensors, 'PM10')).toBe(2750);
  expect(findSensorId(sensors, 'NO2')).toBe(2747);
  expect(findSensorId(sensors, 'O3')).toBeNull();
});

test('AC-4: parseSeries maps at/value, null Wartość → null', () => {
  const s = parseSeries(series);
  expect(s[0]).toEqual({ at: '2026-08-11 21:00:00', value: 5 });
  expect(
    parseSeries({ 'Lista danych pomiarowych': [{ Data: 'x', Wartość: null }] }),
  ).toEqual([{ at: 'x', value: null }]);
});

test('AC-5: parseLatestValue = newest non-null by at, order-independent', () => {
  expect(parseLatestValue(series)).toBe(5);
  const shuffled = { 'Lista danych pomiarowych': [
    { Data: '2026-08-11 05:00:00', Wartość: 8.7 },
    { Data: '2026-08-11 21:00:00', Wartość: 5 },
    { Data: '2026-08-11 20:00:00', Wartość: null },
  ]};
  expect(parseLatestValue(shuffled)).toBe(5);
  expect(parseLatestValue({ 'Lista danych pomiarowych': [{ Data: 'x', Wartość: null }] })).toBeUndefined();
});
```

## Step 2: Run to verify fail
`npx jest src/data/gios/__tests__/mappers` → FAIL.

## Step 3: Implement (`src/data/gios/mappers.ts`)
Add (keep the existing `any` eslint-disable header):
```ts
export function findSensorId(sensorsJson: any, code: string): number | null {
  const list: any[] = sensorsJson?.[SENSORS_KEY] ?? [];
  const sensor = list.find(e => e['Wskaźnik - kod'] === code);
  return sensor ? sensor['Identyfikator stanowiska'] : null;
}

export function parseSeries(getDataJson: any): { at: string; value: number | null }[] {
  const list: any[] = getDataJson?.[DATA_KEY] ?? [];
  return list.map(e => ({ at: e['Data'], value: e['Wartość'] ?? null }));
}

// Newest (max `at`) non-null point — order-independent.
function newestNonNull(getDataJson: any): { at: string; value: number } | undefined {
  return parseSeries(getDataJson)
    .filter((p): p is { at: string; value: number } => p.value !== null)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))[0];
}

export function parseLatestValue(getDataJson: any): number | undefined {
  return newestNonNull(getDataJson)?.value;
}
```
Then REFACTOR the two existing functions to reuse the above (preserve their external contracts — findPm25SensorId still THROWS, parseLatestPm25 still returns `{pm25, measuredAt}` and throws):
```ts
export function findPm25SensorId(sensorsJson: any): number {
  const id = findSensorId(sensorsJson, 'PM2.5');
  if (id == null) throw new Error('GIOŚ: no PM2.5 sensor for station');
  return id;
}

export function parseLatestPm25(getDataJson: any): { pm25: number; measuredAt: string } {
  const e = newestNonNull(getDataJson);
  if (!e) throw new Error('GIOŚ: no non-null PM2.5 reading');
  return { pm25: e.value, measuredAt: e.at };
}
```
(Note: parseLatestPm25 now picks newest-by-`at` instead of first-in-list — a robustness improvement; the existing newest-first fixtures make the result identical, so existing source tests stay green.)

## Step 4: Verify pass + gate
`npx jest src/data/gios` (mappers + existing source tests all pass). Full `npm test`. `npm run typecheck`. `npm run lint`.

## Step 5: Commit
`git add src/data/gios/mappers.ts src/data/gios/__tests__/mappers.test.ts && git commit -m "feat(data): findSensorId/parseSeries/parseLatestValue + dedup (AC-4..5, spec 012)"`

## Report
Write your full report to `.superpowers/sdd/2026-08-13-m-teraz-detail/task-2-report.md` BEFORE your final message; confirm existing source tests still pass after the refactor. Final message: status, commit SHA, one-line test summary, concerns.

Note: if a git/npm command fails with "Operation not permitted" (sandbox), retry with sandbox disabled.
