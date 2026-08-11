import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { AirQualitySource } from './src/core/air';
import { createNearestStationSource } from './src/data/gios';
import { createDeviceGeolocation } from './src/data/location';
import { AirSourceProvider } from './src/features/teraz/AirSourceContext';
import { AppNavigator } from './src/app/AppNavigator';

// One stable instance across renders. Nearest station by device location,
// falling back to Kraków on any failure.
const defaultSource = createNearestStationSource(
  createDeviceGeolocation(),
  fetch,
);

function App({ source = defaultSource }: { source?: AirQualitySource }) {
  return (
    <AirSourceProvider source={source}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />
        <AppNavigator />
      </SafeAreaProvider>
    </AirSourceProvider>
  );
}

export default App;
