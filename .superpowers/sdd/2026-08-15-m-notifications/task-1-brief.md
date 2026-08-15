# Task 1 — core/notifications (MORNING_TIME, nextMorningTimestamp, Notifier)

Worktree `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest`, branch `feature/m-notifications`.

## Global Constraints
`src/core` PURE (zero React, no @notifee); TS strict, no `any`; files ≤200/funcs ≤40; test names cite AC IDs; `src/core` 100% coverage. Do NOT import @notifee (not installed — that's the deferred native gate).

## Files
- Create `src/core/notifications/index.ts`
- Test `src/core/notifications/__tests__/notifications.test.ts`

## Step 1: failing tests
```ts
import { MORNING_TIME, nextMorningTimestamp } from '..';

test('AC-1: MORNING_TIME is 07:30', () => {
  expect(MORNING_TIME).toBe('07:30');
});

test('AC-2: nextMorningTimestamp — today if before 07:30, else tomorrow (future, local)', () => {
  const at = (h: number, m: number) => new Date(2026, 7, 15, h, m, 0, 0); // local Aug 15 2026
  const today = new Date(nextMorningTimestamp(at(6, 0)));
  expect([today.getFullYear(), today.getMonth(), today.getDate(), today.getHours(), today.getMinutes(), today.getSeconds()])
    .toEqual([2026, 7, 15, 7, 30, 0]);
  expect(nextMorningTimestamp(at(6, 0))).toBeGreaterThan(at(6, 0).getTime());

  const tmr = new Date(nextMorningTimestamp(at(8, 0)));
  expect([tmr.getMonth(), tmr.getDate(), tmr.getHours(), tmr.getMinutes()]).toEqual([7, 16, 7, 30]);

  // exactly 07:30 counts as passed → tomorrow (strict before)
  expect(new Date(nextMorningTimestamp(at(7, 30))).getDate()).toBe(16);
});
```

## Step 2: run → fail. Step 3: implement (`src/core/notifications/index.ts`)
```ts
export const MORNING_TIME = '07:30';

// The seam features/settings use; the @notifee adapter (data layer) implements it,
// a fake in tests. Never import @notifee outside that adapter.
export interface Notifier {
  requestPermission(): Promise<boolean>;
  scheduleMorning(time?: string): Promise<void>;
  cancelMorning(): Promise<void>;
}

// Epoch-ms of the NEXT occurrence of HH:MM in LOCAL wall-clock time: today if
// `now` is strictly before it, else tomorrow (a notifee TimestampTrigger needs a
// future time). `now` is injected (pure/testable).
export function nextMorningTimestamp(now: Date, time: string = MORNING_TIME): number {
  const [h, m] = time.split(':').map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return target.getTime();
}
```

## Step 4: gate
`npx jest src/core/notifications` PASS; `npm run typecheck` 0. Confirm src/core 100% via the FULL suite (`npm test` shows no "coverage threshold not met").

## Step 5: commit
`git add src/core/notifications && git commit -m "feat(core): notifications timing + Notifier seam (AC-1,2, spec 015)"`

## Report → `.superpowers/sdd/2026-08-15-m-notifications/task-1-report.md` before your final message. Final message: status, SHA, one-line test summary, concerns.
Note: git/npm "Operation not permitted" → retry sandbox disabled.
