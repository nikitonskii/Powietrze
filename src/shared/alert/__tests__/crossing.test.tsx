import { waitFor, act, fireEvent } from '@testing-library/react-native';
import type { Reading } from '../../../core/air';
import type { SourceForPlace } from '../../place';
import {
  fakeNotifier,
  fixedSource,
  reading,
  NIGHT,
  AlertControls,
  renderAlert,
} from './harness';

// AC-4: rising-crossing firing + the ready-only gate (S4). Per-place dedup
// lives in perPlace.test.tsx; permission handling in permission.test.tsx.

test('AC-4: fires notifySmog once on a rising crossing', async () => {
  const n = fakeNotifier();
  await renderAlert({
    notifier: n,
    sourceForPlace: fixedSource({ 1: 80 }),
    settings: { alert: true, threshold: 50 },
  });
  await waitFor(() => expect(n.notifySmog).toHaveBeenCalledTimes(1));
  expect(n.notifySmog).toHaveBeenCalledWith(80);
});

test('AC-4: does not fire below threshold', async () => {
  const n = fakeNotifier();
  const { getByTestId } = await renderAlert({
    notifier: n,
    sourceForPlace: fixedSource({ 1: 10 }),
    settings: { alert: true, threshold: 50 },
    children: <AlertControls />,
  });
  await waitFor(() =>
    expect(getByTestId('status').props.children).toBe('ready'),
  );
  expect(n.notifySmog).not.toHaveBeenCalled();
});

test('AC-4: does not fire when alert is off', async () => {
  const n = fakeNotifier();
  const { getByTestId } = await renderAlert({
    notifier: n,
    sourceForPlace: fixedSource({ 1: 80 }),
    settings: { alert: false, threshold: 50 },
    children: <AlertControls />,
  });
  await waitFor(() =>
    expect(getByTestId('status').props.children).toBe('ready'),
  );
  expect(n.notifySmog).not.toHaveBeenCalled();
});

test('AC-4: does not fire during quiet hours', async () => {
  const n = fakeNotifier();
  const { getByTestId } = await renderAlert({
    notifier: n,
    now: NIGHT,
    sourceForPlace: fixedSource({ 1: 80 }),
    settings: { alert: true, threshold: 50 },
    children: <AlertControls />,
  });
  await waitFor(() =>
    expect(getByTestId('status').props.children).toBe('ready'),
  );
  expect(n.notifySmog).not.toHaveBeenCalled();
});

test('AC-4 (S4): does not fire while status is not ready (loading)', async () => {
  const n = fakeNotifier();
  let resolveReading: ((r: Reading) => void) | undefined;
  const pendingSource: SourceForPlace = () => ({
    getCurrentReading: () =>
      new Promise<Reading>(resolve => {
        resolveReading = resolve;
      }),
  });
  const { getByTestId } = await renderAlert({
    notifier: n,
    sourceForPlace: pendingSource,
    settings: { alert: true, threshold: 50 },
    children: <AlertControls />,
  });
  expect(getByTestId('status').props.children).toBe('loading');
  expect(n.notifySmog).not.toHaveBeenCalled();
  await act(async () => {
    resolveReading?.(reading(80));
  });
  await waitFor(() => expect(n.notifySmog).toHaveBeenCalledTimes(1));
});

test('AC-4 (S4): a stale reading (retains prior value) is NOT evaluated and does not corrupt wasAbove', async () => {
  const n = fakeNotifier();
  let stationCalls = 0;
  const source: SourceForPlace = place => ({
    getCurrentReading: () => {
      if (place.kind !== 'station') return Promise.resolve(reading(0));
      stationCalls += 1;
      if (stationCalls === 2) return Promise.reject(new Error('network'));
      return Promise.resolve(reading(80));
    },
  });
  const { getByTestId } = await renderAlert({
    notifier: n,
    sourceForPlace: source,
    settings: { alert: true, threshold: 50 },
    withRefresh: true,
    children: <AlertControls />,
  });
  // 1st fetch: ready @80 (>= threshold) — fires once.
  await waitFor(() => expect(n.notifySmog).toHaveBeenCalledTimes(1));

  // 2nd fetch (refresh): rejects → stale, retains @80. Must NOT re-evaluate.
  await act(async () => {
    fireEvent.press(getByTestId('refresh'));
  });
  await waitFor(() =>
    expect(getByTestId('status').props.children).toBe('stale'),
  );
  expect(n.notifySmog).toHaveBeenCalledTimes(1);

  // 3rd fetch (refresh): ready @80 again (still above). A buggy stale
  // evaluation could have reset wasAbove, wrongly re-firing here.
  await act(async () => {
    fireEvent.press(getByTestId('refresh'));
  });
  await waitFor(() =>
    expect(getByTestId('status').props.children).toBe('ready'),
  );
  expect(n.notifySmog).toHaveBeenCalledTimes(1);
});

test('AC-4: staying above threshold on refetch does not re-fire; dropping below then re-crossing fires again', async () => {
  const n = fakeNotifier();
  let index = 80;
  const source: SourceForPlace = place => ({
    getCurrentReading: () =>
      Promise.resolve(reading(place.kind === 'station' ? index : 0)),
  });
  const { getByTestId } = await renderAlert({
    notifier: n,
    sourceForPlace: source,
    settings: { alert: true, threshold: 50 },
    withRefresh: true,
    children: <AlertControls />,
  });
  await waitFor(() => expect(n.notifySmog).toHaveBeenCalledTimes(1));

  // Refetch while still above threshold: must NOT re-fire.
  await act(async () => {
    fireEvent.press(getByTestId('refresh'));
  });
  await waitFor(() =>
    expect(getByTestId('refreshing').props.children).toBe('false'),
  );
  expect(n.notifySmog).toHaveBeenCalledTimes(1);

  // Drop below threshold, refetch: no fire, but wasAbove resets.
  index = 10;
  await act(async () => {
    fireEvent.press(getByTestId('refresh'));
  });
  await waitFor(() =>
    expect(getByTestId('refreshing').props.children).toBe('false'),
  );
  expect(n.notifySmog).toHaveBeenCalledTimes(1);

  // Re-cross: fires again.
  index = 80;
  await act(async () => {
    fireEvent.press(getByTestId('refresh'));
  });
  await waitFor(() => expect(n.notifySmog).toHaveBeenCalledTimes(2));
});
