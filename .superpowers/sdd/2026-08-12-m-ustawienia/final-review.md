# Final whole-branch review — M-ustawienia

**Verdict: APPROVE-WITH-NITS**

Base `09d83e3` → HEAD `4ad8c08`, 11 commits, 21 files changed (+1124/-25).
Reviewed every changed file in full plus the favorites context/store as the
established pattern to compare against.

## Critical
None.

## Important
None. No layering violations, no cross-feature imports, no `any`, no hex/rgba
leaked into features/shared-ui, no core→React imports, `tsc --noEmit` and a
targeted `eslint` run on every changed path are clean (0 errors), all files
are within the 200-line cap (max is `UstawieniaScreen.tsx` at 198), all
functions inspected are ≤34 lines, and the AC-1/AC-18 literal-fixture tests
are genuine (compare the export/rendered copy against hand-typed literals,
not derived from the same table — not circular).

## Minor
1. **`src/shared/ui/SettingsGroup.tsx:39-42` / `__tests__/SettingsGroup.test.tsx`** —
   AC-16 requires "a divider between adjacent rows and none after the last,"
   but the divider `View` has no `testID` and the test only asserts label
   color/geometry + that both rows render. A regression (e.g. divider after
   the last row, or none between rows) would pass this test. Low risk in
   practice — it's a 4-line pure-render component, and AC-24's manual
   screenshot covers "overall visual fidelity to the mock," which would
   catch a visibly wrong divider count. **Triage: ship as-is.** Not worth
   blocking the milestone merge over; file a fast-follow to add
   `testID={`divider-${i}`}` and assert `rows.length - 1` dividers next time
   this component is touched.
2. **`src/features/ustawienia/UstawieniaScreen.tsx`** — 198 lines, 2 under
   the 200 cap. The branch already shows the right instinct here: commit
   `c6abaa1` proactively extracted per-group components and a `ToggleRow`
   helper specifically to stay under the function-size limit, and left a
   clear paper trail in the commit message. **Triage: ship as-is.** No
   further extraction needed now; flag for the next person touching this
   file that any addition should go into a new group component rather than
   growing this one.
3. **`src/shared/ui/Toggle.tsx:19-25`** — the track's `justifyContent`/
   `backgroundColor` are computed inline per-render rather than via two
   `StyleSheet.create` variants, tripping `react-native/no-inline-styles`
   (1 new warning; lint script has no `--max-warnings=0` so this doesn't
   fail the gate). Inherent to a two-state style driven by a prop — fine as
   written, but note it's the *only* new warning introduced by this branch
   (verified by diffing `eslint` output against `App.tsx`'s pre-existing
   `{flex:1}` warning, which predates this branch).
4. **Journal/evidence (Task 10) not in this diff.** `docs/harness/09-ustawienia.md`
   and `docs/harness/evidence/09/` don't exist yet at HEAD — expected, since
   this review covers only the 9 implementation-task commits, not the
   native-run/manual/journal task. Flagging so it isn't forgotten: per
   CLAUDE.md's Definition of Done ("Docs updated in the same change") and
   the spec's own Verification section, AC-24 (manual drag/recolor +
   screenshot) and the milestone journal must land before this milestone is
   truly "done," even though the automated gate is green without them.
5. **`src/shared/settings/index.tsx` lives at `shared/settings/` while the
   equivalent `FavoritesContext.tsx` lives inside `shared/place/`** (not a
   new top-level dir). This is spec-directed (`docs/specs/009-ustawienia.md`
   §Public API names the path explicitly) and internally consistent, so not
   a finding against this branch — just noting the two context providers
   now live at different depths for a future refactor to consider, not
   something to fix here.

## AC coverage sanity (spec `docs/specs/009-ustawienia.md`)
- **AC-1..4** (core model): `src/core/settings/__tests__/settings.test.ts` —
  all four proven, AC-1 is a genuine literal fixture, AC-3 round-trips every
  integer in `[25,200]`.
- **AC-5..9** (persistence): `src/data/settings/__tests__/store.test.ts` —
  all five proven against the real `@react-native-async-storage/async-storage`
  jest mock, mirroring the favorites adapter test shape exactly.
- **AC-10..12** (context): `src/shared/settings/__tests__/context.test.tsx` —
  all three proven; AC-10 correctly uses a deferred promise to observe the
  genuine pre-hydration state (good catch — a synchronous fake would have
  made the assertion vacuous); AC-12 inspects the final `save` argument to
  prove the functional-updater path, not a closure-capture bug.
- **AC-13..16** (UI primitives): each has a dedicated behavior test file;
  colors/geometry pinned via `colorOf`/`StyleSheet.flatten`, not snapshots.
  AC-15's gradient white-endpoint ambiguity (spec allowed either reusing
  `control.trackOff` or adding a new `.15` token) was resolved by reusing
  `control.trackOff`, and test + impl are consistent with that choice.
- **AC-17..23** (screen + wiring): `UstawieniaScreen.test.tsx` (6 tests) +
  `App.test.tsx` (1 test) + `AppNavigator.test.tsx` (updated to inject a
  `SettingsStore`, guarding the "green tests, crashing app" gap the spec
  calls out). AC-18's literal-copy fixture is genuine (hardcoded Polish
  strings compared against rendered text, not derived from the component).
  Polish glyphs checked byte-for-byte across every changed file: `µ` is
  U+00B5, `–` in `22:00 – 07:00` is U+2013, `³` is U+00B3, and the `›`
  chevron appears only in the test's negative assertion
  (`queryByText('Automatyczna ›')` → null), never in implementation code.
- **AC-24** (manual): correctly deferred — `ThresholdSlider.test.tsx` and
  the spec's own Verification section both state the physical drag is
  jest-untestable (008 precedent) and route it to a simulator walkthrough +
  screenshot. Not yet recorded in this diff (see Minor #4).

## Cross-cutting checks performed
- **Layering**: grep across the whole branch for cross-feature imports,
  features/shared importing `data/*` directly, and React imports in
  `core/settings` — all clean.
- **Honesty model (Wkrótce)**: enumerated every row against AC-21's rule —
  `loc/precision/alert/threshold/morning/scale` (interactive, unwired) and
  `quiet/widget` (invented placeholder facts) are tagged; `source/refresh`
  (real facts) and the footer are not. `ToggleRow` hardcodes `soon` for all
  three toggle rows it's used for (loc/alert/morning), which is correct
  per AC-21 but worth knowing if a future *wired* toggle row is added via
  the same helper — it would need a `soon?: boolean` prop then, not stay
  hardcoded.
- **Duplication**: `rowHeaderStyles` is deliberately shared between
  `SettingRow` and the screen's `StackedRow` (documented in a comment) —
  a real dedup, not an accidental one.
- **Pattern parity vs. favorites**: `SettingsProvider`/`useSettings` and
  `createAsyncStorageSettingsStore` mirror `FavoritesContext.tsx` and
  `data/favorites/index.ts` line-for-line in structure (effect-based load
  with an `on` flag, functional-updater `set`, swallowed save rejection
  with a `__DEV__` warn, identical "wrap the tree" error message style).

## Deferred-Minor triage (from the prompt)
- **SettingsGroup divider-count test gap** → ship as-is (see Minor #1).
- **UstawieniaScreen.tsx at 198 lines** → ship as-is (see Minor #2).
