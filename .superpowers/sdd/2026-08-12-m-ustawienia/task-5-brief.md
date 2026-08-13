# Task 5 — ThresholdSlider primitive

Work in worktree `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest` on branch `feature/m-ustawienia`.

## Global Constraints
- TypeScript strict; `any` forbidden without inline justification.
- Files ≤ 200 lines, functions ≤ 40. Test names cite AC IDs.
- **No hex/rgba in `src/shared/ui/**`** — colors only from `src/shared/tokens`.
- No new dependency. Uses already-shipped `react-native-gesture-handler`, `react-native-reanimated`, `react-native-linear-gradient`.

## Consumes (already committed)
- `thresholdFromRatio`, `ratioFromThreshold` from `src/core/settings` (Task 1).
- `scene` from `src/core/scene` — `scene(value).key` is the ramp color for a value.
- `LinearGradient` default export from `react-native-linear-gradient`.

## Produces
`ThresholdSlider({ value, onChange, testID? })` from `src/shared/ui/ThresholdSlider.tsx`. Consumed by Task 8.

## CRITICAL context — testing constraints (read carefully)
- **jest CANNOT drive gestures** (established in spec 008 / journal 08: RNTL can't simulate real pan gestures). So the physical drag is verified MANUALLY (AC-24, a later task), NOT here. Your jest tests cover only: (a) the value text is tinted `scene(value).key`, (b) the gradient endpoints/direction, (c) that the knob renders. Do NOT attempt to fireEvent a pan.
- `LinearGradient` is mocked in `jest.setup.js` as a plain `View`, so its props (`colors`, `start`, `end`, `testID`) are readable in tests via `.props`.
- `GestureDetector` requires a `GestureHandlerRootView` ancestor — the test MUST wrap the component in one (import from `react-native-gesture-handler`), same as the MiejscaScreen favorites test.
- `runOnJS` comes from the reanimated mock (already configured). The gesture callbacks must call `onChange` via `runOnJS` because on-device they run on the UI thread.

## Gradient endpoint decision (RESOLVED — do this)
The mock's track gradient is `scene(value).key` → `rgba(255,255,255,.15)`. To avoid adding a near-duplicate grey token (we already have several), **reuse `colors.control.trackOff`** (rgba(255,255,255,0.18)) as the fade endpoint. Assert that exact token in the test. Do NOT add a new token.

## Step 1: Write the failing test (`src/shared/ui/__tests__/ThresholdSlider.test.tsx`)
```tsx
import { render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThresholdSlider } from '../ThresholdSlider';
import { scene } from '../../../core/scene';
import { colorOf } from '../../test/colorOf';
import { colors } from '../../tokens';

const renderSlider = (value: number) =>
  render(
    <GestureHandlerRootView>
      <ThresholdSlider value={value} onChange={jest.fn()} testID="slider-threshold" />
    </GestureHandlerRootView>,
  );

test('AC-15: value text is tinted scene(value).key', async () => {
  await renderSlider(100);
  expect(colorOf(screen.getByText('100'))).toBe(scene(100).key);
});

test('AC-15: track gradient runs scene(value).key → fade token, horizontally', async () => {
  await renderSlider(150);
  const fill = screen.getByTestId('slider-threshold-fill');
  expect(fill.props.colors).toEqual([scene(150).key, colors.control.trackOff]);
  expect(fill.props.start).toEqual({ x: 0, y: 0 });
  expect(fill.props.end).toEqual({ x: 1, y: 0 });
});
```

## Step 2: Run to verify fail
`npx jest ThresholdSlider` → FAIL.

## Step 3: Implement (`src/shared/ui/ThresholdSlider.tsx`)
Measure the track width via `onLayout`; a `Gesture.Pan` maps `x/width → thresholdFromRatio → onChange` via `runOnJS`; the knob is positioned at `ratioFromThreshold(value) * width`. Value + gradient use `scene(value).key`. Keep the gesture callback ≤ 40 lines and the file ≤ 200.
```tsx
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { scene } from '../../core/scene';
import { thresholdFromRatio, ratioFromThreshold } from '../../core/settings';
import { colors } from '../tokens';

export function ThresholdSlider({
  value,
  onChange,
  testID,
}: {
  value: number;
  onChange: (next: number) => void;
  testID?: string;
}) {
  const [width, setWidth] = useState(0);
  const key = scene(value).key;
  const emit = (x: number) => onChange(thresholdFromRatio(width ? x / width : 0));
  const pan = Gesture.Pan()
    .onBegin(e => runOnJS(emit)(e.x))
    .onUpdate(e => runOnJS(emit)(e.x));
  const knobLeft = ratioFromThreshold(value) * width;

  return (
    <View testID={testID}>
      <Text style={[styles.value, { color: key }]}>{value}</Text>
      <GestureDetector gesture={pan}>
        <View
          style={styles.hitbox}
          onLayout={e => setWidth(e.nativeEvent.layout.width)}
        >
          <View style={styles.track}>
            <LinearGradient
              testID={testID ? `${testID}-fill` : undefined}
              colors={[key, colors.control.trackOff]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
          <View style={[styles.knob, { left: Math.max(0, knobLeft - 11) }]} />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  value: { fontSize: 15, fontWeight: '600', alignSelf: 'flex-end', marginBottom: 12 },
  hitbox: { height: 22, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  knob: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.text.primary,
  },
});
```
Notes: the `hitbox` gives a 22px-tall drag target and is the layout-measured element; the `track` is the thin 6px bar; the `knob` overlays absolutely so `overflow:'hidden'` on the track does not clip it. If typecheck complains that `LinearGradient` props `colors/start/end` are not assignable, the real types accept them — do not add `any`; import types from the package if needed.

## Step 4: Verify pass + gate
`npx jest ThresholdSlider` → PASS. `npm run lint` → 0. `npm run typecheck` → 0.

## Step 5: Commit
`git add src/shared/ui/ThresholdSlider.tsx src/shared/ui/__tests__/ThresholdSlider.test.tsx && git commit -m "feat(shared): ThresholdSlider (pure math + gradient; drag=AC-24) (AC-15)"`

## Report
Write your full report to `.superpowers/sdd/2026-08-12-m-ustawienia/task-5-report.md` BEFORE your final message: what you did, commit SHA, test/lint/tsc results, and any deviations (esp. if the knob/overflow layout or LinearGradient typing needed adjusting). Final message: status (DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT), commit SHA, one-line test summary, concerns.

Note: if any git/npm command fails with "Operation not permitted" (sandbox), retry with the sandbox disabled.
