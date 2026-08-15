# Journal 16 — M-pollutant-tiles (data-driven Teraz-detail tiles)

**Spec:** `docs/specs/016-pollutant-tiles.md` (AC-1..6) · **Plan:** `docs/superpowers/plans/2026-08-15-m-pollutant-tiles.md`
**Branch:** `feature/m-pollutant-tiles` (off `feature/m-notifications`/PR #14; chain #3→…→#14 precede) · **Built:** 2026-08-15, subagent-driven (2 tasks, per-task review each). **No new dependency.**

## What shipped
The Teraz detail showed two hard-coded tiles (PM10 + NO₂). It now renders **one
tile per pollutant the resolved station actually measures**, from a fixed core
catalog, in a stable order, as a wrapping 2-column grid. Kraków/Al. Krasińskiego
(station 400) shows a **2×2 grid: PM10, NO₂, CO, C₆H₆** — verified live on the sim
(PM10 13, NO₂ 29, CO 239, benzene **0.20** µg/m³). Stations that measure O₃/SO₂
show those automatically, with zero station-specific code.

## Why data-driven (not a fixed set)
Checking the **live** API first was decisive: station 400 has **no O₃ and no SO₂
sensors** — it measures PM10, NO₂, CO, NO, NOₓ, PM2.5, C₆H₆. The original
"O₃/CO/SO₂" idea would have rendered permanently-empty O₃/SO₂ tiles. And because
geolocation resolves *arbitrary* stations (the nearest-station source is live), a
hard-coded set is wrong elsewhere too. Data-driven is the only correct design.
**Human sign-off obtained to supersede `design/README.md:80`** (fixed 2-tile grid);
`design/` is a read-only source of truth, so the deviation is recorded in the spec.

## Design decisions (from the critique — SHIP-WITH-FIXES, B1/B2 + S1–S8 folded)
- **Catalog single-sources code + label + order** in `core/air` `POLLUTANTS`; the
  `PollutantReading` carries only `{code, value}` — the UI derives the label from
  the catalog (S6: one home for label truth). Core codes equal GIOŚ codes, so the
  data layer passes them verbatim to `findSensorId` — no translation seam (S7).
- **`formatPollutant`** keeps 2 decimals for `0 < value < 1` (benzene 0.20 would
  otherwise round to "0"), else defers to `formatConcentration` — a clean
  delegation, not a fork. Negatives take the formatConcentration path (not special-cased).
- **Finite filter, not `status==='fulfilled'`** (S3/critic core point): an all-null
  sensor makes `parseLatestValue` return `undefined`, which settles *fulfilled* — so
  `resolvePollutants` keeps a result only when `Number.isFinite(value)`. Order is
  preserved because `Promise.allSettled` returns input-array order.
- **No "—" tiles:** a truly-absent sensor is simply not rendered; a lone last tile
  (odd count) stays 48% width, not stretched. Accepted consequence (S8): a station
  whose sensor flickers null hour-to-hour reflows between N and N−1 tiles.
- **B2 coverage:** AC-3b pins the full 6-pollutant ordered path (O₃/SO₂ present) via
  a synthetic all-six fixture — the feature's core claim is no longer untested.

## Process notes
- **Live-API-first paid off again** (like M-loc findAll, teraz-detail station
  consistency): the feature's whole shape changed once the real sensor list was
  checked. Verify data availability before designing tiles around it.
- **Two tasks:** Task 1 (additive core: catalog + `formatPollutant`) is green on its
  own; Task 2 is the atomic `ReadingDetail` shape migration (adapter + UI + feature +
  4 test suites) — splitting it would leave the tree non-compiling mid-way.
- **B1 (critic):** the naive completion grep (`\.pm10|\.no2`) collides with the
  unrelated `src/core/scene` atmosphere fields — scoped the guard to `ReadingDetail`
  usages and excluded `core/scene`. Guard ran empty at completion.
- **Reusable gotcha:** a discontinuous change to a shared type (`ReadingDetail`) is
  an atomic migration; and when a completion-grep guard is part of the plan, scope it
  or it snags unrelated same-named fields.

## AC coverage
Gate: 55 suites / 198 tests · lint 0 errors · typecheck clean · `src/core` 100%.
- **AC-1** (POLLUTANTS catalog literal) ✓ · **AC-2** (`formatPollutant` table incl. sub-1, negatives, non-finite) ✓ (core).
- **AC-3a** (PM10/NO₂/CO/C₆H₆ → ordered) ✓ · **AC-3b** (all six → catalog order) ✓ · **AC-3c** (present-but-all-null → omitted) ✓ (adapter, fetch mocked).
- **AC-4** (tiles: catalog labels, `formatPollutant` values, four µg/m³, benzene 0.35→"0.35") ✓ · **AC-5** (empty → renders nothing) ✓.
- **AC-6 (manual)** ✓ — live 2×2 Kraków grid, benzene "0.20" confirming sub-1 formatting → `docs/harness/evidence/16/01`.

## Deferred (non-blocking)
- Per-pollutant 24h history/sparklines; per-pollutant CAQI sub-indices/coloring (non-goals).
- **Minor (final-review roll-up):** `detail.test.ts` failure-isolation `describe` is
  labeled `AC-3` (no such bare ID in spec 016 — it's a carried-forward regression, not
  the AC-3a/b/c coverage); `getData_allnull.json` reused for AC-3c is an empty array
  rather than all-null entries (behaviorally identical; spec-sanctioned).
- Sim LogBox "Open debugger to view warnings" present (pre-existing, also on the
  @notifee build) — not introduced here; device console not readable from the harness.
