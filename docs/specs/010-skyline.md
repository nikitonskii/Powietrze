# Spec 010: Skyline (Horizon city silhouette)

**Status:** draft
**Milestone:** M-skyline
**Sources:** `design/README.md` §Atmosphere ("Skyline") + §Assets ("Skyline"); `design/Powietrze.dc.html` lines 32–35 (svg + path), line 560 (`skylineStyle` density math)

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
// blur = density*7 (px); opacity = 1 - density*0.45.
export function skyline(density: number): { blur: number; opacity: number };

// The fill as an rgba string, built here so no color literal lands in the
// (no-hex-linted) UI layer. rgba(3,5,9, 0.72 - density*0.32).
export function skylineColor(density: number): string;
```

## Behavior — Acceptance Criteria

### Skyline model (core)

- **AC-1** — `SKYLINE_PATH` deep-equals the exact path string from
  `Powietrze.dc.html:34` (literal fixture — M1 retro rule; the test pins the
  full `M0,150 … Z` string verbatim), and `SKYLINE_VIEWBOX` equals
  `{ width: 389, height: 150 }`, and `SKYLINE_TOP_RATIO === 0.44`.
- **AC-2** — `skyline`: `skyline(0)` → `{ blur: 0, opacity: 1 }`;
  `skyline(1)` → `{ blur: 7, opacity: 0.55 }`;
  `skyline(0.5)` → `{ blur: 3.5, opacity: 0.775 }`.
- **AC-3** — `skylineColor`: `skylineColor(0) === 'rgba(3,5,9,0.72)'`;
  `skylineColor(1) === 'rgba(3,5,9,0.4)'`;
  `skylineColor(0.5) === 'rgba(3,5,9,0.56)'` (pins the fill-alpha formula and
  keeps the rgba string out of the UI file).

### Rendering (UI)

- **AC-4** — `Atmosphere` renders a skyline `Path` (testID `skyline`) inside
  the Skia canvas, **after** the particle group (so it sits on top of the
  particles) and within a group carrying `skyline(density).opacity` and a
  `Blur` of `skyline(density).blur`. The path is placed with its top edge at
  `SKYLINE_TOP_RATIO * height` and scaled to span the full canvas width
  (`scaleX = width / 389`, uniform `scaleY = scaleX`), fill `skylineColor(density)`.
  Verified to the extent the Skia jest mock exposes (element presence + the
  derived opacity/blur/color props it forwards); the pixel-level look is AC-5.
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
- **Scale.** The mock's svg is `preserveAspectRatio="none"` at a fixed 389×150
  on a ~390-wide mock, i.e. effectively full-width. We scale uniformly by
  `width/389` (natural silhouette proportions on any width) rather than
  stretching Y independently — on phone widths this matches the mock; the
  manual AC-5 confirms.
- **Color built in core.** `Atmosphere.tsx` is under the no-hex lint, so the
  `rgba(3,5,9,…)` fill is produced by `skylineColor()` in core and consumed as
  an opaque string in the UI (same reason the particle color comes from
  `scene.key`).
- **Static layer.** The skyline has no per-frame animation, so it is exempt
  from the reduced-motion freeze logic; it simply re-renders on density change.

## Verification

- **AC-1..3** (core): unit tests in `src/core/atmosphere/__tests__/`; AC-1 is a
  literal-fixture test pinning the path/viewBox/top-ratio.
- **AC-4** (UI): extend `src/shared/ui/__tests__/Atmosphere.test.tsx` — assert
  the `skyline` element renders and forwards the density-derived props the Skia
  jest mock exposes; if the mock flattens Skia props (as it may), assert element
  presence + that the derived values come from `skyline`/`skylineColor` (spied),
  and route the pixel look to AC-5.
- **AC-5** (manual): three simulator screenshots in the milestone journal.
