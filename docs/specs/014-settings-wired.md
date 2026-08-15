# Spec 014: Wire live settings (scale, precision, location) + hide widget row

**Status:** draft
**Milestone:** M-settings-wired (no new dependency)
**Sources:** `design/README.md` §3 (Ustawienia: Dokładność, Skala indeksu [CAQI/US AQI/µg/m³]) + §"State model" (`settings {loc, precision, scale}`); spec 009 (the settings screen these now drive)

## Scope
Make three already-persisted settings actually change the app (removing their
"Wkrótce" tags), and hide the widget row (needs WidgetKit — out of scope):
- **Skala indeksu** (`scale`): the number the app shows for a place — CAQI (our
  index), US AQI (computed from PM2.5), or µg/m³ (raw PM2.5) — on the Teraz hero
  and the Miejsca rows. The color/band/atmosphere ALWAYS stay CAQI-driven (the
  app's "one value drives the scene" thesis); only the displayed *number* changes.
- **Dokładność** (`precision`): Przybliżona = rounded µg/m³ values; Dokładna =
  one decimal place. Applied to every µg/m³ concentration shown.
- **Użyj mojej lokalizacji** (`loc`): on = the "Twoja lokalizacja" place uses
  geolocation (current); off = the default place is Kraków (no geolocation).
- **Stacja widżetu** row: removed from Ustawienia until a WidgetKit milestone.

The POWIADOMIENIA rows (Alert/Próg/Godziny ciszy/Poranne) stay "Wkrótce" — they
are the separate notifications milestone.

## Non-goals
- Notifications (separate milestone, @notifee).
- The iOS widget (WidgetKit) — the row is hidden, not implemented.
- Changing scene colors/bands per scale — color is always CAQI-driven.
- Per-place scale/precision — these are global app settings.

## Public API

### `src/core/air/index.ts` (additions — pure)
```ts
import type { Scale, Precision } from '../settings';

// EPA PM2.5 → US AQI, piecewise-linear over the standard breakpoints; clamps
// below 0 and above the top band. Rounded to an integer.
export function usAqiFromPm25(pm25: number): number;

// The number to DISPLAY for a place, per the chosen scale, as a formatted string:
//   'CAQI'  → String(index)
//   'US AQI'→ String(usAqiFromPm25(pm25))
//   'µg/m³' → formatConcentration(pm25, precision)
export function displayValue(
  index: number,
  pm25: number,
  scale: Scale,
  precision: Precision,
): string;

// A µg/m³ concentration formatted by precision:
//   'Przybliżona' → String(Math.round(v))     e.g. "13"
//   'Dokładna'    → v.toFixed(1)               e.g. "13.1"
export function formatConcentration(v: number, precision: Precision): string;
```

### `src/core/places/index.ts` (addition — pure)
```ts
// The default active place given the location setting: the geolocation place
// when on, else a fixed station (Kraków) place.
export function defaultPlace(loc: boolean, fallback: Station): ActivePlace;
```

### Wiring
- `ActivePlaceProvider` gains a `defaultStation: Station` prop (App.tsx passes
  `KRAKOW_STATION`). It initializes `active` to `defaultPlace(settings.loc,
  defaultStation)` and, when `settings.loc` changes, resets `active` to the new
  default (see AC-6 for the exact rule). `useSettings()` is available (the
  provider is already inside `SettingsProvider`).
- `Hero` and `PlaceRow` render their big number via `displayValue(...)` using
  `useSettings().settings.scale`/`.precision`; the color stays `scene(index).key`.
- The `PM2.5 · X µg/m³` hero line and the `PollutantTiles` values format via
  `formatConcentration(v, precision)`.
- `UstawieniaScreen`: drop the `soon` tag from `loc`, `precision`, `scale`; remove
  the `Stacja widżetu` (`widget`) row.

## Behavior — Acceptance Criteria

### Core (pure)
- **AC-1** — `usAqiFromPm25` (literal fixture; EPA PM2.5 breakpoints, linear):
  `0 → 0`, `12 → 50`, `12.1 → 51`, `35.4 → 100`, `55.4 → 150`, `9 → 38`
  (round of 9/12·50), `250.4 → 300`, `600 → 500` (clamp to top). Negative → `0`.
- **AC-2** — `formatConcentration`: `(13.1,'Przybliżona') → '13'`;
  `(13.1,'Dokładna') → '13.1'`; `(13,'Dokładna') → '13.0'`; `(12.5,'Przybliżona') → '13'`.
- **AC-3** — `displayValue`: `(118, 122, 'CAQI', p) → '118'`;
  `(118, 122, 'US AQI', p) → String(usAqiFromPm25(122))`;
  `(118, 13.1, 'µg/m³', 'Dokładna') → '13.1'`;
  `(118, 13.1, 'µg/m³', 'Przybliżona') → '13'`.
- **AC-4** — `defaultPlace`: `defaultPlace(true, krk)` deep-equals `LOCATION_PLACE`;
  `defaultPlace(false, krk)` deep-equals `{ kind: 'station', station: krk }`.

### UI / integration
- **AC-5** — with `scale='µg/m³'`, `precision='Dokładna'`, the Teraz hero's big
  number renders `formatConcentration(reading.pm25,'Dokładna')` (e.g. `13.1`)
  while its color remains `scene(reading.index).key` and the band remains
  `scene(reading.index).band`. With `scale='US AQI'` it renders
  `String(usAqiFromPm25(reading.pm25))`; with `scale='CAQI'` it renders the index.
  The same `displayValue` drives the Miejsca `PlaceRow` big number.
- **AC-6** — `ActivePlaceProvider` with `defaultStation=krk`: when `settings.loc`
  is `true` the initial `active` is `LOCATION_PLACE`; when `false` it is the Kraków
  station place. Toggling `loc` while running resets `active` to the new default
  (a deliberate, predictable reset — toggling "use my location" is an explicit
  intent about the default view; a manual pick made afterward stays until the
  next toggle).
- **AC-7** — `PollutantTiles` and the hero `PM2.5 · … µg/m³` line format their
  values with `formatConcentration(v, precision)` — `Dokładna` shows one decimal.
- **AC-8** — `UstawieniaScreen`: `loc`, `precision`, `scale` rows render NO
  `Wkrótce` tag (`wkrotce-loc/precision/scale` absent); the `Stacja widżetu`
  (`setting-widget`) row is absent entirely; the POWIADOMIENIA rows (`alert`,
  `threshold`, `quiet`, `morning`) still show `Wkrótce`.

### Manual
- **AC-9** — *(journal)* On the sim, changing Skala indeksu flips the Teraz
  number between CAQI/US AQI/µg/m³ (color unchanged); Dokładna adds a decimal;
  turning off Użyj mojej lokalizacji shows Kraków. Screenshot into evidence/14.

## Resolved ambiguities
- **Color/band always CAQI.** Scale changes only the displayed number, never the
  scene — the whole-screen-is-the-condition thesis stays on the CAQI index. So a
  µg/m³ of 13 on a green scene is coherent (clean air, shown as concentration).
- **US AQI from raw (hourly) PM2.5.** GIOŚ gives hourly µg/m³; we apply the EPA
  PM2.5 AQI breakpoints to that value directly (not a 24h average) — a reasonable
  live approximation; documented, matching how the app already uses the latest
  hourly value for the index.
- **`loc` off ⇒ Kraków (not a user-picked default).** A custom default-place
  picker is a future nicety; MVP uses the app's existing Kraków fallback.
- **`loc` toggle resets the active place** (AC-6) rather than silently taking
  effect only next launch — immediate, predictable feedback for a settings toggle.
- **Widget row removed, not hidden-behind-a-flag** — simplest; it returns with
  the WidgetKit milestone.
- **Tiles stay µg/m³ regardless of scale** — PM10/NO₂ are concentrations, not
  indices; `scale` governs the primary place value only. Precision still formats them.

## Verification
- **AC-1..4** (core): `src/core/air/__tests__/scale.test.ts` (AC-1 pins the US-AQI
  breakpoint table — M1 retro rule) + `src/core/places/__tests__` for `defaultPlace`.
- **AC-5/7** (Hero/PlaceRow/tiles): behavior tests asserting the rendered number
  string per scale/precision and that the color stays `scene(index).key`.
- **AC-6** (ActivePlaceProvider): `renderHook`/render with a fake settings store
  toggling `loc`.
- **AC-8** (Ustawienia): assert absent `wkrotce-*` for loc/precision/scale and
  absent `setting-widget`, present `wkrotce-alert` etc.
- **AC-9** (manual): sim screenshots in the milestone journal.
