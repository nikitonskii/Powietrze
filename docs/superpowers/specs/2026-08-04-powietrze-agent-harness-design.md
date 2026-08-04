# Powietrze — Agent Harness Design

**Date:** 2026-08-04
**Status:** Approved pending final review
**Owner:** Mykyta

## 1. Purpose

Two stacked projects:

1. **The harness** (primary learning goal): a reliable, high-quality system of rules, gates, agents, and feedback loops that lets AI agents build software autonomously *without slop* — modular, SOLID, testable, automated.
2. **The app** (the workload): **Powietrze**, a dark-first iOS air-quality app for Poland (Horizon design direction). One CAQI value drives every visual: background gradient, Skia particle field, number color, chart, widget tint. The app exists to exercise and stress-test the harness; each milestone teaches the harness what it is missing.

The design handoff (`design/README.md` + `Powietrze.dc.html`) is the source of truth for all pixel values, color math, copy, and interaction rules.

## 2. Decisions (settled)

| Decision | Choice | Rationale |
|---|---|---|
| Autonomy level | **Supervised loops** — one feature/milestone per run; agents plan → implement → self-review → verify, then stop for human review | Maximum learning value: every gate observed and tuned between runs |
| Quality gates | **Mechanical gates + agent code review + acceptance-criteria verification** (visual/screenshot gate deferred) | Deterministic checks first; agent judgment only where machines can't reach |
| Containment | **macOS native sandbox + permission rules + hooks + one worktree per feature + protected main + CI** | Hard wall without Docker overhead; iOS simulator stays usable. Devcontainer only if unattended runs happen later |
| Harness construction | **Built piece by piece, together**, each mechanism added when app work exposes the need | Deepest understanding; user can rebuild it from memory afterward |
| Harness platform | **Approach A: deeply configure Claude Code** (CLAUDE.md, settings, hooks, subagents, skills, CI). Agent SDK re-implementation is an optional capstone (M10) | Learn the primitives every agent product (incl. oh-my-claudecode) is built from; every hour also moves the app forward |
| App foundation | **Bare React Native (community CLI), `ios/` committed** | Widget is a core product feature → native Xcode target without config-plugin indirection; maximum transparency for agents; no EAS dependency |

## 3. Guiding principles

1. **Autonomy budget = containment strength.** Everything inside the boundary is free (no prompts); everything outside is impossible, not discouraged. The human reviews diffs and evidence, not tool calls.
2. **Rules are versioned artifacts, not chat memory.** Every correction becomes a committed diff to `CLAUDE.md`, a hook, or an agent prompt. Failures compound into rules; the harness improves monotonically.
3. **Judgment is layered on determinism.** Hooks catch what machines can catch (types, lint, size, coverage); agent reviewers spend judgment only on design quality, SOLID, naming, test meaningfulness.
4. **Add a perspective only where a mistake is expensive and hard to undo.** Plans get a critic (bad plans poison everything downstream); code gets hooks first, then one reviewer. No agent-per-role-name inflation.
5. **Fresh context per milestone.** Each loop starts a clean session; the spec + `CLAUDE.md` + design handoff are the memory — never "what we discussed."
6. **Ambiguity is where hallucination lives.** Precise, checkable acceptance criteria shrink the agent's interpretation space to near zero (Section 6).
7. **Context is a budget, not a backpack.** Tokens cost money *and* attention — an agent drowning in context produces worse code, not better. Always-loaded files (`CLAUDE.md`) stay minimal and point to deeper docs that are read only when the task needs them (progressive disclosure). Fresh sessions per milestone keep context lean. Token usage is measured per milestone and recorded in the build journal; a milestone that costs twice the previous one for similar scope is a harness bug to investigate.

## 4. Repository layout

```
Powietrze/
├── CLAUDE.md                    # Constitution: architecture rules, SOLID conventions,
│                                # definition of done, forbidden patterns
├── .claude/
│   ├── settings.json            # Sandbox on, permission allow/deny, hook registration
│   ├── hooks/
│   │   ├── post-edit-check.sh   # format + eslint + tsc on touched files, errors fed back
│   │   └── guard.sh             # block: oversized files, missing tests, forbidden imports
│   ├── agents/
│   │   ├── critic.md            # Fresh-context challenger of specs and plans (pre-code)
│   │   ├── reviewer.md          # Fresh-context diff review vs. CLAUDE.md (post-gates)
│   │   └── verifier.md          # Audits each AC against evidence (runs code, not claims)
│   └── skills/
│       └── feature-loop/        # The encoded workflow (Section 5) + spec template
├── docs/
│   ├── specs/                   # One spec per feature: scope, non-goals, AC with IDs
│   ├── decisions/               # ADRs — why bare RN, why MMKV, e2e deferral, etc.
│   ├── nfr.md                   # Non-functional requirements (perf, offline, a11y, …)
│   ├── architecture.md          # Module map + boundaries, kept short, agent-facing
│   └── harness/                 # Human-facing build journal (Section 11)
├── design/                      # Design handoff copied into repo (README + prototype)
├── src/
│   ├── core/                    # Pure TS domain logic — zero React imports
│   ├── shared/                  # Reusable UI, tokens, utilities
│   └── features/                # Screen/feature modules (teraz, miejsca, ustawienia)
└── .github/workflows/ci.yml     # Outer gate: lint, tsc, tests, coverage on every PR
```

Import direction is enforced mechanically: `features → shared → core`, never the reverse. UI never imports data-fetching directly — only through interfaces defined in `core`.

## 5. The feature loop

Every unit of work — harness change or app feature — runs the same cycle:

1. **SPEC** — Human + main session write `docs/specs/NNN-<feature>.md`: scope, non-goals, acceptance criteria (each checkable, each with an ID).
2. **CRITIQUE** — `critic` agent (fresh context) attacks the spec and plan; human arbitrates which findings are incorporated. Critic explicitly rejects untestable AC.
3. **PLAN** — Main session produces the implementation plan (files, steps, test list).
4. **BUILD** — Implementer works in a dedicated worktree/branch. Hooks fire on every edit (format, lint, tsc, guards); errors feed straight back into the loop, invisible to the human.
5. **GATE** — Full test suite + coverage locally; must be green to proceed.
6. **REVIEW** — `reviewer` agent reads the diff against `CLAUDE.md`; findings fixed or explicitly waived by the human.
7. **VERIFY** — `verifier` agent audits each AC ID against evidence (runs tests/code; does not trust the implementer's claims).
8. **HUMAN** — PR review: diff + spec + review report + verification report.
9. **MERGE** — CI green + human approval → merge; worktree cleaned.
10. **RETRO** — Every human correction becomes a rule: a `CLAUDE.md` line, a hook, or an agent-prompt fix — committed with the merge.

Small tasks scale the loop down (steps 2–3 collapse to a sentence; 6–7 to one combined check) — the loop is never bypassed.

Until a given agent exists (they are introduced just-in-time per the milestone table in Section 9), its step is performed by the human + main session directly — e.g. before M3, critique of the spec/plan is a human-led check; before M2, the diff review is human-only.

## 6. Acceptance-criteria standard

AC fix three things: **task boundaries, expected behavior, and definition of done.** Without AC, a task is an interpretation, not an agreement.

**Formats.** Behavioral AC use **Given/When/Then**; constraints and invariants use **rule-based checklists**. Every spec must include **negative scenarios** — what the system rejects or forbids (empty form, expired token, station offline, permission denied), not only what it does.

**Testability test.** A good AC is a checkable statement — input conditions, an action, an observable result. Banned: vague wording, subjective judgments, undefined terms, hidden assumptions.

- Bad: "works fast", "interface is intuitive", "there should be no errors".
- Good: "on wrong password, an error message is shown", "after saving, the record appears in the list", "an empty form cannot be submitted", "index 74 and 76 render near-identical interpolated colors — never a band snap".

**Traceability.** Every AC has an ID (`AC-1`, `AC-2`, …). Each AC maps to at least one automated test naming that ID (`test('AC-3: empty query shows W POBLIŻU nearby list', …)`). The verifier's report is an audit: for every AC ID → the passing test, or manual-check evidence for the few visual criteria. Untraceable AC = unfinished spec.

**Decomposition link.** If precise, finite AC cannot be written, the task is too big — split it before implementation. Small tasks admit exact criteria; large vague tasks produce weak AC and expensive mid-flight clarification.

## 7. Quality gates & testing strategy

**Mechanical layer** (hooks locally, CI authoritatively):

- TypeScript `strict`; no `any` escapes without an inline justification comment.
- ESLint as encoded architecture: `max-lines` and `complexity` caps (forces decomposition — the SOLID lever), `eslint-plugin-boundaries` (import direction), import sorting, Prettier.
- Jest with a coverage threshold on changed code.

**Testing strategy** — shaped by the app's structure. The core of Powietrze is pure math and therefore maximally verifiable:

- **`src/core/`** — `scene()` interpolation, `ramp()`, band thresholds, `density = clamp(pm25/135, 0.03, 1)`, derived pollutants: pure TS, exhaustively unit-tested (anchor stops, boundaries 25/26, near-identity 74/76, clamping past 175).
- **Components** — React Native Testing Library, behavior over snapshots ("given index 118, band name shows Zły in the key color with the Zły advice copy").
- **Skia/Reanimated layer** — the shader itself is not unit-testable; its *inputs* are (density, uniforms, reduced-motion flag) and are tested as pure functions. Visual result is a human checkpoint at step 8. Screenshot-diff gate is deliberately deferred (revisit if visual regressions bite).
- **E2E (Maestro)** — deferred until multi-screen flows exist (Miejsca add/remove); recorded as an ADR.

## 8. Containment

- **Permission rules** (`.claude/settings.json`): allow `npm test`, `tsc`, `eslint`, formatters unprompted; deny `git push` to main, `rm -rf`, network beyond an allowlist, reads of `.env`/secrets.
- **Hooks**: PreToolUse/PostToolUse scripts block violations deterministically (oversized files, missing tests, forbidden imports) and pipe lint/type errors back to the agent.
- **OS sandbox**: macOS seatbelt — writes confined to project directory, restricted network.
- **Worktrees**: one per feature; main checkout never touched; rollback = delete branch.
- **CI + protected main**: nothing merges without green checks and human approval.

Escalation path: a devcontainer with a network allowlist and no host credentials is the prerequisite for any future unattended/overnight runs. Not built now.

## 9. Milestones

Each milestone is one feature-loop run, sized for precise AC. Harness pieces are introduced just-in-time:

| # | Milestone | Delivers | Harness piece introduced |
|---|---|---|---|
| M0 | Bootstrap | Bare RN app boots on simulator; scaffold; design handoff in repo; CI skeleton | `CLAUDE.md` v1, sandbox + permissions, first hook |
| M1 | Scene engine | `src/core/`: `scene()`, `ramp()`, bands, density, derived PM — exhaustive tests | Spec template + AC IDs; verifier agent |
| M2 | Teraz hero (static) | Tokens, typography, hero block, advice copy, tab bar (mock data) | Reviewer agent; import-boundary lint |
| M3 | Atmosphere | Skia shader, particle field, Reanimated clock, skyline blur, reduced motion | Critic agent |
| M4 | Below the fold | 24h chart card, PM10/NO₂ tiles, forecast card | Coverage gate tightened |
| M5 | Miejsca | Mini-scene list, search/add/remove, MMKV persistence | Retro discipline formalized |
| M6 | Ustawienia | Toggles, segmented controls, threshold slider, persistence | — |
| M7 | Data layer | API client behind interface, mock server, 15-min refresh, stale/offline/loading | Negative-scenario AC workout |
| M8 | Widgets | WidgetKit target, App Group bridge, timelines, deep links | Native-code rules in `CLAUDE.md` |
| M9 | Notifications + i18n | Smog alert (threshold, quiet hours), morning summary; i18n structure (PL first) | — |
| M10 | Capstone (optional) | Re-implement the proven loop on the Claude Agent SDK | Own orchestrator, informed by evidence |

M1 precedes all UI deliberately: the app's most important decision (the color system) becomes fully machine-verifiable on day one, and the whole loop fires first on a milestone where the verifier can prove everything.

## 10. Failure handling

- **Gate-failure cap:** the implementer gets 3 attempts to pass hooks/tests, then must stop and report the blocker — no thrashing.
- **Disagreements surface to the human:** critic vs. planner, reviewer vs. implementer — never silently overruled; both positions stated.
- **Fresh context per milestone:** spec + `CLAUDE.md` + design handoff are the only memory.
- **Retro is mandatory:** a mistake repeated twice is a harness bug, not an agent bug.

## 11. Documentation system

Two audiences, two kinds of documents — never mixed:

**Agent-facing context docs** (optimize for token economy and precision):

- `CLAUDE.md` — the constitution. Always loaded, therefore ruthlessly short: rules, module map pointer, definition of done. Links to deeper docs instead of inlining them.
- `docs/architecture.md` — module map, boundaries, allowed dependencies. Read when planning.
- `docs/decisions/` (ADRs) — one page per decision: context, decision, consequences. Agents consult them instead of re-deriving (or re-litigating) settled choices.
- `docs/nfr.md` — non-functional requirements as checkable statements, same testability standard as AC: 60fps particle field on iPhone 12+, cold start budget, reduced-motion support, offline/stale behavior, bundle-size ceiling, no network calls outside the API client.
- `docs/specs/` — per-feature specs with AC IDs (Section 6).

Rules: every agent-facing doc states *when to read it* in its first line; progressive disclosure over completeness; a doc an agent never needs to load is deleted or merged. Duplication between docs is treated like duplication in code.

**Human-facing build journal** (`docs/harness/`) — the practical-learning record, written as we go, one entry per harness change:

- **What was added** (mechanism, file, config) and **what failure or need motivated it** — the journal is event-driven, not encyclopedic.
- **Cost accounting:** tokens/cost per milestone (`/cost`), what was tried to reduce it, what worked.
- **The human–agent bridge** (`docs/harness/bridge.md`): the contract of the collaboration — what the human must provide for each loop step (spec with testable AC, arbitration of conflicts, review verdicts) and what the agent must provide back (plans before code, evidence not claims, AC-audit reports, explicit blockers instead of guesses). When communication fails, the fix is a diff to this contract.
- End state: the journal is a reproducible recipe — someone (including future you) can rebuild this harness from it, understanding *why* each piece exists.

**Code-quality bar enforced through these docs:** no tight coupling (import-boundary lint + interfaces at module seams), high cohesion (one reason to change per module; `max-lines`/`complexity` caps force splits), YAGNI (reviewer flags speculative abstractions and dead code; no code without a driving AC), no redundancy (duplication flagged in review; shared logic promoted to `shared`/`core` only on second use, not preemptively).

## 12. Out of scope (v1)

- Visual/screenshot regression gate (revisit on evidence of need).
- E2E suite before M5.
- Devcontainer / unattended autonomous runs.
- Android (design is iOS-first; widgets are WidgetKit).
- oh-my-claudecode as harness base (its patterns — e.g. architect/critic pairing — are borrowed as hand-written agent files instead).
