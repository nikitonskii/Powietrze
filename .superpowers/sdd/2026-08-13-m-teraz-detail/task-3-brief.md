# Task 3 — GIOŚ `getDetail()` on the sources

Worktree `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest`, branch `feature/m-teraz-detail`.

## Global Constraints
- TS strict; keep GIOŚ `any` only where already justified. Files ≤200, functions ≤40. Test names cite AC IDs. `src/data`→`src/core`. No new dependency.

## Consumes
- Task 1: `buildHistory`, `ReadingDetail` from `../../core/air`.
- Task 2: `findSensorId`, `parseSeries`, `parseLatestValue` from `./mappers`.
- Existing `source.ts` (read it — you'll refactor `createNearestStationSource`), `constants.ts` (`GIOS_BASE`, `KRAKOW_STATION`), `stations.ts` (`fetchStations`), core/geo (`nearestStation`, `Station`, `Geolocation`).

## Produces
`getDetail(): Promise<ReadingDetail>` on `createStationSource` AND `createNearestStationSource` (the interface method is optional, added in Task 4's core change — for now just implement it; add `getDetail` to the returned object).

## Files
- Modify: `src/data/gios/source.ts`
- Create fixtures: `src/data/gios/__fixtures__/getData_pm25_26.json` (≥24 hourly rows, newest-first, shape like `getData2752.json`: `{"Lista danych pomiarowych":[{"Kod stanowiska":"…","Data":"2026-08-11 HH:00:00","Wartość":N}, …]}`), `getData_pm10.json` (a few rows, known newest value e.g. 30), `getData_no2.json` (known newest value e.g. 22).
- Test: `src/data/gios/__tests__/detail.test.ts`

## Step 1: Write the failing tests (`detail.test.ts`)
Use a `fetchImpl` stub that routes by URL substring to `.json()`-returning fixtures:
```ts
// helper: makeFetch(routes: Record<substr, jsonObj|(() => Promise)>) → typeof fetch
```
Assert:
- **AC-6:** `createStationSource(station, fetch).getDetail()` → `history` (from getData_pm25_26 via buildHistory: ≤24, oldest→newest), `pm10 === 30`, `no2 === 22`. Assert the PM2.5 series URL the stub received contains `size=100`. (station: use one from sensors400 → id 400; route `/station/sensors/400` → sensors400.json, `/data/getData/2752` → getData_pm25_26, `/data/getData/2750` → getData_pm10, `/data/getData/2747` → getData_no2.)
- **AC-6 missing sensor:** sensors JSON without an NO2 entry (inline JSON in the test) → `no2` undefined, `history` + `pm10` present.
- **AC-6b failure isolation:** fetchImpl REJECTS the NO2 getData URL → `no2` undefined, history + pm10 present; REJECTS the PM2.5 getData URL → `history: []`, pm10/no2 present. `getDetail()` never rejects.
- **AC-6c location fallback:** `createNearestStationSource(geoThatRejects, fetch).getDetail()` resolves for the Kraków fallback station (route Kraków's sensors/getData) → history non-empty; and its `getCurrentReading()` uses the SAME Kraków station.

## Step 2: Run to verify fail
`npx jest src/data/gios/__tests__/detail` → FAIL.

## Step 3: Implement (`source.ts`)
Add a shared detail builder and refactor the nearest source to memoize station resolution:
```ts
import { buildHistory, type ReadingDetail } from '../../core/air';
import { findSensorId, parseSeries, parseLatestValue } from './mappers';

async function detailFor(
  station: Station,
  fetchImpl: typeof fetch,
): Promise<ReadingDetail> {
  const sensors = await (
    await fetchImpl(`${GIOS_BASE}/station/sensors/${station.id}`)
  ).json();
  const pm25Id = findSensorId(sensors, 'PM2.5');
  const pm10Id = findSensorId(sensors, 'PM10');
  const no2Id = findSensorId(sensors, 'NO2');
  const getSeries = async (id: number) =>
    buildHistory(
      parseSeries(await (await fetchImpl(`${GIOS_BASE}/data/getData/${id}?size=100`)).json()),
    );
  const getLatest = async (id: number) =>
    parseLatestValue(await (await fetchImpl(`${GIOS_BASE}/data/getData/${id}`)).json());
  const [h, pm10, no2] = await Promise.allSettled([
    pm25Id != null ? getSeries(pm25Id) : Promise.reject(new Error('no pm2.5')),
    pm10Id != null ? getLatest(pm10Id) : Promise.reject(new Error('no pm10')),
    no2Id != null ? getLatest(no2Id) : Promise.reject(new Error('no no2')),
  ]);
  return {
    history: h.status === 'fulfilled' ? h.value : [],
    pm10: pm10.status === 'fulfilled' ? pm10.value : undefined,
    no2: no2.status === 'fulfilled' ? no2.value : undefined,
  };
}
```
- `createStationSource(station, fetchImpl)` → add `getDetail: () => detailFor(station, fetchImpl)`.
- `createGiosSource` (Kraków) → optionally add `getDetail: () => detailFor(KRAKOW_STATION, fetchImpl)` (nice-to-have; fine to add).
- `createNearestStationSource(geo, fetchImpl)` → refactor to memoize the station resolution and share it:
```ts
export function createNearestStationSource(geo, fetchImpl = fetch): AirQualitySource {
  let stationP: Promise<Station> | null = null;
  const resolveStation = () => {
    if (!stationP) {
      stationP = (async () => {
        try {
          const { lat, lon } = await geo.getCurrentPosition();
          return nearestStation(lat, lon, await fetchStations(fetchImpl));
        } catch (e) {
          if (__DEV__) console.warn('[nearest] location failed; using Kraków:', e);
          return KRAKOW_STATION;
        }
      })();
    }
    return stationP;
  };
  return {
    async getCurrentReading() {
      const station = await resolveStation();
      try {
        return await readStation(station, fetchImpl);
      } catch (e) {
        if (__DEV__) console.warn('[nearest] reading failed; showing Kraków:', e);
        return readStation(KRAKOW_STATION, fetchImpl);
      }
    },
    getDetail: () => resolveStation().then(s => detailFor(s, fetchImpl)),
  };
}
```
This preserves the existing behavior (geo/stations failure → Kraków; reading failure → Kraków reading) AND makes getCurrentReading + getDetail share ONE resolved station (B1), avoiding double geo/fetchStations.

## Step 4: Verify pass + gate
`npx jest src/data/gios` (new detail tests + existing source/mappers tests all pass). Full `npm test`. `npm run typecheck`. `npm run lint`.

## Step 5: Commit
`git add src/data/gios && git commit -m "feat(data): getDetail (history + PM10/NO2, allSettled, shared station) (AC-6/6b/6c, spec 012)"`

## Report
Write your full report to `.superpowers/sdd/2026-08-13-m-teraz-detail/task-3-report.md` BEFORE your final message; confirm existing nearest/source tests still pass after the resolveStation refactor. Note any deviation. Final message: status, commit SHA, one-line test summary, concerns.

Note: if a git/npm command fails with "Operation not permitted" (sandbox), retry with sandbox disabled.
