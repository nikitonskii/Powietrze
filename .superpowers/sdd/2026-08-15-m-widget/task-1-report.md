# Task 1 report — Core widget snapshot builder + identity + WidgetSync seam

**Status:** DONE
**Commit:** `c09b450` — `feat(core): widget snapshot builder + identity + WidgetSync seam (AC-1, AC-2)`

## What was added

- `src/core/widget/index.ts` (71 lines): `WIDGET_SNAPSHOT_VERSION`, `WidgetTile`,
  `WidgetSnapshot`, `WidgetSync` interface, `buildWidgetSnapshot(reading, detail, scale, precision)`,
  `widgetSnapshotIdentity(s)`. Matches the plan's Task 1 code block field-for-field,
  with two adjustments (see Deviations).
- `src/core/widget/__tests__/snapshot.test.ts` (89 lines): the plan's Task 1 test block,
  written first (TDD — verified failing with "Cannot find module '..'" before implementation).

No `src/core/index.ts` barrel exists in this codebase (confirmed via `find src/core -maxdepth 1 -name index.ts` → no match), so per the plan's fallback instruction, nothing was modified there. Future consumers (Task 2/3) import `../../core/widget` directly.

## Real import paths confirmed

The plan's own test sketch had `scene, displayValue, scaleLabel, bandOf, BANDS` all imported from `'../../air'`, flagging it as unconfirmed. Verified against actual source:

| Symbol | Real module | Confirmed signature |
|---|---|---|
| `Reading` | `src/core/air/index.ts` | `{ index, pm25, measuredAt, city, station }` — exact match |
| `ReadingDetail` | `src/core/air/history.ts` (re-exported via `src/core/air/index.ts`) | `{ history: HourPoint[], pollutants: PollutantReading[] }` |
| `displayValue`, `scaleLabel`, `formatPollutant` | `src/core/air/index.ts` | signatures match plan exactly |
| `POLLUTANTS` | `src/core/air/pollutants.ts` (re-exported via `air/index.ts`) | `readonly PollutantSpec[]` with `{code, label}`; `NO2` → label `'NO₂'` confirmed |
| `scene`, `bandOf`, `BANDS` | `src/core/scene/index.ts` | **NOT** in `core/air` as the plan's test sketch suggested — corrected import to `'../../scene'` in both the test and implementation |
| `Scale`, `Precision` | `src/core/settings/index.ts` | exact match |

Implementation imports: `Reading`/`ReadingDetail`/`displayValue`/`scaleLabel`/`formatPollutant`/`POLLUTANTS` from `'../air'`; `scene`/`bandOf`/`BANDS` from `'../scene'`; `Scale`/`Precision` from `'../settings'` — as the plan's Step 3 code block already had it correct (only the Step 1 test sketch's import needed correcting).

## Tests (AC IDs)

All in `src/core/widget/__tests__/snapshot.test.ts`:
1. `AC-1: buildWidgetSnapshot bakes every field from reading/detail/settings` — every field incl. `NO₂` subscript tile label.
2. `AC-1: no detail → empty tiles`.
3. `AC-2: color + band + displayValue pinned across bands (app↔widget contract)` — indices 7/63/175 → exact hex `#5fe3a1`/`#f5c63d`/`#c77dff` + bands `Bardzo dobry`/`Umiarkowany`/`Bardzo zły`.
4. `AC-3(core): identity changes with place/measuredAt/scale/precision, stable otherwise`.

Verified failing before implementation (module-not-found), then green after.

## Gate results

- `npm run typecheck` → clean, 0 errors.
- `npm run lint` → 0 errors, 4 pre-existing warnings unrelated to this change (App.tsx inline style, gios/mappers.ts eslint-comment, HistoryChart.tsx/Toggle.tsx inline styles).
- `npm test -- --coverage` → **56 suites / 202 tests passed**, no failures. `src/core/widget` at 100/100/100/100 (stmts/branch/func/lines). No "coverage threshold not met" message — full `src/core` 100% gate passes.

## Deviation from plan's literal code (and why)

The plan's Step 3 snippet had:
```ts
label: POLLUTANTS.find(c => c.code === p.code)?.label ?? p.code,
```
`PollutantCode` (in `src/core/air/pollutants.ts`) is a closed union that is exactly 1:1 with `POLLUTANTS`' `code` field (single source of truth per that file's own comment) — so `?? p.code` is unreachable dead code given valid `PollutantReading` input, and the jest `./src/core/` 100%-branch coverage gate failed on it (98.96% branches). Replaced with a non-null assertion, matching an existing precedent in `src/core/air/index.ts:54` (`US_AQI_BANDS.find(x => c <= x.cHi)!`):
```ts
// Every PollutantCode has a POLLUTANTS entry (closed union, single
// source of truth) — non-null assertion mirrors usAqiFromPm25's find().
label: POLLUTANTS.find(c => c.code === p.code)!.label,
```
This satisfies CLAUDE.md's "no dead code" + TS-strict-no-`any` constraints and the coverage gate, without weakening behavior (same output for all valid inputs).

Also fixed a typecheck error in the test fixture: the plan's `detail` fixture used `as const`, which makes `history: readonly []` — incompatible with `ReadingDetail.history: HourPoint[]` (mutable). Changed to an explicit `const detail: ReadingDetail = {...}` (no `as const`).

## Concerns

None. Task 1 is fully green and self-contained; no `any`, files/functions within CLAUDE.md size limits, imports one-way (core has zero React/data imports).
