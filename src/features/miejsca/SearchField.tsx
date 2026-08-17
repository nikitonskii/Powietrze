import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
      <View style={styles.field}>
        <TextInput
          testID="search-input"
          value={value}
          onChangeText={onChangeText}
          placeholder="Szukaj miasta lub stacji"
          placeholderTextColor={colors.text.dim}
          style={styles.input}
        />
        {value.length > 0 ? (
          <Pressable
            testID="search-clear"
            accessibilityRole="button"
            accessibilityLabel="Wyczyść"
            hitSlop={10}
            onPress={() => onChangeText('')}
            style={styles.clear}
          >
            <Text style={styles.clearGlyph}>×</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.screenH, marginBottom: spacing.rowGap },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 13,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    color: colors.text.high,
    fontSize: 16,
  },
  // iOS-style filled clear affordance; one tap wipes the field.
  clear: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.control.trackOff,
  },
  clearGlyph: {
    color: colors.text.high,
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '600',
  },
});
