# Task 3 report — GIOŚ `getDetail()` on the sources

Worktree: `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest`
Branch: `feature/m-teraz-detail`

## Status: DONE

## What was built

### `src/data/gios/source.ts`
- Added `detailFor(station, fetchImpl): Promise<ReadingDetail>` — fetches the
  station's sensors, finds PM2.5/PM10/NO2 sensor ids via `findSensorId`,
  then resolves all three pollutants concurrently with `Promise.allSettled`:
  - PM2.5 → `getData/{id}?size=100` → `parseSeries` → `buildHistory` (24h,
    oldest→newest).
  - PM10 / NO2 → `getData/{id}` (no `size` param) → `parseLatestValue`.
  - Missing sensor (id `null`) short-circuits to a rejected promise for that
    slot, so `Promise.allSettled` treats "no sensor" the same as "fetch
    failed" — no per-pollutant network call is made when the sensor doesn't
    exist.
  - `getDetail()` never rejects: `history` defaults to `[]`, `pm10`/`no2`
    default to `undefined` on failure.
- Added local type `SourceWithDetail = AirQualitySource & { getDetail: () =>
  Promise<ReadingDetail> }` since `AirQualitySource` itself doesn't declare
  `getDetail` yet (that's Task 4's core change per the brief). All three
  factories (`createGiosSource`, `createStationSource`,
  `createNearestStationSource`) now return `SourceWithDetail` and expose
  `getDetail`.
- Refactored `createNearestStationSource` to memoize station resolution in a
  `resolveStation()` closure (`stationP: Promise<Station> | null`), shared by
  both `getCurrentReading` and `getDetail`. Preserved the exact existing
  fallback semantics:
  - geo/stations failure → resolve to `KRAKOW_STATION` (silent fallback,
    `__DEV__`-only warning).
  - reading failure (post station-resolution) → re-fetch the Kraków reading
    directly, independent of `resolveStation`'s own fallback.
  This was verified against all pre-existing `nearestSource.test.ts` cases
  (geo reject, reading-fetch reject, stations-fetch reject) — all still pass
  unmodified.

### Fixtures added (`src/data/gios/__fixtures__/`)
- `getData_pm25_26.json` — 26 hourly PM2.5 rows, newest-first
  (2026-08-12 22:00 → 2026-08-11 21:00, no gaps), all non-null, so
  `buildHistory` fills the full 24 and drops the oldest 2.
- `getData_pm10.json` — 3 rows, newest value `30`.
- `getData_no2.json` — 3 rows, newest value `22`.

### Test added: `src/data/gios/__tests__/detail.test.ts`
Local `makeFetch(routes, rejectContaining?)` helper routes by URL substring
to fixture bodies, or rejects the fetch call itself for URLs matching
`rejectContaining` (simulating a network failure independent from routing).

- **AC-6**: `createStationSource(KRAKOW_STATION, fetch).getDetail()` →
  `history.length === 24`, oldest→newest order (`history[0].at ===
  '2026-08-11 23:00:00'`, `history[23].at === '2026-08-12 22:00:00'`),
  `pm10 === 30`, `no2 === 22`; asserts the PM2.5 `getData` URL contains
  `size=100`.
- **AC-6 missing sensor**: sensors JSON derived from `sensors400.json` with
  the NO2 entry filtered out (inline in the test) → `no2` undefined,
  `history`/`pm10` present. No fetch call is made for the NO2 `getData` URL
  (proven implicitly: no route stubbed for it, and the test doesn't fail
  with "no route stubbed").
- **AC-6b failure isolation**: NO2 `getData` URL rejected → `no2` undefined,
  `history`/`pm10` present; PM2.5 `getData` URL rejected → `history: []`,
  `pm10`/`no2` present. Both assert via `.resolves` that `getDetail()` never
  rejects.
- **AC-6c location fallback**: `createNearestStationSource` with a
  `getCurrentPosition` that always rejects → `getDetail()` resolves using
  the Kraków fallback station (`history.length === 24`), and a subsequent
  `getCurrentReading()` call returns the same Kraków identity
  (`city: 'Kraków'`, `station: 'Aleja Krasińskiego · stacja GIOŚ'`). A
  `jest.fn()` on `getCurrentPosition` asserts it was called exactly once
  across both `getDetail()` and `getCurrentReading()` — proving the shared
  `resolveStation()` memoization (B1), not just matching output.

## Verification

- `npx jest src/data/gios` → **6 suites, 21 tests, all pass** (new
  `detail.test.ts` plus pre-existing `source.test.ts`,
  `stationSource.test.ts`, `nearestSource.test.ts`, `mappers.test.ts`,
  `parseStations.test.ts` — all unmodified and still green after the
  `resolveStation` refactor).
- `npm test` → **45 suites, 153 tests, all pass** (full repo).
- `npm run typecheck` → clean, no errors.
- `npm run lint` → 0 errors, 3 pre-existing warnings unrelated to this
  change (`App.tsx` inline style, `Toggle.tsx` inline style,
  `mappers.ts` stale `eslint-disable` comment — none introduced by this
  task; `mappers.ts` wasn't touched).

## Deviations from the brief

- Brief's example `detailFor` uses local variable name `h` for the history
  settled-result; I used `history` for readability. Same logic.
- `SourceWithDetail`'s `getDetail` is declared as **required** (not
  optional) since every factory in this task always provides it; the brief
  only marks the *interface* addition (Task 4) as optional. This let the
  test call `.getDetail()` directly without a non-null assertion.
- Added `getDetail` to `createGiosSource` as the brief's "nice-to-have"
  suggests — it was a one-line addition reusing `detailFor`.
- Fixtures use a minimal JSON shape (`{"Lista danych pomiarowych": [...]}`)
  rather than the full `@context`/`meta`/`links`/`totalPages` envelope
  present in `getData2752.json`, matching the precedent already set by
  `getData_allnull.json`. `parseSeries`/`buildHistory` only read the one key,
  so this is behaviorally identical and keeps the fixtures small.

## Commit

Committed on `feature/m-teraz-detail`:
`feat(data): getDetail (history + PM10/NO2, allSettled, shared station) (AC-6/6b/6c, spec 012)`
