import { createContext, ReactNode } from 'react';
import type { AirQualitySource } from '../../core/air';

const noSource: AirQualitySource = {
  getCurrentReading() {
    throw new Error('AirSourceContext: wrap the tree in <AirSourceProvider>');
  },
};

export const AirSourceContext = createContext<AirQualitySource>(noSource);

export function AirSourceProvider({
  source,
  children,
}: {
  source: AirQualitySource;
  children: ReactNode;
}) {
  return (
    <AirSourceContext.Provider value={source}>
      {children}
    </AirSourceContext.Provider>
  );
}
