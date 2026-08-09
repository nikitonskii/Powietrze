# ADR 005: UI test & import-boundary tooling

**Status:** accepted
**Context:** M2 is the first rendered surface and the first milestone to span
layers. It needs component tests and mechanical import-direction enforcement.
**Decision:** Add `@testing-library/react-native` (behavior tests over
snapshots) and `eslint-plugin-boundaries` (enforces app→features→shared→core,
no cross-feature imports). Grouped as one ADR: both are low-stakes M2 quality
tooling, not architectural forks.
**Consequences:** Component tests run under the RN Jest preset with native
mocks (Task 2). A wrong-direction import now fails `npm run lint` / CI.
