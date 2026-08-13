import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../tokens';
import { scene } from '../../core/scene';
import {
  historyBarOpacity,
  barHeightPct,
  type HourPoint,
} from '../../core/air';

const AXIS_LABELS = ['12:00', '18:00', '00:00', '06:00', 'teraz'];

function Bar({
  point,
  index,
  count,
}: {
  point: HourPoint;
  index: number;
  count: number;
}) {
  return (
    <View
      testID={`bar-${index}`}
      style={{
        flex: 1,
        height: `${barHeightPct(point.index)}%`,
        backgroundColor: scene(point.index).key,
        opacity: historyBarOpacity(index, count),
        borderRadius: 3,
      }}
    />
  );
}

export function HistoryChart({ history }: { history: HourPoint[] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.header}>OSTATNIE 24 GODZINY</Text>
      <View style={styles.bars}>
        {history.map((point, i) => (
          <Bar key={point.at} point={point} index={i} count={history.length} />
        ))}
      </View>
      <View style={styles.axis}>
        {AXIS_LABELS.map(label => (
          <Text key={label} style={styles.axisLabel}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 22,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  header: {
    color: colors.text.muted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 76,
    marginTop: 14,
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  axisLabel: {
    color: colors.text.faint,
    fontSize: 10,
  },
});
