# Verifier audit — Spec 017 (widget), AC-1..4

Worktree: `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest`
Branch: `feature/m-widget`
Spec: `docs/specs/017-widget.md`

## Per-AC table

| AC | Verdict | Evidence |
|----|---------|----------|
| AC-1 | VERIFIED | `src/core/widget/__tests__/snapshot.test.ts` — `AC-1: buildWidgetSnapshot bakes every field from reading/detail/settings` and `AC-1: no detail → empty tiles`. Both PASS. Asserts every field against the real computed value (not hardcoded): `s.displayValue === displayValue(63,65,'µg/m³','Przybliżona')`, `s.scaleCaption === scaleLabel('µg/m³')`, `s.band === BANDS[bandOf(63)]`, `s.keyHex/deepHex/midHex === scene(63).{key,deep,mid}`, `s.tiles` deep-equal to POLLUTANTS-labeled/formatted tiles, plus the `detail === undefined → tiles === []` branch. Non-tautological — implementation (`src/core/widget/index.ts`) independently computes the same values via the same core fns, so the test is a real cross-check, not an echo of the implementation's literals. |
| AC-2 | VERIFIED | `src/core/widget/__tests__/snapshot.test.ts` — `AC-2: color + band + displayValue pinned across bands (app↔widget contract)`. PASS. Exactly the 3 spec-mandated indices/values: index 7 → `#5fe3a1` / `Bardzo dobry`; 63 → `#f5c63d` / `Umiarkowany`; 175 → `#c77dff` / `Bardzo zły` — hex/band literals match the spec text verbatim, plus a second assertion against `scene(index).key` and `displayValue(...)` for defense-in-depth. |
| AC-3 | VERIFIED | `src/shared/widget/__tests__/WidgetSyncProvider.test.tsx` — 4 tests, all PASS: "publishes once when the reading becomes ready, with the built snapshot" (asserts `publish` called once, `toHaveBeenCalledWith(buildWidgetSnapshot(READING, DETAIL, scale, precision))` — real deep-equality against an independently-built expected snapshot); "an unrelated re-render with unchanged reading/settings does not republish" (rerenders the same tree, asserts still called once — genuinely exercises the dedup, not a no-op test); "changing scale republishes with the updated snapshot" (fires a real settings-context state change via `fireEvent.press`, asserts a second call with the new snapshot); "no publish while the reading is not ready" (never-resolving reading promise, asserts publish never called). Also `src/core/widget/__tests__/snapshot.test.ts`'s `AC-3(core): identity changes with place/measuredAt/scale/precision, stable otherwise` covers the `widgetSnapshotIdentity` half of the mechanism the provider depends on — also PASS, also non-tautological (equal snapshots → equal identity; each of scale/measuredAt/precision change → different identity, including the CAQI-mode precision-only-affects-tiles edge case called out in the spec). |
| AC-4 | VERIFIED | `src/data/widget/__tests__/nativeSync.test.ts` — `AC-4: native module absent → publish is a safe no-op` (deletes `NativeModules.WidgetSync`, asserts `publish` does not throw) and `AC-4: module present → writeSnapshot(json) then reloadTimelines` (installs fake `writeSnapshot`/`reloadTimelines` jest mocks, asserts `writeSnapshot` called with `JSON.stringify(SNAP)` exactly and `reloadTimelines` called). Both PASS. Matches spec exactly: JSON.stringify → writeSnapshot → reloadTimelines, safe no-op when module absent. |
| AC-5 | PENDING-NATIVE-GATE | Manual, requires WidgetKit extension target (Swift) — deferred, not built. No evidence to audit. |
| AC-6 | PENDING-NATIVE-GATE | Manual, requires native gate. Not built. |
| AC-7 | PENDING-NATIVE-GATE | Manual, requires native gate. Not built. |
| AC-8 | PENDING-NATIVE-GATE | Manual, requires native gate. Not built. |

## Overall: AC-1..4 — PASS (all VERIFIED, no failures, no untested/trivial tests found)

## Commands run

```
npx jest src/core/widget src/shared/widget src/data/widget --verbose
npm test -- --coverage          # full suite
npm run typecheck               # tsc --noEmit
npm run lint                    # eslint .
```

(`npm test -- --coverage` initially hit `EPERM` writing `coverage/coverage-final.json` under the
default command sandbox — re-ran with the sandbox override to get the coverage table; this is a
sandbox filesystem-write restriction on this session, not a project defect.)

## Targeted widget suite — Jest summary

```
PASS src/data/widget/__tests__/nativeSync.test.ts
  createNativeWidgetSync (AC-4)
    ✓ AC-4: native module absent → publish is a safe no-op
    ✓ AC-4: module present → writeSnapshot(json) then reloadTimelines (1 ms)

PASS src/shared/widget/__tests__/WidgetSyncProvider.test.tsx
  ✓ AC-3: publishes once when the reading becomes ready, with the built snapshot (50 ms)
  ✓ AC-3: an unrelated re-render with unchanged reading/settings does not republish (6 ms)
  ✓ AC-3: changing scale republishes with the updated snapshot (55 ms)
  ✓ AC-3: no publish while the reading is not ready (1 ms)

PASS src/core/widget/__tests__/snapshot.test.ts
  ✓ AC-1: buildWidgetSnapshot bakes every field from reading/detail/settings (1 ms)
  ✓ AC-1: no detail → empty tiles
  ✓ AC-2: color + band + displayValue pinned across bands (app↔widget contract)
  ✓ AC-3(core): identity changes with place/measuredAt/scale/precision, stable otherwise (1 ms)

Test Suites: 3 passed, 3 total
Tests:       10 passed, 10 total
Snapshots:   0 total
```

## Full-repo gate

- **Full test suite** (`npm test -- --coverage`): `Test Suites: 58 passed, 58 total`,
  `Tests: 208 passed, 208 total`. 0 failures.
- **`src/core` coverage** (jest.config threshold `./src/core/`: 100/100/100/100): every `core/*`
  row in the coverage table is `100 | 100 | 100 | 100`, including `core/widget` (`100 | 100 | 100 | 100`).
  No "coverage threshold not met" error emitted — gate is green.
- **`npm run typecheck`** (`tsc --noEmit`): clean, no errors, no output.
- **`npm run lint`** (`eslint .`): `✖ 4 problems (0 errors, 4 warnings)` — 0 errors. The 4 warnings
  are pre-existing and unrelated to the widget work (`App.tsx` inline style, `mappers.ts` unused
  eslint-disable comment, `HistoryChart.tsx` / `Toggle.tsx` inline styles). No widget-code lint
  errors or warnings.
- Non-fatal noise: React Testing Library `act(...)` console.error warnings during the full run
  (pre-existing async-effect pattern in `usePlaceReading`/`usePlaceDetail`, not from the widget
  code) — cosmetic, does not fail any test.

## AC → test file/name map

| AC | Test file | Test name(s) |
|----|-----------|---------------|
| AC-1 | `src/core/widget/__tests__/snapshot.test.ts` | `AC-1: buildWidgetSnapshot bakes every field from reading/detail/settings`; `AC-1: no detail → empty tiles` |
| AC-2 | `src/core/widget/__tests__/snapshot.test.ts` | `AC-2: color + band + displayValue pinned across bands (app↔widget contract)` |
| AC-3 | `src/shared/widget/__tests__/WidgetSyncProvider.test.tsx` (+ `src/core/widget/__tests__/snapshot.test.ts`) | `AC-3: publishes once when the reading becomes ready, with the built snapshot`; `AC-3: an unrelated re-render with unchanged reading/settings does not republish`; `AC-3: changing scale republishes with the updated snapshot`; `AC-3: no publish while the reading is not ready`; `AC-3(core): identity changes with place/measuredAt/scale/precision, stable otherwise` |
| AC-4 | `src/data/widget/__tests__/nativeSync.test.ts` | `AC-4: native module absent → publish is a safe no-op`; `AC-4: module present → writeSnapshot(json) then reloadTimelines` |

## Findings

None. No AC-1..4 has a trivially-passing or tautological test; all assert real, independently
computed expected values or real behavioral state transitions. No test named an AC ID while
checking unrelated behavior.
