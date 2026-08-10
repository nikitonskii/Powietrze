# ADR 003: React Navigation for app navigation

**Status:** accepted
**Context:** M2 introduces the 3-tab shell (Teraz · Miejsca · Ustawienia);
M5/M6 need real multi-screen flows (search, detail, settings). A hand-rolled
switcher would be rewritten then.
**Decision:** Adopt `@react-navigation/native` + `@react-navigation/bottom-tabs`
(v7) with `react-native-screens`. M2 supplies a custom `tabBar` (design blur +
key/accent tints); default bar styling is insufficient.
**Consequences:** Native deps (screens) → pods + jest mocks. Real backdrop
blur is deferred (needs a BlurView dep) — M2 uses the translucent rgba token;
tab icons (SF Symbols) deferred with it. Reversible only by rewriting nav.
