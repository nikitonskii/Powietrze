import { Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { Station } from '../../core/geo';
import { stationLabel } from '../../core/geo';
import { Text } from '../../shared/ui/Text';
import { colors, spacing } from '../../shared/tokens';
import { PlaceRow } from './PlaceRow';

// A favorite row with swipe-left-to-delete. The revealed "Usuń" action keeps the
// delete-<city> testID (same delete contract as before; the swipe motion is new).
export function FavoriteRow({
  station,
  onOpen,
  onDelete,
}: {
  station: Station;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const renderRightActions = () => (
    <View style={styles.actions}>
      <Pressable
        testID={`delete-${station.city}`}
        style={styles.delete}
        onPress={onDelete}
      >
        <Text variant="label" color={colors.text.primary}>
          Usuń
        </Text>
      </Pressable>
    </View>
  );
  return (
    <ReanimatedSwipeable
      renderRightActions={renderRightActions}
      friction={2}
      rightThreshold={40}
    >
      <PlaceRow
        place={{ kind: 'station', station }}
        title={station.city}
        subtitle={stationLabel(station)}
        onPress={onOpen}
        testID={`fav-${station.id}`}
      />
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  actions: { justifyContent: 'center', marginLeft: spacing.rowGap },
  delete: {
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    height: '100%',
    borderRadius: 22,
  },
});
