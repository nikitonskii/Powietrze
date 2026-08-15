# Review 3 verdict — Task 3: GIOŚ `getDetail()` (history + PM10/NO2)

`SPEC: ✅`
`QUALITY: APPROVE`

## AC-6 — history + pm10/no2

- `detailFor` fetches sensors → `findSensorId` for PM2.5/PM10/NO2 → PM2.5 via
  `getData/{id}?size=100` → `parseSeries` → `buildHistory`; PM10/NO2 via
  `getData/{id}` (no size) → `parseLatestValue`. Matches spec exactly.
- Test asserts `pm25Call` contains `size=100` (source.ts:68, detail.test.ts:387-388)
  — confirmed, not just assumed.
- `getData_pm25_26.json` fixture is a genuine 26-row hourly series with no
  gaps; `buildHistory` correctly drops the oldest 2 and fills exactly 24
  bars oldest→newest (verified by hand: 2026-08-11 23:00 → 2026-08-12 22:00).
  This is a meaningful fixture, not a rubber-stamp 1-2 row stub.
- Missing-sensor test (`sensorsNoNo2`, filtered from the real `sensors400.json`)
  → `no2` undefined, `history`/`pm10` still present. Source correctly
  short-circuits via `no2Id != null ? getLatest(no2Id) : Promise.reject(...)`
  (source.ts:79) so no network call is attempted for a missing sensor — real
  code path, not a workaround.

## AC-6b — Promise.allSettled isolation

Confirmed tested with a **genuinely rejecting fetchImpl**, not a missing
sensor:
- `makeFetch(KRAKOW_ROUTES, ['/data/getData/2747'])` — the NO2 sensor DOES
  exist (`findSensorId` finds id 2747 in `sensors400.json`) but the fetch
  call to that URL itself rejects → `no2` undefined, `history`/`pm10`
  present. `.resolves.toEqual(...)` proves `getDetail()` doesn't reject.
- Same pattern for `/data/getData/2752` (PM2.5) → `history: []`,
  `pm10`/`no2` present.
Both are real allSettled-rejection paths, satisfying the reviewer's specific
concern.

Note: `detailFor`'s "never rejects" guarantee is correctly scoped to
per-pollutant `getData` failures (matches spec's exact wording, line 158:
"never rejects on a per-pollutant failure"). If the initial sensors fetch
itself fails, `getDetail()` *would* reject — that's intentional per spec
(AC-7 explicitly has `usePlaceDetail` catch a rejected `getDetail()`
one layer up in Task 5/6). Not a gap in this task.

## AC-6c — shared station memoization

`createNearestStationSource(denied, fetchImpl)`: calls `getDetail()` then
`getCurrentReading()`, asserts the Kraków identity on the reading AND
`expect(getCurrentPosition).toHaveBeenCalledTimes(1)`. This proves the
*same* memoized `resolveStation()` promise served both calls (not just
matching output by coincidence) — exactly what AC-6c/B1 require. App.tsx's
`nearest` singleton + `sourceForPlace` (App.tsx:25-27) matches the spec's B1
module-scope-instance design.

## Memoization refactor — regression check

- `resolveStation()` preserves geo/stations failure → Kraków exactly as
  before; `getCurrentReading`'s own try/catch around `readStation` (for a
  post-resolution reading failure) is untouched and independent of
  `resolveStation`.
- All 4 pre-existing `nearestSource.test.ts` cases construct a **fresh**
  `createNearestStationSource` per test and call `getCurrentReading()`
  exactly once, so the memoization is inert for them — confirmed by reading
  the test file directly, not just trusting the report. No weakening.
- Memoizing forever (never re-resolving in a session) is the explicit spec
  design (B1: "single module-scope instance... memoizes... once per
  instance"), matched by App.tsx's `nearest` singleton. No test expects
  per-call re-resolution. Not a concern.

## `SourceWithDetail` deviation

Verified directly: the implementer added a **local, non-exported**
`type SourceWithDetail = AirQualitySource & { getDetail: () => Promise<ReadingDetail> }`
inside `src/data/gios/source.ts` (source.ts:22-24). The core
`src/core/air/index.ts` `AirQualitySource` interface was **not touched** —
still only `getCurrentReading(): Promise<Reading>` (confirmed by reading
`src/core/air/index.ts`). No `any`, no unsound cast — the three factories
just return object literals that structurally satisfy the intersection.

**Ruling:** no collision with Task 4. `SourceWithDetail` is a strict subtype
of `AirQualitySource` (required `getDetail` vs. Task 4's planned optional
`getDetail?`), so it remains assignable to `AirQualitySource` today and
will typecheck without changes once Task 4 adds the optional method to
core — TS intersects `getDetail?` (from core) with `getDetail` (from the
local type) to a required member, which is exactly what's already declared
here. Task 4 doesn't need to reconcile anything; it may optionally simplify
by dropping the local type in favor of core's `AirQualitySource` directly
once the optional method lands, but that's a style choice, not a fix.

## Quality / constraints

- No new dependency; layering intact (`src/data/gios` → `src/core/air`,
  `src/core/geo`, no reverse import).
- `source.ts` is 159 lines (≤200); `detailFor` and `createNearestStationSource`
  are both ≤40 lines.
- No unjustified `any` — mappers.ts's pre-existing `eslint-disable` for
  external JSON boundary is untouched and was already justified; nothing new
  introduced in source.ts or the tests.
- Fixtures are well-formed and internally consistent with real GIOŚ sensor
  ids (station 400, PM2.5=2752, PM10=2750, NO2=2747 — cross-checked against
  `sensors400.json` and `constants.ts`'s `KRAKOW_STATION`).

## Findings

- **Minor** (`src/data/gios/__tests__/detail.test.ts`, missing-sensor test,
  around line 391): the report claims "no fetch call is made for the NO2
  getData URL (proven implicitly...)" — but that test doesn't capture/assert
  on `calls`, so it doesn't actually distinguish "no call made" from "call
  made and happened to be routed the same way." The short-circuit is real
  (verified directly in source.ts's ternary), so this is a report-accuracy
  nitpick, not a code defect. Optional follow-up: assert
  `calls.some(u => u.includes('2747'))` is `false`.
- No other findings; nothing Critical or Important.

## Deviation ruling (one-liner)

`SourceWithDetail` is a local, non-exported intersection type confined to
`src/data/gios/source.ts` — core `AirQualitySource` is untouched, it's a
strict subtype of the interface Task 4 plans to add, and it will keep
typechecking unchanged once Task 4 lands; no reconciliation needed.

verdict written
