import realStations from '../../geo/__fixtures__/stations.json';
import {
  searchStations,
  addFavorite,
  removeFavorite,
  hasFavorite,
  moveItem,
  MAX_RESULTS,
} from '../index';
import type { Station } from '../../geo';

// `any`: untyped GIOŚ fixture JSON, read positionally only in this test setup.
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

test('AC 008-1: moveItem moves an item and is a no-op (same ref) on no-op/OOB', () => {
  expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  expect(moveItem(['a', 'b', 'c'], 1, 2)).toEqual(['a', 'c', 'b']);
  const l = ['a', 'b', 'c'];
  expect(moveItem(l, 1, 1)).toBe(l); // no-op → same reference
  expect(moveItem(l, -1, 0)).toBe(l); // OOB from<0
  expect(moveItem(l, 3, 0)).toBe(l); // OOB from>=length
  expect(moveItem(l, 0, -1)).toBe(l); // OOB to<0
  expect(moveItem(l, 0, 3)).toBe(l); // OOB to>=length
});
