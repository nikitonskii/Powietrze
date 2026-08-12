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

// `any`: untyped GIOŚ fixture JSON, read positionally only in this test setup.
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

const w = S.find(s => s.id === 530)!; // Warszawa
const g = S.find(s => s.id === 706)!; // Gdańsk

function makeStore(
  initial: Station[] = [],
): FavoritesStore & { saved: Station[][] } {
  const saved: Station[][] = [];
  return {
    saved,
    load: async () => initial,
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

test('AC 006-8: favorites render live, tap navigates, ✕ persists — and deleting one does NOT refetch the others', async () => {
  mockNavigate.mockClear();
  const store = makeStore([w, g]);
  // Count getCurrentReading calls per place to guard the stale-object refetch bug.
  const calls: Record<string, number> = {};
  const countingSfp: SourceForPlace = place => ({
    getCurrentReading: () => {
      const key = place.kind === 'location' ? 'loc' : `s${place.station.id}`;
      calls[key] = (calls[key] ?? 0) + 1;
      return Promise.resolve(anyReading);
    },
  });
  await render(
    <StationsProvider stations={S}>
      <PlaceSourceProvider sourceForPlace={countingSfp}>
        <FavoritesProvider store={store}>
          <ActivePlaceProvider>
            <MiejscaScreen />
          </ActivePlaceProvider>
        </FavoritesProvider>
      </PlaceSourceProvider>
    </StationsProvider>,
  );
  // one row per favorite (each with a ✕ delete affordance)
  expect(await screen.findByTestId('delete-Warszawa')).toBeTruthy();
  expect(screen.getByTestId('delete-Gdańsk')).toBeTruthy();
  await waitFor(() => expect(calls.s530).toBe(1));

  // ✕ on Gdańsk removes it + persists — and must NOT refetch Warszawa (bug guard,
  // asserted BEFORE any tap so the active-place fetch doesn't pollute the count).
  fireEvent.press(screen.getByTestId('delete-Gdańsk'));
  await waitFor(() => expect(screen.queryByTestId('delete-Gdańsk')).toBeNull());
  expect(store.saved.at(-1)!.map(s => s.id)).toEqual([530]);
  expect(calls.s530).toBe(1);

  // tapping the remaining favorite row navigates to Teraz
  fireEvent.press(screen.getByText('Warszawa'));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('Teraz'));
});
