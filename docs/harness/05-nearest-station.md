# Harness journal 05 — Nearest station (geolocation)

**Milestone:** M-loc · **Spec:** `docs/specs/005-nearest-station.md` · **Plan:** `docs/superpowers/plans/2026-08-11-m-loc-nearest-station.md` · **Branch:** `feature/m-loc-nearest`

## What the app gained
Teraz now shows the air of the **GIOŚ station nearest the device**, not a fixed
Kraków. On launch the app reads the device position, fetches `station/findAll`,
picks the geometrically nearest station (haversine), and shows its live PM2.5 —
hero city/station come from that station's identity. Any failure (permission
denied, geo error, stations fetch, or a station with no PM2.5 reading) falls back
quietly to Kraków (station 400). Same one-value-drives-everything pipeline; only
the *which station* changed.

## What the harness gained
- A new pure **`src/core/geo`** module: `distanceKm` (haversine), `nearestStation`,
  `stationLabel`, and the `Station` / `Geolocation` interfaces. Zero React/IO —
  geo math and the injection seam only.
- A new **`src/data/location`** adapter wrapping `@react-native-community/geolocation`
  (ADR-010) behind the pure `Geolocation` interface, so every unit test injects a
  fake position and Jest never touches the native module (mocked in `jest.setup.js`,
  matching the repo's mock-every-native-module convention).
- The GIOŚ source generalized: `createGiosSource` now delegates to a private
  per-`Station` reading builder that both the Kraków path and nearest-station
  resolution share — one code path, two entry points. `createGiosSource`'s public
  signature is unchanged, so spec-004's `source.test.ts` stayed green untouched.

## Layers introduced / changed
- `src/core/geo`: pure geo (new).
- `src/data/gios`: `stations` (parse/fetch `findAll`, dropping invalid coords),
  `source` refactored to the per-`Station` builder + `createNearestStationSource`;
  `KRAKOW_STATION` is now a full `Station`.
- `src/data/location`: device geolocation adapter (new). ADR-010.
- `App.tsx`: wires `createNearestStationSource(createDeviceGeolocation(), fetch, KRAKOW_STATION_ID)`.

## Mid-build corrections (critic, pre-build)
The `critic` returned NEEDS-REVISION on spec 005 and caught real gaps before any code:
1. **Unguarded refactor regression (B1)** — the `createGiosSource`→per-`Station`
   refactor never pinned `KRAKOW_STATION`'s name/city literals, so the shipped
   spec-004 Kraków label could silently change. → pinned the full `KRAKOW_STATION`
   literal and kept `source.test.ts` (004 AC-6) as the untouched regression guard.
2. **Undefined behavior on invalid coordinates (B2)** — `parseStations` had no
   defined behavior for blank/garbage WGS84 strings on the live `findAll`. Verified
   the live feed (288 stations) is currently clean, but hardened anyway: drop
   invalid-coord entries so a `NaN` (or a `Number('')===0` → `(0,0)`) station can
   never win `nearestStation`. Added a garbage-coord fixture + AC.
3. **Under-tested fallback + tautological AC (S1/S2)** — split the fallback into
   three ACs (geo-reject, reading-throw, stations-fetch-throw) and replaced a
   `index===indexFromPm25(pm25)` tautology with literal-pinned values.
It also verified the haversine arithmetic (Kraków↔Warszawa 251.86 km) and the exact
Greek-letter WGS84 keys against the fixture.

## Post-build defect the manual AC caught (the important one)
Every unit test was green, but on the simulator a Warszawa location kept showing
the **Kraków fallback**. On-device diagnostics (temporary `console.warn` in the
resolver) traced the whole chain: `getCurrentPosition → 52.23,21.01 ✓`,
`fetchStations → 20 stations ✗`, wrong nearest → reading fails → Kraków. Root
cause: **GIOŚ `/station/findAll` is paginated (20/page, ~15 pages)**; the spec's
"unpaginated" assumption was wrong and the *complete* 4-station fixture masked it
in Jest. Fix: request `?size=1000` (all ~290 in one page, `totalPages=1`);
regression test now pins a `size=` param. This is the M1-retro lesson again — a
fixture that's cleaner/more-complete than reality hides a real bug; the manual AC
is what surfaced it. (Also observed: `getData` is paginated too, but page 0 is
newest-first, so the newest reading is always there — a station whose page-0 is
all-null genuinely has no fresh PM2.5, and the Kraków fallback is then correct.)

## Known limitations (deferred, documented)
- **Silent Kraków fallback** — a user who denies permission sees "Kraków" with no
  distinguishing marker (`Reading` has no `isFallback` flag). An examined v1
  tradeoff (spec §Resolved ambiguities S6); a fallback indicator is a noted
  follow-up for M-miejsca.
- **No "nearest station that *has* PM2.5" scan** — v1 picks the geometrically
  nearest; if its reading fails it falls back to Kraków rather than scanning outward.
- **No cache / refresh** — `getCurrentReading()` re-runs geo + `fetchStations` each
  call (re-prompting geolocation on pull-to-refresh). By scope.
- **Search + favorites (Miejsca)** — next milestone; reuses `fetchStations`.

## Manual evidence (AC 005-8)
Native rebuild done (new pod). iPhone 16 Pro, iOS 18.3.1. Screenshots committed
under `docs/harness/evidence/05/`:
- **Set location in Warszawa** (near station 550, ul. Wokalna) → Teraz shows the
  real nearest station, city ≠ Kraków: **Warszawa · ul. Wokalna · stacja GIOŚ**,
  PM2.5 4 µg/m³ → index 4, live "43 min temu"
  (`ac-005-8-warszawa-nearest.png`). This also confirms `stationLabel` strips the
  "Warszawa, " prefix on live data.
- **Fallback → Kraków**: when the nearest station has no fresh PM2.5 (station 530
  is all-null now) or permission is unavailable, Teraz shows
  `Kraków · Aleja Krasińskiego · stacja GIOŚ` (`ac-005-8-krakow-fallback.png`).
  The permission-denied trigger specifically is also covered by unit test AC 005-6a.

Note: the iOS location prompt can't be answered headlessly (no `idb`/accessibility);
the human tapped "Allow While Using App" once to grant, after which relaunches are
deterministic.

## Bundled change (owner decision)
The atmosphere **ambient-floor** polish (commit `1cfa7ab`, the user-requested "make
it gently alive") rides on this branch. It's outside spec 005's scope and untested;
the whole-branch reviewer flagged it. Owner decision: **keep it bundled as-is** — it's
small, intentional, and previously signed off ("lock it"). Recorded as an accepted
deviation rather than reverted or re-architected.

## Retro — corrections became rules
1. **Live list APIs may paginate; a *complete* fixture hides it.** GIOŚ `station/findAll`
   returns 20/page (~15 pages), but the captured 4-station fixture was complete, so every
   unit test passed while the running app saw only page 0's 20 stations and always fell
   back to Kraków. **Rule:** when a data source returns a *list*, verify the LIVE
   response's envelope/pagination (`totalPages`, `links`, `?size=`), not just a captured
   fixture — and treat the manual/live AC as the real net for API-shape assumptions. Direct
   echo of the M1 circular-fixture retro: a fixture cleaner or more complete than reality
   is a liability.
2. **A total, silent fallback needs a dev-visible signal.** The empty `catch {}` made the
   pagination bug invisible until on-device diagnostics; `createNearestStationSource` now
   `console.warn`s under `__DEV__` on every fallback. **Rule:** catch-all fallbacks log in
   dev.
3. **Some manual ACs can't be fully headless.** The iOS location prompt can't be answered
   without `idb`/accessibility; this milestone needed one human tap to grant permission.
   **Rule:** for geolocation/permission manual ACs, plan for a human-in-the-loop grant (or
   add `idb` to the toolchain) rather than assuming full automation.
