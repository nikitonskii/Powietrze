# Task 4 — NotificationsProvider (headless; fake Notifier)

Worktree `/Users/curiosity/Documents/private/Powietrze/.claude/worktrees/m-loc-nearest`, branch `feature/m-notifications`.

## Global Constraints
TS strict, no `any`; files ≤200/funcs ≤40; tests cite AC IDs; FULL suite green. Do NOT import @notifee (native gate, deferred) — the provider takes a `Notifier` (from core) as a prop.

## Consumes
`Notifier` from `../../core/notifications` (Task 1); `useSettings` from `../settings`.

## Produces
`NotificationsProvider({ notifier, children })` from `src/shared/notifications/index.tsx` (exported). NOT yet wired into App.tsx (that's the native gate).

## Behavior
Reads `settings.morning` + `set`. Effect keyed on `[morning, notifier]` (exclude `set` — it's not stable; eslint-disable exhaustive-deps with a note):
- `morning === true`: `requestPermission()`; if granted → `scheduleMorning()`; if DENIED (false) → `set('morning', false)` (persisted revert), do NOT schedule.
- `morning === false`: `cancelMorning()` (idempotent no-op if nothing scheduled).
Use an `active` unmount guard around the async `.then`. Idempotent (fixed id in the adapter) so cold-launch hydration (false→true) schedules exactly once. It just renders `children` (no context value needed).

## Step 1: failing tests — `src/shared/notifications/__tests__/NotificationsProvider.test.tsx`
Use the real `SettingsProvider` with a fake store + a fake `Notifier` (jest.fn's):
```ts
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { NotificationsProvider } from '..';
import { SettingsProvider } from '../../settings';
import { DEFAULT_SETTINGS, type Settings, type SettingsStore } from '../../../core/settings';
import type { Notifier } from '../../../core/notifications';

const store = (s: Settings = DEFAULT_SETTINGS, saved: Settings[] = []): SettingsStore =>
  ({ load: async () => s, save: async n => { saved.push(n); } });
const fakeNotifier = (granted = true): Notifier & { calls: string[] } => {
  const calls: string[] = [];
  return { calls,
    requestPermission: async () => { calls.push('req'); return granted; },
    scheduleMorning: async () => { calls.push('sched'); },
    cancelMorning: async () => { calls.push('cancel'); } };
};
const wrap = (n: Notifier, s: Settings) =>
  render(<SettingsProvider store={store(s)}><NotificationsProvider notifier={n}><Text>x</Text></NotificationsProvider></SettingsProvider>);

test('AC-4: morning on + granted → request then schedule', async () => {
  const n = fakeNotifier(true);
  wrap(n, { ...DEFAULT_SETTINGS, morning: true });
  await waitFor(() => expect((n as any).calls).toEqual(['req', 'sched']));
});
test('AC-4: morning on + denied → no schedule, toggle reverts to false', async () => {
  const saved: Settings[] = [];
  const n = fakeNotifier(false);
  render(<SettingsProvider store={{ load: async () => ({ ...DEFAULT_SETTINGS, morning: true }), save: async x => { saved.push(x); } }}>
    <NotificationsProvider notifier={n}><Text>x</Text></NotificationsProvider></SettingsProvider>);
  await waitFor(() => expect((n as any).calls).toContain('req'));
  expect((n as any).calls).not.toContain('sched');
  await waitFor(() => expect(saved.at(-1)?.morning).toBe(false)); // persisted revert
});
test('AC-4: morning off → cancel', async () => {
  const n = fakeNotifier(true);
  wrap(n, { ...DEFAULT_SETTINGS, morning: false });
  await waitFor(() => expect((n as any).calls).toContain('cancel'));
  expect((n as any).calls).not.toContain('sched');
});
test('AC-4: cold-launch hydration (stored morning:true) schedules once', async () => {
  const n = fakeNotifier(true);
  render(<SettingsProvider store={store({ ...DEFAULT_SETTINGS, morning: true })}>
    <NotificationsProvider notifier={n}><Text>x</Text></NotificationsProvider></SettingsProvider>);
  await waitFor(() => expect((n as any).calls.filter((c: string) => c === 'sched')).toHaveLength(1));
});
```
(Adjust import paths / RNTL v14 async as needed; `SettingsProvider` starts at DEFAULT_SETTINGS then hydrates — the morning:true store drives the false→true transition.)

## Step 2: run → fail. Step 3: implement `src/shared/notifications/index.tsx`
```tsx
import { useEffect, type ReactNode } from 'react';
import type { Notifier } from '../../core/notifications';
import { useSettings } from '../settings';

// Drives local notifications from settings.morning. On enable: request permission
// → schedule (or revert the toggle on denial). On disable: cancel. Idempotent
// (adapter uses a fixed id) so cold-launch hydration schedules exactly once.
export function NotificationsProvider({ notifier, children }: { notifier: Notifier; children: ReactNode }) {
  const { settings, set } = useSettings();
  const morning = settings.morning;
  useEffect(() => {
    let active = true;
    if (morning) {
      notifier.requestPermission().then(granted => {
        if (!active) return;
        if (granted) notifier.scheduleMorning();
        else set('morning', false);
      });
    } else {
      notifier.cancelMorning();
    }
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on morning; `set` intentionally excluded (not referentially stable)
  }, [morning, notifier]);
  return <>{children}</>;
}
```

## Step 4: gate
`npx jest src/shared/notifications`, then FULL `npm test`, `npm run lint`, `npm run typecheck` — all green.

## Step 5: commit
`git add src/shared/notifications && git commit -m "feat(shared): NotificationsProvider drives morning summary from settings (AC-4, spec 015)"`

## Report → `.superpowers/sdd/2026-08-15-m-notifications/task-4-report.md` before final message. Note: this provider is NOT yet wired into App.tsx (that + the @notifee adapter are the deferred native gate). Final message: status, SHA, one-line test summary, concerns.
Note: git/npm "Operation not permitted" → retry sandbox disabled.
