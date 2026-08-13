import { createStationSource, createNearestStationSource } from '../source';
import { KRAKOW_STATION } from '../constants';
import sensors400 from '../__fixtures__/sensors400.json';
import sensorsNoNo2 from '../__fixtures__/sensors400_noNo2.json';
import pm25_26 from '../__fixtures__/getData_pm25_26.json';
import pm10 from '../__fixtures__/getData_pm10.json';
import no2 from '../__fixtures__/getData_no2.json';
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

const KRAKOW_ROUTES = {
  '/station/sensors/400': sensors400,
  '/data/getData/2752': pm25_26,
  '/data/getData/2750': pm10,
  '/data/getData/2747': no2,
};

describe('AC-6: getDetail composes history + PM10/NO2', () => {
  test('resolves history, pm10, no2 and fetches the PM2.5 series with size=100', async () => {
    const { fetchImpl, calls } = makeFetch(KRAKOW_ROUTES);
    const detail = await createStationSource(KRAKOW_STATION, fetchImpl)
      .getDetail!();

    expect(detail.history.length).toBe(24);
    expect(detail.history[0].at).toBe('2026-08-11 23:00:00'); // oldest
    expect(detail.history[23].at).toBe('2026-08-12 22:00:00'); // newest
    expect(detail.pm10).toBe(30);
    expect(detail.no2).toBe(22);

    const pm25Call = calls.find(u => u.includes('/data/getData/2752'));
    expect(pm25Call).toContain('size=100');
  });

  test('missing NO2 sensor → no2 undefined, history + pm10 still present', async () => {
    const { fetchImpl } = makeFetch({
      '/station/sensors/400': sensorsNoNo2,
      '/data/getData/2752': pm25_26,
      '/data/getData/2750': pm10,
    });
    const detail = await createStationSource(KRAKOW_STATION, fetchImpl)
      .getDetail!();

    expect(detail.no2).toBeUndefined();
    expect(detail.history.length).toBe(24);
    expect(detail.pm10).toBe(30);
  });
});

describe('AC-6b: per-pollutant failure isolation — getDetail never rejects', () => {
  test('NO2 fetch rejects → no2 undefined, history + pm10 present', async () => {
    const { fetchImpl } = makeFetch(KRAKOW_ROUTES, ['/data/getData/2747']);
    const source = createStationSource(KRAKOW_STATION, fetchImpl);
    await expect(source.getDetail!()).resolves.toEqual(
      expect.objectContaining({ no2: undefined, pm10: 30 }),
    );
    const detail = await source.getDetail!();
    expect(detail.history.length).toBe(24);
  });

  test('PM2.5 fetch rejects → history: [], pm10/no2 present', async () => {
    const { fetchImpl } = makeFetch(KRAKOW_ROUTES, ['/data/getData/2752']);
    const source = createStationSource(KRAKOW_STATION, fetchImpl);
    const detail = await source.getDetail!();
    expect(detail.history).toEqual([]);
    expect(detail.pm10).toBe(30);
    expect(detail.no2).toBe(22);
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
    expect(detail.pm10).toBe(30);
    expect(detail.no2).toBe(22);
  });
});
