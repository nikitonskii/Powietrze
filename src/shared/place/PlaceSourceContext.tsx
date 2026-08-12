import { createContext, useContext, type ReactNode } from 'react';
import type { AirQualitySource } from '../../core/air';
import type { ActivePlace } from '../../core/places';
import type { Station } from '../../core/geo';

export type SourceForPlace = (place: ActivePlace) => AirQualitySource;

const Ctx = createContext<SourceForPlace | null>(null);

export function PlaceSourceProvider({
  sourceForPlace,
  children,
}: {
  sourceForPlace: SourceForPlace;
  children: ReactNode;
}) {
  return <Ctx.Provider value={sourceForPlace}>{children}</Ctx.Provider>;
}

export function useSourceForPlace(): SourceForPlace {
  const v = useContext(Ctx);
  if (!v)
    throw new Error(
      'useSourceForPlace: wrap the tree in <PlaceSourceProvider>',
    );
  return v;
}

// The full station list for search — fetched once by App.tsx and injected here,
// so features never call the data layer directly.
const StationsCtx = createContext<Station[]>([]);

export function StationsProvider({
  stations,
  children,
}: {
  stations: Station[];
  children: ReactNode;
}) {
  return (
    <StationsCtx.Provider value={stations}>{children}</StationsCtx.Provider>
  );
}

export function useStations(): Station[] {
  return useContext(StationsCtx);
}
