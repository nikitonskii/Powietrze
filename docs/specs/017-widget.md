# Spec 017: Home-screen WidgetKit widget (CAQI for the active place)

**Status:** draft
**Milestone:** M-widget · **Sources:** `design/` (CAQI color system: `src/core/scene` anchors/bands); live GIOŚ v1 API
**New native surface (not a JS library — the "no new dependencies" rule is about npm packages):** a WidgetKit app-extension target, an App Group, and a small custom native module. No new npm dependency.

## Goal
A home-screen iOS widget (small + medium) showing the current CAQI value, band,
and color for the **active place** — mirroring the in-app place — and staying
fresh via an hourly self-refresh even when the app isn't opened.

## Architecture (hybrid app-synced + self-refresh)
```
RN app, whenever the active-place reading updates:
  WidgetSync.publish(snapshot)                    [core seam → data adapter → native module]
    → writes snapshot JSON to App Group UserDefaults (group.org.reactjs.native.example.Powietrze)
    → WidgetCenter.shared.reloadAllTimelines()
Widget extension (Swift/WidgetKit), on each timeline refresh (~hourly + on reload):
  → reads the App Group snapshot (which station + cached values → instant paint / offline fallback)
  → self-fetches GIOŚ PM2.5 latest for that station id → recomputes index/band/color (always-fresh headline)
  → renders small / medium (medium's pollutant tiles use the cached snapshot values)
```
The App Group carries **which place** (station id/label) + a **cached snapshot**;
the widget self-fetches only the **PM2.5 headline** for freshness (pollutant tiles
use the cached values — they change slowly and share the snapshot's `measuredAt`).

## The snapshot (App-Group contract — the single interface between app and widget)
```ts
interface WidgetSnapshot {
  stationId: number;        // for the widget's self-fetch
  stationLabel: string;     // e.g. "Aleja Krasińskiego"
  city: string;             // e.g. "Kraków"
  index: number;            // CAQI (round(pm25/1.03))
  pm25: number;
  band: string;             // BANDS[bandOf(index)] — Polish name
  keyHex: string; deepHex: string; midHex: string;  // scene(index) colors (exact)
  pollutants: { code: string; value: number }[];    // for the medium tiles (cached)
  measuredAt: string;       // ISO/GIOŚ timestamp of the reading
  scale: string;            // display scale caption (CAQI / US AQI / µg/m³) for the headline number
  displayValue: string;     // pre-formatted headline per scale+precision (widget draws verbatim)
}
```
Storing `displayValue`/`keyHex` pre-computed keeps the app the single source of the
scale/precision/color rules; the widget's self-fetch only refreshes the raw index and
re-derives color/band from its Swift port of the anchor table (kept exact).

## Public API (the testable TS seam)

### `src/core/widget/index.ts` (new — pure)
```ts
export interface WidgetSnapshot { /* as above */ }
// Pure builder: reading + station + settings → the snapshot payload. No IO.
export function buildWidgetSnapshot(
  reading: Reading, detail: ReadingDetail | undefined, station: Station,
  scale: Scale, precision: Precision,
): WidgetSnapshot;
// The seam features/shared use; the native module implements it, a fake in tests.
export interface WidgetSync { publish(snapshot: WidgetSnapshot): void; }
```

### `src/data/widget/index.ts` (new)
```ts
// Adapter over the native module (NativeModules.WidgetSync) implementing WidgetSync.
// publish → native writeSnapshot(json) + reloadTimelines. No-op safe if module absent
// (Android / older builds) so the app never crashes without the extension.
export function createNativeWidgetSync(): WidgetSync;
```

### `src/shared/widget/` (provider)
```ts
// Reads the active place + its reading/detail + settings; calls publish(snapshot)
// whenever the active reading changes (NOT every render). Idempotent-ish: publishes
// only when the snapshot's identity (station + measuredAt + scale + precision) changes.
export function WidgetSyncProvider(props: { sync: WidgetSync; children: React.ReactNode }): JSX.Element;
```
`App.tsx`: mount `WidgetSyncProvider` under the providers that expose active place +
settings (ActivePlace + Settings), `sync={createNativeWidgetSync()}`.

## Native gate (Swift + Xcode — done with the human)
1. **App Group** `group.org.reactjs.native.example.Powietrze` — entitlement on the app target AND the widget target (Apple Developer portal + `.entitlements` files).
2. **Widget extension target** `PowietrzeWidget` (WidgetKit, SwiftUI): `TimelineProvider` (reads App Group snapshot → self-fetches PM2.5 → entry), `systemSmall` + `systemMedium` views, and a **Swift port of the CAQI color/band** (anchors `[(12,#5fe3a1),(38,#a8e063),(63,#f5c63d),(88,#ff9147),(125,#ff5c5c),(175,#c77dff)]` + lerp + bands ≤25/50/75/100/150). Refresh policy: `.after(now + 1h)`.
3. **Native module** `WidgetSync` (Swift, `RCTBridgeModule`): `writeSnapshot(String)` → App Group `UserDefaults(suiteName:)`; `reloadTimelines()` → `WidgetCenter.shared.reloadAllTimelines()`.
4. **`.pbxproj` + entitlements** surgery to add/embed the target — the fiddly part; done in Xcode with the human. `pod install` if the extension needs pods (it won't for MVP — pure WidgetKit + URLSession).

## Behavior — Acceptance Criteria

### Core (pure)
- **AC-1** — `buildWidgetSnapshot` maps a `Reading`(+detail, station, scale, precision)
  to the full `WidgetSnapshot`: `index`/`pm25`/`measuredAt` from the reading; `band ===
  BANDS[bandOf(index)]`; `keyHex/deepHex/midHex === scene(index).{key,deep,mid}`;
  `displayValue === displayValue(index, pm25, scale, precision)`; `pollutants` from
  `detail.pollutants` (or `[]` when detail undefined); `stationId/label/city` from the station.
- **AC-2** — color/band pinned at ≥3 indices spanning bands (e.g. 7 → Bardzo dobry/#5fe3a1-ish;
  63 → Umiarkowany/#f5c63d; 175+ → Bardzo zły/#c77dff), asserting the snapshot's hex/band
  match `scene()` exactly (guards the app↔widget color contract the Swift port must mirror).

### Integration
- **AC-3** — `WidgetSyncProvider` (fake `WidgetSync` + fake active place/reading/settings):
  publishes once on first ready reading; publishes again when station OR measuredAt OR
  scale OR precision changes; does NOT publish on an unrelated re-render (same identity);
  does NOT publish while the reading is loading/absent.
- **AC-4** — `createNativeWidgetSync` with the native module absent (`NativeModules.WidgetSync`
  undefined) → `publish` is a safe no-op (no throw) — the app runs without the extension.

### Manual (sim/device — journal + evidence/17)
- **AC-5** — Add the small + medium widget: shows the active place's CAQI number, band, and
  color, **matching the in-app Teraz hero** for the same place. Medium shows place + band +
  pollutant tiles (PM10/NO₂/…).
- **AC-6** — Change the active place in-app (e.g. Kraków → a favorite) → the widget reflects
  the new place after its reload.
- **AC-7** — Freshness: with the app closed, the widget refreshes on its hourly timeline
  (verify via a shortened refresh interval during the build) using its own GIOŚ fetch; on
  fetch failure it falls back to the cached snapshot (no blank/crash).
- **AC-8** — Cold state: widget added before the app has ever fetched → neutral placeholder
  ("Otwórz aplikację"), no crash.

## Non-goals (YAGNI)
- **Lock-screen / StandBy / Large / accessory widgets** — small + medium only.
- **Per-station widget configuration intent** — the widget mirrors the app's active place; a
  standalone picker is a later slice.
- **Android app widget** — iOS WidgetKit only this milestone (the native module no-ops on Android).
- **Historic 24h chart in the widget** — headline number + band + pollutant tiles only.

## Verification
- **AC-1..2** core `src/core/widget/__tests__/` (100% core).
- **AC-3** `src/shared/widget/__tests__/` (render/renderHook + fake sync/store).
- **AC-4** `src/data/widget/__tests__/` (module-absent no-op).
- **AC-5..8** manual on the sim, journal `docs/harness/17-widget.md` + evidence/17.

## Build note (native — the interactive gate)
Task order: (1) core `buildWidgetSnapshot`+`WidgetSync` (AC-1..2); (2) `WidgetSyncProvider`
(AC-3); (3) `createNativeWidgetSync` adapter + App.tsx wiring (AC-4); (4) **native gate** —
App Group + widget target + Swift views/provider/CAQI-port + native module + `.pbxproj`
(with the human, Xcode); (5) native run + manual AC-5..8 + journal. Steps 1–3 are
headless-testable; step 4 is the interactive native gate.

## Open questions (for the critic)
1. Snapshot carries pre-computed `displayValue`+`keyHex` (app owns scale/precision/color) but
   the widget self-fetch re-derives index/color in Swift — is that split coherent, or should
   the widget re-derive `displayValue` too (needs the scale/precision in the snapshot — it has `scale`)?
2. Medium tiles from the cached snapshot while the headline self-refreshes — acceptable
   staleness split, or fetch PM10/NO₂ in the widget too?
3. `WidgetSyncProvider` publish-identity key (station+measuredAt+scale+precision) — enough, or edge cases?
