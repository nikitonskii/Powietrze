import realStations from '../../../core/geo/__fixtures__/stations.json';
import garbage from '../__fixtures__/stationsWithGarbage.json';
import { parseStations } from '../stations';
import { nearestStation } from '../../../core/geo';

test('AC 005-4: parseStations maps GIOŚ findAll to Station[]', () => {
  const out = parseStations(realStations);
  expect(out[0]).toEqual({
    id: 400,
    name: 'Kraków, Aleja Krasińskiego',
    city: 'Kraków',
    lat: 50.057678,
    lon: 19.926189,
  });
  expect(out).toHaveLength(4);
});

test('AC 005-4b: parseStations drops entries with invalid coords; they never win nearest', () => {
  const out = parseStations(garbage);
  expect(out.map(s => s.id)).toEqual([530]); // station 999 (empty φ) dropped
  // and the dropped station cannot be returned as "nearest":
  expect(nearestStation(52.2, 21.0, out).id).toBe(530);
});
