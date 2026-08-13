# Task 3 — type.tab token + TabIcon (Skia icons)

Worktree `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest`, branch `feature/m-design-fidelity`.

## Global Constraints
- TS strict; no `any`/`@ts-ignore`/eslint-disable. Files ≤200, functions ≤40. Test names cite AC IDs.
- **No hex/rgba in `src/shared/ui/**`** — `color` is a prop; icon `d` strings contain no colors.
- No new dependency.
- **Skia + Jest (load-bearing):** pass each `d` as a STRING to `<Path path=…/>`; NEVER call `Skia.Path.*` (throws under the mock, would crash tests). Assert props on the stroked host node via a `testID` — NOT on the `Canvas` (a bare View under the mock, carries no `color`).
- **Skia types lack `testID`** on `Circle`/`Path`/`Group` (proven in Task 2). To attach a test-only `testID` without a tsc error, build a plain props object and SPREAD it (TS excess-property-checks only fresh literals, not spread variables). See the Circle mapping below — do NOT inline `testID` as a JSX literal on a Skia element, and do NOT use `any`/`@ts-ignore`.

## Produces
`type.tab` token; `TabIconName`, `ICON_PATHS`, `TabIcon({ name, color, testID })`. Consumed by Task 4.

## Files
- Modify: `src/shared/tokens/index.ts` (add `type.tab`)
- Create: `src/shared/ui/TabIcon.tsx`
- Test: `src/shared/ui/__tests__/TabIcon.test.tsx`

## Step 1: Add the token
In `src/shared/tokens/index.ts`, inside the `type` object, add:
```ts
  tab: { size: 10.5, weight: '500', letterSpacing: 0 },
```
(Read the file first; match the existing entries' shape, e.g. `label: { size: 12, weight: '600', letterSpacing: 2.4 }`.)

## Step 2: Write the failing tests (`src/shared/ui/__tests__/TabIcon.test.tsx`)
```ts
import { render, screen } from '@testing-library/react-native';
import { TabIcon, ICON_PATHS } from '../TabIcon';
import { colors } from '../../tokens';

test('AC-1: ICON_PATHS pins the design icon table (literal fixture)', () => {
  expect(ICON_PATHS).toEqual({
    teraz: {
      paths: ['M3 17h4M17 17h4M5 20.5h5M14 20.5h5'],
      circles: [{ cx: 12, cy: 9, r: 4 }],
    },
    miejsca: {
      paths: ['M12 21s-7-6.3-7-11a7 7 0 0114 0c0 4.7-7 11-7 11z'],
      circles: [{ cx: 12, cy: 10, r: 2.4 }],
    },
    ustawienia: {
      paths: [
        'M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
      ],
      circles: [{ cx: 12, cy: 12, r: 3 }],
    },
  });
});

test('AC-2: TabIcon strokes the icon in `color`; testID lands on a stroked node', async () => {
  await render(<TabIcon name="teraz" color={colors.accent} testID="icon-x" />);
  const node = screen.getByTestId('icon-x');
  expect(node.props.color).toBe(colors.accent);
  expect(node.props.strokeWidth).toBe(1.9);
});
```
(Using `colors.accent` as the test color avoids any inline-hex lint question in the test file.)

## Step 3: Run to verify fail
`npx jest TabIcon` → FAIL.

## Step 4: Implement (`src/shared/ui/TabIcon.tsx`)
Note the Circle mapping uses the props-spread pattern so the first circle's `testID` typechecks:
```tsx
import { Canvas, Group, Path, Circle } from '@shopify/react-native-skia';

export type TabIconName = 'teraz' | 'miejsca' | 'ustawienia';

// Verbatim from Powietrze.dc.html:256/260/264 (viewBox 0 0 24 24).
export const ICON_PATHS: Record<
  TabIconName,
  { paths: string[]; circles: { cx: number; cy: number; r: number }[] }
> = {
  teraz: { paths: ['M3 17h4M17 17h4M5 20.5h5M14 20.5h5'], circles: [{ cx: 12, cy: 9, r: 4 }] },
  miejsca: {
    paths: ['M12 21s-7-6.3-7-11a7 7 0 0114 0c0 4.7-7 11-7 11z'],
    circles: [{ cx: 12, cy: 10, r: 2.4 }],
  },
  ustawienia: {
    paths: [
      'M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
    ],
    circles: [{ cx: 12, cy: 12, r: 3 }],
  },
};

const SIZE = 25;
const STROKE = 1.9;

export function TabIcon({
  name,
  color,
  testID,
}: {
  name: TabIconName;
  color: string;
  testID?: string;
}) {
  const { paths, circles } = ICON_PATHS[name];
  return (
    <Canvas style={{ width: SIZE, height: SIZE }}>
      <Group transform={[{ scale: SIZE / 24 }]}>
        {circles.map((c, i) => {
          // testID on the first circle (every icon has one) so its `color` is
          // assertable; spread a plain object so TS doesn't excess-check testID
          // (Skia's Circle type doesn't declare it) — same pattern as Skyline.
          const props = {
            cx: c.cx,
            cy: c.cy,
            r: c.r,
            color,
            style: 'stroke' as const,
            strokeWidth: STROKE,
            strokeCap: 'round' as const,
            ...(i === 0 ? { testID } : {}),
          };
          return <Circle key={`c${i}`} {...props} />;
        })}
        {paths.map((d, i) => (
          <Path
            key={`p${i}`}
            path={d}
            color={color}
            style="stroke"
            strokeWidth={STROKE}
            strokeCap="round"
            strokeJoin="round"
          />
        ))}
      </Group>
    </Canvas>
  );
}
```

## Step 5: Verify pass + gate
`npx jest TabIcon` PASS. `npm run lint` 0. `npm run typecheck` 0. (If `style="stroke"` on `<Path>` trips tsc for the same testID-less reason, it won't — only `testID` is the excess prop; `style`/`strokeWidth`/`strokeCap`/`strokeJoin` are declared Skia props. If any of those prop NAMES are wrong for the installed Skia version, check the type and adjust — do NOT add `any`.)

## Step 6: Commit
`git add src/shared/tokens/index.ts src/shared/ui/TabIcon.tsx src/shared/ui/__tests__/TabIcon.test.tsx && git commit -m "feat(shared): type.tab token + Skia TabIcon (AC-1..2, spec 011)"`

## Report
Write your full report to `.superpowers/sdd/2026-08-13-m-design-fidelity/task-3-report.md` BEFORE your final message. Note any deviation (esp. Skia stroke-prop names for the installed version). Final message: status, commit SHA, one-line test summary, concerns.

Note: if any git/npm command fails with "Operation not permitted" (sandbox), retry with sandbox disabled.
