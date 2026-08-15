# Verification audit — spec 016 (data-driven pollutant tiles)

Worktree: `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest`
Branch: `feature/m-pollutant-tiles`
Spec: `docs/specs/016-pollutant-tiles.md`

## Per-AC table

| AC | Verdict | Evidence |
|----|---------|----------|
| AC-1 | VERIFIED | `src/core/air/__tests__/pollutants.test.ts` — `test('AC-1: POLLUTANTS pins the six-entry catalog, codes+labels+order')`. Asserts `POLLUTANTS` deep-equals the exact 6-entry array with codes/labels/order incl. subscript glyphs (NO₂/O₃/SO₂/C₆H₆). Matches `src/core/air/pollutants.ts` literal exactly. PASS. |
| AC-2 | VERIFIED | `src/core/air/__tests__/scale.test.ts` — `test('AC-2 (spec 016): formatPollutant — sub-1 always 2dp, else formatConcentration')`. Asserts every table row from the spec: `(0.35,'Przybliżona')==='0.35'`, `(0.35,'Dokładna')==='0.35'`, `(0.999,'Przybliżona')==='1.00'`, `(0)==='0'` (both precisions, one pinned via `formatConcentration`), negatives `(-0.35,'Przybliżona')`/`(-4.2,'Dokładna')` pinned via `formatConcentration` delegation (not hardcoded), `(333,'Przybliżona')==='333'`, `(13.1,'Dokładna')==='13.1'`, `(13.1,'Przybliżona')==='13'`, `NaN`→`'—'`, `Infinity`→`'—'`. All 12 assertions present, none tautological. PASS. |
| AC-3a | VERIFIED | `src/data/gios/__tests__/detail.test.ts` — `describe('AC-3a: detailFor resolves pollutants in catalog order (no O3/SO2 sensors)')`, test `'PM10+NO2+CO+C6H6 station → pollutants is exactly [PM10,NO2,CO,C6H6] in order, history from PM2.5'`. Mocked fetch via `sensors400` fixture (PM10/NO2/CO/C6H6 sensors only); asserts `detail.pollutants` deep-equals `[{PM10,30},{NO2,22},{CO,350},{C6H6,0.35}]` in that order, and `history.length===24` from PM2.5. PASS. |
| AC-3b | VERIFIED | `src/data/gios/__tests__/detail.test.ts` — `describe('AC-3b: detailFor resolves all six pollutants in catalog order')`, test `'station exposing all six sensors → pollutants equals [PM10,NO2,O3,SO2,CO,C6H6]'`. Uses `sensorsAll6` fixture + all 6 `getData_*` fixtures (incl. new `getData_o3.json`, `getData_so2.json`); asserts full catalog-order array with correct values. PASS. |
| AC-3c | VERIFIED | `src/data/gios/__tests__/detail.test.ts` — `describe('AC-3c: a present sensor with all-null getData is omitted (finite filter, not merely settled)')`, test `'CO sensor present but getData returns no non-null readings → CO omitted, others present'`. Routes CO sensor id to `getData_allnull.json`; asserts `detail.pollutants` omits CO, keeps PM10/NO2/C6H6. Directly exercises the finite-filter behavior the AC requires (not just settled-status). PASS. |
| AC-4 | VERIFIED | `src/shared/ui/__tests__/PollutantTiles.test.tsx` — `test('AC-4: 4-entry list renders all four labels (from catalog), values via formatPollutant, four µg/m³ units')`. Renders a 4-entry list incl. `{C6H6, 0.35}`; asserts all 4 catalog labels (`PM10`,`NO₂`,`CO`,`C₆H₆`) render, values `40`/`22`/`350`/`0.35` render (benzene 0.35 in `Przybliżona` — the exact edge case), and `getAllByText('µg/m³')` has length 4. Two further tests in the same file cover the ≥1 precision cases (`13.1`→`'13.1'`/`'13'`, `22`→`'22.0'`/`'22'`) and the "absent pollutant → not rendered" case. PASS. |
| AC-5 | VERIFIED | `src/shared/ui/__tests__/PollutantTiles.test.tsx` — `test('AC-5: empty pollutants → renders nothing (no crash)')`. Renders `<PollutantTiles pollutants={[]} .../>`; asserts `screen.queryByText('µg/m³')` is null. Component returns `null` on empty array (`PollutantTiles.tsx:35`). PASS. |
| AC-6 | MANUAL-OK | Manual/sim criterion. Evidence file present: `docs/harness/evidence/16/01-krakow-2x2-tiles.png` (1,813,904 bytes, present in worktree). Journal `docs/harness/16-pollutant-tiles.md` referenced by spec status line ("AC-6 verified live on sim"). Not independently re-verified on simulator by this audit (out of scope per instructions) — recorded evidence exists, so MANUAL-OK rather than MANUAL-MISSING. |

## Commands run (exact)

```
npx jest src/core/air/__tests__/pollutants.test.ts src/core/air/__tests__/scale.test.ts \
  src/data/gios/__tests__/detail.test.ts src/shared/ui/__tests__/PollutantTiles.test.tsx
```
Result: `Test Suites: 4 passed, 4 total` / `Tests: 20 passed, 20 total`.

```
npm test -- --coverage
```
(first run hit a sandbox EPERM writing `coverage/coverage-final.json`; re-run with
sandbox disabled to get the report — test *results* were identical/unaffected in
both runs)
Result: `Test Suites: 55 passed, 55 total` / `Tests: 198 passed, 198 total`.

```
npx jest --coverage --coverageReporters=text-summary   # (sandbox disabled: prior run hit EPERM on coverage/ dir write)
```
```
=============================== Coverage summary ===============================
Statements   : 95% ( 590/621 )
Branches     : 87.05% ( 242/278 )
Functions    : 92.6% ( 213/230 )
Lines        : 95.45% ( 546/572 )
================================================================================
Test Suites: 55 passed, 55 total
Tests:       198 passed, 198 total
```
Exit code: `0`. `jest.config.js` sets `coverageThreshold['./src/core/']` to 100%
statements/branches/functions/lines; a threshold miss makes Jest print
`Jest: "global" coverage threshold ...` and exit non-zero. Neither occurred
(grep for "coverage threshold"/"Jest:" in the output found nothing, exit 0) —
**src/core is at 100% coverage**, confirmed by the run's own pass/fail gate
rather than a percentage this audit computed independently. Numbers above
(95%/87%/92.6%/95.45%) are whole-project totals (src/core + shared + features +
data), not scoped to src/core; the project only enforces 100% on src/core.

```
npm run typecheck
```
Result: `tsc --noEmit` — clean, no output, no errors.

```
npm run lint
```
Result: `0 errors, 4 warnings`. Warnings are pre-existing/unrelated to spec 016:
`App.tsx:49` (inline style), `src/data/gios/mappers.ts:3` (unused eslint-disable
comment), `src/shared/ui/HistoryChart.tsx:49` (inline style), `src/shared/ui/Toggle.tsx:21`
(inline style). None touch `PollutantTiles.tsx`, `pollutants.ts`, or `detail`-related
files.

```
grep -rnE 'detail\.(pm10|no2)|(pm10|no2)\?:|(pm10|no2)=\{' src --include='*.ts' --include='*.tsx' | grep -v 'src/core/scene'
```
Result: **empty** (grep exit 1 = no matches). Completion guard PASSES — no
leftover `ReadingDetail.pm10`/`.no2` usage outside the (excluded, unrelated)
`src/core/scene` atmosphere fields.

## AC → test file/name map (summary)

| AC | Test file | Test name |
|----|-----------|-----------|
| AC-1 | `src/core/air/__tests__/pollutants.test.ts` | `AC-1: POLLUTANTS pins the six-entry catalog, codes+labels+order` |
| AC-2 | `src/core/air/__tests__/scale.test.ts` | `AC-2 (spec 016): formatPollutant — sub-1 always 2dp, else formatConcentration` |
| AC-3a | `src/data/gios/__tests__/detail.test.ts` | `AC-3a: detailFor resolves pollutants in catalog order (no O3/SO2 sensors) > PM10+NO2+CO+C6H6 station → pollutants is exactly [PM10,NO2,CO,C6H6] in order, history from PM2.5` |
| AC-3b | `src/data/gios/__tests__/detail.test.ts` | `AC-3b: detailFor resolves all six pollutants in catalog order > station exposing all six sensors → pollutants equals [PM10,NO2,O3,SO2,CO,C6H6]` |
| AC-3c | `src/data/gios/__tests__/detail.test.ts` | `AC-3c: a present sensor with all-null getData is omitted (finite filter, not merely settled) > CO sensor present but getData returns no non-null readings → CO omitted, others present` |
| AC-4 | `src/shared/ui/__tests__/PollutantTiles.test.tsx` | `AC-4: 4-entry list renders all four labels (from catalog), values via formatPollutant, four µg/m³ units` (+3 supporting AC-4 tests) |
| AC-5 | `src/shared/ui/__tests__/PollutantTiles.test.tsx` | `AC-5: empty pollutants → renders nothing (no crash)` |
| AC-6 | manual | `docs/harness/evidence/16/01-krakow-2x2-tiles.png` + `docs/harness/16-pollutant-tiles.md` |

## Findings

No AC lacks executable evidence. No test asserts trivially (no `expect(true).toBe(true)`-style
tautologies observed; every assertion checks the actual value/shape the AC text specifies).
No test found that names an AC ID while checking unrelated behavior.

## Overall

**PASS** — AC-1, AC-2, AC-3a, AC-3b, AC-3c, AC-4, AC-5 all VERIFIED; AC-6 MANUAL-OK.
Full suite green (55/55 suites, 198/198 tests), typecheck clean, lint 0 errors,
src/core coverage gate (100%) satisfied, completion guard grep empty.
