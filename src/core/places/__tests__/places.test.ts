import realStations from '../../geo/__fixtures__/stations.json';
import {
  searchStations,
  addFavorite,
  removeFavorite,
  hasFavorite,
  MAX_RESULTS,
} from '../index';
import type { Station } from '../../geo';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped fixture JSON
const S: Station[] = (realStations as any)['Lista stacji pomiarowych'].map(
  (e: any) => ({
    id: e['Identyfikator stacji'],
    name: e['Nazwa stacji'],
    city: e['Nazwa miasta'],
    lat: Number(e['WGS84 φ N']),
    lon: Number(e['WGS84 λ E']),
  }),
);

const k = S.find(s => s.id === 400)!; // Kraków
const w = S.find(s => s.id === 530)!; // Warszawa

test('AC 006-1: searchStations folds diacritics/case, keeps input order, caps at 30', () => {
  expect(searchStations(S, 'wroclaw').map(s => s.id)).toEqual([114]); // ł-fold
  expect(searchStations(S, 'KRAK').map(s => s.id)).toEqual([400]); // ó-fold + case
  expect(searchStations(S, 'k').map(s => s.id)).toEqual([400, 706]); // multi-match, order
  expect(searchStations(S, '')).toEqual([]);
  expect(searchStations(S, '   ')).toEqual([]);
  expect(searchStations(S, 'zzzz')).toEqual([]);
  const many: Station[] = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    name: `Testowo ${i}`,
    city: 'Testowo',
    lat: 0,
    lon: 0,
  }));
  expect(searchStations(many, 'testowo')).toHaveLength(MAX_RESULTS);
  expect(searchStations(many, 'testowo')[0].id).toBe(0); // order preserved
});

test('AC 006-2: favorites ops keyed by station id', () => {
  expect(addFavorite([], k).map(s => s.id)).toEqual([400]);
  const same = [k];
  expect(addFavorite(same, k)).toBe(same); // no-op returns the SAME array
  expect(removeFavorite([k, w], 400).map(s => s.id)).toEqual([530]);
  expect(hasFavorite([k], 400)).toBe(true);
  expect(hasFavorite([], 400)).toBe(false);
});
