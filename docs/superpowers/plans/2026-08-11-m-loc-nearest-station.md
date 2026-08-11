# M-loc: Nearest Station (geolocation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On launch, show the live air of the GIOŚ station nearest the device's location, falling back to Kraków on any failure.

**Architecture:** A pure `src/core/geo` module (haversine `distanceKm`, `nearestStation`, `stationLabel`, `Station`/`Geolocation` interfaces) feeds a generalized GIOŚ source. `createGiosSource` is refactored to a private per-`Station` reading builder that both the Kraków path and a new `createNearestStationSource` share; the latter resolves position → `fetchStations` → `nearestStation` → reading, with a Kraków fallback wrapping every failure. A thin `src/data/location` adapter wraps `@react-native-community/geolocation` (ADR-010) behind the `Geolocation` interface, injected in `App.tsx`.

**Tech Stack:** TypeScript strict, Jest + @testing-library/react-native, `@react-native-community/geolocation` (new), GIOŚ v1 REST.

## Global Constraints

- **Layered imports:** `app → features → shared → data → core`, one way only. `src/core/geo` imports nothing outside `core`. `src/data/*` may import `data` + `core` only. No cross-feature imports. (`.eslintrc.js` `boundaries` already defines the `data` element covering `src/data/location/*` — **no eslint change needed**.)
- **TypeScript strict.** `any` forbidden unless an inline comment justifies it (GIOŚ untyped JSON at the mapper boundary is the sanctioned exception, mirroring `mappers.ts`).
- **Files ≤ 200 lines, functions ≤ 40 lines.**
- **No hard-coded hex** in `features`/`shared/ui`/`app` (existing lint rule; irrelevant here — no colors added).
- **Test names cite AC IDs**, prefixed with the spec number to avoid collision with spec-004 tests: `test('AC 005-2: …')`.
- **Adding a dependency requires an ADR** (`docs/decisions/010-*.md`) — a DoD gate for this milestone.
- **Definition of done:** every AC traceable to a test (or recorded manual evidence); `npm run lint`, `npm run typecheck`, `npm test` green; docs updated in the same change; no new simulator warnings.
- **Exact GIOŚ keys (verified against the live `station/findAll`, 288 stations):** container `"Lista stacji pomiarowych"`; per entry `"Identyfikator stacji"`, `"Nazwa stacji"`, `"Nazwa miasta"`, `"WGS84 φ N"` (φ = U+03C6), `"WGS84 λ E"` (λ = U+03BB). **Read these keys from a fixture/constant — never retype the Greek letters.**
- **`createGiosSource` public signature stays `(fetchImpl?: typeof fetch, stationId?: number)`** so spec-004's `source.test.ts` and `App.tsx` are untouched.

---

### Task 1: `src/core/geo` — pure geo module (distanceKm, nearestStation, stationLabel)

**Files:**
- Create: `src/core/geo/index.ts`
- Test: `src/core/geo/__tests__/geo.test.ts`
- Exists (committed): `src/core/geo/__fixtures__/stations.json` (4 stations: 400 Kraków, 530 Warszawa, 706 Gdańsk, 114 Wrocław)

**Interfaces:**
- Produces: `interface Station { id: number; name: string; city: string; lat: number; lon: number }`; `interface Geolocation { getCurrentPosition(): Promise<{ lat: number; lon: number }> }`; `distanceKm(aLat, aLon, bLat, bLon): number`; `nearestStation(lat, lon, stations: Station[]): Station`; `stationLabel(station: Station): string`.

- [ ] **Step 1: Write the failing tests** — `src/core/geo/__tests__/geo.test.ts`

```ts
import stationsFixture from '../__fixtures__/stations.json';
import { distanceKm, nearestStation, stationLabel, type Station } from '../index';

// The fixture is GIOŚ's raw JSON-LD shape; map it to Station[] for these tests.
const S: Station[] = (stationsFixture as any)['Lista stacji pomiarowych'].map(
  (e: any) => ({
    id: e['Identyfikator stacji'],
    name: e['Nazwa stacji'],
    city: e['Nazwa miasta'],
    lat: Number(e['WGS84 φ N']),
    lon: Number(e['WGS84 λ E']),
  }),
);

test('AC 005-1: distanceKm is haversine (self=0, Kraków↔Warszawa≈252km)', () => {
  expect(distanceKm(50.057678, 19.926189, 50.057678, 19.926189)).toBe(0);
  expect(distanceKm(50.057678, 19.926189, 52.219298, 21.004724)).toBeCloseTo(252, -1);
});

test('AC 005-2: nearestStation minimizes distanceKm against the fixture', () => {
  expect(nearestStation(50.06, 19.94, S).id).toBe(400); // Kraków
  expect(nearestStation(52.22, 21.0, S).id).toBe(530); // Warszawa
  expect(nearestStation(54.4, 18.61, S).id).toBe(706); // Gdańsk
  expect(() => nearestStation(52, 21, [])).toThrow();
});

test('AC 005-3: stationLabel strips "<city>, " and adds the GIOŚ suffix', () => {
  expect(
    stationLabel({ id: 400, name: 'Kraków, Aleja Krasińskiego', city: 'Kraków', lat: 0, lon: 0 }),
  ).toBe('Aleja Krasińskiego · stacja GIOŚ');
  // No-prefix case: 30 live stations have name === city (e.g. "Czerniawa").
  expect(
    stationLabel({ id: 1, name: 'Czerniawa', city: 'Czerniawa', lat: 0, lon: 0 }),
  ).toBe('Czerniawa · stacja GIOŚ');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/core/geo`
Expected: FAIL — cannot resolve `../index`.

- [ ] **Step 3: Write the implementation** — `src/core/geo/index.ts`

```ts
export interface Station {
  id: number;
  name: string;
  city: string;
  lat: number;
  lon: number;
}

export interface Geolocation {
  getCurrentPosition(): Promise<{ lat: number; lon: number }>;
}

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number): number => (deg * Math.PI) / 180;

// Great-circle distance (haversine).
export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// The station geometrically nearest (lat, lon). Throws on empty input.
export function nearestStation(lat: number, lon: number, stations: Station[]): Station {
  if (stations.length === 0) throw new Error('geo: no stations to choose from');
  return stations.reduce((best, s) =>
    distanceKm(lat, lon, s.lat, s.lon) < distanceKm(lat, lon, best.lat, best.lon) ? s : best,
  );
}

// Hero label: strip a leading "<city>, " from the station name, add the GIOŚ suffix.
export function stationLabel(station: Station): string {
  const prefix = `${station.city}, `;
  const short = station.name.startsWith(prefix)
    ? station.name.slice(prefix.length)
    : station.name;
  return `${short} · stacja GIOŚ`;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/core/geo`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/geo/index.ts src/core/geo/__tests__/geo.test.ts
git commit -m "feat(core/geo): distanceKm, nearestStation, stationLabel (AC 005-1..3)"
```

---

### Task 2: `parseStations` + `fetchStations` (GIOŚ findAll → Station[], invalid coords dropped)

**Files:**
- Create: `src/data/gios/stations.ts`
- Create: `src/data/gios/__fixtures__/stationsWithGarbage.json`
- Modify: `src/data/gios/index.ts` (add `export * from './stations'`)
- Test: `src/data/gios/__tests__/parseStations.test.ts`

**Interfaces:**
- Consumes: `Station` from `src/core/geo`.
- Produces: `parseStations(findAllJson: unknown): Station[]`; `fetchStations(fetchImpl?: typeof fetch): Promise<Station[]>`.

- [ ] **Step 1: Create the garbage-coord fixture** — `src/data/gios/__fixtures__/stationsWithGarbage.json`

One valid entry (Warszawa 530) + one with an empty `"WGS84 φ N"` that must be dropped:

```json
{
  "Lista stacji pomiarowych": [
    {
      "Identyfikator stacji": 530,
      "Nazwa stacji": "Warszawa, Al. Niepodległości",
      "Nazwa miasta": "Warszawa",
      "WGS84 φ N": "52.219298",
      "WGS84 λ E": "21.004724"
    },
    {
      "Identyfikator stacji": 999,
      "Nazwa stacji": "Nigdzie, Bez Współrzędnych",
      "Nazwa miasta": "Nigdzie",
      "WGS84 φ N": "",
      "WGS84 λ E": "21.0"
    }
  ]
}
```

- [ ] **Step 2: Write the failing tests** — `src/data/gios/__tests__/parseStations.test.ts`

```ts
import realStations from '../../../core/geo/__fixtures__/stations.json';
import garbage from '../__fixtures__/stationsWithGarbage.json';
import { parseStations } from '../stations';
import { nearestStation } from '../../../core/geo';

test('AC 005-4: parseStations maps GIOŚ findAll to Station[]', () => {
  const out = parseStations(realStations);
  expect(out[0]).toEqual({
    id: 400,
    name: 'Kraków, Aleja Krasińskiego',
    city: 'Kraków',
    lat: 50.057678,
    lon: 19.926189,
  });
  expect(out).toHaveLength(4);
});

test('AC 005-4b: parseStations drops entries with invalid coords; they never win nearest', () => {
  const out = parseStations(garbage);
  expect(out.map(s => s.id)).toEqual([530]); // station 999 (empty φ) dropped
  // and the dropped station cannot be returned as "nearest":
  expect(nearestStation(52.2, 21.0, out).id).toBe(530);
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm test -- parseStations`
Expected: FAIL — cannot resolve `../stations`.

- [ ] **Step 4: Write the implementation** — `src/data/gios/stations.ts`

Note: `Number('')` is `0` (finite!), so a bare `Number.isFinite` check would turn a blank coord into `(0, 0)`. Guard the raw string explicitly.

```ts
// Isolates GIOŚ v1's JSON-LD Polish keys for station/findAll. `any` is used
// deliberately: GIOŚ returns untyped external JSON, narrowed at this boundary.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Station } from '../../core/geo';
import { GIOS_BASE } from './constants';

const STATIONS_KEY = 'Lista stacji pomiarowych';
const LAT_KEY = 'WGS84 φ N'; // "WGS84 φ N" — φ is U+03C6
const LON_KEY = 'WGS84 λ E'; // "WGS84 λ E" — λ is U+03BB

// Empty/whitespace/null/non-numeric → NaN (so the entry is dropped). Guards the
// raw string because Number('') === 0, which would otherwise pass as valid.
function toCoord(v: unknown): number {
  if (typeof v !== 'string' || v.trim() === '') return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export function parseStations(findAllJson: any): Station[] {
  const list: any[] = findAllJson?.[STATIONS_KEY] ?? [];
  const out: Station[] = [];
  for (const e of list) {
    const lat = toCoord(e[LAT_KEY]);
    const lon = toCoord(e[LON_KEY]);
    if (Number.isNaN(lat) || Number.isNaN(lon)) continue; // drop invalid coords
    out.push({
      id: e['Identyfikator stacji'],
      name: e['Nazwa stacji'],
      city: e['Nazwa miasta'],
      lat,
      lon,
    });
  }
  return out;
}

export async function fetchStations(fetchImpl: typeof fetch = fetch): Promise<Station[]> {
  const json = await (await fetchImpl(`${GIOS_BASE}/station/findAll`)).json();
  return parseStations(json);
}
```

- [ ] **Step 5: Wire the re-export** — `src/data/gios/index.ts`

```ts
export * from './constants';
export * from './mappers';
export * from './stations';
export * from './source';
```

- [ ] **Step 6: Run to verify it passes**

Run: `npm test -- parseStations`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add src/data/gios/stations.ts src/data/gios/__fixtures__/stationsWithGarbage.json src/data/gios/index.ts src/data/gios/__tests__/parseStations.test.ts
git commit -m "feat(data/gios): parseStations + fetchStations, drop invalid coords (AC 005-4/4b)"
```

---

### Task 3: Refactor `createGiosSource` to per-Station builder; add `createNearestStationSource`

**Files:**
- Modify: `src/data/gios/constants.ts` (`KRAKOW_STATION` → full `Station`)
- Modify: `src/data/gios/source.ts` (private `readStation`; `createGiosSource` delegates; add `createNearestStationSource`)
- Test: `src/data/gios/__tests__/nearestSource.test.ts`
- Must stay green: `src/data/gios/__tests__/source.test.ts` (spec-004 AC-6)

**Interfaces:**
- Consumes: `Station`, `Geolocation`, `nearestStation`, `stationLabel` from `src/core/geo`; `fetchStations` from `./stations`; `findPm25SensorId`, `parseLatestPm25` from `./mappers`; `indexFromPm25`, `Reading`, `AirQualitySource` from `src/core/air`.
- Produces: `createNearestStationSource(geo: Geolocation, fetchImpl?: typeof fetch, fallbackStationId?: number): AirQualitySource`. `KRAKOW_STATION: Station`.

- [ ] **Step 1: Turn `KRAKOW_STATION` into a full `Station`** — `src/data/gios/constants.ts`

```ts
import type { Station } from '../../core/geo';

export const GIOS_BASE = 'https://api.gios.gov.pl/pjp-api/v1/rest';
export const KRAKOW_STATION_ID = 400;
// Full Station now; the hero label is derived via stationLabel(KRAKOW_STATION),
// no longer stored as a string (see source.ts).
export const KRAKOW_STATION: Station = {
  id: 400,
  name: 'Kraków, Aleja Krasińskiego',
  city: 'Kraków',
  lat: 50.057678,
  lon: 19.926189,
};
```

- [ ] **Step 2: Write the failing tests** — `src/data/gios/__tests__/nearestSource.test.ts`

Fake-fetch routing contract (spec 005 §"Fake-fetch routing contract"): `/station/findAll` → the 4-station fixture; `/station/sensors/{any}` → `sensors400.json`; `/data/getData/2752` → `getData2752.json`.

```ts
import realStations from '../../../core/geo/__fixtures__/stations.json';
import sensors from '../__fixtures__/sensors400.json';
import getData from '../__fixtures__/getData2752.json';
import { createNearestStationSource } from '../source';
import type { Geolocation } from '../../../core/geo';

const warsaw: Geolocation = { getCurrentPosition: async () => ({ lat: 52.22, lon: 21.0 }) };

// Builds a fake fetch; `override` lets a test force a specific URL to throw.
function makeFetch(override?: (url: string) => boolean) {
  const calls: string[] = [];
  const fetchImpl = ((url: string) => {
    calls.push(url);
    if (override?.(url)) return Promise.reject(new Error('boom'));
    const body = url.includes('/station/findAll')
      ? realStations
      : url.includes('/station/sensors/')
        ? sensors
        : getData;
    return Promise.resolve({ json: () => Promise.resolve(body) });
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

const KRAKOW_READING = {
  index: 5,
  pm25: 5.0,
  measuredAt: '2026-08-11 21:00:00',
  city: 'Kraków',
  station: 'Aleja Krasińskiego · stacja GIOŚ',
};

test('AC 005-5: resolves the nearest station (Warszawa 530) with its identity', async () => {
  const { fetchImpl, calls } = makeFetch();
  const reading = await createNearestStationSource(warsaw, fetchImpl).getCurrentReading();
  expect(reading).toEqual({
    index: 5,
    pm25: 5.0,
    measuredAt: '2026-08-11 21:00:00',
    city: 'Warszawa',
    station: 'Al. Niepodległości · stacja GIOŚ',
  });
  expect(calls[0]).toContain('/station/findAll');
  expect(calls[1]).toContain('/station/sensors/530');
  expect(calls[2]).toContain('/data/getData/2752');
});

test('AC 005-6a: geo reject → Kraków fallback, findAll never called', async () => {
  const { fetchImpl, calls } = makeFetch();
  const denied: Geolocation = {
    getCurrentPosition: async () => {
      throw new Error('permission denied');
    },
  };
  const reading = await createNearestStationSource(denied, fetchImpl).getCurrentReading();
  expect(reading).toEqual(KRAKOW_READING);
  expect(calls.some(u => u.includes('/station/findAll'))).toBe(false);
});

test('AC 005-6b: nearest reading fetch throws → Kraków fallback', async () => {
  const { fetchImpl } = makeFetch(url => url.includes('/data/getData/'));
  // getData throws for the Warszawa attempt; fallback re-reads Kraków, which
  // (per routing) resolves getData2752 on its retry — so guard only the first hit.
  let hit = 0;
  const guarded = ((url: string) => {
    if (url.includes('/data/getData/') && hit++ === 0) return Promise.reject(new Error('boom'));
    return (fetchImpl as any)(url);
  }) as unknown as typeof fetch;
  const reading = await createNearestStationSource(warsaw, guarded).getCurrentReading();
  expect(reading).toEqual(KRAKOW_READING);
});

test('AC 005-6c: stations findAll throws → Kraków fallback', async () => {
  const { fetchImpl } = makeFetch(url => url.includes('/station/findAll'));
  const reading = await createNearestStationSource(warsaw, fetchImpl).getCurrentReading();
  expect(reading).toEqual(KRAKOW_READING);
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm test -- nearestSource`
Expected: FAIL — `createNearestStationSource` not exported.

- [ ] **Step 4: Refactor** — `src/data/gios/source.ts`

```ts
import type { AirQualitySource, Reading } from '../../core/air';
import { indexFromPm25 } from '../../core/air';
import { nearestStation, stationLabel, type Geolocation, type Station } from '../../core/geo';
import { GIOS_BASE, KRAKOW_STATION, KRAKOW_STATION_ID } from './constants';
import { findPm25SensorId, parseLatestPm25 } from './mappers';
import { fetchStations } from './stations';

// Builds a Reading for one Station: sensors → PM2.5 sensor → latest value.
// Shared by the Kraków path and nearest-station resolution.
async function readStation(station: Station, fetchImpl: typeof fetch): Promise<Reading> {
  const sensors = await (await fetchImpl(`${GIOS_BASE}/station/sensors/${station.id}`)).json();
  const sensorId = findPm25SensorId(sensors);
  const data = await (await fetchImpl(`${GIOS_BASE}/data/getData/${sensorId}`)).json();
  const { pm25, measuredAt } = parseLatestPm25(data);
  return {
    index: indexFromPm25(pm25),
    pm25,
    measuredAt,
    city: station.city,
    station: stationLabel(station),
  };
}

// Kraków-only convenience source (spec 004). Signature kept for compatibility;
// `stationId` is retained for the 004 contract — v1 only Kraków's identity is
// known here, so nearest resolution goes through createNearestStationSource.
export function createGiosSource(
  fetchImpl: typeof fetch = fetch,
  _stationId: number = KRAKOW_STATION_ID,
): AirQualitySource {
  return { getCurrentReading: () => readStation(KRAKOW_STATION, fetchImpl) };
}

// Resolves the station nearest the device, falling back to Kraków on ANY
// failure (permission denied, geo error, stations fetch, or reading error).
export function createNearestStationSource(
  geo: Geolocation,
  fetchImpl: typeof fetch = fetch,
  _fallbackStationId: number = KRAKOW_STATION_ID,
): AirQualitySource {
  return {
    async getCurrentReading(): Promise<Reading> {
      try {
        const { lat, lon } = await geo.getCurrentPosition();
        const stations = await fetchStations(fetchImpl);
        return await readStation(nearestStation(lat, lon, stations), fetchImpl);
      } catch {
        return readStation(KRAKOW_STATION, fetchImpl);
      }
    },
  };
}
```

Note: `createGiosSource` renames the second param to `_stationId` to signal it is intentionally unused now (satisfies `no-unused-vars` while keeping the signature). If lint objects to the leading underscore, add `// eslint-disable-next-line` — but `@react-native` config allows `_`-prefixed unused args.

- [ ] **Step 5: Run all data/gios tests (new + the 004 regression)**

Run: `npm test -- src/data/gios`
Expected: PASS — `nearestSource` (4 tests), `source.test.ts` (AC-6 unchanged: still `city:'Kraków'`, `station:'Aleja Krasińskiego · stacja GIOŚ'`), `mappers`, `parseStations`.

- [ ] **Step 6: Commit**

```bash
git add src/data/gios/constants.ts src/data/gios/source.ts src/data/gios/__tests__/nearestSource.test.ts
git commit -m "feat(data/gios): per-Station reading builder + createNearestStationSource w/ Kraków fallback (AC 005-5/6a/6b/6c)"
```

---

### Task 4: Device geolocation adapter + ADR-010 + dependency + Info.plist

**Files:**
- Create: `src/data/location/index.ts`
- Create: `docs/decisions/010-geolocation.md`
- Modify: `package.json` (dep), `ios/Podfile.lock` (via `pod install`), `ios/Powietrze/Info.plist` (usage string)

**Interfaces:**
- Consumes: `Geolocation` from `src/core/geo`.
- Produces: `createDeviceGeolocation(): Geolocation`.

- [ ] **Step 1: Author ADR-010** — `docs/decisions/010-geolocation.md`

Record the decision and justify the choice (DoD gate per spec §Risks):

```markdown
# ADR-010: Device geolocation via @react-native-community/geolocation

**Status:** accepted · **Date:** 2026-08-11 · **Milestone:** M-loc

## Context
M-loc needs the device's current coordinates to pick the nearest GIOŚ station.
The app is bare React Native 0.86 on the New Architecture.

## Decision
Use `@react-native-community/geolocation`, wrapped behind the pure
`core/geo` `Geolocation` interface in a thin `src/data/location` adapter.

## Alternatives considered
- **react-native-geolocation-service** — effectively unmaintained; no active
  New-Arch support.
- **expo-location** — requires the Expo modules runtime, heavy to add to a
  bare RN app for one API.
- **@react-native-community/geolocation** — the community standard, supports
  the New Architecture on RN 0.86, smallest footprint for a bare app. Chosen.

## Consequences
- Adds one pod (`pod install`) and an iOS `NSLocationWhenInUseUsageDescription`
  usage string.
- Only "when in use" permission; no background location.
- The adapter is the sole untested-by-unit piece (thin; covered by manual AC 005-8).
```

- [ ] **Step 2: Add the dependency**

Run: `npm install @react-native-community/geolocation`
Then: `cd ios && pod install && cd ..`
Expected: package added; the new pod appears in `Podfile.lock`.

- [ ] **Step 3: Add the iOS usage string** — `ios/Powietrze/Info.plist`

Add inside the top-level `<dict>`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Powietrze używa Twojej lokalizacji, aby pokazać jakość powietrza z najbliższej stacji.</string>
```

- [ ] **Step 4: Write the adapter** — `src/data/location/index.ts`

Constructor does no IO; the permission prompt and read happen only on the first `getCurrentPosition()` call.

```ts
import Geo from '@react-native-community/geolocation';
import type { Geolocation } from '../../core/geo';

// Wraps @react-native-community/geolocation behind the pure Geolocation
// interface. No IO at construction — the OS permission prompt fires on the
// first getCurrentPosition() call. iOS Info.plist carries the usage string.
export function createDeviceGeolocation(): Geolocation {
  return {
    getCurrentPosition() {
      return new Promise((resolve, reject) => {
        Geo.getCurrentPosition(
          pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          err => reject(new Error(err.message)),
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
        );
      });
    },
  };
}
```

- [ ] **Step 5: Verify lint + typecheck (no unit test — thin native adapter)**

Run: `npm run lint && npm run typecheck`
Expected: green. (The adapter's runtime behavior is covered by manual AC 005-8.)

- [ ] **Step 6: Commit**

```bash
git add docs/decisions/010-geolocation.md src/data/location/index.ts package.json package-lock.json ios/Podfile.lock ios/Powietrze/Info.plist
git commit -m "feat(data/location): device geolocation adapter + ADR-010 + Info.plist (M-loc)"
```

---

### Task 5: Wire `App.tsx` to the nearest-station source + `TerazScreen` AC test

**Files:**
- Modify: `App.tsx`
- Test: `src/features/teraz/__tests__/TerazScreen.nearest.test.tsx`

**Interfaces:**
- Consumes: `createNearestStationSource` from `src/data/gios`; `createDeviceGeolocation` from `src/data/location`; `KRAKOW_STATION_ID` from `src/data/gios`.

- [ ] **Step 1: Write the failing test** — `src/features/teraz/__tests__/TerazScreen.nearest.test.tsx`

`TerazScreen` already renders `reading.city`/`reading.index` generically; this test pins that a non-Kraków reading renders as-is (not hardcoded Kraków) and that loading shows first.

```tsx
import { render, screen } from '@testing-library/react-native';
import { TerazScreen } from '../TerazScreen';
import { AirSourceProvider } from '../AirSourceContext';
import type { AirQualitySource, Reading } from '../../../core/air';

const warsawReading: Reading = {
  index: 42,
  pm25: 43,
  measuredAt: '2026-08-11 21:00:00',
  city: 'Warszawa',
  station: 'Al. Niepodległości · stacja GIOŚ',
};

test('AC 005-7: TerazScreen renders the resolved (non-Kraków) city + index', async () => {
  const source: AirQualitySource = { getCurrentReading: async () => warsawReading };
  render(
    <AirSourceProvider source={source}>
      <TerazScreen />
    </AirSourceProvider>,
  );
  expect(await screen.findByText('Warszawa')).toBeTruthy();
  expect(screen.getByText('42')).toBeTruthy();
});
```

- [ ] **Step 2: Run to verify it fails (or passes trivially)**

Run: `npm test -- TerazScreen.nearest`
Expected: PASS is acceptable here — `TerazScreen` is already source-agnostic; the test guards against a future Kraków hardcode. If it fails, `TerazScreen` is wrongly pinned to Kraków — fix it to use `reading.city`/`reading.index` (it already does per current code).

- [ ] **Step 3: Wire the real source** — `App.tsx`

```tsx
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { AirQualitySource } from './src/core/air';
import { createNearestStationSource, KRAKOW_STATION_ID } from './src/data/gios';
import { createDeviceGeolocation } from './src/data/location';
import { AirSourceProvider } from './src/features/teraz/AirSourceContext';
import { AppNavigator } from './src/app/AppNavigator';

// One stable instance across renders. Nearest station by device location,
// falling back to Kraków on any failure.
const defaultSource = createNearestStationSource(
  createDeviceGeolocation(),
  fetch,
  KRAKOW_STATION_ID,
);

function App({ source = defaultSource }: { source?: AirQualitySource }) {
  return (
    <AirSourceProvider source={source}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />
        <AppNavigator />
      </SafeAreaProvider>
    </AirSourceProvider>
  );
}

export default App;
```

- [ ] **Step 4: Run the full gate**

Run: `npm run lint && npm run typecheck && npm test`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add App.tsx src/features/teraz/__tests__/TerazScreen.nearest.test.tsx
git commit -m "feat(app): wire TerazScreen to nearest-station source (AC 005-7)"
```

---

### Task 6: Manual simulator verification (AC 005-8)

**Files:**
- Modify: `docs/harness/05-nearest-station.md` (journal — record evidence)

This task has no code; it produces recorded manual evidence for the visual/native AC that unit tests cannot cover. A native rebuild is required (new pod).

- [ ] **Step 1: Native rebuild + boot**

Run: `npx react-native run-ios --simulator "iPhone 16 Pro"` (or reuse the running sim; the new pod requires a fresh native build).
Expected: app launches; Metro serves this worktree.

- [ ] **Step 2: Set a non-Kraków location and screenshot**

In the simulator: **Features → Location → Custom Location…**, enter Warszawa (52.2297, 21.0122). Reload JS (Metro `r`). Grant the location prompt.
Run: `xcrun simctl io booted screenshot /tmp/claude/mloc-warszawa.png`
Expected: Teraz shows a Warszawa-area station's **real** live air (city ≠ Kraków), a real freshness line.

- [ ] **Step 3: Deny location and screenshot the Kraków fallback**

Reset location permission (**Features → Location → None**, or deny at the prompt after a fresh install). Reload JS.
Run: `xcrun simctl io booted screenshot /tmp/claude/mloc-fallback-krakow.png`
Expected: Teraz shows **Kraków** (`Aleja Krasińskiego · stacja GIOŚ`) — the fallback.

- [ ] **Step 4: Record evidence in the harness journal** — `docs/harness/05-nearest-station.md`

Write the journal (what the app gained, what the harness gained, the critic's pre-build findings, known limitations incl. the silent-fallback tradeoff S6, and a retro placeholder), and note the two screenshot paths as the AC 005-8 evidence.

- [ ] **Step 5: Commit**

```bash
git add docs/harness/05-nearest-station.md
git commit -m "docs(harness): journal 05 nearest-station + AC 005-8 manual evidence"
```

---

## Self-Review

**1. Spec coverage:** AC 005-1/2/3 → Task 1; AC 005-4/4b → Task 2; AC 005-5/6a/6b/6c → Task 3; ADR-010 + dep + Info.plist + adapter → Task 4; AC 005-7 + App wiring → Task 5; AC 005-8 (manual) → Task 6. Spec §"Fake-fetch routing contract" → Task 3 test. `KRAKOW_STATION` literal (B1) → Task 3 Step 1; 004 regression guard (B1) → Task 3 Step 5 (source.test.ts unchanged). Invalid-coord hardening (B2) → Task 2 (`toCoord` + AC 005-4b). Silent-fallback tradeoff (S6) → recorded in Task 6 journal. Every spec item maps to a task.

**2. Placeholder scan:** No TBD/TODO; every code step carries real code; every test step carries real assertions. No "similar to Task N" — code repeated where needed.

**3. Type consistency:** `Station`/`Geolocation` defined in Task 1 are consumed with the same field names (`id/name/city/lat/lon`, `getCurrentPosition`) in Tasks 2/3/4/5. `createNearestStationSource(geo, fetchImpl?, fallbackStationId?)` signature identical in Task 3 (definition) and Task 5 (call). `readStation` is module-private to `source.ts` (Task 3), never imported elsewhere. `KRAKOW_STATION_ID` re-exported via `src/data/gios/index.ts` (existing `export * from './constants'`) and imported in Task 5.
