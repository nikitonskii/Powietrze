import {
  findPm25SensorId,
  parseLatestPm25,
  findSensorId,
  parseSeries,
  parseLatestValue,
} from '../mappers';
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

  test('AC-5: findSensorId by code', () => {
    expect(findSensorId(sensors, 'PM2.5')).toBe(2752);
    expect(findSensorId(sensors, 'PM10')).toBe(2750);
    expect(findSensorId(sensors, 'NO2')).toBe(2747);
    expect(findSensorId(sensors, 'O3')).toBeNull();
  });

  test('AC-4: parseSeries maps at/value, null Wartość → null', () => {
    const s = parseSeries(getData);
    expect(s[0]).toEqual({ at: '2026-08-11 21:00:00', value: 5.0 });
    expect(
      parseSeries({
        'Lista danych pomiarowych': [{ Data: 'x', Wartość: null }],
      }),
    ).toEqual([{ at: 'x', value: null }]);
  });

  test('AC-5: parseLatestValue = newest non-null by at, order-independent', () => {
    expect(parseLatestValue(getData)).toBe(5.0);
    const shuffled = {
      'Lista danych pomiarowych': [
        { Data: '2026-08-11 05:00:00', Wartość: 8.7 },
        { Data: '2026-08-11 21:00:00', Wartość: 5 },
        { Data: '2026-08-11 20:00:00', Wartość: null },
      ],
    };
    expect(parseLatestValue(shuffled)).toBe(5);
    expect(
      parseLatestValue({
        'Lista danych pomiarowych': [{ Data: 'x', Wartość: null }],
      }),
    ).toBeUndefined();
  });
});
