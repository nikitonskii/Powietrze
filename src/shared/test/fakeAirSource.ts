import type { AirQualitySource, Reading } from '../../core/air';

export const SAMPLE_READING: Reading = {
  index: 118,
  pm25: 122,
  measuredAt: '2026-08-11 21:00:00',
  city: 'Kraków',
  station: 'Aleja Krasińskiego · stacja GIOŚ',
};

export function fakeAirSource(
  reading: Reading = SAMPLE_READING,
): AirQualitySource {
  return { getCurrentReading: () => Promise.resolve(reading) };
}

export function pendingAirSource(): AirQualitySource {
  return { getCurrentReading: () => new Promise<Reading>(() => {}) };
}
