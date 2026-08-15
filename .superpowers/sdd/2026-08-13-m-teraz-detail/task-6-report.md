# Task 6 report — Teraz composition (scrollable + chart + tiles)

Status: DONE
Commit: d804993 (feature/m-teraz-detail)

## What changed

- `src/features/teraz/TerazScreen.tsx`
  - `useActivePlace()` now also destructures `detail`.
  - The inner `View` (content wrapper) became a `ScrollView` whose
    `contentContainerStyle` is `styles.content`. `GradientBackground`
    (`gradient-background` testID) and `Atmosphere` are unchanged, still
    outside/above the ScrollView, non-scrolling.
  - `styles.content` changed `flex: 1` → `flexGrow: 1` and dropped
    `justifyContent: 'center'` (content is now top-aligned per the mock —
    see "Layout deviation" below). Padding (`screenTop`/`screenH`/
    `screenBottom`) preserved.
  - When `detail` is present, renders `<HistoryChart history={detail.history} />`
    then `<PollutantTiles pm10={detail.pm10} no2={detail.no2} />` below the
    `Hero`, wrapped in a `styles.detail` (`marginTop: 8`) container; the
    tiles row gets its own `styles.tiles` (`marginTop: 12`) wrapper for
    spacing between chart and tiles.
  - The `if (!reading) return <View testID="teraz-loading" .../>` early
    branch is untouched.

- `src/features/teraz/__tests__/TerazScreen.test.tsx`
  - Added `detail: ReadingDetail` fixture (2 history points, pm10: 40,
    no2: 22) and `detailedSource()` = `fakeAirSource()` + `getDetail`.
  - Added `AC-10: with detail → chart + tiles render below the hero`
    — asserts hero (`118`), chart header (`OSTATNIE 24 GODZINY`, via
    `findByText` since detail loads async), and both tile labels
    (`PM10`, `NO₂`), all `within(gradient-background)`.
  - Added `AC-10: without detail (getCurrentReading only) → hero, no
    chart/tiles` — uses the existing `fakeAirSource()` (no `getDetail`)
    and asserts the chart header is absent.

## TDD evidence

1. After writing tests only (before implementation): `npx jest TerazScreen`
   → 4 passed, 1 failed (the new "with detail" test failed at
   `findByText('OSTATNIE 24 GODZINY')` — timed out, as expected since
   the chart wasn't wired yet). The two pre-existing tests (AC-8 index/
   band/city/pm25/atmosphere; AC-8 loading) passed unchanged.
2. After implementation: `npx jest TerazScreen` → **5 passed, 5 total**.

## Full verification

- `npx jest TerazScreen` → 5/5 pass.
- `npm test` → **48 suites, 162 tests, all passed.**
- `npm run lint` → 0 errors, 4 pre-existing warnings (App.tsx inline
  style, gios/mappers.ts eslint-comments, HistoryChart.tsx inline style,
  Toggle.tsx inline style) — none introduced by this change, none in the
  files touched by this task.
- `npm run typecheck` → clean, no output/errors.

No "Operation not permitted" sandbox errors were hit; all commands ran
in the default sandbox.

## File size / function size

- `TerazScreen.tsx`: 53 lines (limit 200); single component function,
  well under 40 lines.
- `TerazScreen.test.tsx`: 64 lines.

## Layout deviation note

The brief allowed either keeping or dropping `justifyContent: 'center'`
on `styles.content`. I dropped it (top-aligned, per "the design scrolls
content with the hero near the top"). With `flexGrow: 1` and no
`justifyContent: 'center'`, short content (Hero-only, no detail) sits at
the top of the scroll area rather than vertically centered — this is a
visual behavior change from the pre-Task-6 screen (which centered the
Hero vertically via `flex: 1` + `justifyContent: 'center'`). No test
asserts on vertical position, so this is unverified by the test suite;
flagging it as the one deliberate design choice made where the brief
left it open. If vertical centering of the Hero-only state is desired,
`justifyContent: 'center'` can be re-added to `styles.content` — it does
not conflict with `flexGrow: 1` and does not affect the "with detail"
scrolling case.

## Concerns

- None blocking. The only open item is the layout-centering choice noted
  above, which is a judgment call explicitly left to the implementer by
  the brief.
- Pre-existing `act(...)` console warnings appear in `npm test` output
  (from `usePlaceReading`'s async `setState` and `BottomTabView`'s
  internal timer) — these predate this change (visible in the pending-
  source test) and are not new regressions; all tests still pass.

## Final-review fixes

Commit: `e8c353ac3238053b459be0699fe456e7a709f1eb`
`fix(teraz-detail): final-review fixes — drop SourceWithDetail, AC-8
labels, chart clock icon, AC-6c geo-success + fixture`

Applied all 5 findings from `.superpowers/sdd/2026-08-13-m-teraz-detail/final-review.md`
(APPROVE-WITH-NITS: 0 Critical / 2 Important / 3 Minor):

1. **Important — redundant type** (`src/data/gios/source.ts`): deleted
   `SourceWithDetail` and its now-false comment; `createGiosSource`,
   `createStationSource`, `createNearestStationSource` now return
   `AirQualitySource` directly (`getDetail?` is optional on the shared
   interface since Task 4). Fallout: three test files called
   `.getDetail()` unguarded on factory results, which is now a type
   error since `getDetail` is optional — fixed with a non-null assertion
   (`.getDetail!()`) at each of the 7 call sites in
   `src/data/gios/__tests__/detail.test.ts` (all factory-created sources
   in this file are known to always provide `getDetail`).
2. **Important — AC-8 label collision** (`TerazScreen.test.tsx`):
   renamed the two pre-existing tests to `spec-002 AC-8: …` so they no
   longer collide with spec 012's own AC-8 (HistoryChart). No assertions
   touched; the two new spec-012 AC-10 tests were left alone.
3. **Minor — clock icon** (`HistoryChart.tsx`): added the design's
   13×13 clock (`design/Powietrze.dc.html:76`, path
   `M12 8v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z`) via Skia
   (`Canvas`→`Group transform=[{scale:13/24}]`→stroked `Path`,
   `color: colors.text.muted`, `strokeWidth: 2`, `strokeCap: 'round'`),
   extracted as a `ClockIcon` helper (Skia's `Path` lacks `testID`, so
   `testID` is added via a spread plain-object, same pattern as
   `TabIcon.tsx`/`Skyline.tsx` — no `any`/`@ts-ignore`). Header text +
   icon sit in a new `styles.headerRow` (`flexDirection: 'row',
   alignItems: 'center', gap: 6`). File is 120 lines (limit 200).
   Added `getByTestId('chart-clock')` assertion to the existing AC-8
   header test in `HistoryChart.test.tsx`.
4. **Minor — AC-6c geo-success coverage** (`detail.test.ts`): added
   `'geo succeeds → nearest station resolution shared across getDetail
   and getCurrentReading'` — resolves a Warsaw station (id 530, via the
   shared `core/geo/__fixtures__/stations.json` fixture, reusing
   `sensors400.json`/`getData_pm25_26/pm10/no2.json` for its sensors),
   then asserts `getCurrentPosition` and `/station/findAll` are each
   called exactly once across a `getDetail()` + `getCurrentReading()`
   pair on the same source — proving the memoized shared resolution
   also holds on the happy path, not just on geo-failure.
5. **Minor — fixture extraction** (`detail.test.ts`): moved the inline
   `sensorsNoNo2` (filter + cast of `sensors400.json`) into a static
   `src/data/gios/__fixtures__/sensors400_noNo2.json`, generated once
   via a script and matching the existing `sensors_noPm25.json` fixture
   style/indentation.

### Gate results

- `npx jest src/data/gios src/shared/ui/__tests__/HistoryChart
  src/features/teraz` → 10 suites, 36 tests, all passed.
- `npm test` → **48 suites, 163 tests, all passed** (162 baseline + 1
  new AC-6c geo-success test).
- `npm run lint` → 0 errors; same 4 pre-existing warnings as the Task 6
  baseline (App.tsx, gios/mappers.ts, HistoryChart.tsx inline-style on
  the `Bar` component, Toggle.tsx) — none new.
- `npm run typecheck` → 0 errors (after the `.getDetail!()` fixup noted
  above).

One sandbox `EPERM` was hit writing the new fixture file via a Node
script (worktree not in the sandbox write-allowlist); retried with the
sandbox disabled per the task instructions, all git/npm commands
otherwise ran in the default sandbox.
