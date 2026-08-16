# Critic review — Spec 017: Home-screen WidgetKit widget

**Verdict: REWORK** (the hybrid "app-synced + self-refresh" data model is internally
incoherent as specified — three blocking defects all trace to the widget's self-fetch,
and all dissolve if the widget draws the app-published snapshot verbatim for MVP.)

The TS seams (`buildWidgetSnapshot`, `WidgetSync`, provider, no-op adapter) are
well-drawn and layering-clean; the architecture section around them is not.

Mode: escalated to ADVERSARIAL after finding B1 + B2 + B3 (multiple blockers → systemic).

---

## Pre-commitment predictions vs findings
Predicted before deep read: (1) displayValue↔recomputed-color drift; (2) Swift lerp/port
drift from TS; (3) App Group entitlement/suiteName silent-fail; (4) WidgetKit refresh-budget
optimism; (5) — did NOT predict — the location place surfaces no numeric stationId.
All five confirmed. #5 (B3) is the sharpest and I only found it by tracing the provider's
data sources.

---

## BLOCKING

### B1 — displayValue and re-derived color/band drift out of sync (Architecture; snapshot; Open Q1)
`## Architecture` says the widget self-fetches PM2.5 and "recomputes index/band/color
(always-fresh headline)", while the snapshot stores `displayValue` pre-formatted and the
prose says "Storing `displayValue`/`keyHex` pre-computed keeps the app the single source
of the scale/precision rules; the widget's self-fetch only refreshes the raw index and
re-derives color/band". These two cannot both hold.

- The whole point of self-fetch is that fresh PM2.5 != cached PM2.5. When it differs, the
  widget paints a **fresh** color/band but a **stale** `displayValue` number.
- Concrete failure: cached `pm25:40 -> index 39`, `scale:'CAQI'`, `displayValue:"39"`,
  green `keyHex`. An hour later the widget self-fetches `pm25:82 -> index 80`; its Swift
  port recomputes band `Dostateczny` and an orange `keyHex`. The widget now shows an
  **orange "Dostateczny" card with the number "39"**. Color/band say bad, number says good.
- Worse for non-CAQI scales: `displayValue(index,pm25,'US AQI',_)` = `usAqiFromPm25(pm25)`
  (EPA piecewise table, `src/core/air/index.ts:50-56`) and `'µg/m³'` = `formatConcentration(pm25,precision)`
  — **neither is derivable from the CAQI `index`.** The widget can only refresh the number
  if it also ports `usAqiFromPm25` + `formatConcentration` to Swift — which the spec
  explicitly refuses ("app is the single source of scale/precision rules"). And the snapshot
  carries `scale` but **not `precision`**, so even µg/m³ can't be re-formatted widget-side.

Open Q1's proposed fix ("re-derive `displayValue` too — it has `scale`") is wrong: it lacks
`precision` and would force the EPA table into Swift, killing the stated design goal.

**Fix (recommended): drop the self-fetch for MVP.** The app publishes a fully-consistent
snapshot; the widget draws it verbatim. This also removes the need for the Swift CAQI/lerp
port entirely (see S1) since `keyHex/deep/mid/band/displayValue` are already baked. If
self-fetch is truly required, you must port the full display pipeline (`usAqiFromPm25`,
`formatConcentration`, CAQI) + add `precision` to the snapshot, and accept the drift
window — but that contradicts the spec's own rationale.

### B2 — "self-fetch PM2.5 latest for that station id" is under-specified and larger than stated (Architecture; Native gate §2; snapshot)
Real GIOŚ retrieval is **two calls + JSON-LD parsing**, not one: `src/data/gios/source.ts:30-36`
does `GET /station/sensors/{id}` -> `findPm25SensorId` (parses Polish JSON-LD keys
`Wskaźnik - kod`, `Identyfikator stanowiska`, `mappers.ts:8-10,33-35`) -> `GET /data/getData/{sensorId}`
-> `parseLatestPm25`. The snapshot stores `stationId` but **not** the resolved PM2.5
`sensorId`, so the Swift widget must re-implement `findPm25SensorId` + `parseLatestPm25`
against verbose untyped GIOŚ JSON — a second, **Jest-untestable** home for the GIOŚ contract.
The spec's one-line "self-fetches GIOŚ PM2.5 latest for that station id" hides this entirely.
Also: ADR-009 scoped direct-GIOŚ to the app; a widget-extension network client on a
WidgetKit timeline is a new networking surface (own rate-limit/failure profile) with no ADR
amendment. **Fix:** drop self-fetch (B1), or at minimum store the resolved `sensorId` in the
snapshot and specify the exact two-call flow + JSON-LD keys the Swift port must mirror, and
amend ADR-009.

### B3 — the DEFAULT active place ("location") cannot supply `stationId` (Public API / provider; snapshot)
`buildWidgetSnapshot(..., station: Station, ...)` needs a `Station` (for `stationId/label/city`),
and the snapshot's `stationId` is mandatory for the widget self-fetch. But when the active
place is `{kind:'location'}` — the **default** (`DEFAULT_SETTINGS.loc:true`,
`src/core/settings/index.ts:16`) — no `Station` is available to the provider:
- `ActivePlace` for location is `{kind:'location'}` with no station (`src/core/places/index.ts`).
- `Reading` has **no id/station-number field** — only `station: string` label + `city`
  (`src/core/air/index.ts:3-9`).
- The nearest-station source resolves the station **internally** and never exposes which one
  it picked (`createNearestStationSource`; `usePlaceReading` returns only `ReadingState`,
  `src/shared/place/usePlaceReading.ts:16-37`).

So `WidgetSyncProvider` literally has no numeric `stationId` for the location place -> cannot
build a valid self-fetch snapshot for the common case. **Fix:** expose the resolved `Station`
from the nearest source up through `usePlaceReading`/`ActivePlaceContext` (a real change to
those modules — call it out as in-scope), OR drop self-fetch so `stationId` becomes optional
label metadata rather than a functional requirement.

---

## SHOULD-FIX

### S1 — Swift CAQI/lerp port has no drift guard; AC-2 only pins the TS side (Native gate §2; AC-2)
`ramp` (`src/core/scene/ramp.ts`) does `rgbToHex(lerpRgb(...))` with specific rounding;
`bandOf` uses <=25/50/75/100/150 (`src/core/scene/band.ts`). A hand-ported Swift lerp will
drift on rounding at non-anchor indices. AC-2 guards only the TS `scene()`. **Fix:** commit a
golden fixture (index -> {keyHex,deepHex,midHex,band}) that BOTH the Jest test (AC-2) and the
Swift widget test assert against, so any port drift fails a test. (Mooted entirely if you
adopt B1's verbatim-draw model — no port needed.)

### S2 — AC-7 overstates WidgetKit refresh guarantees (AC-7; Native gate §2)
`.after(now + 1h)` + "refreshes on its hourly timeline" is not something the app controls;
iOS budgets/throttles timeline refreshes (roughly dozens/day, system-decided) and background
URLSession in a TimelineProvider has its own completion constraints. **Fix:** reword AC-7 to
"best-effort periodic refresh (system-scheduled), verified via a shortened interval in dev;
on fetch failure or no budget, the cached snapshot is shown (no blank/crash)."

### S3 — App Group string must match in 3 places or fails silently (Native gate §1,§3)
`UserDefaults(suiteName:)` returns `nil` (writes become silent no-ops) if the suite isn't
entitled. The string `group.org.reactjs.native.example.Powietrze` must be identical across:
app `.entitlements`, widget `.entitlements`, and the native module `suiteName:`. Spec doesn't
flag the silent-failure mode. **Fix:** add a dev-time assertion that the suite UserDefaults is
non-nil, and enumerate the 3 match points in the gate checklist. (Bundle id is the RN example
default `org.reactjs.native.example.Powietrze` — fine, but the App Group must be provisioned
in the Developer portal; note that explicitly.)

### S4 — snapshot has no schema `version` (snapshot; AC-8)
App ships a new schema; an old widget binary (or vice-versa) reads mismatched JSON. AC-8 only
covers the *absent* snapshot, not a *stale-schema* one. **Fix:** add `version: number`;
widget falls back to the "Otwórz aplikację" placeholder on an unknown version.

### S5 — snapshot carries fields for BOTH strategies at once (snapshot; scope/YAGNI)
The schema simultaneously serves "draw verbatim" (`keyHex/deepHex/midHex/band/displayValue`)
and "self-fetch + recompute" (`stationId`, raw `pm25`, `index`). Under self-fetch the baked
colors are dead; under verbatim-draw the `stationId`/self-fetch machinery is dead. Carrying
both is the schema-level symptom of the incoherent hybrid (constitution: no speculative
abstraction). Pick one model and trim the schema to it.

### S6 — Open Q2 (medium tiles cached while headline self-refreshes) creates internal inconsistency
Same root as B1: a fresh headline over hours-stale PM10/NO₂ tiles is an internally
inconsistent card. Fetching all pollutants in Swift multiplies B2's untested-port surface.
**Recommendation:** all-cached snapshot (single `measuredAt`, one freshness truth) — coherent
and matches Non-goals' minimalism.

---

## MINOR / NITS
- AC-2 says `7 -> #5fe3a1-ish`; `ramp(7)` returns the first anchor **exactly** (`ramp.ts:10-12`),
  so assert the exact hex `#5fe3a1`, not "-ish".
- `city` is on both `Reading` and `Station`; AC-1 should name one source (use `Station`).
- Snapshot `stationLabel` example "Aleja Krasińskiego" vs core `stationLabel()` which returns
  "<short> · stacja GIOŚ" — specify whether it's `station.name` or `stationLabel(station)`.
- Spec says "100% core"; NFR-6 (`docs/nfr.md`) says >=80% core. Align the wording.
- `index` comment "round(pm25/1.03)" matches `indexFromPm25` (`PM25_INDEX_DIVISOR=1.03`). OK.

---

## What's MISSING
- No handling/AC for stale-schema snapshot (S4).
- No exposure path for the location place's resolved station (B3) — a prerequisite the spec
  doesn't acknowledge.
- No ADR amendment for widget-side networking (B2) if self-fetch is kept.
- No golden cross-language fixture for the TS<->Swift color contract (S1).
- No `precision` in the snapshot despite `displayValue` depending on it (B1).
- No spec of the exact GIOŚ two-call flow / JSON-LD keys for the Swift fetch (B2).

---

## Judgements requested
1. **Layering — clean.** `buildWidgetSnapshot` referencing `scene()`/`displayValue`/`bandOf`
   is genuinely pure and in-core; embedding hex is NOT a purity leak because `src/core/scene`
   already owns color math (`scene()` returns `key/deep/mid` hex). The `WidgetSync`
   seam/provider/adapter split faithfully mirrors the `Notifier` pattern
   (core interface -> data adapter -> shared provider). No finding here.
2. **Hybrid data model — contradictory.** See B1/B2/B3/S5/S6. It is the central defect.
3. **Publish-on-change identity — mostly OK, one real gap.** station+measuredAt+scale+precision
   won't thrash and won't infinite-loop (provider publishes on identity change, `measuredAt`
   is the hourly bucket). But for the **location** place identity keys on a `stationId` the
   provider can't obtain (B3); a favorite-switch between two stations differs on `stationId`,
   so that's covered. Add `index`/`pm25` to identity only if you keep self-fetch.
4. **Native-absent path (AC-4) — correct.** `NativeModules.WidgetSync` undefined -> guard both
   `writeSnapshot` and `reloadTimelines` and the JSON stringify; matches RN's absent-module
   idiom and the app never crashes on Android / pre-extension builds. Testable as written.
5. **Testability — good split, one over-claim.** AC-1..4 maximize the Jest-testable surface and
   are sound. AC-5..8 are concrete enough EXCEPT AC-7's "hourly" guarantee (S2). Nothing is
   claimed as an automated AC that can't be verified; native behavior is honestly manual.
6. **Scope/YAGNI — over-engineered.** Self-fetch is the source of B1/B2/B3 and half the native
   gate. Drop it for MVP -> widget draws verbatim, no Swift port, no widget networking, no
   sensorId resolution, schema shrinks (S5). One spec's work once simplified; as written
   (full Swift GIOŚ client + color port) it is closer to two.
7. **Native-gate realism — under-specified.** S1 (port drift), S2 (refresh budget), S3
   (3-way App Group string + silent nil suite), plus App Group portal provisioning and
   `.pbxproj`/embed surgery on bare RN 0.86 New-Arch.
8. **Open questions — firm answers:**
   - **Q1:** Do NOT re-derive `displayValue` in Swift. Drop self-fetch; publish a fully-baked,
     consistent snapshot the widget draws verbatim. (If self-fetch is mandated later, port the
     entire display pipeline AND add `precision` — but that defeats the stated rationale.)
   - **Q2:** All-cached snapshot; single `measuredAt`; no per-tile widget fetch.
   - **Q3:** The identity key is nearly right but rests on a `stationId` the location place
     can't produce (B3). Fix the data exposure first; if self-fetch is dropped, key on
     `stationId?|label + measuredAt + scale + precision + displayValue`.

## Realist check
B1/B2/B3 are pre-build design-coherence blockers, not runtime-severity calls — no downgrade
applies (they block the planner from producing a correct plan). B1's user-visible symptom
(wrong number vs color) would be immediately visible but the defect is architectural, so it
stays blocking. No data-loss/security findings. Verdict REWORK reflects that the Architecture
+ snapshot sections must change; the TS seam sections can largely survive.
