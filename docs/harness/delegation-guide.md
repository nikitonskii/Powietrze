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
