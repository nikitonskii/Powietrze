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
