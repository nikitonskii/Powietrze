import { Children, Fragment, type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../tokens';

export function SettingsGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const rows = Children.toArray(children);
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.card}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {row}
            {i < rows.length - 1 && <View style={styles.divider} />}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 22 },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    color: colors.text.faint,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  card: { backgroundColor: colors.card, borderRadius: 18, overflow: 'hidden' },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.control.divider,
  },
});
