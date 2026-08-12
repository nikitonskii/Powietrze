import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_SETTINGS,
  mergeSettings,
  type SettingsStore,
} from '../../core/settings';

const KEY = 'powietrze.settings.v1';

// Persists settings as one JSON blob. Never throws: missing/corrupt loads as
// DEFAULT_SETTINGS (via mergeSettings); a failed save is swallowed (dev-logged).
export function createAsyncStorageSettingsStore(): SettingsStore {
  return {
    async load() {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (!raw) return { ...DEFAULT_SETTINGS };
        return mergeSettings(JSON.parse(raw));
      } catch {
        return { ...DEFAULT_SETTINGS };
      }
    },
    async save(settings) {
      try {
        await AsyncStorage.setItem(KEY, JSON.stringify(settings));
      } catch (e) {
        if (__DEV__) console.warn('[settings] save failed:', e);
      }
    },
  };
}
