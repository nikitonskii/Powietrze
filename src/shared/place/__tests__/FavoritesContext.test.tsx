import {
  render,
  screen,
  waitFor,
  fireEvent,
} from '@testing-library/react-native';
import { Text, Pressable } from 'react-native';
import { FavoritesProvider, useFavorites } from '../FavoritesContext';
import type { FavoritesStore } from '../../../core/places';
import type { Station } from '../../../core/geo';

const k: Station = {
  id: 400,
  name: 'Kraków, Aleja Krasińskiego',
  city: 'Kraków',
  lat: 0,
  lon: 0,
};

function makeStore(
  initial: Station[],
): FavoritesStore & { saved: Station[][] } {
  const saved: Station[][] = [];
  return {
    saved,
    load: async () => initial,
    save: async list => {
      saved.push(list);
    },
  };
}

function Probe() {
  const { favorites, add, remove } = useFavorites();
  return (
    <>
      <Text>{favorites.map(f => f.id).join(',') || 'empty'}</Text>
      <Pressable testID="add" onPress={() => add(k)}>
        <Text>add</Text>
      </Pressable>
      <Pressable testID="rm" onPress={() => remove(400)}>
        <Text>rm</Text>
      </Pressable>
    </>
  );
}

test('AC 006-5: loads from store, add/remove persist, duplicate add is a no-op', async () => {
  const store = makeStore([]);
  render(
    <FavoritesProvider store={store}>
      <Probe />
    </FavoritesProvider>,
  );
  await waitFor(() => expect(screen.getByText('empty')).toBeTruthy());

  fireEvent.press(screen.getByTestId('add'));
  await waitFor(() => expect(screen.getByText('400')).toBeTruthy());
  expect(store.saved).toHaveLength(1);
  expect(store.saved[0].map(s => s.id)).toEqual([400]);

  fireEvent.press(screen.getByTestId('add')); // duplicate → no-op
  await waitFor(() => expect(screen.getByText('400')).toBeTruthy());
  expect(store.saved).toHaveLength(1); // no extra save

  fireEvent.press(screen.getByTestId('rm'));
  await waitFor(() => expect(screen.getByText('empty')).toBeTruthy());
  expect(store.saved).toHaveLength(2);
  expect(store.saved[1]).toEqual([]);
});

const w2: Station = {
  id: 530,
  name: 'Warszawa, Al. Niepodległości',
  city: 'Warszawa',
  lat: 0,
  lon: 0,
};
const g2: Station = {
  id: 706,
  name: 'Gdańsk, ul. Powstańców Wielkopolskich',
  city: 'Gdańsk',
  lat: 0,
  lon: 0,
};

function ReorderProbe() {
  const { favorites, reorder } = useFavorites();
  return (
    <>
      <Text>{favorites.map(f => f.id).join(',') || 'empty'}</Text>
      <Pressable testID="move-0-2" onPress={() => reorder(0, 2)}>
        <Text>m02</Text>
      </Pressable>
      <Pressable testID="noop" onPress={() => reorder(1, 1)}>
        <Text>noop</Text>
      </Pressable>
    </>
  );
}

test('AC 008-2: reorder moves + persists; no-op does not persist', async () => {
  const store = makeStore([k, w2, g2]);
  render(
    <FavoritesProvider store={store}>
      <ReorderProbe />
    </FavoritesProvider>,
  );
  await waitFor(() => expect(screen.getByText('400,530,706')).toBeTruthy());

  fireEvent.press(screen.getByTestId('move-0-2'));
  await waitFor(() => expect(screen.getByText('530,706,400')).toBeTruthy());
  expect(store.saved.at(-1)!.map(s => s.id)).toEqual([530, 706, 400]);

  const savesAfterMove = store.saved.length;
  fireEvent.press(screen.getByTestId('noop'));
  await waitFor(() => expect(screen.getByText('530,706,400')).toBeTruthy());
  expect(store.saved).toHaveLength(savesAfterMove);
});
