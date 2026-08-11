import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { AirQualitySource } from './src/core/air';
import { createGiosSource } from './src/data/gios';
import { AirSourceProvider } from './src/features/teraz/AirSourceContext';
import { AppNavigator } from './src/app/AppNavigator';

const defaultSource = createGiosSource(); // one stable instance across renders

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
