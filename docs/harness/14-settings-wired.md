# Journal 14 — M-settings-wired (scale + precision + location; hide widget)

**Spec:** `docs/specs/014-settings-wired.md` (AC-1..9) · **Plan:** `docs/superpowers/plans/2026-08-15-m-settings-wired.md`
**Branch:** `feature/m-settings-wired` (off fix/miejsca-swipe-bleed tip; chain #3→…→#12 precede) · **Base→HEAD:** `56abe49`→`bb3e2ea`
**Built:** 2026-08-15, subagent-driven (6 code tasks + native/manual), per-task review each, final whole-branch review. **No new dependency.**

## What shipped
Made three persisted settings actually change the app (removing their "Wkrótce" tags) and removed the widget row:
- **Skala indeksu** (CAQI / US AQI / µg/m³) → drives the Teraz hero number and the Miejsca row number (via `displayValue`); color/band/atmosphere ALWAYS stay CAQI-driven (the "one value drives the scene" thesis). A small scale caption on the hero says which scale the number is.
- **Dokładność** (Przybliżona / Dokładna) → rounded vs. one-decimal µg/m³ everywhere (`formatConcentration`: PM2.5 line, PM10/NO₂ tiles, µg/m³-scale hero number).
- **Użyj mojej lokalizacji** → off = Kraków default (no geo); on = geolocation. `ActivePlaceProvider` resets the default place when the toggle flips.
- **Stacja widżetu** row → removed (returns with a WidgetKit milestone).

After this milestone only the four POWIADOMIENIA rows (Alert/Próg/Godziny ciszy/Poranne) stay "Wkrótce" — those are the **notifications milestone (@notifee)**.

## Design decisions (from the critique)
- **US AQI from raw hourly PM2.5** using the official (discontinuous) EPA breakpoint table, with the concentration **truncated to 0.1 µg/m³** before lookup so the inter-band gaps never yield `NaN` as the app's headline number; non-finite/negative → 0; above the top row → 500.
- **Color/band always CAQI** — a µg/m³ or US-AQI number sits under a CAQI band, so a small `scaleLabel` caption disambiguates; in µg/m³ mode the redundant `PM2.5 · … µg/m³` sub-line is hidden.
- **Settings read in `TerazScreen`/`PlaceRow`**, passed to `Hero`/`PollutantTiles` as plain props → those two stay pure (their tests need no provider).
- **`loc` toggle resets the default place** (effect keyed only on `settings.loc`); async hydration of a stored `loc:false` fires the reset once at launch (benign; `usePlaceReading` keys on placeKey so no spurious refetch).

## Process notes
- **Critic (pre-plan):** SHIP-WITH-FIXES — B1 (the US-AQI table would emit `NaN` on gap-region hourly floats; "linear" wording misled toward a wrong continuous impl) and B2 (the change silently reds ≥4 existing suites) both folded in before planning, plus 5 should-fixes (ToggleRow `soon?` refactor, hero scale caption, display call-site, loc-effect keying).
- **Test-fallout handled per-task** (DoD #2 = whole suite green): ActivePlaceContext, UstawieniaScreen AC-18/21, Hero, PollutantTiles, PlaceRow, MiejscaScreen, TerazScreen all updated in the tasks that touched them.
- **Reusable gotcha:** discontinuous lookup tables (EPA AQI) + real float inputs = truncate to the table's precision before lookup, or gaps produce NaN. And when wiring a global setting into leaf components, prefer reading it in the stateful parent and passing plain props down — keeps leaves pure + their tests provider-free.

## AC coverage
Gate: 51 suites / 181 tests · lint 0 errors · typecheck clean · `src/core` 100%.
- **AC-1..4b** (core: US-AQI table + display/format/scaleLabel + defaultPlace) ✓ (AC-1 pins the full table + every band + gap + clamp).
- **AC-5/5b/7** (Teraz hero number per scale, caption, hidden µg/m³ sub-line, tiles precision) ✓ · **AC-5** (Miejsca row) ✓ · **AC-6** (loc default + reset) ✓ · **AC-8** (Ustawienia tags/widget) ✓.
- **AC-9 (manual):** on the sim — Skala flips the number CAQI/US AQI/µg/m³ (color unchanged, caption shown); Dokładna adds a decimal; Użyj mojej lokalizacji off → Kraków. PENDING human (Ustawienia toggles aren't headlessly drivable).

<!-- MANUAL EVIDENCE (append after sim): docs/harness/evidence/14/. -->

## Final whole-branch review
APPROVE-WITH-NITS — 0 Critical, 0 Important, 4 Minor (all cosmetic/accepted). Gate independently re-confirmed: 51 suites/181 tests, lint 0, tsc clean, `src/core` 100%.

## Deferred (non-blocking, fast-follows)
- **Nit — dead `Place.index`**: Hero's `Place` interface still declares `index` and `TerazScreen` populates it, but Hero no longer reads it (replaced by the `value` string prop). Drop it (Hero interface + TerazScreen + the Hero.test literals) in a follow-up.
- **Nit — import placement**: `import type { Scale, Precision }` sits after `export * from './history'` in `core/air/index.ts`; move to the top with the other imports.
- **Accepted (Task 5)**: one extra mount re-render from the loc-reset effect (no refetch — placeKey unchanged).
- Notifications (POWIADOMIENIA rows) — next milestone (@notifee): removes the last 4 "Wkrótce".
- WidgetKit (the removed widget row).
