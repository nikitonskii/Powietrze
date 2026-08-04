# M0 Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A bare React Native app that boots on the iOS simulator, wrapped in the first working slice of the agent harness: constitution, sandbox, permissions, one feedback hook, CI, and the documentation skeleton.

**Architecture:** Harness config lives in `CLAUDE.md` + `.claude/`; app is a stock bare-RN scaffold (community CLI, `ios/` committed) with strict TypeScript and `lint`/`typecheck`/`test` scripts that hooks and CI both call. Docs follow the three-layer model from the design spec (`docs/superpowers/specs/2026-08-04-powietrze-agent-harness-design.md`).

**Tech Stack:** React Native 0.85.x (bare, `@react-native-community/cli`), TypeScript strict, ESLint + Prettier (RN template config), Jest, GitHub Actions, Claude Code (settings.json sandbox/permissions/hooks).

## Global Constraints

- Node **≥ 20.19.4** (RN 0.85 requirement). Verify before Task 2; abort with a clear message if lower.
- App name: **Powietrze**. `ios/` is committed; `ios/Pods/` stays gitignored (RN template default).
- `CLAUDE.md` must stay **≤ 150 lines** (`wc -l` check is part of its task).
- `design/` is a read-only reference once imported — never edited, enforced by permission deny rules from Task 5 on.
- Every task ends with a commit; commit messages use `<type>: <summary>` (feat/chore/docs/ci).
- All work on the current `develop` branch; `main` is created at the end (Task 9) and is PR-only thereafter.
- No new npm dependencies in M0 beyond what `@react-native-community/cli init` installs.

---

### Task 1: Import the design handoff

**Files:**
- Create: `design/README.md`, `design/Powietrze.dc.html` (copies from `/Users/curiosity/Downloads/design_handoff_powietrze/`)

**Interfaces:**
- Produces: `design/README.md` — cited by `CLAUDE.md` (Task 4) and every future spec as the design source of truth.

- [ ] **Step 1: Copy the handoff into the repo**

```bash
mkdir -p design
cp /Users/curiosity/Downloads/design_handoff_powietrze/README.md design/
cp /Users/curiosity/Downloads/design_handoff_powietrze/Powietrze.dc.html design/
```

- [ ] **Step 2: Verify the copies are intact**

Run: `head -5 design/README.md && grep -c "scene" design/Powietrze.dc.html`
Expected: the `# Handoff: Powietrze` heading prints; grep count is ≥ 1 (the color-math class is present).

- [ ] **Step 3: Commit**

```bash
git add design/
git commit -m "docs: import Powietrze design handoff as read-only reference"
```

---

### Task 2: Bare React Native scaffold

**Files:**
- Create: entire RN app at repo root (`package.json`, `ios/`, `android/`, `App.tsx`, `index.js`, `tsconfig.json`, `.eslintrc`/`eslint.config`, `jest` config, template `.gitignore`)

**Interfaces:**
- Produces: `npm run ios` boots the app; `npm run lint` and `npm test` exist (template); `package.json` that Task 3 extends with `typecheck`.

- [ ] **Step 1: Verify Node version**

Run: `node -v`
Expected: `v20.19.4` or higher (or v22+). If lower, STOP and report — do not attempt workarounds.

- [ ] **Step 2: Generate the app in the scratchpad** (init has no directory flag; the repo root is not empty, so generate outside and merge)

```bash
SCRATCH="$(mktemp -d)"
cd "$SCRATCH"
npx @react-native-community/cli@latest init Powietrze --install-pods false
rm -rf "$SCRATCH/Powietrze/.git"
```

(If `--install-pods` is not a recognized flag in the current CLI, decline pod install when prompted; pods are installed explicitly in Step 4.)

- [ ] **Step 3: Merge into the repo root without touching existing files**

```bash
rsync -a --ignore-existing "$SCRATCH/Powietrze/" /Users/curiosity/Documents/private/Powietrze/
cd /Users/curiosity/Documents/private/Powietrze
git status --short
```

Expected: new app files listed; `design/`, `docs/`, `.omc` untouched (rsync has no `--delete`). If the template ships a `README.md` that collided with an existing one, keep ours (that is what `--ignore-existing` does — verify `design/README.md` unchanged via `git status`).

- [ ] **Step 4: Install JS and iOS dependencies** (long: run in background / allow up to 10 min)

```bash
npm install
cd ios && bundle install && bundle exec pod install && cd ..
```

Expected: both complete without error; `ios/Podfile.lock` exists.

- [ ] **Step 5: Boot on the simulator**

Run: `npm run ios`
Expected: build succeeds; the RN welcome screen renders in the iOS simulator. This is the task's acceptance test — do not proceed on a red build.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold bare React Native 0.85 app (Powietrze)"
```

---

### Task 3: Strict TypeScript + unified check scripts

**Files:**
- Modify: `tsconfig.json`, `package.json`

**Interfaces:**
- Produces: `npm run typecheck`, `npm run lint`, `npm test` — the exact three commands invoked by the hook (Task 6) and CI (Task 7). Names are load-bearing; do not vary them.

- [ ] **Step 1: Confirm strict mode is on**

Run: `npx tsc --showConfig | grep '"strict"'`
Expected: `"strict": true` (inherited from `@react-native/typescript-config`). If absent, add `"strict": true` under `compilerOptions` in `tsconfig.json`.

- [ ] **Step 2: Add the typecheck script**

In `package.json` `scripts`, add:

```json
"typecheck": "tsc --noEmit"
```

- [ ] **Step 3: Write the failing check** (prove the gate detects errors)

```bash
cat > TypeGateProbe.ts <<'EOF'
const probe: number = 'not a number';
export default probe;
EOF
npm run typecheck
```

Expected: FAIL with `Type 'string' is not assignable to type 'number'` referencing `TypeGateProbe.ts`.

- [ ] **Step 4: Remove the probe and verify all three checks pass**

```bash
rm TypeGateProbe.ts
npm run typecheck && npm run lint && npm test -- --ci
```

Expected: all three PASS (template ships one App render test).

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json
git commit -m "chore: enforce strict TypeScript and add typecheck script"
```

---

### Task 4: CLAUDE.md v1 (the constitution)

**Files:**
- Create: `CLAUDE.md`

**Interfaces:**
- Produces: the always-loaded Layer-1 context; cites `design/README.md` (Task 1), the three scripts (Task 3), and doc paths (Task 8).

- [ ] **Step 1: Write CLAUDE.md with exactly this content**

```markdown
# Powietrze — Agent Constitution

Dark-first iOS air-quality app (bare React Native). One CAQI value drives
every visual. This file is the always-loaded rulebook: pointers, not prose.

## Sources of truth (read them; never work from memory of them)
- Design: `design/README.md` (pixels, colors, copy) and
  `design/Powietrze.dc.html` (color math: `scene`, `ramp`, `_draw`)
- Harness: `docs/superpowers/specs/2026-08-04-powietrze-agent-harness-design.md`
- Current task contract: its spec in `docs/specs/` (AC with IDs)
- Decisions: `docs/decisions/` (ADRs) · NFRs: `docs/nfr.md`
- Delegation contract: `docs/harness/delegation-guide.md`

## Architecture
- Layers: `src/core` (pure TS, zero React imports) ← `src/shared`
  (UI kit, tokens) ← `src/features/{teraz,miejsca,ustawienia}`
- Imports flow one way: features → shared → core. Never the reverse.
  No cross-feature imports.
- UI never calls data-fetching directly — only via interfaces in `src/core`.
- One responsibility per module. If describing a file needs "and", split it.

## Code style
- TypeScript strict. `any` is forbidden unless an inline comment justifies it.
- Keep files ≤ 200 lines and functions ≤ 40 lines; decompose instead.
- Behavior tests over snapshots. Test names cite AC IDs: `test('AC-3: …')`.
- No dead code, no speculative abstractions, no duplicated logic.

## Definition of done
1. Every AC in the spec satisfied and traceable to a test
   (or recorded manual evidence for visual criteria).
2. `npm run lint`, `npm run typecheck`, `npm test` all green.
3. Docs updated in the same change (spec/ADR/journal as applicable).
4. No new warnings in the simulator console.

## Forbidden
- Pushing to `main`; force-pushing anywhere.
- Editing anything under `design/` (read-only reference).
- Adding a dependency without an ADR in `docs/decisions/`.
- Declaring work complete with failing or skipped checks.

## Workflow
Feature loop (harness spec §5): spec → critique → plan → build → gate →
review → verify → human review → merge → retro. Implementation happens on
a feature branch/worktree, never on `main`. Every human correction ends as
a committed rule change (this file, a hook, or an agent prompt).
```

- [ ] **Step 2: Verify the size cap**

Run: `wc -l CLAUDE.md`
Expected: ≤ 150.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md constitution v1"
```

---

### Task 5: Sandbox + permission rules

**Files:**
- Create: `.claude/settings.json`

**Interfaces:**
- Produces: `.claude/settings.json` that Task 6 extends with a `hooks` block. Keep key order; Task 6 edits this exact file.

- [ ] **Step 1: Write `.claude/settings.json`**

```json
{
  "sandbox": {
    "enabled": true,
    "failIfUnavailable": true,
    "network": {
      "allowedDomains": [
        "registry.npmjs.org",
        "github.com",
        "objects.githubusercontent.com",
        "cdn.cocoapods.org"
      ],
      "strictAllowlist": true
    }
  },
  "permissions": {
    "allow": [
      "Bash(npm run lint)",
      "Bash(npm run lint *)",
      "Bash(npm run typecheck)",
      "Bash(npm test)",
      "Bash(npm test *)",
      "Bash(npm run ios)",
      "Bash(npx tsc *)",
      "Bash(npx eslint *)",
      "Bash(npx prettier *)",
      "Bash(npx jest *)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(git add *)",
      "Bash(git commit *)"
    ],
    "deny": [
      "Bash(git push *)",
      "Bash(rm -rf *)",
      "Read(.env)",
      "Read(.env.*)",
      "Read(**/.env)",
      "Edit(design/**)",
      "Write(design/**)",
      "WebFetch"
    ]
  }
}
```

Rationale to preserve in the commit message: allow = the harness's own gates (they must run without prompts); deny = irreversible or out-of-boundary actions. The network allowlist will be tuned via RETRO when a legitimate build need hits the wall — log any such block in the journal.

- [ ] **Step 2: Validate JSON**

Run: `python3 -m json.tool .claude/settings.json > /dev/null && echo VALID`
Expected: `VALID`.

- [ ] **Step 3: Commit**

```bash
git add .claude/settings.json
git commit -m "chore: enable macOS sandbox and permission boundary for agents"
```

---

### Task 6: PostToolUse hook — format, lint, typecheck with feedback

**Files:**
- Create: `.claude/hooks/post-edit-check.sh`
- Modify: `.claude/settings.json` (add `hooks` block)

**Interfaces:**
- Consumes: `npm`-installed `prettier`/`eslint`/`tsc` from Task 2/3.
- Produces: automatic in-loop correction — on every Edit/Write of a JS/TS file, errors return to the agent via exit code 2 + stderr (per hooks doc: exit 2 = stderr is shown to Claude).

- [ ] **Step 1: Write the hook script**

```bash
#!/bin/bash
# PostToolUse hook: format the edited file, then lint + typecheck.
# Exit 2 feeds stderr back to the agent as a correction; exit 0 is silence.
set -u

INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | python3 -c \
  "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" \
  2>/dev/null)

case "$FILE" in
  *.ts|*.tsx|*.js|*.jsx) ;;
  *) exit 0 ;;
esac
[ -f "$FILE" ] || exit 0

cd "$(dirname "$0")/../.." || exit 0

ERRORS=""

npx prettier --log-level warn --write "$FILE" >/dev/null 2>&1

LINT=$(npx eslint "$FILE" 2>&1)
[ $? -ne 0 ] && ERRORS="ESLint on ${FILE}:
${LINT}

"

TSC=$(npx tsc --noEmit 2>&1)
[ $? -ne 0 ] && ERRORS="${ERRORS}TypeScript (project):
${TSC}
"

if [ -n "$ERRORS" ]; then
  printf '%s' "$ERRORS" >&2
  exit 2
fi
exit 0
```

```bash
chmod +x .claude/hooks/post-edit-check.sh
```

- [ ] **Step 2: Write the failing test — hook must catch a type error**

```bash
cat > HookProbe.ts <<'EOF'
const probe: number = 'wrong';
export default probe;
EOF
printf '{"tool_name":"Write","tool_input":{"file_path":"HookProbe.ts"}}' \
  | .claude/hooks/post-edit-check.sh
echo "exit=$?"
```

Expected: TypeScript error text on stderr, then `exit=2`.

- [ ] **Step 3: Verify the passing path**

```bash
cat > HookProbe.ts <<'EOF'
const probe: number = 42;
export default probe;
EOF
printf '{"tool_name":"Write","tool_input":{"file_path":"HookProbe.ts"}}' \
  | .claude/hooks/post-edit-check.sh
echo "exit=$?"
rm HookProbe.ts
```

Expected: no output, `exit=0`. Also verify a non-code path is skipped: pipe `{"tool_input":{"file_path":"docs/nfr.md"}}` → `exit=0` instantly.

- [ ] **Step 4: Register the hook in `.claude/settings.json`**

Add this top-level key alongside `sandbox` and `permissions`:

```json
"hooks": {
  "PostToolUse": [
    {
      "matcher": "Edit|Write",
      "hooks": [
        {
          "type": "command",
          "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/post-edit-check.sh",
          "timeout": 60
        }
      ]
    }
  ]
}
```

Re-validate: `python3 -m json.tool .claude/settings.json > /dev/null && echo VALID` → `VALID`.

- [ ] **Step 5: Commit**

```bash
git add .claude/hooks/post-edit-check.sh .claude/settings.json
git commit -m "feat: add post-edit hook feeding lint/type errors back to agents"
```

---

### Task 7: CI skeleton

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: the three scripts from Task 3, verbatim.
- Produces: the authoritative outer gate; branch protection (Task 9) will require this check.

- [ ] **Step 1: Write the workflow**

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main, develop]

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.19.4'
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --ci
```

(JS-only checks run on Linux deliberately — fast and cheap. An iOS build job is added only when a milestone needs it; that deferral is recorded in the journal.)

- [ ] **Step 2: Verify — replicate the CI steps locally**

Run: `npm ci && npm run lint && npm run typecheck && npm test -- --ci`
Expected: all PASS (this is exactly what the runner will execute; `npm ci` also proves the lockfile is complete).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add lint/typecheck/test gate"
```

---

### Task 8: Documentation skeleton — NFRs, delegation guide, ADR-001

**Files:**
- Create: `docs/nfr.md`, `docs/harness/delegation-guide.md`, `docs/decisions/001-bare-react-native.md`

**Interfaces:**
- Produces: Layer-2 docs cited by `CLAUDE.md`; the delegation guide's task template is used by every future spec.

- [ ] **Step 1: Write `docs/nfr.md`**

```markdown
# Non-Functional Requirements

Every NFR is measurable and names its check method. Unmeasurable
proposals are rejected, exactly like unmeasurable acceptance criteria.

| ID | Requirement | Target | Check | Verified at |
|---|---|---|---|---|
| NFR-1 | Atmosphere animation frame rate | ≥ 55 fps sustained | Perf monitor on device/simulator | M3 |
| NFR-2 | Reduced-motion support | particles frozen, density preserved | RNTL test + manual toggle | M3 |
| NFR-3 | Cold start → interactive Teraz | ≤ 2.5 s on device | Instruments / stopwatch | M7 |
| NFR-4 | Offline / stale data | cached view + prominent freshness timestamp, no crash | RNTL negative tests | M7 |
| NFR-5 | Type safety | `tsc --noEmit` strict, zero errors | CI, every PR | M0 |
| NFR-6 | Coverage | ≥ 80% lines in `src/core`; ≥ 60% overall | `jest --coverage` threshold in CI | M1 / M4 |
| NFR-7 | Dependency discipline | no new dependency without an ADR | reviewer agent + CLAUDE.md | M0 |
```

- [ ] **Step 2: Write `docs/harness/delegation-guide.md`**

```markdown
# Delegation Guide — the human↔agent contract

AI scales clarity and scales vagueness equally well. Delegation means
handing over a task in executable form, not asking for a favor.

## Task anatomy (every spec/prompt contains all five)
1. **Goal** — the outcome, not the implementation.
2. **Context** — paths to sources of truth (design, spec, ADRs). Reference,
   never paste.
3. **Constraints** — boundaries, forbidden moves, tools allowed.
4. **Output format** — diff, plan, ADR, test list, verification report:
   name the artifact expected back.
5. **Acceptance criteria** — checkable, ID'd, with negative scenarios
   (see harness spec §6).

## Always explicit
Expected outcome · task boundaries and non-goals · definition of done ·
critical constraints (security, compatibility, style, forbidden actions) ·
input data and sources of truth · decision priorities when goals conflict.

## Allowed implicit
Only conventions that are stable AND written down (CLAUDE.md, lint config).
"Everybody knows that" is not a convention — it is a future defect.

## Where each rule lives (cheapest wins)
1. Mechanically enforced (types, lint, hooks) — zero tokens, cannot be ignored.
2. Versioned doc, loaded on demand (ADR, NFR, this guide).
3. Repeated in the task prompt — only for the genuinely task-unique.
RETRO promotes broken implicit assumptions up this ladder, preferring 1.

## Anti-patterns
Scope too wide for finite AC (split it) · context by memory instead of by
path · hidden constraints (state them or lose them) · goal mixed with
implementation (spec says WHAT; plan says HOW) · unverifiable adjectives
("fast", "clean", "intuitive") anywhere near an AC.
```

- [ ] **Step 3: Write `docs/decisions/001-bare-react-native.md`**

```markdown
# ADR-001: Bare React Native over Expo

**Status:** Accepted · 2026-08-04

## Context
The WidgetKit extension is a core product feature (design handoff §Widgets).
Expo's Continuous Native Generation treats `ios/` as disposable, so an extra
Xcode target must be re-injected by config plugins on every prebuild —
generated-code indirection that hides native changes from review. The
project's primary goal is a transparent agent harness; EAS is not used.

## Decision
Bare React Native via `@react-native-community/cli`; `ios/` is committed;
the widget will be a normal Xcode target with an App Group (M8).

## Consequences
- (+) Native diffs are visible and reviewable; no plugin layer to debug.
- (+) Widget/App-Group work is standard Xcode practice.
- (−) Community libraries are hand-picked (location, storage, notifications);
  each addition requires an ADR (NFR-7).
- (−) RN upgrades are manual (`react-native upgrade` + diff review).
```

- [ ] **Step 4: Verify docs are internally consistent**

Run: `grep -l "delegation-guide" CLAUDE.md && ls docs/nfr.md docs/decisions/001-bare-react-native.md docs/harness/delegation-guide.md`
Expected: all four paths print (CLAUDE.md already references the guide; files exist where CLAUDE.md says they are).

- [ ] **Step 5: Commit**

```bash
git add docs/nfr.md docs/harness/delegation-guide.md docs/decisions/001-bare-react-native.md
git commit -m "docs: add NFRs, delegation guide, and ADR-001 (bare RN)"
```

---

### Task 9: Harness journal entry + main branch

**Files:**
- Create: `docs/harness/00-bootstrap.md`

**Interfaces:**
- Produces: the first journal entry (the "how we built it" log) and the protected-main setup note. Future milestones append `NN-<milestone>.md` files in the same format.

- [ ] **Step 1: Write `docs/harness/00-bootstrap.md`** — use this structure, but fill the *Deviations & failures* and *Cost* sections with what ACTUALLY happened during Tasks 1–8 (consult the session/git history; do not invent):

```markdown
# Journal 00 — Bootstrap (M0)

**Date:** <fill: completion date> · **Plan:** docs/superpowers/plans/2026-08-04-m0-bootstrap.md

## What the harness gained
- CLAUDE.md v1 — always-loaded constitution (≤150 lines, pointers only).
- OS sandbox + permission boundary (.claude/settings.json): gates run
  free, irreversible actions are impossible, design/ is read-only.
- post-edit-check.sh — first in-loop feedback hook (prettier → eslint →
  tsc, exit-2 stderr feedback).
- CI gate (lint/typecheck/test) + branch protection on main.
- Docs skeleton: NFRs, delegation guide, ADR-001.

## Why each piece (which failure/need exposed it)
<fill: 1 line per piece; for M0 most trace to the design spec §§4,8,11>

## Deviations & failures
<fill: every step that did not go as planned, and what was changed —
e.g. CLI flags that differed, sandbox blocks that required allowlist
tuning, hook edge cases>

## Retro → rules
<fill: corrections promoted into CLAUDE.md/hooks/settings this milestone,
or "none">

## Cost
<fill: approximate token spend for M0 (from /cost or session stats)>
```

- [ ] **Step 2: Commit the journal**

```bash
git add docs/harness/00-bootstrap.md
git commit -m "docs: add harness journal entry 00 (bootstrap)"
```

- [ ] **Step 3: Create `main` from the completed bootstrap**

```bash
git branch main
git log --oneline main -1
```

Expected: `main` points at the journal commit. `develop` remains the working branch; all future work reaches `main` via PR.

- [ ] **Step 4: Manual step — report to the human**

Print this checklist for the user (agents must NOT do these):
1. Create the GitHub repository and `git push -u origin main develop`.
2. On GitHub: protect `main` — require PRs, require the `checks` CI job, forbid force-push.
3. Confirm CI goes green on the pushed branches.

---

## Execution notes

- Tasks 1→9 are strictly ordered (each consumes the previous task's output).
- Task 2 Step 4/5 are long-running; use background execution and check results before proceeding.
- The hook (Task 6) fires on the executor's own edits from then on — if it blocks an edit with a real error, that is the harness working; fix the error, don't bypass the hook.
```
