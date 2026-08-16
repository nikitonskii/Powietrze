import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { colors } from '../../shared/tokens';

export function SettingRow({
  keyName,
  title,
  subtitle,
  value,
  trailing,
}: {
  keyName: string;
  title: string;
  subtitle?: string;
  value?: string; // static right-aligned value (dim) — mutually exclusive with trailing
  trailing?: React.ReactNode; // a control (Toggle)
}) {
  return (
    <View testID={`setting-${keyName}`} style={styles.row}>
      <View style={styles.left}>
        <Text style={rowHeaderStyles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailing ?? (value ? <Text style={styles.value}>{value}</Text> : null)}
    </View>
  );
}

// Shared with the stacked-row header in UstawieniaScreen.tsx so both row shapes
// render identical title typography.
export const rowHeaderStyles = StyleSheet.create({
  title: { fontSize: 15, color: colors.text.primary },
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
  subtitle: { fontSize: 12, color: colors.text.inactive, marginTop: 2 },
  value: { fontSize: 15, color: colors.text.dim },
});
