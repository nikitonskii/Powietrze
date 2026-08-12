import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { colors } from '../../shared/tokens';

export function SettingRow({
  keyName,
  title,
  subtitle,
  soon,
  value,
  trailing,
}: {
  keyName: string;
  title: string;
  subtitle?: string;
  soon?: boolean;
  value?: string; // static right-aligned value (dim) — mutually exclusive with trailing
  trailing?: React.ReactNode; // a control (Toggle)
}) {
  return (
    <View testID={`setting-${keyName}`} style={styles.row}>
      <View style={styles.left}>
        <View style={styles.titleLine}>
          <Text style={rowHeaderStyles.title}>{title}</Text>
          {soon && (
            <Text testID={`wkrotce-${keyName}`} style={rowHeaderStyles.soon}>
              Wkrótce
            </Text>
          )}
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailing ?? (value ? <Text style={styles.value}>{value}</Text> : null)}
    </View>
  );
}

// Shared with the stacked-row header (title + optional "Wkrótce" tag) in
// UstawieniaScreen.tsx, so both row shapes render identical typography.
export const rowHeaderStyles = StyleSheet.create({
  title: { fontSize: 15, color: colors.text.primary },
  soon: { fontSize: 11, color: colors.text.faint },
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 16,
  } as ViewStyle,
  left: { flex: 1, marginRight: 12 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subtitle: { fontSize: 12, color: colors.text.inactive, marginTop: 2 },
  value: { fontSize: 15, color: colors.text.dim },
});
