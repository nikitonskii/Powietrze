# Final whole-branch review — m-pollutant-tiles (spec 016)

**Branch:** `feature/m-pollutant-tiles` off `feature/m-notifications` (@f6a68e7)
**Reviewer pass:** fresh context, adversarial, whole-diff + actual files read.
**Verdict: APPROVE-WITH-NITS** — no Critical/Important findings; all nits are Minor and non-blocking.

## Gate (run by reviewer, not trusted from report)
- `npm test` → **55 suites / 198 tests passed**, 0 failed, 0 skipped, exit 0.
- `npm run typecheck` → clean, 0 errors.
- `npm run lint` → **0 errors, 4 warnings** — all pre-existing and in files this branch did not
  touch (App.tsx inline-style, HistoryChart.tsx inline-style, Toggle.tsx inline-style,
  mappers.ts unused-disable). None introduced by this branch.
- Coverage (full suite, project jest config `./src/core/` threshold 100%): **`core/air` 100/100/100/100**,
  exit 0, no "threshold not met". (A scoped `jest src/core`-only run reports 97.84% branches — that is an
  artifact of excluding the data/feature suites that exercise some core branches; the real gate runs the
  full suite and passes.)

## What was verified

### Cross-cutting correctness — PASS
- Completion guard `grep -rnE 'detail\.(pm10|no2)|(pm10|no2)\?:|(pm10|no2)=\{' src ... | grep -v core/scene`
  → **empty**. No stale `pm10`/`no2` `ReadingDetail` field anywhere.
- All `ReadingDetail` consumers enumerated and correct: `AirQualitySource` (index.ts), definition
  (history.ts), `detailFor` (source.ts), `TerazScreen` (reads `detail.pollutants`), `ActivePlaceContext`
  (holds `detail?: ReadingDetail`, never touches old fields), `usePlaceDetail` (holds it). No broken consumer.
- `resolvePollutants` ordering & finite-filter correct: `POLLUTANTS.map` → `Promise.allSettled` (preserves
  input-array order regardless of settle timing) → `filter(fulfilled && Number.isFinite(value))` → `map`.
  Order preserved under partial failure. Absent sensor → `throw` → rejected → dropped. All-null series →
  `parseLatestValue` undefined → `value ?? NaN` → dropped by finite check. Real `0` reading → kept
  (`0 ?? NaN === 0`, finite). All four behaviours have matching tests.

### Architecture — PASS
- Import direction clean: `PollutantTiles` (shared/ui) → core/air only; `source.ts` (data) → core only;
  `TerazScreen` (features) → shared. No features→data import, no cross-feature import, no reverse edge.
- Core stays pure: `pollutants.ts`/`history.ts`/`index.ts` — zero React/data imports.
- One responsibility per module; `detailFor` (28 lines) and `resolvePollutants` (~19 lines) each ≤40.
- File sizes: source.ts 185, PollutantTiles.tsx 80, pollutants.ts 26, index.ts 86, history.ts 42 — all ≤200.
- No hex literals in PollutantTiles (tokens: `colors.glass/glassBorder/text.*`).

### Test integrity — PASS
- AC-3a/b/c and both failure-isolation tests assert **full ordered arrays** via `toEqual([...])`, not
  `objectContaining`/length/tautology. AC-3b (`sensors_all6`) genuinely proves the O₃/SO₂ path.
- AC-3a "no O₃/SO₂" is legitimate: `sensors400.json` genuinely contains only CO/NO/NO2/NOx/PM10/PM2.5/C6H6
  (verified) — O₃/SO₂ absence is by missing-sensor, exactly what the test claims.
- AC-4/5 assert rendered text (`getByText('C₆H₆')`, `getByText('0.35')`, `getAllByText('µg/m³') len 4`,
  empty→`queryByText` null). Real behaviour, no snapshots.
- Fixtures match GIOŚ v1 JSON-LD shape: getData use `Lista danych pomiarowych`/`Data`/`Wartość`
  (consumed by `parseSeries`); sensors use `Wskaźnik - kod`/`Identyfikator stanowiska` (consumed by
  `findSensorId`). `sensors_all6` carries the full @context/meta/links/totalPages envelope.
- No suite left asserting the old `pm10`/`no2` shape (all four fallout suites migrated).

### Regressions — PASS
No un-migrated consumer of the changed `ReadingDetail` shape. `fakeAirSource` has no `getDetail`
(tests override it), so it needed no change.

### Slop — PASS (minor notes below)
No dead code of substance, no speculative abstraction, no duplicated logic (`formatPollutant` is a clean
delegation to `formatConcentration`, not a fork). `any` appears only at the GIOŚ data boundary.

## Findings (all Minor / non-blocking)

- **[Minor] source.ts:65 — `resolvePollutants(sensorsJson: any, ...)`.** The plan scoped the `any`
  boundary to `mappers.ts`; this puts one in `source.ts`. It is only forwarded to `findSensorId`
  (whose param is `any`), so `sensorsJson: unknown` would typecheck and be strictly tighter. Constitution
  permits `any` with a justifying comment (present), so this is a preference, not a violation.
  Fix: `sensorsJson: unknown`.

- **[Minor] source.ts:106-113 — `pollutants` inside `Promise.allSettled`.** `resolvePollutants` internally
  swallows every rejection (its own `allSettled`) and can never reject, so the outer
  `pollutants.status === 'fulfilled' ? ... : []` false-branch is unreachable defensive code. Harmless and
  symmetric with the `history` guard (which does need it); optionally `await resolvePollutants(...)` directly
  and keep only `history` in the settle.

- **[Minor] detail.test.ts:~135 — `describe('AC-3: per-pollutant failure isolation ...')`.** There is no bare
  `AC-3` in spec 016 (only AC-3a/b/c); this block is a carried-forward regression from the old AC-6b.
  Label it e.g. `AC-3 (regression: failure isolation)` for traceability. (Already self-noted in journal 16.)

- **[Minor] AC-3c reuses `getData_allnull.json`.** Per journal it is an empty `Lista danych pomiarowych`
  rather than entries with null `Wartość`; behaviourally identical for the finite filter
  (`parseLatestValue` → undefined either way), and spec explicitly sanctioned the reuse. No action needed.

- **[Info] PollutantTiles.tsx:15 — `POLLUTANTS.find(p => p.code === code)!`.** Non-null assertion is safe by
  construction: `code: PollutantCode` and the catalog is exhaustive over that union. Acceptable.

## Notes for human review
- Spec 016 supersedes `design/README.md:80` (fixed 2-tile grid). Spec + journal record human sign-off was
  obtained; confirm at merge.
