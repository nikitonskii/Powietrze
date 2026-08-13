import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ReadingDetail } from '../../core/air';
import { LOCATION_PLACE, type ActivePlace } from '../../core/places';
import { usePlaceDetail } from './usePlaceDetail';
import { usePlaceReading, type ReadingState } from './usePlaceReading';

type ActivePlaceValue = {
  active: ActivePlace;
  setActive: (p: ActivePlace) => void;
  detail?: ReadingDetail;
} & ReadingState;

const Ctx = createContext<ActivePlaceValue | null>(null);

// Single source of truth for the active place + its live reading (Teraz + tab tint).
// Default is the device location; resets on each launch (in-memory).
export function ActivePlaceProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActivePlace>(LOCATION_PLACE);
  const state = usePlaceReading(active);
  const { detail } = usePlaceDetail(active);
  const value = useMemo<ActivePlaceValue>(
    () => ({ active, setActive, detail, ...state }),
    [active, state, detail],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useActivePlace(): ActivePlaceValue {
  const v = useContext(Ctx);
  if (!v)
    throw new Error('useActivePlace: wrap the tree in <ActivePlaceProvider>');
  return v;
}
