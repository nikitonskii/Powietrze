# Task 3 review — RefreshControl on Teraz + Miejsca

**Diff:** `.superpowers/sdd/2026-08-16-m-refresh/task-3.diff` (commit `0c8d22b`)
**Spec:** `docs/specs/018-refresh.md` §Design "Screens" (AC-5, AC-6 manual)
**Plan:** `docs/superpowers/plans/2026-08-16-m-refresh.md` Task 3

## Verdicts

1. **SPEC: APPROVE** — Both `TerazScreen`'s and `MiejscaScreen`'s outer (and only)
   `ScrollView` get `refreshControl={<RefreshControl refreshing={refreshing}
   onRefresh={refresh} tintColor={colors.text.dim} testID="refresh-control" />}`
   sourced from `useRefresh()` (`src/features/teraz/TerazScreen.tsx:44-54`,
   `src/features/miejsca/MiejscaScreen.tsx:38-48`). `tintColor` uses the
   `colors.text.dim` token (`src/shared/tokens/index.ts:12`,
   `rgba(255,255,255,0.5)`), not a raw hex literal. Both screens are confirmed
   `ScrollView` per spec. Tests assert the control is present and that firing
   `onRefresh` triggers a refetch (via fake-source call counts), citing AC-5/AC-6.

2. **QUALITY: CHANGES-NEEDED** (should-fix, not a blocker — see below)

## Gate results (verified, not trusted from implementer claims)
- `npm run typecheck` — exit 0, no errors.
- `npm run lint` — exit 0. **6 warnings, 0 errors** (4 pre-existing + 2 new).
  The 2 new warnings are `@react-native/no-deep-imports` on
  `MiejscaScreen.test.tsx:59` and `TerazScreen.test.tsx:35`, both on the
  `require('react-native/Libraries/Components/View/View')` line inside the new
  test-local `jest.mock(...)` factory. Confirmed these lines are wholly new
  (present only in the added mock block in this diff) — warnings only, lint
  still green.
- `npm test` — **59 suites / 220 tests, all passed.** No regressions in any
  existing suite (place/hooks/other screens all green).

## Findings

### Should-fix
1. **Over-engineered/fragile RefreshControl mock — a simpler, framework-provided
   seam already exists and needs no `jest.mock` override at all.**
   `src/features/teraz/__tests__/TerazScreen.test.tsx:14-38` and
   `src/features/miejsca/__tests__/MiejscaScreen.test.tsx:47-71` each add an
   ~26-line `jest.mock('react-native/Libraries/Components/RefreshControl/RefreshControl', …)`
   that reimplements a queryable `View` stand-in, plus a `require()` of the
   `View` submodule to dodge a circular import. This is what produces the 2 new
   lint warnings and is duplicated verbatim between the two files.

   I verified (scratch spike, removed after) that `@react-native/jest-preset`
   **already ships** `node_modules/@react-native/jest-preset/jest/mocks/RefreshControl.js`,
   wired in by the preset's own `setupFiles` (`m#react-native/Libraries/Components/RefreshControl/RefreshControl`
   → `m#./mocks/RefreshControl`), which renders a bare host node but stores a
   static `RefreshControlMock.latestRef` pointing at the mounted instance —
   `latestRef.props` exposes the **exact props passed by the screen**
   (`refreshing`, `onRefresh`, `tintColor`, `testID`), unmodified. Confirmed
   live: `import { RefreshControl } from 'react-native'; … (RefreshControl as
   any).latestRef.props` → `{ refreshing: false, onRefresh: [Function],
   tintColor: …, testID: 'refresh-control' }` with **zero** test-local
   `jest.mock`, zero deep imports, zero new lint warnings, using a plain
   top-level `import { RefreshControl } from 'react-native'`.

   This is strictly simpler and less fragile than the current approach: no
   custom View-forwarding component to maintain, no comment explaining a
   contrived circular-import workaround, no duplicated ~26-line block across
   two files, and it asserts the *actual* prop wiring rather than a fabricated
   `accessibilityState.busy` stand-in and a `fireEvent.press` standing in for
   a pull gesture (calling `latestRef.props.onRefresh()` directly is also more
   semantically honest — pull-to-refresh isn't a press).

   Verdict on the implementer's specific question: the deep-import mock is
   **not** the only viable way to assert wiring in this RN preset — it is a
   real, avoidable smell. Recommend replacing both blocks with the
   `latestRef`-based read (needs one justified `as any`/`eslint-disable` for
   the untyped static, similar to the existing justified `any` in
   `MiejscaScreen.test.tsx` for GIOŚ fixtures). This also removes the
   duplication between the two test files without needing a shared helper.

2. **Duplicated mock block across two test files** (consequence of #1):
   `TerazScreen.test.tsx:14-38` and `MiejscaScreen.test.tsx:47-71` are near-
   identical. Even independent of #1, CLAUDE.md's "no duplicated logic" would
   call for extracting this to a shared test helper (repo already has
   precedent: `src/shared/test/fakeAirSource.ts`). Resolved by fix #1, which
   removes the block entirely rather than just relocating it.

### Minor / nit
3. **Component functions grew further past the 40-line guideline** (pre-existing
   debt, worsened by this diff, not introduced by it): `TerazScreen` function
   body was 55 lines before this diff, now 66 (`src/features/teraz/TerazScreen.tsx:19-84`);
   `MiejscaScreen` was 68, now 77 (`src/features/miejsca/MiejscaScreen.tsx:21-97`).
   Both were already over CLAUDE.md's ≤40-line guidance before Task 3; this
   diff's addition (import + hook + `refreshControl` JSX block) is small and
   directly tied to the task, so I'm not blocking on it, but the trend is
   worth a note for a future decompose-the-screen pass (e.g. extracting the
   `RefreshControl` construction into a small `shared/ui` wrapper would also
   dedupe the near-identical `tintColor`/`testID` block between the two
   screens).
4. **`MiejscaScreen.test.tsx` is 255 lines** (>200 guideline) — acceptable:
   repo has real precedent for test files over 200 lines
   (`src/data/gios/__tests__/detail.test.ts` at 242 lines pre-existing), and
   removing finding #1's mock block would bring it back down considerably.
   Not a fresh violation worth blocking on.

### No findings (checked, clean)
- No cross-feature imports; `shared/refresh` consumed correctly (features →
  shared, one-way).
- No hard-coded hex; `colors.text.dim` token used for `tintColor`.
- No new `any` in production code; the new mock's prop type is explicit
  (`{ testID?: string; refreshing: boolean; onRefresh?: () => void }`).
- `RefreshControl` wired on the correct (only) `ScrollView` in each screen.
- Test names cite AC IDs (`AC-5,6 (refresh): …`); assertions are behavioral
  (call counts, prop values), not snapshots, and are not vacuous — they
  exercise the actual refetch-on-refresh path end to end.
- Existing suites unaffected: 59/59 suites, 220/220 tests green.

## Verdict
**SPEC: APPROVE.** **QUALITY: CHANGES-REQUESTED** (should-fix #1/#2 — the
deep-import `RefreshControl` mock should be replaced with the preset's own
`RefreshControlMock.latestRef` seam; not a blocker for merging functionality,
but should be fixed before this becomes the copy-pasted pattern for future
screens).
