# Harness journal 02 — M2: Teraz hero (static)

**Milestone:** M2 · **Spec:** `docs/specs/002-teraz-hero.md` · **Branch:** `feature/m2-teraz-hero`

## What the harness gained
- **Reviewer agent** (`.claude/agents/reviewer.md`): fresh-context diff review
  against `CLAUDE.md` at step 6 of the feature loop — SOLID, module size,
  import direction, naming, test meaningfulness, no slop. Finds, does not fix.
- **Import-boundary lint** (`eslint-plugin-boundaries`, ADR-005): mechanically
  enforces `app→features→shared→core`, no reverse, no cross-feature — the rule
  the spec promised would be "mechanically enforced." A wrong-direction import
  now fails `npm run lint` / CI.
- **No-hex lint** (`no-restricted-syntax`): rejects `#rrggbb` literals in
  `src/features/**` and `src/shared/ui/**`; colors must come from `scene()` or
  `src/shared/tokens`.
- **Jest RN component env** (ADR-005): `@testing-library/react-native` +
  `jest.setup.js` native-module mocks (linear-gradient → View; the official
  `react-native-safe-area-context/jest/mock`) so behavior tests can render.
- **Shared test util** (`src/shared/test/colorOf.ts`): one typed helper for
  reading a rendered node's resolved color, replacing a duplicated
  `any`-typed local helper across two suites (see Mid-build corrections).

## What the app gained
- `src/shared/tokens`: `colors`, `type` scale, `spacing` — literals pinned to
  `design/README.md` (AC-1).
- `src/shared/ui`: `Text` (variant-driven typography) + `GradientBackground`
  (deep→mid backdrop, ADR-004).
- `src/features/teraz`: `Hero` bound to `scene()` (index/band/pm/advice), the
  `MOCK_PLACE` index (Kraków, 118), and `TerazScreen`.
- `src/features/{miejsca,ustawienia}`: placeholder screens.
- `src/app`: `AppNavigator` (3-tab bottom navigator, ADR-003) + a custom
  `TabBar` (translucent bar, key/accent tints), wired through `App.tsx`.

## Deviations from the plan (all reviewed, none silent)
- **Boundaries config rewritten to v7 `policies` syntax.** The plan's literal
  `.eslintrc.js` silently no-op'd the cross-feature rule under the installed
  `eslint-plugin-boundaries@7.2.0` (see Mid-build corrections). Fixed by adding
  `settings['import/resolver']` (`eslint-import-resolver-node`, a direct dep of
  the plugin — no new package) and expressing the five allow-rules in the
  non-deprecated `policies` shape. Behaviorally identical; verified against the
  plugin source in review.
- **Tests adapted for async `render()`.** The installed
  `@testing-library/react-native@14` returns Promises from `render`/`rerender`/
  `unmount`; the plan's synchronous test code would not compile under TS strict.
  Every test callback is `async` and awaits render; post-navigation assertions
  use `await screen.findByTestId(...)`. No assertion was weakened.
- **`colorOf` typed against `TestInstance` from `test-renderer`**, not
  `ReactTestInstance` from `react-test-renderer` — RNTL v14 renders through
  `test-renderer` (a peer dep already installed), and the older type does not
  typecheck against v14 query results.
- **Safe-area Jest mock** switched to the library's official
  `react-native-safe-area-context/jest/mock` (spread from `.default`) because
  the real `SafeAreaProvider` never renders children under Jest (waits on a
  native `onLayout` that never fires).

## Toolchain drift worth remembering
`@testing-library/react-native@14` is a materially different testing surface
from the sync-`render` era assumed by the plan: `render`/`rerender`/`unmount`
are async, and query-result nodes are `TestInstance` (from `test-renderer`),
not `ReactTestInstance`. Any later milestone's test code — or pasted plan
snippets — should follow this precedent. `eslint-plugin-boundaries@7` likewise
needs `import/resolver` configured and the `policies` (not legacy `rules`)
shape; `ESLINT_PLUGIN_BOUNDARIES_DEBUG=true` reveals when a rule silently fails
to classify.

## Mid-build corrections (task reviews)
- **Task 2 — plan-level defect caught before it shipped.** The plan's verbatim
  boundaries config classified extension-less TS imports as `isUnknown`, which
  are exempt from `boundaries/element-types`; the boundary rule would have
  *looked* configured while blocking nothing. The AC-13 probe evidence
  (deliberately-bad fixtures, linted then deleted) is what surfaced it.
- **Task 5→6 — a plan-mandated `any` removed centrally.** The Hero test's
  `colorOf = (node: any) => …` violated `CLAUDE.md`'s no-`any`-without-comment
  rule and was about to be duplicated in Task 6. Per human decision, it became
  the shared, typed `src/shared/test/colorOf.ts` used by both suites.

## Approximate spend
Six implementer dispatches + seven reviews (one per task) + one whole-branch
final review, subagent-driven from a single controller session. Rough subagent
output total ≈ 1.05M tokens across ~13 dispatches; the controller kept task
context out of its own window by handing every brief/report/diff over as files.

## Retro — corrections became rules

1. **A gate configured is not a gate that bites.** The plan pasted an
   `.eslintrc.js` boundaries block verbatim; under the installed
   `eslint-plugin-boundaries@7`, extension-less TS imports classified as
   `isUnknown` and were silently exempt — the import boundary would have
   *looked* enforced while blocking nothing. It was caught only because Task 2
   carried an explicit AC-13 evidence step (deliberately-bad probes, linted
   then deleted), not by reading the config.
   → **Rule:** any spec/task that embeds third-party tool config for a
   mechanical gate must include a probe step that proves the gate *rejects a
   real violation* before the gate is called done — configuration presence is
   not evidence. The verifier reproduced this probe at step 7; keep that step.

2. **Pasted config/code is written against a version, not the installed one.**
   Two independent traps this milestone: the boundaries `policies`/`import-resolver`
   requirement above, and `@testing-library/react-native@14`'s async
   `render`/`rerender` + `TestInstance` (from `test-renderer`, not
   `react-test-renderer`) — the plan's synchronous test snippets would not
   compile. The second surfaced in Task 4 and would have re-surfaced in Tasks
   5 and 6.
   → **Rule:** when an implementer finds installed-dependency behavior that
   diverges from the plan's assumptions, the controller records it as a
   load-bearing cross-task fact and injects it into every later dispatch that
   touches the same surface (done for the async-render fact → Tasks 5/6).
   Durable toolchain assumptions live in the harness journal (this file's
   "Toolchain drift" section); candidate promotion to the delegation guide.

3. **The no-`any` rule applies to test code, and test utilities that would be
   duplicated across tasks belong in a shared home from the start.** A
   plan-mandated `colorOf = (node: any) => …` helper violated `CLAUDE.md` and
   was about to be copied into a second suite. It became the shared, typed
   `src/shared/test/colorOf.ts` (human-approved).
   → **Rule:** `CLAUDE.md`'s "no `any` without an inline justification" is not
   scoped to production code — test files included. A helper the plan repeats
   across tasks is a shared module, not a copy-paste.

4. **Mechanical gates must track new layers as they appear.** The no-hex rule
   was scoped to `src/features/**` + `src/shared/ui/**` — correct when written,
   but `src/app` (the custom tab bar, real UI) did not exist yet and slipped
   the net. The whole-branch review caught the gap; it was extended to
   `src/app/**` in the same milestone.
   → **Rule:** when a milestone introduces a new layer that bears an existing
   mechanical concern, extend the gate to it in the same change — don't leave
   the scope frozen at the moment the rule was first written.

5. **Environment limits are surfaced and deferred explicitly, never silently
   worked around.** `pod install` could not run (CocoaPods gems absent); it was
   reported at Task 1, tracked in the ledger, and deferred to the human's
   machine for the Task 7 simulator build (AC-14) rather than faked. Jest needs
   no pods, so tasks 1–6 were unaffected.
   → **Rule (already the intended path):** a blocker the sandbox can't resolve
   is logged and handed to human review with the exact remediation, not
   papered over — the same escape-hatch discipline as M1's ADR-for-dependency.
