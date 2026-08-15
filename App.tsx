import { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  createNearestStationSource,
  createStationSource,
  fetchStations,
  KRAKOW_STATION,
} from './src/data/gios';
import { createDeviceGeolocation } from './src/data/location';
import { createAsyncStorageFavoritesStore } from './src/data/favorites';
import { createAsyncStorageSettingsStore } from './src/data/settings';
import type { ActivePlace } from './src/core/places';
import type { Station } from './src/core/geo';
import {
  PlaceSourceProvider,
  StationsProvider,
  FavoritesProvider,
  ActivePlaceProvider,
} from './src/shared/place';
import { SettingsProvider } from './src/shared/settings';
import { AppNavigator } from './src/app/AppNavigator';

// Data-layer instances built once and injected (features never call data directly).
const nearest = createNearestStationSource(createDeviceGeolocation(), fetch);
const sourceForPlace = (p: ActivePlace) =>
  p.kind === 'location' ? nearest : createStationSource(p.station, fetch);
const favoritesStore = createAsyncStorageFavoritesStore();
const settingsStore = createAsyncStorageSettingsStore();

function App() {
  // Fetch the station list once for search (features never call data directly).
  const [stations, setStations] = useState<Station[]>([]);
  useEffect(() => {
    let on = true;
    fetchStations(fetch)
      .then(list => on && setStations(list))
      .catch(() => {});
    return () => {
      on = false;
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StationsProvider stations={stations}>
        <PlaceSourceProvider sourceForPlace={sourceForPlace}>
          <FavoritesProvider store={favoritesStore}>
            <SettingsProvider store={settingsStore}>
              <ActivePlaceProvider defaultStation={KRAKOW_STATION}>
                <SafeAreaProvider>
                  <StatusBar barStyle="light-content" />
                  <AppNavigator />
                </SafeAreaProvider>
              </ActivePlaceProvider>
            </SettingsProvider>
          </FavoritesProvider>
        </PlaceSourceProvider>
      </StationsProvider>
    </GestureHandlerRootView>
  );
}

export default App;
