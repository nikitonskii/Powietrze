import type { AirQualitySource, Reading } from '../../core/air';
import { indexFromPm25 } from '../../core/air';
import {
  nearestStation,
  stationLabel,
  type Geolocation,
  type Station,
} from '../../core/geo';
import { GIOS_BASE, KRAKOW_STATION, KRAKOW_STATION_ID } from './constants';
import { findPm25SensorId, parseLatestPm25 } from './mappers';
import { fetchStations } from './stations';

// Builds a Reading for one Station: sensors → PM2.5 sensor → latest value.
// Shared by the Kraków path and nearest-station resolution.
async function readStation(
  station: Station,
  fetchImpl: typeof fetch,
): Promise<Reading> {
  const sensors = await (
    await fetchImpl(`${GIOS_BASE}/station/sensors/${station.id}`)
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
    city: station.city,
    station: stationLabel(station),
  };
}

// Kraków-only convenience source (spec 004). Signature kept for compatibility;
// `stationId` is retained for the 004 contract — v1 only Kraków's identity is
// known here, so nearest resolution goes through createNearestStationSource.
export function createGiosSource(
  fetchImpl: typeof fetch = fetch,
  _stationId: number = KRAKOW_STATION_ID,
): AirQualitySource {
  return { getCurrentReading: () => readStation(KRAKOW_STATION, fetchImpl) };
}

// Resolves the station nearest the device, falling back to Kraków on ANY
// failure (permission denied, geo error, stations fetch, or reading error).
export function createNearestStationSource(
  geo: Geolocation,
  fetchImpl: typeof fetch = fetch,
  _fallbackStationId: number = KRAKOW_STATION_ID,
): AirQualitySource {
  return {
    async getCurrentReading(): Promise<Reading> {
      try {
        const { lat, lon } = await geo.getCurrentPosition();
        const stations = await fetchStations(fetchImpl);
        return await readStation(nearestStation(lat, lon, stations), fetchImpl);
      } catch {
        return readStation(KRAKOW_STATION, fetchImpl);
      }
    },
  };
}
