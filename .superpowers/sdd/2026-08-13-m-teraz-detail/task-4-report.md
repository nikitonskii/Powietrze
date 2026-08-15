# Task 4 Report — usePlaceDetail hook + core interface + ActivePlaceContext wiring

Status: DONE
Commit: 036d9d1

## What was done

1. **Core interface** (`src/core/air/index.ts`): added
   `getDetail?(): Promise<ReadingDetail>` to `AirQualitySource`, imported
   `ReadingDetail` as a type from `./history` at the top of the file (the
   interface is declared above the `export * from './history'` re-export
   line, so a direct import was needed for the type to resolve).

2. **`src/shared/place/usePlaceDetail.ts`** (new): mirrors
   `usePlaceReading.ts` exactly — `useSourceForPlace`, effect keyed on the
   primitive `placeKey` (`'location'` or `station:${id}`), `active` unmount
   guard, same `eslint-disable-next-line react-hooks/exhaustive-deps`
   comment/rationale. Calls `sourceForPlace(place).getDetail?.()`; absent
   `getDetail` (optional call returns `undefined`, `.then` never invoked) or
   a rejection both leave `detail` as `undefined` — no throw, no `stale`
   state (unlike `usePlaceReading`, there's no "keep last value" semantics
   requested for detail). Resets `detail` to `undefined` at the start of
   each effect run so switching places doesn't show stale detail from the
   previous place while the new one loads.

3. **`src/shared/place/__tests__/usePlaceDetail.test.tsx`** (new): 3 tests
   per the brief (AC-7): getDetail present → resolves; no getDetail →
   undefined, no throw; rejected getDetail → undefined, no throw. Built a
   minimal real `Reading` object for the `getCurrentReading` stub instead of
   `{} as any` (satisfies the "no `any`" rule cleanly since
   `usePlaceDetail` never touches `getCurrentReading`'s return value).
   Discovered `@testing-library/react-native` v14's `renderHook` returns a
   Promise (confirmed via `node_modules/@testing-library/react-native/package.json`,
   version 14.0.1) — the brief's snippet omitted the `await`, causing
   `result` to be `undefined` (`TypeError: Cannot read properties of
   undefined (reading 'current')`) on first run. Fixed by awaiting all
   three `renderHook(...)` calls.

4. **`src/shared/place/ActivePlaceContext.tsx`**: added `detail?:
   ReadingDetail` to `ActivePlaceValue`; provider now also calls `const {
   detail } = usePlaceDetail(active)` alongside `usePlaceReading(active)`,
   and `detail` is spread into the memoized context value with `detail`
   added to the `useMemo` deps array.

5. **`src/shared/place/index.ts`**: added `export * from './usePlaceDetail'`.

## Optional cleanup — skipped (risky)

The brief offered simplifying `src/data/gios/source.ts`'s local
`SourceWithDetail` type down to plain `AirQualitySource` now that
`getDetail?` lives on the core interface. Checked: `getDetail?` is
*optional* on `AirQualitySource`, but
`src/data/gios/__tests__/detail.test.ts` calls `.getDetail()` directly
without optional chaining in six places (e.g.
`createStationSource(...).getDetail()`). Under TS strict mode that would
become "Cannot invoke an object which is possibly 'undefined'" once the
factories' return type loses the non-optional `getDetail` guarantee.
Per the brief's "skip if risky" instruction, left `SourceWithDetail` as-is.

## Verification

- `npx jest src/shared/place`: 4 suites, 9 tests, all passed.
- `npm test` (full suite): 46 suites, 156 tests, all passed.
- `npm run typecheck`: clean, no errors.
- `npm run lint`: 0 errors, 3 pre-existing warnings unrelated to this change
  (App.tsx inline style, gios/mappers.ts unused-disable comment,
  Toggle.tsx inline style) — none introduced by this task.

## Commit

```
036d9d1 feat(shared): usePlaceDetail + active-place detail; getDetail? on AirQualitySource (AC-7, spec 012)
 5 files changed, 104 insertions(+), 2 deletions(-)
 create mode 100644 src/shared/place/__tests__/usePlaceDetail.test.tsx
 create mode 100644 src/shared/place/usePlaceDetail.ts
```
Scope: `src/core/air/index.ts` + `src/shared/place/` only, as specified.

## Concerns

None blocking. Minor note for a future task: `usePlaceDetail`'s "reset to
undefined at the start of each effect" means the Teraz detail view will
briefly show nothing while switching places (mirrors `usePlaceReading`'s
`loading` transition conceptually, but there's no explicit loading state
exposed from `usePlaceDetail` — only `{ detail?: ReadingDetail }` per the
brief's contract). If a future spec wants a loading indicator specifically
for the detail section, the hook's return shape will need to grow a status
field; out of scope here since the brief pinned the exact return type.
