import { POLLUTANTS } from '..';

test('AC-1: POLLUTANTS pins the six-entry catalog, codes+labels+order', () => {
  expect(POLLUTANTS).toEqual([
    { code: 'PM10', label: 'PM10' },
    { code: 'NO2', label: 'NO₂' },
    { code: 'O3', label: 'O₃' },
    { code: 'SO2', label: 'SO₂' },
    { code: 'CO', label: 'CO' },
    { code: 'C6H6', label: 'C₆H₆' },
  ]);
});
