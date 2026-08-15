# Task 2 review — ReadingDetail shape migration (spec 016)

## Verdicts
1. SPEC: ✅ — AC-3a/3b/3c/4/5 all present, assert real behavior (full ordered
   array equality, not just length/shape), correctly cite AC IDs, and pass.
2. QUALITY: APPROVE — clean, in-limits, no architecture violations.

## Verification performed
- Read full diff (`task-2.diff`, 1006 lines / 14 files changed).
- Read `src/data/gios/source.ts`, `src/shared/ui/PollutantTiles.tsx`,
  `src/core/air/pollutants.ts`, `src/core/air/index.ts` (formatPollutant),
  `src/data/gios/mappers.ts`, fixture JSON (`sensors400.json`,
  `sensors_all6.json`, `getData_allnull.json`) in full.
- `npm run typecheck` → clean.
- `npm run lint` → 0 errors, 4 pre-existing warnings (none from this diff);
  confirmed by direct `npx eslint` run that `@typescript-eslint/no-explicit-any`
  is NOT an enabled rule in this config (mappers.ts's own `eslint-disable`
  reports as "disabled but never reported") — so the report's claim about the
  new `any` in `source.ts` producing no duplicate warning is verified true.
- `npm test` → 55/55 suites, 198/198 tests green.
- Completion guard grep (`detail\.(pm10|no2)|...`, excluding `core/scene`) →
  empty, confirmed.
- Grepped for cross-feature/cross-layer imports → none found.

## Findings

### Blocker
None.

### Should-fix
None.

### Nit
- `src/data/gios/__tests__/detail.test.ts:519` — the failure-isolation
  `describe` block is labeled `AC-3` (no such AC ID exists in spec 016; only
  AC-3a/3b/3c are defined). These are legitimate carried-forward regression
  tests (fetch-rejection isolation), not literally covering the spec's
  AC-3a/b/c ordering/finite-filter claims — a more precise label (e.g. a
  spec-012 regression tag, or just dropping the "AC-3" prefix) would avoid
  implying these are the AC-3a/b/c coverage itself. Non-blocking: the actual
  AC-3a/b/c tests are separate, correctly labeled, and correct.
- `src/data/gios/__fixtures__/getData_allnull.json` reused for AC-3c is an
  *empty* `Lista danych pomiarowych` array rather than a non-empty array of
  all-null `Wartość` entries. Behaviorally identical (`parseSeries` →
  `newestNonNull` → `undefined` either way) and explicitly sanctioned by the
  spec's Verification section ("reuse existing `getData_allnull.json`"), so
  not a defect — just noting the AC-3c test name ("all-null getData") is
  slightly more specific than what the fixture actually contains.

## Detailed trace of the core correctness point (finite filter + order)

`resolvePollutants` (`src/data/gios/source.ts:64-82`):
- Maps `POLLUTANTS` (catalog order) to a settle-per-pollutant promise; absent
  sensor → `findSensorId` returns `null` → promise **rejects** (no fetch
  issued, matches spec "Absent sensor → skipped, no fetch").
- Present sensor → `getLatest` → `parseLatestValue`; when all-null,
  `parseLatestValue` returns `undefined`, mapped here to `{code, value: NaN}`
  — this settles **FULFILLED**, not rejected, exactly as the spec's key
  warning describes.
- Filter: `r.status === 'fulfilled' && Number.isFinite(r.value.value)` —
  correctly excludes both the rejected (absent-sensor) and the
  fulfilled-but-NaN (all-null-sensor) cases via the same finite check, per
  spec. Not merely `status === 'fulfilled'`.
- Order: `Promise.allSettled` returns results in the same order as the input
  array (`POLLUTANTS.map(...)`), independent of resolution timing — confirmed
  by Node/spec semantics and by the AC-3b test which mixes all six pollutants
  and asserts exact catalog order.

## Sizes / SOLID
- `src/data/gios/source.ts`: 185 lines (≤200 OK). `resolvePollutants`: ~19
  lines: `detailFor`: ~28 lines (both ≤40 OK). `getLatest` cleanly extracted
  and reused (was previously an inline closure duplicated conceptually
  between `detailFor` and now also `resolvePollutants`).
- `src/shared/ui/PollutantTiles.tsx`: 80 lines (≤200 OK). `Tile` and
  `PollutantTiles` each small, single-responsibility.
- `src/core/air/history.ts`: 42 lines, `ReadingDetail` shape change is
  minimal and well-commented.

## Style
- No hard-coded design values introduced; `flexBasis: '48%'` is a layout
  ratio (grid math), not a color/design token — consistent with existing
  `gap: 12` in the same stylesheet (unchanged) and not flagged by the
  project's `no-restricted-syntax` hex-literal rule (which only targets hex
  color literals).
- Non-null assertion `POLLUTANTS.find(p => p.code === code)!.label`
  (`PollutantTiles.tsx:15`) is safe: `PollutantReading.code` is typed as
  `PollutantCode`, a closed union matching every `POLLUTANTS` entry exactly —
  TS enforces exhaustiveness at the data-layer boundary (`resolvePollutants`
  only ever produces `{code}` values drawn from `POLLUTANTS` itself).
- Single new `any` (`source.ts:65`) is inline-justified per CLAUDE.md,
  mirrors the existing `mappers.ts` untyped-JSON boundary pattern, and (per
  eslint run) doesn't correspond to an actually-enabled lint rule anyway.

## Tests — behavior over snapshot
- AC-3a/3b assert full ordered array equality (`toEqual([{code,value}, ...])`)
  — not length-only, not snapshot. Good.
- AC-3c isolates the omission behavior precisely (CO omitted, others present
  in order).
- AC-4/AC-5 in `PollutantTiles.test.tsx` assert rendered text content
  (labels, formatted values, unit count) and the `null`-render / no-crash
  case for AC-5 — real behavior, AC IDs cited.
- Fixture shapes verified against the real GIOŚ v1 JSON-LD Polish-key schema
  (`Lista danych pomiarowych` / `Data` / `Wartość` for getData;
  `Lista stanowisk pomiarowych dla podanej stacji` / `Wskaźnik - kod` /
  `Identyfikator stanowiska` for sensors) — new fixtures match the shape of
  the pre-existing, already-verified fixtures byte-for-byte in structure.

## Architecture
- `src/data/gios/source.ts` imports only from `../../core/air` and
  `../../core/geo` (core) plus sibling `data/gios` modules — data→core, OK.
- `src/shared/ui/PollutantTiles.tsx` imports from `../../core/air` and
  `../../core/settings` — shared→core, OK.
- `src/features/teraz/TerazScreen.tsx` change is a one-line prop rewire, no
  new imports.
- No cross-feature imports found; grep for `features` imports outside a
  feature's own subtree returned nothing.
