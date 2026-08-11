# Spec 004: GIOŚ live value (Kraków)

**Status:** draft
**Milestone:** M-data-1 (GIOŚ live value)
**Sources:** `design/README.md` §"State Management" (data fetching, freshness),
§"Screens/Views → 1. Teraz" (`station · freshness` line, loading/stale); GIOŚ v1
API `https://api.gios.gov.pl/pjp-api/swagger-ui/`; `src/core/scene` (M1).

## Scope

Replace the mock index with a **real GIOŚ PM2.5 reading** for the fixed Kraków
station (Aleja Krasińskiego, id 400), derived to the app's numeric index and
driving the existing `scene()` → hero → atmosphere. The app calls GIOŚ
**directly** behind a `src/core` interface (the concrete adapter is injected).
Includes **loading** and **error/stale** states (keep last good value + show the
real freshness). One value, one station, one fetch.

## Non-goals

- **Multi-station / Miejsca / search**, **auto-refresh/polling/pull-to-refresh**,
  **caching / offline persistence**, the **owned proxy** → later loops. The
  interface makes a simple pull trivial to add later; not built now.
- **WidgetKit** → future; the reusable `core`/`data` pieces are widget-shareable
  (App Groups), but no native widget work here.
- **GIOŚ's own 0–5 category index** — the app derives a continuous index from the
  PM2.5 concentration instead (Resolved ambiguities).

## Public API

`src/core/air/index.ts` (pure; zero React/IO — the contract + derivation):
```ts
export interface Reading {
  index: number;      // indexFromPm25(pm25)
  pm25: number;       // real µg/m³ from GIOŚ (the value the hero shows)
  measuredAt: string; // GIOŚ "Data" string, e.g. "2026-08-11 21:00:00" (local, Europe/Warsaw)
  city: string;       // filled by the source (station identity)
  station: string;    // e.g. "Aleja Krasińskiego · stacja GIOŚ"
}
export interface AirQualitySource { getCurrentReading(): Promise<Reading>; }
export const PM25_INDEX_DIVISOR = 1.03; // app models pm25 = round(index*1.03)
export function indexFromPm25(pm25: number): number; // round(pm25 / PM25_INDEX_DIVISOR)
// Relative freshness label; `now` injected for testability. Treats measuredAt as
// device-local (assumed Europe/Warsaw — the app is Poland-only). See ambiguities.
export function formatFreshness(measuredAt: string, now: Date): string;
```

`src/data/gios/` — split by responsibility (pure vs IO):
- `constants.ts`: `GIOS_BASE = 'https://api.gios.gov.pl/pjp-api/v1/rest'`,
  `KRAKOW_STATION_ID = 400`, `KRAKOW_STATION = { city: 'Kraków', station: 'Aleja Krasińskiego · stacja GIOŚ' }`.
- `mappers.ts` (pure): `findPm25SensorId(sensorsJson: unknown): number`,
  `parseLatestPm25(getDataJson: unknown): { pm25: number; measuredAt: string }`.
- `source.ts` (IO): `createGiosSource(fetchImpl?: typeof fetch, stationId?: number): AirQualitySource`.
- `index.ts`: re-exports.

`src/features/teraz`:
- `AirSourceContext` (React context carrying an `AirQualitySource`) + provider,
  wired in `src/app` with the real `createGiosSource()`; tests provide a fake.
- `useCurrentReading(): { status: 'loading' | 'ready' | 'stale'; reading?: Reading }`
  — fetch once on mount; on rejection → `stale`, keeping the last `reading` if any.
- `TerazScreen` composes the live `Reading` into `Hero`'s `Place`:
  `{ city, station, index }` from the reading, `freshness = formatFreshness(reading.measuredAt, new Date())`,
  and passes `reading.pm25` so the hero shows the **real** PM2.5.

## Behavior — Acceptance Criteria

Core (`src/core/air`) — unit-tested, literal-pinned:
- **AC-1** — `indexFromPm25(pm25) === round(pm25 / PM25_INDEX_DIVISOR)`, and the
  function USES the constant. Pins: `indexFromPm25(5) === 5`,
  `indexFromPm25(122) === 118`, `indexFromPm25(180) === 175`, `indexFromPm25(0) === 0`.
- **AC-2** *(literal fixture)* — `PM25_INDEX_DIVISOR === 1.03`.
- **AC-3** — `formatFreshness(measuredAt, now)`: `< 1 min` → `"przed chwilą"`;
  `< 60 min` → `"N min temu"`; else → `"N godz temu"`. Pins (with injected `now`):
  `("2026-08-11 21:00:00", 2026-08-11 21:12:00) === "12 min temu"`;
  `(…21:00:00, …21:00:30) === "przed chwilą"`;
  `(…21:00:00, …23:30:00) === "2 godz temu"`.

GIOŚ mappers (`src/data/gios/mappers.ts`) — pure, tested against fixtures. Exact
GIOŚ keys (verified against the captured fixtures): sensors array =
`"Lista stanowisk pomiarowych dla podanej stacji"`, id field =
`"Identyfikator stanowiska"`, discriminator = `"Wskaźnik - kod"`; data array =
`"Lista danych pomiarowych"`, value = `"Wartość"`, timestamp = `"Data"`.
- **AC-4** — `findPm25SensorId(sensors400.json)` → **2752** (the entry whose
  `"Wskaźnik - kod" === "PM2.5"`). Negative: `sensors_noPm25.json` (PM2.5 entry
  removed) → throws a clear `Error`.
- **AC-5** — `parseLatestPm25(getData2752.json)` → `{ pm25: 5.0, measuredAt: "2026-08-11 21:00:00" }`
  (newest-first; first non-null `"Wartość"`). Negatives (synthetic fixtures):
  `getData_nullhead.json` (newest 2 entries `"Wartość": null`) → skips to the first
  numeric entry; `getData_allnull.json` (all null / empty list) → throws.

Adapter (`src/data/gios/source.ts`) — IO, tested with a fake `fetch`:
- **AC-6** — `createGiosSource(fakeFetch).getCurrentReading()`, where `fakeFetch`
  returns `sensors400.json` then `getData2752.json`, resolves to
  `{ index: 5, pm25: 5.0, measuredAt: "2026-08-11 21:00:00", city: "Kraków", station: "Aleja Krasińskiego · stacja GIOŚ" }`.
  It calls exactly two URLs in order:
  `${GIOS_BASE}/station/sensors/400` then `${GIOS_BASE}/data/getData/2752`.

Hook + screen (`src/features/teraz`) — RNTL with a fake source:
- **AC-7** — `useCurrentReading` starts `loading`; a fake source resolving a fixed
  `Reading` → `ready` exposing it; a fake source that rejects → `stale` without
  throwing (keeps a prior `reading` if one had loaded).
- **AC-8** — `TerazScreen` given a fake source resolving
  `Reading{ index:118, pm25:122, city:'Kraków', station:'Aleja Krasińskiego · stacja GIOŚ', measuredAt }`
  renders `'118'`, `'Zły'`, `'Kraków'`, the **real** PM2.5 line `'PM2.5 · 122 µg/m³'`,
  the station+freshness line, and the atmosphere (`testID="atmosphere"`); while the
  source is pending it renders a loading state (`testID="teraz-loading"`, no crash,
  no `MOCK_PLACE`).
- **AC-9** *(manual)* — On the simulator, Teraz shows Kraków's **real current** GIOŚ
  value (PM2.5 → index → scene) with a real "N min temu" freshness. *(Screenshot.)*

## Resolved ambiguities

- **Index from PM2.5, not GIOŚ's category** — GIOŚ `aqindex` is a discrete 0–5
  level; the app needs a continuous number. `index = round(pm25/1.03)` is the
  practical inverse of the app's `pm25 = round(index*1.03)` (122 → 118).
- **Hero shows the real `Reading.pm25`** (rounded to integer for the `µg/m³` line),
  NOT the scene-derived `round(index*1.03)` — the design thesis is PM2.5-driven, so
  the displayed concentration must be the measured one.
- **`MOCK_PLACE` removed from the render path** — station identity (`city`,
  `station`) now comes from the source's `KRAKOW_STATION` constants inside the
  `Reading`, so `features` never imports `data` (it consumes only the core
  `Reading`). `mockData.ts` stays only as a test fixture / is deleted.
- **Latest reading** = newest-first first non-null `"Wartość"` (GIOŚ reports the
  newest hour as `null` until settled — the fixture head is 5.0, but the negative
  fixtures exercise the skip).
- **Freshness timezone** — `"Data"` is Europe/Warsaw local (GIOŚ docs); v1 treats
  it as device-local (the app is Poland-only). Recorded as a known assumption.
- **Error/stale** — on fetch failure keep the last good `reading` + `status:'stale'`;
  initial-load failure → `stale` with no reading (quiet fallback, no crash). No
  retry/caching in v1.
- **Pagination/auth** — `getData` is newest-first; page 0 suffices (no paging).
  GIOŚ v1 needs no API key/headers (plain `fetch`).
- **DI** via React context so a fake source drops into tests; the real adapter is
  created once in `src/app`.

## Risks & config

- **Sandbox allowlist** must add `api.gios.gov.pl` (dev/manual run). Jest never
  hits the network — mappers use committed fixtures, the adapter uses an injected
  `fetch`.
- **Boundaries lint**: add a `data` element (`src/data/*`); allow `app → data`,
  `data → core`; `features` consume only the core `Reading`/interface (adapter
  injected). **ADR-009** authored this milestone (next number; amends design's
  "never GIOŚ directly").
- GIOŚ v1 JSON-LD uses **Polish keys** — all isolation lives in `mappers.ts`.
- No new npm dependencies (RN global `fetch`).

## Verification

- **AC-1…AC-3** — `src/core/air/__tests__/*`.
- **AC-4, AC-5** — `src/data/gios/__tests__/mappers.test.ts` against
  `__fixtures__/{sensors400,getData2752,sensors_noPm25,getData_nullhead,getData_allnull}.json`.
- **AC-6** — `src/data/gios/__tests__/source.test.ts` with a fake `fetch`.
- **AC-7, AC-8** — RNTL with a fake `AirQualitySource`.
- **AC-9** — recorded manual evidence: simulator screenshot of the real value.
