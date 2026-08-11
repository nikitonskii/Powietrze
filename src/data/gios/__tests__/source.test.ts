import { createGiosSource } from '../source';
import sensors from '../__fixtures__/sensors400.json';
import getData from '../__fixtures__/getData2752.json';

test('AC-6: getCurrentReading composes a Reading and calls two URLs', async () => {
  const calls: string[] = [];
  const fakeFetch = ((url: string) => {
    calls.push(url);
    const body = url.includes('/sensors/') ? sensors : getData;
    return Promise.resolve({ json: () => Promise.resolve(body) });
  }) as unknown as typeof fetch;

  const reading = await createGiosSource(fakeFetch).getCurrentReading();

  expect(reading).toEqual({
    index: 5,
    pm25: 5.0,
    measuredAt: '2026-08-11 21:00:00',
    city: 'Kraków',
    station: 'Aleja Krasińskiego · stacja GIOŚ',
  });
  expect(calls).toEqual([
    'https://api.gios.gov.pl/pjp-api/v1/rest/station/sensors/400',
    'https://api.gios.gov.pl/pjp-api/v1/rest/data/getData/2752',
  ]);
});
