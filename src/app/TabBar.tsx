import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TabIcon, type TabIconName } from '../shared/ui/TabIcon';
import { colors, type as typeScale } from '../shared/tokens';

const ROUTE_ICON: Record<string, TabIconName> = {
  Teraz: 'teraz',
  Miejsca: 'miejsca',
  Ustawienia: 'ustawienia',
};

export function makeTabBar(
  activeTints: Record<string, string>,
  // Per-tab tint when NOT focused; falls back to the neutral inactive gray.
  // Used to keep the Teraz tab glowing the live air color from any tab.
  inactiveTints: Record<string, string> = {},
) {
  return function TabBar({ state, navigation }: BottomTabBarProps) {
    return (
      <View style={styles.bar}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const tint = focused
            ? activeTints[route.name]
            : inactiveTints[route.name] ?? colors.text.inactive;
          return (
            <Pressable
              key={route.key}
              testID={`tab-${route.name}`}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              style={styles.item}
              onPress={() => navigation.navigate(route.name)}
            >
              {ROUTE_ICON[route.name] && (
                <TabIcon
                  name={ROUTE_ICON[route.name]}
                  color={tint}
                  testID={`icon-${route.name}`}
                />
              )}
              <Text style={[styles.itemLabel, { color: tint }]}>
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
    paddingTop: 10,
    paddingBottom: 24,
    backgroundColor: colors.tabBar.bg,
    borderTopWidth: 1,
    borderTopColor: colors.tabBar.border,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  itemLabel: {
    fontSize: typeScale.tab.size,
    fontWeight: typeScale.tab.weight,
    letterSpacing: typeScale.tab.letterSpacing,
  },
});
