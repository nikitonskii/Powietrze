import { bandOf } from '../band';

test.each([
  [0, 0],
  [25, 0],
  [26, 1],
  [50, 1],
  [51, 2],
  [75, 2],
  [76, 3],
  [100, 3],
  [101, 4],
  [150, 4],
  [151, 5],
  [200, 5],
] as const)('AC-7: bandOf(%i) is band %i', (v, expected) => {
  expect(bandOf(v)).toBe(expected);
});

test('AC-12: bandOf throws RangeError on non-finite input', () => {
  expect(() => bandOf(NaN)).toThrow(RangeError);
  expect(() => bandOf(-Infinity)).toThrow(RangeError);
});
