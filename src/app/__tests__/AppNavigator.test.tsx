import {
  render,
  screen,
  fireEvent,
  within,
} from '@testing-library/react-native';
import { AppNavigator } from '../AppNavigator';
import { scene } from '../../core/scene';
import { MOCK_PLACE } from '../../features/teraz/mockData';
import { colors } from '../../shared/tokens';
import { colorOf } from '../../shared/test/colorOf';

test('AC-9: three tabs, Teraz active, hero visible', async () => {
  await render(<AppNavigator />);
  expect(screen.getByTestId('tab-Teraz')).toBeTruthy();
  expect(screen.getByTestId('tab-Miejsca')).toBeTruthy();
  expect(screen.getByTestId('tab-Ustawienia')).toBeTruthy();
  expect(screen.getByText('TWOJA LOKALIZACJA')).toBeTruthy();
  expect(screen.getByText('118')).toBeTruthy();
});

test('AC-10: tapping tabs switches to placeholder screens', async () => {
  await render(<AppNavigator />);
  fireEvent.press(screen.getByTestId('tab-Miejsca'));
  expect(await screen.findByTestId('screen-miejsca')).toBeTruthy();
  expect(screen.queryByText('TWOJA LOKALIZACJA')).toBeNull();
  fireEvent.press(screen.getByTestId('tab-Ustawienia'));
  expect(await screen.findByTestId('screen-ustawienia')).toBeTruthy();
});

test('AC-11: tab tints — Teraz=key, others=accent, inactive dim', async () => {
  await render(<AppNavigator />);
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
