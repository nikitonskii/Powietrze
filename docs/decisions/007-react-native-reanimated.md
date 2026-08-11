# ADR 007: react-native-reanimated for the atmosphere clock

**Status:** accepted
**Context:** The particle field needs a frame clock to drive upward drift + sine
wander off the JS thread; reduced-motion must freeze it. Skia's animation
integrates with Reanimated's shared values / frame callbacks.
**Decision:** Adopt `react-native-reanimated` (4.5) as the animation clock.
**Consequences:** Requires the worklets babel plugin (ADR-008) and a Jest mock
(`react-native-reanimated/mock`). Reanimated 4 is New-Architecture-only — fine,
RN 0.86 defaults New Arch on. The drift math is a pure function
(`particleOffset` in `src/core/atmosphere`) so it stays unit-testable
independent of the runtime.
