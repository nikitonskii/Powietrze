import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { NotificationsProvider } from '..';
import { SettingsProvider } from '../../settings';
import {
  DEFAULT_SETTINGS,
  type Settings,
  type SettingsStore,
} from '../../../core/settings';
import type { Notifier } from '../../../core/notifications';

const store = (s: Settings = DEFAULT_SETTINGS): SettingsStore => ({
  load: async () => s,
  save: async () => {},
});

const fakeNotifier = (granted = true): Notifier & { calls: string[] } => {
  const calls: string[] = [];
  return {
    calls,
    requestPermission: async () => {
      calls.push('req');
      return granted;
    },
    scheduleMorning: async () => {
      calls.push('sched');
    },
    cancelMorning: async () => {
      calls.push('cancel');
    },
  };
};

const wrap = (n: Notifier, s: Settings) =>
  render(
    <SettingsProvider store={store(s)}>
      <NotificationsProvider notifier={n}>
        <Text>x</Text>
      </NotificationsProvider>
    </SettingsProvider>,
  );

test('AC-4: morning on + granted → request then schedule', async () => {
  const n = fakeNotifier(true);
  wrap(n, { ...DEFAULT_SETTINGS, morning: true });
  // SettingsProvider starts at DEFAULT_SETTINGS (morning: false) and hydrates
  // async (AC-10), so an initial idempotent no-op cancelMorning() may fire
  // before hydration flips morning to true — filter it out and assert the
  // request→schedule order that matters for AC-4.
  await waitFor(() =>
    expect(n.calls.filter(c => c !== 'cancel')).toEqual(['req', 'sched']),
  );
});

test('AC-4: morning on + denied → no schedule, toggle reverts to false', async () => {
  const saved: Settings[] = [];
  const n = fakeNotifier(false);
  render(
    <SettingsProvider
      store={{
        load: async () => ({ ...DEFAULT_SETTINGS, morning: true }),
        save: async x => {
          saved.push(x);
        },
      }}
    >
      <NotificationsProvider notifier={n}>
        <Text>x</Text>
      </NotificationsProvider>
    </SettingsProvider>,
  );
  await waitFor(() => expect(n.calls).toContain('req'));
  expect(n.calls).not.toContain('sched');
  await waitFor(() => expect(saved.at(-1)?.morning).toBe(false)); // persisted revert
});

test('AC-4: morning off → cancel', async () => {
  const n = fakeNotifier(true);
  wrap(n, { ...DEFAULT_SETTINGS, morning: false });
  await waitFor(() => expect(n.calls).toContain('cancel'));
  expect(n.calls).not.toContain('sched');
});

test('AC-4: cold-launch hydration (stored morning:true) schedules once', async () => {
  const n = fakeNotifier(true);
  render(
    <SettingsProvider store={store({ ...DEFAULT_SETTINGS, morning: true })}>
      <NotificationsProvider notifier={n}>
        <Text>x</Text>
      </NotificationsProvider>
    </SettingsProvider>,
  );
  await waitFor(() =>
    expect(n.calls.filter(c => c === 'sched')).toHaveLength(1),
  );
});
