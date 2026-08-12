import { Pressable } from 'react-native';
import type { Station } from '../../core/geo';
import { hasFavorite } from '../../core/places';
import { useFavorites } from '../../shared/place';
import { Text } from '../../shared/ui/Text';
import { colors } from '../../shared/tokens';

// Search-result save control: "+" (accent) until the station is a favorite, then a
// terminal green "✓". Removal happens from the favorites list (the ✕), per the design.
export function SaveButton({ station }: { station: Station }) {
  const { favorites, add } = useFavorites();
  if (hasFavorite(favorites, station.id)) {
    return (
      <Text
        testID={`saved-${station.id}`}
        variant="city"
        color={colors.success}
      >
        ✓
      </Text>
    );
  }
  return (
    <Pressable
      testID={`save-${station.id}`}
      onPress={() => add(station)}
      hitSlop={8}
    >
      <Text variant="city" color={colors.accent}>
        +
      </Text>
    </Pressable>
  );
}
