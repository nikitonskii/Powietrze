import { buildHistory, historyBarOpacity, barHeightPct } from '../history';
import { indexFromPm25 } from '..';

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

test('AC-3: barHeightPct clamps index/2 to [10,100]', () => {
  expect(barHeightPct(0)).toBe(10);
  expect(barHeightPct(20)).toBe(10);
  expect(barHeightPct(40)).toBe(20);
  expect(barHeightPct(200)).toBe(100);
  expect(barHeightPct(300)).toBe(100);
});
