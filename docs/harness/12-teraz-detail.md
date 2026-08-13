# Journal 12 — M-teraz-detail (24h chart + real PM10/NO₂)

**Spec:** `docs/specs/012-teraz-history-pollutants.md` (11 ACs) · **Plan:** `docs/superpowers/plans/2026-08-13-m-teraz-detail.md`
**Branch:** `feature/m-teraz-detail` (off m-design-fidelity tip; chain #3→…→#9 precede) · **Base→HEAD:** `8131182`→`e8c353a`
**Built:** 2026-08-13, subagent-driven (6 code tasks + 1 native/manual), per-task review each, final whole-branch review. **No new dependency.**

## What shipped
Teraz goes from a single value to "value + how the day trended + the real pollutant breakdown":
- **24-hour chart** ("OSTATNIE 24 GODZINY", with the design's clock icon) — one bar per hour of the active place's PM2.5, each colored by that hour's own index (`scene(index).key`), height `clamp(index/2,10,100)%`, opacity fading `0.55→1.0` toward "teraz".
- **PM10 + NO₂ tiles** — real µg/m³ from those GIOŚ sensors, replacing the index-derived fakes.

## The API-reuse insight
The 24h chart needs data GIOŚ **already returns**: `data/getData/{sensor}` is an hourly series (latest → ~3 days back); the old code fetched it and kept only the newest point. This milestone keeps the series (fetched `?size=100`) via `buildHistory`. PM10/NO₂ add two `getData` reads. All of it loads **only for the active place** (Teraz) — the lightweight `getCurrentReading` that Miejsca list rows use is unchanged, so the list didn't get 4× more expensive.

## Architecture
`core/air/history.ts` (pure: HourPoint/ReadingDetail/buildHistory/historyBarOpacity/barHeightPct) ← `data/gios` (`findSensorId`/`parseSeries`/`parseLatestValue`; `getDetail()` = sensors + 3× getData via `Promise.allSettled`, single **memoized** nearest-station resolution sharing the Kraków fallback) ← `shared/place/usePlaceDetail` (mirrors usePlaceReading; run only in ActivePlaceProvider) + `getDetail?` on core `AirQualitySource` ← `shared/ui/HistoryChart`+`PollutantTiles` (+ glass/glassBorder tokens) ← scrollable `TerazScreen`.

## Process notes / catch-class findings
- **Critic (pre-plan), spec 012:** SHIP-WITH-FIXES — Blocker B1 (the *default* location screen: `getDetail`'s fallback + station-consistency were unspecified → a denied-geo user would get Hero-only) + S1 `count=1` NaN opacity + S2 partial-failure isolation + S3 latest-by-`at` + S4 size=100 coverage + S5 corrected call-count + S6 dedup. All folded in before planning.
- **Per-task reviews** caught: the `SourceWithDetail` local type (Task 3, ruled a sound subtype at the time) and confirmed genuine allSettled/rejecting-fetch tests.
- **Final whole-branch review (APPROVE-WITH-NITS):** once Task 4 made `getDetail?` part of core `AirQualitySource`, the Task-3 `SourceWithDetail` type became **redundant** — the whole-branch view caught what the per-task reviews couldn't (the type was fine when written, stale two tasks later). Also caught an AC-8 label collision (spec-002 Hero vs spec-012 chart in one file). Both fixed, plus the design clock icon added and two test-quality nits.
- **Reusable gotchas:** (1) keep the shared `getCurrentReading` cheap and put rich per-place data behind a separate optional `getDetail?` fetched only for the active place — else every list row pays. (2) A nearest/location source must resolve its station ONCE (memoize) so the headline and the detail agree and geo isn't double-called. (3) `Promise.allSettled` per sub-fetch so one pollutant's outage doesn't blank the whole panel. (4) When a later task promotes a type into a shared interface, re-check earlier local shims for staleness — a whole-branch review's specialty.

## AC coverage
**Gate:** 48 suites / 163 tests green · lint 0 errors · typecheck clean · `src/core` 100%.
- **AC-1..3** (history math) ✓ · **AC-4..6c** (mappers + getDetail: allSettled isolation, geo-fallback consistency) ✓ · **AC-7** (usePlaceDetail) ✓ · **AC-8..9** (chart + tiles) ✓ · **AC-10** (scrollable Teraz) ✓.
- **AC-11 (manual):** Teraz shows the 24h chart (bars colored per hour, fading toward "teraz") + real PM10/NO₂ under the hero — see evidence below.

### AC-11 — VERIFIED on-device (2026-08-13, after the fix below)
`docs/harness/evidence/12/teraz-chart-live.png` — Teraz shows the 24h chart with a full row of 24 bars (uniform min-height + brightening toward "teraz", correct for a clean-air day at index 3) and the tiles with **real live GIOŚ values: PM10 13.1, NO₂ 28.5** (matching the API). The manual AC did its job — it caught a real bug (below) that all the automated gates missed.

### Live-data bug caught by AC-11, then fixed (commit follows)
**Symptom:** first sim run rendered the chart card + clock icon + tiles (UI correct) but with empty bars and `—` tiles, despite the API returning valid data.
**Root cause:** the nearest/location source's B1 fix was incomplete. `getCurrentReading` had TWO fallbacks (geo failure → Kraków, AND `readStation(resolved)` failure → Kraków), but `getDetail` shared only the first. On the sim, geo resolves to a location whose nearest station has no usable reading → the Hero fell back to Kraków while `getDetail` stayed on that empty station → empty chart + `—` tiles. (In production from Kraków it wouldn't manifest — nearest = a real station with data — which is why fixtures/tests missed it.)
**Fix:** resolve+validate the station **once** — geo → nearest → probe `readStation`; on ANY failure fall back to Kraków (station AND cached reading together). `getCurrentReading` returns the cached reading; `getDetail` uses the same committed station. Now the Hero and the chart/tiles can never disagree, and a fall-back is total for both. Regression test added: geo succeeds but the nearest station's reading fails → both reading and detail fall back to Kraków (24-bar history + real tiles, not empty).
**Reusable gotcha:** when two data paths (headline vs detail) share a "nearest/fallback" resolution, they must share the SAME committed result — validating the resolution once (probe + cache) beats each path applying its own partial fallback. A device-only path (geo giving a real, non-Kraków location) exposed what every fixture-based test hid — the manual sim AC is the net for exactly this class, as with the M-loc `findAll` pagination bug.

### (superseded) first-run note — AC-11 PARTIAL, live-data bug found
Screenshot: `docs/harness/evidence/12/teraz-chart-ui.png` (iPhone 16 Pro sim, this branch via Metro).
- **UI VERIFIED:** the "OSTATNIE 24 GODZINY" glass card (with the design clock icon), the axis labels `12:00/18:00/00:00/06:00/teraz`, and the `PM10`/`NO₂` tiles all render per the design, under the hero (Kraków, index 3, Bardzo dobry). Composition/scroll/wiring all work.
- **LIVE-DATA BUG (open):** the chart bars are empty and the tiles show `—` — `getDetail` resolved with `{ history: [], pm10: undefined, no2: undefined }` even though the GIOŚ API returns valid data. Verified live via curl: `data/getData/2752?size=100` → 59 hourly points; station 400 sensors include PM10=2750, NO2=2747; latest PM10=13.1, NO2=28.5.
- **Ruled out:** API/endpoint failure, `?size=100` (200, 59 pts), missing sensors, and rate-limiting (12 concurrent requests all 200). Pure functions are unit-tested against this exact JSON shape. So the fault is device-runtime-only, and the all-three-empty signature points at `detailFor`'s sensors lookup returning empty on device while `getCurrentReading`'s identical fetch succeeds (hero shows PM2.5).
- **Blocked on observability:** RN 0.86 routes app `console`/warnings to the on-device LogBox, not Metro stdout, so the device logs aren't readable from the harness. Needs the RN debugger (network/console) or a temporary on-screen diagnostic to pin the root cause. NOT yet fixed.

## Deferred (non-blocking)
- Miejsca trend arrows (can reuse this history data).
- Other pollutants (O₃/CO/SO₂/C₆H₆) as more tiles; official `aqindex` index.
- True card `backdrop-filter: blur` (native lib, excluded) — translucent `glass` used.
