import { trendArrow } from '..';

test('AC-1: trendArrow thresholds — >85 ↑, <40 ↓, else → (with boundaries)', () => {
  expect(trendArrow(86)).toBe('↑');
  expect(trendArrow(85)).toBe('→');
  expect(trendArrow(40)).toBe('→');
  expect(trendArrow(39)).toBe('↓');
  expect(trendArrow(118)).toBe('↑');
  expect(trendArrow(19)).toBe('↓');
  expect(trendArrow(63)).toBe('→');
});
