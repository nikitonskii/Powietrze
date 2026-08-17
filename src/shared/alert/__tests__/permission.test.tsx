import { waitFor, act, fireEvent } from '@testing-library/react-native';
import { fakeNotifier, fixedSource, AlertToggle, renderAlert } from './harness';
import { DEFAULT_SETTINGS, type Settings } from '../../../core/settings';

// AC-4: toggling `alert` on requests permission; denial reverts the setting
// (persisted). A separate concern from the crossing/per-place cases.

test('AC-4: toggling alert on requests permission; denied reverts the setting', async () => {
  const saved: Settings[] = [];
  const n = fakeNotifier(false);
  const { getByTestId } = await renderAlert({
    notifier: n,
    sourceForPlace: fixedSource({ 1: 10 }),
    settingsStore: {
      load: async () => ({ ...DEFAULT_SETTINGS, loc: false, alert: false }),
      save: async x => {
        saved.push(x);
      },
    },
    children: <AlertToggle />,
  });
  await act(async () => {
    fireEvent.press(getByTestId('toggle-alert'));
  });
  await waitFor(() => expect(n.calls).toContain('req'));
  await waitFor(() => expect(saved.at(-1)?.alert).toBe(false));
});
