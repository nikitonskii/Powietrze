# SDD ledger — plan: docs/superpowers/plans/2026-08-15-m-pollutant-tiles.md
Branch: feature/m-pollutant-tiles (off feature/m-notifications tip / PR #14; chain #3→…→#14 precede)
BASE: 4d02288345b768d7c40aae6ed45911cf35671e80
Spec: docs/specs/016-pollutant-tiles.md · Critic: SHIP-WITH-FIXES (B1/B2 + S1-S8 folded). Human approved data-driven grid (supersedes design/README.md:80).
Load-bearing: catalog+order single-sourced in POLLUTANTS; label derived in UI (not stored); Number.isFinite filter AFTER allSettled (all-null settles fulfilled/undefined); sub-1 formatPollutant 2dp; grep guard scoped to ReadingDetail (NOT src/core/scene pm10/no2).

Tasks:
- Task 1: complete — d91de48, 2 tests (AC-1 catalog literal, AC-2 formatPollutant table), full 55 suites/195, core 100%. Review: SPEC PASS / QUALITY APPROVE, zero findings.
- Task 2: complete — da83510, AC-3a/3b/3c + AC-4/5, 55 suites/198 tests, lint 0, tsc clean, core 100%, completion-guard empty. Review: SPEC ✅ / QUALITY APPROVE, 0 blockers/0 should-fix, 2 nits (deferred).
  minor (deferred): detail.test.ts failure-isolation describe labeled 'AC-3' (carried-forward regression, not spec-016 AC); getData_allnull.json reused for AC-3c is empty-array not all-null-entries (behaviorally identical, spec-sanctioned).
- AC-6 manual: DONE — live sim 2×2 grid (PM10 13, NO₂ 29, CO 239, C₆H₆ 0.20 — sub-1 formatting confirmed). evidence/16/01.

Final:
- Final whole-branch review: APPROVE-WITH-NITS (0 Critical/0 Important). 3 nits applied (commit after da83510): resolvePollutants any→unknown; detailFor Promise.all + history.catch (dropped unreachable branch, kept concurrency); detail.test.ts relabel failure-isolation describe. Other nits (empty all-null fixture, non-null assertion) accepted/no-action.
- Verifier: PASS — AC-1..5 all VERIFIED with real (non-tautological) executable evidence; AC-6 MANUAL-OK (evidence/16/01). Gate 55 suites/198 tests, lint 0, tsc clean, core 100%, guard empty.
- Pushed feature/m-pollutant-tiles; PR #15 (base feature/m-notifications) — https://github.com/nikitonskii/Powietrze/pull/15. MILESTONE COMPLETE.
- Human at merge: confirm design/README.md:80 supersession sign-off.
