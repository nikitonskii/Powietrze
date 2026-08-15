# Task 1 review — pollutant catalog + formatPollutant (core)

## Verdicts

1. **SPEC**: PASS — AC-1 and AC-2 both satisfied, pinned as exact-literal/table tests citing the right AC IDs, not tautologies.
2. **QUALITY**: APPROVE — clean, additive, in-scope, no CLAUDE.md violations found.

## Verification performed
- Read src/core/air/pollutants.ts, src/core/air/index.ts (diff hunk), both new/modified test files, in full, as committed (not just diff narrative).
- Ran npx jest src/core/air -- 4 suites / 12 tests, all pass.
- Ran npx tsc --noEmit -p . -- clean, no errors.
- Ran npx eslint . -- 0 errors, 4 pre-existing warnings, none in files touched by this task (matches report claim exactly).
- Confirmed formatConcentration's body is byte-identical before/after (diff only inserts formatPollutant after it, not a modification).
- Confirmed core-purity: pollutants.ts and the diff to index.ts have zero React/data imports (only pre-existing core-internal type imports).
- Confirmed file/function sizes: pollutants.ts 26 lines; formatPollutant 4 lines. Well within the 200-line/40-line limits.
- Confirmed PollutantReading has no label field (spec requirement, S6) -- only { code, value }.
- Ran the spec's completion guard grep -- it DOES still find hits in history.ts, TerazScreen.tsx, PollutantTiles.tsx, and several test files. Expected and correct: spec scopes those changes to Task 2; this task's report and commit correctly state ReadingDetail was intentionally not touched. Not a Task 1 finding.
- Numeric edge cases hand-verified: (0.999).toFixed(2) === '1.00'; Math.round(-0.35) === -0 -> String(-0) === '0'.

## AC-1 detail
POLLUTANTS in src/core/air/pollutants.ts:9-16 is the exact 6-entry literal from spec, correct order, codes, labels incl. subscript glyphs. Test pins the whole array via toEqual, citing AC-1. Real behavior test.

## AC-2 detail
formatPollutant in src/core/air/index.ts is a clean delegation: 0 < value < 1 -> toFixed(2); else formatConcentration(value, precision) unchanged. No forked logic. Test in scale.test.ts covers the full AC-2 table incl. negatives (compared directly against live formatConcentration calls, not hardcoded), non-finite -> '-', boundary 0.999 -> '1.00'.

## Findings
None -- no blockers, no should-fix, no nits.

## Cannot verify from diff/repo alone
None.
