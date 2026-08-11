import stationsFixture from '../__fixtures__/stations.json';
import {
  distanceKm,
  nearestStation,
  stationLabel,
  type Station,
} from '../index';

// The fixture is GIOŚ's raw JSON-LD shape; map it to Station[] for these tests.
const S: Station[] = (stationsFixture as any)['Lista stacji pomiarowych'].map(
  (e: any) => ({
    id: e['Identyfikator stacji'],
    name: e['Nazwa stacji'],
    city: e['Nazwa miasta'],
    lat: Number(e['WGS84 φ N']),
    lon: Number(e['WGS84 λ E']),
  }),
);

test('AC 005-1: distanceKm is haversine (self=0, Kraków↔Warszawa≈252km)', () => {
  expect(distanceKm(50.057678, 19.926189, 50.057678, 19.926189)).toBe(0);
  expect(distanceKm(50.057678, 19.926189, 52.219298, 21.004724)).toBeCloseTo(
    252,
    -1,
  );
});

test('AC 005-2: nearestStation minimizes distanceKm against the fixture', () => {
  expect(nearestStation(50.06, 19.94, S).id).toBe(400); // Kraków
  expect(nearestStation(52.22, 21.0, S).id).toBe(530); // Warszawa
  expect(nearestStation(54.4, 18.61, S).id).toBe(706); // Gdańsk
  expect(() => nearestStation(52, 21, [])).toThrow();
});

test('AC 005-3: stationLabel strips "<city>, " and adds the GIOŚ suffix', () => {
  expect(
    stationLabel({
      id: 400,
      name: 'Kraków, Aleja Krasińskiego',
      city: 'Kraków',
      lat: 0,
      lon: 0,
    }),
  ).toBe('Aleja Krasińskiego · stacja GIOŚ');
  // No-prefix case: 30 live stations have name === city (e.g. "Czerniawa").
  expect(
    stationLabel({
      id: 1,
      name: 'Czerniawa',
      city: 'Czerniawa',
      lat: 0,
      lon: 0,
    }),
  ).toBe('Czerniawa · stacja GIOŚ');
});
