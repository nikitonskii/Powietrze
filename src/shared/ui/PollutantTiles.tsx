import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../tokens';

function Tile({ label, value }: { label: string; value: number | undefined }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value ?? '—'}</Text>
      <Text style={styles.unit}>µg/m³</Text>
    </View>
  );
}

export function PollutantTiles({ pm10, no2 }: { pm10?: number; no2?: number }) {
  return (
    <View style={styles.row}>
      <Tile label="PM10" value={pm10} />
      <Tile label="NO₂" value={no2} />
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
