import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { scene } from '../core/scene';
import { colors } from '../shared/tokens';
import { MOCK_PLACE } from '../features/teraz/mockData';
import { TerazScreen } from '../features/teraz/TerazScreen';
import { MiejscaScreen } from '../features/miejsca/MiejscaScreen';
import { UstawieniaScreen } from '../features/ustawienia/UstawieniaScreen';
import { makeTabBar } from './TabBar';

const Tab = createBottomTabNavigator();

const activeTints = {
  Teraz: scene(MOCK_PLACE.index).key,
  Miejsca: colors.accent,
  Ustawienia: colors.accent,
};
const tabBar = makeTabBar(activeTints);

export function AppNavigator() {
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
