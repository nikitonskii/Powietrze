# ADR-014: Widget data bridge as a New-Architecture native module in a local package

**Status:** accepted · **Date:** 2026-08-15 · **Milestone:** M-widget (native gate) · **Spec:** 017 · **Supersedes:** spec 017 Task 4's inline `NativeModules.WidgetSync` sketch

## Context
The home-screen widget (spec 017) is app-synced: the RN app must write a baked
`WidgetSnapshot` (JSON) into a shared **App Group** `UserDefaults` and ask
WidgetKit to reload. A widget extension runs in its own sandbox and cannot read
React Native's `AsyncStorage`, so a native bridge is unavoidable. The app is bare
RN 0.86.2 on the **New Architecture**.

Two decisions were needed: (1) legacy `RCTBridgeModule` vs a New-Arch **Turbo
Module**; (2) inline in the app vs a **local, extractable package**.

## Decision
Build the bridge as a **New-Architecture native module** (`WidgetSync`) shipped in a
**local package `react-native-widget-sync`** under `modules/`, linked into the app
via a `file:` dependency and RN autolinking.

- **Native module (New Arch, interop-served):** a **Swift** implementation
  (`ios/WidgetSync.swift`) exposed to RN via `RCT_EXTERN_MODULE` (`ios/WidgetSync.mm`).
  Under bridgeless New Arch this legacy-registered module is served through the
  **interop layer**, so the JS side's `TurboModuleRegistry.get<Spec>('WidgetSync')`
  (nullable `get`, not `getEnforcing`, so a build without the native side degrades to
  a no-op) resolves it. The TS spec (`src/NativeWidgetSync.ts`) keeps the module
  strongly typed.
- **Why not a pure codegen JSI Turbo Module:** two hard constraints collide.
  `reloadTimelines` needs `WidgetCenter`, which is **Swift-only** (no ObjC surface),
  so the impl must be Swift. But RN's codegen protocol (`NativeWidgetSyncSpec`) ships
  inside the **C++/ObjC++ `ReactCodegen` module, which Swift cannot `import`**
  (`error: no such module` / "must be compiled as Obj-C++"). A pure JSI Turbo Module
  would therefore require an extra ObjC++ shim conforming to the codegen protocol and
  forwarding to the Swift class — real glue for a two-method fire-and-forget bridge.
  The interop path is New Arch at runtime, far simpler, and reliable. (The ObjC++
  shim remains an available upgrade if a pure-JSI module is ever needed — noted for
  the future package.) `codegenConfig` was consequently **removed** from the package.
- **Local package:** autolinking is built around packages — a package with a podspec
  is picked up automatically by `pod install`. It is also the "split RN package" we'd
  extract to anyway, so we do it from the start.

## Boundary (what is / isn't in the package)
- **In the package (reusable):** the `WidgetSync` Turbo Module — two methods,
  `writeSnapshot(json: string): void` (→ App-Group `UserDefaults`) and
  `reloadTimelines(): void` (→ `WidgetCenter.reloadAllTimelines()`) — plus the JS
  spec. Generic: "write a JSON blob to an App Group + reload widgets." It does NOT
  know about CAQI/`WidgetSnapshot`.
- **Stays in the app:** the **WidgetKit extension target** (SwiftUI views +
  timeline provider) — an app extension carries entitlements and is app-specific,
  so it cannot live in a JS package. It *reads* the App Group the package writes.
  Also app-side: `src/core/widget` (the `WidgetSnapshot` contract + builder) and
  `src/data/widget/createNativeWidgetSync` (adapts the app's `WidgetSync` core seam
  onto the package's generic Turbo Module — so features still depend only on core).

## App Group contract
Suite `group.org.reactjs.native.example.Powietrze`, key `widgetSnapshot` (a JSON
string). The suite string must be byte-identical across: the package's Swift
(`UserDefaults(suiteName:)`), the app target's `.entitlements`, and the widget
target's `.entitlements`. `UserDefaults(suiteName:)` returns `nil` (writes silently
no-op) if the target isn't entitled — a dev assert guards this.

## Consequences
- One local package + `npm install` (symlinks it into `node_modules`) + `pod install`
  (autolinks the podspec). A **native rebuild** is required. (No per-module codegen —
  the interop module doesn't use `codegenConfig`.)
- The app's `src/data/widget` adapter changes from reading `NativeModules.WidgetSync`
  to importing the package's Turbo Module (nullable `get` preserves the no-op path
  and AC-4). Its jest test updates accordingly (mock the package/TurboModuleRegistry).
- The widget extension target + the App Group capability on both targets are created
  in Xcode (portal/team-gated, GUI) — documented step-by-step in
  `docs/harness/native-gate-widget.md`.
- Alternatives rejected: **legacy `RCTBridgeModule`** (works via New-Arch interop but
  the user asked for New Arch, and it's not the extraction shape); **inline Turbo
  Module** (manual provider registration; migration to a package later = more total work).

## Alternatives considered
- `react-native-shared-group-preferences` / `react-native-user-defaults` (npm) —
  a new third-party dep for a two-method bridge; rejected (we own a tiny module).
- `react-native-widgetkit` (community) — broader than we need + a third-party dep;
  rejected. Our package can later be published if useful.
