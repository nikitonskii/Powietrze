# Spec 003: Atmosphere (signature-first)

**Status:** draft
**Milestone:** M3
**Sources:** `design/README.md` §"Atmosphere layer", §"Screens / Views" →
"1. Teraz" (radial glow + number shadow), §"Interactions & Behavior"
(reduced-motion); `src/core/scene` (M1 — `pm25`, `key`); `docs/nfr.md`
(≥55fps). Design color/particle math is the source of truth in
`design/Powietrze.dc.html` (`scene`, `_draw`).

## Scope

The signature atmosphere behind the **Teraz** screen: a **Skia particle
field** whose density is driven by PM2.5 (a few faint specks when the air is
clean, a thick oppressive field when it is bad), particles drifting slowly
upward in the scene's key color; plus the number **glow polish** — the 260px
radial glow disc behind the index and a stronger key glow than M2's single
shadow. The field freezes but stays present under the OS **Reduce Motion**
setting. Everything derives from one `index` through `scene()` (M1), so the
atmosphere binds to the same mock seam M2 uses.

## Non-goals

- **Skyline** (city silhouette that blurs as air worsens) → a following short
  loop (M3.5) / M4-adjacent; keeps this milestone reviewable.
- **Tab-bar backdrop blur** and **SF-Symbol tab icons** → later (ADR-003).
- **Live data** — atmosphere runs off the mock `index` (Kraków, 118); the data
  layer is its own milestone (~M7). This spec must not assume live data.
- **Below-the-fold** cards (chart/tiles/forecast) → M4.
- Configurable particle count / user settings for the field → out of scope.

## Public API

New pure module `src/core/atmosphere` (zero React imports):

```ts
export interface AtmosphereField {
  density: number;         // clamp(pm25/135, 0.03, 1)
  count: number;           // round(density * POOL_SIZE)
  particleOpacity: number; // OPACITY_BASE + density * OPACITY_SCALE
  particleBlur: number;    // BLUR_BASE + density * BLUR_SCALE
}
export function atmosphere(pm25: number): AtmosphereField;

// Design literals, exported for consumers and the literal-fixture test:
export const POOL_SIZE = 260;
export const DENSITY_FLOOR = 0.03;
export const DENSITY_DIVISOR = 135;
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
```

New components:
- `src/shared/ui/Atmosphere.tsx` — `Atmosphere(props: { scene: Scene; reducedMotion?: boolean })`. Renders a full-bleed Skia canvas of `atmosphere(scene.pm25).count` particles in `scene.key`, drifting upward with the Reanimated clock. `reducedMotion` (default from the OS setting) freezes the clock but keeps the particles. `testID="atmosphere"`.
- `src/shared/ui/NumberGlow.tsx` — `NumberGlow(props: { color: string; size?: number; children })`. Renders the 260px radial glow disc (`color` at ~0.27 alpha → transparent ~68%) behind its children. `testID="number-glow"`.

`atmosphere()` inputs are the testable contract; exact particle *positions*
are seeded pseudo-random and are NOT part of the contract (visual only).

## Behavior — Acceptance Criteria

Pure core (`src/core/atmosphere`) — unit-tested, literal-pinned:

- **AC-1** — `atmosphere(pm25).density === clamp(pm25/135, 0.03, 1)`. Pins:
  `density(3) === 0.03` (below floor), `density(122) ≈ 0.90370`,
  `density(135) === 1`, `density(300) === 1` (capped).
- **AC-2** — `count === round(density * 260)`. Pins: `count(3) === 8`,
  `count(122) === 235`, `count(135) === 260`, `count(300) === 260`.
- **AC-3** — `particleOpacity === 0.05 + density*0.32`. Pins:
  `opacity(3) ≈ 0.0596`, `opacity(122) ≈ 0.33919`, `opacity(135) === 0.37`.
- **AC-4** — `particleBlur === 5 + density*9`. Pins: `blur(3) ≈ 5.27`,
  `blur(135) === 14`.
- **AC-5** *(literal fixture, M1 retro rule)* — the exported constants equal
  the design literals exactly: `POOL_SIZE 260`, `DENSITY_FLOOR 0.03`,
  `DENSITY_DIVISOR 135`, `OPACITY_BASE 0.05`, `OPACITY_SCALE 0.32`,
  `BLUR_BASE 5`, `BLUR_SCALE 9`, `RADIUS_MIN 0.8`, `RADIUS_MAX 3.4`,
  `DRIFT_VY_MIN 0.08`, `DRIFT_VY_MAX 0.36`, `WANDER_MIN 5`, `WANDER_MAX 17`.
- **AC-6** — negative/degenerate input: `atmosphere(0)` returns the floor
  field (`density 0.03`, `count 8`), never throws; `atmosphere(NaN)` throws a
  `RangeError` (consistent with M1's finite-input guard).

Component & visual (screenshot / RNTL):

- **AC-7** — On Teraz, the `Atmosphere` field renders **behind** the Hero and
  **over** the deep→mid gradient (particles visible over the gradient, hero
  text above them). *(Manual: simulator screenshot.)*
- **AC-8** — The field's visible density scales with the index: a screenshot
  at a clean index (12 — a few faint specks) vs a bad one (175 — a dense
  field) shows a visibly denser field at 175. *(Manual: two screenshots.)*
- **AC-9** — The index number sits on a ~260px radial glow disc colored by
  `scene.key`, giving a wider, softer glow than M2's single text-shadow.
  *(Manual: simulator screenshot vs the M2 AC-14 shot.)*
- **AC-10** *(reduced-motion, RNTL)* — With reduced motion enabled, the field
  renders the density-correct particle count and enters its **frozen** branch
  (animation clock not started). A test renders `<Atmosphere scene={scene(118)}
  reducedMotion />` and asserts the field is present with `count === 235` and
  the animated-clock path is not taken. *(Behavior test.)*
- **AC-11** *(NFR, manual)* — The atmosphere sustains **≥55fps** on the iPhone
  16 Pro simulator at index 175 (near-max density). *(Manual: RN perf monitor;
  recorded per `docs/nfr.md`.)*

## Resolved ambiguities

- **Double text-shadow vs. one:** RN `Text` supports a single `textShadow`.
  M3 renders the design's **radial glow disc** (Skia radial gradient) behind
  the number and keeps the number's key text-shadow; together they approximate
  the design's radial-disc + double-shadow. Full Skia text is not needed.
- **Particle layout:** positions/seeds are pseudo-random and unasserted; only
  `density/count/opacity/blur` are the pinned contract. This keeps the field
  visually organic without a brittle position test.
- **Rendering tech:** `@shopify/react-native-skia` for the canvas +
  `react-native-reanimated` for the clock (ADR-006, ADR-007) — chosen for the
  perf headroom to draw ~235 blurred particles at 60fps, which a
  View-per-particle approach cannot hold. A **build spike is the first task**:
  if Skia does not integrate on RN 0.86 / New Arch / Xcode 26.2, stop and
  re-decide before writing atmosphere code.
- **Reduced-motion source:** the OS "Reduce Motion" setting
  (`AccessibilityInfo` / a `useReducedMotion` hook), injectable as the
  `reducedMotion` prop for tests.
- **Input unit:** `atmosphere()` takes **PM2.5** (`scene(index).pm25`), not the
  index — no duplication of M1's pm25 math.

## Verification

- **AC-1…AC-6** — unit tests `src/core/atmosphere/__tests__/atmosphere.test.ts`
  (100% coverage gate applies to `src/core`); literal-pinned per AC-5.
- **AC-7, AC-8, AC-9** — recorded manual evidence: simulator screenshots
  (build → `xcrun simctl io booted screenshot`), attached to the PR.
- **AC-10** — RNTL test `src/shared/ui/__tests__/Atmosphere.test.tsx` with an
  injected `reducedMotion` prop; Skia mocked via `@shopify/react-native-skia`'s
  Jest mock.
- **AC-11** — manual perf-monitor reading at index 175, recorded in the PR and
  `docs/nfr.md`.
