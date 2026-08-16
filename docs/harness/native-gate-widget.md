# Native gate — Home-screen widget (WidgetKit) + `react-native-widget-sync` Turbo Module

Reproducible, step-by-step record of building the widget's native half. Spec 017 ·
ADR-014 · RN 0.86.2, New Architecture, Xcode 26.2, iPhone 16 Pro sim.

Legend: **[AI]** = done by Claude (code/CLI) · **[YOU]** = Xcode GUI / Apple-account /
sim-interaction steps that require a human.

## Overview of the pieces
- **Local package** `modules/react-native-widget-sync/` — the `WidgetSync` Turbo
  Module (writes JSON to an App Group + reloads widgets). Reusable/extractable.
- **App**: the WidgetKit extension target `PowietrzeWidget` (SwiftUI, reads the App
  Group) + the App Group capability on the app and widget targets.
- **App Group**: `group.org.reactjs.native.example.Powietrze`, key `widgetSnapshot`.

---

## Step 1 — [AI] Scaffold the local package (New-Arch interop native module)
Files under `modules/react-native-widget-sync/`:
- `package.json` — name `react-native-widget-sync`, RN peer dep. **No `codegenConfig`** (see the pivot note below).
- `react-native-widget-sync.podspec` — the pod (source `ios/**/*.{h,m,mm,swift}`, `install_modules_dependencies`).
- `src/NativeWidgetSync.ts` — typed spec: `Spec extends TurboModule` (`writeSnapshot`, `reloadTimelines`) + `TurboModuleRegistry.get<Spec>('WidgetSync')` (nullable → no-op when absent).
- `src/index.ts` — re-exports the module.
- `ios/WidgetSync.swift` — `@objc(WidgetSync)` Swift class: `writeSnapshot(_:)` → App-Group `UserDefaults`, `reloadTimelines()` → `WidgetCenter.reloadAllTimelines()`, `requiresMainQueueSetup → false`.
- `ios/WidgetSync.mm` — `RCT_EXTERN_MODULE(WidgetSync, NSObject)` + `RCT_EXTERN_METHOD` for both methods (registers the Swift class with RN; interop-served under bridgeless).

> **Pivot note (documented gotcha).** First attempt was a *pure codegen JSI Turbo
> Module* (`codegenConfig` + Swift conforming to the generated `NativeWidgetSyncSpec`).
> It fails to build: the codegen protocol lives in the C++/ObjC++ `ReactCodegen`
> module, and **Swift cannot import it** — `import WidgetSyncSpec` → *no such module*;
> `import ReactCodegen` → *could not build Objective-C module 'ReactCodegen' … must be
> compiled as Obj-C++*. And the impl **must** be Swift because `WidgetCenter` is
> Swift-only. Resolution: drop `codegenConfig`, expose the Swift class via
> `RCT_EXTERN_MODULE` (interop). Still New Arch at runtime. A pure-JSI module would
> need an extra ObjC++ shim forwarding to Swift (future option).

## Step 2 — [AI] Link the package into the app
- Add `"react-native-widget-sync": "file:modules/react-native-widget-sync"` to the app `package.json` dependencies.
- `npm install` → symlinks the package into `node_modules/` (RN autolinking discovers it there).

## Step 3 — [AI] Revise the app adapter to the Turbo Module
- `src/data/widget/createNativeWidgetSync` imports the package's module instead of `NativeModules.WidgetSync`; nullable `get` → no-op when the native side isn't built (preserves AC-4). Update its jest test/mock.

## Step 4 — [YOU] Create the Widget Extension target (Xcode)
1. Open `ios/Powietrze.xcworkspace` in Xcode.
2. `File → New → Target… → iOS → Widget Extension`. Product name **`PowietrzeWidget`**. **Uncheck** "Include Live Activity" and **uncheck** "Include Configuration App Intent" (we want a static widget). Finish. If asked to activate the `PowietrzeWidget` scheme, **Activate**.
3. This creates `ios/PowietrzeWidget/` with `PowietrzeWidget.swift`, `Info.plist`, and an `.entitlements`, added to the new target. Leave the generated Swift for now — [AI] replaces it in Step 6.

## Step 5 — [YOU] Add the App Group capability to BOTH targets
For **each** of the `Powietrze` (app) target and the `PowietrzeWidget` target:
`Signing & Capabilities → + Capability → App Groups → +` and enter
**`group.org.reactjs.native.example.Powietrze`** (identical string). Ensure a Team
is selected so signing succeeds. (On a personal team App Groups still work on the
**simulator**; a paid team is only needed for device/TestFlight.)
Tell Claude when Steps 4–5 are done (+ confirm the generated widget file path).

## Step 6 — [AI] Write the widget Swift + wire the module
- Replace `ios/PowietrzeWidget/PowietrzeWidget.swift` with the real widget:
  `WidgetSnapshot`/`WidgetTile` Codable structs, an App-Group loader (JSON decode +
  `version` check → placeholder on mismatch/absent), `TimelineProvider`
  (single entry, reload driven by the app — refresh policy `.never`), `systemSmall`
  + `systemMedium` SwiftUI views drawing the baked fields verbatim (hex→Color, a
  small relative-age formatter for `measuredAt`), placeholder view ("Otwórz aplikację").
- Confirm the widget's `.entitlements` App Group string matches.

## Step 7 — [AI] pod install
- `cd ios && pod install` → autolinks `react-native-widget-sync` (no per-module
  codegen — it's an interop module). Confirm it appears in `Podfile.lock`.
- **Done:** package builds green (`WidgetSync.swift` + `WidgetSync.mm` compile);
  autolinked; app builds with the module present.

## Step 8 — [AI] Build + iterate
- `xcodebuild -workspace Powietrze.xcworkspace -scheme Powietrze -sdk iphonesimulator -destination 'id=<sim>' build` — fix compile/codegen errors.
- Confirm the app still launches with the Turbo Module present (writeSnapshot now
  actually populates the App Group; a dev assert checks `UserDefaults(suiteName:)` non-nil).

## Step 9 — [YOU] Add the widget to the sim home screen + verify (manual ACs 5–8)
1. In the sim, go to the Home Screen, long-press → **+** (top-left) → search "Powietrze" → add the **small** and **medium** widgets.
2. AC-5: widget shows the active place's CAQI number/band/color matching the in-app hero; medium shows city+band+tiles.
3. AC-6: change the active place in-app → the widget updates (app calls `reloadAllTimelines`).
4. AC-8: (fresh install, before the app has fetched) widget shows "Otwórz aplikację".
Screenshot each → `docs/harness/evidence/17/`.

---

## Later: publishing/extracting the package
`modules/react-native-widget-sync/` is already a standalone package (own
`package.json`/podspec/spec/Swift). To extract: move the folder to its own repo,
`npm publish`, swap the app's `file:` dep for the version range. The WidgetKit
extension stays in the app and continues to read the shared App Group.
