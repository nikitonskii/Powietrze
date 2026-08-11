import {
  render,
  screen,
  fireEvent,
  within,
} from '@testing-library/react-native';
import { AppNavigator } from '../AppNavigator';
import { AirSourceProvider } from '../../features/teraz/AirSourceContext';
import { fakeAirSource } from '../../shared/test/fakeAirSource';
import { scene } from '../../core/scene';
import { MOCK_PLACE } from '../../features/teraz/mockData';
import { colors } from '../../shared/tokens';
import { colorOf } from '../../shared/test/colorOf';

const renderNav = () =>
  render(
    <AirSourceProvider source={fakeAirSource()}>
      <AppNavigator />
    </AirSourceProvider>,
  );

test('AC-9: three tabs, Teraz active, hero visible', async () => {
  await renderNav();
  expect(screen.getByTestId('tab-Teraz')).toBeTruthy();
  expect(screen.getByTestId('tab-Miejsca')).toBeTruthy();
  expect(screen.getByTestId('tab-Ustawienia')).toBeTruthy();
  expect(await screen.findByText('TWOJA LOKALIZACJA')).toBeTruthy();
  expect(await screen.findByText('118')).toBeTruthy();
});

test('AC-10: tapping tabs switches to placeholder screens', async () => {
  await renderNav();
  await screen.findByText('TWOJA LOKALIZACJA'); // wait for the live hero to load
  fireEvent.press(screen.getByTestId('tab-Miejsca'));
  expect(await screen.findByTestId('screen-miejsca')).toBeTruthy();
  expect(screen.queryByText('TWOJA LOKALIZACJA')).toBeNull();
  fireEvent.press(screen.getByTestId('tab-Ustawienia'));
  expect(await screen.findByTestId('screen-ustawienia')).toBeTruthy();
});

test('AC-11: tab tints — Teraz=key, others=accent, inactive dim', async () => {
  await renderNav();
  const key = scene(MOCK_PLACE.index).key;
  expect(
    colorOf(within(screen.getByTestId('tab-Teraz')).getByText('Teraz')),
  ).toBe(key);
  expect(
    colorOf(within(screen.getByTestId('tab-Miejsca')).getByText('Miejsca')),
  ).toBe(colors.text.inactive);
  fireEvent.press(screen.getByTestId('tab-Miejsca'));
  await screen.findByTestId('screen-miejsca');
  expect(
    colorOf(within(screen.getByTestId('tab-Miejsca')).getByText('Miejsca')),
  ).toBe(colors.accent);
});
