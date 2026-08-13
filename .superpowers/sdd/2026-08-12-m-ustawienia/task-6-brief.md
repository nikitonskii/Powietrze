# Task 6 — SettingsGroup primitive

Work in worktree `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest` on branch `feature/m-ustawienia`.

## Global Constraints
- TypeScript strict; `any` forbidden without inline justification.
- Files ≤ 200 lines, functions ≤ 40. Test names cite AC IDs.
- **No hex/rgba in `src/shared/ui/**`** — colors only from `src/shared/tokens` (has `card`, `text.faint`, `control.divider`).
- No new dependency.

## Produces
`SettingsGroup({ label, children })` from `src/shared/ui/SettingsGroup.tsx` — a section label (rendered VERBATIM; the caller passes already-uppercased strings, so NO textTransform) above a card that wraps children with a hairline divider between adjacent rows and none after the last. Consumed by Task 8.

## Files
- Create: `src/shared/ui/SettingsGroup.tsx`
- Test: `src/shared/ui/__tests__/SettingsGroup.test.tsx`

## Step 1: Write the failing test (`src/shared/ui/__tests__/SettingsGroup.test.tsx`)
```tsx
import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { SettingsGroup } from '../SettingsGroup';
import { colors } from '../../tokens';
import { colorOf } from '../../test/colorOf';

test('AC-16: label rendered verbatim in faint, card wraps children', async () => {
  await render(
    <SettingsGroup label="DANE">
      <Text>row-a</Text>
      <Text>row-b</Text>
    </SettingsGroup>,
  );
  const label = screen.getByText('DANE');
  expect(colorOf(label)).toBe(colors.text.faint);
  const s = StyleSheet.flatten(label.props.style);
  expect(s.fontSize).toBe(11);
  expect(s.fontWeight).toBe('600');
  expect(s.letterSpacing).toBe(1.4);
  expect(screen.getByText('row-a')).toBeTruthy();
  expect(screen.getByText('row-b')).toBeTruthy();
});
```

## Step 2: Run to verify fail
`npx jest SettingsGroup` → FAIL.

## Step 3: Implement (`src/shared/ui/SettingsGroup.tsx`)
Insert a `colors.control.divider` hairline between adjacent children (skip after the last). Card `colors.card`, radius 18, `overflow:'hidden'`.
```tsx
import { Children, Fragment, type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../tokens';

export function SettingsGroup({ label, children }: { label: string; children: ReactNode }) {
  const rows = Children.toArray(children);
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.card}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {row}
            {i < rows.length - 1 && <View style={styles.divider} />}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 22 },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    color: colors.text.faint,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  card: { backgroundColor: colors.card, borderRadius: 18, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.control.divider },
});
```

## Step 4: Verify pass + gate
`npx jest SettingsGroup` → PASS. `npm run lint` → 0. `npm run typecheck` → 0.

## Step 5: Commit
`git add src/shared/ui/SettingsGroup.tsx src/shared/ui/__tests__/SettingsGroup.test.tsx && git commit -m "feat(shared): SettingsGroup primitive (AC-16)"`

## Report
Write your full report to `.superpowers/sdd/2026-08-12-m-ustawienia/task-6-report.md` BEFORE your final message. Final message: status, commit SHA, one-line test summary, concerns.

Note: if any git/npm command fails with "Operation not permitted" (sandbox), retry with sandbox disabled.
