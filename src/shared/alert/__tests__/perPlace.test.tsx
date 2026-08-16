import { waitFor, act, fireEvent } from '@testing-library/react-native';
import { fakeNotifier, fixedSource, PlacePicker, renderAlert } from './harness';

// AC-4 (S2): per-place dedup — a separate concern from the crossing/ready-gate
// cases in crossing.test.tsx.

test('AC-4 (S2): per-place dedup — switching away and back does not re-fire; a distinct place fires on its own', async () => {
  const n = fakeNotifier();
  const { getByTestId } = await renderAlert({
    notifier: n,
    sourceForPlace: fixedSource({ 1: 80, 2: 90 }),
    settings: { alert: true, threshold: 50 },
    children: <PlacePicker />,
  });

  // Place A (>= threshold) fires once.
  await waitFor(() => expect(n.notifySmog).toHaveBeenCalledTimes(1));
  expect(n.notifySmog).toHaveBeenLastCalledWith(80);

  // Switch to B (>= threshold): fires for B.
  await act(async () => {
    fireEvent.press(getByTestId('pick-b'));
  });
  await waitFor(() => expect(n.notifySmog).toHaveBeenCalledTimes(2));
  expect(n.notifySmog).toHaveBeenLastCalledWith(90);

  // Switch back to A (still >= threshold): must NOT re-fire A. `act` already
  // flushes the (immediately-resolving) fixedSource refetch's microtasks.
  await act(async () => {
    fireEvent.press(getByTestId('pick-a'));
  });
  expect(n.notifySmog).toHaveBeenCalledTimes(2);
});
