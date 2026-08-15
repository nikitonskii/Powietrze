import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../tokens';
import type { Precision } from '../../core/settings';
import {
  formatPollutant,
  POLLUTANTS,
  type PollutantReading,
} from '../../core/air';

function Tile({
  code,
  value,
  precision,
}: PollutantReading & { precision: Precision }) {
  const label = POLLUTANTS.find(p => p.code === code)!.label;
  return (
    <View style={styles.tile}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{formatPollutant(value, precision)}</Text>
      <Text style={styles.unit}>µg/m³</Text>
    </View>
  );
}

// Wrapping 2-column grid: one tile per measured pollutant, in catalog order.
// Empty list → render nothing (no crash, no stray unit). A lone last tile
// (odd count) keeps its 48% width — not stretched to full width.
export function PollutantTiles({
  pollutants,
  precision,
}: {
  pollutants: PollutantReading[];
  precision: Precision;
}) {
  if (pollutants.length === 0) return null;
  return (
    <View style={styles.row}>
      {pollutants.map(p => (
        <Tile
          key={p.code}
          code={p.code}
          value={p.value}
          precision={precision}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 20,
    padding: 16,
    flexBasis: '48%',
  },
  label: {
    color: colors.text.dim,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
  value: {
    color: colors.text.primary,
    fontSize: 30,
    fontWeight: '600',
    marginTop: 6,
  },
  unit: {
    color: colors.text.inactive,
    fontSize: 11,
  },
});
