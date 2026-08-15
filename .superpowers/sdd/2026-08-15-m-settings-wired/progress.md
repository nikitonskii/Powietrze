# SDD ledger — plan: docs/superpowers/plans/2026-08-15-m-settings-wired.md
Branch: feature/m-settings-wired (off fix/miejsca-swipe-bleed tip / PR #12; chain #3→…→#12 precede)
Spec: 014 (AC-1..9). Critic: SHIP-WITH-FIXES → B1 (US-AQI table/gap/NaN) + B2 (test fallout) + S1-S5 folded in.
Load-bearing: US-AQI truncate-to-0.1 (no NaN); color ALWAYS CAQI; loc effect keys on settings.loc only; settings read in TerazScreen/PlaceRow (Hero/tiles pure via props); FULL suite must stay green (existing tests updated per-task).
Tasks:
- Task 1: complete — ef218ce, AC-1..3/4b, tsc 0, full suite 171 pass (core cov 100%). Reviewer: SPEC ✅ / QUALITY APPROVE, clean.
- Task 2: complete — 1dfe443, 4 tests, tsc 0. Self-reviewed (7-line pure ternary, exact per brief, AC-4 test passes) — clean.
- Task 3: complete — 907f77a, full suite 51/177, lint+tsc 0. Reviewer: SPEC ✅ / QUALITY APPROVE, clean. spec-002 tests preserved (SettingsProvider added). Hero/PollutantTiles pure; TerazScreen reads settings.
- Task 4: complete — a2e17d0, full suite 51/178, lint+tsc 0. Self-reviewed from the full diff: displayValue used, color stays scene(reading.index).key, PlaceRow/MiejscaScreen tests wrapped in SettingsProvider, AC-5 test present — clean.
- Task 5: complete — 2e6d13e, full suite 51/181, lint+tsc 0. Reviewer: SPEC ✅ / QUALITY APPROVE. Effect loop-safe (keys on settings.loc, not the fresh place obj); minor (deferred): one harmless extra mount re-render, no refetch (placeKey unchanged). App wired defaultStation=KRAKOW_STATION.
- Task 6: complete — bb3e2ea, 6/6 (full 181), lint+tsc 0. Reviewer: SPEC ✅ / QUALITY APPROVE; rewritten AC-18/21 tests genuine (widget absent, tag state correct).

ALL 6 CODE TASKS DONE. Full suite 51 suites/181 tests, lint+tsc 0, core 100%. Remaining: Task 7 (native + manual AC-9 + journal).
- Task 7: journal committed. Final review APPROVE-WITH-NITS (0 Crit/0 Imp, 4 Minor cosmetic/accepted → deferred fast-follows). Gate re-confirmed 51/181, core 100%. Manual AC-9 (Ustawienia toggles) offered to human. MILESTONE A COMPLETE.
