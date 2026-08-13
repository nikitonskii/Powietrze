# Task 4 — SegmentedControl primitive

Work in worktree `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest` on branch `feature/m-ustawienia`.

## Global Constraints
- TypeScript strict; `any` forbidden without inline justification.
- Files ≤ 200 lines, functions ≤ 40. Test names cite AC IDs.
- **No hex/rgba literals in `src/shared/ui/**`** — colors only from `src/shared/tokens` (already has `control.segBg`, `control.segActive`, `text.primary`, `text.muted` from Task 3).
- No new dependency.

## Produces
`SegmentedControl<T extends string>({ options, value, onChange, testID? })` from `src/shared/ui/SegmentedControl.tsx`. Each option's Pressable testID = `<testID>-<option>`. Consumed by Task 8.

## Files
- Create: `src/shared/ui/SegmentedControl.tsx`
- Test: `src/shared/ui/__tests__/SegmentedControl.test.tsx`

## Context
`colorOf` test helper lives at `src/shared/test/colorOf.ts` — `colorOf(node)` returns the flattened `color` style of a text node. `@testing-library/react-native` v14 `render` is ASYNC.

## Step 1: Write the failing test (`src/shared/ui/__tests__/SegmentedControl.test.tsx`)
```tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SegmentedControl } from '../SegmentedControl';
import { colors } from '../../tokens';
import { colorOf } from '../../test/colorOf';

const opts = ['Przybliżona', 'Dokładna'] as const;

test('AC-14: active option → primary text on segActive; others muted/transparent', async () => {
  await render(
    <SegmentedControl options={opts} value="Przybliżona" onChange={jest.fn()} testID="seg-precision" />,
  );
  expect(colorOf(screen.getByText('Przybliżona'))).toBe(colors.text.primary);
  expect(colorOf(screen.getByText('Dokładna'))).toBe(colors.text.muted);
  const active = StyleSheet.flatten(screen.getByTestId('seg-precision-Przybliżona').props.style);
  expect(active.backgroundColor).toBe(colors.control.segActive);
});

test('AC-14: pressing an option calls onChange with its value', async () => {
  const onChange = jest.fn();
  await render(
    <SegmentedControl options={opts} value="Przybliżona" onChange={onChange} testID="seg-precision" />,
  );
  fireEvent.press(screen.getByTestId('seg-precision-Dokładna'));
  expect(onChange).toHaveBeenCalledWith('Dokładna');
});
```
Copy the Polish glyphs (`Przybliżona`, `Dokładna`) exactly from this brief.

## Step 2: Run to verify fail
`npx jest SegmentedControl` → FAIL.

## Step 3: Implement (`src/shared/ui/SegmentedControl.tsx`)
Geometry from the design mock: container radius 11 padding 3 bg `control.segBg`; option flex1 radius 9 paddingVertical 7 paddingHorizontal 4, font 13/500; active bg `control.segActive`.
```tsx
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { colors } from '../tokens';

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  testID,
}: {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  testID?: string;
}) {
  return (
    <View testID={testID} style={styles.container}>
      {options.map(opt => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            testID={testID ? `${testID}-${opt}` : undefined}
            onPress={() => onChange(opt)}
            style={[styles.option, active && styles.optionActive]}
          >
            <Text style={[styles.label, { color: active ? colors.text.primary : colors.text.muted }]}>
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', backgroundColor: colors.control.segBg, borderRadius: 11, padding: 3 },
  option: { flex: 1, alignItems: 'center', borderRadius: 9, paddingVertical: 7, paddingHorizontal: 4 },
  optionActive: { backgroundColor: colors.control.segActive },
  label: { fontSize: 13, fontWeight: '500' },
});
```

## Step 4: Verify pass + gate
`npx jest SegmentedControl` → PASS. `npm run lint` → 0. `npm run typecheck` → 0.

## Step 5: Commit
`git add src/shared/ui/SegmentedControl.tsx src/shared/ui/__tests__/SegmentedControl.test.tsx && git commit -m "feat(shared): SegmentedControl primitive (AC-14)"`

## Report
Write your full report to `.superpowers/sdd/2026-08-12-m-ustawienia/task-4-report.md` BEFORE your final message. Final message: status, commit SHA, one-line test summary, concerns.

Note: if any git/npm command fails with "Operation not permitted" (sandbox), retry with sandbox disabled.
