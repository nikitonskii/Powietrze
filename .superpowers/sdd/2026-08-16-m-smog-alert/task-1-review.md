# Task 1 review — core alert logic (`src/core/alert/index.ts`)

**Diff:** `.superpowers/sdd/2026-08-16-m-smog-alert/task-1.diff`
**Spec:** `docs/specs/019-smog-alert.md` §Design "Core — pure alert logic", AC-1, AC-2, AC-2b
**Plan:** `docs/superpowers/plans/2026-08-16-m-smog-alert.md` Task 1

## Verdicts

- **SPEC:** ✅ — AC-1, AC-2, and AC-2b are all satisfied and covered by real, non-trivial tests.
- **QUALITY:** APPROVE — pure core, TS strict clean, no `any`, correct precedence/freeze/reset logic, small and single-responsibility.

## What was checked

- Read `src/core/alert/index.ts` (28 lines) and `src/core/alert/__tests__/decision.test.ts` (130 lines) directly from the worktree (not just the diff).
- Ran `npx tsc --noEmit -p tsconfig.json` — clean, no errors.
- Ran `npx jest src/core/alert` — 9/9 tests pass.
- Traced every branch of `smogAlertDecision` by hand for double-fire / never-re-fire bugs.
- Compared implementation against the plan's Step 3 code block (`docs/superpowers/plans/2026-08-16-m-smog-alert.md`) — verbatim match.

## Implementation (for reference)

```ts
export function smogAlertDecision(
  prev: { wasAbove: boolean },
  input: SmogInput,
): SmogDecision {
  if (!input.alertOn) return { fire: false, wasAbove: false };
  if (isQuietHour(input.now)) return { fire: false, wasAbove: prev.wasAbove };
  const above = input.index >= input.threshold;
  return { fire: above && !prev.wasAbove, wasAbove: above };
}
```

## AC verification

- **AC-1** (`isQuietHour`): `h >= 22 || h < 7`, tested at 22:00/23:30/00:00/06:59 (true) and 07:00/12:00/21:59 (false) with frozen `Date` literals. Correct.
- **AC-2** (decision table), all branches traced:
  - rising edge (prev false, above, alertOn, not quiet) → `{true, true}` — verified
  - staying above (prev true, above) → `fire = true && !true = false`, `wasAbove = true` → `{false, true}` — verified, no re-fire
  - dropping below (prev true, below) → `above = false` → `{false, false}` — verified, resets
  - re-cross after drop → prev `{wasAbove:false}` then above again → `{true, true}` — verified, fires again, no never-re-fire bug
  - alert off → short-circuits to `{false, false}` regardless of index/quiet/prev — resets so re-enabling re-arms — verified
  - quiet + above → `{false, prev.wasAbove}` (freeze, confirmed it returns `prev.wasAbove` and not a hardcoded `false`) — verified
  - `index === threshold` → uses `>=`, counts as above — verified
- **AC-2b** (composed quiet-crossing): 4-step sequence in the test is a genuine composed case, not degenerate:
  1. below threshold, quiet → `{false,false}`
  2. crosses above threshold, still quiet → frozen at `{false,false}` (prev was false, quiet freezes at prev, not at actual current-above state)
  3. quiet ends, still above → `prev.wasAbove` is still `false` (frozen through step 2), so `fire = true && !false = true` → `{true,true}` — fires exactly once, on the first non-quiet evaluation
  4. next ready reading, still above, non-quiet → `{false,true}` — does not re-fire

  Manually verified the trickier edge case named in the review brief: a crossing that begins at 06:59 (which `isQuietHour` classifies as quiet, since `h=6 < 7`) is suppressed and `wasAbove` stays frozen at whatever it was before 06:59; at 07:00 (no longer quiet) the reading is evaluated normally against the frozen `prev`, so the crossing is not lost — it fires at 07:00. This matches the freeze design intent exactly.

  Also verified no double-fire when multiple quiet-hour readings all sit above threshold before quiet ends: `wasAbove` stays frozen at whatever it was before quiet began (not updated per-reading during quiet), so only the first non-quiet evaluation can produce `fire = true`, and every quiet reading is a no-op on the frozen state.

## Quality checks

- **Core purity:** `src/core/alert/index.ts` imports nothing; only depends on the global `Date` type. Zero React, zero data-fetching imports. Confirmed via `grep -rn "^import" src/core/alert/` — only the test file imports (from `..`).
- **TS strict / no `any`:** `tsconfig.json` extends `@react-native/typescript-config` (strict by default); `npx tsc --noEmit` is clean; no `any` anywhere in the file.
- **Size:** file is 28 lines (limit 200); longest function (`smogAlertDecision`) is 9 lines (limit 40, single responsibility — no "and" needed to describe it).
- **Precedence:** implementation order is `alertOn` check → `isQuietHour` check → normal crossing logic, exactly matching the spec's stated precedence "off → quiet → normal".
- **Naming:** `isQuietHour`, `smogAlertDecision`, `SmogInput`, `SmogDecision`, `QUIET_START_HOUR`/`QUIET_END_HOUR` all match the plan's produced-interfaces list verbatim; consistent with existing `src/core` module naming conventions.
- **Tests:** behavior-based (not snapshots), frozen `Date` literals (no fake timers needed since `Date` is constructed directly in local time and read back via `getHours()`, so results are timezone-consistent regardless of the running machine's TZ). Test names / `describe` blocks cite AC-1, AC-2, AC-2b. No test asserts nothing or merely restates the implementation — each asserts a concrete `{fire, wasAbove}` outcome per spec row.
- **Scope:** diff is scoped exactly to Task 1 (`src/core/alert/index.ts` + its test) per the plan; no scope creep into Task 2 (Notifier seam / adapter / provider), which is correct since those are separate tasks.

## Findings

None. No Critical, Important, or Minor findings.

No "cannot verify from diff" items — all claims were verified directly against the live file in the worktree, plus `tsc` and `jest` runs.
