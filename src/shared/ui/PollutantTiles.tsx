import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../tokens';
import type { Precision } from '../../core/settings';
import { formatConcentration } from '../../core/air';

function Tile({
  label,
  value,
  precision,
}: {
  label: string;
  value: number | undefined;
  precision: Precision;
}) {
  return (
    <View style={styles.tile}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>
        {value === undefined ? '—' : formatConcentration(value, precision)}
      </Text>
      <Text style={styles.unit}>µg/m³</Text>
    </View>
  );
}

export function PollutantTiles({
  pm10,
  no2,
  precision,
}: {
  pm10?: number;
  no2?: number;
  precision: Precision;
}) {
  return (
    <View style={styles.row}>
      <Tile label="PM10" value={pm10} precision={precision} />
      <Tile label="NO₂" value={no2} precision={precision} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  tile: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 20,
    padding: 16,
    flex: 1,
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
