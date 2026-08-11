import { useContext, useEffect, useState } from 'react';
import type { Reading } from '../../core/air';
import { AirSourceContext } from './AirSourceContext';

export type ReadingState =
  | { status: 'loading'; reading?: Reading }
  | { status: 'ready'; reading: Reading }
  | { status: 'stale'; reading?: Reading };

// Fetches once on mount. On rejection → 'stale', keeping the last reading if any.
export function useCurrentReading(): ReadingState {
  const source = useContext(AirSourceContext);
  const [state, setState] = useState<ReadingState>({ status: 'loading' });
  useEffect(() => {
    let active = true;
    source
      .getCurrentReading()
      .then(r => active && setState({ status: 'ready', reading: r }))
      .catch(
        () =>
          active &&
          setState(prev => ({ status: 'stale', reading: prev.reading })),
      );
    return () => {
      active = false;
    };
  }, [source]);
  return state;
}
