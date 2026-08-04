# Journal 00 — Bootstrap (M0)

**Date:** 2026-08-04 · **Plan:** docs/superpowers/plans/2026-08-04-m0-bootstrap.md

## What the harness gained
- CLAUDE.md v1 — always-loaded constitution (≤150 lines, pointers only).
- OS sandbox + permission boundary (.claude/settings.json): gates run
  free, irreversible actions are impossible, design/ is read-only.
- post-edit-check.sh — first in-loop feedback hook (prettier → eslint →
  tsc, exit-2 stderr feedback).
- CI gate (lint/typecheck/test); branch protection on main pending the
  human setup steps below (see Deviations note).
- Docs skeleton: NFRs, delegation guide, ADR-001.

## Why each piece (which failure/need exposed it)
- **CLAUDE.md v1** (Task 4) — the harness spec's Layer-1 doc model (§11):
  a hard-capped, always-loaded rulebook so every agent shares the same
  architecture/style/DoD rules without paying to re-derive them per task.
- **Sandbox + permission rules** (Task 5) — containment (§8): gates
  (`npm test`/`tsc`/`eslint`) must run unprompted for the loop to be
  practical, while irreversible actions (`git push`, `rm -rf`, secret
  reads, edits under `design/`) must be structurally impossible, not just
  discouraged.
- **post-edit-check.sh** (Task 6) — containment (§8) + token economy (§12,
  "mechanize before you verbalize"): the first deterministic PostToolUse
  hook, so format/lint/type errors are fed back to the agent immediately
  (exit 2 + stderr) instead of surviving to a later, more expensive gate.
- **CI gate** (Task 7) — quality gates (§7) and containment (§8): the
  outer, unavoidable check that runs the same three scripts the hook runs,
  so nothing merges on an unverified claim.
- **Docs skeleton** — NFRs (§11, measurable non-functional requirements
  with a check method), delegation guide (§11, the human↔agent task
  contract used by every future spec), ADR-001 (§11, one record per
  hard-to-reverse decision — here, bare RN over Expo for the WidgetKit
  target in M8).
- **Design handoff import (Task 1)** and **repo layout** (Task 2, Task 3)
  — repository layout (§4): `design/` as the read-only source of truth,
  and the `lint`/`typecheck`/`test` script names that both the hook and CI
  depend on being stable.

## Deviations & failures
- **Task 2 — RN version drift.** The plan assumed React Native 0.85.x;
  `npx @react-native-community/cli@latest init` scaffolded **0.86.2**
  instead. The scaffold commit message (`f74e3da`) was amended to
  `aaafee2` to state "React Native 0.86" rather than leave a commit
  message that contradicted the actual dependency versions.
- **Task 2 — `.gitignore` merge collision.** The plan's merge step used
  `rsync -a --ignore-existing` specifically so the template wouldn't
  clobber existing repo files, but that same flag meant the template's
  `.gitignore` (which must ignore `ios/Pods/` and `node_modules/`) could
  not land over the pre-existing `.gitignore`. The implementer manually
  merged the template's ignore rules into the existing `.gitignore`,
  preserving the pre-existing `.omc/` entry, so both the harness's own
  ignore needs and the RN template's Pods/node_modules ignore constraint
  were satisfied.
- **Task 2 — Node floor stricter than planned.** The scaffolded
  `package.json` declares `"engines": { "node": ">=22.11.0" }`, tighter
  than the plan's assumed Node ≥ 20.19.4 floor (itself derived from RN
  0.85's requirement). The effective project floor is therefore
  **Node 22.11+**, not 20.19.4. This was recorded as a deferred minor in
  the execution ledger and resolved by controller amendment in Task 7:
  CI's `setup-node` step uses `node-version: '22'` instead of the plan's
  literal `'20.19.4'`.
- **Task 3 — dispatch interruption.** One task's agent dispatch was
  interrupted mid-run after it had already committed its work. The
  re-dispatched agent detected the existing commit, verified it against
  the task's acceptance criteria rather than assuming it was correct, and
  re-ran the RED/GREEN evidence (the failing-then-passing typecheck
  probe) instead of redoing or duplicating the work.
- **Process-level — dropped final messages.** Across the milestone,
  subagent final messages were repeatedly dropped by the harness before
  reaching the controller, making outcomes unverifiable from the
  transcript alone. The process adapted: every dispatched agent is now
  required to write its report/review to a file before returning its
  final message, so the artifact survives even if the message itself is
  lost. This was carried forward as a standing process rule for all
  future milestones.
- **Inherited, not introduced — `npm audit`.** `npm audit` reports 7
  moderate-severity vulnerabilities inherited from the React Native
  community template's own dependency tree. None were introduced by M0
  work (no new dependencies were added, per the plan's global
  constraints); left as-is for M0 and not treated as a harness defect.
- **Task 9 — `main` unpushed, branch protection not yet applied.** `main`
  was created locally per the plan (Task 9, Step 3) and points at this
  journal's commit, but per the plan's Step 4 the push and branch
  protection are human-only actions and have not happened yet as of this
  entry: `origin` is configured (`git@github.com:nikitonskii/Powietrze.git`)
  but the remote has no refs, so neither `main` nor `develop` has been
  pushed, and GitHub branch protection cannot exist until they are. See
  the manual checklist in the Task 9 report for the three remaining human
  steps.

## Retro → rules
Promoted this milestone:
1. **Node floor correction** — the project's real floor is Node 22.11+
   (from the RN template's `engines` field), not the plan's assumed
   20.19.4. CI's `node-version` was amended to `'22'` in Task 7 to match;
   this journal is now the durable record of the corrected floor for M1+.
2. **Reports-as-files process rule** — because subagent final messages
   were repeatedly dropped, every dispatched agent must write its
   report/review to a file before its final message. This is now a
   standing rule for all future task dispatches, not a one-off workaround.

Open retro candidates carried to M1 (deferred minors from the ledger, not
yet promoted to a rule):
- The post-edit hook checks `[ -f "$FILE" ]` before `cd`-ing into the
  project root, which assumes a particular invocation-time working
  directory. Not yet hardened; revisit if it misfires under a different
  invocation context.
- `tsc --noEmit` in the hook runs a full project-wide typecheck on every
  single edit rather than an incremental/file-scoped check, so hook
  latency grows with project size. Both are plan-mandated design costs
  for M0's "one feedback hook" scope, not bugs — candidates for tightening
  once the codebase is large enough for the cost to be felt.

## Cost
≈0.9M tokens (≈0.8M subagent + controller overhead), 9 tasks, 9 reviews,
1 fix-amend. Controller-measured approximation, not a metered figure.
