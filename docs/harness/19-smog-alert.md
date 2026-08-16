# Journal 19 — M-smog-alert (foreground slice)

**Spec:** `docs/specs/019-smog-alert.md` (AC-1..6) · **Plan:** `docs/superpowers/plans/2026-08-16-m-smog-alert.md`
**Branch:** `feature/m-smog-alert` (off `feature/m-refresh`/PR #17; chain #3→…→#17 precede) · **PR:** #18
**Built:** 2026-08-16, subagent-driven (4 code tasks, per-task review each) + whole-branch review + verifier. **No new dependency** (@notifee already installed).

## What shipped
Gives `alert`/`threshold` + fixed quiet-hours a consumer: on a **rising CAQI-index crossing** of `threshold`, with `alert` on and outside 22:00–07:00, fire a local smog notification (deduped **per place**). Un-tags the last three POWIADOMIENIA rows — **no "Wkrótce" remains anywhere in Settings.**
- **`core/alert`** — `isQuietHour` + `smogAlertDecision` (pure state machine: rising-edge fire, alert-off reset, quiet-freeze).
- **`Notifier.notifySmog`** → `@notifee.displayNotification` (already installed — no native gate); approved design copy.
- **`SmogAlertProvider`** — per-place `Map` dedup, `ready`-only eval, injectable clock, permission deny-revert (mirrors NotificationsProvider).
- **`alert` default `true→false`** (opt-in) so it never fires an unprompted launch permission dialog.

## Design decisions (critic SHIP-WITH-FIXES)
- Critic **verified the state machine correct** (no hysteresis bug). Folded: B1 (alert was soon-tagged → un-tag all three), S1 (`notifySmog` on every Notifier double or typecheck reds), S2 (**per-place dedup by placeKey** — a single global ref would re-fire on place switch-back / miss a distinct bad place), S3 (injectable `now` for the quiet test), S4 (only `ready` evaluated — a `stale` reading carries a value and must not mis-drive `wasAbove`), M2 (opt-in default), M3 (createChannel before display), M4 (approved copy).
- **Quiet-freeze kept**: a crossing that begins at 06:59 fires once at 07:00 (freeze `wasAbove` during quiet rather than reset).

## Process notes
- **Task 3 fix round:** the 365-line provider test was split into `harness.tsx` + `crossing`/`perPlace`/`permission` (all ≤200), and the **S4 stale-not-evaluated** case added (proves a stale reading neither fires nor corrupts `wasAbove`).
- **Whole-branch review APPROVE-WITH-NITS → fixed:** removed the now-**dead `soon`/Wkrótce** affordance (zero callers once all rows went live) — constitution "no dead code"; AC-5 (asserts the tags ABSENT) still holds.
- **Reusable gotcha:** a per-place foreground evaluator must key its dedup state by `placeKey` (not one global ref) — the active reading swaps on both refresh AND place switch; and only evaluate `status === 'ready'` (a `stale` reading retains a value that would mis-drive the state machine).

## AC coverage
Gate: 62 suites / 243 tests · lint 0 errors · typecheck clean · `src/core` 100%.
- **AC-1** isQuietHour · **AC-2/2b** smogAlertDecision table + composed quiet-cross ✓ (core).
- **AC-3** notifySmog → createChannel+displayNotification (approved copy) ✓.
- **AC-4** provider: rising fire / not staying-below-off-quiet-notready / re-cross / **per-place** / **stale (S4)** / permission deny-revert ✓.
- **AC-5** alert/threshold/quiet un-tagged + `alert` default false ✓.
- **AC-6 (manual)** — PENDING sim: enable Alert smogowy → permission prompt; low threshold → reading ≥ threshold fires once; staying above no re-fire; 22:00–07:00 suppresses.

Verifier: AC-1..5 all VERIFIED (non-tautological). Whole-branch review: APPROVE-WITH-NITS (dead-code nit fixed).

## Deferred
- **Closed-app alerts** — BGTaskScheduler background gate (runs the same `smogAlertDecision`); persisted per-place last-alerted state.
- Configurable quiet hours; per-pollutant thresholds.

<!-- MANUAL EVIDENCE (append after sim): docs/harness/evidence/19/. -->
