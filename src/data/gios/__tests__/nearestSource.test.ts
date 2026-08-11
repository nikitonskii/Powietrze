import realStations from '../../../core/geo/__fixtures__/stations.json';
import sensors from '../__fixtures__/sensors400.json';
import getData from '../__fixtures__/getData2752.json';
import { createNearestStationSource } from '../source';
import type { Geolocation } from '../../../core/geo';

const warsaw: Geolocation = {
  getCurrentPosition: async () => ({ lat: 52.22, lon: 21.0 }),
};

function makeFetch(override?: (url: string) => boolean) {
  const calls: string[] = [];
  const fetchImpl = ((url: string) => {
    calls.push(url);
    if (override?.(url)) return Promise.reject(new Error('boom'));
    const body = url.includes('/station/findAll')
      ? realStations
      : url.includes('/station/sensors/')
      ? sensors
      : getData;
    return Promise.resolve({ json: () => Promise.resolve(body) });
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

const KRAKOW_READING = {
  index: 5,
  pm25: 5.0,
  measuredAt: '2026-08-11 21:00:00',
  city: 'Kraków',
  station: 'Aleja Krasińskiego · stacja GIOŚ',
};

test('AC 005-5: resolves the nearest station (Warszawa 530) with its identity', async () => {
  const { fetchImpl, calls } = makeFetch();
  const reading = await createNearestStationSource(
    warsaw,
    fetchImpl,
  ).getCurrentReading();
  expect(reading).toEqual({
    index: 5,
    pm25: 5.0,
    measuredAt: '2026-08-11 21:00:00',
    city: 'Warszawa',
    station: 'Al. Niepodległości · stacja GIOŚ',
  });
  expect(calls[0]).toContain('/station/findAll');
  // findAll is paginated (20/page); must request a large page or nearest is wrong.
  expect(calls[0]).toMatch(/size=\d{3,}/);
  expect(calls[1]).toContain('/station/sensors/530');
  expect(calls[2]).toContain('/data/getData/2752');
});

test('AC 005-6a: geo reject → Kraków fallback, findAll never called', async () => {
  const { fetchImpl, calls } = makeFetch();
  const denied: Geolocation = {
    getCurrentPosition: async () => {
      throw new Error('permission denied');
    },
  };
  const reading = await createNearestStationSource(
    denied,
    fetchImpl,
  ).getCurrentReading();
  expect(reading).toEqual(KRAKOW_READING);
  expect(calls.some(u => u.includes('/station/findAll'))).toBe(false);
});

test('AC 005-6b: nearest reading fetch throws → Kraków fallback', async () => {
  const { fetchImpl } = makeFetch();
  let hit = 0;
  const guarded = ((url: string) => {
    if (url.includes('/data/getData/') && hit++ === 0)
      return Promise.reject(new Error('boom'));
    // `any`: fetchImpl is the fake typed as `fetch`; call it with the raw url string.
    return (fetchImpl as any)(url);
  }) as unknown as typeof fetch;
  const reading = await createNearestStationSource(
    warsaw,
    guarded,
  ).getCurrentReading();
  expect(reading).toEqual(KRAKOW_READING);
});

test('AC 005-6c: stations findAll throws → Kraków fallback', async () => {
  const { fetchImpl } = makeFetch(url => url.includes('/station/findAll'));
  const reading = await createNearestStationSource(
    warsaw,
    fetchImpl,
  ).getCurrentReading();
  expect(reading).toEqual(KRAKOW_READING);
});
