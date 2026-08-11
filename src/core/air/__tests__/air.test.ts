import { indexFromPm25, formatFreshness, PM25_INDEX_DIVISOR } from '../index';

describe('air derivation', () => {
  test('AC-1: indexFromPm25 = round(pm25 / 1.03)', () => {
    expect(indexFromPm25(5)).toBe(5);
    expect(indexFromPm25(122)).toBe(118);
    expect(indexFromPm25(180)).toBe(175);
    expect(indexFromPm25(0)).toBe(0);
  });

  test('AC-2: PM25_INDEX_DIVISOR literal', () => {
    expect(PM25_INDEX_DIVISOR).toBe(1.03);
  });

  test('AC-3: formatFreshness relative label', () => {
    const at = '2026-08-11 21:00:00';
    expect(formatFreshness(at, new Date('2026-08-11T21:12:00'))).toBe(
      '12 min temu',
    );
    expect(formatFreshness(at, new Date('2026-08-11T21:00:30'))).toBe(
      'przed chwilą',
    );
    expect(formatFreshness(at, new Date('2026-08-11T23:30:00'))).toBe(
      '2 godz temu',
    );
  });
});
