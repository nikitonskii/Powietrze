import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { scene } from '../core/scene';
import { colors } from '../shared/tokens';
import { useActivePlace } from '../shared/place';
import { TerazScreen } from '../features/teraz/TerazScreen';
import { MiejscaScreen } from '../features/miejsca/MiejscaScreen';
import { UstawieniaScreen } from '../features/ustawienia/UstawieniaScreen';
import { makeTabBar } from './TabBar';

const Tab = createBottomTabNavigator();

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
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Teraz"
        tabBar={tabBar}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Teraz" component={TerazScreen} />
        <Tab.Screen name="Miejsca" component={MiejscaScreen} />
        <Tab.Screen name="Ustawienia" component={UstawieniaScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
