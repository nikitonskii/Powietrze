# SDD ledger — plan: docs/superpowers/plans/2026-08-13-m-teraz-detail.md

Branch: feature/m-teraz-detail (off m-design-fidelity tip / PR #9; chain #3→…→#9 precede)
BASE (pre-build HEAD): 8131182
Spec: 012 (11 ACs). Critic-vetted (SHIP-WITH-FIXES → B1+S1-S6+nits folded in).
Pre-flight: clean. Load-bearing: getCurrentReading stays cheap (list); getDetail active-place-only via usePlaceDetail; nearest station resolved ONCE (shared Kraków fallback); Promise.allSettled per-pollutant isolation; no-hex via glass tokens/scene; core 100% coverage.

Tasks:
- Task 1: complete — 1e0f26a, 3 tests (6 in air), tsc 0, core cov 100%. Reviewer: SPEC ✅ / QUALITY APPROVE, clean. Circular import resolved (export * after indexFromPm25).
- Task 2: complete — 8beceeb, mappers 8/8 (gios 16/16, full 148/148), lint+tsc 0. Reviewer: SPEC ✅ / QUALITY APPROVE, clean. findPm25SensorId/parseLatestPm25 behavior preserved.
- Task 3: complete — 70cc85f, gios 6 suites/21 (full 45/153), lint+tsc 0. Reviewer: SPEC ✅ / QUALITY APPROVE. AC-6/6b(rejecting fetch)/6c(shared memoized station, geo called once) all genuinely tested; nearest behavior preserved. Local non-exported `SourceWithDetail` type in source.ts (core AirQualitySource untouched) — strict subtype, no collision with Task 4's optional getDetail?. Minor (report-accuracy nit only). NOTE Task 4: add getDetail? to core AirQualitySource; source.ts's local type can optionally be dropped after.
- Task 4: complete — 036d9d1, place 4 suites/9 (full 46/156), lint+tsc 0. Reviewer: SPEC ✅ / QUALITY APPROVE, clean. usePlaceDetail mirrors usePlaceReading (placeKey-keyed); getDetail? added to core AirQualitySource; detail wired into ActivePlaceContext. (SourceWithDetail left as-is — fine.)
- Task 5: complete — 631b683, 4 tests, lint+tsc 0. Reviewer: SPEC ✅ / QUALITY APPROVE, clean. HistoryChart (bar-<i> real style reads) + PollutantTiles + glass/glassBorder tokens; glyphs correct.
- Task 6: complete — d804993, TerazScreen 5/5 (full 48/162), lint+tsc 0. Reviewer: SPEC ✅ / QUALITY APPROVE, clean. Scrollable Teraz; chart/tiles under Hero guarded by detail; existing tests preserved; layout centering→top-align deviation ruled reasonable.

ALL 6 CODE TASKS DONE. Full suite 48 suites/162 tests, lint+tsc 0, core cov 100%. Remaining: Task 7 (native run + manual AC-11 + journal).
- Task 7: native run + manual AC-11 + journal — pending (human/sim)

- Final whole-branch review: APPROVE-WITH-NITS (0 Critical, 2 Important, 3 Minor) → all 5 fixed in one round (e8c353a): dropped redundant SourceWithDetail, fixed AC-8 label collision (→spec-002 AC-8), added design clock icon to chart header (Skia), AC-6c geo-success coverage, sensors400_noNo2 fixture. Gate after fix: 48 suites/163 tests, lint 0 err, tsc 0.
- Verify: controller ran full suite (163 green) + final review traced AC-1..10 to tests; AC-11 = manual sim (Task 7).
- MILESTONE CODE COMPLETE.
