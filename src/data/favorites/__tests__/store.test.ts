import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStorageFavoritesStore } from '../index';
import type { Station } from '../../../core/geo';

const k: Station = {
  id: 400,
  name: 'Kraków, Aleja Krasińskiego',
  city: 'Kraków',
  lat: 50.057678,
  lon: 19.926189,
};
const w: Station = {
  id: 530,
  name: 'Warszawa, Al. Niepodległości',
  city: 'Warszawa',
  lat: 52.219298,
  lon: 21.004724,
};

beforeEach(() => AsyncStorage.clear());

test('AC 006-4: save then load round-trips the station list', async () => {
  const store = createAsyncStorageFavoritesStore();
  await store.save([k, w]);
  expect(await store.load()).toEqual([k, w]);
});

test('AC 006-4: no stored value → []', async () => {
  expect(await createAsyncStorageFavoritesStore().load()).toEqual([]);
});

test('AC 006-4: unparseable stored value → []', async () => {
  await AsyncStorage.setItem('powietrze.favorites.v1', 'not json');
  expect(await createAsyncStorageFavoritesStore().load()).toEqual([]);
});
