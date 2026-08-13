# SDD ledger — plan: docs/superpowers/plans/2026-08-12-m-miejsca-gestures.md

Branch: feature/m-miejsca-gestures (stacked on feature/m-miejsca-data-ux / PR #5)
BASE (pre-build HEAD): 8d95c6c

- Task 1: complete — b006a3d, 3 tests, lint+tsc 0
- Task 2: complete — ad51bc0, 3 suites/6 tests, tsc+lint 0
- Task 3: complete — 650dee1, RNGH@3.1.0 + pod + ADR-012 + jest transformIgnore/jestSetup + GestureHandlerRootView flex:1. Full suite 30/104 green (B1 ESM blocker handled).
- Task 4: complete — 8d163d7, FavoriteRow swipe-delete; needed jest.setup ReanimatedSwipeable mock (bundled reanimated mock lacks isSharedValue/useHandler) + colors.danger. Full suite 31/105.
- Task 5: complete — ecf4c14, DraggableFavorites + wiring; GestureDetector needed GestureHandlerRootView in the favorites test; id-keyed rows (guard holds). Full suite 31/105, tsc+lint 0.
- Task 6: complete — 0c18fc4, native rebuild OK (RNGH links on New Arch, boots non-blank); journal 08 + boot evidence; interactive gestures offered to human.
- ALL 6 TASKS DONE. Full gate: 31 suites/105 tests, lint+tsc 0.
- Verifier: 4/5 ACs VERIFIED (008-1/2/3/4, 100% core cov); 008-5 partial (native boot proven; interactive gestures need human taps).
- Reviewer: APPROVE (all load-bearing clean). Should-fix + nits fixed in 2326f52 (useReorderGesture extraction, comment attribution, AC 008-4 test tag).
- DONE — spec 008 complete. Open: AC 008-5 interactive gesture walkthrough (human), push/stacked PR #? decision. PR chain now #3→#4→#5(+007,008 to push).
Note: Task 3 (RNGH dep + config) is native/config — do inline (npm/pod sandbox). Task 4 is the first RNGH consumer; watch the jest-render-of-swipe-action uncertainty (plan has a fallback).
