import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStorageSettingsStore } from '..';
import { DEFAULT_SETTINGS, type Settings } from '../../../core/settings';

const KEY = 'powietrze.settings.v1';
beforeEach(() => AsyncStorage.clear());

const custom: Settings = {
  loc: false,
  alert: false,
  morning: true,
  precision: 'Dokładna',
  scale: 'µg/m³',
  threshold: 150,
};

test('AC-5: save then load round-trips exactly', async () => {
  const store = createAsyncStorageSettingsStore();
  await store.save(custom);
  expect(await store.load()).toEqual(custom);
});

test('AC-6: load with nothing stored → DEFAULT_SETTINGS', async () => {
  expect(await createAsyncStorageSettingsStore().load()).toEqual(
    DEFAULT_SETTINGS,
  );
});

test('AC-7: load with corrupt JSON → DEFAULT_SETTINGS, no throw', async () => {
  await AsyncStorage.setItem(KEY, 'not json');
  expect(await createAsyncStorageSettingsStore().load()).toEqual(
    DEFAULT_SETTINGS,
  );
});

test('AC-8: load with a partial/old shape → merged with defaults', async () => {
  await AsyncStorage.setItem(KEY, JSON.stringify({ alert: false }));
  const loaded = await createAsyncStorageSettingsStore().load();
  expect(loaded).toEqual({ ...DEFAULT_SETTINGS, alert: false });
});

test('AC-9: save swallows a setItem rejection (never throws)', async () => {
  const spy = jest
    .spyOn(AsyncStorage, 'setItem')
    .mockRejectedValueOnce(new Error('disk full'));
  await expect(
    createAsyncStorageSettingsStore().save(custom),
  ).resolves.toBeUndefined();
  spy.mockRestore();
});
