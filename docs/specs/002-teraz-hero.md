# Spec 002: Teraz hero (static)

**Status:** draft
**Milestone:** M2
**Sources:** `design/README.md` §"Design language", §"The color system",
§"Screens / Views" → "1. Teraz", §"Design Tokens" (pixels, colors, copy,
tab-bar spec); `src/core/scene` (M1 public API — the value→Scene source).

## Scope

The first rendered surface: a **static** Teraz screen. A design-token
foundation in `src/shared` (color/opacity palette, type scale, spacing),
a small UI kit (`GradientBackground`, typography `Text`), and the **hero
block** — location → city → station/freshness → index number → band name →
PM2.5 line → advice — driven by one mock index through `scene()`, over a
full-bleed **deep→mid** gradient. Navigation is a 3-tab bar (Teraz live;
Miejsca/Ustawienia placeholders). Establishes the `features → shared →
core` import boundary (mechanically enforced) that every later UI
milestone builds on.

## Non-goals

- Atmosphere: Skia shader, particle field, skyline, reduced-motion, the
  260px **radial glow disc**, and the design's **double** number
  text-shadow → **M3** (RN `Text` supports one shadow; M2 uses the single
  strongest key-glow).
- 24h chart card, PM10/NO₂ tiles, forecast card (below the fold) → **M4**.
- Real Miejsca screen (list, search, add/remove) → **M5**; real
  Ustawienia (toggles, segmented, slider) → **M6**. M2 ships bare
  placeholders for both tabs.
- Data fetching, station metadata, real freshness, pull-to-refresh,
  loading/offline/stale states → **M7**. M2 uses a hard-coded mock place.
- Poppins bundling — M2 uses the system face (SF Pro), an approved
  substitute; revisit only if fidelity review demands it (never a
  milestone of its own).
- Scrubbing/animated recolor (the index is fixed in M2) → the live
  atmosphere binding is **M3**.

## Public API

New modules. Internals free to decompose (files ≤200 lines, fns ≤40).

```ts
// src/shared/tokens  — static, non-scene design constants
export const colors: {
  base: '#07090d';
  accent: '#8fb7ff';
  text: {                      // white at the design opacities
    primary: 'rgba(255,255,255,1)';
    high:    'rgba(255,255,255,0.92)';
    mid:     'rgba(255,255,255,0.72)';
    label:   'rgba(255,255,255,0.62)';
    dim:     'rgba(255,255,255,0.5)';
    inactive:'rgba(255,255,255,0.45)';
  };
  tabBar: { bg: 'rgba(10,12,17,0.55)'; border: 'rgba(255,255,255,0.08)' };
};
export const type: {          // size / weight / letterSpacing per design
  index:  { size: 128; weight: '600'; letterSpacing: -3 };
  band:   { size: 22;  weight: '500' };
  city:   { size: 30;  weight: '500' };
  label:  { size: 12;  weight: '600'; letterSpacing: 2.4 };
  station:{ size: 12.5; weight: '400' };
  pm:     { size: 14;  weight: '400' };
  advice: { size: 16;  weight: '400' };
};
export const spacing: { screenH: 24; screenTop: 70; screenBottom: 130 };

// src/shared/ui
export function GradientBackground(props: {
  scene: Scene; children?: ReactNode;
}): JSX.Element;                // full-bleed colors = [scene.deep, scene.mid]
export function Text(props: TextProps & { variant: keyof typeof type; color?: string }): JSX.Element;

// src/features/teraz
export interface Place { city: string; station: string; freshness: string; index: number }
export const MOCK_PLACE: Place;            // Kraków / Al. Krasińskiego / index 118
export function Hero(props: { scene: Scene; place: Place }): JSX.Element;
export function TerazScreen(): JSX.Element; // MOCK_PLACE → scene() → Gradient+Hero

// src/features/miejsca, src/features/ustawienia
export function MiejscaScreen(): JSX.Element;      // placeholder
export function UstawieniaScreen(): JSX.Element;   // placeholder
```

Navigation (App.tsx): a bottom-tab navigator with routes **Teraz**,
**Miejsca**, **Ustawienia**; `initialRouteName: 'Teraz'`.

## Behavior — Acceptance Criteria

All render/behavior AC use React Native Testing Library. Test names cite
the AC ID. The mock index is **118** (Kraków), so scene-derived expected
values reuse M1's pinned case: `key = scene(118).key`, `band = 'Zły'`,
`pm25 = 122`, `advice = „Zostań w domu. Zamknij okna, unikaj wysiłku."`.

Tokens & type scale (literal-pinning AC — M1 retro rule):

- **AC-1** — `colors`, `type`, and `spacing` equal the exact design
  literals: `colors.base === '#07090d'`, `colors.accent === '#8fb7ff'`,
  `colors.text.label === 'rgba(255,255,255,0.62)'`,
  `colors.tabBar.bg === 'rgba(10,12,17,0.55)'`, `type.index.size === 128`,
  `type.index.letterSpacing === -3`, `type.label.letterSpacing === 2.4`,
  `spacing.screenH === 24`. A test asserts these literals directly (not
  derived), so a wrong token value ships red.

Hero content (given `scene(118)` + `MOCK_PLACE`):

- **AC-2** — The static location label renders the literal
  `TWOJA LOKALIZACJA`, and the city renders `MOCK_PLACE.city` (`Kraków`).
- **AC-3** — The station/freshness line renders
  `MOCK_PLACE.station` + `MOCK_PLACE.freshness` verbatim, e.g.
  `Aleja Krasińskiego · stacja GIOŚ · 12 min temu`.
- **AC-4** — The index number renders the text `118`, and its resolved
  text color equals `scene(118).key` (read from style, not hard-coded).
- **AC-5** — The band name renders the text `Zły`, its color equals
  `scene(118).key`, and it is *not* a hard-coded string — swapping the
  input scene to `scene(20)` renders `Bardzo dobry` (proves the component
  reads `scene.band`).
- **AC-6** — The PM2.5 line renders exactly `PM2.5 · 122 µg/m³` (value =
  `scene(118).pm25`, from the scene, not a literal).
- **AC-7** — The advice paragraph renders the exact band copy
  „Zostań w domu. Zamknij okna, unikaj wysiłku." (= `scene(118).advice`);
  with input `scene(20)` it renders the Bardzo-dobry copy instead.

Background:

- **AC-8** — `GradientBackground` given `scene(118)` renders a gradient
  whose `colors` prop deep-equals `[scene(118).deep, scene(118).mid]`
  (asserted on the rendered `LinearGradient` props).

Navigation & tab bar:

- **AC-9** — On mount, three tabs are present with labels `Teraz`,
  `Miejsca`, `Ustawienia`; `Teraz` is the active route and the hero
  (index `118`) is visible.
- **AC-10** — Pressing the `Miejsca` tab shows the Miejsca placeholder
  content and hides the hero; pressing `Ustawienia` shows the Ustawienia
  placeholder. Placeholders render defined text, never a crash.
- **AC-11** — Tab tint rule: the active `Teraz` tab label/icon color
  equals `scene(118).key`; the active `Miejsca`/`Ustawienia` tint equals
  `colors.accent` (`#8fb7ff`); inactive tabs use `colors.text.inactive`.
  (Asserted on the custom tab-bar item styles; exact glow/blur is a
  visual criterion — AC-14.)

Negative scenarios & boundaries:

- **AC-12** — `Hero` renders without throwing at clamped extremes: with
  `scene(0)` the band is `Bardzo dobry` and with `scene(200)` the band is
  `Bardzo zły`; the number shows `0` and `200` respectively. (Hero takes a
  `Scene` prop, so extremes are directly testable.)
- **AC-13** — Import direction is enforced mechanically: `npm run lint`
  fails on any `src/features/*` importing another feature, on any
  `src/core`/`src/shared` importing `src/features`, and on
  `src/core` importing `src/shared`
  (`eslint-plugin-boundaries`). Feature/UI components contain no
  hard-coded hex color literals — all colors resolve from `scene()` or
  `tokens` (lint rule `no-restricted-syntax` over `src/features` +
  `src/shared/ui`).

Visual (manual evidence at human review — step 8):

- **AC-14** — On the iOS simulator, the hero matches design/README.md
  §Teraz within reason: number is the dominant element (~128pt) in the key
  color with a visible key glow; deep→mid gradient fills the screen; tab
  bar reads as an 88px translucent blurred bar. Recorded as a screenshot
  in the PR (no automated screenshot-diff gate — harness §13).

## Resolved ambiguities

1. **Radial glow disc & double text-shadow → M3.** RN `Text` allows one
   shadow; the full design glow (radial disc + two shadows) belongs with
   the atmosphere layer. M2 renders the single strongest key text-shadow.
2. **Gradient direction/exactness is a visual criterion.** AC-8 pins the
   *colors* (`[deep, mid]`, testable); the precise angle/stops match
   design at AC-14, since `react-native-linear-gradient` angle props are
   not meaningfully unit-checkable.
3. **Mock place = Kraków, index 118.** Reuses M1's pinned scene case
   (pm25 122, band Zły) so hero expectations trace to already-verified
   core values; `MOCK_PLACE` is the single seam the M7 data layer
   replaces.
4. **System font, not Poppins.** SF Pro is an approved substitute; type
   *scale* (sizes/weights/spacing) is the token deliverable, not the face.
5. **Tab tint depends on the current scene** (Teraz active = key). With a
   fixed mock index in M2 the key is constant; M3's live binding makes it
   dynamic. No API change needed — the navigator receives the current key.

## Verification

- AC-1…AC-12: Jest + React Native Testing Library under the RN preset;
  each test names its AC ID. AC-1 pins token literals; AC-5/AC-7/AC-6
  additionally prove the component reads `scene()` (second input case),
  not a baked string.
- AC-13: mechanical — `eslint-plugin-boundaries` + `no-restricted-syntax`
  in the ESLint config, run by `npm run lint` locally and in CI; evidence
  is a deliberately-violating fixture failing lint (recorded, not
  committed) plus the green run on the real tree.
- AC-14: manual — simulator screenshot attached to the PR.
- ADRs shipped in the same PR: **ADR-003** react-navigation (native +
  bottom-tabs + react-native-screens), **ADR-004**
  react-native-linear-gradient.
- Harness pieces introduced this milestone: **`reviewer.md`** agent
  (feature-loop step 6), first exercised on this diff; the import-boundary
  lint above.
