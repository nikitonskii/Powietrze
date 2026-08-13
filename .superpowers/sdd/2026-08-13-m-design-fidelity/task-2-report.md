# Task 2 report — Skyline sub-component + Atmosphere integration

Worktree: `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest`
Branch: `feature/m-design-fidelity`
Commit: `3de6fab` — `feat(atmosphere): render density-driven skyline in the canvas (AC-4, spec 010)`

## What was done

Followed the brief's TDD steps as written:

1. **Test first** — `src/shared/ui/__tests__/Skyline.test.tsx`, matching the brief's
   snippet, but with the import path corrected: the brief's snippet used
   `'../../core/atmosphere'` from inside `__tests__/`, which resolves to
   `src/shared/core/atmosphere` (doesn't exist). Used `'../../../core/atmosphere'`
   instead, matching the sibling `Atmosphere.test.tsx`'s existing pattern
   (`'../../../core/scene'`). `src/core/atmosphere` is a directory
   (`index.ts` + `__tests__/`), not a flat file — confirmed `SKYLINE_PATH`,
   `SKYLINE_VIEWBOX`, `SKYLINE_TOP_RATIO`, `skyline()`, `skylineColor()` all
   live there from Task 1, already committed.
2. Ran `npx jest Skyline` → failed as expected (`Cannot find module '../Skyline'`).
3. Implemented `src/shared/ui/Skyline.tsx` per the brief's Step 3 (Group/Blur/Path
   with density-derived opacity/blur/color, `skylineColor()` for the fill —
   no hex/rgba literal in the file).
4. `npx jest Skyline` → passed on first try. The Skia jest mock's prop
   exposure matched the brief's assumption exactly (`skGroup`/`skBlurMaskFilter`/`skPath`
   host nodes with props preserved, queryable via `testID`).
5. Integrated into `src/shared/ui/Atmosphere.tsx`: added the `Skyline` import
   and one line, `<Skyline density={scene.density} width={width} height={height} />`,
   rendered as a Canvas-level sibling AFTER the particle `<Group>` (not nested
   inside it), so it overlays the field per the brief's intent. `Atmosphere()`
   grew by exactly 2 lines (1 import + 1 JSX line), well within budget.

## Deviation from the brief (typecheck, not the Skia mock)

The brief's Step 3 code passes `testID` directly as a JSX prop literal on
`<Group>`, `<Blur>`, and `<Path>`. This works at **runtime** under the jest
mock exactly as documented — but **fails `tsc --noEmit`** against the
installed `@shopify/react-native-skia@^2.11.0` type declarations, none of
which declare a `testID` prop on `PublicGroupProps` / `BlurImageFilterProps`
/ `PathProps` (unlike `Canvas`, which forwards to a real RN `View` and so
accepts `testID` natively). Three `TS2322` "Property 'testID' does not
exist" errors resulted.

Fix: build each element's props as a plain object first, then spread it
onto the JSX element (`<Group {...groupProps}>` etc.) instead of inlining
`testID={...}` as object-literal JSX attributes. TypeScript's excess-property
check only fires on fresh object literals assigned directly to a typed
position; a spread of a separately-declared variable is checked purely by
structural assignability, which permits extra properties. This preserves
identical runtime behavior (the mock still sees `testID` in `props`) while
satisfying strict typecheck with **zero `any`**, so no CLAUDE.md
any-justification comment was needed. Added an inline comment in
`Skyline.tsx` explaining why the spread form is used, so a future reader
doesn't "simplify" it back to literal props and reintroduce the type error.

No other deviations. `SKYLINE_PATH` was passed as a plain string to
`<Path path={...}>` — `Skia.Path.*` was never called.

## Verification

- `npx jest Skyline Atmosphere` — 4 suites / 10 tests passed.
- `npm test` (full suite) — 42 suites / 137 tests passed. (Pre-existing,
  unrelated `act(...)` console warnings from `usePlaceReading`/bottom-tabs
  appear in output but are not new and don't fail any test.)
- `npm run lint` — 0 errors (4 pre-existing warnings in unrelated files:
  `App.tsx`, `src/data/gios/mappers.ts`, `src/shared/ui/Toggle.tsx`; none
  touched by this change). No hex/rgba-literal violation in `Skyline.tsx`.
- `npm run typecheck` — 0 errors.

## Files touched

- Created: `src/shared/ui/Skyline.tsx` (42 lines)
- Created: `src/shared/ui/__tests__/Skyline.test.tsx`
- Modified: `src/shared/ui/Atmosphere.tsx` (+2 lines: import + `<Skyline>` render)

## Status: DONE
