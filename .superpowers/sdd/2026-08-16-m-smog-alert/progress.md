# SDD ledger — plan: docs/superpowers/plans/2026-08-16-m-smog-alert.md
Branch: feature/m-smog-alert (off feature/m-refresh; PR base will be feature/m-refresh; chain #3→…→#17 precede)
BASE: 8c31ca55cc44c54c8ec293fbd28637e4f872b402
Spec: docs/specs/019-smog-alert.md · Critic: SHIP-WITH-FIXES (B1 + S1-S4 + M1-M4 folded). State machine verified correct.
Load-bearing: per-place dedup via Map<placeKey,bool> (S2); only status==='ready' evaluated (S4); notifySmog on EVERY Notifier double incl. fakeNotifier (S1 typecheck); alert default true→false (M2, no launch prompt); injectable now clock (S3); approved copy (M4); createChannel before displayNotification (M3). Foreground path uses installed @notifee.displayNotification (NO native gate); background BGTaskScheduler deferred.

Tasks:
- Task 1: complete — 8296f84, AC-1/2/2b (9 tests). Review: SPEC ✅ / QUALITY APPROVE, 0 findings. Gate 60 suites/233, core/alert 100%.
- Task 2: complete — ab59b43, AC-3. Review: SPEC PASS / QUALITY APPROVE, 0 findings. typecheck clean (all Notifier doubles updated), 234 tests.
- Task 3: complete — 87694d2 + fix f0e1659. AC-4. Review: SPEC ✅ / QUALITY CHANGES-NEEDED → resolved (split 365-line test into harness+crossing+perPlace+permission all ≤200; added real S4 stale-not-evaluated test; comment/init nits). Verified directly: S4 test genuine, gate 242 tests green, core 100%.
- Task 4: complete — c5d8116, AC-5 + alert default false. Review: SPEC PASS / QUALITY APPROVE. Gate 62 suites/243. Minor (final-review triage): the `soon`/Wkrótce mechanism now has ZERO callers → dead code; consider removing the soon prop from SettingRow/ToggleRow/StackedRow + the wkrotce test.
- Task 5 (manual AC-6 + journal): PENDING human

Final:
- Whole-branch review: APPROVE-WITH-NITS → dead soon/Wkrótce affordance removed (b5e7594). Verifier: AC-1..5 VERIFIED; AC-6 PENDING-MANUAL. Gate 62 suites/243, lint 0, core 100%.
- MILESTONE COMPLETE (pending manual AC-6). PR #18 base feature/m-refresh. NOTE: after this, NO "Wkrótce" tags remain in Settings.
