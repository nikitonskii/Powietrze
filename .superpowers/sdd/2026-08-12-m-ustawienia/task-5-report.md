# Task 5 — ThresholdSlider primitive — Report

## Status
DONE

## Commit
`fd2f0638d52cc3f6bc2ba66dd12c91d78831c900` — "feat(shared): ThresholdSlider (pure math + gradient; drag=AC-24) (AC-15)"

## What was done
Followed the brief's TDD steps exactly, no deviation from the prescribed code:

1. Wrote `src/shared/ui/__tests__/ThresholdSlider.test.tsx` verbatim from the brief (wraps in
   `GestureHandlerRootView`, asserts value-text tint via `colorOf`, asserts the gradient fill's
   `colors`/`start`/`end` props on the mocked `LinearGradient`).
2. Ran `npx jest ThresholdSlider` → failed as expected (`Cannot find module '../ThresholdSlider'`).
3. Implemented `src/shared/ui/ThresholdSlider.tsx` verbatim from the brief:
   - `onLayout` on the `hitbox` View measures track width into state.
   - `Gesture.Pan()` `.onBegin`/`.onUpdate` call `emit(e.x)` through `runOnJS`, converting
     `x/width` → `thresholdFromRatio` → `onChange`.
   - Knob absolutely positioned at `ratioFromThreshold(value) * width - 11` (clamped ≥ 0), so
     the 22px knob overlays the 6px `track`, which has `overflow:'hidden'` for the gradient fill.
   - Value text and gradient start color both use `scene(value).key`; gradient end color reuses
     `colors.control.trackOff` per the resolved decision — no new token added.
   - No hex/rgba literals in the file; all colors come from `src/shared/tokens` or `scene()`.
4. Ran `npx jest ThresholdSlider` → 2/2 pass.
5. Ran `npm run lint` → 0 errors, 4 pre-existing warnings (App.tsx, mappers.ts, Toggle.tsx) —
   none introduced by this change.
6. Ran `npm run typecheck` → 0 errors. `LinearGradient`'s shipped types accepted `colors` /
   `start` / `end` / `style` / `testID` directly; no `any` and no extra type import was needed.
7. Committed `src/shared/ui/ThresholdSlider.tsx` and its test.

## Results
- `npx jest ThresholdSlider`: **PASS** — 2/2
  - `AC-15: value text is tinted scene(value).key`
  - `AC-15: track gradient runs scene(value).key → fade token, horizontally`
- `npm run lint`: **0 errors** (4 pre-existing warnings elsewhere, unrelated to this file)
- `npm run typecheck`: **0 errors**
- File size: `ThresholdSlider.tsx` is 68 lines (limit 200); the gesture/emit logic is a few
  lines (limit 40 per function).

## Deviations
None. The brief's exact test and implementation code worked as written — no knob/overflow
layout adjustment and no LinearGradient typing workaround were needed.

## Concerns / notes for follow-on tasks
- Per the brief's explicit testing constraint, the physical pan-gesture drag is **not** covered
  by jest (RNTL cannot drive real pan gestures). That remains a manual verification item under
  AC-24, to be exercised on-device/simulator when Task 8 wires this into the Ustawienia screen.
- The gesture handlers (`onBegin`/`onUpdate`) call `emit` via `runOnJS` exactly as prescribed,
  relying on the reanimated jest mock already configured in `jest.setup.js`; this is exercised
  only by mount, not by an actual drag, in this task's tests.

## Fix round 1

**Commit:** `ecef255a99ca921ec2ec4d1c9a27490e0298c993` — "fix(shared): clamp ThresholdSlider knob
to both track edges"

**Bug (reviewer, Important):** `knobLeft` was only low-clamped (`Math.max(0, ...)`). At high
thresholds — `ratioFromThreshold(value) === 1` (reachable at any real value 190–200, not just the
200 boundary) — `knobLeft = width - 11`, putting the 22px knob's right edge at `width + 11`,
11px past the right edge of the track. High end was never clamped.

**Fix applied** (as specified by the coordinator):
```ts
const knobLeft = Math.min(
  Math.max(0, width - 22),
  Math.max(0, ratioFromThreshold(value) * width - 11),
);
```
rendered via `style={[styles.knob, { left: knobLeft }]}`. This clamps both ends: the outer
`Math.min(..., width - 22)` caps the knob's left edge so its right edge never exceeds `width`;
the inner `Math.max(0, ...)` keeps the low end at 0 as before. `Math.max(0, width - 22)` also
guards the pre-layout `width === 0` case (produces `left: 0` instead of a negative value).

**Gate results after fix:**
- `npx jest ThresholdSlider`: **PASS** — 2/2 (unchanged; the reviewed bug wasn't covered by the
  jest suite, since jest can't drive gestures and both existing tests use mid-range values
  100/150, not the high-end boundary)
- `npm run lint`: **0 errors** (same 4 pre-existing warnings elsewhere, none new)
- `npm run typecheck`: **0 errors**

No new test was added for the high-end clamp itself, since verifying knob *position* (as opposed
to the gradient/value-text assertions already in place) would require reading layout styles that
depend on `onLayout`, which jest's test renderer does not fire with a real measured width — this
mirrors the existing test suite's scope (value tint + gradient endpoints only) and the brief's
constraint that gesture/position behavior is verified manually under AC-24.
