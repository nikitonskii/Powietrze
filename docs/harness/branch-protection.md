# Branch protection — GitHub rulesets (human-operated)

This is the mechanical enforcement behind `CLAUDE.md` Forbidden's "no
pushing to `main`, no force-pushing anywhere". The agent's deny-list stops
those actions *inside* the sandbox; these rulesets stop them at the remote
too, for every actor including a human mistake.

Repo admin is human-only by design: an agent that could edit its own
protection rules would defeat the boundary it is meant to sit inside. So
this file is documentation of a human setup step, not something an agent
runs.

## Ruleset: `protect-main`

GitHub → **Settings → Rules → Rulesets → New ruleset → New branch ruleset**.

- **Name:** `protect-main`
- **Enforcement status:** `Active` — *not* `Evaluate` (Evaluate only
  simulates and enforces nothing; the most common setup mistake).
- **Target branches:** Add target → **Include default branch** (`main`).
- **Rules** (check these four):
  - **Restrict deletions** — `main` cannot be deleted.
  - **Block force pushes** — history is append-only.
  - **Require a pull request before merging** — **Required approvals: `0`**.
    GitHub forbids approving your own PR, so `1` would deadlock a solo
    repo. Zero still routes every change through a PR (CI runs, diff is
    reviewable) — it just doesn't block on a second person.
  - **Require status checks to pass** → **Add checks** → `checks` (the CI
    job defined in `.github/workflows/ci.yml`). Also tick **Require
    branches to be up to date before merging**.

## Ruleset: `protect-develop`

Lighter. `develop` receives milestone merges directly, so it does *not*
require a PR — only that it can't be rewritten or deleted.

- **Name:** `protect-develop`
- **Enforcement status:** `Active`
- **Target branches:** Add target → **Include by pattern** → `develop`
- **Rules:** **Restrict deletions** · **Block force pushes** (nothing else).

## Verify

- The branches page shows a shield next to `main` and `develop`.
- From a terminal, `git push --force origin main` is rejected with
  `GH013: Repository rule violations`.

## What this changes for the feature loop

With `main` PR-gated, milestone promotion `develop → main` happens through
a PR — exactly the loop's step 8–9 (human review → merge). `develop` stays
directly mergeable so a finished milestone branch can fast-forward into it
without ceremony.
