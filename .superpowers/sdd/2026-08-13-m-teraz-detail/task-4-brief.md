# Task 4 — usePlaceDetail hook + core interface + ActivePlaceContext wiring

Worktree `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest`, branch `feature/m-teraz-detail`.

## Global Constraints
- TS strict; no `any`. Files ≤200, funcs ≤40. Test names cite AC IDs. Layering: shared→core.

## Produces
- `AirQualitySource.getDetail?(): Promise<ReadingDetail>` (optional method on the core interface).
- `usePlaceDetail(place): { detail?: ReadingDetail }` from `src/shared/place/usePlaceDetail.ts`.
- `detail?: ReadingDetail` on the active-place context.

## Files
- Modify: `src/core/air/index.ts` (add optional `getDetail?` to `AirQualitySource`; `ReadingDetail` is already exported via `history.ts`).
- Create: `src/shared/place/usePlaceDetail.ts`
- Modify: `src/shared/place/ActivePlaceContext.tsx` (run the hook, expose `detail`), `src/shared/place/index.ts` (export `usePlaceDetail`).
- Test: `src/shared/place/__tests__/usePlaceDetail.test.tsx`

## Reference — mirror `usePlaceReading.ts` EXACTLY
```ts
export function usePlaceReading(place: ActivePlace): ReadingState {
  const sourceForPlace = useSourceForPlace();
  const [state, setState] = useState<ReadingState>({ status: 'loading' });
  const placeKey = place.kind === 'location' ? 'location' : `station:${place.station.id}`;
  useEffect(() => {
    let active = true;
    sourceForPlace(place).getCurrentReading()
      .then(r => active && setState({ status: 'ready', reading: r }))
      .catch(() => active && setState(prev => ({ status: 'stale', reading: prev.reading })));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by placeKey; `place` identity intentionally excluded
  }, [sourceForPlace, placeKey]);
  return state;
}
```
Current `AirQualitySource` (core/air/index.ts): `{ getCurrentReading(): Promise<Reading> }`.

## Step 1: Core interface change
In `src/core/air/index.ts`, add to `AirQualitySource`:
```ts
export interface AirQualitySource {
  getCurrentReading(): Promise<Reading>;
  getDetail?(): Promise<ReadingDetail>; // active-place only; see spec 012
}
```
(`ReadingDetail` is exported from `./history`; make sure it's importable/exported from the barrel — it already is via `export * from './history'`. If `AirQualitySource` is declared ABOVE the `export * from './history'` line, reference the type by importing it at top: `import type { ReadingDetail } from './history';`.)

## Step 2: Write the failing tests (`usePlaceDetail.test.tsx`)
```ts
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePlaceDetail } from '../usePlaceDetail';
import { PlaceSourceProvider, type SourceForPlace } from '../PlaceSourceContext';
import { LOCATION_PLACE } from '../../../core/places';
import type { ReadingDetail } from '../../../core/air';

const detail: ReadingDetail = { history: [{ at: 't', pm25: 5, index: 5 }], pm10: 30, no2: 22 };
const wrap = (sfp: SourceForPlace) =>
  function W({ children }: { children: React.ReactNode }) {
    return <PlaceSourceProvider sourceForPlace={sfp}>{children}</PlaceSourceProvider>;
  };

test('AC-7: getDetail present → detail resolves', async () => {
  const sfp: SourceForPlace = () => ({ getCurrentReading: async () => ({} as any), getDetail: async () => detail });
  const { result } = renderHook(() => usePlaceDetail(LOCATION_PLACE), { wrapper: wrap(sfp) });
  await waitFor(() => expect(result.current.detail).toEqual(detail));
});

test('AC-7: no getDetail → detail undefined (no throw)', async () => {
  const sfp: SourceForPlace = () => ({ getCurrentReading: async () => ({} as any) });
  const { result } = renderHook(() => usePlaceDetail(LOCATION_PLACE), { wrapper: wrap(sfp) });
  // allow a tick; stays undefined
  await act(async () => {});
  expect(result.current.detail).toBeUndefined();
});

test('AC-7: rejected getDetail → detail undefined (no throw)', async () => {
  const sfp: SourceForPlace = () => ({ getCurrentReading: async () => ({} as any), getDetail: () => Promise.reject(new Error('x')) });
  const { result } = renderHook(() => usePlaceDetail(LOCATION_PLACE), { wrapper: wrap(sfp) });
  await act(async () => {});
  expect(result.current.detail).toBeUndefined();
});
```
(Adjust imports to match the repo — check `PlaceSourceContext` exports `SourceForPlace` + `PlaceSourceProvider`; `@testing-library/react-native` v14 renderHook/act are async — await them. The `{} as any` reading stub needs an inline justification comment OR build a minimal valid Reading — prefer a minimal real Reading object to avoid `any`.)

## Step 3: Implement `usePlaceDetail.ts`
Mirror usePlaceReading (useSourceForPlace, placeKey, `active` unmount guard, same eslint-disable):
```ts
import { useEffect, useState } from 'react';
import type { ReadingDetail } from '../../core/air';
import type { ActivePlace } from '../../core/places';
import { useSourceForPlace } from './PlaceSourceContext';

// Fetches rich detail (24h history + PM10/NO₂) for the ACTIVE place only, once
// per place identity. Mirrors usePlaceReading. Absent getDetail or a rejection
// → detail stays undefined (Teraz degrades to Hero-only).
export function usePlaceDetail(place: ActivePlace): { detail?: ReadingDetail } {
  const sourceForPlace = useSourceForPlace();
  const [detail, setDetail] = useState<ReadingDetail | undefined>(undefined);
  const placeKey = place.kind === 'location' ? 'location' : `station:${place.station.id}`;
  useEffect(() => {
    let active = true;
    setDetail(undefined); // reset while the new place's detail loads
    sourceForPlace(place)
      .getDetail?.()
      .then(d => active && setDetail(d))
      .catch(() => active && setDetail(undefined));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by placeKey; `place` identity intentionally excluded
  }, [sourceForPlace, placeKey]);
  return { detail };
}
```

## Step 4: Wire into ActivePlaceContext.tsx
- Add `detail?: ReadingDetail` to `ActivePlaceValue`.
- In `ActivePlaceProvider`, call `const { detail } = usePlaceDetail(active);` alongside `usePlaceReading(active)`, and include `detail` in the memo value (add to deps).
- Export `usePlaceDetail` from `src/shared/place/index.ts`.

## Step 5: Verify pass + gate
`npx jest src/shared/place`; full `npm test`; `npm run typecheck`; `npm run lint`.

## Step 6: Commit
`git add src/core/air/index.ts src/shared/place && git commit -m "feat(shared): usePlaceDetail + active-place detail; getDetail? on AirQualitySource (AC-7, spec 012)"`

## Report
Write your full report to `.superpowers/sdd/2026-08-13-m-teraz-detail/task-4-report.md` BEFORE your final message. Note: once core `AirQualitySource` has `getDetail?`, the local `SourceWithDetail` type in `src/data/gios/source.ts` is redundant — you MAY simplify it to return `AirQualitySource` (optional; only if it stays clean and all gios tests pass). Final message: status, commit SHA, one-line test summary, concerns.

Note: if a git/npm command fails with "Operation not permitted" (sandbox), retry with sandbox disabled.
