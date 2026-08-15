import { MORNING_TIME, nextMorningTimestamp } from '..';

test('AC-1: MORNING_TIME is 07:30', () => {
  expect(MORNING_TIME).toBe('07:30');
});

test('AC-2: nextMorningTimestamp — today if before 07:30, else tomorrow (future, local)', () => {
  const at = (h: number, m: number) => new Date(2026, 7, 15, h, m, 0, 0); // local Aug 15 2026
  const today = new Date(nextMorningTimestamp(at(6, 0)));
  expect([
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    today.getHours(),
    today.getMinutes(),
    today.getSeconds(),
  ]).toEqual([2026, 7, 15, 7, 30, 0]);
  expect(nextMorningTimestamp(at(6, 0))).toBeGreaterThan(at(6, 0).getTime());

  const tmr = new Date(nextMorningTimestamp(at(8, 0)));
  expect([
    tmr.getMonth(),
    tmr.getDate(),
    tmr.getHours(),
    tmr.getMinutes(),
  ]).toEqual([7, 16, 7, 30]);

  // exactly 07:30 counts as passed → tomorrow (strict before)
  expect(new Date(nextMorningTimestamp(at(7, 30))).getDate()).toBe(16);
});
