# Task 4 — Tab bar redesign (icons + labels + a11y)

Worktree `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest`, branch `feature/m-design-fidelity`.

## Global Constraints
- TS strict; no `any`/`@ts-ignore`. Files ≤200, functions ≤40. Test names cite AC IDs.
- **No hex/rgba in `src/app/**`** — colors from tokens. No new dependency.
- **Do NOT change the PR #7 tint logic or break its tests.** The existing AppNavigator tint tests (AC 006-10 + the unfocused-Teraz-live-tint test) must stay green UNCHANGED.

## Consumes (Task 3, committed)
`TabIcon`, `TabIconName` from `src/shared/ui/TabIcon`; `type.tab` token.

## Files
- Modify: `src/app/TabBar.tsx`
- Test: extend `src/app/__tests__/AppNavigator.test.tsx` (helpers already present: `renderNav`, `within`, `scene`, `colors`).

## Current TabBar.tsx shape
`makeTabBar(activeTints, inactiveTints={})` returns a `TabBar` that maps `state.routes` to `<Pressable testID={`tab-${route.name}`}>` with a `<Text variant="label" color={tint}>` label; `tint = focused ? activeTints[route.name] : (inactiveTints[route.name] ?? colors.text.inactive)`. Styles: `bar` (height 88, paddingBottom 24, tabBar.bg, borderTop), `item` (flex1, center), `itemLabel` (letterSpacing 0.5). KEEP the tint computation and testIDs.

## Step 1: Add the failing tests to `src/app/__tests__/AppNavigator.test.tsx`
(Append; do NOT modify the existing tint tests.)
```ts
test('AC-3/AC-4: each tab shows its icon (tinted like the label) above the label', async () => {
  await renderNav();
  await screen.findByText('118');
  const key = scene(118).key;
  expect(
    within(screen.getByTestId('tab-Teraz')).getByTestId('icon-Teraz').props.color,
  ).toBe(key); // focused Teraz → live key tint
  expect(
    within(screen.getByTestId('tab-Miejsca')).getByTestId('icon-Miejsca').props.color,
  ).toBe(colors.text.inactive); // unfocused → neutral
});

test('AC-6: each tab is a selected-aware button', async () => {
  await renderNav();
  expect(screen.getByTestId('tab-Teraz').props.accessibilityState.selected).toBe(true);
  expect(screen.getByTestId('tab-Miejsca').props.accessibilityState.selected).toBe(false);
});
```

## Step 2: Run to verify fail
`npx jest AppNavigator` → the two NEW tests fail (no icon / no a11y state); the existing tint tests still pass.

## Step 3: Implement in `src/app/TabBar.tsx`
- Import: `import { TabIcon, type TabIconName } from '../shared/ui/TabIcon';` and add:
  ```ts
  const ROUTE_ICON: Record<string, TabIconName> = {
    Teraz: 'teraz', Miejsca: 'miejsca', Ustawienia: 'ustawienia',
  };
  ```
- In each item, render the icon ABOVE the label:
  ```tsx
  <Pressable
    key={route.key}
    testID={`tab-${route.name}`}
    accessibilityRole="button"
    accessibilityState={{ selected: focused }}
    style={styles.item}
    onPress={() => navigation.navigate(route.name)}
  >
    {ROUTE_ICON[route.name] && (
      <TabIcon
        name={ROUTE_ICON[route.name]}
        color={tint}
        testID={`icon-${route.name}`}
      />
    )}
    <Text style={[styles.itemLabel, { color: tint }]}>{route.name}</Text>
  </Pressable>
  ```
  (The label no longer uses the `variant="label"` 12px style — use `type.tab`.)
- Label style via `type.tab`: import `type` from tokens and set `itemLabel` to
  `{ fontSize: type.tab.size, fontWeight: type.tab.weight, letterSpacing: type.tab.letterSpacing }`.
  (Drop the old `letterSpacing: 0.5` and the `Text` `variant` usage. If you keep the shared `Text` component, note it REQUIRES a `variant` prop — simplest is to use a plain RN `<Text>` here with the `type.tab`-derived style, since the tab label isn't one of the `type` variants `Text` supports. Import RN `Text` as needed; do not add `any`.)
- Item column: `alignItems:'center'`, `justifyContent:'center'`, `gap: 4` (RN 0.86 supports flex gap).
- Bar style: add `paddingTop: 10` (design padding `10 0 24`); keep height 88, `colors.tabBar.bg`, `borderTopWidth 1` / `colors.tabBar.border`.

## Step 4: Verify pass + gate
`npx jest AppNavigator` — ALL pass (incl. the untouched PR #7 tint tests). `npm test` full suite green. `npm run lint` 0. `npm run typecheck` 0.

## Step 5: Commit
`git add src/app/TabBar.tsx src/app/__tests__/AppNavigator.test.tsx && git commit -m "feat(nav): icon tab bar with design tint/geometry/a11y (AC-3..6, spec 011)"`

## Report
Write your full report to `.superpowers/sdd/2026-08-13-m-design-fidelity/task-4-report.md` BEFORE your final message. Confirm the existing PR #7 tint tests still pass unchanged. Note any deviation. Final message: status, commit SHA, one-line test summary, concerns.

Note: if any git/npm command fails with "Operation not permitted" (sandbox), retry with sandbox disabled.
