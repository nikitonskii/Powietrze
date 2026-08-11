# ADR 008: react-native-worklets (Reanimated 4 runtime)

**Status:** accepted
**Context:** Reanimated 4 splits its worklet runtime into a separate package,
`react-native-worklets`, which also owns the babel plugin
(`react-native-worklets/plugin`). RN autolinking only registers its iOS pod
(`RNWorklets`) when it is a **direct** dependency — as a transitive dep,
`pod install` failed with "Unable to find a specification for RNWorklets"
(caught in the Task-1 spike).
**Decision:** Add `react-native-worklets` (0.11) as a direct dependency and put
its babel plugin last in `babel.config.js`.
**Consequences:** Coupled to the Reanimated 4 major; if Reanimated is dropped or
downgraded to 3.x, this dependency and the babel plugin path change. No runtime
API is consumed directly — it exists for the babel plugin + native worklet
runtime.
