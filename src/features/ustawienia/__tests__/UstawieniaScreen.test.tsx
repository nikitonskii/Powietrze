import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { UstawieniaScreen } from '../UstawieniaScreen';
import { SettingsProvider } from '../../../shared/settings';
import {
  DEFAULT_SETTINGS,
  type Settings,
  type SettingsStore,
} from '../../../core/settings';

const store = (
  initial: Settings = DEFAULT_SETTINGS,
): SettingsStore & { saved: Settings[] } => {
  const saved: Settings[] = [];
  return {
    saved,
    load: async () => initial,
    save: async s => {
      saved.push(s);
    },
  };
};
const renderScreen = (s: SettingsStore) =>
  render(
    <GestureHandlerRootView>
      <SettingsProvider store={s}>
        <UstawieniaScreen />
      </SettingsProvider>
    </GestureHandlerRootView>,
  );

test('AC-17: header + four section labels in order', async () => {
  await renderScreen(store());
  for (const label of [
    'Ustawienia',
    'LOKALIZACJA',
    'POWIADOMIENIA',
    'WIDŻET I WYGLĄD',
    'DANE',
  ]) {
    expect(screen.getByText(label)).toBeTruthy();
  }
});

test('AC-18: exact Polish copy for every row + footer, widget row removed', async () => {
  await renderScreen(store());
  for (const t of [
    'Użyj mojej lokalizacji',
    'Dokładność',
    'Alert smogowy',
    'Próg alertu',
    'Godziny ciszy',
    '22:00 – 07:00',
    'Poranne podsumowanie',
    '07:30',
    'Skala indeksu',
    'Źródło',
    'GIOŚ',
    'Częstotliwość odświeżania',
    '15 min',
    'Dane: GIOŚ · Open-Meteo',
    'Bez konta. Ulubione zostają na telefonie.',
  ]) {
    expect(screen.getByText(t)).toBeTruthy();
  }
  expect(screen.queryByText('Automatyczna ›')).toBeNull();
  expect(screen.queryByText('Stacja widżetu')).toBeNull();
  expect(screen.queryByText('Automatyczna')).toBeNull();
  expect(screen.queryByTestId('setting-widget')).toBeNull();
});

test('AC-19: toggling Alert smogowy persists alert inverted', async () => {
  const s = store();
  await renderScreen(s);
  fireEvent.press(screen.getByTestId('toggle-alert'));
  await waitFor(() => expect(s.saved.at(-1)?.alert).toBe(false));
});

test('AC-20: choosing Dokładna persists precision', async () => {
  const s = store();
  await renderScreen(s);
  fireEvent.press(screen.getByTestId('seg-precision-Dokładna'));
  await waitFor(() => expect(s.saved.at(-1)?.precision).toBe('Dokładna'));
});

test('AC-5: Wkrótce tags only on still-unwired rows (alert, threshold, quiet); morning is now live', async () => {
  await renderScreen(store());
  for (const k of ['alert', 'threshold', 'quiet']) {
    expect(screen.getByTestId(`wkrotce-${k}`)).toBeTruthy();
  }
  for (const k of [
    'morning',
    'loc',
    'precision',
    'scale',
    'widget',
    'source',
    'refresh',
  ]) {
    expect(screen.queryByTestId(`wkrotce-${k}`)).toBeNull();
  }
});

test('AC-22: preloaded non-default store hydrates the controls', async () => {
  await renderScreen(store({ ...DEFAULT_SETTINGS, alert: false }));
  await waitFor(() => {
    const track = StyleSheet.flatten(
      screen.getByTestId('toggle-alert').props.style,
    );
    expect(track.justifyContent).toBe('flex-start'); // off
  });
});
