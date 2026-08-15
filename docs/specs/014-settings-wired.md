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

// EPA PM2.5 → US AQI. The OFFICIAL, DISCONTINUOUS breakpoint table (below); AQI
// is piecewise-linear WITHIN each row. Input handling: non-finite → 0; < 0 → 0;
// the concentration is TRUNCATED to 0.1 µg/m³ before lookup (EPA convention),
// so the 0.1-µg gaps between rows never yield NaN; above the top row → 500.
// AQI = round( (Ihi-Ilo)/(Chi-Clo) * (Cp-Clo) + Ilo ), Cp = trunc(pm25,0.1).
//   Clo    Chi     Ilo  Ihi
//   0.0    12.0    0    50
//   12.1   35.4    51   100
//   35.5   55.4    101  150
//   55.5   150.4   151  200
//   150.5  250.4   201  300
//   250.5  350.4   301  400
//   350.5  500.4   401  500
export function usAqiFromPm25(pm25: number): number;

// The number to DISPLAY for a place, per scale, as a formatted string:
//   'CAQI'  → String(index)
//   'US AQI'→ String(usAqiFromPm25(pm25))
//   'µg/m³' → formatConcentration(pm25, precision)
export function displayValue(
  index: number, pm25: number, scale: Scale, precision: Precision,
): string;

// A µg/m³ concentration formatted by precision (non-finite → '—'):
//   'Przybliżona' → String(Math.round(v))   e.g. "13"
//   'Dokładna'    → v.toFixed(1)             e.g. "13.1"
export function formatConcentration(v: number, precision: Precision): string;

// A short caption of the active scale for the hero (CAQI has none):
//   'CAQI' → '' ;  'US AQI' → 'US AQI' ;  'µg/m³' → 'µg/m³'
export function scaleLabel(scale: Scale): string;
```

### `src/core/places/index.ts` (addition — pure)
```ts
// The default active place given the location setting: the geolocation place
// when on, else a fixed station place.
export function defaultPlace(loc: boolean, defaultStation: Station): ActivePlace;
```

### Wiring — where settings are read (S4 decision)
`TerazScreen` owns the Teraz scale/precision reads and passes plain strings down,
so `Hero` and `PollutantTiles` stay pure/presentational (their tests need no
provider). `PlaceRow` (already a stateful hook component via `usePlaceReading`)
reads `useSettings()` itself.

- `Hero` prop changes: replace the internal `Math.round(pm25)` with
  `value: string` (the big number, already scale+precision-applied),
  `pm25Label: string | null` (the `PM2.5 · … µg/m³` sub-line; **null hides it** —
  used when `scale='µg/m³'` to avoid showing the same number twice, see N2), and
  `scaleCaption: string` (shown under the number when non-empty, see AC-5b).
  Color stays `scene(index).key`, band stays `scene(index).band`.
- `TerazScreen` computes `value = displayValue(index, pm25, scale, precision)`,
  `pm25Label = scale==='µg/m³' ? null : \`PM2.5 · ${formatConcentration(pm25,precision)} µg/m³\``,
  `scaleCaption = scaleLabel(scale)`; and passes `precision` to `PollutantTiles`.
- `PollutantTiles` gains `precision: Precision` and formats each value via
  `formatConcentration` (undefined value → '—' as today).
- `PlaceRow` renders its big number via `displayValue(reading.index, reading.pm25,
  settings.scale, settings.precision)`; color stays `scene(reading.index).key`.
- `ActivePlaceProvider` gains `defaultStation: Station` (App.tsx passes
  `KRAKOW_STATION` — App is the composition root and already imports `data/gios`,
  so this crosses no layer). Initializes `active` to `defaultPlace(settings.loc,
  defaultStation)`; a `useEffect` keyed ONLY on `settings.loc` resets `active` to
  the new default when it changes (AC-6). `useSettings()` is available (provider
  is inside `SettingsProvider`, `App.tsx:49-50`).
- `UstawieniaScreen`: add a `soon?: boolean` prop to `ToggleRow` (it currently
  hardcodes `soon`); pass `soon` only for `alert`/`morning`, NOT `loc`. Drop
  `soon` from the `precision`/`scale` `StackedRow`s. Remove the `Stacja widżetu`
  (`widget`) row entirely.

## Behavior — Acceptance Criteria

### Core (pure)
- **AC-1** — `usAqiFromPm25` (literal fixture — pins the full EPA table, every
  band interior + boundary, the 0.1-µg gap, clamp, and non-finite):
  `0→0`, `9→38`, `12→50`, `12.05→50` (trunc to 12.0), `12.1→51`, `35.4→100`,
  `45→124`, `55.4→150`, `100→174`, `150.4→200`, `150.5→201`, `250.4→300`,
  `300→350`, `350.4→400`, `400→434`, `500.4→500`, `600→500` (clamp), `-1→0`,
  `NaN→0`.
- **AC-2** — `formatConcentration`: `(13.1,'Przybliżona')→'13'`;
  `(13.1,'Dokładna')→'13.1'`; `(13,'Dokładna')→'13.0'`; `(12.5,'Przybliżona')→'13'`;
  `(NaN,'Dokładna')→'—'`.
- **AC-3** — `displayValue` (the `precision` arg is irrelevant for CAQI/US AQI):
  `(118,122,'CAQI',_)→'118'`; `(118,122,'US AQI',_)→String(usAqiFromPm25(122))`;
  `(118,13.1,'µg/m³','Dokładna')→'13.1'`; `(118,13.1,'µg/m³','Przybliżona')→'13'`.
- **AC-4** — `defaultPlace`: `defaultPlace(true, krk)` deep-equals `LOCATION_PLACE`;
  `defaultPlace(false, krk)` deep-equals `{ kind: 'station', station: krk }`.
- **AC-4b** — `scaleLabel`: `'CAQI'→''`, `'US AQI'→'US AQI'`, `'µg/m³'→'µg/m³'`.

### UI / integration
- **AC-5** — the Teraz hero big number renders `displayValue(reading.index,
  reading.pm25, scale, precision)` while its color stays `scene(reading.index).key`
  and band stays `scene(reading.index).band`: `scale='µg/m³' + 'Dokładna'` → e.g.
  `13.1`; `scale='US AQI'` → `String(usAqiFromPm25(reading.pm25))`; `scale='CAQI'`
  → the index. The same `displayValue` drives the Miejsca `PlaceRow` big number.
- **AC-5b** — the hero shows a scale caption `scaleLabel(scale)` under the number
  when non-empty (US AQI / µg/m³) so the number's scale is unambiguous next to the
  CAQI band; for `CAQI` no caption renders. When `scale='µg/m³'` the redundant
  `PM2.5 · … µg/m³` sub-line is hidden (`pm25Label` null); otherwise it shows,
  formatted by precision.
- **AC-6** — `ActivePlaceProvider` with `defaultStation=krk`: initial `active` is
  `LOCATION_PLACE` when `settings.loc` is `true`, else the Kraków station place.
  The reset `useEffect` keys ONLY on `settings.loc` (not the computed place, which
  is a fresh object each call), so toggling `loc` resets `active` to the new
  default. NOTE: settings hydrate async (first render `DEFAULT_SETTINGS` loc:true,
  then the stored value arrives), so a stored `loc:false` fires the reset once
  during hydration — benign (no manual pick yet); the effect cannot and need not
  distinguish hydration from a user toggle.
- **AC-7** — `PollutantTiles` values format via `formatConcentration(v, precision)`
  — `Dokładna` shows one decimal; a missing value stays `—`.
- **AC-8** — `UstawieniaScreen`: `loc`, `precision`, `scale` rows render NO
  `Wkrótce` tag (`wkrotce-loc/precision/scale` absent); the `Stacja widżetu`
  (`setting-widget`) row is absent entirely; the POWIADOMIENIA rows (`alert`,
  `threshold`, `quiet`, `morning`) still show `Wkrótce`. **This supersedes spec-009
  AC-18 (widget copy) and AC-21 (wkrotce enumeration) — those assertions are
  rewritten here (see Existing tests to update).**

### Existing tests to update (B2 — DoD requires the whole suite green)
- `src/shared/place/__tests__/ActivePlaceContext.test.tsx` — the provider now
  requires `defaultStation` and calls `useSettings()`; wrap its renders in a fake
  `SettingsProvider` + the existing `PlaceSourceProvider`, and pass `defaultStation`.
- `src/features/ustawienia/__tests__/UstawieniaScreen.test.tsx` — rewrite the
  AC-18 widget-row assertion (row is now absent) and the AC-21 `wkrotce-*`
  enumeration (loc/precision/scale/widget no longer tagged; alert/threshold/quiet/
  morning still are) to match spec-014 AC-8.
- `src/features/teraz/__tests__/Hero.test.tsx` — Hero's props changed
  (`value`/`pm25Label`/`scaleCaption` instead of `pm25`); update the render calls
  (no provider needed — Hero stays pure).
- `src/features/miejsca/__tests__/PlaceRow.test.tsx` — PlaceRow now calls
  `useSettings()`; wrap its renders in a fake `SettingsProvider`.
- `src/shared/ui/__tests__/PollutantTiles.test.tsx` — pass the new `precision` prop.

### Manual
- **AC-9** — *(journal)* On the sim, changing Skala indeksu flips the Teraz
  number between CAQI/US AQI/µg/m³ (color unchanged, caption shown); Dokładna adds
  a decimal; turning off Użyj mojej lokalizacji shows Kraków. Screenshot → evidence/14.

## Resolved ambiguities
- **Color/band always CAQI.** Scale changes only the displayed number, never the
  scene — the whole-screen-is-the-condition thesis stays on the CAQI index. So a
  µg/m³ of 13 on a green scene is coherent (clean air, shown as concentration).
- **US AQI from raw (hourly) PM2.5.** GIOŚ gives hourly µg/m³; we apply the EPA
  PM2.5 AQI breakpoints to that value directly (not a 24h average) — a reasonable
  live approximation, matching how the app already uses the latest hourly value.
  The table is DISCONTINUOUS (0.1-µg gaps); we TRUNCATE the concentration to 0.1
  µg/m³ before lookup (EPA convention) so gap-region inputs (e.g. 12.05) are
  always defined — never `NaN` as the app's headline number. Non-finite/negative
  → 0; above the top row → 500.
- **Hero scale caption + no double value.** A US-AQI number under a CAQI band can
  disagree ("51 Moderate" vs "Bardzo dobry"), so the hero shows a small
  `scaleLabel` caption (US AQI / µg/m³; none for CAQI) telling the user which
  scale the number is; the band/color still describe the CAQI condition. In µg/m³
  mode the big number already IS the concentration, so the redundant
  `PM2.5 · … µg/m³` sub-line is hidden.
- **Settings are read in `TerazScreen` and `PlaceRow`, not in `Hero`/`PollutantTiles`.**
  Hero and PollutantTiles stay pure (parent passes strings/precision), which keeps
  their tests provider-free; PlaceRow already uses hooks so it reads settings itself.
- **`loc` reset keys on `settings.loc` only** (the computed default place is a
  fresh object each render — depending on it would loop). Hydration of a stored
  `loc:false` fires the reset once at launch (benign).
- **`loc` off ⇒ Kraków (not a user-picked default).** A custom default-place
  picker is a future nicety; MVP uses the app's existing Kraków fallback.
- **`loc` toggle resets the active place** (AC-6) rather than silently taking
  effect only next launch — immediate, predictable feedback for a settings toggle.
- **Widget row removed, not hidden-behind-a-flag** — simplest; it returns with
  the WidgetKit milestone.
- **Tiles stay µg/m³ regardless of scale** — PM10/NO₂ are concentrations, not
  indices; `scale` governs the primary place value only. Precision still formats them.

## Verification
- **AC-1..4b** (core): `src/core/air/__tests__/scale.test.ts` (AC-1 pins the full
  US-AQI table + gap + non-finite — M1 retro rule, and exercises every band for the
  100% core-coverage gate) + `src/core/places/__tests__` for `defaultPlace`.
- **AC-5/5b/7** (Hero/PlaceRow/tiles): behavior tests asserting the rendered number
  string per scale/precision, the scale caption, the hidden µg/m³ sub-line, and
  that the color stays `scene(index).key`.
- **AC-6** (ActivePlaceProvider): render with fake `SettingsProvider` +
  `PlaceSourceProvider` (the provider mounts `usePlaceReading`/`usePlaceDetail`,
  which need `useSourceForPlace`), toggling `loc`.
- **AC-8** (Ustawienia): assert absent `wkrotce-*` for loc/precision/scale and
  absent `setting-widget`, present `wkrotce-alert` etc.
- **Existing suites** listed under "Existing tests to update" must stay green after
  their updates (DoD #2) — run the FULL suite each task, not just the new tests.
- **AC-9** (manual): sim screenshots in the milestone journal.
