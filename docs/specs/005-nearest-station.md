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
- **Background refresh / caching** → later. `getCurrentReading()` re-runs geo +
  `fetchStations` on every call (e.g. pull-to-refresh), re-prompting geolocation;
  acceptable in v1 (see Resolved ambiguities).
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
// Hero station label from a Station: strip a leading "<city>, " and add the GIOŚ suffix.
export function stationLabel(station: Station): string; // "Kraków, Aleja Krasińskiego" → "Aleja Krasińskiego · stacja GIOŚ"
```

`src/data/gios` (grows):
```ts
export function parseStations(findAllJson: unknown): Station[]; // pure map; drops entries with invalid coords
export function fetchStations(fetchImpl?: typeof fetch): Promise<Station[]>;
// The reading now carries the resolved station's identity (city + stationLabel):
export function createNearestStationSource(
  geo: Geolocation, fetchImpl?: typeof fetch, fallbackStationId?: number,
): AirQualitySource;
```

**`createGiosSource` refactor (B1).** `createGiosSource` is refactored to delegate
to a private per-`Station` reading builder (fetch `/station/sensors/{station.id}` →
`findPm25SensorId` → `/data/getData/{sensorId}` → `parseLatestPm25` → a `Reading`
whose `city = station.city` and `station = stationLabel(station)`). Both Kraków and
an arbitrary nearest station share this one path.

- **`createGiosSource`'s public signature is UNCHANGED**: `createGiosSource(fetchImpl?: typeof fetch, stationId?: number)`,
  default `stationId = KRAKOW_STATION_ID`. When `stationId === 400` it builds the
  reading from the `KRAKOW_STATION` constant, so the existing spec-004 path and its
  `source.test.ts` are untouched. External callers (root `App.tsx`, spec 004) do not change.
- **`KRAKOW_STATION` becomes a full `Station`** (was `{ city, station }` strings):
  `{ id: 400, name: 'Kraków, Aleja Krasińskiego', city: 'Kraków', lat: 50.057678, lon: 19.926189 }`.
  The hero label `'Aleja Krasińskiego · stacja GIOŚ'` is now produced by
  `stationLabel(KRAKOW_STATION)`, not stored as a literal.

`src/data/location/index.ts` (new; native adapter):
```ts
export function createDeviceGeolocation(): Geolocation; // @react-native-community/geolocation
```
`createDeviceGeolocation()` is a cheap constructor: it does **no** IO and triggers
**no** permission prompt at construction. The OS permission prompt and the location
read happen only on the first `getCurrentPosition()` call. This lets root `App.tsx`
construct the source at module scope, as it does today for `createGiosSource()`.

Root `App.tsx` (not `src/app`) wires
`createNearestStationSource(createDeviceGeolocation(), fetch, KRAKOW_STATION_ID)`
in place of today's `createGiosSource()`.

## Behavior — Acceptance Criteria

Core `src/core/geo` — unit-tested, pinned:
- **AC-1** — `distanceKm` is haversine. Pins: `distanceKm(50.057678,19.926189, 50.057678,19.926189) === 0`; `distanceKm(50.057678,19.926189, 52.219298,21.004724)` ≈ **252 km** (Kraków↔Warszawa, `toBeCloseTo(252, -1)` — within ~5 km; independently recomputed 251.86 km at R=6371).
- **AC-2** — `nearestStation(lat, lon, stations)` returns the station minimizing
  `distanceKm`, against the captured `__fixtures__/stations.json` (Kraków 400,
  Warszawa 530, Gdańsk 706, Wrocław 114). Pins: near Kraków `(50.06, 19.94) → 400`;
  near Warszawa `(52.22, 21.00) → 530`; near Gdańsk `(54.40, 18.61) → 706`.
  Empty `stations` → throws a clear `Error`.
- **AC-3** — `stationLabel` strips a leading `"<city>, "` and appends `" · stacja GIOŚ"`.
  Pins: `stationLabel({name:'Kraków, Aleja Krasińskiego', city:'Kraków', …}) === 'Aleja Krasińskiego · stacja GIOŚ'`;
  **no-prefix case** — `stationLabel({name:'Czerniawa', city:'Czerniawa', …}) === 'Czerniawa · stacja GIOŚ'`
  (a real `findAll` name where `name === city`, no comma — 30 such stations exist live).

Data `src/data/gios` — pure mapper + adapter (fixtures / fake fetch):
- **AC-4** — `parseStations(stations.json)` → `Station[]`. It reads the top-level
  array key `"Lista stacji pomiarowych"`; per entry, `id`/`name`/`city` from
  `"Identyfikator stacji"`/`"Nazwa stacji"`/`"Nazwa miasta"`, and `lat`/`lon` parsed
  (dot-decimal `Number(...)`) from the `"WGS84 φ N"`/`"WGS84 λ E"` **strings** (keys
  use U+03C6 φ and U+03BB λ — the mapper MUST read them from the fixture, never
  retype the Greek letters). Pin the Kraków entry
  = `{ id:400, name:'Kraków, Aleja Krasińskiego', city:'Kraków', lat:50.057678, lon:19.926189 }`.
- **AC-4b** *(invalid-coord hardening — was BLOCKER B2, downgraded)* —
  `parseStations` **drops** any entry whose `"WGS84 φ N"` or `"WGS84 λ E"` is
  empty/`null`/non-numeric (`Number(...)` → `NaN` or not finite), so no `NaN`-coord
  station can reach `nearestStation`. A synthetic fixture entry with an empty
  `"WGS84 φ N"` is skipped: `parseStations(fixtureWithGarbageEntry)` does not include
  it, and `nearestStation` over the result never returns it. *(Rationale: today's live
  `station/findAll` — 288 stations — has zero blank/comma coords, so this is
  defensive over untrusted external JSON, not a live bug. Decimal format is dot-only
  in GIOŚ v1; no comma-locale handling in v1.)*

- **AC-5** — `createNearestStationSource(fakeGeo, fakeFetch)` where `fakeGeo`
  resolves a position near Warszawa `(52.22, 21.00)` and `fakeFetch` follows the
  routing contract below, resolves a **literal-pinned** `Reading` for **station 530**:
  `{ index: 5, pm25: 5.0, measuredAt: '2026-08-11 21:00:00', city: 'Warszawa', station: 'Al. Niepodległości · stacja GIOŚ' }`.
  It calls, in order, `${GIOS_BASE}/station/findAll`, `${GIOS_BASE}/station/sensors/530`,
  `${GIOS_BASE}/data/getData/2752`.
- **AC-6a** — Fallback (geo reject): when `fakeGeo.getCurrentPosition()` **rejects**
  (permission denied), the source resolves the Kraków 400 `Reading`
  (`city:'Kraków'`, `station:'Aleja Krasińskiego · stacja GIOŚ'`), never calling `findAll`.
- **AC-6b** — Fallback (reading throws): `fakeGeo` resolves near Warszawa, `findAll`
  and `/sensors/530` succeed, but `/data/getData/2752` **throws** → the source falls
  back to the Kraków 400 `Reading`.
- **AC-6c** — Fallback (stations fetch throws): `fakeGeo` resolves near Warszawa but
  `${GIOS_BASE}/station/findAll` **throws** → the source falls back to the Kraków 400 `Reading`.

Screen — RNTL:
- **AC-7** — `TerazScreen` with a fake source resolving a nearest `Reading`
  (city `Warszawa`, index N) renders that city + index (not hardcoded Kraków);
  loading state while pending.

Manual:
- **AC-8** — On the simulator with a **set location** (a Polish city, e.g. Warszawa),
  Teraz shows the nearest station's real live air; with location **denied**, it shows
  Kraków. *(Two screenshots.)*

### Fake-fetch routing contract (AC-5, AC-6) — explicit (S3)

The fake `fetch` in `nearestSource.test.ts` maps URL → committed fixture:

| URL suffix | fixture | note |
|---|---|---|
| `/station/findAll` | `src/core/geo/__fixtures__/stations.json` | the 4-station fixture |
| `/station/sensors/{id}` (any `{id}`) | `src/data/gios/__fixtures__/sensors400.json` | **reused** for any station id |
| `/data/getData/2752` | `src/data/gios/__fixtures__/getData2752.json` | PM2.5 = 5.0 |

**Fidelity compromise (stated, not hidden):** no real `/sensors/530` payload is
captured, so the fake reuses station-400's `sensors400.json` for `/sensors/530`. Its
PM2.5 sensor id (2752) drives `/data/getData/2752`, yielding pm25 5.0 → index 5. The
*value* is station-400 sensor data; the *identity* (city/label) still comes from the
resolved `Station` 530 via `stationLabel`, which is what AC-5 pins. AC-6a/6b/6c reuse
the same map (6c makes `findAll` throw; 6b makes `/data/getData/2752` throw).

## Resolved ambiguities

- **Nearest = geometric** (haversine over all valid-coord `station/findAll` entries).
  No "has PM2.5" pre-filter in v1; a failed reading falls back to Kraków.
- **Station identity in the Reading** comes from the resolved `Station` (city +
  `stationLabel`), so the hero shows the real place. `createGiosSource` is refactored
  to a per-`Station` reading builder (signature unchanged, default Kraków); Kraków is
  just `KRAKOW_STATION`.
- **Four fallback triggers, all → Kraków** (AC-6a/6b/6c cover geo-reject, reading-throw,
  stations-fetch-throw; "permission denied" and "geo error" are the same geo-reject
  path): a quiet, always-shows-something behavior; no crash, no prompt loop.
- **Silent Kraków fallback is an accepted v1 tradeoff (S6).** `Reading` gains **no**
  `isFallback` marker in v1: a user who denies permission sees "Kraków" with no
  distinguishing signal. Chosen deliberately to keep the model unchanged; a fallback
  indicator (badge / "domyślnie" note) is a **noted follow-up** for M-miejsca, not this
  milestone. Recorded here so it is an examined decision, not a silent side effect.
- **Geolocation is injected** (`Geolocation` interface) → a fake in tests; the device
  adapter (`@react-native-community/geolocation`) is the only untested-by-unit piece
  (thin; covered by the manual AC).
- **`fetchStations`** is unpaginated `findAll` (~288 stations, ~one-time per launch);
  kept in memory, no cache in v1. `getCurrentReading()` re-fetches on every call.

## Risks & config

- **New dep `@react-native-community/geolocation` → ADR-010 is a DoD gate (S5)**, not
  just a risk. `docs/decisions/010-*.md` MUST exist before merge and MUST justify the
  choice over alternatives: `react-native-geolocation-service` (effectively
  unmaintained) and `expo-location` (needs the Expo modules runtime — heavy for a bare
  RN app). `@react-native-community/geolocation` supports the New Architecture on RN
  0.86 and is the lightest fit for a bare new-arch app. The dep also requires
  `pod install` and an iOS `Info.plist` `NSLocationWhenInUseUsageDescription` usage
  string in `ios/Powietrze/Info.plist`.
- `api.gios.gov.pl` already in the sandbox allowlist (spec 004). Jest never hits the
  network (fixtures + injected `fetch`/`geo`).
- Sim testing needs a **set simulator location** (Features → Location).
- No `no-hex`/size concerns; `src/core` stays pure (geo math only).
- **AC-id collision (NIT):** spec 004's `source.test.ts` already has a test named
  `AC-6`. Spec 005's data tests live under `src/data/gios/__tests__` too — name every
  005 test with the spec number (`AC 005-5`, `AC 005-6a`, …) to keep traceability honest.

## Verification

- **AC-1…AC-3** — `src/core/geo/__tests__/*`.
- **AC-4, AC-4b** — `src/data/gios/__tests__/parseStations.test.ts` (real fixture +
  a synthetic garbage-coord entry).
- **AC-5, AC-6a, AC-6b, AC-6c** — `src/data/gios/__tests__/nearestSource.test.ts`
  (fake geo + fake fetch per the routing contract).
- **AC-7** — RNTL with a fake `AirQualitySource`.
- **AC-8** — recorded manual evidence: simulator screenshots (set location + denied).
