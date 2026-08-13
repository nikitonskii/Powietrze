# Critique — Spec 012: Teraz 24h history + PM10/NO₂ tiles

**VERDICT: SHIP-WITH-FIXES** (1 Blocker, 6 Should-fix, 8 Nit)

## Overall assessment
Well-scoped, honest spec with faithful design porting and correct arithmetic in the
pure-core ACs. Defects concentrate in the data layer's failure/ordering semantics and
the `location` (nearest-station) detail path — the app's default screen — so the most
common real-world path (location denied, or one pollutant's `getData` failing) is
exactly where the spec is silent. Fix those and it is buildable.

## Fidelity verification (all PASS)
- AC-3 `clamp(index/2,10,100)`: 0→10, 20→10, 40→20, 200→100, 300→100 — exact vs
  `design/Powietrze.dc.html:474` `Math.min(100,Math.max(10,hv/2))`.
- AC-2 `0.55+0.45*(i/(count-1))`: (0,24)→0.55, (23,24)→1.0 — matches mock `0.55+0.45*(h/23)` at count=24.
- AC-8 color `scene(index).key` ≡ mock `ramp(hv,'key')` — `src/core/scene/scene.ts:15` defines `key=ramp(index,'key')`.
- Card styling `colors.glass=rgba(255,255,255,0.07)` / `glassBorder=0.09`, radii 22/20 match `design/Powietrze.dc.html:74,89`.
- NO₂ glyph: sensor CODE is ASCII `NO2` (`sensors400.json` → `NO2`→2747); display label `NO₂` (U+2082) only in AC-9. No collision.

## BLOCKER
**B1 — The `location` (nearest-station) `getDetail()` path is unspecified for fallback
and station-consistency; it silently kills the feature on the default screen.**
- Evidence: `src/data/gios/source.ts:57-75` — `createNearestStationSource.getCurrentReading`
  resolves nearest via geo + `fetchStations` inside a `try/catch` with a total Kraków
  fallback. Spec `012:83-86` says only "createNearestStationSource implement getDetail()",
  no fallback; `usePlaceDetail` (`012:91-92`) fetches independently of `usePlaceReading`.
- Failures: (1) geo denied → `getCurrentReading` falls back to Kraków & Hero renders, but
  if `getDetail` doesn't replicate the fallback it rejects → `detail:undefined` → AC-10
  omits chart+tiles. Every permission-denied user sees Hero-only permanently on the
  primary screen. (2) Station drift: the two paths resolve "nearest" independently, so
  Hero can show station A while chart/tiles show station B.
- Fix: Resolve the station ONCE and derive both reading and detail from that single
  `Station`; `getDetail` must inherit the identical Kraków fallback. Add AC: "location
  place with geo denied → Hero + chart/tiles all render for Kraków."

## SHOULD-FIX (Major)
**S1 — `historyBarOpacity(0,1)` returns `NaN` (division by zero).**
- Evidence: AC-2 `0.55+0.45*(i/(count-1))`; count=1 → count-1=0 → 0/0=NaN. Reachable:
  buildHistory can return length 1 (AC-1 "given 5 returns 5"); AC-8 then calls
  `historyBarOpacity(0,1)` → RN gets `opacity:NaN`.
- Fix: Guard `count<=1 → 1.0`. Add pinned case `(0,1)→1.0` and cover the branch (100% core).

**S2 — Partial `getData` failure (present sensor, failed fetch) unspecified; AC-6 only
covers a missing SENSOR.**
- Evidence: AC-6 (`012:132-135`) covers a station MISSING PM10/NO₂. If the sensor exists
  but its `getData` rejects (500/network), sequential `getDetail` rejects wholesale →
  chart AND tiles vanish though PM2.5 history succeeded.
- Fix: Per-call isolation (`Promise.allSettled` on the 3 getData): rejected pollutant →
  omit field (`—`); rejected PM2.5 → `history:[]` (card omitted) while tiles render. Add
  AC-6b: "PM2.5 ok, NO₂ getData rejects → history + PM10 present, NO₂ omitted."

**S3 — `parseLatestValue` "latest" semantics contradict the spec's "order doesn't matter".**
- Evidence: `012:180` says buildHistory sorts "so page order doesn't matter" (order
  untrusted), but AC-6 defines pm10/no2 as LATEST via `parseLatestValue`, which mirrors
  `src/data/gios/mappers.ts:19` ("first non-null") and relies on newest-first order → can
  return a stale value. (Fixture `getData2752.json` IS newest-first, so it works today.)
- Fix: Either `parseLatestValue` picks max-`at` among non-nulls, or the spec asserts GIOŚ
  `getData` is newest-first and both paths rely on it. State it in AC-6.

**S4 — `?size=100` "covers 24h" is unverified; the reuse fixture has only 20 points.**
- Evidence: `012:178-180` claims size=100 covers 24h, but `getData2752.json` has 20 rows
  (default 20/page — fetched without size=100). No in-repo evidence size=100 yields ≥24
  hourly points; if GIOŚ caps/ignores it the "OSTATNIE 24 GODZINY" card shows <24 bars.
- Fix: Add a manual-evidence AC verifying a live size=100 response length, and/or a ≥24-row fixture.

**S5 — Over-fetch understated: active place double-fetches sensors and re-fetches PM2.5.**
- Evidence: active place runs `usePlaceReading` (`ActivePlaceContext.tsx:22`→
  `usePlaceReading.ts:24`→`source.ts:19-26`: sensors + PM2.5 getData) AND `usePlaceDetail`
  → `getDetail` (sensors AGAIN + PM2.5 getData?size=100 AGAIN + PM10 + NO₂). ~6 calls with
  sensors & PM2.5 fetched twice, not the "≈4" of `012:173`; nearest path also re-runs geo + fetchStations.
- Fix: Derive Hero PM2.5 from the size=100 series (drop duplicate) and/or share resolved
  sensors between reading and detail; at minimum correct the "≈4 calls" claim.

**S6 — Duplicated data-layer logic violates CLAUDE.md "no duplicated logic".**
- Evidence: spec adds `findSensorId` (`012:80`, returns null) beside existing
  `findPm25SensorId` (`mappers.ts:7`, throws), and `parseLatestValue` (`012:82`) beside
  `parseLatestPm25` (`mappers.ts:14`).
- Fix: Specify refactor — `findPm25SensorId` = `findSensorId('PM2.5')` (throw at caller),
  `parseLatestPm25` reuses `parseLatestValue`. Call out throw-vs-null so `getCurrentReading`'s
  existing "no PM2.5 sensor → throw → stale" behavior isn't silently changed.

## NIT
- N1 — Static axis labels `12:00/18:00/00:00/06:00/teraz` (AC-8/`012:181`) rarely align
  with real end-hour or when history<24. Faithful to mock; consider follow-up.
- N2 — Missing 150px hero→chart spacer (mock `design/Powietrze.dc.html:71`); AC-10 omits it.
- N3 — Lexicographic `at` sort == chronological except the ~1h/year Europe/Warsaw DST fall-back. Negligible.
- N4 — Unit/header colors not pinned: mock header `.55` (=text.muted), unit `µg/m³` `.45`
  (=text.inactive) at `design/Powietrze.dc.html:75,92`; AC-8/AC-9 pin only label/value.
- N5 — `usePlaceDetail(place)` signature (`012:91`) omits that it uses `useSourceForPlace()`
  and keys on `placeKey` exactly like `usePlaceReading.ts:17-35`. State the mirror.
- N6 — Consider `src/core/air/history.ts`: adding HourPoint/ReadingDetail/buildHistory/
  historyBarOpacity/barHeightPct to `air/index.ts` strains "one responsibility per module".
- N7 — Unused edge fixtures `getData_allnull.json` (0 rows) & `getData_nullhead.json` exist;
  verification (`012:194-196`) cites only `getData2752.json`. Use them for all-null→empty-card
  and null-head branches (cheap path to 100% core coverage).
- N8 — `buildHistory` drops nulls but not negatives; GIOŚ occasionally emits negatives.
  `barHeightPct`/`scene` clamp (no crash) so cosmetic — state drop-or-clamp intent.

## What's missing
- getDetail REJECTS vs resolves-with-empty-history: AC-10 covers only `detail` ABSENT (no getDetail), not the rejected-promise path (S2/B1).
- Hero/chart station-consistency guarantee on the location path (B1).
- Evidence that size=100 yields ≥24 points (S4).
- count=1 opacity behavior (S1).
- In-flight loading render for chart/tiles while getDetail is pending (AC-10 jumps absent→present).

## Testability (PASS)
RN View style props (backgroundColor/opacity/height as "NN%") are readable via
`StyleSheet.flatten` in RNTL (plain Views, not Skia), so AC-8 testID assertions are sound.
Existing `TerazScreen.test.tsx`/`Hero.test.tsx`/nearest tests assert text/testIDs, not
layout (grep: no justify/center/scroll), and `fakeAirSource` lacks getDetail → AC-10
graceful degradation means the scroll refactor won't break them.

## Top 3 highest-leverage changes
1. B1 — Specify nearest-path getDetail: single shared station resolution + identical Kraków
   fallback. Without it the feature is invisible on the default screen for denied users.
2. S2 — Specify per-getData failure isolation (allSettled): degrade per pollutant/history
   instead of dropping the whole detail.
3. S1 + S3 — Fix count=1 NaN opacity and nail parseLatestValue's "latest" semantics
   (max-`at` or assert newest-first). Cheap, and both live in the pinned-formula ACs the
   feature's correctness rests on.

Handoff: planner (address B1/S1–S6 before the plan finalizes).
