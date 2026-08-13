# Review — Task 3: type.tab token + Skia TabIcon (spec 011, AC-1/AC-2)

SPEC: ✅
QUALITY: APPROVE

## Verification performed

- Diffed `ICON_PATHS` literals in `src/shared/ui/TabIcon.tsx` and the AC-1 test fixture in
  `src/shared/ui/__tests__/TabIcon.test.tsx` character-for-character against
  `design/Powietrze.dc.html` lines 256/260/264:
  - teraz: `circle cx=12 cy=9 r=4`, `path d="M3 17h4M17 17h4M5 20.5h5M14 20.5h5"` — match.
  - miejsca: `path d="M12 21s-7-6.3-7-11a7 7 0 0114 0c0 4.7-7 11-7 11z"`, `circle cx=12 cy=10 r=2.4` — match.
  - ustawienia: `circle cx=12 cy=12 r=3`, `path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"` (8 subpaths) — match.
  - Both the component's `ICON_PATHS` and the test's inline expected object are identical
    strings, and the test does `expect(ICON_PATHS).toEqual({...literal...})` — a genuine
    pinned literal fixture, not a circular `toEqual(ICON_PATHS)`.
- AC-2: Canvas is 25×25 (`SIZE=25`), `Group transform={[{ scale: SIZE / 24 }]}` = 25/24 as
  required. All circles/paths set `style: 'stroke'`, `strokeWidth: 1.9`, `strokeCap: 'round'`
  (paths also `strokeJoin="round"`), no `fill`. Paths are passed as plain strings to
  `<Path path={d} />` — no `Skia.Path.*` calls anywhere. The first circle's props object
  conditionally spreads `testID` (`...(i === 0 ? { testID } : {})`); test asserts
  `getByTestId('icon-x').props.color` and `.strokeWidth` on that node — a meaningful
  assertion on the actual rendered/stroked host node, not the bare Canvas view.
- `type.tab: { size: 10.5, weight: '500', letterSpacing: 0 }` added as the last entry in
  `src/shared/tokens/index.ts`'s `type` object; diff confirms it's a pure addition — no
  other `type.*` entries touched.
- Confirmed in `node_modules/@shopify/react-native-skia` typings that `testID` is genuinely
  absent from Circle/Path/Group prop types (justifies the spread pattern) and that
  `strokeCap`/`strokeWidth`/`style` do exist as declared paint props — the brief's premises
  hold for the installed `^2.11.0`.
- Props-spread pattern: `props` is a variable, not a JSX-inline fresh object literal, so TS
  excess-property checking is bypassed only for the extra `testID` key; `cx/cy/r/color/
  style/strokeWidth/strokeCap` are still plain literal values assigned into that object and
  remain structurally checked against Circle's declared prop types (`style: 'stroke' as
  const`, `strokeCap: 'round' as const` correctly narrow to the literal union types Skia
  expects). This mirrors the pre-existing, already-merged `Skyline.tsx` pattern — not a novel
  or speculative trick.
- No hex/rgba literal anywhere in `TabIcon.tsx`; `color` flows through as a prop on both
  Circle and Path call sites. No `any`, `@ts-ignore`, or eslint-disable in any of the three
  files. Render body is fully data-driven (`circles.map` / `paths.map` over `ICON_PATHS`),
  no switch statement. No new dependency; import is `@shopify/react-native-skia`, already in
  use elsewhere in `shared/ui`. Layering is shared/ui → skia (external), doesn't cross
  feature/core/data boundaries.
- File size: `TabIcon.tsx` is 72 lines, well under the ≤200 file cap.

## Findings

**Minor — `TabIcon` render function is 44 lines, 4 over the CLAUDE.md ≤40-line function guideline.**
- Location: `src/shared/ui/TabIcon.tsx:29-72`.
- The function itself (`export function TabIcon({...}) { ... }`) spans lines 29–72. Counting
  from the `export function` line through the closing brace gives 44 lines; the overage is
  entirely the inline multi-line prop-type annotation (lines 30–37), not the render logic,
  which is compact (`circles.map`/`paths.map`, ~26 lines). There's no `max-lines-per-function`
  ESLint rule configured in `.eslintrc.js`, so this isn't a gate failure and `npm run lint`
  correctly reports 0. Not blocking, but worth a follow-up nit: extracting a named
  `TabIconProps` type (as `TabIconName` already is) would both shrink the function to ≤40
  lines by any counting convention and match the pattern's own `TabIconName` export.
  Fix (optional, non-blocking): hoist the inline `{ name, color, testID }` prop type to
  `type TabIconProps = { name: TabIconName; color: string; testID?: string };` above the
  function.

No Critical or Important findings. AC-1 and AC-2 are both satisfied and traceable to
meaningful tests; the props-spread/testID pattern is sound and consistent with prior art in
the codebase; no forbidden constructs, no scope creep, no design-file edits, no token
regressions.

verdict written
