import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Station } from '../../core/geo';
import type { FavoritesStore } from '../../core/places';

const KEY = 'powietrze.favorites.v1';

// Persists the favorites list as one JSON blob. Never throws: a missing or
// corrupt value loads as []; a failed save is swallowed (dev-logged).
export function createAsyncStorageFavoritesStore(): FavoritesStore {
  return {
    async load() {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as Station[]) : [];
      } catch {
        return [];
      }
    },
    async save(list) {
      try {
        await AsyncStorage.setItem(KEY, JSON.stringify(list));
      } catch (e) {
        if (__DEV__) console.warn('[favorites] save failed:', e);
      }
    },
  };
}
