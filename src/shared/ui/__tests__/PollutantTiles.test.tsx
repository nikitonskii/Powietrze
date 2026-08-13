import { render, screen } from '@testing-library/react-native';
import { PollutantTiles } from '../PollutantTiles';

test('AC-9: PM10 + NO₂ labels, values, µg/m³ units', async () => {
  await render(<PollutantTiles pm10={40} no2={22} />);
  expect(screen.getByText('PM10')).toBeTruthy();
  expect(screen.getByText('NO₂')).toBeTruthy();
  expect(screen.getByText('40')).toBeTruthy();
  expect(screen.getByText('22')).toBeTruthy();
  expect(screen.getAllByText('µg/m³')).toHaveLength(2);
});

test('AC-9: missing value → —', async () => {
  await render(<PollutantTiles pm10={40} no2={undefined} />);
  expect(screen.getByText('—')).toBeTruthy();
});
