# Task 3 — Settings tokens + Toggle primitive

Work in worktree `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest` on branch `feature/m-ustawienia`.

## Global Constraints
- TypeScript strict; `any` forbidden without inline justification.
- Files ≤ 200 lines, functions ≤ 40. Test names cite AC IDs.
- **No hex/rgba literals in `src/shared/ui/**`** (no-hex lint) — every color comes from `src/shared/tokens`. This is why the tokens are added FIRST in this task.
- No new dependency.

## Produces (later tasks depend on these — exact names)
- New tokens: `colors.text.faint`, `colors.text.footer`, `colors.text.muted`, and a new `colors.control` block with `trackOff`, `segBg`, `segActive`, `divider`.
- `Toggle({ value, onValueChange, testID? })` from `src/shared/ui/Toggle.tsx`.

## Files
- Modify: `src/shared/tokens/index.ts`
- Create: `src/shared/ui/Toggle.tsx`
- Test: `src/shared/ui/__tests__/Toggle.test.tsx`

## Context — the current tokens file
`src/shared/tokens/index.ts` currently has `colors` with `base, accent, success (#34c759), danger, shadow, text.{primary,high,mid,label,dim,inactive}, tabBar.{bg,border}, card`. Add the new values without disturbing the existing ones. `colors.success` and `colors.shadow` and `colors.text.primary` already exist — reuse them (do not re-add).

## Step 1: Add tokens (`src/shared/tokens/index.ts`)
Inside `colors.text`, add these three keys (keep existing keys):
```ts
    faint: 'rgba(255,255,255,0.4)',
    footer: 'rgba(255,255,255,0.35)',
    muted: 'rgba(255,255,255,0.55)',
```
Add a new `control` block as a sibling of `card` (inside the `colors` object):
```ts
  control: {
    trackOff: 'rgba(255,255,255,0.18)',
    segBg: 'rgba(255,255,255,0.08)',
    segActive: 'rgba(255,255,255,0.16)',
    divider: 'rgba(255,255,255,0.06)',
  },
```
(The `colors` object ends with `} as const;` — keep that.)

## Step 2: Write the failing test (`src/shared/ui/__tests__/Toggle.test.tsx`)
```tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Toggle } from '../Toggle';
import { colors } from '../../tokens';

const trackStyle = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style);

test('AC-13: on → success track, knob at end', async () => {
  const onValueChange = jest.fn();
  await render(<Toggle value onValueChange={onValueChange} testID="toggle-alert" />);
  const s = trackStyle('toggle-alert');
  expect(s.backgroundColor).toBe(colors.success);
  expect(s.justifyContent).toBe('flex-end');
  expect(s.width).toBe(50);
  expect(s.height).toBe(30);
});

test('AC-13: off → trackOff, knob at start', async () => {
  await render(<Toggle value={false} onValueChange={jest.fn()} testID="toggle-alert" />);
  const s = trackStyle('toggle-alert');
  expect(s.backgroundColor).toBe(colors.control.trackOff);
  expect(s.justifyContent).toBe('flex-start');
});

test('AC-13: press calls onValueChange with the inverse', async () => {
  const onValueChange = jest.fn();
  await render(<Toggle value onValueChange={onValueChange} testID="toggle-alert" />);
  fireEvent.press(screen.getByTestId('toggle-alert'));
  expect(onValueChange).toHaveBeenCalledWith(false);
});
```
Note: `@testing-library/react-native` v14 `render` is ASYNC — `await render(...)`. Do not use fake timers.

## Step 3: Run to verify fail
`npx jest Toggle` → FAIL (module not found).

## Step 4: Implement (`src/shared/ui/Toggle.tsx`)
```tsx
import { Pressable, View, StyleSheet } from 'react-native';
import { colors } from '../tokens';

export function Toggle({
  value,
  onValueChange,
  testID,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      style={[
        styles.track,
        {
          backgroundColor: value ? colors.success : colors.control.trackOff,
          justifyContent: value ? 'flex-end' : 'flex-start',
        },
      ]}
    >
      <View style={styles.knob} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 50, height: 30, borderRadius: 15, padding: 2, flexDirection: 'row' },
  knob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.text.primary,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
});
```

## Step 5: Verify pass + gate
`npx jest Toggle` → PASS. `npm run lint` → 0 errors (watch no-hex: all colors must be tokens). `npm run typecheck` → 0 errors.

## Step 6: Commit
`git add src/shared/tokens src/shared/ui/Toggle.tsx src/shared/ui/__tests__/Toggle.test.tsx && git commit -m "feat(shared): settings tokens + Toggle primitive (AC-13)"`

## Report
Write your full report to `.superpowers/sdd/2026-08-12-m-ustawienia/task-3-report.md` BEFORE your final message. Final message: status, commit SHA, one-line test summary, concerns.

Note: if any git/npm command fails with "Operation not permitted" (sandbox), retry with the sandbox disabled.
