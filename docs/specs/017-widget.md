# Spec 017: Home-screen WidgetKit widget (CAQI for the active place)

**Status:** implemented — AC-1..4 automated+verified; native gate built (Turbo Module package + widget extension + App Group, ADR-014) with the app→App-Group snapshot VERIFIED live on the sim; AC-5..8 = final human sim check (add widget to home screen). Journal: `docs/harness/17-widget.md` · Native gate: `docs/harness/native-gate-widget.md`
**Milestone:** M-widget · **Sources:** `design/` (CAQI color system: `src/core/scene`); the in-app Teraz hero (the widget mirrors it)
**New native surface (not an npm library — the "no new dependencies" rule is about npm packages):** a WidgetKit app-extension target, an App Group, and a small custom native module. No new npm dependency.
**Critic:** REWORK → resolved. The self-fetch/self-refresh model was cut (its B1/B2/B3 all traced to the widget fetching); v1 is **pure app-synced verbatim draw** per the critic's recommendation. S1–S6 folded in. `.superpowers/sdd/critic-017.md`.

## Goal
A home-screen iOS widget (small + medium) showing the current CAQI value, band,
and color for the **active place** — mirroring the in-app Teraz hero exactly.

## Architecture (pure app-synced, verbatim draw)
```
RN app, whenever the active-place reading changes:
  WidgetSync.publish(snapshot)                 [core seam → data adapter → native module]
    → writes a fully-baked snapshot JSON to App Group UserDefaults
      (suite group.org.reactjs.native.example.Powietrze)
    → WidgetCenter.shared.reloadAllTimelines()
Widget extension (Swift/WidgetKit), on each timeline reload:
  → reads the App Group snapshot → DRAWS IT VERBATIM (small / medium)
```
The app is the **single source of truth**: every displayed string and color is
computed in TS (the same `scene`/`displayValue`/`formatPollutant` the app uses) and
baked into the snapshot, so the widget matches the app **exactly** and needs **no**
CAQI/color port and **no** networking in Swift. Freshness follows app use (the
widget reloads whenever the app republishes); the snapshot's `measuredAt` lets the
widget show the reading's age honestly ("X godz temu"). Closed-app auto-refresh is a
deferred follow-up (see Non-goals).

## The snapshot (App-Group contract — the only interface between app and widget)
```ts
export const WIDGET_SNAPSHOT_VERSION = 1;      // bump on any breaking schema change (S4)
export interface WidgetTile { label: string; value: string; unit: string } // baked, drawn verbatim
export interface WidgetSnapshot {
  version: number;          // WIDGET_SNAPSHOT_VERSION — widget shows placeholder on mismatch
  city: string;             // reading.city (e.g. "Kraków")
  stationLabel: string;     // reading.station (label already carried by Reading)
  displayValue: string;     // baked headline per scale+precision (widget draws verbatim)
  scaleCaption: string;     // scaleLabel(scale) — "µg/m³" hidden case handled app-side
  band: string;             // BANDS[bandOf(index)] — Polish
  keyHex: string; deepHex: string; midHex: string;  // scene(index) colors, baked exact
  tiles: WidgetTile[];      // baked pollutant tiles for medium (label+formatted value+unit)
  measuredAt: string;       // GIOŚ timestamp of the reading (widget renders relative age)
}
```
No `stationId`, no raw `index`/`pm25` — the widget never recomputes anything, so the
schema carries only what is drawn (S5: one model, trimmed). Built from the `Reading`
(+ optional `ReadingDetail`), so it works for the default **location** place too —
`Reading` already has `station` label + `city`, so no station-id exposure is needed (B3 moot).

## Public API (the testable TS seam)

### `src/core/widget/index.ts` (new — pure)
```ts
export interface WidgetTile { /* as above */ }
export interface WidgetSnapshot { /* as above */ }
export const WIDGET_SNAPSHOT_VERSION = 1;
// Pure builder: reading (+ optional detail) + settings → the fully-baked snapshot. No IO,
// no Station param. Uses scene()/displayValue()/scaleLabel()/formatPollutant()/POLLUTANTS
// (all core) so the widget draws verbatim.
export function buildWidgetSnapshot(
  reading: Reading, detail: ReadingDetail | undefined, scale: Scale, precision: Precision,
): WidgetSnapshot;
// The seam features/shared use; the native module implements it, a fake in tests.
export interface WidgetSync { publish(snapshot: WidgetSnapshot): void; }
```

### `src/data/widget/index.ts` (new)
```ts
// Adapter over the native module (NativeModules.WidgetSync). publish → JSON.stringify →
// native writeSnapshot(json) + reloadTimelines(). Module absent (Android / pre-extension
// build) → safe no-op so the app never crashes. (AC-4)
export function createNativeWidgetSync(): WidgetSync;
```

### `src/shared/widget/` (provider)
```ts
// Reads the active place's reading + detail + settings; calls publish(snapshot) whenever
// the reading IDENTITY changes — keyed on (city + stationLabel + measuredAt + scale +
// precision + displayValue). Publishes once on the first ready reading; NOT on unrelated
// re-renders; NOT while loading/absent. (AC-3)
export function WidgetSyncProvider(props: { sync: WidgetSync; children: React.ReactNode }): JSX.Element;
```
`App.tsx`: mount `WidgetSyncProvider` under ActivePlace + Settings, `sync={createNativeWidgetSync()}`.

## Native gate (Swift + Xcode — done with the human; much smaller now: no fetch, no port)
1. **App Group** `group.org.reactjs.native.example.Powietrze` — provisioned in the Apple
   Developer portal, entitlement added to **both** the app target and the widget target.
   **S3:** the suite string must be byte-identical in 3 places — app `.entitlements`, widget
   `.entitlements`, native-module `UserDefaults(suiteName:)`; `UserDefaults(suiteName:)` returns
   `nil` (writes silently no-op) if unentitled → add a dev-time assert that the suite is non-nil.
2. **Widget extension target** `PowietrzeWidget` (WidgetKit, SwiftUI): a `TimelineProvider`
   that reads the App-Group snapshot (single static entry; reload driven by the app), and
   `systemSmall` + `systemMedium` SwiftUI views that draw the snapshot fields verbatim
   (number = `displayValue`, colors from the baked `keyHex/deepHex/midHex`, band, tiles,
   relative `measuredAt`). **No CAQI math, no color lerp, no networking in the widget.**
3. **Native module** `WidgetSync` (Swift, `RCTBridgeModule`): `writeSnapshot(String)` →
   App-Group `UserDefaults`; `reloadTimelines()` → `WidgetCenter.shared.reloadAllTimelines()`.
4. **`.pbxproj` + entitlements** surgery to add/embed the target — the fiddly part, in Xcode
   with the human. No `pod install` needed (pure WidgetKit, no third-party code).

## Behavior — Acceptance Criteria

### Core (pure)
- **AC-1** — `buildWidgetSnapshot(reading, detail, scale, precision)` maps to the full
  `WidgetSnapshot`: `version === WIDGET_SNAPSHOT_VERSION`; `city`/`stationLabel`/`measuredAt`
  from the reading; `displayValue === displayValue(reading.index, reading.pm25, scale, precision)`;
  `scaleCaption === scaleLabel(scale)`; `band === BANDS[bandOf(reading.index)]`;
  `keyHex/deepHex/midHex === scene(reading.index).{key,deep,mid}`; `tiles` from
  `detail.pollutants` each `{ label: POLLUTANTS-label, value: formatPollutant(value, precision),
  unit: 'µg/m³' }`, or `[]` when `detail` is undefined.
- **AC-2** — snapshot color/band/`displayValue` pinned at ≥3 indices spanning bands, asserting
  they equal `scene()`/`bandOf()`/`displayValue()` EXACTLY (the app↔widget contract):
  index 7 → `keyHex === '#5fe3a1'` (below first anchor → exact first anchor) & band `Bardzo dobry`;
  index 63 → `keyHex === '#f5c63d'` & `Umiarkowany`; index 175 → `keyHex === '#c77dff'` & `Bardzo zły`.

### Integration
- **AC-3** — `WidgetSyncProvider` (fake `WidgetSync` + fake active place/reading/detail/settings):
  publishes once on the first ready reading; publishes again when identity changes (new
  `measuredAt`, or `scale`/`precision` change, or place switch changes `stationLabel`/`city`);
  does NOT publish on an unrelated re-render (unchanged identity); does NOT publish while the
  reading is loading/absent.
- **AC-4** — `createNativeWidgetSync` with `NativeModules.WidgetSync` undefined → `publish` is a
  safe no-op (no throw), incl. the JSON stringify guarded — the app runs without the extension.

### Manual (sim/device — journal `docs/harness/17-widget.md` + evidence/17)
- **AC-5** — Add the small + medium widget: it shows the active place's CAQI number, band, and
  color **identical to the in-app Teraz hero** for the same place. Medium additionally shows
  city + band + the pollutant tiles (PM10/NO₂/…), matching the app's tiles.
- **AC-6** — Change the active place in-app (Kraków → a favorite, or toggle location) → after the
  app republishes, the widget reflects the new place (verify small + medium).
- **AC-7** — The widget shows the reading's relative age from `measuredAt` ("X godz temu"); when
  the app republishes (foreground fetch), `reloadAllTimelines` updates the widget. (No self-fetch;
  closed-app auto-refresh is out of scope — see Non-goals.)
- **AC-8** — Cold/invalid state: snapshot absent, OR `version` != `WIDGET_SNAPSHOT_VERSION` (S4) →
  neutral placeholder ("Otwórz aplikację"), no crash.

## Non-goals (YAGNI)
- **Closed-app auto-refresh** (widget self-fetch / BGAppRefreshTask) — deliberately deferred;
  v1 refreshes on app use. Revisiting it means either a Swift display-pipeline port or
  background-JS plumbing (its own spec/ADR).
- **Lock-screen / StandBy / Large / accessory widgets**; **per-station widget configuration intent**
  (widget mirrors the app's active place); **Android app widget** (native module no-ops on Android);
  **24h chart in the widget**.

## Verification
- **AC-1..2** core `src/core/widget/__tests__/` — enforced `src/core` 100% gate (jest.config `./src/core/`).
- **AC-3** `src/shared/widget/__tests__/` (render/renderHook + fake sync/store).
- **AC-4** `src/data/widget/__tests__/` (module-absent no-op).
- **AC-5..8** manual on the sim, journal + evidence/17.

## Build note (native — the interactive gate)
Task order: (1) core `buildWidgetSnapshot`+`WidgetSync`+`WIDGET_SNAPSHOT_VERSION` (AC-1..2);
(2) `WidgetSyncProvider` (AC-3); (3) `createNativeWidgetSync` adapter + App.tsx wiring (AC-4);
(4) **native gate** — App Group + widget target + SwiftUI verbatim views + native module +
`.pbxproj` (with the human, Xcode); (5) native run + manual AC-5..8 + journal. Steps 1–3 are
headless-testable; step 4 is the interactive native gate.

## Resolved (critic)
- **B1/B2/B3** dissolved by cutting self-fetch — widget draws the baked snapshot; built from
  `Reading` (no station-id needed); no Swift GIOŚ client/color port.
- **S1** no cross-language color port to drift (colors baked). **S2** AC-7 reworded (no refresh
  guarantee). **S3** App-Group 3-way match + non-nil assert in the gate. **S4** snapshot `version`
  + AC-8 mismatch→placeholder. **S5** schema trimmed to the verbatim model. **S6** all-cached,
  single `measuredAt`. Minors: exact hex in AC-2; `city`/`stationLabel` sourced from `Reading`.
