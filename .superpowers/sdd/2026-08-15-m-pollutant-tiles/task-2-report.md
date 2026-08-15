# Task 2 report — ReadingDetail migration (data adapter + data-driven tiles)

Branch: `feature/m-pollutant-tiles`. Worktree: `.claude/worktrees/m-loc-nearest`.

## Files modified

- `src/core/air/history.ts` — `ReadingDetail` changed to
  `{ history: HourPoint[]; pollutants: PollutantReading[] }`; `pm10?`/`no2?`
  removed. Imports `PollutantReading` from `./pollutants`.
- `src/data/gios/source.ts` —
  - added `getLatest(id, fetchImpl)` (module-level helper, extracted from the
    old `detailFor` closure so `resolvePollutants` can reuse it).
  - added `resolvePollutants(sensorsJson, fetchImpl): Promise<PollutantReading[]>`
    — maps `POLLUTANTS`, `findSensorId` per code, `getLatest` for present ids,
    `Promise.allSettled`, keeps only `Number.isFinite(value)` results, order
    preserved (allSettled preserves input-array order regardless of timing).
  - `detailFor` rewritten as a thin composition: one `Promise.allSettled([getSeries(pm25Id), resolvePollutants(...)])`,
    each side independently falls back to `[]` on rejection. 28 lines.
  - `mappers.ts` untouched, per spec.
- `src/shared/ui/PollutantTiles.tsx` — props now
  `{ pollutants: PollutantReading[]; precision }`; `Tile` derives its label
  via `POLLUTANTS.find(p => p.code === code)!.label`, value via
  `formatPollutant`; wrapping grid (`flexWrap: 'wrap'`, tile
  `flexBasis: '48%'`, no `flex: 1` so a lone last tile doesn't stretch,
  existing 12px gap kept); empty list → `return null`.
- `src/features/teraz/TerazScreen.tsx` — `pm10={detail.pm10} no2={detail.no2}`
  → `pollutants={detail.pollutants}`.

## Fixtures created (`src/data/gios/__fixtures__/`, matching existing shape)

- `getData_co.json` — newest-non-null CO series, latest value `350`.
- `getData_c6h6.json` — newest-non-null C₆H₆ series, latest value `0.35`
  (chosen to also exercise the sub-1 `formatPollutant` rule in AC-4).
- `getData_o3.json` — newest-non-null O₃ series, latest value `45`.
- `getData_so2.json` — newest-non-null SO₂ series, latest value `8.5`.
- `sensors_all6.json` — station-400-shaped sensors list exposing all six
  catalog codes (PM10 2750, NO2 2747, O3 2749, SO2 2751, CO 2745, C6H6 16500,
  PM2.5 2752) for AC-3b.
- Reused `getData_allnull.json` for AC-3c (present sensor, all-null series).
- `sensors400.json` (pre-existing, unmodified) already has PM10+NO2+CO+C6H6
  but no O3/SO2 — used directly for AC-3a, matching the spec's Kraków-400
  scenario with zero new fixture needed for that station shape.

## Tests written/updated (AC IDs cited)

- `src/data/gios/__tests__/detail.test.ts` — fully rewritten:
  - AC-3a: PM10+NO2+CO+C6H6 station → `pollutants` exactly `[PM10,NO2,CO,C6H6]`
    in order + values; plus a missing-NO2-sensor variant (NO2 omitted, others
    in order).
  - AC-3b: all-six station → `[PM10,NO2,O3,SO2,CO,C6H6]` catalog order.
  - AC-3c: CO sensor present, getData all-null → CO omitted, others present.
  - Failure-isolation regressions carried forward (rejected NO2 fetch →
    omitted; rejected PM2.5 fetch → `history: []`, pollutants unaffected).
  - Nearest-source fallback tests (AC-6c) updated to assert `pollutants`
    arrays instead of `pm10`/`no2`.
- `src/shared/ui/__tests__/PollutantTiles.test.tsx` — fully rewritten:
  AC-4 (4-entry catalog labels + `formatPollutant` values + four `µg/m³`,
  benzene `0.35` → `'0.35'` in `Przybliżona`, ≥1 precision cases for
  Dokładna/Przybliżona), "absent pollutant → tile not rendered" (replaces the
  old "missing value → —" case), AC-5 (empty list → nothing renders,
  `queryByText('µg/m³')` null, no crash).
- `src/shared/place/__tests__/usePlaceDetail.test.tsx` — `detail` fixture
  changed from `{ pm10: 30, no2: 22 }` to
  `pollutants: [{code:'PM10',value:30},{code:'NO2',value:22}]`.
- `src/features/teraz/__tests__/TerazScreen.test.tsx` — same fixture change;
  AC-10 assertions (`PM10`/`NO₂` labels visible) needed no change since the
  label text itself is unchanged.
- `src/data/gios/__tests__/source.test.ts`, `stationSource.test.ts`,
  `nearestSource.test.ts`, `ActivePlaceContext.test.tsx` — inspected, no
  `pm10`/`no2`/`ReadingDetail` literals present; no changes needed.

## Completion guard (spec §"Completion guard", B1)

```
grep -rnE 'detail\.(pm10|no2)|(pm10|no2)\?:|(pm10|no2)=\{' src --include='*.ts' --include='*.tsx' | grep -v 'src/core/scene'
```
Result: **empty** (confirmed via exit code, no matches).

## Gate results

- `npm run typecheck` → clean, 0 errors.
- `npm run lint` → 0 errors, 4 warnings, all pre-existing (App.tsx/HistoryChart.tsx/Toggle.tsx
  inline-style warnings + the long-standing `mappers.ts` "rule disabled but
  never reported" quirk for `no-explicit-any`, which isn't actually an
  enabled rule in this ESLint config — my `resolvePollutants` uses a plain
  justifying comment instead of an `eslint-disable` directive to avoid adding
  a duplicate instance of that same warning).
- `npm test` → 55 suites / 198 tests, all passing.
- `npx jest --coverage` (coverage dir redirected to scratch since the
  sandboxed worktree's `coverage/` isn't writable) → `src/core` at 100%
  statements/branches/functions/lines across every file (`core/air`,
  `core/air/history.ts`, `core/air/pollutants.ts` all 100%); exit code 0, no
  "coverage threshold not met" failure.

## Deviations / concerns

- None from the spec's design. One implementation note: `resolvePollutants`
  maps an absent-value fulfillment to `{ code, value: NaN }` internally so a
  single `Number.isFinite` check in the post-filter covers both "sensor
  absent → allSettled rejection" and "sensor present but all-null →
  `parseLatestValue` returns `undefined`" uniformly; this matches the spec's
  explicit warning that the finite check (not `status === 'fulfilled'`) is
  what does the filtering.
- Fixture station IDs for `sensors_all6.json` (O3=2749, SO2=2751) are
  invented (not verified against a real live GIOŚ station that measures all
  six) since none of Kraków's real sensors expose all six simultaneously —
  the spec's AC-3b only requires proving the ordering/composition logic, not
  a specific real station, so this is a synthetic fixture by design.
