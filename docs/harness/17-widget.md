# Journal 17 — M-widget (home-screen WidgetKit widget) — HEADLESS SLICE

**Spec:** `docs/specs/017-widget.md` (AC-1..8) · **Plan:** `docs/superpowers/plans/2026-08-15-m-widget.md`
**Branch:** `feature/m-widget` (off `feature/m-pollutant-tiles`/PR #15; chain #3→…→#15 precede) · **PR:** #16 (draft)
**Built:** 2026-08-15, subagent-driven (3 headless tasks, per-task review each) + whole-branch review + verifier. **No new npm dependency.**

## What shipped (headless slice)
The **TS seam** for an iOS home-screen widget that mirrors the in-app Teraz hero for the active place. The app is the single source of truth: it bakes a fully-consistent snapshot (number, band, colors, tiles) in TS and (once the native gate lands) writes it to an App Group for the widget to draw **verbatim** — so the widget matches the app pixel-for-pixel with zero duplicated logic.
- `src/core/widget` — `buildWidgetSnapshot(reading, detail, scale, precision)` (pure; reuses `scene`/`displayValue`/`scaleLabel`/`formatPollutant`/`POLLUTANTS`), `widgetSnapshotIdentity`, `WidgetSync` seam, `WidgetSnapshot`/`WidgetTile`, `WIDGET_SNAPSHOT_VERSION`.
- `src/shared/widget` — `WidgetSyncProvider` publishes on reading-identity change (mirrors the `Notifier` provider pattern).
- `src/data/widget` — `createNativeWidgetSync` adapter; safe no-op when `NativeModules.WidgetSync` is absent (the current runtime state, and Android).
- `App.tsx` — `WidgetSyncProvider` mounted inside `ActivePlaceProvider` (under Settings).

## Design decisions (brainstorm + critic REWORK)
- **Pure app-synced verbatim** (critic REWORK resolved). The original "widget self-fetch + hourly refresh" (user's first pick) was cut after the critic found three blockers all tracing to the widget fetching: (B1) `displayValue` for US-AQI/µg/m³ needs the EPA table + precision, not derivable from the CAQI index → a fresh-color/stale-number card; (B2) "self-fetch" is really a 2-call GIOŚ client + JSON-LD parse, a second untested home for the contract; (B3) the default `location` place exposes no station id. All dissolve when the widget draws the app-baked snapshot and `buildWidgetSnapshot` is built from the `Reading` (which already carries station label + city). **User re-decided → pure app-synced.**
- **Identity keys on the full snapshot** (per-task review should-fix): keying on `displayValue`+`band` missed a precision toggle in CAQI mode (changes the *tiles* 13→13.0 but not the headline) → would leave the widget's tiles stale. `widgetSnapshotIdentity = JSON.stringify(snapshot)`.
- **Snapshot `version`** → widget shows a placeholder on schema mismatch (S4). **All-cached, single `measuredAt`** (S6). Schema trimmed to only drawn fields (S5).
- **Closed-app auto-refresh deferred** (Non-goal): v1 refreshes on app use; the widget shows the reading's age honestly.

## Native gate (Task 4 — PAUSED for the human, Xcode)
Much smaller than the self-fetch design (no Swift GIOŚ client, no color port, no station-id plumbing):
1. App Group `group.org.reactjs.native.example.Powietrze` — provisioned in the Developer portal, entitlement on **both** app + widget targets; suite string byte-identical in 3 places (app/widget `.entitlements` + native-module `suiteName:`); dev assert the suite is non-nil (S3 — `UserDefaults(suiteName:)` silently no-ops if unentitled).
2. Widget extension target `PowietrzeWidget` (WidgetKit/SwiftUI): `TimelineProvider` reads the App-Group snapshot; `systemSmall` + `systemMedium` views draw it verbatim; placeholder ("Otwórz aplikację") on absent/`version`-mismatch. No CAQI math, no networking.
3. Native module `WidgetSync` (Swift `RCTBridgeModule`): `writeSnapshot(String)` → App-Group `UserDefaults`; `reloadTimelines()` → `WidgetCenter.shared.reloadAllTimelines()`. Names must match `NativeModules.WidgetSync.{writeSnapshot,reloadTimelines}`.
4. `.pbxproj` + embed the extension; native rebuild. No `pod install` (pure WidgetKit).

## AC coverage
Gate: 58 suites / 208 tests · lint 0 errors · typecheck clean · `src/core` 100%.
- **AC-1** (buildWidgetSnapshot bakes every field) ✓ · **AC-2** (exact hex/band/displayValue at 7/63/175) ✓ (core).
- **AC-3** (provider publishes once/on-change/not-on-rerender/not-loading + core identity incl. CAQI precision edge) ✓.
- **AC-4** (adapter no-op absent / writeSnapshot+reloadTimelines present) ✓.
- **AC-5..8 (manual)** — PENDING native gate (widget renders/updates/placeholder on the sim).

Verifier: AC-1..4 all VERIFIED (10 widget tests, non-tautological). Whole-branch review: APPROVE, zero findings.

<!-- MANUAL EVIDENCE (append after native gate): docs/harness/evidence/17/. -->

## Deferred / next
- **Native gate (Task 4)** — do with the human in Xcode; then manual AC-5..8 + evidence/17.
- Closed-app auto-refresh; lock-screen/StandBy/large/accessory widgets; per-station widget config intent; Android app widget (native module no-ops there).
