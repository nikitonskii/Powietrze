# Final whole-branch review — M-design-fidelity

**Branch:** `feature/m-design-fidelity`, `341509a..7abb9e6` (worktree `m-loc-nearest`)
**Specs:** `docs/specs/010-skyline.md` (AC-1..5), `docs/specs/011-tabbar.md` (AC-1..7)

**Verdict: APPROVE-WITH-NITS**

All 4 per-task reviews were sound; this pass found no correctness/architecture
defects, one real test-coverage gap against the spec's own Verification
section, and one code-duplication regression. Neither is a shippable-blocker
given the manual ACs are still pending (Task 5), but both should be fixed
before/alongside that step.

## Findings

### Critical
None.

### Important (should-fix)

1. **`src/app/TabBar.tsx:1-4,42-44` — duplicates `shared/ui/Text`'s
   style-building logic instead of using the new `type.tab` variant.**
   Before this branch, the label used the shared `<Text variant="…" .../>`
   wrapper (`src/shared/ui/Text.tsx`), which already derives
   `fontSize/fontWeight/letterSpacing` from `typeScale[variant]` plus a
   `color` override. This diff drops that import (`- import { Text } from
   '../shared/ui/Text'`) and switches to raw RN `Text` with a hand-built
   style array pulling `typeScale.tab.size/weight/letterSpacing` directly
   (`itemLabel` in the `StyleSheet.create` block). That's the same logic
   `Text` already encapsulates, now duplicated — a "no duplicated logic"
   violation (CLAUDE.md Code style) with no comment explaining why the
   existing component couldn't be reused (it can: `type.tab` was added to
   `shared/tokens` in this same diff specifically so `Text` could pick it up
   for free). Fix: `<Text variant="tab" color={tint} testID={...}>` and
   delete the now-redundant `itemLabel` style + `typeScale` import.
   (Side note, not a defect: this change did incidentally fix a pre-existing
   hardcoded `letterSpacing: 0.5` that didn't match the design's `0` — good
   outcome, wrong mechanism.)

2. **Spec 011's own Verification section is not honored: no test asserts
   AC-5 bar geometry.** `docs/specs/011-tabbar.md:156-159` says the
   "AC-3..AC-6" test extension must cover "geometry (height 88, padding
   10/0/24)" and "label using `type.tab`". AC-5 (`docs/specs/011-tabbar.md:109-112`)
   is NOT marked `(manual, journal)` — unlike 010's AC-5 and 011's AC-7 — so
   per CLAUDE.md DoD #1 ("every AC … traceable to a test") it needs one.
   Grepped the whole test tree
   (`src/app/__tests__/*.tsx`, and repo-wide for `TabBar`/`makeTabBar`
   consumers): no test asserts `height`, `paddingTop`/`paddingBottom`,
   `colors.tabBar.bg`/`.border`, or the label's numeric `type.tab` values
   (`10.5`/`500`/`0`) anywhere. The values in `src/app/TabBar.tsx:53-67` do
   match the spec numbers on inspection, so this is a coverage gap, not a
   known-wrong value — but it's exactly the kind of gap a single-task review
   (which sees "tests pass, AC referenced in a commit message") can miss and
   a whole-branch review should catch. Fix: add an assertion (e.g. read
   `getByTestId('tab-Teraz')`'s or the bar container's flattened style, or a
   small dedicated `TabBar.test.tsx`) for height/padding/bg/border and the
   label's font metrics.

### Minor (nit)

3. **Skia-testID props-spread pattern — now duplicated twice, worth a shared
   helper (not blocking).** `src/shared/ui/Skyline.tsx:24-38` and
   `src/shared/ui/TabIcon.tsx:43-55` each independently spread a plain object
   (`{ testID, ...realProps }`) onto a Skia host element to smuggle a
   test-only `testID` past Skia's prop types (which don't declare it), each
   with its own near-identical comment re-deriving the same TS
   excess-property-check rationale. The progress ledger shows this was a
   deliberate, reviewed reuse (task 2 → task 3), not an oversight, and both
   sites are correct and test-verified — so this is not a defect. But at 2
   occurrences with a plausible 3rd (any future Skia-drawn shape needing a
   test hook), it's a good candidate for either (a) a tiny shared
   `withTestID(props, testID)` spread helper in `src/shared/ui/`, or (b) a
   local `.d.ts` module augmentation adding `testID?: string` to the
   relevant `@shopify/react-native-skia` prop types so the workaround
   disappears entirely at both call sites. Recommendation: do (b) next time
   a third occurrence appears; not worth a churn-only refactor today.

4. **`src/shared/ui/TabIcon.tsx:51` vs `:63` — inconsistent stroke-style
   syntax** (`style: 'stroke' as const` in an object literal for circles vs.
   `style="stroke"` as a bare JSX string for paths). Cosmetic only, same
   runtime value, no fix required.

## Cross-cutting checks (all clean)

- **Layering / imports:** `core/atmosphere` has zero React imports;
  `shared/ui/Skyline.tsx` and `TabIcon.tsx` import only from `core` and
  sibling `shared`; `app/TabBar.tsx` imports only from `shared`. No
  cross-feature imports (nothing in this diff touches `src/features`). No
  boundary violations against `.eslintrc.js`'s `boundaries/element-types`.
- **File/function size:** every changed file is well under 200 lines
  (largest: `AppNavigator.test.tsx` 152, `Atmosphere.tsx` 127 — the latter's
  function-length is pre-existing from M3 and this diff only adds 2 lines to
  it, out of scope here). No function in the diff approaches 40 lines.
- **`any` / `@ts-ignore` / `eslint-disable`:** none in any changed file
  (grepped `src/app/TabBar.tsx`, `TabIcon.tsx`, `Skyline.tsx`,
  `core/atmosphere/index.ts`).
- **No-hex lint:** no hex literals in any changed `shared/ui`/`app` file
  (grepped); `skylineColor()`'s `rgba(3,5,9,…)` is built in `core` per spec,
  keeping the UI layer opaque-string-only — matches both the letter (hex
  regex) and spirit (no color math in UI) of the rule.
- **Skia-under-jest consistency:** repo-wide grep for `Skia\.Path\.` returns
  zero hits — every path is passed string-form to `<Path path={d}/>`,
  consistent with both specs' explicit warning that `Skia.Path.*` throws
  under the jest mock and would crash the shipped `AppNavigator` tint tests
  (TabBar renders `TabIcon`). The props-spread testID trick (finding #3)
  doesn't loosen any *real* prop types — it spreads typed variables, and
  TS's excess-property check (the thing being routed around) only applies
  to fresh object literals, not spread variables; the underlying component
  prop contracts are unaffected.
- **PR #7 tint regression:** `git diff 341509a..7abb9e6 -- src/app/__tests__/AppNavigator.test.tsx`
  shows a pure append (2 new tests, +24/-0) — the 4 existing tint tests
  (`AC-9`, `AC-10`, both `AC 006-10`, and the unfocused-Teraz dim test) are
  byte-identical to base. Confirmed unmodified and still exercising the
  same `makeTabBar` tint logic (unchanged signature/behavior per
  `git diff … -- src/app/TabBar.tsx`).
- **Design fidelity (source-verified):**
  - `SKYLINE_PATH` (010 AC-1) is byte-identical to
    `design/Powietrze.dc.html:34`'s `<path d="…">`.
  - `skyline()`/`skylineColor()` formulas match
    `design/Powietrze.dc.html:560`'s `skylineStyle` (`filter: blur(den*7)`,
    `opacity: 1-den*0.45`, `color: rgba(3,5,9,0.72-den*0.32)`) exactly.
  - `ICON_PATHS` (011 AC-1) is byte-identical to the three inline `<svg>`s
    at `design/Powietrze.dc.html:256,260,264` (teraz/miejsca/ustawienia
    paths + circles).
  - The uniform `strokeJoin="round"` applied to all three icons (design only
    specifies `stroke-linejoin:round` on miejsca/ustawienia, not teraz) is
    explicitly called out and justified in spec 011's "Resolved
    ambiguities" — not a defect.
  - `›` chevron and true backdrop blur are explicitly out of scope in spec
    011's Non-goals; correctly absent from the diff.
- **Dead code / speculative abstraction:** none found beyond finding #1's
  duplication (which is regressive, not speculative) and finding #3's
  duplication (which is deliberate reuse, not dead).

## AC-coverage sanity note

**010-skyline:**
- AC-1 (path/viewBox/top-ratio literal fixture) — ✓ tested,
  `src/core/atmosphere/__tests__/skyline.test.ts:12-16`.
- AC-2 (`skyline()` blur/opacity) — ✓ tested, same file `:18-22`.
- AC-3 (`skylineColor()` rgba/rounding) — ✓ tested, same file `:24-28`.
- AC-4 (UI render: group/blur/path props) — ✓ tested,
  `src/shared/ui/__tests__/Skyline.test.tsx:13-20`.
- AC-5 (manual simulator screenshots) — correctly deferred; progress ledger
  (`.superpowers/sdd/2026-08-13-m-design-fidelity/progress.md`) confirms
  "Task 5: native run + manual ACs … pending (human-dependent)";
  `docs/harness/evidence/10/` does not yet exist, as expected.

**011-tabbar:**
- AC-1 (`ICON_PATHS` literal fixture) — ✓ tested,
  `src/shared/ui/__tests__/TabIcon.test.tsx:5-22`.
- AC-2 (`TabIcon` stroke/color/testID) — ✓ tested, same file `:24-29`
  (only the `teraz` variant is exercised; spec's Verification text doesn't
  require all three, so this is acceptable, not a gap).
- AC-3 (icon above label, `type.tab`) — **partially** tested: icon presence
  is covered by `AppNavigator.test.tsx`'s new "AC-3/AC-4" test, but the
  vertical-stack/gap-4 layout and the label's numeric `type.tab` values are
  not asserted anywhere — see Important finding #2.
- AC-4 (tint on icon + label) — ✓ tested, same new test +
  pre-existing tint tests for the label half.
- AC-5 (bar geometry) — **not tested** — see Important finding #2. Not
  marked manual in the spec, so this is a genuine DoD gap, though the
  implementation values do match the spec on inspection.
- AC-6 (a11y `accessibilityState.selected`) — ✓ tested,
  `AppNavigator.test.tsx`'s new "AC-6" test.
- AC-7 (manual simulator screenshots) — correctly deferred, same as 010
  AC-5; `docs/harness/evidence/11/` does not yet exist, as expected.

## Skia-testID pattern ruling

Fine as-is; not causing any real defect. At 2 occurrences with deliberate,
reviewed reuse across tasks, it doesn't yet meet the bar for extraction, but
recommend collapsing it into a `.d.ts` type augmentation (adding
`testID?: string` to the relevant Skia prop types) the next time a third
call site needs it, rather than adding a third copy of the spread + comment.

## Severity counts

Critical: 0
Important: 2
Minor: 2
