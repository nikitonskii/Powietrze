# ADR 006: react-native-skia for the atmosphere

**Status:** accepted
**Context:** M3's signature is a particle field of up to ~235 blurred particles
drifting at ~60fps behind the Teraz hero, plus a radial number-glow. A
View-per-particle field (Reanimated + RN Views) cannot hold 55fps at that count
nor render shader-like blur/glow; the design specifies a Skia shader layer.
**Decision:** Adopt `@shopify/react-native-skia` (2.11) to draw the particle
field and the radial glow disc in a single canvas.
**Consequences:** A large native dep (pods, longer iOS build) and a Jest mock
(`@shopify/react-native-skia/jestSetup.js`). Contained behind
`src/shared/ui/Atmosphere` + `NumberGlow`, so a later Skia swap or the M3.5
skyline touches one layer. Rendering verified on RN 0.86 / New Architecture /
Xcode 26.2 via the Task-1 build spike.
