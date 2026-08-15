# Task 2 — defaultPlace (core/places)

Worktree `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest`, branch `feature/m-settings-wired`.

## Global Constraints
`src/core` PURE; TS strict, no `any`; test names cite AC IDs; src/core 100% coverage.

## Files
- Modify `src/core/places/index.ts` (read first; it exports `LOCATION_PLACE`, `ActivePlace`; `Station` comes from `../geo`).
- Test `src/core/places/__tests__/defaultPlace.test.ts`.

## Step 1: failing test (AC-4)
```ts
import { defaultPlace, LOCATION_PLACE } from '..';
import type { Station } from '../../geo';
const krk: Station = { id: 400, name: 'Kraków, Aleja Krasińskiego', city: 'Kraków', lat: 0, lon: 0 };
test('AC-4: defaultPlace by loc', () => {
  expect(defaultPlace(true, krk)).toEqual(LOCATION_PLACE);
  expect(defaultPlace(false, krk)).toEqual({ kind: 'station', station: krk });
});
```

## Step 2: run → fail. Step 3: implement (append to core/places/index.ts)
```ts
export function defaultPlace(loc: boolean, defaultStation: Station): ActivePlace {
  return loc ? LOCATION_PLACE : { kind: 'station', station: defaultStation };
}
```
(Ensure `Station` is imported/available in that file — it likely already imports from `../geo`.)

## Step 4: gate
`npx jest src/core/places` PASS; `npm run typecheck` 0.

## Step 5: commit
`git add src/core/places && git commit -m "feat(core): defaultPlace (AC-4, spec 014)"`

## Report
Write to `.superpowers/sdd/2026-08-15-m-settings-wired/task-2-report.md` before your final message. Final message: status, commit SHA, one-line test summary, concerns.
Note: git/npm "Operation not permitted" → retry sandbox disabled.
