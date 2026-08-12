# ADR-012: Gestures via react-native-gesture-handler

**Status:** accepted · **Date:** 2026-08-12 · **Milestone:** M-miejsca-polish B

## Context
Miejsca needs swipe-to-delete and long-press drag-reorder on favorites. Bare RN 0.86,
New Architecture, `react-native-reanimated` 4.5.3 already present.

## Decision
Use `react-native-gesture-handler@^3.1.0` — swipe via its `ReanimatedSwipeable`, reorder
via a custom Reanimated long-press→Pan gesture composed with it (axis separation:
vertical `activeOffsetY` drag vs the swipe's horizontal `activeOffsetX`).

## Alternatives considered
- **react-native-draggable-flatlist** — a ready-made reorder list, but uncertain
  Reanimated-4 / New-Arch support on RN 0.86, and another dep. Rejected (build reorder custom).
- **PanResponder (RN core)** — no native-thread gestures, no `Swipeable`; worse feel.
- **react-native-gesture-handler** — the RN-community standard; v3 is New-Architecture-only
  (matches RN 0.86's New Arch default); provides `ReanimatedSwipeable`. Chosen.

## Consequences
- One pod. `<GestureHandlerRootView style={{ flex: 1 }}>` at the app root (the `flex: 1`
  is mandatory or the root collapses to a blank screen).
- RNGH 3.1.0 ships **ESM-only** (no `lib/commonjs`) → Jest needs it added to
  `transformIgnorePatterns`, plus `import 'react-native-gesture-handler/jestSetup'` at the
  top of `jest.setup.js`.
- No babel plugin required (the `react-native-worklets/plugin` stays last, unaffected).
