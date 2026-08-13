# M-teraz-detail Implementation Plan (24h chart + real PM10/NO₂)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add the design's 24-hour history chart and real PM10/NO₂ tiles to Teraz, from GIOŚ data, loaded only for the active place.

**Architecture:** Pure history math in `core/air/history.ts`; GIOŚ `getDetail()` (sensors + 3× getData, `Promise.allSettled`, single shared station resolution) on the existing sources; a `usePlaceDetail` hook (mirrors `usePlaceReading`) run only in `ActivePlaceProvider`; `HistoryChart` + `PollutantTiles` UI; a scrollable Teraz composing them under the Hero. No new dependency.

**Tech Stack:** RN 0.86, TS strict, Jest + @testing-library/react-native v14 (async render), existing `scene()` for bar colors.

## Global Constraints

- Spec: `docs/specs/012-teraz-history-pollutants.md` — every AC ID maps to it.
- TS strict; `any` only with an inline justification (GIOŚ JSON parsing already uses justified `any` in `data/gios`).
- Files ≤200 lines, functions ≤40. Test names cite AC IDs. `src/core` 100% coverage gate.
- Layering: `core` pure (zero React) ← `shared` ← `features`; `data`→`core`; features never import `data`.
- **No hex/rgba in `src/features/**` / `src/shared/ui/**`** — colors from tokens (new `glass`/`glassBorder`) or `scene()`.
- No new dependency.
- Copy verbatim from the spec: header `OSTATNIE 24 GODZINY`, axis `12:00 18:00 00:00 06:00 teraz`, `µg/m³` (µ=U+00B5), `NO₂` (₂=U+2082), `—` (U+2014).
- **getCurrentReading stays lightweight/unchanged** — only the active place fetches `getDetail`.

---

### Task 1: Core history math (`core/air/history.ts`)

**Files:** Create `src/core/air/history.ts`; Modify `src/core/air/index.ts` (re-export); Test `src/core/air/__tests__/history.test.ts`.
**Produces:** `HourPoint`, `ReadingDetail`, `buildHistory`, `historyBarOpacity`, `barHeightPct`. Consumed by Tasks 3, 5, 6.

- [ ] **Step 1: Write failing tests**

```ts
import { buildHistory, historyBarOpacity, barHeightPct } from '../history';
import { indexFromPm25 } from '..';

test('AC-1: buildHistory drops nulls, keeps negatives, caps 24, oldest→newest', () => {
  const pts = Array.from({ length: 30 }, (_, i) => ({
    at: `2026-08-11 ${String(i % 24).padStart(2, '0')}:00:00`,
    value: i,
  }));
  const h = buildHistory(pts);
  expect(h).toHaveLength(24);
  expect(h[0].at <= h[h.length - 1].at).toBe(true); // oldest→newest
  expect(buildHistory([{ at: 'a', value: null }, { at: 'b', value: 5 }])).toEqual([
    { at: 'b', value: 5, index: indexFromPm25(5) } as any,
  ].map(p => ({ at: p.at, pm25: 5, index: p.index })));
  expect(buildHistory([{ at: 'x', value: -3 }])).toEqual([
    { at: 'x', pm25: -3, index: indexFromPm25(-3) },
  ]); // negatives kept
  expect(buildHistory([{ at: 'x', value: null }])).toEqual([]); // all-null → []
  expect(buildHistory([{ at: 'a', value: 1 }, { at: 'b', value: 2 }, { at: 'c', value: 3 }], 2)
    .map(p => p.pm25)).toEqual([2, 3]); // 2 most recent, oldest→newest
});

test('AC-2: historyBarOpacity ramps 0.55→1.0, count<=1 → 1.0', () => {
  expect(historyBarOpacity(0, 24)).toBe(0.55);
  expect(historyBarOpacity(23, 24)).toBe(1);
  expect(historyBarOpacity(0, 1)).toBe(1);
  expect(historyBarOpacity(1, 3)).toBeCloseTo(0.55 + 0.45 * 0.5, 10);
});

test('AC-3: barHeightPct clamps index/2 to [10,100]', () => {
  expect(barHeightPct(0)).toBe(10);
  expect(barHeightPct(20)).toBe(10);
  expect(barHeightPct(40)).toBe(20);
  expect(barHeightPct(200)).toBe(100);
  expect(barHeightPct(300)).toBe(100);
});
```

- [ ] **Step 2: Run to verify fail** — `npx jest src/core/air` → FAIL.
- [ ] **Step 3: Implement** `src/core/air/history.ts`:

```ts
import { indexFromPm25 } from './index';

export interface HourPoint { at: string; pm25: number; index: number }
export interface ReadingDetail { history: HourPoint[]; pm10?: number; no2?: number }

export function buildHistory(
  points: { at: string; value: number | null }[],
  count = 24,
): HourPoint[] {
  return points
    .filter((p): p is { at: string; value: number } => p.value !== null)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)) // newest-first
    .slice(0, count)
    .reverse() // oldest→newest
    .map(p => ({ at: p.at, pm25: p.value, index: indexFromPm25(p.value) }));
}

export function historyBarOpacity(i: number, count: number): number {
  if (count <= 1) return 1;
  return 0.55 + 0.45 * (i / (count - 1));
}

export function barHeightPct(index: number): number {
  return Math.min(100, Math.max(10, index / 2));
}
```
Then in `src/core/air/index.ts` add `export * from './history';` (verify `indexFromPm25` is exported before/independently so the circular import resolves — `history.ts` imports `indexFromPm25` from `./index`; if TS/circularity complains, import from the specific file that defines it).

- [ ] **Step 4: Verify pass + gate** — `npx jest src/core/air`; `npm run typecheck`; core coverage 100%.
- [ ] **Step 5: Commit** — `feat(core): history math — buildHistory/opacity/height (AC-1..3, spec 012)`

---

### Task 2: GIOŚ mappers (`findSensorId`, `parseSeries`, `parseLatestValue`)

**Files:** Modify `src/data/gios/mappers.ts`; Test `src/data/gios/__tests__/mappers.test.ts` (extend).
**Interfaces — Consumes:** existing fixtures `sensors400.json` (PM2.5=2752, PM10=2750, NO2=2747), `getData2752.json`. **Produces:** `findSensorId`, `parseSeries`, `parseLatestValue`; refactors `findPm25SensorId`/`parseLatestPm25` to reuse them.

- [ ] **Step 1: Write failing tests**

```ts
import sensors from '../__fixtures__/sensors400.json';
import series from '../__fixtures__/getData2752.json';
import { findSensorId, parseSeries, parseLatestValue } from '../mappers';

test('AC-5: findSensorId by code', () => {
  expect(findSensorId(sensors, 'PM2.5')).toBe(2752);
  expect(findSensorId(sensors, 'PM10')).toBe(2750);
  expect(findSensorId(sensors, 'NO2')).toBe(2747);
  expect(findSensorId(sensors, 'O3')).toBeNull();
});

test('AC-4: parseSeries maps at/value, null Wartość → null', () => {
  const s = parseSeries(series);
  expect(s[0]).toEqual({ at: '2026-08-11 21:00:00', value: 5 });
  expect(parseSeries({ 'Lista danych pomiarowych': [{ Data: 'x', Wartość: null }] }))
    .toEqual([{ at: 'x', value: null }]);
});

test('AC-5: parseLatestValue = newest non-null by at, order-independent', () => {
  expect(parseLatestValue(series)).toBe(5); // 21:00 is newest
  const shuffled = { 'Lista danych pomiarowych': [
    { Data: '2026-08-11 05:00:00', Wartość: 8.7 },
    { Data: '2026-08-11 21:00:00', Wartość: 5 },
    { Data: '2026-08-11 20:00:00', Wartość: null },
  ]};
  expect(parseLatestValue(shuffled)).toBe(5);
  expect(parseLatestValue({ 'Lista danych pomiarowych': [{ Data: 'x', Wartość: null }] })).toBeUndefined();
});
```

- [ ] **Step 2: Run to verify fail.**
- [ ] **Step 3: Implement** in `mappers.ts` (reuse existing `// any: untyped GIOŚ JSON` justification pattern). `findSensorId(json, code)` scans the sensors list for `"Wskaźnik - kod" === code` → `"Identyfikator stanowiska"`, else `null`. `parseSeries(json)` maps `Lista danych pomiarowych` → `{ at: e['Data'], value: e['Wartość'] ?? null }`. `parseLatestValue(json)` = `parseSeries(json).filter(p=>p.value!==null).sort(by at desc)[0]?.value`. Refactor `findPm25SensorId` to `const id = findSensorId(json,'PM2.5'); if (id==null) throw …; return id;` (keep the throw at this caller) and `parseLatestPm25` to build on `parseSeries`/`parseLatestValue` without changing its output shape.
- [ ] **Step 4: Verify pass + gate** — `npx jest src/data/gios`; full `npm test` (the refactor mustn't break existing source tests); `npm run typecheck`; `npm run lint`.
- [ ] **Step 5: Commit** — `feat(data): findSensorId/parseSeries/parseLatestValue + dedup (AC-4..5, spec 012)`

---

### Task 3: GIOŚ `getDetail()` on the sources

**Files:** Modify `src/data/gios/source.ts`; Create fixtures `src/data/gios/__fixtures__/getData_pm25_26.json` (≥24 rows), `getData_pm10.json`, `getData_no2.json`; Test `src/data/gios/__tests__/detail.test.ts`.
**Interfaces — Consumes:** Task 1 `buildHistory`/`ReadingDetail`, Task 2 mappers. **Produces:** `getDetail()` on `createStationSource` + `createNearestStationSource`.

- [ ] **Step 1: Write failing tests** — a `fetchImpl` stub routing by URL to the fixtures. Assert:
  - AC-6: `getDetail()` → `{ history (len from the ≥24 fixture, ≤24, oldest→newest), pm10: <latest>, no2: <latest> }`; PM2.5 series fetched with `?size=100` (assert the URL the stub saw contains `size=100`).
  - AC-6: a sensors fixture lacking NO₂ → `no2` undefined, history + pm10 present.
  - AC-6b: `fetchImpl` rejects the NO₂ getData URL → `no2` undefined, history + pm10 present; reject the PM2.5 URL → `history: []`, pm10/no2 present. `getDetail` does not reject.
  - AC-6c: `createNearestStationSource` with a geo that rejects → `getDetail()` resolves for the Kraków fallback station (same station id as `getCurrentReading`'s fallback), history non-empty.
- [ ] **Step 2: Run to verify fail.**
- [ ] **Step 3: Implement.** Refactor the nearest-station resolution out of `getCurrentReading` into a memoized `resolveStation()` inside `createNearestStationSource` (geo → nearest, existing Kraków fallback), used by BOTH `getCurrentReading` and `getDetail`. Add a shared `detailFor(station, fetchImpl): Promise<ReadingDetail>`:

```ts
async function detailFor(station: Station, fetchImpl: FetchImpl): Promise<ReadingDetail> {
  const sensors = await (await fetchImpl(`${GIOS_BASE}/station/sensors/${station.id}`)).json();
  const pm25Id = findSensorId(sensors, 'PM2.5');
  const pm10Id = findSensorId(sensors, 'PM10');
  const no2Id = findSensorId(sensors, 'NO2');
  const getSeries = async (id: number) =>
    buildHistory(parseSeries(await (await fetchImpl(`${GIOS_BASE}/data/getData/${id}?size=100`)).json()));
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
`createStationSource(station).getDetail = () => detailFor(station, fetchImpl)`; `createNearestStationSource().getDetail = async () => detailFor(await resolveStation(), fetchImpl)`.

- [ ] **Step 4: Verify pass + gate** — `npx jest src/data/gios`; full `npm test`; lint; typecheck.
- [ ] **Step 5: Commit** — `feat(data): getDetail (history + PM10/NO2, allSettled, shared station) (AC-6/6b/6c, spec 012)`

---

### Task 4: `usePlaceDetail` hook + ActivePlaceContext wiring

**Files:** Create `src/shared/place/usePlaceDetail.ts`; Modify `src/shared/place/ActivePlaceContext.tsx` + `src/shared/place/index.ts` (export); Test `src/shared/place/__tests__/usePlaceDetail.test.tsx`.
**Interfaces — Produces:** `usePlaceDetail`; `detail?` on the active-place context.

- [ ] **Step 1: Write failing tests** (`renderHook`, fake `SourceForPlace`): AC-7 — a source with `getDetail` → `detail` resolves to its value; keyed on placeKey (changing an unrelated prop doesn't refetch); a source WITHOUT `getDetail` → `detail: undefined`; a rejecting `getDetail` → `detail: undefined` (no throw).
- [ ] **Step 2: Run to verify fail.**
- [ ] **Step 3: Implement** `usePlaceDetail` mirroring `usePlaceReading` (useSourceForPlace, `placeKey`, `active` unmount guard, same eslint-disable comment). Body:
```ts
const src = sourceForPlace(place);
src.getDetail?.().then(d => active && setDetail(d)).catch(() => active && setDetail(undefined));
```
Returns `{ detail }`. In `ActivePlaceProvider`, call `usePlaceDetail(active)` alongside `usePlaceReading(active)` and spread `detail` into the context value (add to `ActivePlaceValue`).
- [ ] **Step 4: Verify pass + gate** — `npx jest src/shared/place`; full `npm test`; typecheck; lint.
- [ ] **Step 5: Commit** — `feat(shared): usePlaceDetail + active-place detail (AC-7, spec 012)`

---

### Task 5: `HistoryChart` + `PollutantTiles` + tokens

**Files:** Modify `src/shared/tokens/index.ts` (`glass`, `glassBorder`); Create `src/shared/ui/HistoryChart.tsx`, `src/shared/ui/PollutantTiles.tsx`; Tests in `src/shared/ui/__tests__/`.
**Interfaces — Consumes:** Task 1 `HourPoint`/`historyBarOpacity`/`barHeightPct`, `scene`, tokens. **Produces:** `HistoryChart`, `PollutantTiles`.

- [ ] **Step 1: Add tokens** — `glass: 'rgba(255,255,255,0.07)'`, `glassBorder: 'rgba(255,255,255,0.09)'` in `colors`.
- [ ] **Step 2: Write failing tests** —
  - AC-8: render `HistoryChart` with a known history (e.g. indices [10, 200]); assert header text `OSTATNIE 24 GODZINY`, all five axis labels present; `getByTestId('bar-0')` flattened style `backgroundColor === scene(10).key`, `opacity === historyBarOpacity(0,2)`, `height === '10%'`; `bar-1` `backgroundColor === scene(200).key`, `opacity === 1`, `height === '100%'`. Single-point history → `bar-0` opacity 1.
  - AC-9: render `PollutantTiles pm10={40} no2={22}` → texts `PM10`, `NO₂`, `40`, `22`, `µg/m³` (×2); render with `no2` undefined → `—` present.
- [ ] **Step 3: Implement.** `HistoryChart({ history })`: a card (`colors.glass` bg, `colors.glassBorder` border, radius 22, padding 18/18/14) with the header (`colors.text.muted`, 11/600/ls1.4), a flex-end row (gap 3, height 76) of bars — bar `i` = `<View testID={`bar-${i}`} style={{ flex:1, height:`${barHeightPct(history[i].index)}%`, backgroundColor: scene(history[i].index).key, opacity: historyBarOpacity(i, history.length), borderRadius: 3 }} />` — and the static axis-label row (`colors.text.faint`, size 10, space-between). `PollutantTiles({ pm10, no2 })`: a row of two tiles (each `colors.glass`/`colors.glassBorder`, radius 20, padding 16, `flex:1`, gap 12) with label (`colors.text.dim`, 11/600), value `pm10 ?? '—'` (30/600, `colors.text.primary`), unit `µg/m³` (`colors.text.inactive`, 11). Keep each render fn ≤40 lines (extract a `Bar`/`Tile` helper if needed).
- [ ] **Step 4: Verify pass + gate** — `npx jest HistoryChart PollutantTiles`; lint (no-hex — all from tokens/scene); typecheck.
- [ ] **Step 5: Commit** — `feat(shared): HistoryChart + PollutantTiles + glass tokens (AC-8..9, spec 012)`

---

### Task 6: Teraz composition (scrollable + chart + tiles)

**Files:** Modify `src/features/teraz/TerazScreen.tsx`; Test `src/features/teraz/__tests__/TerazScreen.test.tsx` (extend).
**Interfaces — Consumes:** `useActivePlace().detail`, `HistoryChart`, `PollutantTiles`.

- [ ] **Step 1: Write failing tests** — with a fake active-place context/source exposing `detail = { history:[…], pm10:40, no2:22 }`: assert the Hero, the chart header `OSTATNIE 24 GODZINY`, and the tiles (`PM10`/`NO₂`) all render. With `detail` undefined: Hero renders, chart/tiles absent (`queryByText('OSTATNIE 24 GODZINY')` null), no crash. (Reuse the existing Teraz test harness; the existing centered-hero tests must still pass — they assert text/testIDs, not layout.)
- [ ] **Step 2: Run to verify fail.**
- [ ] **Step 3: Implement.** Wrap the Teraz content in a `ScrollView` (over the non-scrolling `GradientBackground`+`Atmosphere`), keeping `padding 70/24/130`. Render `Hero`, then, when `detail` present, `<HistoryChart history={detail.history} />` (marginTop 8) and `<PollutantTiles pm10={detail.pm10} no2={detail.no2} />` (marginTop 12). Read `detail` from `useActivePlace()`. Keep the file ≤200 / functions ≤40.
- [ ] **Step 4: Verify pass + gate** — `npx jest TerazScreen`; full `npm test`; lint; typecheck.
- [ ] **Step 5: Commit** — `feat(teraz): scrollable Teraz with 24h chart + pollutant tiles (AC-10, spec 012)`

---

### Task 7: Native run + manual AC-11 + journal

**Files:** Create `docs/harness/12-teraz-detail.md`, `docs/harness/evidence/12/`.

- [ ] **Step 1: Full gate** — `npm run lint && npm run typecheck && npm test` green; `src/core` 100%.
- [ ] **Step 2: Build/run** on the iPhone 16 Pro sim: Teraz shows the 24h chart (bars colored per hour, fading toward "teraz") + real PM10/NO₂ tiles under the hero. Record the live `?size=100` response length (≥24) — e.g. `curl` the PM2.5 sensor's getData.
- [ ] **Step 3: Capture** a Teraz screenshot into `docs/harness/evidence/12/`.
- [ ] **Step 4: Write** `docs/harness/12-teraz-detail.md` — summary, AC coverage (AC-1..11), the API-reuse insight (history from data we already fetch), gotchas.
- [ ] **Step 5: Commit** — `docs(harness): journal 12 teraz detail + evidence`

---

## Self-Review

**Spec coverage:** AC-1..3 → T1; AC-4..5 → T2; AC-6/6b/6c → T3; AC-7 → T4; AC-8..9 → T5; AC-10 → T6; AC-11 → T7. All covered.

**Placeholder scan:** none — real code or exact edit lists throughout.

**Type consistency:** `HourPoint`/`ReadingDetail`/`buildHistory`/`historyBarOpacity`/`barHeightPct` defined T1, imported unchanged in T3/T5/T6; `findSensorId`/`parseSeries`/`parseLatestValue` T2 → T3; `getDetail` signature (optional) matches spec across T3/T4; `detail?` on context T4 → T6; testIDs `bar-<i>` consistent T5↔tests.

**Load-bearing honored:** getCurrentReading unchanged (list stays cheap); getDetail only via usePlaceDetail on the active place; nearest station resolved once (shared fallback); allSettled per-pollutant isolation; no-hex via glass tokens/scene; core 100% (buildHistory branches: null-drop, negative-keep, cap, all-null).
