import {
  buildHistory,
  historyBarOpacity,
  barHeights,
  indexRange,
  type HourPoint,
} from '../history';
import { indexFromPm25 } from '..';

const hp = (indices: number[]): HourPoint[] =>
  indices.map((index, i) => ({ at: `h${i}`, pm25: index, index }));

test('AC-1: buildHistory drops nulls, keeps negatives, caps 24, oldest→newest', () => {
  const pts = Array.from({ length: 30 }, (_, i) => ({
    at: `2026-08-11 ${String(i % 24).padStart(2, '0')}:00:00`,
    value: i,
  }));
  const h = buildHistory(pts);
  expect(h).toHaveLength(24);
  expect(h[0].at <= h[h.length - 1].at).toBe(true);
  expect(
    buildHistory([
      { at: 'a', value: null },
      { at: 'b', value: 5 },
    ]),
  ).toEqual([{ at: 'b', pm25: 5, index: indexFromPm25(5) }]);
  expect(buildHistory([{ at: 'x', value: -3 }])).toEqual([
    { at: 'x', pm25: -3, index: indexFromPm25(-3) },
  ]);
  expect(buildHistory([{ at: 'x', value: null }])).toEqual([]);
  expect(
    buildHistory(
      [
        { at: 'a', value: 1 },
        { at: 'b', value: 2 },
        { at: 'c', value: 3 },
      ],
      2,
    ).map(p => p.pm25),
  ).toEqual([2, 3]);
});

test('AC-2: historyBarOpacity ramps 0.55→1.0, count<=1 → 1.0', () => {
  expect(historyBarOpacity(0, 24)).toBe(0.55);
  expect(historyBarOpacity(23, 24)).toBe(1);
  expect(historyBarOpacity(0, 1)).toBe(1);
  expect(historyBarOpacity(1, 3)).toBeCloseTo(0.55 + 0.45 * 0.5, 10);
});

test('AC-3: barHeights normalizes the window to [floor,100], min→floor max→100', () => {
  // A low, flat-looking real Kraków window still spreads across the track.
  expect(barHeights(hp([8, 10, 12, 9]))).toEqual([22, 61, 100, 42]);
  // Extremes map to the endpoints exactly.
  const h = barHeights(hp([0, 50, 100]));
  expect(h[0]).toBe(22);
  expect(h[2]).toBe(100);
  // Flat window (no variation) → neutral mid-height, never NaN.
  expect(barHeights(hp([15, 15, 15]))).toEqual([60, 60, 60]);
  // Empty → [].
  expect(barHeights([])).toEqual([]);
});

test('AC-3: indexRange returns min/max index over the window', () => {
  expect(indexRange(hp([8, 12, 9, 14, 10]))).toEqual({ min: 8, max: 14 });
});
