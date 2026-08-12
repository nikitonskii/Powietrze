# Spec 009: Ustawienia (settings screen)

**Status:** draft
**Milestone:** M-ustawienia
**Sources:** `design/README.md` §3 (Ustawienia) + §"State model"; `design/Powietrze.dc.html` lines 178–248 (markup), 532–544 (toggle/segmented style helpers), 372–373 (default state)

## Scope

Replace the `Ustawienia` placeholder with the full settings screen from the
design mock: four grouped sections (LOKALIZACJA, POWIADOMIENIA, WIDŻET I
WYGLĄD, DANE) with toggles, segmented controls, a threshold slider, and
static info rows. Every interactive control is **live and persisted** — it
flips/selects/slides and remembers its state across launches via an
AsyncStorage-backed `SettingsStore` — but no control yet drives app
behavior (the features it will gate don't exist). Rows whose effect isn't
wired carry a small **"Wkrótce"** tag so the screen is honest: the
preference is saved, not yet applied.

## Non-goals

- Making any setting actually change app behavior — notifications/alerts,
  morning briefing, quiet-hours scheduling, widget configuration, index-scale
  conversion (US AQI / µg/m³), and gating geolocation on the `loc` toggle are
  each their own future milestone. This spec ships the surface + persistence.
- A reduce-motion control. It is not in this mock; `Atmosphere` already reads
  the OS setting. Deferred to a future accessibility pass.
- A native slider dependency. The threshold slider is built on the app's
  existing `react-native-gesture-handler` + `react-native-reanimated` stack
  (see Resolved ambiguities), so this milestone adds **no** dependency and no
  ADR.

## Public API

### `src/core/settings/index.ts` (pure)

```ts
export type Precision = 'Przybliżona' | 'Dokładna';
export type Scale = 'CAQI' | 'US AQI' | 'µg/m³';

export interface Settings {
  loc: boolean;
  alert: boolean;
  morning: boolean;
  precision: Precision;
  scale: Scale;
  threshold: number; // integer within [THRESHOLD_MIN, THRESHOLD_MAX]
}

export const THRESHOLD_MIN = 25;
export const THRESHOLD_MAX = 200;

export const DEFAULT_SETTINGS: Settings; // see AC-1 for the literal

// Round to an integer and clamp into [25, 200]; non-finite → DEFAULT threshold (100).
export function clampThreshold(n: number): number;

// Fill missing keys from DEFAULT_SETTINGS, clamp threshold, and replace any
// value of the wrong type / invalid enum with its default. Drops unknown keys.
// Forward/backward-compatible hydration for whatever JSON was stored.
export function mergeSettings(raw: unknown): Settings;

// Persistence seam — a fake in tests, an AsyncStorage adapter in the app.
export interface SettingsStore {
  load(): Promise<Settings>;
  save(settings: Settings): Promise<void>;
}
```

### `src/data/settings/index.ts`

```ts
// Key 'powietrze.settings.v1'. load() → mergeSettings(JSON.parse(stored))
// on any absent/corrupt value returns DEFAULT_SETTINGS (never throws).
export function createAsyncStorageSettingsStore(): SettingsStore;
```

### `src/shared/settings/index.ts` (context)

```ts
export function SettingsProvider(props: {
  store: SettingsStore;
  children: React.ReactNode;
}): JSX.Element;

export interface SettingsApi {
  settings: Settings;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}
export function useSettings(): SettingsApi;
```

### `src/shared/ui/` primitives

```ts
export function Toggle(props: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  testID?: string;
}): JSX.Element;

export function SegmentedControl<T extends string>(props: {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  testID?: string;
}): JSX.Element;

export function ThresholdSlider(props: {
  value: number; // 25–200
  onChange: (next: number) => void;
  testID?: string;
}): JSX.Element;

export function SettingsGroup(props: {
  label: string;
  children: React.ReactNode;
}): JSX.Element;
```

### New design tokens (`src/shared/tokens/index.ts`)

No-hex lint forbids inline rgba in features/shared-ui, so the mock's raw
values become tokens:

```ts
text.faint:  'rgba(255,255,255,0.4)'   // section labels
text.footer: 'rgba(255,255,255,0.35)'  // data footer
text.muted:  'rgba(255,255,255,0.55)'  // inactive segmented option
control: {
  trackOff:  'rgba(255,255,255,0.18)', // toggle off track
  segBg:     'rgba(255,255,255,0.08)', // segmented container
  segActive: 'rgba(255,255,255,0.16)', // segmented active option
  divider:   'rgba(255,255,255,0.06)', // row divider
}
```

(`colors.card`, `colors.success`, `colors.text.dim`, `colors.text.primary`
already exist and are reused for the card bg, toggle-on, static value text,
and knob respectively.)

## Behavior — Acceptance Criteria

### Settings model (core)

- **AC-1** — `DEFAULT_SETTINGS` deep-equals the literal
  `{ loc: true, alert: true, morning: false, precision: 'Przybliżona', scale: 'CAQI', threshold: 100 }`
  (pins the design's default state, `Powietrze.dc.html:372-373`).
- **AC-2** — `clampThreshold`: `10 → 25`, `500 → 200`, `100 → 100`,
  `37.6 → 38` (rounds), `25 → 25`, `200 → 200`, `NaN → 100`,
  `Infinity → 200`.
- **AC-3** — `mergeSettings`: `mergeSettings({})` → `DEFAULT_SETTINGS`;
  a partial object fills only the missing keys; a wrong-typed value
  (`{ alert: 'yes' }`) or invalid enum (`{ scale: 'ZZZ' }`) falls back to that
  key's default; an out-of-range `threshold` is clamped; unknown keys are
  dropped; a non-object (`null`, `42`, `'x'`) → `DEFAULT_SETTINGS`.

### Persistence (data)

- **AC-4** — `save(s)` then `load()` round-trips `s` exactly (through
  AsyncStorage under key `powietrze.settings.v1`).
- **AC-5** — `load()` with nothing stored → `DEFAULT_SETTINGS`.
- **AC-6** — `load()` with corrupt JSON stored → `DEFAULT_SETTINGS`, no throw.
- **AC-7** — `load()` with an older/partial stored shape → the value
  hydrated through `mergeSettings` (missing keys defaulted), never a raw
  partial.

### Settings context (shared)

- **AC-8** — On mount `useSettings().settings` is `DEFAULT_SETTINGS`, then
  hydrates to the value from `store.load()` after it resolves.
- **AC-9** — `set('alert', false)` immediately updates
  `useSettings().settings.alert` to `false` and calls `store.save` once with
  the full updated `Settings` (optimistic write-through).

### UI primitives

- **AC-10** — `Toggle`: with `value=true` the track background is
  `colors.success` and the knob sits at the end; with `value=false` the track
  is `colors.control.trackOff` and the knob sits at the start. Pressing it
  calls `onValueChange(!value)`. Track is 50×30 radius 15; knob 26×26
  radius 13 (`Powietrze.dc.html:534-535`).
- **AC-11** — `SegmentedControl`: the option equal to `value` renders text
  `colors.text.primary` on `colors.control.segActive`; every other option
  renders `colors.text.muted` on transparent. Pressing an option calls
  `onChange` with that option's value (`Powietrze.dc.html:539-540`).
- **AC-12** — `ThresholdSlider`: shows the numeric `value` in color
  `scene(value).key`; a horizontal drag calls `onChange` with a value clamped
  to `[25, 200]` (never outside). The track fill uses `scene(value).key`
  (`Powietrze.dc.html:577-578`).
- **AC-13** — `SettingsGroup`: renders `label` uppercased in
  `colors.text.faint`, size 11, weight 600, letterSpacing 1.4; wraps
  `children` in a card (`colors.card`, radius 18, clipped) with a
  `colors.control.divider` hairline between adjacent rows and none after the
  last.

### Screen (integration)

- **AC-14** — `UstawieniaScreen` renders the header `Ustawienia` and exactly
  these section labels, in this order: `LOKALIZACJA`, `POWIADOMIENIA`,
  `WIDŻET I WYGLĄD`, `DANE`.
- **AC-15** — every row renders its exact Polish copy (literal fixture):
  `Użyj mojej lokalizacji`, `Dokładność`, `Alert smogowy`, `Próg alertu`,
  `Godziny ciszy` / `22:00 – 07:00`, `Poranne podsumowanie` / `07:30`,
  `Stacja widżetu` / `Automatyczna ›`, `Skala indeksu`, `Źródło` / `GIOŚ`,
  `Częstotliwość odświeżania` / `15 min`, and the footer lines
  `Dane: GIOŚ · Open-Meteo` and `Bez konta. Ulubione zostają na telefonie.`
- **AC-16** — pressing the `Alert smogowy` toggle flips its visual state and
  calls the injected store's `save` with `alert` inverted.
- **AC-17** — selecting `Dokładna` in the Dokładność segmented control
  updates the control's active option and persists `precision: 'Dokładna'`.
- **AC-18** — each interactive-but-unwired row (`Użyj mojej lokalizacji`,
  `Dokładność`, `Alert smogowy`, `Próg alertu`, `Poranne podsumowanie`,
  `Skala indeksu`) shows a `Wkrótce` tag; the static info rows (`Źródło`,
  `Częstotliwość odświeżania`) show none.
- **AC-19** — mounting the screen with a store preloaded with a non-default
  `Settings` shows those stored values (e.g. `alert` off), not the defaults —
  proving hydration end to end.

## Resolved ambiguities

- **Custom slider vs `@react-native-community/slider`.** The mock's threshold
  control has a gradient track (ramp color → white) and a value tinted by the
  ramp — styling the community slider's iOS track to match is awkward, and it
  is a new native dependency requiring a pod install + ADR. The app already
  ships `react-native-gesture-handler` + `react-native-reanimated`; a small
  `Gesture.Pan` over a measured track gives full control of the gradient and
  keeps the dependency graph flat. Chosen: custom.
- **"Wkrótce" tag placement.** The mock has no such tag; it's added here for
  honesty because live+persisted controls don't yet change app behavior. It
  goes on interactive rows only — static display rows (Źródło, Odświeżanie,
  and the placeholder rows Godziny ciszy / Stacja widżetu, which are
  non-interactive) state facts and need no tag.
- **`loc` toggle does not gate geolocation** in this milestone; it persists
  like the others and carries a Wkrótce tag. Wiring nearest-station to it is
  a separate change with its own "what shows when off" design question.
- **Threshold value color.** `ramp(threshold, 'key')` in the mock maps the
  threshold number itself onto the scene ramp; realized as `scene(value).key`.
- **`set` write-through is fire-and-forget.** State updates optimistically and
  `store.save` runs without blocking the UI; a failed save is a no-op this
  milestone (no settings depend on durability yet). Matches favorites.

## Verification

- **AC-1..AC-3** (core): unit tests in `src/core/settings/__tests__/`;
  AC-1 is a literal-fixture test (M1 retro rule — pins the default table).
- **AC-4..AC-7** (data): `src/data/settings/__tests__/` against the hand-rolled
  AsyncStorage jest mock.
- **AC-8..AC-9** (context): `renderHook` in `src/shared/settings/__tests__/`.
- **AC-10..AC-13** (UI): behavior tests in `src/shared/ui/__tests__/` — assert
  colors/props via `colorOf`, presses via `fireEvent`; slider drag via a
  `fireEvent` gesture or the reanimated test path (fallback: assert the
  clamp/`onChange` contract directly).
- **AC-14..AC-19** (screen): `src/features/ustawienia/__tests__/` with an
  injected fake `SettingsStore`; AC-15 is a literal-copy fixture test.
- Manual: one simulator screenshot of the finished screen recorded in the
  milestone journal (visual fidelity to the mock).
