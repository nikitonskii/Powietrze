import { createStationSource, createNearestStationSource } from '../source';
import { KRAKOW_STATION } from '../constants';
import sensors400 from '../__fixtures__/sensors400.json';
import sensorsNoNo2 from '../__fixtures__/sensors400_noNo2.json';
import sensorsAll6 from '../__fixtures__/sensors_all6.json';
import pm25_26 from '../__fixtures__/getData_pm25_26.json';
import pm10 from '../__fixtures__/getData_pm10.json';
import no2 from '../__fixtures__/getData_no2.json';
import co from '../__fixtures__/getData_co.json';
import c6h6 from '../__fixtures__/getData_c6h6.json';
import o3 from '../__fixtures__/getData_o3.json';
import so2 from '../__fixtures__/getData_so2.json';
import allnull from '../__fixtures__/getData_allnull.json';
import realStations from '../../../core/geo/__fixtures__/stations.json';
import type { Geolocation } from '../../../core/geo';

// Routes fetchImpl calls to fixtures by URL substring. `rejectContaining`
// substrings make the fetch call itself reject (simulating a network/HTTP
// failure), independent of the successful routes.
function makeFetch(
  routes: Record<string, object>,
  rejectContaining: string[] = [],
): { fetchImpl: typeof fetch; calls: string[] } {
  const calls: string[] = [];
  const fetchImpl = ((url: string) => {
    calls.push(url);
    if (rejectContaining.some(s => url.includes(s))) {
      return Promise.reject(new Error(`boom: ${url}`));
    }
    const key = Object.keys(routes).find(k => url.includes(k));
    if (!key) return Promise.reject(new Error(`no route stubbed: ${url}`));
    return Promise.resolve({ json: () => Promise.resolve(routes[key]) });
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

// Station 400 as fixtured: PM10 + NO2 + CO + C6H6 (no O3/SO2 sensors).
const KRAKOW_ROUTES = {
  '/station/sensors/400': sensors400,
  '/data/getData/2752': pm25_26,
  '/data/getData/2750': pm10,
  '/data/getData/2747': no2,
  '/data/getData/2745': co,
  '/data/getData/16500': c6h6,
};

describe('AC-3a: detailFor resolves pollutants in catalog order (no O3/SO2 sensors)', () => {
  test('PM10+NO2+CO+C6H6 station → pollutants is exactly [PM10,NO2,CO,C6H6] in order, history from PM2.5', async () => {
    const { fetchImpl, calls } = makeFetch(KRAKOW_ROUTES);
    const detail = await createStationSource(KRAKOW_STATION, fetchImpl)
      .getDetail!();

    expect(detail.history.length).toBe(24);
    expect(detail.history[0].at).toBe('2026-08-11 23:00:00'); // oldest
    expect(detail.history[23].at).toBe('2026-08-12 22:00:00'); // newest

    expect(detail.pollutants).toEqual([
      { code: 'PM10', value: 30 },
      { code: 'NO2', value: 22 },
      { code: 'CO', value: 350 },
      { code: 'C6H6', value: 0.35 },
    ]);

    const pm25Call = calls.find(u => u.includes('/data/getData/2752'));
    expect(pm25Call).toContain('size=100');
  });

  test('missing NO2 sensor → NO2 omitted, PM10/CO/C6H6 still present in order', async () => {
    const { fetchImpl } = makeFetch({
      '/station/sensors/400': sensorsNoNo2,
      '/data/getData/2752': pm25_26,
      '/data/getData/2750': pm10,
      '/data/getData/2745': co,
      '/data/getData/16500': c6h6,
    });
    const detail = await createStationSource(KRAKOW_STATION, fetchImpl)
      .getDetail!();

    expect(detail.pollutants).toEqual([
      { code: 'PM10', value: 30 },
      { code: 'CO', value: 350 },
      { code: 'C6H6', value: 0.35 },
    ]);
    expect(detail.history.length).toBe(24);
  });
});

describe('AC-3b: detailFor resolves all six pollutants in catalog order', () => {
  test('station exposing all six sensors → pollutants equals [PM10,NO2,O3,SO2,CO,C6H6]', async () => {
    const { fetchImpl } = makeFetch({
      '/station/sensors/400': sensorsAll6,
      '/data/getData/2752': pm25_26,
      '/data/getData/2750': pm10,
      '/data/getData/2747': no2,
      '/data/getData/2749': o3,
      '/data/getData/2751': so2,
      '/data/getData/2745': co,
      '/data/getData/16500': c6h6,
    });
    const detail = await createStationSource(KRAKOW_STATION, fetchImpl)
      .getDetail!();

    expect(detail.pollutants).toEqual([
      { code: 'PM10', value: 30 },
      { code: 'NO2', value: 22 },
      { code: 'O3', value: 45 },
      { code: 'SO2', value: 8.5 },
      { code: 'CO', value: 350 },
      { code: 'C6H6', value: 0.35 },
    ]);
  });
});

describe('AC-3c: a present sensor with all-null getData is omitted (finite filter, not merely settled)', () => {
  test('CO sensor present but getData returns no non-null readings → CO omitted, others present', async () => {
    const { fetchImpl } = makeFetch({
      '/station/sensors/400': sensors400,
      '/data/getData/2752': pm25_26,
      '/data/getData/2750': pm10,
      '/data/getData/2747': no2,
      '/data/getData/2745': allnull, // CO sensor id, all-null series
      '/data/getData/16500': c6h6,
    });
    const detail = await createStationSource(KRAKOW_STATION, fetchImpl)
      .getDetail!();

    expect(detail.pollutants).toEqual([
      { code: 'PM10', value: 30 },
      { code: 'NO2', value: 22 },
      { code: 'C6H6', value: 0.35 },
    ]);
  });
});

describe('AC-3 (regression: failure isolation) — getDetail never rejects', () => {
  test('NO2 fetch rejects → NO2 omitted, other pollutants + history present', async () => {
    const { fetchImpl } = makeFetch(KRAKOW_ROUTES, ['/data/getData/2747']);
    const source = createStationSource(KRAKOW_STATION, fetchImpl);
    const detail = await source.getDetail!();
    expect(detail.pollutants).toEqual([
      { code: 'PM10', value: 30 },
      { code: 'CO', value: 350 },
      { code: 'C6H6', value: 0.35 },
    ]);
    expect(detail.history.length).toBe(24);
  });

  test('PM2.5 fetch rejects → history: [], pollutants still present', async () => {
    const { fetchImpl } = makeFetch(KRAKOW_ROUTES, ['/data/getData/2752']);
    const source = createStationSource(KRAKOW_STATION, fetchImpl);
    const detail = await source.getDetail!();
    expect(detail.history).toEqual([]);
    expect(detail.pollutants).toEqual([
      { code: 'PM10', value: 30 },
      { code: 'NO2', value: 22 },
      { code: 'CO', value: 350 },
      { code: 'C6H6', value: 0.35 },
    ]);
  });
});

describe('AC-6c: nearest source location fallback shares the resolved station', () => {
  test('geo rejects → Kraków fallback station used by both getDetail and getCurrentReading', async () => {
    const { fetchImpl } = makeFetch(KRAKOW_ROUTES);
    const getCurrentPosition = jest.fn(async () => {
      throw new Error('permission denied');
    });
    const denied: Geolocation = { getCurrentPosition };

    const source = createNearestStationSource(denied, fetchImpl);
    const detail = await source.getDetail!();
    expect(detail.history.length).toBe(24);

    const reading = await source.getCurrentReading();
    expect(reading.city).toBe('Kraków');
    expect(reading.station).toBe('Aleja Krasińskiego · stacja GIOŚ');

    // Station resolution (geo call) is memoized/shared across getDetail + getCurrentReading.
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  test('geo succeeds → nearest station resolution shared across getDetail and getCurrentReading', async () => {
    const { fetchImpl, calls } = makeFetch({
      '/station/findAll': realStations,
      '/station/sensors/530': sensors400,
      '/data/getData/2752': pm25_26,
      '/data/getData/2750': pm10,
      '/data/getData/2747': no2,
      '/data/getData/2745': co,
      '/data/getData/16500': c6h6,
    });
    const getCurrentPosition = jest.fn(async () => ({ lat: 52.22, lon: 21.0 }));
    const warsaw: Geolocation = { getCurrentPosition };

    const source = createNearestStationSource(warsaw, fetchImpl);
    const detail = await source.getDetail!();
    expect(detail.history.length).toBe(24);

    const reading = await source.getCurrentReading();
    expect(reading.city).toBe('Warszawa');

    // Station resolution (geo + fetchStations) is memoized/shared, not
    // re-run for each of getDetail/getCurrentReading.
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(calls.filter(u => u.includes('/station/findAll')).length).toBe(1);
  });

  test('geo succeeds but the nearest station has no usable reading → BOTH reading and detail fall back to Kraków (consistent, not empty)', async () => {
    // Warszawa (530) is nearest, but reading it fails (its sensors call rejects);
    // Kraków (400) is healthy. Regression guard: getDetail must fall back with
    // getCurrentReading, never render the empty (unreadable) nearest station.
    const { fetchImpl } = makeFetch(
      {
        '/station/findAll': realStations,
        '/station/sensors/400': sensors400,
        '/data/getData/2752': pm25_26,
        '/data/getData/2750': pm10,
        '/data/getData/2747': no2,
        '/data/getData/2745': co,
        '/data/getData/16500': c6h6,
      },
      ['/station/sensors/530'], // reading the nearest (Warszawa) station fails
    );
    const getCurrentPosition = jest.fn(async () => ({ lat: 52.22, lon: 21.0 }));
    const source = createNearestStationSource(
      { getCurrentPosition },
      fetchImpl,
    );

    const reading = await source.getCurrentReading();
    const detail = await source.getDetail!();

    expect(reading.city).toBe('Kraków'); // hero fell back to Kraków
    expect(detail.history.length).toBe(24); // detail followed — NOT empty
    expect(detail.pollutants).toEqual([
      { code: 'PM10', value: 30 },
      { code: 'NO2', value: 22 },
      { code: 'CO', value: 350 },
      { code: 'C6H6', value: 0.35 },
    ]);
  });
});
