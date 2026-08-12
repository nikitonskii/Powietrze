import { StyleSheet, TextInput, View } from 'react-native';
import { colors, spacing } from '../../shared/tokens';

export function SearchField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (t: string) => void;
}) {
  return (
    <View style={styles.wrap}>
      <TextInput
        testID="search-input"
        value={value}
        onChangeText={onChangeText}
        placeholder="Szukaj miasta lub stacji"
        placeholderTextColor={colors.text.dim}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.screenH, marginBottom: spacing.rowGap },
  input: {
    backgroundColor: colors.card,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text.high,
    fontSize: 16,
  },
});
