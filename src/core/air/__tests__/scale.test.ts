import {
  usAqiFromPm25,
  displayValue,
  formatConcentration,
  scaleLabel,
} from '..';

test('AC-1: usAqiFromPm25 — full EPA table, gap-trunc, clamp, non-finite', () => {
  const cases: [number, number][] = [
    [0, 0],
    [9, 38],
    [12, 50],
    [12.05, 50],
    [12.1, 51],
    [35.4, 100],
    [45, 124],
    [55.4, 150],
    [100, 174],
    [150.4, 200],
    [150.5, 201],
    [250.4, 300],
    [300, 350],
    [350.4, 400],
    [400, 434],
    [500.4, 500],
    [600, 500],
    [-1, 0],
    [NaN, 0],
  ];
  for (const [c, aqi] of cases) expect(usAqiFromPm25(c)).toBe(aqi);
});
test('AC-2: formatConcentration', () => {
  expect(formatConcentration(13.1, 'Przybliżona')).toBe('13');
  expect(formatConcentration(13.1, 'Dokładna')).toBe('13.1');
  expect(formatConcentration(13, 'Dokładna')).toBe('13.0');
  expect(formatConcentration(12.5, 'Przybliżona')).toBe('13');
  expect(formatConcentration(NaN, 'Dokładna')).toBe('—');
});
test('AC-3: displayValue', () => {
  expect(displayValue(118, 122, 'CAQI', 'Przybliżona')).toBe('118');
  expect(displayValue(118, 122, 'US AQI', 'Przybliżona')).toBe(
    String(usAqiFromPm25(122)),
  );
  expect(displayValue(118, 13.1, 'µg/m³', 'Dokładna')).toBe('13.1');
  expect(displayValue(118, 13.1, 'µg/m³', 'Przybliżona')).toBe('13');
});
test('AC-4b: scaleLabel', () => {
  expect(scaleLabel('CAQI')).toBe('');
  expect(scaleLabel('US AQI')).toBe('US AQI');
  expect(scaleLabel('µg/m³')).toBe('µg/m³');
});
