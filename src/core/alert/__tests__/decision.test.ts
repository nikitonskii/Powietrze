import { isQuietHour, smogAlertDecision } from '..';

// AC-1: isQuietHour boundaries (local hour >= 22 || < 7), frozen Dates.
test('AC-1: isQuietHour — true at 22:00, 23:30, 00:00, 06:59; false at 07:00, 12:00, 21:59', () => {
  const at = (h: number, m: number) => new Date(2026, 7, 16, h, m, 0, 0);

  expect(isQuietHour(at(22, 0))).toBe(true);
  expect(isQuietHour(at(23, 30))).toBe(true);
  expect(isQuietHour(at(0, 0))).toBe(true);
  expect(isQuietHour(at(6, 59))).toBe(true);

  expect(isQuietHour(at(7, 0))).toBe(false);
  expect(isQuietHour(at(12, 0))).toBe(false);
  expect(isQuietHour(at(21, 59))).toBe(false);
});

// AC-2: smogAlertDecision table — precedence off → quiet → normal.
describe('AC-2: smogAlertDecision', () => {
  const noon = new Date(2026, 7, 16, 12, 0, 0, 0);
  const quiet = new Date(2026, 7, 16, 23, 0, 0, 0);

  test('rising edge (prev false, index >= threshold, alert on, not quiet) fires and sets wasAbove', () => {
    const result = smogAlertDecision(
      { wasAbove: false },
      { index: 120, threshold: 100, alertOn: true, now: noon },
    );
    expect(result).toEqual({ fire: true, wasAbove: true });
  });

  test('staying above (prev true) does not re-fire', () => {
    const result = smogAlertDecision(
      { wasAbove: true },
      { index: 130, threshold: 100, alertOn: true, now: noon },
    );
    expect(result).toEqual({ fire: false, wasAbove: true });
  });

  test('dropping below resets wasAbove without firing', () => {
    const result = smogAlertDecision(
      { wasAbove: true },
      { index: 80, threshold: 100, alertOn: true, now: noon },
    );
    expect(result).toEqual({ fire: false, wasAbove: false });
  });

  test('re-crossing after a drop fires again', () => {
    const dropped = smogAlertDecision(
      { wasAbove: true },
      { index: 80, threshold: 100, alertOn: true, now: noon },
    );
    const recrossed = smogAlertDecision(dropped, {
      index: 120,
      threshold: 100,
      alertOn: true,
      now: noon,
    });
    expect(recrossed).toEqual({ fire: true, wasAbove: true });
  });

  test('alert off never fires, regardless of index, and resets wasAbove', () => {
    const result = smogAlertDecision(
      { wasAbove: true },
      { index: 999, threshold: 100, alertOn: false, now: noon },
    );
    expect(result).toEqual({ fire: false, wasAbove: false });
  });

  test('quiet + above suppresses and freezes prev.wasAbove', () => {
    const result = smogAlertDecision(
      { wasAbove: true },
      { index: 999, threshold: 100, alertOn: true, now: quiet },
    );
    expect(result).toEqual({ fire: false, wasAbove: true });

    const resultFromBelow = smogAlertDecision(
      { wasAbove: false },
      { index: 999, threshold: 100, alertOn: true, now: quiet },
    );
    expect(resultFromBelow).toEqual({ fire: false, wasAbove: false });
  });

  test('index === threshold counts as above', () => {
    const result = smogAlertDecision(
      { wasAbove: false },
      { index: 100, threshold: 100, alertOn: true, now: noon },
    );
    expect(result).toEqual({ fire: true, wasAbove: true });
  });
});

// AC-2b: composed — a crossing that begins during quiet hours fires exactly
// once, on the first non-quiet evaluation, threading `wasAbove` through.
test('AC-2b: crossing that begins during quiet hours fires once when quiet ends', () => {
  const duringQuiet = new Date(2026, 7, 16, 23, 0, 0, 0);
  const afterQuiet = new Date(2026, 7, 17, 7, 0, 0, 0);

  // Below threshold, quiet hours: no fire, not above.
  const step1 = smogAlertDecision(
    { wasAbove: false },
    { index: 80, threshold: 100, alertOn: true, now: duringQuiet },
  );
  expect(step1).toEqual({ fire: false, wasAbove: false });

  // Crosses above threshold, still quiet: suppressed and FROZEN at prev (false).
  const step2 = smogAlertDecision(step1, {
    index: 150,
    threshold: 100,
    alertOn: true,
    now: duringQuiet,
  });
  expect(step2).toEqual({ fire: false, wasAbove: false });

  // Quiet ends, still above threshold: fires exactly once now.
  const step3 = smogAlertDecision(step2, {
    index: 150,
    threshold: 100,
    alertOn: true,
    now: afterQuiet,
  });
  expect(step3).toEqual({ fire: true, wasAbove: true });

  // Next ready reading, still above, non-quiet: does not re-fire.
  const step4 = smogAlertDecision(step3, {
    index: 150,
    threshold: 100,
    alertOn: true,
    now: afterQuiet,
  });
  expect(step4).toEqual({ fire: false, wasAbove: true });
});
