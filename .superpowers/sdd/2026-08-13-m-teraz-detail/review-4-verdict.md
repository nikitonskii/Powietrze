# Review 4 Verdict — usePlaceDetail + getDetail? on AirQualitySource + ActivePlaceContext wiring

SPEC: ✅
QUALITY: APPROVE

## Findings

Clean. No Critical / Important / Minor findings.

## Verification notes

- **Mirrors `usePlaceReading` correctly** (`src/shared/place/usePlaceDetail.ts` vs
  `usePlaceReading.ts`): same `useSourceForPlace()`, same `active` unmount guard, same
  `eslint-disable-next-line react-hooks/exhaustive-deps` rationale, effect deps
  `[sourceForPlace, placeKey]` — `place` object identity correctly excluded.
- **placeKey keying verified correct**: `placeKey` is a primitive
  (`'location'` / `station:${id}`) recomputed from `place`'s *content* every
  render, not its identity. Since it's not the `place` object in the dep array,
  a fresh `{kind:'station', station}` literal each render produces the same
  `placeKey` string and does NOT retrigger the effect. Confirmed by inspection;
  consistent with the already-shipped `usePlaceReading` pattern.
- **Intentional divergence from `usePlaceReading` is correct and required**:
  `usePlaceDetail` calls `setDetail(undefined)` at the top of every effect run
  (resets on place change), whereas `usePlaceReading` keeps the last reading
  (stale-while-revalidate). This matches the brief's Step 3 reference code and
  the review checklist's explicit "resets detail on place change" requirement
  — not a bug, a deliberate spec-driven difference.
- **All three AC-7 scenarios genuinely tested** in
  `src/shared/place/__tests__/usePlaceDetail.test.tsx`: getDetail present →
  resolves (asserted via `waitFor`); getDetail absent → stays undefined, no
  throw; getDetail rejects → stays undefined, no throw. Each test uses a
  distinct `SourceForPlace` stub, not shared/mutated state.
- **Optional-call guard**: `sourceForPlace(place).getDetail?.().then(...).catch(...)`.
  Verified this is safe JS: once `?.` appears anywhere in a chain, the
  short-circuit propagates through the rest of the chain (`.then`/`.catch`
  included) without throwing when `getDetail` is `undefined` — matches the
  "no getDetail → no throw" test, and the report's stated passing run (9/9 in
  `src/shared/place`) empirically confirms it.
- **Core interface**: `src/core/air/index.ts` adds
  `getDetail?(): Promise<ReadingDetail>` to `AirQualitySource`, with
  `import type { ReadingDetail } from './history'` at the top (needed since
  the interface sits above `export * from './history'`). `import type` erases
  at compile time, so no circular-runtime-import concern despite `history.ts`
  importing `indexFromPm25` back from `./index`.
- **`ReadingDetail` typed correctly, no `any`** anywhere in the new hook or
  test file. Test builds a minimal real `Reading` (`READING` const) for the
  `getCurrentReading` stub instead of `{} as any`, per the brief's preference.
- **`ActivePlaceProvider` wiring**: `ActivePlaceValue` gains `detail?:
  ReadingDetail`; provider calls `usePlaceDetail(active)` alongside
  `usePlaceReading(active)`; `detail` is spread into the memoized value AND
  added to the `useMemo` deps array (`[active, state, detail]`) — confirmed,
  not stale. `usePlaceDetail` exported from `src/shared/place/index.ts`.
- **Regression**: report states full suite 46 suites / 156 tests pass,
  typecheck clean, lint 0 errors (3 pre-existing unrelated warnings). Diff
  touches only `ActivePlaceValue`'s type (additive `detail?` field) and the
  provider's memo — additive, non-breaking for existing consumers
  (MiejscaScreen, AppNavigator, etc. per report). Per instructions, tests were
  not re-run in this review.
- **Size/style**: `usePlaceDetail.ts` 27 lines, `ActivePlaceContext.tsx` 39
  lines, `core/air/index.ts` 33 lines, test file 67 lines — all well within
  the 200-line/40-line-function limits. Layering respected: `src/shared/place`
  imports only from `src/core/air` and `src/core/places`, no cross-feature
  imports.
- **Optional cleanup (gios `SourceWithDetail`) correctly skipped**: report
  explains `src/data/gios/__tests__/detail.test.ts` calls `.getDetail()`
  without optional chaining in six places, so narrowing the factories' return
  type to plain `AirQualitySource` (with now-optional `getDetail?`) would
  break those call sites under strict mode. Brief explicitly allowed skipping
  if risky — correct call, left as-is.

No issues found. Approve as-is.
