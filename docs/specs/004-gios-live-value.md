# Spec 004: GIOŚ live value (Kraków)

**Status:** draft
**Milestone:** M-data-1 (GIOŚ live value)
**Sources:** `design/README.md` §"State Management" (data fetching, freshness),
§"Screens/Views → 1. Teraz" (freshness line, loading/stale states); GIOŚ v1 API
`https://api.gios.gov.pl/pjp-api/swagger-ui/`; `src/core/scene` (M1 — `scene(index)`).

## Scope

Replace the mock index with a **real GIOŚ PM2.5 reading** for the fixed Kraków
station (Aleja Krasińskiego, id 400), derived to the app's numeric index and
driving the existing `scene()` → hero → atmosphere unchanged. The app calls
GIOŚ **directly** behind a `src/core` data-source interface (the concrete
adapter is injected). Includes **loading** and **error/stale** states (keep the
last good value + show freshness). One value, one station, one fetch.

## Non-goals

- **Multi-station / Miejsca list / search** → later loop.
- **Auto-refresh / polling / pull-to-refresh** → later. The interface makes a
  simple pull trivial to add without re-architecting; not built now.
- **Caching / offline persistence** → later (no `AsyncStorage`, no disk cache).
- **The owned proxy** → later (ADR-009 records the direct-to-GIOŚ decision).
- **WidgetKit** → future; the reusable `core`/`data` pieces are shaped so a
  widget extension can share the derivation + fetch (via App Groups), but no
  native widget work here.
- **GIOŚ's own 0–5 category index** — the app uses a continuous index derived
  from the PM2.5 concentration instead (see Resolved ambiguities).

## Public API

`src/core/air/index.ts` (pure, zero React/IO — the contract + derivation):
```ts
export interface Reading {
  index: number;      // indexFromPm25(pm25)
  pm25: number;       // µg/m³ from GIOŚ
  measuredAt: string; // GIOŚ "Data" timestamp of the reading
}
export interface AirQualitySource {
  getCurrentReading(): Promise<Reading>;
}
export const PM25_INDEX_DIVISOR = 1.03; // app models pm25 = round(index*1.03)
export function indexFromPm25(pm25: number): number; // Math.round(pm25 / 1.03)
```

`src/data/gios/index.ts` (the adapter — does IO; new `data` layer):
```ts
export const KRAKOW_STATION_ID = 400;
export const GIOS_BASE = 'https://api.gios.gov.pl/pjp-api/v1/rest';
// Pure mappers over GIOŚ's JSON-LD (Polish keys) — unit-tested with fixtures:
export function findPm25SensorId(sensorsJson: unknown): number;
export function parseLatestPm25(
  getDataJson: unknown,
): { pm25: number; measuredAt: string };
// Adapter: sensors/400 → PM2.5 sensor → getData → latest non-null → Reading.
export function createGiosSource(
  fetchImpl?: typeof fetch,
  stationId?: number,
): AirQualitySource;
```

`src/features/teraz` (consumes via the interface, injected):
- `AirSourceContext` (React context carrying an `AirQualitySource`) + provider,
  wired in `src/app` with the real `createGiosSource()`; a fake source is
  provided in tests.
- `useCurrentReading(): { status: 'loading' | 'ready' | 'stale'; reading?: Reading }`
  — fetches once on mount; on error, `status:'stale'` keeping the last `reading`
  if any (else stays without one).

## Behavior — Acceptance Criteria

Pure core (`src/core/air`) — unit-tested, literal-pinned:
- **AC-1** — `indexFromPm25(pm25) === round(pm25/1.03)`. Pins:
  `indexFromPm25(5) === 5`, `indexFromPm25(122) === 118` (the mock),
  `indexFromPm25(180) === 175`, `indexFromPm25(0) === 0`.
- **AC-2** *(literal fixture)* — `PM25_INDEX_DIVISOR === 1.03`.

Pure GIOŚ mappers (`src/data/gios`) — tested against the **captured real
fixtures** (`__fixtures__/sensors400.json`, `getData2752.json`):
- **AC-3** — `findPm25SensorId(sensors400)` returns the sensor whose
  `"Wskaźnik - kod" === "PM2.5"` → **2752**. A sensors payload with no PM2.5
  sensor throws a clear `Error`.
- **AC-4** — `parseLatestPm25(getData2752)` returns the most recent entry in
  `"Lista danych pomiarowych"` whose `"Wartość"` is non-null →
  `{ pm25: <fixture value>, measuredAt: <fixture "Data"> }`. Entries with null
  `Wartość` are skipped; an all-null/empty list throws.

Adapter + hook + screen:
- **AC-5** — `createGiosSource(fakeFetch).getCurrentReading()` with `fakeFetch`
  returning the two fixtures resolves to `Reading` with `pm25` = the fixture's
  latest, `index === indexFromPm25(pm25)`, `measuredAt` = the fixture timestamp.
  It issues exactly the two documented requests (sensors then getData).
- **AC-6** *(hook states, RNTL)* — `useCurrentReading` starts `loading`; with a
  fake source resolving a fixed `Reading`, transitions to `ready` exposing it;
  with a fake source that rejects, transitions to `stale` without throwing (and
  keeps a prior `reading` if one had loaded).
- **AC-7** *(screen, RNTL)* — `TerazScreen` given a fake source resolving
  `Reading{index:118,...}` renders `'118'`, `'Zły'`, and the atmosphere
  (`testID="atmosphere"`); while the source is pending it renders a loading
  state (no crash, no mock literals).
- **AC-8** *(manual)* — On the simulator, Teraz shows Kraków's **real current**
  GIOŚ value (PM2.5 → index → scene), with the real freshness timestamp.
  *(Screenshot; live value varies.)*

## Resolved ambiguities

- **Index from PM2.5, not GIOŚ's category.** GIOŚ's `aqindex` is a discrete 0–5
  level; the app needs a continuous number for smooth `scene()` interpolation.
  The app already models `pm25 = round(index*1.03)`, so `index = round(pm25/1.03)`
  is the exact inverse and yields a continuous real index (122 µg/m³ → 118).
- **PM2.5 is the driver** (not the overall/critical-pollutant index) — the app's
  design is PM2.5-centric (atmosphere density = PM2.5, hero shows PM2.5).
- **Latest reading** = the most recent `"Lista danych pomiarowych"` entry with a
  non-null `"Wartość"` (GIOŚ often reports the newest hour as null until settled).
- **Error/stale** = on fetch failure keep the last good `reading` and mark
  `stale`; initial-load failure yields `stale` with no reading (a quiet fallback,
  not a crash). No retry/caching in v1.
- **Station fixed to 400**; real location/search deferred.
- **DI** via React context so a fake source is trivial in tests and the real
  adapter is created once in `src/app`.

## Risks & config

- **Sandbox network allowlist** must add `api.gios.gov.pl` (dev/manual run).
  Jest never hits the network — mappers use committed fixtures, the adapter uses
  an injected `fetch`.
- **Boundaries lint**: add a `data` element (`src/data/*`); allow `app → data`,
  `data → core`; features consume only the `core` interface (adapter injected).
  ADR-009 records the direct-to-GIOŚ architecture (amends design's "owned server").
- GIOŚ v1 JSON-LD uses **Polish keys** (`"Wskaźnik - kod"`, `"Wartość"`,
  `"Lista danych pomiarowych"`) — all isolation lives in the two pure mappers.
- No new npm dependencies (RN global `fetch`).

## Verification

- **AC-1…AC-5** — unit tests `src/core/air/__tests__/*`, `src/data/gios/__tests__/*`
  (mappers against committed fixtures; adapter with a fake `fetch`).
- **AC-6, AC-7** — RNTL with a fake `AirQualitySource`.
- **AC-8** — recorded manual evidence: simulator screenshot of the real value.
