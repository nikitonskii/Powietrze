import {
  render,
  screen,
  fireEvent,
  within,
} from '@testing-library/react-native';
import { AppNavigator } from '../AppNavigator';
import {
  PlaceSourceProvider,
  ActivePlaceProvider,
  FavoritesProvider,
  StationsProvider,
} from '../../shared/place';
import type { FavoritesStore } from '../../core/places';
import { fakeAirSource } from '../../shared/test/fakeAirSource';
import { scene } from '../../core/scene';
import { colors } from '../../shared/tokens';
import { colorOf } from '../../shared/test/colorOf';

// The Miejsca tab renders the real MiejscaScreen, which needs the favorites +
// stations providers too.
const emptyStore: FavoritesStore = {
  load: async () => [],
  save: async () => {},
};

const renderNav = () =>
  render(
    <StationsProvider stations={[]}>
      <PlaceSourceProvider sourceForPlace={() => fakeAirSource()}>
        <FavoritesProvider store={emptyStore}>
          <ActivePlaceProvider>
            <AppNavigator />
          </ActivePlaceProvider>
        </FavoritesProvider>
      </PlaceSourceProvider>
    </StationsProvider>,
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
  await screen.findByText('TWOJA LOKALIZACJA');
  fireEvent.press(screen.getByTestId('tab-Miejsca'));
  expect(await screen.findByTestId('screen-miejsca')).toBeTruthy();
  expect(screen.queryByText('TWOJA LOKALIZACJA')).toBeNull();
  fireEvent.press(screen.getByTestId('tab-Ustawienia'));
  expect(await screen.findByTestId('screen-ustawienia')).toBeTruthy();
});

test('AC 006-10: Teraz tab tint comes from the active reading index, not MOCK_PLACE', async () => {
  await renderNav();
  await screen.findByText('118'); // wait for the live reading
  const key = scene(118).key; // fakeAirSource() reads index 118
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
