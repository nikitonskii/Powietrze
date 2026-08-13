import { View, Text, StyleSheet } from 'react-native';
import { Canvas, Group, Path } from '@shopify/react-native-skia';
import { colors } from '../tokens';
import { scene } from '../../core/scene';
import {
  historyBarOpacity,
  barHeightPct,
  type HourPoint,
} from '../../core/air';

const AXIS_LABELS = ['12:00', '18:00', '00:00', '06:00', 'teraz'];

// Verbatim from Powietrze.dc.html:76 (viewBox 0 0 24 24).
const CLOCK_PATH = 'M12 8v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z';
const CLOCK_SIZE = 13;

function ClockIcon({ testID }: { testID?: string }) {
  // Skia's Path type doesn't declare testID; spread a plain object so TS
  // doesn't excess-check it — same pattern as TabIcon/Skyline.
  const pathProps = {
    path: CLOCK_PATH,
    color: colors.text.muted,
    style: 'stroke' as const,
    strokeWidth: 2,
    strokeCap: 'round' as const,
    ...(testID ? { testID } : {}),
  };
  return (
    <Canvas style={{ width: CLOCK_SIZE, height: CLOCK_SIZE }}>
      <Group transform={[{ scale: CLOCK_SIZE / 24 }]}>
        <Path {...pathProps} />
      </Group>
    </Canvas>
  );
}

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
      <View style={styles.headerRow}>
        <ClockIcon testID="chart-clock" />
        <Text style={styles.header}>OSTATNIE 24 GODZINY</Text>
      </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
