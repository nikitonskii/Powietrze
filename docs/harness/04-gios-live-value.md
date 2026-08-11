# Harness journal 04 — GIOŚ live value (Kraków)

**Milestone:** M-data-1 · **Spec:** `docs/specs/004-gios-live-value.md` · **Branch:** `feature/gios-live-value`

## What the app gained
The first **real data**: Teraz now shows Kraków's live PM2.5 from GIOŚ instead of
the mock. `PM2.5 µg/m³ → index = round(pm25/1.03) → scene()` drives the hero +
atmosphere unchanged. Loading skeleton → live value → error keeps the last value
(stale).

## What the harness gained
- A new **`data` layer** (`src/data/*`) with a boundaries-lint element:
  `app → data`, `data → core`; `features` still consume only the core `Reading`
  interface (the adapter is injected via React context, so a fake source drops
  into every test — no network in Jest).
- The pattern for a live external API behind a `src/core` interface: pure
  mappers isolate the vendor's shape; the IO adapter takes an injected `fetch`.

## Layers introduced
- `src/core/air`: `Reading`, `AirQualitySource`, `indexFromPm25`, `formatFreshness` (pure).
- `src/data/gios`: `constants` (station 400, base URL), `mappers` (pure, isolate
  GIOŚ JSON-LD Polish keys), `source` (IO adapter). ADR-009 (direct-to-GIOŚ).
- `src/features/teraz`: `AirSourceContext` + `useCurrentReading` hook;
  `TerazScreen` composes the `Reading` into `Hero` (real pm25 + freshness).

## Mid-build corrections (critic, pre-build)
The `critic` agent (introduced in M3, dogfooded here) returned NEEDS-REVISION and
caught two real gaps before any code:
1. **Untestable negative paths** — the mappers' whole point is skipping GIOŚ's
   `null` newest-hour reading, but the captured real fixture has no nulls, so a
   naïve `entries[0]` would pass every test. → added synthetic fixtures
   (`getData_nullhead`, `getData_allnull`, `sensors_noPm25`) tied to the negative
   ACs. Same class as the M1 circular-fixture retro.
2. **`Reading` → `Hero` wiring undefined** — a live `Reading` had no city/station/
   freshness the `Hero` needs. → `Reading` now carries station identity (filled by
   the source), `formatFreshness` in core, `TerazScreen` composes them, and the
   hero shows the **real** measured pm25 (not the lossy scene-derived value).
It also verified the arithmetic and the exact GIOŚ keys against the fixtures.

## Known limitations (deferred, documented)
- **Single station (400), no refresh, no cache** — by scope (live-value-first).
- **Tab-bar tint** still uses `MOCK_PLACE.index` (app-level), not the live index —
  wiring the reading into the tab bar is a follow-up.
- Freshness treats GIOŚ's local timestamp as device-local (Poland-only app).
- No owned proxy yet (ADR-009); the interface makes it a drop-in later.

## Approximate spend
Subagent critic (1 dispatch) + inline subagent-driven-style build with live
simulator verification (the reload-JS-over-the-M3-native-build loop meant the
live value appeared without a native rebuild).

## Retro — corrections became rules
_(placeholder — filled at merge, step 10)_
