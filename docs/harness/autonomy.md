# Harness — autonomy & isolation posture

How the agent is allowed to run unattended on this repo, and the walls that
make that safe. The principle is **safe by construction**: the agent runs
freely on everything reversible, and cannot reach anything irreversible or
outward-facing. Safety does not depend on the agent behaving — it depends on
the environment refusing.

## The layers (defense in depth)

Ordered outermost (hardest) to innermost:

1. **Remote branch-protection rulesets** — `main` and `develop` cannot be
   pushed directly or force-pushed; merge requires a PR. This lives on GitHub,
   so it holds even if everything local fails. See
   `docs/harness/branch-protection.md`. **The single most important wall.**
2. **Command sandbox** (`.claude/settings.json` → `sandbox`) — filesystem
   writes are confined to the worktree + scratch; network is a strict
   allowlist (`registry.npmjs.org`, `github.com`, `objects.githubusercontent.com`,
   `cdn.cocoapods.org`); `.env*` reads are denied. `failIfUnavailable: true`
   means the session refuses to start unsandboxed.
3. **Worktree isolation** — feature work happens in `.claude/worktrees/<name>`,
   never the main checkout. `worktree.bgIsolation: "worktree"` makes this a
   hard rule for background/autonomous sessions: they cannot Edit/Write the
   main working copy until they enter a worktree.
4. **Permission deny list** (`.claude/settings.json` → `permissions.deny`) —
   explicit block on irreversible/outward Bash even if the mode would allow it:
   `git push*`, `git reset --hard`, `git clean`, `git rebase`, `git restore`,
   `git checkout -- *`, `git branch -d/-D`, `git worktree remove`,
   `gh pr merge`, `rm -rf`, plus `design/` edits and `WebFetch`.
5. **Permission allow list** — the safe read-only / local / build commands that
   run without a prompt (lint/test/typecheck/jest/eslint/tsc/prettier, safe
   `git` inspection + branch/worktree-add, `npm install`, PR *create/view*).
   This layer only removes prompts; it never widens blast radius (the sandbox
   already bounds that).
6. **Feature-loop gates** — the reviewer agent (step 6) and verifier agent
   (step 7) are the automated quality wall; the human PR review is the final one.
7. **Post-edit hook** (`.claude/hooks/post-edit-check.sh`) — every Edit/Write
   is formatted, linted, and typechecked; failures are fed back to the agent.

## Single-repository scope (this repo only)

The agent must be able to affect **only `nikitonskii/Powietrze`**, never any
other repo — local or remote. This is enforced at two levels, and one of them
is human-only:

- **Local filesystem:** the sandbox confines writes to this project dir +
  scratch (`sandbox.filesystem`). The agent cannot write to other repos on
  disk. Already in force.
- **GitHub access — the real wall (human-only):** a `gh auth login` OAuth
  token is **account-wide** and reaches every repo; no Claude setting can
  narrow it. The only true repo-scoping is a **fine-grained Personal Access
  Token** with *Only select repositories → Powietrze*. Authenticate `gh` with
  that token. Give it the minimum: **Contents RW, Pull requests RW, Metadata
  read** (add Workflows/Actions only if needed). **Deliberately omit
  Administration** — so even holding the token the agent cannot alter branch
  protection or repo settings, reinforcing the human-only-admin boundary.
- **Command deny-list (secondary):** `permissions.deny` blocks cross-repo /
  destructive `gh` (`repo create|delete|clone|fork|rename|archive|edit`),
  credential management (`gh auth *`, so the agent can't swap its own token or
  print it via `gh auth token`), `gh secret *`, and `gh ruleset *` (can't edit
  its own guardrails). Prefix rules cannot parse `gh api repos/OTHER/...`, so
  this is defense-in-depth, not the wall — the PAT scope is.

## The autonomy dial

`permissions.defaultMode` controls how hands-off a run is. It is a **per-machine
choice**, so it lives in `.claude/settings.local.json` (gitignored), not the
committed team settings.

| Mode | Edits | Allowlisted Bash | Other Bash | Use when |
|------|-------|------------------|------------|----------|
| `default` | prompt | run | prompt | supervised / pairing |
| `acceptEdits` **(current)** | run | run | prompt | unattended per-branch, cautious |
| `auto` | run | run | classifier decides | truly unattended milestones |
| `bypassPermissions` | run | run | run | **do not use** — defeats the point |

- **`acceptEdits`** (the current setting): file edits flow without prompts
  (they're already confined to the worktree), the allow list runs, and any
  *novel* Bash still prompts or is blocked by the deny list / sandbox. A run
  may pause on a not-yet-allowlisted command — that pause is the safety margin,
  not a failure. Broaden the allow list to reduce pauses.
- **`auto`**: adds the auto-mode classifier — safe actions auto-allow,
  destructive ones soft-deny (clearable by stated intent), security boundaries
  hard-deny. Has a one-time opt-in dialog. Choose this for fully unattended
  runs; the deny list + sandbox still apply underneath.

Runtime equivalents (per-session, not persisted): shift+tab cycles
default → acceptEdits → plan.

## What stays human, always

Merging to `develop`/`main`; anything outward-facing; adding a dependency
(needs an ADR); editing the constitution (`CLAUDE.md`) or these harness rules.
An autonomous run ends at **"PR opened"** — a person merges.

## Operating model

Autonomous work runs the feature loop (spec → critique → plan → build → gate →
review → verify → PR) inside a worktree, subagent-driven, stopping only at:
BLOCKED it cannot resolve, a genuine ambiguity, or PR-ready. To widen the
allow list safely over time, use the `fewer-permission-prompts` skill — it
mines real transcripts for repeated safe commands rather than guessing.

## Changing the posture

- Dial autonomy up/down: edit `permissions.defaultMode` in
  `.claude/settings.local.json` (yours alone) or via `/config`.
- Team-wide walls (allow/deny/sandbox/worktree): edit the committed
  `.claude/settings.json` — and treat loosening a wall like a dependency
  change (it deserves scrutiny, ideally an ADR).
