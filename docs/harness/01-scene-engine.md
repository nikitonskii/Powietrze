# Harness journal 01 — M1: Scene engine

**Milestone:** M1 · **Spec:** `docs/specs/001-scene-engine.md` · **Branch:** `feature/m1-scene-engine`

## What the harness gained
- **Spec template + first real spec** (`docs/specs/TEMPLATE.md`, `001`):
  13 ACs with computed expected values; every test cites an AC ID.
- **Verifier agent** (`.claude/agents/verifier.md`): audits AC IDs against
  its own test runs at step 7 of the feature loop — reports to a file.
- **Coverage gate:** `src/core` pinned at 100% (statements/branches/
  functions/lines) in `jest.config.js`; CI now runs `--coverage`.

## What the app gained
`src/core/scene`: `scene()`, `ramp()`, `bandOf()`, anchor/band/advice
data — the single source every visual derives from (spec 001 API).

## Deviations from the prototype (all spec'd, none silent)
- Hex output normalized to lowercase (prototype was mixed-case by path).
- Non-finite input throws `RangeError` (prototype mapped `NaN` to the
  worst band silently); negative input clamps to 0.

## Mid-build corrections (task reviews)
- Task 6 fix round: reverted unauthorized coverage exclusions; `@types/node`
  became an explicit devDependency with ADR-002 (human-approved exception to
  the plan's no-new-dependencies line); eslint now ignores `coverage/`.

## Retro
<!-- Filled at step 10 with corrections from review/verify/human. -->
