# Harness journal 01 — M1: Scene engine

**Milestone:** M1 · **Spec:** `docs/specs/001-scene-engine.md` · **Branch:** `feature/m1-scene-engine`

## What the harness gained
- **Spec template + first real spec** (`docs/specs/TEMPLATE.md`, `001`):
  13 ACs with computed expected values; every test cites an AC ID.
- **Verifier agent** (`.claude/agents/verifier.md`): audits AC IDs against
  its own test runs at step 7 of the feature loop — reports to a file.
- **Coverage gate:** `src/core` pinned at 100% (statements/branches/
  functions/lines) in `jest.config.js`; CI now runs `--coverage`.

## What the app gained
`src/core/scene`: `scene()`, `ramp()`, `bandOf()`, anchor/band/advice
data — the single source every visual derives from (spec 001 API).

## Deviations from the prototype (all spec'd, none silent)
- Hex output normalized to lowercase (prototype was mixed-case by path).
- Non-finite input throws `RangeError` (prototype mapped `NaN` to the
  worst band silently); negative input clamps to 0.

## Mid-build corrections (task reviews)
- Task 6 fix round: reverted unauthorized coverage exclusions; `@types/node`
  became an explicit devDependency with ADR-002 (human-approved exception to
  the plan's no-new-dependencies line); eslint now ignores `coverage/`.

## Retro — corrections became rules

1. **Plan-level defect: a circular test the eight task reviews could not
   see.** The AC-1 test asserted `ramp(v) === anchors[v]` — it proved
   `ramp` returns whatever `anchors.ts` stores, not the *design* colors.
   ~13 of 18 hex cells were pinned by nothing but a format regex; a
   transposed digit in the app's most important data would have shipped
   green. Caught only by the final whole-branch review (same catch-class
   as M0's `git push` hole). Fix: literal table fixture (commit 64cb1c1).
   → **Rule** (in `docs/specs/TEMPLATE.md`): any spec carrying a data
   table (colors, thresholds, copy) needs at least one test that pins the
   literal values, separate from tests that derive from them.

2. **Reports-as-files rule not self-enforcing.** The fix-wave implementer
   skipped its mandatory report file; the controller had to regenerate the
   RED/GREEN evidence. The prompt line alone is not enough.
   → **Rule:** the controller does not mark a fix round complete until the
   report file exists on disk. Candidate for a mechanical check (a
   dispatch wrapper or hook) at a later milestone — logged, not yet built.

3. **`no new dependencies` vs. a real need worked as designed.** The purity
   test needed Node typings; rather than silently leaning on a transitive
   `@types/node`, the reviewer surfaced it, the human ruled, and it landed
   as an explicit devDependency behind ADR-002. The escape hatch (ADR +
   human sign-off) is the intended path, not a workaround.

## Human-operated containment added this milestone
- GitHub branch-protection rulesets documented at
  `docs/harness/branch-protection.md`; `CLAUDE.md` Forbidden now points to
  it. Rulesets are the remote-side enforcement of the deny-list.
