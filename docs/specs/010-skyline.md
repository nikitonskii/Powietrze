# Spec 010: Skyline (Horizon city silhouette)

**Status:** draft
**Milestone:** M-skyline
**Sources:** `design/README.md` §Atmosphere ("Skyline") + §Assets ("Skyline"); `design/Powietrze.dc.html` line 33 (`<svg>` viewBox), line 34 (`<path d>`), line 560 (`skylineStyle` density math)

## Scope

Add the design's generic city silhouette to the Teraz atmosphere: a full-width
SVG path sitting at 44% screen height that **dissolves into haze as the air
worsens** — crisp and dark at "Bardzo dobry," blurred and nearly swallowed at
"Bardzo zły." It renders inside the existing Skia atmosphere canvas, above the
particle field and below the hero content, driven by the same `scene.density`.
No new dependency (Skia is already on board).

## Non-goals

- A city-specific skyline. The design ships one generic silhouette reused as-is
  (README §Assets); a per-city skyline is never planned.
- Any change to the particle field, gradient, or hero. This spec only adds the
  skyline layer.
- Animating the skyline. It is static (unlike the drifting particles); it only
  re-renders when the index/density changes. Unaffected by reduced-motion.

## Public API

### `src/core/atmosphere/index.ts` (additions — pure)

```ts
// The design's generic silhouette (Powietrze.dc.html:34), reused verbatim.
export const SKYLINE_PATH: string;            // "M0,150 L0,96 … Z"
export const SKYLINE_VIEWBOX: { width: 389; height: 150 };
export const SKYLINE_TOP_RATIO = 0.44;        // top edge at 44% of screen height

// density (scene.density, 0.03..1) → the skyline's haze params.
// blur = density*7; opacity = 1 - density*0.45.
// NOTE: `blur` ports the design's CSS blur *radius* (px) 1:1 to Skia's `<Blur>`
// Gaussian *sigma* — same 1:1 convention M3 used for particle shadowBlur. Not
// pixel-identical to the HTML; AC-5 confirms the look and may record a factor.
export function skyline(density: number): { blur: number; opacity: number };

// The fill as an rgba string, built here so no color literal lands in the
// (no-hex-linted) UI layer. Base rgb(3,5,9); alpha = 0.72 - density*0.32,
// ROUNDED to 2 decimals with trailing zeros stripped so the string is stable:
//   `rgba(3,5,9,${String(parseFloat((0.72 - density*0.32).toFixed(2)))})`
// (raw JS concat would emit 0.39999999999999997 for density=1 — see AC-3).
export function skylineColor(density: number): string;
```

## Behavior — Acceptance Criteria

### Skyline model (core)

- **AC-1** — `SKYLINE_PATH` deep-equals the exact path string from
  `Powietrze.dc.html:34` (literal fixture — M1 retro rule; the test pins the
  full `M0,150 … Z` string verbatim), and `SKYLINE_VIEWBOX` equals
  `{ width: 389, height: 150 }`, and `SKYLINE_TOP_RATIO === 0.44`.
- **AC-2** — `skyline`: `skyline(1)` → `{ blur: 7, opacity: 0.55 }`;
  `skyline(0.5)` → `{ blur: 3.5, opacity: 0.775 }`;
  `skyline(0.03)` → `{ blur: 0.21, opacity: 0.9865 }` (the realistic clean-air
  floor — `scene.density` clamps to `[0.03, 1]` and never reaches 0).
- **AC-3** — `skylineColor` (alpha rounded per §Public API):
  `skylineColor(1) === 'rgba(3,5,9,0.4)'`;
  `skylineColor(0.5) === 'rgba(3,5,9,0.56)'`;
  `skylineColor(0.03) === 'rgba(3,5,9,0.71)'` (0.72−0.0096=0.7104→0.71). Pins
  the fill-alpha formula + the 2-dp formatting and keeps the rgba out of the UI.

### Rendering (UI)

- **AC-4** — A `Skyline` sub-component (extracted, NOT inlined into
  `Atmosphere()` — keeps that render body ≤40 lines) renders inside the existing
  Skia canvas **after** the particle group (so it overlays the field). It is a
  `Group` (testID `skyline-group`) carrying `opacity = skyline(density).opacity`
  and a child `Blur` whose `blur = skyline(density).blur`, containing a `Path`
  (testID `skyline`) with `color = skylineColor(density)`. Placement: the path's
  viewBox origin (y=0) is put at `SKYLINE_TOP_RATIO * height` via
  `transform=[{ translateY: SKYLINE_TOP_RATIO * height }, { scale: width/389 }]`
  (uniform scale about origin (0,0); `height`/`width` = `useWindowDimensions`,
  valid because the canvas is `absoluteFill` full-bleed). The installed
  `@shopify/react-native-skia` jest mock renders children as inspectable host
  nodes with props spread (Path→`skPath`, Group→`skGroup`, Blur→
  `skBlurMaskFilter`), so assert concretely: `getByTestId('skyline').props.color
  === skylineColor(density)`, `getByTestId('skyline-group').props.opacity ===
  skyline(density).opacity`, and the `Blur` child's `blur` prop `===
  skyline(density).blur`. The pixel-level look is AC-5.
- **AC-5** — *(manual, recorded in journal)* On the simulator at three indices
  — clean (~12), moderate (~118), bad (~175) — the skyline is respectively
  crisp/dark, softened/dimmer, and heavily blurred/nearly swallowed. Screenshot
  each into `docs/harness/evidence/10/`.

## Resolved ambiguities

- **Lives in the existing Skia `Atmosphere` canvas**, not a new component or a
  `react-native-svg` layer — Skia is already the atmosphere renderer, gives free
  `Blur`, and adds no dependency. The path renders after the particle `Group`
  so it overlays the field (matching the mock's `zIndex:10` skyline over the
  particle canvas).
- **Scale + placement.** The mock's svg is `preserveAspectRatio="none"` at a
  fixed 389×150 on a ~390-wide mock, i.e. effectively full-width. We scale
  uniformly by `width/389` (natural silhouette proportions on any width) rather
  than stretching Y independently — on phone widths this matches the mock. The
  path's **viewBox origin (y=0)** — not the tallest building (y=24) — is anchored
  at `SKYLINE_TOP_RATIO * height`, matching the design's `top:44%` on the
  150-tall svg (so the ~24px of headroom above the buildings is preserved). The
  horizon line thus tracks screen height (44%) while building heights track
  width (uniform scale) — intended; on unusual aspect ratios the horizon holds
  but building height follows width. `height`/`width` come from
  `useWindowDimensions`; correct because the canvas is `absoluteFill` full-bleed
  (revisit the origin if a safe-area inset is ever added).
- **Blur units.** `blur = density*7` ports the design's CSS blur *radius* (px)
  1:1 onto Skia's `<Blur>` Gaussian *sigma* — the same 1:1 convention M3 used
  for the particle `shadowBlur`. Not guaranteed pixel-identical to the HTML;
  AC-5 compares at matching indices and may record a conversion factor rather
  than treating 7 as exact.
- **Decomposition.** The skyline renders in the SAME Skia canvas (free `Blur`,
  no dep, correct z-order over particles) but as an extracted `Skyline`
  sub-component, so `Atmosphere()`'s render body stays ≤40 lines and each file
  keeps one responsibility.
- **Color built in core.** `Atmosphere.tsx` is under the no-hex lint, so the
  `rgba(3,5,9,…)` fill is produced by `skylineColor()` in core and consumed as
  an opaque string in the UI (same reason the particle color comes from
  `scene.key`).
- **Static layer.** The skyline has no per-frame animation, so it is exempt
  from the reduced-motion freeze logic; it simply re-renders on density change.

## Verification

- **AC-1..3** (core): unit tests in `src/core/atmosphere/__tests__/`; AC-1 is a
  literal-fixture test pinning the path/viewBox/top-ratio.
- **AC-4** (UI): a test for the `Skyline` sub-component (its own file or an
  extension of `Atmosphere.test.tsx`) — the Skia jest mock renders children as
  host nodes with props spread, so assert concretely (no flatten hedge):
  `skyline` Path `.props.color === skylineColor(density)`, `skyline-group`
  `.props.opacity === skyline(density).opacity`, and the `Blur` child's `.props.blur
  === skyline(density).blur`. (Spying on `skyline`/`skylineColor` is an optional
  supplement, not a substitute.) The pixel look is AC-5.
- **AC-5** (manual): three simulator screenshots in the milestone journal.
