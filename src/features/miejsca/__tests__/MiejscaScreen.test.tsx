import {
  render,
  screen,
  waitFor,
  fireEvent,
} from '@testing-library/react-native';
import realStations from '../../../core/geo/__fixtures__/stations.json';
import { MiejscaScreen } from '../MiejscaScreen';
import {
  PlaceSourceProvider,
  ActivePlaceProvider,
  FavoritesProvider,
  StationsProvider,
  type SourceForPlace,
} from '../../../shared/place';
import type { FavoritesStore } from '../../../core/places';
import type { Station } from '../../../core/geo';
import type { Reading } from '../../../core/air';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped fixture JSON
const S: Station[] = (realStations as any)['Lista stacji pomiarowych'].map(
  (e: any) => ({
    id: e['Identyfikator stacji'],
    name: e['Nazwa stacji'],
    city: e['Nazwa miasta'],
    lat: 0,
    lon: 0,
  }),
);
const anyReading: Reading = {
  index: 4,
  pm25: 5,
  measuredAt: '2026-08-11 21:00:00',
  city: 'Kraków',
  station: 'x',
};
const sfp: SourceForPlace = () => ({
  getCurrentReading: () => Promise.resolve(anyReading),
});

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

function makeStore(): FavoritesStore & { saved: Station[][] } {
  const saved: Station[][] = [];
  return {
    saved,
    load: async () => [],
    save: async l => {
      saved.push(l);
    },
  };
}
const renderScreen = (store: FavoritesStore) =>
  render(
    <StationsProvider stations={S}>
      <PlaceSourceProvider sourceForPlace={sfp}>
        <FavoritesProvider store={store}>
          <ActivePlaceProvider>
            <MiejscaScreen />
          </ActivePlaceProvider>
        </FavoritesProvider>
      </PlaceSourceProvider>
    </StationsProvider>,
  );

test('AC 006-8: default shows the pinned location row and the empty hint', async () => {
  await renderScreen(makeStore());
  expect(screen.getByText('Twoja lokalizacja')).toBeTruthy();
  expect(screen.getByText('Wyszukaj i dodaj miejsce')).toBeTruthy();
});

test('AC 006-9: search filters, + adds a favorite (persists), tap previews + navigates', async () => {
  const store = makeStore();
  await renderScreen(store);
  fireEvent.changeText(screen.getByTestId('search-input'), 'krak');
  expect(await screen.findByText('Kraków')).toBeTruthy();
  fireEvent.press(screen.getByTestId('add-400'));
  await waitFor(() => expect(store.saved).toHaveLength(1));
  expect(store.saved[0].map(s => s.id)).toEqual([400]);
  fireEvent.press(screen.getByTestId('result-400'));
  expect(mockNavigate).toHaveBeenCalledWith('Teraz');
});
