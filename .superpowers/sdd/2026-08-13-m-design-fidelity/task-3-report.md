# Task 3 report — type.tab token + Skia TabIcon

Worktree: `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest`
Branch: `feature/m-design-fidelity`
Commit: `90e73de` — `feat(shared): type.tab token + Skia TabIcon (AC-1..2, spec 011)`

## What was done

Followed the brief's steps in order, no changes needed to the prescribed code:

1. **Token** — read `src/shared/tokens/index.ts` first, then added
   `tab: { size: 10.5, weight: '500', letterSpacing: 0 },` as the last entry
   in the `type` object, matching the shape of the existing entries
   (e.g. `label`). No other entries touched.
2. **Test first** — wrote `src/shared/ui/__tests__/TabIcon.test.tsx`
   verbatim from the brief's Step 2 snippet (AC-1 pins `ICON_PATHS`
   byte-for-byte; AC-2 asserts `color`/`strokeWidth` on the testID'd node).
3. Ran `npx jest TabIcon` → failed as expected
   (`Cannot find module '../TabIcon'`).
4. Implemented `src/shared/ui/TabIcon.tsx` verbatim from the brief's Step 4
   snippet: `ICON_PATHS` transcribed byte-for-byte (`r: 2.4`, `20.5`,
   `4.2 4.2l2.1 2.1`, etc. all match the brief exactly), each icon's `d`
   string passed straight to `<Path path={d} />` (never `Skia.Path.*`), and
   the first circle's `testID` attached via the props-spread pattern (build
   a plain object, spread it onto `<Circle {...props} />`) — same pattern
   already used in `Skyline.tsx` for the identical Skia-types-lack-`testID`
   reason.
5. `npx jest TabIcon` → passed immediately, first try. The Skia stroke prop
   names in the brief (`style`, `strokeWidth`, `strokeCap`, `strokeJoin`)
   matched the installed `@shopify/react-native-skia@^2.11.0` types exactly
   — no prop-name fix was required.

## Deviations

None. The brief's code was transcribed as-given and worked without
modification — no stroke-prop renames, no `any`/`@ts-ignore`/eslint-disable
needed anywhere.

## Verification

- `npx jest TabIcon` — 1 suite / 2 tests passed
  (AC-1 ICON_PATHS fixture, AC-2 stroke color + width on testID node).
- `npm test` (full suite) — 43 suites / 139 tests passed. (Pre-existing,
  unrelated `act(...)` console warnings from `usePlaceReading`/bottom-tabs
  appear in output but are not new and don't fail any test.)
- `npm run lint` — 0 errors (same 4 pre-existing warnings in unrelated
  files as Task 2: `App.tsx`, `src/data/gios/mappers.ts`,
  `src/shared/ui/Toggle.tsx`; none touched by this change). No hex/rgba
  literal in `TabIcon.tsx` — `color` is a prop throughout.
- `npm run typecheck` — 0 errors.

## Files touched

- Modified: `src/shared/tokens/index.ts` (+1 line: `type.tab`)
- Created: `src/shared/ui/TabIcon.tsx` (72 lines)
- Created: `src/shared/ui/__tests__/TabIcon.test.tsx` (29 lines)

## Status: DONE
