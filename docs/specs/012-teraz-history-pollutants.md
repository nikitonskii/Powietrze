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

### `src/core/air/history.ts` (new module — pure; keeps `air/index.ts` single-responsibility, re-exported from `air/index.ts`)

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

// Raw hourly points → chart series: drop null values (negatives are KEPT — rare
// GIOŚ artifacts; scene()/barHeightPct clamp them harmlessly), sort by `at`
// newest-first, take `count`, return oldest→newest, each with its derived index.
export function buildHistory(
  points: { at: string; value: number | null }[],
  count?: number, // default 24
): HourPoint[];

// Bar opacity ramps 0.55 (oldest) → 1.0 (now). i in [0, count-1].
// count <= 1 → 1.0 (avoids the 0/0 → NaN when history has a single point).
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
export function parseLatestValue(getDataJson: unknown): number | undefined; // value of the newest (max `at`) NON-NULL point — does not trust response order
// DEDUP (S6): refactor the existing helpers to reuse these — findPm25SensorId
// becomes `findSensorId(json,'PM2.5')` with the throw kept AT THE CALLER (so
// getCurrentReading's existing "no PM2.5 → throw → stale" is unchanged);
// parseLatestPm25 delegates to parseLatestValue. No behavior change to getCurrentReading.

// source.ts — createStationSource/createNearestStationSource implement getDetail():
//   1. Resolve the Station (nearest path: the SAME memoized resolution the
//      source uses for getCurrentReading — see Resolved ambiguities B1 — so Hero
//      and chart/tiles are always the same station and share the Kraków fallback).
//   2. fetch sensors → find PM2.5/PM10/NO2 sensor ids.
//   3. fetch getData for PM2.5 (?size=100), PM10 (latest), NO2 (latest) with
//      Promise.allSettled so one pollutant's failure doesn't sink the others:
//        - PM2.5 rejected OR sensor absent → history: []
//        - PM10/NO2 rejected OR sensor absent → that field omitted
//   4. return ReadingDetail { history: buildHistory(pm25Series), pm10?, no2? }.
```

### `src/shared/place/` additions

```ts
export function usePlaceDetail(place: ActivePlace): { detail?: ReadingDetail };
// Mirrors usePlaceReading EXACTLY: useSourceForPlace(), effect keyed on the
// primitive placeKey (no refetch churn), same unmount `active` guard. Calls
// getDetail?.() if present; resolves { detail: undefined } when the method is
// absent OR the promise rejects (no throw). ActivePlaceProvider runs it for the
// active place and exposes `detail` on the context.
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
  dropped** (a **negative value is kept**), ordered **oldest→newest**, each
  `{ at, pm25: value, index: indexFromPm25(value) }`. Given 30 valid points it
  returns the 24 most recent (by `at`); given 5 it returns 5; given all-null → `[]`.
- **AC-2** — `historyBarOpacity`: `(0, 24) → 0.55`; `(23, 24) → 1.0`;
  `(0, 1) → 1.0` (single-point guard, no NaN); otherwise
  `=== 0.55 + 0.45 * (i / (count - 1))`.
- **AC-3** — `barHeightPct`: `0 → 10`, `20 → 10`, `40 → 20`, `200 → 100`,
  `300 → 100` (clamp of `index/2` to `[10, 100]`).

### Data (GIOŚ)

- **AC-4** — `parseSeries` maps the `data/getData` list to
  `{ at, value }[]` in the response's order; a null/missing `Wartość` → `value: null`.
- **AC-5** — `findSensorId(sensors, 'PM10')` returns the matching
  `Identyfikator stanowiska`; `'NO2'` and `'PM2.5'` likewise; an absent code → `null`.
  `parseLatestValue` returns the newest (max-`at`) non-null value — NOT merely
  the first row — so it's correct regardless of response order; all-null → `undefined`.
- **AC-6** — `getDetail()` returns `ReadingDetail`: `history` from the PM2.5
  series fetched with `?size=100`; `pm10`/`no2` = `parseLatestValue` of those
  sensors. A station **missing** a PM10 (or NO₂) sensor omits that field while
  still returning `history` and the other.
- **AC-6b** — partial-failure isolation (`Promise.allSettled`): if the NO₂
  `getData` **rejects** but PM2.5 and PM10 succeed → `history` and `pm10`
  present, `no2` omitted. If the PM2.5 `getData` rejects → `history: []` while
  `pm10`/`no2` still resolve. `getDetail` itself never rejects on a per-pollutant
  failure.
- **AC-6c** *(location path — B1)* — for the `location` place with geolocation
  **denied/failing**, `getDetail()` resolves for the **same Kraków fallback
  station** that `getCurrentReading()` falls back to (single shared resolution),
  so Hero, chart, and tiles all render for one consistent station — the default
  screen is never left Hero-only due to denied location.

### Context / hook (shared)

- **AC-7** — `usePlaceDetail(place)` calls `getDetail()` once per `placeKey`
  and exposes the result; a source without `getDetail`, or a rejected
  `getDetail`, yields `{ detail: undefined }` (no throw). `ActivePlaceProvider`
  exposes `detail` for the active place.

### UI

- **AC-8** — `HistoryChart` renders the header `OSTATNIE 24 GODZINY`
  (`colors.text.muted`, size 11, weight 600, letterSpacing 1.4), a row of one
  bar per `history` point, and the static axis labels `12:00` `18:00` `00:00`
  `06:00` `teraz` (`colors.text.faint`). Bar `i` has
  `backgroundColor = scene(history[i].index).key`,
  `opacity = historyBarOpacity(i, history.length)`, and `height` (%) =
  `barHeightPct(history[i].index)`. Card surface `colors.glass`, border
  `colors.glassBorder`, radius 22. (Assert the header + labels literally, and
  the color/opacity of at least the first and last bar via testID.)
- **AC-9** — `PollutantTiles` renders two tiles: `PM10` and `NO₂` labels
  (`colors.text.dim`), the values (30px/600, `colors.text.primary`), and
  `µg/m³` units (`colors.text.inactive`); a missing value renders `—`. Tile
  surface `colors.glass`, border `colors.glassBorder`, radius 20.
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
  active place fetches `getDetail`. Optional → avoids churning every test fake
  and keeps list-preview sources minimal; Teraz degrades gracefully (Hero-only)
  when it's missing. **Call cost (corrected):** the active place runs BOTH
  `usePlaceReading` and `usePlaceDetail`, so ~6 GIOŚ calls (getCurrentReading:
  sensors + PM2.5-latest; getDetail: sensors + PM2.5-series + PM10 + NO₂);
  sensors is fetched by both paths (accepted, small). The expensive location
  step (geo + `fetchStations`) is NOT doubled — see B1.
- **B1 — nearest/location station resolved ONCE.** `createNearestStationSource`
  is a single module-scope instance (App.tsx `nearest`) that `sourceForPlace`
  returns for every `location` call, so `usePlaceReading` and `usePlaceDetail`
  share it. It **memoizes** its nearest-station resolution (geo → nearest, with
  the existing Kraków fallback) once per instance; `getCurrentReading` and
  `getDetail` both derive from that single resolved `Station`. Guarantees Hero
  and chart/tiles are the SAME station, shares the Kraków fallback (AC-6c), and
  avoids double geo/`fetchStations`.
- **Bar color + height both use the hour's INDEX** (`indexFromPm25(pm25)`),
  matching the mock's `hv` (index-space) driving both `ramp(hv)` and `hv/2`.
- **Series pagination + coverage.** `data/getData` is paginated (20/page); the
  series is fetched with `?size=100` (like `findAll?size=1000`); `buildHistory`
  sorts by `at` so page order doesn't matter. GIOŚ documents this endpoint as
  "latest → 3 days back" hourly (~72 pts); AC-11 confirms the live `?size=100`
  response has ≥24 points.
- **`parseLatestValue` does not trust order** (max-`at` non-null), so pm10/no2
  are correct even if GIOŚ returns oldest-first.
- **Spacing (mock).** Chart card `marginTop: 8` below the hero; tiles grid
  `marginTop: 12`, tiles `gap: 12` (`Powietrze.dc.html:74,88`).
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
  AC-2/AC-3 pin the formula outputs (literal fixtures); AC-1 covers the
  drop-null, keep-negative, cap-at-24, and all-null→`[]` branches (reuse the
  existing `getData_allnull.json` / `getData_nullhead.json` edge fixtures for
  the null branches — cheap path to 100% core coverage).
- **AC-4..6c** (data): `src/data/gios/__tests__/` — reuse `getData2752.json`
  for `parseSeries`; add a **≥24-row** PM2.5 series fixture so `buildHistory`
  actually fills 24 bars, plus PM10/NO₂ getData fixtures; `sensors400.json` for
  `findSensorId`. AC-6b uses a rejecting `fetchImpl` for one pollutant; AC-6c
  uses a rejecting geo to exercise the shared Kraków fallback on `getDetail`.
- **AC-7** (hook): `renderHook` in `src/shared/place/__tests__/`, incl. the
  rejected-`getDetail` → `detail: undefined` branch.
- **AC-8..9** (UI): behavior tests in `src/shared/ui/__tests__/` — assert the
  literal header/labels/units, the pinned label/unit colors, and the first/last
  bar color+opacity+height via `colorOf`/`StyleSheet.flatten`; include a
  single-point history (AC-2 count=1 guard).
- **AC-10** (screen): `src/features/teraz/__tests__/` with a fake source
  exposing `getDetail`; assert chart+tiles present, and absent-detail → Hero only.
- **AC-11** (manual): simulator screenshot + a note recording the live
  `?size=100` response length (≥24) in the milestone journal.
