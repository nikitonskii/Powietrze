# Final whole-branch review — m-widget (headless slice)

**Branch:** `feature/m-widget` off `feature/m-pollutant-tiles`
**Scope:** TS seam for the iOS home-screen widget (Tasks 1–3). Native WidgetKit/Swift gate (Task 4) is a DEFERRED native gate, correctly NOT in this diff.
**Spec:** `docs/specs/017-widget.md` · **Constitution:** `CLAUDE.md`

## Verdict: APPROVE

Safe to merge as a WIP increment. The headless slice is self-consistent, layering is clean, there is no `any`, the seam composes correctly, the no-op adapter cannot crash, and every headless AC (1–4) is backed by a behavior test. Manual ACs 5–8 require the native gate and are correctly out of scope — not flagged as gaps.

## Gate results (run in this review)
- **Tests:** 58 suites / 208 tests, all pass (`npm test`).
- **Typecheck:** clean, exit 0 (`tsc --noEmit`).
- **Lint:** 0 errors, 4 warnings — all pre-existing and unrelated to widget files (App.tsx inline-style `{flex:1}` on the pre-existing GestureHandlerRootView; gios mappers unused-disable; HistoryChart + Toggle inline styles). No new warnings introduced by this branch.
- **`src/core` coverage:** 100% statements/branches/functions/lines. `src/core/widget/index.ts` = 100% (verified via isolated `--coverageDirectory` run; the full-suite coverage write failed only on an EPERM writing `coverage/` under the sandbox — the numbers themselves are green and the `./src/core/` 100% threshold in `jest.config.js` is enforced by the passing suite).

## Layering (verified against source + eslint boundaries)
- `core/widget/index.ts` imports only `../air`, `../scene`, `../settings` — all core, pure TS. Zero React, zero data imports. OK.
- `shared/widget/index.tsx` imports `react`, `../place`, `../settings`, `../../core/widget`. No data imports, no reverse edge. OK.
- `data/widget/index.ts` imports `react-native` + `../../core/widget`. No cross-feature, no shared import. OK.
- `App.tsx` (root) imports `./src/data/widget` — root may import data. OK.
- No cross-feature imports anywhere. eslint boundaries pass (0 errors).

## Seam coherence
- `buildWidgetSnapshot` bakes every drawn field from `Reading` (+ optional `ReadingDetail`) + settings using the same core fns the app uses (`scene`, `displayValue`, `scaleLabel`, `formatPollutant`, `POLLUTANTS`, `bandOf`/`BANDS`). No IO, no station-id exposure. Matches spec schema exactly (no `stationId`, no raw `index`/`pm25`).
- `widgetSnapshotIdentity` = `JSON.stringify(full snapshot)`. Keys on the whole drawn snapshot, so ANY visible change (incl. the precision-toggle-in-CAQI case that changes tiles `13`→`13.0` but not the headline) republishes; unchanged content ⇒ identical string ⇒ dedup. The earlier review-fix commit (ee13215) correctly moved from keying on `displayValue` alone to the full snapshot.
- Provider dedup: `lastId` is a `useRef` (not stale); effect deps `[status, reading, detail, settings.scale, settings.precision, sync]` are complete — no stale-closure. A changed object ref with unchanged content re-runs the effect but the identity string dedups it → no spurious publish. A real change always yields a new identity → publishes. First ready reading publishes once; loading/absent never publishes. All four behaviors are asserted.
- `detail` arriving after `reading` (separate `getDetail`) yields a second, correct publish (empty tiles → populated tiles) — expected freshness behavior, not a defect.

## No-op safety (traced)
`createNativeWidgetSync`: `NativeModules.WidgetSync as NativeWidgetSyncModule | undefined`. When undefined (current runtime until the native gate, and always on Android), `publish` returns before `JSON.stringify`/`writeSnapshot`/`reloadTimelines` — cannot throw. App.tsx mounts `WidgetSyncProvider` with this sync; provider renders `<>{children}</>` regardless, so the tree renders fine with the module absent. AC-4 test pins both the absent (no-throw) and present (`writeSnapshot(json)` then `reloadTimelines`) paths.

## `any` / slop
- No `any`. `data/widget` uses a locally-typed `NativeWidgetSyncModule` interface + a typed optional cast; the test narrows `NativeModules` via `Record<string, unknown>` (documented) — both avoid `any` legitimately.
- `core/widget` uses one `!` non-null assertion on `POLLUTANTS.find(...)`, justified inline: `p.code` is the closed `PollutantCode` union and `POLLUTANTS` is the single source of truth containing every code, so `find` cannot miss. Sound.
- No dead code, no speculative abstraction. Snapshot schema carries only drawn fields (matches spec S5 trim). Files are well under the 200-line / 40-line limits.

## Test integrity
- AC-1: asserts field-by-field equality incl. `tiles` deep-equality with real labels (`NO₂`) and formatted values — real behavior, not a tautology (AC-2 anchors it with literal hexes `#5fe3a1`/`#f5c63d`/`#c77dff` + Polish band names, so the app↔widget contract is pinned to concrete values, not just mirrored fn calls).
- AC-3 (provider): publish COUNT (once on ready; still once after unrelated rerender; twice after scale toggle) + ARGUMENT equality against `buildWidgetSnapshot(...)`, plus no-publish-while-loading. Real.
- AC-4: no-op vs `writeSnapshot`+`reloadTimelines` via `jest.fn` with `toHaveBeenCalledWith(JSON.stringify(SNAP))`. Real.

## Findings

### Critical
None.

### Important
None.

### Minor (non-blocking, informational — no change required to merge)
- **M1 — `widgetSnapshotIdentity` depends on JSON key-order determinism.** `src/core/widget/index.ts:71-73`. `JSON.stringify` is order-sensitive; identity is only stable because `buildWidgetSnapshot` is the sole producer and always constructs keys in a fixed order. This holds today (the provider only ever feeds builder output). If a future caller ever hand-builds a `WidgetSnapshot` with a different key order, two content-equal snapshots would compare unequal. Optional hardening: derive identity from an explicit ordered tuple of fields, or add a one-line comment pinning "identity assumes builder-produced key order." Not a defect in the current closed usage.
- **M2 — AC-1 headline assertion mirrors the impl.** `src/core/widget/__tests__/snapshot.test.ts:31` asserts `displayValue(63,65,...)` rather than a literal string. In isolation this is contract-mirroring rather than a hard pin, but AC-2's literal hex/band assertions anchor the contract, so coverage is adequate. Consider one literal `displayValue` expectation for full independence. Informational only.

## Open Questions
None. No low-confidence Critical/High findings to surface.

## Positive observations
- The full-snapshot identity fix (commit ee13215) is exactly right and its rationale is documented at the point of the code — catches the precision-toggle-changes-tiles-but-not-headline case that a naive `displayValue` key would have missed.
- No-op adapter ordering (guard before stringify) is correct and matches the "app must never crash because the widget can't be reached" constitution intent.
- Clean one-way import graph; provider mirrors the established `NotificationsProvider` "derive from settings, sync to a seam" shape — consistent with the codebase.
- Snapshot schema is minimal and matches the spec's trimmed verbatim-draw model (no station-id / raw index leakage).
