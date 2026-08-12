import { Pressable, StyleSheet, View } from 'react-native';
import type { ActivePlace } from '../../core/places';
import { scene } from '../../core/scene';
import { usePlaceReading } from '../../shared/place';
import { Text } from '../../shared/ui/Text';
import { colors, spacing } from '../../shared/tokens';

// One live place row: title/subtitle on the left, the live index (or a muted "—"
// if the reading failed) on the right in the scene's key color. Tapping opens it.
export function PlaceRow({
  place,
  title,
  subtitle,
  onPress,
  onDelete,
}: {
  place: ActivePlace;
  title: string;
  subtitle: string;
  onPress: () => void;
  onDelete?: () => void;
}) {
  const { reading } = usePlaceReading(place);
  const tint = reading ? scene(reading.index).key : colors.text.dim;
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.left}>
        <Text variant="city" style={styles.title}>
          {title}
        </Text>
        <Text variant="station" color={colors.text.dim}>
          {subtitle}
        </Text>
      </View>
      <Text variant="index" color={tint} style={styles.index}>
        {reading ? String(reading.index) : '—'}
      </Text>
      {onDelete ? (
        <Pressable testID={`delete-${title}`} onPress={onDelete} hitSlop={8}>
          <Text variant="label" color={colors.text.dim}>
            ✕
          </Text>
        </Pressable>
      ) : null}
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
