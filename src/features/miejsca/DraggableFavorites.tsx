import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import type { Station } from '../../core/geo';
import { colors, spacing } from '../../shared/tokens';
import { FavoriteRow } from './FavoriteRow';

const ROW_H = 74; // row height + list gap; converts drag distance → index delta

// The favorites list with long-press drag-reorder. Rows are keyed by station.id
// (never index) so a delete/reorder re-renders — not remounts — them (a remount
// resets usePlaceReading and refetches; the spec-007 no-refetch guard depends on this).
export function DraggableFavorites({
  favorites,
  onOpen,
  onDelete,
  onReorder,
}: {
  favorites: Station[];
  onOpen: (s: Station) => void;
  onDelete: (id: number) => void;
  onReorder: (from: number, to: number) => void;
}) {
  return (
    <View style={styles.list}>
      {favorites.map((s, index) => (
        <DraggableRow
          key={s.id}
          station={s}
          index={index}
          count={favorites.length}
          onOpen={() => onOpen(s)}
          onDelete={() => onDelete(s.id)}
          onReorder={onReorder}
        />
      ))}
    </View>
  );
}

function DraggableRow({
  station,
  index,
  count,
  onOpen,
  onDelete,
  onReorder,
}: {
  station: Station;
  index: number;
  count: number;
  onOpen: () => void;
  onDelete: () => void;
  onReorder: (from: number, to: number) => void;
}) {
  const ty = useSharedValue(0);
  const active = useSharedValue(false);
  const [dragging, setDragging] = useState(false);

  // Long-press then vertical pan reorders; horizontal is left to the row's own
  // ReanimatedSwipeable (activeOffsetX), so the two gestures don't fight.
  const drag = Gesture.Pan()
    .activateAfterLongPress(250)
    .activeOffsetY([-10, 10])
    .onStart(() => {
      active.value = true;
      runOnJS(setDragging)(true);
    })
    .onUpdate(e => {
      ty.value = e.translationY;
    })
    .onEnd(() => {
      const delta = Math.round(ty.value / ROW_H);
      const to = Math.max(0, Math.min(count - 1, index + delta));
      if (to !== index) runOnJS(onReorder)(index, to);
      ty.value = 0;
      active.value = false;
      runOnJS(setDragging)(false);
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }, { scale: active.value ? 1.03 : 1 }],
    zIndex: active.value ? 10 : 0,
  }));

  return (
    <GestureDetector gesture={drag}>
      <Animated.View style={[rowStyle, dragging && styles.lifted]}>
        <FavoriteRow station={station} onOpen={onOpen} onDelete={onDelete} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.rowGap },
  lifted: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});
