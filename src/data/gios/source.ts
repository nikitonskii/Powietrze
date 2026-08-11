import type { AirQualitySource, Reading } from '../../core/air';
import { indexFromPm25 } from '../../core/air';
import { GIOS_BASE, KRAKOW_STATION, KRAKOW_STATION_ID } from './constants';
import { findPm25SensorId, parseLatestPm25 } from './mappers';

// Fetches GIOŚ v1 directly (ADR-009). `fetchImpl` is injected for tests.
export function createGiosSource(
  fetchImpl: typeof fetch = fetch,
  stationId: number = KRAKOW_STATION_ID,
): AirQualitySource {
  return {
    async getCurrentReading(): Promise<Reading> {
      const sensors = await (
        await fetchImpl(`${GIOS_BASE}/station/sensors/${stationId}`)
      ).json();
      const sensorId = findPm25SensorId(sensors);
      const data = await (
        await fetchImpl(`${GIOS_BASE}/data/getData/${sensorId}`)
      ).json();
      const { pm25, measuredAt } = parseLatestPm25(data);
      return {
        index: indexFromPm25(pm25),
        pm25,
        measuredAt,
        city: KRAKOW_STATION.city,
        station: KRAKOW_STATION.station,
      };
    },
  };
}
