# Harness journal 03 — M3: Atmosphere (signature-first)

**Milestone:** M3 · **Spec:** `docs/specs/003-atmosphere.md` · **Branch:** `feature/m3-atmosphere`

## What the harness gained
- **Critic agent** (`.claude/agents/critic.md`): fresh-context adversarial
  critique of a spec/plan at feature-loop **step 2** — recomputes every pinned
  literal, checks AC testability, scope, contract soundness (does `src/core`
  already own this?), dependency risk, and constitution compliance; reports
  BLOCKER/SHOULD-FIX/NIT + a verdict. It earned its keep on its first run
  (see Mid-build corrections).
- **Skia + Reanimated Jest setup**: worklets resolver
  (`react-native-worklets/jest/resolver.js`) + Skia jest mock + reanimated mock
  hook fallbacks, so Skia/animation components are testable under Jest.

## What the app gained
- `src/core/atmosphere`: pure `atmosphere(density)` → `{count, particleOpacity,
  particleBlur}` and `particleOffset(seed,t,frozen)` (the drift reference, `t`
  in frames); design literals as exported constants.
- `src/shared/ui/Atmosphere`: full-bleed Skia particle field, count/opacity from
  `scene.density`, per-particle drift on a Reanimated clock, reduced-motion
  freeze.
- `src/shared/ui/NumberGlow`: 260px Skia radial glow disc behind the index.
- `TerazScreen` composes gradient → atmosphere → hero.

## Deviations from the plan (all reviewed)
- **Density consumed from `scene`, not re-derived** — the critic caught that M1's
  `scene.density` already exists; `atmosphere` takes `density`, not `pm25`.
- **Drift mirrored inline in the UI worklet** — RA4 can't import a
  `'worklet'`-tagged function under Jest, so `particleOffset`'s formula lives
  both in core (pure, tested, AC-5) and inline in `Atmosphere`'s
  `useDerivedValue`; literals stay single-sourced as the imported constants.
- **Blur is a 1px soft edge, not the density-scaled `particleBlur`** — the
  design's `shadowBlur` is a per-particle halo; applying it as one field-wide
  Skia blur erased the tiny particles. `particleBlur` stays part of the tested
  contract; a per-particle halo is a later refinement.

## Mid-build corrections
- **Critic caught a duplicated core seam (pre-build).** The first spec had
  `atmosphere(pm25)` re-deriving `density` with the same `0.03`/`135` literals
  M1 already owns → revised to consume `scene.density`. Also flagged RA4's
  worklets split and an untestable reduced-motion AC. Verdict NEEDS-REVISION →
  fixed before planning.
- **RA4 worklets + Jest** (`loadUnpackersWithCode` on an undefined native
  module): fixed with the worklets jest resolver + mock hook fallbacks.
- **Drift ran ~16× too fast** (units bug: clock is ms, the design's `vy` is
  px/frame). Caught by the human watching the live sim; fixed by an ms→frame
  conversion (`MS_PER_FRAME`). The pure `particleOffset` `t` is now frames.

## Toolchain drift worth remembering
Reanimated 4 splits worklets into `react-native-worklets` (needs to be a
**direct** dep for the `RNWorklets` pod to autolink — `pod install` fails
otherwise) with the babel plugin at `react-native-worklets/plugin`; and its
Jest story needs the worklets **resolver** (steers to the non-native module),
not just the reanimated mock. Skia (`@shopify/react-native-skia`) needs its
`jestSetup.js`. All proven together via a throwaway build spike (Task 1) before
any atmosphere code — the spike is the pattern for adopting a heavy native dep.

## Approximate spend
Subagent-driven-ish but largely single-controller this milestone (one critic
dispatch + inline implementation with live simulator verification). The build
loop — build once, then reload JS + `xcrun simctl io screenshot` — made visual
iteration cheap (drift-speed and blur were tuned in seconds, not rebuilds).

## Retro — corrections became rules
_(placeholder — filled at merge, step 10)_
