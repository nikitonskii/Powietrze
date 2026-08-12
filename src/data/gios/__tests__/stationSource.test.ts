import realStations from '../../../core/geo/__fixtures__/stations.json';
import sensors from '../__fixtures__/sensors400.json';
import getData from '../__fixtures__/getData2752.json';
import { createStationSource } from '../source';
import type { Station } from '../../../core/geo';

// `any`: untyped GIOŚ fixture JSON, read positionally only in this test setup.
const warsaw: Station = (realStations as any)['Lista stacji pomiarowych']
  .map((e: any) => ({
    id: e['Identyfikator stacji'],
    name: e['Nazwa stacji'],
    city: e['Nazwa miasta'],
    lat: 0,
    lon: 0,
  }))
  .find((s: Station) => s.id === 530);

test('AC 006-3: createStationSource resolves a Reading for the given station', async () => {
  const calls: string[] = [];
  const fakeFetch = ((url: string) => {
    calls.push(url);
    const body = url.includes('/station/sensors/') ? sensors : getData;
    return Promise.resolve({ json: () => Promise.resolve(body) });
  }) as unknown as typeof fetch;

  const reading = await createStationSource(
    warsaw,
    fakeFetch,
  ).getCurrentReading();
  expect(reading).toEqual({
    index: 5,
    pm25: 5.0,
    measuredAt: '2026-08-11 21:00:00',
    city: 'Warszawa',
    station: 'Al. Niepodległości · stacja GIOŚ',
  });
  expect(calls[0]).toContain('/station/sensors/530');
  expect(calls[1]).toContain('/data/getData/2752');
});
