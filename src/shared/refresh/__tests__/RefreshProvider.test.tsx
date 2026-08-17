import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { RefreshProvider, useRefreshSignal, useRefresh } from '../index';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

function Harness() {
  const signal = useRefreshSignal();
  const { refresh, refreshing, settleActive } = useRefresh();
  return (
    <>
      <Text testID="signal">{signal}</Text>
      <Text testID="refreshing">{refreshing ? 'true' : 'false'}</Text>
      <Text testID="refresh-btn" onPress={refresh}>
        refresh
      </Text>
      <Text testID="settle-btn" onPress={settleActive}>
        settle
      </Text>
    </>
  );
}

test('AC-1: refresh() bumps the signal by 1 and sets refreshing true', async () => {
  await render(
    <RefreshProvider>
      <Harness />
    </RefreshProvider>,
  );
  expect(screen.getByTestId('signal').props.children).toBe(0);
  expect(screen.getByTestId('refreshing').props.children).toBe('false');

  await fireEvent.press(screen.getByTestId('refresh-btn'));

  expect(screen.getByTestId('signal').props.children).toBe(1);
  expect(screen.getByTestId('refreshing').props.children).toBe('true');
});

test('AC-1: settleActive() sets refreshing false and cancels the safety timeout', async () => {
  await render(
    <RefreshProvider>
      <Harness />
    </RefreshProvider>,
  );
  await fireEvent.press(screen.getByTestId('refresh-btn'));
  expect(screen.getByTestId('refreshing').props.children).toBe('true');

  await fireEvent.press(screen.getByTestId('settle-btn'));
  expect(screen.getByTestId('refreshing').props.children).toBe('false');

  // timeout was cancelled by settleActive — advancing past 8s must not throw
  // and refreshing must remain false (nothing left to fire).
  await act(() => jest.advanceTimersByTime(8000));
  expect(screen.getByTestId('refreshing').props.children).toBe('false');
});

test('AC-1: the 8s safety timeout auto-clears refreshing when settleActive never comes', async () => {
  await render(
    <RefreshProvider>
      <Harness />
    </RefreshProvider>,
  );
  await fireEvent.press(screen.getByTestId('refresh-btn'));
  expect(screen.getByTestId('refreshing').props.children).toBe('true');

  await act(() => jest.advanceTimersByTime(7999));
  expect(screen.getByTestId('refreshing').props.children).toBe('true');

  await act(() => jest.advanceTimersByTime(1));
  expect(screen.getByTestId('refreshing').props.children).toBe('false');
});

test('AC-1: a second refresh() while refreshing is a no-op (signal unchanged)', async () => {
  await render(
    <RefreshProvider>
      <Harness />
    </RefreshProvider>,
  );
  await fireEvent.press(screen.getByTestId('refresh-btn'));
  expect(screen.getByTestId('signal').props.children).toBe(1);

  await fireEvent.press(screen.getByTestId('refresh-btn'));
  expect(screen.getByTestId('signal').props.children).toBe(1); // debounced
  expect(screen.getByTestId('refreshing').props.children).toBe('true');
});

test('AC-1: unwrapped (no RefreshProvider) — signal is 0, refresh/settleActive are safe no-ops', async () => {
  await render(<Harness />);
  expect(screen.getByTestId('signal').props.children).toBe(0);
  expect(screen.getByTestId('refreshing').props.children).toBe('false');

  await expect(
    fireEvent.press(screen.getByTestId('refresh-btn')),
  ).resolves.not.toThrow();
  await expect(
    fireEvent.press(screen.getByTestId('settle-btn')),
  ).resolves.not.toThrow();

  expect(screen.getByTestId('signal').props.children).toBe(0);
  expect(screen.getByTestId('refreshing').props.children).toBe('false');
});
