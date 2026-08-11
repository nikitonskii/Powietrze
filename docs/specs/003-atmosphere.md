# Spec 003: Atmosphere (signature-first)

**Status:** implemented
**Milestone:** M3
**Sources:** `design/README.md` §"Atmosphere layer", §"Screens / Views" →
"1. Teraz" (radial glow + number shadow), §"Interactions & Behavior"
(reduced-motion); `src/core/scene` (M1 — provides `pm25`, `key`, and
**`density`** already: `min(1, max(0.03, pm25/135))`); `docs/nfr.md` (≥55fps).
Particle math source of truth: `design/Powietrze.dc.html` (`_draw`).

## Scope

The signature atmosphere behind the **Teraz** screen: a **Skia particle
field** whose count scales with `scene.density` (a few faint specks when the
air is clean, a thick field when it is bad), particles drifting slowly upward
in the scene's key color; plus the number **glow polish** — the 260px radial
glow disc behind the index and a stronger key glow than M2's single shadow.
The field freezes but stays present under the OS **Reduce Motion** setting.
Everything derives from one `index` through `scene()` (M1); atmosphere adds no
second source for density.

## Non-goals

- **Skyline** (silhouette that blurs as air worsens) → a following short loop.
  It is an independent absolute layer, so deferring it leaves no seam debt.
- **Tab-bar backdrop blur**, **SF-Symbol tab icons** → later (ADR-003).
- **Live data** — atmosphere runs off the mock `index` (Kraków, 118); the data
  layer is its own milestone (~M7). This spec must not assume live data.
- **Below-the-fold** cards → M4. Configurable particle count / settings → never.

## Public API

New pure module `src/core/atmosphere` (zero React imports). **It consumes the
`density` M1 already computes — it does not re-derive it.**

```ts
export interface AtmosphereField {
  count: number;           // round(density * POOL_SIZE)
  particleOpacity: number; // OPACITY_BASE + density * OPACITY_SCALE
  particleBlur: number;    // BLUR_BASE + density * BLUR_SCALE
}
// density is scene.density (already 0.03..1); atmosphere maps it to the field.
export function atmosphere(density: number): AtmosphereField;

// Pure animated offset — enables the reduced-motion test without white-boxing.
// frozen === true → result is independent of t (upward drift + sine wander stop).
export function particleOffset(
  seed: number, t: number, frozen: boolean
): { x: number; y: number };

// Design literals (exported for consumers + the AC-4 literal fixture):
export const POOL_SIZE = 260;
export const OPACITY_BASE = 0.05;
export const OPACITY_SCALE = 0.32;
export const BLUR_BASE = 5;
export const BLUR_SCALE = 9;
export const RADIUS_MIN = 0.8;
export const RADIUS_MAX = 3.4;
export const DRIFT_VY_MIN = 0.08;
export const DRIFT_VY_MAX = 0.36;
export const WANDER_MIN = 5;
export const WANDER_MAX = 17;
// Number-glow literals (design "radial-gradient(circle, {key}44, transparent 68%)", 260px):
export const GLOW_SIZE = 260;
export const GLOW_INNER_ALPHA = 0x44 / 255; // ≈ 0.26667 — design {key}44
export const GLOW_TRANSPARENT_STOP = 0.68;
```

Density is NOT re-exported or re-derived here — `DENSITY_FLOOR`/`135` stay
solely in `src/core/scene`. Exact particle *positions* are visual (not pinned);
only `count/opacity/blur`, the constants, and the frozen-invariance property
are the contract.

New components:
- `src/shared/ui/Atmosphere.tsx` — `Atmosphere({ scene: Scene; reducedMotion?: boolean })`. Full-bleed Skia canvas of `atmosphere(scene.density).count` particles in `scene.key`, drifting via `particleOffset` on the Reanimated clock; `reducedMotion` (default = OS setting) passes `frozen` so the field is present but static. `testID="atmosphere"`, mounted `StyleSheet.absoluteFill`.
- `src/shared/ui/NumberGlow.tsx` — `NumberGlow({ color: string; size?: number; children })`. Renders a `GLOW_SIZE` radial disc (`color` at `GLOW_INNER_ALPHA` → transparent at `GLOW_TRANSPARENT_STOP`) behind its children. `testID="number-glow"`.

## Behavior — Acceptance Criteria

Pure core (`src/core/atmosphere`) — unit-tested, literal-pinned:

- **AC-1** — `atmosphere(density).count === round(density * 260)`, consuming
  `scene.density` directly (no re-derivation). Pins: `count(0.03) === 8`,
  `count(122/135) === 235` (index 118), `count(1) === 260`.
- **AC-2** — `particleOpacity === 0.05 + density*0.32`. Pins:
  `opacity(0.03) ≈ 0.0596`, `opacity(122/135) ≈ 0.33919`, `opacity(1) === 0.37`.
- **AC-3** — `particleBlur === 5 + density*9`. Pins: `blur(0.03) ≈ 5.27`,
  `blur(1) === 14`.
- **AC-4** *(literal fixture, M1 retro rule)* — exported constants equal the
  design literals exactly: `POOL_SIZE 260`, `OPACITY_BASE 0.05`,
  `OPACITY_SCALE 0.32`, `BLUR_BASE 5`, `BLUR_SCALE 9`, `RADIUS_MIN 0.8`,
  `RADIUS_MAX 3.4`, `DRIFT_VY_MIN 0.08`, `DRIFT_VY_MAX 0.36`, `WANDER_MIN 5`,
  `WANDER_MAX 17`, `GLOW_SIZE 260`, `GLOW_INNER_ALPHA 0x44/255`,
  `GLOW_TRANSPARENT_STOP 0.68`. (The radius/vy/wander/glow constants are pinned
  for design fidelity; they are consumed by the Skia render, a visual checkpoint.)
- **AC-5** *(reduced-motion, pure + RNTL)* — `particleOffset(seed, t, true)` is
  **invariant to `t`**: for any `seed`, `particleOffset(seed, t1, true)` deep-
  equals `particleOffset(seed, t2, true)`; with `frozen=false` the two differ.
  And an RNTL test renders `<Atmosphere scene={scene(118)} reducedMotion />` and
  asserts it mounts with `testID="atmosphere"` and does not throw. (The OS-driven
  default path is manual; only the injected prop + pure function are unit-tested.)

Component & visual (RNTL + screenshot):

- **AC-6** *(composition, RNTL)* — In `TerazScreen`, render order is
  `gradient-background` (back) → `atmosphere` → hero content (front), asserted
  via testIDs so a layering regression fails a test, not just the eye.
- **AC-7** *(manual)* — The particle field is visible over the deep→mid
  gradient with the hero legible above it. *(Simulator screenshot.)*
- **AC-8** *(manual)* — Field density scales with the index: index 12
  (`density ≈ 0.089` → ~23 faint particles) vs index 175 (`density = 1`, the
  full 260-particle field) shows a visibly denser field. *(Two screenshots.)*
- **AC-9** *(manual)* — The index number sits on a 260px radial glow disc in
  `scene.key`, a wider/softer glow than M2's single shadow. *(Screenshot vs the
  M2 AC-14 shot.)*
- **AC-10** *(NFR, manual)* — The atmosphere sustains **≥55fps** on the iPhone
  16 Pro simulator at index 175 (density saturated to 1 → the full 260-particle
  field, the worst case). *(RN perf monitor; recorded in `docs/nfr.md`.)*

## Resolved ambiguities

- **Density source:** M1's `scene.density` is the single source; `atmosphere`
  consumes it. `atmosphere` takes `density: number` (0.03..1, guaranteed by the
  scene seam) — no finite guard, no duplicated `0.03`/`135`.
- **Reduced-motion testability:** the animated drift is a pure
  `particleOffset(seed, t, frozen)`; `frozen` ignores `t`. This makes "the field
  freezes" a black-box property test, not a white-box "clock not started" claim
  (which would risk a rules-of-hooks violation). The component always calls the
  clock hook and passes `frozen` down.
- **Double text-shadow:** RN `Text` supports one shadow; M3 renders the design's
  radial glow disc (Skia) behind the number + keeps the number's key shadow,
  approximating radial-disc + double-shadow. Full Skia text is not needed.
- **Composition:** `Atmosphere` mounts `absoluteFill` inside `GradientBackground`
  above the gradient and below the scrolling content/Hero; `NumberGlow` wraps the
  index number inside `Hero`. AC-6 pins this via testIDs.
- **Rendering tech:** `@shopify/react-native-skia` (canvas) + Reanimated (clock),
  chosen for the headroom to draw ~235 blurred particles at 60fps that a
  View-per-particle field cannot hold. **Task 1 is a build spike** — if Skia does
  not integrate on RN 0.86 / New Arch / Xcode 26.2, stop and re-decide before any
  atmosphere code.
- **Particle layout:** positions/seeds are pseudo-random and unasserted; only
  count/opacity/blur + frozen-invariance are the contract.

## Risks & dependency surface (the plan must not miss these)

- **Reanimated major is resolution-dependent.** RN 0.86 (New Arch on) likely
  resolves **Reanimated 4.x**, which is New-Arch-only and splits worklets into a
  separate **`react-native-worklets`** package with the babel plugin at
  `react-native-worklets/plugin`. The spike must pin the resolved major and, if
  4.x, add `react-native-worklets` as a **third dependency (ADR-008)**.
- **Babel + Jest config:** Reanimated/worklets babel plugin must be added to
  `babel.config.js`; Reanimated needs its jest setup, and Skia ships a Jest mock
  (`@shopify/react-native-skia/jestSetup` / `jest.mock`) — both added to
  `jest.setup.js` so the RNTL tests (AC-5, AC-6) run.
- New deps → **ADR-006 (`react-native-skia`)**, **ADR-007 (`react-native-
  reanimated`)**, **ADR-008 (`react-native-worklets`, conditional on RA4)**.

## Verification

- **AC-1…AC-5** — unit tests `src/core/atmosphere/__tests__/atmosphere.test.ts`
  (100% `src/core` coverage gate applies); literal-pinned per AC-4; AC-5 also has
  an RNTL smoke test in `src/shared/ui/__tests__/Atmosphere.test.tsx`.
- **AC-6** — RNTL test on `TerazScreen` asserting testID render order.
- **AC-7, AC-8, AC-9** — recorded manual evidence: simulator screenshots
  (`xcrun simctl io booted screenshot`), attached to the PR.
- **AC-10** — manual RN perf-monitor reading at index 175, recorded in the PR
  and `docs/nfr.md`.
