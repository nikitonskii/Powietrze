import { findPm25SensorId, parseLatestPm25 } from '../mappers';
import sensors from '../__fixtures__/sensors400.json';
import sensorsNoPm25 from '../__fixtures__/sensors_noPm25.json';
import getData from '../__fixtures__/getData2752.json';
import nullHead from '../__fixtures__/getData_nullhead.json';
import allNull from '../__fixtures__/getData_allnull.json';

describe('gios mappers', () => {
  test('AC-4: findPm25SensorId → 2752', () => {
    expect(findPm25SensorId(sensors)).toBe(2752);
  });

  test('AC-4: no PM2.5 sensor throws', () => {
    expect(() => findPm25SensorId(sensorsNoPm25)).toThrow();
  });

  test('AC-5: parseLatestPm25 → latest non-null', () => {
    expect(parseLatestPm25(getData)).toEqual({
      pm25: 5.0,
      measuredAt: '2026-08-11 21:00:00',
    });
  });

  test('AC-5: skips null-head entries', () => {
    const r = parseLatestPm25(nullHead);
    expect(typeof r.pm25).toBe('number');
    expect(r.pm25).toBe(5.7); // first two are null, third is 5.7
  });

  test('AC-5: all-null / empty throws', () => {
    expect(() => parseLatestPm25(allNull)).toThrow();
  });
});
