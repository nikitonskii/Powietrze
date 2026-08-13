import type { AirQualitySource, Reading, ReadingDetail } from '../../core/air';
import { buildHistory, indexFromPm25 } from '../../core/air';
import {
  nearestStation,
  stationLabel,
  type Geolocation,
  type Station,
} from '../../core/geo';
import { GIOS_BASE, KRAKOW_STATION } from './constants';
import {
  findPm25SensorId,
  findSensorId,
  parseLatestPm25,
  parseLatestValue,
  parseSeries,
} from './mappers';
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

// Builds a ReadingDetail for one Station: 24h PM2.5 history plus latest
// PM10/NO2. Each pollutant is resolved independently via Promise.allSettled
// so one missing sensor or failed fetch never fails the whole detail — it
// just leaves that field empty (history: [], pm10/no2: undefined).
async function detailFor(
  station: Station,
  fetchImpl: typeof fetch,
): Promise<ReadingDetail> {
  const sensors = await (
    await fetchImpl(`${GIOS_BASE}/station/sensors/${station.id}`)
  ).json();
  const pm25Id = findSensorId(sensors, 'PM2.5');
  const pm10Id = findSensorId(sensors, 'PM10');
  const no2Id = findSensorId(sensors, 'NO2');

  const getSeries = async (id: number) =>
    buildHistory(
      parseSeries(
        await (
          await fetchImpl(`${GIOS_BASE}/data/getData/${id}?size=100`)
        ).json(),
      ),
    );
  const getLatest = async (id: number) =>
    parseLatestValue(
      await (await fetchImpl(`${GIOS_BASE}/data/getData/${id}`)).json(),
    );

  const [history, pm10, no2] = await Promise.allSettled([
    pm25Id != null ? getSeries(pm25Id) : Promise.reject(new Error('no pm2.5')),
    pm10Id != null ? getLatest(pm10Id) : Promise.reject(new Error('no pm10')),
    no2Id != null ? getLatest(no2Id) : Promise.reject(new Error('no no2')),
  ]);

  return {
    history: history.status === 'fulfilled' ? history.value : [],
    pm10: pm10.status === 'fulfilled' ? pm10.value : undefined,
    no2: no2.status === 'fulfilled' ? no2.value : undefined,
  };
}

// Kraków-only convenience source (spec 004): builds the reading for the fixed
// Kraków station. Nearest-by-location resolution goes through createNearestStationSource.
export function createGiosSource(
  fetchImpl: typeof fetch = fetch,
): AirQualitySource {
  return {
    getCurrentReading: () => readStation(KRAKOW_STATION, fetchImpl),
    getDetail: () => detailFor(KRAKOW_STATION, fetchImpl),
  };
}

// A source for one fixed Station — used by Miejsca favorites/preview. Reuses the
// same per-Station reading builder as the Kraków and nearest paths.
export function createStationSource(
  station: Station,
  fetchImpl: typeof fetch = fetch,
): AirQualitySource {
  return {
    getCurrentReading: () => readStation(station, fetchImpl),
    getDetail: () => detailFor(station, fetchImpl),
  };
}

// Resolves the station nearest the device, falling back to Kraków on ANY
// failure (permission denied, geo error, stations fetch, or reading error).
// The Kraków fallback is intentional and total; the __DEV__ log keeps a
// silent fallback debuggable (it's how the findAll-pagination bug surfaced).
//
// Station resolution is memoized (resolveStation) so getCurrentReading and
// getDetail share ONE resolved station instead of each re-running geo +
// fetchStations independently.
export function createNearestStationSource(
  geo: Geolocation,
  fetchImpl: typeof fetch = fetch,
): AirQualitySource {
  let stationP: Promise<Station> | null = null;
  const resolveStation = (): Promise<Station> => {
    if (!stationP) {
      stationP = (async () => {
        try {
          const { lat, lon } = await geo.getCurrentPosition();
          const stations = await fetchStations(fetchImpl);
          return nearestStation(lat, lon, stations);
        } catch (e) {
          if (__DEV__) {
            console.warn('[nearest] location failed; using Kraków:', e);
          }
          return KRAKOW_STATION;
        }
      })();
    }
    return stationP;
  };

  return {
    async getCurrentReading(): Promise<Reading> {
      const station = await resolveStation();
      try {
        return await readStation(station, fetchImpl);
      } catch (e) {
        if (__DEV__) {
          console.warn('[nearest] reading failed; showing Kraków:', e);
        }
        return readStation(KRAKOW_STATION, fetchImpl);
      }
    },
    getDetail: () =>
      resolveStation().then(station => detailFor(station, fetchImpl)),
  };
}
