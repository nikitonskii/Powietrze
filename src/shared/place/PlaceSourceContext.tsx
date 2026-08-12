import { createContext, useContext, type ReactNode } from 'react';
import type { AirQualitySource } from '../../core/air';
import type { ActivePlace } from '../../core/places';

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
