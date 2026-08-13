# Task 4 report — Tab bar redesign (icons + labels + a11y)

Worktree: `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest`
Branch: `feature/m-design-fidelity`
Commit: `7abb9e6` — "feat(nav): icon tab bar with design tint/geometry/a11y (AC-3..6, spec 011)"

## What changed

- `src/app/TabBar.tsx`
  - Added `import { TabIcon, type TabIconName } from '../shared/ui/TabIcon';`
    and `type as typeScale` from `../shared/tokens`.
  - Added `ROUTE_ICON: Record<string, TabIconName>` mapping `Teraz→teraz`,
    `Miejsca→miejsca`, `Ustawienia→ustawienia`.
  - `makeTabBar(activeTints, inactiveTints)` signature and the `tint`
    computation (`focused ? activeTints[route.name] : inactiveTints[route.name] ?? colors.text.inactive`)
    are **unchanged** — kept verbatim.
  - Each item is now a `Pressable` with `testID="tab-<Route>"` (unchanged),
    plus new `accessibilityRole="button"` and
    `accessibilityState={{ selected: focused }}`.
  - Renders `<TabIcon name={ROUTE_ICON[route.name]} color={tint} testID={"icon-"+route.name} />`
    above the label, so the icon gets the same `tint` as the label
    (both icon and label read from the identical `tint` variable — no
    divergence possible).
  - Label switched from the shared `Text` component (`variant="label"`,
    12px/600/ls 2.4) to a plain RN `<Text>` styled from `type.tab`
    (10.5/500/ls 0), per the brief: the shared `Text` component requires a
    `variant` and `tab` isn't one of its supported variants. Style is
    `{ color: tint }` merged onto `styles.itemLabel` (flattened), so the
    existing `colorOf()` test helper (which reads `StyleSheet.flatten(node.props.style).color`)
    keeps working unmodified.
  - `styles.item` gained `gap: 4` (RN 0.86 flex gap) alongside
    `alignItems:'center'`/`justifyContent:'center'`.
  - `styles.bar` gained `paddingTop: 10` (design padding `10 0 24`); height
    88, `colors.tabBar.bg`, `borderTopWidth 1` / `colors.tabBar.border` kept.
  - No hex/rgba literals introduced — verified with
    `grep -nE "#[0-9a-fA-F]{3,8}|rgba?\(" src/app/TabBar.tsx` → no matches.
    All colors come from `colors`/`typeScale` tokens.
  - File is 68 lines (limit 200); no function exceeds 40 lines.

- `src/app/__tests__/AppNavigator.test.tsx`
  - **Appended** (did not touch existing tests) the two tests from the
    brief verbatim (Prettier reformatted the multi-line `.toBe(...)` calls
    on save; logic/assertions unchanged):
    - `AC-3/AC-4: each tab shows its icon (tinted like the label) above the label`
    - `AC-6: each tab is a selected-aware button`

## TDD trail

1. Added the two failing tests (Step 1) → ran `npx jest AppNavigator`:
   2 failed (no `icon-Teraz`/`icon-Miejsca` testID, no `accessibilityState`),
   **5 passed** — confirming the existing PR #7 tint tests and the two
   baseline tests were green and untouched *before* any implementation
   change.
2. Implemented Step 3 in `TabBar.tsx`.
3. Re-ran `npx jest AppNavigator`: **7/7 passed.**

## Gate results

- `npx jest AppNavigator` → 7 passed, 7 total (0 failed).
- `npm test` (full suite) → **43 suites passed, 141 tests passed, 0 failed.**
- `npm run lint` → **0 errors.** 4 pre-existing warnings, all in files
  untouched by this task (`App.tsx`, `src/data/gios/mappers.ts`,
  `src/shared/ui/Toggle.tsx`) — none in `TabBar.tsx` or the test file.
- `npm run typecheck` (`tsc --noEmit`) → **0 errors.**

No sandbox "Operation not permitted" failures occurred; no commands needed
sandbox bypass.

## Confirmation: PR #7 tint tests unchanged and still green

The following pre-existing tests in `AppNavigator.test.tsx` were **not
edited** (only new tests appended after them) and pass unchanged after the
implementation:

- `AC-9: three tabs, Teraz active, hero visible`
- `AC-10: tapping tabs switches to placeholder screens`
- `AC 006-10: Teraz tab tint comes from the active reading index, not MOCK_PLACE`
- `AC 006-10: Teraz tab tint is the neutral accent while the reading is loading`
- `the Teraz tab keeps a dimmed live air tint when unfocused (glanceable from any tab)`

All five passed both before implementation (as a baseline, alongside the
two new failing tests) and after (alongside the two new passing tests).
The `tint` computation in `makeTabBar` was copied verbatim, so this is
expected and confirmed by the two full test runs above.

## Deviations from the brief

None. Implementation matches the brief's Step 3 code exactly, including
the `ROUTE_ICON` map, the `Pressable` props, the `type.tab`-derived label
style, the `gap: 4` item style, and the `paddingTop: 10` bar style.

## Status

DONE. Commit `7abb9e6` on `feature/m-design-fidelity` in worktree
`/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest`.

## Final-review fix

Commit: `57a12d7` — "fix(nav): use shared Text for tab label, add AC-5 geometry
test (final-review fixes)"

The whole-branch final review raised two Important issues. Both addressed:

**Fix 1 — remove duplicated style logic in `TabBar.tsx`.** The label had
been hand-building font style from `typeScale.tab` in a raw RN `<Text>`,
duplicating logic the shared `src/shared/ui/Text` component already
provides now that `type.tab` is a valid variant. Reverted to the shared
component:
- Re-added `import { Text } from '../shared/ui/Text';`.
- Label is now `<Text variant="tab" color={tint}>{route.name}</Text>`.
- Deleted the now-redundant `itemLabel` style entry and the
  `type as typeScale` import (no longer used in this file).
- Everything else (icon, `tint` computation, a11y props, `gap: 4`,
  `paddingTop: 10`) kept exactly as before.
- The tint tests still pass unmodified: the shared `Text` component puts
  `color` on the flattened style (`color: color ?? colors.text.primary`),
  so `colorOf()` (`StyleSheet.flatten(node.props.style).color`) reads the
  same value as before.

**Fix 2 — added the missing AC-5 geometry test.** spec 011 AC-5 (tab bar
geometry + label type) is not a manual AC, so it needed an automated test:
- Added `testID="tab-bar"` to the `<View style={styles.bar}>` container in
  `TabBar.tsx`.
- Added `import { StyleSheet } from 'react-native';` to
  `AppNavigator.test.tsx`.
- Appended test `AC-5: tab bar geometry + label type` (verbatim from the
  coordinator's message) asserting the flattened bar style
  (`height: 88`, `paddingTop: 10`, `paddingBottom: 24`,
  `backgroundColor: colors.tabBar.bg`, `borderTopColor: colors.tabBar.border`)
  and the flattened label style (`fontSize: 10.5`, `fontWeight: '500'`,
  `letterSpacing: 0`).

**Fix 3 (minor, optional) — done.** Unified the Skia `style`/`strokeCap`/
`strokeJoin` prop form on `<Path>` in `src/shared/ui/TabIcon.tsx` to match
the `'stroke' as const` / `'round' as const` pattern already used on
`<Circle>` (previously the `<Path>` used bare string literals `"stroke"`/
`"round"`). Purely cosmetic — trivial and low-risk, so included.

### Gate results (post-fix)

- `npx jest AppNavigator` → **8 passed, 8 total** (0 failed) — the original
  7 plus the new `AC-5` test.
- `npm test` (full suite) → **43 suites passed, 142 tests passed, 0 failed.**
- `npm run lint` → **0 errors.** Same 4 pre-existing warnings as before, all
  in files untouched by this change (`App.tsx`,
  `src/data/gios/mappers.ts`, `src/shared/ui/Toggle.tsx`).
- `npm run typecheck` (`tsc --noEmit`) → **0 errors.**

### PR #7 tint tests — still unchanged and green

All five pre-existing tint tests listed above were not touched by this
fix round either, and passed in the same `npx jest AppNavigator` run that
confirmed the two new tests (Fix 2's `AC-5` test joins the two appended in
the original pass). No regressions.

### Deviations from the coordinator's fix instructions

None. Fix 1, Fix 2, and the optional Fix 3 were all applied exactly as
specified.

### Final status

DONE. Commit `57a12d7` on `feature/m-design-fidelity` in worktree
`/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest`.
