import {
  NavigationContainer,
  DefaultTheme,
  type Theme,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { scene } from '../core/scene';
import { colors } from '../shared/tokens';
import { useActivePlace } from '../shared/place';
import { TerazScreen } from '../features/teraz/TerazScreen';
import { MiejscaScreen } from '../features/miejsca/MiejscaScreen';
import { UstawieniaScreen } from '../features/ustawienia/UstawieniaScreen';
import { makeTabBar } from './TabBar';

const Tab = createBottomTabNavigator();

// Dark root theme so nothing behind the (now-floating, translucent) tab bar or
// between scenes flashes the default light-gray — the bar reads as glass over
// the live scene, not a gray slab.
const navTheme: Theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.base },
};

export function AppNavigator() {
  const { reading } = useActivePlace();
  // Teraz tab tint tracks the active reading's index; neutral accent while loading.
  const terazTint = reading ? scene(reading.index).key : colors.accent;
  const tabBar = makeTabBar(
    { Teraz: terazTint, Miejsca: colors.accent, Ustawienia: colors.accent },
    // Keep the Teraz tab glowing the live air color even when unfocused (dimmed
    // via alpha so it reads as glanceable, not active); other tabs stay gray.
    { Teraz: reading ? `${scene(reading.index).key}99` : colors.text.inactive },
  );
  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        initialRouteName="Teraz"
        tabBar={tabBar}
        screenOptions={{
          headerShown: false,
          // Scenes paint their own full-bleed background; keep the container
          // transparent so the floating tab bar shows the live scene through it.
          sceneStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Tab.Screen name="Teraz" component={TerazScreen} />
        <Tab.Screen name="Miejsca" component={MiejscaScreen} />
        <Tab.Screen name="Ustawienia" component={UstawieniaScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
