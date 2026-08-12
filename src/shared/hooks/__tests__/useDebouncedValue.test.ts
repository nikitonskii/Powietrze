import { renderHook, act } from '@testing-library/react-native';
import { useDebouncedValue } from '../useDebouncedValue';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('AC 007-1: immediate initial, updates after delay, resets on change', async () => {
  const { result, rerender, unmount } = await renderHook(
    ({ v }: { v: string }) => useDebouncedValue(v, 300),
    { initialProps: { v: 'A' } },
  );
  expect(result.current).toBe('A'); // initial → immediate

  await rerender({ v: 'B' });
  await act(() => jest.advanceTimersByTime(299));
  expect(result.current).toBe('A'); // still old at delay-1
  await act(() => jest.advanceTimersByTime(1));
  expect(result.current).toBe('B'); // new at delay

  // reset-on-change: C superseded by D within the window → only D emits, C never seen
  await rerender({ v: 'C' });
  await act(() => jest.advanceTimersByTime(150));
  await rerender({ v: 'D' }); // resets the timer
  await act(() => jest.advanceTimersByTime(150)); // 150 since D (<300), 300 since C
  expect(result.current).toBe('B'); // neither C nor D due yet
  await act(() => jest.advanceTimersByTime(150)); // now 300 since D
  expect(result.current).toBe('D'); // D emitted; C never observed

  // cleared on unmount: a pending timer must not fire a post-unmount setState
  await rerender({ v: 'E' });
  await unmount();
  await expect(act(() => jest.advanceTimersByTime(300))).resolves.not.toThrow();
});
