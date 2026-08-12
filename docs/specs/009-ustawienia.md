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

// Round to an integer and clamp into [25, 200]. NaN → DEFAULT threshold (100);
// +Infinity → 200, -Infinity → 25 (ordinary clamp — only a genuinely unknown
// NaN falls back to the default).
export function clampThreshold(n: number): number;

// Pure slider math — the risky drag→value logic, extracted so it is
// headless-testable; the Gesture.Pan component is a thin shell that measures
// the track and calls these. `ratio` is the knob position along the track [0,1].
export function thresholdFromRatio(ratio: number): number; // → clampThreshold(25 + ratio*175): rounded int in [25,200]
export function ratioFromThreshold(threshold: number): number; // inverse → clamped [0,1]

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

`set` computes the next `Settings` from the **previous** value via a functional
state update (`setState(prev => ({ ...prev, [key]: value }))`) and persists that
next value, so rapid successive `set` calls compose rather than clobber — same
pattern as `FavoritesContext`. `useSettings` outside a provider throws (mirrors
`useFavorites`).

### Production wiring (`App.tsx`)

`App.tsx` constructs `createAsyncStorageSettingsStore()` once at module scope
(beside the existing `favoritesStore`) and wraps the tree in
`<SettingsProvider store={settingsStore}>`, placed alongside `FavoritesProvider`
in the provider stack around `AppNavigator`. Without this the real app crashes
in `useSettings` even while injected-fake tests pass (AC-24).

### TestID conventions

Per row `key` ∈ {`loc`, `precision`, `alert`, `threshold`, `quiet`, `morning`,
`widget`, `scale`, `source`, `refresh`}: row = `setting-<key>`, its Wkrótce tag =
`wkrotce-<key>`, its control = `toggle-<key>` / `seg-<key>` / `slider-threshold`.

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
  (pins the design's default state, `Powietrze.dc.html:372-373` — note `threshold`
  moves from a top-level mock field into `Settings`).
- **AC-2** — `clampThreshold`: `10 → 25`, `500 → 200`, `100 → 100`,
  `37.6 → 38` (rounds), `25 → 25`, `200 → 200`, `NaN → 100`,
  `Infinity → 200`, `-Infinity → 25`.
- **AC-3** — slider math is pure and clamped/rounded: `thresholdFromRatio`
  `0 → 25`, `1 → 200`, `0.5 → 113` (round of 112.5), `-0.2 → 25`, `1.5 → 200`;
  `ratioFromThreshold` `25 → 0`, `200 → 1`, `25 → 0`…`200 → 1` monotonic;
  round-trip `thresholdFromRatio(ratioFromThreshold(t)) === t` for every
  integer `t` in `[25, 200]`.
- **AC-4** — `mergeSettings`: `mergeSettings({})` → `DEFAULT_SETTINGS`;
  a partial object fills only the missing keys; a wrong-typed value
  (`{ alert: 'yes' }`) or invalid enum (`{ scale: 'ZZZ' }`) falls back to that
  key's default; an out-of-range `threshold` is clamped; unknown keys are
  dropped; a non-object (`null`, `42`, `'x'`) → `DEFAULT_SETTINGS`.

### Persistence (data)

- **AC-5** — `save(s)` then `load()` round-trips `s` exactly (through
  AsyncStorage under key `powietrze.settings.v1`).
- **AC-6** — `load()` with nothing stored → `DEFAULT_SETTINGS`.
- **AC-7** — `load()` with corrupt JSON stored → `DEFAULT_SETTINGS`, no throw.
- **AC-8** — `load()` with an older/partial stored shape → the value
  hydrated through `mergeSettings` (missing keys defaulted), never a raw
  partial.
- **AC-9** — `save()` swallows an `AsyncStorage.setItem` rejection: it never
  rejects (a `__DEV__` warn only), mirroring the favorites adapter
  (`data/favorites/index.ts:24-26`). This is what makes fire-and-forget safe.

### Settings context (shared)

- **AC-10** — On mount `useSettings().settings` is `DEFAULT_SETTINGS`, then
  hydrates to the value from `store.load()` after it resolves. The brief
  default→hydrated flash is accepted (settings are low-stakes; no masking
  spinner) — a stated decision, not a gap.
- **AC-11** — `set('alert', false)` immediately updates
  `useSettings().settings.alert` to `false` and calls `store.save` with the
  full updated `Settings` (`alert: false`, all other keys intact).
- **AC-12** — successive `set` calls compose: `set('alert', false)` then
  `set('morning', true)` leaves `settings` with **both** changes and the last
  `store.save` argument contains both (proves the functional-updater path — a
  closure capture would drop the first change).

### UI primitives

- **AC-13** — `Toggle`: with `value=true` the track background is
  `colors.success` and the knob sits at the end; with `value=false` the track
  is `colors.control.trackOff` and the knob sits at the start. Pressing it
  calls `onValueChange(!value)`. Track is 50×30 radius 15; knob 26×26
  radius 13 (`Powietrze.dc.html:534-535`).
- **AC-14** — `SegmentedControl`: the option equal to `value` renders text
  `colors.text.primary` on `colors.control.segActive`; every other option
  renders `colors.text.muted` on transparent. Pressing an option calls
  `onChange` with that option's value. Container geometry pinned: background
  `colors.control.segBg`, radius 11, padding 3; each option radius 9, padding
  `7×4`, font size 13 weight 500 (`Powietrze.dc.html:191,230,540`).
- **AC-15** — `ThresholdSlider`: shows the numeric `value` in color
  `scene(value).key`; the track fill is a 90° gradient from `scene(value).key`
  to `rgba(255,255,255,0.15)` (`Powietrze.dc.html:578`); `onChange` always
  receives an **integer** within `[25, 200]` (it routes through
  `thresholdFromRatio`, never a raw float). The physical drag→value mapping is
  proven by AC-24 (manual), not a jest gesture.
- **AC-16** — `SettingsGroup`: renders the `label` it is given verbatim (the
  caller passes already-uppercased strings — no `textTransform`, avoiding
  locale-casing surprises) in `colors.text.faint`, size 11, weight 600,
  letterSpacing 1.4; wraps `children` in a card (`colors.card`, radius 18,
  clipped) with a `colors.control.divider` hairline between adjacent rows and
  none after the last.

### Screen (integration)

- **AC-17** — `UstawieniaScreen` renders the header `Ustawienia` and exactly
  these section labels, in this order: `LOKALIZACJA`, `POWIADOMIENIA`,
  `WIDŻET I WYGLĄD`, `DANE`.
- **AC-18** — every row renders its exact Polish copy (literal fixture):
  `Użyj mojej lokalizacji`, `Dokładność`, `Alert smogowy`, `Próg alertu`,
  `Godziny ciszy` / `22:00 – 07:00`, `Poranne podsumowanie` / `07:30`
  (the `07:30` sub-label size 12, `colors.text.inactive`),
  `Stacja widżetu` / `Automatyczna` (no `›` chevron — see AC-21),
  `Skala indeksu`, `Źródło` / `GIOŚ`, `Częstotliwość odświeżania` / `15 min`,
  and the footer lines `Dane: GIOŚ · Open-Meteo` and
  `Bez konta. Ulubione zostają na telefonie.`
- **AC-19** — pressing the `Alert smogowy` toggle flips its visual state and
  calls the injected store's `save` with `alert` inverted.
- **AC-20** — selecting `Dokładna` in the Dokładność segmented control
  updates the control's active option and persists `precision: 'Dokładna'`.
- **AC-21** — Wkrótce-tag state is enumerated for **every** row:
  - **Tagged** (`wkrotce-<key>` present) — the interactive-but-unwired rows
    `loc`, `precision`, `alert`, `threshold`, `morning`, `scale`, **and** the
    two fixed-value placeholder rows `quiet` (Godziny ciszy) and `widget`
    (Stacja widżetu), whose values are invented defaults for unbuilt features,
    not facts. The `widget` row drops the mock's `›` chevron (it implied a
    drill-in that does nothing).
  - **Untagged** — `source` (Źródło / GIOŚ) and `refresh` (Częstotliwość / 15
    min), which state real facts, and the footer.
- **AC-22** — mounting the screen with a store preloaded with a non-default
  `Settings` shows those stored values (e.g. `alert` off), not the defaults —
  proving hydration end to end.
- **AC-23** — `App.tsx` mounts `<SettingsProvider>` with an AsyncStorage store
  around `AppNavigator`: rendering `<App />` and navigating to the Ustawienia
  tab renders the screen without throwing (guards against the "green tests,
  crashing app" gap where the provider is wired only in test fixtures).

### Manual (visual/gesture — recorded in journal, per 008 precedent)

- **AC-24** — On the simulator, dragging the threshold knob left/right changes
  the value monotonically within `[25, 200]`, and the value text + track fill
  recolor as it moves. Screenshot of the finished screen recorded in the
  milestone journal (also covers overall visual fidelity to the mock).

## Resolved ambiguities

- **Custom slider vs `@react-native-community/slider`.** The mock's threshold
  control has a gradient track (ramp color → white) and a value tinted by the
  ramp — styling the community slider's iOS track to match is awkward, and it
  is a new native dependency requiring a pod install + ADR. The app already
  ships `react-native-gesture-handler` + `react-native-reanimated`; a small
  `Gesture.Pan` over a measured track gives full control of the gradient and
  keeps the dependency graph flat. Chosen: custom.
- **"Wkrótce" tag placement.** The mock has no such tag; it's added here for
  honesty because nothing on this screen yet changes app behavior. The rule
  (AC-21): a row is tagged when its value is **not a current fact** — every
  interactive control (persisted but unwired) plus the two fixed-value
  placeholder rows whose values are invented (Godziny ciszy `22:00 – 07:00`,
  Stacja widżetu `Automatyczna`). Only `Źródło` (GIOŚ) and `Częstotliwość`
  (15 min) are real facts, so only they (and the footer) go untagged. The
  `›` chevron on Stacja widżetu is dropped because it implied a working
  drill-in. This deliberately favors honesty over 1:1 mock fidelity on those
  two rows.
- **Optimistic write-through uses a functional updater** (`set(prev => …)`),
  not a closure capture, so rapid successive changes compose (AC-12) — the bug
  the favorites context already avoids. The brief default→hydrated flash on
  first mount is accepted, not masked (AC-10). A failed `save` is swallowed
  (AC-9); no setting depends on durability this milestone.
- **`loc` toggle does not gate geolocation** in this milestone; it persists
  like the others and carries a Wkrótce tag. Wiring nearest-station to it is
  a separate change with its own "what shows when off" design question.
- **Threshold value color.** `ramp(threshold, 'key')` in the mock maps the
  threshold number itself onto the scene ramp; realized as `scene(value).key`.

## Verification

- **AC-1..AC-4** (core): unit tests in `src/core/settings/__tests__/`; AC-1 is
  a literal-fixture test (M1 retro rule — pins the default table); AC-3 unit-tests
  the extracted pure slider math (the risky logic, now headless).
- **AC-5..AC-9** (data): `src/data/settings/__tests__/` against the hand-rolled
  AsyncStorage jest mock (AC-9 forces `setItem` to reject and asserts no throw).
- **AC-10..AC-12** (context): `renderHook` in `src/shared/settings/__tests__/`;
  AC-12 fires two `set` calls and inspects the last `save` argument.
- **AC-13..AC-16** (UI): behavior tests in `src/shared/ui/__tests__/` — assert
  colors/geometry/props via `colorOf`, presses via `fireEvent`. The slider is
  tested through its pure math (AC-3) + the rendered value color/gradient; the
  physical drag is **not** faked in jest (008 established RNTL can't drive
  gestures) — it is AC-24 (manual).
- **AC-17..AC-23** (screen): `src/features/ustawienia/__tests__/` with an
  injected fake `SettingsStore`; AC-18 is a literal-copy fixture test; AC-23
  renders the real `<App />` and navigates to Ustawienia.
- **AC-24** (manual): simulator screenshot + drag walkthrough recorded in the
  milestone journal (visual fidelity + the one gesture jest can't cover).
