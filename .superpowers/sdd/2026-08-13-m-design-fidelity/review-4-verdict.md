# Review 4 verdict — Tab bar redesign (icons + labels + a11y)

**SPEC: ✅**
**QUALITY: APPROVE**

## AC checks

- **AC-3** ✅ — `TabIcon` (via `ROUTE_ICON`) renders before `<Text>` inside `Pressable` (default column flex → icon above label); `styles.item` has `gap: 4`; `itemLabel` derives `fontSize/fontWeight/letterSpacing` from `typeScale.tab`, and `src/shared/tokens/index.ts:39` confirms `tab: { size: 10.5, weight: '500', letterSpacing: 0 }` — matches spec exactly.
- **AC-4** ✅ — Both `TabIcon color={tint}` and `Text style={[styles.itemLabel, { color: tint }]}` read the same `tint` variable, so icon/label can never diverge. The `tint` computation (`focused ? activeTints[...] : inactiveTints[...] ?? colors.text.inactive`) is byte-identical to the pre-diff version (shown as unchanged context in the diff, not a `+`/`-` line). New tests assert `within(tab).getByTestId('icon-<Route>').props.color` per the brief.
- **AC-5** ✅ — `bar` keeps `height: 88`, `colors.tabBar.bg`, `borderTopWidth: 1` / `colors.tabBar.border`, gains `paddingTop: 10` alongside the existing `paddingBottom: 24`. `testID="tab-${route.name}"` untouched.
- **AC-6** ✅ — Each `Pressable` has `accessibilityRole="button"` and `accessibilityState={{ selected: focused }}`; new test asserts `.props.accessibilityState.selected` for focused (Teraz→true) and unfocused (Miejsca→false).

## CRITICAL regression check — PR #7 tint tests

Diff for `AppNavigator.test.tsx` (`@@ -117,12 +117,36 @@`) shows **only additions** after the last existing test (`the Teraz tab keeps a dimmed live air tint when unfocused`); no `-` lines anywhere in that hunk. All five pre-existing PR #7 tests (`AC-9`, `AC-10`, the two `AC 006-10` tint tests, and the unfocused-Teraz-live-tint test) are untouched.

The label's color-reading path stays valid: `colorOf()` (`src/shared/test/colorOf.ts`) does `StyleSheet.flatten(node.props.style).color`. The new label style is `style={[styles.itemLabel, { color: tint }]}` — an array, which `StyleSheet.flatten` merges left-to-right, so `.color` resolves to `tint` exactly as before when the label was `<Text variant="label" color={tint} style={styles.itemLabel}>`. No behavior change for `colorOf(within(tab).getByText(...))`.

**Ruling: the PR #7 tint tests are unmodified in the diff and remain valid — the tint is still carried on the label's flattened style, so `colorOf()` reads it correctly.**

## Quality / constraints

- No hex/rgba literal in `TabBar.tsx` — colors come from `colors.tabBar.bg`/`colors.tabBar.border`/`colors.text.inactive` and `typeScale.tab.*`; grep confirms no matches.
- No `any` / `@ts-ignore` introduced.
- `TabBar.tsx` is 68 lines (≤200); the `TabBar` render function is ~34 lines (≤40).
- `ROUTE_ICON: Record<string, TabIconName>` is an explicit map, no cast. `{ROUTE_ICON[route.name] && (<TabIcon .../>)}` degrades an unmapped route to label-only — no crash, since `Record<string, T>` indexing types as `T` (not `T | undefined`) under this project's `tsconfig.json` (extends `@react-native/typescript-config`, no `noUncheckedIndexedAccess`), so no type error either, consistent with the reported 0 `tsc` errors.
- No new dependency; layering intact (`src/app` → `src/shared/ui/TabIcon`, `src/shared/tokens`).
- RN version is `0.86.2` (`package.json`), consistent with the brief's flex-`gap` support claim.

## Findings

Clean — no Critical, Important, or Minor findings.
