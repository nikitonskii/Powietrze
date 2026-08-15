# Task 1 report — Core catalog + small-magnitude formatter

Spec: `docs/specs/016-pollutant-tiles.md` · Plan: `docs/superpowers/plans/2026-08-15-m-pollutant-tiles.md` (Task 1)

## What was added

1. **`src/core/air/pollutants.ts`** (new file, 25 lines) — additive, `ReadingDetail` untouched.
   - `PollutantCode = 'PM10' | 'NO2' | 'O3' | 'SO2' | 'CO' | 'C6H6'`
   - `PollutantSpec { code: PollutantCode; label: string }`
   - `POLLUTANTS: readonly PollutantSpec[]` — the exact 6-entry literal from spec
     §Core, in order, with real subscript glyphs (NO₂/O₃/SO₂/C₆H₆).
   - `PollutantReading { code: PollutantCode; value: number }` — no `label` field,
     per spec (UI derives labels from `POLLUTANTS` later, in Task 2).

2. **`src/core/air/index.ts`** — two additions:
   - `export * from './pollutants';` (re-export, alongside the existing
     `export * from './history';`)
   - `formatPollutant(value: number, precision: Precision): string` — clean
     delegation: `0 < value < 1` → `value.toFixed(2)`; else
     `formatConcentration(value, precision)` (which already returns `'—'` for
     non-finite and handles negatives/≥1 unchanged). No duplicated logic.

3. **Tests** (TDD — written first, confirmed red, then implementation made them green):
   - `src/core/air/__tests__/pollutants.test.ts` (new)
     - `test('AC-1: POLLUTANTS pins the six-entry catalog, codes+labels+order', ...)`
   - `src/core/air/__tests__/scale.test.ts` (extended — this file already hosts
     `formatConcentration` tests, so `formatPollutant` was added here per the
     plan's "extend the existing format test file" instruction; named with the
     spec-016 AC ID since the file's own local `AC-2` label refers to a
     different spec's numbering)
     - `test('AC-2 (spec 016): formatPollutant — sub-1 always 2dp, else formatConcentration', ...)`
       covers: `(0.35,'Przybliżona')==='0.35'`, `(0.35,'Dokładna')==='0.35'`,
       `(0.999,'Przybliżona')==='1.00'`, `(0,'Przybliżona')==='0'`,
       `(0,'Dokładna')` equals `formatConcentration(0,'Dokładna')`,
       `(-0.35,'Przybliżona')` and `(-4.2,'Dokładna')` equal their
       `formatConcentration` counterparts (pinned via direct comparison, not a
       hardcoded literal, so the test documents "same path" rather than
       duplicating formatConcentration's own math), `(333,'Przybliżona')==='333'`,
       `(13.1,'Dokładna')==='13.1'`, `(13.1,'Przybliżona')==='13'`,
       `(NaN,'Przybliżona')==='—'`, `(Infinity,'Dokładna')==='—'`.

## Files touched
- `src/core/air/pollutants.ts` (new)
- `src/core/air/index.ts` (modified — 2 additions, `formatConcentration` untouched)
- `src/core/air/__tests__/pollutants.test.ts` (new)
- `src/core/air/__tests__/scale.test.ts` (modified — import + 1 new test)

`ReadingDetail` in `src/core/air/history.ts` was **not touched** (Task 2 scope).

## Gate results
- `npm run typecheck` → clean, no errors.
- `npm run lint` → 0 errors, 4 pre-existing warnings (App.tsx, mappers.ts,
  HistoryChart.tsx, Toggle.tsx) — none in files touched by this task.
- `npm test` → 55 suites / 195 tests, all passed.
- Coverage (`--coverage` run, scoped to `src/core`): `src/core/air` at 100%
  statements/branches/functions/lines (pollutants.ts, index.ts, history.ts all
  100%). No "coverage threshold not met" error. (One pre-existing unrelated
  0/0 file, `src/core/scene/index.ts`, is an empty barrel — not part of this
  task and doesn't trip the aggregate `./src/core/` threshold.)

## Deviations from plan
None. Followed the plan's file layout choice (new `pollutants.ts` file rather
than extending `history.ts`) and test-file placement (new file for AC-1,
extending `scale.test.ts` for AC-2/formatPollutant) exactly as suggested.

## Commit
`feat(core): pollutant catalog + formatPollutant (AC-1, AC-2)`
