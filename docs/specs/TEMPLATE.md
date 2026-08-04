# Spec NNN: <Feature name>

**Status:** draft | approved | implemented
**Milestone:** M<N>
**Sources:** <design/docs sections this spec is derived from — link, never paste>

## Scope

<What this feature does, in 2–5 sentences. One responsibility; if "and"
appears twice, split the spec.>

## Non-goals

<Explicit exclusions, each with where it lands instead (milestone or never).>

## Public API

<Exact exported names, TypeScript signatures, and types. This is the
contract later milestones import — changing it later requires an ADR note.>

## Behavior — Acceptance Criteria

<Every AC has an ID (`AC-1`, …). Each is checkable: Given/When/Then or a
rule-based invariant with exact values. Include negative scenarios
(invalid input, boundaries, empty states). Each AC maps to ≥1 test naming
its ID: `test('AC-3: …')`. Untraceable AC = unfinished spec.>

- **AC-1** — Given …, when …, then … <exact expected value>.

## Resolved ambiguities

<Where the source material was silent or contradictory, the decision made
here, with one line of why. This section is what the critic attacks.>

## Verification

<How each AC class is proven: unit tests (cite planned test file), lint
rule, or recorded manual evidence for visual criteria.>
