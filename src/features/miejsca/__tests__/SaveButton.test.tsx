import {
  render,
  screen,
  waitFor,
  fireEvent,
} from '@testing-library/react-native';
import { SaveButton } from '../SaveButton';
import { FavoritesProvider } from '../../../shared/place';
import type { FavoritesStore } from '../../../core/places';
import type { Station } from '../../../core/geo';

const w: Station = {
  id: 530,
  name: 'Warszawa, Al. Niepodległości',
  city: 'Warszawa',
  lat: 0,
  lon: 0,
};
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
const wrap = (store: FavoritesStore) =>
  render(
    <FavoritesProvider store={store}>
      <SaveButton station={w} />
    </FavoritesProvider>,
  );

test('AC 007-3: unsaved shows +, tapping adds and flips to ✓', async () => {
  const store = makeStore([]);
  await wrap(store);
  expect(screen.getByTestId('save-530')).toBeTruthy();
  fireEvent.press(screen.getByTestId('save-530'));
  await waitFor(() => expect(screen.getByTestId('saved-530')).toBeTruthy());
  expect(screen.queryByTestId('save-530')).toBeNull();
  expect(store.saved.map(l => l.map(s => s.id))).toContainEqual([530]);
});

test('AC 007-3: already-saved shows ✓ from the start, no + and no extra save', async () => {
  const store = makeStore([w]);
  await wrap(store);
  await waitFor(() => expect(screen.getByTestId('saved-530')).toBeTruthy());
  expect(screen.queryByTestId('save-530')).toBeNull();
  expect(store.saved).toHaveLength(0);
});
