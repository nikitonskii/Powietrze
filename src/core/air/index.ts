export interface Reading {
  index: number;
  pm25: number;
  measuredAt: string;
  city: string;
  station: string;
}

export interface AirQualitySource {
  getCurrentReading(): Promise<Reading>;
}

export const PM25_INDEX_DIVISOR = 1.03;

export function indexFromPm25(pm25: number): number {
  return Math.round(pm25 / PM25_INDEX_DIVISOR);
}

// Relative freshness label. `now` is injected for testability. `measuredAt`
// ("YYYY-MM-DD HH:mm:ss") is treated as device-local time — the app is
// Poland-only and GIOŚ timestamps are Europe/Warsaw local.
export function formatFreshness(measuredAt: string, now: Date): string {
  const then = new Date(measuredAt.replace(' ', 'T'));
  const mins = Math.floor((now.getTime() - then.getTime()) / 60000);
  if (mins < 1) return 'przed chwilą';
  if (mins < 60) return `${mins} min temu`;
  return `${Math.floor(mins / 60)} godz temu`;
}

export * from './history';
