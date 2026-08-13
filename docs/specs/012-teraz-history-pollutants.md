# Spec 012: Teraz — 24h history chart + real PM10/NO₂ tiles

**Status:** draft
**Milestone:** M-teraz-detail
**Sources:** `design/README.md` §"1. Teraz" (lines 79–80) + §"Data model" (line 37); `design/Powietrze.dc.html` lines 73–98 (chart + tiles markup), 469–475 (bar formula); GIOŚ `data/getData` (hourly series) + `station/sensors` (per-pollutant sensors)

## Scope

Turn the Teraz screen from a single value into "value + how the day trended +
the real pollutant breakdown," using data GIOŚ already exposes:
- a **24-hour bar chart** ("OSTATNIE 24 GODZINY") of the active place's hourly
  PM2.5, each bar colored by that hour's own index and fading toward "now";
- two tiles showing the active place's **real PM10 and NO₂** (µg/m³), replacing
  the index-derived fakes the design flags for replacement.

The rich data loads **only for the active place** (Teraz), never for Miejsca
list rows — via a new `getDetail()` path separate from the lightweight
`getCurrentReading()` the list previews use.

## Non-goals

- Adding history/PM10/NO₂ to Miejsca rows or the list preview fetch (would
  multiply API calls per row). Miejsca trend arrows are a future milestone
  (they can reuse this history data then).
- Other pollutants (O₃/CO/SO₂/C₆H₆) — available from GIOŚ but not in the Teraz
  design; future.
- True `backdrop-filter: blur(20px)` on the chart/tile cards — needs a native
  lib (ruled out); the design's translucent card color is used (same concession
  as the tab bar).
- Switching the app's `scene()`-derived pm10/no2 elsewhere to real data — this
  spec only adds the Teraz tiles from real data; `scene()` is untouched.
- Forecast row + widget sparkline (design has them; out of scope here).

## Public API

### `src/core/air/index.ts` (additions — pure)

```ts
export interface HourPoint {
  at: string;    // GIOŚ "YYYY-MM-DD HH:mm:ss" (device-local)
  pm25: number;  // µg/m³
  index: number; // indexFromPm25(pm25)
}

export interface ReadingDetail {
  history: HourPoint[]; // up to 24, oldest→newest (may be empty)
  pm10?: number;        // real µg/m³, absent if the station lacks the sensor
  no2?: number;         // real µg/m³, absent if absent
}

// Raw hourly points → chart series: drop null values, sort newest-first, take
// `count`, return oldest→newest, each with its derived index.
export function buildHistory(
  points: { at: string; value: number | null }[],
  count?: number, // default 24
): HourPoint[];

// Bar opacity ramps 0.55 (oldest) → 1.0 (now). i in [0, count-1].
export function historyBarOpacity(i: number, count: number): number;

// Bar height as % of the track: clamp(index / 2, 10, 100) (design bar formula).
export function barHeightPct(index: number): number;
```

`AirQualitySource` gains an **optional** detail method (optional so the many
test fakes and list-only sources need not implement it; Teraz degrades to
no chart/tiles when absent):

```ts
export interface AirQualitySource {
  getCurrentReading(): Promise<Reading>;      // unchanged, lightweight
  getDetail?(): Promise<ReadingDetail>;       // NEW — active-place only
}
```

### `src/data/gios/` additions

```ts
// mappers.ts
export function findSensorId(sensorsJson: unknown, code: string): number | null; // by "Wskaźnik - kod"
export function parseSeries(getDataJson: unknown): { at: string; value: number | null }[];
export function parseLatestValue(getDataJson: unknown): number | undefined;
// source.ts — createStationSource/createNearestStationSource implement getDetail():
//   sensors → find PM2.5/PM10/NO2 ids → getData PM2.5 (?size=100) → buildHistory;
//   getData PM10 (latest) + NO2 (latest); return ReadingDetail. Missing sensor → field omitted.
```

### `src/shared/place/` additions

```ts
export function usePlaceDetail(place: ActivePlace): { detail?: ReadingDetail };
// keyed on the primitive placeKey (no refetch churn); calls getDetail?.() if present.
// ActivePlaceProvider runs it for the active place and exposes `detail` on the context.
```

### `src/shared/ui/` additions

```ts
export function HistoryChart(props: { history: HourPoint[] }): JSX.Element; // "OSTATNIE 24 GODZINY" card
export function PollutantTiles(props: { pm10?: number; no2?: number }): JSX.Element; // PM10 + NO₂
```

### New tokens (`src/shared/tokens/index.ts`)

```ts
colors.glass = 'rgba(255,255,255,0.07)';       // chart/tile card surface
colors.glassBorder = 'rgba(255,255,255,0.09)'; // their 1px border
```
(existing `text.muted .55` / `text.dim .5` / `text.inactive .45` / `text.faint .4` cover the label greys.)

## Behavior — Acceptance Criteria

### Core (pure)

- **AC-1** — `buildHistory`: given points in arbitrary order with some
  `value: null`, returns at most `count` (default 24) `HourPoint`s, **nulls
  dropped**, ordered **oldest→newest**, each `{ at, pm25: value, index:
  indexFromPm25(value) }`. Given 30 valid points it returns the 24 most recent
  (by `at`); given 5 it returns 5.
- **AC-2** — `historyBarOpacity`: `(0, 24) → 0.55`; `(23, 24) → 1.0`;
  `(i, count) === 0.55 + 0.45 * (i / (count - 1))`.
- **AC-3** — `barHeightPct`: `0 → 10`, `20 → 10`, `40 → 20`, `200 → 100`,
  `300 → 100` (clamp of `index/2` to `[10, 100]`).

### Data (GIOŚ)

- **AC-4** — `parseSeries` maps the `data/getData` list to
  `{ at, value }[]` in the response's order; a null/missing `Wartość` → `value: null`.
- **AC-5** — `findSensorId(sensors, 'PM10')` returns the matching
  `Identyfikator stanowiska`; `'NO2'` and `'PM2.5'` likewise; an absent code → `null`.
- **AC-6** — `getDetail()` returns `ReadingDetail`: `history` built from the
  PM2.5 series fetched with `?size=100`; `pm10`/`no2` = latest values of those
  sensors; a station missing PM10 (or NO₂) omits that field while still
  returning `history` and the other. (Verified with fixtures; the PM2.5 series
  fixture drives `history`.)

### Context / hook (shared)

- **AC-7** — `usePlaceDetail(place)` calls `getDetail()` once per `placeKey`
  and exposes the result; a source without `getDetail` yields `{ detail:
  undefined }` (no throw). `ActivePlaceProvider` exposes `detail` for the
  active place.

### UI

- **AC-8** — `HistoryChart` renders the header `OSTATNIE 24 GODZINY`, a row of
  one bar per `history` point, and the static axis labels `12:00` `18:00`
  `00:00` `06:00` `teraz`. Bar `i` has `backgroundColor = scene(history[i].index).key`,
  `opacity = historyBarOpacity(i, history.length)`, and `height` (%) =
  `barHeightPct(history[i].index)`. Card surface `colors.glass`, border
  `colors.glassBorder`, radius 22. (Assert the header + labels literally, and
  the color/opacity of at least the first and last bar via testID.)
- **AC-9** — `PollutantTiles` renders two tiles: `PM10` and `NO₂` labels
  (`colors.text.dim`), the values (30px/600, `colors.text.primary`), and
  `µg/m³` units; a missing value renders `—`. Tile surface `colors.glass`,
  border `colors.glassBorder`, radius 20.
- **AC-10** — `TerazScreen` is scrollable over the (non-scrolling) atmosphere
  and renders, in order, the Hero, then `HistoryChart` (from
  `useActivePlace().detail.history`), then `PollutantTiles` (from
  `detail.pm10/no2`). When `detail` is absent the chart/tiles are omitted (Hero
  still renders) — no crash.

### Manual

- **AC-11** — *(journal)* On the simulator, Teraz shows the 24h chart with
  bars colored per hour and fading toward "now", plus real PM10/NO₂ tiles
  below the hero; screenshot into `docs/harness/evidence/12/`.

## Resolved ambiguities

- **`getDetail` is separate from `getCurrentReading` and optional.** Miejsca
  rows and the tab tint use the lightweight `getCurrentReading`; only the
  active place fetches `getDetail` (≈4 GIOŚ calls: sensors + 3 getData). Making
  it optional avoids churning every test fake and keeps list-preview sources
  minimal; Teraz degrades gracefully (Hero-only) when it's missing.
- **Bar color + height both use the hour's INDEX** (`indexFromPm25(pm25)`),
  matching the mock's `hv` (index-space) driving both `ramp(hv)` and `hv/2`.
- **Series pagination.** `data/getData` is paginated (20/page); the series is
  fetched with `?size=100` (like `findAll?size=1000`) to cover 24 hours in one
  call. `buildHistory` sorts by `at` so page order doesn't matter.
- **Axis labels are static** (`12:00/18:00/00:00/06:00/teraz`), exactly as the
  mock — not computed from timestamps.
- **No card blur.** The design's `backdrop-filter: blur(20px)` on the cards
  needs a native lib (excluded); the translucent `colors.glass` is used, matching
  the tab-bar concession.
- **Empty/short history** (station reported < 24 hours, or all null): the chart
  renders the bars it has (or the whole card is omitted at length 0). Tiles
  show `—` for a missing pollutant.

## Verification

- **AC-1..3** (core): unit tests `src/core/air/__tests__/history.test.ts`;
  AC-2/AC-3 pin the formula outputs (literal fixtures).
- **AC-4..6** (data): `src/data/gios/__tests__/` with fixtures — reuse the
  existing `getData2752.json` series for `parseSeries`/`buildHistory`; add a
  PM10/NO₂ getData fixture and use `sensors400.json` for `findSensorId`.
- **AC-7** (hook): `renderHook` in `src/shared/place/__tests__/`.
- **AC-8..9** (UI): behavior tests in `src/shared/ui/__tests__/` — assert the
  literal header/labels/units and the first/last bar color+opacity via `colorOf`/
  `StyleSheet.flatten`.
- **AC-10** (screen): `src/features/teraz/__tests__/` with a fake source
  exposing `getDetail`; assert chart+tiles present, and absent-detail → Hero only.
- **AC-11** (manual): simulator screenshot in the milestone journal.
