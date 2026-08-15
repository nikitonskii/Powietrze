import { render, screen } from '@testing-library/react-native';
import { PollutantTiles } from '../PollutantTiles';
import type { PollutantReading } from '../../../core/air';

test('AC-4: 4-entry list renders all four labels (from catalog), values via formatPollutant, four µg/m³ units', async () => {
  const pollutants: PollutantReading[] = [
    { code: 'PM10', value: 40 },
    { code: 'NO2', value: 22 },
    { code: 'CO', value: 350 },
    { code: 'C6H6', value: 0.35 },
  ];
  await render(
    <PollutantTiles pollutants={pollutants} precision="Przybliżona" />,
  );
  expect(screen.getByText('PM10')).toBeTruthy();
  expect(screen.getByText('NO₂')).toBeTruthy();
  expect(screen.getByText('CO')).toBeTruthy();
  expect(screen.getByText('C₆H₆')).toBeTruthy();
  expect(screen.getByText('40')).toBeTruthy();
  expect(screen.getByText('22')).toBeTruthy();
  expect(screen.getByText('350')).toBeTruthy();
  // benzene 0.35 shows "0.35" even in Przybliżona (sub-1 always 2 dp)
  expect(screen.getByText('0.35')).toBeTruthy();
  expect(screen.getAllByText('µg/m³')).toHaveLength(4);
});

test('AC-4: absent pollutant → tile not rendered', async () => {
  const pollutants: PollutantReading[] = [{ code: 'PM10', value: 40 }];
  await render(
    <PollutantTiles pollutants={pollutants} precision="Przybliżona" />,
  );
  expect(screen.getByText('PM10')).toBeTruthy();
  expect(screen.queryByText('NO₂')).toBeNull();
  expect(screen.getAllByText('µg/m³')).toHaveLength(1);
});

test('AC-4: precision Dokładna formats ≥1 values with one decimal', async () => {
  const pollutants: PollutantReading[] = [
    { code: 'PM10', value: 13.1 },
    { code: 'NO2', value: 22 },
  ];
  await render(<PollutantTiles pollutants={pollutants} precision="Dokładna" />);
  expect(screen.getByText('13.1')).toBeTruthy();
  expect(screen.getByText('22.0')).toBeTruthy();
});

test('AC-4: precision Przybliżona rounds ≥1 values to an integer', async () => {
  const pollutants: PollutantReading[] = [
    { code: 'PM10', value: 13.1 },
    { code: 'NO2', value: 22 },
  ];
  await render(
    <PollutantTiles pollutants={pollutants} precision="Przybliżona" />,
  );
  expect(screen.getByText('13')).toBeTruthy();
  expect(screen.getByText('22')).toBeTruthy();
});

test('AC-5: empty pollutants → renders nothing (no crash)', async () => {
  await render(<PollutantTiles pollutants={[]} precision="Przybliżona" />);
  expect(screen.queryByText('µg/m³')).toBeNull();
});
