import type {
  AirQualitySource,
  PollutantReading,
  Reading,
  ReadingDetail,
} from '../../core/air';
import { buildHistory, indexFromPm25, POLLUTANTS } from '../../core/air';
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

async function getLatest(
  id: number,
  fetchImpl: typeof fetch,
): Promise<number | undefined> {
  return parseLatestValue(
    await (await fetchImpl(`${GIOS_BASE}/data/getData/${id}`)).json(),
  );
}

// Resolves every catalog pollutant the station reports a finite latest value
// for, preserving POLLUTANTS order. Absent sensor → skipped (no fetch). All
// fetches run via Promise.allSettled; a settled result is KEPT only if
// Number.isFinite(value) — parseLatestValue returns `undefined` for an
// all-null sensor, which settles FULFILLED (not rejected), so the finite
// check (not just status==='fulfilled') is what filters it out.
// `any`: sensorsJson is untyped GIOŚ JSON, the same boundary findSensorId
// already narrows in mappers.ts — no new boundary introduced here.
async function resolvePollutants(
  sensorsJson: any,
  fetchImpl: typeof fetch,
): Promise<PollutantReading[]> {
  const settled = await Promise.allSettled(
    POLLUTANTS.map(async ({ code }): Promise<PollutantReading> => {
      const id = findSensorId(sensorsJson, code);
      if (id == null) throw new Error(`no ${code} sensor`);
      const value = await getLatest(id, fetchImpl);
      return { code, value: value ?? NaN };
    }),
  );
  return settled
    .filter(
      (r): r is PromiseFulfilledResult<PollutantReading> =>
        r.status === 'fulfilled' && Number.isFinite(r.value.value),
    )
    .map(r => r.value);
}

// Builds a ReadingDetail for one Station: 24h PM2.5 history plus the
// catalog-ordered pollutant readings. history and pollutants are resolved
// independently via Promise.allSettled so one missing/failed fetch never
// fails the whole detail — it just leaves that field empty.
async function detailFor(
  station: Station,
  fetchImpl: typeof fetch,
): Promise<ReadingDetail> {
  const sensors = await (
    await fetchImpl(`${GIOS_BASE}/station/sensors/${station.id}`)
  ).json();
  const pm25Id = findSensorId(sensors, 'PM2.5');

  const getSeries = async (id: number) =>
    buildHistory(
      parseSeries(
        await (
          await fetchImpl(`${GIOS_BASE}/data/getData/${id}?size=100`)
        ).json(),
      ),
    );

  const [history, pollutants] = await Promise.allSettled([
    pm25Id != null ? getSeries(pm25Id) : Promise.reject(new Error('no pm2.5')),
    resolvePollutants(sensors, fetchImpl),
  ]);

  return {
    history: history.status === 'fulfilled' ? history.value : [],
    pollutants: pollutants.status === 'fulfilled' ? pollutants.value : [],
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
  // Resolve+validate ONCE: geo → nearest → read it. On ANY failure (denied,
  // geo/stations error, OR the nearest station has no usable reading) fall back
  // to Kraków — station AND reading together. Memoized so getCurrentReading and
  // getDetail share the SAME committed station (and the fallback), so the Hero
  // and the chart/tiles can never show different stations. The probe reading is
  // cached, so getCurrentReading needs no second fetch.
  let resolvedP: Promise<{ station: Station; reading: Reading }> | null = null;
  const resolve = () => {
    if (!resolvedP) {
      resolvedP = (async () => {
        try {
          const { lat, lon } = await geo.getCurrentPosition();
          const stations = await fetchStations(fetchImpl);
          const station = nearestStation(lat, lon, stations);
          return { station, reading: await readStation(station, fetchImpl) };
        } catch (e) {
          if (__DEV__) {
            console.warn('[nearest] falling back to Kraków:', e);
          }
          return {
            station: KRAKOW_STATION,
            reading: await readStation(KRAKOW_STATION, fetchImpl),
          };
        }
      })();
    }
    return resolvedP;
  };

  return {
    getCurrentReading: async () => (await resolve()).reading,
    getDetail: async () => detailFor((await resolve()).station, fetchImpl),
  };
}
