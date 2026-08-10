import { Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Text } from '../shared/ui/Text';
import { colors } from '../shared/tokens';

export function makeTabBar(activeTints: Record<string, string>) {
  return function TabBar({ state, navigation }: BottomTabBarProps) {
    return (
      <View style={styles.bar}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const tint = focused ? activeTints[route.name] : colors.text.inactive;
          return (
            <Pressable
              key={route.key}
              testID={`tab-${route.name}`}
              style={styles.item}
              onPress={() => navigation.navigate(route.name)}
            >
              <Text variant="label" color={tint} style={styles.itemLabel}>
                {route.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  };
}
const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    height: 88,
    paddingBottom: 24,
    backgroundColor: colors.tabBar.bg,
    borderTopWidth: 1,
    borderTopColor: colors.tabBar.border,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  itemLabel: { letterSpacing: 0.5 },
});
