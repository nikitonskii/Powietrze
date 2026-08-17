# Task 2 report — WidgetSyncProvider (AC-3)

## Files
- Created: `src/shared/widget/index.tsx` (38 lines) — `WidgetSyncProvider({ sync, children })`.
- Created: `src/shared/widget/__tests__/WidgetSyncProvider.test.tsx` (116 lines) — 4 tests, all cite AC-3.

## Investigation findings

### `ReadingState` shape + the "ready" literal (`src/shared/place/usePlaceReading.ts`)
```ts
export type ReadingState =
  | { status: 'loading'; reading?: Reading }
  | { status: 'ready'; reading: Reading }
  | { status: 'stale'; reading?: Reading };
```
The ready literal is the string `'ready'` — exactly what the plan's sketch already used
(`status !== 'ready'`), so no adjustment to that guard was needed.

`useActivePlace()` (`src/shared/place/ActivePlaceContext.tsx`) spreads `ReadingState` plus
`{ active, setActive, detail? }` into context value — so `{ status, reading, detail }` are all
available directly off `useActivePlace()` as instructed.

### Test harness mirrored
- **Provider style**: `src/shared/notifications/index.tsx` (`NotificationsProvider`) — same
  shape: read one thing from settings, `useEffect` keyed on the derived primitives, sync to an
  injected seam, `return <>{children}</>;`. Its effect deps list ALL values used in the effect
  body including the seam parameter (`notifier`) itself — no `eslint-disable` needed since
  nothing is intentionally omitted. I followed that: my effect's dep array is
  `[status, reading, detail, settings.scale, settings.precision, sync]` (matches the plan's
  sketch exactly) — every used value is present, so no disable comment required (this differs
  from `usePlaceReading`/`usePlaceDetail`/`ActivePlaceContext`, which DO need
  `eslint-disable-next-line react-hooks/exhaustive-deps` because they intentionally exclude an
  object identity from the deps — not applicable here).
- **Fake store**: `src/shared/notifications/__tests__/NotificationsProvider.test.tsx`'s
  `store()` factory (`SettingsStore` with `load`/`save`) — copied verbatim pattern.
  **Feeding a fixed reading**: `src/shared/place/__tests__/ActivePlaceContext.test.tsx`'s
  `sourceForPlace: SourceForPlace` fake + `PlaceSourceProvider` + `ActivePlaceProvider` stack —
  copied that provider nesting (`PlaceSourceProvider > SettingsProvider > ActivePlaceProvider`).
- **v14 async render**: `src/features/teraz/__tests__/Hero.test.tsx` confirmed `render`/`rerender`
  must be `await`ed (they return Promises in `@testing-library/react-native@14.0.1`) — my first
  draft called `wrap(...)` without awaiting and `rerender` wasn't a function on the un-awaited
  Promise; fixed by awaiting `render()` everywhere and awaiting `rerender()` too.

## Test list (all cite AC-3, `src/shared/widget/__tests__/WidgetSyncProvider.test.tsx`)
1. `AC-3: publishes once when the reading becomes ready, with the built snapshot` — asserts
   `sync.publish` called once with `buildWidgetSnapshot(READING, DETAIL, 'CAQI', 'Przybliżona')`.
2. `AC-3: an unrelated re-render with unchanged reading/settings does not republish` — forces a
   React `rerender` with an equivalent tree; publish count stays 1.
3. `AC-3: changing scale republishes with the updated snapshot` — presses a `ScaleToggle`
   (`set('scale', 'µg/m³')`); publish count becomes 2, 2nd call built with the new scale.
4. `AC-3: no publish while the reading is not ready` — `getCurrentReading()` returns a
   never-resolving promise (status stays `'loading'`); `sync.publish` never called.

## Gate results (all fresh, run from worktree root)
- `npm run typecheck` → clean, no output/errors.
- `npm run lint` → `0 errors, 4 warnings`; all 4 pre-existing warnings are in files I did not
  touch (`App.tsx`, `src/data/gios/mappers.ts`, `src/shared/ui/HistoryChart.tsx`,
  `src/shared/ui/Toggle.tsx`). No new lint errors or warnings introduced.
- `npm test` (plain, matches `package.json`'s `"test": "jest"` script — no `--coverage` flag, so
  the `src/core` 100% threshold gate isn't exercised by this command; Task 1's core code was
  already gated at 100% in its own commit and this task adds no `src/core` files) →
  **57 suites passed / 206 tests passed**, 0 failed.
- Also ran `npm test -- --coverage` as an extra check: same 57/206 pass; a `Failed to write
  coverage reports: EPERM ... coverage/coverage-final.json` error appeared at the very end — this
  is the sandbox denying a write to a stale `coverage/` directory left on disk from a prior run
  (owned outside the sandbox's writable set), not a test failure or a threshold miss; all tests
  still reported passed before that write attempt.

## Deviations from the plan's sketch
- None in the implementation (`src/shared/widget/index.tsx` matches the plan's Step 3 code
  block verbatim, including the full effect dep array with `sync` included).
- Test file structure differs from the plan's inline sketch (which was explicitly "implementer
  adapts") in two harness-compatibility ways, both forced by the real `@testing-library/react-native@14` API observed in `Hero.test.tsx`:
  1. `render(...)` and `rerender(...)` are `await`ed (v14 returns Promises).
  2. `fireEvent` is imported statically from `@testing-library/react-native` (not dynamically).

## Commit
`feat(shared): WidgetSyncProvider — publish snapshot on reading-identity change (AC-3)`
