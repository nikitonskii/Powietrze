# ADR-001: Bare React Native over Expo

**Status:** Accepted · 2026-08-04

## Context
The WidgetKit extension is a core product feature (design handoff §Widgets).
Expo's Continuous Native Generation treats `ios/` as disposable, so an extra
Xcode target must be re-injected by config plugins on every prebuild —
generated-code indirection that hides native changes from review. The
project's primary goal is a transparent agent harness; EAS is not used.

## Decision
Bare React Native via `@react-native-community/cli`; `ios/` is committed;
the widget will be a normal Xcode target with an App Group (M8).

## Consequences
- (+) Native diffs are visible and reviewable; no plugin layer to debug.
- (+) Widget/App-Group work is standard Xcode practice.
- (−) Community libraries are hand-picked (location, storage, notifications);
  each addition requires an ADR (NFR-7).
- (−) RN upgrades are manual (`react-native upgrade` + diff review).
