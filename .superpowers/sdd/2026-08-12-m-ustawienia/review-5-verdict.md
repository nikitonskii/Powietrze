# Review — Task 5 (ThresholdSlider)

**SPEC: ✅**
**QUALITY: CHANGES**

## Global constraints
- No hex/rgba in `src/shared/ui/**`: pass — all colors sourced from `scene(value).key`, `colors.control.trackOff`, `colors.text.primary`; no literal in `ThresholdSlider.tsx`.
- No unjustified `any`: pass — none used.
- Files ≤200 / functions ≤40: pass — file is 68 lines; `emit`/gesture bodies are one-liners.
- Test names cite AC IDs: pass — both tests prefixed `AC-15:`.
- No new dependency, no new token: pass — `colors.control.trackOff` (`rgba(255,255,255,0.18)`) reused exactly as the resolved decision specified; verified against `src/shared/tokens/index.ts:24`.

## AC-15 checks
- Value text tint: `<Text style={[styles.value, { color: key }]}>` where `key = scene(value).key` — correct, and asserted by the `colorOf` test.
- Gradient: `colors={[key, colors.control.trackOff]}`, `start={{x:0,y:0}}`, `end={{x:1,y:0}}` — matches the spec exactly (left-to-right horizontal fade), and is asserted verbatim in the test.
- Emit path: `emit = (x) => onChange(thresholdFromRatio(width ? x / width : 0))`. Divide-by-zero guard present for pre-layout (`width === 0`) drags. Verified `thresholdFromRatio` → `clampThreshold` (`src/core/settings/index.ts:29-40`) rounds via `Math.round` and clamps to `[25,200]`, so `onChange` always receives a clamped integer — confirmed correct.
- Gesture → JS: `.onBegin(e => runOnJS(emit)(e.x))` / `.onUpdate(e => runOnJS(emit)(e.x))` — correct pattern; gesture callbacks run as UI-thread worklets, `runOnJS` correctly bridges to call the plain-JS `emit`/`onChange` closures.
- Tests: correctly scoped. Neither test fires a pan gesture; both only render and assert static props (text color, gradient props). No false-confidence gesture-faking present. Drag behavior is correctly deferred to manual AC-24, consistent with the brief's stated jest limitation.

## Findings

**Important — knob position is only clamped on the low end, not the high end, so it renders off-track near the max threshold.**
- Location: `src/shared/ui/ThresholdSlider.tsx:41` (`const knobLeft = ratioFromThreshold(value) * width;`) and the render line `left: Math.max(0, knobLeft - 11)` (diff line ~60, `styles.knob` usage).
- Concretely: `ratioFromThreshold(200) === 1` (`THRESHOLD_MAX`), so `knobLeft = width`, giving `left = width - 11`. The knob is 22px wide, so its right edge sits at `width + 11` — 11px past the right edge of the 22px-tall hitbox/track. Only the lower bound is clamped (`Math.max(0, …)` handles `value` near `THRESHOLD_MIN`, where `knobLeft - 11` would go negative); there is no corresponding `Math.min(width - 22, …)` for the upper bound. This directly contradicts the "clamped so it doesn't render off-track" requirement — it's reachable at any real, user-settable high threshold (e.g. 190–200), not just a boundary edge case.
- Fix: clamp both ends, e.g.
  ```ts
  const knobLeft = Math.min(width - 22, Math.max(0, ratioFromThreshold(value) * width - 11));
  ...
  <View style={[styles.knob, { left: knobLeft }]} />
  ```
  (Guard `width - 22` against negative width before layout, e.g. `Math.max(0, width - 22)`, though `width` is 0 pre-layout and the `Math.max(0, …)` outer clamp already covers that case producing `left: 0`.)
- Not caught by the jest suite (RNTL/jsdom doesn't produce real layout widths, and the tests don't assert knob position), so it will only surface in the manual AC-24 pass — but it is a genuine rendering defect on the fill path, not gated to drag interaction, so worth fixing now rather than leaving to manual QA to catch by chance.

No other issues found — no stale-width closure problem (the `Gesture.Pan()` object and its `emit` closure are rebuilt fresh each render with the current `width` state), no off-by-one in the gradient direction/tokens, no missing `testID` (the `-fill` testID matches what the test expects), and no dead code or duplicated logic.

verdict written
