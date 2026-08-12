import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ActivePlace } from '../../core/places';
import { scene } from '../../core/scene';
import { usePlaceReading } from '../../shared/place';
import { Text } from '../../shared/ui/Text';
import { colors, spacing } from '../../shared/tokens';

// One live place row: title/subtitle on the left; on the right the live index in the
// scene's key color, or a small dim "brak danych" when the station has no current
// reading. `trailing` is the right-most control (✕ for favorites, +/✓ for results).
export function PlaceRow({
  place,
  title,
  subtitle,
  onPress,
  trailing,
  testID,
}: {
  place: ActivePlace;
  title: string;
  subtitle: string;
  onPress: () => void;
  trailing?: ReactNode;
  testID?: string;
}) {
  const { status, reading } = usePlaceReading(place);
  return (
    <Pressable testID={testID} style={styles.row} onPress={onPress}>
      <View style={styles.left}>
        <Text variant="city" style={styles.title}>
          {title}
        </Text>
        <Text variant="station" color={colors.text.dim}>
          {subtitle}
        </Text>
      </View>
      {reading ? (
        <Text
          variant="index"
          color={scene(reading.index).key}
          style={styles.index}
        >
          {String(reading.index)}
        </Text>
      ) : status === 'stale' ? (
        <Text variant="station" color={colors.text.dim}>
          brak danych
        </Text>
      ) : null}
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.rowGap,
    paddingVertical: spacing.rowV,
    paddingHorizontal: spacing.cardH,
    backgroundColor: colors.card,
    borderRadius: 22,
  },
  left: { flex: 1 },
  title: { fontSize: 20 },
  index: { fontSize: 44, letterSpacing: 0 },
});
