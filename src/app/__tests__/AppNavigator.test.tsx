import {
  render,
  screen,
  fireEvent,
  within,
} from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from '../AppNavigator';
import {
  PlaceSourceProvider,
  ActivePlaceProvider,
  FavoritesProvider,
  StationsProvider,
} from '../../shared/place';
import { SettingsProvider } from '../../shared/settings';
import type { FavoritesStore } from '../../core/places';
import { DEFAULT_SETTINGS, type SettingsStore } from '../../core/settings';
import {
  fakeAirSource,
  pendingAirSource,
} from '../../shared/test/fakeAirSource';
import { scene } from '../../core/scene';
import { colors } from '../../shared/tokens';
import { colorOf } from '../../shared/test/colorOf';

// The Miejsca tab renders the real MiejscaScreen, which needs the favorites +
// stations providers too.
const emptyStore: FavoritesStore = {
  load: async () => [],
  save: async () => {},
};

// The Ustawienia tab renders the real UstawieniaScreen, which needs a
// settings store too.
const settingsStore: SettingsStore = {
  load: async () => DEFAULT_SETTINGS,
  save: async () => {},
};

const renderNav = () =>
  render(
    <GestureHandlerRootView>
      <StationsProvider stations={[]}>
        <PlaceSourceProvider sourceForPlace={() => fakeAirSource()}>
          <FavoritesProvider store={emptyStore}>
            <SettingsProvider store={settingsStore}>
              <ActivePlaceProvider>
                <AppNavigator />
              </ActivePlaceProvider>
            </SettingsProvider>
          </FavoritesProvider>
        </PlaceSourceProvider>
      </StationsProvider>
    </GestureHandlerRootView>,
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

test('AC 006-10: Teraz tab tint is the neutral accent while the reading is loading', async () => {
  await render(
    <StationsProvider stations={[]}>
      <PlaceSourceProvider sourceForPlace={() => pendingAirSource()}>
        <FavoritesProvider store={emptyStore}>
          <SettingsProvider store={settingsStore}>
            <ActivePlaceProvider>
              <AppNavigator />
            </ActivePlaceProvider>
          </SettingsProvider>
        </FavoritesProvider>
      </PlaceSourceProvider>
    </StationsProvider>,
  );
  await screen.findByTestId('teraz-loading'); // no reading yet
  expect(
    colorOf(within(screen.getByTestId('tab-Teraz')).getByText('Teraz')),
  ).toBe(colors.accent);
});

test('the Teraz tab keeps a dimmed live air tint when unfocused (glanceable from any tab)', async () => {
  await renderNav();
  await screen.findByText('118');
  const key = scene(118).key; // fakeAirSource() reads index 118
  // switch to Miejsca so Teraz is unfocused
  fireEvent.press(screen.getByTestId('tab-Miejsca'));
  await screen.findByTestId('screen-miejsca');
  // unfocused Teraz still shows the live air color, dimmed (key + alpha), NOT gray
  expect(
    colorOf(within(screen.getByTestId('tab-Teraz')).getByText('Teraz')),
  ).toBe(`${key}99`);
  // other unfocused tabs stay the neutral inactive gray
  expect(
    colorOf(
      within(screen.getByTestId('tab-Ustawienia')).getByText('Ustawienia'),
    ),
  ).toBe(colors.text.inactive);
});

test('AC-3/AC-4: each tab shows its icon (tinted like the label) above the label', async () => {
  await renderNav();
  await screen.findByText('118');
  const key = scene(118).key;
  expect(
    within(screen.getByTestId('tab-Teraz')).getByTestId('icon-Teraz').props
      .color,
  ).toBe(key); // focused Teraz → live key tint
  expect(
    within(screen.getByTestId('tab-Miejsca')).getByTestId('icon-Miejsca').props
      .color,
  ).toBe(colors.text.inactive); // unfocused → neutral
});

test('AC-6: each tab is a selected-aware button', async () => {
  await renderNav();
  expect(
    screen.getByTestId('tab-Teraz').props.accessibilityState.selected,
  ).toBe(true);
  expect(
    screen.getByTestId('tab-Miejsca').props.accessibilityState.selected,
  ).toBe(false);
});

test('AC-5: tab bar geometry + label type', async () => {
  await renderNav();
  const bar = StyleSheet.flatten(screen.getByTestId('tab-bar').props.style);
  expect(bar.height).toBe(88);
  expect(bar.paddingTop).toBe(10);
  expect(bar.paddingBottom).toBe(24);
  expect(bar.backgroundColor).toBe(colors.tabBar.bg);
  expect(bar.borderTopColor).toBe(colors.tabBar.border);
  const label = StyleSheet.flatten(
    within(screen.getByTestId('tab-Teraz')).getByText('Teraz').props.style,
  );
  expect(label.fontSize).toBe(10.5);
  expect(label.fontWeight).toBe('500');
  expect(label.letterSpacing).toBe(0);
});
