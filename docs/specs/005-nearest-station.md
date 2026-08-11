# Spec 005: Nearest station (your location)

**Status:** draft
**Milestone:** M-loc (geolocation → nearest station)
**Sources:** `design/README.md` §"Screens/Views → 1. Teraz" ("glanceable current
condition for the user's location"), §"State Management"; GIOŚ v1
`station/findAll` (WGS84 coords); `docs/specs/004-gios-live-value.md` (the
`AirQualitySource` seam this generalizes).

## Scope

On launch, resolve the **nearest GIOŚ station** from the device's location and
show its live air on Teraz. Permission denied or any failure → **fall back to
Kraków (station 400)**. Generalizes the GIOŚ source: the air reading now targets
whichever station the resolver picks, filling the hero's city/station from that
station's identity.

## Non-goals

- **Search UI + favorites / Miejsca** → M-miejsca (reuses `fetchStations`).
- **Background refresh / caching** → later.
- **Nearest station that *has* PM2.5** — v1 picks the geometrically nearest; if
  its reading fails (some stations lack a PM2.5 sensor), it falls back to Kraków
  rather than scanning outward. Most urban stations have PM2.5.
- **Manual location entry** → part of M-miejsca's search.

## Public API

`src/core/geo/index.ts` (pure; zero React/IO):
```ts
export interface Station { id: number; name: string; city: string; lat: number; lon: number; }
export interface Geolocation { getCurrentPosition(): Promise<{ lat: number; lon: number }>; }
export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number; // haversine
export function nearestStation(lat: number, lon: number, stations: Station[]): Station; // throws on []
// Hero station label from a Station: strip the leading "City, " and add the GIOŚ suffix.
export function stationLabel(station: Station): string; // "Kraków, Aleja Krasińskiego" → "Aleja Krasińskiego · stacja GIOŚ"
```

`src/data/gios` (grows):
```ts
export function parseStations(findAllJson: unknown): Station[]; // pure map of the WGS84/name/city keys
export function fetchStations(fetchImpl?: typeof fetch): Promise<Station[]>;
// The reading now carries the resolved station's identity (city + stationLabel):
export function createNearestStationSource(
  geo: Geolocation, fetchImpl?: typeof fetch, fallbackStationId?: number,
): AirQualitySource;
```
`createGiosSource` is refactored to build a `Reading` for a given `Station`
(via `stationLabel`), so Kraków and an arbitrary nearest station share one path.
`KRAKOW_STATION` becomes a full `Station` (id 400 + coords).

`src/data/location/index.ts` (new; native adapter):
```ts
export function createDeviceGeolocation(): Geolocation; // @react-native-community/geolocation
```

`src/app` wires `createNearestStationSource(createDeviceGeolocation(), fetch, KRAKOW_STATION_ID)`.

## Behavior — Acceptance Criteria

Core `src/core/geo` — unit-tested, pinned:
- **AC-1** — `distanceKm` is haversine. Pins: `distanceKm(50.057678,19.926189, 50.057678,19.926189) === 0`; `distanceKm(50.057678,19.926189, 52.219298,21.004724)` ≈ **252 km** (Kraków↔Warszawa, `toBeCloseTo(252, -1)` — within ~5 km).
- **AC-2** — `nearestStation(lat, lon, stations)` returns the station minimizing
  `distanceKm`, against the captured `__fixtures__/stations.json` (Kraków 400,
  Warszawa 530, Gdańsk 706, Wrocław 114). Pins: near Kraków `(50.06, 19.94) → 400`;
  near Warszawa `(52.22, 21.00) → 530`; near Gdańsk `(54.40, 18.61) → 706`.
  Empty `stations` → throws a clear `Error`.
- **AC-3** — `stationLabel({name:'Kraków, Aleja Krasińskiego', city:'Kraków', …}) === 'Aleja Krasińskiego · stacja GIOŚ'`; a name without a `"City, "` prefix → `'<name> · stacja GIOŚ'`.

Data `src/data/gios` — pure mapper + adapter (fixtures / fake fetch):
- **AC-4** — `parseStations(stations.json)` → `Station[]` with numeric `lat/lon`
  parsed from the `"WGS84 φ N"`/`"WGS84 λ E"` strings, `id`/`name`/`city` from
  `"Identyfikator stacji"`/`"Nazwa stacji"`/`"Nazwa miasta"`. Pin the first entry
  = `{ id:400, name:'Kraków, Aleja Krasińskiego', city:'Kraków', lat:50.057678, lon:19.926189 }`.
- **AC-5** — `createNearestStationSource(fakeGeo, fakeFetch)` where `fakeGeo`
  returns a position near Warszawa and `fakeFetch` serves the stations +
  sensors + getData fixtures, resolves a `Reading` for **station 530** with its
  city (`Warszawa`) and `stationLabel`, `index === indexFromPm25(pm25)`.
- **AC-6** — Fallback: when `fakeGeo` **rejects** (permission denied), the source
  resolves a `Reading` for **Kraków 400** (the fallback). Same when the resolved
  nearest station's reading fetch throws.

Screen — RNTL:
- **AC-7** — `TerazScreen` with a fake source resolving a nearest `Reading`
  (city `Warszawa`, index N) renders that city + index (not hardcoded Kraków);
  loading state while pending.

Manual:
- **AC-8** — On the simulator with a **set location** (a Polish city), Teraz shows
  the nearest station's real live air; with location **denied**, it shows Kraków.
  *(Two screenshots.)*

## Resolved ambiguities

- **Nearest = geometric** (haversine over all `station/findAll` entries). No
  "has PM2.5" pre-filter in v1; a failed reading falls back to Kraków.
- **Station identity in the Reading** comes from the resolved `Station` (city +
  `stationLabel`), so the hero shows the real place. `createGiosSource` is
  refactored to a per-`Station` reading builder; Kraków is just `KRAKOW_STATION`.
- **Permission denied / geo error / stations fetch error / reading error** all →
  Kraków fallback (a quiet, always-shows-something behavior; no crash, no prompt loop).
- **Geolocation is injected** (`Geolocation` interface) → a fake in tests; the
  device adapter (`@react-native-community/geolocation`) is the only untested-by-unit
  piece (thin; covered by the manual AC).
- **`fetchStations`** is unpaginated `findAll` (a few hundred stations, ~one-time
  per launch); kept in memory, no cache in v1.

## Risks & config

- **New dep `@react-native-community/geolocation`** → **ADR-010**, pods
  (`pod install`), and iOS `Info.plist` `NSLocationWhenInUseUsageDescription`
  (a usage string) — added to `ios/Powietrze/Info.plist`.
- `api.gios.gov.pl` already in the sandbox allowlist (spec 004). Jest never hits
  the network (fixtures + injected `fetch`/`geo`).
- Sim testing needs a **set simulator location** (Features → Location).
- No `no-hex`/size concerns; `src/core` stays pure (geo math only).

## Verification

- **AC-1…AC-4** — `src/core/geo/__tests__/*`, `src/data/gios/__tests__/*`
  (fixtures + fake fetch).
- **AC-5, AC-6** — `src/data/gios/__tests__/nearestSource.test.ts` (fake geo + fetch).
- **AC-7** — RNTL with a fake `AirQualitySource`.
- **AC-8** — recorded manual evidence: simulator screenshots (set location + denied).
