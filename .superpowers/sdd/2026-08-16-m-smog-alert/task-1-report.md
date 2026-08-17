# Task 1 report — Core alert logic (`src/core/alert`)

**Plan:** `docs/superpowers/plans/2026-08-16-m-smog-alert.md`, Task 1.
**Spec:** `docs/specs/019-smog-alert.md` — Design "Core — pure alert logic" + AC-1, AC-2, AC-2b.

## Files

- Created `src/core/alert/index.ts` — exact code from the plan's Task 1 Step 3 block:
  `QUIET_START_HOUR` (22), `QUIET_END_HOUR` (7), `isQuietHour(now)`, `SmogInput`,
  `SmogDecision`, `smogAlertDecision(prev, input)`.
- Created `src/core/alert/__tests__/decision.test.ts` — failing tests written first (TDD),
  verified red (`Cannot find module '..'`) before implementation existed, then green.

## Tests (9, all citing AC IDs)

`src/core/alert/__tests__/decision.test.ts`:

- **AC-1** `isQuietHour — true at 22:00, 23:30, 00:00, 06:59; false at 07:00, 12:00, 21:59`
  — frozen local `Date`s via an `at(h, m)` helper (`new Date(2026, 7, 16, h, m, 0, 0)`).
- **AC-2** (`describe` block, 7 tests):
  - rising edge (prev `false`, `index >= threshold`, `alertOn: true`, not quiet) → `{fire:true, wasAbove:true}`
  - staying above (prev `true`) → `{fire:false, wasAbove:true}`
  - dropping below → `{fire:false, wasAbove:false}`
  - re-crossing after a drop fires again (chains two calls)
  - `alertOn: false` never fires regardless of index, resets `wasAbove` to `false`
  - quiet + above suppresses and freezes `prev.wasAbove` (checked both from `true` and `false` prev)
  - `index === threshold` counts as above (`fire:true`)
- **AC-2b** `crossing that begins during quiet hours fires once when quiet ends` — 4 chained
  calls: below+quiet (no fire, not above) → crosses above while still quiet (suppressed,
  frozen at `false`) → quiet ends, still above (fires once) → next ready reading, still
  above, non-quiet (does not re-fire). `wasAbove` threaded from each call's result into the next.

## Gate results

- `npm run typecheck` — clean, no errors.
- `npm run lint` — 0 errors, 4 pre-existing warnings unrelated to this change (App.tsx inline
  style, gios/mappers.ts eslint-comments, HistoryChart.tsx / Toggle.tsx inline styles).
- `npm test -- --coverage` — **60 suites / 233 tests passed**, exit code 0, no
  "coverage threshold not met" failure. `core/alert` coverage: **100% stmts / 100% branch /
  100% funcs / 100% lines**.

## Commit

`8296f849fcade51fd3d3d1167ac0f86c8811e424` — `feat(core): smog alert decision + quiet hours (AC-1, AC-2)`
(2 files changed, 158 insertions: `src/core/alert/index.ts`, `src/core/alert/__tests__/decision.test.ts`).

## Deviations

None. Implementation matches the plan's Task 1 Step 3 code block verbatim. Test file path,
name, and AC citations match the plan/spec exactly. Scope held to Task 1 only — no changes to
Notifier, data/notifications, shared/alert, settings defaults, or Ustawienia.
