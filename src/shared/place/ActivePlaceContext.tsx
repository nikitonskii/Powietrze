import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ReadingDetail } from '../../core/air';
import type { Station } from '../../core/geo';
import {
  defaultPlace,
  LOCATION_PLACE,
  type ActivePlace,
} from '../../core/places';
import { useSettings } from '../settings';
import { usePlaceDetail } from './usePlaceDetail';
import { usePlaceReading, type ReadingState } from './usePlaceReading';

type ActivePlaceValue = {
  active: ActivePlace;
  setActive: (p: ActivePlace) => void;
  detail?: ReadingDetail;
} & ReadingState;

const Ctx = createContext<ActivePlaceValue | null>(null);

// Single source of truth for the active place + its live reading (Teraz + tab tint).
// Default follows the `loc` setting: location when on, else `defaultStation`
// (falls back to LOCATION_PLACE when no defaultStation is given, e.g. in tests).
export function ActivePlaceProvider({
  defaultStation,
  children,
}: {
  defaultStation?: Station;
  children: ReactNode;
}) {
  const { settings } = useSettings();
  const target = defaultStation
    ? defaultPlace(settings.loc, defaultStation)
    : LOCATION_PLACE;
  const [active, setActive] = useState<ActivePlace>(() => target);
  useEffect(() => {
    setActive(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset default on loc change, not on the fresh `target` object each render
  }, [settings.loc, defaultStation]);
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
