# ADR 004: react-native-linear-gradient for the scene backdrop

**Status:** accepted
**Context:** The Teraz hero sits on a full-bleed deep→mid gradient derived
from the scene. M3's Skia atmosphere may supersede it, but M2 must render a
color-driven background without pulling Skia into a "static" milestone.
**Decision:** Use `react-native-linear-gradient` for the deep→mid backdrop.
**Consequences:** One native dep (autolinked, pods). If M3's Skia layer
replaces the backdrop, this is dropped — contained behind
`src/shared/ui/GradientBackground` so only one file changes.
