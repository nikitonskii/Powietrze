import { useEffect, useState } from 'react';

// Returns `value`, but only after it has stayed unchanged for `delayMs`. A change
// before the delay elapses resets the timer, so only the latest value is emitted.
// The pending timer is cleared on unmount / dependency change (no leaked setState).
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
