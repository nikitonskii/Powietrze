import {
  DEFAULT_SETTINGS,
  clampThreshold,
  thresholdFromRatio,
  ratioFromThreshold,
  mergeSettings,
  THRESHOLD_MIN,
  THRESHOLD_MAX,
} from '..';

test('AC-1: DEFAULT_SETTINGS pins the design default state (literal fixture)', () => {
  expect(DEFAULT_SETTINGS).toEqual({
    loc: true,
    alert: true,
    morning: false,
    precision: 'Przybliżona',
    scale: 'CAQI',
    threshold: 100,
  });
});

test('AC-2: clampThreshold rounds and clamps, NaN→default, ±Infinity clamp', () => {
  expect(clampThreshold(10)).toBe(25);
  expect(clampThreshold(500)).toBe(200);
  expect(clampThreshold(100)).toBe(100);
  expect(clampThreshold(37.6)).toBe(38);
  expect(clampThreshold(25)).toBe(25);
  expect(clampThreshold(200)).toBe(200);
  expect(clampThreshold(NaN)).toBe(100);
  expect(clampThreshold(Infinity)).toBe(200);
  expect(clampThreshold(-Infinity)).toBe(25);
});

test('AC-3: slider math is pure, clamped, rounded, round-trips', () => {
  expect(thresholdFromRatio(0)).toBe(25);
  expect(thresholdFromRatio(1)).toBe(200);
  expect(thresholdFromRatio(0.5)).toBe(113);
  expect(thresholdFromRatio(-0.2)).toBe(25);
  expect(thresholdFromRatio(1.5)).toBe(200);
  expect(ratioFromThreshold(25)).toBe(0);
  expect(ratioFromThreshold(200)).toBe(1);
  for (let t = THRESHOLD_MIN; t <= THRESHOLD_MAX; t++) {
    expect(thresholdFromRatio(ratioFromThreshold(t))).toBe(t);
  }
});

test('AC-4: mergeSettings fills defaults, validates types/enums, clamps, drops unknowns', () => {
  expect(mergeSettings({})).toEqual(DEFAULT_SETTINGS);
  expect(mergeSettings({ alert: false }).alert).toBe(false);
  expect(mergeSettings({ alert: false }).loc).toBe(true);
  expect(mergeSettings({ alert: 'yes' }).alert).toBe(true);
  expect(mergeSettings({ scale: 'ZZZ' }).scale).toBe('CAQI');
  expect(mergeSettings({ threshold: 5000 }).threshold).toBe(200);
  expect(
    (mergeSettings({ nope: 1 }) as unknown as Record<string, unknown>).nope,
  ).toBeUndefined();
  expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
  expect(mergeSettings(42)).toEqual(DEFAULT_SETTINGS);
  expect(mergeSettings('x')).toEqual(DEFAULT_SETTINGS);
});
